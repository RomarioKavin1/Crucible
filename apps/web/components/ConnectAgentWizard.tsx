"use client";
import { useState } from "react";
import useSWR from "swr";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { isAddress } from "viem";
import { AGENT_INFT_ADDRESS, ABIs, readDelegations } from "@/lib/contracts";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1";

type Tab = "existing" | "example";

export function ConnectAgentWizard({ tokenId }: { tokenId: bigint }) {
  const [tab, setTab] = useState<Tab>("existing");

  return (
    <section className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
      <header className="px-5 py-4 border-b border-[#1c2538]">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium mb-1">Get started</div>
        <h2 className="text-[18px] font-semibold text-[#e6e9f0]">Connect your agent</h2>
        <p className="text-[12.5px] text-[#aab2c5] mt-1 leading-relaxed">
          Pick the path that matches you. Both end with your agent benchmarking on-chain.
        </p>
      </header>

      {/* Tab switcher */}
      <div className="flex border-b border-[#1c2538]">
        <TabBtn active={tab === "existing"} onClick={() => setTab("existing")}
          title="I already have an agent"
          subtitle="OpenClaw, custom code, anywhere">
          Use existing agent
        </TabBtn>
        <TabBtn active={tab === "example"} onClick={() => setTab("example")}
          title="Try the example"
          subtitle="Generate keys, download config, run">
          New here? Use our example
        </TabBtn>
      </div>

      <div className="p-5">
        {tab === "existing" ? <ExistingAgentTab tokenId={tokenId} /> : <ExampleAgentTab tokenId={tokenId} />}
      </div>
    </section>
  );
}

