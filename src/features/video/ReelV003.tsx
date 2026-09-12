import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import {
  REEL_V003_MUSIC,
  REEL_V003_SFX_CUES,
  type ReelV003SfxCue,
} from "./reel-v003-audio";

const FPS = 30;
const TRANSITION_FRAMES = 8;
const DEFAULT_MAX_SCALE = 1.02;

const LOGO = staticFile("brand/ventora-logo-premium-dark.svg");

const SCENES = [
  {
    id: "buried-quote",
    src: staticFile("Video 3 Ventora-Semana1/Secuencia1.png"),
    durationInFrames: 3 * FPS,
    subtitle: "Tu cliente no te dejó en visto.",
  },
  {
    id: "scattered-information",
    src: staticFile("Video 3 Ventora-Semana1/Secuencia2.png"),
    durationInFrames: 4 * FPS,
    subtitle: "La información quedó repartida.",
  },
  {
    id: "mobile-dashboard",
    src: staticFile("Video 3 Ventora-Semana1/secuencia3.png"),
    durationInFrames: 11 * FPS,
    subtitle: "Cotiza desde el celular.",
  },
  {
    id: "quote-summary",
    src: staticFile("Video 3 Ventora-Semana1/secuencia4.png"),
    durationInFrames: Math.round(2.5 * FPS),
    subtitle: "Revisa el total antes de crear el PDF.",
  },
  {
    id: "real-pdf",
    src: staticFile("Video 3 Ventora-Semana1/secuencia5.png"),
    durationInFrames: Math.round(3.5 * FPS),
    subtitle: "PDF profesional listo para enviar.",
  },
  {
    id: "call-to-action",
    src: staticFile("Video 3 Ventora-Semana1/secuencia6.png"),
    durationInFrames: 6 * FPS,
    subtitle: "Escríbeme DEMO.",
  },
] as const;

export type ReelV003Caption = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export type ReelV003Props = {
  showSubtitles?: boolean;
  maxScale?: number;
  captions?: ReelV003Caption[];
  musicVolume?: number;
  sfxVolume?: number;
};

export const REEL_V003_DURATION = SCENES.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
);
export const REEL_V003_FPS = FPS;

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

function opacityForScene(frame: number, index: number, durationInFrames: number) {
  const fadeInFrames = index === 0 ? 12 : TRANSITION_FRAMES;
  const fadeOutFrames = index === SCENES.length - 1 ? 0 : TRANSITION_FRAMES;

  if (fadeOutFrames > 0) {
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

  return interpolate(frame, [0, fadeInFrames], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
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
  const durationInFrames = scene.durationInFrames;
  const scale = interpolate(
    frame,
    [0, durationInFrames + (index === SCENES.length - 1 ? 0 : TRANSITION_FRAMES)],
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
        opacity: opacityForScene(frame, index, durationInFrames),
        overflow: "hidden",
      }}
    >
      <Img
        src={scene.src}
        style={{
          display: "block",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${scale})`,
          transformOrigin: "50% 50%",
          width: "100%",
        }}
      />
    </AbsoluteFill>
  );
}

function SubtitleLayer({ captions }: { captions: ReelV003Caption[] }) {
  const frame = useCurrentFrame();
  const caption = captions.find(
    (cue) => frame >= cue.startFrame && frame < cue.endFrame,
  );

  if (!caption) {
    return null;
  }

  return (
    <div
      style={{
        alignItems: "center",
        background: "rgba(5, 5, 5, 0.78)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        borderRadius: 18,
        bottom: 84,
        color: "#ffffff",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        fontSize: 38,
        fontWeight: 700,
        justifyContent: "center",
        left: 86,
        lineHeight: 1.12,
        maxWidth: 908,
        minHeight: 72,
        padding: "16px 24px",
        position: "absolute",
        right: 86,
        textAlign: "center",
        textShadow: "0 2px 12px rgba(0,0,0,.45)",
      }}
    >
      {caption.text}
    </div>
  );
}

function BrandWatermark() {
  return (
    <div
      style={{
        alignItems: "center",
        background: "rgba(5, 5, 5, 0.46)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: 12,
        bottom: 54,
        display: "flex",
        padding: "8px 12px",
        position: "absolute",
        right: 54,
      }}
    >
      <Img src={LOGO} style={{ display: "block", height: "auto", width: 142 }} />
    </div>
  );
}

function cueVolume(frame: number, cue: ReelV003SfxCue, sfxVolume: number) {
  const fadeInFrames = cue.fadeInFrames ?? 0;
  const fadeOutFrames = cue.fadeOutFrames ?? 0;
  const fadeOutStart = cue.durationInFrames - fadeOutFrames;

  return (
    cue.volume *
    sfxVolume *
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
    <Sequence durationInFrames={REEL_V003_DURATION} from={0} layout="none">
      <Audio
        src={REEL_V003_MUSIC}
        volume={(frame) =>
          volume *
          interpolate(frame, [0, 36, 850, REEL_V003_DURATION], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </Sequence>
  );
}

function SfxTrack({ volume }: { volume: number }) {
  return (
    <>
      {REEL_V003_SFX_CUES.map((cue) => (
        <Sequence
          key={cue.id}
          durationInFrames={cue.durationInFrames}
          from={cue.fromFrame}
          layout="none"
          name={`audio-${cue.id}`}
        >
          <Audio src={cue.src} volume={(frame) => cueVolume(frame, cue, volume)} />
        </Sequence>
      ))}
    </>
  );
}

export function ReelV003({
  captions,
  maxScale = DEFAULT_MAX_SCALE,
  musicVolume = 1.8,
  showSubtitles = true,
  sfxVolume = 2.2,
}: ReelV003Props) {
  const defaultCaptions: ReelV003Caption[] = [];
  let cursor = 0;

  for (const scene of SCENES) {
    defaultCaptions.push({
      text: scene.subtitle,
      startFrame: cursor,
      endFrame: cursor + scene.durationInFrames,
    });
    cursor += scene.durationInFrames;
  }

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
      {showSubtitles ? (
        <SubtitleLayer captions={captions ?? defaultCaptions} />
      ) : null}
      <MusicTrack volume={musicVolume} />
      <SfxTrack volume={sfxVolume} />
      <BrandWatermark />
    </AbsoluteFill>
  );
}
