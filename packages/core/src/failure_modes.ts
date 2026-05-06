// v1 failure-mode library — 15 named patterns. Each pattern needs a
// detection rule on the trace, evidence-extraction logic, and a
// remediation template. For now we only enumerate the patterns; the
// detectors land in a follow-up.

export const FAILURE_MODES = [
  "PANIC_SELLER",
  "FOMO_BUYER",
  "OVERTRADER",
  "ANCHORING",
  "NEWS_BLIND",
  "NO_STOP_LOSS",
  "STOP_TOO_TIGHT",
  "OVER_LEVERAGED",
  "MEAN_REVERSION_BIAS",
  "MOMENTUM_LATECOMER",
  "THESIS_DRIFTER",
  "NO_POSITION_SIZING",
  "TILTED_AFTER_LOSS",
  "IGNORES_LIQUIDITY",
  "CONFIRMATION_BIAS",
] as const;

export type FailureMode = (typeof FAILURE_MODES)[number];
