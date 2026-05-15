"use client";
import { useState } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, stringToBytes } from "viem";
import { AGENT_INFT_ADDRESS, ABIs } from "@/lib/contracts";

export function InftMintForm({ onMinted }: { onMinted?: () => void }) {
  const [desc, setDesc] = useState("");
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isSuccess && txHash) {
    // fire onMinted once, reset form
    onMinted?.();
    reset();
    setDesc("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !desc.trim()) return;
    const dataHash = keccak256(stringToBytes(desc));
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "mint", args: [desc, dataHash],
    });
  }

  return (
    <form onSubmit={submit} className="p-4 border border-[#1c2538] rounded-xl bg-[#0f1623] space-y-3">
      <h2 className="font-semibold">Mint New Agent INFT</h2>
      <input
        className="w-full border border-[#1c2538] rounded-md px-3 py-2 bg-[#0a0e17] text-[#e6e9f0] placeholder-[#6b7691] focus:border-[#22d3ee] focus:outline-none"
        placeholder="Description (e.g. Momentum trader v3)"
        value={desc} onChange={(e) => setDesc(e.target.value)}
        disabled={isPending || isConfirming}
        required
      />
      <button type="submit" className="px-4 py-2 bg-[#22d3ee] text-[#0a0e17] rounded font-medium hover:bg-[#67e8f9] disabled:opacity-50 transition-colors"
        disabled={isPending || isConfirming || !desc.trim()}>
        {isPending ? "Confirm in wallet…" : isConfirming ? "Mining…" : "Mint INFT"}
      </button>
    </form>
  );
}
