# syntax=docker/dockerfile:1
# Build from the monorepo root: docker build -f apps/api-py/Dockerfile .
#
# Direct Python equivalent of apps/api/Dockerfile — same multi-stage
# pattern (deps -> build -> runtime), same non-root user, same real fixes
# already learned this project's hard way on the Node side (explicit
# openssl for TLS, chown'd files so the runtime user can actually write
# where it needs to).

FROM python:3.12-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS deps
COPY apps/api-py/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

FROM deps AS build
COPY apps/api-py ./apps/api-py

# ---- runtime ----
FROM python:3.12-slim AS runtime
ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 appuser \
    && adduser --system --uid 1001 --home /home/appuser --shell /bin/sh appuser \
    && mkdir -p /home/appuser/.cache \
    && chown -R appuser:appuser /home/appuser
ENV HOME=/home/appuser

COPY --from=deps /usr/local/lib/python3.12/dist-packages /usr/local/lib/python3.12/dist-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY --from=build --chown=appuser:appuser /repo/apps/api-py ./apps/api-py

WORKDIR /repo/apps/api-py
USER appuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:4000/api/v1/health').read()" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${API_PORT:-4000}"]
