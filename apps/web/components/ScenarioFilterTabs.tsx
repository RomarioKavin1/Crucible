import Link from "next/link";

export function ScenarioFilterTabs({ scenarios, activeId }: { scenarios: string[]; activeId?: string }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[#1c2538]">
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
      className={`px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
        active
          ? "border-[#22d3ee] text-[#e6e9f0]"
          : "border-transparent text-[#6b7691] hover:text-[#e6e9f0]"
      }`}
    >
      {children}
    </Link>
  );
}
