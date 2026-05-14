"use client";
import Link from "next/link";
import useSWR from "swr";
import { readIntelligentData, readRunsByToken, readRun, readOwnerOf } from "@/lib/contracts";
import { DelegationManager } from "@/components/DelegationManager";

async function loadDetail(tokenId: bigint) {
  const [data, owner, runIds] = await Promise.all([
    readIntelligentData(tokenId),
    readOwnerOf(tokenId),
    readRunsByToken(tokenId),
  ]);
  const runs = await Promise.all(runIds.map(async (id) => ({ id, run: await readRun(id) })));
  return { description: data.description, owner, runs };
}

export function AgentDetailClient({ tokenId }: { tokenId: bigint }) {
  const { data, error, isLoading } = useSWR(["agent", tokenId.toString()], () => loadDetail(tokenId));
  if (isLoading) return <main className="p-12 text-center">Loading…</main>;
  if (error) return <main className="p-12 text-center text-red-600">Error: {String(error)}</main>;
  if (!data) return null;

  return (
    <main className="max-w-3xl mx-auto py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Agent #{tokenId.toString()}</h1>
        <p className="text-zinc-700 mt-1">{data.description || "No description"}</p>
        <p className="text-xs font-mono text-zinc-500 mt-2">Owner: {data.owner}</p>
      </header>
      <Link href={`/agents/${tokenId}/start`} className="inline-block px-6 py-3 bg-black text-white rounded">
        Start a Benchmark Run
      </Link>
      <DelegationManager tokenId={tokenId} />
      <section>
        <h2 className="font-semibold mb-3">Run History</h2>
        {data.runs.length === 0 && <p className="text-zinc-500">No published runs yet.</p>}
        <ul className="space-y-2">
          {data.runs.map(({ id, run }) => (
            <li key={id.toString()}>
              <Link className="block p-3 border rounded hover:bg-zinc-50" href={`/runs/${id.toString()}`}>
                Run #{id.toString()} · Sortino {(Number(run.scoreSortinoE6) / 1e6).toFixed(3)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
