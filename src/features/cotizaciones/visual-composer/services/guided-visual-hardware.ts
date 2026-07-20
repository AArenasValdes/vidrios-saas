/**
 * Herrajes técnicos del croquis guiado (manillas / tiradores).
 * Estilo: línea limpia, placas redondeadas, sin rellenos ruidosos.
 */

import type { GuidedOpeningSide } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

export type GuidedHardwareKind =
  | "manilla_abatible"
  | "cremona_ventana"
  | "manilla_oscilobatiente"
  | "tirador_corredera_embutido"
  | "tirador_puerta_corredera";

export type GuidedHardwareDrawInput = {
  kind: GuidedHardwareKind;
  /** Centro del herraje (eje de la placa). */
  cx: number;
  cy: number;
  /** Escala base en px (alto aproximado de la placa). */
  size: number;
  /** Lado libre de la hoja: ahí va el herraje. */
  freeSide: GuidedOpeningSide;
  stroke: string;
  strokeWidth: number;
  /** Relleno suave para huecos de tirador embutido. */
  recessFill?: string;
};

/**
 * Dibuja un herraje técnico. Coordenadas en px del SVG del croquis.
 */
export function drawGuidedHardware(input: GuidedHardwareDrawInput): string {
  const size = Math.max(10, input.size);
  const stroke = Math.max(0.9, Math.min(2.2, input.strokeWidth));
  const attrs = [
    `stroke="${input.stroke}"`,
    `stroke-width="${r2(stroke)}"`,
    'stroke-linecap="round"',
    'stroke-linejoin="round"',
    'fill="none"',
    'vector-effect="non-scaling-stroke"',
  ].join(" ");

  switch (input.kind) {
    case "manilla_abatible":
      return drawManillaAbatible(input.cx, input.cy, size, input.freeSide, attrs, input.stroke);
    case "cremona_ventana":
      return drawCremonaVentana(input.cx, input.cy, size, attrs, input.stroke);
    case "manilla_oscilobatiente":
      return drawManillaOscilobatiente(input.cx, input.cy, size, attrs, input.stroke);
    case "tirador_corredera_embutido":
      return drawTiradorEmbutido(
        input.cx,
        input.cy,
        size,
        attrs,
        input.recessFill ?? "rgba(148, 163, 184, 0.22)",
        false
      );
    case "tirador_puerta_corredera":
      return drawTiradorEmbutido(
        input.cx,
        input.cy,
        size,
        attrs,
        input.recessFill ?? "rgba(148, 163, 184, 0.28)",
        true
      );
    default:
      return "";
  }
}

/** Placa vertical + manilla horizontal hacia el centro del vano. */
function drawManillaAbatible(
  cx: number,
  cy: number,
  size: number,
  freeSide: GuidedOpeningSide,
  attrs: string,
  strokeColor: string
): string {
  const plateW = size * 0.34;
  const plateH = size;
  const rx = Math.min(plateW * 0.28, 3.2);
  const plateX = cx - plateW / 2;
  const plateY = cy - plateH / 2;
  const hubR = Math.max(2.2, plateW * 0.38);
  const hubCy = cy - plateH * 0.12;
  const leverLen = size * 0.72;
  const leverH = Math.max(2.8, size * 0.16);
  const towardCenter = freeSide === "left" ? 1 : -1;
  const leverStartX = cx + towardCenter * hubR * 0.2;
  const leverEndX = cx + towardCenter * leverLen;
  const leverY = hubCy;
  const leverX = Math.min(leverStartX, leverEndX);
  const leverWidth = Math.abs(leverEndX - leverStartX);

  return [
    `<g data-guided-hardware="manilla_abatible">`,
    `<rect x="${r2(plateX)}" y="${r2(plateY)}" width="${r2(plateW)}" height="${r2(plateH)}" rx="${r2(rx)}" ry="${r2(rx)}" ${attrs} />`,
    `<circle cx="${r2(cx)}" cy="${r2(hubCy)}" r="${r2(hubR)}" ${attrs} />`,
    `<circle cx="${r2(cx)}" cy="${r2(hubCy)}" r="${r2(hubR * 0.28)}" fill="${strokeColor}" stroke="none" />`,
    `<rect x="${r2(leverX)}" y="${r2(leverY - leverH / 2)}" width="${r2(leverWidth)}" height="${r2(leverH)}" rx="${r2(leverH / 2)}" ry="${r2(leverH / 2)}" ${attrs} />`,
    `</g>`,
  ].join("");
}

