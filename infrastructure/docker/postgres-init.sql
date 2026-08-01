-- Runs automatically on first container start (postgres image convention:
-- anything in /docker-entrypoint-initdb.d/ executes once, against a
-- brand-new empty data volume, before the database accepts connections).
--
-- Mirrors exactly what this project's real Railway Postgres needed —
-- confirmed by actually running this project's backend against a real
-- local Postgres+PostGIS instance during development (see
-- apps/api-py/MIGRATION.md for that verification history).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS staging;
