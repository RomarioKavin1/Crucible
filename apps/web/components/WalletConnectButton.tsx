"use client";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-32" />;
  return <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />;
}
