/* =============================================================================
 * window-drawings.ts  —  Sistema de representación visual (plano técnico 2D)
 *
 * Reglas del sistema:
 *  • 100% plano — sin sombras, sin gradientes, sin volumen, sin perspectiva
 *  • Vidrio uniforme: rgba(220,234,247,0.86) / stroke #6F97BA en TODOS
 *  • Jerarquía: marco (fw) › divisiones (dw) › detalles (det)
 *  • Mismo estilo de flechas, manillas, bisagras y cotas en todo el sistema
 * ============================================================================= */

export type ComponentSVGParams = {
  tipo: string;
  sistema?: string | null;
  configuracion?: string | null;
  hojasBase?: 1 | 2 | 3 | 4 | 5 | null;
  sheetScheme?: string | null;
  sheetVariant?: string | null;
  customSchemeDescription?: string | null;
  isCustomScheme?: boolean | null;
  referencia?: string | null;
  ancho: number | null;
  alto: number | null;
  colorHex?: string | null;
  maxW?: number;
  maxH?: number;
  variant?: "default" | "pdf";
  presentation?: "mobile-guided" | "quote-pdf";
  material?: string | null;
  palilloEnabled?: boolean;
  palilloType?: string;
  mirrorFormat?: "single" | "divided";
  mirrorPaneCount?: number | null;
  mirrorPaneDirection?: "vertical" | "horizontal";
  mirrorInteriorLine?: "fine" | "marked";
};

type Palette = {
  frame: string;  // color del marco / estructura
  div: string;    // divisiones internas (parteluces, rieles)
  detail: string; // detalles finos (manillas, bisagras, flechas)
  dim: string;    // líneas de cota
  dimTxt: string; // texto de cota
  label: string;  // etiquetas
};

type WindowLeafCount = 1 | 2 | 3 | 4 | 5;

// ─── Vidrio: 100% uniforme en todos los componentes ─────────────────────────

const G_FILL   = "rgba(220,234,247,0.86)";
const G_STROKE = "#6F97BA";
const HANDLE_FILL = "#E8EDF3";
const HANDLE_STROKE = "#7A8596";

// ─── Proporciones base por tipo ──────────────────────────────────────────────

// ─── Pesos de línea ──────────────────────────────────────────────────────────

/** Peso del marco exterior */
function fw(v: string): number { return v === "pdf" ? 5   : 3.8; }
/** Peso de divisiones internas (parteluces, rieles) */
function dw(v: string): number { return v === "pdf" ? 2.5 : 1.7; }
/** Peso de detalles finos (manillas, bisagras, flechas) */
function det(v: string): number { return v === "pdf" ? 0.8 : 1.05; }
/** Peso de stroke del vidrio */
function gsw(v: string): number { return v === "pdf" ? 0.8 : 1.15; }
/** Inset del vidrio respecto al borde del frame rect */
function fi(v: string): number { return Math.max(1.1, (fw(v) - gsw(v)) / 2); }

// ─── Utilidades ──────────────────────────────────────────────────────────────

function px(n: number): string { return String(Math.round(n * 10) / 10); }

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isValidHex(v: string | null | undefined): v is string {
  return Boolean(v && /^#[0-9a-f]{6}$/i.test(v));
}

function darkenHex(hex: string, amt: number): string {
  const p = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  const d = (c: number) =>
    clamp(Math.round(c * (1 - amt)), 0, 255).toString(16).padStart(2, "0");
  return `#${d(p(1))}${d(p(3))}${d(p(5))}`;
}

function mixHex(hex: string, toward: "#000000" | "#FFFFFF", amount: number): string {
  const source = (index: number) => parseInt(hex.slice(index, index + 2), 16);
  const target = (index: number) => parseInt(toward.slice(index, index + 2), 16);
  const blend = (channel: number, goal: number) =>
    clamp(Math.round(channel + (goal - channel) * amount), 0, 255)
      .toString(16)
      .padStart(2, "0");

  return `#${blend(source(1), target(1))}${blend(source(3), target(3))}${blend(source(5), target(5))}`.toUpperCase();
}

function relativeLuminance(hex: string): number {
  const channel = (index: number) => parseInt(hex.slice(index, index + 2), 16) / 255;
  const linear = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

  const red = linear(channel(1));
  const green = linear(channel(3));
  const blue = linear(channel(5));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function resolvePalette(colorHex: string | null | undefined): Palette {
  if (!isValidHex(colorHex)) {
    return {
      frame: "#6B7280", div: "#5F6670", detail: "#4B5563",
      dim: "#999999", dimTxt: "#777777", label: "#888888",
    };
  }
  return {
    frame:  darkenHex(colorHex, 0.10),
    div:    darkenHex(colorHex, 0.26),
    detail: darkenHex(colorHex, 0.40),
    dim: "#999999", dimTxt: "#777777", label: "#888888",
  };
}

function formatMm(v: number | null): string {
  return v ? `${Math.round(v)} mm` : "— mm";
}

// ─── Normalización ───────────────────────────────────────────────────────────

function normalizeType(tipo: string): string {
  const t = tipo.trim().toLowerCase();
  if (t.startsWith("vent")) return "Ventana";
  if (t.startsWith("puert")) return "Puerta";
  if (t.includes("vidrio") || t.includes("cristal")) return "Cristal";
  if (t.includes("fijo") || (t.startsWith("pa") && !t.startsWith("par")))
    return "PanoFijo";
  if (t.startsWith("show") || t.includes("ducha")) return "Shower";
  if (t.startsWith("cier")) return "Cierre";
  if (t.startsWith("bar")) return "Baranda";
  if (t.startsWith("esp")) return "Espejo";
  if (t.includes("mesa") || t.includes("tapa") || t.includes("cubierta")) return "Mesa";
  if (t.includes("fachada")) return "Fachada";
  if (t.includes("muro") && t.includes("cort")) return "MuroCortina";
  if (t.includes("vitrina")) return "Vitrina";
  if (t.includes("lucarna") || t.includes("techo")) return "Lucarna";
  if (t.includes("medida") || t.includes("proyecto")) return "AMedida";
  return "Otro";
}

function normalizeSistema(sistema: string | null | undefined): string {
  const s = (sistema ?? "").trim().toLowerCase();
  if (s.includes("bow")) return "BowWindow";
  if (s.includes("guillot")) return "Guillotina";
  if (s.includes("celos")) return "Celosia";
  if (s.includes("oscilo")) return "Oscilobatiente";
  if (s.includes("corr")) return "Corredera";
  if (s.includes("abat")) return "Abatible";
  if (s.includes("bati")) return "Batiente";
  if (s.includes("proye")) return "Proyectante";
  if (s.includes("pivot")) return "Pivotante";
  if (s.includes("pleg")) return "Plegable";
  if (s.includes("mostrador")) return "Mostrador";
  if (s.includes("fijo")) return "Fijo";
  if (s.includes("boton")) return "Botones";
  if (s.includes("perfil") || s.includes("inferior")) return "PerfilInferior";
  if (s.includes("post") || s.includes("mont")) return "Postes";
  if (s.includes("marco")) return "Marco";
  if (s.includes("peg")) return "Pegado";
  if (s.includes("muro")) return "Muro";
  if (s.includes("circ")) return "Circular";
  return "default";
}

function resolveSistema(params: ComponentSVGParams): string {
  const source = [
    params.sistema,
    params.referencia,
    params.configuracion,
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeSistema(source);
}

function normalizeLeafCount(value: number | string | null | undefined): WindowLeafCount | null {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5) {
    return parsed;
  }

  return null;
}

function extractLeafCountFromText(value: string | null | undefined): WindowLeafCount | null {
  const match = (value ?? "").match(/\b([1-4])\s*hojas?\b/i);

  return normalizeLeafCount(match?.[1]);
}

function resolveWindowLeafCount(params: ComponentSVGParams, sistemaNorm: string): WindowLeafCount | null {
  const schemeLeafCount =
    extractLeafCountFromText(params.sheetScheme) ??
    extractLeafCountFromText(params.customSchemeDescription) ??
    extractLeafCountFromText(params.sheetVariant);

  if (schemeLeafCount) {
    return schemeLeafCount;
  }

  const explicitLeafCount = normalizeLeafCount(params.hojasBase);
  if (explicitLeafCount) {
    return explicitLeafCount;
  }

  const normalizedType = params.tipo.trim().toLowerCase();
  if (normalizedType === "ventana 1 hoja") {
    return 1;
  }

  if (normalizedType === "ventana") {
    if (
      sistemaNorm === "Abatible" ||
      sistemaNorm === "Proyectante" ||
      sistemaNorm === "Oscilobatiente"
    ) {
      return 1;
    }

    return 2;
  }

  return null;
}

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveBowWindowPaneCount(params: ComponentSVGParams): WindowLeafCount {
  const source = normalizeSearchText(
    [params.sheetScheme, params.sheetVariant, params.customSchemeDescription]
      .filter(Boolean)
      .join(" ")
  );

  if (source.includes("fijos laterales") && source.includes("corredera central 3 hojas")) {
    return 5;
  }

  if (
    source.includes("fijos laterales") &&
    source.includes("corredera central 2 hojas")
  ) {
    return 4;
  }

  if (source.includes("corredera central") && source.includes("panos fijos")) {
    return 5;
  }

  if (
    source.includes("corredera") &&
    (source.includes("fijo derecho") || source.includes("fijo izquierdo"))
  ) {
    return 3;
  }

  const countMatch = source.match(/\b([3-5])\s*(panos|hojas|abatibles|proyectantes)\b/);

  if (countMatch) {
    return normalizeLeafCount(countMatch[1]) ?? 3;
  }

  if (source.includes("4 o mas")) {
    return 4;
  }

  if (source.includes("2 proyectantes") || source.includes("corredera central 3 hojas")) {
    return 4;
  }

  return 3;
}

function resolveFixedSlidingPaneIndexes(
  params: ComponentSVGParams,
  hojas: WindowLeafCount | null
): Set<number> {
  if (!hojas || hojas < 2) {
    return new Set<number>();
  }

  const source = normalizeSearchText(
    [params.sheetVariant, params.customSchemeDescription].filter(Boolean).join(" ")
  );

  if (!source) {
    return new Set<number>();
  }

  if (source.includes("todas moviles")) {
    return new Set<number>();
  }

  if (hojas === 2) {
    if (source.includes("2 moviles") && !source.includes("fija")) {
      return new Set<number>();
    }

    if (source.includes("fija")) {
      return new Set<number>([0]);
    }
  }

  if (hojas === 3) {
    if (source.includes("2 moviles") && source.includes("1 fija")) {
      return new Set<number>([1]);
    }

    if (source.includes("1 movil") && source.includes("2 fijas")) {
      return new Set<number>([0, 2]);
    }

    if (source.includes("3 moviles")) {
      return new Set<number>();
    }

    if (source.includes("fija central") || source.includes("central") || source.includes("medio")) {
      return new Set<number>([1]);
    }

    if (source.includes("lateral") || source.includes("fijo lateral")) {
      return new Set<number>([0]);
    }
  }

  if (hojas === 4) {
    if (source.includes("4 moviles") && !source.includes("fija")) {
      return new Set<number>();
    }

    if (
      (source.includes("2 moviles") && source.includes("2 fijas")) ||
      source.includes("2 fijas") ||
      source.includes("laterales")
    ) {
      return new Set<number>([0, 3]);
    }
  }

  if (source.includes(`${hojas} moviles`) && !source.includes("fija")) {
    return new Set<number>();
  }

  if (hojas === 2 && source.includes("fija")) {
    return new Set<number>([0]);
  }

  return new Set<number>();
}

// ─── Átomos de dibujo ────────────────────────────────────────────────────────

/**
 * Panel de vidrio — uniforme en todos los componentes.
 * Mismo fill, stroke y reflejo siempre.
 */
function glassFill(x: number, y: number, w: number, h: number, gw: number): string {
  if (w <= 0 || h <= 0) return "";
  const rx = x, ry = y, rw = w, rh = h;
  return `<rect x="${px(rx)}" y="${px(ry)}" width="${px(rw)}" height="${px(rh)}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${gw}"/>`;
}

/** Marco exterior — solo contorno (sin relleno, plano 2D) */
function outerFrame(x: number, y: number, w: number, h: number, fW: number, color: string): string {
  return `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${color}" stroke-width="${fW}" rx="0.5"/>`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function technicalFrameLines(x: number, y: number, w: number, h: number, fW: number, color: string): string {
  const inset = Math.max(2.2, fW * 0.5);
  const diag = Math.max(8, fW * 2.4);

  return [
    `<line x1="${px(x + inset)}" y1="${px(y + inset)}" x2="${px(x + diag)}" y2="${px(y + diag)}" stroke="${color}" stroke-width="${px(Math.max(0.9, fW * 0.24))}" stroke-linecap="round"/>`,
    `<line x1="${px(x + w - inset)}" y1="${px(y + inset)}" x2="${px(x + w - diag)}" y2="${px(y + diag)}" stroke="${color}" stroke-width="${px(Math.max(0.9, fW * 0.24))}" stroke-linecap="round"/>`,
    `<line x1="${px(x + inset)}" y1="${px(y + h - inset)}" x2="${px(x + diag)}" y2="${px(y + h - diag)}" stroke="${color}" stroke-width="${px(Math.max(0.9, fW * 0.24))}" stroke-linecap="round"/>`,
    `<line x1="${px(x + w - inset)}" y1="${px(y + h - inset)}" x2="${px(x + w - diag)}" y2="${px(y + h - diag)}" stroke="${color}" stroke-width="${px(Math.max(0.9, fW * 0.24))}" stroke-linecap="round"/>`,
  ].join("");
}

/** Punta de flecha — chevron abierto, uniforme en todo el sistema */
function arrowTip(x: number, y: number, dir: "left" | "right" | "up" | "down", sw: number, color: string): string {
  const s = 4.8;
  const b = 2.8;
  const d: Record<string, string> = {
    left:  `M${px(x + s)} ${px(y - b)} L${px(x)} ${px(y)} L${px(x + s)} ${px(y + b)}`,
    right: `M${px(x - s)} ${px(y - b)} L${px(x)} ${px(y)} L${px(x - s)} ${px(y + b)}`,
    up:    `M${px(x - b)} ${px(y + s)} L${px(x)} ${px(y)} L${px(x + b)} ${px(y + s)}`,
    down:  `M${px(x - b)} ${px(y - s)} L${px(x)} ${px(y)} L${px(x + b)} ${px(y - s)}`,
  };
  return `<path d="${d[dir]}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Flecha deslizante horizontal doble — uniforme en todo el sistema */
function directionArrow(
  x: number,
  y: number,
  w: number,
  direction: "left" | "right",
  sw: number,
  color: string
): string {
  const tail = direction === "right" ? x : x + w;
  const head = direction === "right" ? x + w : x;

  return [
    `<line x1="${px(tail)}" y1="${px(y)}" x2="${px(head)}" y2="${px(y)}" stroke="${color}" stroke-width="${px(sw)}" stroke-linecap="round"/>`,
    arrowTip(head, y, direction, sw, color),
  ].join("");
}

function sidePullHandle(cx: number, cy: number, h: number): string {
  const bodyW = 4.6;
  const bodyH = Math.max(16, h);
  const innerW = 1.5;
  const innerH = bodyH - 4.8;
  return [
    `<rect x="${px(cx - bodyW / 2)}" y="${px(cy - bodyH / 2)}" width="${px(bodyW)}" height="${px(bodyH)}" rx="1.2" fill="${HANDLE_FILL}" stroke="${HANDLE_STROKE}" stroke-width="0.9"/>`,
    `<rect x="${px(cx - innerW / 2)}" y="${px(cy - innerH / 2)}" width="${px(innerW)}" height="${px(innerH)}" rx="0.7" fill="${HANDLE_STROKE}"/>`,
  ].join("");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function slidingLeafLabel(
  cx: number,
  y: number,
  name: string,
  color: string,
  variant = "preview"
): string {
  const fontSize = variant === "pdf" ? "11.2" : "8.5";
  const fontWeight = variant === "pdf" ? "600" : "500";
  return [
    `<text x="${px(cx)}" y="${px(y)}" text-anchor="middle" font-size="${fontSize}" font-family="sans-serif" fill="${color}" font-weight="${fontWeight}">${name}</text>`,
  ].join("");
}

/**
 * Manilla en L — uniforme en todo el sistema.
 * cx,cy = centro de la barra vertical.
 * arm = dirección del brazo horizontal.
 */
function lHandle(cx: number, cy: number, hH: number, arm: "left" | "right", sw: number, color: string): string {
  const bW = 2.6;
  const aL = 8.5;
  const aH = 2.2;
  const ax = arm === "right" ? cx + bW / 2 : cx - bW / 2 - aL;
  return [
    `<rect x="${px(cx - bW / 2)}" y="${px(cy - hH / 2)}" width="${px(bW)}" height="${px(hH)}" rx="${px(bW / 2)}" fill="${color}"/>`,
    `<rect x="${px(ax)}" y="${px(cy - aH / 2)}" width="${px(aL)}" height="${px(aH)}" rx="${px(aH / 2)}" fill="${color}"/>`,
  ].join("");
}

/** Bisagra rectangular — uniforme en todo el sistema */
function hinge(x: number, cy: number, hW: number, hH: number, color: string): string {
  return `<rect x="${px(x)}" y="${px(cy - hH / 2)}" width="${px(hW)}" height="${px(hH)}" rx="0.8" fill="${color}"/>`;
}

/** Arco de apertura uniforme para hojas abatibles */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function swingArc(
  startX: number,
  startY: number,
  radius: number,
  endX: number,
  endY: number,
  sw: number,
  color: string
): string {
  return `<path d="M${px(startX)} ${px(startY)} A${px(radius)} ${px(radius)} 0 0 0 ${px(endX)} ${px(endY)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="5,3"/>`;
}

/** Badge "FIJO" centrado */
function fixedBadge(cx: number, cy: number, p: Palette): string {
  const pW = 38, pH = 14;
  return [
    `<rect x="${px(cx - pW / 2)}" y="${px(cy - pH / 2)}" width="${pW}" height="${pH}" rx="${pH / 2}" fill="rgba(255,255,255,0.08)" stroke="${p.dim}" stroke-width="0.8"/>`,
    `<text x="${px(cx)}" y="${px(cy + 4)}" text-anchor="middle" font-size="8" font-family="sans-serif" fill="${p.dim}" font-weight="700" letter-spacing="0.08em">FIJO</text>`,
  ].join("");
}

// ─── Cotas ───────────────────────────────────────────────────────────────────

function dimH(x: number, y: number, w: number, text: string, p: Palette, v: string): string {
  const tk = v === "pdf" ? 2.4 : 6;
  const sw = v === "pdf" ? 0.8 : 1;
  const fs = v === "pdf" || v === "mobile-guided" ? 12 : 10;
  const fw2 = v === "pdf" ? "700" : "400";
  const textY = v === "pdf" ? y - 10 : y - 8;
  const textColor = v === "pdf" ? "#616b78" : p.dimTxt;
  const textHalo =
    v === "pdf"
      ? 'stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke fill"'
      : "";
  return [
    `<line x1="${px(x)}" y1="${px(y)}" x2="${px(x + w)}" y2="${px(y)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x)}" y1="${px(y - tk)}" x2="${px(x)}" y2="${px(y + tk)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x + w)}" y1="${px(y - tk)}" x2="${px(x + w)}" y2="${px(y + tk)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    v !== "pdf" ? arrowTip(x, y, "left", 1, p.dim) : "",
    v !== "pdf" ? arrowTip(x + w, y, "right", 1, p.dim) : "",
    `<text x="${px(x + w / 2)}" y="${px(textY)}" text-anchor="middle" font-size="${fs}" font-family="sans-serif" fill="${textColor}" font-weight="${fw2}" ${textHalo}>${escapeXml(text)}</text>`,
  ].join("");
}

function dimV(x: number, y: number, h: number, text: string, p: Palette, v: string): string {
  const tk = v === "pdf" ? 2.4 : 6;
  const sw = v === "pdf" ? 0.8 : 1;
  const fs = v === "pdf" || v === "mobile-guided" ? 12 : 10;
  const fw2 = v === "pdf" ? "700" : "400";
  const textX = v === "pdf" ? x - 15 : x - 11;
  const textColor = v === "pdf" ? "#616b78" : p.dimTxt;
  const textHalo =
    v === "pdf"
      ? 'stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke fill"'
      : "";
  return [
    `<line x1="${px(x)}" y1="${px(y)}" x2="${px(x)}" y2="${px(y + h)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x - tk)}" y1="${px(y)}" x2="${px(x + tk)}" y2="${px(y)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x - tk)}" y1="${px(y + h)}" x2="${px(x + tk)}" y2="${px(y + h)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    v !== "pdf" ? arrowTip(x, y, "up", 1, p.dim) : "",
    v !== "pdf" ? arrowTip(x, y + h, "down", 1, p.dim) : "",
    `<text x="${px(textX)}" y="${px(y + h / 2)}" text-anchor="middle" font-size="${fs}" font-family="sans-serif" fill="${textColor}" font-weight="${fw2}" ${textHalo} transform="rotate(-90 ${px(textX)} ${px(y + h / 2)})">${escapeXml(text)}</text>`,
  ].join("");
}

// ─── Componentes: Ventanas ────────────────────────────────────────────────────

type WindowPane = {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
};

type ProjectedFixedLayout = "none" | "projected_top" | "projected_bottom";

type WindowVisualPalette = Palette & {
  glass: string;
  glassStroke: string;
  relief: string;
  frameInner: string;
  frameOutline: string | null;
};

const WINDOW_PROFILE_JOIN =
  'stroke-linecap="square" stroke-linejoin="miter" vector-effect="non-scaling-stroke"';

const WINDOW_ALUMINUM = "#6B7280";
const WINDOW_ALUMINUM_SECONDARY = "#5F6670";
const WINDOW_ALUMINUM_RELIEF = "#8A949E";
const WINDOW_BLACK_FRAME = "#2A2A2A";
const WINDOW_BLACK_SECONDARY = "#444444";
const WINDOW_GLASS = "#DCEAF7";
const WINDOW_GLASS_STROKE = "#A7C7E7";
const WINDOW_DIM = "#8A8F98";
const WINDOW_DIM_TEXT = "#59616B";
const WINDOW_DETAIL = "#4B5563";

function isExplicitBlackProfile(colorHex: string | null | undefined): boolean {
  return ["#000000", "#111827", "#1f2937", "#2a2a2a", "#444444"].includes(
    colorHex?.trim().toLowerCase() ?? ""
  );
}

function normalizeWindowProfileColor(colorHex: string | null | undefined): string {
  const normalized = colorHex?.trim().toLowerCase();

  if (!isValidHex(normalized)) return WINDOW_ALUMINUM;
  if (normalized === "#a8a8a8") return WINDOW_ALUMINUM;
  if (normalized === "#f0eeeb" || normalized === "#ffffff") return "#FFFFFF";
  if (isExplicitBlackProfile(normalized)) return WINDOW_BLACK_FRAME;

  return normalized.toUpperCase();
}

function resolveWindowPalette(colorHex?: string | null): WindowVisualPalette {
  const frame = normalizeWindowProfileColor(colorHex);
  const isBlack = isExplicitBlackProfile(frame);
  const isNaturalAluminum = frame === WINDOW_ALUMINUM;
  const isWhite = frame === "#FFFFFF";
  const isLight = relativeLuminance(frame) > 0.72;
  const isDark = relativeLuminance(frame) < 0.22;
  const frameInner = isLight
    ? mixHex(frame, "#000000", 0.22)
    : isNaturalAluminum
      ? frame
      : isDark
        ? mixHex(frame, "#FFFFFF", 0.28)
        : frame;
  const frameOutline = isLight ? mixHex(frame, "#000000", 0.42) : null;

  return {
    frame,
    div: isBlack
      ? WINDOW_BLACK_SECONDARY
      : isNaturalAluminum
        ? frame
        : isWhite
          ? "#D1D5DB"
          : isDark
            ? mixHex(frame, "#FFFFFF", 0.12)
            : mixHex(frame, "#000000", 0.14),
    detail: WINDOW_DETAIL,
    dim: WINDOW_DIM,
    dimTxt: WINDOW_DIM_TEXT,
    label: WINDOW_DIM_TEXT,
    glass: WINDOW_GLASS,
    glassStroke: WINDOW_GLASS_STROKE,
    relief: isWhite ? "#E5E7EB" : isNaturalAluminum ? WINDOW_ALUMINUM_RELIEF : darkenHex(frame, 0.04),
    frameInner,
    frameOutline,
  };
}

function windowOuterFrameWeight(v: string): number {
  return v === "pdf" ? 6 : 5;
}

function windowSashWeight(v: string): number {
  return v === "pdf" ? 3.2 : 2.6;
}

function windowTrackWeight(v: string): number {
  return v === "pdf" ? 3 : 2.4;
}

function windowDetailWeight(v: string): number {
  return v === "mobile-guided" ? 1.5 : v === "pdf" ? 1.2 : 1.05;
}

function windowFrameInset(v: string): number {
  return v === "pdf" ? 5.6 : 4.8;
}

function drawWindowStrokeRect(
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string,
  strokeW: number,
  dataAttrs: string
): string {
  if (w <= 0 || h <= 0) return "";

  return `<rect ${dataAttrs} x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${stroke}" stroke-width="${px(strokeW)}" rx="0" ${WINDOW_PROFILE_JOIN}/>`;
}

function drawWindowProfileFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  strokeW: number,
  p: WindowVisualPalette,
  dataPart: string,
  options?: { skipInnerChannel?: boolean }
): string {
  const parts: string[] = [];

  if (p.frameOutline) {
    parts.push(
      drawWindowStrokeRect(
        x,
        y,
        w,
        h,
        p.frameOutline,
        strokeW + 2.4,
        `data-window-frame="outline" data-window-frame-part="${dataPart}"`
      )
    );
  }

  parts.push(
    drawWindowStrokeRect(
      x,
      y,
      w,
      h,
      p.frame,
      strokeW,
      `data-window-frame="outer" data-window-frame-part="${dataPart}"`
    )
  );

  if (options?.skipInnerChannel) {
    return parts.join("");
  }

  const inset = Math.max(strokeW * 0.42, 2.2);
  const innerW = w - inset * 2;
  const innerH = h - inset * 2;

  if (innerW > 0 && innerH > 0) {
    parts.push(
      drawWindowStrokeRect(
        x + inset,
        y + inset,
        innerW,
        innerH,
        p.frameInner,
        Math.max(1.2, strokeW * 0.34),
        `data-window-frame="inner-channel" data-window-frame-part="${dataPart}"`
      )
    );
  }

  return parts.join("");
}

function drawOuterAluminumFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: WindowVisualPalette
): string {
  return drawWindowProfileFrame(x, y, w, h, windowOuterFrameWeight(v), p, "outer");
}

function drawWindowProfilePath(
  pathD: string,
  strokeW: number,
  p: WindowVisualPalette,
  dataAttrs: string
): string {
  const parts: string[] = [];

  if (p.frameOutline) {
    parts.push(
      `<path ${dataAttrs} data-window-frame="outline" d="${pathD}" fill="none" stroke="${p.frameOutline}" stroke-width="${px(strokeW + 2.4)}" ${WINDOW_PROFILE_JOIN}/>`
    );
  }

  parts.push(
    `<path ${dataAttrs} data-window-frame="outer" d="${pathD}" fill="none" stroke="${p.frame}" stroke-width="${px(strokeW)}" ${WINDOW_PROFILE_JOIN}/>`
  );

  const innerStroke = Math.max(1.2, strokeW * 0.34);
  if (innerStroke > 0) {
    parts.push(
      `<path ${dataAttrs} data-window-frame="inner-channel" d="${pathD}" fill="none" stroke="${p.frameInner}" stroke-width="${px(innerStroke)}" ${WINDOW_PROFILE_JOIN} opacity="0.88"/>`
    );
  }

  return parts.join("");
}

function drawWindowProfileLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeW: number,
  p: WindowVisualPalette,
  dataAttrs: string
): string {
  const parts: string[] = [];

  if (p.frameOutline) {
    parts.push(
      `<line ${dataAttrs} data-window-divider="outline" x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${p.frameOutline}" stroke-width="${px(strokeW + 1.4)}" stroke-linecap="square"/>`
    );
  }

  parts.push(
    `<line ${dataAttrs} data-window-divider="true" x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${p.frame}" stroke-width="${px(strokeW)}" stroke-linecap="square"/>`
  );

  return parts.join("");
}

function drawBowPaneGlass(
  pathD: string,
  wp: WindowVisualPalette,
  dataAttrs: string,
  v: string
): string {
  return `<path data-window-bow-pane="true" d="${pathD}" fill="${wp.glass}" fill-opacity="0.82" stroke="${wp.glassStroke}" stroke-width="${px(gsw(v))}" ${dataAttrs}/>`;
}

function drawBowPaneProfile(pathD: string, v: string, p: WindowVisualPalette, dataAttrs: string): string {
  return drawWindowProfilePath(pathD, windowSashWeight(v), p, dataAttrs);
}

function drawInnerTrack(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: WindowVisualPalette,
  orientation: "horizontal" | "vertical" = "horizontal"
): string {
  const sw = windowTrackWeight(v);
  const inset = windowFrameInset(v) * 0.82;

  if (orientation === "vertical") {
    return [
      `<line data-window-track="left" x1="${px(x + inset)}" y1="${px(y + inset)}" x2="${px(x + inset)}" y2="${px(y + h - inset)}" stroke="${p.div}" stroke-width="${px(sw)}" stroke-linecap="butt"/>`,
      `<line data-window-track="right" x1="${px(x + w - inset)}" y1="${px(y + inset)}" x2="${px(x + w - inset)}" y2="${px(y + h - inset)}" stroke="${p.div}" stroke-width="${px(sw)}" stroke-linecap="butt"/>`,
    ].join("");
  }

  return [
    `<line data-window-track="top" x1="${px(x + inset)}" y1="${px(y + inset)}" x2="${px(x + w - inset)}" y2="${px(y + inset)}" stroke="${p.div}" stroke-width="${px(sw)}" stroke-linecap="butt"/>`,
    `<line data-window-track="bottom" x1="${px(x + inset)}" y1="${px(y + h - inset)}" x2="${px(x + w - inset)}" y2="${px(y + h - inset)}" stroke="${p.div}" stroke-width="${px(sw)}" stroke-linecap="butt"/>`,
  ].join("");
}

function drawGlassPanel(pane: WindowPane, v: string, p: WindowVisualPalette, extraData = ""): string {
  if (pane.w <= 0 || pane.h <= 0) return "";
  return `<rect data-window-glass="true"${extraData} x="${px(pane.x)}" y="${px(pane.y)}" width="${px(pane.w)}" height="${px(pane.h)}" fill="${p.glass}" fill-opacity="0.82" stroke="${p.glassStroke}" stroke-width="${px(gsw(v))}" rx="0"/>`;
}

