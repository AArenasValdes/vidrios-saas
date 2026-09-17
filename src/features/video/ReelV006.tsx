import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  REEL_V006_MUSIC,
  REEL_V006_SFX_CUES,
  type ReelV006SfxCue,
} from "./reel-v006-audio";

const FPS = 30;
const TRANSITION_FRAMES = 6;
const DEFAULT_MAX_SCALE = 1.04;

type Scene = {
  id: string;
  durationInFrames: number;
  src: string;
  kind: "video" | "image";
  headline: ReadonlyArray<{ text: string; accent?: boolean }>;
  textPosition: "top" | "bottom" | "cta";
  driftX: number;
  driftY: number;
  maxScale?: number;
};

const SCENES: Scene[] = [
  {
    id: "tired-night-work",
    durationInFrames: 3 * FPS,
    src: staticFile("6to video Maestro real/video-1.mp4"),
    kind: "video",
    headline: [
      { text: "¿SIGUES HACIENDO" },
      { text: "PRESUPUESTOS DE NOCHE?", accent: true },
    ],
    textPosition: "top",
    driftX: -6,
    driftY: 4,
  },
  {
    id: "scattered-quotes",
    durationInFrames: 4 * FPS,
    src: staticFile("6to video Maestro real/video-2.mp4"),
    kind: "video",
    headline: [
      { text: "MEDIDAS AQUÍ." },
      { text: "PRECIO ALLÁ.", accent: true },
    ],
    textPosition: "top",
    driftX: 7,
    driftY: -3,
  },
  {
    id: "mobile-dashboard",
    durationInFrames: 4 * FPS,
    src: staticFile("6to video Maestro real/video-3.mp4"),
    kind: "video",
    headline: [
      { text: "COTIZA DESDE" },
      { text: "EL CELULAR.", accent: true },
    ],
    textPosition: "top",
    driftX: -5,
    driftY: 3,
  },
  {
    id: "quote-ready",
    durationInFrames: 4 * FPS,
    src: staticFile("6to video Maestro real/video-4.mp4"),
    kind: "video",
    headline: [
      { text: "REVISA EL TOTAL" },
      { text: "Y CREA EL PDF.", accent: true },
    ],
    textPosition: "top",
    driftX: 5,
    driftY: -3,
  },
  {
    id: "real-pdf",
    durationInFrames: 3 * FPS,
    src: staticFile("6to video Maestro real/IMT60ALPJOKws.png"),
    kind: "image",
    headline: [],
    textPosition: "bottom",
    driftX: 0,
    driftY: 0,
    maxScale: 1.015,
  },
  {
    id: "cta",
    durationInFrames: 3 * FPS,
    src: staticFile("6to video Maestro real/CTA-Final.png"),
    kind: "image",
    headline: [
      { text: "COTIZA. ENVÍA." },
      { text: "VENDE MEJOR.", accent: true },
    ],
    textPosition: "cta",
    driftX: 2,
    driftY: -1,
  },
];

export type ReelV006Props = {
  maxScale?: number;
  musicVolume?: number;
  sfxVolume?: number;
};

export const REEL_V006_DURATION = SCENES.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
);
export const REEL_V006_FPS = FPS;

const SCENE_STARTS = SCENES.reduce<number[]>((starts, scene, index) => {
  const previous = index === 0 ? 0 : starts[index - 1] + SCENES[index - 1].durationInFrames;
  starts.push(previous);
  return starts;
}, []);

