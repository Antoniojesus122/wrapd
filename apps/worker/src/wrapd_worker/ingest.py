"""Ingestión de plays desde Spotify a Postgres.

Idempotente: la PK de raw.plays es (user_id, played_at, track_id), así que
ejecutar el mismo flow N veces nunca duplica.

Flujo:
1. Para cada user con tokens válidos, obtener `recently-played` (max 50 items).
2. Upsert STUBS de artistas con el mínimo info que viene en cada play (id, name).
   Esto garantiza que la FK de tracks.artist_id se satisface aunque /artists
   falle (403, rate limit, etc.).
3. Intentar enriquecer artistas con /artists (genres, popularity, image).
   Si falla, no rompe el ingest: solo se queda sin esos campos esta vez.
4. Upsert de los tracks (con album info).
5. Insert de los plays (ON CONFLICT DO NOTHING).
6. Escribir un row en raw.ingest_log con métricas.

La gestión de errores usa conexiones independientes: el log de error nunca
comparte transacción con la ingesta, así que si ésta se cae, podemos
registrarlo limpiamente.
"""

from datetime import datetime
from typing import Any

from loguru import logger
from sqlalchemy import text

from wrapd_worker.db import engine, fetch_all
from wrapd_worker.spotify_client import SpotifyClient


def _parse_played_at(iso: str) -> datetime:
    """Parse Spotify's ISO timestamp (may include Z suffix)."""
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


# ---------------------------------------------------------------------------
# UPSERT helpers
# ---------------------------------------------------------------------------
def _upsert_artist_stubs(conn, items: list[dict[str, Any]]) -> None:
    """Crear artistas con solo id+name a partir de la info embebida en cada play.
    No sobrescribe géneros/popularity si el artista ya existía.
    """
    seen: set[str] = set()
    for it in items:
        for a in it["track"]["artists"] or []:
            if not a.get("id") or a["id"] in seen:
                continue
            seen.add(a["id"])
            conn.execute(
                text(
                    """INSERT INTO raw.artists (id, name, refreshed_at)
                       VALUES (:id, :name, NOW())
                       ON CONFLICT (id) DO UPDATE SET
                         name         = EXCLUDED.name,
                         refreshed_at = NOW()"""
                ),
                {"id": a["id"], "name": a["name"]},
            )


def _enrich_artists(conn, artists: list[dict[str, Any]]) -> None:
    """Actualizar artistas existentes con datos completos de /artists API."""
    for a in artists:
        if not a.get("id"):
            continue
        conn.execute(
            text(
                """UPDATE raw.artists
                      SET name         = :name,
                          genres       = :genres,
                          image_url    = :img,
                          popularity   = :pop,
                          followers    = :followers,
                          refreshed_at = NOW()
                    WHERE id = :id"""
            ),
            {
                "id": a["id"],
                "name": a["name"],
                "genres": a.get("genres", []),
                "img": (a.get("images") or [{}])[0].get("url"),
                "pop": a.get("popularity"),
                "followers": (a.get("followers") or {}).get("total"),
            },
        )


def _upsert_tracks(conn, items: list[dict[str, Any]]) -> None:
    seen: set[str] = set()
    for it in items:
        t = it["track"]
        if t["id"] in seen:
            continue
        seen.add(t["id"])
        artist_id = (t["artists"] or [{}])[0].get("id")
        album = t.get("album") or {}
        album_img = (album.get("images") or [{}])[0].get("url")
        conn.execute(
            text(
                """INSERT INTO raw.tracks
                     (id, name, artist_id, album_name, album_image_url,
                      duration_ms, explicit, popularity, refreshed_at)
                   VALUES (:id, :name, :artist_id, :album_name, :album_image_url,
                           :duration_ms, :explicit, :popularity, NOW())
                   ON CONFLICT (id) DO UPDATE SET
                     name            = EXCLUDED.name,
                     artist_id       = EXCLUDED.artist_id,
                     album_name      = EXCLUDED.album_name,
                     album_image_url = EXCLUDED.album_image_url,
                     duration_ms     = EXCLUDED.duration_ms,
                     explicit        = EXCLUDED.explicit,
                     popularity      = EXCLUDED.popularity,
                     refreshed_at    = NOW()"""
            ),
            {
                "id": t["id"],
                "name": t["name"],
                "artist_id": artist_id,
                "album_name": album.get("name"),
                "album_image_url": album_img,
                "duration_ms": t.get("duration_ms"),
                "explicit": t.get("explicit"),
                "popularity": t.get("popularity"),
            },
        )


