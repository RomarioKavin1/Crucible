import Link from "next/link";
import { listRunsFromDisk, DEFAULT_RUNS_DIR } from "@/lib/server/run-store";

export default async function Home() {
  const runs = await listRunsFromDisk(DEFAULT_RUNS_DIR);
  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Local runs</h2>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-[#e5e9f0]">Sessions</h1>
        </div>
        <Link
          href="/new"
          className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#0f1623] border border-[#22d3ee] text-[#22d3ee] hover:bg-[#22d3ee] hover:text-[#070b14] px-4 py-2 rounded transition-colors"
        >
          + New Run
        </Link>
      </div>
      {runs.length === 0 ? (
        <div className="bg-[#0f1623] border border-dashed border-[#1f2a3d] rounded p-12 text-center">
          <p className="font-mono text-[#5e6b80] mb-2">// no runs yet</p>
          <p className="text-xs text-[#5e6b80]">Click <code className="text-[#22d3ee]">+ New Run</code> to start one.</p>
        </div>
      ) : (
        <div className="bg-[#0f1623] border border-[#1f2a3d] rounded">
          {runs.map((r, i) => (
            <Link
              key={r.id}
              href={`/runs/${r.id}`}
              className={`block px-4 py-3 hover:border-[#22d3ee44] hover:bg-[#22d3ee06] ${
                i < runs.length - 1 ? "border-b border-[#1f2a3d]" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[#e5e9f0] truncate">{r.id}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5e6b80] shrink-0">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="font-mono text-xs text-[#5e6b80] mt-0.5">
                {r.scenario} · <span className="text-[#22d3ee]">{r.recipe}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
