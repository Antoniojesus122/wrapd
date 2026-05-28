"""Ingestión de plays desde Spotify a Postgres.

Idempotente: la PK de raw.plays es (user_id, played_at, track_id), así que
ejecutar el mismo flow N veces nunca duplica.

Flujo:
1. Para cada user con tokens válidos, obtener `recently-played` (max 50 items).
2. Upsert de los artistas (con géneros, popularity).
3. Upsert de los tracks (con album info).
4. Insert de los plays (ON CONFLICT DO NOTHING).
5. Escribir un row en raw.ingest_log con métricas.
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


def _upsert_artists(conn, artists: list[dict[str, Any]]) -> None:
    if not artists:
        return
    for a in artists:
        conn.execute(
            text(
                """INSERT INTO raw.artists (id, name, genres, image_url, popularity, followers, refreshed_at)
                   VALUES (:id, :name, :genres, :img, :pop, :followers, NOW())
                   ON CONFLICT (id) DO UPDATE SET
                     name         = EXCLUDED.name,
                     genres       = EXCLUDED.genres,
                     image_url    = EXCLUDED.image_url,
                     popularity   = EXCLUDED.popularity,
                     followers    = EXCLUDED.followers,
                     refreshed_at = NOW()"""
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
                     (id, name, artist_id, album_name, album_image_url, duration_ms, explicit, popularity, refreshed_at)
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


def ingest_user(user_id: str) -> dict[str, Any]:
    """Ingesta los últimos plays de un usuario. Retorna métricas."""
    logger.info(f"[ingest] starting · user={user_id}")
    client = SpotifyClient(user_id)
    response = client.get_recently_played(limit=50)
    items: list[dict[str, Any]] = response.get("items", [])
    logger.info(f"[ingest] fetched {len(items)} plays from Spotify")

    if not items:
        return {"fetched": 0, "inserted": 0}

    # Hydrate artists with extra info (genres, popularity)
    unique_artist_ids = list({
        a["id"] for it in items for a in (it["track"]["artists"] or []) if a.get("id")
    })
    artists = client.get_artists(unique_artist_ids)

    with engine().begin() as conn:
        log_id = conn.execute(
            text(
                """INSERT INTO raw.ingest_log (user_id, status, plays_fetched)
                   VALUES (:uid, 'started', :fetched)
                   RETURNING id"""
            ),
            {"uid": user_id, "fetched": len(items)},
        ).scalar()

        try:
            _upsert_artists(conn, artists)
            _upsert_tracks(conn, items)
            inserted = _insert_plays(conn, user_id, items)
            conn.execute(
                text(
                    """UPDATE raw.ingest_log
                          SET finished_at = NOW(),
                              plays_inserted = :ins,
                              status = 'ok'
                        WHERE id = :log_id"""
                ),
                {"ins": inserted, "log_id": log_id},
            )
        except Exception as e:
            conn.execute(
                text(
                    """UPDATE raw.ingest_log
                          SET finished_at = NOW(),
                              status = 'error',
                              error_message = :msg
                        WHERE id = :log_id"""
                ),
                {"msg": str(e)[:500], "log_id": log_id},
            )
            raise

    logger.info(f"[ingest] done · fetched={len(items)} inserted={inserted}")
    return {"fetched": len(items), "inserted": inserted}


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
            errors.append({"user_id": u["user_id"], "error": str(e)})
    return {
        "users": len(users),
        "total_fetched": total_fetched,
        "total_inserted": total_inserted,
        "errors": errors,
    }
