import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BrandBackdrop, DesktopAppFrame } from "./DesktopAppFrame";

export const LINEAS_ONBOARDING_FPS = 30;
export const LINEAS_ONBOARDING_PC_SECONDS = 79.083333;
export const LINEAS_ONBOARDING_MOBILE_SOURCE_SECONDS = 105.331667;
export const LINEAS_ONBOARDING_MOBILE_PLAYBACK_RATE = 1.35;

const INTRO_FRAMES = 150;
const TRANSITION_FRAMES = 90;
const OUTRO_FRAMES = 150;
const PC_FRAMES = Math.ceil(LINEAS_ONBOARDING_PC_SECONDS * LINEAS_ONBOARDING_FPS);
const MOBILE_FRAMES = Math.ceil(
  (LINEAS_ONBOARDING_MOBILE_SOURCE_SECONDS / LINEAS_ONBOARDING_MOBILE_PLAYBACK_RATE) *
    LINEAS_ONBOARDING_FPS,
);

export const LINEAS_ONBOARDING_COMBINED_DURATION =
  INTRO_FRAMES + PC_FRAMES + TRANSITION_FRAMES + MOBILE_FRAMES + OUTRO_FRAMES;

const PC_VIDEO = staticFile("Just Onboarding/2026-09-05 20-56-30-PC-corto-remotion.mp4");
const MOBILE_VIDEO = staticFile("Just Onboarding/movil-remotion-proxy.mp4");
const LOGO = staticFile("brand/ventora-logo-premium-dark.svg");
const FONT = staticFile("video-assets/fonts/space-grotesk-latin.woff2");
const FONT_STACK = '"Ventora Space", "Space Grotesk", Arial, sans-serif';

function Header({ section }: { section: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 34,
        left: 72,
        right: 72,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Img src={LOGO} style={{ width: 208, height: 38, objectFit: "contain", objectPosition: "left center" }} />
      <div
        style={{
          color: "#8A96A6",
          fontFamily: FONT_STACK,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        {section}
      </div>
    </div>
  );
}

function ProgressBar({ frame, total }: { frame: number; total: number }) {
  const progress = interpolate(frame, [0, total], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 28,
        height: 3,
        zIndex: 20,
        overflow: "hidden",
        borderRadius: 999,
        background: "rgba(138,150,166,.24)",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          borderRadius: 999,
          background: "#1E88FF",
          boxShadow: "0 0 16px rgba(30,136,255,.9)",
        }}
      />
    </div>
  );
}

function Intro() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18, 120, 150], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 28], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>
      <Header section="Onboarding · líneas y cotización" />
      <div
        style={{
          position: "absolute",
          top: 290,
          left: 170,
          right: 170,
          textAlign: "center",
          fontFamily: FONT_STACK,
        }}
      >
        <div style={{ color: "#1E88FF", fontSize: 18, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Catálogo · precios · fabricación revisable
        </div>
        <div style={{ marginTop: 24, color: "#F5F7FA", fontSize: 82, lineHeight: 0.98, fontWeight: 800, letterSpacing: "-0.055em" }}>
          25 líneas.
          <br />
          <span style={{ color: "#8A96A6" }}>Una cotización más ordenada.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 44 }}>
          <Pill>Configura en PC</Pill>
          <Pill muted>Cotiza en móvil</Pill>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Pill({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      style={{
        padding: "13px 22px",
        borderRadius: 999,
        border: `1px solid ${muted ? "rgba(138,150,166,.34)" : "rgba(30,136,255,.65)"}`,
        background: muted ? "rgba(17,24,39,.78)" : "rgba(30,136,255,.16)",
        color: muted ? "#C6D0DC" : "#8FC5FF",
        fontFamily: FONT_STACK,
        fontSize: 16,
        fontWeight: 750,
      }}
    >
      {children}
    </div>
  );
}

