import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BrandBackdrop, DesktopAppFrame } from "./DesktopAppFrame";
import { ProductCamera, type CameraKeyframe } from "./ProductCamera";

export const ONBOARDING_PC_ENHANCEMENT_FPS = 30;
export const ONBOARDING_PC_ENHANCEMENT_SOURCE_SECONDS = 124.55;
export const ONBOARDING_PC_ENHANCEMENT_DURATION = Math.ceil(
  ONBOARDING_PC_ENHANCEMENT_SOURCE_SECONDS * ONBOARDING_PC_ENHANCEMENT_FPS,
);

const SOURCE_VIDEO = staticFile("Just Onboarding/OnboardingPC1-viewport-master.mp4");
const FONT = staticFile("video-assets/fonts/space-grotesk-latin.woff2");

const steadyCamera: readonly CameraKeyframe[] = [
  { frame: 0, scale: 1, x: 0, y: 0 },
  { frame: ONBOARDING_PC_ENHANCEMENT_DURATION, scale: 1, x: 0, y: 0 },
];

function FullRecording() {
  return (
    <DesktopAppFrame>
      <ProductCamera keyframes={steadyCamera}>
        <OffthreadVideo
          src={SOURCE_VIDEO}
          volume={1}
          style={{ width: "100%", height: "100%", display: "block", objectFit: "fill" }}
        />
      </ProductCamera>
    </DesktopAppFrame>
  );
}

function ChapterLabel({
  from,
  durationInFrames,
  eyebrow,
  title,
}: {
  from: number;
  durationInFrames: number;
  eyebrow: string;
  title: string;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - from, [0, 12, 68, 82], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <Sequence from={from} durationInFrames={durationInFrames} layout="none" hidden>
      <div style={{ position: "absolute", left: 120, top: 35, display: "flex", alignItems: "baseline", gap: 12, opacity, fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
        <span style={{ color: "#1E88FF", fontSize: 14, fontWeight: 700, letterSpacing: "0.14em" }}>{eyebrow}</span>
        <span style={{ color: "#E6E8EB", fontSize: 17, fontWeight: 600 }}>{title}</span>
      </div>
    </Sequence>
  );
}

export const OnboardingPcEnhancement = () => (
  <AbsoluteFill>
    <style>{`@font-face { font-family: "Space Grotesk"; src: url("${FONT}") format("woff2"); font-weight: 100 900; font-style: normal; }`}</style>
    <BrandBackdrop />
    <Sequence
      from={0}
      durationInFrames={ONBOARDING_PC_ENHANCEMENT_DURATION}
      layout="none">
      <FullRecording />
    </Sequence>

    <ChapterLabel from={0} durationInFrames={150} eyebrow="00 · VISTA GENERAL" title="Tu escritorio comercial" />
    <ChapterLabel from={150} durationInFrames={240} eyebrow="01 · DATOS DEL TRABAJO" title="Empieza con contexto" />
    <ChapterLabel from={540} durationInFrames={750} eyebrow="02 · CONSTRUCTOR" title="Elige y configura" />
    <ChapterLabel from={1560} durationInFrames={330} eyebrow="03 · CUBICACIÓN" title="Revisa el despiece" />
    <ChapterLabel from={1890} durationInFrames={360} eyebrow="04 · CONFIGURACIÓN" title="Ajusta tu trabajo" />
    <ChapterLabel from={2250} durationInFrames={300} eyebrow="05 · REVISA Y GUARDA" title="Deja todo ordenado" />
    <ChapterLabel from={2880} durationInFrames={180} eyebrow="06 · PDF" title="Comparte un documento profesional" />
    <ChapterLabel from={3090} durationInFrames={270} eyebrow="07 · FABRICACIÓN" title="Consulta tu resumen" />
  </AbsoluteFill>
);
