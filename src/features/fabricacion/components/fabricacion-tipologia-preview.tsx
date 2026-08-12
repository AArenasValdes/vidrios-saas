"use client";

import type { ReactNode } from "react";

import type { FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-workspace.module.css";

export type FabricacionPreviewZone =
  | "frameTop"
  | "frameBottom"
  | "frameSides"
  | "sashTop"
  | "sashBottom"
  | "sashOuter"
  | "sashMeeting"
  | null;

/** Mapea función de perfil → zona de la mini preview. */
export function resolvePreviewZoneFromFuncion(
  funcion: string
): FabricacionPreviewZone {
  const key = funcion.trim().toLocaleLowerCase("es");
  if (
    key.includes("riel superior") ||
    key.includes("marco superior") ||
    key.includes("guía superior") ||
    key.includes("guia superior") ||
    key.includes("cabezal") && key.includes("marco")
  ) {
    return "frameTop";
  }
  if (
    key.includes("riel inferior") ||
    key.includes("marco inferior") ||
    key.includes("guía inferior") ||
    key.includes("guia inferior")
  ) {
    return "frameBottom";
  }
  if (
    key.includes("jamba") ||
    key.includes("marco lateral") ||
    key.includes("marco vertical") ||
    key.includes("perfil lateral")
  ) {
    return "frameSides";
  }
  if (key.includes("marco horizontal")) return "frameTop";
  if (key.includes("zócalo") || key.includes("zocalo") || key.includes("hoja inferior")) {
    return "sashBottom";
  }
  if (key.includes("cabezal") || key.includes("hoja superior") || key.includes("travesaño") || key.includes("travesano")) {
    return "sashTop";
  }
  if (key.includes("pierna") || key.includes("hoja lateral") || key.includes("hoja vertical")) {
    return "sashOuter";
  }
  if (key.includes("traslapo") || key.includes("hoja horizontal")) return "sashMeeting";
  return null;
}

type Props = {
  tipologia: FabricacionTipologia;
  hojas?: number;
  highlightZone?: FabricacionPreviewZone;
  className?: string;
  size?: "sm" | "md";
};

function FrameShell({
  active,
  children,
}: {
  active: (zone: NonNullable<FabricacionPreviewZone>) => "true" | "false";
  children?: ReactNode;
}) {
  return (
    <>
      <rect
        className={s.fabPreviewFrame}
        x="10"
        y="10"
        width="140"
        height="100"
        rx="3"
        fill="none"
        strokeWidth="5"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("frameTop")}
        x="14"
        y="12"
        width="132"
        height="7"
        rx="1"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("frameBottom")}
        x="14"
        y="101"
        width="132"
        height="7"
        rx="1"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("frameSides")}
        x="12"
        y="20"
        width="7"
        height="80"
        rx="1"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("frameSides")}
        x="141"
        y="20"
        width="7"
        height="80"
        rx="1"
      />
      {children}
    </>
  );
}

function SashOutline({
  x,
  y,
  width,
  height,
  active,
  front,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  active: (zone: NonNullable<FabricacionPreviewZone>) => "true" | "false";
  front?: boolean;
}) {
  return (
    <>
      <rect
        className={s.fabPreviewSash}
        data-front={front ? "true" : undefined}
        x={x}
        y={y}
        width={width}
        height={height}
        rx="2"
        fill="none"
        strokeWidth="2.5"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("sashTop")}
        x={x + 4}
        y={y + 2}
        width={width - 8}
        height="5"
        rx="1"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("sashBottom")}
        x={x + 4}
        y={y + height - 7}
        width={width - 8}
        height="5"
        rx="1"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("sashOuter")}
        x={x + 2}
        y={y + 8}
        width="5"
        height={height - 16}
        rx="1"
      />
      <rect
        className={s.fabPreviewZone}
        data-active={active("sashOuter")}
        x={x + width - 7}
        y={y + 8}
        width="5"
        height={height - 16}
        rx="1"
      />
    </>
  );
}

/**
 * Mini ilustración técnica (no CAD). Esquemas simples por tipología.
 */
