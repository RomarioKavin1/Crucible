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
    <form onSubmit={submit} className="p-4 border rounded space-y-3">
      <h2 className="font-semibold">Mint New Agent INFT</h2>
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Description (e.g. Momentum trader v3)"
        value={desc} onChange={(e) => setDesc(e.target.value)}
        disabled={isPending || isConfirming}
        required
      />
      <button type="submit" className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
        disabled={isPending || isConfirming || !desc.trim()}>
        {isPending ? "Confirm in wallet…" : isConfirming ? "Mining…" : "Mint INFT"}
      </button>
    </form>
  );
}
