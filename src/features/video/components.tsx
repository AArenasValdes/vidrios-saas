import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { ventoraVideoAssets, type VentoraVideoLayout } from "./video-assets";

const NAVY = "#1F376C";
const BLUE = "#4D78D6";
const BLUE_DARK = "#3259B4";
const SKY = "#EAF2FF";
const BORDER = "rgba(39, 69, 133, 0.14)";
const TEXT = "#162743";
const MUTED = "#5D6E91";
const RED = "#E45A5A";

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export function GlassGridBackground({
  layout,
}: {
  layout: VentoraVideoLayout;
}) {
  const { width, height } = useVideoConfig();

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 15% 18%, rgba(77, 120, 214, 0.12), transparent 24%), radial-gradient(circle at 82% 10%, rgba(92, 150, 255, 0.10), transparent 22%), radial-gradient(circle at 82% 84%, rgba(77, 120, 214, 0.08), transparent 24%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(48, 81, 151, 0.06) 0 1px, transparent 1px 110px), repeating-linear-gradient(90deg, rgba(48, 81, 151, 0.06) 0 1px, transparent 1px 110px)",
          opacity: 0.55,
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.16) 14%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.02) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: layout === "portrait" ? -width * 0.14 : -width * 0.08,
          top: layout === "portrait" ? -height * 0.08 : -height * 0.1,
          width: layout === "portrait" ? width * 0.78 : width * 0.5,
          height: layout === "portrait" ? height * 0.42 : height * 0.48,
          borderRadius: 999,
          background:
            "radial-gradient(circle at center, rgba(77, 120, 214, 0.16), transparent 70%)",
          filter: "blur(24px)",
          opacity: 0.72,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: layout === "portrait" ? -width * 0.12 : -width * 0.04,
          bottom: layout === "portrait" ? -height * 0.08 : -height * 0.08,
          width: layout === "portrait" ? width * 0.72 : width * 0.42,
          height: layout === "portrait" ? height * 0.36 : height * 0.32,
          borderRadius: 999,
          background:
            "radial-gradient(circle at center, rgba(77, 120, 214, 0.14), transparent 72%)",
          filter: "blur(22px)",
          opacity: 0.65,
        }}
      />
    </>
  );
}

