export type ComponentSVGParams = {
  tipo: string;
  ancho: number | null;
  alto: number | null;
  colorHex?: string | null;
  maxW?: number;
  maxH?: number;
  variant?: "default" | "pdf";
};

type DrawingPalette = {
  frame: string;
  inner: string;
  glass: string;
  glassS: string;
  reflect1: string;
  reflect2: string;
  hw: string;
  dim: string;
  dimText: string;
  dash: string;
  label: string;
};

const PALETTE: DrawingPalette = {
  frame: "#222",
  inner: "#444",
  glass: "rgba(185,220,240,0.22)",
  glassS: "rgba(100,170,210,0.55)",
  reflect1: "rgba(255,255,255,0.55)",
  reflect2: "rgba(255,255,255,0.30)",
  hw: "#333",
  dim: "#aaa",
  dimText: "#888",
  dash: "#555",
  label: "#999",
};

const PDF_PALETTE: DrawingPalette = {
  frame: "#222",
  inner: "#444",
  glass: "rgba(185,220,240,0.28)",
  glassS: "rgba(100,170,210,0.6)",
  reflect1: "rgba(255,255,255,0.6)",
  reflect2: "rgba(255,255,255,0.6)",
  hw: "#444",
  dim: "#aaa",
  dimText: "#666",
  dash: "#444",
  label: "#b0b0b0",
};

