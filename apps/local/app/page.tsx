import Link from "next/link";
import { listRunsFromDisk } from "@/lib/server/run-store";

export default async function Home() {
  const runs = await listRunsFromDisk("./runs");
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Runs</h2>
        <Link href="/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm">
          + New Run
        </Link>
      </div>
      {runs.length === 0 ? (
        <p className="text-slate-400">No runs yet. Start one with the New Run button above.</p>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`/runs/${r.id}`} className="block p-3 border border-slate-700 rounded hover:border-cyan-500">
                <div className="font-mono">{r.id}</div>
                <div className="text-xs text-slate-500">{r.scenario} · {r.recipe}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
