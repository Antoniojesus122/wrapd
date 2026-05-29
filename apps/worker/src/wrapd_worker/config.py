"""Configuración del worker cargada desde variables de entorno."""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Postgres (Supabase). Acepta la URL tal como la da Supabase
    # (postgresql://...) y la normaliza para que SQLAlchemy use psycopg v3.
    postgres_url: str

    # Spotify app credentials (mismas que el frontend)
    spotify_client_id: str
    spotify_client_secret: str

    # Scopes mínimos para wrapd
    spotify_scopes: str = (
        "user-read-recently-played user-read-currently-playing "
        "user-read-email user-read-private"
    )

    @field_validator("postgres_url")
    @classmethod
    def _force_psycopg_v3(cls, v: str) -> str:
        # SQLAlchemy default es psycopg2; forzamos v3 con el prefijo postgresql+psycopg://
        if v.startswith("postgresql://"):
            return "postgresql+psycopg://" + v.removeprefix("postgresql://")
        if v.startswith("postgres://"):
            return "postgresql+psycopg://" + v.removeprefix("postgres://")
        return v


settings = Settings()  # type: ignore[call-arg]