const BASE_SIZES: Record<string, { w: number; h: number }> = {
  Ventana: { w: 160, h: 130 },
  Puerta: { w: 100, h: 160 },
  "Paño Fijo": { w: 140, h: 150 },
  "Shower door": { w: 95, h: 160 },
  "Cierre (Logia/Balcón)": { w: 200, h: 110 },
  Baranda: { w: 200, h: 80 },
  Espejo: { w: 110, h: 150 },
  "Tapa de mesa": { w: 180, h: 70 },
  Otro: { w: 130, h: 130 },
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function isValidHexColor(value: string | null | undefined): value is string {
  return Boolean(value && /^#([0-9a-f]{6})$/i.test(value));
}

function toRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function darkenHex(hex: string, amount: number) {
  const { r, g, b } = toRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function toRgba(hex: string, alpha: number) {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function resolveDrawingPalette(
  colorHex: string | null | undefined,
  variant: ComponentSVGParams["variant"]
): DrawingPalette {
  if (!isValidHexColor(colorHex)) {
    return variant === "pdf" ? PDF_PALETTE : PALETTE;
  }

  if (variant === "pdf") {
    return {
      ...PDF_PALETTE,
      frame: darkenHex(colorHex, 0.2),
      inner: darkenHex(colorHex, 0.34),
      hw: darkenHex(colorHex, 0.42),
      glassS: toRgba(colorHex, 0.45),
    };
  }

  return {
    ...PALETTE,
    frame: darkenHex(colorHex, 0.18),
    inner: darkenHex(colorHex, 0.3),
    hw: darkenHex(colorHex, 0.42),
    glassS: toRgba(colorHex, 0.38),
  };
}

function formatMm(value: number | null) {
  return value ? `${Math.round(value)} mm` : "— mm";
}

function normalizeComponentType(tipo: string) {
  const normalized = tipo.trim().toLowerCase();
  if (normalized.startsWith("vent")) return "Ventana";
  if (normalized.startsWith("puert")) return "Puerta";
  if (normalized.includes("fijo")) return "Paño Fijo";
  if (normalized.startsWith("show")) return "Shower door";
  if (normalized.startsWith("cier")) return "Cierre (Logia/Balcón)";
  if (normalized.startsWith("bar")) return "Baranda";
  if (normalized.startsWith("esp")) return "Espejo";
  if (normalized.startsWith("tap")) return "Tapa de mesa";
  return "Otro";
}

function buildReflections(
  x: number,
  y: number,
  w: number,
  h: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const primaryWidth = variant === "pdf" ? 1.3 : 2.2;
  const secondaryWidth = 1.3;
  return [
    `<line x1="${x + w * 0.16}" y1="${y + h * 0.14}" x2="${x + w * 0.34}" y2="${y + h * 0.31}" stroke="${palette.reflect1}" stroke-width="${primaryWidth}" stroke-linecap="round" />`,
    `<line x1="${x + w * 0.24}" y1="${y + h * 0.11}" x2="${x + w * 0.42}" y2="${y + h * 0.24}" stroke="${palette.reflect2}" stroke-width="${secondaryWidth}" stroke-linecap="round" />`,
  ].join("");
}

function buildArrowHead(
  x: number,
  y: number,
  direction: "left" | "right" | "up" | "down",
  stroke: string,
  strokeWidth: number
) {
  if (direction === "left") {
    return `<path d="M${x + 6} ${y - 4} L${x} ${y} L${x + 6} ${y + 4}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  if (direction === "right") {
    return `<path d="M${x - 6} ${y - 4} L${x} ${y} L${x - 6} ${y + 4}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  if (direction === "up") {
    return `<path d="M${x - 4} ${y + 6} L${x} ${y} L${x + 4} ${y + 6}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  return `<path d="M${x - 4} ${y - 6} L${x} ${y} L${x + 4} ${y - 6}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
}

function buildHorizontalDimension(
  x: number,
  y: number,
  w: number,
  text: string,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const tickHalf = variant === "pdf" ? 2 : 7;
  const strokeWidth = variant === "pdf" ? 0.7 : 1.1;
  const textSize = variant === "pdf" ? 7 : 11;
  const textWeight = variant === "pdf" ? "600" : "400";

  return [
    `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${palette.dim}" stroke-width="${strokeWidth}" />`,
    `<line x1="${x}" y1="${y - tickHalf}" x2="${x}" y2="${y + tickHalf}" stroke="${palette.dim}" stroke-width="${strokeWidth}" />`,
    `<line x1="${x + w}" y1="${y - tickHalf}" x2="${x + w}" y2="${y + tickHalf}" stroke="${palette.dim}" stroke-width="${strokeWidth}" />`,
    variant === "pdf" ? "" : buildArrowHead(x, y, "left", palette.dim, 1.1),
    variant === "pdf" ? "" : buildArrowHead(x + w, y, "right", palette.dim, 1.1),
    `<text x="${x + w / 2}" y="${y - 8}" text-anchor="middle" font-size="${textSize}" font-family="sans-serif" fill="${palette.dimText}" font-weight="${textWeight}">${escapeXml(text)}</text>`,
  ].join("");
}

function buildVerticalDimension(
  x: number,
  y: number,
  h: number,
  text: string,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const tickHalf = variant === "pdf" ? 2 : 7;
  const strokeWidth = variant === "pdf" ? 0.7 : 1.1;
  const textSize = variant === "pdf" ? 7 : 11;
  const textWeight = variant === "pdf" ? "600" : "400";

  return [
    `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + h}" stroke="${palette.dim}" stroke-width="${strokeWidth}" />`,
    `<line x1="${x - tickHalf}" y1="${y}" x2="${x + tickHalf}" y2="${y}" stroke="${palette.dim}" stroke-width="${strokeWidth}" />`,
    `<line x1="${x - tickHalf}" y1="${y + h}" x2="${x + tickHalf}" y2="${y + h}" stroke="${palette.dim}" stroke-width="${strokeWidth}" />`,
    variant === "pdf" ? "" : buildArrowHead(x, y, "up", palette.dim, 1.1),
    variant === "pdf" ? "" : buildArrowHead(x, y + h, "down", palette.dim, 1.1),
    `<text x="${x - 10}" y="${y + h / 2}" text-anchor="middle" font-size="${textSize}" font-family="sans-serif" fill="${palette.dimText}" font-weight="${textWeight}" transform="rotate(-90 ${x - 10} ${y + h / 2})">${escapeXml(text)}</text>`,
  ].join("");
}

function buildSlidingArrow(
  x: number,
  y: number,
  w: number,
  palette: DrawingPalette,
  reverse = false
) {
  const startX = reverse ? x + w : x;
  const endX = reverse ? x : x + w;
  const midY = y;
  return [
    `<line x1="${startX}" y1="${midY}" x2="${endX}" y2="${midY}" stroke="${palette.dash}" stroke-width="1" stroke-linecap="round" />`,
    buildArrowHead(startX, midY, reverse ? "right" : "left", palette.dash, 1),
    buildArrowHead(endX, midY, reverse ? "left" : "right", palette.dash, 1),
  ].join("");
}

// KEY CHANGE: frame is now a FILLED solid rect (not fill="none" stroke).
// Then a lighter inner rect expresses the open rebate, then the glass on top.
// This gives actual visual mass to the aluminium profile.
function buildCommonFrame(params: {
  x: number;
  y: number;
  w: number;
  h: number;
  frameStroke: number;
  innerStroke: number;
  palette: DrawingPalette;
}) {
  const f = params.frameStroke;
  const inset = f * 0.75;
  return [
    // Outer body — solid filled aluminium section
    `<rect x="${params.x}" y="${params.y}" width="${params.w}" height="${params.h}" rx="2" fill="${params.palette.frame}" stroke="${params.palette.inner}" stroke-width="0.6" />`,
    // Inner rebate face — slightly lighter, creates visible depth
    `<rect x="${params.x + f * 0.36}" y="${params.y + f * 0.36}" width="${params.w - f * 0.72}" height="${params.h - f * 0.72}" rx="1.5" fill="${params.palette.inner}" stroke="none" />`,
    // Glass pane
    `<rect x="${params.x + inset}" y="${params.y + inset}" width="${params.w - inset * 2}" height="${params.h - inset * 2}" rx="1" fill="${params.palette.glass}" stroke="${params.palette.glassS}" stroke-width="${params.innerStroke}" />`,
  ].join("");
}

// Ventana: filled mullion + shaped L-lever handles
function buildVentana(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const mid = x + w / 2;
  const handleY = y + h * 0.52;
  const mullW = Math.max(5, frameStroke * 0.9);
  const lW = Math.max(3, innerStroke * 1.5);
  const lH = Math.max(16, h * 0.12);
  const lArmW = Math.max(7, w * 0.052);
  const lArmH = Math.max(2.5, innerStroke * 1.3);
  const lOff = Math.max(8, w * 0.055);

  return [
    buildCommonFrame({ x, y, w, h, frameStroke, innerStroke, palette }),
    buildReflections(x, y, w, h, palette, variant),
    // Filled mullion — solid section, not a thin line
    `<rect x="${mid - mullW * 0.5}" y="${y + frameStroke * 0.85}" width="${mullW}" height="${h - frameStroke * 1.7}" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.5" />`,
    // Bottom track channel
    `<rect x="${x + frameStroke * 0.85}" y="${y + h - frameStroke * 1.15}" width="${w - frameStroke * 1.7}" height="${Math.max(1.5, frameStroke * 0.28)}" fill="${palette.inner}" />`,
    // Left handle: vertical backplate + horizontal arm (L-shape)
    `<rect x="${mid - lOff - lW}" y="${handleY - lH * 0.5}" width="${lW}" height="${lH}" rx="${lW * 0.5}" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<rect x="${mid - lOff - lW - lArmW}" y="${handleY - lArmH * 0.5}" width="${lArmW + lW * 0.4}" height="${lArmH}" rx="${lArmH * 0.5}" fill="${palette.hw}" />`,
    // Right handle: mirrored
    `<rect x="${mid + lOff}" y="${handleY - lH * 0.5}" width="${lW}" height="${lH}" rx="${lW * 0.5}" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<rect x="${mid + lOff + lW * 0.6}" y="${handleY - lArmH * 0.5}" width="${lArmW + lW * 0.4}" height="${lArmH}" rx="${lArmH * 0.5}" fill="${palette.hw}" />`,
    buildSlidingArrow(x + w * 0.14, y + h * 0.58, w * 0.22, palette, false),
    buildSlidingArrow(x + w * 0.64, y + h * 0.58, w * 0.22, palette, true),
  ].join("");
}

// Puerta: hinge plates with pin + lever handle + kick plate
function buildPuerta(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const transomY = y + h * 0.6;
  const hingeX = x - frameStroke * 0.5;
  const hingeW = Math.max(4, frameStroke * 0.95);
  const hingeH = Math.max(10, h * 0.12);
  const pinR = Math.max(1, hingeW * 0.22);
  const lvX = x + w - frameStroke * 1.85;
  const lvY = y + h * 0.56;
  const lvBodyW = Math.max(3, innerStroke * 1.5);
  const lvBodyH = Math.max(16, h * 0.11);
  const lvArmW = Math.max(8, frameStroke * 0.9);
  const lvArmH = Math.max(3, innerStroke * 1.3);
  const kickH = Math.max(7, h * 0.058);
  const kickY = y + h - frameStroke * 0.9 - kickH;

  return [
    buildCommonFrame({ x, y, w, h, frameStroke, innerStroke, palette }),
    // Lower panel fill
    `<rect x="${x + frameStroke * 0.85}" y="${transomY + innerStroke}" width="${w - frameStroke * 1.7}" height="${h - (transomY - y) - frameStroke * 0.9}" fill="rgba(30,30,30,0.11)" stroke="none" />`,
    buildReflections(x, y, w, h * 0.62, palette, variant),
    // Transom bar — filled section
    `<rect x="${x + frameStroke * 0.72}" y="${transomY - innerStroke * 1.2}" width="${w - frameStroke * 1.44}" height="${innerStroke * 2.4}" fill="${palette.inner}" />`,
    // Kick plate
    `<rect x="${x + frameStroke * 0.9}" y="${kickY}" width="${w - frameStroke * 1.8}" height="${kickH}" rx="1" fill="${palette.inner}" opacity="0.4" stroke="${palette.inner}" stroke-width="0.4" />`,
    // Hinge 1 — filled plate + pin
    `<rect x="${hingeX}" y="${y + h * 0.14}" width="${hingeW}" height="${hingeH}" rx="1.5" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<circle cx="${hingeX + hingeW * 0.5}" cy="${y + h * 0.14 + hingeH * 0.5}" r="${pinR}" fill="${palette.inner}" />`,
    // Hinge 2 — filled plate + pin
    `<rect x="${hingeX}" y="${y + h * 0.74}" width="${hingeW}" height="${hingeH}" rx="1.5" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<circle cx="${hingeX + hingeW * 0.5}" cy="${y + h * 0.74 + hingeH * 0.5}" r="${pinR}" fill="${palette.inner}" />`,
    // Lever: backplate + arm + tip
    `<rect x="${lvX - lvBodyW * 0.5}" y="${lvY - lvBodyH * 0.5}" width="${lvBodyW}" height="${lvBodyH}" rx="${lvBodyW * 0.5}" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<rect x="${lvX - lvBodyW * 0.5 - lvArmW}" y="${lvY - lvArmH * 0.5}" width="${lvArmW}" height="${lvArmH}" rx="${lvArmH * 0.5}" fill="${palette.hw}" />`,
    `<circle cx="${lvX - lvBodyW * 0.5 - lvArmW}" cy="${lvY}" r="${lvArmH * 0.7}" fill="${palette.hw}" />`,
    // Swing arc
    `<path d="M${x + frameStroke * 0.5} ${y + h * 0.2} A${w * 0.56} ${h * 0.42} 0 0 0 ${x + w * 0.14} ${y + h * 0.9}" fill="none" stroke="${palette.dash}" stroke-width="${innerStroke}" stroke-dasharray="5 4" />`,
  ].join("");
}

// Paño Fijo: X marks + FIJO badge
function buildPanoFijo(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const pillW = Math.max(40, w * 0.28);
  const pillH = Math.max(16, h * 0.11);
  const pillX = x + (w - pillW) / 2;
  const pillY = y + h / 2 - pillH / 2;
  const inset = frameStroke * 0.75;
  const mx = x + inset + 4;
  const my = y + inset + 4;
  const ms = Math.max(8, frameStroke * 1.1);

  return [
    buildCommonFrame({ x, y, w, h, frameStroke, innerStroke, palette }),
    buildReflections(x, y, w, h, palette, variant),
    // Standard fixed-pane X corner marks
    `<line x1="${mx}" y1="${my}" x2="${mx + ms}" y2="${my + ms}" stroke="${palette.label}" stroke-width="1" opacity="0.65" />`,
    `<line x1="${mx + ms}" y1="${my}" x2="${mx}" y2="${my + ms}" stroke="${palette.label}" stroke-width="1" opacity="0.65" />`,
    `<line x1="${x + w - inset - 4}" y1="${y + h - inset - 4}" x2="${x + w - inset - 4 - ms}" y2="${y + h - inset - 4 - ms}" stroke="${palette.label}" stroke-width="1" opacity="0.65" />`,
    `<line x1="${x + w - inset - 4 - ms}" y1="${y + h - inset - 4}" x2="${x + w - inset - 4}" y2="${y + h - inset - 4 - ms}" stroke="${palette.label}" stroke-width="1" opacity="0.65" />`,
    `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="rgba(255,255,255,0.72)" stroke="${palette.label}" stroke-width="1" />`,
    `<text x="${x + w / 2}" y="${pillY + pillH * 0.68}" text-anchor="middle" font-size="${clamp(pillH * 0.5, 8, 12)}" font-family="sans-serif" fill="${palette.label}" font-weight="700">FIJO</text>`,
  ].join("");
}

// Shower door: thick glass edge + wall-clamp hinges + bar handle + threshold
function buildShowerDoor(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const glassEdge = Math.max(3, frameStroke * 0.55);
  const clW = Math.max(5, frameStroke * 0.75);
  const clH = Math.max(10, h * 0.1);
  const wallW = Math.max(3, clW * 0.85);

  return [
    // Top rail — filled
    `<rect x="${x + glassEdge}" y="${y}" width="${w - glassEdge}" height="${frameStroke}" rx="1" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.5" />`,
    // Bottom rail — filled
    `<rect x="${x + glassEdge}" y="${y + h - frameStroke}" width="${w - glassEdge}" height="${frameStroke}" rx="1" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.5" />`,
    // Right jamb — filled
    `<rect x="${x + w - frameStroke}" y="${y}" width="${frameStroke}" height="${h}" rx="1" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.5" />`,
    // Glass panel
    `<rect x="${x + glassEdge}" y="${y + frameStroke * 0.55}" width="${w - glassEdge - frameStroke}" height="${h - frameStroke * 1.1}" fill="${palette.glass}" stroke="${palette.glassS}" stroke-width="${innerStroke * 1.2}" />`,
    buildReflections(x + glassEdge, y, w - glassEdge, h, palette, variant),
    // Glass front edge — thick line expressing the glass section thickness
    `<line x1="${x + glassEdge}" y1="${y + frameStroke * 0.55}" x2="${x + glassEdge}" y2="${y + h - frameStroke * 0.55}" stroke="${palette.glassS}" stroke-width="${glassEdge * 1.6}" stroke-linecap="butt" />`,
    // Hinge 1: body plate + wall plate
    `<rect x="${x - clW}" y="${y + h * 0.2}" width="${clW}" height="${clH}" rx="1.5" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<rect x="${x - clW - wallW}" y="${y + h * 0.2 + clH * 0.22}" width="${wallW}" height="${clH * 0.56}" rx="1" fill="${palette.hw}" opacity="0.7" />`,
    // Hinge 2: body plate + wall plate
    `<rect x="${x - clW}" y="${y + h * 0.67}" width="${clW}" height="${clH}" rx="1.5" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<rect x="${x - clW - wallW}" y="${y + h * 0.67 + clH * 0.22}" width="${wallW}" height="${clH * 0.56}" rx="1" fill="${palette.hw}" opacity="0.7" />`,
    // Pull bar
    `<rect x="${x + w - frameStroke * 1.35}" y="${y + h * 0.34}" width="${Math.max(3, innerStroke * 1.8)}" height="${h * 0.3}" rx="2" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    // Floor threshold strip
    `<rect x="${x + glassEdge}" y="${y + h}" width="${w - glassEdge}" height="${Math.max(2, frameStroke * 0.35)}" fill="${palette.inner}" opacity="0.5" />`,
    // Swing arc
    `<path d="M${x + glassEdge} ${y + h * 0.2} A${w * 0.66} ${h * 0.38} 0 0 0 ${x + w * 0.12} ${y + h * 0.88}" fill="none" stroke="${palette.dash}" stroke-width="${innerStroke}" stroke-dasharray="5 4" />`,
  ].join("");
}

// Cierre: filled mullions + paired handles + track
function buildCierre(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const third = w / 3;
  const divider1 = x + third;
  const divider2 = x + third * 2;
  const mullW = Math.max(5, frameStroke * 0.9);
  const handleW = Math.max(3, innerStroke * 1.4);
  const handleH = Math.max(16, h * 0.12);

  return [
    buildCommonFrame({ x, y, w, h, frameStroke, innerStroke, palette }),
    buildReflections(x, y, w, h, palette, variant),
    // Bottom track channel
    `<rect x="${x + frameStroke * 0.85}" y="${y + h - frameStroke * 1.15}" width="${w - frameStroke * 1.7}" height="${Math.max(1.5, frameStroke * 0.28)}" fill="${palette.inner}" />`,
    // Filled mullion 1
    `<rect x="${divider1 - mullW * 0.5}" y="${y + frameStroke * 0.85}" width="${mullW}" height="${h - frameStroke * 1.7}" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.4" />`,
    // Filled mullion 2
    `<rect x="${divider2 - mullW * 0.5}" y="${y + frameStroke * 0.85}" width="${mullW}" height="${h - frameStroke * 1.7}" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.4" />`,
    // Handle pair at mullion 1
    `<rect x="${divider1 - handleW - mullW * 0.5 - 4}" y="${y + h * 0.5 - handleH * 0.5}" width="${handleW}" height="${handleH}" rx="${handleW * 0.5}" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<rect x="${divider1 + mullW * 0.5 + 4}" y="${y + h * 0.5 - handleH * 0.5}" width="${handleW}" height="${handleH}" rx="${handleW * 0.5}" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    // Handle pair at mullion 2
    `<rect x="${divider2 - handleW - mullW * 0.5 - 4}" y="${y + h * 0.5 - handleH * 0.5}" width="${handleW}" height="${handleH}" rx="${handleW * 0.5}" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    `<rect x="${divider2 + mullW * 0.5 + 4}" y="${y + h * 0.5 - handleH * 0.5}" width="${handleW}" height="${handleH}" rx="${handleW * 0.5}" fill="${palette.hw}" stroke="${palette.inner}" stroke-width="0.4" />`,
    buildSlidingArrow(x + third * 0.2, y + h * 0.57, third * 0.44, palette, false),
    buildSlidingArrow(x + third * 2.34, y + h * 0.57, third * 0.44, palette, true),
  ].join("");
}

// Baranda: filled top/bottom rails + end posts + glass
function buildBaranda(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const railH = Math.max(7, h * 0.11);
  const glassY = y + railH;
  const glassH = h - railH * 2;
  const innerGap = w / 6;
  const postW = frameStroke * 1.4;

  return [
    // Glass first (below posts)
    `<rect x="${x + postW}" y="${glassY}" width="${w - postW * 2}" height="${glassH}" fill="${palette.glass}" stroke="${palette.glassS}" stroke-width="${innerStroke}" />`,
    buildReflections(x + postW, glassY, w - postW * 2, glassH, palette, variant),
    Array.from({ length: 5 }, (_, index) => {
      const px = x + innerGap * (index + 1);
      return `<line x1="${px}" y1="${glassY + 3}" x2="${px}" y2="${glassY + glassH - 3}" stroke="${palette.inner}" stroke-width="${innerStroke * 1.1}" opacity="0.50" />`;
    }).join(""),
    // Top handrail — filled with cap highlight
    `<rect x="${x}" y="${y}" width="${w}" height="${railH}" rx="1.5" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.5" />`,
    `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${Math.max(1.5, railH * 0.22)}" rx="1" fill="${palette.inner}" opacity="0.35" />`,
    // Bottom base channel — filled
    `<rect x="${x}" y="${y + h - railH}" width="${w}" height="${railH}" rx="1" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.5" />`,
    // End posts
    `<rect x="${x}" y="${y}" width="${postW}" height="${h}" fill="${palette.inner}" />`,
    `<rect x="${x + w - postW}" y="${y}" width="${postW}" height="${h}" fill="${palette.inner}" />`,
  ].join("");
}

// Espejo: filled frame profile + bevel ring + diagonal reflections
function buildEspejo(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  const innerInset = frameStroke * 1.5;
  const rx = x + innerInset;
  const ry = y + innerInset;
  const rw = w - innerInset * 2;
  const rh = h - innerInset * 2;

  return [
    // Outer frame — filled solid profile
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${palette.frame}" stroke="${palette.inner}" stroke-width="0.75" />`,
    // Inner rebate face
    `<rect x="${x + frameStroke * 0.36}" y="${y + frameStroke * 0.36}" width="${w - frameStroke * 0.72}" height="${h - frameStroke * 0.72}" rx="1.5" fill="${palette.inner}" stroke="none" />`,
    // Mirror surface
    `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="1.5" fill="rgba(205,220,230,0.52)" stroke="${palette.inner}" stroke-width="${innerStroke}" />`,
    // Bevel ring
    `<rect x="${rx + 3}" y="${ry + 3}" width="${rw - 6}" height="${rh - 6}" rx="1" fill="none" stroke="${palette.inner}" stroke-width="0.6" opacity="0.35" />`,
    // Main diagonal reflection
    `<path d="M${x + w * 0.18} ${y + h * 0.12} L${x + w * 0.64} ${y + h * 0.54} L${x + w * 0.52} ${y + h * 0.68} L${x + w * 0.1} ${y + h * 0.24} Z" fill="rgba(255,255,255,0.20)" />`,
    // Parallel highlights
    `<line x1="${rx + rw * 0.52}" y1="${ry + 4}" x2="${rx + rw * 0.78}" y2="${ry + rh * 0.36}" stroke="rgba(255,255,255,0.32)" stroke-width="1" stroke-linecap="round" />`,
    `<line x1="${rx + rw * 0.62}" y1="${ry + 4}" x2="${rx + rw * 0.86}" y2="${ry + rh * 0.28}" stroke="rgba(255,255,255,0.20)" stroke-width="0.8" stroke-linecap="round" />`,
    buildReflections(x, y, w, h, palette, variant),
  ].join("");
}

function buildMesa(x: number, y: number, w: number, h: number, innerStroke: number) {
  const offsetX = w * 0.18;
  const offsetY = h * 0.28;
  const thickness = Math.max(10, h * 0.16);
  const top = [
    [x + offsetX, y],
    [x + w, y],
    [x + w - offsetX, y + offsetY],
    [x, y + offsetY],
  ];
  const front = [
    [x, y + offsetY],
    [x + w - offsetX, y + offsetY],
    [x + w - offsetX, y + offsetY + thickness],
    [x, y + offsetY + thickness],
  ];
  const side = [
    [x + w - offsetX, y + offsetY],
    [x + w, y],
    [x + w, y + thickness],
    [x + w - offsetX, y + offsetY + thickness],
  ];
  const points = (values: number[][]) => values.map(([px, py]) => `${px},${py}`).join(" ");

  return [
    `<polygon points="${points(top)}" fill="${PALETTE.glass}" stroke="${PALETTE.frame}" stroke-width="${innerStroke * 1.7}" />`,
    `<polygon points="${points(front)}" fill="rgba(34,34,34,0.08)" stroke="${PALETTE.inner}" stroke-width="${innerStroke}" />`,
    `<polygon points="${points(side)}" fill="rgba(34,34,34,0.12)" stroke="${PALETTE.inner}" stroke-width="${innerStroke}" />`,
    `<line x1="${x + offsetX}" y1="${y + 2}" x2="${x + w - offsetX * 0.45}" y2="${y + 2}" stroke="${PALETTE.reflect1}" stroke-width="2" stroke-linecap="round" />`,
  ].join("");
}

function buildOtro(
  x: number,
  y: number,
  w: number,
  h: number,
  frameStroke: number,
  innerStroke: number,
  palette: DrawingPalette,
  variant: ComponentSVGParams["variant"]
) {
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${palette.glass}" stroke="${palette.frame}" stroke-width="${frameStroke}" stroke-dasharray="7 6" />`,
    buildReflections(x, y, w, h, palette, variant),
    `<line x1="${x + w / 2}" y1="${y + h * 0.34}" x2="${x + w / 2}" y2="${y + h * 0.56}" stroke="${palette.hw}" stroke-width="${innerStroke * 1.7}" stroke-linecap="round" />`,
    `<line x1="${x + w * 0.39}" y1="${y + h * 0.45}" x2="${x + w * 0.61}" y2="${y + h * 0.45}" stroke="${palette.hw}" stroke-width="${innerStroke * 1.7}" stroke-linecap="round" />`,
    `<text x="${x + w / 2}" y="${y + h * 0.72}" text-anchor="middle" font-size="11" font-family="sans-serif" fill="${palette.label}">OTRO / componente personalizado</text>`,
  ].join("");
}

function buildTypeLabel(type: string) {
  switch (type) {
    case "Ventana":
      return "Ventana corredera · 2 hojas";
    case "Puerta":
      return "Puerta batiente · 1 hoja";
    case "Paño Fijo":
      return "Paño fijo · vidrio continuo";
    case "Shower door":
      return "Shower door · batiente frameless";
    case "Cierre (Logia/Balcón)":
      return "Cierre logia/balcón · 3 hojas";
    case "Baranda":
      return "Baranda de vidrio";
    case "Espejo":
      return "Espejo decorativo";
    case "Tapa de mesa":
      return "Tapa de mesa · vista isométrica";
    default:
      return "Componente personalizado";
  }
}

export function generateComponentSVG(params: ComponentSVGParams): string {
  const variant = params.variant ?? "default";
  const resolvedType = normalizeComponentType(params.tipo);
  const fallbackBase = BASE_SIZES[resolvedType] ?? BASE_SIZES.Otro;
  const ratioW = params.ancho && params.alto ? params.ancho : fallbackBase.w;
  const ratioH = params.ancho && params.alto ? params.alto : fallbackBase.h;
  const maxW = params.maxW ?? 200;
  const maxH = params.maxH ?? 180;
  const scale = Math.min(maxW / ratioW, maxH / ratioH, 1.8);
  const drawW = Math.max(68, Math.round(ratioW * scale));
  const drawH = Math.max(52, Math.round(ratioH * scale));
  const dimLeft = resolvedType === "Tapa de mesa" ? 40 : 46;
  const dimBottom = variant === "pdf" ? 24 : 42;
  const topPad = variant === "pdf" ? 30 : 12;
  const rightPad = 12;
  const totalW = drawW + dimLeft + rightPad;
  const totalH = drawH + topPad + dimBottom;
  const originX = dimLeft;
  const originY = topPad;
  const frameStroke = variant === "pdf" ? 5 : clamp(Math.min(drawW, drawH) * 0.07, 4, 10);
  const innerStroke = variant === "pdf" ? 0.8 : clamp(frameStroke * 0.34, 1.1, 2.6);
  const palette = resolveDrawingPalette(params.colorHex, variant);
  const label = variant === "pdf" ? "" : buildTypeLabel(resolvedType);

  let drawing = "";

  switch (resolvedType) {
    case "Ventana":
      drawing = buildVentana(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
    case "Puerta":
      drawing = buildPuerta(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
    case "Paño Fijo":
      drawing = buildPanoFijo(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
    case "Shower door":
      drawing = buildShowerDoor(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
    case "Cierre (Logia/Balcón)":
      drawing = buildCierre(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
    case "Baranda":
      drawing = buildBaranda(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
    case "Espejo":
      drawing = buildEspejo(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
    case "Tapa de mesa":
      drawing = buildMesa(originX, originY + drawH * 0.1, drawW, drawH * 0.72, innerStroke);
      break;
    default:
      drawing = buildOtro(originX, originY, drawW, drawH, frameStroke, innerStroke, palette, variant);
      break;
  }

  const dimensions =
    resolvedType === "Tapa de mesa"
      ? buildVerticalDimension(
          originX - 22,
          originY + drawH * 0.28,
          Math.max(14, drawH * 0.16),
          formatMm(params.alto ?? 10),
          palette,
          variant
        )
      : [
          buildHorizontalDimension(
            originX,
            variant === "pdf" ? originY - 14 : originY + drawH + 18,
            drawW,
            formatMm(params.ancho),
            palette,
            variant
          ),
          buildVerticalDimension(originX - 20, originY, drawH, formatMm(params.alto), palette, variant),
        ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" aria-hidden="true" role="img">`,
    "<g>",
    drawing,
    dimensions,
    label
      ? `<text x="${originX + drawW / 2}" y="${totalH - 8}" text-anchor="middle" font-size="11" font-family="sans-serif" fill="${palette.label}" font-weight="600">${escapeXml(label)}</text>`
      : "",
    "</g>",
    "</svg>",
  ].join("");
}