function PcSection() {
  const frame = useCurrentFrame();
  const labelOpacity = interpolate(frame, [0, 16, 120, 150], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Header section="01 · Configuración en PC" />
      <DesktopAppFrame>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#F5F7FA" }}>
          <OffthreadVideo
            src={PC_VIDEO}
            muted
            volume={0}
            style={{ width: "100%", height: "100%", display: "block", objectFit: "fill" }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 108,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              boxSizing: "border-box",
              background: "linear-gradient(180deg, #111827 0%, #0B0F17 100%)",
              borderBottom: "1px solid rgba(30,136,255,.24)",
              color: "#8A96A6",
              fontFamily: FONT_STACK,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "#BFDFFF" }}>Ventora · Líneas y precios</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#1E88FF", boxShadow: "0 0 12px rgba(30,136,255,.9)" }} />
              PC
            </span>
          </div>
        </div>
      </DesktopAppFrame>
      <div
        style={{
          position: "absolute",
          top: 91,
          left: 120,
          zIndex: 5,
          opacity: labelOpacity,
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          fontFamily: FONT_STACK,
        }}
      >
        <span style={{ color: "#1E88FF", fontSize: 14, fontWeight: 800, letterSpacing: "0.16em" }}>PC</span>
        <span style={{ color: "#E6E8EB", fontSize: 18, fontWeight: 650 }}>Deja lista tu línea comercial y técnica</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 39,
          zIndex: 5,
          padding: "10px 16px",
          borderRadius: 999,
          background: "rgba(11,15,23,.9)",
          border: "1px solid rgba(30,136,255,.36)",
          color: "#BFDFFF",
          fontFamily: FONT_STACK,
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Precio · receta · pauta revisable
      </div>
    </AbsoluteFill>
  );
}

