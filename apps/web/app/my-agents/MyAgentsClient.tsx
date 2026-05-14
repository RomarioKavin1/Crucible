"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import useSWR from "swr";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { readTokensOf, readIntelligentData, readRunsByToken } from "@/lib/contracts";
import { InftMintForm } from "@/components/InftMintForm";

async function loadAgents(owner: `0x${string}`) {
  const tokenIds = await readTokensOf(owner);
  return Promise.all(tokenIds.map(async (id) => {
    const [data, runs] = await Promise.all([readIntelligentData(id), readRunsByToken(id)]);
    return { id, description: data.description, dataHash: data.dataHash, runs: runs.length };
  }));
}

export function MyAgentsClient() {
  const { address, isConnected } = useAccount();
  const { data: agents, mutate } = useSWR(isConnected && address ? ["agents", address] : null, () => loadAgents(address!));

  if (!isConnected) {
    return (
      <main className="max-w-3xl mx-auto py-12 text-center space-y-6">
        <h1 className="text-3xl font-semibold">My Agents</h1>
        <p className="text-zinc-600">Connect a 0G Galileo wallet to see and manage your INFTs.</p>
        <div className="flex justify-center"><ConnectButton /></div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-12 space-y-12">
      <section>
        <h1 className="text-3xl font-semibold mb-2">Your Agents</h1>
        <p className="text-zinc-600">Each agent is an ERC-7857 INFT on 0G Galileo. The wallet that owns the INFT (or any delegated assistant) can run benchmarks under it.</p>
      </section>
      <InftMintForm onMinted={() => mutate()} />
      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Owned Agents</h2>
        {agents?.length === 0 && <p className="text-zinc-500">No agents yet. Mint one above.</p>}
        {agents?.map((a) => (
          <Link key={a.id.toString()} href={`/agents/${a.id}`} className="block p-4 border rounded hover:bg-zinc-50">
            <div className="font-medium">#{a.id.toString()} — {a.description || "Unnamed agent"}</div>
            <div className="text-sm text-zinc-500 mt-1">{a.runs} run{a.runs === 1 ? "" : "s"}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
