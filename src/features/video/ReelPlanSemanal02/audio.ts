import { staticFile } from "remotion";

const SFX = "audio/reel-v003";

export const REEL_PLAN_SEMANAL_02_CUES = [
  { id: "hook-whoosh", from: 0, file: "whoosh.wav", frames: 8, volume: 0.22 },
  { id: "hook-impact", from: 8, file: "ding.wav", frames: 14, volume: 0.1 },
  { id: "hook-icon-1", from: 31, file: "mouse-click.wav", frames: 7, volume: 0.17 },
  { id: "hook-icon-2", from: 44, file: "mouse-click.wav", frames: 7, volume: 0.14 },
  { id: "hook-icon-3", from: 57, file: "mouse-click.wav", frames: 7, volume: 0.14 },

  { id: "price-swipe", from: 118, file: "page-turn.wav", frames: 14, volume: 0.17 },
  { id: "price-chat", from: 129, file: "mouse-click.wav", frames: 7, volume: 0.15 },
  { id: "price-photo", from: 138, file: "mouse-click.wav", frames: 7, volume: 0.13 },
  { id: "price-sheet", from: 147, file: "mouse-click.wav", frames: 7, volume: 0.13 },
  { id: "price-organized", from: 224, file: "ding.wav", frames: 13, volume: 0.1 },

  { id: "calculation-whoosh", from: 238, file: "whoosh.wav", frames: 10, volume: 0.18 },
  { id: "calculation-click", from: 247, file: "mouse-click.wav", frames: 7, volume: 0.15 },
  { id: "calculation-tick-1", from: 257, file: "mouse-click.wav", frames: 5, volume: 0.12 },
  { id: "calculation-tick-2", from: 264, file: "mouse-click.wav", frames: 5, volume: 0.12 },
  { id: "calculation-tick-3", from: 271, file: "mouse-click.wav", frames: 5, volume: 0.12 },
  { id: "total-confirmation", from: 322, file: "ding.wav", frames: 13, volume: 0.1 },

  { id: "computer-swipe", from: 358, file: "page-turn.wav", frames: 14, volume: 0.16 },
  { id: "computer-click", from: 371, file: "mouse-click.wav", frames: 7, volume: 0.13 },
  { id: "phone-focus", from: 433, file: "ding.wav", frames: 12, volume: 0.095 },

  { id: "cta-swipe", from: 478, file: "whoosh.wav", frames: 10, volume: 0.18 },
  { id: "cta-impact", from: 488, file: "ding.wav", frames: 13, volume: 0.1 },
  { id: "cta-flow", from: 520, file: "mouse-click.wav", frames: 7, volume: 0.12 },
  { id: "cta-final-chime", from: 596, file: "ding.wav", frames: 13, volume: 0.09 },
] as const;

export function reelPlanSemanal02Audio(cue: (typeof REEL_PLAN_SEMANAL_02_CUES)[number]) {
  return staticFile(`${SFX}/${cue.file}`);
}