function opacityForScene(frame: number, index: number, durationInFrames: number) {
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

function TextOverlay({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 110, mass: 0.8 },
  });
  const opacity = interpolate(frame, [0, 10, 24], [0, 1, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(entrance, [0, 1], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (scene.headline.length === 0) return null;

  const isCta = scene.textPosition === "cta";
  const top = isCta ? 1110 : 92;

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        left: 46,
        opacity,
        position: "absolute",
        right: 46,
        top,
        translate: `0px ${translateY}px`,
      }}
    >
      {scene.headline.map((line) => (
        <div
          key={line.text}
          style={{
            color: line.accent ? "#1EAEFF" : "#FFFFFF",
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: isCta ? 62 : 68,
            fontWeight: 900,
            letterSpacing: -1.8,
            lineHeight: 1.02,
            maxWidth: 1000,
            textAlign: "center",
            textShadow: "0 4px 18px rgba(0,0,0,0.62)",
          }}
        >
          {line.text}
        </div>
      ))}
      <div
        style={{
          backgroundColor: "#1E88FF",
          borderRadius: 99,
          boxShadow: "0 4px 14px rgba(30,136,255,0.45)",
          height: 7,
          marginTop: 18,
          width: isCta ? 150 : 118,
        }}
      />
      {isCta ? (
        <div
          style={{
            backgroundColor: "#1E88FF",
            borderRadius: 999,
            boxShadow: "0 12px 32px rgba(30,136,255,0.35)",
            color: "#FFFFFF",
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: 42,
            fontWeight: 900,
          marginTop: 28,
          padding: "18px 42px 20px",
          }}
        >
          Escríbeme DEMO
        </div>
      ) : null}
    </div>
  );
}

function SceneMedia({ scene, maxScale }: { scene: Scene; maxScale: number }) {
  const frame = useCurrentFrame();
  const scale = interpolate(
    frame,
    [0, scene.durationInFrames + TRANSITION_FRAMES],
    [1, scene.maxScale ?? maxScale],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const translateX = interpolate(
    frame,
    [0, scene.durationInFrames + TRANSITION_FRAMES],
    [scene.driftX, -scene.driftX],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const translateY = interpolate(
    frame,
    [0, scene.durationInFrames + TRANSITION_FRAMES],
    [scene.driftY, -scene.driftY],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const mediaStyle = {
    display: "block",
    height: "100%",
    objectFit: "contain" as const,
    scale,
    transformOrigin: "50% 50%",
    translate: `${translateX}px ${translateY}px`,
    width: "100%",
  };

  return scene.kind === "video" ? (
    <Video src={scene.src} volume={0} style={mediaStyle} />
  ) : (
    <Img src={scene.src} style={mediaStyle} />
  );
}

function SceneLayer({
  scene,
  index,
  maxScale,
}: {
  scene: Scene;
  index: number;
  maxScale: number;
}) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        opacity: opacityForScene(frame, index, scene.durationInFrames),
        overflow: "hidden",
      }}
    >
      <SceneMedia scene={scene} maxScale={maxScale} />
      <TextOverlay scene={scene} />
    </AbsoluteFill>
  );
}

function cueVolume(frame: number, cue: ReelV006SfxCue, scale: number) {
  const fadeInFrames = cue.fadeInFrames ?? 0;
  const fadeOutFrames = cue.fadeOutFrames ?? 0;
  const fadeOutStart = cue.durationInFrames - fadeOutFrames;

  return cue.volume * scale * interpolate(
    frame,
    [0, fadeInFrames, fadeOutStart, cue.durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

function MusicTrack({ volume }: { volume: number }) {
  return (
    <Sequence durationInFrames={REEL_V006_DURATION} from={0} layout="none">
      <Audio
        src={REEL_V006_MUSIC}
        volume={(frame) => volume * interpolate(
          frame,
          [0, 30, REEL_V006_DURATION - 48, REEL_V006_DURATION],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )}
      />
    </Sequence>
  );
}

function SfxTrack({ volume }: { volume: number }) {
  return (
    <>
      {REEL_V006_SFX_CUES.map((cue) => (
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

export function ReelV006({
  maxScale = DEFAULT_MAX_SCALE,
  musicVolume = 1.15,
  sfxVolume = 1.7,
}: ReelV006Props) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      {SCENES.map((scene, index) => {
        const start = SCENE_STARTS[index];
        const overlap = index === 0 ? 0 : TRANSITION_FRAMES;
        const duration = scene.durationInFrames + (index === 0 ? 0 : TRANSITION_FRAMES);

        return (
          <Sequence
            key={scene.id}
            durationInFrames={duration}
            from={start - overlap}
            layout="none"
            name={scene.id}
          >
            <SceneLayer scene={scene} index={index} maxScale={maxScale} />
          </Sequence>
        );
      })}
      <MusicTrack volume={musicVolume} />
      <SfxTrack volume={sfxVolume} />
    </AbsoluteFill>
  );
}
