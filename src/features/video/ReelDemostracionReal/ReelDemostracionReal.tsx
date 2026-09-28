import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { DEMO_REEL_SFX, demoReelSfxSrc } from "./audio";

const FPS = 30;
const SOURCE_SECONDS = 42.9;
export const REEL_DEMOSTRACION_REAL_DURATION = Math.round(SOURCE_SECONDS * FPS);
export const REEL_DEMOSTRACION_REAL_FPS = FPS;

const SOURCE_VIDEO = staticFile(
  "Plan semanal 20-27/tercer video semanal/video-Desmotracion.mp4",
);
const SOFT_EASE = Easing.bezier(0.16, 1, 0.3, 1);
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

type Chapter = {
  id: string;
  from: number;
  to: number;
  title: string;
  subtitle?: string;
  hero?: boolean;
  cta?: boolean;
};

const CHAPTERS: readonly Chapter[] = [
  {
    id: "hook",
    from: 0,
    to: 102,
    title: "AHORRA\nTIEMPO",
    subtitle: "De las medidas a una cotización lista",
    hero: true,
  },
  { id: "client", from: 96, to: 222, title: "CLIENTE" },
  { id: "piece-measures", from: 210, to: 603, title: "PIEZA + MEDIDAS" },
  { id: "price", from: 597, to: 780, title: "PRECIO" },
  { id: "summary-pdf", from: 774, to: 1060, title: "RESUMEN + PDF" },
  { id: "ready-to-send", from: 1056, to: 1152, title: "LISTO PARA ENVIAR" },
  {
    id: "cta",
    from: 1152,
    to: REEL_DEMOSTRACION_REAL_DURATION,
    title: "ESCRÍBEME DEMO",
    subtitle: "Te muestro una cotización real",
    cta: true,
  },
];

