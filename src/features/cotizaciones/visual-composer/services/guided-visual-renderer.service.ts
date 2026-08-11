import {
  calculateNodeRects,
  calculatePalilloRects,
  describeGuidedVisualConfig,
  ensureGuidedVisualConfig,
  GUIDED_MODULE_TYPE_LABELS,
  isModuleNode,
  listLeafModules,
  normalizeGuidedVisualConfig,
  type GuidedFrameShape,
  type GuidedGlassShape,
  type GuidedModuleType,
  type GuidedNodeRect,
  type GuidedOpeningSide,
  type GuidedPalillo,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  buildGuidedFramePath,
  buildGuidedGlassPathPx,
} from "@/features/cotizaciones/visual-composer/services/guided-visual-shape-paths";
import {
  drawGuidedHardware,
  resolveHardwareAnchor,
  resolveHardwareSize,
} from "@/features/cotizaciones/visual-composer/services/guided-visual-hardware";

export type GuidedRenderVariant = "editor" | "thumbnail" | "summary" | "pdf";

export type GuidedVisualRenderOptions = {
  maxW?: number;
  maxH?: number;
  colorHex?: string | null;
  variant?: GuidedRenderVariant | "default";
  showSelection?: boolean;
  showLabels?: boolean;
  showDimensions?: boolean;
  /** Aisla defs SVG cuando la misma configuracion se renderiza varias veces en una pagina. */
  resourceKey?: string;
  /** Módulo en modo edición de palillos (atenuá el resto). */
  palilloEditModuleId?: string | null;
  selectedPalilloNodeId?: string | null;
};

export type GuidedLayoutPalilloSegment = {
  id: string;
  direction: "vertical" | "horizontal";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  selected: boolean;
};

export type GuidedLayoutPalilloCell = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  selected: boolean;
};

export type GuidedLayoutModule = {
  id: string;
  leafIndex: number;
  type: GuidedModuleType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  widthMm: number;
  heightMm: number;
  selected: boolean;
  glassShape: GuidedGlassShape;
  openingSide: GuidedOpeningSide;
  /** Compat / proyección plana. */
  palillos: Array<GuidedPalillo & { x1: number; y1: number; x2: number; y2: number }>;
  /** Segmentos reales del árbol (pueden ser parciales). */
  palilloSegments: GuidedLayoutPalilloSegment[];
  palilloCells: GuidedLayoutPalilloCell[];
};

export type GuidedLayoutSplit = {
  id: string;
  direction: "vertical" | "horizontal";
  ratio: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dividerX?: number;
  dividerY?: number;
  selected: boolean;
  firstSizeMm: number;
  secondSizeMm: number;
};

export type GuidedVisualLayout = {
  widthMm: number;
  heightMm: number;
  svgW: number;
  svgH: number;
  originX: number;
  originY: number;
  drawW: number;
  drawH: number;
  pxPerMm: number;
  frameShape: GuidedFrameShape;
  modules: GuidedLayoutModule[];
  splits: GuidedLayoutSplit[];
};

type StrokeScale = {
  frame: number;
  mullion: number;
  sash: number;
  meeting: number;
  palillo: number;
  cue: number;
  dim: number;
  selection: number;
  halo: number;
};

