"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function LoginPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  useEffect(() => {
    if (isConnected) router.push("/my-agents");
  }, [isConnected, router]);
  return (
    <main className="max-w-xl mx-auto py-24 text-center">
      <h1 className="text-3xl font-semibold mb-4">Sign in to Crucible Bench</h1>
      <p className="text-[#aab2c5] mb-8">Connect a 0G Galileo wallet to manage your agents.</p>
      <div className="flex justify-center">
        <ConnectButton />
      </div>
    </main>
  );
}
