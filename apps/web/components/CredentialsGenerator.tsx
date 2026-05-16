"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { AGENT_INFT_ADDRESS, ABIs } from "@/lib/contracts";

/**
 * Stripped-down version of ConnectAgentWizard's "Use the example" flow.
 * 3 buttons: generate key → authorize on chain → show key for the user
 * to copy into their AGENT_PRIVATE_KEY env var.
 *
 * Owner-only. Caller MUST confirm the current wallet is the agent's owner
 * before showing this (otherwise the delegateAccess tx will revert).
 */
export function CredentialsGenerator({
  tokenId,
  onAuthorized,
}: {
  tokenId: bigint;
  /** Called after the delegation tx confirms, with the new private key the user must copy. */
  onAuthorized?: (privateKey: `0x${string}`, address: `0x${string}`) => void;
}) {
  const { isConnected } = useAccount();
  const [creds, setCreds] = useState<{ privateKey: `0x${string}`; address: `0x${string}` } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { writeContractAsync, isPending, data: txHash, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Fire the callback once on success.
  if (isSuccess && creds && onAuthorized) {
    queueMicrotask(() => onAuthorized(creds.privateKey, creds.address));
  }

  function generate() {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    setCreds({ privateKey: pk, address: acct.address });
  }

  async function authorize() {
    if (!creds) return;
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "delegateAccess", args: [tokenId, creds.address],
    });
  }

  if (!isConnected) {
    return (
      <div className="text-[12px] text-[#fbbf24]">Connect your owner wallet first.</div>
    );
  }

  return (
    <div className="space-y-3">
      {!creds && (
        <button
          onClick={generate}
          className="text-[12.5px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-3.5 py-1.5 rounded-md transition-colors"
        >
          Generate signing key
        </button>
      )}

      {creds && (
        <>
          <div className="space-y-2 bg-[#0a0e17] border border-[#1c2538] rounded-lg p-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium mb-1">
                Public address (will be delegated)
              </div>
              <code className="font-mono text-[11.5px] text-[#e6e9f0] break-all">{creds.address}</code>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">
                  Private key (paste into AGENT_PRIVATE_KEY)
                </div>
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="text-[10px] text-[#22d3ee] hover:text-[#67e8f9]"
                  type="button"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <code className="font-mono text-[11.5px] text-[#e6e9f0] break-all">
                {showKey ? creds.privateKey : "•".repeat(66)}
              </code>
              <div className="text-[10.5px] text-[#fbbf24] mt-1">
                Generated locally. We don&rsquo;t see it. Save somewhere safe.
              </div>
            </div>
          </div>

          {!isSuccess && (
            <button
              onClick={authorize}
              disabled={isPending || isConfirming}
              className="text-[12.5px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-3.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {isPending ? "Confirm in wallet…" : isConfirming ? "Authorizing on chain…" : "Authorize this key"}
            </button>
          )}

          {isSuccess && (
            <div className="text-[12px] text-[#10b981] font-medium">
              ✓ Authorized. The key above can now sign for token #{tokenId.toString()}.
              <button
                onClick={() => { setCreds(null); setShowKey(false); reset(); }}
                className="ml-3 text-[11px] text-[#6b7691] hover:text-[#aab2c5] underline"
                type="button"
              >
                Generate another
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
