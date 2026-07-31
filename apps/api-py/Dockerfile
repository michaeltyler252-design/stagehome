# syntax=docker/dockerfile:1
# Build from the monorepo root: docker build -f apps/api-py/Dockerfile .
#
# Real bug found via an actual Railway build failure and fixed here:
# COPY --from=deps /usr/local/lib/python3.12/dist-packages failed with
# "not found". `pip install --break-system-packages` does not reliably
# install into that exact path on every python:3.12-slim build — the
# real, portable fix is a self-contained virtualenv with a path this
# Dockerfile controls explicitly (/opt/venv), copied as one directory
# between stages, rather than guessing at wherever the base image's
# system Python happens to put packages.

FROM python:3.12-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS deps
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY apps/api-py/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

FROM deps AS build
COPY apps/api-py ./apps/api-py

# ---- runtime ----
FROM python:3.12-slim AS runtime
ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 appuser \
    && adduser --system --uid 1001 --home /home/appuser --shell /bin/sh appuser \
    && mkdir -p /home/appuser/.cache \
    && chown -R appuser:appuser /home/appuser
ENV HOME=/home/appuser

COPY --from=deps --chown=appuser:appuser /opt/venv /opt/venv
COPY --from=build --chown=appuser:appuser /repo/apps/api-py ./apps/api-py

WORKDIR /repo/apps/api-py
USER appuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:4000/api/v1/health').read()" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-${API_PORT:-4000}}"]
