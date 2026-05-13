import type { TraceEntry } from "@crucible/core";
import { PATTERN_LIBRARY } from "./pattern-library";
import type { PatternDetection } from "./types";

export function detectPatterns(entries: TraceEntry[]): PatternDetection[] {
  const detections: PatternDetection[] = [];
  for (const rule of PATTERN_LIBRARY) {
    const result = rule.detect(entries);
    if (result) {
      detections.push({
        patternId: rule.id,
        confidence: result.confidence,
        evidence: result.evidence,
        remediation: rule.remediation,
      });
    }
  }
  return detections;
}
