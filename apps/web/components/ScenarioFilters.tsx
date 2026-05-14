"use client";

export type FilterValue = "all" | "historical" | "synthetic" | "ETH" | "BTC" | "LUNA";

export interface ScenarioFiltersProps {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

const OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "historical", label: "Historical" },
  { value: "synthetic", label: "Synthetic" },
  { value: "ETH", label: "ETH" },
  { value: "BTC", label: "BTC" },
  { value: "LUNA", label: "LUNA" },
];

export function ScenarioFilters({ value, onChange }: ScenarioFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
              active
                ? "bg-[#22d3ee15] text-[#22d3ee] border-[#22d3ee]"
                : "bg-[#0f1623] text-[#aab2c5] border-[#1c2538] hover:border-[#3d4a6e] hover:text-[#e6e9f0]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