function TabBtn({ active, onClick, children, title, subtitle }: {
  active: boolean; onClick: () => void; children: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex-1 px-5 py-3 text-left transition-colors ${
        active
          ? "bg-[#22d3ee08] border-b-2 border-[#22d3ee] -mb-px"
          : "border-b-2 border-transparent hover:bg-[#ffffff03]"
      }`}
    >
      <div className={`text-[13px] font-medium ${active ? "text-[#22d3ee]" : "text-[#e6e9f0]"}`}>{children}</div>
      <div className="text-[11px] text-[#6b7691] mt-0.5">{subtitle}</div>
    </button>
  );
}

// ─── Tab A: Existing agent ─────────────────────────────────────────────────

function ExistingAgentTab({ tokenId }: { tokenId: bigint }) {
  const { isConnected } = useAccount();
  const { data: delegations, mutate } = useSWR(
    ["delegations", tokenId.toString()],
    () => readDelegations(tokenId),
  );
  const [addr, setAddr] = useState("");
  const { writeContractAsync, isPending, data: txHash, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isSuccess && txHash) {
    mutate();
    reset();
    setAddr("");
  }

  async function authorize(e: React.FormEvent) {
    e.preventDefault();
    if (!isAddress(addr)) return;
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "delegateAccess", args: [tokenId, addr as `0x${string}`],
    });
  }

  async function revoke(a: string) {
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "revokeAccess", args: [tokenId, a as `0x${string}`],
    });
  }

  const busy = isPending || isConfirming;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6e9f0] mb-1">
          Step 1 · Authorize your agent&rsquo;s wallet
        </h3>
        <p className="text-[12px] text-[#aab2c5] leading-relaxed">
          Paste the wallet address your existing agent already uses to sign things (an OpenClaw runner, a
          custom Python agent, anything). After this one transaction, that wallet can publish runs on
          your agent&rsquo;s behalf — without needing your owner key.
        </p>
      </div>

      {!isConnected ? (
        <div className="text-[12px] text-[#fbbf24]">Connect your owner wallet first.</div>
      ) : (
        <form onSubmit={authorize} className="flex gap-2">
          <input
            className="flex-1 bg-[#0a0e17] border border-[#1c2538] rounded-lg px-3 py-2 font-mono text-[13px] text-[#e6e9f0] placeholder-[#3d4a6e] focus:border-[#22d3ee] focus:outline-none"
            placeholder="0x… your agent's wallet address"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            className="bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            disabled={busy || !isAddress(addr)}
          >
            {isPending ? "Confirm…" : isConfirming ? "Authorizing…" : "Authorize"}
          </button>
        </form>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium mb-1.5">
          Currently authorized ({delegations?.length ?? 0})
        </div>
        {delegations && delegations.length > 0 ? (
          <ul className="space-y-1.5">
            {delegations.map((a) => (
              <li key={a} className="flex items-center justify-between bg-[#0a0e17] border border-[#1c2538] rounded px-3 py-2">
                <code className="font-mono text-[11.5px] text-[#aab2c5] break-all">{a}</code>
                <button
                  onClick={() => revoke(a)}
                  className="text-[11px] text-[#ef4444] hover:text-[#fca5a5] ml-3 shrink-0 transition-colors"
                  disabled={busy}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[12px] text-[#6b7691] italic py-2">None yet. Authorize one above.</div>
        )}
      </div>

      {delegations && delegations.length > 0 && (
        <div className="border-t border-[#1c2538] pt-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-[#e6e9f0]">
            Step 2 · Run a benchmark from your agent
          </h3>
          <p className="text-[12px] text-[#aab2c5] leading-relaxed">
            Your agent can now talk to our hosted MCP server and publish on-chain. Use the npm CLI for the
            quickest setup, or call the protocol directly from your existing agent code.
          </p>

          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium mb-1.5">
              Easiest: with the npm CLI (any provider)
            </div>
            <pre className="bg-[#0a0e17] border border-[#1c2538] rounded-lg p-3 text-[11.5px] text-[#e6e9f0] font-mono overflow-x-auto whitespace-pre">
{`export AGENT_PRIVATE_KEY=<your authorized wallet's private key>
export AGENT_TOKEN_ID=${tokenId.toString()}
export ANTHROPIC_API_KEY=sk-ant-...        # or OPENAI_API_KEY, etc.

npx crucible-bench \\
  --scenario fakeout-pump \\
  --provider anthropic --model claude-haiku-4-5 \\
  --watch`}
            </pre>
          </div>

          <details className="bg-[#0a0e17] border border-[#1c2538] rounded-lg p-3">
            <summary className="text-[12px] text-[#aab2c5] cursor-pointer hover:text-[#e6e9f0]">
              Calling the MCP server directly (for OpenClaw, custom code)
            </summary>
            <div className="mt-3 space-y-2 text-[12px] text-[#aab2c5] leading-relaxed">
              <p>Your agent connects to <code className="font-mono text-[#22d3ee]">{MCP_URL}</code> as a Streamable HTTP MCP client and calls:</p>
              <ul className="list-disc pl-5 space-y-1 text-[11.5px]">
                <li><code className="font-mono text-[#22d3ee]">crucible.list_scenarios</code></li>
                <li><code className="font-mono text-[#22d3ee]">crucible.start_run</code> · arguments include a signed <code>StartRun</code> EIP-712 message</li>
                <li><code className="font-mono text-[#22d3ee]">crucible.next_tick</code> · each call signs an <code>Action</code> message</li>
                <li><code className="font-mono text-[#22d3ee]">crucible.abort_run</code> · optional</li>
              </ul>
              <p className="text-[11.5px]">Full reference: <a href="https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md" target="_blank" rel="noopener noreferrer" className="text-[#22d3ee] hover:underline">docs/protocol/v2.md</a></p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

// ─── Tab B: Example agent (generate keys + download .env) ───────────────────

function ExampleAgentTab({ tokenId }: { tokenId: bigint }) {
  const { address: ownerAddress, isConnected } = useAccount();
  const [creds, setCreds] = useState<{ privateKey: `0x${string}`; address: `0x${string}` } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const { writeContractAsync, isPending, data: txHash, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function generate() {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    setCreds({ privateKey: pk, address: acct.address });
    setDownloaded(false);
  }
  async function authorize() {
    if (!creds) return;
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "delegateAccess", args: [tokenId, creds.address],
    });
  }
  function downloadEnv() {
    if (!creds) return;
    const env = `# Crucible Bench — example agent config
# For Agent #${tokenId.toString()} owned by ${ownerAddress ?? "<owner>"}
# Generated ${new Date().toISOString().slice(0, 10)}
# This file contains a signing key. Don't share it. Revoke any time at /agents/${tokenId}.

AGENT_TOKEN_ID=${tokenId.toString()}
AGENT_PRIVATE_KEY=${creds.privateKey}
CRUCIBLE_MCP_URL=${MCP_URL}
# The EIP-712 verifyingContract is now fetched from the server via
# crucible.get_domain — no hardcoded address needed here.

# Add your model API key + scenario:
# ANTHROPIC_API_KEY=sk-ant-...
# SCENARIO=choppy-range
`;
    const blob = new Blob([env], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crucible-agent-${tokenId.toString()}.env`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  const stage: "step1" | "step2" | "authorizing" | "step3" =
    !creds ? "step1"
    : isPending || isConfirming ? "authorizing"
    : isSuccess ? "step3"
    : "step2";

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        We&rsquo;ll generate a fresh signing key in your browser, authorize it for this agent, and hand you
        a config file you can drop into the example project. Three buttons, no editing required.
      </p>

      {!isConnected && <div className="text-[12px] text-[#fbbf24]">Connect your owner wallet first.</div>}

      {/* Step 1 */}
      <Step n={1} active={stage === "step1"} done={creds !== null} title="Generate a signing key">
        <p className="text-[12px] text-[#aab2c5] mb-3">
          A throwaway wallet for the example agent. The key is generated locally — we never see it.
        </p>
        {!creds && isConnected && (
          <button onClick={generate}
            className="bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] font-medium px-4 py-2 rounded-lg transition-colors text-[13px]">
            Generate key
          </button>
        )}
        {creds && (
          <div className="space-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium mb-1">Wallet address</div>
              <code className="font-mono text-[11.5px] text-[#e6e9f0] break-all">{creds.address}</code>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">Private key</div>
                <button onClick={() => setShowKey((v) => !v)} className="text-[10px] text-[#22d3ee] hover:text-[#67e8f9]">
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <code className="font-mono text-[11.5px] text-[#e6e9f0] break-all">
                {showKey ? creds.privateKey : "•".repeat(66)}
              </code>
              <div className="text-[10.5px] text-[#fbbf24] mt-1">
                Save this somewhere safe. We don&rsquo;t store it.
              </div>
            </div>
          </div>
        )}
      </Step>

      {/* Step 2 */}
      <Step n={2} active={stage === "step2" || stage === "authorizing"} done={stage === "step3"} title="Authorize the key for this agent">
        <p className="text-[12px] text-[#aab2c5] mb-3">
          Sign one transaction with your owner wallet to allow the new key to publish runs.
        </p>
        {stage === "step2" && (
          <button onClick={authorize}
            className="bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] font-medium px-4 py-2 rounded-lg transition-colors text-[13px]">
            Authorize
          </button>
        )}
        {stage === "authorizing" && (
          <div className="text-[12px] text-[#aab2c5]">{isPending ? "Confirm in your wallet…" : "Recording on chain…"}</div>
        )}
        {stage === "step3" && (
          <div className="text-[12px] text-[#10b981]">✓ Authorized — the key can now sign for Agent #{tokenId.toString()}</div>
        )}
      </Step>

      {/* Step 3 */}
      <Step n={3} active={stage === "step3"} done={downloaded} title="Download config & run">
        <p className="text-[12px] text-[#aab2c5] mb-3">
          A <code className="font-mono text-[#22d3ee]">.env</code> file with your token id, signing key, and the MCP server URL pre-filled.
        </p>
        {stage === "step3" && !downloaded && (
          <button onClick={downloadEnv}
            className="bg-[#10b981] hover:bg-[#34d399] text-[#0a0e17] font-medium px-4 py-2 rounded-lg transition-colors text-[13px]">
            Download crucible.env
          </button>
        )}
        {downloaded && (
          <div className="space-y-3">
            <div className="text-[12px] text-[#10b981]">✓ Downloaded</div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium mb-1.5">Now run it</div>
              <pre className="bg-[#0a0e17] border border-[#1c2538] rounded-lg p-3 text-[11.5px] text-[#e6e9f0] font-mono overflow-x-auto whitespace-pre">
{`# Sources the keys from the file, adds your provider key inline:
source crucible-agent-${tokenId.toString()}.env
export ANTHROPIC_API_KEY=sk-ant-...       # or OPENAI_API_KEY, etc.

npx crucible-bench \\
  --scenario fakeout-pump \\
  --provider anthropic --model claude-haiku-4-5 \\
  --watch`}
              </pre>
            </div>
            <button
              onClick={() => { setCreds(null); reset(); setDownloaded(false); setShowKey(false); }}
              className="text-[11px] text-[#6b7691] hover:text-[#aab2c5] transition-colors"
            >
              ← Generate another key
            </button>
          </div>
        )}
      </Step>
    </div>
  );
}

function Step({
  n, active, done, title, children,
}: { n: number; active: boolean; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className={`border-l-2 pl-4 transition-colors ${
      done ? "border-[#10b981]" : active ? "border-[#22d3ee]" : "border-[#1c2538]"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
          done ? "bg-[#10b98115] text-[#10b981] border border-[#10b98140]"
          : active ? "bg-[#22d3ee15] text-[#22d3ee] border border-[#22d3ee44]"
          : "bg-transparent text-[#6b7691] border border-[#1c2538]"
        }`}>
          {done ? "✓" : n}
        </span>
        <h4 className={`text-[13px] font-medium ${done || active ? "text-[#e6e9f0]" : "text-[#6b7691]"}`}>{title}</h4>
      </div>
      <div className={`pl-7 ${done && !active ? "opacity-50" : ""}`}>{children}</div>
    </div>
  );
}
