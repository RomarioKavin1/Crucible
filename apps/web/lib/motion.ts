// Motion design system — Emil Kowalski canonical values.
// One easing, one spring API, per-element durations from his timing table.
// Ref: animations.dev + emil-design-eng skill.

import type { Transition, Variants } from "motion/react";

// ─── Easing curves (Emil's canonical) ────────────────────────────────────

/** Strong ease-out — UI interactions, enters, dropdowns, popovers. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Strong ease-in-out — on-screen movement (drag, slide, morph). */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** iOS-like drawer curve. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

// ─── Per-element durations (Emil's timing table) ─────────────────────────

export const DURATION = {
  press: 0.14,    // button press feedback (100-160ms)
  tooltip: 0.16,  // tooltips, small popovers (125-200ms)
  dropdown: 0.2,  // dropdowns, selects (150-250ms)
  modal: 0.24,    // modals, drawers (200-500ms but stay snappy)
  exit: 0.16,     // exits faster than enters
} as const;

// ─── Springs (Apple-style API per Emil's recommendation) ─────────────────

/** Snappy spring with subtle bounce — cards, layout shifts. */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  duration: 0.4,
  bounce: 0.15,
};

/** No-bounce spring — modal entrances, careful UI. */
export const SPRING_FIRM: Transition = {
  type: "spring",
  duration: 0.4,
  bounce: 0,
};

// ─── Variants ─────────────────────────────────────────────────────────────

export const FADE: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.dropdown, ease: EASE_OUT } },
  exit:    { opacity: 0, transition: { duration: DURATION.exit,     ease: EASE_OUT } },
};

/** Subtle slide-up + fade — list items, cards, page sections. */
export const RISE_IN: Variants = {
  hidden:  { opacity: 0, transform: "translateY(8px)" },
  visible: { opacity: 1, transform: "translateY(0px)", transition: { duration: DURATION.dropdown, ease: EASE_OUT } },
  exit:    { opacity: 0, transform: "translateY(4px)", transition: { duration: DURATION.exit, ease: EASE_OUT } },
};

/**
 * Modal panel — appears from viewport center, no Y translation (modals
 * aren't anchored to a trigger). Spring-driven for natural feel.
 * Emil rule: never animate from scale(0); start from 0.95+.
 */
export const MODAL_PANEL: Variants = {
  hidden:  { opacity: 0, transform: "scale(0.96)" },
  visible: { opacity: 1, transform: "scale(1)", transition: SPRING_FIRM },
  exit:    { opacity: 0, transform: "scale(0.97)", transition: { duration: DURATION.exit, ease: EASE_OUT } },
};

export const MODAL_BACKDROP: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.modal,  ease: EASE_OUT } },
  exit:    { opacity: 0, transition: { duration: DURATION.exit,   ease: EASE_OUT } },
};

/**
 * Tab content cross-fade with subtle blur to mask the swap.
 * Emil rule: when a crossfade feels off, add filter: blur(2px) to bridge
 * the visual gap between two distinct DOM states.
 */
export const TAB_BODY: Variants = {
  hidden:  { opacity: 0, filter: "blur(2px)" },
  visible: { opacity: 1, filter: "blur(0px)", transition: { duration: DURATION.dropdown, ease: EASE_OUT } },
  exit:    { opacity: 0, filter: "blur(2px)", transition: { duration: DURATION.exit, ease: EASE_OUT } },
};

/** Stagger container — drop on a parent, give children RISE_IN. */
export const STAGGER_PARENT: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,    // 50ms per child (Emil: 30-80ms range)
      delayChildren: 0.04,
    },
  },
};

// ─── Press / hover gestures ───────────────────────────────────────────────

/** Subtle press for tappable cards — Emil: 0.95-0.98 range. */
export const PRESS_CARD = {
  whileTap: { scale: 0.985 },
  transition: { duration: DURATION.press, ease: EASE_OUT },
};

/** Stronger press for buttons — Emil's canonical 0.97. */
export const PRESS_BUTTON = {
  whileTap: { scale: 0.97 },
  transition: { duration: DURATION.press, ease: EASE_OUT },
};
