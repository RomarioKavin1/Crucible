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
    <div className="p-4 border rounded space-y-3">
      <h3 className="font-semibold">Delegated Signing Keys</h3>
      <p className="text-sm text-zinc-600">
        Authorize a hot wallet to sign actions on behalf of this INFT.
        The owner wallet is always authorized.
      </p>
      <form onSubmit={add} className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2 font-mono text-sm" placeholder="0x…"
          value={newAddr} onChange={(e) => setNewAddr(e.target.value)}
          disabled={isPending || isConfirming} />
        <button type="submit" className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
          disabled={isPending || isConfirming || !isAddress(newAddr)}>
          {isPending || isConfirming ? "..." : "Add"}
        </button>
      </form>
      <ul className="space-y-1">
        {delegations?.map((addr) => (
          <li key={addr} className="flex items-center justify-between font-mono text-sm">
            <span>{addr}</span>
            <button className="text-red-600 hover:text-red-800" onClick={() => revoke(addr)}
              disabled={isPending || isConfirming}>Revoke</button>
          </li>
        ))}
        {delegations?.length === 0 && <li className="text-zinc-500 text-sm">No delegations.</li>}
      </ul>
    </div>
  );
}
