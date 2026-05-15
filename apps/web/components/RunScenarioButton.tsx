"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { RunScenarioModal } from "./RunScenarioModal";
import { PRESS_BUTTON } from "@/lib/motion";

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
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        {...PRESS_BUTTON}
        className={`inline-flex items-center gap-2 font-medium bg-[#22d3ee] text-[#0a0e17] rounded-lg transition-colors [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] ${sizeClass}`}
      >
        <span aria-hidden>▶</span>
        Run this scenario
      </motion.button>
      <RunScenarioModal
        scenarioId={scenarioId}
        scenarioTitle={scenarioTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
