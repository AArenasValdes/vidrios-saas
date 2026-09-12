import { ding, mouseClick, pageTurn, snapchatNotification, whoosh } from "@remotion/sfx";
import { staticFile } from "remotion";

export type ReelV003SfxCue = {
  id: string;
  fromFrame: number;
  durationInFrames: number;
  src: string;
  volume: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
};

export const REEL_V003_MUSIC = staticFile(
  "audio/reel-v003/ventora-v003-bed-original.wav",
);

const LOCAL_AUDIO = {
  notification: staticFile("audio/reel-v003/snapchat-notification.wav"),
  ding: staticFile("audio/reel-v003/ding.wav"),
  whoosh: staticFile("audio/reel-v003/whoosh.wav"),
  pageTurn: staticFile("audio/reel-v003/page-turn.wav"),
  click: staticFile("audio/reel-v003/mouse-click.wav"),
} as const;

export const REEL_V003_SFX_CUES: ReelV003SfxCue[] = [
  {
    id: "message-received",
    fromFrame: 18,
    durationInFrames: 8,
    src: LOCAL_AUDIO.notification,
    volume: 0.13,
    fadeInFrames: 1,
    fadeOutFrames: 5,
  },
  {
    id: "pending-alert",
    fromFrame: 58,
    durationInFrames: 42,
    src: LOCAL_AUDIO.ding,
    volume: 0.1,
    fadeInFrames: 2,
    fadeOutFrames: 16,
  },
  {
    id: "dispersion-whoosh",
    fromFrame: 90,
    durationInFrames: 8,
    src: LOCAL_AUDIO.whoosh,
    volume: 0.08,
    fadeInFrames: 1,
    fadeOutFrames: 5,
  },
  {
    id: "note-page",
    fromFrame: 145,
    durationInFrames: 16,
    src: LOCAL_AUDIO.pageTurn,
    volume: 0.04,
    fadeInFrames: 2,
    fadeOutFrames: 8,
  },
  {
    id: "solution-whoosh",
    fromFrame: 210,
    durationInFrames: 8,
    src: LOCAL_AUDIO.whoosh,
    volume: 0.09,
    fadeInFrames: 1,
    fadeOutFrames: 5,
  },
  {
    id: "dashboard-click",
    fromFrame: 315,
    durationInFrames: 16,
    src: LOCAL_AUDIO.click,
    volume: 0.06,
    fadeInFrames: 1,
    fadeOutFrames: 8,
  },
  {
    id: "dashboard-click-2",
    fromFrame: 480,
    durationInFrames: 16,
    src: LOCAL_AUDIO.click,
    volume: 0.05,
    fadeInFrames: 1,
    fadeOutFrames: 8,
  },
  {
    id: "summary-confirm",
    fromFrame: 540,
    durationInFrames: 42,
    src: LOCAL_AUDIO.ding,
    volume: 0.09,
    fadeInFrames: 2,
    fadeOutFrames: 16,
  },
  {
    id: "pdf-page",
    fromFrame: 610,
    durationInFrames: 16,
    src: LOCAL_AUDIO.pageTurn,
    volume: 0.045,
    fadeInFrames: 2,
    fadeOutFrames: 8,
  },
  {
    id: "cta-whoosh",
    fromFrame: 716,
    durationInFrames: 8,
    src: LOCAL_AUDIO.whoosh,
    volume: 0.08,
    fadeInFrames: 1,
    fadeOutFrames: 5,
  },
  {
    id: "cta-accent",
    fromFrame: 750,
    durationInFrames: 42,
    src: LOCAL_AUDIO.ding,
    volume: 0.09,
    fadeInFrames: 2,
    fadeOutFrames: 16,
  },
];

export const REEL_V003_AUDIO_SOURCES = {
  music: {
    file: "public/audio/reel-v003/ventora-v003-bed-original.wav",
    source: "Original procedural instrumental generated locally with FFmpeg; no external sample or music source.",
    license: "Original Ventora asset; no third-party license required.",
  },
  sfx: {
    package: "@remotion/sfx@4.0.490",
    source: "https://remotion.media/",
    license: "Remotion documents these SFX as usable without attribution; the package is MIT licensed.",
  },
  files: {
    notification: "public/audio/reel-v003/snapchat-notification.wav",
    ding: "public/audio/reel-v003/ding.wav",
    whoosh: "public/audio/reel-v003/whoosh.wav",
    pageTurn: "public/audio/reel-v003/page-turn.wav",
    click: "public/audio/reel-v003/mouse-click.wav",
  },
  officialSfxUrls: {
    notification: snapchatNotification,
    ding,
    whoosh,
    pageTurn,
    click: mouseClick,
  },
} as const;
