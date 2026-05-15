# syntax=docker/dockerfile:1.6
FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

# ── deps stage: install prod deps via pnpm at the repo root so workspace
# resolution works. We copy only manifests first to maximise cache hits.
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/og-client/package.json packages/og-client/
COPY packages/mcp-server/package.json packages/mcp-server/
RUN pnpm install --frozen-lockfile

# ── build stage: bring in source for the deps we use, compile mcp-server
FROM deps AS build
COPY packages/core/ packages/core/
COPY packages/og-client/ packages/og-client/
COPY packages/mcp-server/ packages/mcp-server/
COPY contracts/deployed-addresses.json contracts/deployed-addresses.json
COPY scenarios/ scenarios/
RUN pnpm --filter @crucible/mcp-server build

# ── runtime stage: keep it lean, just node + dist + scenarios + addresses
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Re-install only the prod deps + native modules; rebuilding better-sqlite3
# against the runtime libc.
RUN corepack enable
COPY --from=deps /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json /repo/tsconfig.base.json ./
COPY --from=deps /repo/packages/core/package.json packages/core/
COPY --from=deps /repo/packages/og-client/package.json packages/og-client/
COPY --from=deps /repo/packages/mcp-server/package.json packages/mcp-server/

# Install runtime native deps (better-sqlite3 needs a tiny toolchain to
# rebuild). We then prune devDeps to keep the image small.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && pnpm install --frozen-lockfile --prod \
  && apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

# Copy compiled JS + dist artifacts
COPY --from=build /repo/packages/core/src packages/core/src
COPY --from=build /repo/packages/core/dist packages/core/dist
COPY --from=build /repo/packages/og-client/src packages/og-client/src
COPY --from=build /repo/packages/og-client/dist packages/og-client/dist
COPY --from=build /repo/packages/mcp-server/src packages/mcp-server/src
COPY --from=build /repo/packages/mcp-server/dist packages/mcp-server/dist
COPY --from=build /repo/scenarios scenarios
COPY --from=build /repo/contracts/deployed-addresses.json contracts/deployed-addresses.json

# Persistent volume mount-point for SQLite (Fly mounts /data here)
RUN mkdir -p /data
ENV SQLITE_PATH=/data/mcp-server.sqlite

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/packages/mcp-server
# Run via the compiled JS entry point — no tsx needed in production.
CMD ["node", "dist/index.js"]
