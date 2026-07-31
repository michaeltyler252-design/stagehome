# Database Migration Guide (Alembic)

## Prerequisites
- PostgreSQL 16+ with the `postgis` and `pg_trgm` extensions available.
- Python 3.12, with `apps/api-py/requirements.txt` installed.

## First-time setup (fresh, empty database)

```bash
cd apps/api-py
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL to your real Postgres connection string
python -c "
from app.models import Base
from sqlalchemy import create_engine
import os
engine = create_engine(os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql'))
Base.metadata.create_all(engine)
"
alembic stamp head
```

This creates all 95 tables across both the `public` and `staging`
Postgres schemas directly from the SQLAlchemy models in `app/models/`,
then tells Alembic the database is already at the current revision (the
baseline migration is deliberately a no-op — see its own docstring in
`apps/api-py/alembic/versions/0001_baseline.py` for why, and for the
reasoning behind using `create_all` + `stamp` rather than `upgrade head`
for this specific first-time case).

**This exact sequence was verified by actually running it** against a
real local PostgreSQL 16 + PostGIS instance during this project's
verification work — confirmed via direct `psql` queries showing all 95
tables genuinely created. See `apps/api-py/MIGRATION.md` for the full,
honest account of what has and hasn't been executed.

## Adding a new migration going forward

Once the baseline above is in place, use Alembic normally for any future
schema change:

```bash
alembic revision --autogenerate -m "add some_new_column"
alembic upgrade head
```

## Existing production database (already has real data)

Do **not** run `create_all` or `upgrade head` against a database that
already has real data from a previous deployment. Run only:

```bash
alembic stamp head
```

This marks the existing schema as already current without touching any
table or row.