function drawSashFrame(pane: WindowPane, v: string, p: WindowVisualPalette, extraData = ""): string {
  const sw = windowSashWeight(v);
  const parts: string[] = [];
  const sashAttrs = `data-window-sash="true"${extraData}`;

  if (p.frameOutline) {
    parts.push(
      drawWindowStrokeRect(
        pane.x,
        pane.y,
        pane.w,
        pane.h,
        p.frameOutline,
        sw + 1.6,
        `${sashAttrs} data-window-sash-layer="outline"`
      )
    );
  }

  parts.push(
    drawWindowStrokeRect(
      pane.x,
      pane.y,
      pane.w,
      pane.h,
      p.frame,
      sw,
      `${sashAttrs} data-window-sash-layer="outer"`
    )
  );

  const inset = Math.max(sw * 0.42, 2.2);
  const innerW = pane.w - inset * 2;
  const innerH = pane.h - inset * 2;

  if (innerW > 0 && innerH > 0) {
    parts.push(
      drawWindowStrokeRect(
        pane.x + inset,
        pane.y + inset,
        innerW,
        innerH,
        p.frameInner,
        Math.max(1.2, sw * 0.34),
        `${sashAttrs} data-window-sash-layer="inner-channel"`
      )
    );
  }

  return parts.join("");
}

function drawFixedPanel(pane: WindowPane, v: string, p: WindowVisualPalette): string {
  return [
    `<g data-window-fixed-panel="true">`,
    drawGlassPanel(pane, v, p, ' data-window-panel-role="fixed"'),
    drawSashFrame(pane, v, p, ' data-window-panel-role="fixed"'),
    `</g>`,
  ].join("");
}

function drawRecessedHandle(
  x: number,
  cy: number,
  h: number,
  v: string,
  p: WindowVisualPalette
): string {
  const sw = windowDetailWeight(v);
  const bodyW = v === "pdf" ? 7 : 6;
  const bodyH = clamp(h, 16, 24);
  const slotW = Math.max(1.7, bodyW * 0.32);
  const slotH = bodyH - 6;

  return [
    `<rect data-window-handle="recessed" x="${px(x - bodyW / 2)}" y="${px(cy - bodyH / 2)}" width="${px(bodyW)}" height="${px(bodyH)}" rx="0" fill="#E8EDF3" stroke="${p.detail}" stroke-width="${px(sw)}"/>`,
    `<rect data-window-handle-slot="true" x="${px(x - slotW / 2)}" y="${px(cy - slotH / 2)}" width="${px(slotW)}" height="${px(slotH)}" rx="0" fill="${p.detail}"/>`,
  ].join("");
}

function drawSlidingArrow(
  cx: number,
  cy: number,
  w: number,
  direction: "left" | "right",
  v: string,
  p: WindowVisualPalette
): string {
  const sw = windowDetailWeight(v);
  const head = direction === "right" ? cx + w / 2 : cx - w / 2;
  const tail = direction === "right" ? cx - w / 2 : cx + w / 2;
  const chevron = Math.max(4, w * 0.13);
  const sign = direction === "right" ? -1 : 1;

  return [
    `<line data-window-sliding-arrow="true" x1="${px(tail)}" y1="${px(cy)}" x2="${px(head)}" y2="${px(cy)}" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-linecap="butt"/>`,
    `<path data-window-sliding-arrow-head="true" d="M${px(head + sign * chevron)} ${px(cy - chevron * 0.62)} L${px(head)} ${px(cy)} L${px(head + sign * chevron)} ${px(cy + chevron * 0.62)}" fill="none" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-linecap="butt" stroke-linejoin="miter"/>`,
  ].join("");
}

function drawSlidingSash(
  pane: WindowPane,
  v: string,
  p: WindowVisualPalette,
  direction: "left" | "right",
  handleSide: "left" | "right"
): string {
  const handleX =
    handleSide === "right"
      ? pane.x + pane.w - Math.max(6, pane.w * 0.06)
      : pane.x + Math.max(6, pane.w * 0.06);
  const arrowW = clamp(pane.w * 0.36, 18, 48);

  return [
    `<g data-window-sliding-sash="true" data-window-slide-direction="${direction}">`,
    drawGlassPanel(pane, v, p, ' data-window-panel-role="sliding"'),
    drawSashFrame(pane, v, p, ' data-window-panel-role="sliding"'),
    drawRecessedHandle(handleX, pane.centerY, pane.h * 0.15, v, p),
    drawSlidingArrow(pane.centerX, pane.centerY, arrowW, direction, v, p),
    `</g>`,
  ].join("");
}

function drawMeetingProfiles(panes: WindowPane[], v: string, p: WindowVisualPalette): string {
  if (panes.length < 2) return "";
  const sw = Math.max(windowSashWeight(v), windowTrackWeight(v));
  const top = panes[0].y;
  const bottom = panes[0].y + panes[0].h;

  return panes
    .slice(0, -1)
    .map((pane, index) => {
      const next = panes[index + 1];
      const gapCenter = (pane.x + pane.w + next.x) / 2;
      const offset = Math.max(1.4, sw * 0.36);
      const profileW = sw * 0.82;
      const outlineW = p.frameOutline ? profileW + 1.4 : profileW;
      const outlineStroke = p.frameOutline ?? p.frame;

      return [
        p.frameOutline
          ? `<line data-window-meeting-profile="outline" x1="${px(gapCenter - offset)}" y1="${px(top)}" x2="${px(gapCenter - offset)}" y2="${px(bottom)}" stroke="${outlineStroke}" stroke-width="${px(outlineW)}" stroke-linecap="square"/>`
          : "",
        p.frameOutline
          ? `<line data-window-meeting-profile="outline" x1="${px(gapCenter + offset)}" y1="${px(top)}" x2="${px(gapCenter + offset)}" y2="${px(bottom)}" stroke="${outlineStroke}" stroke-width="${px(outlineW)}" stroke-linecap="square"/>`
          : "",
        `<line data-window-meeting-profile="true" x1="${px(gapCenter - offset)}" y1="${px(top)}" x2="${px(gapCenter - offset)}" y2="${px(bottom)}" stroke="${p.frame}" stroke-width="${px(profileW)}" stroke-linecap="square"/>`,
        `<line data-window-meeting-profile="true" x1="${px(gapCenter + offset)}" y1="${px(top)}" x2="${px(gapCenter + offset)}" y2="${px(bottom)}" stroke="${p.frame}" stroke-width="${px(profileW)}" stroke-linecap="square"/>`,
      ].join("");
    })
    .join("");
}

function drawHinges(pane: WindowPane, side: "left" | "right", v: string, p: WindowVisualPalette): string {
  const hingeW = v === "pdf" ? 6 : 5;
  const hingeH = clamp(pane.h * 0.09, 9, 14);
  const x = side === "left" ? pane.x - hingeW * 0.45 : pane.x + pane.w - hingeW * 0.55;
  const positions = [pane.y + pane.h * 0.24, pane.y + pane.h * 0.74];

  return positions
    .map(
      (cy) =>
        `<rect data-window-hinge="true" x="${px(x)}" y="${px(cy - hingeH / 2)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="0" fill="${p.detail}"/>`
    )
    .join("");
}

function drawSwingArc(pane: WindowPane, side: "left" | "right", v: string, p: WindowVisualPalette): string {
  const inset = Math.max(5, windowFrameInset(v) * 0.68);
  const radius = Math.min(pane.w * 0.82, pane.h * 0.82);
  const sw = windowDetailWeight(v);
  const startX = side === "left" ? pane.x + inset : pane.x + pane.w - inset;
  const endX = side === "left" ? pane.x + pane.w - inset : pane.x + inset;
  const sweep = side === "left" ? 1 : 0;

  return `<path data-window-swing-arc="true" d="M${px(startX)} ${px(pane.y + inset)} A${px(radius)} ${px(radius)} 0 0 ${sweep} ${px(endX)} ${px(pane.y + pane.h * 0.58)}" fill="none" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-dasharray="5,3" stroke-linecap="butt"/>`;
}

function drawProjectionIndicator(pane: WindowPane, v: string, p: WindowVisualPalette): string {
  const sw = windowDetailWeight(v);
  const topY = pane.y + Math.max(10, pane.h * 0.14);
  const bottomY = pane.y + pane.h - Math.max(10, pane.h * 0.16);
  const leftX = pane.x + Math.max(9, pane.w * 0.2);
  const rightX = pane.x + pane.w - Math.max(9, pane.w * 0.2);

  return [
    `<line data-window-projection-indicator="true" x1="${px(leftX)}" y1="${px(topY)}" x2="${px(pane.centerX)}" y2="${px(bottomY)}" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-dasharray="5,3" stroke-linecap="butt"/>`,
    `<line data-window-projection-indicator="true" x1="${px(rightX)}" y1="${px(topY)}" x2="${px(pane.centerX)}" y2="${px(bottomY)}" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-dasharray="5,3" stroke-linecap="butt"/>`,
    `<line data-window-projection-indicator="true" x1="${px(pane.centerX)}" y1="${px(bottomY - Math.max(12, pane.h * 0.12))}" x2="${px(pane.centerX)}" y2="${px(bottomY)}" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-linecap="butt"/>`,
  ].join("");
}

function drawTiltIndicator(pane: WindowPane, v: string, p: WindowVisualPalette): string {
  const sw = windowDetailWeight(v);
  const topY = pane.y + Math.max(12, pane.h * 0.18);
  const baseY = pane.y + pane.h - Math.max(11, pane.h * 0.14);
  const leftX = pane.x + Math.max(10, pane.w * 0.22);
  const rightX = pane.x + pane.w - Math.max(10, pane.w * 0.22);

  return [
    `<line data-window-tilt-indicator="true" x1="${px(leftX)}" y1="${px(baseY)}" x2="${px(pane.centerX)}" y2="${px(topY)}" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-dasharray="4,3" stroke-linecap="butt"/>`,
    `<line data-window-tilt-indicator="true" x1="${px(rightX)}" y1="${px(baseY)}" x2="${px(pane.centerX)}" y2="${px(topY)}" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-dasharray="4,3" stroke-linecap="butt"/>`,
    `<path data-window-tilt-indicator="true" d="M${px(pane.centerX - 5)} ${px(topY + 8)} L${px(pane.centerX)} ${px(topY)} L${px(pane.centerX + 5)} ${px(topY + 8)}" fill="none" stroke="${p.detail}" stroke-width="${px(sw)}" stroke-linecap="butt" stroke-linejoin="miter"/>`,
  ].join("");
}

function resolveProjectedFixedLayout(params: ComponentSVGParams): ProjectedFixedLayout {
  const source = normalizeSearchText(
    [
      params.sheetScheme,
      params.sheetVariant,
      params.customSchemeDescription,
      params.configuracion,
      params.referencia,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!source.includes("proyectante") || !source.includes("fijo")) {
    return "none";
  }

  if (
    source.includes("proyectante abajo") ||
    source.includes("proyectante inferior") ||
    source.includes("fijo arriba") ||
    source.includes("fijo superior")
  ) {
    return "projected_bottom";
  }

  return "projected_top";
}

function buildWindowPanes(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  hojas: WindowLeafCount,
  _p: Palette
) {
  void _p;
  const p = resolveWindowPalette(_p.frame);
  const F = windowOuterFrameWeight(v);
  const D = windowSashWeight(v);
  const FI = fi(v);
  const frameInset = windowFrameInset(v);
  const glassY = y + frameInset;
  const glassH = h - frameInset * 2;

  if (hojas === 1) {
    const pane = {
      x: x + frameInset,
      y: glassY,
      w: w - frameInset * 2,
      h: glassH,
    };

    return {
      outer: drawOuterAluminumFrame(x, y, w, h, v, p),
      divider: "",
      panes: [
        {
          ...pane,
          centerX: pane.x + pane.w / 2,
          centerY: pane.y + pane.h / 2,
        },
      ] satisfies WindowPane[],
      glass: drawGlassPanel({ ...pane, centerX: pane.x + pane.w / 2, centerY: pane.y + pane.h / 2 }, v, p),
      railY: y + h - FI - D * 0.5,
      handleInset: Math.max(5, F * 1.1),
      palette: p,
    };
  }

  const dividerW = Math.max(3.2, D * 1.55);
  const paneW = (w - frameInset * 2 - dividerW * (hojas - 1)) / hojas;
  const panes = Array.from({ length: hojas }, (_, index) => {
    const pane = {
      x: x + frameInset + index * (paneW + dividerW),
      y: glassY,
      w: paneW,
      h: glassH,
    };

    return {
      ...pane,
      centerX: pane.x + pane.w / 2,
      centerY: pane.y + pane.h / 2,
    } satisfies WindowPane;
  });
  const divider = panes
    .slice(0, -1)
    .map((pane) => {
      const dividerX = pane.x + pane.w + dividerW / 2;

      const dividerStroke = p.frameOutline ?? p.frame;
      const dividerOutlineW = p.frameOutline ? dividerW + 1.4 : dividerW;

      return [
        p.frameOutline
          ? `<line data-window-divider="outline" x1="${px(dividerX)}" y1="${px(y + frameInset * 0.5)}" x2="${px(dividerX)}" y2="${px(y + h - frameInset * 0.5)}" stroke="${dividerStroke}" stroke-width="${px(dividerOutlineW)}" stroke-linecap="square"/>`
          : "",
        `<line data-window-divider="true" x1="${px(dividerX)}" y1="${px(y + frameInset * 0.5)}" x2="${px(dividerX)}" y2="${px(y + h - frameInset * 0.5)}" stroke="${p.frame}" stroke-width="${px(dividerW)}" stroke-linecap="square"/>`,
      ].join("");
    })
    .join("");

  return {
    outer: drawOuterAluminumFrame(x, y, w, h, v, p),
    divider,
    panes,
    glass: panes.map((pane) => drawGlassPanel(pane, v, p)).join(""),
    railY: y + h - FI - D * 0.5,
    handleInset: Math.max(5, F * 1.1),
    palette: p,
  };
}

function drawVentanaCorredera(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  hojas: WindowLeafCount,
  fixedPaneIndexes: Set<number>
): string {
  const { outer, panes, palette } = buildWindowPanes(
    x,
    y,
    w,
    h,
    v,
    hojas,
    p
  );

  if (hojas === 1) {
    const pane = panes[0];

    return [
      outer,
      drawInnerTrack(x, y, w, h, v, palette),
      drawSlidingSash(pane, v, palette, "left", "right"),
    ].join("");
  }

  const paneLayers = panes
    .map((pane, index) => {
      if (fixedPaneIndexes.has(index)) {
        return drawFixedPanel(pane, v, palette);
      }

      const direction = index % 2 === 0 ? "right" : "left";
      const handleSide = index % 2 === 0 ? "right" : "left";

      return drawSlidingSash(pane, v, palette, direction, handleSide);
    })
    .join("");

  return [
    outer,
    drawInnerTrack(x, y, w, h, v, palette),
    paneLayers,
    drawMeetingProfiles(panes, v, palette),
  ].join("");
}

function drawVerticalMotionArrow(
  x: number,
  y1: number,
  y2: number,
  direction: "up" | "down",
  sw: number,
  color: string
): string {
  const headY = direction === "up" ? y1 : y2;
  const chevron = 4.6;
  const d =
    direction === "up"
      ? `M${px(x - chevron * 0.62)} ${px(headY + chevron)} L${px(x)} ${px(headY)} L${px(x + chevron * 0.62)} ${px(headY + chevron)}`
      : `M${px(x - chevron * 0.62)} ${px(headY - chevron)} L${px(x)} ${px(headY)} L${px(x + chevron * 0.62)} ${px(headY - chevron)}`;

  return [
    `<line data-window-vertical-arrow="true" x1="${px(x)}" y1="${px(y1)}" x2="${px(x)}" y2="${px(y2)}" stroke="${color}" stroke-width="${px(sw)}" stroke-linecap="butt"/>`,
    `<path data-window-vertical-arrow-head="true" d="${d}" fill="none" stroke="${color}" stroke-width="${px(sw)}" stroke-linecap="butt" stroke-linejoin="miter"/>`,
  ].join("");
}

function drawVentanaGuillotina(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  configurationSource?: string | null
): string {
  const wp = resolveWindowPalette(p.frame);
  const dividerW = Math.max(3.5, windowSashWeight(v) * 1.35);
  const FI = windowFrameInset(v);
  const source = normalizeSearchText(configurationSource);
  const isDouble = source.includes("doble");
  const dividerY = y + h / 2;
  const glassX = x + FI;
  const glassW = w - FI * 2;
  const topY = y + FI;
  const paneH = h / 2 - FI * 1.5;
  const bottomY = dividerY + FI * 0.5;
  const arrowStroke = windowDetailWeight(v);
  const topPane: WindowPane = {
    x: glassX,
    y: topY,
    w: glassW,
    h: paneH,
    centerX: glassX + glassW / 2,
    centerY: topY + paneH / 2,
  };
  const bottomPane: WindowPane = {
    x: glassX,
    y: bottomY,
    w: glassW,
    h: paneH,
    centerX: glassX + glassW / 2,
    centerY: bottomY + paneH / 2,
  };

  return [
    drawOuterAluminumFrame(x, y, w, h, v, wp),
    drawInnerTrack(x, y, w, h, v, wp),
    drawGlassPanel(topPane, v, wp),
    drawSashFrame(topPane, v, wp),
    drawGlassPanel(bottomPane, v, wp),
    drawSashFrame(bottomPane, v, wp),
    `<line data-guillotina-divider="horizontal" x1="${px(x + FI * 0.35)}" y1="${px(dividerY)}" x2="${px(x + w - FI * 0.35)}" y2="${px(dividerY)}" stroke="${wp.frame}" stroke-width="${px(dividerW)}" stroke-linecap="butt"/>`,
    isDouble
      ? drawVerticalMotionArrow(x + w / 2, topY + paneH * 0.62, topY + paneH * 0.3, "down", arrowStroke, wp.detail)
      : "",
    drawVerticalMotionArrow(x + w / 2, bottomY + paneH * 0.68, bottomY + paneH * 0.35, "up", arrowStroke, wp.detail),
  ].join("");
}

function drawVentanaCelosia(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  configurationSource?: string | null
): string {
  const wp = resolveWindowPalette(p.frame);
  const D = windowTrackWeight(v);
  const FI = windowFrameInset(v);
  const source = normalizeSearchText(configurationSource);
  const hasFixedBottom = source.includes("fijo") || source.includes("inferior");
  const ventH = hasFixedBottom ? h * 0.66 : h - FI * 2;
  const ventY = y + FI;
  const fixedY = ventY + ventH + D * 1.5;
  const fixedH = y + h - FI - fixedY;
  const glassX = x + FI;
  const glassW = w - FI * 2;
  const slatCount = hasFixedBottom ? 4 : 6;
  const slatGap = ventH / (slatCount + 0.65);
  const slatH = clamp(slatGap * 0.42, 5, 12);
  const sideInset = Math.max(4, D * 1.5);
  const slats = Array.from({ length: slatCount }, (_, index) => {
    const cy = ventY + slatGap * (index + 0.72);
    const left = glassX + sideInset;
    const right = glassX + glassW - sideInset;

    return [
      `<rect data-celosia-lama="true" x="${px(left)}" y="${px(cy - slatH / 2)}" width="${px(right - left)}" height="${px(slatH)}" rx="0" fill="${wp.glass}" fill-opacity="0.82" stroke="${wp.frame}" stroke-width="${px(windowDetailWeight(v))}" stroke-linejoin="miter"/>`,
      `<line data-celosia-lama-axis="true" x1="${px(left)}" y1="${px(cy)}" x2="${px(right)}" y2="${px(cy)}" stroke="${wp.div}" stroke-width="${px(windowDetailWeight(v) * 0.8)}" stroke-linecap="butt"/>`,
    ].join("");
  }).join("");
  const sideRails = [
    `<line x1="${px(glassX + sideInset * 0.35)}" y1="${px(ventY)}" x2="${px(glassX + sideInset * 0.35)}" y2="${px(ventY + ventH)}" stroke="${wp.div}" stroke-width="${px(D * 0.9)}" stroke-linecap="butt"/>`,
    `<line x1="${px(glassX + glassW - sideInset * 0.35)}" y1="${px(ventY)}" x2="${px(glassX + glassW - sideInset * 0.35)}" y2="${px(ventY + ventH)}" stroke="${wp.div}" stroke-width="${px(D * 0.9)}" stroke-linecap="butt"/>`,
  ].join("");
  const handle = drawRecessedHandle(x + w - FI - sideInset * 0.35, ventY + ventH / 2, clamp(h * 0.13, 14, 20), v, wp);
  const fixedPaneRect: WindowPane = {
    x: glassX,
    y: fixedY,
    w: glassW,
    h: Math.max(1, fixedH),
    centerX: glassX + glassW / 2,
    centerY: fixedY + Math.max(1, fixedH) / 2,
  };
  const fixedPane = hasFixedBottom
    ? [
        `<line x1="${px(x + FI * 0.35)}" y1="${px(fixedY - D * 0.75)}" x2="${px(x + w - FI * 0.35)}" y2="${px(fixedY - D * 0.75)}" stroke="${wp.frame}" stroke-width="${px(Math.max(3.2, D * 1.4))}" stroke-linecap="butt"/>`,
        drawFixedPanel(fixedPaneRect, v, wp),
      ].join("")
    : "";

  return [
    drawOuterAluminumFrame(x, y, w, h, v, wp),
    sideRails,
    slats,
    handle,
    fixedPane,
  ].join("");
}

function drawVentanaAbatible(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  hojas: 1 | 2
): string {
  const { outer, divider, panes, palette } = buildWindowPanes(x, y, w, h, v, hojas, p);
  const handleH = clamp(h * 0.14, 13, 19);

  const leaf = (pane: WindowPane, side: "left" | "right") => {
    const handleX =
      side === "left"
        ? pane.x + pane.w - Math.max(6, pane.w * 0.08)
        : pane.x + Math.max(6, pane.w * 0.08);
    return [
      drawGlassPanel(pane, v, palette),
      drawSashFrame(pane, v, palette, ' data-window-panel-role="abatible"'),
      drawHinges(pane, side, v, palette),
      drawRecessedHandle(handleX, pane.centerY, handleH, v, palette),
      drawSwingArc(pane, side, v, palette),
    ].join("");
  };

  if (hojas === 1) {
    const pane = panes[0];

    return [
      outer,
      drawInnerTrack(x, y, w, h, v, palette, "vertical"),
      leaf(pane, "left"),
    ].join("");
  }

  const leftPane = panes[0];
  const rightPane = panes[1];

  return [
    outer,
    divider,
    drawInnerTrack(x, y, w, h, v, palette, "vertical"),
    leaf(leftPane, "left"),
    leaf(rightPane, "right"),
  ].join("");
}

function drawProyectanteGuides(pane: WindowPane, v: string, p: WindowVisualPalette) {
  return drawProjectionIndicator(pane, v, p);
}

function drawVentanaProyectante(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  hojas: 1 | 2
): string {
  const { outer, divider, panes, palette } = buildWindowPanes(x, y, w, h, v, hojas, p);
  const handleH = clamp(h * 0.12, 12, 17);
  const hinges = panes
    .map((pane) => {
      const hingeW = Math.max(8, pane.w * 0.18);
      const hingeH = Math.max(3.4, windowTrackWeight(v) * 1.2);

      return [
        `<rect data-window-projecting-hinge="true" x="${px(pane.x + pane.w * 0.26 - hingeW / 2)}" y="${px(pane.y - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="0" fill="${palette.detail}"/>`,
        `<rect data-window-projecting-hinge="true" x="${px(pane.x + pane.w * 0.74 - hingeW / 2)}" y="${px(pane.y - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="0" fill="${palette.detail}"/>`,
      ].join("");
    })
    .join("");
  const paneLayers = panes
    .map((pane) =>
      [
        drawGlassPanel(pane, v, palette),
        drawSashFrame(pane, v, palette, ' data-window-panel-role="proyectante"'),
      ].join("")
    )
    .join("");
  const guides = panes.map((pane) => drawProyectanteGuides(pane, v, palette)).join("");
  const handles =
    hojas === 1
      ? drawRecessedHandle(x + w * 0.5, y + h - windowFrameInset(v) * 0.9, handleH, v, palette)
      : panes
          .map((pane) =>
            drawRecessedHandle(pane.centerX, y + h - windowFrameInset(v) * 0.9, handleH, v, palette)
          )
          .join("");

  return [outer, drawInnerTrack(x, y, w, h, v, palette), paneLayers, divider, hinges, guides, handles].join("");
}

function drawVentanaProyectanteFijoVertical(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  layout: Exclude<ProjectedFixedLayout, "none">
): string {
  const wp = resolveWindowPalette(p.frame);
  const D = windowSashWeight(v);
  const FI = windowFrameInset(v);
  const dividerH = Math.max(3.2, D * 1.55);
  const usableH = Math.max(20, h - FI * 2 - dividerH);
  const projectedH = usableH * 0.5;
  const fixedH = usableH - projectedH;
  const paneX = x + FI;
  const paneW = w - FI * 2;
  const topPaneH = layout === "projected_top" ? projectedH : fixedH;
  const bottomPaneH = layout === "projected_top" ? fixedH : projectedH;
  const topPane: WindowPane = {
    x: paneX,
    y: y + FI,
    w: paneW,
    h: topPaneH,
    centerX: paneX + paneW / 2,
    centerY: y + FI + topPaneH / 2,
  };
  const bottomPane: WindowPane = {
    x: paneX,
    y: topPane.y + topPane.h + dividerH,
    w: paneW,
    h: bottomPaneH,
    centerX: paneX + paneW / 2,
    centerY: topPane.y + topPane.h + dividerH + bottomPaneH / 2,
  };
  const projectedPane = layout === "projected_top" ? topPane : bottomPane;
  const hingeW = Math.max(11, projectedPane.w * 0.15);
  const hingeH = Math.max(3.4, D * 1.2);

  return [
    drawOuterAluminumFrame(x, y, w, h, v, wp),
    drawInnerTrack(x, y, w, h, v, wp),
    layout === "projected_top" ? drawGlassPanel(topPane, v, wp) : drawFixedPanel(topPane, v, wp),
    layout === "projected_top" ? drawSashFrame(topPane, v, wp, ' data-window-panel-role="proyectante"') : "",
    layout === "projected_top" ? drawFixedPanel(bottomPane, v, wp) : drawGlassPanel(bottomPane, v, wp),
    layout === "projected_top" ? "" : drawSashFrame(bottomPane, v, wp, ' data-window-panel-role="proyectante"'),
    `<line x1="${px(x + FI * 0.5)}" y1="${px(topPane.y + topPane.h + dividerH / 2)}" x2="${px(x + w - FI * 0.5)}" y2="${px(topPane.y + topPane.h + dividerH / 2)}" stroke="${wp.frame}" stroke-width="${px(dividerH)}" stroke-linecap="butt"/>`,
    `<rect data-window-projecting-hinge="true" x="${px(projectedPane.x + projectedPane.w * 0.26 - hingeW / 2)}" y="${px(projectedPane.y - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="0" fill="${wp.detail}"/>`,
    `<rect data-window-projecting-hinge="true" x="${px(projectedPane.x + projectedPane.w * 0.74 - hingeW / 2)}" y="${px(projectedPane.y - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="0" fill="${wp.detail}"/>`,
    drawProyectanteGuides(projectedPane, v, wp),
    drawRecessedHandle(
      projectedPane.centerX,
      projectedPane.y + projectedPane.h - FI * 0.9,
      clamp(projectedPane.h * 0.18, 12, 17),
      v,
      wp
    ),
  ].join("");
}

function drawBowWindow(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  paneCount: WindowLeafCount,
  opening: string | null | undefined,
  composition: string | null | undefined
): string {
  const wp = resolveWindowPalette(p.frame);
  const F = windowOuterFrameWeight(v);
  const D = windowSashWeight(v);
  const DT = windowDetailWeight(v);
  const FI = windowFrameInset(v);
  const count = clamp(paneCount, 3, 5);
  const depth = Math.min(h * 0.1, 18);
  const normalizedOpening = normalizeSearchText(opening);
  const normalizedComposition = normalizeSearchText(composition);
  const panes: string[] = [];
  const dividers: string[] = [];

  type BowPaneRole = "fixed" | "sliding-left" | "sliding-right" | "sliding-neutral" | "projected" | "abatible";

  const bowPaneRole = (index: number): BowPaneRole => {
    const isFirst = index === 0;
    const isLast = index === count - 1;

    if (normalizedOpening.includes("corredera")) {
      if (normalizedComposition.includes("fijo derecho")) {
        if (isLast) return "fixed";
        return index === 0 ? "sliding-right" : "sliding-left";
      }

      if (normalizedComposition.includes("fijo izquierdo")) {
        if (isFirst) return "fixed";
        return index === count - 2 ? "sliding-right" : "sliding-left";
      }

      if (
        normalizedComposition.includes("fijos laterales") ||
        normalizedComposition.includes("panos fijos")
      ) {
        if (isFirst || isLast || (count === 5 && normalizedComposition.includes("panos fijos") && index === 1)) {
          return "fixed";
        }

        if (count === 4 && normalizedComposition.includes("corredera central 2 hojas")) {
          return index === 1 ? "sliding-right" : "sliding-left";
        }

        if (count === 5 && normalizedComposition.includes("panos fijos")) {
          if (index === 2) return "sliding-right";
          return "sliding-left";
        }

        if (count === 5 && normalizedComposition.includes("corredera central 3 hojas")) {
          if (index === 1) return "sliding-left";
          if (index === 2) return "sliding-neutral";
          return "sliding-right";
        }

        return index <= Math.floor((count - 1) / 2) ? "sliding-left" : "sliding-right";
      }

      if (count === 3) {
        return isLast ? "fixed" : index === 0 ? "sliding-right" : "sliding-left";
      }

      return isFirst || isLast ? "fixed" : index <= Math.floor(count / 2) ? "sliding-left" : "sliding-right";
    }

    if (normalizedOpening.includes("proyectante")) {
      const isFixedCenterWithProjectingLaterals =
        normalizedComposition.includes("fijo central") &&
        normalizedComposition.includes("proyectantes laterales");
      const isFixedLateralsWithProjectingCenter =
        normalizedComposition.includes("fijos laterales") &&
        normalizedComposition.includes("proyectante central");

      if (isFixedCenterWithProjectingLaterals) {
        return index === Math.floor(count / 2) ? "fixed" : "projected";
      }

      if (isFixedLateralsWithProjectingCenter) {
        return index === Math.floor(count / 2) ? "projected" : "fixed";
      }

      if (normalizedComposition.includes("2 proyectantes")) {
        if (index === 1 || index === count - 2) {
          return "projected";
        }

        return "fixed";
      }

      if (normalizedComposition.includes("1 proyectante")) {
        return index === Math.floor(count / 2) ? "projected" : "fixed";
      }

      if (normalizedComposition.includes("proyectante central")) {
        return index === Math.floor(count / 2) ? "projected" : "fixed";
      }

      if (normalizedComposition.includes("fijo central")) {
        return index === Math.floor(count / 2) ? "fixed" : "projected";
      }

      return isFirst || isLast ? "projected" : "fixed";
    }

    if (normalizedOpening.includes("abatible") || normalizedOpening.includes("batiente")) {
      if (normalizedComposition.includes("central")) {
        return index === Math.floor(count / 2) ? "fixed" : "abatible";
      }

      return normalizedComposition.includes("fijo") && (isFirst || isLast) ? "fixed" : "abatible";
    }

    return "fixed";
  };

  const roles = Array.from({ length: count }, (_, index) => bowPaneRole(index));
  const isSlidingBow = normalizedOpening.includes("corredera");
  const isProjectingBow = normalizedOpening.includes("proyectante");
  const hasLeftSide =
    (roles[0] === "fixed" || (isProjectingBow && roles[0] === "projected")) &&
    (!isSlidingBow ||
      normalizedComposition.includes("fijo izquierdo") ||
      normalizedComposition.includes("fijos laterales") ||
      normalizedComposition.includes("panos fijos"));
  const hasRightSide =
    (roles[count - 1] === "fixed" || (isProjectingBow && roles[count - 1] === "projected")) &&
    (!isSlidingBow ||
      normalizedComposition.includes("fijo derecho") ||
      normalizedComposition.includes("fijos laterales") ||
      normalizedComposition.includes("panos fijos"));
  const sideCount = Number(hasLeftSide) + Number(hasRightSide);
  const sideW =
    sideCount === 2
      ? clamp(w * 0.145, 16, 34)
      : sideCount === 1
        ? clamp(w * 0.22, 20, 44)
        : 0;
  const frontLeft = x + (hasLeftSide ? sideW : 0);
  const frontRight = x + w - (hasRightSide ? sideW : 0);
  const frontTop = y + FI + depth * 0.45;
  const frontBottom = y + h - FI - depth * 0.45;
  const frontCount = Math.max(1, count - sideCount);
  const frontPaneW = (frontRight - frontLeft - FI * 2) / frontCount;
  const frontIndexOffset = hasLeftSide ? 1 : 0;
  const sideInsetY = depth * 0.72;
  const railTopY = frontTop - F * 0.55;
  const railBottomY = frontBottom + F * 0.55;
  const railOverhang = Math.max(2.5, F * 0.55);

  const renderPaneContent = (
    role: BowPaneRole,
    left: number,
    top: number,
    right: number,
    bottom: number,
    centerX: number,
    centerY: number
  ) => {
    if (role === "sliding-left" || role === "sliding-right") {
      const arrowW = clamp((right - left) * 0.34, 14, 28);
      return drawSlidingArrow(
        centerX,
        centerY,
        arrowW,
        role === "sliding-left" ? "left" : "right",
        v,
        wp
      );
    }

    if (role === "sliding-neutral") {
      const lineW = clamp((right - left) * 0.28, 10, 22);
      return `<line data-window-sliding-arrow="true" x1="${px(centerX - lineW / 2)}" y1="${px(centerY)}" x2="${px(centerX + lineW / 2)}" y2="${px(centerY)}" stroke="${wp.detail}" stroke-width="${px(DT)}" stroke-linecap="butt"/>`;
    }

    if (role === "projected") {
      return drawProyectanteGuides(
        {
          x: left + 3,
          y: top + 3,
          w: right - left - 6,
          h: bottom - top - 6,
          centerX,
          centerY,
        },
        v,
        wp
      );
    }

    if (role === "abatible") {
      return `<line data-window-swing-arc="true" x1="${px(left + 6)}" y1="${px(top + 6)}" x2="${px(right - 6)}" y2="${px(bottom - 6)}" stroke="${wp.detail}" stroke-width="${px(DT)}" stroke-dasharray="5,3" stroke-linecap="butt"/>`;
    }

    if (role === "fixed") return "";

    return "";
  };

  if (hasLeftSide) {
    const role = roles[0];
    const outerX = x + FI;
    const innerX = frontLeft + FI;
    const panePath = [
      `M${px(outerX)} ${px(frontTop + sideInsetY)}`,
      `L${px(innerX)} ${px(frontTop)}`,
      `L${px(innerX)} ${px(frontBottom)}`,
      `L${px(outerX)} ${px(frontBottom - sideInsetY)}`,
      "Z",
    ].join(" ");
    const centerX = (outerX + innerX) / 2;
    const centerY = (frontTop + frontBottom) / 2;

    const paneAttrs = `data-bow-pane="true" data-bow-zone="side-left" data-bow-role="${role}"`;
    const dividerW = Math.max(2.6, D * 1.35);

    panes.push(
      drawBowPaneGlass(panePath, wp, paneAttrs, v),
      drawBowPaneProfile(panePath, v, wp, 'data-window-bow-profile="true"'),
      renderPaneContent(role, outerX, frontTop, innerX, frontBottom, centerX, centerY),
      drawWindowProfileLine(innerX, frontTop, innerX, frontBottom, dividerW, wp, 'data-bow-divider="side-left"')
    );
  }

  if (hasRightSide) {
    const role = roles[count - 1];
    const innerX = frontRight - FI;
    const outerX = x + w - FI;
    const panePath = [
      `M${px(innerX)} ${px(frontTop)}`,
      `L${px(outerX)} ${px(frontTop + sideInsetY)}`,
      `L${px(outerX)} ${px(frontBottom - sideInsetY)}`,
      `L${px(innerX)} ${px(frontBottom)}`,
      "Z",
    ].join(" ");
    const centerX = (innerX + outerX) / 2;
    const centerY = (frontTop + frontBottom) / 2;

    const paneAttrs = `data-bow-pane="true" data-bow-zone="side-right" data-bow-role="${role}"`;
    const dividerW = Math.max(2.6, D * 1.35);

    panes.push(
      drawBowPaneGlass(panePath, wp, paneAttrs, v),
      drawBowPaneProfile(panePath, v, wp, 'data-window-bow-profile="true"'),
      renderPaneContent(role, innerX, frontTop, outerX, frontBottom, centerX, centerY),
      drawWindowProfileLine(innerX, frontTop, innerX, frontBottom, dividerW, wp, 'data-bow-divider="side-right"')
    );
  }

  for (let frontIndex = 0; frontIndex < frontCount; frontIndex += 1) {
    const roleIndex = frontIndex + frontIndexOffset;
    const role = roles[roleIndex] ?? "fixed";
    const left = frontLeft + FI + frontPaneW * frontIndex;
    const right = left + frontPaneW;
    const top = frontTop;
    const bottom = frontBottom;
    const panePath = [
      `M${px(left)} ${px(top)}`,
      `L${px(right)} ${px(top)}`,
      `L${px(right)} ${px(bottom)}`,
      `L${px(left)} ${px(bottom)}`,
      "Z",
    ].join(" ");
    const centerX = left + frontPaneW / 2;
    const centerY = (top + bottom) / 2;

    const paneAttrs = `data-bow-pane="true" data-bow-zone="front" data-bow-front-pane="true" data-bow-front-width="${px(frontPaneW)}" data-bow-role="${role}"`;

    panes.push(
      drawBowPaneGlass(panePath, wp, paneAttrs, v),
      drawBowPaneProfile(panePath, v, wp, 'data-window-bow-profile="true"'),
      renderPaneContent(role, left, top, right, bottom, centerX, centerY)
    );

    if (frontIndex > 0) {
      dividers.push(
        drawWindowProfileLine(
          left,
          top,
          left,
          bottom,
          Math.max(2.6, D * 1.35),
          wp,
          'data-bow-divider="front"'
        )
      );
    }
  }

  const topRail = [
    `M${px(x + railOverhang)} ${px(hasLeftSide ? frontTop + sideInsetY - F * 0.35 : railTopY)}`,
    hasLeftSide ? `L${px(frontLeft + FI)} ${px(railTopY)}` : "",
    `L${px(frontRight - FI)} ${px(railTopY)}`,
    hasRightSide ? `L${px(x + w - railOverhang)} ${px(frontTop + sideInsetY - F * 0.35)}` : "",
  ].filter(Boolean).join(" ");
  const bottomRail = [
    `M${px(x + railOverhang)} ${px(hasLeftSide ? frontBottom - sideInsetY + F * 0.35 : railBottomY)}`,
    hasLeftSide ? `L${px(frontLeft + FI)} ${px(railBottomY)}` : "",
    `L${px(frontRight - FI)} ${px(railBottomY)}`,
    hasRightSide ? `L${px(x + w - railOverhang)} ${px(frontBottom - sideInsetY + F * 0.35)}` : "",
  ].filter(Boolean).join(" ");

  const leftOuterLeg = hasLeftSide
    ? `M${px(x + FI)} ${px(frontTop + sideInsetY)} L${px(x + FI)} ${px(frontBottom - sideInsetY)}`
    : `M${px(x + FI)} ${px(railTopY)} L${px(x + FI)} ${px(railBottomY)}`;
  const rightOuterLeg = hasRightSide
    ? `M${px(x + w - FI)} ${px(frontTop + sideInsetY)} L${px(x + w - FI)} ${px(frontBottom - sideInsetY)}`
    : `M${px(x + w - FI)} ${px(railTopY)} L${px(x + w - FI)} ${px(railBottomY)}`;

  return [
    drawWindowProfilePath(topRail, F, wp, 'data-window-frame="outer" data-bow-rail="top"'),
    drawWindowProfilePath(bottomRail, F, wp, 'data-window-frame="outer" data-bow-rail="bottom"'),
    drawWindowProfilePath(leftOuterLeg, F, wp, 'data-window-frame="outer" data-bow-rail="left"'),
    drawWindowProfilePath(rightOuterLeg, F, wp, 'data-window-frame="outer" data-bow-rail="right"'),
    ...panes,
    ...dividers,
  ].join("");
}

function drawTiltMarker(pane: WindowPane, v: string, p: WindowVisualPalette) {
  return drawTiltIndicator(pane, v, p);
}

function drawVentanaOscilobatiente(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  hojas: 1 | 2
): string {
  const { outer, divider, panes, palette } = buildWindowPanes(x, y, w, h, v, hojas, p);
  const handleH = clamp(h * 0.14, 13, 19);
  const leaf = (pane: WindowPane, side: "left" | "right") => {
    const handleX =
      side === "left"
        ? pane.x + pane.w - Math.max(6, pane.w * 0.08)
        : pane.x + Math.max(6, pane.w * 0.08);

    return [
      drawGlassPanel(pane, v, palette),
      drawSashFrame(pane, v, palette, ' data-window-panel-role="oscilobatiente"'),
      drawHinges(pane, side, v, palette),
      drawRecessedHandle(handleX, pane.centerY, handleH, v, palette),
      drawSwingArc(pane, side, v, palette),
      drawTiltMarker(pane, v, palette),
    ].join("");
  };

  if (hojas === 1) {
    return [
      outer,
      drawInnerTrack(x, y, w, h, v, palette, "vertical"),
      leaf(panes[0], "left"),
    ].join("");
  }

  return [
    outer,
    divider,
    drawInnerTrack(x, y, w, h, v, palette, "vertical"),
    leaf(panes[0], "left"),
    leaf(panes[1], "right"),
  ].join("");
}

// ─── Componentes: Puertas ─────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-unused-vars -- dibujos de puerta reservados para catalogo */

function drawPuertaAbatible(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const transomY = y + h * 0.58;
  const hW = clamp(F * 0.85, 4, 7);
  const hHinge = clamp(h * 0.075, 8, 13);
  const hH = clamp(h * 0.12, 13, 20);
  const gX = x + FI, gY = y + FI;
  const gW = w - FI * 2;
  const gH = transomY - y - FI;
  const arcR = Math.min(gW * 0.9, gH * 0.75);
  return [
    outerFrame(x, y, w, h, F, p.frame),
    // Panel superior (vidrio)
    glassFill(gX, gY, gW, gH, GW),
    // Panel inferior (sólido — sin vidrio en puertas)
    `<rect x="${px(gX)}" y="${px(transomY + D * 0.5)}" width="${px(gW)}" height="${px(y + h - FI - transomY - D * 0.5)}" fill="rgba(28,28,28,0.10)" stroke="${p.div}" stroke-width="0.5"/>`,
    // Travesaño horizontal
    `<line x1="${px(x + FI)}" y1="${px(transomY)}" x2="${px(x + w - FI)}" y2="${px(transomY)}" stroke="${p.div}" stroke-width="${D}"/>`,
    // Bisagras (lado izquierdo, 3 unidades)
    hinge(x - hW * 0.4, y + h * 0.12, hW, hHinge, p.detail),
    hinge(x - hW * 0.4, y + h * 0.46, hW, hHinge, p.detail),
    hinge(x - hW * 0.4, y + h * 0.78, hW, hHinge, p.detail),
    // Manilla (lado derecho)
    lHandle(x + w - FI * 0.9, y + h * 0.50, hH, "left", DT, p.detail),
    // Arco de apertura
    `<path d="M${px(gX + gW)} ${px(gY)} A${px(arcR)} ${px(arcR)} 0 0 0 ${px(gX)} ${px(gY + arcR)}" fill="none" stroke="${p.detail}" stroke-width="${DT}" stroke-dasharray="5,3"/>`,
  ].join("");
}

function drawPuertaCorredera(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const hH = clamp(h * 0.14, 14, 22);
  const pW = (w - FI * 2) * 0.78; // ancho de la hoja (82% del hueco)
  const gX = x + FI;
  const gY = y + FI;
  const gH = h - FI * 2;
  const arrowW = pW * 0.50;
  const arrowX = gX + pW * 0.18;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    // Hoja de vidrio
    glassFill(gX, gY, pW, gH, GW),
    // Riel superior
    `<line x1="${px(x + FI)}" y1="${px(y + FI + D * 0.5)}" x2="${px(x + w - FI)}" y2="${px(y + FI + D * 0.5)}" stroke="${p.div}" stroke-width="${D}" stroke-linecap="round"/>`,
    // Riel inferior
    `<line x1="${px(x + FI)}" y1="${px(y + h - FI - D * 0.5)}" x2="${px(x + w - FI)}" y2="${px(y + h - FI - D * 0.5)}" stroke="${p.div}" stroke-width="${D}" stroke-linecap="round"/>`,
    // Manilla
    sidePullHandle(gX + pW - Math.max(4.5, F * 0.8), y + h * 0.50, hH),
    // Flecha de deslizamiento
    directionArrow(arrowX, y + h * 0.62, arrowW, "left", DT * 1.15, p.detail),
  ].join("");
}

