"use client";
import { motion } from "motion/react";
import { ScenarioCard, type ScenarioCardData } from "@crucible/ui-kit";
import { STAGGER_PARENT, RISE_IN, PRESS_CARD, EASE_OUT, DURATION } from "@/lib/motion";

/**
 * Stagger-in grid for ScenarioCards.
 *
 * Hover lift is done with a Tailwind `[@media(hover:hover)and(pointer:fine)]:`
 * class instead of motion's whileHover so it never false-fires on touch
 * devices (Emil's "touch device hover states" rule).
 *
 * Press scale stays via motion (whileTap is already touch-aware).
 */
export function AnimatedScenarioGrid({ items, className }: {
  items: ScenarioCardData[];
  className?: string;
}) {
  return (
    <motion.div
      variants={STAGGER_PARENT}
      initial="hidden"
      animate="visible"
      className={className ?? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"}
    >
      {items.map((s) => (
        <motion.div
          key={s.id}
          variants={RISE_IN}
          {...PRESS_CARD}
          className="[@media(hover:hover)and(pointer:fine)]:hover:-translate-y-[3px] transition-transform"
          style={{ transitionDuration: `${DURATION.press * 1000}ms`, transitionTimingFunction: `cubic-bezier(${EASE_OUT.join(",")})` }}
        >
          <ScenarioCard data={s} />
        </motion.div>
      ))}
    </motion.div>
  );
}
