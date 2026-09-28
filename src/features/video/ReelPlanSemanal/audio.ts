import { staticFile } from "remotion";

export const REEL_PLAN_SEMANAL_AUDIO_CUES = [
  {
    id: "measurements-crossfade",
    fromFrame: 112,
    durationInFrames: 22,
    src: staticFile("audio/reel-v003/whoosh.wav"),
    volume: 0.075,
    fadeInFrames: 2,
    fadeOutFrames: 14,
  },
  {
    id: "messages-crossfade",
    fromFrame: 202,
    durationInFrames: 22,
    src: staticFile("audio/reel-v003/whoosh.wav"),
    volume: 0.07,
    fadeInFrames: 2,
    fadeOutFrames: 14,
  },
  {
    id: "pending-crossfade",
    fromFrame: 292,
    durationInFrames: 22,
    src: staticFile("audio/reel-v003/whoosh.wav"),
    volume: 0.07,
    fadeInFrames: 2,
    fadeOutFrames: 14,
  },
  {
    id: "ventora-crossfade",
    fromFrame: 412,
    durationInFrames: 22,
    src: staticFile("audio/reel-v003/whoosh.wav"),
    volume: 0.08,
    fadeInFrames: 2,
    fadeOutFrames: 14,
  },
  {
    id: "ventora-soft-impact",
    fromFrame: 420,
    durationInFrames: 30,
    src: staticFile("audio/reel-v003/ding.wav"),
    volume: 0.08,
    fadeInFrames: 2,
    fadeOutFrames: 20,
  },
] as const;