function drawPuertaPivotante(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const gX = x + FI, gY = y + FI, gW = w - FI * 2, gH = h - FI * 2;
  const pR = clamp(F * 0.55, 3, 5);
  const hH = clamp(h * 0.14, 13, 20);
  const cx = x + w / 2;
  const axisY1 = gY + gH * 0.10;
  const axisY2 = gY + gH * 0.78;
  const arrowY = gY + gH * 0.60;
  const arrowW = gW * 0.24;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    glassFill(gX, gY, gW, gH, GW),
    // Eje de pivote superior e inferior (puntos en centro)
    `<circle cx="${px(cx)}" cy="${px(y + FI * 0.5)}" r="${pR}" fill="${p.detail}"/>`,
    `<circle cx="${px(cx)}" cy="${px(y + h - FI * 0.5)}" r="${pR}" fill="${p.detail}"/>`,
    // Línea de eje vertical
    `<line x1="${px(cx)}" y1="${px(axisY1)}" x2="${px(cx)}" y2="${px(axisY2)}" stroke="${p.div}" stroke-width="0.9" stroke-dasharray="4,3"/>`,
    // Movimiento pivotante desde el eje central
    directionArrow(cx - arrowW, arrowY, arrowW - 4, "left", DT * 1.1, p.detail),
    directionArrow(cx + 4, arrowY, arrowW - 4, "right", DT * 1.1, p.detail),
    // Manillas (ambos lados del eje)
    lHandle(cx - gW * 0.18, y + h * 0.50, hH, "left",  DT, p.detail),
    lHandle(cx + gW * 0.18, y + h * 0.50, hH, "right", DT, p.detail),
  ].join("");
}

/* eslint-enable @typescript-eslint/no-unused-vars */

// ─── Componente: Paño Fijo ────────────────────────────────────────────────────

type FixedPaneLayout = "single" | "columns" | "transom";
type FixedPaneProfileStyle = "framed" | "frameless" | "premium";

function resolveFixedPaneProfileStyle(configuracion?: string | null): FixedPaneProfileStyle {
  const source = normalizeSearchText(configuracion);
  if (source.includes("sin perfileria")) return "frameless";
  if (source.includes("premium")) return "premium";
  return "framed";
}

function panoFijoFrameWeight(v: string, profileStyle: FixedPaneProfileStyle): number {
  if (profileStyle === "frameless") return 0;
  if (profileStyle === "premium") {
    return clamp(windowOuterFrameWeight(v) * 1.42, 7.5, 10);
  }
  return windowOuterFrameWeight(v);
}

function panoFijoMullionWeight(
  v: string,
  frameW: number,
  profileStyle: FixedPaneProfileStyle
): number {
  if (profileStyle === "frameless") return 0;
  if (profileStyle === "premium") {
    return Math.max(windowSashWeight(v) * 1.55, frameW * 0.82);
  }
  return Math.max(windowSashWeight(v), frameW * 0.55);
}

function panoFijoInnerInset(v: string, profileStyle: FixedPaneProfileStyle, frameW: number): number {
  if (profileStyle === "frameless") return v === "pdf" ? 2 : 1.5;
  return frameW * 0.75;
}

function panoFijoPaneSeparator(v: string, profileStyle: FixedPaneProfileStyle, mullionW: number): number {
  if (profileStyle === "frameless") return v === "pdf" ? 4 : 3;
  return mullionW;
}

function resolveFixedPaneLayout(composition: string): FixedPaneLayout {
  const source = normalizeSearchText(composition);
  if (source.includes("personalizado")) return "transom";
  const count = resolveFixedPaneCount(composition);
  return count === 1 ? "single" : "columns";
}

function resolveFixedPaneCount(composition: string): number {
  const source = normalizeSearchText(composition);
  const match = source.match(/\b([1-3])\s*panos?\b/);
  if (match) return Number.parseInt(match[1], 10);
  if (source.includes("personalizado")) return 3;
  return 1;
}

function drawPanoFijoOuterShell(
  x: number,
  y: number,
  w: number,
  h: number,
  frameW: number,
  wp: WindowVisualPalette,
  profileStyle: FixedPaneProfileStyle
): string {
  const revealInset = frameW * (profileStyle === "premium" ? 0.56 : 0.5);

  return [
    `<rect data-pano-fijo-reveal="true" x="${px(x + revealInset)}" y="${px(y + revealInset)}" width="${px(w - 2 * revealInset)}" height="${px(h - 2 * revealInset)}" fill="${wp.frame}"/>`,
    drawWindowProfileFrame(x, y, w, h, frameW, wp, "outer"),
  ].join("");
}

function drawFixedPaneMark(cx: number, cy: number, v: string, wp: WindowVisualPalette): string {
  const fs = v === "pdf" ? 14 : 12;
  return `<text data-fixed-pane-mark="true" x="${px(cx)}" y="${px(cy + fs * 0.35)}" text-anchor="middle" font-size="${fs}" font-family="sans-serif" fill="${wp.detail}" font-weight="700" opacity="0.72">F</text>`;
}

function drawFixedPaneReflections(x: number, y: number, w: number, h: number, v: string): string {
  const sw = v === "pdf" ? 1.1 : 0.9;
  const streaks: Array<[number, number, number, number]> = [
    [0.58, 0.22, 0.78, 0.22],
    [0.62, 0.28, 0.82, 0.28],
    [0.66, 0.34, 0.86, 0.34],
  ];

  return streaks
    .map(
      ([x1r, y1r, x2r, y2r]) =>
        `<line data-fixed-pane-reflection="true" x1="${px(x + w * x1r)}" y1="${px(y + h * y1r)}" x2="${px(x + w * x2r)}" y2="${px(y + h * y2r)}" stroke="#FFFFFF" stroke-width="${px(sw)}" stroke-linecap="round" opacity="0.55"/>`
    )
    .join("");
}

function drawFixedPaneGlass(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette,
  profileStyle: FixedPaneProfileStyle
): string {
  if (w <= 0 || h <= 0) return "";

  const pane: WindowPane = {
    x,
    y,
    w,
    h,
    centerX: x + w / 2,
    centerY: y + h / 2,
  };
  const glass =
    profileStyle === "frameless"
      ? `<rect data-fixed-pane-glass="true" data-fixed-pane-glass-edge="true" x="${px(pane.x)}" y="${px(pane.y)}" width="${px(pane.w)}" height="${px(pane.h)}" fill="${wp.glass}" fill-opacity="0.86" stroke="${wp.glassStroke}" stroke-width="${px(Math.max(gsw(v), 1.1))}" rx="0"/>`
      : drawGlassPanel(pane, v, wp, ' data-fixed-pane-glass="true"');

  return [
    glass,
    drawFixedPaneReflections(x, y, w, h, v),
    drawFixedPaneMark(pane.centerX, pane.centerY, v, wp),
  ].join("");
}

function drawPanoFijoMullion(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  wp: WindowVisualPalette,
  role: "vertical" | "horizontal" | "transom"
): string {
  return drawWindowProfileLine(
    x1,
    y1,
    x2,
    y2,
    width,
    wp,
    `data-pano-fijo-mullion="${role}"`
  );
}

function drawPanoFijo(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette,
  composition: string,
  configuracion?: string | null
): string {
  const layout = resolveFixedPaneLayout(composition);
  const profileStyle = resolveFixedPaneProfileStyle(configuracion);
  const frameW = panoFijoFrameWeight(v, profileStyle);
  const inset = panoFijoInnerInset(v, profileStyle, frameW);
  const innerX = x + inset;
  const innerY = y + inset;
  const innerW = w - inset * 2;
  const innerH = h - inset * 2;
  const mullionW = panoFijoMullionWeight(v, frameW, profileStyle);
  const paneGap = panoFijoPaneSeparator(v, profileStyle, mullionW);
  const parts: string[] = [
    `<g data-pano-fijo="true" data-pano-fijo-layout="${layout}" data-pano-fijo-profile="${profileStyle}">`,
  ];

  if (profileStyle !== "frameless") {
    parts.push(drawPanoFijoOuterShell(x, y, w, h, frameW, wp, profileStyle));
  }

  if (layout === "single") {
    parts.push(drawFixedPaneGlass(innerX, innerY, innerW, innerH, v, wp, profileStyle));
  } else if (layout === "columns") {
    const paneCount = resolveFixedPaneCount(composition);
    const paneW = (innerW - paneGap * (paneCount - 1)) / paneCount;

    for (let index = 0; index < paneCount; index += 1) {
      const paneX = innerX + index * (paneW + paneGap);
      parts.push(drawFixedPaneGlass(paneX, innerY, paneW, innerH, v, wp, profileStyle));

      if (profileStyle !== "frameless" && index < paneCount - 1) {
        const mullionX = paneX + paneW;
        parts.push(
          drawPanoFijoMullion(
            mullionX,
            innerY,
            mullionX,
            innerY + innerH,
            mullionW,
            wp,
            "vertical"
          )
        );
      }
    }
  } else {
    const transomH = innerH * 0.38;
    const bottomY = innerY + transomH + paneGap;
    const bottomH = innerH - transomH - paneGap;
    const bottomPaneW = (innerW - paneGap) / 2;

    parts.push(drawFixedPaneGlass(innerX, innerY, innerW, transomH, v, wp, profileStyle));
    if (profileStyle !== "frameless") {
      parts.push(
        drawPanoFijoMullion(
          innerX,
          innerY + transomH,
          innerX + innerW,
          innerY + transomH,
          mullionW,
          wp,
          "transom"
        )
      );
    }
    parts.push(drawFixedPaneGlass(innerX, bottomY, bottomPaneW, bottomH, v, wp, profileStyle));
    if (profileStyle !== "frameless") {
      parts.push(
        drawPanoFijoMullion(
          innerX + bottomPaneW,
          bottomY,
          innerX + bottomPaneW,
          bottomY + bottomH,
          mullionW,
          wp,
          "vertical"
        )
      );
    }
    parts.push(
      drawFixedPaneGlass(innerX + bottomPaneW + paneGap, bottomY, bottomPaneW, bottomH, v, wp, profileStyle)
    );
  }

  parts.push("</g>");
  return parts.join("");
}

type DoorProfileColors = {
  frame: string;
  frameInner: string;
  frameOutline: string | null;
};

function normalizeDoorProfileColor(colorHex: string | null | undefined): string {
  if (!isValidHex(colorHex)) return "#6B7280";
  return colorHex.trim().toUpperCase();
}

function resolveDoorProfileColors(colorHex: string | null | undefined): DoorProfileColors {
  const frame = normalizeDoorProfileColor(colorHex);
  const isLight = relativeLuminance(frame) > 0.72;
  const isDark = relativeLuminance(frame) < 0.22;

  return {
    frame,
    frameInner: isLight
      ? mixHex(frame, "#000000", 0.22)
      : isDark
        ? mixHex(frame, "#FFFFFF", 0.28)
        : frame,
    frameOutline: isLight ? mixHex(frame, "#000000", 0.42) : null,
  };
}

function resolveDoorPalette(colorHex: string | null | undefined): Palette {
  const palette = resolvePalette(colorHex);
  if (!isValidHex(colorHex)) return palette;
  const doorColors = resolveDoorProfileColors(colorHex);
  return {
    ...palette,
    frame: doorColors.frame,
    div: doorColors.frame,
  };
}

// ─── Componente: Vidrio / Cristal ─────────────────────────────────────────────

type GlassCatalogVariant = "loose" | "replacement" | "termopanel" | "mirror" | "custom";

const GLASS_CATALOG_STROKE = "#6F97BA";
const GLASS_CATALOG_FRAME = "#5B8FB9";
const GLASS_CATALOG_FRAME_INNER = "#7BAED4";
const GLASS_CATALOG_MIRROR_FILL = "#C8CED6";
const GLASS_CATALOG_MIRROR_STROKE = "#8A939E";
const GLASS_CATALOG_DASH = "#9AA8BC";

function resolveGlassCatalogVariant(configuracion?: string | null): GlassCatalogVariant {
  const source = normalizeSearchText(configuracion ?? "");
  if (source.includes("reposicion")) return "replacement";
  if (source.includes("termopanel") || source.includes("termo panel")) return "termopanel";
  if (source.includes("espejo")) return "mirror";
  if (source.includes("personalizado")) return "custom";
  return "loose";
}

function drawGlassCatalogSheen(
  x: number,
  y: number,
  w: number,
  h: number,
  tone: "glass" | "mirror"
): string {
  const opacity = tone === "mirror" ? 0.78 : 0.42;
  const fill = tone === "mirror" ? "#FFFFFF" : "#EAF6FF";
  const points = [
    [x + w * 0.58, y + h * 0.06],
    [x + w * 0.96, y + h * 0.06],
    [x + w * 0.38, y + h * 0.58],
    [x + w * 0.0, y + h * 0.58],
  ]
    .map(([pxX, pxY]) => `${px(pxX)},${px(pxY)}`)
    .join(" ");

  return `<polygon data-glass-catalog-sheen="${tone}" points="${points}" fill="${fill}" opacity="${opacity}"/>`;
}

function drawGlassCatalogLoosePane(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  dataAttrs = ' data-glass-catalog-pane="true"'
): string {
  const sw = Math.max(gsw(v), 1.2);
  return [
    `<rect${dataAttrs} x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${G_FILL}" stroke="${GLASS_CATALOG_STROKE}" stroke-width="${px(sw)}" rx="0"/>`,
    drawGlassCatalogSheen(x, y, w, h, "glass"),
  ].join("");
}

function drawGlassCatalogPencilIcon(cx: number, cy: number, v: string): string {
  const scale = v === "pdf" ? 1.15 : 1;
  const bodyW = 4.2 * scale;
  const bodyH = 16 * scale;
  const tip = 4.5 * scale;

  return [
    `<g data-glass-catalog-icon="pencil" transform="translate(${px(cx)} ${px(cy)}) rotate(-42)">`,
    `<rect x="${px(-bodyW / 2)}" y="${px(-bodyH / 2 + tip)}" width="${px(bodyW)}" height="${px(bodyH - tip)}" rx="${px(0.8)}" fill="${GLASS_CATALOG_FRAME_INNER}" stroke="${GLASS_CATALOG_FRAME}" stroke-width="${px(0.9)}"/>`,
    `<polygon points="${px(-bodyW / 2)},${px(-bodyH / 2 + tip)} ${px(bodyW / 2)},${px(-bodyH / 2 + tip)} ${px(0)},${px(-bodyH / 2)}" fill="${GLASS_CATALOG_FRAME}" stroke="${GLASS_CATALOG_FRAME}" stroke-width="${px(0.6)}"/>`,
    `</g>`,
  ].join("");
}

function drawGlassCatalogLoose(x: number, y: number, w: number, h: number, v: string): string {
  const inset = clamp(Math.min(w, h) * 0.04, 3, 8);
  return [
    `<g data-glass-catalog="loose">`,
    drawGlassCatalogLoosePane(x + inset, y + inset, w - inset * 2, h - inset * 2, v),
    `</g>`,
  ].join("");
}

function drawGlassCatalogReplacement(x: number, y: number, w: number, h: number, v: string): string {
  const outerInset = clamp(Math.min(w, h) * 0.03, 2, 6);
  const innerInset = clamp(Math.min(w, h) * 0.14, 10, 22);
  const outerX = x + outerInset;
  const outerY = y + outerInset;
  const outerW = w - outerInset * 2;
  const outerH = h - outerInset * 2;

  return [
    `<g data-glass-catalog="replacement">`,
    `<rect data-glass-catalog-frame="replacement-outer" x="${px(outerX)}" y="${px(outerY)}" width="${px(outerW)}" height="${px(outerH)}" fill="none" stroke="${GLASS_CATALOG_DASH}" stroke-width="${px(1.1)}" stroke-dasharray="5,4" rx="0"/>`,
    drawGlassCatalogLoosePane(
      outerX + innerInset,
      outerY + innerInset,
      outerW - innerInset * 2,
      outerH - innerInset * 2,
      v,
      ' data-glass-catalog-pane="replacement-inner"'
    ),
    `</g>`,
  ].join("");
}

function drawGlassCatalogTermopanel(x: number, y: number, w: number, h: number, v: string): string {
  const frameW = clamp(Math.min(w, h) * 0.11, 7, 14);
  const inset = frameW * 0.72;
  const glassX = x + inset;
  const glassY = y + inset;
  const glassW = w - inset * 2;
  const glassH = h - inset * 2;
  const channelInset = frameW * 0.38;

  return [
    `<g data-glass-catalog="termopanel">`,
    `<rect data-glass-catalog-frame="termopanel-reveal" x="${px(x + channelInset)}" y="${px(y + channelInset)}" width="${px(w - channelInset * 2)}" height="${px(h - channelInset * 2)}" fill="${GLASS_CATALOG_FRAME}" fill-opacity="0.18"/>`,
    `<rect data-glass-catalog-frame="termopanel-outer" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${GLASS_CATALOG_FRAME}" stroke-width="${px(frameW)}" rx="0" ${WINDOW_PROFILE_JOIN}/>`,
    `<rect data-glass-catalog-frame="termopanel-inner" x="${px(x + channelInset)}" y="${px(y + channelInset)}" width="${px(w - channelInset * 2)}" height="${px(h - channelInset * 2)}" fill="none" stroke="${GLASS_CATALOG_FRAME_INNER}" stroke-width="${px(Math.max(1.4, frameW * 0.22))}" rx="0" ${WINDOW_PROFILE_JOIN}/>`,
    drawGlassCatalogLoosePane(glassX, glassY, glassW, glassH, v, ' data-glass-catalog-pane="termopanel-glass"'),
    `</g>`,
  ].join("");
}

