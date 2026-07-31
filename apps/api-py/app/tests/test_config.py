"""
Real bug found via an actual Railway deployment failure:
TypeError: connect() got an unexpected keyword argument 'schema'.

Caused by DATABASE_URL being set with Prisma's own "?schema=public"
convention — a query parameter Prisma understands but asyncpg does not.
SQLAlchemy's async engine forwards unrecognized query-string parameters
straight through as connect() kwargs, so this crashed every database
connection attempt, including Alembic's pre-deploy migration step.
"""

import os

from app.core.config import Settings


def test_database_url_async_strips_the_prisma_schema_query_param():
    os.environ["DATABASE_URL"] = "postgresql://user:pass@host:5432/db?schema=public"
    settings = Settings()

    assert "schema" not in settings.database_url_async
    assert settings.database_url_async == "postgresql+asyncpg://user:pass@host:5432/db"


def test_database_url_async_preserves_other_query_params():
    """Deliberately conservative: only "schema" is the confirmed culprit —
    any other query parameter (e.g. sslmode) must be left untouched."""
    os.environ["DATABASE_URL"] = "postgresql://user:pass@host:5432/db?schema=public&sslmode=require"
    settings = Settings()

    assert "schema" not in settings.database_url_async
    assert "sslmode=require" in settings.database_url_async


def test_database_url_async_unaffected_when_there_is_no_query_string():
    os.environ["DATABASE_URL"] = "postgresql://user:pass@host:5432/db"
    settings = Settings()

    assert settings.database_url_async == "postgresql+asyncpg://user:pass@host:5432/db"


def test_database_url_async_handles_the_postgres_scheme_variant():
    os.environ["DATABASE_URL"] = "postgres://user:pass@host:5432/db?schema=public"
    settings = Settings()

    assert settings.database_url_async == "postgresql+asyncpg://user:pass@host:5432/db"
