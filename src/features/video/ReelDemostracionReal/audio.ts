import { staticFile } from "remotion";

const AUDIO = "audio/reel-v003";

export const DEMO_REEL_SFX = [
  { id: "hook-whoosh", frame: 0, file: "whoosh.wav", duration: 10, volume: 0.22 },
  { id: "hook-impact", frame: 8, file: "ding.wav", duration: 15, volume: 0.11 },
  { id: "client-swipe", frame: 96, file: "page-turn.wav", duration: 14, volume: 0.18 },
  { id: "client-select", frame: 122, file: "mouse-click.wav", duration: 9, volume: 0.2 },
  { id: "piece-swipe", frame: 207, file: "whoosh.wav", duration: 10, volume: 0.18 },
  { id: "piece-select", frame: 226, file: "mouse-click.wav", duration: 9, volume: 0.19 },
  { id: "measure-tick-1", frame: 393, file: "mouse-click.wav", duration: 6, volume: 0.15 },
  { id: "measure-tick-2", frame: 401, file: "mouse-click.wav", duration: 6, volume: 0.15 },
  { id: "price-swipe", frame: 592, file: "page-turn.wav", duration: 14, volume: 0.17 },
  { id: "price-click", frame: 625, file: "mouse-click.wav", duration: 9, volume: 0.18 },
  { id: "price-confirmation", frame: 744, file: "ding.wav", duration: 15, volume: 0.12 },
  { id: "pdf-swipe", frame: 774, file: "whoosh.wav", duration: 10, volume: 0.17 },
  { id: "pdf-click", frame: 1108, file: "mouse-click.wav", duration: 9, volume: 0.18 },
  { id: "ready-swipe", frame: 1056, file: "page-turn.wav", duration: 14, volume: 0.16 },
  { id: "ready-confirmation", frame: 1128, file: "ding.wav", duration: 15, volume: 0.11 },
  { id: "cta-impact", frame: 1152, file: "whoosh.wav", duration: 10, volume: 0.2 },
  { id: "cta-chime", frame: 1190, file: "ding.wav", duration: 15, volume: 0.1 },
] as const;

export function demoReelSfxSrc(cue: (typeof DEMO_REEL_SFX)[number]) {
  return staticFile(`${AUDIO}/${cue.file}`);
}
