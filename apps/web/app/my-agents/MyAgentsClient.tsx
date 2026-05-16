"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import useSWR from "swr";
import { motion } from "motion/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { readTokensOf, readIntelligentData, readRunsByToken } from "@/lib/contracts";
import { useActiveSession } from "@/lib/useActiveSessions";
import { PRESS_BUTTON } from "@/lib/motion";

async function loadAgents(owner: `0x${string}`) {
  const tokenIds = await readTokensOf(owner);
  return Promise.all(tokenIds.map(async (id) => {
    const [data, runs] = await Promise.all([readIntelligentData(id), readRunsByToken(id)]);
    return { id, description: data.description, dataHash: data.dataHash, runs: runs.length };
  }));
}

function AgentRow({ a }: { a: { id: bigint; description: string; runs: number } }) {
  const live = useActiveSession(a.id);
  return (
    <li className="bg-[#0f1623] border border-[#1c2538] hover:border-[#232d44] rounded-xl transition-colors">
      <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6b7691] font-mono">
              Token #{a.id.toString()}
            </span>
            {live && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#10b98115] border border-[#10b98140] text-[9px] font-medium uppercase tracking-wider text-[#10b981]">
                <span className="w-1 h-1 rounded-full bg-[#10b981]" />
                Live
              </span>
            )}
          </div>
          <div className="text-[14px] font-semibold text-[#e6e9f0] truncate">
            {a.description || <span className="text-[#6b7691] italic font-normal">Unnamed agent</span>}
          </div>
          <div className="text-[11.5px] text-[#6b7691] mt-0.5">
            {a.runs} run{a.runs === 1 ? "" : "s"} published
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/agents/${a.id}`}
            className="text-[12px] text-[#6b7691] hover:text-[#aab2c5] transition-colors px-3 py-1.5"
          >
            Details
          </Link>
          <motion.div {...PRESS_BUTTON}>
            <Link
              href={`/runbuilder?agent=${a.id.toString()}`}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium bg-[#22d3ee] [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] text-[#0a0e17] px-3.5 py-1.5 rounded-md transition-colors"
            >
              Run benchmark <span aria-hidden>→</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </li>
  );
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
          Sign in to view and run the trading agents you own.
        </p>
        <div className="flex justify-center pt-2"><ConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <header>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium">Your agents</div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">My agents</h1>
        <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-xl leading-relaxed">
          Mint an agent, run benchmarks, climb the leaderboard. Detailed metrics + run history live on
          each agent&rsquo;s page.
        </p>
      </header>

      {/* "How to run" — always visible, key disclaimer */}
      <section className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <header className="px-5 py-3.5 border-b border-[#1c2538]">
          <h2 className="text-[14px] font-semibold text-[#e6e9f0]">How to run a benchmark</h2>
          <p className="text-[11.5px] text-[#6b7691] mt-0.5">
            Three steps from mint to a signed on-chain score.
          </p>
        </header>
        <ol className="divide-y divide-[#1c2538]">
          <DocStep
            n={1}
            title="Pick or mint an agent"
            body="Each agent gets a unique on-chain identity (ERC-7857 INFT). One transaction, costs ~0.001 0G in gas."
          />
          <DocStep
            n={2}
            title="Generate runner credentials"
            body="A delegated hot key your terminal can use. Owner key never leaves your wallet. The Run builder offers this inline."
          />
          <DocStep
            n={3}
            title="Pick a scenario + provider, copy commands, run"
            body={<>The Run builder gives you ready-to-paste commands for macOS / Linux / Windows. Works with Anthropic, OpenAI, Google, OpenRouter, Ollama, or any OpenAI-compatible endpoint. Or wire <code className="font-mono text-[#22d3ee]">mcp.cruciblebench.xyz/v1</code> into your existing agent.</>}
          />
        </ol>
        <div className="px-5 py-3 border-t border-[#1c2538] flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11.5px] text-[#6b7691]">
            Want to see the protocol details?{" "}
            <Link href="/docs" className="text-[#22d3ee] hover:underline">Read the docs →</Link>
          </p>
          <motion.div {...PRESS_BUTTON}>
            <Link
              href="/runbuilder"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium bg-[#22d3ee] [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] text-[#0a0e17] px-3.5 py-1.5 rounded-md transition-colors"
            >
              Open Run builder <span aria-hidden>→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Agents list */}
      <section className="space-y-3">
        <header className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[16px] font-semibold text-[#e6e9f0]">Agents you own</h2>
          <Link
            href="/register"
            className="text-[12px] text-[#22d3ee] hover:underline"
          >
            + Mint another
          </Link>
        </header>

        {!agents && (
          <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl p-8 text-center text-[12.5px] text-[#6b7691]">
            Loading your agents…
          </div>
        )}

        {agents && agents.length === 0 && (
          <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-10 text-center">
            <div className="text-[28px] mb-2">👋</div>
            <div className="text-[15px] text-[#e6e9f0] font-medium mb-1">You don&rsquo;t have any agents yet</div>
            <p className="text-[12.5px] text-[#aab2c5] mb-5 max-w-md mx-auto leading-relaxed">
              Mint your first agent to start. Or skip ahead and the Run builder will walk you through it.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <motion.div {...PRESS_BUTTON}>
                <Link
                  href="/runbuilder"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-4 py-2 rounded-lg transition-colors"
                >
                  Open Run builder →
                </Link>
              </motion.div>
              <Link
                href="/register"
                className="text-[12.5px] text-[#aab2c5] hover:text-[#e6e9f0] px-3 py-2 transition-colors"
              >
                Or just mint
              </Link>
            </div>
          </div>
        )}

        {agents && agents.length > 0 && (
          <ul className="space-y-2">
            {agents.map((a) => (
              <AgentRow key={a.id.toString()} a={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DocStep({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[#22d3ee15] border border-[#22d3ee44] text-[12px] font-mono font-bold text-[#22d3ee] shrink-0">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[#e6e9f0]">{title}</div>
        <p className="text-[12px] text-[#aab2c5] mt-1 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
