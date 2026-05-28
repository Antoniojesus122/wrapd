-- Wrapd · Capa MARTS
-- Vistas analíticas listas para consumo por el frontend.

-- ============================================================================
-- top_tracks_by_period
-- Por (user_id, period) devuelve los top 50 tracks por nº de plays.
-- Periods: 1d, 7d, 30d, 1y
-- ============================================================================
CREATE OR REPLACE VIEW marts.top_tracks_by_period AS
WITH base AS (
    SELECT
        p.user_id,
        p.track_id,
        p.played_at,
        CASE
            WHEN p.played_at >= NOW() - INTERVAL '1 day'  THEN '1d'
            WHEN p.played_at >= NOW() - INTERVAL '7 days' THEN '7d'
            WHEN p.played_at >= NOW() - INTERVAL '30 days' THEN '30d'
            WHEN p.played_at >= NOW() - INTERVAL '1 year' THEN '1y'
        END AS period
    FROM raw.plays p
    WHERE p.played_at >= NOW() - INTERVAL '1 year'
),
exploded AS (
    -- Una fila por (play, period) — un play cuenta en todos los periods que cubre
    SELECT user_id, track_id, '1d'  AS period FROM raw.plays WHERE played_at >= NOW() - INTERVAL '1 day'
    UNION ALL
    SELECT user_id, track_id, '7d'  AS period FROM raw.plays WHERE played_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT user_id, track_id, '30d' AS period FROM raw.plays WHERE played_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT user_id, track_id, '1y'  AS period FROM raw.plays WHERE played_at >= NOW() - INTERVAL '1 year'
),
agg AS (
    SELECT
        user_id, period, track_id,
        COUNT(*)::int AS play_count,
        ROW_NUMBER() OVER (PARTITION BY user_id, period ORDER BY COUNT(*) DESC) AS rank
    FROM exploded
    GROUP BY user_id, period, track_id
)
SELECT
    a.user_id, a.period, a.rank,
    t.id              AS track_id,
    t.name            AS track_name,
    t.album_name,
    t.album_image_url,
    ar.id             AS artist_id,
    ar.name           AS artist_name,
    a.play_count,
    (a.play_count * COALESCE(t.duration_ms, 0))::bigint AS total_ms
FROM agg a
LEFT JOIN raw.tracks  t  ON t.id  = a.track_id
LEFT JOIN raw.artists ar ON ar.id = t.artist_id
WHERE a.rank <= 50;

-- ============================================================================
-- top_artists_by_period
-- Igual pero agregado por artista.
-- ============================================================================
CREATE OR REPLACE VIEW marts.top_artists_by_period AS
WITH exploded AS (
    SELECT user_id, t.artist_id, '1d'  AS period FROM raw.plays p
    JOIN raw.tracks t ON t.id = p.track_id
    WHERE played_at >= NOW() - INTERVAL '1 day' AND t.artist_id IS NOT NULL
    UNION ALL
    SELECT user_id, t.artist_id, '7d'  AS period FROM raw.plays p
    JOIN raw.tracks t ON t.id = p.track_id
    WHERE played_at >= NOW() - INTERVAL '7 days' AND t.artist_id IS NOT NULL
    UNION ALL
    SELECT user_id, t.artist_id, '30d' AS period FROM raw.plays p
    JOIN raw.tracks t ON t.id = p.track_id
    WHERE played_at >= NOW() - INTERVAL '30 days' AND t.artist_id IS NOT NULL
    UNION ALL
    SELECT user_id, t.artist_id, '1y'  AS period FROM raw.plays p
    JOIN raw.tracks t ON t.id = p.track_id
    WHERE played_at >= NOW() - INTERVAL '1 year' AND t.artist_id IS NOT NULL
),
agg AS (
    SELECT
        user_id, period, artist_id,
        COUNT(*)::int AS play_count,
        ROW_NUMBER() OVER (PARTITION BY user_id, period ORDER BY COUNT(*) DESC) AS rank
    FROM exploded
    GROUP BY user_id, period, artist_id
)
SELECT
    a.user_id, a.period, a.rank,
    ar.id        AS artist_id,
    ar.name      AS artist_name,
    ar.image_url AS artist_image_url,
    ar.genres,
    a.play_count
