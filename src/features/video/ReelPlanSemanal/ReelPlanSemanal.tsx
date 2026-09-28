import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  REEL_PLAN_SEMANAL_AUDIO_CUES,
} from "./audio";
import { Scene01AfterWork } from "./Scene01AfterWork";
import { Scene02Measurements } from "./Scene02Measurements";
import { Scene03Messages } from "./Scene03Messages";
import { Scene04Pending } from "./Scene04Pending";
import { Scene05VentoraCta } from "./Scene05VentoraCta";

const FPS = 30;
const TRANSITION_FRAMES = 10;

const SCENES = [
  { id: "after-work", component: Scene01AfterWork, visibleFrames: 120 },
  { id: "measurements", component: Scene02Measurements, visibleFrames: 90 },
  { id: "messages", component: Scene03Messages, visibleFrames: 90 },
  { id: "pending", component: Scene04Pending, visibleFrames: 120 },
  { id: "ventora-cta", component: Scene05VentoraCta, visibleFrames: 180 },
] as const;

export const REEL_PLAN_SEMANAL_DURATION = SCENES.reduce(
  (total, scene) => total + scene.visibleFrames,
  0,
);
export const REEL_PLAN_SEMANAL_FPS = FPS;

const SCENE_STARTS = SCENES.map((_, index) =>
  SCENES.slice(0, index).reduce(
    (start, scene) => start + scene.visibleFrames,
    0,
  ),
);

function sceneOpacity(frame: number, index: number, sequenceDuration: number) {
  if (index === 0) {
    return interpolate(
      frame,
      [0, TRANSITION_FRAMES, sequenceDuration - TRANSITION_FRAMES, sequenceDuration],
      [0, 1, 1, 0],
      {
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
  }

  if (index === SCENES.length - 1) {
    return interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return interpolate(
    frame,
    [0, TRANSITION_FRAMES, sequenceDuration - TRANSITION_FRAMES, sequenceDuration],
    [0, 1, 1, 0],
    {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
}

function SceneOpacity({
  children,
  index,
  sequenceDuration,
}: {
  children: React.ReactNode;
  index: number;
  sequenceDuration: number;
}) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, index, sequenceDuration) }}>
      {children}
    </AbsoluteFill>
  );
}

function SoundEffects() {
  return (
    <>
      {REEL_PLAN_SEMANAL_AUDIO_CUES.map((cue) => (
        <Sequence
          key={cue.id}
          durationInFrames={cue.durationInFrames}
          from={cue.fromFrame}
          layout="none"
          name={`audio-${cue.id}`}
        >
          <Audio
            src={cue.src}
            volume={(frame) =>
              cue.volume *
              interpolate(
                frame,
                [0, cue.fadeInFrames, cue.durationInFrames - cue.fadeOutFrames, cue.durationInFrames],
                [0, 1, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )
            }
          />
        </Sequence>
      ))}
    </>
  );
}

export function ReelPlanSemanal() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0F17", overflow: "hidden" }}>
      {SCENES.map((scene, index) => {
        const sequenceDuration =
          scene.visibleFrames + (index < SCENES.length - 1 ? TRANSITION_FRAMES : 0);
        const Scene = scene.component;

        return (
          <Sequence
            key={scene.id}
            durationInFrames={sequenceDuration}
            from={SCENE_STARTS[index]}
            layout="none"
            name={scene.id}
          >
            <SceneOpacity index={index} sequenceDuration={sequenceDuration}>
              <Scene />
            </SceneOpacity>
          </Sequence>
        );
      })}
      <SoundEffects />
    </AbsoluteFill>
  );
}