export type ProfilePalette = {
  frame: string;
  frameInner: string;
  frameOutline: string | null;
  div: string;
  divInner: string;
  palillo: string;
  detail: string;
  dimTxt: string;
  label: string;
  selection: string;
  selectionFill: string;
  glassFill: string;
  glassFillMuted: string;
  canvasBg: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function px(n: number) {
  return String(Math.round(n * 10) / 10);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isValidHex(value: string | null | undefined): value is string {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function mixHex(hex: string, toward: "#000000" | "#FFFFFF", amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const t = toward === "#000000" ? 0 : 255;
  const mix = (channel: number) =>
    clamp(Math.round(channel + (t - channel) * amount), 0, 255)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function resolveVariant(
  variant: GuidedVisualRenderOptions["variant"]
): GuidedRenderVariant {
  if (!variant || variant === "default") {
    return "editor";
  }
  return variant;
}

function resolveStrokeScale(variant: GuidedRenderVariant): StrokeScale {
  if (variant === "thumbnail") {
    return {
      frame: 5,
      mullion: 3.2,
      sash: 3,
      meeting: 5,
      palillo: 1.4,
      cue: 1,
      dim: 1,
      selection: 0,
      halo: 0,
    };
  }
  if (variant === "pdf") {
    return {
      frame: 10,
      mullion: 6.5,
      sash: 6,
      meeting: 10,
      palillo: 2.2,
      cue: 1.2,
      dim: 1,
      selection: 0,
      halo: 0,
    };
  }
  if (variant === "summary") {
    return {
      frame: 12,
      mullion: 7.5,
      sash: 7,
      meeting: 12,
      palillo: 2,
      cue: 1.3,
      dim: 1,
      selection: 0,
      halo: 0,
    };
  }
  // Editor: marco y encuentro dominantes; hojas secundarias; símbolos informativos finos.
  return {
    frame: 22,
    mullion: 14,
    sash: 12,
    meeting: 22,
    palillo: 4,
    cue: 1.5,
    dim: 1,
    selection: 3,
    halo: 5,
  };
}

/** Expone la escala de trazos por variante (útil para tests visuales). */
export function getGuidedStrokeScale(variant: GuidedRenderVariant): StrokeScale {
  return resolveStrokeScale(variant);
}

/**
 * Evita que los perfiles de ancho fijo consuman demasiado vidrio cuando una
 * pieza muy alta o muy ancha se ajusta dentro de un preview compacto.
 * El PDF conserva su escala estable; Constructor, resumen y miniaturas se
 * adaptan al lado visible más estrecho sin alterar la proporción del vano.
 */
export function getGuidedResponsiveStrokeScale(
  variant: GuidedRenderVariant,
  layout: Pick<GuidedVisualLayout, "drawW" | "drawH">
): StrokeScale {
  const base = resolveStrokeScale(variant);
  if (variant === "pdf") {
    return base;
  }

  const narrowSide = Math.max(1, Math.min(layout.drawW, layout.drawH));
  const frameFloor =
    variant === "thumbnail" ? 2.6 : variant === "summary" ? 4.5 : 6;
  const responsiveFrame = clamp(narrowSide * 0.11, frameFloor, base.frame);
  const factor = responsiveFrame / base.frame;
  if (factor >= 0.995) {
    return base;
  }

  return {
    frame: responsiveFrame,
    mullion: Math.max(2.4, base.mullion * factor),
    sash: Math.max(2.2, base.sash * factor),
    meeting: Math.max(frameFloor, base.meeting * factor),
    palillo: Math.max(1.2, base.palillo * factor),
    cue: Math.max(0.9, base.cue * factor),
    dim: base.dim,
    selection: base.selection > 0 ? Math.max(1.4, base.selection * factor) : 0,
    halo: base.halo > 0 ? Math.max(2.2, base.halo * factor) : 0,
  };
}

/**
 * Vidrio = relleno de la celda del módulo. El aluminio (marco/encuentro)
 * se pinta encima con stroke centrado; no hay que “achicar” el vidrio con
 * insets asimétricos (eso dejaba huecos blancos y parecía desfasado).
 */
export function resolveModuleGlassRect(
  module: Pick<GuidedLayoutModule, "x" | "y" | "w" | "h">
): { x: number; y: number; w: number; h: number } {
  return { x: module.x, y: module.y, w: module.w, h: module.h };
}

/**
 * Rectángulo de hoja/símbolos, inset uniforme y acotado al tamaño del módulo
 * para no colapsar en franjas muy delgadas.
 */
export function resolveModuleSashRect(
  module: Pick<GuidedLayoutModule, "x" | "y" | "w" | "h">,
  scale: StrokeScale
): { x: number; y: number; w: number; h: number } {
  const maxInset = Math.min(module.w, module.h) * 0.22;
  const inset = Math.max(2.5, Math.min(maxInset, scale.sash * 0.55 + 2));
  return {
    x: module.x + inset,
    y: module.y + inset,
    w: Math.max(0, module.w - inset * 2),
    h: Math.max(0, module.h - inset * 2),
  };
}

/** @deprecated Usar resolveModuleGlassRect / resolveModuleSashRect. */
export function resolveModuleContentRect(
  module: Pick<GuidedLayoutModule, "x" | "y" | "w" | "h">,
  _layout: Pick<GuidedVisualLayout, "originX" | "originY" | "drawW" | "drawH">,
  scale: StrokeScale
): { x: number; y: number; w: number; h: number } {
  return resolveModuleSashRect(module, scale);
}

/** Expone la paleta resuelta (útil para tests de contraste). */
export function getGuidedProfilePalette(
  colorHex: string | null | undefined,
  variant: GuidedRenderVariant = "editor"
): ProfilePalette {
  return resolvePalette(colorHex, variant);
}

function resolvePalette(
  colorHex: string | null | undefined,
  variant: GuidedRenderVariant
): ProfilePalette {
  const selection = "#1E88FF";
  const selectionFill = "rgba(30, 136, 255, 0.045)";
  // Fondos opacos: evita que el vidrio se vea “negro” sobre canvas claro o en export.
  const glassFill = variant === "pdf" ? "#F3F4F6" : "#ECF2F8";
  const glassFillMuted = variant === "pdf" ? "#EEF0F3" : "#D8E0E8";
  const canvasBg = variant === "pdf" ? "#FFFFFF" : "#FAFBFC";

  if (!isValidHex(colorHex)) {
    const frame = variant === "pdf" ? "#6B7280" : "#8A96A6";
    return {
      frame,
      frameInner: mixHex(frame, "#000000", 0.22),
      frameOutline: null,
      div: mixHex(frame, "#000000", 0.12),
      divInner: mixHex(frame, "#000000", 0.28),
      palillo: mixHex(frame, "#000000", 0.18),
      detail: "#475569",
      dimTxt: "#6B7280",
      label: "#64748B",
      selection,
      selectionFill,
      glassFill,
      glassFillMuted,
      canvasBg,
    };
  }

  const lum = relativeLuminance(colorHex);
  const isLight = lum > 0.72;
  const isDark = lum < 0.22;
  const frame = colorHex;
  const frameInner = isDark
    ? mixHex(colorHex, "#FFFFFF", 0.28)
    : mixHex(colorHex, "#000000", 0.22);
  const frameOutline = isLight ? mixHex(colorHex, "#000000", 0.42) : null;

  return {
    frame,
    frameInner,
    frameOutline,
    div: isDark ? mixHex(colorHex, "#FFFFFF", 0.12) : mixHex(colorHex, "#000000", 0.1),
    divInner: isDark
      ? mixHex(colorHex, "#FFFFFF", 0.32)
      : mixHex(colorHex, "#000000", 0.28),
    palillo: isDark
      ? mixHex(colorHex, "#FFFFFF", 0.18)
      : mixHex(colorHex, "#000000", 0.16),
    detail: "#334155",
    dimTxt: "#6B7280",
    label: "#64748B",
    selection,
    selectionFill,
    glassFill,
    glassFillMuted,
    canvasBg,
  };
}

const PROFILE_JOIN =
  'stroke-linecap="square" stroke-linejoin="miter" vector-effect="non-scaling-stroke"';

/** Marco exterior esquemático de aluminio (doble contorno; soporta arco). */
export function drawOuterAluminumFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  palette: ProfilePalette,
  stroke: number,
  frameShape: GuidedFrameShape = { kind: "rect" },
  pxPerMm = 1
): string {
  const outer = buildGuidedFramePath(x, y, w, h, frameShape, pxPerMm);
  const inset = Math.max(2.2, stroke * 0.42);
  const insetMm = inset / Math.max(pxPerMm, 0.001);
  const innerShape: GuidedFrameShape =
    frameShape.kind === "arch_top"
      ? {
          kind: "arch_top",
          archRiseMm: Math.max(20, frameShape.archRiseMm - insetMm),
        }
      : frameShape.kind === "rounded"
        ? {
            kind: "rounded",
            radiusMm: Math.max(4, frameShape.radiusMm - insetMm),
            corners: frameShape.corners,
          }
        : { kind: "rect" };
  const inner = buildGuidedFramePath(
    x + inset,
    y + inset,
    Math.max(0, w - inset * 2),
    Math.max(0, h - inset * 2),
    innerShape,
    pxPerMm
  );
  const parts: string[] = [];
  if (palette.frameOutline) {
    parts.push(
      `<path d="${outer}" fill="none" stroke="${palette.frameOutline}" stroke-width="${px(stroke + 3)}" ${PROFILE_JOIN} />`
    );
  }
  parts.push(
    `<path d="${outer}" fill="none" stroke="${palette.frame}" stroke-width="${px(stroke)}" ${PROFILE_JOIN} />`,
    `<path d="${inner}" fill="none" stroke="${palette.frameInner}" stroke-width="${px(Math.max(1.2, stroke * 0.34))}" ${PROFILE_JOIN} />`
  );
  return parts.join("");
}

/** Montante vertical estructural. */
export function drawVerticalMullion(
  x: number,
  y1: number,
  y2: number,
  palette: ProfilePalette,
  stroke: number,
  emphasized = false
): string {
  const color = emphasized ? palette.selection : palette.div;
  const inner = emphasized ? mixHex("#1E88FF", "#FFFFFF", 0.35) : palette.divInner;
  const parts: string[] = [];
  if (!emphasized && palette.frameOutline) {
    parts.push(
      `<line x1="${px(x)}" y1="${px(y1)}" x2="${px(x)}" y2="${px(y2)}" stroke="${palette.frameOutline}" stroke-width="${px(stroke + 2.2)}" ${PROFILE_JOIN} />`
    );
  }
  parts.push(
    `<line x1="${px(x)}" y1="${px(y1)}" x2="${px(x)}" y2="${px(y2)}" stroke="${color}" stroke-width="${px(stroke)}" ${PROFILE_JOIN} />`,
    `<line x1="${px(x)}" y1="${px(y1)}" x2="${px(x)}" y2="${px(y2)}" stroke="${inner}" stroke-width="${px(Math.max(1, stroke * 0.32))}" ${PROFILE_JOIN} />`
  );
  return parts.join("");
}

/** Travesaño horizontal estructural. */
export function drawHorizontalTransom(
  y: number,
  x1: number,
  x2: number,
  palette: ProfilePalette,
  stroke: number,
  emphasized = false
): string {
  const color = emphasized ? palette.selection : palette.div;
  const inner = emphasized ? mixHex("#1E88FF", "#FFFFFF", 0.35) : palette.divInner;
  const parts: string[] = [];
  if (!emphasized && palette.frameOutline) {
    parts.push(
      `<line x1="${px(x1)}" y1="${px(y)}" x2="${px(x2)}" y2="${px(y)}" stroke="${palette.frameOutline}" stroke-width="${px(stroke + 2.2)}" ${PROFILE_JOIN} />`
    );
  }
  parts.push(
    `<line x1="${px(x1)}" y1="${px(y)}" x2="${px(x2)}" y2="${px(y)}" stroke="${color}" stroke-width="${px(stroke)}" ${PROFILE_JOIN} />`,
    `<line x1="${px(x1)}" y1="${px(y)}" x2="${px(x2)}" y2="${px(y)}" stroke="${inner}" stroke-width="${px(Math.max(1, stroke * 0.32))}" ${PROFILE_JOIN} />`
  );
  return parts.join("");
}

function drawLayeredSashFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  palette: ProfilePalette,
  stroke: number,
  role: string
): string {
  const inset = Math.max(2, stroke * 0.34);
  const outline = palette.frameOutline ?? palette.divInner;
  return [
    `<rect data-guided-profile="${role}" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${outline}" stroke-width="${px(stroke + 2.4)}" ${PROFILE_JOIN} />`,
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${palette.div}" stroke-width="${px(stroke)}" ${PROFILE_JOIN} />`,
    `<rect x="${px(x + inset)}" y="${px(y + inset)}" width="${px(Math.max(0, w - inset * 2))}" height="${px(Math.max(0, h - inset * 2))}" fill="none" stroke="${palette.frameInner}" stroke-width="${px(Math.max(1, stroke * 0.13))}" ${PROFILE_JOIN} />`,
  ].join("");
}

function drawOperableSashFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  palette: ProfilePalette,
  scale: StrokeScale
): string {
  return drawLayeredSashFrame(x, y, w, h, palette, scale.sash, "operable-sash");
}

function drawSlidingSystem(
  x: number,
  y: number,
  w: number,
  h: number,
  palette: ProfilePalette,
  scale: StrokeScale,
  variant: GuidedRenderVariant
): string {
  const top = y;
  const height = Math.max(0, h);
  const centerX = x + w / 2;
  const meetingWidth = Math.min(scale.meeting, Math.max(5, w * 0.11));
  const sideGap = Math.max(2, scale.sash * 0.14);
  const leftX = x;
  const leftW = Math.max(0, centerX - meetingWidth / 2 - sideGap - leftX);
  const rightX = centerX + meetingWidth / 2 + sideGap;
  const rightW = Math.max(0, x + w - rightX);
  const outline = palette.frameOutline ?? palette.divInner;
  const parts = [
    drawLayeredSashFrame(leftX, top, leftW, height, palette, scale.sash, "sliding-sash-left"),
    drawLayeredSashFrame(rightX, top, rightW, height, palette, scale.sash, "sliding-sash-right"),
    `<rect data-guided-profile="meeting-stile" x="${px(centerX - meetingWidth / 2)}" y="${px(top - scale.sash * 0.18)}" width="${px(meetingWidth)}" height="${px(height + scale.sash * 0.36)}" fill="${palette.frame}" stroke="${outline}" stroke-width="${px(Math.max(1.5, scale.sash * 0.2))}" ${PROFILE_JOIN} />`,
    `<line x1="${px(centerX - meetingWidth * 0.22)}" y1="${px(top)}" x2="${px(centerX - meetingWidth * 0.22)}" y2="${px(top + height)}" stroke="${palette.frameInner}" stroke-width="${px(Math.max(1, scale.sash * 0.12))}" ${PROFILE_JOIN} />`,
    `<line x1="${px(centerX + meetingWidth * 0.22)}" y1="${px(top)}" x2="${px(centerX + meetingWidth * 0.22)}" y2="${px(top + height)}" stroke="${palette.divInner}" stroke-width="${px(Math.max(1, scale.sash * 0.12))}" ${PROFILE_JOIN} />`,
  ];

  {
    const arrowLength = Math.max(
      variant === "thumbnail" ? 8 : 13,
      Math.min(variant === "thumbnail" ? 18 : 34, w * 0.1)
    );
    const arrowSize = Math.max(3.2, scale.cue * 2.2);
    const arrowY = y + h / 2;
    const leftArrowX = leftX + leftW * 0.62;
    const rightArrowX = rightX + rightW * 0.38;
    const pullSize = resolveHardwareSize(Math.min(leftW, rightW, h), h, "compact");
    const leftPull = resolveHardwareAnchor({
      x: leftX,
      y: top,
      w: leftW,
      h: height,
      freeSide: "right",
      insetRatio: 0.18,
      verticalRatio: 0.5,
    });
    const rightPull = resolveHardwareAnchor({
      x: rightX,
      y: top,
      w: rightW,
      h: height,
      freeSide: "left",
      insetRatio: 0.18,
      verticalRatio: 0.5,
    });
    const pullKind =
      h >= w * 1.15 ? "tirador_puerta_corredera" : "tirador_corredera_embutido";
    parts.push(
      `<g data-guided-opening="slide-left" stroke="${palette.detail}" stroke-width="${px(scale.cue)}" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"><line x1="${px(leftArrowX + arrowLength / 2)}" y1="${px(arrowY)}" x2="${px(leftArrowX - arrowLength / 2)}" y2="${px(arrowY)}" /><polyline points="${px(leftArrowX - arrowLength / 2 + arrowSize)},${px(arrowY - arrowSize)} ${px(leftArrowX - arrowLength / 2)},${px(arrowY)} ${px(leftArrowX - arrowLength / 2 + arrowSize)},${px(arrowY + arrowSize)}" /></g>`,
      `<g data-guided-opening="slide-right" stroke="${palette.detail}" stroke-width="${px(scale.cue)}" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"><line x1="${px(rightArrowX - arrowLength / 2)}" y1="${px(arrowY)}" x2="${px(rightArrowX + arrowLength / 2)}" y2="${px(arrowY)}" /><polyline points="${px(rightArrowX + arrowLength / 2 - arrowSize)},${px(arrowY - arrowSize)} ${px(rightArrowX + arrowLength / 2)},${px(arrowY)} ${px(rightArrowX + arrowLength / 2 - arrowSize)},${px(arrowY + arrowSize)}" /></g>`,
      drawGuidedHardware({
        kind: pullKind,
        cx: leftPull.cx,
        cy: leftPull.cy,
        size: pullSize,
        freeSide: "right",
        stroke: palette.detail,
        strokeWidth: Math.max(1, scale.cue * 0.95),
      }),
      drawGuidedHardware({
        kind: pullKind,
        cx: rightPull.cx,
        cy: rightPull.cy,
        size: pullSize,
        freeSide: "left",
        stroke: palette.detail,
        strokeWidth: Math.max(1, scale.cue * 0.95),
      })
    );
  }

  return parts.join("");
}

/** Palillo visual (más fino que división estructural). */
export function drawPalilloLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  palette: ProfilePalette,
  stroke: number,
  role: "standard" | "door" = "standard"
): string {
  return `<line data-guided-palillo="${role}" x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${palette.palillo}" stroke-width="${px(stroke)}" ${PROFILE_JOIN} />`;
}

