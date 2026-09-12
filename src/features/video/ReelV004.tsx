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
  REEL_V004_MUSIC,
  REEL_V004_SFX_CUES,
  type ReelV004SfxCue,
} from "./reel-v004-audio";

const FPS = 30;
const TRANSITION_FRAMES = 8;
const DEFAULT_MAX_SCALE = 1.02;

const SCENES = [
  {
    id: "price-question",
    src: staticFile("4to Video/Secuencia-1.png"),
    durationInFrames: 3 * FPS,
  },
  {
    id: "price-reveal",
    src: staticFile("4to Video/Secuencia-2.png"),
    durationInFrames: 3 * FPS,
  },
  {
    id: "mobile-quote",
    src: staticFile("4to Video/Secuencia-3.png"),
    durationInFrames: 4 * FPS,
  },
  {
    id: "professional-pdf",
    src: staticFile("4to Video/Secuencia-4.png"),
    durationInFrames: 4 * FPS,
  },
  {
    id: "organized-work",
    src: staticFile("4to Video/Secuencia-5.png"),
    durationInFrames: 3 * FPS,
  },
  {
    id: "price-cta",
    src: staticFile("4to Video/Secuencia-6.png"),
    durationInFrames: 3 * FPS,
  },
] as const;

export type ReelV004Props = {
  maxScale?: number;
  musicVolume?: number;
  sfxVolume?: number;
};

export const REEL_V004_DURATION = SCENES.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
);
export const REEL_V004_FPS = FPS;

function sceneStarts() {
  const starts: number[] = [];
  let cursor = 0;

  for (const scene of SCENES) {
    starts.push(cursor);
    cursor += scene.durationInFrames;
  }

  return starts;
}

const SCENE_STARTS = sceneStarts();

function sceneOpacity(frame: number, index: number, durationInFrames: number) {
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
    [0, fadeInFrames, durationInFrames, durationInFrames + fadeOutFrames],
    [0, 1, 1, 0],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
}

function StillScene({
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
    [0, scene.durationInFrames + TRANSITION_FRAMES],
    [1, maxScale],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        opacity: sceneOpacity(frame, index, scene.durationInFrames),
        overflow: "hidden",
      }}
    >
      <Img
        src={scene.src}
        style={{
          display: "block",
          height: "100%",
          objectFit: "contain",
          scale,
          transformOrigin: "50% 50%",
          width: "100%",
        }}
      />
    </AbsoluteFill>
  );
}

function getCueVolume(frame: number, cue: ReelV004SfxCue, scale: number) {
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
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    )
  );
}

function MusicTrack({ volume }: { volume: number }) {
  return (
    <Sequence durationInFrames={REEL_V004_DURATION} from={0} layout="none">
      <Audio
        src={REEL_V004_MUSIC}
        volume={(frame) =>
          volume *
          interpolate(
            frame,
            [0, 30, REEL_V004_DURATION - 48, REEL_V004_DURATION],
            [0, 1, 1, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )
        }
      />
    </Sequence>
  );
}

function SfxTrack({ volume }: { volume: number }) {
  return (
    <>
      {REEL_V004_SFX_CUES.map((cue) => (
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

export function ReelV004({
  maxScale = DEFAULT_MAX_SCALE,
  musicVolume = 1.8,
  sfxVolume = 2.2,
}: ReelV004Props) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      {SCENES.map((scene, index) => {
        const start = SCENE_STARTS[index];
        const overlap = index === 0 ? 0 : TRANSITION_FRAMES;
        const duration =
          scene.durationInFrames +
          (index === SCENES.length - 1 ? 0 : TRANSITION_FRAMES);

        return (
          <Sequence
            key={scene.id}
            durationInFrames={duration}
            from={start - overlap}
            layout="none"
            name={scene.id}
          >
            <StillScene scene={scene} index={index} maxScale={maxScale} />
          </Sequence>
        );
      })}
      <MusicTrack volume={musicVolume} />
      <SfxTrack volume={sfxVolume} />
    </AbsoluteFill>
  );
}
