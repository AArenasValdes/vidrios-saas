import { staticFile } from "remotion";

const SFX = "audio/reel-v003";

export const REEL_PRECIO_LINEA_CUES = [
  { id: "hook-whoosh", from: 0, file: "whoosh.wav", frames: 12, volume: 0.2 },
  { id: "hook-impact", from: 9, file: "ding.wav", frames: 16, volume: 0.1 },
  { id: "money-icon", from: 38, file: "mouse-click.wav", frames: 9, volume: 0.14 },

  { id: "configure-swipe", from: 120, file: "page-turn.wav", frames: 14, volume: 0.16 },
  { id: "configure-click", from: 143, file: "mouse-click.wav", frames: 9, volume: 0.15 },
  { id: "price-field-pop", from: 188, file: "mouse-click.wav", frames: 9, volume: 0.13 },

  { id: "fields-whoosh", from: 240, file: "whoosh.wav", frames: 12, volume: 0.14 },
  { id: "price-per-meter-tick", from: 259, file: "mouse-click.wav", frames: 8, volume: 0.13 },
  { id: "minimum-charge-tick", from: 275, file: "mouse-click.wav", frames: 8, volume: 0.13 },
  { id: "fields-confirmation", from: 300, file: "ding.wav", frames: 16, volume: 0.095 },

  { id: "quote-transition", from: 375, file: "whoosh.wav", frames: 12, volume: 0.17 },
  { id: "line-applied", from: 399, file: "mouse-click.wav", frames: 9, volume: 0.14 },
  { id: "quote-total", from: 430, file: "ding.wav", frames: 16, volume: 0.095 },
  { id: "demo-cta", from: 464, file: "whoosh.wav", frames: 12, volume: 0.16 },
  { id: "final-chime", from: 495, file: "ding.wav", frames: 16, volume: 0.085 },
] as const;

export function reelPrecioLineaAudio(cue: (typeof REEL_PRECIO_LINEA_CUES)[number]) {
  return staticFile(`${SFX}/${cue.file}`);
}
