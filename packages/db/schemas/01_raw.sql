-- Wrapd · Capa RAW
-- Datos crudos tal como llegan de Spotify. Eventos idempotentes.

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS marts;

-- ============================================================================
-- USERS — perfil mínimo del usuario tras OAuth
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.users (
    id               TEXT        PRIMARY KEY,             -- Spotify user id
    display_name     TEXT,
    email            TEXT,
    avatar_url       TEXT,
    country          TEXT,
    product          TEXT,                                 -- premium/free
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TOKENS — access + refresh por usuario. Cifrar at rest en producción.
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.tokens (
    user_id          TEXT        PRIMARY KEY REFERENCES raw.users(id) ON DELETE CASCADE,
    access_token     TEXT        NOT NULL,
    refresh_token    TEXT        NOT NULL,
    scope            TEXT,
    expires_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ARTISTS — diccionario de artistas vistos (snapshot, no histórico)
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.artists (
    id               TEXT        PRIMARY KEY,             -- Spotify artist id
    name             TEXT        NOT NULL,
    genres           TEXT[]      DEFAULT '{}',
    image_url        TEXT,
    popularity       INTEGER,
    followers        INTEGER,
    refreshed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRACKS — diccionario de tracks vistos
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.tracks (
    id               TEXT        PRIMARY KEY,             -- Spotify track id
    name             TEXT        NOT NULL,
    artist_id        TEXT        REFERENCES raw.artists(id),
    album_name       TEXT,
    album_image_url  TEXT,
    duration_ms      INTEGER,
    explicit         BOOLEAN,
    popularity       INTEGER,
    refreshed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PLAYS — un row por play. La clave primaria evita duplicados de la API.
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.plays (
    user_id          TEXT        NOT NULL REFERENCES raw.users(id) ON DELETE CASCADE,
    track_id         TEXT        NOT NULL,
    played_at        TIMESTAMPTZ NOT NULL,                 -- viene de Spotify
    context_type     TEXT,                                 -- playlist/album/artist
    context_uri      TEXT,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, played_at, track_id)
);

CREATE INDEX IF NOT EXISTS idx_plays_user_played
    ON raw.plays (user_id, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_plays_track
    ON raw.plays (track_id);

-- ============================================================================
-- INGEST_LOG — un row por ejecución del worker. Útil para observabilidad.
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.ingest_log (
    id               BIGSERIAL   PRIMARY KEY,
    user_id          TEXT        REFERENCES raw.users(id) ON DELETE CASCADE,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at      TIMESTAMPTZ,
    plays_fetched    INTEGER     DEFAULT 0,
    plays_inserted   INTEGER     DEFAULT 0,
    status           TEXT        NOT NULL DEFAULT 'started', -- started/ok/error
    error_message    TEXT
);
