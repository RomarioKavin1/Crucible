"use client";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-[#1c2538]">
      {items.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active
                ? "border-[#22d3ee] text-[#e6e9f0]"
                : "border-transparent text-[#6b7691] hover:text-[#e6e9f0]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
