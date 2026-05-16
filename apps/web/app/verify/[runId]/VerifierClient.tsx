"use client";
import { useState } from "react";
import { recoverTypedDataAddress } from "viem";
import {
  publicClient,
  AGENT_INFT_ADDRESS,
  RUN_REGISTRY_V2_ADDRESS,
  ABIs,
  readRun,
} from "@/lib/contracts";
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
  /** True if 0G Storage returned bytes for the recorded `traceRoot`. The
   *  gateway resolves the Merkle root → bytes; if we got anything back the
   *  bytes are content-addressed by what's on chain. */
  traceFetched: boolean;
  /** Trace root pinned in RunRegistryV3, for display. */
  traceRoot: string;
  /** Total trace lines (signed + unsigned). */
  traceLines: number;
  /** Trace lines that carry a signature + signer (i.e. agent actions). */
  signedLines: number;
  /** Subset of signedLines that also persist runId/tickId/nonce so we can
   *  re-derive the EIP-712 hash offline. Older traces omit those fields. */
  verifiableLines: number;
  /** Subset of verifiableLines where recovered signer matches AND the
   *  signer is INFT-authorized for this tokenId. */
  verifiedLines: number;
  failedAt?: number;
  legacyTraceFormat: boolean;
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

      const lines = traceText.trim().split("\n").filter(Boolean);
      const traceFetched = lines.length > 0;

      const domain = {
        name: "CrucibleBench",
        version: "2",
        chainId: CURRENT_NETWORK.chainId,
        verifyingContract: RUN_REGISTRY_V2_ADDRESS,
      };

      let signedLines = 0;
      let verifiableLines = 0;
      let verifiedLines = 0;
      let legacyTraceFormat = false;
      let failedAt: number | undefined;

      for (let i = 0; i < lines.length; i++) {
        const e = JSON.parse(lines[i]!);
        if (!e.signature || !e.signer) continue;
        signedLines++;

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
        traceFetched,
        traceRoot: run.traceRoot,
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
        traceFetched: false,
        traceRoot: "",
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

  // ── Derived flags for the UI checks ─────────────────────────────────────
  const signatureCheckOk =
    !!result &&
    result.failedAt === undefined &&
    result.verifiableLines > 0 &&
    result.verifiedLines === result.verifiableLines;

  const signatureCheckLabel = (r: AuditResult) => {
    if (r.verifiableLines === 0) {
      return r.signedLines > 0
        ? `0/${r.signedLines} signed entries verifiable (all use the legacy format)`
        : `No signed entries to verify`;
    }
    return `${r.verifiedLines}/${r.verifiableLines} signed entries verified (recovered signer + INFT-authorized)`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium">Audit</div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#e6e9f0]">Verify Run #{runId}</h1>
        <p className="text-[13px] text-[#aab2c5] mt-2 leading-[1.6]">
          Pulls the trace from <span className="text-[#22d3ee]">0G Storage</span> by the on-chain Merkle root,
          recovers the EIP-712 signer of every action, and confirms each signer was authorized by the
          agent&rsquo;s INFT at run time. Nothing here trusts Crucible.
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
          <Check
            ok={result.traceFetched}
            label="Trace fetched from 0G Storage by on-chain Merkle root"
          />
          {result.traceRoot && (
            <div className="pl-6 -mt-1.5 text-[11px] text-[#3d4a6e] font-mono break-all">
              root {result.traceRoot}
            </div>
          )}

          <Check ok={signatureCheckOk} label={signatureCheckLabel(result)} />
          <div className="text-xs text-[#6b7691] pl-6 -mt-1.5">
            {result.traceLines} total trace lines · {result.signedLines} signed
            {result.signedLines > result.verifiableLines && (
              <>
                {" · "}
                <span className="text-[#fbbf24]">
                  {result.signedLines - result.verifiableLines} use a legacy trace format with stripped
                  EIP-712 fields and cannot be re-derived offline
                </span>
              </>
            )}
          </div>

          {result.legacyTraceFormat && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg text-xs leading-relaxed text-amber-300">
              <div className="font-medium mb-1">Legacy trace format detected</div>
              <p>
                This trace was written before the recorder was patched to persist the full signed EIP-712
                message (<code className="font-mono">runId</code>, <code className="font-mono">tickId</code>,{" "}
                <code className="font-mono">nonce</code> inside <code className="font-mono">action</code>).
                The signatures and the trace Merkle root are on chain and intact, but per-tick signature
                recovery requires the new format.
              </p>
              <p className="mt-2">
                If this is a fresh run, the production MCP server may be running an older build.
                Redeploy <code className="font-mono">@crucible/mcp-server</code> and run again — new runs
                will audit fully.
              </p>
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
          ok
            ? "bg-[#10b98115] text-[#10b981] border border-[#10b98140]"
            : "bg-[#ef444415] text-[#ef4444] border border-[#ef444440]"
        }`}
      >
        {ok ? "✓" : "✗"}
      </span>
      <span className="text-[#aab2c5] leading-5">{label}</span>
    </div>
  );
}
