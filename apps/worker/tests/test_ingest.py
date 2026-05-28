"""Unit tests for ingest with Spotify mocked at the http layer.

These tests do NOT require a Postgres connection — they mock the engine
helpers too. Integration tests against a real Supabase DB live elsewhere.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

from wrapd_worker import ingest


SAMPLE_PLAY = {
    "track": {
        "id": "track_001",
        "name": "Espresso",
        "duration_ms": 175000,
        "explicit": False,
        "popularity": 85,
        "artists": [{"id": "artist_001", "name": "Sabrina Carpenter"}],
        "album": {
            "name": "Short n' Sweet",
            "images": [{"url": "https://i.scdn.co/album.jpg"}],
        },
    },
    "played_at": "2026-05-29T14:30:00.000Z",
    "context": {"type": "playlist", "uri": "spotify:playlist:abc"},
}

SAMPLE_ARTIST = {
    "id": "artist_001",
    "name": "Sabrina Carpenter",
    "genres": ["pop", "indie pop"],
    "popularity": 90,
    "images": [{"url": "https://i.scdn.co/artist.jpg"}],
    "followers": {"total": 12_345_678},
}


def test_parse_played_at_with_z_suffix():
    dt = ingest._parse_played_at("2026-05-29T14:30:00.000Z")
    assert dt.tzinfo is not None
    assert dt.year == 2026 and dt.month == 5 and dt.day == 29


def test_ingest_user_calls_spotify_and_upserts(mocker):
    # Arrange: fake Spotify client
    mock_client = MagicMock()
    mock_client.get_recently_played.return_value = {"items": [SAMPLE_PLAY]}
    mock_client.get_artists.return_value = [SAMPLE_ARTIST]

    # Patch the SpotifyClient class so __init__ does not hit the DB
    mocker.patch("wrapd_worker.ingest.SpotifyClient", return_value=mock_client)

    # Patch engine().begin() to return a mock connection
    mock_conn = MagicMock()
    mock_log_result = MagicMock()
    mock_log_result.scalar.return_value = 1
    # First execute is the INSERT INTO ingest_log RETURNING id; later ones for upserts.
    # _insert_plays uses .rowcount, return non-zero for first, zero for rest.
    mock_insert_result = MagicMock()
    mock_insert_result.rowcount = 1
    mock_conn.execute.side_effect = [mock_log_result] + [mock_insert_result] * 10

    mock_engine = MagicMock()
    mock_engine.begin.return_value.__enter__.return_value = mock_conn
    mock_engine.begin.return_value.__exit__.return_value = None
    mocker.patch("wrapd_worker.ingest.engine", return_value=mock_engine)

    # Act
    result = ingest.ingest_user("user_42")

    # Assert
    mock_client.get_recently_played.assert_called_once_with(limit=50)
    mock_client.get_artists.assert_called_once_with(["artist_001"])
    assert result["fetched"] == 1
    # The first execute was the ingest_log INSERT; subsequent ones were artists/tracks/plays.
    assert mock_conn.execute.call_count >= 4


def test_ingest_user_with_no_plays(mocker):
    mock_client = MagicMock()
    mock_client.get_recently_played.return_value = {"items": []}
    mocker.patch("wrapd_worker.ingest.SpotifyClient", return_value=mock_client)

    result = ingest.ingest_user("user_42")

    assert result == {"fetched": 0, "inserted": 0}
    mock_client.get_artists.assert_not_called()
