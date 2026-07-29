# syntax=docker/dockerfile:1
# Multi-stage build for @student-housing/api.
# Build from the monorepo root: docker build -f apps/api/Dockerfile .

FROM node:20-bookworm-slim AS base
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

# ---- runtime: minimal image with only what's needed to run ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/database/node_modules/.prisma ./node_modules/.prisma

USER nestjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
