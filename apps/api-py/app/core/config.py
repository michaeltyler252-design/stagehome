"""
Application settings, loaded from environment variables.

Deliberately reuses the EXACT same environment variable names as the
original NestJS service (DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, etc.)
so the existing Railway service variables can be reused as-is — no
renaming, no new secrets to generate, no downtime from a variable-name
mismatch during cutover.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Core ---
    node_env: str = "development"  # kept as NODE_ENV-compatible name; see api_env below
    api_env: str = "development"
    api_port: int = 4000

    # --- Database ---
    # Matches Railway's real DATABASE_URL exactly (plain "postgresql://...").
    # See database_url_async below for the driver-qualified version
    # SQLAlchemy's async engine actually needs.
    database_url: str = "postgresql://localhost/stagehome"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379"

    # --- JWT ---
    jwt_access_secret: str = "dev-only-insecure-secret"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_secret: str = "dev-only-insecure-refresh-secret"
    jwt_refresh_ttl_days: int = 30

    # --- CORS ---
    web_app_origin: str | None = None

    # --- Google OAuth ---
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_callback_url: str | None = None

    # --- Sentry ---
    sentry_dsn: str | None = None

    # --- Logging ---
    log_level: str = "info"

    @property
    def is_production(self) -> bool:
        # NODE_ENV is the variable name already set on the live Railway
        # service; reading it (rather than requiring a new API_ENV
        # variable) means no Railway variable changes are needed at all
        # for this specific check.
        return self.node_env == "production"

    @property
    def database_url_async(self) -> str:
        """SQLAlchemy's asyncpg dialect needs 'postgresql+asyncpg://', but
        Railway's real DATABASE_URL is plain 'postgresql://'. Derive the
        driver-qualified form here rather than requiring a second,
        differently-named environment variable."""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