function ScreenRecording() {
  return (
    <OffthreadVideo
      src={SOURCE_VIDEO}
      muted
      volume={0}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

function BackgroundTreatment() {
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(30,136,255,.18), transparent 48%), linear-gradient(180deg, rgba(5,8,15,.93) 0%, rgba(5,8,15,.84) 74%, rgba(5,8,15,0) 100%)",
          height: 660,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(0deg, rgba(5,8,15,.54), rgba(5,8,15,0) 100%)",
          top: "auto",
          height: 260,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function ChapterOverlay({ chapter }: { chapter: Chapter }) {
  const frame = useCurrentFrame();
  const duration = chapter.to - chapter.from;
  const enterFrames = chapter.cta ? 15 : chapter.hero ? 12 : 10;
  const exitFrames = 8;
  const inOpacity = interpolate(frame, [0, enterFrames], [0, 1], {
    ...CLAMP,
    easing: SOFT_EASE,
  });
  const outOpacity = chapter.cta
    ? 1
    : interpolate(frame, [duration - exitFrames, duration], [1, 0], {
        ...CLAMP,
        easing: SOFT_EASE,
      });
  const opacity = Math.min(inOpacity, outOpacity);
  const translateY = interpolate(frame, [0, enterFrames], [24, 0], {
    ...CLAMP,
    easing: SOFT_EASE,
  });
  const ctaScale = chapter.cta
    ? interpolate(frame, [0, 12, 22], [0.96, 1.02, 1], {
        ...CLAMP,
        easing: [SOFT_EASE, Easing.bezier(0.33, 1, 0.68, 1)],
      })
    : 1;
  const titleSize = chapter.hero ? 142 : chapter.cta ? 78 : chapter.title.length > 14 ? 70 : 92;

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {chapter.cta ? (
        <div
          style={{
            position: "absolute",
            top: 218,
            left: 64,
            right: 64,
            minHeight: 174,
            borderRadius: 92,
            border: "2px solid rgba(151,216,255,.88)",
            background:
              "linear-gradient(125deg, rgba(5,47,100,.97), rgba(30,136,255,.98) 55%, rgba(4,87,198,.98))",
            boxShadow:
              "0 20px 70px rgba(0,0,0,.42), 0 0 54px rgba(30,136,255,.56), inset 0 1px 0 rgba(255,255,255,.3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity,
            scale: ctaScale,
            translate: `0px ${translateY}px`,
            transformOrigin: "50% 50%",
          }}
        >
          <div
            style={{
              color: "#FFFFFF",
              fontFamily: "Arial Black, Arial, sans-serif",
              fontSize: titleSize,
              fontWeight: 900,
              letterSpacing: "-0.055em",
              lineHeight: 0.98,
              textAlign: "center",
              textShadow: "0 0 16px rgba(185,229,255,.55)",
              whiteSpace: "nowrap",
            }}
          >
            {chapter.title}
          </div>
          {chapter.subtitle && (
            <div
              style={{
                color: "#D8ECFF",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "0.005em",
                marginTop: 10,
                textAlign: "center",
              }}
            >
              {chapter.subtitle}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: chapter.hero ? 90 : 128,
            left: 50,
            right: 50,
            height: chapter.hero ? 470 : 245,
            borderRadius: 36,
            border: "1px solid rgba(117,193,255,.48)",
            background:
              "linear-gradient(145deg, rgba(5,12,25,.92), rgba(9,22,42,.82) 58%, rgba(7,23,44,.72))",
            boxShadow:
              "0 24px 70px rgba(0,0,0,.42), 0 0 42px rgba(30,136,255,.18), inset 0 1px 0 rgba(255,255,255,.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity,
            translate: `0px ${translateY}px`,
            transformOrigin: "50% 50%",
            padding: chapter.hero ? "28px 32px" : "24px 30px",
          }}
        >
          {chapter.hero ? (
            <>
              <div
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Arial Black, Arial, sans-serif",
                  fontSize: titleSize,
                  fontWeight: 900,
                  letterSpacing: "-0.06em",
                  lineHeight: 0.82,
                  textAlign: "center",
                  textShadow:
                    "-2px 0 #1E88FF, 2px 0 #1E88FF, 0 -2px #1E88FF, 0 2px #1E88FF, 0 0 28px rgba(30,136,255,.9), 0 0 60px rgba(30,136,255,.48)",
                  whiteSpace: "pre-line",
                }}
              >
                {chapter.title}
              </div>
              {chapter.subtitle && (
                <div
                  style={{
                    color: "#D8ECFF",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    fontSize: 34,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    marginTop: 20,
                    textAlign: "center",
                    textShadow: "0 2px 14px rgba(0,0,0,.7)",
                  }}
                >
                  {chapter.subtitle}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                style={{
                  width: 128,
                  height: 8,
                  borderRadius: 20,
                  background: "linear-gradient(90deg, #66D4FF, #1E88FF)",
                  boxShadow: "0 0 24px rgba(30,136,255,.78)",
                  marginBottom: 26,
                }}
              />
              <div
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Arial Black, Arial, sans-serif",
                  fontSize: titleSize,
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  lineHeight: 0.92,
                  textAlign: "center",
                  textShadow:
                    "0 0 16px rgba(30,136,255,.84), 0 4px 24px rgba(0,0,0,.65)",
                  whiteSpace: "nowrap",
                }}
              >
                {chapter.title}
              </div>
            </>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
}

function SoundEffects() {
  return (
    <>
      {DEMO_REEL_SFX.map((cue) => (
        <Sequence
          key={cue.id}
          from={cue.frame}
          durationInFrames={cue.duration}
          layout="none"
          name={`audio-${cue.id}`}
        >
          <Audio
            src={demoReelSfxSrc(cue)}
            volume={(frame) =>
              cue.volume *
              interpolate(frame, [0, 1, cue.duration - 3, cue.duration], [0, 1, 1, 0], CLAMP)
            }
          />
        </Sequence>
      ))}
    </>
  );
}

export function ReelDemostracionReal() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05080F", overflow: "hidden" }}>
      <ScreenRecording />
      <BackgroundTreatment />
      {CHAPTERS.map((chapter) => (
        <Sequence
          key={chapter.id}
          from={chapter.from}
          durationInFrames={chapter.to - chapter.from}
          layout="none"
          name={`texto-${chapter.id}`}
        >
          <ChapterOverlay chapter={chapter} />
        </Sequence>
      ))}
      <SoundEffects />
    </AbsoluteFill>
  );
}
