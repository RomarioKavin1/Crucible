"use client";
import { useState } from "react";
import useSWR from "swr";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import { AGENT_INFT_ADDRESS, ABIs, readDelegations } from "@/lib/contracts";

export function DelegationManager({ tokenId }: { tokenId: bigint }) {
  const { data: delegations, mutate } = useSWR(["delegations", tokenId.toString()], () => readDelegations(tokenId));
  const [newAddr, setNewAddr] = useState("");
  const { writeContractAsync, isPending, data: txHash, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isSuccess && txHash) {
    mutate();
    reset();
    setNewAddr("");
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!isAddress(newAddr)) return;
    await writeContractAsync({ address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "delegateAccess", args: [tokenId, newAddr as `0x${string}`] });
  }

  async function revoke(addr: string) {
    await writeContractAsync({ address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "revokeAccess", args: [tokenId, addr as `0x${string}`] });
  }

  return (
    <div className="p-4 border border-[#1c2538] rounded-xl bg-[#0f1623] space-y-3">
      <h3 className="font-semibold">Delegated Signing Keys</h3>
      <p className="text-sm text-[#6b7691]">
        Authorize a hot wallet to sign actions on behalf of this INFT.
        The owner wallet is always authorized.
      </p>
      <form onSubmit={add} className="flex gap-2">
        <input className="flex-1 border border-[#1c2538] rounded-md px-3 py-2 bg-[#0a0e17] text-[#e6e9f0] placeholder-[#6b7691] focus:border-[#22d3ee] focus:outline-none font-mono text-sm" placeholder="0x…"
          value={newAddr} onChange={(e) => setNewAddr(e.target.value)}
          disabled={isPending || isConfirming} />
        <button type="submit" className="px-4 py-2 bg-[#22d3ee] text-[#0a0e17] rounded font-medium hover:bg-[#67e8f9] disabled:opacity-50 transition-colors"
          disabled={isPending || isConfirming || !isAddress(newAddr)}>
          {isPending || isConfirming ? "..." : "Add"}
        </button>
      </form>
      <ul className="space-y-1">
        {delegations?.map((addr) => (
          <li key={addr} className="flex items-center justify-between font-mono text-sm text-[#e6e9f0]">
            <span>{addr}</span>
            <button className="text-[#ef4444] hover:text-[#fca5a5]" onClick={() => revoke(addr)}
              disabled={isPending || isConfirming}>Revoke</button>
          </li>
        ))}
        {delegations?.length === 0 && <li className="text-[#6b7691] text-sm">No delegations.</li>}
      </ul>
    </div>
  );
}