function drawGlassCatalogMirror(x: number, y: number, w: number, h: number, v: string): string {
  const inset = clamp(Math.min(w, h) * 0.04, 3, 8);
  const gX = x + inset;
  const gY = y + inset;
  const gW = w - inset * 2;
  const gH = h - inset * 2;
  const sw = Math.max(gsw(v), 1.1);

  return [
    `<g data-glass-catalog="mirror">`,
    `<rect data-glass-catalog-pane="mirror" x="${px(gX)}" y="${px(gY)}" width="${px(gW)}" height="${px(gH)}" fill="${GLASS_CATALOG_MIRROR_FILL}" stroke="${GLASS_CATALOG_MIRROR_STROKE}" stroke-width="${px(sw)}" rx="0"/>`,
    drawGlassCatalogSheen(gX, gY, gW, gH, "mirror"),
    `</g>`,
  ].join("");
}

function drawGlassCatalogCustom(x: number, y: number, w: number, h: number, v: string): string {
  const outerInset = clamp(Math.min(w, h) * 0.04, 3, 8);
  const innerInset = clamp(Math.min(w, h) * 0.1, 8, 16);
  const outerX = x + outerInset;
  const outerY = y + outerInset;
  const outerW = w - outerInset * 2;
  const outerH = h - outerInset * 2;

  return [
    `<g data-glass-catalog="custom">`,
    `<rect data-glass-catalog-frame="custom-outer" x="${px(outerX)}" y="${px(outerY)}" width="${px(outerW)}" height="${px(outerH)}" fill="none" stroke="${GLASS_CATALOG_STROKE}" stroke-width="${px(1.2)}" rx="0"/>`,
    `<rect data-glass-catalog-frame="custom-inner" x="${px(outerX + innerInset)}" y="${px(outerY + innerInset)}" width="${px(outerW - innerInset * 2)}" height="${px(outerH - innerInset * 2)}" fill="none" stroke="${GLASS_CATALOG_STROKE}" stroke-width="${px(0.9)}" stroke-dasharray="4,3" rx="0"/>`,
    drawGlassCatalogLoosePane(
      outerX + innerInset,
      outerY + innerInset,
      outerW - innerInset * 2,
      outerH - innerInset * 2,
      v,
      ' data-glass-catalog-pane="custom-glass"'
    ),
    drawGlassCatalogPencilIcon(outerX + outerW / 2, outerY + outerH / 2, v),
    `</g>`,
  ].join("");
}

function drawCristalCatalog(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  configuracion?: string | null
): string {
  const variant = resolveGlassCatalogVariant(configuracion);

  switch (variant) {
    case "replacement":
      return drawGlassCatalogReplacement(x, y, w, h, v);
    case "termopanel":
      return drawGlassCatalogTermopanel(x, y, w, h, v);
    case "mirror":
      return drawGlassCatalogMirror(x, y, w, h, v);
    case "custom":
      return drawGlassCatalogCustom(x, y, w, h, v);
    case "loose":
    default:
      return drawGlassCatalogLoose(x, y, w, h, v);
  }
}

/** @deprecated Usar drawCristalCatalog; se mantiene para compatibilidad interna. */
function drawCristalSimple(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  void p;
  return drawGlassCatalogLoose(x, y, w, h, v);
}

// ─── Componentes: Shower door ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawShowerAbatible(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), DT = det(v), GW = gsw(v);
  const edgeW = clamp(F * 0.55, 2.5, 4.5); // grosor del canto del vidrio
  const hW = clamp(F * 0.75, 4, 7);
  const hHinge = clamp(h * 0.09, 8, 13);
  // Shower frameless: sin marco completo, solo cantos
  const gX = x + edgeW;
  const gY = y + edgeW;
  const gW = w - edgeW * 2;
  const gH = h - edgeW * 2;
  const arcR = Math.min(gW, gH * 0.75);
  return [
    // Vidrio (ocupa casi todo)
    glassFill(gX, gY, gW, gH, GW),
    // Canto del vidrio (grosor visible — line técnica)
    `<line x1="${px(gX)}" y1="${px(gY)}" x2="${px(gX)}" y2="${px(gY + gH)}" stroke="${G_STROKE}" stroke-width="${edgeW * 1.8}" stroke-linecap="butt"/>`,
    // Bisagras (lado izquierdo de pared)
    hinge(x - hW * 0.3, y + h * 0.22, hW, hHinge, p.detail),
    hinge(x - hW * 0.3, y + h * 0.68, hW, hHinge, p.detail),
    // Barra de jalado
    `<rect x="${px(x + w - edgeW * 2)}" y="${px(y + h * 0.34)}" width="${px(edgeW * 1.5)}" height="${px(h * 0.30)}" rx="${px(edgeW * 0.8)}" fill="${p.detail}"/>`,
    // Arco de apertura
    `<path d="M${px(gX + gW)} ${px(gY)} A${px(arcR)} ${px(arcR)} 0 0 0 ${px(gX)} ${px(gY + arcR)}" fill="none" stroke="${p.detail}" stroke-width="${DT}" stroke-dasharray="5,3"/>`,
    // Perfil de piso
    `<line x1="${px(gX)}" y1="${px(gY + gH + edgeW)}" x2="${px(gX + gW)}" y2="${px(gY + gH + edgeW)}" stroke="${p.div}" stroke-width="1.5" stroke-linecap="round"/>`,
  ].join("");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawShowerCorredera(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const midX = x + w / 2;
  const mulW = D * 1.2;
  const hH = clamp(h * 0.14, 13, 20);
  const glW = w / 2 - FI - mulW / 2;
  const arrowY = y + h * 0.62;
  const arrowW = glW * 0.40;
  const leftCenter = x + FI + glW / 2;
  const rightCenter = x + w / 2 + mulW / 2 + glW / 2;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    glassFill(x + FI, y + FI, glW, h - FI * 2, GW),
    glassFill(x + w / 2 + mulW / 2, y + FI, glW, h - FI * 2, GW),
    // Riel superior e inferior
    `<line x1="${px(x + FI)}" y1="${px(y + FI + D * 0.5)}" x2="${px(x + w - FI)}" y2="${px(y + FI + D * 0.5)}" stroke="${p.div}" stroke-width="${D}" stroke-linecap="round"/>`,
    `<line x1="${px(x + FI)}" y1="${px(y + h - FI - D * 0.5)}" x2="${px(x + w - FI)}" y2="${px(y + h - FI - D * 0.5)}" stroke="${p.div}" stroke-width="${D}" stroke-linecap="round"/>`,
    // Parteluz
    `<line x1="${px(midX)}" y1="${px(y + FI * 0.5)}" x2="${px(midX)}" y2="${px(y + h - FI * 0.5)}" stroke="${p.frame}" stroke-width="${px(mulW)}" stroke-linecap="square"/>`,
    // Manillas
    sidePullHandle(x + Math.max(4.5, F * 0.9), y + h * 0.50, hH),
    sidePullHandle(x + w - Math.max(4.5, F * 0.9), y + h * 0.50, hH),
    // Flechas
    directionArrow(leftCenter - arrowW / 2, arrowY, arrowW, "right", DT * 1.15, p.detail),
    directionArrow(rightCenter - arrowW / 2, arrowY, arrowW, "left", DT * 1.15, p.detail),
  ].join("");
}

// ─── Componentes: Cierres terraza / logia ─────────────────────────────────────

function normalizeShowerKey(value: string | null | undefined): string {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function showerLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  extra = ""
): string {
  return `<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${color}" stroke-width="${px(width)}" stroke-linecap="butt" stroke-linejoin="miter"${extra}/>`;
}

function showerGlassRect(x: number, y: number, w: number, h: number, gw: number, id: string): string {
  if (w <= 0 || h <= 0) return "";
  return `<rect data-shower-pane="${id}" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" rx="0" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${px(gw)}" stroke-linejoin="miter"/>`;
}

function showerGlassPoly(points: Array<[number, number]>, gw: number, id: string): string {
  const value = points.map(([pointX, pointY]) => `${px(pointX)},${px(pointY)}`).join(" ");
  return `<polygon data-shower-pane="${id}" points="${value}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${px(gw)}" stroke-linejoin="miter"/>`;
}

function showerHandle(cx: number, cy: number, h: number, color: string): string {
  const bodyW = 4.8;
  const bodyH = clamp(h, 16, 34);
  return [
    `<rect data-shower-handle="true" x="${px(cx - bodyW / 2)}" y="${px(cy - bodyH / 2)}" width="${px(bodyW)}" height="${px(bodyH)}" rx="0" fill="${HANDLE_FILL}" stroke="${HANDLE_STROKE}" stroke-width="1"/>`,
    `<rect x="${px(cx - 0.8)}" y="${px(cy - bodyH / 2 + 4)}" width="1.6" height="${px(bodyH - 8)}" rx="0" fill="${color}"/>`,
  ].join("");
}

function showerHinge(x: number, cy: number, w: number, h: number, color: string): string {
  return `<rect data-shower-hinge="true" x="${px(x)}" y="${px(cy - h / 2)}" width="${px(w)}" height="${px(h)}" rx="0" fill="${color}"/>`;
}

function showerArrow(cx: number, y: number, dir: "left" | "right", size: number, color: string): string {
  const line = dir === "right"
    ? showerLine(cx - size, y, cx + size, y, color, 1.4)
    : showerLine(cx + size, y, cx - size, y, color, 1.4);
  const headX = dir === "right" ? cx + size : cx - size;
  const sign = dir === "right" ? -1 : 1;
  return [
    line,
    `<path d="M${px(headX)} ${px(y)} L${px(headX + sign * 5)} ${px(y - 4)} M${px(headX)} ${px(y)} L${px(headX + sign * 5)} ${px(y + 4)}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="butt" stroke-linejoin="miter"/>`,
  ].join("");
}

function showerFrame(x: number, y: number, w: number, h: number, sw: number, color: string): string {
  return `<rect data-shower-frame="outer" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" rx="0" fill="none" stroke="${color}" stroke-width="${px(sw)}" stroke-linejoin="miter"/>`;
}

function showerFrontSliding(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  composition: string
): string {
  const F = clamp(fw(v) * 1.35, 5, 8);
  const G = gsw(v);
  const inset = F * 0.75;
  const three = composition.includes("2 correderas");
  const fixedLeft = composition.includes("1 fija") && !three;
  const paneCount = three ? 3 : 2;
  const paneW = (w - inset * 2) / paneCount;
  const panes = Array.from({ length: paneCount }, (_, index) =>
    showerGlassRect(x + inset + paneW * index, y + inset, paneW, h - inset * 2, G, `frontal-${index + 1}`)
  );
  const dividers = Array.from({ length: paneCount - 1 }, (_, index) =>
    showerLine(x + inset + paneW * (index + 1), y + inset * 0.35, x + inset + paneW * (index + 1), y + h - inset * 0.35, p.frame, F * 0.72)
  );
  const arrowY = y + h * 0.58;
  const arrows = three
    ? [
        showerArrow(x + inset + paneW * 1.5, arrowY, "right", paneW * 0.18, p.detail),
        showerArrow(x + inset + paneW * 2.5, arrowY, "right", paneW * 0.18, p.detail),
      ]
    : fixedLeft
      ? [showerArrow(x + inset + paneW * 1.5, arrowY, "right", paneW * 0.22, p.detail)]
      : [
          showerArrow(x + inset + paneW * 0.5, arrowY, "right", paneW * 0.2, p.detail),
          showerArrow(x + inset + paneW * 1.5, arrowY, "left", paneW * 0.2, p.detail),
        ];
  return [
    showerFrame(x, y, w, h, F, p.frame),
    ...panes,
    ...dividers,
    showerLine(x, y + F * 0.8, x + w, y + F * 0.8, p.div, F * 0.72),
    showerLine(x, y + h - F * 0.8, x + w, y + h - F * 0.8, p.div, F * 0.72),
    ...arrows,
    fixedLeft ? `<text x="${px(x + inset + paneW * 0.5)}" y="${px(y + h - inset - 8)}" text-anchor="middle" font-size="8" font-family="sans-serif" fill="${p.label}" font-weight="700">FIJO</text>` : "",
    showerHandle(x + w - inset * 1.5, y + h * 0.5, h * 0.18, p.detail),
  ].join("");
}

function showerCornerSliding(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  config: string,
  composition: string
): string {
  const F = clamp(fw(v) * 1.25, 4.8, 7.5);
  const G = gsw(v);
  const dx = w * 0.25;
  const dy = h * 0.14;
  const cornerX = config === "en l" ? x + w * 0.48 : x + w * 0.52;
  const topY = y + dy;
  const bottomY = y + h - dy * 0.65;
  const left = [
    [x + dx * 0.15, topY + dy * 0.2],
    [cornerX, y + dy * 0.55],
    [cornerX, bottomY],
    [x + dx * 0.15, y + h - dy * 0.2],
  ] as Array<[number, number]>;
  const right = [
    [cornerX, y + dy * 0.55],
    [x + w - dx * 0.1, topY + dy * 0.15],
    [x + w - dx * 0.1, y + h - dy * 0.3],
    [cornerX, bottomY],
  ] as Array<[number, number]>;
  return [
    showerGlassPoly(left, G, "corner-left"),
    showerGlassPoly(right, G, "corner-right"),
    showerLine(left[0][0], left[0][1], left[3][0], left[3][1], p.frame, F),
    showerLine(cornerX, y + dy * 0.45, cornerX, bottomY + F * 0.15, p.frame, F),
    showerLine(right[1][0], right[1][1], right[2][0], right[2][1], p.frame, F),
    showerLine(left[3][0], left[3][1], cornerX, bottomY, p.div, F * 0.65),
    showerLine(cornerX, bottomY, right[2][0], right[2][1], p.div, F * 0.65),
    composition.includes("por lado")
      ? showerArrow(x + w * 0.35, y + h * 0.52, "right", w * 0.05, p.detail) + showerArrow(x + w * 0.69, y + h * 0.52, "left", w * 0.05, p.detail)
      : showerArrow(x + w * 0.38, y + h * 0.52, "right", w * 0.06, p.detail),
    showerHandle(cornerX - F * 1.5, y + h * 0.5, h * 0.18, p.detail),
    showerHandle(cornerX + F * 1.5, y + h * 0.5, h * 0.18, p.detail),
  ].join("");
}

function showerFrontSwing(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  composition: string
): string {
  const F = clamp(fw(v) * 1.3, 5, 8);
  const G = gsw(v);
  const inset = F * 0.75;
  const three = composition.includes("1 fijo 1 puerta 1 fijo");
  const two = composition.includes("1 fijo 1 puerta") && !three;
  const count = three ? 3 : two ? 2 : 1;
  const paneW = (w - inset * 2) / count;
  const panes = Array.from({ length: count }, (_, index) =>
    showerGlassRect(x + inset + paneW * index, y + inset, paneW, h - inset * 2, G, `batiente-${index + 1}`)
  );
  const dividers = Array.from({ length: count - 1 }, (_, index) =>
    showerLine(x + inset + paneW * (index + 1), y + inset * 0.35, x + inset + paneW * (index + 1), y + h - inset * 0.35, p.frame, F * 0.72)
  );
  const doorIndex = two ? 1 : three ? 1 : 0;
  const doorLeft = x + inset + paneW * doorIndex;
  const arcR = Math.min(paneW * 0.92, h * 0.42);
  return [
    showerFrame(x, y, w, h, F, p.frame),
    ...panes,
    ...dividers,
    showerHinge(doorLeft - F * 0.75, y + h * 0.25, F * 0.85, h * 0.08, p.detail),
    showerHinge(doorLeft - F * 0.75, y + h * 0.68, F * 0.85, h * 0.08, p.detail),
    showerHandle(doorLeft + paneW - F * 1.25, y + h * 0.5, h * 0.2, p.detail),
    `<path data-shower-swing="true" d="M${px(doorLeft + paneW)} ${px(y + h - inset)} A${px(arcR)} ${px(arcR)} 0 0 0 ${px(doorLeft + paneW - arcR)} ${px(y + h - inset + arcR * 0.52)}" fill="none" stroke="${p.detail}" stroke-width="${px(det(v))}" stroke-dasharray="5,3" stroke-linejoin="miter"/>`,
    two || three ? `<text x="${px(x + inset + paneW * 0.5)}" y="${px(y + h - inset - 8)}" text-anchor="middle" font-size="8" font-family="sans-serif" fill="${p.label}" font-weight="700">FIJO</text>` : "",
    three ? `<text x="${px(x + inset + paneW * 2.5)}" y="${px(y + h - inset - 8)}" text-anchor="middle" font-size="8" font-family="sans-serif" fill="${p.label}" font-weight="700">FIJO</text>` : "",
  ].join("");
}

function showerCornerSwing(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  config: string,
  composition: string
): string {
  const F = clamp(fw(v) * 1.25, 4.8, 7.5);
  const G = gsw(v);
  const dx = w * 0.24;
  const dy = h * 0.14;
  const cornerX = x + w * 0.5;
  const bottomY = y + h - dy * 0.65;
  const left = [
    [x + dx * 0.2, y + dy * 1.15],
    [cornerX, y + dy * 0.55],
    [cornerX, bottomY],
    [x + dx * 0.2, y + h - dy * 0.2],
  ] as Array<[number, number]>;
  const right = [
    [cornerX, y + dy * 0.55],
    [x + w - dx * 0.1, y + dy * 1.05],
    [x + w - dx * 0.1, y + h - dy * 0.25],
    [cornerX, bottomY],
  ] as Array<[number, number]>;
  const doubleDoor = composition.includes("2 puertas");
  const sideLabel = config === "en l" ? "l" : "corner";
  return [
    showerGlassPoly(left, G, `${sideLabel}-left`),
    showerGlassPoly(right, G, `${sideLabel}-right`),
    showerLine(left[0][0], left[0][1], left[3][0], left[3][1], p.frame, F),
    showerLine(cornerX, y + dy * 0.45, cornerX, bottomY + F * 0.15, p.frame, F),
    showerLine(right[1][0], right[1][1], right[2][0], right[2][1], p.frame, F),
    showerHinge(cornerX - F, y + h * 0.28, F, h * 0.08, p.detail),
    showerHinge(cornerX - F, y + h * 0.68, F, h * 0.08, p.detail),
    doubleDoor ? showerHinge(cornerX, y + h * 0.28, F, h * 0.08, p.detail) : "",
    doubleDoor ? showerHinge(cornerX, y + h * 0.68, F, h * 0.08, p.detail) : "",
    showerHandle(cornerX - F * 1.7, y + h * 0.5, h * 0.18, p.detail),
    doubleDoor ? showerHandle(cornerX + F * 1.7, y + h * 0.5, h * 0.18, p.detail) : "",
    `<path data-shower-swing="true" d="M${px(cornerX)} ${px(bottomY)} A${px(w * 0.18)} ${px(w * 0.18)} 0 0 0 ${px(cornerX - w * 0.17)} ${px(bottomY + h * 0.12)}" fill="none" stroke="${p.detail}" stroke-width="${px(det(v))}" stroke-dasharray="5,3" stroke-linejoin="miter"/>`,
    doubleDoor ? `<path data-shower-swing="true" d="M${px(cornerX)} ${px(bottomY)} A${px(w * 0.18)} ${px(w * 0.18)} 0 0 1 ${px(cornerX + w * 0.17)} ${px(bottomY + h * 0.12)}" fill="none" stroke="${p.detail}" stroke-width="${px(det(v))}" stroke-dasharray="5,3" stroke-linejoin="miter"/>` : "",
  ].join("");
}

function showerWalkIn(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  config: string,
  composition: string
): string {
  const F = clamp(fw(v) * 1.25, 4.8, 7.5);
  const G = gsw(v);
  const inset = F * 0.55;
  if (config === "frontal" || composition.includes("1 pano")) {
    const barY = y + h * 0.1;
    return [
      showerGlassRect(x + w * 0.22, y + inset, w * 0.42, h - inset * 2, G, "walkin-front"),
      showerLine(x + w * 0.22, y + inset, x + w * 0.22, y + h - inset, p.frame, F),
      showerLine(x + w * 0.64, y + inset, x + w * 0.64, y + h - inset, p.frame, F * 0.65),
      showerLine(x + w * 0.64, barY, x + w * 0.9, y + h * 0.18, p.div, F * 0.42),
      `<rect data-shower-support="true" x="${px(x + w * 0.88)}" y="${px(y + h * 0.16)}" width="${px(F * 1.2)}" height="${px(F * 0.75)}" rx="0" fill="${p.div}"/>`,
      showerLine(x + w * 0.18, y + h - inset, x + w * 0.68, y + h - inset, p.div, F * 0.45),
    ].join("");
  }

  return config === "en l"
    ? showerCornerSliding(x, y, w, h, v, p, "en l", composition)
    : showerCornerSliding(x, y, w, h, v, p, "esquinero", composition);
}

function drawShowerDoor(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  sistemaNorm: string,
  configuracion?: string | null,
  composition?: string | null
): string {
  const systemKey =
    sistemaNorm === "Fijo"
      ? "fijo walk in"
      : sistemaNorm === "default"
        ? "corredera"
        : normalizeShowerKey(sistemaNorm);
  const configKey = normalizeShowerKey(configuracion) || "frontal";
  const compositionKey = normalizeShowerKey(composition);
  const body =
    systemKey === "corredera"
      ? configKey === "frontal"
        ? showerFrontSliding(x, y, w, h, v, p, compositionKey)
        : showerCornerSliding(x, y, w, h, v, p, configKey, compositionKey)
      : systemKey === "batiente" || systemKey === "abatible"
        ? configKey === "frontal"
          ? showerFrontSwing(x, y, w, h, v, p, compositionKey)
          : showerCornerSwing(x, y, w, h, v, p, configKey, compositionKey)
        : showerWalkIn(x, y, w, h, v, p, configKey, compositionKey);

  return `<g data-shower-door="true" data-shower-system="${escapeXml(systemKey)}" data-shower-config="${escapeXml(configKey)}" data-shower-composition="${escapeXml(compositionKey)}">${body}</g>`;
}

function cierreFrameWeight(v: string): number {
  return clamp(fw(v) * 1.35, 5, 8);
}

function drawCierreOuterShell(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette
): string {
  const F = cierreFrameWeight(v);
  const revealInset = F * 0.5;

  return [
    `<rect data-cierre-frame-reveal="true" x="${px(x + revealInset)}" y="${px(y + revealInset)}" width="${px(w - 2 * revealInset)}" height="${px(h - 2 * revealInset)}" fill="${wp.frame}"/>`,
    drawWindowProfileFrame(x, y, w, h, F, wp, "outer"),
  ].join("");
}

function drawCierreProfileLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  wp: WindowVisualPalette,
  id: string
): string {
  return drawWindowProfileLine(x1, y1, x2, y2, width, wp, `data-cierre-profile="${id}"`);
}

function drawCierreCorredera(x: number, y: number, w: number, h: number, v: string, wp: WindowVisualPalette): string {
  const F = cierreFrameWeight(v), D = dw(v), DT = det(v), GW = gsw(v);
  const FI = F * 0.75;
  const n = 3;
  const mulW = F * 0.72;
  const paneW = (w - FI * 2 - mulW * (n - 1)) / n;
  const hH = clamp(h * 0.15, 12, 20);
  const arrowY = y + h * 0.62;
  const arrowW = paneW * 0.42;
  const trackW = Math.max(D * 1.25, F * 0.42);

  return [
    `<g data-cierre-system="corredera">`,
    drawCierreOuterShell(x, y, w, h, v, wp),
    ...Array.from({ length: n }, (_, i) => {
      const paneX = x + FI + i * (paneW + mulW);
      return glassFill(paneX, y + FI, paneW, h - FI * 2, GW);
    }),
    ...Array.from({ length: n - 1 }, (_, i) => {
      const mx = x + FI + (i + 1) * paneW + i * mulW;
      return [
        drawCierreProfileLine(mx, y + FI * 0.5, mx, y + h - FI * 0.5, mulW, wp, "vertical"),
        sidePullHandle(mx - Math.max(4, mulW * 0.55), y + h * 0.50, hH),
        sidePullHandle(mx + Math.max(4, mulW * 0.55), y + h * 0.50, hH),
      ].join("");
    }),
    drawCierreProfileLine(x + FI, y + FI * 0.55, x + w - FI, y + FI * 0.55, trackW, wp, "top-rail"),
    drawCierreProfileLine(x + FI, y + h - FI - D * 0.5, x + w - FI, y + h - FI - D * 0.5, trackW, wp, "bottom-rail"),
    directionArrow(x + FI + paneW * 0.18, arrowY, arrowW, "left", DT * 1.15, wp.detail),
    directionArrow(x + w - FI - paneW * 0.18 - arrowW, arrowY, arrowW, "right", DT * 1.15, wp.detail),
    `</g>`,
  ].join("");
}

function drawCierrePlegable(x: number, y: number, w: number, h: number, v: string, wp: WindowVisualPalette): string {
  const F = cierreFrameWeight(v), D = dw(v), DT = det(v), GW = gsw(v);
  const FI = F * 0.75;
  const n = 4;
  const paneW = (w - FI * 2) / n;
  const pivR = clamp(D * 0.7, 2, 3.5);
  const foldW = Math.max(D, F * 0.42);

  return [
    `<g data-cierre-system="plegable">`,
    drawCierreOuterShell(x, y, w, h, v, wp),
    ...Array.from({ length: n }, (_, i) => glassFill(x + FI + i * paneW, y + FI, paneW, h - FI * 2, GW)),
    ...Array.from({ length: n - 1 }, (_, i) => {
      const fX = x + FI + (i + 1) * paneW;
      return [
        drawCierreProfileLine(fX, y + FI, fX, y + h - FI, foldW, wp, "fold"),
        `<circle cx="${px(fX)}" cy="${px(y + FI + (h - FI * 2) * 0.15)}" r="${pivR}" fill="${wp.detail}"/>`,
        `<circle cx="${px(fX)}" cy="${px(y + h - FI - (h - FI * 2) * 0.15)}" r="${pivR}" fill="${wp.detail}"/>`,
      ].join("");
    }),
    directionArrow(x + w * 0.60, y + h * 0.60, w * 0.16, "right", DT * 1.15, wp.detail),
    `</g>`,
  ].join("");
}

function drawCierreFijo(x: number, y: number, w: number, h: number, v: string, wp: WindowVisualPalette): string {
  const F = cierreFrameWeight(v), GW = gsw(v);
  const FI = F * 0.75;
  const n = 3;
  const mulW = F * 0.72;
  const paneW = (w - FI * 2 - mulW * (n - 1)) / n;

  return [
    `<g data-cierre-system="fijo">`,
    drawCierreOuterShell(x, y, w, h, v, wp),
    ...Array.from({ length: n }, (_, i) => {
      const paneX = x + FI + i * (paneW + mulW);
      return glassFill(paneX, y + FI, paneW, h - FI * 2, GW);
    }),
    ...Array.from({ length: n - 1 }, (_, i) => {
      const mX = x + FI + (i + 1) * paneW + i * mulW;
      return drawCierreProfileLine(mX, y + FI * 0.5, mX, y + h - FI * 0.5, mulW, wp, "vertical");
    }),
    fixedBadge(x + w / 2, y + h / 2, wp),
    `</g>`,
  ].join("");
}

// ─── Componentes: Barandas ────────────────────────────────────────────────────

function drawBarandaBotones(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const D = dw(v), GW = gsw(v);
  const railH = clamp(h * 0.13, 6, 10);
  const gY = y + railH;
  const gH = h - railH;
  const n = 4; // soportes por panel
  const btnR = clamp(w / (n * 3), 3, 5);
  return [
    // Vidrio (sin marco ni riel inferior — sistema de botones)
    glassFill(x, gY, w, gH, GW),
    // Pasamanos superior
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(railH)}" fill="${p.frame}" rx="0.5"/>`,
    // Botones de soporte
    ...Array.from({ length: n }, (_, i) => {
      const bX = x + (w / (n + 1)) * (i + 1);
      return [
        `<circle cx="${px(bX)}" cy="${px(gY + gH * 0.30)}" r="${btnR + 1.5}" fill="none" stroke="${p.detail}" stroke-width="${D}"/>`,
        `<circle cx="${px(bX)}" cy="${px(gY + gH * 0.30)}" r="${btnR * 0.5}" fill="${p.detail}"/>`,
        `<circle cx="${px(bX)}" cy="${px(gY + gH * 0.72)}" r="${btnR + 1.5}" fill="none" stroke="${p.detail}" stroke-width="${D}"/>`,
        `<circle cx="${px(bX)}" cy="${px(gY + gH * 0.72)}" r="${btnR * 0.5}" fill="${p.detail}"/>`,
      ].join("");
    }),
  ].join("");
}

function drawBarandaPerfilInferior(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const GW = gsw(v);
  const railH = clamp(h * 0.13, 6, 10);
  const botH = clamp(h * 0.11, 5, 9);
  const gY = y + railH;
  const gH = h - railH - botH;
  return [
    glassFill(x, gY, w, gH, GW),
    // Pasamanos superior
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(railH)}" fill="${p.frame}" rx="0.5"/>`,
    // Perfil inferior (canal)
    `<rect x="${px(x)}" y="${px(gY + gH)}" width="${px(w)}" height="${px(botH)}" fill="${p.div}" rx="0.5"/>`,
    // Línea de borde del vidrio (canto inferior)
    `<line x1="${px(x)}" y1="${px(gY + gH)}" x2="${px(x + w)}" y2="${px(gY + gH)}" stroke="${p.frame}" stroke-width="1.2"/>`,
  ].join("");
}

function drawBarandaPostes(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), GW = gsw(v);
  const railH = clamp(h * 0.13, 6, 10);
  const pW = clamp(F * 1.1, 4, 7);
  const n = 3; // postes interiores
  const gY = y + railH;
  const gH = h - railH;
  return [
    glassFill(x + pW, gY, w - pW * 2, gH, GW),
    // Pasamanos superior
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(railH)}" fill="${p.frame}" rx="0.5"/>`,
    // Postes
    ...Array.from({ length: n + 2 }, (_, i) => {
      const pX = x + (w / (n + 1)) * i;
      return [
        `<rect x="${px(pX - pW / 2)}" y="${px(gY)}" width="${px(pW)}" height="${px(gH)}" fill="${p.frame}" rx="0.5"/>`,
        `<rect x="${px(pX - pW / 2 - 1.5)}" y="${px(gY - 3)}" width="${px(pW + 3)}" height="${px(4)}" rx="0.5" fill="${p.detail}"/>`,
      ].join("");
    }),
  ].join("");
}

