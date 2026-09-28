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
  REEL_PLAN_SEMANAL_02_CUES,
  reelPlanSemanal02Audio,
} from "./audio";

const FPS = 30;
const TRANSITION_FRAMES = 12;
const HOLD_FRAMES = 24;
const SCENES = [
  { id: "hook", image: "secuencia1.png", frames: 120 },
  { id: "buscar-precio", image: "secuencia2.png", frames: 120 },
  { id: "repetir-calculos", image: "secuencia3.png", frames: 120 },
  { id: "esperar-computador", image: "secuencia4.png", frames: 120 },
  { id: "cta", image: "secuencia5.png", frames: 150 },
] as const;

const SCENE_STARTS = SCENES.map((_, index) =>
  SCENES.slice(0, index).reduce((start, scene) => start + scene.frames, 0),
);

export const REEL_PLAN_SEMANAL_02_DURATION = SCENES.reduce(
  (total, scene) => total + scene.frames,
  0,
);
export const REEL_PLAN_SEMANAL_02_FPS = FPS;

const SMOOTH = Easing.bezier(0.4, 0, 0.2, 1);
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

function CameraMotion({ sceneIndex, duration }: { sceneIndex: number; duration: number }) {
  const frame = useCurrentFrame();
  const camera = [
    {
      frames: [0, 14, 35, 42, duration],
      scale: [1.03, 1, 1.012, 1.025, 1.012],
      x: [0, 0, 0, 0, 3],
      y: [0, 0, -4, -4, -8],
      ease: true,
    },
    {
      frames: [0, duration],
      scale: [1, 1.034],
      x: [14, -18],
      y: [4, -12],
      ease: true,
    },
    {
      frames: [0, 50, 69, 91, duration],
      scale: [1, 1.02, 1.04, 1.04, 1.018],
      x: [0, -5, -18, -18, -8],
      y: [0, -4, -12, -12, -3],
      ease: true,
    },
    {
      frames: [0, duration],
      scale: [1, 1.04],
      x: [8, -16],
      y: [0, -8],
      ease: true,
    },
    {
      frames: [0, 18, 126, HOLD_FRAMES + duration - HOLD_FRAMES],
      scale: [1.025, 1, 1.022, 1.022],
      x: [10, 10, -16, -16],
      y: [0, 0, -8, -8],
      ease: true,
    },
  ][sceneIndex];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(`Plan semanal 20-27/segundo video semanal/${SCENES[sceneIndex].image}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          scale: interpolate(frame, camera.frames, camera.scale, {
            ...CLAMP,
            easing: SMOOTH,
          }),
          translate: `${interpolate(frame, camera.frames, camera.x, CLAMP)}px ${interpolate(
            frame,
            camera.frames,
            camera.y,
            CLAMP,
          )}px`,
          transformOrigin: sceneIndex === 0 ? "50% 18%" : "50% 50%",
        }}
      />
    </AbsoluteFill>
  );
}

function TransitionedScene({
  sceneIndex,
  sequenceDuration,
}: {
  sceneIndex: number;
  sequenceDuration: number;
}) {
  const frame = useCurrentFrame();
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === SCENES.length - 1;
  const opacity = isFirst
    ? interpolate(frame, [0, 5, SCENES[sceneIndex].frames, sequenceDuration], [0, 1, 1, 0], {
        ...CLAMP,
        easing: SMOOTH,
      })
    : isLast
      ? interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], { ...CLAMP, easing: SMOOTH })
      : interpolate(
          frame,
          [0, TRANSITION_FRAMES, SCENES[sceneIndex].frames, sequenceDuration],
          [0, 1, 1, 0],
          { ...CLAMP, easing: SMOOTH },
        );
  const swipeX = isFirst
    ? interpolate(frame, [0, 5, SCENES[sceneIndex].frames, sequenceDuration], [0, 0, 0, -34], CLAMP)
    : isLast
      ? interpolate(frame, [0, TRANSITION_FRAMES], [36, 0], { ...CLAMP, easing: SMOOTH })
      : interpolate(
          frame,
          [0, TRANSITION_FRAMES, SCENES[sceneIndex].frames, sequenceDuration],
          [36, 0, 0, -34],
          { ...CLAMP, easing: SMOOTH },
        );

  return (
    <AbsoluteFill style={{ opacity, translate: `${swipeX}px 0px` }}>
      <CameraMotion sceneIndex={sceneIndex} duration={SCENES[sceneIndex].frames} />
    </AbsoluteFill>
  );
}

function SoundEffects() {
  return (
    <>
      {REEL_PLAN_SEMANAL_02_CUES.map((cue) => (
        <Sequence
          key={cue.id}
          from={cue.from}
          durationInFrames={cue.frames}
          layout="none"
          name={`audio-${cue.id}`}
        >
          <Audio
            src={reelPlanSemanal02Audio(cue)}
            volume={(frame) =>
              cue.volume *
              interpolate(frame, [0, 1, cue.frames - 3, cue.frames], [0, 1, 1, 0], CLAMP)
            }
          />
        </Sequence>
      ))}
    </>
  );
}

export function ReelPlanSemanal02() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0F17", overflow: "hidden" }}>
      {SCENES.map((scene, index) => {
        const sequenceDuration =
          scene.frames + (index < SCENES.length - 1 ? TRANSITION_FRAMES : 0);

        return (
          <Sequence
            key={scene.id}
            from={SCENE_STARTS[index]}
            durationInFrames={sequenceDuration}
            layout="none"
            name={scene.id}
          >
            <TransitionedScene sceneIndex={index} sequenceDuration={sequenceDuration} />
          </Sequence>
        );
      })}
      <SoundEffects />
    </AbsoluteFill>
  );
}
