"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import useSWR from "swr";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { readTokensOf, readIntelligentData, readRunsByToken } from "@/lib/contracts";
import { useActiveSession } from "@/lib/useActiveSessions";

function AgentCard({ a }: { a: { id: bigint; description: string; runs: number } }) {
  const live = useActiveSession(a.id);
  return (
    <Link
      href={`/agents/${a.id}`}
      className="block bg-[#0f1623] border border-[#1c2538] hover:border-[#22d3ee44] rounded-2xl p-5 transition-colors group card-elevated"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#6b7691] font-medium font-mono">Agent #{a.id.toString()}</div>
        {live && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10b98115] border border-[#10b98140] text-[9.5px] font-medium uppercase tracking-wider text-[#10b981]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            Live now
          </span>
        )}
      </div>
      <div className="text-[16px] font-semibold text-[#e6e9f0] group-hover:text-[#22d3ee] transition-colors leading-tight mb-1">
        {a.description || <span className="text-[#6b7691] italic font-normal">Unnamed agent</span>}
      </div>
      <div className="text-[12px] text-[#aab2c5]">
        {a.runs} run{a.runs === 1 ? "" : "s"} published
      </div>
    </Link>
  );
}

async function loadAgents(owner: `0x${string}`) {
  const tokenIds = await readTokensOf(owner);
  return Promise.all(tokenIds.map(async (id) => {
    const [data, runs] = await Promise.all([readIntelligentData(id), readRunsByToken(id)]);
    return { id, description: data.description, dataHash: data.dataHash, runs: runs.length };
  }));
}

export function MyAgentsClient() {
  const { address, isConnected } = useAccount();
  const { data: agents } = useSWR(
    isConnected && address ? ["agents", address] : null,
    () => loadAgents(address!),
  );

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] font-medium">Your agents</div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Connect your wallet</h1>
        <p className="text-[13px] text-[#aab2c5] leading-relaxed">
          Sign in to view, manage, and benchmark the trading agents you own.
        </p>
        <div className="flex justify-center pt-2"><ConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium">Your agents</div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Your agents</h1>
          <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-xl leading-relaxed">
            Each card is a trading agent you own. Click to authorize signing keys, run benchmarks, and watch live results.
          </p>
        </div>
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          + Create new agent
        </Link>
      </header>

      {agents && agents.length === 0 && (
        <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-10 text-center">
          <div className="text-[28px] mb-2">👋</div>
          <div className="text-[15px] text-[#e6e9f0] font-medium mb-1">You don&rsquo;t have any agents yet</div>
          <p className="text-[12.5px] text-[#aab2c5] mb-5 max-w-md mx-auto leading-relaxed">
            Each agent gets a unique on-chain identity. You only pay testnet gas to create one — no fees, no signups.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-5 py-2.5 rounded-lg transition-colors"
          >
            Create your first agent →
          </Link>
        </div>
      )}

      {agents && agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <AgentCard key={a.id.toString()} a={a} />
          ))}
        </div>
      )}

      {!agents && (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-10 text-center text-[12.5px] text-[#6b7691]">
          Loading your agents…
        </div>
      )}
    </div>
  );
}
