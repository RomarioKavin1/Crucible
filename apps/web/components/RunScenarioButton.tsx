"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { PRESS_BUTTON } from "@/lib/motion";

/**
 * Routes to the unified /runbuilder with the scenario preselected.
 * Replaces the old in-page modal.
 */
export function RunScenarioButton({
  scenarioId, size = "default",
}: {
  scenarioId: string;
  /** kept for back-compat — old callers pass scenarioTitle, ignored */
  scenarioTitle?: string;
  size?: "default" | "lg";
}) {
  const sizeClass = size === "lg"
    ? "px-6 py-3 text-[14px]"
    : "px-5 py-2.5 text-[13px]";

  return (
    <motion.div {...PRESS_BUTTON} className="inline-block">
      <Link
        href={`/runbuilder?scenario=${encodeURIComponent(scenarioId)}`}
        className={`inline-flex items-center gap-2 font-medium bg-[#22d3ee] text-[#0a0e17] rounded-lg transition-colors [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] ${sizeClass}`}
      >
        <span aria-hidden>▶</span>
        Run this scenario
      </Link>
    </motion.div>
  );
}
