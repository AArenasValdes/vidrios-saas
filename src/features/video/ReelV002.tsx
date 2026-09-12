import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const FPS = 30;

const PAIN_FRAMES = 5 * FPS;
const DISPERSION_FRAMES = 3 * FPS;
const FLOW_SOLUTION_FRAMES = 6 * FPS;
const PDF_FRAMES = 9 * FPS;
const CTA_FRAMES = 5 * FPS;

const FLOW_PRIMER = staticFile("video-assets/reel-v002-primer.mp4");
const FLOW_SEGUNDO = staticFile("video-assets/reel-v002-segundo.mp4");
const FLOW_TERCER = staticFile("video-assets/reel-v002-tercer.mp4");
const FLOW_CUARTO = staticFile("video-assets/reel-v002-cuarto-ambient.mp4");
const LOGO = staticFile("brand/ventora-logo-premium-dark.svg");
const REAL_QUOTE_SCREENSHOT = staticFile("video-assets/reel-v002-cotizacion-real.png");
const CTA_IMAGE = staticFile("video-assets/reel-v002-cta-whatsapp.png");

export type ReelCaption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};

// JSON-compatible caption cues. No generated text is used for numeric data.
export const REEL_V002_CAPTIONS: ReelCaption[] = [
  { text: "PDF claro, listo para enviar.", startMs: 14000, endMs: 23000, timestampMs: null, confidence: null },
  { text: "Escríbeme DEMO", startMs: 23000, endMs: 28000, timestampMs: null, confidence: null },
];

function VideoSegment({
  src,
  trimBeforeFrames = 0,
  filter = "none",
}: {
  src: string;
  trimBeforeFrames?: number;
  filter?: string;
}) {
  return (
    <OffthreadVideo
      src={src}
      muted
      volume={0}
      trimBefore={trimBeforeFrames}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        filter,
      }}
    />
  );
}

function PdfResultScene() {
  const frame = useCurrentFrame();
  const phoneScale = interpolate(frame, [0, PDF_FRAMES - 1], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#090d14", overflow: "hidden" }}>
      <OffthreadVideo
        src={FLOW_CUARTO}
        muted
        volume={0}
        style={{
          position: "absolute",
          inset: -30,
          width: "calc(100% + 60px)",
          height: "calc(100% + 60px)",
          objectFit: "cover",
          filter: "blur(15px) brightness(.48) saturate(.65)",
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,5,5,.16), rgba(5,5,5,.52))" }} />
      <div
        style={{
          position: "absolute",
          left: 205,
          top: 220,
          width: 670,
          height: 1360,
          padding: 16,
          boxSizing: "border-box",
          borderRadius: 86,
          background: "linear-gradient(145deg, #303741 0%, #080a0e 26%, #050608 100%)",
          boxShadow: "0 34px 70px rgba(0,0,0,.56), 0 0 0 2px rgba(255,255,255,.12)",
          scale: phoneScale,
          transformOrigin: "50% 50%",
        }}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 72, backgroundColor: "#f3f6f9" }}>
          <Img src={REAL_QUOTE_SCREENSHOT} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CallToAction() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scale = interpolate(frame, [0, CTA_FRAMES - 1], [1, 1.015], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        opacity,
        overflow: "hidden",
      }}
    >
      <Img
        src={CTA_IMAGE}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          scale,
          transformOrigin: "50% 50%",
        }}
      />
    </AbsoluteFill>
  );
}

export function ReelV002() {
  const frame = useCurrentFrame();
  const dispersionStart = PAIN_FRAMES;
  const flowSolutionStart = dispersionStart + DISPERSION_FRAMES;
  const pdfStart = flowSolutionStart + FLOW_SOLUTION_FRAMES;
  const ctaStart = pdfStart + PDF_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      <Sequence from={0} durationInFrames={PAIN_FRAMES}>
        <VideoSegment src={FLOW_PRIMER} filter="brightness(.9) saturate(.88)" />
      </Sequence>
      <Sequence from={dispersionStart} durationInFrames={DISPERSION_FRAMES}>
        <VideoSegment src={FLOW_SEGUNDO} filter="brightness(.82) saturate(.86)" />
      </Sequence>
      <Sequence from={flowSolutionStart} durationInFrames={FLOW_SOLUTION_FRAMES}>
        <VideoSegment src={FLOW_TERCER} filter="brightness(.9) saturate(.9)" />
      </Sequence>
      <Sequence from={pdfStart} durationInFrames={PDF_FRAMES}>
        <PdfResultScene />
      </Sequence>
      <Sequence from={ctaStart} durationInFrames={CTA_FRAMES}>
        <CallToAction />
      </Sequence>
      <div style={{ position: "absolute", display: "none" }}>{frame}</div>
    </AbsoluteFill>
  );
}

function PosterPhone() {
  return (
    <div
      style={{
        width: 650,
        height: 1410,
        padding: 16,
        boxSizing: "border-box",
        borderRadius: 86,
        background: "linear-gradient(145deg, #303741 0%, #080a0e 26%, #050608 100%)",
        boxShadow: "0 40px 80px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.14)",
      }}
    >
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 72, backgroundColor: "#f3f6f9" }}>
        <Img src={REAL_QUOTE_SCREENSHOT} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    </div>
  );
}

export function ReelV002Portada() {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: "radial-gradient(circle at 50% 15%, rgba(30,136,255,.25), transparent 34%), linear-gradient(180deg, #0b0f17 0%, #050505 100%)",
        color: "#f7f9fc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Img src={LOGO} style={{ width: 350, height: "auto", marginTop: 116 }} />
      <div style={{ marginTop: 86, maxWidth: 850, fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.04em", textAlign: "center" }}>
        Cotiza desde el celular.
      </div>
      <div style={{ marginTop: 24, color: "#b9c3d2", fontSize: 36, textAlign: "center" }}>
        PDF profesional listo para enviar.
      </div>
      <div style={{ marginTop: 70 }}>
        <PosterPhone />
      </div>
      <div style={{ marginTop: 56, padding: "22px 38px", borderRadius: 999, background: "#1e88ff", fontSize: 38, fontWeight: 800 }}>
        Escríbeme DEMO
      </div>
    </AbsoluteFill>
  );
}

export const REEL_V002_DURATION = PAIN_FRAMES + DISPERSION_FRAMES + FLOW_SOLUTION_FRAMES + PDF_FRAMES + CTA_FRAMES;
export const REEL_V002_FPS = FPS;
export const REEL_V002_PORTADA_FPS = 1;