function drawSelectionChrome(
  module: GuidedLayoutModule,
  palette: ProfilePalette,
  scale: StrokeScale,
  pxPerMm: number
): string {
  if (!module.selected || scale.selection <= 0) {
    return "";
  }
  const baseX = module.x;
  const baseY = module.y;
  const baseW = module.w;
  const baseH = module.h;
  const maxInset = Math.min(baseW, baseH) * 0.22;
  const inset = Math.max(2.5, Math.min(maxInset, scale.sash * 0.55 + 2));
  const haloStroke = Math.max(2, Math.min(scale.halo, inset * 0.72));
  const fillPath = buildGuidedGlassPathPx(
    baseX + inset,
    baseY + inset,
    Math.max(0, baseW - inset * 2),
    Math.max(0, baseH - inset * 2),
    module.glassShape,
    pxPerMm
  );
  const strokePath = buildGuidedGlassPathPx(
    baseX + inset,
    baseY + inset,
    Math.max(0, baseW - inset * 2),
    Math.max(0, baseH - inset * 2),
    module.glassShape,
    pxPerMm
  );
  const parts = [
    `<path data-guided-selection="fill" d="${fillPath}" fill="${palette.selectionFill}" stroke="none" />`,
    `<path data-guided-selection="halo" d="${strokePath}" fill="none" stroke="#FFFFFF" stroke-width="${px(haloStroke)}" ${PROFILE_JOIN} />`,
    `<path data-guided-selection="stroke" d="${strokePath}" fill="none" stroke="${palette.selection}" stroke-width="${px(scale.selection)}" ${PROFILE_JOIN} />`,
  ];

  if (baseW > 54 && baseH > 44) {
    const compact = baseH < 62;
    const badgeH = compact ? 14 : 18;
    const badgeW = compact ? 28 : 34;
    const fontSize = compact ? 9 : 11;
    const badgeX = baseX + inset + 2;
    const badgeY = baseY + inset + 2;
    parts.push(
      `<rect data-guided-selection="badge" x="${px(badgeX)}" y="${px(badgeY)}" width="${px(badgeW)}" height="${px(badgeH)}" rx="0" ry="0" fill="${palette.selection}" stroke="none" />`,
      `<text x="${px(badgeX + badgeW / 2)}" y="${px(badgeY + (compact ? 10 : 13))}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#FFFFFF" font-family="ui-sans-serif, system-ui, sans-serif">M${module.leafIndex + 1}</text>`
    );
  }

  return parts.join("");
}