FROM agg a
JOIN raw.artists ar ON ar.id = a.artist_id
WHERE a.rank <= 50;

-- ============================================================================
-- hourly_heatmap
-- Counts por (hour_of_day 0-23, day_of_week 0-6) últimos 30 días.
-- Día 0 = lunes (ISO).
-- ============================================================================
CREATE OR REPLACE VIEW marts.hourly_heatmap AS
SELECT
    user_id,
    EXTRACT(HOUR FROM played_at AT TIME ZONE 'Europe/Madrid')::int AS hour_of_day,
    (EXTRACT(ISODOW FROM played_at AT TIME ZONE 'Europe/Madrid')::int - 1) AS day_of_week,
    COUNT(*)::int AS plays
FROM raw.plays
WHERE played_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, hour_of_day, day_of_week;

-- ============================================================================
-- genre_monthly
-- % de tiempo por género por mes (últimos 12 meses).
-- Un track puede pertenecer a varios géneros (via artist.genres) — se reparten.
-- ============================================================================
CREATE OR REPLACE VIEW marts.genre_monthly AS
WITH plays_with_genres AS (
    SELECT
        p.user_id,
        DATE_TRUNC('month', p.played_at)::date AS month,
        UNNEST(ar.genres) AS genre,
        COALESCE(t.duration_ms, 0) AS ms,
        ARRAY_LENGTH(ar.genres, 1) AS genre_count
    FROM raw.plays p
    JOIN raw.tracks t  ON t.id = p.track_id
    JOIN raw.artists ar ON ar.id = t.artist_id
    WHERE p.played_at >= NOW() - INTERVAL '12 months'
      AND ar.genres IS NOT NULL
      AND ARRAY_LENGTH(ar.genres, 1) > 0
),
month_totals AS (
    SELECT user_id, month, SUM(ms / NULLIF(genre_count, 0))::bigint AS total_ms
    FROM plays_with_genres
    GROUP BY user_id, month
)
SELECT
    pg.user_id,
    pg.month,
    pg.genre,
    SUM(pg.ms / NULLIF(pg.genre_count, 0))::bigint                                   AS genre_ms,
    ROUND(100.0 * SUM(pg.ms / NULLIF(pg.genre_count, 0)) / NULLIF(mt.total_ms, 0), 2) AS pct
FROM plays_with_genres pg
JOIN month_totals mt ON mt.user_id = pg.user_id AND mt.month = pg.month
GROUP BY pg.user_id, pg.month, pg.genre, mt.total_ms
ORDER BY pg.user_id, pg.month, genre_ms DESC;

-- ============================================================================
-- user_overview
-- KPIs principales por usuario (1 row por user).
-- ============================================================================
CREATE OR REPLACE VIEW marts.user_overview AS
SELECT
    u.id                                                          AS user_id,
    u.display_name,
    u.avatar_url,
    (SELECT COUNT(*)
       FROM raw.plays p
      WHERE p.user_id = u.id
        AND p.played_at >= NOW() - INTERVAL '1 day')::int          AS plays_today,
    (SELECT COUNT(*)
       FROM raw.plays p
      WHERE p.user_id = u.id
        AND p.played_at >= NOW() - INTERVAL '30 days')::int        AS plays_30d,
    (SELECT COUNT(DISTINCT track_id)
       FROM raw.plays p
      WHERE p.user_id = u.id
        AND p.played_at >= NOW() - INTERVAL '30 days')::int        AS unique_tracks_30d,
    (SELECT MAX(played_at)
       FROM raw.plays p
      WHERE p.user_id = u.id)                                      AS last_played_at
FROM raw.users u;