// ─── Componentes: Espejos ─────────────────────────────────────────────────────

function drawEspejoMuro(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const GW = gsw(v);
  // Sin marco — sólo la superficie reflectante con borde fino
  return [
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${p.dim}" stroke-width="1" stroke-dasharray="6,4"/>`,
    glassFill(x + 2, y + 2, w - 4, h - 4, GW),
  ].join("");
}

function drawEspejoMarco(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), GW = gsw(v), FI = fi(v);
  return [
    outerFrame(x, y, w, h, F, p.frame),
    glassFill(x + FI, y + FI, w - FI * 2, h - FI * 2, GW),
  ].join("");
}

function drawEspejoPegado(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const GW = gsw(v);
  const mR = 4; // radio de los puntos de montaje
  return [
    // Superficie sin marco (borde muy fino)
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${p.detail}" stroke-width="0.7"/>`,
    glassFill(x, y, w, h, GW),
    // 4 puntos de montaje en esquinas
    `<circle cx="${px(x + mR * 1.8)}" cy="${px(y + mR * 1.8)}" r="${mR}" fill="none" stroke="${p.detail}" stroke-width="1"/>`,
    `<circle cx="${px(x + w - mR * 1.8)}" cy="${px(y + mR * 1.8)}" r="${mR}" fill="none" stroke="${p.detail}" stroke-width="1"/>`,
    `<circle cx="${px(x + mR * 1.8)}" cy="${px(y + h - mR * 1.8)}" r="${mR}" fill="none" stroke="${p.detail}" stroke-width="1"/>`,
    `<circle cx="${px(x + w - mR * 1.8)}" cy="${px(y + h - mR * 1.8)}" r="${mR}" fill="none" stroke="${p.detail}" stroke-width="1"/>`,
  ].join("");
}

function mirrorPaneDividerAttrs(v: string, interiorLine: "fine" | "marked"): string {
  const isMarked = interiorLine === "marked";
  const strokeWidth = isMarked
    ? dw(v) * 1.15
    : Math.max(v === "pdf" ? 2 : 1.5, dw(v) * 0.95);
  const opacity = isMarked ? (v === "pdf" ? 0.9 : 0.82) : v === "pdf" ? 0.75 : 0.7;
  const dashArray = isMarked ? (v === "pdf" ? "14,8" : "12,7") : v === "pdf" ? "11,9" : "9,8";
  return [
    `stroke-width="${px(strokeWidth)}"`,
    `stroke-dasharray="${dashArray}"`,
    'stroke-linecap="round"',
    `opacity="${opacity}"`,
  ].join(" ");
}

function drawEspejoDividido(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  p: Palette,
  paneCount: number,
  direction: "vertical" | "horizontal",
  interiorLine: "fine" | "marked"
): string {
  const GW = gsw(v);
  const safePaneCount = Math.max(2, Math.round(paneCount));
  const dividerAttrs = mirrorPaneDividerAttrs(v, interiorLine);
  const dividers = Array.from({ length: safePaneCount - 1 }, (_, index) => {
    const position = index + 1;

    if (direction === "horizontal") {
      const lineY = y + (h / safePaneCount) * position;
      return `<line data-mirror-pane-divider="true" x1="${px(x + 2)}" y1="${px(lineY)}" x2="${px(x + w - 2)}" y2="${px(lineY)}" stroke="${p.div}" ${dividerAttrs}/>`;
    }

    const lineX = x + (w / safePaneCount) * position;
    return `<line data-mirror-pane-divider="true" x1="${px(lineX)}" y1="${px(y + 2)}" x2="${px(lineX)}" y2="${px(y + h - 2)}" stroke="${p.div}" ${dividerAttrs}/>`;
  });

  return [
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${GW}" rx="1"/>`,
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${p.dim}" stroke-width="1" stroke-dasharray="6,4" rx="1"/>`,
    ...dividers,
  ].join("");
}

// ─── Componente: Cubierta de mesa ─────────────────────────────────────────────

function drawMesa(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  // Vista en planta: la cubierta ocupa el rectángulo cotado (ancho × alto).
  const GW = gsw(v);
  const edge = clamp(Math.min(w, h) * 0.035, 2, 7);
  return [
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${GW}" rx="1"/>`,
    `<line x1="${px(x + edge)}" y1="${px(y + h - edge * 0.45)}" x2="${px(x + w - edge)}" y2="${px(y + h - edge * 0.45)}" stroke="${p.frame}" stroke-width="${dw(v)}" opacity="0.65"/>`,
    `<line x1="${px(x + w - edge * 0.45)}" y1="${px(y + edge)}" x2="${px(x + w - edge * 0.45)}" y2="${px(y + h - edge)}" stroke="${p.div}" stroke-width="${dw(v)}" opacity="0.5"/>`,
  ].join("");
}

function drawMesaCircular(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const GW = gsw(v);
  const size = Math.min(w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = size / 2;
  const edge = clamp(radius * 0.08, 2, 6);
  return [
    `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${GW}"/>`,
    `<path d="M ${px(cx - radius + edge)} ${px(cy)} A ${px(radius - edge)} ${px(radius - edge)} 0 0 1 ${px(cx + radius - edge)} ${px(cy)}" fill="none" stroke="${p.frame}" stroke-width="${dw(v)}" opacity="0.65"/>`,
  ].join("");
}

// ─── Componentes: Especiales ──────────────────────────────────────────────────

function drawFachada(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), GW = gsw(v), FI = fi(v);
  const cols = 3, rows = 4;
  const mulW = D * 1.2;
  const tranW = D * 1.0;
  const pW = (w - FI * 2 - mulW * (cols - 1)) / cols;
  const pH = (h - FI * 2 - tranW * (rows - 1)) / rows;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    // Paneles de vidrio
    ...Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const pX = x + FI + c * (pW + mulW);
        const pY = y + FI + r * (pH + tranW);
        return glassFill(pX, pY, pW, pH, GW);
      })
    ).flat(),
    // Parteluces verticales
    ...Array.from({ length: cols - 1 }, (_, i) => {
      const mX = x + FI + (i + 1) * pW + i * mulW;
      return `<line x1="${px(mX)}" y1="${px(y + FI * 0.5)}" x2="${px(mX)}" y2="${px(y + h - FI * 0.5)}" stroke="${p.frame}" stroke-width="${px(mulW)}" stroke-linecap="square"/>`;
    }),
    // Travesaños horizontales
    ...Array.from({ length: rows - 1 }, (_, i) => {
      const tY = y + FI + (i + 1) * pH + i * tranW;
      return `<line x1="${px(x + FI * 0.5)}" y1="${px(tY)}" x2="${px(x + w - FI * 0.5)}" y2="${px(tY)}" stroke="${p.frame}" stroke-width="${px(tranW)}" stroke-linecap="square"/>`;
    }),
  ].join("");
}

function drawMuroCortina(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), GW = gsw(v), FI = fi(v);
  const cols = 3, rows = 5;
  const mulW = D * 1.5; // parteluces más prominentes en muro cortina
  const tranW = D * 1.2;
  const pW = (w - FI * 2 - mulW * (cols - 1)) / cols;
  const pH = (h - FI * 2 - tranW * (rows - 1)) / rows;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    // Paneles alternados: fila par = visión (vidrio), fila impar = spandrel (opaco)
    ...Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const pX = x + FI + c * (pW + mulW);
        const pY = y + FI + r * (pH + tranW);
        if (r % 2 === 1) {
          // Panel spandrel — opaco
          return `<rect x="${px(pX)}" y="${px(pY)}" width="${px(pW)}" height="${px(pH)}" fill="rgba(28,28,28,0.22)" stroke="${p.div}" stroke-width="0.5"/>`;
        }
        return glassFill(pX, pY, pW, pH, GW);
      })
    ).flat(),
    // Parteluces verticales
    ...Array.from({ length: cols - 1 }, (_, i) => {
      const mX = x + FI + (i + 1) * pW + i * mulW;
      return `<line x1="${px(mX)}" y1="${px(y + FI * 0.5)}" x2="${px(mX)}" y2="${px(y + h - FI * 0.5)}" stroke="${p.frame}" stroke-width="${px(mulW)}" stroke-linecap="square"/>`;
    }),
    // Travesaños horizontales
    ...Array.from({ length: rows - 1 }, (_, i) => {
      const tY = y + FI + (i + 1) * pH + i * tranW;
      return `<line x1="${px(x + FI * 0.5)}" y1="${px(tY)}" x2="${px(x + w - FI * 0.5)}" y2="${px(tY)}" stroke="${p.frame}" stroke-width="${px(tranW)}" stroke-linecap="square"/>`;
    }),
  ].join("");
}

// ─── Componente: Vitrina ──────────────────────────────────────────────────────

type VitrinaProfileStyle = "framed" | "tempered";
type VitrinaSystem = "fixed" | "sliding";
type VitrinaForm = "tower" | "counter";

type VitrinaDrawingSpec = {
  form: VitrinaForm;
  profileStyle: VitrinaProfileStyle;
  system: VitrinaSystem;
  leafCount: 1 | 2;
};

function resolveVitrinaDrawingSpec(
  sistemaNorm: string,
  configuracion: string | null | undefined,
  composition: string,
  hojasBase: WindowLeafCount | null
): VitrinaDrawingSpec {
  const meta = normalizeSearchText(
    [composition, configuracion].filter(Boolean).join(" ")
  );
  const form: VitrinaForm =
    meta.includes("mostrador") || meta.includes("repisas") || sistemaNorm === "Mostrador"
      ? "counter"
      : "tower";
  const profileStyle: VitrinaProfileStyle =
    meta.includes("templada") || meta.includes("templado") || meta.includes("vidrio templado")
      ? "tempered"
      : "framed";
  const system: VitrinaSystem =
    sistemaNorm === "Corredera" || (meta.includes("corredera") && !meta.includes("fijo"))
      ? "sliding"
      : "fixed";

  let leafCount: 1 | 2 = 1;
  if (system === "sliding") {
    const fromText =
      extractLeafCountFromText(composition) ??
      extractLeafCountFromText(configuracion);
    if (fromText === 1 || fromText === 2) {
      leafCount = fromText;
    } else if (hojasBase === 1 || hojasBase === 2) {
      leafCount = hojasBase;
    } else if (meta.includes("2 hojas") || meta.includes("doble")) {
      leafCount = 2;
    } else if (meta.includes("1 hoja")) {
      leafCount = 1;
    } else if (profileStyle === "tempered") {
      leafCount = 2;
    }
  }

  return { form, profileStyle, system, leafCount };
}

function vitrinaProfileWeight(v: string, profileStyle: VitrinaProfileStyle): number {
  const base = windowOuterFrameWeight(v);
  return profileStyle === "tempered" ? Math.max(base * 0.72, 3.2) : base;
}

function drawVitrinaGlassReflections(x: number, y: number, w: number, h: number, v: string): string {
  const sw = v === "pdf" ? 1 : 0.85;
  const streaks: Array<[number, number, number, number]> = [
    [0.14, 0.12, 0.34, 0.12],
    [0.18, 0.18, 0.38, 0.18],
    [0.22, 0.24, 0.42, 0.24],
  ];

  return streaks
    .map(
      ([x1r, y1r, x2r, y2r]) =>
        `<line data-vitrina-glass-reflection="true" x1="${px(x + w * x1r)}" y1="${px(y + h * y1r)}" x2="${px(x + w * x2r)}" y2="${px(y + h * y2r)}" stroke="#FFFFFF" stroke-width="${px(sw)}" stroke-linecap="round" opacity="0.58"/>`
    )
    .join("");
}

function drawVitrinaGlassPane(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette,
  options?: { markFixed?: boolean; edgeOnly?: boolean }
): string {
  if (w <= 0 || h <= 0) return "";

  const pane: WindowPane = {
    x,
    y,
    w,
    h,
    centerX: x + w / 2,
    centerY: y + h / 2,
  };
  const glass = options?.edgeOnly
    ? `<rect data-vitrina-glass="true" data-vitrina-glass-edge="true" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${wp.glass}" fill-opacity="0.86" stroke="${wp.glassStroke}" stroke-width="${px(Math.max(gsw(v), 1))}" rx="0"/>`
    : drawGlassPanel(pane, v, wp, ' data-vitrina-glass="true"');

  return [
    glass,
    drawVitrinaGlassReflections(x, y, w, h, v),
    options?.markFixed
      ? `<text data-vitrina-fixed-mark="true" x="${px(pane.centerX)}" y="${px(pane.centerY + (v === "pdf" ? 5 : 4))}" text-anchor="middle" font-size="${v === "pdf" ? 13 : 11}" font-family="sans-serif" fill="${wp.detail}" font-weight="700" opacity="0.72">F</text>`
      : "",
  ].join("");
}

function drawVitrinaShelf(
  x: number,
  y: number,
  w: number,
  wp: WindowVisualPalette,
  v: string,
  bracketSize: number
): string {
  const shelfH = v === "pdf" ? 2.4 : 2;
  const bracket = Math.max(2.2, bracketSize);

  return [
    `<rect data-vitrina-shelf="true" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(shelfH)}" fill="${wp.glass}" fill-opacity="0.72" stroke="${wp.glassStroke}" stroke-width="${px(0.8)}"/>`,
    `<line data-vitrina-shelf-edge="true" x1="${px(x)}" y1="${px(y + shelfH)}" x2="${px(x + w)}" y2="${px(y + shelfH)}" stroke="${wp.glassStroke}" stroke-width="${px(1.1)}"/>`,
    `<rect data-vitrina-shelf-bracket="true" x="${px(x - bracket * 0.15)}" y="${px(y - bracket * 0.15)}" width="${px(bracket)}" height="${px(bracket)}" fill="${wp.frame}" stroke="${wp.div}" stroke-width="${px(0.6)}"/>`,
    `<rect data-vitrina-shelf-bracket="true" x="${px(x + w - bracket * 0.85)}" y="${px(y - bracket * 0.15)}" width="${px(bracket)}" height="${px(bracket)}" fill="${wp.frame}" stroke="${wp.div}" stroke-width="${px(0.6)}"/>`,
  ].join("");
}

function drawVitrinaShelves(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette,
  count = 3
): string {
  const ratios = count === 2 ? [0.36, 0.68] : [0.28, 0.52, 0.76];
  const bracketSize = clamp(w * 0.05, 3, 5);

  return ratios
    .map((ratio) => drawVitrinaShelf(x, y + h * ratio, w, wp, v, bracketSize))
    .join("");
}

function drawVitrinaCornerClip(cx: number, cy: number, size: number, wp: WindowVisualPalette): string {
  return `<rect data-vitrina-corner-clip="true" x="${px(cx - size / 2)}" y="${px(cy - size / 2)}" width="${px(size)}" height="${px(size)}" fill="${wp.frame}" stroke="${wp.div}" stroke-width="${px(0.7)}"/>`;
}

function drawVitrinaPullHandle(x: number, cy: number, h: number): string {
  const bodyW = 3.2;
  const bodyH = clamp(h, 14, 24);
  return `<rect data-vitrina-handle="true" x="${px(x - bodyW / 2)}" y="${px(cy - bodyH / 2)}" width="${px(bodyW)}" height="${px(bodyH)}" rx="0.6" fill="#D1D5DB" stroke="#6B7280" stroke-width="${px(0.8)}"/>`;
}

function drawVitrinaBase(x: number, y: number, w: number, baseH: number, wp: WindowVisualPalette): string {
  return [
    `<rect data-vitrina-base="true" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(baseH)}" fill="${wp.frame}" fill-opacity="0.92" stroke="${wp.div}" stroke-width="${px(1)}"/>`,
    `<line data-vitrina-base-top="true" x1="${px(x)}" y1="${px(y)}" x2="${px(x + w)}" y2="${px(y)}" stroke="${wp.div}" stroke-width="${px(1.2)}"/>`,
  ].join("");
}

function drawVitrinaTower(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette,
  spec: VitrinaDrawingSpec
): string {
  const profileW = vitrinaProfileWeight(v, spec.profileStyle);
  const baseH = clamp(h * 0.18, 14, 28);
  const topRailH = clamp(h * 0.045, 4, 7);
  const trackH = spec.system === "sliding" && spec.profileStyle === "framed" ? clamp(h * 0.028, 3, 5) : 0;
  const sideW =
    spec.profileStyle === "framed" ? clamp(w * 0.08, 6, 11) : clamp(w * 0.02, 1.5, 3);
  const bodyBottom = y + h - baseH;
  const glassTop = y + topRailH;
  const glassBottom = bodyBottom - trackH;
  const glassH = Math.max(1, glassBottom - glassTop);
  const glassX = x + sideW;
  const glassW = Math.max(1, w - sideW * 2);
  const mullionW =
    spec.profileStyle === "framed"
      ? Math.max(windowSashWeight(v), profileW * 0.55)
      : clamp(w * 0.018, 2, 3.5);
  const parts: string[] = [
    `<g data-vitrina-form="tower" data-vitrina-system="${spec.system}" data-vitrina-profile="${spec.profileStyle}" data-vitrina-leaves="${spec.leafCount}">`,
    drawVitrinaBase(x, bodyBottom, w, baseH, wp),
  ];

  if (spec.profileStyle === "framed") {
    parts.push(
      drawWindowProfileFrame(x, y, w, topRailH, profileW, wp, "top-rail"),
      drawWindowProfileLine(x, glassTop, x, glassBottom, sideW, wp, 'data-vitrina-side-profile="left"'),
      drawWindowProfileLine(x + w, glassTop, x + w, glassBottom, sideW, wp, 'data-vitrina-side-profile="right"')
    );
  } else {
    parts.push(
      drawWindowProfileFrame(x, y, w, topRailH, profileW, wp, "top-rail", { skipInnerChannel: true })
    );
  }

  if (trackH > 0) {
    parts.push(
      drawWindowProfileLine(x + sideW * 0.4, glassBottom, x + w - sideW * 0.4, glassBottom, trackH, wp, 'data-vitrina-track="bottom"')
    );
  }

  parts.push(drawVitrinaShelves(glassX, glassTop, glassW, glassH, v, wp));

  if (spec.system === "fixed") {
    parts.push(
      drawVitrinaGlassPane(glassX, glassTop, glassW, glassH, v, wp, {
        markFixed: true,
        edgeOnly: spec.profileStyle === "tempered",
      })
    );
    if (spec.profileStyle === "tempered") {
      const clip = clamp(sideW * 2.2, 3.5, 5);
      parts.push(
        drawVitrinaCornerClip(glassX, glassTop, clip, wp),
        drawVitrinaCornerClip(glassX + glassW, glassTop, clip, wp),
        drawVitrinaCornerClip(glassX, glassBottom, clip, wp),
        drawVitrinaCornerClip(glassX + glassW, glassBottom, clip, wp)
      );
    }
  } else if (spec.leafCount === 1) {
    parts.push(
      drawVitrinaGlassPane(glassX, glassTop, glassW, glassH, v, wp, {
        edgeOnly: spec.profileStyle === "tempered",
      })
    );
    const handleX = glassX + Math.max(8, glassW * 0.12);
    parts.push(drawVitrinaPullHandle(handleX, glassTop + glassH * 0.52, glassH * 0.18));
    parts.push(
      directionArrow(
        glassX + glassW * 0.34,
        glassTop + glassH * 0.58,
        glassW * 0.28,
        "right",
        windowDetailWeight(v),
        wp.detail
      )
    );
    if (spec.profileStyle === "tempered") {
      const clip = clamp(sideW * 2.2, 3.5, 5);
      parts.push(
        drawVitrinaCornerClip(glassX, glassTop, clip, wp),
        drawVitrinaCornerClip(glassX + glassW, glassTop, clip, wp),
        drawVitrinaCornerClip(glassX, glassBottom, clip, wp),
        drawVitrinaCornerClip(glassX + glassW, glassBottom, clip, wp)
      );
    }
  } else {
    const paneW = (glassW - mullionW) / 2;
    const leftX = glassX;
    const rightX = glassX + paneW + mullionW;

    parts.push(
      drawVitrinaGlassPane(leftX, glassTop, paneW, glassH, v, wp, {
        edgeOnly: spec.profileStyle === "tempered",
      }),
      drawVitrinaGlassPane(rightX, glassTop, paneW, glassH, v, wp, {
        edgeOnly: spec.profileStyle === "tempered",
      })
    );

    if (spec.profileStyle === "framed") {
      parts.push(
        drawWindowProfileLine(
          leftX + paneW,
          glassTop,
          leftX + paneW,
          glassBottom,
          mullionW,
          wp,
          'data-vitrina-mullion="center"'
        )
      );
    }

    parts.push(
      drawVitrinaPullHandle(leftX + paneW * 0.82, glassTop + glassH * 0.52, glassH * 0.16),
      drawVitrinaPullHandle(rightX + paneW * 0.18, glassTop + glassH * 0.52, glassH * 0.16),
      directionArrow(
        leftX + paneW * 0.18,
        glassTop + glassH * 0.58,
        paneW * 0.24,
        "left",
        windowDetailWeight(v),
        wp.detail
      ),
      directionArrow(
        rightX + paneW * 0.58,
        glassTop + glassH * 0.58,
        paneW * 0.24,
        "right",
        windowDetailWeight(v),
        wp.detail
      )
    );

    if (spec.profileStyle === "tempered") {
      const clip = clamp(sideW * 2.2, 3.5, 5);
      parts.push(
        drawVitrinaCornerClip(leftX, glassTop, clip, wp),
        drawVitrinaCornerClip(leftX + paneW, glassTop, clip, wp),
        drawVitrinaCornerClip(rightX, glassTop, clip, wp),
        drawVitrinaCornerClip(rightX + paneW, glassTop, clip, wp),
        drawVitrinaCornerClip(leftX, glassBottom, clip, wp),
        drawVitrinaCornerClip(leftX + paneW, glassBottom, clip, wp),
        drawVitrinaCornerClip(rightX, glassBottom, clip, wp),
        drawVitrinaCornerClip(rightX + paneW, glassBottom, clip, wp)
      );
    }
  }

  parts.push("</g>");
  return parts.join("");
}

function drawVitrinaCounter(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette
): string {
  const profileW = vitrinaProfileWeight(v, "framed");
  const baseH = clamp(h * 0.34, 18, 36);
  const boxH = h - baseH;
  const depth = clamp(w * 0.12, 10, 18);
  const frontX = x;
  const frontY = y + depth * 0.35;
  const frontW = w;
  const frontH = boxH - depth * 0.35;
  const topY = y;
  const parts: string[] = [
    `<g data-vitrina-form="counter" data-vitrina-system="fixed" data-vitrina-profile="framed">`,
    drawVitrinaBase(x, y + h - baseH, w, baseH, wp),
    `<polygon data-vitrina-glass-top="true" points="${px(frontX)},${px(topY)} ${px(frontX + frontW)},${px(topY)} ${px(frontX + frontW - depth * 0.35)},${px(frontY)} ${px(frontX + depth * 0.35)},${px(frontY)}" fill="${wp.glass}" fill-opacity="0.78" stroke="${wp.glassStroke}" stroke-width="${px(gsw(v))}"/>`,
    drawVitrinaGlassPane(frontX + depth * 0.35, frontY, frontW - depth * 0.7, frontH, v, wp),
    drawWindowProfileFrame(frontX, frontY, frontW, frontH, profileW * 0.72, wp, "counter-front", {
      skipInnerChannel: true,
    }),
    `<line data-vitrina-counter-depth="true" x1="${px(frontX)}" y1="${px(frontY)}" x2="${px(frontX + depth * 0.35)}" y2="${px(topY)}" stroke="${wp.frame}" stroke-width="${px(profileW * 0.65)}"/>`,
    `<line data-vitrina-counter-depth="true" x1="${px(frontX + frontW)}" y1="${px(frontY)}" x2="${px(frontX + frontW - depth * 0.35)}" y2="${px(topY)}" stroke="${wp.frame}" stroke-width="${px(profileW * 0.65)}"/>`,
    drawVitrinaShelves(
      frontX + depth * 0.55,
      frontY + frontH * 0.18,
      frontW - depth * 1.1,
      frontH * 0.62,
      v,
      wp,
      2
    ),
    "</g>",
  ];

  return parts.join("");
}

function drawVitrina(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  wp: WindowVisualPalette,
  sistemaNorm: string,
  configuracion: string | null | undefined,
  composition: string,
  hojasBase: WindowLeafCount | null
): string {
  const spec = resolveVitrinaDrawingSpec(sistemaNorm, configuracion, composition, hojasBase);

  if (spec.form === "counter") {
    return drawVitrinaCounter(x, y, w, h, v, wp);
  }

  return drawVitrinaTower(x, y, w, h, v, wp, spec);
}

function drawLucarna(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), GW = gsw(v), FI = fi(v);
  const n = 3;
  const pW = (w - FI * 2) / n;
  const riseH = h * 0.45; // altura del pico central respecto a cumbrera
  // Rellenos de paneles de techo inclinado
  const panels = Array.from({ length: n }, (_, i) => {
    const px1 = x + FI + i * pW;
    const px2 = x + FI + (i + 1) * pW;
    const topY1 = y + FI + riseH * (1 - i / n);
    const topY2 = y + FI + riseH * (1 - (i + 1) / n);
    const botY = y + h - FI;
    const pts = [
      [px1, topY1], [px2, topY2], [px2, botY], [px1, botY],
    ].map(([a, b]) => `${px(a)},${px(b)}`).join(" ");
    return `<polygon points="${pts}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${GW}"/>`;
  });
  // Rafters (estructura del techo)
  const rafters = Array.from({ length: n + 1 }, (_, i) => {
    const rX = x + FI + i * pW;
    const rTopY = y + FI + riseH * (1 - i / n);
    return `<line x1="${px(rX)}" y1="${px(rTopY)}" x2="${px(rX)}" y2="${px(y + h - FI)}" stroke="${p.frame}" stroke-width="${F * 0.6}" stroke-linecap="round"/>`;
  });
  // Cumbrera
  const cumbreraL = `<line x1="${px(x + FI)}" y1="${px(y + FI + riseH)}" x2="${px(x + w - FI)}" y2="${px(y + FI)}" stroke="${p.frame}" stroke-width="${F * 0.6}" stroke-linecap="round"/>`;
  // Base
  const base = `<line x1="${px(x)}" y1="${px(y + h - FI)}" x2="${px(x + w)}" y2="${px(y + h - FI)}" stroke="${p.frame}" stroke-width="${F * 0.8}" stroke-linecap="round"/>`;
  return [...panels, ...rafters, cumbreraL, base].join("");
}

function drawAMedida(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const cx = x + w / 2, cy = y + h / 2;
  const cr = Math.min(w, h) * 0.22;
  return [
    // Borde punteado
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${G_FILL}" stroke="${p.dim}" stroke-width="1.2" stroke-dasharray="8,5" rx="1"/>`,
    // Símbolo "+"
    `<line x1="${px(cx)}" y1="${px(cy - cr)}" x2="${px(cx)}" y2="${px(cy + cr)}" stroke="${p.detail}" stroke-width="2" stroke-linecap="round"/>`,
    `<line x1="${px(cx - cr)}" y1="${px(cy)}" x2="${px(cx + cr)}" y2="${px(cy)}" stroke="${p.detail}" stroke-width="2" stroke-linecap="round"/>`,
    // Label
    `<text x="${px(cx)}" y="${px(y + h - 10)}" text-anchor="middle" font-size="8" font-family="sans-serif" fill="${p.label}" font-weight="600" letter-spacing="0.06em">A MEDIDA</text>`,
  ].join("");
}

function drawOtro(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v);
  return [
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${G_FILL}" stroke="${p.detail}" stroke-width="${F * 0.5}" stroke-dasharray="7,5" rx="1"/>`,
    `<text x="${px(x + w / 2)}" y="${px(y + h / 2 + 4)}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="${p.label}">Componente</text>`,
  ].join("");
}

// ─── Router de dibujo ─────────────────────────────────────────────────────────

function routeDrawing(
  tipoNorm: string,
  sistemaNorm: string,
  hojasBase: WindowLeafCount | null,
  fixedSlidingPaneIndexes: Set<number>,
  projectedFixedLayout: ProjectedFixedLayout,
  bowPaneCount: WindowLeafCount,
  bowComposition: string,
  x: number, y: number, w: number, h: number,
  v: string,
  p: Palette,
  doorConfig?: string | null,
  palilloEnabled?: boolean,
  palilloType?: string,
  mirrorFormat?: "single" | "divided",
  mirrorPaneCount?: number | null,
  mirrorPaneDirection?: "vertical" | "horizontal",
  mirrorInteriorLine?: "fine" | "marked"
): string {
  const binaryLeafCount: 1 | 2 = hojasBase === 1 ? 1 : 2;

  switch (tipoNorm) {
    case "Ventana":
      if (sistemaNorm === "BowWindow") {
        return drawBowWindow(x, y, w, h, v, p, bowPaneCount, doorConfig, bowComposition);
      }
      if (sistemaNorm === "Guillotina") {
        return drawVentanaGuillotina(x, y, w, h, v, p, bowComposition || doorConfig);
      }
      if (sistemaNorm === "Celosia") {
        return drawVentanaCelosia(x, y, w, h, v, p, bowComposition || doorConfig);
      }
      if (sistemaNorm === "Oscilobatiente") return drawVentanaOscilobatiente(x, y, w, h, v, p, binaryLeafCount);
      if (sistemaNorm === "Abatible")    return drawVentanaAbatible(x, y, w, h, v, p, binaryLeafCount);
      if (sistemaNorm === "Proyectante" && projectedFixedLayout !== "none") {
        return drawVentanaProyectanteFijoVertical(x, y, w, h, v, p, projectedFixedLayout);
      }
      if (sistemaNorm === "Proyectante") return drawVentanaProyectante(x, y, w, h, v, p, binaryLeafCount);
      return drawVentanaCorredera(x, y, w, h, v, p, hojasBase ?? 2, fixedSlidingPaneIndexes); // Corredera por defecto

    case "Puerta":
      return drawPuertaComposite(x, y, w, h, v, p, sistemaNorm, doorConfig, palilloEnabled, palilloType);

    case "PanoFijo":
      return drawPanoFijo(x, y, w, h, v, p as WindowVisualPalette, bowComposition, doorConfig);

    case "Cristal":
      return drawCristalCatalog(x, y, w, h, v, doorConfig);

    case "Shower":
      return drawShowerDoor(x, y, w, h, v, p, sistemaNorm, doorConfig, bowComposition);

    case "Cierre":
      if (sistemaNorm === "Plegable") return drawCierrePlegable(x, y, w, h, v, p);
      if (sistemaNorm === "Fijo")     return drawCierreFijo(x, y, w, h, v, p);
      return drawCierreCorredera(x, y, w, h, v, p); // Corredera por defecto

    case "Baranda":
      if (sistemaNorm === "PerfilInferior") return drawBarandaPerfilInferior(x, y, w, h, v, p);
      if (sistemaNorm === "Postes")         return drawBarandaPostes(x, y, w, h, v, p);
      return drawBarandaBotones(x, y, w, h, v, p); // Botones por defecto

    case "Espejo":
      if (mirrorFormat === "divided" && mirrorPaneCount && mirrorPaneCount >= 2) {
        return drawEspejoDividido(
          x,
          y,
          w,
          h,
          v,
          p,
          mirrorPaneCount,
          mirrorPaneDirection ?? "vertical",
          mirrorInteriorLine ?? "fine"
        );
      }
      if (sistemaNorm === "Marco")  return drawEspejoMarco(x, y, w, h, v, p);
      if (sistemaNorm === "Pegado") return drawEspejoPegado(x, y, w, h, v, p);
      return drawEspejoMuro(x, y, w, h, v, p); // Muro por defecto

    case "Mesa":
      if (sistemaNorm === "Circular") return drawMesaCircular(x, y, w, h, v, p);
      return drawMesa(x, y, w, h, v, p);

    case "Fachada":
      return drawFachada(x, y, w, h, v, p);

    case "MuroCortina":
      return drawMuroCortina(x, y, w, h, v, p);

    case "Vitrina":
      return drawVitrina(
        x,
        y,
        w,
        h,
        v,
        p as WindowVisualPalette,
        sistemaNorm,
        doorConfig,
        bowComposition,
        hojasBase
      );

    case "Lucarna":
      return drawLucarna(x, y, w, h, v, p);

    case "AMedida":
      return drawAMedida(x, y, w, h, v, p);

    default:
      return drawOtro(x, y, w, h, v, p);
  }
}

