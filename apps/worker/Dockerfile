# syntax=docker/dockerfile:1
# Build from the monorepo root: docker build -f apps/worker/Dockerfile .

FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile --filter @student-housing/worker... 2>/dev/null || pnpm install --filter @student-housing/worker...

FROM deps AS build
COPY packages/database packages/database
COPY apps/worker apps/worker
WORKDIR /repo/packages/database
RUN pnpm prisma:generate
WORKDIR /repo/apps/worker
RUN pnpm build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker

COPY --from=build /repo/apps/worker/dist ./dist
COPY --from=build /repo/apps/worker/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
# See apps/api/Dockerfile for why there's no separate copy of
# packages/database/node_modules/.prisma here.

USER worker
# No exposed port — this process only consumes queues, it serves nothing.
CMD ["node", "dist/index.js"]
