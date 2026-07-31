# syntax=docker/dockerfile:1
# Build from the monorepo root: docker build -f apps/worker-py/Dockerfile .

FROM python:3.12-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS deps
COPY apps/worker-py/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1
WORKDIR /repo
RUN addgroup --system --gid 1001 appuser \
    && adduser --system --uid 1001 --home /home/appuser --shell /bin/sh appuser
ENV HOME=/home/appuser

COPY --from=deps /usr/local/lib/python3.12/dist-packages /usr/local/lib/python3.12/dist-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY --chown=appuser:appuser apps/worker-py/worker.py ./worker.py

USER appuser
CMD ["celery", "-A", "worker.celery_app", "worker", "--loglevel=info"]