// ─── Tamaños base por tipo (proporciones reales) ──────────────────────────────

function baseSizeFor(tipoNorm: string): { w: number; h: number } {
  const map: Record<string, { w: number; h: number }> = {
    Ventana:    { w: 180, h: 145 },
    Puerta:     { w:  95, h: 175 },
    PanoFijo:   { w: 165, h: 175 },
    Cristal:    { w: 145, h: 175 },
    Shower:     { w:  90, h: 175 },
    Cierre:     { w: 210, h: 115 },
    Baranda:    { w: 210, h:  80 },
    Espejo:     { w: 110, h: 155 },
    Mesa:       { w: 110, h: 180 },
    Fachada:    { w: 130, h: 165 },
    MuroCortina:{ w: 130, h: 175 },
    Vitrina:    { w: 100, h: 175 },
    Lucarna:    { w: 175, h: 105 },
    AMedida:    { w: 135, h: 135 },
  };
  return map[tipoNorm] ?? { w: 135, h: 135 };
}

function fitBoxFor(tipoNorm: string): { maxW: number; maxH: number } {
  const map: Record<string, { maxW: number; maxH: number }> = {
    Ventana:   { maxW: 230, maxH: 210 },
    Puerta:    { maxW: 140, maxH: 214 },
    PanoFijo:  { maxW: 210, maxH: 214 },
    Cristal:   { maxW: 210, maxH: 214 },
    Shower:    { maxW: 132, maxH: 214 },
    Cierre:    { maxW: 240, maxH: 148 },
    Baranda:   { maxW: 240, maxH: 118 },
    Mesa:      { maxW: 200, maxH: 210 },
  };

  return map[tipoNorm] ?? { maxW: 200, maxH: 180 };
}

// ─── Etiqueta del tipo ────────────────────────────────────────────────────────

function buildLabel(tipo: string, sistema: string | null | undefined, variant: string): string {
  if (variant === "pdf") return "";
  const sys = sistema ? ` · ${sistema}` : "";
  return `${tipo.trim().toLowerCase() === "ventana 1 hoja" ? "Fijo" : tipo}${sys}`;
}

function resolveMesaDiameter(
  params: ComponentSVGParams,
  base: { w: number; h: number }
): number {
  if (params.ancho && params.alto) {
    return Math.max(params.ancho, params.alto);
  }

  return params.ancho ?? params.alto ?? Math.max(base.w, base.h);
}

// ─── Exportación principal ────────────────────────────────────────────────────

/** Alcance visual explícito; los esquemas especiales conservan su representación. */
function isStandardTwoLeafSlidingWindow(params: ComponentSVGParams): boolean {
  const system = resolveSistema(params);
  const leaves = resolveWindowLeafCount(params, system);
  return normalizeType(params.tipo) === "Ventana" && system === "Corredera" && leaves === 2 &&
    !params.isCustomScheme && !params.customSchemeDescription?.trim() &&
    resolveFixedSlidingPaneIndexes(params, leaves).size === 0;
}

export function isMobileGuidedTwoLeafSlidingWindow(params: ComponentSVGParams): boolean {
  return params.presentation === "mobile-guided" && params.variant !== "pdf" &&
    isStandardTwoLeafSlidingWindow(params);
}

const MOBILE_SLIDING_VISUAL = {
  maxWidth: 240, maxHeight: 164,
  left: 38, top: 36, right: 8, bottom: 10,
  frame: { ratio: 0.062, min: 9, max: 14 },
  sash: { ratio: 0.042, min: 6, max: 9 },
  channel: 2, bead: 1.5, meetingStileFactor: 1.55,
} as const;

/** Fondo del croquis blanco, compartido con el PDF sin cambiar los perfiles. */
export function resolveWhiteSlidingPreviewBackground(params: ComponentSVGParams): "#F3F5F7" | undefined {
  return normalizeWindowProfileColor(params.colorHex) === "#FFFFFF" &&
    isStandardTwoLeafSlidingWindow(params)
    ? "#F3F5F7"
    : undefined;
}

/** Fondo suave para puertas con perfil claro (PVC blanco, blanco hueso, etc.). */
export function resolveLightDoorPreviewBackground(params: ComponentSVGParams): "#F3F5F7" | undefined {
  if (normalizeType(params.tipo) !== "Puerta") return undefined;
  return resolveDoorProfileColors(params.colorHex).frameOutline ? "#F3F5F7" : undefined;
}

/** Fondo suave para cierres terraza/logia con perfil claro. */
export function resolveLightCierrePreviewBackground(params: ComponentSVGParams): "#F3F5F7" | undefined {
  if (normalizeType(params.tipo) !== "Cierre") return undefined;
  return resolveWindowPalette(params.colorHex).frameOutline ? "#F3F5F7" : undefined;
}

/** Fondo suave para paños fijos con perfil claro. */
export function resolveLightFixedPanePreviewBackground(params: ComponentSVGParams): "#F3F5F7" | undefined {
  if (normalizeType(params.tipo) !== "PanoFijo") return undefined;
  return resolveWindowPalette(params.colorHex).frameOutline ? "#F3F5F7" : undefined;
}

/** Fondo suave para vitrinas con perfil claro. */
export function resolveLightVitrinaPreviewBackground(params: ComponentSVGParams): "#F3F5F7" | undefined {
  if (normalizeType(params.tipo) !== "Vitrina") return undefined;
  return resolveWindowPalette(params.colorHex).frameOutline ? "#F3F5F7" : undefined;
}

function resolveComponentSketchBackground(params: ComponentSVGParams): "#F3F5F7" | undefined {
  return (
    resolveWhiteSlidingPreviewBackground(params) ??
    resolveLightDoorPreviewBackground(params) ??
    resolveLightCierrePreviewBackground(params) ??
    resolveLightFixedPanePreviewBackground(params) ??
    resolveLightVitrinaPreviewBackground(params)
  );
}

function drawPreviewBackground(width: number, height: number, color: string | undefined): string {
  return color ? `<rect data-sketch-part="background" x="0" y="0" width="${width}" height="${height}" rx="8" fill="${color}"/>` : "";
}

function drawTwoLeafSlidingWindow(params: ComponentSVGParams): string {
  const m = MOBILE_SLIDING_VISUAL;
  const p = resolveWindowPalette(params.colorHex);
  const validMeasure = (value: number | null, fallback: number) =>
    value !== null && Number.isFinite(value) && value > 0 ? value : fallback;
  const realW = validMeasure(params.ancho, 1200);
  const realH = validMeasure(params.alto, 1500);
  const isPdf = params.variant === "pdf";
  // Misma geometría y espesores relativos en preview/PDF; solo escala el SVG completo.
  const maxW = isPdf ? m.maxWidth : params.maxW ?? m.maxWidth;
  const maxH = isPdf ? m.maxHeight : params.maxH ?? m.maxHeight;
  const scale = Math.min(maxW / realW, maxH / realH);
  const w = realW * scale;
  const h = realH * scale;
  const shortSide = Math.min(w, h);
  const renderVariant = isPdf ? "pdf" : "mobile-guided";
  // Aluminio y PVC comparten el mismo grosor de perfil (regla del constructor).
  const detailScale = Math.min(1, shortSide / 80);
  const frame = clamp(shortSide * m.frame.ratio, m.frame.min, m.frame.max) * detailScale;
  const sash = clamp(shortSide * m.sash.ratio, m.sash.min, m.sash.max) * detailScale;
  const meetingStile = sash * m.meetingStileFactor;
  const bead = m.bead * detailScale;
  const x = m.left;
  const y = m.top;
  const frameRevealInset = frame * 0.5;
  const innerX = x + frame;
  const innerY = y + frame;
  const innerW = w - 2 * frame;
  const innerH = h - 2 * frame;
  const overlap = sash * 0.5;
  const leafW = (innerW + overlap) / 2;
  const center = x + w / 2;
  const leaves = [innerX, innerX + innerW - leafW].map((leafX, index) => {
    const glassX = leafX + (index === 0 ? sash : meetingStile) + bead;
    const glassY = innerY + sash + bead;
    const glassW = leafW - sash - meetingStile - 2 * bead;
    const glassH = innerH - 2 * (sash + bead);
    return {
      x: leafX,
      sash: { x: leafX, y: innerY, w: leafW, h: innerH },
      glass: {
        x: glassX,
        y: glassY,
        w: glassW,
        h: glassH,
        centerX: glassX + glassW / 2,
        centerY: glassY + glassH / 2,
      },
    };
  });
  const reveal = `<g data-sketch-part="reveal"><rect data-window-frame-reveal="true" x="${px(x + frameRevealInset)}" y="${px(y + frameRevealInset)}" width="${px(w - 2 * frameRevealInset)}" height="${px(h - 2 * frameRevealInset)}" fill="${p.frame}"/></g>`;
  const compactProfile = { skipInnerChannel: true } as const;
  const outerFrame = `<g data-sketch-part="outerFrame">${drawWindowProfileFrame(x, y, w, h, frame, p, "outer", compactProfile)}</g>`;
  const sashes = `<g data-sketch-part="sashes">${leaves
    .map((leaf) => {
      const sashRevealInset = sash * 0.5;
      return [
        `<rect data-window-sash-reveal="true" x="${px(leaf.sash.x + sashRevealInset)}" y="${px(leaf.sash.y + sashRevealInset)}" width="${px(leaf.sash.w - 2 * sashRevealInset)}" height="${px(leaf.sash.h - 2 * sashRevealInset)}" fill="${p.frame}"/>`,
        `<g data-window-sash="true">${drawWindowProfileFrame(
          leaf.sash.x,
          leaf.sash.y,
          leaf.sash.w,
          leaf.sash.h,
          sash,
          p,
          "sash",
          compactProfile
        )}</g>`,
      ].join("");
    })
    .join("")}</g>`;
  const glass = `<g data-sketch-part="glass">${leaves
    .map((leaf) => drawGlassPanel(leaf.glass, renderVariant, p))
    .join("")}</g>`;
  const meetingRail = `<g data-sketch-part="meetingRail">${[
    p.frameOutline
      ? drawWindowStrokeRect(
          center - overlap / 2,
          innerY,
          overlap,
          innerH,
          p.frameOutline,
          Math.max(1.8, sash * 0.34) + 1.2,
          'data-window-meeting-profile="outline"'
        )
      : "",
    drawWindowStrokeRect(
      center - overlap / 2,
      innerY,
      overlap,
      innerH,
      p.frame,
      Math.max(meetingStile * 0.72, sash * 0.55),
      'data-window-meeting-profile="true"'
    ),
  ].join("")}</g>`;
  const handleY = y + h / 2;
  const handleXs = [center - meetingStile / 2, center + meetingStile / 2];
  const handles = `<g data-sketch-part="handles">${handleXs.map((hx) =>
    `<g transform="translate(${hx} ${handleY}) scale(${detailScale})">${drawRecessedHandle(0, 0, h * 0.11, renderVariant, p)}</g>`
  ).join("")}</g>`;
  const arrows = `<g data-sketch-part="arrows">${leaves.map((leaf, i) =>
    drawSlidingArrow(leaf.glass.centerX, leaf.glass.centerY, Math.min(42, leaf.glass.w * 0.48), i === 0 ? "right" : "left", "mobile-guided", p)
  ).join("")}</g>`;
  const dimensions = `<g data-sketch-part="dimensions">${dimH(x, y - 14, w, formatMm(params.ancho), p, "mobile-guided")}${dimV(x - 16, y, h, formatMm(params.alto), p, "mobile-guided")}</g>`;
  const totalW = w + m.left + m.right;
  const totalH = h + m.top + m.bottom;
  const background = drawPreviewBackground(totalW, totalH, resolveWhiteSlidingPreviewBackground(params));
  const outputScale = isPdf ? Math.min((params.maxW ?? 470) / totalW, (params.maxH ?? 260) / totalH) : 1;
  // El contenedor print controla el tamaño; márgenes inline se desplazan al rasterizar con html2canvas.
  const responsiveStyle = isPdf ? "" : ' style="display:block;max-width:100%;height:auto;margin-inline:auto"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW * outputScale}" height="${totalH * outputScale}"${responsiveStyle} role="img" aria-label="Ventana corredera de 2 hojas"><title>Ventana corredera de 2 hojas</title>${background}${reveal}${outerFrame}${sashes}${glass}${meetingRail}${handles}${arrows}${dimensions}</svg>`;
}

export function generateComponentSVG(params: ComponentSVGParams): string {
  if (isMobileGuidedTwoLeafSlidingWindow(params) ||
    (params.presentation === "quote-pdf" && params.variant === "pdf" && isStandardTwoLeafSlidingWindow(params))) {
    return drawTwoLeafSlidingWindow(params);
  }
  const variant   = params.variant ?? "default";
  const tipoNorm  = normalizeType(params.tipo);
  const sisNorm   = resolveSistema(params);
  const hojasBase = resolveWindowLeafCount(params, sisNorm);
  const fixedSlidingPaneIndexes = resolveFixedSlidingPaneIndexes(params, hojasBase);
  const projectedFixedLayout = resolveProjectedFixedLayout(params);
  const bowPaneCount = resolveBowWindowPaneCount(params);
  const bowComposition = [
    params.sheetScheme,
    params.sheetVariant,
    params.customSchemeDescription,
    params.referencia,
  ].filter(Boolean).join(" ");
  const palette =
    tipoNorm === "Ventana" ||
    tipoNorm === "Cierre" ||
    tipoNorm === "PanoFijo" ||
    tipoNorm === "Vitrina"
      ? resolveWindowPalette(params.colorHex)
      : tipoNorm === "Puerta"
        ? resolveDoorPalette(params.colorHex)
        : resolvePalette(params.colorHex);

  const base  = baseSizeFor(tipoNorm);
  const isMesa  = tipoNorm === "Mesa";
  const isMesaCircular = isMesa && sisNorm === "Circular";
  let rW = params.ancho && params.alto ? params.ancho : base.w;
  let rH = params.ancho && params.alto ? params.alto : base.h;

  if (isMesaCircular) {
    const diameter = resolveMesaDiameter(params, base);
    rW = diameter;
    rH = diameter;
  }

  const fitBox = fitBoxFor(tipoNorm);
  const maxW  = params.maxW ?? fitBox.maxW;
  const maxH  = params.maxH ?? fitBox.maxH;
  const scale = Math.min(maxW / rW, maxH / rH, 1.8);
  const abatibleDoorConfig = tipoNorm === "Puerta" && sisNorm === "Abatible"
    ? mapDoorConfig(params.configuracion)
    : null;
  const slidingDoorConfig = tipoNorm === "Puerta" && sisNorm === "Corredera"
    ? mapDoorConfig(params.configuracion)
    : null;
  const abatibleDoorMinW =
    abatibleDoorConfig === "4_hojas_abatibles"
      ? 132
      : abatibleDoorConfig && abatibleDoorConfig !== "1_hoja"
        ? 122
        : 88;
  const slidingDoorMinW =
    slidingDoorConfig === "4_hojas_moviles_corredera" || slidingDoorConfig === "4_hojas_2_fijas_2_moviles"
      ? 136
      : slidingDoorConfig === "3_hojas" || slidingDoorConfig === "triple_riel"
        ? 128
        : 118;
  const minDrawW = isMesaCircular
    ? 52
    : abatibleDoorConfig
      ? abatibleDoorMinW
      : slidingDoorConfig
        ? slidingDoorMinW
        : 68;
  const drawW = Math.max(minDrawW, Math.round(rW * scale));
  const drawH = Math.max(isMesaCircular ? 52 : 52, Math.round(rH * scale));
  const dimLeft = variant === "pdf" ? 60 : 46;
  const dimBot  = variant === "pdf" ? 8 : 42;
  const topPad  = variant === "pdf" ? 46 : 12;
  const rightPad = variant === "pdf" ? 8 : 12;

  const totalW  = drawW + dimLeft + rightPad;
  const totalH  = drawH + topPad + dimBot;
  const originX = dimLeft;
  const originY = topPad;

  const drawing = routeDrawing(
    tipoNorm,
    sisNorm,
    hojasBase,
    fixedSlidingPaneIndexes,
    projectedFixedLayout,
    bowPaneCount,
    bowComposition,
    originX,
    originY,
    drawW,
    drawH,
    variant,
    palette,
    params.configuracion,
    params.palilloEnabled,
    params.palilloType,
    params.mirrorFormat,
    params.mirrorPaneCount,
    params.mirrorPaneDirection,
    params.mirrorInteriorLine
  );

  const dimY = variant === "pdf" ? originY - 18 : originY + drawH + 18;
  const dimensions = isMesaCircular
    ? dimH(
        originX,
        dimY,
        drawW,
        formatMm(resolveMesaDiameter(params, base)),
        palette,
        variant
      )
    : [
        dimH(originX, dimY, drawW, formatMm(params.ancho), palette, variant),
        dimV(
          originX - (variant === "pdf" ? 28 : 20),
          originY,
          drawH,
          formatMm(params.alto),
          palette,
          variant
        ),
      ].join("");

  const label = buildLabel(params.tipo, params.sistema, variant);
  const labelEl = label
    ? `<text x="${px(originX + drawW / 2)}" y="${px(totalH - 8)}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="${palette.label}" font-weight="500">${escapeXml(label)}</text>`
    : "";

  const sketchBackground = resolveComponentSketchBackground(params);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" aria-hidden="true" role="img">`,
    sketchBackground ? drawPreviewBackground(totalW, totalH, sketchBackground) : "",
    "<g>",
    drawing,
    dimensions,
    labelEl,
    "</g>",
    "</svg>",
  ].join("");
}
// ─── Nuevo sistema de dibujo de puertas (v2) ─────────────────────────────────
// Este bloque se anexa al final de window-drawings.ts

const PD = {
  m: 10,
  sw: 3.2,
  fw: 2.4,
};

const DOOR_GLASS_FILL = "#DCEAF7";
const DOOR_GLASS_STROKE = "#B9D2EA";
const DOOR_DETAIL = "#4B5563";
const DOOR_OPENING_BLUE = "#1E88FF";
const DOOR_PROFILE_JOIN =
  'stroke-linecap="square" stroke-linejoin="miter" vector-effect="non-scaling-stroke"';

function drawDoorProfileRect(
  x: number,
  y: number,
  w: number,
  h: number,
  strokeW: number,
  colors: DoorProfileColors,
  dataAttrs: string,
  options?: { skipInnerChannel?: boolean; rx?: number }
): string {
  const rx = options?.rx ?? 0;
  const parts: string[] = [];

  if (colors.frameOutline) {
    parts.push(
      `<rect ${dataAttrs} data-door-frame="outline" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" rx="${px(rx)}" fill="none" stroke="${colors.frameOutline}" stroke-width="${px(strokeW + 2.4)}" ${DOOR_PROFILE_JOIN}/>`
    );
  }

  parts.push(
    `<rect ${dataAttrs} data-door-frame="outer" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" rx="${px(rx)}" fill="none" stroke="${colors.frame}" stroke-width="${px(strokeW)}" ${DOOR_PROFILE_JOIN}/>`
  );

  if (!options?.skipInnerChannel) {
    const inset = Math.max(strokeW * 0.42, 2.2);
    const innerW = w - inset * 2;
    const innerH = h - inset * 2;

    if (innerW > 0 && innerH > 0) {
      parts.push(
        `<rect ${dataAttrs} data-door-frame="inner-channel" x="${px(x + inset)}" y="${px(y + inset)}" width="${px(innerW)}" height="${px(innerH)}" rx="${px(Math.max(0, rx - inset * 0.4))}" fill="none" stroke="${colors.frameInner}" stroke-width="${px(Math.max(1.2, strokeW * 0.34))}" ${DOOR_PROFILE_JOIN}/>`
      );
    }
  }

  return parts.join("\n");
}

const ABATIBLE_DOOR_CONFIGS = new Set([
  "1_hoja",
  "2_hojas_puerta_doble",
  "2_hojas_fijo_superior",
  "4_hojas_abatibles",
  "1_hoja_fijo_lateral",
  "2_hojas_fijo_lateral",
  "2_hojas_2_fijos_laterales",
  "con_fijo_superior",
  "con_fijo_lateral_fijo_superior",
]);

const SLIDING_DOOR_CONFIGS = new Set([
  "1_hoja_movil",
  "2_hojas_1_fija_1_movil",
  "2_hojas_moviles_encuentro_central",
  "4_hojas_2_fijas_2_moviles",
  "4_hojas_moviles_corredera",
  "3_hojas",
  "doble_riel",
  "triple_riel",
  "elevadora_corredera_hs",
]);

const UNIFIED_FRAMED_DOOR_CONFIGS = new Set([
  "1_hoja_pivotante",
  "pivotante_fijo_lateral",
  "pivotante_doble",
  "2_hojas_plegables",
  "3_hojas_plegables",
  "4_hojas_plegables",
  "acordeon",
  "1_hoja_vaiven",
  "2_hojas_vaiven",
  "vidrio_templado_vaiven",
  "1_hoja_vidrio_templado",
  "doble_hoja_vidrio_templado",
  "vaiven_vidrio_templado",
  "corredera_vidrio_templado",
  "con_quicio_pivote",
  "con_tirador",
  "1_hoja_colgante",
  "2_hojas_colgantes",
  "vidrio_templado_colgante",
  "1_hoja_automatica",
  "2_hojas_automaticas",
  "corredera_automatica",
]);

function pdFrame(x: number, y: number, w: number, h: number, sw: number, color: string): string {
  return drawDoorProfileRect(
    x,
    y,
    w,
    h,
    sw,
    resolveDoorProfileColors(color),
    "",
    { rx: 2 }
  );
}

function drawDoorOuterFrame(x: number, y: number, w: number, h: number, frameColor: string): string {
  return drawDoorProfileRect(
    x,
    y,
    w,
    h,
    4.2,
    resolveDoorProfileColors(frameColor),
    'data-door-frame-part="outer"'
  );
}

function drawDoorGlassPanel(x: number, y: number, w: number, h: number): string {
  return `<rect data-door-glass="true" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" rx="0" fill="${DOOR_GLASS_FILL}" stroke="${DOOR_GLASS_STROKE}" stroke-width="0.6"/>`;
}

function drawDoorLeafFrame(x: number, y: number, w: number, h: number, frameColor: string, type: "swing" | "fixed"): string {
  const sw = type === "swing" ? 2.8 : 2.4;
  return drawDoorProfileRect(
    x,
    y,
    w,
    h,
    sw,
    resolveDoorProfileColors(frameColor),
    `data-door-${type}-frame="true"`
  );
}

function drawDoorHandle(x: number, cy: number, side: "left" | "right", scale = 1): string {
  const plateW = 6 * scale;
  const plateH = 34 * scale;
  const leverW = 19 * scale;
  const leverH = 4.2 * scale;
  const plateX = side === "right" ? x - plateW : x;
  const plateY = cy - plateH / 2;
  const leverX = side === "right" ? plateX + plateW - 1 : plateX - leverW + 1;
  const keyX = plateX + plateW / 2;
  const clearance = 2.2 * scale;
  return [
    `<g data-door-handle-clearance="true" fill="#F3F6FA" stroke="#F3F6FA" stroke-width="${px(clearance * 2)}" stroke-linejoin="round">`,
    `<rect x="${px(plateX)}" y="${px(plateY)}" width="${px(plateW)}" height="${px(plateH)}" rx="${px(3 * scale)}"/>`,
    `<rect x="${px(leverX)}" y="${px(cy - leverH / 2)}" width="${px(leverW)}" height="${px(leverH)}" rx="${px(3 * scale)}"/>`,
    `</g>`,
    `<g data-door-handle="true">`,
    `<rect x="${px(plateX)}" y="${px(plateY)}" width="${px(plateW)}" height="${px(plateH)}" rx="${px(3 * scale)}" fill="#D9DEE5" stroke="${DOOR_DETAIL}" stroke-width="${px(1.2 * scale)}"/>`,
    `<circle cx="${px(keyX)}" cy="${px(plateY + 7 * scale)}" r="${px(0.9 * scale)}" fill="#F8FAFC" stroke="${DOOR_DETAIL}" stroke-width="${px(0.7 * scale)}"/>`,
    `<rect x="${px(leverX)}" y="${px(cy - leverH / 2)}" width="${px(leverW)}" height="${px(leverH)}" rx="${px(3 * scale)}" fill="#E8EDF3" stroke="${DOOR_DETAIL}" stroke-width="${px(1.2 * scale)}"/>`,
    `<circle cx="${px(keyX)}" cy="${px(plateY + plateH - 9 * scale)}" r="${px(1.7 * scale)}" fill="#F8FAFC" stroke="${DOOR_DETAIL}" stroke-width="${px(0.7 * scale)}"/>`,
    `<line x1="${px(keyX)}" y1="${px(plateY + plateH - 7.5 * scale)}" x2="${px(keyX)}" y2="${px(plateY + plateH - 4 * scale)}" stroke="${DOOR_DETAIL}" stroke-width="${px(0.8 * scale)}" stroke-linecap="round"/>`,
    `</g>`,
  ].join("\n");
}

function drawOpeningArrow(pivotX: number, pivotY: number, r: number, direction: "right" | "left", scale = 1): string {
  const endX = direction === "right" ? pivotX + r : pivotX - r;
  const startY = pivotY - r;
  const sweep = direction === "right" ? 1 : 0;
  const headSize = 8 * scale;
  const head = direction === "right"
    ? `${px(endX - headSize)},${px(pivotY - 5 * scale)} ${px(endX)},${px(pivotY)} ${px(endX - headSize)},${px(pivotY + 5 * scale)}`
    : `${px(endX + headSize)},${px(pivotY - 5 * scale)} ${px(endX)},${px(pivotY)} ${px(endX + headSize)},${px(pivotY + 5 * scale)}`;
  return [
    `<g data-door-opening-arrow="true">`,
    `<path d="M${px(pivotX)},${px(startY)} A${px(r)},${px(r)} 0 0 ${sweep} ${px(endX)},${px(pivotY)}" fill="none" stroke="${DOOR_OPENING_BLUE}" stroke-width="${px(2.2 * scale)}" stroke-linecap="round"/>`,
    `<polyline points="${head}" fill="none" stroke="${DOOR_OPENING_BLUE}" stroke-width="${px(2.2 * scale)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</g>`,
  ].join("\n");
}

function drawOpenProjection(pivotX: number, pivotY: number, leafW: number, leafH: number, direction: "right" | "left"): string {
  const sign = direction === "right" ? 1 : -1;
  const openX = pivotX + sign * leafW * 0.72;
  const topY = pivotY - leafH;
  return [
    `<g data-door-open-projection="true">`,
    `<line x1="${px(pivotX)}" y1="${px(pivotY)}" x2="${px(openX)}" y2="${px(topY)}" stroke="${DOOR_DETAIL}" stroke-width="1" stroke-dasharray="4 3" opacity="0.55"/>`,
    `<line x1="${px(openX)}" y1="${px(topY)}" x2="${px(openX)}" y2="${px(pivotY)}" stroke="${DOOR_DETAIL}" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>`,
    `</g>`,
  ].join("\n");
}

function drawDoorHinges(x: number, y: number, h: number, side: "left" | "right", frameColor: string): string {
  const hingeX = side === "left" ? x - 1 : x + 1;
  const hinges = [y + h * 0.22, y + h * 0.5, y + h * 0.78];
  return [
    `<g data-door-hinges="${side}">`,
    ...hinges.map((hy) => `<rect x="${px(hingeX - 1.5)}" y="${px(hy - 4)}" width="3" height="8" rx="0" fill="${frameColor}" opacity="0.75"/>`),
    `</g>`,
  ].join("\n");
}

function drawSwingLeaf(
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor: string,
  hingeSide: "left" | "right",
  handleSide: "left" | "right",
  palilloType?: string,
  options: { showHandle?: boolean; showOpening?: boolean; showProjection?: boolean; handleScale?: number; arrowScale?: number } = {}
): string {
  const { showHandle = true, showOpening = true, showProjection = true } = options;
  const handleScale = options.handleScale ?? Math.min(0.88, Math.max(0.6, w / 72));
  const arrowScale = options.arrowScale ?? Math.min(1, Math.max(0.62, w / 56));
  const glassInset = 4;
  const pivotX = hingeSide === "left" ? x : x + w;
  const direction = hingeSide === "left" ? "right" : "left";
  const handleX = handleSide === "right" ? x + w - 9 : x + 9;
  return [
    `<g data-door-swing-leaf="true">`,
    drawDoorGlassPanel(x + glassInset, y + glassInset, w - glassInset * 2, h - glassInset * 2),
    pdPalillo(x + glassInset, y + glassInset, w - glassInset * 2, h - glassInset * 2, palilloType, frameColor),
    drawDoorLeafFrame(x, y, w, h, frameColor, "swing"),
    drawDoorHinges(hingeSide === "left" ? x : x + w, y, h, hingeSide, frameColor),
    showHandle ? drawDoorHandle(handleX, y + h * 0.46, handleSide, handleScale) : "",
    showOpening && showProjection ? drawOpenProjection(pivotX, y + h, w, h, direction) : "",
    showOpening ? drawOpeningArrow(pivotX, y + h, Math.min(w * 0.72, h * 0.38), direction, arrowScale) : "",
    `</g>`,
  ].join("\n");
}