function isDoorModuleType(type: GuidedModuleType) {
  return type === "puerta" || type === "puerta_corredera";
}

function resolveSolidDoorPalette(palette: ProfilePalette): ProfilePalette {
  return {
    ...palette,
    frameInner: palette.frame,
    frameOutline: null,
    div: palette.frame,
    divInner: palette.frame,
    palillo: palette.frame,
  };
}

function drawModuleCue(
  type: GuidedModuleType,
  openingSide: GuidedOpeningSide,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: ProfilePalette,
  scale: StrokeScale,
  variant: GuidedRenderVariant
) {
  const detail = palette.detail;
  const stroke = scale.cue;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cueJoin =
    'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" fill="none"';
  const parts: string[] = [];
  const inset = Math.max(6, Math.min(w, h) * 0.08);

  if (type === "fijo") {
    if (variant === "editor" && w > 56 && h > 48) {
      parts.push(
        `<text x="${px(cx)}" y="${px(cy + 4)}" text-anchor="middle" font-size="11" font-weight="650" fill="${detail}" opacity="0.55" font-family="ui-sans-serif, system-ui, sans-serif">F</text>`
      );
    }
    return parts.join("");
  }

  if (type === "corredera") {
    return drawSlidingSystem(x, y, w, h, palette, scale, variant);
  }

  if (type === "abatible") {
    parts.push(drawOperableSashFrame(x, y, w, h, palette, scale));
    const opensRight = openingSide === "right";
    const freeSide: GuidedOpeningSide = opensRight ? "left" : "right";
    const hingeX = opensRight ? x + w - inset - 2 : x + inset + 2;
    const leafEdge = opensRight ? x + inset : x + w - inset;
    const top = y + inset;
    const bottom = y + h - inset;
    const radius = Math.min(w * 0.55, h * 0.62);
    const arcEndX = opensRight
      ? Math.max(leafEdge, hingeX - radius)
      : Math.min(leafEdge, hingeX + radius);
    const hardware = resolveHardwareAnchor({
      x,
      y,
      w,
      h,
      freeSide,
      insetRatio: 0.14,
      verticalRatio: 0.48,
    });
    parts.push(
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(hingeX)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke * 1.15)}" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(leafEdge)}" y2="${px(top)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.7" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(bottom)}" x2="${px(leafEdge)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.7" ${cueJoin} />`,
      `<path d="M ${px(hingeX)} ${px(top + 4)} A ${px(radius)} ${px(radius)} 0 0 ${opensRight ? 0 : 1} ${px(arcEndX)} ${px(cy)}" stroke="${detail}" stroke-width="${px(stroke)}" ${cueJoin} />`,
      drawGuidedHardware({
        kind: "cremona_ventana",
        cx: hardware.cx,
        cy: hardware.cy,
        size: resolveHardwareSize(w, h),
        freeSide,
        stroke: detail,
        strokeWidth: Math.max(1, stroke * 0.95),
      })
    );
    return parts.join("");
  }

  if (type === "oscilobatiente") {
    parts.push(drawOperableSashFrame(x, y, w, h, palette, scale));
    const freeSide: GuidedOpeningSide = openingSide === "right" ? "left" : "right";
    const hingeX = openingSide === "right" ? x + w - inset : x + inset;
    const freeX = openingSide === "right" ? x + inset : x + w - inset;
    const top = y + inset;
    const bottom = y + h - inset;
    const hardware = resolveHardwareAnchor({
      x,
      y,
      w,
      h,
      freeSide,
      insetRatio: 0.13,
      verticalRatio: 0.46,
    });
    parts.push(
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(freeX)}" y2="${px(cy)}" stroke="${detail}" stroke-width="${px(stroke)}" stroke-dasharray="7 5" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(bottom)}" x2="${px(freeX)}" y2="${px(cy)}" stroke="${detail}" stroke-width="${px(stroke)}" stroke-dasharray="7 5" ${cueJoin} />`,
      `<line x1="${px(x + inset)}" y1="${px(top)}" x2="${px(cx)}" y2="${px(bottom * 0.38 + top * 0.62)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.72" ${cueJoin} />`,
      `<line x1="${px(x + w - inset)}" y1="${px(top)}" x2="${px(cx)}" y2="${px(bottom * 0.38 + top * 0.62)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.72" ${cueJoin} />`,
      drawGuidedHardware({
        kind: "manilla_oscilobatiente",
        cx: hardware.cx,
        cy: hardware.cy,
        size: resolveHardwareSize(w, h),
        freeSide,
        stroke: detail,
        strokeWidth: Math.max(1, stroke * 0.95),
      })
    );
    return parts.join("");
  }

  if (type === "puerta") {
    parts.push(drawOperableSashFrame(x, y, w, h, palette, scale));
    const opensRight = openingSide === "right";
    const freeSide: GuidedOpeningSide = opensRight ? "left" : "right";
    const hingeX = opensRight ? x + w - inset - 2 : x + inset + 2;
    const leafEdge = opensRight ? x + inset + 4 : x + w - inset - 4;
    const top = y + inset;
    const bottom = y + h - inset;
    const thresholdY = bottom - 1;
    // Arco ~90° contenido: parte desde el borde libre hacia el umbral.
    const swing = Math.min(Math.abs(leafEdge - hingeX) * 0.88, (bottom - top) * 0.52);
    const arcEndX = hingeX + (opensRight ? -1.5 : 1.5);
    const arcEndY = top + swing;
    const hardware = resolveHardwareAnchor({
      x,
      y,
      w,
      h,
      freeSide,
      insetRatio: 0.11,
      verticalRatio: 0.5,
    });
    parts.push(
      `<line x1="${px(x + inset)}" y1="${px(thresholdY)}" x2="${px(x + w - inset)}" y2="${px(thresholdY)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.7" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(hingeX)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke * 1.15)}" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(leafEdge)}" y2="${px(top)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.65" ${cueJoin} />`,
      `<line x1="${px(leafEdge)}" y1="${px(top)}" x2="${px(leafEdge)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.75" ${cueJoin} />`,
      `<path data-guided-opening="door-swing" d="M ${px(leafEdge)} ${px(top)} A ${px(swing)} ${px(swing)} 0 0 ${opensRight ? 0 : 1} ${px(arcEndX)} ${px(arcEndY)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.85" ${cueJoin} />`,
      drawGuidedHardware({
        kind: "manilla_abatible",
        cx: hardware.cx,
        cy: hardware.cy,
        size: resolveHardwareSize(w, h),
        freeSide,
        stroke: detail,
        strokeWidth: Math.max(1.05, stroke),
        clearanceFill: palette.glassFill,
      })
    );
    return parts.join("");
  }

  if (type === "proyectante") {
    parts.push(drawOperableSashFrame(x, y, w, h, palette, scale));
    const top = y + inset;
    const left = x + inset;
    const right = x + w - inset;
    parts.push(
      `<line x1="${px(left)}" y1="${px(top)}" x2="${px(right)}" y2="${px(top)}" stroke="${detail}" stroke-width="${px(stroke * 1.2)}" ${cueJoin} />`,
      `<polyline points="${px(left + 2)},${px(top + 4)} ${px(cx)},${px(y + h * 0.58)} ${px(right - 2)},${px(top + 4)}" stroke="${detail}" stroke-width="${px(stroke)}" ${cueJoin} />`,
      `<line x1="${px(cx)}" y1="${px(y + h * 0.58)}" x2="${px(cx)}" y2="${px(y + h - inset)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.55" ${cueJoin} />`
    );
    return parts.join("");
  }

  if (type === "guillotina") {
    const halfHeight = h / 2;
    const sashGap = Math.max(2, scale.sash * 0.16);
    const arrowX = x + w * 0.72;
    const arrowTop = y + h * 0.27;
    const arrowBottom = y + h * 0.64;
    const arrowSize = Math.max(3, stroke * 2.1);
    parts.push(
      drawLayeredSashFrame(
        x,
        y,
        w,
        Math.max(0, halfHeight - sashGap),
        palette,
        scale.sash,
        "guillotine-upper-sash"
      ),
      drawLayeredSashFrame(
        x,
        y + halfHeight + sashGap,
        w,
        Math.max(0, halfHeight - sashGap),
        palette,
        scale.sash,
        "guillotine-lower-sash"
      ),
      `<line x1="${px(x)}" y1="${px(y + halfHeight)}" x2="${px(x + w)}" y2="${px(y + halfHeight)}" stroke="${palette.div}" stroke-width="${px(scale.meeting)}" ${PROFILE_JOIN} />`,
      `<g data-guided-opening="guillotine-up" stroke="${detail}" stroke-width="${px(stroke)}" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"><line x1="${px(arrowX)}" y1="${px(arrowBottom)}" x2="${px(arrowX)}" y2="${px(arrowTop)}" /><polyline points="${px(arrowX - arrowSize)},${px(arrowTop + arrowSize)} ${px(arrowX)},${px(arrowTop)} ${px(arrowX + arrowSize)},${px(arrowTop + arrowSize)}" /></g>`,
      `<rect data-guided-hardware="guillotine-pull" x="${px(cx - Math.min(18, w * 0.12))}" y="${px(y + halfHeight + Math.max(5, h * 0.05))}" width="${px(Math.min(36, w * 0.24))}" height="${px(Math.max(2.5, stroke * 1.5))}" rx="${px(stroke)}" fill="${detail}" />`
    );
    return parts.join("");
  }

  if (type === "celosia") {
    const left = x + inset;
    const right = x + w - inset;
    const bladeCount = 6;
    const bladeGap = Math.max(5, (h - inset * 2) / (bladeCount + 1));
    for (let index = 1; index <= bladeCount; index += 1) {
      const bladeY = y + inset + bladeGap * index;
      const tilt = Math.min(7, bladeGap * 0.36);
      parts.push(
        `<g data-guided-louver="${index}"><line x1="${px(left)}" y1="${px(bladeY - tilt)}" x2="${px(right)}" y2="${px(bladeY + tilt)}" stroke="${palette.div}" stroke-width="${px(Math.max(scale.sash * 0.68, 2.4))}" ${PROFILE_JOIN} /><circle cx="${px(cx)}" cy="${px(bladeY)}" r="${px(Math.max(1.5, stroke * 0.8))}" fill="${detail}" /></g>`
      );
    }
    return parts.join("");
  }

  if (type === "puerta_corredera") {
    parts.push(
      drawSlidingSystem(x, y, w, h, palette, scale, variant),
      `<line x1="${px(x + inset * 0.4)}" y1="${px(y + h - inset * 0.4)}" x2="${px(x + w - inset * 0.4)}" y2="${px(y + h - inset * 0.4)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.65" ${cueJoin} />`
    );
    return parts.join("");
  }

  if (type === "shower_frontal") {
    const dividerX = x + w * 0.42;
    const freeSide: GuidedOpeningSide = openingSide === "right" ? "left" : "right";
    const handle = resolveHardwareAnchor({
      x: dividerX,
      y,
      w: Math.max(1, x + w - dividerX),
      h,
      freeSide,
      insetRatio: 0.18,
      verticalRatio: 0.5,
    });
    parts.push(
      `<line x1="${px(dividerX)}" y1="${px(y)}" x2="${px(dividerX)}" y2="${px(y + h)}" stroke="${palette.div}" stroke-width="${px(scale.meeting)}" ${PROFILE_JOIN} />`,
      `<line x1="${px(dividerX + inset)}" y1="${px(y + inset)}" x2="${px(x + w - inset)}" y2="${px(y + h / 2)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.72" ${cueJoin} />`,
      `<line x1="${px(dividerX + inset)}" y1="${px(y + h - inset)}" x2="${px(x + w - inset)}" y2="${px(y + h / 2)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.72" ${cueJoin} />`,
      drawGuidedHardware({
        kind: "manilla_abatible",
        cx: handle.cx,
        cy: handle.cy,
        size: resolveHardwareSize(w, h, "compact"),
        freeSide,
        stroke: detail,
        strokeWidth: Math.max(1, stroke),
      })
    );
    return parts.join("");
  }

  if (type === "shower_corredera") {
    parts.push(
      drawSlidingSystem(x, y, w, h, palette, scale, variant),
      `<line x1="${px(x)}" y1="${px(y + h - Math.max(2, stroke))}" x2="${px(x + w)}" y2="${px(y + h - Math.max(2, stroke))}" stroke="${palette.div}" stroke-width="${px(Math.max(2, scale.sash * 0.72))}" ${PROFILE_JOIN} />`
    );
    return parts.join("");
  }

  if (type === "pano_libre") {
    parts.push(
      `<rect x="${px(x + inset)}" y="${px(y + inset)}" width="${px(w - inset * 2)}" height="${px(h - inset * 2)}" stroke="${detail}" stroke-width="${px(stroke)}" stroke-dasharray="5 4" ${cueJoin} />`
    );
    if (variant !== "thumbnail" && w > 72 && h > 52) {
      parts.push(
        `<text x="${px(cx)}" y="${px(cy + 4)}" text-anchor="middle" font-size="11" fill="${detail}" font-family="ui-sans-serif, system-ui, sans-serif">Por definir</text>`
      );
    }
    return parts.join("");
  }

  return "";
}

