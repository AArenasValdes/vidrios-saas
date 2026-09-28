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
import { REEL_PRECIO_LINEA_CUES, reelPrecioLineaAudio } from "./audio";

const FPS = 30;
const TRANSITION_FRAMES = 12;
const END_HOLD_FRAMES = 30;
const SCENES = [
  { id: "tus-precios", image: "secuencia1.png", frames: 120 },
  { id: "configura-linea", image: "secuencia2.png", frames: 120 },
  { id: "precio-y-minimo", image: "secuencia3.png", frames: 135 },
  { id: "cotiza-desde-celular", image: "secuencia4.png", frames: 165 },
] as const;

const SCENE_STARTS = SCENES.map((_, index) =>
  SCENES.slice(0, index).reduce((start, scene) => start + scene.frames, 0),
);

export const REEL_PRECIO_LINEA_DURATION = SCENES.reduce(
  (total, scene) => total + scene.frames,
  0,
);
export const REEL_PRECIO_LINEA_FPS = FPS;

const SMOOTH = Easing.bezier(0.4, 0, 0.2, 1);
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const CAMERA = [
  { frames: [0, 120], scale: [1, 1.022], x: [0, 0], y: [0, -5] },
  { frames: [0, 120], scale: [1.012, 1.03], x: [8, -7], y: [1, -5] },
  { frames: [0, 105, 135], scale: [1.005, 1.028, 1.028], x: [0, 0, 0], y: [0, -5, -5] },
  {
    frames: [0, 120, SCENES[3].frames - END_HOLD_FRAMES, SCENES[3].frames],
    scale: [1.008, 1.022, 1.024, 1.024],
    x: [0, 0, 0, 0],
    y: [4, -4, -10, -10],
  },
] as const;

function SceneImage({ sceneIndex }: { sceneIndex: number }) {
  const frame = useCurrentFrame();
  const scene = SCENES[sceneIndex];
  const camera = CAMERA[sceneIndex];

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#F5F8FF" }}>
      <Img
        src={staticFile(`Plan semanal 20-27/dia4/${scene.image}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          scale: interpolate(frame, camera.frames, camera.scale, {
            ...CLAMP,
            easing: SMOOTH,
          }),
          translate: `${interpolate(frame, camera.frames, camera.x, {
            ...CLAMP,
            easing: SMOOTH,
          })}px ${interpolate(frame, camera.frames, camera.y, {
            ...CLAMP,
            easing: SMOOTH,
          })}px`,
          transformOrigin: "50% 50%",
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
  const sceneFrames = SCENES[sceneIndex].frames;

  const opacity = isFirst
    ? interpolate(frame, [0, 5, sceneFrames, sequenceDuration], [0, 1, 1, 0], {
        ...CLAMP,
        easing: SMOOTH,
      })
    : isLast
      ? interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], { ...CLAMP, easing: SMOOTH })
      : interpolate(
          frame,
          [0, TRANSITION_FRAMES, sceneFrames, sequenceDuration],
          [0, 1, 1, 0],
          { ...CLAMP, easing: SMOOTH },
        );
  const swipeX = isFirst
    ? interpolate(frame, [0, 5, sceneFrames, sequenceDuration], [0, 0, 0, -22], CLAMP)
    : isLast
      ? interpolate(frame, [0, TRANSITION_FRAMES], [22, 0], { ...CLAMP, easing: SMOOTH })
      : interpolate(
          frame,
          [0, TRANSITION_FRAMES, sceneFrames, sequenceDuration],
          [22, 0, 0, -22],
          CLAMP,
        );

  return (
    <AbsoluteFill style={{ opacity, translate: `${swipeX}px 0px` }}>
      <SceneImage sceneIndex={sceneIndex} />
    </AbsoluteFill>
  );
}

function SoundEffects() {
  return (
    <>
      {REEL_PRECIO_LINEA_CUES.map((cue) => (
        <Sequence
          key={cue.id}
          from={cue.from}
          durationInFrames={cue.frames}
          layout="none"
          name={`sfx-${cue.id}`}
        >
          <Audio
            src={reelPrecioLineaAudio(cue)}
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

export function ReelPrecioLinea() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#F5F8FF", overflow: "hidden" }}>
      {SCENES.map((scene, index) => {
        const sequenceDuration = scene.frames + (index < SCENES.length - 1 ? TRANSITION_FRAMES : 0);

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
