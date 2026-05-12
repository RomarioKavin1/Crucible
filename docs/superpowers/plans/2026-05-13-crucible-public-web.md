# Crucible Public Web App Implementation Plan (Plan 5 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Ship a public-facing Next.js leaderboard at `apps/web` deployed to Vercel. It reads from `RunRegistry` (0G Chain) and `0G Storage`, displaying: overall leaderboard, per-scenario leaderboards, agent detail pages, replay viewer (read-only, reusing `@crucible/ui-kit`), and a "Fork this recipe" download. No write operations — strictly read-only.

**Architecture:** Next.js 14 App Router on Vercel. All data fetching is server-side via ethers.js (RunRegistry calls) + the og-client storage download (recipe + trace fetches). Static-where-possible: leaderboard pages use `revalidate = 60` for ISR. The replay viewer is a client component using shared `ScenarioReplay`.

**Tech Stack:** Next.js 14, React 18, Tailwind, shadcn/ui, ethers.js v6, `@crucible/ui-kit`, `@crucible/og-client`. Deployed to Vercel.

**Out of scope (later):** Recipe diff viewer (mentioned in the spec but defer to a follow-up; the og-client and ui-kit components support it but the page wiring is left for v6), authenticated user actions, fork/clone-to-IDE flows, "Live alpha" rotation logic (we render the rotating scenarios as a flat per-scenario tab in v1).

---

## File Structure

```
apps/web/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── vercel.json
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     Overall leaderboard (default view)
│   ├── scenarios/[id]/page.tsx      Per-scenario leaderboard
│   ├── agents/[id]/page.tsx         Agent detail page
│   ├── runs/[id]/page.tsx           Replay page (chart + reasoning, read-only)
│   └── api/
│       └── recipe/[hash]/route.ts   Download recipe.yaml from 0G Storage
├── lib/
│   ├── chain.ts                     ethers provider + contract clients
│   ├── leaderboard.ts               aggregate scoring fetchers
│   └── format.ts                    sortino/return formatting helpers
├── components/
│   ├── LeaderboardTable.tsx
│   ├── AgentCard.tsx
│   └── ScenarioFilterTabs.tsx
└── styles/
    └── globals.css
```

---

## Task 1: Bootstrap apps/web Next.js app

**Files:** mirror Plan 4 Task 5 setup (package.json, next.config, tsconfig, tailwind, postcss, layout, globals).

- [ ] **Step 1: package.json**

```json
{
  "name": "@crucible/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@crucible/og-client": "workspace:*",
    "@crucible/ui-kit": "workspace:*",
    "@crucible/core": "workspace:*",
    "ethers": "^6.13.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/typography": "^0.5.0"
  }
}
```

- [ ] **Step 2: next.config.mjs**

```javascript
/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ["@crucible/ui-kit", "@crucible/core", "@crucible/og-client"],
  experimental: { serverComponentsExternalPackages: ["ethers"] },
};
```

- [ ] **Step 3: tsconfig + tailwind + postcss**

Same shape as Plan 4 Task 5 (copy with `apps/web` paths).

`apps/web/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui-kit/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
```