/**
 * Geometría compartida: las proporciones salen siempre de widthMm/heightMm.
 * El PDF reserva una banda técnica para cotas, pero aprovecha más el canvas
 * para que la pieza siga siendo la protagonista del documento comercial.
 */
export function calculateGuidedVisualLayout(
  input: GuidedVisualConfig,
  options: GuidedVisualRenderOptions = {}
): GuidedVisualLayout {
  const config = normalizeGuidedVisualConfig(ensureGuidedVisualConfig(input));
  const variant = resolveVariant(options.variant);
  const maxW = options.maxW ?? (variant === "thumbnail" ? 160 : 420);
  const maxH = options.maxH ?? (variant === "thumbnail" ? 120 : 320);
  const targetFill = variant === "thumbnail" ? 0.9 : variant === "pdf" ? 0.88 : 0.78;
  const padX = maxW * ((1 - targetFill) / 2);
  const bottomBand = variant === "thumbnail" ? 4 : variant === "pdf" ? 40 : 28;
  const padY =
    variant === "pdf"
      ? 10
      : Math.max(8, (maxH - bottomBand) * ((1 - targetFill) / 2));

  const aspect = config.widthMm / Math.max(config.heightMm, 1);
  let drawW = maxW - padX * 2;
  let drawH = drawW / aspect;
  if (drawH > maxH - padY - bottomBand) {
    drawH = maxH - padY - bottomBand;
    drawW = drawH * aspect;
  }

  const originX = (maxW - drawW) / 2;
  const originY = Math.max(padY, (maxH - bottomBand - drawH) / 2);
  const pxPerMm = drawW / Math.max(config.widthMm, 1);
  const rects = calculateNodeRects(config);
  const showSelection = options.showSelection ?? variant === "editor";
  const selectedPalilloNodeId = options.selectedPalilloNodeId ?? config.selectedPalilloId;

  const modules: GuidedLayoutModule[] = rects
    .filter((r): r is GuidedNodeRect & { kind: "module" } => r.kind === "module")
    .map((rect) => {
      const x = originX + rect.xMm * pxPerMm;
      const y = originY + rect.yMm * pxPerMm;
      const w = rect.widthMm * pxPerMm;
      const h = rect.heightMm * pxPerMm;

      const layoutRects = calculatePalilloRects(rect.palilloLayout ?? null);
      const palilloSegments: GuidedLayoutPalilloSegment[] = layoutRects
        .filter((item) => item.kind === "split" && item.direction && item.dividerRatio != null)
        .map((item) => {
          if (item.direction === "vertical") {
            const lx = x + w * item.dividerRatio!;
            return {
              id: item.id,
              direction: "vertical" as const,
              x1: lx,
              y1: y + h * item.yRatio,
              x2: lx,
              y2: y + h * (item.yRatio + item.hRatio),
              selected: Boolean(
                showSelection && selectedPalilloNodeId === item.id
              ),
            };
          }
          const ly = y + h * item.dividerRatio!;
          return {
            id: item.id,
            direction: "horizontal" as const,
            x1: x + w * item.xRatio,
            y1: ly,
            x2: x + w * (item.xRatio + item.wRatio),
            y2: ly,
            selected: Boolean(
              showSelection && selectedPalilloNodeId === item.id
            ),
          };
        });

      const palilloCells: GuidedLayoutPalilloCell[] = layoutRects
        .filter((item) => item.kind === "cell")
        .map((item) => ({
          id: item.id,
          x: x + w * item.xRatio,
          y: y + h * item.yRatio,
          w: w * item.wRatio,
          h: h * item.hRatio,
          selected: Boolean(showSelection && selectedPalilloNodeId === item.id),
        }));

      // Si no hay layout pero sí flat legacy, proyecta líneas completas.
      const palillos =
        palilloSegments.length > 0
          ? palilloSegments.map((segment) => ({
              id: segment.id,
              axis: segment.direction,
              position:
                segment.direction === "vertical"
                  ? (segment.x1 - x) / Math.max(w, 1)
                  : (segment.y1 - y) / Math.max(h, 1),
              x1: segment.x1,
              y1: segment.y1,
              x2: segment.x2,
              y2: segment.y2,
            }))
          : (rect.palillos ?? []).map((p) => {
              if (p.axis === "vertical") {
                const lx = x + w * p.position;
                return { ...p, x1: lx, y1: y, x2: lx, y2: y + h };
              }
              const ly = y + h * p.position;
              return { ...p, x1: x, y1: ly, x2: x + w, y2: ly };
            });

      return {
        id: rect.id,
        leafIndex: rect.leafIndex ?? 0,
        type: rect.type ?? "fijo",
        label: GUIDED_MODULE_TYPE_LABELS[rect.type ?? "fijo"],
        x,
        y,
        w,
        h,
        widthMm: rect.widthMm,
        heightMm: rect.heightMm,
        selected: showSelection && rect.id === config.selectedNodeId,
        glassShape: rect.glassShape ?? { kind: "rect" as const },
        openingSide: rect.openingSide ?? "left",
        palillos,
        palilloSegments,
        palilloCells,
      };
    });

  const splits: GuidedLayoutSplit[] = rects
    .filter((r): r is GuidedNodeRect & { kind: "split" } => r.kind === "split")
    .map((rect) => {
      const x = originX + rect.xMm * pxPerMm;
      const y = originY + rect.yMm * pxPerMm;
      const w = rect.widthMm * pxPerMm;
      const h = rect.heightMm * pxPerMm;
      const ratio = rect.ratio ?? 0.5;
      const firstSizeMm =
        rect.direction === "vertical" ? rect.widthMm * ratio : rect.heightMm * ratio;
      const secondSizeMm =
        rect.direction === "vertical"
          ? rect.widthMm - firstSizeMm
          : rect.heightMm - firstSizeMm;

      return {
        id: rect.id,
        direction: rect.direction ?? "vertical",
        ratio,
        x,
        y,
        w,
        h,
        dividerX:
          rect.direction === "vertical" && rect.dividerMm != null
            ? originX + rect.dividerMm * pxPerMm
            : undefined,
        dividerY:
          rect.direction === "horizontal" && rect.dividerMm != null
            ? originY + rect.dividerMm * pxPerMm
            : undefined,
        selected: showSelection && rect.id === config.selectedNodeId,
        firstSizeMm,
        secondSizeMm,
      };
    });

  return {
    widthMm: config.widthMm,
    heightMm: config.heightMm,
    svgW: maxW,
    svgH: maxH,
    originX,
    originY,
    drawW,
    drawH,
    pxPerMm,
    frameShape: config.frameShape,
    modules,
    splits,
  };
}

