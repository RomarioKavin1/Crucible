# syntax=docker/dockerfile:1.6
#
# Crucible MCP server. Single-stage image — runs the workspace package via
# tsx so it can resolve @crucible/core and @crucible/og-client TS source
# directly (those packages export src/index.ts as their main entry,
# matching local dev). No tsc compile step needed; tsx handles cross-package
# imports at runtime.
#
# Build context MUST be the repo root (Railway / Fly point at this Dockerfile
# via railway.json / fly.toml from the root).

FROM node:22-bookworm-slim
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Manifests first for layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/og-client/package.json packages/og-client/
COPY packages/mcp-server/package.json packages/mcp-server/
RUN pnpm install --frozen-lockfile

# Source for the three packages we use, plus runtime data files.
COPY packages/core/ packages/core/
COPY packages/og-client/ packages/og-client/
COPY packages/mcp-server/ packages/mcp-server/
COPY contracts/deployed-addresses.json contracts/deployed-addresses.json
COPY scenarios/ scenarios/

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/packages/mcp-server
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