function TransitionCard() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, 72, 90], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 24], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})`, fontFamily: FONT_STACK }}>
      <Header section="02 · Continuidad entre dispositivos" />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <DeviceCard number="01" title="Configura" detail="Tus líneas y reglas" active />
          <div style={{ width: 90, height: 2, background: "linear-gradient(90deg, #1E88FF, #8A96A6)" }} />
          <DeviceCard number="02" title="Cotiza" detail="Cada pieza desde el móvil" />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function DeviceCard({ number, title, detail, active = false }: { number: string; title: string; detail: string; active?: boolean }) {
  return (
    <div
      style={{
        width: 390,
        minHeight: 190,
        padding: 28,
        boxSizing: "border-box",
        borderRadius: 28,
        border: `1px solid ${active ? "rgba(30,136,255,.58)" : "rgba(138,150,166,.3)"}`,
        background: active ? "rgba(30,136,255,.12)" : "rgba(17,24,39,.72)",
        boxShadow: active ? "0 20px 70px rgba(30,136,255,.13)" : "none",
      }}
    >
      <div style={{ color: active ? "#5CADFF" : "#8A96A6", fontSize: 14, fontWeight: 800, letterSpacing: "0.16em" }}>{number}</div>
      <div style={{ marginTop: 24, color: "#F5F7FA", fontSize: 34, fontWeight: 800, letterSpacing: "-0.04em" }}>{title}</div>
      <div style={{ marginTop: 8, color: "#AEBAC8", fontSize: 18, lineHeight: 1.3 }}>{detail}</div>
    </div>
  );
}

function MobileSection() {
  const frame = useCurrentFrame();
  const localSeconds = frame / LINEAS_ONBOARDING_FPS;
  const chapter = localSeconds < 25 ? "Elige una línea por pieza" : localSeconds < 52 ? "Precio listo para cotizar" : localSeconds < 70 ? "Revisa antes de guardar" : "Comparte una propuesta profesional";
  const chapterIndex = localSeconds < 25 ? "01" : localSeconds < 52 ? "02" : localSeconds < 70 ? "03" : "04";
  const phoneOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Header section="02 · Cotización desde el móvil" />
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 265,
          width: 580,
          fontFamily: FONT_STACK,
        }}
      >
        <div style={{ color: "#1E88FF", fontSize: 16, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Móvil · {chapterIndex}
        </div>
        <div style={{ marginTop: 22, color: "#F5F7FA", fontSize: 58, lineHeight: 0.98, fontWeight: 800, letterSpacing: "-0.055em" }}>
          {chapter}
        </div>
        <div style={{ marginTop: 28, color: "#AEBAC8", fontSize: 23, lineHeight: 1.36, maxWidth: 490 }}>
          Selecciona la línea que ya preparaste en PC y úsala en la pieza que estás cotizando.
        </div>
        <div style={{ display: "grid", gap: 14, marginTop: 46 }}>
          {[
            "Línea y precio por pieza",
            "Puedes mezclar líneas",
            "PDF listo para WhatsApp",
          ].map((item, index) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, color: index === 0 ? "#DCEBFA" : "#8A96A6", fontSize: 20, fontWeight: index === 0 ? 750 : 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: index === 0 ? "#1E88FF" : "#526173", boxShadow: index === 0 ? "0 0 14px rgba(30,136,255,.8)" : "none" }} />
              {item}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 105,
          right: 185,
          width: 430,
          height: 890,
          padding: 14,
          boxSizing: "border-box",
          borderRadius: 48,
          background: "linear-gradient(145deg, #1A2534 0%, #05080D 70%)",
          border: "1px solid rgba(138,150,166,.42)",
          boxShadow: "0 28px 90px rgba(0,0,0,.55), 0 0 0 8px rgba(9,18,32,.72)",
          opacity: phoneOpacity,
        }}
      >
        <div style={{ position: "absolute", top: 22, left: "50%", zIndex: 3, width: 120, height: 26, transform: "translateX(-50%)", borderRadius: 999, background: "#05080D" }} />
        <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 36, background: "#F5F7FA" }}>
          <OffthreadVideo
            src={MOBILE_VIDEO}
            playbackRate={LINEAS_ONBOARDING_MOBILE_PLAYBACK_RATE}
            muted
            volume={0}
            style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
          />
        </div>
        <div style={{ position: "absolute", bottom: 19, left: "50%", width: 116, height: 5, transform: "translateX(-50%)", borderRadius: 999, background: "rgba(255,255,255,.75)" }} />
      </div>
      <div style={{ position: "absolute", right: 73, bottom: 54, color: "#8A96A6", fontFamily: FONT_STACK, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Ventora móvil
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18, 120, 150], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity, display: "grid", placeItems: "center", fontFamily: FONT_STACK }}>
      <div style={{ textAlign: "center" }}>
        <Img src={LOGO} style={{ width: 300, height: 54, objectFit: "contain", margin: "0 auto 42px" }} />
        <div style={{ color: "#F5F7FA", fontSize: 70, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.055em" }}>
          Configura en PC.
          <br />
          <span style={{ color: "#1E88FF" }}>Cotiza en móvil.</span>
        </div>
        <div style={{ marginTop: 26, color: "#AEBAC8", fontSize: 22 }}>Tus líneas, tus precios y tu forma de trabajar.</div>
        <div style={{ display: "inline-flex", marginTop: 42, padding: "16px 28px", borderRadius: 999, background: "#1E88FF", color: "#FFFFFF", fontSize: 19, fontWeight: 800, boxShadow: "0 12px 35px rgba(30,136,255,.26)" }}>
          Escríbeme DEMO
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function LineasOnboardingCombined() {
  const frame = useCurrentFrame();
  const pcFrom = INTRO_FRAMES;
  const transitionFrom = pcFrom + PC_FRAMES;
  const mobileFrom = transitionFrom + TRANSITION_FRAMES;
  const outroFrom = mobileFrom + MOBILE_FRAMES;

  return (
    <AbsoluteFill>
      <style>{`@font-face { font-family: "Ventora Space"; src: url("${FONT}") format("woff2"); font-weight: 100 900; font-style: normal; }`}</style>
      <BrandBackdrop />
      <Sequence from={0} durationInFrames={INTRO_FRAMES} layout="none"><Intro /></Sequence>
      <Sequence from={pcFrom} durationInFrames={PC_FRAMES} layout="none"><PcSection /></Sequence>
      <Sequence from={transitionFrom} durationInFrames={TRANSITION_FRAMES} layout="none"><TransitionCard /></Sequence>
      <Sequence from={mobileFrom} durationInFrames={MOBILE_FRAMES} layout="none"><MobileSection /></Sequence>
      <Sequence from={outroFrom} durationInFrames={OUTRO_FRAMES} layout="none"><Outro /></Sequence>
      <ProgressBar frame={frame} total={LINEAS_ONBOARDING_COMBINED_DURATION} />
    </AbsoluteFill>
  );
}
