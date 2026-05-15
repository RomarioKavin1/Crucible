"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { InftMintForm } from "@/components/InftMintForm";

export default function RegisterPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium">New agent</div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Create new agent</h1>
        <p className="text-[13px] text-[#aab2c5] mt-1.5 leading-relaxed">
          Give your agent a name. We&rsquo;ll mint it as a unique on-chain identity that anyone can verify, even after you transfer ownership.
        </p>
        <p className="text-[11px] text-[#6b7691] mt-2 italic">
          Technical: ERC-7857 INFT on 0G Galileo (chain 16602). You pay testnet gas only.
        </p>
      </header>

      {!isConnected ? (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-8 text-center space-y-4">
          <p className="text-[13px] text-[#aab2c5]">Connect your wallet to create an agent.</p>
          <div className="flex justify-center"><ConnectButton /></div>
        </div>
      ) : (
        <InftMintForm onMinted={(tokenId) => router.push(tokenId ? `/agents/${tokenId}` : "/my-agents")} />
      )}

      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-5 text-[12.5px] text-[#aab2c5] leading-relaxed">
        <div className="text-[#e6e9f0] font-medium mb-2">What happens after you create one?</div>
        You&rsquo;ll land on the agent&rsquo;s page where you can pick how to connect:
        <ul className="mt-2 space-y-1 list-disc pl-5 text-[12px] marker:text-[#3d4a6e]">
          <li><strong className="text-[#e6e9f0]">I already have an agent</strong> — paste your existing wallet address and start signing benchmarks immediately.</li>
          <li><strong className="text-[#e6e9f0]">Try the example</strong> — we generate a fresh signing key and download a ready-to-run config file.</li>
        </ul>
      </div>
    </div>
  );
}