export function FabricacionTipologiaPreview({
  tipologia,
  hojas = 2,
  highlightZone = null,
  className,
  size = "md",
}: Props) {
  const isCorredera = tipologia === "corredera" && hojas >= 2;
  const isFijo = tipologia === "pano_fijo";
  const isPuerta = tipologia === "puerta_abatible";
  const isAbatible = tipologia === "abatible";
  const isProyectante = tipologia === "proyectante";
  const active = (zone: NonNullable<FabricacionPreviewZone>) =>
    highlightZone === zone ? "true" : "false";

  return (
    <div
      className={`${s.fabTypologyPreview} ${className ?? ""}`}
      data-size={size}
      data-tipologia={tipologia}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 120" role="presentation">
        {isCorredera ? (
          <FrameShell active={active}>
            <rect
              className={s.fabPreviewSash}
              x="22"
              y="24"
              width="58"
              height="72"
              rx="2"
              fill="none"
              strokeWidth="2.5"
            />
            <rect
              className={s.fabPreviewSash}
              data-front="true"
              x="70"
              y="24"
              width="58"
              height="72"
              rx="2"
              fill="none"
              strokeWidth="2.5"
            />
            <rect
              className={s.fabPreviewZone}
              data-active={active("sashTop")}
              x="26"
              y="26"
              width="50"
              height="5"
              rx="1"
            />
            <rect
              className={s.fabPreviewZone}
              data-active={active("sashTop")}
              x="74"
              y="26"
              width="50"
              height="5"
              rx="1"
            />
            <rect
              className={s.fabPreviewZone}
              data-active={active("sashBottom")}
              x="26"
              y="89"
              width="50"
              height="5"
              rx="1"
            />
            <rect
              className={s.fabPreviewZone}
              data-active={active("sashBottom")}
              x="74"
              y="89"
              width="50"
              height="5"
              rx="1"
            />
            <rect
              className={s.fabPreviewZone}
              data-active={active("sashOuter")}
              x="24"
              y="32"
              width="5"
              height="56"
              rx="1"
            />
            <rect
              className={s.fabPreviewZone}
              data-active={active("sashOuter")}
              x="121"
              y="32"
              width="5"
              height="56"
              rx="1"
            />
            <rect
              className={s.fabPreviewZone}
              data-active={active("sashMeeting")}
              x="74"
              y="32"
              width="6"
              height="56"
              rx="1"
            />
            <path
              className={s.fabPreviewHint}
              d="M48 58 h18 m-4 -4 l4 4 l-4 4"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </FrameShell>
        ) : isFijo ? (
          <FrameShell active={active}>
            <rect
              className={s.fabPreviewSash}
              x="28"
              y="28"
              width="104"
              height="64"
              rx="2"
              fill="rgb(20 111 224 / 6%)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          </FrameShell>
        ) : isPuerta ? (
          <FrameShell active={active}>
            <SashOutline x={32} y={24} width={96} height={76} active={active} />
            <path
              className={s.fabPreviewHint}
              d="M118 62 v14"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle className={s.fabPreviewHint} cx="118" cy="58" r="2.5" />
          </FrameShell>
        ) : isAbatible ? (
          <FrameShell active={active}>
            <SashOutline x={32} y={28} width={96} height={64} active={active} />
            <path
              className={s.fabPreviewHint}
              d="M32 92 A 52 52 0 0 1 84 40"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </FrameShell>
        ) : isProyectante ? (
          <FrameShell active={active}>
            <SashOutline x={36} y={32} width={88} height={56} active={active} />
            <path
              className={s.fabPreviewHint}
              d="M80 88 L80 52 M68 52 L80 44 L92 52"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </FrameShell>
        ) : (
          <FrameShell active={active}>
            <rect
              className={s.fabPreviewSash}
              x="28"
              y="28"
              width="104"
              height="64"
              rx="2"
              fill="none"
              strokeWidth="2"
            />
          </FrameShell>
        )}
      </svg>
    </div>
  );
}
