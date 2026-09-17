import { ding, mouseClick, pageTurn, whoosh } from "@remotion/sfx";
import { staticFile } from "remotion";

export type ReelV006SfxCue = {
  id: string;
  fromFrame: number;
  durationInFrames: number;
  src: string;
  volume: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
};

export const REEL_V006_MUSIC = staticFile(
  "audio/reel-v005/ventora-v005-bed-progressive.wav",
);

const AUDIO = {
  ding: staticFile("audio/reel-v003/ding.wav"),
  click: staticFile("audio/reel-v003/mouse-click.wav"),
  pageTurn: staticFile("audio/reel-v003/page-turn.wav"),
  whoosh: staticFile("audio/reel-v003/whoosh.wav"),
} as const;

export const REEL_V006_SFX_CUES: ReelV006SfxCue[] = [
  {
    id: "opening-impact",
    fromFrame: 0,
    durationInFrames: 14,
    src: AUDIO.whoosh,
    volume: 0.07,
    fadeInFrames: 1,
    fadeOutFrames: 9,
  },
  {
    id: "workshop-paper",
    fromFrame: 62,
    durationInFrames: 24,
    src: AUDIO.pageTurn,
    volume: 0.035,
    fadeInFrames: 2,
    fadeOutFrames: 14,
  },
  {
    id: "search-papers",
    fromFrame: 104,
    durationInFrames: 22,
    src: AUDIO.pageTurn,
    volume: 0.03,
    fadeInFrames: 2,
    fadeOutFrames: 13,
  },
  {
    id: "mobile-transition",
    fromFrame: 204,
    durationInFrames: 18,
    src: AUDIO.whoosh,
    volume: 0.075,
    fadeInFrames: 1,
    fadeOutFrames: 11,
  },
  {
    id: "dashboard-click",
    fromFrame: 252,
    durationInFrames: 18,
    src: AUDIO.click,
    volume: 0.045,
    fadeInFrames: 1,
    fadeOutFrames: 11,
  },
  {
    id: "quote-confirmation",
    fromFrame: 330,
    durationInFrames: 28,
    src: AUDIO.ding,
    volume: 0.07,
    fadeInFrames: 2,
    fadeOutFrames: 16,
  },
  {
    id: "pdf-ready",
    fromFrame: 444,
    durationInFrames: 26,
    src: AUDIO.pageTurn,
    volume: 0.045,
    fadeInFrames: 2,
    fadeOutFrames: 16,
  },
  {
    id: "cta-entry",
    fromFrame: 534,
    durationInFrames: 16,
    src: AUDIO.whoosh,
    volume: 0.075,
    fadeInFrames: 1,
    fadeOutFrames: 10,
  },
  {
    id: "cta-chime",
    fromFrame: 552,
    durationInFrames: 34,
    src: AUDIO.ding,
    volume: 0.075,
    fadeInFrames: 2,
    fadeOutFrames: 18,
  },
];

export const REEL_V006_AUDIO_SOURCES = {
  music: "public/audio/reel-v005/ventora-v005-bed-progressive.wav",
  sfx: {
    package: "@remotion/sfx@4.0.490",
    urls: { ding, mouseClick, pageTurn, whoosh },
  },
} as const;
