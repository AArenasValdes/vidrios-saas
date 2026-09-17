import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  REEL_V005_MUSIC,
  REEL_V005_SFX_CUES,
  type ReelV005SfxCue,
} from "./reel-v005-audio";

const FPS = 30;
const SCENE_FRAMES = 4 * FPS + 10;
const TRANSITION_FRAMES = 10;
const DEFAULT_MAX_SCALE = 1.05;

const SCENES = [
  {
    id: "availability",
    src: staticFile("5to video/secuencia-1.png"),
    driftX: -10,
    driftY: 5,
  },
  {
    id: "share-link",
    src: staticFile("5to video/secuencia-2.png"),
    driftX: 9,
    driftY: -5,
  },
  {
    id: "request-form",
    src: staticFile("5to video/secuencia-3.png"),
    driftX: -8,
    driftY: 4,
  },
  {
    id: "requests-inbox",
    src: staticFile("5to video/secuencia-4.png"),
    driftX: 8,
    driftY: -4,
  },
  {
    id: "follow-up",
    src: staticFile("5to video/secuencia-5.png"),
    driftX: -7,
    driftY: 3,
  },
  {
    id: "cta",
    src: staticFile("5to video/secuencia-6.png"),
    driftX: 5,
    driftY: -3,
  },
] as const;

export type ReelV005Props = {
  maxScale?: number;
  musicVolume?: number;
  sfxVolume?: number;
};

export const REEL_V005_DURATION = SCENES.length * SCENE_FRAMES;
export const REEL_V005_FPS = FPS;

const SCENE_STARTS = SCENES.map((_, index) => index * SCENE_FRAMES);

function sceneOpacity(frame: number, index: number) {
  const fadeInFrames = index === 0 ? 12 : TRANSITION_FRAMES;
  const fadeOutFrames = index === SCENES.length - 1 ? 0 : TRANSITION_FRAMES;

  if (fadeOutFrames === 0) {
    return interpolate(frame, [0, fadeInFrames], [0, 1], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return interpolate(
    frame,
    [0, fadeInFrames, SCENE_FRAMES, SCENE_FRAMES + fadeOutFrames],
    [0, 1, 1, 0],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
}

function SceneImage({
  scene,
  index,
  maxScale,
}: {
  scene: (typeof SCENES)[number];
  index: number;
  maxScale: number;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(
    frame,
    [0, SCENE_FRAMES + TRANSITION_FRAMES],
    [1, maxScale],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const translateX = interpolate(
    frame,
    [0, SCENE_FRAMES + TRANSITION_FRAMES],
    [scene.driftX, -scene.driftX],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const translateY = interpolate(
    frame,
    [0, SCENE_FRAMES + TRANSITION_FRAMES],
    [scene.driftY, -scene.driftY],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const introBlur = interpolate(frame, [0, TRANSITION_FRAMES], [4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sweepProgress = interpolate(frame, [0, TRANSITION_FRAMES], [-1.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        opacity: sceneOpacity(frame, index),
        overflow: "hidden",
      }}
    >
      <Img
        src={scene.src}
        style={{
          display: "block",
          filter: `blur(${introBlur}px) brightness(${interpolate(
            frame,
            [0, TRANSITION_FRAMES],
            [0.92, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )})`,
          height: "100%",
          objectFit: "contain",
          scale,
          transformOrigin: "50% 50%",
          translate: `${translateX}px ${translateY}px`,
          width: "100%",
        }}
      />
      <div
        style={{
          background:
            "linear-gradient(105deg, transparent 35%, rgba(30, 136, 255, 0.3) 49%, rgba(255,255,255,0.12) 51%, transparent 65%)",
          filter: "blur(14px)",
          inset: -260,
          opacity: interpolate(frame, [0, 4, TRANSITION_FRAMES], [0, 0.9, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          pointerEvents: "none",
          position: "absolute",
          translate: `${sweepProgress * 1200}px 0px`,
        }}
      />
    </AbsoluteFill>
  );
}

function getCueVolume(frame: number, cue: ReelV005SfxCue, scale: number) {
  const fadeInFrames = cue.fadeInFrames ?? 0;
  const fadeOutFrames = cue.fadeOutFrames ?? 0;
  const fadeOutStart = cue.durationInFrames - fadeOutFrames;

  return (
    cue.volume *
    scale *
    interpolate(
      frame,
      [0, fadeInFrames, fadeOutStart, cue.durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    )
  );
}

function MusicTrack({ volume }: { volume: number }) {
  return (
    <Sequence durationInFrames={REEL_V005_DURATION} from={0} layout="none">
      <Audio
        src={REEL_V005_MUSIC}
        volume={(frame) =>
          volume *
          interpolate(
            frame,
            [0, 30, REEL_V005_DURATION - 48, REEL_V005_DURATION],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
      />
    </Sequence>
  );
}

function SfxTrack({ volume }: { volume: number }) {
  return (
    <>
      {REEL_V005_SFX_CUES.map((cue) => (
        <Sequence
          key={cue.id}
          durationInFrames={cue.durationInFrames}
          from={cue.fromFrame}
          layout="none"
          name={`audio-${cue.id}`}
        >
          <Audio
            src={cue.src}
            volume={(frame) => getCueVolume(frame, cue, volume)}
          />
        </Sequence>
      ))}
    </>
  );
}

export function ReelV005({
  maxScale = DEFAULT_MAX_SCALE,
  musicVolume = 1.35,
  sfxVolume = 1.8,
}: ReelV005Props) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      {SCENES.map((scene, index) => {
        const start = SCENE_STARTS[index];
        const overlap = index === 0 ? 0 : TRANSITION_FRAMES;
        const duration =
          SCENE_FRAMES + (index === SCENES.length - 1 ? 0 : TRANSITION_FRAMES);

        return (
          <Sequence
            key={scene.id}
            durationInFrames={duration}
            from={start - overlap}
            layout="none"
            name={scene.id}
          >
            <SceneImage scene={scene} index={index} maxScale={maxScale} />
          </Sequence>
        );
      })}
      <MusicTrack volume={musicVolume} />
      <SfxTrack volume={sfxVolume} />
    </AbsoluteFill>
  );
}
