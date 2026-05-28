"""Configuración del worker cargada desde variables de entorno."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Postgres (Supabase). Connection string completa.
    postgres_url: str

    # Spotify app credentials (mismas que el frontend)
    spotify_client_id: str
    spotify_client_secret: str

    # Scopes mínimos para wrapd
    spotify_scopes: str = "user-read-recently-played user-read-currently-playing user-read-email user-read-private"


settings = Settings()  # type: ignore[call-arg]
