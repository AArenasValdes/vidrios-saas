import { ding, mouseClick, whoosh } from "@remotion/sfx";
import { staticFile } from "remotion";

export type ReelV005SfxCue = {
  id: string;
  fromFrame: number;
  durationInFrames: number;
  src: string;
  volume: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
};

export const REEL_V005_MUSIC = staticFile(
  "audio/reel-v005/ventora-v005-bed-progressive.wav",
);

const AUDIO = {
  ding: staticFile("audio/reel-v003/ding.wav"),
  click: staticFile("audio/reel-v003/mouse-click.wav"),
  whoosh: staticFile("audio/reel-v003/whoosh.wav"),
} as const;

export const REEL_V005_SFX_CUES: ReelV005SfxCue[] = [
  { id: "scene-1-entry", fromFrame: 0, durationInFrames: 12, src: AUDIO.whoosh, volume: 0.07, fadeInFrames: 1, fadeOutFrames: 8 },
  { id: "link-share", fromFrame: 130, durationInFrames: 18, src: AUDIO.click, volume: 0.045, fadeInFrames: 1, fadeOutFrames: 10 },
  { id: "form-submit", fromFrame: 260, durationInFrames: 18, src: AUDIO.click, volume: 0.055, fadeInFrames: 1, fadeOutFrames: 10 },
  { id: "request-received", fromFrame: 390, durationInFrames: 34, src: AUDIO.ding, volume: 0.085, fadeInFrames: 2, fadeOutFrames: 16 },
  { id: "flow-connection", fromFrame: 520, durationInFrames: 16, src: AUDIO.whoosh, volume: 0.06, fadeInFrames: 1, fadeOutFrames: 10 },
  { id: "cta-rise", fromFrame: 650, durationInFrames: 22, src: AUDIO.whoosh, volume: 0.08, fadeInFrames: 2, fadeOutFrames: 14 },
  { id: "cta-accent", fromFrame: 672, durationInFrames: 32, src: AUDIO.ding, volume: 0.075, fadeInFrames: 2, fadeOutFrames: 16 },
];

export const REEL_V005_AUDIO_SOURCES = {
  music: "public/audio/reel-v005/ventora-v005-bed-progressive.wav",
  sfx: { package: "@remotion/sfx@4.0.490", urls: { ding, mouseClick, whoosh } },
} as const;
