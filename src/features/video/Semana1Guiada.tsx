import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const INTRO_FRAMES = 2 * FPS;
const SOURCE_FRAMES = 27 * FPS;
const CTA_FRAMES = Math.round(2.5 * FPS);

const SOURCE_VIDEO = staticFile("video-assets/semana1-guiada-proxy-1080.mp4");
const LOGO = staticFile("brand/ventora-logo-premium-dark.svg");

type Step = {
  from: number;
  to: number;
  label: string;
  detail: string;
};

const STEPS: Step[] = [
  { from: 0, to: 4, label: "01 · Trabajo", detail: "Parte con la pieza que vas a cotizar." },
  { from: 4, to: 13, label: "02 · Medidas", detail: "Define medidas, material y cantidad." },
  { from: 13, to: 22, label: "03 · Precio", detail: "Elige tu línea y revisa el precio comercial." },
  { from: 22, to: 27, label: "04 · PDF", detail: "Guarda la cotización y déjala lista para enviar." },
];

const TOTAL_FRAMES = INTRO_FRAMES + SOURCE_FRAMES + CTA_FRAMES;

function fade(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function Intro() {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 15);
  const translateY = interpolate(frame, [0, 18], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 88px",
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at 80% 15%, rgba(30,136,255,.22), transparent 35%), linear-gradient(180deg, #0b0f17 0%, #050505 100%)",
        color: "#f7f9fc",
      }}
    >
      <Img src={LOGO} style={{ width: 300, height: "auto", marginBottom: 92, opacity }} />
      <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
        <div
          style={{
            color: "#1e88ff",
            fontFamily: "Arial, sans-serif",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 22,
          }}
        >
          Cotización desde el celular
        </div>
        <div
          style={{
            maxWidth: 860,
            fontFamily: "Arial, sans-serif",
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 0.98,
            letterSpacing: "-0.045em",
          }}
        >
          Del terreno
          <br />
          al PDF.
        </div>
        <div
          style={{
            maxWidth: 730,
            marginTop: 30,
            color: "#b9c3d2",
            fontFamily: "Arial, sans-serif",
            fontSize: 34,
            lineHeight: 1.25,
          }}
        >
          Arma una cotización desde el celular y déjala lista para enviar.
        </div>
      </div>
    </AbsoluteFill>
  );
}

function StepOverlay() {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const activeStep = STEPS.find((step) => seconds >= step.from && seconds < step.to) ?? STEPS[STEPS.length - 1];
  const activeIndex = STEPS.indexOf(activeStep);
  const opacity = interpolate(frame, [0, 10, 45, 55], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 150,
          padding: "36px 58px 0",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(5,5,5,.82), rgba(5,5,5,0))",
        }}
      >
        <Img src={LOGO} style={{ width: 190, height: "auto" }} />
        <div
          style={{
            padding: "12px 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.25)",
            background: "rgba(5,5,5,.48)",
            color: "#e6e8eb",
            fontFamily: "Arial, sans-serif",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Cotiza desde el celular
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          bottom: 28,
          padding: "18px 24px",
          borderRadius: 24,
          background: "rgba(5,5,5,.78)",
          border: "1px solid rgba(142,174,220,.28)",
          boxShadow: "0 16px 42px rgba(0,0,0,.28)",
          opacity,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ color: "#1e88ff", fontSize: 17, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Paso {activeIndex + 1} de {STEPS.length} · {activeStep.label}
        </div>
        <div style={{ marginTop: 6, color: "#f7f9fc", fontSize: 27, fontWeight: 700, lineHeight: 1.15 }}>
          {activeStep.detail}
        </div>
      </div>
    </>
  );
}

function CallToAction() {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 15);
  const scale = interpolate(frame, [0, 18], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
        boxSizing: "border-box",
        textAlign: "center",
        background:
          "radial-gradient(circle at 50% 20%, rgba(30,136,255,.24), transparent 34%), linear-gradient(180deg, #0b0f17 0%, #050505 100%)",
        color: "#f7f9fc",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <Img src={LOGO} style={{ width: 320, height: "auto", marginBottom: 82 }} />
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 66, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.04em" }}>
        Cotiza desde el celular.
      </div>
      <div style={{ marginTop: 24, color: "#b9c3d2", fontFamily: "Arial, sans-serif", fontSize: 34 }}>
        PDF profesional listo para enviar.
      </div>
      <div
        style={{
          marginTop: 64,
          padding: "22px 36px",
          borderRadius: 999,
          background: "#1e88ff",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
          fontSize: 34,
          fontWeight: 800,
          boxShadow: "0 14px 34px rgba(30,136,255,.32)",
        }}
      >
        Escribeme DEMO
      </div>
    </AbsoluteFill>
  );
}

export function Semana1Guiada() {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <Intro />
      </Sequence>
      <Sequence from={INTRO_FRAMES} durationInFrames={SOURCE_FRAMES}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            background:
              "radial-gradient(circle at 50% 50%, rgba(30,136,255,.12), transparent 48%), #050505",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <OffthreadVideo
            src={SOURCE_VIDEO}
            muted
            volume={0}
            style={{
              borderRadius: 30,
              display: "block",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center center",
              transform: "scale(0.85)",
              width: "100%",
            }}
          />
          <StepOverlay />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={INTRO_FRAMES + SOURCE_FRAMES} durationInFrames={CTA_FRAMES}>
        <CallToAction />
      </Sequence>
      <div style={{ position: "absolute", display: "none" }}>{frame / fps}</div>
    </AbsoluteFill>
  );
}

export const SEMANA_1_GUIADA_DURATION = TOTAL_FRAMES;
