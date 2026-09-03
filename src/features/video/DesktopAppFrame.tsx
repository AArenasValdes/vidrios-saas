import React, { type ReactNode } from "react";
import { AbsoluteFill } from "remotion";

const BRAND_BLUE = "#1E88FF";
const STEEL = "#8A96A6";

export function BrandBackdrop() {
  return (
    <AbsoluteFill style={{ background: "#050505", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% -12%, rgba(30,136,255,.15), transparent 36%), radial-gradient(circle at 92% 90%, rgba(30,136,255,.08), transparent 30%), linear-gradient(180deg, #0B0F17 0%, #050505 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.24,
          backgroundImage:
            "linear-gradient(rgba(138,150,166,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(138,150,166,.12) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 76%)",
        }}
      />
    </AbsoluteFill>
  );
}

export function DesktopAppFrame({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 100,
          width: 1680,
          height: 860,
          borderRadius: 24,
          overflow: "hidden",
          background: "#0B0F17",
          border: "1px solid rgba(138,150,166,.34)",
          boxShadow: "0 28px 90px rgba(0,0,0,.48), 0 0 0 1px rgba(30,136,255,.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto",
            height: 56,
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            background: "linear-gradient(180deg, #111827 0%, #0B0F17 100%)",
            borderBottom: "1px solid rgba(138,150,166,.24)",
            color: "#E6E8EB",
            fontFamily: '"Space Grotesk", Inter, sans-serif',
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["#8A96A6", "#667384", "#4D5A69"].map((color) => (
              <span
                key={color}
                style={{ width: 10, height: 10, borderRadius: "50%", background: color, opacity: 0.72 }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "7px 18px",
              borderRadius: 999,
              border: "1px solid rgba(138,150,166,.22)",
              color: STEEL,
              fontSize: 14,
              letterSpacing: "0.02em",
            }}
          >
            ventorap.cl
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 9,
              color: STEEL,
              fontSize: 13,
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND_BLUE, boxShadow: `0 0 12px ${BRAND_BLUE}` }} />
            VENTORA
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 56,
            bottom: 0,
            overflow: "hidden",
            background: "#F5F7FA",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
}
