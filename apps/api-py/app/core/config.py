"""
Application settings, loaded from environment variables.

Deliberately reuses the EXACT same environment variable names as the
original NestJS service (DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, etc.)
so the existing Railway service variables can be reused as-is — no
renaming, no new secrets to generate, no downtime from a variable-name
mismatch during cutover.
"""

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

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

    # --- Notification providers (each "not configured" until real credentials exist) ---
    email_provider_api_key: str | None = None
    sms_provider_api_key: str | None = None
    whatsapp_business_token: str | None = None

    # --- M-Pesa Daraja ---
    daraja_consumer_key: str | None = None
    daraja_consumer_secret: str | None = None
    daraja_passkey: str | None = None
    daraja_shortcode: str | None = None
    daraja_env: str = "sandbox"

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
        differently-named environment variable.

        Real bug found via an actual Railway deployment failure and fixed
        here: this project's DATABASE_URL was originally set on Railway
        using Prisma's own convention of a trailing "?schema=public"
        query parameter (Prisma understands this; it's how Prisma picks
        the default Postgres schema). SQLAlchemy's async engine forwards
        any query-string parameters it doesn't recognize straight through
        as keyword arguments to the underlying driver's connect() call —
        and asyncpg has no "schema" parameter at all, so every connection
        attempt failed with `TypeError: connect() got an unexpected
        keyword argument 'schema'`. This app already sets each model's
        schema explicitly via SQLAlchemy's own __table_args__ = {"schema":
        "public"} / {"schema": "staging"} (see app/models/), which is the
        correct, real mechanism for this — the query parameter was never
        needed and is now stripped defensively so a DATABASE_URL carried
        over from the old Prisma convention can never break the
        connection again, regardless of what's actually set on Railway.
        """
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)

        parsed = urlsplit(url)
        if parsed.query:
            # Strip only "schema" — the confirmed culprit (Prisma's own
            # convention, which asyncpg has no equivalent parameter for).
            # Deliberately conservative: any other query parameter (e.g.
            # sslmode) is left untouched in case it's genuinely needed by
            # whatever's actually set on Railway.
            remaining = [
                (k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k != "schema"
            ]
            parsed = parsed._replace(query=urlencode(remaining))
        return urlunsplit(parsed)


settings = Settings()
