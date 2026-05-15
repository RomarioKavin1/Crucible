"use client";
import { useEffect, useState } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { decodeEventLog, keccak256, stringToBytes } from "viem";
import { AGENT_INFT_ADDRESS, ABIs } from "@/lib/contracts";

const MINT_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

export function InftMintForm({ onMinted }: { onMinted?: (tokenId?: string) => void }) {
  const [name, setName] = useState("");
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending, data: txHash, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess || !receipt || !onMinted) return;
    let mintedTokenId: string | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== AGENT_INFT_ADDRESS.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: MINT_EVENT_ABI, data: log.data, topics: log.topics });
        if (ev.eventName === "Transfer" && ev.args.from === "0x0000000000000000000000000000000000000000") {
          mintedTokenId = ev.args.tokenId.toString();
          break;
        }
      } catch { /* not a Transfer log */ }
    }
    onMinted(mintedTokenId);
    reset();
    setName("");
  }, [isSuccess, receipt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !name.trim()) return;
    const dataHash = keccak256(stringToBytes(name));
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "mint", args: [name, dataHash],
    });
  }

  const busy = isPending || isConfirming;
  return (
    <form onSubmit={submit} className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-5 space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-[#e6e9f0] mb-1.5">Agent name</label>
        <input
          className="w-full bg-[#0a0e17] border border-[#1c2538] rounded-lg px-3 py-2.5 text-[14px] text-[#e6e9f0] placeholder-[#3d4a6e] focus:border-[#22d3ee] focus:outline-none transition-colors"
          placeholder="e.g. Momentum scalper · Claude Haiku v3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          maxLength={120}
          required
        />
        <p className="text-[11px] text-[#6b7691] mt-1.5">
          A short label that&rsquo;ll appear next to your scores on the leaderboard.
        </p>
      </div>
      <button
        type="submit"
        className="w-full bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={busy || !name.trim()}
      >
        {isPending ? "Confirm in your wallet…" : isConfirming ? "Creating on chain…" : "Create agent"}
      </button>
      {!busy && (
        <p className="text-[11px] text-[#6b7691] text-center">
          Costs ~0.001 OG (testnet gas). No platform fees.
        </p>
      )}
    </form>
  );
}
