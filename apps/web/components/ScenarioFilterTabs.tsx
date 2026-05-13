import Link from "next/link";

export function ScenarioFilterTabs({ scenarios, activeId }: { scenarios: string[]; activeId?: string }) {
  return (
    <div className="flex gap-1 border-b border-[#1f2a3d] mb-6 overflow-x-auto">
      <Tab href="/" active={!activeId}>Overall</Tab>
      {scenarios.map((id) => (
        <Tab key={id} href={`/scenarios/${id}`} active={activeId === id}>
          {id}
        </Tab>
      ))}
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] whitespace-nowrap border-b-2 -mb-px ${
        active
          ? "border-[#22d3ee] text-[#e5e9f0]"
          : "border-transparent text-[#5e6b80] hover:text-[#e5e9f0]"
      }`}
    >
      {children}
    </Link>
  );
}
