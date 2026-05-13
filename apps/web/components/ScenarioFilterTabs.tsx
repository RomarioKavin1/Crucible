import Link from "next/link";

export function ScenarioFilterTabs({ scenarios, activeId }: { scenarios: string[]; activeId?: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-800 mb-4 overflow-x-auto">
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
      className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
        active ? "border-cyan-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </Link>
  );
}
