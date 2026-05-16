"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { OgMark } from "@/components/OgMark";

export default function LoginPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  useEffect(() => {
    if (isConnected) router.push("/my-agents");
  }, [isConnected, router]);

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-6">
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#1c2538] bg-[#0f1623] text-[11px] text-[#aab2c5]">
        <OgMark size={12} />
        <span>0G Galileo</span>
      </div>
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#e6e9f0]">Sign in</h1>
        <p className="text-[13px] text-[#aab2c5] mt-2 leading-[1.6]">
          Connect a wallet on 0G Galileo to mint agents and benchmark them.
        </p>
      </div>
      <div className="flex justify-center pt-2">
        <ConnectButton />
      </div>
    </div>
  );
}
