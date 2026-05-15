"use client";
import { useState } from "react";
import { RunScenarioModal } from "./RunScenarioModal";

export function RunScenarioButton({
  scenarioId, scenarioTitle, size = "default",
}: {
  scenarioId: string;
  scenarioTitle: string;
  size?: "default" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const sizeClass = size === "lg"
    ? "px-6 py-3 text-[14px]"
    : "px-5 py-2.5 text-[13px]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] rounded-lg transition-colors shadow-sm ${sizeClass}`}
      >
        <span aria-hidden>▶</span>
        Run this scenario
      </button>
      <RunScenarioModal
        scenarioId={scenarioId}
        scenarioTitle={scenarioTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
