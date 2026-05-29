"""Unit tests for ingest with Spotify and Postgres engine mocked.

These tests do NOT require a real connection — they mock the engine helpers.
Integration tests against a real Supabase DB live elsewhere.
"""

from unittest.mock import MagicMock

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


def _patch_engine(mocker, *, log_id: int = 1, insert_rowcount: int = 1):
    """Patch wrapd_worker.ingest.engine() so it returns a MagicMock that
    supports `.begin()` as a context manager yielding a connection whose
    execute() returns scalar() = log_id and rowcount = insert_rowcount.
    """
    mock_conn = MagicMock()
    scalar_result = MagicMock()
    scalar_result.scalar.return_value = log_id
    insert_result = MagicMock()
    insert_result.rowcount = insert_rowcount
    # First call (log start) gets scalar_result, rest get insert_result
    call_count = {"n": 0}

    def execute(*_args, **_kwargs):
        call_count["n"] += 1
        return scalar_result if call_count["n"] == 1 else insert_result

    mock_conn.execute.side_effect = execute

    mock_engine = MagicMock()
    mock_engine.begin.return_value.__enter__.return_value = mock_conn
    mock_engine.begin.return_value.__exit__.return_value = None

    mocker.patch("wrapd_worker.ingest.engine", return_value=mock_engine)
    return mock_conn


def test_parse_played_at_with_z_suffix():
    dt = ingest._parse_played_at("2026-05-29T14:30:00.000Z")
    assert dt.tzinfo is not None
    assert dt.year == 2026 and dt.month == 5 and dt.day == 29


def test_ingest_user_with_no_plays(mocker):
    mock_client = MagicMock()
    mock_client.get_recently_played.return_value = {"items": []}
    mocker.patch("wrapd_worker.ingest.SpotifyClient", return_value=mock_client)
    _patch_engine(mocker)

    result = ingest.ingest_user("user_42")

    assert result == {"fetched": 0, "inserted": 0}
    mock_client.get_artists.assert_not_called()


def test_ingest_user_calls_spotify_and_upserts(mocker):
    mock_client = MagicMock()
    mock_client.get_recently_played.return_value = {"items": [SAMPLE_PLAY]}
    mock_client.get_artists.return_value = [SAMPLE_ARTIST]
    mocker.patch("wrapd_worker.ingest.SpotifyClient", return_value=mock_client)
    mock_conn = _patch_engine(mocker)

    result = ingest.ingest_user("user_42")

    mock_client.get_recently_played.assert_called_once_with(limit=50)
    mock_client.get_artists.assert_called_once_with(["artist_001"])
    assert result["fetched"] == 1
    # At least: log start + artist stub + enrich + track + play + log finish
    assert mock_conn.execute.call_count >= 5


def test_ingest_user_survives_artists_endpoint_failure(mocker):
    """Si /artists devuelve 403, los stubs deben permitir continuar el ingest."""
    mock_client = MagicMock()
    mock_client.get_recently_played.return_value = {"items": [SAMPLE_PLAY]}
    mock_client.get_artists.side_effect = RuntimeError("403 Forbidden")
    mocker.patch("wrapd_worker.ingest.SpotifyClient", return_value=mock_client)
    _patch_engine(mocker)

    # Should not raise — enrichment failure is logged as warning, not fatal
    result = ingest.ingest_user("user_42")

    assert result["fetched"] == 1
    # /artists was called but raised; stubs handled the rest
    mock_client.get_artists.assert_called_once()
