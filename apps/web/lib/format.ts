const E6 = 1_000_000;

export function fromE6(x: bigint): number {
  return Number(x) / E6;
}

export function fmtSortino(x: number): string {
  return x.toFixed(4);
}

export function fmtPct(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}

export function fmtAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function fmtBytes32(b: string): string {
  if (!b.startsWith("0x")) return b;
  return `${b.slice(0, 10)}…${b.slice(-6)}`;
}
