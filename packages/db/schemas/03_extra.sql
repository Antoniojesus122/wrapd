-- Wrapd · Schemas extra
-- 1) Snapshots de los top tracks/artists calculados por Spotify (3 time_ranges)
-- 2) Audio features por track (energy, valence, danceability, etc.)

-- ============================================================================
-- raw.spotify_tops — un snapshot inmutable cada vez que el worker corre
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.spotify_tops (
    user_id      TEXT        NOT NULL REFERENCES raw.users(id) ON DELETE CASCADE,
    kind         TEXT        NOT NULL CHECK (kind IN ('track', 'artist')),
    time_range   TEXT        NOT NULL CHECK (time_range IN ('short_term', 'medium_term', 'long_term')),
    rank         INTEGER     NOT NULL,
    item_id      TEXT        NOT NULL,
    captured_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, kind, time_range, captured_at, rank)
);

CREATE INDEX IF NOT EXISTS idx_spotify_tops_lookup
    ON raw.spotify_tops (user_id, kind, time_range, captured_at DESC, rank);

-- ============================================================================
-- raw.audio_features — un row por track (último valor conocido)
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw.audio_features (
    track_id         TEXT        PRIMARY KEY,
    danceability     NUMERIC,
    energy           NUMERIC,
    key              INTEGER,
    loudness         NUMERIC,
    mode             INTEGER,
    speechiness      NUMERIC,
    acousticness     NUMERIC,
    instrumentalness NUMERIC,
    liveness         NUMERIC,
    valence          NUMERIC,
    tempo            NUMERIC,
    duration_ms      INTEGER,
    time_signature   INTEGER,
    refreshed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- marts.latest_spotify_tops — el snapshot más reciente por (user, kind, range)
-- ============================================================================
CREATE OR REPLACE VIEW marts.latest_spotify_tops AS
WITH latest AS (
    SELECT user_id, kind, time_range, MAX(captured_at) AS captured_at
      FROM raw.spotify_tops
     GROUP BY user_id, kind, time_range
)
SELECT t.user_id, t.kind, t.time_range, t.rank, t.item_id, t.captured_at
  FROM raw.spotify_tops t
  JOIN latest l USING (user_id, kind, time_range, captured_at);

-- ============================================================================
-- marts.top_tracks_spotify — top tracks de Spotify enriquecidos con metadata
-- ============================================================================
CREATE OR REPLACE VIEW marts.top_tracks_spotify AS
SELECT
    lst.user_id,
    lst.time_range,
    lst.rank,
    lst.item_id            AS track_id,
    t.name                 AS track_name,
    t.album_name,
    t.album_image_url,
    ar.id                  AS artist_id,
    ar.name                AS artist_name,
    ar.image_url           AS artist_image_url,
    af.energy,
    af.valence,
    af.danceability
  FROM marts.latest_spotify_tops lst
  LEFT JOIN raw.tracks    t  ON t.id  = lst.item_id
  LEFT JOIN raw.artists   ar ON ar.id = t.artist_id
  LEFT JOIN raw.audio_features af ON af.track_id = lst.item_id
 WHERE lst.kind = 'track';

-- ============================================================================
-- marts.top_artists_spotify
-- ============================================================================
CREATE OR REPLACE VIEW marts.top_artists_spotify AS
SELECT
    lst.user_id,
    lst.time_range,
    lst.rank,
    lst.item_id     AS artist_id,
    ar.name         AS artist_name,
    ar.image_url    AS artist_image_url,
    ar.genres,
    ar.popularity
  FROM marts.latest_spotify_tops lst
  LEFT JOIN raw.artists ar ON ar.id = lst.item_id
 WHERE lst.kind = 'artist';

-- ============================================================================
-- marts.user_audio_profile — promedio de audio features de tus plays últimos 30d
-- ============================================================================
CREATE OR REPLACE VIEW marts.user_audio_profile AS
SELECT
    p.user_id,
    ROUND(AVG(af.energy)::numeric, 4)           AS avg_energy,
    ROUND(AVG(af.valence)::numeric, 4)          AS avg_valence,
    ROUND(AVG(af.danceability)::numeric, 4)     AS avg_danceability,
    ROUND(AVG(af.acousticness)::numeric, 4)     AS avg_acousticness,
    ROUND(AVG(af.instrumentalness)::numeric, 4) AS avg_instrumentalness,
    ROUND(AVG(af.speechiness)::numeric, 4)      AS avg_speechiness,
    ROUND(AVG(af.tempo)::numeric, 2)            AS avg_tempo,
    COUNT(DISTINCT p.track_id)::int             AS tracks_with_features,
    MAX(af.refreshed_at)                        AS last_feature_at
  FROM raw.plays p
  JOIN raw.audio_features af ON af.track_id = p.track_id
 WHERE p.played_at >= NOW() - INTERVAL '30 days'
 GROUP BY p.user_id;
