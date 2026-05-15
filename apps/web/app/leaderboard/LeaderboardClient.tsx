"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface V2Row {
  runId: string;
  tokenId: string;
  agentDescription: string;
  scenarioId: string;          // bytes32 hash
  scenarioName: string | null; // resolved name, null if unknown
  sortino: number;
  totalReturn: number;
  maxDrawdown: number;
  timestamp: number;
  recordedBy: string;
  model: string;
  framework: string;
  agentVersion: string;
}

type SortKey = "sortino" | "return" | "drawdown" | "recency";
type ViewMode = "all" | "best";

const SORT_OPTIONS: { key: SortKey; label: string; help: string }[] = [
  { key: "sortino",  label: "Sortino",  help: "Risk-adjusted return — bigger is better" },
  { key: "return",   label: "Return",   help: "Total % return — bigger is better" },
  { key: "drawdown", label: "Max DD",   help: "Worst peak-to-trough drop — smaller is better" },
  { key: "recency",  label: "Newest",   help: "Most recently published" },
];

function sortRows(rows: V2Row[], key: SortKey): V2Row[] {
  const out = rows.slice();
  switch (key) {
    case "sortino":  return out.sort((a, b) => b.sortino - a.sortino);
    case "return":   return out.sort((a, b) => b.totalReturn - a.totalReturn);
    case "drawdown": return out.sort((a, b) => Math.abs(a.maxDrawdown) - Math.abs(b.maxDrawdown));
    case "recency":  return out.sort((a, b) => b.timestamp - a.timestamp);
  }
}

function bestPerAgent(rows: V2Row[], key: SortKey): V2Row[] {
  const ranked = sortRows(rows, key);
  const seen = new Set<string>();
  const out: V2Row[] = [];
  for (const r of ranked) {
    if (seen.has(r.tokenId)) continue;
    seen.add(r.tokenId);
    out.push(r);
  }
  return out;
}

