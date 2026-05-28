# wrapd-worker

Worker Python que ingesta plays de Spotify en Postgres.

## Setup

```bash
cd apps/worker
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env  # rellena POSTGRES_URL + SPOTIFY_*
```

## Uso

```bash
# Ingestar todos los usuarios una vez (loop sobre raw.tokens)
python -m wrapd_worker.flows

# Ingestar un solo usuario por su Spotify id
python -m wrapd_worker.flows --user 1234567890

# Servir el flow con schedule cada 10 minutos (deja el proceso vivo)
python -m wrapd_worker.flows --serve
```

## Diseño

- **`db.py`** — SQLAlchemy engine singleton + helpers (`transaction`, `fetch_one`, etc.).
- **`spotify_client.py`** — wrapper de Spotify Web API por usuario, con refresh de tokens automático leyendo y escribiendo en `raw.tokens`.
- **`ingest.py`** — lógica pura de ingesta (`ingest_user`, `ingest_all_users`):
  1. `GET /me/player/recently-played` (max 50)
  2. Hydrate artistas (géneros, popularity, image)
  3. UPSERT en `raw.artists` → `raw.tracks` → `raw.plays` (idempotente)
  4. Log estructurado en `raw.ingest_log`
- **`flows.py`** — wraps con `@task` + `@flow` de Prefect 2 y CLI para correrlo a mano o `--serve` con schedule.

## Idempotencia

La PK de `raw.plays` es `(user_id, played_at, track_id)`. Ejecutar el flow N veces seguidas no duplica nada. El log de cada ingesta queda en `raw.ingest_log` con `plays_fetched` vs `plays_inserted`.

## Refresh de tokens

`SpotifyClient` comprueba `expires_at` antes de cada llamada. Si quedan <60s, hace POST a `accounts.spotify.com/api/token` con `grant_type=refresh_token`, actualiza `raw.tokens` y sigue. Si Spotify rota también el refresh_token, lo guardamos.
