import type { GlassCutSequenceStep } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";

export type GlassCutLineGeometry = {
  x1Mm: number;
  y1Mm: number;
  x2Mm: number;
  y2Mm: number;
};

/** Canonical absolute line used by the screen plan and PDF renderer. */
export function resolveGlassCutLineGeometry(step: GlassCutSequenceStep): GlassCutLineGeometry {
  return step.axis === "x"
    ? {
        x1Mm: step.absolutePositionMm,
        y1Mm: step.fromMm,
        x2Mm: step.absolutePositionMm,
        y2Mm: step.toMm,
      }
    : {
        x1Mm: step.fromMm,
        y1Mm: step.absolutePositionMm,
        x2Mm: step.toMm,
        y2Mm: step.absolutePositionMm,
      };
}
