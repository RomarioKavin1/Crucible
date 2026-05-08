"use client";
import React from "react";

export interface PnLPanelProps {
  cash: number;
  position: number;
  mid: number;
  drawdownPct: number;
}

export function PnLPanel({ cash, position, mid, drawdownPct }: PnLPanelProps) {
  const equity = cash + position * mid;
  return (
    <div style={{ border: "1px solid #333", padding: 12, fontFamily: "ui-monospace, monospace" }}>
      <div>Equity: ${equity.toFixed(2)}</div>
      <div>Cash:   ${cash.toFixed(2)}</div>
      <div>Pos:    {position.toFixed(4)}</div>
      <div>DD:     {drawdownPct.toFixed(2)}%</div>
    </div>
  );
}
