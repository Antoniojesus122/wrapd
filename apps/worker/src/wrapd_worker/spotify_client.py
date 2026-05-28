"""Spotify Web API client.

Carga tokens desde raw.tokens, los refresca cuando expiran, y expone
métodos para los endpoints que necesita el worker (recently played,
artist info, etc.).
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from loguru import logger

from wrapd_worker.config import settings
from wrapd_worker.db import fetch_one, execute

SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"


class SpotifyClient:
    """One client per user_id. Reads + refreshes that user's tokens automatically."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._expires_at: datetime | None = None
        self._load_tokens()

    # ------------------------------------------------------------------
    # Token lifecycle
    # ------------------------------------------------------------------
    def _load_tokens(self) -> None:
        row = fetch_one(
            "SELECT access_token, refresh_token, expires_at FROM raw.tokens WHERE user_id = :uid",
            {"uid": self.user_id},
        )
        if not row:
            raise RuntimeError(f"No tokens stored for user {self.user_id}")
        self._access_token = row["access_token"]
        self._refresh_token = row["refresh_token"]
        self._expires_at = row["expires_at"]

    def _is_expired(self) -> bool:
        if not self._expires_at:
            return True
        # Refresh 60s before real expiry to avoid edge cases
        return datetime.now(UTC) >= self._expires_at - timedelta(seconds=60)

    def _refresh(self) -> None:
        """Exchange refresh_token for a new access_token."""
        assert self._refresh_token is not None
        logger.info(f"[spotify] refreshing token for user={self.user_id}")
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self._refresh_token,
                },
                auth=(settings.spotify_client_id, settings.spotify_client_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if r.status_code != 200:
            raise RuntimeError(f"Token refresh failed: {r.status_code} {r.text[:200]}")
        data = r.json()
        self._access_token = data["access_token"]
        # Spotify may rotate the refresh token; if not, keep the old one
        if data.get("refresh_token"):
            self._refresh_token = data["refresh_token"]
        self._expires_at = datetime.now(UTC) + timedelta(seconds=data["expires_in"])
        execute(
            """UPDATE raw.tokens
                  SET access_token = :at,
                      refresh_token = :rt,
                      expires_at = :exp,
                      updated_at = NOW()
                WHERE user_id = :uid""",
            {
                "at": self._access_token,
                "rt": self._refresh_token,
                "exp": self._expires_at,
                "uid": self.user_id,
            },
        )

    def _headers(self) -> dict[str, str]:
        if self._is_expired():
            self._refresh()
        return {"Authorization": f"Bearer {self._access_token}"}

    # ------------------------------------------------------------------
    # API endpoints
    # ------------------------------------------------------------------
    def get_recently_played(self, limit: int = 50, after_ms: int | None = None) -> dict[str, Any]:
        """GET /me/player/recently-played

        Returns up to `limit` plays (max 50) since `after_ms` (unix timestamp ms).
        """
        params: dict[str, Any] = {"limit": limit}
        if after_ms:
            params["after"] = after_ms
        with httpx.Client(timeout=15.0) as client:
            r = client.get(
                f"{SPOTIFY_API_BASE}/me/player/recently-played",
                params=params,
                headers=self._headers(),
            )
        if r.status_code != 200:
            raise RuntimeError(
                f"recently-played failed: {r.status_code} {r.text[:200]}"
            )
        return r.json()

    def get_artists(self, artist_ids: list[str]) -> list[dict[str, Any]]:
        """GET /artists?ids=...  (batches of up to 50)"""
        if not artist_ids:
            return []
        result: list[dict[str, Any]] = []
        for i in range(0, len(artist_ids), 50):
            batch = artist_ids[i : i + 50]
            with httpx.Client(timeout=15.0) as client:
                r = client.get(
                    f"{SPOTIFY_API_BASE}/artists",
                    params={"ids": ",".join(batch)},
                    headers=self._headers(),
                )
            if r.status_code != 200:
                logger.warning(
                    f"[spotify] /artists batch failed: {r.status_code} {r.text[:200]}"
                )
                continue
            result.extend(r.json().get("artists", []))
        return result
