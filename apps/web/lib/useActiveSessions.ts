"use client";
import { useEffect, useState } from "react";

export interface ActiveSession {
  runId: string;
  scenarioId: string;
  tokenId: string;
  startedAt: number;
  lastTickAt: number;
}

const MCP_URL = (process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:8080/v1").replace(/\/v1\/?$/, "");

/**
 * Polls the MCP server every 2.5s for active runs against a tokenId.
 * Returns the most recent active session, or null if none.
 */
export function useActiveSession(tokenId: bigint | null, intervalMs = 2500): ActiveSession | null {
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    if (tokenId === null) { setSession(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`${MCP_URL}/active-sessions/${tokenId.toString()}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const s = (j.active ?? [])[0] as ActiveSession | undefined;
        setSession(s ?? null);
      } catch {
        if (!cancelled) setSession(null);   // server down → no banner
      }
    };
    poll();   // immediate first call
    const id = setInterval(poll, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [tokenId, intervalMs]);

  return session;
}
