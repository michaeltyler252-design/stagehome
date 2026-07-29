# syntax=docker/dockerfile:1
# Multi-stage build for @student-housing/api.
# Build from the monorepo root: docker build -f apps/api/Dockerfile .

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ---- deps: install the full workspace so pnpm can resolve internal packages ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN pnpm install --frozen-lockfile --filter @student-housing/api... 2>/dev/null || pnpm install --filter @student-housing/api...

# ---- build: compile the API and generate the Prisma client ----
FROM deps AS build
COPY packages/database packages/database
COPY apps/api apps/api
WORKDIR /repo/packages/database
RUN pnpm prisma:generate
WORKDIR /repo/apps/api
RUN pnpm build

# ---- runtime: includes the monorepo layout so preDeployCommand's
# `pnpm --filter @student-housing/database ...` (migrate/seed) can actually
# resolve and run against a real workspace, not just a flattened dist/ ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --home /home/nestjs --shell /bin/sh nestjs \
  && mkdir -p /home/nestjs/.cache \
  && chown -R nestjs:nodejs /home/nestjs
ENV HOME=/home/nestjs

COPY --from=build --chown=nestjs:nodejs /repo/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /repo/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=nestjs:nodejs /repo/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nodejs /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nestjs:nodejs /repo/packages/database ./packages/database
# Note: no separate copy of packages/database/node_modules/.prisma is needed —
# with pnpm's shared virtual store, `prisma generate` writes the client
# straight into /repo/node_modules/.pnpm/@prisma+client@.../node_modules/.prisma,
# which the whole-repo node_modules copy above already includes. That
# packages/database/node_modules/.prisma path never actually gets created by
# a --filter-scoped install, so copying it explicitly only breaks the build.

USER nestjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