def _insert_plays(conn, user_id: str, items: list[dict[str, Any]]) -> int:
    inserted = 0
    for it in items:
        ctx = it.get("context") or {}
        result = conn.execute(
            text(
                """INSERT INTO raw.plays
                     (user_id, track_id, played_at, context_type, context_uri, ingested_at)
                   VALUES (:user_id, :track_id, :played_at, :ctx_type, :ctx_uri, NOW())
                   ON CONFLICT (user_id, played_at, track_id) DO NOTHING"""
            ),
            {
                "user_id": user_id,
                "track_id": it["track"]["id"],
                "played_at": _parse_played_at(it["played_at"]),
                "ctx_type": ctx.get("type"),
                "ctx_uri": ctx.get("uri"),
            },
        )
        inserted += result.rowcount
    return inserted


# ---------------------------------------------------------------------------
# Ingest log
# ---------------------------------------------------------------------------
def _start_log(user_id: str, plays_fetched: int) -> int:
    """Crear un row en raw.ingest_log en una transacción separada y devolver su id."""
    with engine().begin() as conn:
        result = conn.execute(
            text(
                """INSERT INTO raw.ingest_log (user_id, status, plays_fetched)
                   VALUES (:uid, 'started', :fetched)
                   RETURNING id"""
            ),
            {"uid": user_id, "fetched": plays_fetched},
        )
        log_id = result.scalar()
        assert log_id is not None
        return int(log_id)


def _finish_log(log_id: int, *, status: str, inserted: int, error: str | None) -> None:
    """Actualizar el log de la ingesta. Conexión independiente para que no nos
    afecte una transacción rota anterior.
    """
    try:
        with engine().begin() as conn:
            conn.execute(
                text(
                    """UPDATE raw.ingest_log
                          SET finished_at    = NOW(),
                              status         = :status,
                              plays_inserted = :ins,
                              error_message  = :err
                        WHERE id = :log_id"""
                ),
                {
                    "log_id": log_id,
                    "status": status,
                    "ins": inserted,
                    "err": (error or "")[:500] if error else None,
                },
            )
    except Exception as e:
        logger.error(f"[ingest_log] no se pudo escribir el log #{log_id}: {e}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def ingest_user(user_id: str) -> dict[str, Any]:
    """Ingesta los últimos plays de un usuario. Retorna métricas."""
    logger.info(f"[ingest] starting · user={user_id}")
    client = SpotifyClient(user_id)
    response = client.get_recently_played(limit=50)
    items: list[dict[str, Any]] = response.get("items", [])
    logger.info(f"[ingest] fetched {len(items)} plays from Spotify")

    log_id = _start_log(user_id, plays_fetched=len(items))

    if not items:
        _finish_log(log_id, status="ok", inserted=0, error=None)
        return {"fetched": 0, "inserted": 0}

    # Intentar enriquecer artistas con /artists. Si falla, lo registramos
    # pero seguimos: el upsert de stubs garantiza que la FK funciona.
    unique_artist_ids = list({
        a["id"] for it in items for a in (it["track"]["artists"] or []) if a.get("id")
    })
    enriched_artists: list[dict[str, Any]] = []
    enrichment_error: str | None = None
    try:
        enriched_artists = client.get_artists(unique_artist_ids)
        logger.info(f"[ingest] enriched {len(enriched_artists)} artists with full info")
    except Exception as e:
        enrichment_error = str(e)
        logger.warning(f"[ingest] /artists enrichment failed (no rompe el ingest): {e}")

    try:
        with engine().begin() as conn:
            _upsert_artist_stubs(conn, items)
            if enriched_artists:
                _enrich_artists(conn, enriched_artists)
            _upsert_tracks(conn, items)
            inserted = _insert_plays(conn, user_id, items)

        suffix = " (sin enrichment)" if enrichment_error else ""
        _finish_log(log_id, status="ok", inserted=inserted, error=enrichment_error)
        logger.info(f"[ingest] done · fetched={len(items)} inserted={inserted}{suffix}")
        return {"fetched": len(items), "inserted": inserted}
    except Exception as e:
        logger.error(f"[ingest] db transaction failed: {e}")
        _finish_log(log_id, status="error", inserted=0, error=str(e))
        raise


def ingest_all_users() -> dict[str, Any]:
    """Loop sobre todos los usuarios con tokens. Retorna métricas agregadas."""
    users = fetch_all("SELECT user_id FROM raw.tokens")
    logger.info(f"[ingest_all] {len(users)} usuarios con tokens")
    total_fetched = 0
    total_inserted = 0
    errors: list[dict[str, Any]] = []
    for u in users:
        try:
            r = ingest_user(u["user_id"])
            total_fetched += r["fetched"]
            total_inserted += r["inserted"]
        except Exception as e:
            logger.error(f"[ingest_all] user={u['user_id']} failed: {e}")
            errors.append({"user_id": u["user_id"], "error": str(e)[:300]})
    return {
        "users": len(users),
        "total_fetched": total_fetched,
        "total_inserted": total_inserted,
        "errors": errors,
    }
