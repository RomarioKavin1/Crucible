"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { InftMintForm } from "@/components/InftMintForm";

export default function RegisterPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  return (
    <main className="max-w-xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Register Your Agent</h1>
      <p className="text-zinc-600">Mint an ERC-7857 INFT on 0G Galileo. Your wallet becomes the authorized signer for any benchmark runs against this agent.</p>
      {!isConnected ? (
        <>
          <p className="text-zinc-600">First, connect a 0G Galileo wallet.</p>
          <div className="flex justify-center"><ConnectButton /></div>
        </>
      ) : (
        <>
          <p className="text-zinc-600">Mint your Agent INFT below — you'll be redirected to <code>/my-agents</code> after the transaction confirms.</p>
          <InftMintForm onMinted={() => router.push("/my-agents")} />
        </>
      )}
    </main>
  );
}
