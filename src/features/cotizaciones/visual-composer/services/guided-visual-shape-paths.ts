/**
 * Paths SVG para formas V1 del constructor (arco de vano + marcos/vidrios redondeados).
 */

import type {
  GuidedFrameShape,
  GuidedGlassShape,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Contorno exterior del vano (marco). */
export function buildGuidedFramePath(
  x: number,
  y: number,
  w: number,
  h: number,
  frameShape: GuidedFrameShape,
  pxPerMm: number
): string {
  if (frameShape.kind === "rounded") {
    const radiusPx = Math.min(
      Math.max(frameShape.radiusMm * pxPerMm, 3),
      w / 2 - 0.5,
      h / 2 - 0.5
    );
    return buildRoundedRectPath(x, y, w, h, radiusPx, frameShape.corners);
  }

  if (frameShape.kind !== "arch_top") {
    return `M ${r2(x)} ${r2(y)} H ${r2(x + w)} V ${r2(y + h)} H ${r2(x)} Z`;
  }

  const risePx = Math.min(
    Math.max(frameShape.archRiseMm * pxPerMm, 8),
    h * 0.45
  );
  const springY = y + risePx;
  const rx = w / 2;
  const ry = risePx;

  return [
    `M ${r2(x)} ${r2(y + h)}`,
    `L ${r2(x)} ${r2(springY)}`,
    `A ${r2(rx)} ${r2(ry)} 0 0 1 ${r2(x + w)} ${r2(springY)}`,
    `L ${r2(x + w)} ${r2(y + h)}`,
    "Z",
  ].join(" ");
}

/** Relleno de vidrio de un módulo; radio convertido con pxPerMm. */
export function buildGuidedGlassPathPx(
  x: number,
  y: number,
  w: number,
  h: number,
  glassShape: GuidedGlassShape,
  pxPerMm: number
): string {
  if (glassShape.kind !== "rounded") {
    return `M ${r2(x)} ${r2(y)} H ${r2(x + w)} V ${r2(y + h)} H ${r2(x)} Z`;
  }

  const radiusPx = Math.min(
    Math.max(glassShape.radiusMm * pxPerMm, 3),
    w / 2 - 0.5,
    h / 2 - 0.5
  );

  return buildRoundedRectPath(x, y, w, h, radiusPx, glassShape.corners);
}

function buildRoundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  corners: "all" | "top"
): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (radius < 0.5) {
    return `M ${r2(x)} ${r2(y)} H ${r2(x + w)} V ${r2(y + h)} H ${r2(x)} Z`;
  }

  if (corners === "top") {
    return [
      `M ${r2(x + radius)} ${r2(y)}`,
      `H ${r2(x + w - radius)}`,
      `Q ${r2(x + w)} ${r2(y)} ${r2(x + w)} ${r2(y + radius)}`,
      `V ${r2(y + h)}`,
      `H ${r2(x)}`,
      `V ${r2(y + radius)}`,
      `Q ${r2(x)} ${r2(y)} ${r2(x + radius)} ${r2(y)}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${r2(x + radius)} ${r2(y)}`,
    `H ${r2(x + w - radius)}`,
    `Q ${r2(x + w)} ${r2(y)} ${r2(x + w)} ${r2(y + radius)}`,
    `V ${r2(y + h - radius)}`,
    `Q ${r2(x + w)} ${r2(y + h)} ${r2(x + w - radius)} ${r2(y + h)}`,
    `H ${r2(x + radius)}`,
    `Q ${r2(x)} ${r2(y + h)} ${r2(x)} ${r2(y + h - radius)}`,
    `V ${r2(y + radius)}`,
    `Q ${r2(x)} ${r2(y)} ${r2(x + radius)} ${r2(y)}`,
    "Z",
  ].join(" ");
}