export function SceneWrapper({
  layout,
  children,
  frame,
}: {
  layout: VentoraVideoLayout;
  frame: number;
  children: ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #F7FAFF 0%, #F9FCFF 46%, #EEF5FF 100%)",
        fontFamily:
          'Geist, "Segoe UI", "Inter", system-ui, -apple-system, sans-serif',
        color: TEXT,
        overflow: "hidden",
      }}
    >
      <GlassGridBackground layout={layout} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1,
          transform: `translateY(${reducedMotion ? 0 : interpolate(frame, [0, 20], [28, 0], {
            extrapolateRight: "clamp",
          })}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

export function VentoraLogo({
  width = 250,
  compact = false,
}: {
  width?: number;
  compact?: boolean;
}) {
  return (
    <Img
      src={ventoraVideoAssets.logo}
      alt="Ventora"
      style={{
        width,
        height: compact ? "auto" : undefined,
        display: "block",
        objectFit: "contain",
      }}
    />
  );
}

export function CTAButton({
  children,
  variant = "primary",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 62,
        padding: "0 26px",
        borderRadius: 999,
        border: isPrimary ? "none" : `1px solid ${BORDER}`,
        background: isPrimary
          ? "linear-gradient(180deg, #4F7BE0 0%, #345DBD 100%)"
          : "rgba(255,255,255,0.92)",
        color: isPrimary ? "white" : TEXT,
        boxShadow: isPrimary
          ? "0 18px 34px rgba(61, 103, 203, 0.28)"
          : "0 10px 24px rgba(19, 40, 86, 0.08)",
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        paddingTop: 2,
      }}
    >
      {children}
    </div>
  );
}

export function FloatingMessage({
  children,
  frame,
  delay = 0,
  x = 0,
  y = 0,
  layout,
  tone = "neutral",
  width = 320,
  opacity = 1,
  rotate = 0,
}: {
  children: ReactNode;
  frame: number;
  delay?: number;
  x?: number;
  y?: number;
  layout: VentoraVideoLayout;
  tone?: "neutral" | "blue" | "alert" | "soft";
  width?: number;
  opacity?: number;
  rotate?: number;
}) {
  const { fps } = useVideoConfig();
  const reducedMotion = usePrefersReducedMotion();
  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: {
      damping: 16,
      stiffness: 115,
      mass: 0.8,
    },
  });
  const float = reducedMotion
    ? 0
    : interpolate(frame + delay, [0, 120], [0, 1], {
        extrapolateRight: "clamp",
      });

  const palette =
    tone === "alert"
      ? {
          background: "rgba(255, 247, 247, 0.96)",
          border: "rgba(228, 90, 90, 0.16)",
          color: "#A93D3D",
        }
      : tone === "blue"
        ? {
            background: "rgba(235, 243, 255, 0.96)",
            border: "rgba(77, 120, 214, 0.16)",
            color: NAVY,
          }
        : tone === "soft"
          ? {
              background: "rgba(250, 252, 255, 0.92)",
              border: "rgba(41, 68, 131, 0.1)",
              color: TEXT,
            }
          : {
              background: "rgba(255,255,255,0.95)",
              border: BORDER,
              color: TEXT,
            };

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        maxWidth: layout === "portrait" ? Math.min(width, 320) : width,
        padding: "14px 18px",
        borderRadius: 999,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 12px 28px rgba(17, 32, 64, 0.08)",
        color: palette.color,
        fontSize: layout === "portrait" ? 18 : 20,
        lineHeight: 1.2,
        fontWeight: 600,
        opacity: opacity * progress,
        transform: `translate3d(${reducedMotion ? 0 : float * 10}px, ${reducedMotion ? 0 : float * 6}px, 0) scale(${0.94 + progress * 0.06}) rotate(${rotate}deg)`,
        backdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}

export function StepCard({
  number,
  title,
  body,
  label,
  children,
  layout,
  compact = false,
}: {
  number: string;
  title: string;
  body: string;
  label?: string;
  children?: ReactNode;
  layout: VentoraVideoLayout;
  compact?: boolean;
}) {
  const isPortrait = layout === "portrait";
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 28,
        background: "rgba(255,255,255,0.94)",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 18px 42px rgba(23, 43, 86, 0.09)",
        padding: compact ? 22 : 28,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(77, 120, 214, 0.04) 0%, rgba(255,255,255,0) 34%, rgba(77, 120, 214, 0.03) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            minWidth: 44,
            height: 44,
            paddingInline: 12,
            borderRadius: 999,
            background: "rgba(77, 120, 214, 0.12)",
            color: BLUE_DARK,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.12em",
          }}
        >
          {number}
        </div>
        {label ? (
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: BLUE_DARK,
              fontWeight: 700,
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: 10,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: isPortrait ? 30 : 32,
            lineHeight: 1.05,
            color: TEXT,
            letterSpacing: "-0.04em",
            fontWeight: 700,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: isPortrait ? 20 : 21,
            lineHeight: 1.45,
            color: MUTED,
          }}
        >
          {body}
        </p>
        {children ? <div style={{ marginTop: 12 }}>{children}</div> : null}
      </div>
    </div>
  );
}

export function PhoneMockup({
  src,
  alt,
  layout,
  width,
  objectFit = "contain",
  objectPosition = "center center",
  shadow = true,
  radius = 34,
  padding = 16,
}: {
  src: string;
  alt: string;
  layout: VentoraVideoLayout;
  width?: number;
  objectFit?: CSSProperties["objectFit"];
  objectPosition?: CSSProperties["objectPosition"];
  shadow?: boolean;
  radius?: number;
  padding?: number;
}) {
  const { width: videoWidth } = useVideoConfig();
  const reducedMotion = usePrefersReducedMotion();
  const shellWidth =
    width ?? (layout === "portrait" ? Math.min(videoWidth * 0.82, 760) : 560);
  const shellAspect = layout === "portrait" ? 0.72 : 0.66;

  return (
    <div
      style={{
        position: "relative",
        width: shellWidth,
        maxWidth: "100%",
        aspectRatio: `${shellAspect}`,
        borderRadius: radius,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.94) 100%)",
        border: "1px solid rgba(38, 66, 133, 0.10)",
        padding,
        boxShadow: shadow
          ? "0 24px 80px rgba(22, 38, 71, 0.14)"
          : "0 14px 32px rgba(22, 38, 71, 0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          background:
            "linear-gradient(180deg, rgba(77,120,214,0.06) 0%, rgba(255,255,255,0) 42%, rgba(77,120,214,0.02) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          borderRadius: Math.max(radius - 10, 24),
          overflow: "hidden",
          background: "white",
          border: "1px solid rgba(38, 66, 133, 0.06)",
          width: "100%",
          height: "100%",
          boxShadow: reducedMotion
            ? "none"
            : "inset 0 1px 0 rgba(255,255,255,0.92)",
        }}
      >
        <Img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit,
            objectPosition,
          }}
        />
      </div>
    </div>
  );
}

export function AccentNote({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "alert" | "soft";
}) {
  const palette =
    tone === "alert"
      ? {
          bg: "rgba(255, 242, 242, 0.96)",
          border: "rgba(228, 90, 90, 0.18)",
          color: "#A93D3D",
        }
      : tone === "soft"
        ? {
            bg: "rgba(247, 250, 255, 0.96)",
            border: "rgba(42, 70, 133, 0.12)",
            color: MUTED,
          }
        : {
            bg: "rgba(235, 243, 255, 0.96)",
            border: "rgba(77, 120, 214, 0.16)",
            color: NAVY,
          };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "10px 16px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: 17,
        fontWeight: 700,
        boxShadow: "0 10px 22px rgba(28, 44, 83, 0.06)",
      }}
    >
      {children}
    </div>
  );
}

export const videoPalette = {
  navy: NAVY,
  blue: BLUE,
  blueDark: BLUE_DARK,
  sky: SKY,
  border: BORDER,
  text: TEXT,
  muted: MUTED,
  red: RED,
};
