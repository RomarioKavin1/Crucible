"use client";
import { useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { AGENT_INFT_ADDRESS, RUN_REGISTRY_V2_ADDRESS, ABIs } from "@/lib/contracts";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:8080/v1";

interface GeneratedCreds {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

export function CredentialsGenerator({ tokenId }: { tokenId: bigint }) {
  const { address: ownerAddress, isConnected } = useAccount();
  const [creds, setCreds] = useState<GeneratedCreds | null>(null);
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

  async function delegate() {
    if (!creds) return;
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "delegateAccess", args: [tokenId, creds.address],
    });
  }

  function downloadEnv() {
    if (!creds) return;
    const envText = `# Crucible Bench — runner credentials
# Generated for AgentINFT #${tokenId.toString()} owned by ${ownerAddress ?? "<your owner>"}
# Hot key delegated via AgentINFT.delegateAccess on ${new Date().toISOString().slice(0, 10)}
#
# IMPORTANT: This file contains a hot signing key. Keep it private.
# To revoke: visit /agents/${tokenId}, scroll to Delegated Signing Keys, click Revoke.

AGENT_TOKEN_ID=${tokenId.toString()}
AGENT_PRIVATE_KEY=${creds.privateKey}
CRUCIBLE_MCP_URL=${MCP_URL}
RUN_REGISTRY_V2=${RUN_REGISTRY_V2_ADDRESS}

# === Add your own ===
# ANTHROPIC_API_KEY=sk-ant-...
# SCENARIO=choppy-range
`;
    const blob = new Blob([envText], { type: "text/plain;charset=utf-8" });
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

  const stage: "idle" | "generated" | "delegating" | "delegated" =
    !creds ? "idle"
    : (isPending || isConfirming) ? "delegating"
    : isSuccess ? "delegated"
    : "generated";

  return (
    <div className="p-5 border border-[#1c2538] rounded-xl bg-[#0f1623] space-y-4">
      <div>
        <h3 className="font-semibold text-[#e6e9f0]">Runner credentials</h3>
        <p className="text-sm text-[#aab2c5] mt-1">
          One-click setup: generate a disposable hot wallet, delegate it to this INFT, download a ready-to-run <code className="text-[#22d3ee]">crucible.env</code>.
        </p>
      </div>

      {!isConnected && (
        <div className="text-sm text-[#fbbf24]">Connect your owner wallet first.</div>
      )}

      {isConnected && stage === "idle" && (
        <button
          onClick={generate}
          className="px-4 py-2 bg-[#22d3ee] text-[#0a0e17] rounded font-medium hover:bg-[#67e8f9] transition-colors"
        >
          Generate Runner Credentials
        </button>
      )}

      {creds && (
        <div className="space-y-3 pt-2 border-t border-[#1c2538]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#6b7691] mb-1">Hot wallet address</div>
            <code className="text-[12px] font-mono text-[#e6e9f0] break-all">{creds.address}</code>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-wider text-[#6b7691]">Hot wallet private key</div>
              <button onClick={() => setShowKey((v) => !v)} className="text-[10px] text-[#22d3ee] hover:text-[#67e8f9]">
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <code className="text-[12px] font-mono text-[#e6e9f0] break-all">
              {showKey ? creds.privateKey : "•".repeat(66)}
            </code>
            <div className="text-[11px] text-[#fbbf24] mt-1">
              ⚠ Save this. We don&apos;t store it. Lose it = need to delegate a new key.
            </div>
          </div>

          {stage === "generated" && (
            <button
              onClick={delegate}
              className="px-4 py-2 bg-[#22d3ee] text-[#0a0e17] rounded font-medium hover:bg-[#67e8f9] transition-colors"
            >
              Authorize this key (sign with owner wallet)
            </button>
          )}
          {stage === "delegating" && (
            <div className="text-sm text-[#aab2c5]">
              {isPending ? "Confirm in wallet…" : "Mining delegation tx…"}
            </div>
          )}
          {stage === "delegated" && (
            <>
              <div className="text-sm text-[#10b981]">✓ Delegated. Hot wallet is authorized.</div>
              {!downloaded ? (
                <button
                  onClick={downloadEnv}
                  className="px-4 py-2 bg-[#10b981] text-[#0a0e17] rounded font-medium hover:bg-[#34d399] transition-colors"
                >
                  Download crucible.env
                </button>
              ) : (
                <NextSteps tokenId={tokenId} onReset={() => { setCreds(null); reset(); setDownloaded(false); }} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NextSteps({ tokenId, onReset }: { tokenId: bigint; onReset: () => void }) {
  return (
    <div className="space-y-3 pt-2 border-t border-[#1c2538]">
      <div className="text-sm text-[#10b981]">✓ Downloaded. Now run your agent:</div>
      <pre className="bg-[#0a0e17] border border-[#1c2538] rounded p-3 text-[12px] text-[#e6e9f0] font-mono overflow-x-auto whitespace-pre">{`# 1. Move the file into your agent project
mv ~/Downloads/crucible-agent-${tokenId.toString()}.env ./crucible.env

# 2. Add your LLM key + scenario (edit crucible.env)
# 3. Run the reference agent
cd examples/reference-agent-ts
pnpm install --ignore-workspace
set -a; source ../../crucible.env; set +a
export ANTHROPIC_API_KEY=sk-ant-...
export SCENARIO=choppy-range
pnpm start`}</pre>
      <div className="flex gap-2 text-xs">
        <button onClick={onReset} className="text-[#6b7691] hover:text-[#aab2c5] transition-colors">
          ← Generate another
        </button>
      </div>
    </div>
  );
}
