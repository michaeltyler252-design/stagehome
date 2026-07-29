# syntax=docker/dockerfile:1
# Alternative to Vercel for teams that must self-host. Requires
# next.config.js to set `output: "standalone"` (not enabled by default here
# since Vercel is the recommended target — uncomment it before using this).
# Build from the monorepo root: docker build -f apps/web/Dockerfile .

FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @student-housing/web... 2>/dev/null || pnpm install --filter @student-housing/web...

FROM deps AS build
COPY apps/web apps/web
WORKDIR /repo/apps/web
RUN pnpm build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build /repo/apps/web/public ./public
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