function drawDoorFixedPanel(x: number, y: number, w: number, h: number, frameColor: string): string {
  const glassInset = 4;
  return [
    `<g data-door-fixed-panel="true">`,
    drawDoorGlassPanel(x + glassInset, y + glassInset, w - glassInset * 2, h - glassInset * 2),
    drawDoorLeafFrame(x, y, w, h, frameColor, "fixed"),
    `</g>`,
  ].join("\n");
}

function drawDoorAluminumBase(
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor: string,
  family: "sliding" | "swing" | "general"
): string {
  const colors = resolveDoorProfileColors(frameColor);
  const fillStroke = colors.frameOutline ?? colors.frame;
  const fillStrokeW = colors.frameOutline ? 1.4 : 0.9;
  const familyFillAttr =
    family === "sliding"
      ? ' data-door-sliding-aluminum-fill="true"'
      : family === "swing"
        ? ' data-door-swing-aluminum-fill="true"'
        : ' data-door-general-aluminum-fill="true"';
  const bandAttr =
    family === "sliding"
      ? "data-door-sliding-aluminum-band"
      : family === "swing"
        ? "data-door-swing-aluminum-band"
        : "data-door-general-aluminum-band";
  return [
    `<rect data-door-aluminum-fill="true"${familyFillAttr} x="${px(x + 2.5)}" y="${px(y + 2.5)}" width="${px(w - 5)}" height="${px(h - 5)}" rx="0" fill="${colors.frame}" stroke="${fillStroke}" stroke-width="${px(fillStrokeW)}" ${DOOR_PROFILE_JOIN}/>`,
    `<rect data-door-aluminum-band="top" ${bandAttr}="top" x="${px(x + 2.5)}" y="${px(y + 2.5)}" width="${px(w - 5)}" height="${px(8)}" rx="0" fill="${colors.frame}" stroke="${colors.frame}" stroke-width="0.9"/>`,
    `<rect data-door-aluminum-band="bottom" ${bandAttr}="bottom" x="${px(x + 2.5)}" y="${px(y + h - 10.5)}" width="${px(w - 5)}" height="${px(8)}" rx="0" fill="${colors.frame}" stroke="${colors.frame}" stroke-width="0.9"/>`,
    `<rect data-door-aluminum-band="left" ${bandAttr}="left" x="${px(x + 2.5)}" y="${px(y + 8)}" width="${px(6.5)}" height="${px(h - 16)}" rx="0" fill="${colors.frame}" stroke="${colors.frame}" stroke-width="0.8"/>`,
    `<rect data-door-aluminum-band="right" ${bandAttr}="right" x="${px(x + w - 9)}" y="${px(y + 8)}" width="${px(6.5)}" height="${px(h - 16)}" rx="0" fill="${colors.frame}" stroke="${colors.frame}" stroke-width="0.8"/>`,
  ].join("\n");
}

function drawDoorSlidingTracks(x: number, y: number, w: number, h: number, frameColor: string, trackCount = 2): string {
  const inset = 4;
  const railGap = 2.8;
  const rails: string[] = [drawDoorAluminumBase(x, y, w, h, frameColor, "sliding")];
  for (let i = 0; i < trackCount; i++) {
    const offset = inset + i * railGap;
    rails.push(`<line data-door-sliding-track="top" x1="${px(x + inset)}" y1="${px(y + offset)}" x2="${px(x + w - inset)}" y2="${px(y + offset)}" stroke="${frameColor}" stroke-width="1" opacity="0.68" stroke-linecap="butt"/>`);
    rails.push(`<line data-door-sliding-track="bottom" x1="${px(x + inset)}" y1="${px(y + h - offset)}" x2="${px(x + w - inset)}" y2="${px(y + h - offset)}" stroke="${frameColor}" stroke-width="1" opacity="0.68" stroke-linecap="butt"/>`);
  }
  return rails.join("\n");
}

function drawSlidingDoorHandle(x: number, cy: number, side: "left" | "right"): string {
  const plateW = 5.2;
  const plateH = 34;
  const plateX = side === "right" ? x - plateW : x;
  const y = cy - plateH / 2;
  return [
    `<g data-door-sliding-handle="true">`,
    `<rect x="${px(plateX)}" y="${px(y)}" width="${px(plateW)}" height="${px(plateH)}" rx="2" fill="#F8FAFC" stroke="${DOOR_DETAIL}" stroke-width="1"/>`,
    `<rect x="${px(plateX + 1.5)}" y="${px(y + 7)}" width="${px(plateW - 3)}" height="${px(plateH - 14)}" rx="1" fill="none" stroke="${DOOR_DETAIL}" stroke-width="0.8"/>`,
    `</g>`,
  ].join("\n");
}

function drawDoorSlidingArrow(cx: number, cy: number, direction: "left" | "right", width: number, color: string): string {
  const half = width / 2;
  const startX = direction === "right" ? cx - half : cx + half;
  const endX = direction === "right" ? cx + half : cx - half;
  const head = direction === "right"
    ? `${px(endX - 7)},${px(cy - 5)} ${px(endX)},${px(cy)} ${px(endX - 7)},${px(cy + 5)}`
    : `${px(endX + 7)},${px(cy - 5)} ${px(endX)},${px(cy)} ${px(endX + 7)},${px(cy + 5)}`;
  return [
    `<g data-door-sliding-arrow="true">`,
    `<line x1="${px(startX)}" y1="${px(cy)}" x2="${px(endX)}" y2="${px(cy)}" stroke="${color}" stroke-width="1.4" stroke-linecap="butt"/>`,
    `<polyline points="${head}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="butt" stroke-linejoin="miter"/>`,
    `</g>`,
  ].join("\n");
}

function drawSlidingDoorLeaf(
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor: string,
  options: {
    fixed?: boolean;
    handleSide?: "left" | "right";
    arrowDirection?: "left" | "right";
    palilloType?: string;
  } = {}
): string {
  const glassInset = 3.2;
  const type = options.fixed ? "fixed" : "sliding";
  const colors = resolveDoorProfileColors(frameColor);
  const sashRevealInset = 2.7 * 0.5;
  return [
    `<g data-door-sliding-leaf="${type}">`,
    `<rect data-door-sash-reveal="true" x="${px(x + sashRevealInset)}" y="${px(y + sashRevealInset)}" width="${px(w - 2 * sashRevealInset)}" height="${px(h - 2 * sashRevealInset)}" fill="${colors.frame}"/>`,
    drawDoorGlassPanel(x + glassInset, y + glassInset, w - glassInset * 2, h - glassInset * 2),
    options.palilloType ? pdPalillo(x + glassInset, y + glassInset, w - glassInset * 2, h - glassInset * 2, options.palilloType, frameColor) : "",
    drawDoorProfileRect(x, y, w, h, 2.7, colors, 'data-door-sliding-sash="true"'),
    !options.fixed && options.handleSide ? drawSlidingDoorHandle(options.handleSide === "right" ? x + w - 5.5 : x + 5.5, y + h * 0.5, options.handleSide) : "",
    !options.fixed && options.arrowDirection ? drawDoorSlidingArrow(x + w * 0.5, y + h * 0.5, options.arrowDirection, Math.min(w * 0.34, 34), DOOR_DETAIL) : "",
    `</g>`,
  ].join("\n");
}

function composeSlidingDoorSystem(
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor: string,
  config: string,
  palilloType?: string
): string {
  const m = PD.m;
  const outerX = x + m;
  const outerY = y + m;
  const outerW = w - m * 2;
  const outerH = h - m * 2;
  const pocket = 5.5;
  const leafY = outerY + pocket;
  const leafH = outerH - pocket * 2;
  const leafStartX = outerX + pocket;
  const leafTotalW = outerW - pocket * 2;
  const gap = 2;
  const trackCount = config === "triple_riel" ? 3 : 2;
  const parts = [
    `<g data-door-sliding-base="true" data-door-config="${config}">`,
    drawDoorOuterFrame(outerX, outerY, outerW, outerH, frameColor),
    drawDoorSlidingTracks(outerX, outerY, outerW, outerH, frameColor, trackCount),
  ];

  const addLeaf = (
    leafX: number,
    leafW: number,
    options: Parameters<typeof drawSlidingDoorLeaf>[5] = {}
  ) => {
    parts.push(drawSlidingDoorLeaf(leafX, leafY, leafW, leafH, frameColor, { ...options, palilloType }));
  };

  switch (config) {
    case "1_hoja_movil": {
      addLeaf(leafStartX, leafTotalW, { handleSide: "right", arrowDirection: "right" });
      break;
    }
    case "2_hojas_1_fija_1_movil":
    case "elevadora_corredera_hs": {
      const leafW = (leafTotalW - gap) / 2;
      addLeaf(leafStartX, leafW, { fixed: true });
      addLeaf(leafStartX + leafW + gap, leafW, { handleSide: "left", arrowDirection: "left" });
      break;
    }
    case "4_hojas_2_fijas_2_moviles": {
      const leafW = (leafTotalW - gap * 3) / 4;
      for (let i = 0; i < 4; i++) {
        const leafX = leafStartX + (leafW + gap) * i;
        const fixed = i === 0 || i === 3;
        addLeaf(leafX, leafW, fixed
          ? { fixed: true }
          : { handleSide: i === 1 ? "right" : "left", arrowDirection: i === 1 ? "left" : "right" });
      }
      break;
    }
    case "4_hojas_moviles_corredera": {
      const leafW = (leafTotalW - gap * 3) / 4;
      for (let i = 0; i < 4; i++) {
        const leafX = leafStartX + (leafW + gap) * i;
        addLeaf(leafX, leafW, {
          handleSide: i % 2 === 0 ? "right" : "left",
          arrowDirection: i % 2 === 0 ? "left" : "right",
        });
      }
      break;
    }
    case "3_hojas":
    case "triple_riel": {
      const leafW = (leafTotalW - gap * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const leafX = leafStartX + (leafW + gap) * i;
        addLeaf(leafX, leafW, {
          handleSide: i === 0 ? "right" : "left",
          arrowDirection: i === 1 ? "right" : "left",
        });
      }
      break;
    }
    case "doble_riel":
    case "2_hojas_moviles_encuentro_central":
    default: {
      const leafW = (leafTotalW - gap) / 2;
      addLeaf(leafStartX, leafW, { handleSide: "right", arrowDirection: "left" });
      addLeaf(leafStartX + leafW + gap, leafW, { handleSide: "left", arrowDirection: "right" });
      break;
    }
  }

  parts.push(`</g>`);
  return parts.join("\n");
}

function drawUnifiedDoorPanel(
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor: string,
  options: {
    fixed?: boolean;
    handleSide?: "left" | "right";
    palilloType?: string;
    detail?: "pivot" | "fold" | "vaiven" | "hanging" | "automatic";
  } = {}
): string {
  const glassInset = 4;
  const handleX = options.handleSide === "left" ? x + 7 : x + w - 7;
  const panelType = options.fixed ? "fixed" : "active";
  return [
    `<g data-door-unified-panel="${panelType}">`,
    drawDoorGlassPanel(x + glassInset, y + glassInset, w - glassInset * 2, h - glassInset * 2),
    options.palilloType ? pdPalillo(x + glassInset, y + glassInset, w - glassInset * 2, h - glassInset * 2, options.palilloType, frameColor) : "",
    drawDoorLeafFrame(x, y, w, h, frameColor, options.fixed ? "fixed" : "swing"),
    options.detail === "pivot" ? pdPivotDot(x + w * 0.36, y + h * 0.5, frameColor) : "",
    options.detail === "fold" ? `<line data-door-fold-line="true" x1="${px(x + w * 0.5)}" y1="${px(y + 3)}" x2="${px(x + 3)}" y2="${px(y + h - 3)}" stroke="${frameColor}" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.55"/>` : "",
    options.detail === "vaiven" ? drawOpeningArrow(x + w * 0.5, y + h, Math.min(w * 0.34, h * 0.26), "right", 0.55) : "",
    options.handleSide && !options.fixed ? drawDoorHandle(handleX, y + h * 0.5, options.handleSide, Math.min(0.72, Math.max(0.52, w / 88))) : "",
    `</g>`,
  ].join("\n");
}

function composeUnifiedFramedDoorSystem(
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor: string,
  config: string,
  palilloType?: string
): string {
  const m = PD.m;
  const outerX = x + m;
  const outerY = y + m;
  const outerW = w - m * 2;
  const outerH = h - m * 2;
  const pocket = 5.5;
  const panelX = outerX + pocket;
  const panelY = outerY + pocket;
  const panelW = outerW - pocket * 2;
  const panelH = outerH - pocket * 2;
  const gap = 4.5;
  const isPlegable = config.includes("plegable") || config === "acordeon";
  const isPivotante = config.includes("pivot");
  const isVaiven = config.includes("vaiven");
  const isColgante = config.includes("colgante");
  const isAutomatica = config.includes("automatica");
  const isTemplado = config.includes("vidrio_templado") || config.includes("quicio") || config === "con_tirador";
  const base = [
    `<g data-door-unified-base="true" data-door-config="${config}">`,
    drawDoorOuterFrame(outerX, outerY, outerW, outerH, frameColor),
    drawDoorAluminumBase(outerX, outerY, outerW, outerH, frameColor, "general"),
  ];

  type UnifiedDoorPanelOptions = NonNullable<Parameters<typeof drawUnifiedDoorPanel>[5]>;
  const addPanels = (count: number, fixedIndexes = new Set<number>(), detail?: UnifiedDoorPanelOptions["detail"]) => {
    const leafW = (panelW - gap * (count - 1)) / count;
    for (let i = 0; i < count; i++) {
      const leafX = panelX + (leafW + gap) * i;
      const handleSide = i % 2 === 0 ? "right" : "left";
      base.push(drawUnifiedDoorPanel(leafX, panelY, leafW, panelH, frameColor, {
        fixed: fixedIndexes.has(i),
        handleSide,
        palilloType,
        detail,
      }));
    }
  };

  if (isColgante || isAutomatica) {
    base.push(`<rect data-door-top-rail="true" x="${px(panelX)}" y="${px(panelY - 1)}" width="${px(panelW)}" height="5" rx="0" fill="${frameColor}" opacity="0.72"/>`);
  }

  if (isAutomatica) {
    base.push(pdSensor(panelX + panelW / 2, frameColor));
  }

  if (config === "pivotante_fijo_lateral") {
    addPanels(2, new Set([0]), "pivot");
  } else if (config === "pivotante_doble") {
    addPanels(2, new Set(), "pivot");
  } else if (isPivotante || config === "con_quicio_pivote") {
    addPanels(1, new Set(), "pivot");
  } else if (config === "3_hojas_plegables") {
    addPanels(3, new Set(), "fold");
  } else if (config === "4_hojas_plegables" || config === "acordeon") {
    addPanels(4, new Set(), "fold");
  } else if (isPlegable) {
    addPanels(2, new Set(), "fold");
  } else if (config === "2_hojas_vaiven" || config === "doble_hoja_vidrio_templado" || config === "2_hojas_colgantes" || config === "2_hojas_automaticas") {
    addPanels(2, new Set(), isVaiven ? "vaiven" : undefined);
  } else if (config === "vidrio_templado_colgante") {
    addPanels(2, new Set([1]));
  } else if (config === "corredera_vidrio_templado" || config === "corredera_automatica") {
    addPanels(2, new Set([0]));
  } else {
    addPanels(1, new Set(), isVaiven ? "vaiven" : isTemplado ? undefined : undefined);
  }

  base.push(`</g>`);
  return base.join("\n");
}

function composeAbatibleSystem(
  x: number,
  y: number,
  w: number,
  h: number,
  frameColor: string,
  config: string,
  palilloType?: string
): string {
  const m = PD.m;
  const outerX = x + m;
  const outerY = y + m;
  const outerW = w - m * 2;
  const outerH = h - m * 2;
  const pocket = 5.5;
  const doorX = outerX + pocket;
  const doorY = outerY + pocket;
  const doorW = outerW - pocket * 2;
  const doorH = outerH - pocket * 2;
  const gap = 4.5;
  const parts = [
    `<g data-door-abatible-base="true" data-door-config="${config}">`,
    drawDoorOuterFrame(outerX, outerY, outerW, outerH, frameColor),
    drawDoorAluminumBase(outerX, outerY, outerW, outerH, frameColor, "swing"),
  ];

  const addSwing = (
    leafX: number,
    leafY: number,
    leafW: number,
    leafH: number,
    hingeSide: "left" | "right",
    handleSide: "left" | "right",
    options?: { showHandle?: boolean; showOpening?: boolean; showProjection?: boolean; handleScale?: number; arrowScale?: number }
  ) => {
    parts.push(drawSwingLeaf(leafX, leafY, leafW, leafH, frameColor, hingeSide, handleSide, palilloType, options));
  };
  const addFixed = (panelX: number, panelY: number, panelW: number, panelH: number) => {
    parts.push(drawDoorFixedPanel(panelX, panelY, panelW, panelH, frameColor));
  };

  switch (config) {
    case "2_hojas_puerta_doble": {
      const leafW = (doorW - gap) / 2;
      addSwing(doorX, doorY, leafW, doorH, "left", "right");
      addSwing(doorX + leafW + gap, doorY, leafW, doorH, "right", "left");
      break;
    }
    case "2_hojas_fijo_superior": {
      const topH = doorH * 0.26;
      const swingH = doorH - topH - gap;
      const swingY = doorY + topH + gap;
      const leafW = (doorW - gap) / 2;
      addFixed(doorX, doorY, doorW, topH);
      addSwing(doorX, swingY, leafW, swingH, "left", "right");
      addSwing(doorX + leafW + gap, swingY, leafW, swingH, "right", "left");
      break;
    }
    case "4_hojas_abatibles": {
      const leafW = (doorW - gap * 3) / 4;
      for (let i = 0; i < 4; i++) {
        const leafX = doorX + (leafW + gap) * i;
        const hingeSide = i === 0 || i === 2 ? "left" : "right";
        const handleSide = i === 0 || i === 2 ? "right" : "left";
        addSwing(leafX, doorY, leafW, doorH, hingeSide, handleSide, {
          showHandle: true,
          showOpening: true,
          showProjection: false,
          arrowScale: 0.72,
        });
      }
      break;
    }
    case "1_hoja_fijo_lateral": {
      const fixedW = doorW * 0.34;
      const swingW = doorW - fixedW - gap;
      addFixed(doorX, doorY, fixedW, doorH);
      addSwing(doorX + fixedW + gap, doorY, swingW, doorH, "right", "left");
      break;
    }
    case "2_hojas_fijo_lateral": {
      const fixedW = doorW * 0.26;
      const leafW = (doorW - fixedW - gap * 2) / 2;
      addFixed(doorX, doorY, fixedW, doorH);
      addSwing(doorX + fixedW + gap, doorY, leafW, doorH, "left", "right");
      addSwing(doorX + fixedW + gap + leafW + gap, doorY, leafW, doorH, "right", "left");
      break;
    }
    case "2_hojas_2_fijos_laterales": {
      const fixedW = doorW * 0.18;
      const leafW = (doorW - fixedW * 2 - gap * 3) / 2;
      const firstLeafX = doorX + fixedW + gap;
      addFixed(doorX, doorY, fixedW, doorH);
      addSwing(firstLeafX, doorY, leafW, doorH, "left", "right", {
        showProjection: false,
        arrowScale: 0.82,
      });
      addSwing(firstLeafX + leafW + gap, doorY, leafW, doorH, "right", "left", {
        showProjection: false,
        arrowScale: 0.82,
      });
      addFixed(doorX + fixedW + gap + leafW + gap + leafW + gap, doorY, fixedW, doorH);
      break;
    }
    case "con_fijo_superior": {
      const topH = doorH * 0.26;
      const swingH = doorH - topH - gap;
      addFixed(doorX, doorY, doorW, topH);
      addSwing(doorX, doorY + topH + gap, doorW, swingH, "left", "right");
      break;
    }
    case "con_fijo_lateral_fijo_superior": {
      const topH = doorH * 0.24;
      const bottomH = doorH - topH - gap;
      const fixedW = doorW * 0.32;
      const swingW = doorW - fixedW - gap;
      addFixed(doorX, doorY, doorW, topH);
      addFixed(doorX, doorY + topH + gap, fixedW, bottomH);
      addSwing(doorX + fixedW + gap, doorY + topH + gap, swingW, bottomH, "right", "left");
      break;
    }
    case "1_hoja":
    default:
      addSwing(doorX, doorY, doorW, doorH, "left", "right");
      break;
  }

  parts.push(`</g>`);
  return parts.join("\n");
}

function pdGlass(
  x: number,
  y: number,
  w: number,
  h: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- color de marco reservado para variantes futuras
  frameColor?: string
): string {
  return `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="0.5"/>`;
}

function pdGlassFixed(x: number, y: number, w: number, h: number, color: string): string {
  return `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="rgba(200,215,228,0.55)" stroke="${color}" stroke-width="0.5"/>`;
}

function pdDiv(x1: number, y1: number, x2: number, y2: number, color: string, sw = 1.5): string {
  return `<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${color}" stroke-width="${sw}"/>`;
}

function pdHandleH(x: number, y: number, side: "L" | "R", color: string): string {
  const hw = 14, hh = 3.2, offset = 3;
  const handleX = side === "R" ? x : x - hw;
  return [
    `<rect x="${px(handleX)}" y="${px(y - hh / 2)}" width="${px(hw)}" height="${px(hh)}" rx="1.5" fill="${color}" stroke="none"/>`,
    `<line x1="${px(side === "L" ? handleX : handleX + hw)}" y1="${px(y)}" x2="${px(side === "L" ? handleX - offset : handleX + hw + offset)}" y2="${px(y + 7)}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`,
  ].join("");
}

function pdHandleBar(cx: number, cy: number, color: string): string {
  const bh = 28;
  return `<rect x="${px(cx - 2)}" y="${px(cy - bh / 2)}" width="4" height="${px(bh)}" rx="2" fill="${color}" stroke="none"/>`;
}

function pdHandleRound(cx: number, cy: number, color: string): string {
  return `<circle cx="${px(cx)}" cy="${px(cy)}" r="4" fill="${color}" stroke="none"/>`;
}

function pdSwingArc(ox: number, oy: number, r: number, startDeg: number, endDeg: number, color: string): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const sx = ox + r * Math.cos(toRad(startDeg));
  const sy = oy + r * Math.sin(toRad(startDeg));
  const ex = ox + r * Math.cos(toRad(endDeg));
  const ey = oy + r * Math.sin(toRad(endDeg));
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `<path d="M${px(sx)},${px(sy)} A${px(r)},${px(r)} 0 ${largeArc} ${sweep} ${px(ex)},${px(ey)}" fill="none" stroke="${color}" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.6"/>`;
}

function pdPalillo(x: number, y: number, w: number, h: number, palilloType: string | undefined, frameColor: string): string {
  if (!palilloType || palilloType === "Personalizado") return "";
  const drawPalillo = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeWidth: number,
    positionRatio?: number
  ) =>
    `<line data-door-palillo="true"${positionRatio == null ? "" : ` data-door-palillo-ratio="${px(positionRatio)}"`} x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${frameColor}" stroke-width="${px(strokeWidth)}" stroke-linecap="square" vector-effect="non-scaling-stroke"/>`;
  const lines: string[] = [];
  switch (palilloType) {
    case "1 vertical":
      lines.push(drawPalillo(x + w / 2, y, x + w / 2, y + h, 2.2));
      break;
    case "1 horizontal":
      lines.push(drawPalillo(x, y + h * 0.6, x + w, y + h * 0.6, 2.2, 0.6));
      break;
    case "Cruzado":
      lines.push(drawPalillo(x + w / 2, y, x + w / 2, y + h, 2.2));
      lines.push(drawPalillo(x, y + h / 2, x + w, y + h / 2, 2.2));
      break;
    case "Cuadricula / colonial": {
      const cols = 2, rows = 3;
      for (let c = 1; c < cols + 1; c++) {
        const px2 = x + (w / (cols + 1)) * c;
        lines.push(drawPalillo(px2, y, px2, y + h, 1.8));
      }
      for (let r = 1; r < rows + 1; r++) {
        const py = y + (h / (rows + 1)) * r;
        lines.push(drawPalillo(x, py, x + w, py, 1.8));
      }
      break;
    }
  }
  return lines.join("\n");
}

function pdPivotDot(x: number, y: number, color: string): string {
  return [
    `<circle cx="${px(x)}" cy="${px(y)}" r="3.5" fill="none" stroke="${color}" stroke-width="1.5"/>`,
    `<circle cx="${px(x)}" cy="${px(y)}" r="1.5" fill="${color}"/>`,
  ].join("");
}

function pdWheel(cx: number, frameColor: string): string {
  return [
    `<circle cx="${px(cx)}" cy="${px(PD.m + 3)}" r="4" fill="none" stroke="${frameColor}" stroke-width="1.2"/>`,
    `<circle cx="${px(cx)}" cy="${px(PD.m + 3)}" r="1.5" fill="${frameColor}"/>`,
  ].join("");
}

function pdQuicioMark(x: number, y: number, color: string): string {
  return `<rect x="${px(x - 5)}" y="${px(y - 4)}" width="10" height="8" rx="2" fill="${color}" opacity="0.6"/>`;
}

function pdFoldLine(cx: number, cw: number, dh: number, frameColor: string): string {
  return `<line x1="${px(cx + cw * 0.5)}" y1="${px(PD.m)}" x2="${px(cx)}" y2="${px(PD.m + dh)}" stroke="${frameColor}" stroke-width="0.6" stroke-dasharray="3 2" opacity="0.5"/>`;
}

function pdSensor(cx: number, frameColor: string): string {
  return `<polygon points="${px(cx - 6)},${px(PD.m)} ${px(cx + 6)},${px(PD.m)} ${px(cx)},${px(PD.m + 10)}" fill="${frameColor}" opacity="0.5"/>`;
}

const CONFIG_MAP: Record<string, string> = {
  "1 hoja": "1_hoja",
  "1 hoja movil": "1_hoja_movil",
  "2 hojas: 1 fija + 1 movil": "2_hojas_1_fija_1_movil",
  "2 hojas moviles / encuentro central": "2_hojas_moviles_encuentro_central",
  "3 hojas": "3_hojas",
  "4 hojas: 2 fijas + 2 moviles": "4_hojas_2_fijas_2_moviles",
  "4 hojas / 2 fijas + 2 moviles": "4_hojas_2_fijas_2_moviles",
  "4 hojas moviles": "4_hojas_moviles_corredera",
  "2 moviles": "2_hojas_moviles_encuentro_central",
  "1 fija + 1 movil": "2_hojas_1_fija_1_movil",
  "Doble riel": "doble_riel",
  "Triple riel": "triple_riel",
  "Elevadora corredera / HS": "elevadora_corredera_hs",
  "2 hojas / puerta doble": "2_hojas_puerta_doble",
  "2 hojas + fijo superior": "2_hojas_fijo_superior",
  "1 hoja + fijo lateral": "1_hoja_fijo_lateral",
  "2 hojas + fijo lateral": "2_hojas_fijo_lateral",
  "2 hojas + 2 fijos laterales": "2_hojas_2_fijos_laterales",
  "4 hojas abatibles": "4_hojas_abatibles",
  "Con fijo superior": "con_fijo_superior",
  "Con fijo lateral + fijo superior": "con_fijo_lateral_fijo_superior",
  "Apertura interior": "1_hoja",
  "Apertura exterior": "1_hoja",
  "Personalizado": "1_hoja",
  "1 hoja pivotante": "1_hoja_pivotante",
  "Pivotante + fijo lateral": "pivotante_fijo_lateral",
  "Pivotante doble": "pivotante_doble",
  "2 hojas plegables": "2_hojas_plegables",
  "3 hojas plegables": "3_hojas_plegables",
  "4 hojas plegables": "4_hojas_plegables",
  "4 hojas / 2 + 2": "4_hojas_plegables",
  "Acordeon": "acordeon",
  "1 hoja vaiven": "1_hoja_vaiven",
  "2 hojas vaiven": "2_hojas_vaiven",
  "Vidrio templado vaiven": "vidrio_templado_vaiven",
  "Abatir vidrio templado": "1_hoja_vidrio_templado",
  "1 hoja vidrio templado": "1_hoja_vidrio_templado",
  "Doble hoja vidrio templado": "doble_hoja_vidrio_templado",
  "4 hojas vidrio templado": "doble_hoja_vidrio_templado",
  "Vaiven vidrio templado": "vaiven_vidrio_templado",
  "Corredera vidrio templado": "corredera_vidrio_templado",
  "Con quicio / pivote": "con_quicio_pivote",
  "Con tirador": "con_tirador",
  "1 hoja colgante": "1_hoja_colgante",
  "2 hojas colgantes": "2_hojas_colgantes",
  "Vidrio templado colgante": "vidrio_templado_colgante",
  "1 hoja automatica": "1_hoja_automatica",
  "2 hojas automaticas": "2_hojas_automaticas",
  "Corredera automatica": "corredera_automatica",
};

function mapDoorConfig(catalogConfig: string | null | undefined): string {
  const key = (catalogConfig ?? "").trim();
  return CONFIG_MAP[key] ?? key.toLowerCase().replace(/\s+/g, "_");
}


