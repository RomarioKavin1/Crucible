export interface OnChainProofPanelProps {
  network: "galileo" | "mainnet";
  runId: string;
  runTxHash?: string;
  agentRegistryAddr?: string;
  recipeHash: string;
  traceHash: string;
  storageTxHash?: string;
}

const EXPLORER: Record<OnChainProofPanelProps["network"], string> = {
  galileo: "https://chainscan-galileo.0g.ai",
  mainnet: "https://chainscan.0g.ai",
};

function shortHash(h: string, head = 6, tail = 4): string {
  if (!h.startsWith("0x")) return h;
  return `${h.slice(0, head + 2)}…${h.slice(-tail)}`;
}

export function OnChainProofPanel(props: OnChainProofPanelProps) {
  const explorer = EXPLORER[props.network];
  return (
    <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-4 space-y-4">
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#5e6b80]">On-chain proof</div>

      <Row icon="⛓" label="Run record" badge={`runId ${props.runId}`}>
        {props.runTxHash && (
          <ExternalLink href={`${explorer}/tx/${props.runTxHash}`}>tx {shortHash(props.runTxHash)}</ExternalLink>
        )}
      </Row>

      <Row icon="🗄" label="Trace blob" badge="0G Storage">
        <div className="font-mono text-xs text-[#5e6b80]">root {shortHash(props.traceHash, 8, 6)}</div>
        {props.storageTxHash && (
          <ExternalLink href={`${explorer}/tx/${props.storageTxHash}`}>storage tx {shortHash(props.storageTxHash)}</ExternalLink>
        )}
      </Row>

      <Row icon="📜" label="Recipe hash" badge="committed">
        <div className="font-mono text-xs text-[#5e6b80]">{shortHash(props.recipeHash, 8, 6)}</div>
        {props.agentRegistryAddr && (
          <ExternalLink href={`${explorer}/address/${props.agentRegistryAddr}`}>AgentRegistry ↗</ExternalLink>
        )}
      </Row>
    </div>
  );
}

function Row({
  icon, label, badge, children,
}: { icon: string; label: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span aria-hidden>{icon}</span>
        <span className="font-mono text-xs tracking-[0.18em] uppercase text-[#e5e9f0]">{label}</span>
        {badge && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5e6b80]">{badge}</span>}
      </div>
      <div className="ml-6 space-y-1">{children}</div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-[#22d3ee] hover:underline inline-flex items-center gap-1"
    >
      {children}
      <span aria-hidden>↗</span>
    </a>
  );
}
