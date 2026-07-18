import {
  calculateNodeRects,
  calculatePalilloRects,
  describeGuidedVisualConfig,
  ensureGuidedVisualConfig,
  GUIDED_MODULE_TYPE_LABELS,
  isModuleNode,
  listLeafModules,
  normalizeGuidedVisualConfig,
  type GuidedModuleType,
  type GuidedNodeRect,
  type GuidedPalillo,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

export type GuidedRenderVariant = "editor" | "thumbnail" | "summary" | "pdf";

export type GuidedVisualRenderOptions = {
  maxW?: number;
  maxH?: number;
  colorHex?: string | null;
  variant?: GuidedRenderVariant | "default";
  showSelection?: boolean;
  showLabels?: boolean;
  showDimensions?: boolean;
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
  modules: GuidedLayoutModule[];
  splits: GuidedLayoutSplit[];
};

type StrokeScale = {
  frame: number;
  mullion: number;
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
      frame: 3.2,
      mullion: 2.2,
      palillo: 1.4,
      cue: 1,
      dim: 1,
      selection: 0,
      halo: 0,
    };
  }
  if (variant === "pdf") {
    return {
      frame: 5.5,
      mullion: 3.6,
      palillo: 2.2,
      cue: 1.2,
      dim: 1,
      selection: 0,
      halo: 0,
    };
  }
  if (variant === "summary") {
    return {
      frame: 5,
      mullion: 3.4,
      palillo: 2,
      cue: 1.3,
      dim: 1,
      selection: 0,
      halo: 0,
    };
  }
  // editor — jerarquía pedida (aprox. 8–10 / 6–7 / 3–4 / 1.5–2 / 1)
  return {
    frame: 9,
    mullion: 6.5,
    palillo: 3.5,
    cue: 1.75,
    dim: 1,
    selection: 3,
    halo: 5,
  };
}