function drawPuertaComposite(
  x: number, y: number, w: number, h: number,
  v: string, p: Palette,
  sistemaNorm: string,
  doorConfig: string | null | undefined,
  palilloEnabled: boolean | undefined,
  palilloType: string | undefined
): string {
  const config = mapDoorConfig(doorConfig);
  const frameColor = p.frame;
  const m = PD.m, sw = PD.sw, fw = PD.fw;
  const dh = h - m * 2;
  const gh = dh - fw * 2;

  const usePalillo = palilloEnabled && palilloType;
  const palType = usePalillo ? palilloType : undefined;

  const abatibleConfig = ABATIBLE_DOOR_CONFIGS.has(config)
    ? config
    : sistemaNorm === "Abatible"
      ? "1_hoja"
      : null;

  if (abatibleConfig) {
    return composeAbatibleSystem(x, y, w, h, frameColor, abatibleConfig, palType);
  }

  if (UNIFIED_FRAMED_DOOR_CONFIGS.has(config)) {
    return composeUnifiedFramedDoorSystem(x, y, w, h, frameColor, config, palType);
  }

  const slidingConfig = SLIDING_DOOR_CONFIGS.has(config)
    ? config
    : sistemaNorm === "Corredera"
      ? "2_hojas_moviles_encuentro_central"
      : null;

  if (slidingConfig) {
    return composeSlidingDoorSystem(x, y, w, h, frameColor, slidingConfig, palType);
  }

  const corrRails = (): string => {
    const railY1 = y + m + 3, railY2 = y + h - m - 3;
    return [
      `<line x1="${px(x + m)}" y1="${px(railY1)}" x2="${px(x + w - m)}" y2="${px(railY1)}" stroke="${frameColor}" stroke-width="1.5" opacity="0.4"/>`,
      `<line x1="${px(x + m)}" y1="${px(railY2)}" x2="${px(x + w - m)}" y2="${px(railY2)}" stroke="${frameColor}" stroke-width="1.5" opacity="0.4"/>`,
    ].join("\n");
  };

  switch (config) {
    // ABATIR
    case "1_hoja": {
      const dw = w - m * 2;
      const handleX = x + m + dw - fw - 2;
      return [
        pdGlass(x + m + fw, y + m + fw, dw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fw, y + m + fw, dw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m, y + m, dw, dh, sw, frameColor),
        pdHandleH(handleX, y + m + dh * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m, y + m + dh, dw * 0.75, -90, 0, frameColor),
      ].join("\n");
    }
    case "2_hojas_puerta_doble": {
      const hw = Math.floor((w - m * 2) / 2);
      const handleL = x + m + hw - fw - 1;
      const handleR = x + m + hw + fw + 1;
      return [
        pdGlass(x + m + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m, y + m, hw, dh, sw, frameColor),
        pdHandleH(handleL, y + m + dh * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m, y + m + dh, hw * 0.65, -90, 0, frameColor),
        pdGlass(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, sw, frameColor),
        pdHandleH(handleR, y + m + dh * 0.45, "L", HANDLE_STROKE),
        pdSwingArc(x + m + hw * 2, y + m + dh, hw * 0.65, -90, 180, frameColor),
      ].join("\n");
    }
    case "2_hojas_fijo_superior": {
      const topH = Math.floor((h - m * 2) * 0.26);
      const botH = h - m * 2 - topH;
      const dw = w - m * 2;
      const hw = Math.floor(dw / 2);
      const handleL = x + m + hw - fw - 1;
      const handleR = x + m + hw + fw + 1;
      const bottomY = y + m + topH;
      return [
        pdGlassFixed(x + m + fw, y + m + fw, dw - fw * 2, topH - fw * 2, frameColor),
        pdFrame(x + m, y + m, dw, topH, sw - 0.5, frameColor),
        pdGlass(x + m + fw, bottomY + fw, hw - fw * 2, botH - fw * 2, frameColor),
        pdPalillo(x + m + fw, bottomY + fw, hw - fw * 2, botH - fw * 2, palType, frameColor),
        pdFrame(x + m, bottomY, hw, botH, sw, frameColor),
        pdHandleH(handleL, bottomY + botH * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m, bottomY + botH, hw * 0.65, -90, 0, frameColor),
        pdGlass(x + m + hw + fw, bottomY + fw, hw - fw * 2, botH - fw * 2, frameColor),
        pdPalillo(x + m + hw + fw, bottomY + fw, hw - fw * 2, botH - fw * 2, palType, frameColor),
        pdFrame(x + m + hw, bottomY, hw, botH, sw, frameColor),
        pdHandleH(handleR, bottomY + botH * 0.45, "L", HANDLE_STROKE),
        pdSwingArc(x + m + hw * 2, bottomY + botH, hw * 0.65, -90, 180, frameColor),
      ].join("\n");
    }
    case "4_hojas_abatibles": {
      const lw = Math.floor((w - m * 2) / 4);
      const leafs: string[] = [];
      for (let i = 0; i < 4; i++) {
        const cx = x + m + lw * i;
        leafs.push(pdGlass(cx + fw, y + m + fw, lw - fw * 2, gh, frameColor));
        leafs.push(pdPalillo(cx + fw, y + m + fw, lw - fw * 2, gh, palType, frameColor));
        leafs.push(pdFrame(cx, y + m, lw, dh, sw, frameColor));
        if (i === 1) leafs.push(pdHandleH(cx + lw - fw - 1, y + m + dh * 0.45, "R", HANDLE_STROKE));
        if (i === 2) leafs.push(pdHandleH(cx + fw + 1, y + m + dh * 0.45, "L", HANDLE_STROKE));
        if (i === 0) leafs.push(pdSwingArc(cx, y + m + dh, lw * 0.55, -90, 0, frameColor));
        if (i === 3) leafs.push(pdSwingArc(cx + lw, y + m + dh, lw * 0.55, -90, 180, frameColor));
      }
      return leafs.join("\n");
    }
    case "1_hoja_fijo_lateral": {
      const fixedW = Math.floor((w - m * 2) * 0.35);
      const doorW = w - m * 2 - fixedW;
      const handleX = x + m + fixedW + doorW - fw - 2;
      return [
        pdGlassFixed(x + m + fw, y + m + fw, fixedW - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, fixedW, dh, sw - 0.5, frameColor),
        pdGlass(x + m + fixedW + fw, y + m + fw, doorW - fw * 2, gh, frameColor),
        pdPalillo(x + m + fixedW + fw, y + m + fw, doorW - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + fixedW, y + m, doorW, dh, sw, frameColor),
        pdHandleH(handleX, y + m + dh * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m + fixedW + doorW, y + m + dh, doorW * 0.7, -90, 180, frameColor),
      ].join("\n");
    }
    case "2_hojas_fijo_lateral": {
      const fixedW = Math.floor((w - m * 2) * 0.25);
      const doorsW = w - m * 2 - fixedW;
      const hw = Math.floor(doorsW / 2);
      const handleL = x + m + fixedW + hw - fw - 1;
      const handleR = x + m + fixedW + hw + fw + 1;
      return [
        pdGlassFixed(x + m + fw, y + m + fw, fixedW - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, fixedW, dh, sw - 0.5, frameColor),
        pdGlass(x + m + fixedW + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fixedW + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + fixedW, y + m, hw, dh, sw, frameColor),
        pdHandleH(handleL, y + m + dh * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m + fixedW, y + m + dh, hw * 0.65, -90, 0, frameColor),
        pdGlass(x + m + fixedW + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fixedW + hw + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + fixedW + hw, y + m, hw, dh, sw, frameColor),
        pdHandleH(handleR, y + m + dh * 0.45, "L", HANDLE_STROKE),
        pdSwingArc(x + m + fixedW + hw * 2, y + m + dh, hw * 0.65, -90, 180, frameColor),
      ].join("\n");
    }
    case "con_fijo_superior": {
      const topH = Math.floor((h - m * 2) * 0.28);
      const botH = h - m * 2 - topH;
      const dw = w - m * 2;
      return [
        pdGlassFixed(x + m + fw, y + m + fw, dw - fw * 2, topH - fw * 2, frameColor),
        pdFrame(x + m, y + m, dw, topH, sw - 0.5, frameColor),
        pdGlass(x + m + fw, y + m + topH + fw, dw - fw * 2, botH - fw * 2, frameColor),
        pdPalillo(x + m + fw, y + m + topH + fw, dw - fw * 2, botH - fw * 2, palType, frameColor),
        pdFrame(x + m, y + m + topH, dw, botH, sw, frameColor),
        pdHandleH(x + m + dw - fw - 2, y + m + topH + botH * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m, y + m + topH + botH, dw * 0.7, -90, 0, frameColor),
      ].join("\n");
    }
    case "con_fijo_lateral_fijo_superior": {
      const topH = Math.floor((h - m * 2) * 0.25);
      const fixedW = Math.floor((w - m * 2) * 0.3);
      const doorW = w - m * 2 - fixedW;
      const botH = h - m * 2 - topH;
      return [
        pdGlassFixed(x + m + fw, y + m + fw, w - m * 2 - fw * 2, topH - fw * 2, frameColor),
        pdFrame(x + m, y + m, w - m * 2, topH, sw - 0.5, frameColor),
        pdGlassFixed(x + m + fw, y + m + topH + fw, fixedW - fw * 2, botH - fw * 2, frameColor),
        pdFrame(x + m, y + m + topH, fixedW, botH, sw - 0.5, frameColor),
        pdGlass(x + m + fixedW + fw, y + m + topH + fw, doorW - fw * 2, botH - fw * 2, frameColor),
        pdPalillo(x + m + fixedW + fw, y + m + topH + fw, doorW - fw * 2, botH - fw * 2, palType, frameColor),
        pdFrame(x + m + fixedW, y + m + topH, doorW, botH, sw, frameColor),
        pdHandleH(x + m + fixedW + doorW - fw - 2, y + m + topH + botH * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m + fixedW + doorW, y + m + topH + botH, doorW * 0.7, -90, 180, frameColor),
      ].join("\n");
    }

    // CORREDERA
    case "1_hoja_movil": {
      const dw = w - m * 2;
      return [
        corrRails(),
        pdGlass(x + m + fw, y + m + fw, dw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fw, y + m + fw, dw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m, y + m, dw, dh, sw, frameColor),
        pdHandleBar(x + m + dw - 14, y + m + dh / 2, HANDLE_STROKE),
      ].join("\n");
    }
    case "2_hojas_1_fija_1_movil": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        corrRails(),
        pdGlassFixed(x + m + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, hw, dh, sw - 0.5, frameColor),
        pdGlass(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, sw, frameColor),
        pdHandleBar(x + m + hw + fw + 6, y + m + dh / 2, HANDLE_STROKE),
        `<path d="M${px(x + m + hw + hw * 0.6)},${px(y + m + dh * 0.5)} L${px(x + m + hw * 0.4)},${px(y + m + dh * 0.5)}" fill="none" stroke="${HANDLE_STROKE}" stroke-width="1" stroke-dasharray="4 2" opacity="0.5"/>`,
      ].join("\n");
    }
    case "2_hojas_moviles_encuentro_central": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        corrRails(),
        pdGlass(x + m + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m, y + m, hw, dh, sw, frameColor),
        pdHandleBar(x + m + hw - 10, y + m + dh / 2, HANDLE_STROKE),
        pdGlass(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, sw, frameColor),
        pdHandleBar(x + m + hw + 10, y + m + dh / 2, HANDLE_STROKE),
      ].join("\n");
    }
    case "4_hojas_2_fijas_2_moviles": {
      const qw = Math.floor((w - m * 2) / 4);
      const cells: string[] = [];
      for (let i = 0; i < 4; i++) {
        const cx = x + m + qw * i;
        const isFixed = i === 0 || i === 3;
        const fill = isFixed
          ? pdGlassFixed(cx + fw, y + m + fw, qw - fw * 2, gh, frameColor)
          : pdGlass(cx + fw, y + m + fw, qw - fw * 2, gh);
        cells.push(fill);
        if (!isFixed) cells.push(pdPalillo(cx + fw, y + m + fw, qw - fw * 2, gh, palType, frameColor));
        cells.push(pdFrame(cx, y + m, qw, dh, isFixed ? sw - 0.5 : sw, frameColor));
        if (!isFixed) cells.push(pdHandleBar(i === 1 ? cx + qw - 10 : cx + 10, y + m + dh / 2, HANDLE_STROKE));
      }
      return [corrRails(), ...cells].join("\n");
    }
    case "4_hojas_moviles_corredera": {
      const lw = Math.floor((w - m * 2) / 4);
      const leafs: string[] = [];
      for (let i = 0; i < 4; i++) {
        const cx = x + m + lw * i;
        leafs.push(pdGlass(cx + fw, y + m + fw, lw - fw * 2, gh, frameColor));
        leafs.push(pdPalillo(cx + fw, y + m + fw, lw - fw * 2, gh, palType, frameColor));
        leafs.push(pdFrame(cx, y + m, lw, dh, sw, frameColor));
        leafs.push(pdHandleBar(cx + lw / 2, y + m + dh / 2, HANDLE_STROKE));
      }
      return [corrRails(), ...leafs].join("\n");
    }
    case "3_hojas": {
      const tw = Math.floor((w - m * 2) / 3);
      const cells: string[] = [];
      for (let i = 0; i < 3; i++) {
        const cx = x + m + tw * i;
        cells.push(pdGlass(cx + fw, y + m + fw, tw - fw * 2, gh, frameColor));
        cells.push(pdPalillo(cx + fw, y + m + fw, tw - fw * 2, gh, palType, frameColor));
        cells.push(pdFrame(cx, y + m, tw, dh, sw, frameColor));
        cells.push(pdHandleBar(cx + tw / 2, y + m + dh / 2, HANDLE_STROKE));
      }
      return [corrRails(), ...cells].join("\n");
    }
    case "doble_riel": {
      const hw = Math.floor((w - m * 2) / 2);
      const midRail = `<line x1="${px(x + m)}" y1="${px(y + m + dh / 2)}" x2="${px(x + w - m)}" y2="${px(y + m + dh / 2)}" stroke="${frameColor}" stroke-width="1" opacity="0.35"/>`;
      return [
        corrRails(), midRail,
        pdGlass(x + m + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, hw, dh, sw, frameColor),
        pdHandleBar(x + m + hw - 10, y + m + dh / 2, HANDLE_STROKE),
        pdGlass(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, sw, frameColor),
        pdHandleBar(x + m + hw + 10, y + m + dh / 2, HANDLE_STROKE),
      ].join("\n");
    }
    case "triple_riel": {
      const tw = Math.floor((w - m * 2) / 3);
      const cells: string[] = [];
      for (let i = 0; i < 3; i++) {
        const cx = x + m + tw * i;
        cells.push(pdGlass(cx + fw, y + m + fw, tw - fw * 2, gh, frameColor));
        cells.push(pdFrame(cx, y + m, tw, dh, sw, frameColor));
        cells.push(pdHandleBar(cx + tw / 2, y + m + dh / 2, HANDLE_STROKE));
      }
      const extraRail = `<line x1="${px(x + m)}" y1="${px(y + m + dh / 3)}" x2="${px(x + w - m)}" y2="${px(y + m + dh / 3)}" stroke="${frameColor}" stroke-width="0.8" opacity="0.3"/>`;
      return [corrRails(), extraRail, ...cells].join("\n");
    }
    case "elevadora_corredera_hs": {
      const hw = Math.floor((w - m * 2) / 2);
      const arrows = [
        `<path d="M${px(x + m + hw * 0.7)},${px(y + m + dh * 0.7)} L${px(x + m + hw * 0.7)},${px(y + m + dh * 0.35)}" fill="none" stroke="${HANDLE_STROKE}" stroke-width="1" stroke-dasharray="3 2" opacity="0.5"/>`,
        `<path d="M${px(x + m + hw * 0.7)},${px(y + m + dh * 0.35)} L${px(x + m + hw * 0.2)},${px(y + m + dh * 0.35)}" fill="none" stroke="${HANDLE_STROKE}" stroke-width="1" stroke-dasharray="3 2" opacity="0.5"/>`,
      ].join("\n");
      return [
        corrRails(),
        pdGlass(x + m + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, hw, dh, sw, frameColor),
        pdHandleBar(x + m + hw - 12, y + m + dh / 2, HANDLE_STROKE),
        pdGlassFixed(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, sw - 0.5, frameColor),
        arrows,
      ].join("\n");
    }

    // PIVOTANTE
    case "1_hoja_pivotante": {
      const dw = w - m * 2;
      const pxPivot = x + m + dw * 0.35;
      return [
        pdGlass(x + m + fw, y + m + fw, dw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fw, y + m + fw, dw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m, y + m, dw, dh, sw, frameColor),
        pdPivotDot(pxPivot, y + m + dh / 2, frameColor),
        pdDiv(pxPivot, y + m, pxPivot, y + m + dh, frameColor, 0.7),
        pdHandleH(x + m + dw * 0.75, y + m + dh / 2, "L", HANDLE_STROKE),
      ].join("\n");
    }
    case "pivotante_fijo_lateral": {
      const fixedW = Math.floor((w - m * 2) * 0.3);
      const doorW = w - m * 2 - fixedW;
      const pxPivot = x + m + fixedW + doorW * 0.35;
      return [
        pdGlassFixed(x + m + fw, y + m + fw, fixedW - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, fixedW, dh, sw - 0.5, frameColor),
        pdGlass(x + m + fixedW + fw, y + m + fw, doorW - fw * 2, gh, frameColor),
        pdPalillo(x + m + fixedW + fw, y + m + fw, doorW - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + fixedW, y + m, doorW, dh, sw, frameColor),
        pdPivotDot(pxPivot, y + m + dh / 2, frameColor),
        pdDiv(pxPivot, y + m, pxPivot, y + m + dh, frameColor, 0.7),
        pdHandleH(x + m + fixedW + doorW * 0.75, y + m + dh / 2, "L", HANDLE_STROKE),
      ].join("\n");
    }
    case "pivotante_doble": {
      const hw = Math.floor((w - m * 2) / 2);
      const px1 = x + m + hw * 0.35;
      const px2 = x + m + hw + hw * 0.65;
      return [
        pdGlass(x + m + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m, y + m, hw, dh, sw, frameColor),
        pdPivotDot(px1, y + m + dh / 2, frameColor),
        pdDiv(px1, y + m, px1, y + m + dh, frameColor, 0.7),
        pdHandleH(x + m + hw * 0.8, y + m + dh / 2, "L", HANDLE_STROKE),
        pdGlass(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdPalillo(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, sw, frameColor),
        pdPivotDot(px2, y + m + dh / 2, frameColor),
        pdDiv(px2, y + m, px2, y + m + dh, frameColor, 0.7),
        pdHandleH(x + m + hw + hw * 0.2, y + m + dh / 2, "R", HANDLE_STROKE),
      ].join("\n");
    }

    // PLEGABLE
    case "2_hojas_plegables":
    case "3_hojas_plegables":
    case "4_hojas_plegables":
    case "acordeon": {
      const leafCount = config === "2_hojas_plegables" ? 2 : config === "3_hojas_plegables" ? 3 : 4;
      const lw = Math.floor((w - m * 2) / leafCount);
      const parts: string[] = [];
      for (let i = 0; i < leafCount; i++) {
        const cx = x + m + lw * i;
        parts.push(pdGlass(cx + fw, y + m + fw, lw - fw * 2, gh, frameColor));
        parts.push(pdPalillo(cx + fw, y + m + fw, lw - fw * 2, gh, palType, frameColor));
        parts.push(pdFrame(cx, y + m, lw, dh, sw, frameColor));
        parts.push(pdFoldLine(cx, lw, dh, frameColor));
      }
      parts.push(pdHandleBar(x + m + lw * leafCount - 12, y + m + dh / 2, HANDLE_STROKE));
      return parts.join("\n");
    }

    // VAIVÉN
    case "1_hoja_vaiven": {
      const dw = w - m * 2;
      return [
        pdGlass(x + m + fw, y + m + fw, dw - fw * 2, gh, frameColor),
        pdPalillo(x + m + fw, y + m + fw, dw - fw * 2, gh, palType, frameColor),
        pdFrame(x + m, y + m, dw, dh, sw, frameColor),
        pdHandleH(x + m + dw / 2 + 2, y + m + dh * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m + dw / 2, y + m + dh, dw * 0.4, -70, 0, frameColor),
        pdSwingArc(x + m + dw / 2, y + m + dh, dw * 0.4, -110, 180, frameColor),
      ].join("\n");
    }
    case "2_hojas_vaiven": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        pdGlass(x + m + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, hw, dh, sw, frameColor),
        pdHandleH(x + m + hw - fw - 1, y + m + dh * 0.45, "R", HANDLE_STROKE),
        pdSwingArc(x + m, y + m + dh, hw * 0.6, -70, 0, frameColor),
        pdSwingArc(x + m, y + m + dh, hw * 0.6, -110, 180, frameColor),
        pdGlass(x + m + hw + fw, y + m + fw, hw - fw * 2, gh, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, sw, frameColor),
        pdHandleH(x + m + hw + fw + 1, y + m + dh * 0.45, "L", HANDLE_STROKE),
        pdSwingArc(x + m + hw * 2, y + m + dh, hw * 0.6, -70, 0, frameColor),
        pdSwingArc(x + m + hw * 2, y + m + dh, hw * 0.6, -110, 180, frameColor),
      ].join("\n");
    }
    case "vidrio_templado_vaiven": {
      const dw = w - m * 2;
      return [
        pdGlass(x + m + fw, y + m + fw, dw - fw * 2, gh, frameColor),
        pdFrame(x + m, y + m, dw, dh, sw, frameColor),
        pdHandleRound(x + m + dw / 2, y + m + gh * 0.55, HANDLE_STROKE),
        pdSwingArc(x + m + dw / 2, y + m + dh, dw * 0.35, -70, 0, frameColor),
        pdSwingArc(x + m + dw / 2, y + m + dh, dw * 0.35, -110, 180, frameColor),
      ].join("\n");
    }

    // VIDRIO TEMPLADO
    case "1_hoja_vidrio_templado": {
      const dw = w - m * 2;
      return [
        pdGlass(x + m, y + m, dw, dh, frameColor),
        pdDiv(x + m + dw / 2, y + m, x + m + dw / 2, y + m + dh, frameColor, 1),
        pdFrame(x + m, y + m, dw, dh, 1.5, frameColor),
        `<rect x="${px(x + m + dw - 17)}" y="${px(y + m + dh / 2 - 20)}" width="6" height="40" rx="3" fill="${HANDLE_STROKE}" opacity="0.85"/>`,
        pdQuicioMark(x + m + dw * 0.1, y + m, frameColor),
        pdQuicioMark(x + m + dw * 0.1, y + m + dh, frameColor),
      ].join("\n");
    }
    case "doble_hoja_vidrio_templado": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        pdGlass(x + m, y + m, hw - 1, dh, frameColor),
        pdGlass(x + m + hw + 1, y + m, hw - 1, dh, frameColor),
        pdDiv(x + m + hw, y + m, x + m + hw, y + m + dh, frameColor, 1.5),
        pdFrame(x + m, y + m, hw, dh, 1.5, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, 1.5, frameColor),
        `<rect x="${px(x + m + hw - 17)}" y="${px(y + m + dh / 2 - 20)}" width="6" height="40" rx="3" fill="${HANDLE_STROKE}" opacity="0.85"/>`,
        `<rect x="${px(x + m + hw + 11)}" y="${px(y + m + dh / 2 - 20)}" width="6" height="40" rx="3" fill="${HANDLE_STROKE}" opacity="0.85"/>`,
        pdQuicioMark(x + m + hw * 0.15, y + m, frameColor),
        pdQuicioMark(x + m + hw * 0.15, y + m + dh, frameColor),
        pdQuicioMark(x + m + hw + hw * 0.85, y + m, frameColor),
        pdQuicioMark(x + m + hw + hw * 0.85, y + m + dh, frameColor),
      ].join("\n");
    }
    case "vaiven_vidrio_templado": {
      const dw = w - m * 2;
      return [
        pdGlass(x + m, y + m, dw, dh, frameColor),
        pdFrame(x + m, y + m, dw, dh, 1.5, frameColor),
        `<rect x="${px(x + m + dw / 2 - 3)}" y="${px(y + m + dh / 2 - 20)}" width="6" height="40" rx="3" fill="${HANDLE_STROKE}" opacity="0.85"/>`,
        pdSwingArc(x + m + dw / 2, y + m + dh, dw * 0.35, -70, 0, frameColor),
        pdSwingArc(x + m + dw / 2, y + m + dh, dw * 0.35, -110, 180, frameColor),
        pdQuicioMark(x + m + dw / 2, y + m, frameColor),
        pdQuicioMark(x + m + dw / 2, y + m + dh, frameColor),
      ].join("\n");
    }
    case "corredera_vidrio_templado": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        pdGlassFixed(x + m, y + m, hw - 1, dh, frameColor),
        pdGlass(x + m + hw + 1, y + m, hw - 1, dh, frameColor),
        pdFrame(x + m, y + m, hw, dh, 1, frameColor),
        pdFrame(x + m + hw, y + m, hw, dh, 1.5, frameColor),
        `<rect x="${px(x + m + hw + 10)}" y="${px(y + m + dh / 2 - 20)}" width="6" height="40" rx="3" fill="${HANDLE_STROKE}" opacity="0.85"/>`,
        `<line x1="${px(x + m)}" y1="${px(y + m + 2)}" x2="${px(x + w - m)}" y2="${px(y + m + 2)}" stroke="${frameColor}" stroke-width="1" opacity="0.4"/>`,
        `<line x1="${px(x + m)}" y1="${px(y + m + dh - 2)}" x2="${px(x + w - m)}" y2="${px(y + m + dh - 2)}" stroke="${frameColor}" stroke-width="1" opacity="0.4"/>`,
      ].join("\n");
    }
    case "con_quicio_pivote": {
      const dw = w - m * 2;
      return [
        pdGlass(x + m, y + m, dw, dh, frameColor),
        pdFrame(x + m, y + m, dw, dh, 1.5, frameColor),
        `<rect x="${px(x + m + dw * 0.62)}" y="${px(y + m + dh / 2 - 20)}" width="6" height="40" rx="3" fill="${HANDLE_STROKE}" opacity="0.85"/>`,
        pdQuicioMark(x + m + dw * 0.12, y + m, frameColor),
        pdQuicioMark(x + m + dw * 0.12, y + m + dh, frameColor),
        pdSwingArc(x + m + dw * 0.12, y + m + dh, dw * 0.6, -90, 0, frameColor),
      ].join("\n");
    }
    case "con_tirador": {
      const dw = w - m * 2;
      return [
        pdGlass(x + m, y + m, dw, dh, frameColor),
        pdFrame(x + m, y + m, dw, dh, 1.5, frameColor),
        `<rect x="${px(x + m + dw / 2 - 3)}" y="${px(y + m + dh / 2 - 20)}" width="6" height="40" rx="3" fill="${HANDLE_STROKE}" opacity="0.85"/>`,
      ].join("\n");
    }

    // COLGANTE
    case "1_hoja_colgante": {
      const dw = w - m * 2;
      return [
        `<rect x="${px(x + m)}" y="${px(y + m)}" width="${px(w - m * 2)}" height="6" rx="2" fill="${frameColor}" opacity="0.5"/>`,
        pdWheel(x + m + dw * 0.35, frameColor), pdWheel(x + m + dw * 0.65, frameColor),
        pdGlass(x + m + fw, y + m + 6, dw - fw * 2, dh - 6, frameColor),
        pdFrame(x + m, y + m + 6, dw, dh - 6, sw, frameColor),
        pdHandleBar(x + m + dw - 14, y + m + 6 + (dh - 6) / 2, HANDLE_STROKE),
      ].join("\n");
    }
    case "2_hojas_colgantes": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        `<rect x="${px(x + m)}" y="${px(y + m)}" width="${px(w - m * 2)}" height="6" rx="2" fill="${frameColor}" opacity="0.5"/>`,
        pdWheel(x + m + hw * 0.35, frameColor), pdWheel(x + m + hw * 0.65, frameColor),
        pdWheel(x + m + hw + hw * 0.35, frameColor), pdWheel(x + m + hw + hw * 0.65, frameColor),
        pdGlass(x + m + fw, y + m + 6, hw - fw * 2, dh - 6, frameColor),
        pdFrame(x + m, y + m + 6, hw, dh - 6, sw, frameColor),
        pdHandleBar(x + m + hw - 12, y + m + 6 + (dh - 6) / 2, HANDLE_STROKE),
        pdGlass(x + m + hw + fw, y + m + 6, hw - fw * 2, dh - 6, frameColor),
        pdFrame(x + m + hw, y + m + 6, hw, dh - 6, sw, frameColor),
        pdHandleBar(x + m + hw + 12, y + m + 6 + (dh - 6) / 2, HANDLE_STROKE),
      ].join("\n");
    }
    case "vidrio_templado_colgante": {
      const dw = w - m * 2;
      const hw1 = Math.floor(dw * 0.45);
      const hw2 = dw - hw1;
      return [
        `<rect x="${px(x + m)}" y="${px(y + m)}" width="${px(w - m * 2)}" height="6" rx="2" fill="${frameColor}" opacity="0.5"/>`,
        pdWheel(x + m + hw1 * 0.3, frameColor), pdWheel(x + m + hw1 * 0.7, frameColor),
        pdWheel(x + m + hw1 + hw2 * 0.3, frameColor), pdWheel(x + m + hw1 + hw2 * 0.7, frameColor),
        pdGlass(x + m, y + m + 6, hw1 - 1, dh - 6, frameColor),
        pdGlassFixed(x + m + hw1 + 1, y + m + 6, hw2, dh - 6, frameColor),
        pdFrame(x + m, y + m + 6, hw1, dh - 6, 2, frameColor),
        pdFrame(x + m + hw1, y + m + 6, hw2, dh - 6, 2, frameColor),
        pdHandleBar(x + m + hw1 - 12, y + m + 6 + (dh - 6) / 2, HANDLE_STROKE),
      ].join("\n");
    }

    // AUTOMÁTICA
    case "1_hoja_automatica": {
      const dw = w - m * 2;
      return [
        `<rect x="${px(x + m)}" y="${px(y + m)}" width="${px(w - m * 2)}" height="5" rx="1" fill="${frameColor}" opacity="0.6"/>`,
        pdSensor(x + m + dw / 2, frameColor),
        pdGlass(x + m + fw, y + m + 5, dw - fw * 2, dh - 5, frameColor),
        pdFrame(x + m, y + m + 5, dw, dh - 5, 2, frameColor),
        pdHandleBar(x + m + dw - 14, y + m + 5 + (dh - 5) / 2, HANDLE_STROKE),
      ].join("\n");
    }
    case "2_hojas_automaticas": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        `<rect x="${px(x + m)}" y="${px(y + m)}" width="${px(w - m * 2)}" height="5" rx="1" fill="${frameColor}" opacity="0.6"/>`,
        pdSensor(x + m + hw / 2, frameColor), pdSensor(x + m + hw + hw / 2, frameColor),
        pdGlass(x + m + fw, y + m + 5, hw - fw * 2, dh - 5, frameColor),
        pdFrame(x + m, y + m + 5, hw, dh - 5, 2, frameColor),
        pdHandleBar(x + m + hw - 12, y + m + 5 + (dh - 5) / 2, HANDLE_STROKE),
        pdGlass(x + m + hw + fw, y + m + 5, hw - fw * 2, dh - 5, frameColor),
        pdFrame(x + m + hw, y + m + 5, hw, dh - 5, 2, frameColor),
        pdHandleBar(x + m + hw + 12, y + m + 5 + (dh - 5) / 2, HANDLE_STROKE),
      ].join("\n");
    }
    case "corredera_automatica": {
      const hw = Math.floor((w - m * 2) / 2);
      return [
        `<rect x="${px(x + m)}" y="${px(y + m)}" width="${px(w - m * 2)}" height="5" rx="1" fill="${frameColor}" opacity="0.6"/>`,
        pdSensor(x + m + (w - m * 2) / 2, frameColor),
        pdGlassFixed(x + m + fw, y + m + 5, hw - fw * 2, dh - 5, frameColor),
        pdFrame(x + m, y + m + 5, hw, dh - 5, 1.5, frameColor),
        pdGlass(x + m + hw + fw, y + m + 5, hw - fw * 2, dh - 5, frameColor),
        pdFrame(x + m + hw, y + m + 5, hw, dh - 5, 2, frameColor),
        pdHandleBar(x + m + hw + 12, y + m + 5 + (dh - 5) / 2, HANDLE_STROKE),
      ].join("\n");
    }

    // GENÉRICO / FALLBACK
    default: {
      const dw = w - m * 2;
      const dh2 = h - m * 2;
      return [
        pdGlass(x + m + 5, y + m + 5, dw - 10, dh2 - 10, frameColor),
        pdFrame(x + m, y + m, dw, dh2, 3, frameColor),
        pdHandleH(x + m + dw - 4, y + m + dh2 * 0.45, "R", HANDLE_STROKE),
      ].join("\n");
    }
  }
}
