# Crucible Bench — Production Deploy Guide

Two services to ship:

| Service | Platform | URL |
|---|---|---|
| `apps/web` | Vercel | `cruciblebench.xyz` |
| `packages/mcp-server` | Fly.io | `mcp.cruciblebench.xyz` |

---

## Section 1: `apps/web` → Vercel

### Why this works

`vercel.json` at the repo root tells Vercel to run `pnpm install --frozen-lockfile` from the workspace root (so workspace:* deps resolve correctly) and then build with `pnpm --filter @crucible/web build`. Output is `apps/web/.next`.

### Steps

1. **New Project** — Vercel dashboard → Add New Project → Import from GitHub → select this repo.

2. **Framework preset** — Vercel will auto-detect Next.js. Leave it as Next.js.

3. **Root Directory** — Leave as `.` (the repo root). Do NOT change this to `apps/web`; the monorepo install must run from root.

4. **Build & Output Settings** — Vercel will automatically read `vercel.json`. Do not override build command, install command, or output directory in the dashboard — let the file drive it.

5. **Environment Variables** — In project Settings → Environment Variables, add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_MCP_URL` | `https://mcp.cruciblebench.xyz/v1` |
   | `NEXT_PUBLIC_OG_NETWORK` | `galileo` |
   | `NEXT_PUBLIC_WALLETCONNECT_ID` | your Reown project ID (optional — defaults to public demo key) |

6. **Deploy** — click Deploy. First build takes ~2 min.

7. **Custom domain** — after the first successful deploy, go to Settings → Domains → Add `cruciblebench.xyz` (and `www.cruciblebench.xyz` → redirect to apex). Follow Vercel's DNS instructions for your registrar.

---

## Section 2: `packages/mcp-server` → Fly.io

### Why Fly.io

Cheapest production-ready option that supports WebSocket keep-alive, a persistent disk for SQLite, and custom domains. A shared-cpu-1x 512 MB VM costs $0–3/mo for low traffic. No cold-start penalty unlike Render free tier.

### Prereqs

Install flyctl:

```bash
# macOS
brew install flyctl

# or universal installer
curl -L https://fly.io/install.sh | sh
```

### Steps

**1. Authenticate**

```bash
fly auth signup   # first time
# or
fly auth login    # existing account
```

**2. Launch (no deploy yet)**

Run from the **repo root** — `fly.toml` lives there and sets `dockerfile = "packages/mcp-server/Dockerfile"` so Fly uses the repo root as the Docker build context.

```bash
fly launch --no-deploy --copy-config --name crucible-mcp
```

When prompted:
- Choose a region closest to your users (e.g. `iad` = US East, `sin` = Singapore).
- Say **No** to Postgres and Redis.
- Say **No** to tweaking settings (we already have `fly.toml`).

**3. Create the persistent volume**

Replace `<region>` with the same region you chose above.

```bash
fly volumes create crucible_mcp_data --size 1 --region <region>
```

This is where SQLite lives. `SQLITE_PATH=/data/mcp-server.sqlite` is already set in `fly.toml`.

**4. Set the secret**

```bash
fly secrets set PUBLISHER_PRIVATE_KEY=0x...
```

This wallet must be a `trustedAttester` on `RunRegistryV2`. It signs run results on-chain. Never commit this key — Fly injects it as an env var at runtime.

**5. Deploy**

```bash
fly deploy
```

The multi-stage Dockerfile:
- Stage 1 (`deps`): installs all workspace deps including native build toolchain for `better-sqlite3`.
- Stage 2 (`build`): compiles TypeScript → `dist/`.
- Stage 3 (`runtime`): lean Node 22 slim image, re-installs only prod deps (rebuilds `better-sqlite3` against runtime libc), then copies `dist/`, `scenarios/`, and `contracts/deployed-addresses.json`.

First deploy takes ~4 min (npm + native compile). Subsequent deploys are faster due to Docker layer cache.

**6. Verify**

```bash
curl https://crucible-mcp.fly.dev/healthz
# expected: {"ok":true,"service":"crucible-mcp","version":"2.0.0"}
```

**7. Add custom domain**

```bash
fly certs add mcp.cruciblebench.xyz
```

Fly prints a CNAME target. Add it to your DNS provider. Propagation takes 1–60 min. Fly auto-provisions a TLS cert via Let's Encrypt.

**8. Update Vercel env var**

Once DNS is live, update `NEXT_PUBLIC_MCP_URL` in Vercel to `https://mcp.cruciblebench.xyz/v1` and trigger a redeploy (or just push a commit).

---

## Section 3: First-deploy checklist

Run through these after both services are live:

- [ ] `https://cruciblebench.xyz/` loads without JS errors
- [ ] `https://mcp.cruciblebench.xyz/healthz` returns `{ "ok": true }`
- [ ] `/scenarios` page on the web app lists 7 scenarios (proves the build resolved scenario files correctly)
- [ ] Connect a wallet, mint an Agent INFT, download credentials — credentials file contains a valid JWT
- [ ] Run the CLI against prod:
  ```bash
  npx crucible-bench --scenario choppy-range --mcp-url https://mcp.cruciblebench.xyz/v1
  ```
  Should complete a run and print a score.
- [ ] WebSocket spectator works: open a run page on the web app while a CLI run is in progress — chart should animate live.

---

## Ongoing ops

**Logs**

```bash
fly logs
```

**SSH into the VM**

```bash
fly ssh console
```

**Inspect the SQLite DB**

```bash
fly ssh console -C "sqlite3 /data/mcp-server.sqlite '.tables'"
```

**Scale down to zero when idle** — already configured via `auto_stop_machines = "stop"` and `min_machines_running = 0` in `fly.toml`. The VM will spin down after ~5 min of no requests and wake on the next inbound connection (cold start is ~1–2 s).

**Redeploy after code changes**

```bash
# from repo root
fly deploy
```

**Update secrets**

```bash
fly secrets set PUBLISHER_PRIVATE_KEY=0xNEW_KEY
```
