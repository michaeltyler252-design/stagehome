"""Baseline — marks the current schema state as the migration starting point.

This migration is DELIBERATELY a no-op. The real Postgres database
already exists in production with real data (universities, properties,
counties, blog posts) and an already-correct schema (created by Prisma
migrate/db push). Running `alembic upgrade head` against that live
database for the first time should NOT try to recreate tables that
already exist — it should just record that Alembic's version tracking
starts here.

Deployment step: run `alembic stamp head` (not `alembic upgrade head`)
against the existing production database once, to mark it as already
being at this revision without executing anything. Only future NEW
migrations (created after this cutover) will contain real
CREATE/ALTER/DROP operations and should be run with `alembic upgrade
head` as normal.

For a genuinely FRESH database (e.g. a new local dev environment), run
`alembic upgrade head` — since this revision's upgrade() is a no-op, you
would then additionally need to run `Base.metadata.create_all()` once
(see app/core/database.py) or generate a real from-scratch migration
with `alembic revision --autogenerate` against an empty database, since
this baseline intentionally does not contain the full CREATE TABLE
history — that history is Prisma's, not Alembic's, for everything up to
this point.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-07-30

"""
from typing import Sequence, Union

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