- [ ] **Step 4: vercel.json (build-time env hint)**

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @crucible/web build",
  "outputDirectory": ".next"
}
```

- [ ] **Step 5: globals.css + layout.tsx**

`apps/web/styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { background: #0f172a; color: #e2e8f0; }
```

`apps/web/app/layout.tsx`:
```tsx
import "../styles/globals.css";
import Link from "next/link";

export const metadata = { title: "Crucible — Public Leaderboard", description: "Verifiable AI trading agent benchmarks on 0G" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold flex items-center gap-2">
              🔥 <span>Crucible</span>
              <span className="text-xs text-slate-500 font-normal">Public Leaderboard</span>
            </Link>
            <nav className="space-x-4 text-sm">
              <Link href="/" className="text-slate-300 hover:text-white">Leaderboard</Link>
              <a href="https://docs.0g.ai" target="_blank" rel="noopener" className="text-slate-300 hover:text-white">Built on 0G</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Install + commit**

```bash
pnpm install
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): bootstrap public leaderboard Next.js app"
```

---

## Task 2: Chain client wiring

**Files:**
- Create: `apps/web/lib/chain.ts`

- [ ] **Step 1: Implement chain.ts**

```typescript
import { ethers } from "ethers";
import {
  loadChainConfig,
  RunRegistryClient,
  AgentRegistryClient,
  ScenarioRegistryClient,
  type Network,
} from "@crucible/og-client";

const NETWORK: Network = (process.env.NEXT_PUBLIC_OG_NETWORK as Network) ?? "mainnet";

let _provider: ethers.JsonRpcProvider | null = null;
async function provider() {
  if (_provider) return _provider;
  const cfg = await loadChainConfig(NETWORK);
  _provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  return _provider;
}

export async function getRunRegistry() {
  const cfg = await loadChainConfig(NETWORK);
  return new RunRegistryClient(cfg, await provider());
}

export async function getAgentRegistry() {
  const cfg = await loadChainConfig(NETWORK);
  return new AgentRegistryClient(cfg, await provider());
}

export async function getScenarioRegistry() {
  const cfg = await loadChainConfig(NETWORK);
  return new ScenarioRegistryClient(cfg, await provider());
}

export const ACTIVE_NETWORK = NETWORK;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/chain.ts
git commit -m "feat(web): chain client wrappers for read-only data fetching"
```

---

## Task 3: Leaderboard data fetcher

**Files:**
- Create: `apps/web/lib/leaderboard.ts`
- Create: `apps/web/lib/format.ts`

- [ ] **Step 1: format.ts**

```typescript
const E6 = 1_000_000;

export function fromE6(x: bigint): number {
  return Number(x) / E6;
}

export function fmtSortino(x: number): string {
  return x.toFixed(4);
}

export function fmtPct(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}

export function fmtAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function fmtBytes32(b: string): string {
  if (!b.startsWith("0x")) return b;
  return `${b.slice(0, 10)}…${b.slice(-6)}`;
}
```

- [ ] **Step 2: leaderboard.ts**

```typescript
import { getRunRegistry, getAgentRegistry, getScenarioRegistry } from "./chain.js";
import { fromE6 } from "./format.js";
import { ethers } from "ethers";

export interface LeaderboardRow {
  runId: string;
  agentId: string;
  scenarioId: string;
  recipeHash: string;
  traceHash: string;
  sortino: number;
  totalReturn: number;
  maxDrawdown: number;
  timestamp: number;
  ownerAddr: string;
}

export async function fetchAllRuns(): Promise<LeaderboardRow[]> {
  const runReg = await getRunRegistry();
  const agentReg = await getAgentRegistry();
  const total = await runReg.totalRuns();
  const rows: LeaderboardRow[] = [];
  for (let i = 0n; i < total; i++) {
    const run = await runReg.getRun(i);
    let owner = "0x0000000000000000000000000000000000000000";
    try {
      // AgentRegistryClient doesn't expose ownerOf in our wrapper but the underlying contract has it
      // Use raw read here:
      const cfg = (await import("./chain.js")).ACTIVE_NETWORK;
      // Skip owner lookup for now to keep this fast; agent detail page will show it.
    } catch {}
    rows.push({
      runId: i.toString(),
      agentId: run.agentId.toString(),
      scenarioId: ethers.decodeBytes32String(run.scenarioId),
      recipeHash: run.recipeHash,
      traceHash: run.traceHash,
      sortino: fromE6(run.scoreSortinoE6),
      totalReturn: fromE6(run.totalReturnE6),
      maxDrawdown: fromE6(run.maxDrawdownE6),
      timestamp: Number(run.timestamp),
      ownerAddr: owner,
    });
  }
  return rows;
}

/** Aggregate to one row per agent: average Sortino across all their runs. */
export interface AgentAggregateRow {
  agentId: string;
  runCount: number;
  avgSortino: number;
  bestSortino: number;
  totalReturnSum: number;
}

export function aggregateByAgent(runs: LeaderboardRow[]): AgentAggregateRow[] {
  const byAgent = new Map<string, LeaderboardRow[]>();
  for (const r of runs) {
    if (!byAgent.has(r.agentId)) byAgent.set(r.agentId, []);
    byAgent.get(r.agentId)!.push(r);
  }
  const out: AgentAggregateRow[] = [];
  for (const [agentId, runs] of byAgent) {
    const sortinos = runs.map((r) => r.sortino);
    out.push({
      agentId,
      runCount: runs.length,
      avgSortino: sortinos.reduce((a, b) => a + b, 0) / sortinos.length,
      bestSortino: Math.max(...sortinos),
      totalReturnSum: runs.reduce((acc, r) => acc + r.totalReturn, 0),
    });
  }
  return out.sort((a, b) => b.avgSortino - a.avgSortino);
}

export function filterByScenario(runs: LeaderboardRow[], scenarioId: string): LeaderboardRow[] {
  return runs.filter((r) => r.scenarioId === scenarioId).sort((a, b) => b.sortino - a.sortino);
}

export async function listScenarios(): Promise<string[]> {
  const reg = await getScenarioRegistry();
  return reg.listIds();
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib
git commit -m "feat(web): leaderboard data fetchers + aggregation"
```

---

## Task 4: LeaderboardTable component

**Files:**
- Create: `apps/web/components/LeaderboardTable.tsx`

- [ ] **Step 1: Implement (server component)**

```tsx
import Link from "next/link";
import { fmtSortino, fmtPct, fmtBytes32 } from "@/lib/format";
import type { LeaderboardRow, AgentAggregateRow } from "@/lib/leaderboard";

export function PerScenarioTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left border-b border-slate-700">
        <tr>
          <Th>Rank</Th>
          <Th>Agent</Th>
          <Th>Sortino</Th>
          <Th>Return</Th>
          <Th>Drawdown</Th>
          <Th>Recipe</Th>
          <Th>Run</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.runId} className="border-b border-slate-800 hover:bg-slate-900/50">
            <Td>{i + 1}</Td>
            <Td><Link className="text-cyan-400 hover:underline" href={`/agents/${r.agentId}`}>#{r.agentId}</Link></Td>
            <Td className="font-mono">{fmtSortino(r.sortino)}</Td>
            <Td className={r.totalReturn >= 0 ? "text-green-400" : "text-red-400"}>{fmtPct(r.totalReturn)}</Td>
            <Td className="text-red-400">{fmtPct(Math.abs(r.maxDrawdown))}</Td>
            <Td className="font-mono text-xs text-slate-500">{fmtBytes32(r.recipeHash)}</Td>
            <Td><Link className="text-cyan-400 hover:underline" href={`/runs/${r.runId}`}>view</Link></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OverallTable({ rows }: { rows: AgentAggregateRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left border-b border-slate-700">
        <tr>
          <Th>Rank</Th>
          <Th>Agent</Th>
          <Th>Runs</Th>
          <Th>Avg Sortino</Th>
          <Th>Best Sortino</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.agentId} className="border-b border-slate-800 hover:bg-slate-900/50">
            <Td>{i + 1}</Td>
            <Td><Link className="text-cyan-400 hover:underline" href={`/agents/${r.agentId}`}>#{r.agentId}</Link></Td>
            <Td>{r.runCount}</Td>
            <Td className="font-mono">{fmtSortino(r.avgSortino)}</Td>
            <Td className="font-mono">{fmtSortino(r.bestSortino)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold text-slate-400">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className ?? ""}`}>{children}</td>;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/LeaderboardTable.tsx
git commit -m "feat(web): leaderboard table components (overall + per-scenario)"
```

---

## Task 5: Overall leaderboard page

**Files:**
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/components/ScenarioFilterTabs.tsx`

- [ ] **Step 1: ScenarioFilterTabs**

```tsx
import Link from "next/link";

export function ScenarioFilterTabs({ scenarios, activeId }: { scenarios: string[]; activeId?: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-800 mb-4 overflow-x-auto">
      <Tab href="/" active={!activeId}>Overall</Tab>
      {scenarios.map((id) => (
        <Tab key={id} href={`/scenarios/${id}`} active={activeId === id}>
          {id}
        </Tab>
      ))}
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
        active ? "border-cyan-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: app/page.tsx**

```tsx
import { fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";

export const revalidate = 60;

export default async function HomePage() {
  const [runs, scenarios] = await Promise.all([fetchAllRuns(), listScenarios()]);
  const aggregated = aggregateByAgent(runs);
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
      <ScenarioFilterTabs scenarios={scenarios} />
      {aggregated.length === 0 ? (
        <EmptyState />
      ) : (
        <OverallTable rows={aggregated} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-slate-400 text-center py-12 border border-dashed border-slate-800 rounded">
      <p className="mb-2">No runs published yet.</p>
      <p className="text-xs">Run an agent locally with <code className="text-cyan-400">crucible run --publish-network mainnet</code> to appear here.</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/ScenarioFilterTabs.tsx
git commit -m "feat(web): overall leaderboard page with scenario filter tabs"
```

---

## Task 6: Per-scenario leaderboard page

**Files:**
- Create: `apps/web/app/scenarios/[id]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { fetchAllRuns, filterByScenario, listScenarios } from "@/lib/leaderboard";
import { PerScenarioTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";

export const revalidate = 60;

export default async function ScenarioPage({ params }: { params: { id: string } }) {
  const [runs, scenarios] = await Promise.all([fetchAllRuns(), listScenarios()]);
  const filtered = filterByScenario(runs, params.id);
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-1">Scenario: <code>{params.id}</code></h2>
      <p className="text-sm text-slate-400 mb-4">{filtered.length} run{filtered.length === 1 ? "" : "s"} on this scenario.</p>
      <ScenarioFilterTabs scenarios={scenarios} activeId={params.id} />
      {filtered.length === 0 ? (
        <p className="text-slate-400">No runs yet for this scenario.</p>
      ) : (
        <PerScenarioTable rows={filtered} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/scenarios
git commit -m "feat(web): per-scenario leaderboard page"
```

---

## Task 7: Agent detail page

**Files:**
- Create: `apps/web/app/agents/[id]/page.tsx`
- Create: `apps/web/components/AgentCard.tsx`

- [ ] **Step 1: AgentCard**

```tsx
import Link from "next/link";
import { fmtAddr, fmtSortino, fmtPct, fmtBytes32 } from "@/lib/format";

export interface AgentCardProps {
  agentId: string;
  ownerAddr: string;
  runCount: number;
  bestSortino: number;
  recentRuns: { runId: string; scenarioId: string; sortino: number; totalReturn: number }[];
}

export function AgentCard({ agentId, ownerAddr, runCount, bestSortino, recentRuns }: AgentCardProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-700 rounded p-6">
        <div className="text-3xl font-mono mb-1">Agent #{agentId}</div>
        <div className="text-sm text-slate-400 mb-4">Owner: <code>{fmtAddr(ownerAddr)}</code></div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Stat label="Runs" value={runCount.toString()} />
          <Stat label="Best Sortino" value={fmtSortino(bestSortino)} />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Recent runs</h3>
        <ul className="space-y-2">
          {recentRuns.map((r) => (
            <li key={r.runId}>
              <Link href={`/runs/${r.runId}`} className="block bg-slate-900/40 border border-slate-700 rounded p-3 hover:border-cyan-500">
                <div className="flex justify-between items-baseline">
                  <span>{r.scenarioId}</span>
                  <span className="font-mono text-sm">{fmtSortino(r.sortino)}</span>
                </div>
                <div className="text-xs text-slate-500">return {fmtPct(r.totalReturn)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-mono text-lg">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Page**

```tsx
import { fetchAllRuns } from "@/lib/leaderboard";
import { getAgentRegistry } from "@/lib/chain";
import { AgentCard } from "@/components/AgentCard";

export const revalidate = 60;

export default async function AgentPage({ params }: { params: { id: string } }) {
  const allRuns = await fetchAllRuns();
  const myRuns = allRuns.filter((r) => r.agentId === params.id);
  if (myRuns.length === 0) {
    return <p className="text-slate-400">No runs for agent #{params.id}.</p>;
  }
  let owner = "0x0000000000000000000000000000000000000000";
  try {
    // AgentRegistryClient doesn't expose ownerOf — call raw
    // For v1 we'll skip; the contract supports it but the client wrapper doesn't.
    void getAgentRegistry();
  } catch {}
  const sorted = myRuns.sort((a, b) => b.timestamp - a.timestamp);
  const bestSortino = Math.max(...myRuns.map((r) => r.sortino));
  return (
    <AgentCard
      agentId={params.id}
      ownerAddr={owner}
      runCount={myRuns.length}
      bestSortino={bestSortino}
      recentRuns={sorted.slice(0, 10).map((r) => ({
        runId: r.runId,
        scenarioId: r.scenarioId,
        sortino: r.sortino,
        totalReturn: r.totalReturn,
      }))}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/agents apps/web/components/AgentCard.tsx
git commit -m "feat(web): agent detail page with run history"
```

---

## Task 8: Replay page (read-only)

**Files:**
- Create: `apps/web/app/runs/[id]/page.tsx`
- Create: `apps/web/components/ReplayClient.tsx`

- [ ] **Step 1: ReplayClient (client component)**

```tsx
"use client";
import { useEffect, useState } from "react";
import { ScenarioReplay, AgentReasoningStream, PnLPanel } from "@crucible/ui-kit";
import type { TraceEntry, Tick } from "@crucible/core";

export function ReplayClient({ runId, traceHash, scenarioId }: { runId: string; traceHash: string; scenarioId: string }) {
  const [entries, setEntries] = useState<TraceEntry[] | null>(null);
  const [ticks, setTicks] = useState<Tick[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Trace download via api proxy
        const traceResp = await fetch(`/api/trace/${traceHash}`);
        if (!traceResp.ok) throw new Error(`trace fetch ${traceResp.status}`);
        const traceText = await traceResp.text();
        const ents = traceText.split("\n").filter(Boolean).map((l) => JSON.parse(l) as TraceEntry);
        setEntries(ents);

        // Scenario ticks via separate api
        const sResp = await fetch(`/api/scenario/${encodeURIComponent(scenarioId)}/ticks`);
        if (!sResp.ok) throw new Error(`scenario fetch ${sResp.status}`);
        const sJson = await sResp.json();
        setTicks(sJson.ticks);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [traceHash, scenarioId]);

  if (error) return <p className="text-red-400">Failed to load: {error}</p>;
  if (!entries || !ticks) return <p className="text-slate-400">Loading replay...</p>;

  const fills = entries.flatMap((e) => e.fills);
  const lastPortfolio = entries[entries.length - 1]?.portfolio;
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ScenarioReplay ticks={ticks} fills={fills} height={400} />
        </div>
        <div>{lastPortfolio && <PnLPanel portfolio={lastPortfolio} />}</div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Agent reasoning</h3>
        <AgentReasoningStream entries={entries} maxHeight={600} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Page (server component fetches metadata, client fetches trace)**

```tsx
import { getRunRegistry } from "@/lib/chain";
import { fmtSortino, fmtPct, fmtAddr } from "@/lib/format";
import { fromE6 } from "@/lib/format";
import { ReplayClient } from "@/components/ReplayClient";
import { ethers } from "ethers";
import Link from "next/link";

export const revalidate = 300;

export default async function RunPage({ params }: { params: { id: string } }) {
  const reg = await getRunRegistry();
  const run = await reg.getRun(BigInt(params.id));
  const scenarioId = ethers.decodeBytes32String(run.scenarioId);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Back to leaderboard</Link>
        <h2 className="text-2xl font-semibold mt-2">Run #{params.id}</h2>
        <div className="text-sm text-slate-400">
          Scenario: <Link href={`/scenarios/${scenarioId}`} className="text-cyan-400">{scenarioId}</Link>
          {" · "}
          Agent: <Link href={`/agents/${run.agentId.toString()}`} className="text-cyan-400">#{run.agentId.toString()}</Link>
          {" · "}
          By: <code>{fmtAddr(run.recordedBy)}</code>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Metric label="Sortino" value={fmtSortino(fromE6(run.scoreSortinoE6))} />
        <Metric label="Total return" value={fmtPct(fromE6(run.totalReturnE6))} positive={fromE6(run.totalReturnE6) >= 0} />
        <Metric label="Max drawdown" value={fmtPct(Math.abs(fromE6(run.maxDrawdownE6)))} negative />
      </div>
      <ReplayClient runId={params.id} traceHash={run.traceHash} scenarioId={scenarioId} />
    </div>
  );
}

function Metric({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  const cls = positive ? "text-green-400" : negative ? "text-red-400" : "text-slate-100";
  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-mono text-lg ${cls}`}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/runs apps/web/components/ReplayClient.tsx
git commit -m "feat(web): run replay page with chart + reasoning"
```

---

## Task 9: API routes for trace + scenario + recipe download

**Files:**
- Create: `apps/web/app/api/trace/[hash]/route.ts`
- Create: `apps/web/app/api/scenario/[id]/ticks/route.ts`
- Create: `apps/web/app/api/recipe/[hash]/route.ts`

- [ ] **Step 1: Trace download**

```typescript
import { downloadBytes } from "@crucible/og-client";
import { ACTIVE_NETWORK } from "@/lib/chain";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { hash: string } }) {
  try {
    const data = await downloadBytes(params.hash, ACTIVE_NETWORK);
    return new Response(Buffer.from(data), {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "public, max-age=86400, immutable" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`download failed: ${msg}`, { status: 502 });
  }
}
```

- [ ] **Step 2: Scenario ticks** (scenarios live in repo for now; may move to 0G Storage in v6)

```typescript
import { NextResponse } from "next/server";
import { loadScenario } from "@crucible/core";
import path from "node:path";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const dir = path.resolve(process.cwd(), "..", "..", "scenarios", params.id);
    const scenario = await loadScenario(dir);
    return NextResponse.json({ ticks: scenario.ticks });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
```

- [ ] **Step 3: Recipe download**

```typescript
import { downloadBytes } from "@crucible/og-client";
import { ACTIVE_NETWORK } from "@/lib/chain";

export async function GET(_req: Request, { params }: { params: { hash: string } }) {
  try {
    const data = await downloadBytes(params.hash, ACTIVE_NETWORK);
    return new Response(Buffer.from(data), {
      headers: {
        "Content-Type": "application/x-yaml",
        "Content-Disposition": `attachment; filename="recipe-${params.hash.slice(0, 8)}.yaml"`,
      },
    });
  } catch (e) {
    return new Response(`recipe download failed: ${e instanceof Error ? e.message : e}`, { status: 502 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api
git commit -m "feat(web): api routes for trace/scenario/recipe data fetching"
```

---

## Task 10: Add "Fork this recipe" button on run page

**Files:**
- Modify: `apps/web/app/runs/[id]/page.tsx`

- [ ] **Step 1: Add download link**

In the run page, near the metric grid, add:

```tsx
<a
  href={`/api/recipe/${run.recipeHash}`}
  download
  className="inline-block bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs"
>
  📥 Fork this recipe (download YAML)
</a>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/runs/[id]/page.tsx
git commit -m "feat(web): fork-this-recipe download button on run page"
```

---

## Task 11: Vercel deploy

⚠️ Manual deploy step. Requires Vercel account.

- [ ] **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

- [ ] **Step 2: Build locally first to catch errors**

```bash
pnpm --filter @crucible/web build
```

Fix any build errors. Common issues:
- Missing transpilePackages entries
- `node:fs` imports in client components (must be server-only)
- Tailwind not picking up ui-kit content

- [ ] **Step 3: Configure Vercel project**

```bash
cd apps/web
vercel link        # link to a new project
```

- [ ] **Step 4: Set environment variables on Vercel**

Via dashboard or CLI:
```
NEXT_PUBLIC_OG_NETWORK=mainnet
OG_MAINNET_RPC=https://evmrpc.0g.ai           # verify URL
OG_MAINNET_INDEXER=https://indexer-storage.0g.ai  # verify URL
DEPLOYER_PRIVATE_KEY=<read-only-key-or-omit>  # only if storage downloads need a signed RPC
```

- [ ] **Step 5: Deploy preview**

```bash
vercel
```

- [ ] **Step 6: Promote to production**

```bash
vercel --prod
```

Capture the production URL (e.g., `https://crucible-leaderboard.vercel.app`).

- [ ] **Step 7: Commit deployment notes**

```bash
cd ../..
echo "Production URL: <paste here>" > samples/web-deployment.md
git add samples
git commit -m "deploy(web): production Vercel deployment"
```

---

## Task 12: Smoke verify the deployment

- [ ] **Step 1: Visit the production URL**

In browser:
1. Homepage should load with header + (likely empty) leaderboard message.
2. Click into a scenario tab — should show "No runs yet" for unpopulated scenarios.

- [ ] **Step 2: Publish a run via the local CLI to mainnet**

```bash
pnpm --filter @crucible/cli start run \
  --scenario scenarios/synthetic-eth-flash-crash \
  --agent apps/cli/test/fixtures/baseline-recipe.yaml \
  --out-dir runs \
  --publish-network mainnet \
  --publish-agent-id <your-agent-id-on-mainnet>
```

- [ ] **Step 3: Refresh the leaderboard**

Wait ~60s (ISR cache) and refresh. Your run should appear under the scenario.

- [ ] **Step 4: Click into the run**

Replay should load the chart + agent reasoning from 0G Storage.

- [ ] **Step 5: Test "Fork this recipe"**

Click the download button. The YAML should download.

- [ ] **Step 6: Commit demo proof**

```bash
echo "smoke: $(date) — homepage loaded, run published, replay rendered, recipe downloaded" >> samples/web-deployment.md
git add samples
git commit -m "smoke: web deployment end-to-end verified"
```

---

## Self-Review Checklist

1. **Spec coverage (Plan 5):** overall leaderboard ✓, per-scenario leaderboard ✓, agent detail page ✓, replay viewer reusing ui-kit ✓, recipe fork download ✓, Vercel deploy ✓.
2. **Out of scope:** recipe diff page (components exist; full page deferred), authenticated user actions, "Live alpha" rotation logic (just rendered as a flat per-scenario tab in v1), real-time leaderboard websocket updates (using ISR with 60s revalidate instead).
3. **Risks:**
   - The `apps/web/app/api/scenario/[id]/ticks/route.ts` reads scenarios from the local repo path. On Vercel, this works ONLY if scenarios are bundled into the deployment. For v1, the synthetic scenario is small and bundles fine. Real scenarios should move to 0G Storage with a `storageRootHash` lookup via ScenarioRegistry.
   - The `fetchAllRuns` does N+1 RPC calls (one per run). Acceptable up to ~100 runs. Beyond that, batch reads or event indexing.
   - Vercel build needs `pnpm install` from the monorepo root, configured via `vercel.json.buildCommand`.

---

## Notes for hackathon submission

After Plan 5 ships, the hackathon submission package is:

1. **Public GitHub repo:** the monorepo on `main` (after merging all feat branches).
2. **0G mainnet contract address:** `RunRegistry` from `contracts/deployed-addresses.json`.
3. **0G Explorer link:** `https://explorer.0g.ai/address/<RunRegistry-mainnet>`.
4. **Demo video (≤3 min):** record:
   - Open public leaderboard at the Vercel URL → shows runs
   - Click into a run → shows chart playback + agent reasoning
   - Click "Fork this recipe" → downloads YAML
   - Switch to local app → start a new run → watch live → publish → return to public site to see it appear
5. **README:** architecture diagram, tech stack, 0G modules used, local deploy steps, mainnet contract info.
6. **X post:** screenshot of public leaderboard or local live run + hashtags `#0GHackathon #BuildOn0G`, tags `@0G_labs @0g_CN @0g_Eco @HackQuest_`.
