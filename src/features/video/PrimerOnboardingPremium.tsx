import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { VENTORA_VIDEO_FPS } from "./video-assets";

// Proxy H.264 a 30 fps para que el render final sea estable y rápido.
// El video original permanece intacto en la misma carpeta.
const SOURCE_VIDEO = staticFile("Just Onboarding/PrimerOnboarding-proxy.mp4");
const BRAND_LOGO = staticFile("brand/ventora-logo-premium-dark.svg");
const BRAND_FONT = staticFile("video-assets/fonts/space-grotesk-latin.woff2");
const FONT_STACK = '"Ventora Space", "Space Grotesk", Arial, sans-serif';

type OnboardingStep = {
  start: number;
  end: number;
  title: string;
  detail: string;
};

const STEPS: OnboardingStep[] = [
  {
    start: 0,
    end: 8,
    title: "Empieza una cotización",
    detail: "Avanza desde el celular, sin esperar llegar a casa.",
  },
  {
    start: 8,
    end: 18,
    title: "Identifica al cliente",
    detail: "Guarda el trabajo junto a sus datos y contacto.",
  },
  {
    start: 18,
    end: 31,
    title: "Define el trabajo",
    detail: "Elige componentes y arma la propuesta paso a paso.",
  },
  {
    start: 31,
    end: 44,
    title: "Ingresa medidas y precio",
    detail: "Usa tus líneas o agrega el valor comercial del trabajo.",
  },
  {
    start: 44,
    end: 56,
    title: "Revisa y guarda",
    detail: "Confirma el resumen antes de compartirlo con tu cliente.",
  },
  {
    start: 56,
    end: 67.728,
    title: "PDF listo para WhatsApp",
    detail: "Una propuesta profesional, ordenada y lista para enviar.",
  },
];

const FPS = VENTORA_VIDEO_FPS;
const DURATION_SECONDS = 67.728333;
const VIDEO_WIDTH = 742;
const VIDEO_HEIGHT = 1608;

function getActiveStep(seconds: number) {
  return STEPS.find((step) => seconds >= step.start && seconds < step.end) ?? STEPS[STEPS.length - 1];
}

function fade(frame: number, start: number, duration = 18) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function StepOverlay({
  step,
  stepIndex,
  stepStartFrame,
}: {
  step: OnboardingStep;
  stepIndex: number;
  stepStartFrame: number;
}) {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - stepStartFrame);
  const opacity = fade(localFrame, 0);
  const translateY = interpolate(localFrame, [0, 24], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        right: 48,
        bottom: 38,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
            color: "#3d9aff",
            fontFamily: FONT_STACK,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#3d9aff",
              boxShadow: "0 0 14px rgba(61,154,255,.8)",
            }}
          />
          Paso {stepIndex + 1} de {STEPS.length}
        </div>
        <div
          style={{
            color: "#f5f9ff",
            fontFamily: FONT_STACK,
            fontSize: 31,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
          }}
        >
          {step.title}
        </div>
        <div
          style={{
            maxWidth: 650,
            marginTop: 8,
            color: "#9eacc0",
            fontFamily: FONT_STACK,
            fontSize: 17,
            lineHeight: 1.35,
          }}
        >
          {step.detail}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          width: 118,
          height: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(61,154,255,.42)",
          borderRadius: 999,
          background: "rgba(8,17,32,.78)",
          color: "#cfe5ff",
          fontFamily: FONT_STACK,
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Ventora móvil
      </div>
    </div>
  );
}

function PrivacyOverlay({ opacity }: { opacity: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 920,
        left: 49,
        width: 335,
        height: 130,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 7,
        padding: "0 20px",
        boxSizing: "border-box",
        opacity,
        border: "1px solid rgba(61,154,255,.58)",
        borderRadius: 16,
        background: "#0b1320",
        boxShadow: "0 14px 30px rgba(0,0,0,.28)",
        color: "#f5f9ff",
        fontFamily: FONT_STACK,
      }}
    >
      <div style={{ color: "#5cadff", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Datos protegidos
      </div>
      <div style={{ color: "#aebdd0", fontSize: 15, lineHeight: 1.25 }}>
        Información personal oculta para esta demo.
      </div>
    </div>
  );
}

export function PrimerOnboardingPremium() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const activeStep = getActiveStep(seconds);
  const activeStepIndex = Math.max(0, STEPS.indexOf(activeStep));
  const videoProgress = interpolate(seconds, [0, DURATION_SECONDS], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const videoOpacity = fade(frame, 0, 24);
  const videoScale = interpolate(frame, [0, 30], [0.985, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const privacyOpacity = interpolate(
    seconds,
    [61.5, 61.85, 63.15, 63.5],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% -8%, rgba(30,136,255,.18), transparent 31%), linear-gradient(180deg, #080d16 0%, #03060c 100%)",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.55,
          background:
            "radial-gradient(circle at 8% 54%, rgba(30,136,255,.08), transparent 25%), radial-gradient(circle at 92% 45%, rgba(30,136,255,.07), transparent 25%)",
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: "Ventora Space";
              src: url("${BRAND_FONT}") format("woff2");
              font-style: normal;
              font-weight: 400 700;
              font-display: block;
            }
          `,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 42,
          left: 48,
          right: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Img
            src={BRAND_LOGO}
            style={{ width: 168, height: 36, objectFit: "contain", objectPosition: "left center" }}
          />
          <div style={{ width: 1, height: 24, background: "rgba(170,182,195,.32)" }} />
          <div style={{ color: "#7e8da2", fontFamily: FONT_STACK, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Tu primera cotización
          </div>
        </div>
        <div style={{ color: "#7e8da2", fontFamily: FONT_STACK, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Onboarding · 01
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 118,
          left: "50%",
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
          transform: `translateX(-50%) scale(${videoScale})`,
          transformOrigin: "center top",
          opacity: videoOpacity,
          overflow: "hidden",
          border: "1px solid rgba(142,174,220,.25)",
          borderRadius: 30,
          background: "#eef2f8",
          boxShadow: "0 28px 90px rgba(0,0,0,.48), 0 0 0 8px rgba(9,18,32,.72)",
        }}
        >
        <OffthreadVideo
          src={SOURCE_VIDEO}
          muted
          volume={0}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
        <PrivacyOverlay opacity={privacyOpacity} />
      </div>

      <StepOverlay
        step={activeStep}
        stepIndex={activeStepIndex}
        stepStartFrame={Math.round(activeStep.start * fps)}
      />

      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 18,
          height: 3,
          overflow: "hidden",
          borderRadius: 999,
          background: "rgba(127,147,180,.2)",
        }}
      >
        <div style={{ width: `${videoProgress}%`, height: "100%", borderRadius: 999, background: "#1e88ff", boxShadow: "0 0 14px rgba(30,136,255,.8)" }} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 108,
          left: 42,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          color: "#6e7e95",
          fontFamily: FONT_STACK,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
        }}
      >
        Captura · cotiza · comparte
      </div>
    </AbsoluteFill>
  );
}

export const PRIMER_ONBOARDING_DURATION = Math.ceil(DURATION_SECONDS * FPS);
