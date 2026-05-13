"use client";
import { useState } from "react";
import { Tabs } from "@crucible/ui-kit";
import type { ScenarioDetail } from "@/lib/scenarios";
import { OverviewTab } from "./OverviewTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "methodology", label: "Methodology" },
];

export function ScenarioDetailClient({ scenario }: { scenario: ScenarioDetail }) {
  const [active, setActive] = useState<string>(() => {
    if (typeof window === "undefined") return "overview";
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab && TABS.some((t) => t.id === tab) ? tab : "overview";
  });

  function onChange(id: string) {
    setActive(id);
    const url = new URL(window.location.href);
    if (id === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url);
  }

  return (
    <div className="space-y-5">
      <Tabs items={TABS} activeId={active} onChange={onChange} />
      {active === "overview" && <OverviewTab scenario={scenario} />}
      {active === "leaderboard" && (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-8 text-center text-[#6b7691] text-[13px]">
          Leaderboard for this scenario coming in Task 21.
        </div>
      )}
      {active === "methodology" && (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-8 text-center text-[#6b7691] text-[13px]">
          Methodology details coming in Task 21.
        </div>
      )}
    </div>
  );
}