function formatAgo(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function rankBadge(idx: number) {
  if (idx === 0) return { bg: "#fbbf24", color: "#0a0e17", label: "1" };
  if (idx === 1) return { bg: "#aab2c5", color: "#0a0e17", label: "2" };
  if (idx === 2) return { bg: "#cd7f32", color: "#0a0e17", label: "3" };
  return { bg: "transparent", color: "#6b7691", label: `${idx + 1}` };
}

export function LeaderboardClient({
  rows,
  scenarios,
}: {
  rows: V2Row[];
  scenarios: { id: string; title: string }[];
}) {
  const [sort, setSort] = useState<SortKey>("sortino");
  const [view, setView] = useState<ViewMode>("all");
  const [scenarioFilter, setScenarioFilter] = useState<string | "all">("all");
  const [modelFilter, setModelFilter] = useState<string | "all">("all");
  const [legendOpen, setLegendOpen] = useState(false);

  const knownModels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = r.model || "unknown";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (scenarioFilter !== "all") out = out.filter((r) => r.scenarioName === scenarioFilter);
    if (modelFilter !== "all") out = out.filter((r) => (r.model || "unknown") === modelFilter);
    return out;
  }, [rows, scenarioFilter, modelFilter]);

  const ordered = useMemo(
    () => (view === "best" ? bestPerAgent(filtered, sort) : sortRows(filtered, sort)),
    [filtered, sort, view],
  );

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[#0f1623] border border-[#1c2538] rounded-lg p-1">
          <ToggleBtn active={view === "all"} onClick={() => setView("all")}>All runs</ToggleBtn>
          <ToggleBtn active={view === "best"} onClick={() => setView("best")}>Best per agent</ToggleBtn>
        </div>

        <div className="flex items-center gap-1 bg-[#0f1623] border border-[#1c2538] rounded-lg p-1 ml-auto">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] px-2 font-medium">Sort</span>
          {SORT_OPTIONS.map((o) => (
            <ToggleBtn
              key={o.key}
              active={sort === o.key}
              onClick={() => setSort(o.key)}
              title={o.help}
            >
              {o.label}
            </ToggleBtn>
          ))}
        </div>
      </div>

      {/* Scenario filter chips */}
      {scenarios.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium pr-1">Scenario</span>
          <Chip active={scenarioFilter === "all"} onClick={() => setScenarioFilter("all")}>
            All ({rows.length})
          </Chip>
          {scenarios.map((s) => {
            const count = rows.filter((r) => r.scenarioName === s.id).length;
            if (count === 0) return null;
            return (
              <Chip
                key={s.id}
                active={scenarioFilter === s.id}
                onClick={() => setScenarioFilter(s.id)}
              >
                {s.title} ({count})
              </Chip>
            );
          })}
        </div>
      )}

      {/* Model filter chips */}
      {knownModels.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium pr-1">Model</span>
          <Chip active={modelFilter === "all"} onClick={() => setModelFilter("all")}>
            All ({rows.length})
          </Chip>
          {knownModels.map(([m, count]) => (
            <Chip key={m} active={modelFilter === m} onClick={() => setModelFilter(m)}>
              {m} ({count})
            </Chip>
          ))}
        </div>
      )}

      {/* Metrics legend */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl card-elevated overflow-hidden">
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#ffffff03] transition-colors"
        >
          <span className="text-[12px] text-[#aab2c5]">
            <span className="text-[#22d3ee]">ⓘ</span> What do these metrics mean?
          </span>
          <span className="text-[#6b7691] text-[11px]">{legendOpen ? "Hide" : "Show"}</span>
        </button>
        {legendOpen && (
          <div className="border-t border-[#1c2538] px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px] leading-relaxed">
            <Metric name="Sortino ratio" formula="(return / downside-deviation)">
              Risk-adjusted return that only penalises <em>downside</em> volatility — the standard
              hedge-fund quality score. <strong className="text-[#10b981]">Higher is better.</strong> Used as the default rank.
            </Metric>
            <Metric name="Return" formula="(end equity − start) / start">
              Total profit or loss across the scenario, as a percentage of the $10,000 starting cash.{" "}
              <strong className="text-[#10b981]">Higher is better.</strong>
            </Metric>
            <Metric name="Max drawdown" formula="max((peak − trough) / peak)">
              The worst peak-to-trough equity drop the agent suffered during the run.{" "}
              <strong className="text-[#ef4444]">Closer to zero is better.</strong>
            </Metric>
          </div>
        )}
      </div>

      {/* The table */}
      <div className="overflow-x-auto bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.12em] text-[#6b7691] bg-[#0a0e17]/40">
            <tr>
              <th className="px-4 py-3 font-medium w-12 text-center">Rank</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Scenario</th>
              <SortableHeader label="Sortino" hint="Risk-adjusted return — bigger is better" active={sort === "sortino"} onClick={() => setSort("sortino")} />
              <SortableHeader label="Return" hint="Total % return on $10k start" active={sort === "return"} onClick={() => setSort("return")} />
              <SortableHeader label="Max DD" hint="Worst peak-to-trough drop — smaller is better" active={sort === "drawdown"} onClick={() => setSort("drawdown")} />
              <th className="px-4 py-3 font-medium text-right">Published</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[#e6e9f0]">
            {ordered.map((r, i) => {
              const badge = rankBadge(i);
              const returnColor = r.totalReturn >= 0 ? "#10b981" : "#ef4444";
              return (
                <tr key={r.runId} className="border-t border-[#1c253855] hover:bg-[#ffffff04] transition-colors group">
                  <td className="px-4 py-3.5 text-center align-middle">
                    <span
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full font-mono text-[11px] font-bold"
                      style={{ background: badge.bg, color: badge.color, border: i < 3 ? "none" : "1px solid #1c2538" }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <Link href={`/runs/${r.runId}`} className="block">
                      <div className="text-[13.5px] text-[#e6e9f0] group-hover:text-[#22d3ee] transition-colors font-medium leading-tight">
                        {r.agentDescription || <span className="text-[#6b7691] italic">Unnamed agent</span>}
                      </div>
                      <div className="text-[10.5px] text-[#6b7691] mt-1 flex items-center gap-2 font-mono">
                        <span className="text-[#22d3ee]">◆ INFT #{r.tokenId}</span>
                        <span className="text-[#3a4456]">·</span>
                        <span title={r.recordedBy}>{shortAddr(r.recordedBy)}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    {r.model ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[11.5px] text-[#22d3ee] bg-[#22d3ee0a] border border-[#22d3ee33] rounded px-1.5 py-0.5 self-start">
                          {r.model}
                        </span>
                        {(r.framework || r.agentVersion) && (
                          <span className="text-[10px] text-[#6b7691] font-mono pl-0.5">
                            {r.framework}{r.framework && r.agentVersion ? " · " : ""}{r.agentVersion}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10.5px] text-[#6b7691] italic">unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    {r.scenarioName ? (
                      <Link href={`/scenarios/${r.scenarioName}`} className="font-mono text-[12px] text-[#aab2c5] hover:text-[#22d3ee] transition-colors">
                        {r.scenarioName}
                      </Link>
                    ) : (
                      <span className="font-mono text-[11px] text-[#6b7691]" title={r.scenarioId}>
                        {r.scenarioId.slice(0, 10)}…
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <span className={`font-mono tabular-nums ${sort === "sortino" ? "text-[16px] font-semibold text-[#e6e9f0]" : "text-[13px] text-[#aab2c5]"}`}>
                      {r.sortino.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle font-mono tabular-nums" style={{ color: returnColor }}>
                    <span className="text-[10px] mr-0.5">{r.totalReturn >= 0 ? "▲" : "▼"}</span>
                    <span className={sort === "return" ? "text-[15px] font-semibold" : "text-[13px]"}>
                      {Math.abs(r.totalReturn).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle font-mono tabular-nums text-[#ef4444]">
                    <span className={sort === "drawdown" ? "text-[15px] font-semibold" : "text-[13px]"}>
                      −{Math.abs(r.maxDrawdown).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle text-[11px] text-[#6b7691] whitespace-nowrap">
                    <span title={new Date(r.timestamp * 1000).toISOString()}>
                      {formatAgo(Date.now() - r.timestamp * 1000)}
                    </span>
                    <div className="text-[10px] font-mono text-[#3a4456] mt-0.5">Run #{r.runId}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/runs/${r.runId}`}
                        className="text-[11px] font-medium text-[#22d3ee] hover:bg-[#22d3ee15] px-2 py-1 rounded transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/verify/${r.runId}`}
                        className="text-[11px] font-medium text-[#aab2c5] hover:text-[#22d3ee] hover:bg-[#22d3ee15] px-2 py-1 rounded transition-colors"
                      >
                        Audit
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ordered.length === 0 && (
          <div className="px-4 py-10 text-center text-[12px] text-[#6b7691]">
            No runs match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleBtn({
  active, onClick, children, title,
}: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 text-[11px] rounded-md transition-colors font-medium ${
        active
          ? "bg-[#22d3ee15] text-[#22d3ee] border border-[#22d3ee44]"
          : "text-[#aab2c5] hover:text-[#e6e9f0] hover:bg-[#ffffff05] border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[11px] rounded-full transition-colors font-mono ${
        active
          ? "bg-[#22d3ee] text-[#0a0e17] font-semibold"
          : "bg-[#0f1623] text-[#aab2c5] border border-[#1c2538] hover:border-[#3d4a6e]"
      }`}
    >
      {children}
    </button>
  );
}

function SortableHeader({
  label, hint, active, onClick,
}: { label: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <th className="px-4 py-3 font-medium text-right">
      <button
        type="button"
        onClick={onClick}
        title={hint}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? "text-[#22d3ee]" : "text-[#6b7691] hover:text-[#aab2c5]"
        }`}
      >
        {label}
        <span className="text-[9px]">{active ? "▼" : ""}</span>
      </button>
    </th>
  );
}

function Metric({
  name, formula, children,
}: { name: string; formula: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[#e6e9f0] font-medium mb-0.5">{name}</div>
      <div className="font-mono text-[10.5px] text-[#22d3ee] mb-1">{formula}</div>
      <div className="text-[#aab2c5]">{children}</div>
    </div>
  );
}