/**
 * Renderer único del constructor visual guiado V2.
 * Misma geometría para editor / thumbnail / summary / pdf.
 */
export function renderGuidedVisualSvg(
  input: GuidedVisualConfig,
  options: GuidedVisualRenderOptions = {}
): string {
  const config = normalizeGuidedVisualConfig(ensureGuidedVisualConfig(input));
  const variant = resolveVariant(options.variant);
  const layout = calculateGuidedVisualLayout(config, { ...options, variant });
  const palette = resolvePalette(options.colorHex, variant);
  const scale = getGuidedResponsiveStrokeScale(variant, layout);
  const showLabels =
    options.showLabels ?? (variant === "editor" || variant === "summary");
  const showDimensions =
    options.showDimensions ?? (variant === "editor" || variant === "pdf");
  const palilloEditModuleId = options.palilloEditModuleId ?? null;
  const hasSelection =
    variant === "editor" && layout.modules.some((module) => module.selected);
  const amberFill = "rgba(217, 119, 6, 0.12)";
  const amberStroke = "#D97706";
  const resourceToken = `${options.resourceKey ?? `${variant}-${options.maxW ?? "auto"}-${options.maxH ?? "auto"}`}-${config.root.id}`
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(-56) || "root";
  const glassGradientId = `gvc-glass-gradient-${resourceToken}`;
  const profileGradientId = `gvc-profile-gradient-${resourceToken}`;
  const renderedPalette: ProfilePalette =
    variant === "pdf"
      ? palette
      : {
          ...palette,
          frame: `url(#${profileGradientId})`,
          div: `url(#${profileGradientId})`,
        };
  const solidDoorPalette = resolveSolidDoorPalette(palette);
  const structuralPalette = layout.modules.every((module) => isDoorModuleType(module.type))
    ? solidDoorPalette
    : renderedPalette;

  const body: string[] = [];

  // Fondo del canvas (nunca azul; blanco / gris muy claro)
  body.push(
    `<rect x="0" y="0" width="${px(layout.svgW)}" height="${px(layout.svgH)}" fill="${palette.canvasBg}" stroke="none" />`
  );

  const framePath = buildGuidedFramePath(
    layout.originX,
    layout.originY,
    layout.drawW,
    layout.drawH,
    layout.frameShape,
    layout.pxPerMm
  );
  const clipId = `gvc-frame-clip-${resourceToken}`;
  body.push(
    `<defs>` +
      `<clipPath id="${clipId}"><path d="${framePath}" /></clipPath>` +
      `<linearGradient id="${glassGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">` +
        `<stop offset="0%" stop-color="${palette.glassFill}" />` +
        `<stop offset="52%" stop-color="#C8D4EE" />` +
        `<stop offset="100%" stop-color="#AEBBE1" />` +
      `</linearGradient>` +
      `<linearGradient id="${profileGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">` +
        `<stop offset="0%" stop-color="${palette.frameInner}" />` +
        `<stop offset="48%" stop-color="${palette.frame}" />` +
        `<stop offset="100%" stop-color="${mixHex(isValidHex(options.colorHex) ? options.colorHex : "#8A96A6", "#000000", 0.38)}" />` +
      `</linearGradient>` +
    `</defs>`
  );
  body.push(`<g clip-path="url(#${clipId})">`);

  // 1) Vidrio a tope de celda; el aluminio (marco/encuentro) se dibuja encima.
  for (const layoutModule of layout.modules) {
    const glass = resolveModuleGlassRect(layoutModule);
    const mutedByPalilloEdit =
      Boolean(palilloEditModuleId) && layoutModule.id !== palilloEditModuleId;
    const fill =
      mutedByPalilloEdit ||
      (hasSelection && !layoutModule.selected && !palilloEditModuleId)
        ? palette.glassFillMuted
        : variant === "pdf"
          ? palette.glassFill
          : `url(#${glassGradientId})`;
    const glassPath = buildGuidedGlassPathPx(
      glass.x,
      glass.y,
      glass.w,
      glass.h,
      layoutModule.glassShape,
      layout.pxPerMm
    );
    if (layoutModule.glassShape.kind === "rounded") {
      body.push(
        `<path data-guided-target="vidrio" d="${glassPath}" fill="${fill}" stroke="${palette.detail}" stroke-width="1.35" stroke-opacity="0.55" />`
      );
    } else {
      body.push(
        `<path data-guided-target="vidrio" d="${glassPath}" fill="${fill}" stroke="none" />`
      );
    }
  }

  // 3) Divisiones estructurales
  for (const split of layout.splits) {
    if (split.direction === "vertical" && split.dividerX != null) {
      body.push(
        drawVerticalMullion(
          split.dividerX,
          split.y,
          split.y + split.h,
          structuralPalette,
          scale.mullion,
          Boolean(split.selected && variant === "editor")
        )
      );
    }
    if (split.direction === "horizontal" && split.dividerY != null) {
      body.push(
        drawHorizontalTransom(
          split.dividerY,
          split.x,
          split.x + split.w,
          structuralPalette,
          scale.mullion,
          Boolean(split.selected && variant === "editor")
        )
      );
    }
  }

  // 4) Palillos (árbol) + cues + labels
  for (const layoutModule of layout.modules) {
    const isDoorModule = isDoorModuleType(layoutModule.type);
    const modulePalette = isDoorModule
      ? solidDoorPalette
      : renderedPalette;
    const palilloStroke = isDoorModule
      ? Math.max(scale.palillo * 1.5, scale.palillo + 1.2)
      : scale.palillo;
    const sash = resolveModuleSashRect(layoutModule, scale);
    const segments =
      layoutModule.palilloSegments.length > 0
        ? layoutModule.palilloSegments
        : layoutModule.palillos.map((palillo) => ({
            id: palillo.id,
            direction: palillo.axis,
            x1: palillo.x1,
            y1: palillo.y1,
            x2: palillo.x2,
            y2: palillo.y2,
            selected: false,
          }));

    for (const segment of segments) {
      const emphasized =
        variant === "editor" &&
        segment.selected &&
        palilloEditModuleId === layoutModule.id;
      if (emphasized) {
        body.push(
          `<line x1="${px(segment.x1)}" y1="${px(segment.y1)}" x2="${px(segment.x2)}" y2="${px(segment.y2)}" stroke="${amberStroke}" stroke-width="${px(scale.palillo + 1.2)}" stroke-linecap="square" vector-effect="non-scaling-stroke" />`
        );
      }
      body.push(
        drawPalilloLine(
          segment.x1,
          segment.y1,
          segment.x2,
          segment.y2,
          modulePalette,
          palilloStroke,
          isDoorModule ? "door" : "standard"
        )
      );
    }

    if (
      variant === "editor" &&
      palilloEditModuleId === layoutModule.id &&
      layoutModule.palilloCells.length > 0
    ) {
      for (const cell of layoutModule.palilloCells) {
        if (!cell.selected) {
          continue;
        }
        body.push(
          `<rect x="${px(cell.x)}" y="${px(cell.y)}" width="${px(cell.w)}" height="${px(cell.h)}" fill="${amberFill}" stroke="${amberStroke}" stroke-width="1.5" vector-effect="non-scaling-stroke" />`
        );
      }
    }

    body.push(
      `<g data-guided-target="apertura" data-guided-motion="${layoutModule.type}">`,
      drawModuleCue(
        layoutModule.type,
        layoutModule.openingSide,
        sash.x,
        sash.y,
        sash.w,
        sash.h,
        modulePalette,
        scale,
        variant
      ),
      `</g>`
    );

    if (showLabels && !layoutModule.selected && layoutModule.w > 52 && layoutModule.h > 36) {
      if (variant === "editor") {
        body.push(
          `<text x="${px(layoutModule.x + 8)}" y="${px(layoutModule.y + 16)}" font-size="11" font-weight="700" fill="${palette.label}" font-family="ui-sans-serif, system-ui, sans-serif">M${layoutModule.leafIndex + 1}</text>`
        );
        if (layoutModule.w > 78 && layoutModule.h > 48) {
          const labelY =
            layoutModule.h < 72
              ? layoutModule.y + layoutModule.h / 2 + 4
              : layoutModule.y + Math.min(28, layoutModule.h * 0.24);
          body.push(
            `<text x="${px(layoutModule.x + layoutModule.w / 2)}" y="${px(labelY)}" text-anchor="middle" font-size="11" fill="${palette.label}" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(layoutModule.label)}</text>`
          );
        }
      } else if (variant === "pdf" || variant === "summary") {
        body.push(
          `<text x="${px(layoutModule.x + 8)}" y="${px(layoutModule.y + 14)}" font-size="10" font-weight="700" fill="${palette.label}" font-family="ui-sans-serif, system-ui, sans-serif">M${layoutModule.leafIndex + 1}</text>`
        );
      }
    }
  }

  // Selección dentro del clip: sigue la celda del módulo (mismo origen que el vidrio)
  if (variant === "editor") {
    for (const layoutModule of layout.modules) {
      body.push(
        drawSelectionChrome(layoutModule, palette, scale, layout.pxPerMm)
      );
    }
  }

  body.push("</g>");

  // Marco exterior (sobre el clip, sin recortar el stroke)
  body.push(
    `<g data-guided-target="sistema">${drawOuterAluminumFrame(
      layout.originX,
      layout.originY,
      layout.drawW,
      layout.drawH,
      structuralPalette,
      scale.frame,
      layout.frameShape,
      layout.pxPerMm
    )}</g>`
  );

  if (showDimensions) {
    const dimensionGap = variant === "pdf" ? 24 : 20;
    const verticalDimensionGap = variant === "pdf" ? 28 : 24;
    const bottomY = layout.originY + layout.drawH + dimensionGap;
    const rightX = layout.originX + layout.drawW + verticalDimensionGap;
    const tick = 4;
    const dimensionTextHalo = `stroke="${palette.canvasBg}" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke fill"`;
    body.push(
      `<g fill="none" stroke="${palette.dimTxt}" stroke-width="${px(scale.dim)}" opacity="0.9">` +
        `<line x1="${px(layout.originX)}" y1="${px(bottomY)}" x2="${px(layout.originX + layout.drawW)}" y2="${px(bottomY)}" />` +
        `<line x1="${px(layout.originX)}" y1="${px(bottomY - tick)}" x2="${px(layout.originX)}" y2="${px(bottomY + tick)}" />` +
        `<line x1="${px(layout.originX + layout.drawW)}" y1="${px(bottomY - tick)}" x2="${px(layout.originX + layout.drawW)}" y2="${px(bottomY + tick)}" />` +
        `<line x1="${px(rightX)}" y1="${px(layout.originY)}" x2="${px(rightX)}" y2="${px(layout.originY + layout.drawH)}" />` +
        `<line x1="${px(rightX - tick)}" y1="${px(layout.originY)}" x2="${px(rightX + tick)}" y2="${px(layout.originY)}" />` +
        `<line x1="${px(rightX - tick)}" y1="${px(layout.originY + layout.drawH)}" x2="${px(rightX + tick)}" y2="${px(layout.originY + layout.drawH)}" />` +
      `</g>`,
      `<text x="${px(layout.originX + layout.drawW / 2)}" y="${px(bottomY - 7)}" text-anchor="middle" font-size="11" font-weight="650" fill="${palette.dimTxt}" ${dimensionTextHalo} font-family="ui-sans-serif, system-ui, sans-serif">${Math.round(layout.widthMm)} mm</text>`,
      `<text x="${px(rightX - 7)}" y="${px(layout.originY + layout.drawH / 2)}" text-anchor="middle" font-size="11" font-weight="650" fill="${palette.dimTxt}" ${dimensionTextHalo} font-family="ui-sans-serif, system-ui, sans-serif" transform="rotate(-90 ${px(rightX - 7)} ${px(layout.originY + layout.drawH / 2)})">${Math.round(layout.heightMm)} mm</text>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px(layout.svgW)}" height="${px(layout.svgH)}" viewBox="0 0 ${px(layout.svgW)} ${px(layout.svgH)}" role="img" aria-label="${escapeXml(describeGuidedVisualConfig(config))}">${body.join("")}</svg>`;
}

/** Pictograma compacto por tipo (para grilla del inspector). */
export function renderGuidedModuleTypeIcon(
  type: GuidedModuleType,
  size = 44
): string {
  const config = normalizeGuidedVisualConfig(
    ensureGuidedVisualConfig({
      schemaVersion: 2,
      widthMm: 1000,
      heightMm: 1000,
      root: {
        kind: "module",
        id: "icon",
        type,
        palillos: [],
        palilloLayout: null,
        glassShape: { kind: "rect" },
      },
      selectedNodeId: null,
      selectedPalilloId: null,
      frameShape: { kind: "rect" },
    })
  );
  if (isModuleNode(config.root)) {
    config.root.type = type;
  }
  return renderGuidedVisualSvg(config, {
    maxW: size,
    maxH: size,
    variant: "thumbnail",
    showSelection: false,
    showLabels: false,
    showDimensions: false,
    resourceKey: `module-type-${type}-${size}`,
  });
}

export function getGuidedCompositionSummary(config: GuidedVisualConfig) {
  const normalized = normalizeGuidedVisualConfig(ensureGuidedVisualConfig(config));
  const leaves = listLeafModules(normalized.root);
  return {
    moduleCount: leaves.length,
    typesLabel: leaves.map((leaf) => GUIDED_MODULE_TYPE_LABELS[leaf.type]).join(" + "),
    description: describeGuidedVisualConfig(normalized),
    widthMm: normalized.widthMm,
    heightMm: normalized.heightMm,
  };
}