/** Cremona: placa fina con tornillos + manilla vertical. */
function drawCremonaVentana(
  cx: number,
  cy: number,
  size: number,
  attrs: string,
  strokeColor: string
): string {
  const plateW = size * 0.18;
  const plateH = size * 1.35;
  const plateX = cx - plateW / 2;
  const plateY = cy - plateH / 2;
  const endR = plateW / 2;
  const screwR = Math.max(1.4, plateW * 0.42);
  const topScrewY = plateY + endR + screwR * 0.15;
  const botScrewY = plateY + plateH - endR - screwR * 0.15;
  const handleTop = cy - size * 0.02;
  const handleBottom = cy + size * 0.55;
  const handleW = Math.max(2.4, size * 0.14);

  return [
    `<g data-guided-hardware="cremona_ventana">`,
    `<path d="M ${r2(plateX)} ${r2(plateY + endR)} V ${r2(plateY + plateH - endR)} A ${r2(endR)} ${r2(endR)} 0 0 0 ${r2(plateX + plateW)} ${r2(plateY + plateH - endR)} V ${r2(plateY + endR)} A ${r2(endR)} ${r2(endR)} 0 0 0 ${r2(plateX)} ${r2(plateY + endR)} Z" ${attrs} />`,
    drawScrew(cx, topScrewY, screwR, strokeColor, attrs),
    drawScrew(cx, botScrewY, screwR, strokeColor, attrs),
    `<path d="M ${r2(cx - handleW * 0.55)} ${r2(handleTop)} C ${r2(cx - handleW * 0.7)} ${r2(handleTop + size * 0.12)}, ${r2(cx - handleW * 0.45)} ${r2(handleBottom - size * 0.08)}, ${r2(cx)} ${r2(handleBottom)} C ${r2(cx + handleW * 0.45)} ${r2(handleBottom - size * 0.08)}, ${r2(cx + handleW * 0.7)} ${r2(handleTop + size * 0.12)}, ${r2(cx + handleW * 0.55)} ${r2(handleTop)} Z" ${attrs} />`,
    `</g>`,
  ].join("");
}

/** Manilla vertical de oscilobatiente (placa corta + palanca hacia abajo). */
function drawManillaOscilobatiente(
  cx: number,
  cy: number,
  size: number,
  attrs: string,
  strokeColor: string
): string {
  const plateW = size * 0.42;
  const plateH = size * 0.72;
  const rx = Math.min(plateW * 0.22, 3);
  const plateX = cx - plateW / 2;
  const plateY = cy - plateH * 0.55;
  const hubR = Math.max(2, plateW * 0.28);
  const hubCy = plateY + plateH * 0.42;
  const handleTop = hubCy + hubR * 0.2;
  const handleBottom = cy + size * 0.72;
  const handleW = Math.max(2.6, size * 0.16);

  return [
    `<g data-guided-hardware="manilla_oscilobatiente">`,
    `<rect x="${r2(plateX)}" y="${r2(plateY)}" width="${r2(plateW)}" height="${r2(plateH)}" rx="${r2(rx)}" ry="${r2(rx)}" ${attrs} />`,
    `<circle cx="${r2(cx)}" cy="${r2(hubCy)}" r="${r2(hubR)}" ${attrs} />`,
    `<circle cx="${r2(cx)}" cy="${r2(hubCy)}" r="${r2(hubR * 0.32)}" fill="${strokeColor}" stroke="none" />`,
    `<path d="M ${r2(cx - handleW * 0.55)} ${r2(handleTop)} C ${r2(cx - handleW * 0.75)} ${r2(handleTop + size * 0.18)}, ${r2(cx - handleW * 0.4)} ${r2(handleBottom - size * 0.1)}, ${r2(cx)} ${r2(handleBottom)} C ${r2(cx + handleW * 0.4)} ${r2(handleBottom - size * 0.1)}, ${r2(cx + handleW * 0.75)} ${r2(handleTop + size * 0.18)}, ${r2(cx + handleW * 0.55)} ${r2(handleTop)} Z" ${attrs} />`,
    `</g>`,
  ].join("");
}

