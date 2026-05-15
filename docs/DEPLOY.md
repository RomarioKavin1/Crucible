# Crucible Bench — Production Deploy Guide

Two services to ship:

| Service | Platform | URL |
|---|---|---|
| `apps/web` | Vercel | `cruciblebench.xyz` |
| `packages/mcp-server` | Railway | `mcp.cruciblebench.xyz` |

> Fly.io configs (`fly.toml` at repo root) are also committed as an alternative — see end of doc for the Fly.io path if Railway doesn't suit.

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

## Section 2: `packages/mcp-server` → Railway

### Why Railway

- $5/mo Hobby plan with $5 free credit each month — effectively **$0** for our traffic profile (~$2–3/mo of compute even at moderate usage stays inside the credit).
- Native pnpm + monorepo support — Railway respects our `railway.json` and uses our existing Dockerfile.
- WebSocket, persistent volumes, custom domains all included with no add-ons.
- GitHub auto-deploy: every push to your default branch redeploys.
- One dashboard for logs, env vars, metrics, deploys.

### Steps

**1. Sign up + create project**

Go to https://railway.app, sign in with GitHub, click **New Project** → **Deploy from GitHub repo** → select your Crucible repo.

**2. Service config (auto-detected)**

Railway reads `railway.json` at the repo root, which tells it to:
- Use Docker (`builder: DOCKERFILE`)
- Build with `packages/mcp-server/Dockerfile` (our existing multi-stage build)
- Health-check `/healthz` after start

You don't need to override any settings in the dashboard.

**3. Add a persistent volume**

In the service's **Settings** tab → **Volumes** → **+ New Volume**:
- Mount path: `/data`
- Size: `1` GB

This is where SQLite lives. `SQLITE_PATH=/data/mcp-server.sqlite` is read at runtime by `packages/mcp-server/src/persistence.ts`.

**4. Set environment variables**

In the service's **Variables** tab, add:

| Name | Value |
|---|---|
| `PUBLISHER_PRIVATE_KEY` | `0x...` (the wallet that publishes runs — must be a `trustedAttester` on `RunRegistryV2`) |
| `NETWORK` | `galileo` |
| `PORT` | `8080` |
| `PUBLIC_URL` | `https://mcp.cruciblebench.xyz` (set after step 7 — placeholder for now) |
| `WEB_PUBLIC_URL` | `https://cruciblebench.xyz` (the Vercel domain — controls CORS) |
| `SQLITE_PATH` | `/data/mcp-server.sqlite` |

Railway auto-injects `RAILWAY_PUBLIC_DOMAIN` (e.g. `crucible-mcp.up.railway.app`) — useful for the initial smoke test before custom DNS is set.

**5. Generate a domain**

In **Settings** → **Networking** → **Generate Domain**. Railway gives you a free `*.up.railway.app` subdomain immediately. Note it down.

**6. Deploy**

Railway auto-deploys when you push to your default branch. The first deploy takes ~4 min (Docker multi-stage build + native `better-sqlite3` compile). Subsequent deploys are ~1 min thanks to layer caching.

If you want to trigger manually: click **Deploy** in the dashboard.

**7. Verify**

```bash
curl https://<your-app>.up.railway.app/healthz
# expected: {"ok":true,"service":"crucible-mcp","version":"2.0.0"}
```

**8. Add custom domain**

In **Settings** → **Networking** → **+ Custom Domain** → enter `mcp.cruciblebench.xyz`. Railway prints a CNAME target. Add it to your DNS provider. TLS is auto-provisioned via Let's Encrypt within ~5 min.

After the cert is live, update `PUBLIC_URL` env var in the Variables tab to `https://mcp.cruciblebench.xyz` and the service restarts automatically.

**9. Update Vercel env var**

In the Vercel project, set `NEXT_PUBLIC_MCP_URL=https://mcp.cruciblebench.xyz/v1` and trigger a redeploy.

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

## Ongoing ops (Railway)

**Logs** — Railway dashboard → service → **Deployments** tab → click latest deploy → live log tail.

Or via CLI (`npm i -g @railway/cli && railway login`):

```bash
railway logs
```

**SSH into the running container**

```bash
railway run bash      # opens an interactive shell with all env vars set
```

**Inspect the SQLite DB**

```bash
railway run sqlite3 /data/mcp-server.sqlite '.tables'
```

**Redeploy after code changes** — automatic on every push to your default branch. To force a redeploy without a commit: dashboard → **Deploy** button.

**Update secrets** — dashboard → **Variables** tab → edit. Service restarts automatically.

**Cost monitoring** — dashboard → top-right **Usage** widget. Hobby plan = $5 monthly credit; you're charged for usage beyond that. For our service the meter rarely passes $2–3/mo.

---

## Alternative: Fly.io path

If you'd rather use Fly.io (also configured), see `fly.toml` at the repo root. Quick version:

```bash
brew install flyctl && fly auth signup
fly launch --no-deploy --copy-config --name crucible-mcp   # from repo root
fly volumes create crucible_mcp_data --size 1 --region <your region>
fly secrets set PUBLISHER_PRIVATE_KEY=0x...
fly deploy
fly certs add mcp.cruciblebench.xyz
```

`fly.toml` already configures: `shared-cpu-1x` 512MB VM, `auto_stop_machines = "stop"` (sleeps when idle, wakes in ~1s), `/data` volume mount, `/healthz` health check. Cost ~$0–3/mo. Same Dockerfile.
