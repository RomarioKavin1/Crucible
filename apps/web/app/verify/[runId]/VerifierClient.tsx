"use client";
import { useState } from "react";
import { recoverTypedDataAddress } from "viem";
import { publicClient, AGENT_INFT_ADDRESS, RUN_REGISTRY_V2_ADDRESS, ABIs, readRun } from "@/lib/contracts";
import { CURRENT_NETWORK, storageDownload } from "@/lib/network";

const ACTION_TYPES = {
  Action: [
    { name: "runId", type: "bytes32" },
    { name: "tickId", type: "uint32" },
    { name: "kind", type: "string" },
    { name: "qty", type: "uint256" },
    { name: "reasoning", type: "string" },
    { name: "nonce", type: "uint256" },
  ],
};

interface AuditResult {
  rootMatches: boolean;
  traceLines: number;
  signedLines: number;
  verifiableLines: number;     // signed AND has full EIP-712 message fields
  verifiedLines: number;       // signature recovered + INFT-authorized
  failedAt?: number;
  legacyTraceFormat: boolean;  // pre-fix traces missing runId/tickId/nonce inside action
  error?: string;
}

export function VerifierClient({ runId }: { runId: string }) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<AuditResult | null>(null);

  async function audit() {
    setStatus("running");
    setResult(null);
    try {
      const run = await readRun(BigInt(runId));
      const traceText = await fetch(storageDownload(run.traceRoot)).then((r) => {
        if (!r.ok) throw new Error(`storage fetch failed: ${r.status}`);
        return r.text();
      });

      // sha-256 of trace bytes for root match
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(traceText));
      const traceHashHex = "0x" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const rootMatches = traceHashHex.toLowerCase() === run.traceRoot.toLowerCase();

      const lines = traceText.trim().split("\n").filter(Boolean);
      const domain = { name: "CrucibleBench", version: "2", chainId: CURRENT_NETWORK.chainId, verifyingContract: RUN_REGISTRY_V2_ADDRESS };

      let signedLines = 0;
      let verifiableLines = 0;
      let verifiedLines = 0;
      let legacyTraceFormat = false;
      let failedAt: number | undefined;

      for (let i = 0; i < lines.length; i++) {
        const e = JSON.parse(lines[i]!);
        if (!e.signature || !e.signer) continue;
        signedLines++;

        // The full signed EIP-712 message lives inside e.action. Older traces
        // (pre-fix) only persisted { kind, qty, reasoning } — those entries
        // are signed and on-chain but cannot be re-derived offline.
        const a = e.action ?? {};
        if (a.runId === undefined || a.tickId === undefined || a.nonce === undefined) {
          legacyTraceFormat = true;
          continue;
        }
        verifiableLines++;

        const recovered = await recoverTypedDataAddress({
          domain,
          types: ACTION_TYPES,
          primaryType: "Action",
          message: {
            runId: a.runId,
            tickId: a.tickId,
            kind: a.kind,
            qty: BigInt(a.qty),
            reasoning: a.reasoning,
            nonce: BigInt(a.nonce),
          },
          signature: e.signature as `0x${string}`,
        });
        if (recovered.toLowerCase() !== e.signer.toLowerCase()) {
          failedAt = i;
          break;
        }
        const ok = (await publicClient.readContract({
          address: AGENT_INFT_ADDRESS,
          abi: ABIs.AGENT_INFT_ABI,
          functionName: "isAuthorized",
          args: [run.tokenId, e.signer as `0x${string}`],
        })) as boolean;
        if (!ok) {
          failedAt = i;
          break;
        }
        verifiedLines++;
      }

      setResult({
        rootMatches,
        traceLines: lines.length,
        signedLines,
        verifiableLines,
        verifiedLines,
        failedAt,
        legacyTraceFormat,
      });
      setStatus("done");
    } catch (e) {
      setResult({
        rootMatches: false,
        traceLines: 0,
        signedLines: 0,
        verifiableLines: 0,
        verifiedLines: 0,
        legacyTraceFormat: false,
        error: e instanceof Error ? e.message : String(e),
      });
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium">Audit</div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#e6e9f0]">Verify Run #{runId}</h1>
        <p className="text-[13px] text-[#aab2c5] mt-2 leading-[1.6]">
          Pulls the trace from <span className="text-[#22d3ee]">0G Storage</span>, recomputes the trace root,
          recovers the EIP-712 signer of every action, and confirms each signer was authorized by the agent&rsquo;s
          INFT at run time. Nothing here trusts Crucible.
        </p>
      </header>
      <button
        onClick={audit}
        disabled={status === "running"}
        className="px-5 py-2.5 text-[13px] font-medium bg-[#22d3ee] text-[#0a0e17] rounded-lg [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] disabled:opacity-50 transition-colors"
      >
        {status === "running" ? "Auditing…" : "Run audit"}
      </button>

      {result?.error && (
        <div className="p-4 bg-[#ef444415] border border-[#ef444440] text-[#ef4444] rounded-xl text-sm">
          <div className="font-medium mb-1">Audit failed</div>
          <code className="text-xs break-all">{result.error}</code>
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-3 text-sm">
          <Check ok={result.rootMatches} label={`Trace root matches sha256(trace)`} />
          <Check
            ok={result.failedAt === undefined && result.verifiedLines === result.verifiableLines}
            label={
              result.verifiableLines === 0
                ? `No verifiable signed entries`
                : `${result.verifiedLines}/${result.verifiableLines} signed entries verified (recovered signer + INFT-authorized)`
            }
          />
          <div className="text-xs text-zinc-500 pl-6">
            {result.traceLines} total trace lines · {result.signedLines} signed
            {result.legacyTraceFormat && (
              <>
                {" · "}
                <span className="text-amber-500">
                  some entries use a legacy trace format with stripped EIP-712 fields and cannot be
                  re-derived offline
                </span>
              </>
            )}
          </div>

          {result.legacyTraceFormat && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg text-xs leading-relaxed text-amber-300">
              <div className="font-medium mb-1">Legacy trace format detected</div>
              This run was published before the trace recorder was patched to persist the full
              signed EIP-712 message (<code className="font-mono">runId</code>,{" "}
              <code className="font-mono">tickId</code>, <code className="font-mono">nonce</code>{" "}
              inside <code className="font-mono">action</code>). The signatures are on chain and
              the trace root is verifiable, but the per-tick signature recovery requires the new
              format. Runs published after the fix will audit fully.
            </div>
          )}

          {result.failedAt !== undefined && (
            <div className="p-3 bg-[#ef444415] border border-[#ef444440] rounded-lg text-xs text-[#ef4444]">
              Verification failed at trace line #{result.failedAt}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shrink-0 ${
          ok ? "bg-[#10b98115] text-[#10b981] border border-[#10b98140]" : "bg-[#ef444415] text-[#ef4444] border border-[#ef444440]"
        }`}
      >
        {ok ? "✓" : "✗"}
      </span>
      <span className="text-zinc-300 leading-5">{label}</span>
    </div>
  );
}