/** Tirador embutido (ventana o puerta corredera). */
function drawTiradorEmbutido(
  cx: number,
  cy: number,
  size: number,
  attrs: string,
  recessFill: string,
  doorScale: boolean
): string {
  const plateW = size * (doorScale ? 0.48 : 0.32);
  const plateH = size * (doorScale ? 1.15 : 1.05);
  const outerRx = Math.min(plateW * 0.28, doorScale ? 5 : 3.5);
  const inset = Math.max(1.6, plateW * 0.18);
  const plateX = cx - plateW / 2;
  const plateY = cy - plateH / 2;
  const innerW = Math.max(2, plateW - inset * 2);
  const innerH = Math.max(4, plateH - inset * 2);
  const innerRx = Math.max(1.2, outerRx * 0.65);

  return [
    `<g data-guided-hardware="${doorScale ? "tirador_puerta_corredera" : "tirador_corredera_embutido"}">`,
    `<rect x="${r2(plateX)}" y="${r2(plateY)}" width="${r2(plateW)}" height="${r2(plateH)}" rx="${r2(outerRx)}" ry="${r2(outerRx)}" ${attrs} />`,
    `<rect x="${r2(plateX + inset)}" y="${r2(plateY + inset)}" width="${r2(innerW)}" height="${r2(innerH)}" rx="${r2(innerRx)}" ry="${r2(innerRx)}" fill="${recessFill}" ${attrs} />`,
    `</g>`,
  ].join("");
}

function drawScrew(
  cx: number,
  cy: number,
  r: number,
  strokeColor: string,
  attrs: string
): string {
  const arm = r * 0.55;
  return [
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" ${attrs} />`,
    `<line x1="${r2(cx - arm)}" y1="${r2(cy)}" x2="${r2(cx + arm)}" y2="${r2(cy)}" stroke="${strokeColor}" stroke-width="${r2(Math.max(0.7, r * 0.28))}" stroke-linecap="round" />`,
    `<line x1="${r2(cx)}" y1="${r2(cy - arm)}" x2="${r2(cx)}" y2="${r2(cy + arm)}" stroke="${strokeColor}" stroke-width="${r2(Math.max(0.7, r * 0.28))}" stroke-linecap="round" />`,
  ].join("");
}

/** Posición del herraje sobre el lado libre de la hoja. */
export function resolveHardwareAnchor(input: {
  x: number;
  y: number;
  w: number;
  h: number;
  freeSide: GuidedOpeningSide;
  /** 0–1 desde el borde libre hacia el interior. */
  insetRatio?: number;
  /** 0–1 vertical (0.5 = centro). */
  verticalRatio?: number;
}): { cx: number; cy: number; freeSide: GuidedOpeningSide } {
  const insetRatio = input.insetRatio ?? 0.12;
  const verticalRatio = input.verticalRatio ?? 0.5;
  const insetX = Math.max(8, input.w * insetRatio);
  const cx =
    input.freeSide === "left" ? input.x + insetX : input.x + input.w - insetX;
  const cy = input.y + input.h * verticalRatio;
  return { cx, cy, freeSide: input.freeSide };
}

/** Escala de herraje acotada al tamaño de la hoja. */
export function resolveHardwareSize(w: number, h: number, variant: "compact" | "normal" = "normal") {
  const base = Math.min(w, h);
  const factor = variant === "compact" ? 0.11 : 0.14;
  return Math.max(14, Math.min(variant === "compact" ? 28 : 42, base * factor));
}
