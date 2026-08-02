# syntax=docker/dockerfile:1
# Build from the monorepo root: docker build -f apps/worker-py/Dockerfile .
#
# Real bug found (same root cause already fixed in apps/api-py/Dockerfile
# much earlier, but never applied here — this file was left behind on
# the old, broken pattern): COPY --from=deps
# /usr/local/lib/python3.12/dist-packages fails because `pip install
# --break-system-packages` does not reliably install into that exact
# hardcoded path on every python:3.12-slim build. Fixed the same way as
# api-py: a self-contained virtualenv with a path this Dockerfile
# controls explicitly (/opt/venv), copied as one directory between
# stages, instead of guessing at the base image's system Python layout.

FROM python:3.12-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS deps
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY apps/worker-py/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"
WORKDIR /repo
RUN addgroup --system --gid 1001 appuser \
    && adduser --system --uid 1001 --home /home/appuser --shell /bin/sh appuser
ENV HOME=/home/appuser

COPY --from=deps --chown=appuser:appuser /opt/venv /opt/venv
COPY --chown=appuser:appuser apps/worker-py/worker.py ./worker.py

USER appuser
CMD ["celery", "-A", "worker.celery_app", "worker", "--loglevel=info"]
