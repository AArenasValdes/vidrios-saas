import { ding, mouseClick, pageTurn, whoosh } from "@remotion/sfx";
import { staticFile } from "remotion";

export type ReelV004SfxCue = {
  id: string;
  fromFrame: number;
  durationInFrames: number;
  src: string;
  volume: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
};

export const REEL_V004_MUSIC = staticFile(
  "audio/reel-v003/ventora-v003-bed-original.wav",
);

const AUDIO = {
  ding: staticFile("audio/reel-v003/ding.wav"),
  whoosh: staticFile("audio/reel-v003/whoosh.wav"),
  pageTurn: staticFile("audio/reel-v003/page-turn.wav"),
  click: staticFile("audio/reel-v003/mouse-click.wav"),
} as const;

export const REEL_V004_SFX_CUES: ReelV004SfxCue[] = [
  {
    id: "price-hook",
    fromFrame: 0,
    durationInFrames: 10,
    src: AUDIO.whoosh,
    volume: 0.08,
    fadeInFrames: 1,
    fadeOutFrames: 6,
  },
  {
    id: "price-reveal",
    fromFrame: 90,
    durationInFrames: 42,
    src: AUDIO.ding,
    volume: 0.1,
    fadeInFrames: 2,
    fadeOutFrames: 16,
  },
  {
    id: "mobile-transition",
    fromFrame: 180,
    durationInFrames: 10,
    src: AUDIO.whoosh,
    volume: 0.09,
    fadeInFrames: 1,
    fadeOutFrames: 6,
  },
  {
    id: "pdf-transition",
    fromFrame: 300,
    durationInFrames: 16,
    src: AUDIO.pageTurn,
    volume: 0.045,
    fadeInFrames: 2,
    fadeOutFrames: 8,
  },
  {
    id: "organized-click",
    fromFrame: 420,
    durationInFrames: 16,
    src: AUDIO.click,
    volume: 0.07,
    fadeInFrames: 1,
    fadeOutFrames: 8,
  },
  {
    id: "cta-whoosh",
    fromFrame: 510,
    durationInFrames: 10,
    src: AUDIO.whoosh,
    volume: 0.09,
    fadeInFrames: 1,
    fadeOutFrames: 6,
  },
  {
    id: "cta-accent",
    fromFrame: 525,
    durationInFrames: 42,
    src: AUDIO.ding,
    volume: 0.1,
    fadeInFrames: 2,
    fadeOutFrames: 16,
  },
];

export const REEL_V004_AUDIO_SOURCES = {
  music: "public/audio/reel-v003/ventora-v003-bed-original.wav",
  sfx: {
    package: "@remotion/sfx@4.0.490",
    urls: {
      ding,
      mouseClick,
      pageTurn,
      whoosh,
    },
  },
} as const;