/** Expone la escala de trazos por variante (útil para tests visuales). */
export function getGuidedStrokeScale(variant: GuidedRenderVariant): StrokeScale {
  return resolveStrokeScale(variant);
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
  const selectionFill = "rgba(30, 136, 255, 0.1)";
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

/** Marco exterior esquemático de aluminio (doble contorno). */
export function drawOuterAluminumFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  palette: ProfilePalette,
  stroke: number
): string {
  const parts: string[] = [];
  if (palette.frameOutline) {
    parts.push(
      `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${palette.frameOutline}" stroke-width="${px(stroke + 3)}" ${PROFILE_JOIN} />`
    );
  }
  parts.push(
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${palette.frame}" stroke-width="${px(stroke)}" ${PROFILE_JOIN} />`
  );
  const inset = Math.max(2.2, stroke * 0.42);
  parts.push(
    `<rect x="${px(x + inset)}" y="${px(y + inset)}" width="${px(Math.max(0, w - inset * 2))}" height="${px(Math.max(0, h - inset * 2))}" fill="none" stroke="${palette.frameInner}" stroke-width="${px(Math.max(1.2, stroke * 0.34))}" ${PROFILE_JOIN} />`
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

/** Palillo visual (más fino que división estructural). */
export function drawPalilloLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  palette: ProfilePalette,
  stroke: number
): string {
  return `<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${palette.palillo}" stroke-width="${px(stroke)}" ${PROFILE_JOIN} />`;
}

function drawSelectionChrome(
  module: GuidedLayoutModule,
  palette: ProfilePalette,
  scale: StrokeScale
): string {
  if (!module.selected || scale.selection <= 0) {
    return "";
  }
  const pad = scale.halo * 0.35;
  const x = module.x + pad;
  const y = module.y + pad;
  const w = Math.max(0, module.w - pad * 2);
  const h = Math.max(0, module.h - pad * 2);
  const badgeH = 18;
  const badgeW = 34;
  const badgeX = module.x + 8;
  const badgeY = module.y + 8;
  return [
    `<rect x="${px(module.x)}" y="${px(module.y)}" width="${px(module.w)}" height="${px(module.h)}" fill="${palette.selectionFill}" stroke="none" />`,
    `<rect x="${px(x - 1)}" y="${px(y - 1)}" width="${px(w + 2)}" height="${px(h + 2)}" fill="none" stroke="#FFFFFF" stroke-width="${px(scale.halo)}" ${PROFILE_JOIN} />`,
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${palette.selection}" stroke-width="${px(scale.selection)}" ${PROFILE_JOIN} />`,
    `<rect x="${px(badgeX)}" y="${px(badgeY)}" width="${px(badgeW)}" height="${px(badgeH)}" rx="0" ry="0" fill="${palette.selection}" stroke="none" />`,
    `<text x="${px(badgeX + badgeW / 2)}" y="${px(badgeY + 13)}" text-anchor="middle" font-size="11" font-weight="700" fill="#FFFFFF" font-family="ui-sans-serif, system-ui, sans-serif">M${module.leafIndex + 1}</text>`,
  ].join("");
}

function drawModuleCue(
  type: GuidedModuleType,
  x: number,
  y: number,
  w: number,
  h: number,
  detail: string,
  stroke: number,
  variant: GuidedRenderVariant
) {
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
    const leafGap = Math.max(4, w * 0.04);
    const leafW = (w - inset * 2 - leafGap) / 2;
    const leafH = h - inset * 2;
    const leftX = x + inset;
    const rightX = leftX + leafW + leafGap * 0.55;
    const leafY = y + inset;
    const mid = leftX + leafW + leafGap * 0.25;
    parts.push(
      `<rect x="${px(leftX)}" y="${px(leafY)}" width="${px(leafW)}" height="${px(leafH)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.75" ${cueJoin} />`,
      `<rect x="${px(rightX)}" y="${px(leafY)}" width="${px(leafW)}" height="${px(leafH)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.75" ${cueJoin} />`,
      `<line x1="${px(mid)}" y1="${px(leafY + leafH * 0.12)}" x2="${px(mid)}" y2="${px(leafY + leafH * 0.88)}" stroke="${detail}" stroke-width="${px(stroke * 1.15)}" ${cueJoin} />`,
      `<line x1="${px(cx - w * 0.16)}" y1="${px(cy)}" x2="${px(cx + w * 0.16)}" y2="${px(cy)}" stroke="${detail}" stroke-width="${px(stroke)}" ${cueJoin} />`,
      `<polyline points="${px(cx - w * 0.16 + 5)},${px(cy - 3.5)} ${px(cx - w * 0.16)},${px(cy)} ${px(cx - w * 0.16 + 5)},${px(cy + 3.5)}" stroke="${detail}" stroke-width="${px(stroke)}" ${cueJoin} />`,
      `<polyline points="${px(cx + w * 0.16 - 5)},${px(cy - 3.5)} ${px(cx + w * 0.16)},${px(cy)} ${px(cx + w * 0.16 - 5)},${px(cy + 3.5)}" stroke="${detail}" stroke-width="${px(stroke)}" ${cueJoin} />`
    );
    return parts.join("");
  }

  if (type === "abatible") {
    const hingeX = x + inset + 2;
    const leafRight = x + w - inset;
    const top = y + inset;
    const bottom = y + h - inset;
    const radius = Math.min(w * 0.55, h * 0.62);
    parts.push(
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(hingeX)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke * 1.15)}" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(leafRight)}" y2="${px(top)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.7" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(bottom)}" x2="${px(leafRight)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.7" ${cueJoin} />`,
      `<path d="M ${px(hingeX)} ${px(top + 4)} A ${px(radius)} ${px(radius)} 0 0 1 ${px(Math.min(leafRight, hingeX + radius))} ${px(cy)}" stroke="${detail}" stroke-width="${px(stroke)}" ${cueJoin} />`
    );
    return parts.join("");
  }

  if (type === "puerta") {
    const hingeX = x + inset + 2;
    const leafRight = x + w - inset - 4;
    const top = y + inset;
    const bottom = y + h - inset;
    const thresholdY = bottom - 1;
    // Arco ~90° contenido en el módulo (no ovalo gigante).
    const swing = Math.min((leafRight - hingeX) * 0.92, (bottom - top) * 0.55);
    const handleX = hingeX + (leafRight - hingeX) * 0.82;
    const arcEndX = hingeX + 2;
    const arcEndY = top + swing;
    parts.push(
      `<line x1="${px(x + inset)}" y1="${px(thresholdY)}" x2="${px(x + w - inset)}" y2="${px(thresholdY)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.7" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(hingeX)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke * 1.15)}" ${cueJoin} />`,
      `<line x1="${px(hingeX)}" y1="${px(top)}" x2="${px(leafRight)}" y2="${px(top)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.65" ${cueJoin} />`,
      `<line x1="${px(leafRight)}" y1="${px(top)}" x2="${px(leafRight)}" y2="${px(bottom)}" stroke="${detail}" stroke-width="${px(stroke)}" opacity="0.75" ${cueJoin} />`,
      `<path d="M ${px(leafRight)} ${px(top)} A ${px(swing)} ${px(swing)} 0 0 1 ${px(arcEndX)} ${px(arcEndY)}" stroke="${detail}" stroke-width="${px(stroke)}" ${cueJoin} />`,
      `<circle cx="${px(handleX)}" cy="${px(cy)}" r="${px(Math.max(1.8, stroke * 0.85))}" fill="${detail}" stroke="none" />`
    );
    return parts.join("");
  }

  if (type === "proyectante") {
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
 * Editor/summary ocupan ~78% del canvas útil.
 */
export function calculateGuidedVisualLayout(
  input: GuidedVisualConfig,
  options: GuidedVisualRenderOptions = {}
): GuidedVisualLayout {
  const config = normalizeGuidedVisualConfig(ensureGuidedVisualConfig(input));
  const variant = resolveVariant(options.variant);
  const maxW = options.maxW ?? (variant === "thumbnail" ? 160 : 420);
  const maxH = options.maxH ?? (variant === "thumbnail" ? 120 : 320);
  const targetFill = variant === "thumbnail" ? 0.9 : variant === "pdf" ? 0.78 : 0.78;
  const padX = maxW * ((1 - targetFill) / 2);
  const bottomBand = variant === "thumbnail" ? 4 : 20;
  const padY = Math.max(8, (maxH - bottomBand) * ((1 - targetFill) / 2));

  const aspect = config.widthMm / Math.max(config.heightMm, 1);
  let drawW = maxW - padX * 2;
  let drawH = drawW / aspect;
  if (drawH > maxH - padY - bottomBand) {
    drawH = maxH - padY - bottomBand;
    drawW = drawH * aspect;
  }

  const originX = (maxW - drawW) / 2;
  const originY = padY;
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
  const scale = resolveStrokeScale(variant);
  const showLabels =
    options.showLabels ?? (variant === "editor" || variant === "summary");
  const showDimensions =
    options.showDimensions ?? (variant === "editor" || variant === "pdf");
  const palilloEditModuleId = options.palilloEditModuleId ?? null;
  const hasSelection =
    variant === "editor" && layout.modules.some((module) => module.selected);
  const amberFill = "rgba(217, 119, 6, 0.12)";
  const amberStroke = "#D97706";

  const body: string[] = [];

  // Fondo del canvas (nunca azul; blanco / gris muy claro)
  body.push(
    `<rect x="0" y="0" width="${px(layout.svgW)}" height="${px(layout.svgH)}" fill="${palette.canvasBg}" stroke="none" />`
  );

  // 1) Vidrio por módulo
  for (const module of layout.modules) {
    const mutedByPalilloEdit =
      Boolean(palilloEditModuleId) && module.id !== palilloEditModuleId;
    const fill =
      mutedByPalilloEdit || (hasSelection && !module.selected && !palilloEditModuleId)
        ? palette.glassFillMuted
        : palette.glassFill;
    body.push(
      `<rect x="${px(module.x)}" y="${px(module.y)}" width="${px(module.w)}" height="${px(module.h)}" fill="${fill}" stroke="none" />`
    );
  }

  // 2) Marco exterior
  body.push(
    drawOuterAluminumFrame(
      layout.originX,
      layout.originY,
      layout.drawW,
      layout.drawH,
      palette,
      scale.frame
    )
  );

  // 3) Divisiones estructurales
  for (const split of layout.splits) {
    if (split.direction === "vertical" && split.dividerX != null) {
      body.push(
        drawVerticalMullion(
          split.dividerX,
          split.y,
          split.y + split.h,
          palette,
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
          palette,
          scale.mullion,
          Boolean(split.selected && variant === "editor")
        )
      );
    }
  }

  // 4) Palillos (árbol) + cues + labels
  for (const module of layout.modules) {
    const segments =
      module.palilloSegments.length > 0
        ? module.palilloSegments
        : module.palillos.map((palillo) => ({
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
        palilloEditModuleId === module.id;
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
          palette,
          scale.palillo
        )
      );
    }

    if (
      variant === "editor" &&
      palilloEditModuleId === module.id &&
      module.palilloCells.length > 0
    ) {
      for (const cell of module.palilloCells) {
        if (!cell.selected) {
          continue;
        }
        body.push(
          `<rect x="${px(cell.x)}" y="${px(cell.y)}" width="${px(cell.w)}" height="${px(cell.h)}" fill="${amberFill}" stroke="${amberStroke}" stroke-width="1.5" vector-effect="non-scaling-stroke" />`
        );
      }
    }

    body.push(
      drawModuleCue(
        module.type,
        module.x,
        module.y,
        module.w,
        module.h,
        palette.detail,
        scale.cue,
        variant
      )
    );

    if (showLabels && !module.selected && module.w > 52 && module.h > 36) {
      if (variant === "editor") {
        body.push(
          `<text x="${px(module.x + 8)}" y="${px(module.y + 16)}" font-size="11" font-weight="700" fill="${palette.label}" font-family="ui-sans-serif, system-ui, sans-serif">M${module.leafIndex + 1}</text>`
        );
        if (module.w > 78 && module.h > 48) {
          body.push(
            `<text x="${px(module.x + module.w / 2)}" y="${px(module.y + Math.min(28, module.h * 0.24))}" text-anchor="middle" font-size="11" fill="${palette.label}" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(module.label)}</text>`
          );
        }
      } else if (variant === "pdf" || variant === "summary") {
        body.push(
          `<text x="${px(module.x + 8)}" y="${px(module.y + 14)}" font-size="10" font-weight="700" fill="${palette.label}" font-family="ui-sans-serif, system-ui, sans-serif">M${module.leafIndex + 1}</text>`
        );
      }
    }
  }

  // 5) Selección encima (solo editor)
  if (variant === "editor") {
    for (const module of layout.modules) {
      body.push(drawSelectionChrome(module, palette, scale));
    }
  }

  if (showDimensions) {
    body.push(
      `<text x="${px(layout.svgW / 2)}" y="${px(layout.originY + layout.drawH + 15)}" text-anchor="middle" font-size="11" fill="${palette.dimTxt}" font-family="ui-sans-serif, system-ui, sans-serif">${Math.round(layout.widthMm)} × ${Math.round(layout.heightMm)} mm</text>`
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
      },
      selectedNodeId: null,
      selectedPalilloId: null,
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
