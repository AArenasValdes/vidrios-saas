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
  referencia?: string | null;
  ancho: number | null;
  alto: number | null;
  colorHex?: string | null;
  maxW?: number;
  maxH?: number;
  variant?: "default" | "pdf";
};

type Palette = {
  frame: string;  // color del marco / estructura
  div: string;    // divisiones internas (parteluces, rieles)
  detail: string; // detalles finos (manillas, bisagras, flechas)
  dim: string;    // líneas de cota
  dimTxt: string; // texto de cota
  label: string;  // etiquetas
};

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

function resolvePalette(colorHex: string | null | undefined): Palette {
  if (!isValidHex(colorHex)) {
    return {
      frame: "#16233B", div: "#3E587F", detail: "#274C8C",
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
  if (t.includes("fijo") || (t.startsWith("pa") && !t.startsWith("par")))
    return "PanoFijo";
  if (t.startsWith("show") || t.includes("ducha")) return "Shower";
  if (t.startsWith("cier")) return "Cierre";
  if (t.startsWith("bar")) return "Baranda";
  if (t.startsWith("esp")) return "Espejo";
  if (t.includes("mesa") || t.includes("tapa")) return "Mesa";
  if (t.includes("fachada")) return "Fachada";
  if (t.includes("muro") && t.includes("cort")) return "MuroCortina";
  if (t.includes("vitrina")) return "Vitrina";
  if (t.includes("lucarna") || t.includes("techo")) return "Lucarna";
  if (t.includes("medida") || t.includes("proyecto")) return "AMedida";
  return "Otro";
}

function normalizeSistema(sistema: string | null | undefined): string {
  const s = (sistema ?? "").trim().toLowerCase();
  if (s.includes("corr")) return "Corredera";
  if (s.includes("abat")) return "Abatible";
  if (s.includes("proye")) return "Proyectante";
  if (s.includes("pivot")) return "Pivotante";
  if (s.includes("pleg")) return "Plegable";
  if (s.includes("fijo")) return "Fijo";
  if (s.includes("boton")) return "Botones";
  if (s.includes("perfil") || s.includes("inferior")) return "PerfilInferior";
  if (s.includes("post") || s.includes("mont")) return "Postes";
  if (s.includes("marco")) return "Marco";
  if (s.includes("peg")) return "Pegado";
  if (s.includes("muro")) return "Muro";
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

function slidingLeafLabel(cx: number, y: number, name: string, color: string): string {
  return [
    `<text x="${px(cx)}" y="${px(y)}" text-anchor="middle" font-size="8.5" font-family="sans-serif" fill="${color}" font-weight="500">${name}</text>`,
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
  const tk = v === "pdf" ? 2 : 6;
  const sw = v === "pdf" ? 0.7 : 1;
  const fs = v === "pdf" ? 7 : 10;
  const fw2 = v === "pdf" ? "600" : "400";
  return [
    `<line x1="${px(x)}" y1="${px(y)}" x2="${px(x + w)}" y2="${px(y)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x)}" y1="${px(y - tk)}" x2="${px(x)}" y2="${px(y + tk)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x + w)}" y1="${px(y - tk)}" x2="${px(x + w)}" y2="${px(y + tk)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    v !== "pdf" ? arrowTip(x, y, "left", 1, p.dim) : "",
    v !== "pdf" ? arrowTip(x + w, y, "right", 1, p.dim) : "",
    `<text x="${px(x + w / 2)}" y="${px(y - 8)}" text-anchor="middle" font-size="${fs}" font-family="sans-serif" fill="${p.dimTxt}" font-weight="${fw2}">${escapeXml(text)}</text>`,
  ].join("");
}

function dimV(x: number, y: number, h: number, text: string, p: Palette, v: string): string {
  const tk = v === "pdf" ? 2 : 6;
  const sw = v === "pdf" ? 0.7 : 1;
  const fs = v === "pdf" ? 7 : 10;
  const fw2 = v === "pdf" ? "600" : "400";
  return [
    `<line x1="${px(x)}" y1="${px(y)}" x2="${px(x)}" y2="${px(y + h)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x - tk)}" y1="${px(y)}" x2="${px(x + tk)}" y2="${px(y)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x - tk)}" y1="${px(y + h)}" x2="${px(x + tk)}" y2="${px(y + h)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    v !== "pdf" ? arrowTip(x, y, "up", 1, p.dim) : "",
    v !== "pdf" ? arrowTip(x, y + h, "down", 1, p.dim) : "",
    `<text x="${px(x - 11)}" y="${px(y + h / 2)}" text-anchor="middle" font-size="${fs}" font-family="sans-serif" fill="${p.dimTxt}" font-weight="${fw2}" transform="rotate(-90 ${px(x - 11)} ${px(y + h / 2)})">${escapeXml(text)}</text>`,
  ].join("");
}

// ─── Componentes: Ventanas ────────────────────────────────────────────────────

function drawVentanaCorredera(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const midX = x + w / 2;
  const mulW = Math.max(3.2, D * 1.55);
  const hH = clamp(h * 0.15, 15, 20);
  const trkY = y + h - FI - D * 0.5;
  const glW = w / 2 - FI - mulW / 2;
  const leftPaneX = x + FI;
  const rightPaneX = x + w / 2 + mulW / 2;
  const arrowW = Math.max(24, glW * 0.42);
  const arrowY = y + h * 0.50;
  const labelY = arrowY + 16;
  const systemStroke = DT * 1.2;
  const leftCenter = leftPaneX + glW / 2;
  const rightCenter = rightPaneX + glW / 2;
  const leftArrowX = leftCenter - arrowW * 0.5;
  const rightArrowX = rightCenter - arrowW * 0.5;
  const outerHandleInset = Math.max(4.5, F * 0.9);
  return [
    outerFrame(x, y, w, h, F, p.frame),
    technicalFrameLines(x, y, w, h, F, p.div),
    // Panel izquierdo de vidrio
    glassFill(leftPaneX, y + FI, glW, h - FI * 2, GW),
    // Panel derecho de vidrio
    glassFill(rightPaneX, y + FI, glW, h - FI * 2, GW),
    // Parteluz central vertical
    `<line x1="${px(midX)}" y1="${px(y + FI * 0.5)}" x2="${px(midX)}" y2="${px(y + h - FI * 0.5)}" stroke="${p.frame}" stroke-width="${px(mulW)}" stroke-linecap="square"/>`,
    // Riel inferior
    `<line x1="${px(x + FI)}" y1="${px(trkY)}" x2="${px(x + w - FI)}" y2="${px(trkY)}" stroke="${p.div}" stroke-width="${px(D * 1.05)}" stroke-linecap="round"/>`,
    // Manillas en jambas exteriores para evitar choques con flechas y labels
    sidePullHandle(x + outerHandleInset, y + h * 0.50, hH),
    sidePullHandle(x + w - outerHandleInset, y + h * 0.50, hH),
    // Indicadores de deslizamiento por hoja
    directionArrow(leftArrowX, arrowY, arrowW, "right", systemStroke, p.detail),
    directionArrow(rightArrowX, arrowY, arrowW, "left", systemStroke, p.detail),
    slidingLeafLabel(leftCenter, labelY, "A1", p.detail),
    slidingLeafLabel(rightCenter, labelY, "A2", p.detail),
  ].join("");
}

function drawVentanaAbatible(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const hW = clamp(F * 0.8, 4, 7);
  const hHinge = clamp(h * 0.10, 9, 13);
  const hH = clamp(h * 0.14, 13, 18);
  const gX = x + FI, gY = y + FI;
  const gW = w - FI * 2, gH = h - FI * 2;
  const leafInset = 4;
  const leafEndX = gX + gW - leafInset;
  const leafEndY = gY + gH - leafInset;
  const arcStartX = gX + gW - leafInset;
  const arcStartY = gY + leafInset;
  const arcEndX = gX + leafInset;
  const arcEndY = gY + Math.min(gW, gH) * 0.72;
  const arcR = Math.min(gW * 0.9, gH * 0.9);
  const systemStroke = DT * 1.2;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    glassFill(gX, gY, gW, gH, GW),
    // Bisagras (borde izquierdo)
    hinge(x - hW * 0.3, y + h * 0.20, hW, hHinge, p.detail),
    hinge(x - hW * 0.3, y + h * 0.72, hW, hHinge, p.detail),
    // Manilla (borde derecho)
    lHandle(x + w - FI * 0.85, y + h * 0.50, hH, "left", DT, p.detail),
    // Hoja abierta
    `<line x1="${px(gX + leafInset)}" y1="${px(gY + leafInset)}" x2="${px(leafEndX)}" y2="${px(leafEndY)}" stroke="${p.detail}" stroke-width="${px(systemStroke)}" stroke-linecap="round"/>`,
    // Arco de apertura uniforme
    swingArc(arcStartX, arcStartY, arcR, arcEndX, arcEndY, systemStroke, p.detail),
  ].join("");
}

function drawVentanaProyectante(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const gX = x + FI, gY = y + FI;
  const gW = w - FI * 2, gH = h - FI * 2;
  const hH = clamp(h * 0.12, 12, 17);
  const hingeW = Math.max(8, gW * 0.14);
  const hingeH = Math.max(3.4, D * 1.2);
  const bottomCx = gX + gW / 2;
  const bottomCy = gY + gH - Math.max(10, gH * 0.18);
  const supportTopY = gY + Math.max(8, gH * 0.14);
  const leftTopX = gX + Math.max(10, gW * 0.18);
  const rightTopX = gX + gW - Math.max(10, gW * 0.18);
  const systemStroke = DT * 1.15;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    glassFill(gX, gY, gW, gH, GW),
    // Bisagras superiores
    `<rect x="${px(gX + gW * 0.22 - hingeW / 2)}" y="${px(gY - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="1.1" fill="${p.detail}"/>`,
    `<rect x="${px(gX + gW * 0.78 - hingeW / 2)}" y="${px(gY - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="1.1" fill="${p.detail}"/>`,
    // Guias de apertura hacia afuera
    `<line x1="${px(leftTopX)}" y1="${px(supportTopY)}" x2="${px(bottomCx)}" y2="${px(bottomCy)}" stroke="${p.detail}" stroke-width="${px(systemStroke)}" stroke-dasharray="5,3" stroke-linecap="round"/>`,
    `<line x1="${px(rightTopX)}" y1="${px(supportTopY)}" x2="${px(bottomCx)}" y2="${px(bottomCy)}" stroke="${p.detail}" stroke-width="${px(systemStroke)}" stroke-dasharray="5,3" stroke-linecap="round"/>`,
    `<line x1="${px(bottomCx)}" y1="${px(bottomCy - 18)}" x2="${px(bottomCx)}" y2="${px(bottomCy)}" stroke="${p.detail}" stroke-width="${px(systemStroke)}" stroke-linecap="round"/>`,
    arrowTip(bottomCx, bottomCy, "down", systemStroke, p.detail),
    // Manilla inferior
    lHandle(x + w * 0.5, y + h - FI * 0.9, hH, "right", DT, p.detail),
  ].join("");
}

// ─── Componentes: Puertas ─────────────────────────────────────────────────────

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

// ─── Componente: Paño Fijo ────────────────────────────────────────────────────

function drawPanoFijo(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), GW = gsw(v), FI = fi(v);
  const gX = x + FI, gY = y + FI, gW = w - FI * 2, gH = h - FI * 2;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    glassFill(gX, gY, gW, gH, GW),
    fixedBadge(x + w / 2, y + h / 2, p),
  ].join("");
}

// ─── Componentes: Shower door ─────────────────────────────────────────────────

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

function drawCierreCorredera(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const n = 3;
  const mulW = D * 1.4;
  const paneW = (w - FI * 2 - mulW * (n - 1)) / n;
  const hH = clamp(h * 0.15, 12, 20);
  const arrowY = y + h * 0.62;
  const arrowW = paneW * 0.42;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    // Paneles de vidrio
    ...Array.from({ length: n }, (_, i) => {
      const px2 = x + FI + i * (paneW + mulW);
      return glassFill(px2, y + FI, paneW, h - FI * 2, GW);
    }),
    // Parteluces
    ...Array.from({ length: n - 1 }, (_, i) => {
      const mx = x + FI + (i + 1) * paneW + i * mulW;
      return [
        `<line x1="${px(mx)}" y1="${px(y + FI * 0.5)}" x2="${px(mx)}" y2="${px(y + h - FI * 0.5)}" stroke="${p.frame}" stroke-width="${px(mulW)}" stroke-linecap="square"/>`,
        // Manillas a cada lado del parteluz
        sidePullHandle(mx - Math.max(4, mulW * 0.55), y + h * 0.50, hH),
        sidePullHandle(mx + Math.max(4, mulW * 0.55), y + h * 0.50, hH),
      ].join("");
    }),
    // Riel inferior
    `<line x1="${px(x + FI)}" y1="${px(y + h - FI - D * 0.5)}" x2="${px(x + w - FI)}" y2="${px(y + h - FI - D * 0.5)}" stroke="${p.div}" stroke-width="${D}" stroke-linecap="round"/>`,
    // Flechas (paneles extremos)
    directionArrow(x + FI + paneW * 0.18, arrowY, arrowW, "left", DT * 1.15, p.detail),
    directionArrow(x + w - FI - paneW * 0.18 - arrowW, arrowY, arrowW, "right", DT * 1.15, p.detail),
  ].join("");
}

function drawCierrePlegable(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const n = 4;
  const paneW = (w - FI * 2) / n;
  const pivR = clamp(D * 0.7, 2, 3.5);
  return [
    outerFrame(x, y, w, h, F, p.frame),
    // Paneles de vidrio
    ...Array.from({ length: n }, (_, i) => {
      return glassFill(x + FI + i * paneW, y + FI, paneW, h - FI * 2, GW);
    }),
    // Líneas de pliegue (verticales punteadas con pivotes)
    ...Array.from({ length: n - 1 }, (_, i) => {
      const fX = x + FI + (i + 1) * paneW;
      return [
        `<line x1="${px(fX)}" y1="${px(y + FI)}" x2="${px(fX)}" y2="${px(y + h - FI)}" stroke="${p.div}" stroke-width="${D}" stroke-dasharray="4,3"/>`,
        `<circle cx="${px(fX)}" cy="${px(y + FI + (h - FI * 2) * 0.15)}" r="${pivR}" fill="${p.detail}"/>`,
        `<circle cx="${px(fX)}" cy="${px(y + h - FI - (h - FI * 2) * 0.15)}" r="${pivR}" fill="${p.detail}"/>`,
      ].join("");
    }),
    // Flecha de apertura (plegado hacia un lado)
    directionArrow(x + w * 0.60, y + h * 0.60, w * 0.16, "right", DT * 1.15, p.detail),
  ].join("");
}

function drawCierreFijo(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), GW = gsw(v), FI = fi(v);
  const n = 3;
  const mulW = D * 1.4;
  const paneW = (w - FI * 2 - mulW * (n - 1)) / n;
  return [
    outerFrame(x, y, w, h, F, p.frame),
    ...Array.from({ length: n }, (_, i) => {
      const pX = x + FI + i * (paneW + mulW);
      return glassFill(pX, y + FI, paneW, h - FI * 2, GW);
    }),
    ...Array.from({ length: n - 1 }, (_, i) => {
      const mX = x + FI + (i + 1) * paneW + i * mulW;
      return `<line x1="${px(mX)}" y1="${px(y + FI * 0.5)}" x2="${px(mX)}" y2="${px(y + h - FI * 0.5)}" stroke="${p.frame}" stroke-width="${px(mulW)}" stroke-linecap="square"/>`;
    }),
    fixedBadge(x + w / 2, y + h / 2, p),
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

// ─── Componente: Tapa de mesa ─────────────────────────────────────────────────

function drawMesa(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  // Vista isométrica simplificada: solo plano superior + canto
  // Se mantiene isométrico como excepción funcional — sin rellenos laterales
  const oX = w * 0.20;
  const oY = h * 0.28;
  const tk = clamp(h * 0.16, 8, 14); // grosor del canto
  const topPts = [
    [x + oX, y], [x + w, y],
    [x + w - oX, y + oY], [x, y + oY],
  ].map(([px2, py]) => `${px(px2)},${px(py)}`).join(" ");
  const frontPts = [
    [x, y + oY], [x + w - oX, y + oY],
    [x + w - oX, y + oY + tk], [x, y + oY + tk],
  ].map(([px2, py]) => `${px(px2)},${px(py)}`).join(" ");
  const sidePts = [
    [x + w - oX, y + oY], [x + w, y],
    [x + w, y + tk], [x + w - oX, y + oY + tk],
  ].map(([px2, py]) => `${px(px2)},${px(py)}`).join(" ");
  const F = fw(v), GW = gsw(v);
  return [
    // Cara superior (vidrio)
    `<polygon points="${topPts}" fill="${G_FILL}" stroke="${G_STROKE}" stroke-width="${GW}"/>`,
    // Reflexión
    // Canto frontal (solo contorno, sin relleno = plano)
    `<polygon points="${frontPts}" fill="none" stroke="${p.frame}" stroke-width="${F}"/>`,
    // Canto lateral derecho
    `<polygon points="${sidePts}" fill="none" stroke="${p.div}" stroke-width="${dw(v)}"/>`,
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

function drawVitrina(x: number, y: number, w: number, h: number, v: string, p: Palette): string {
  const F = fw(v), D = dw(v), DT = det(v), GW = gsw(v), FI = fi(v);
  const baseH = clamp(h * 0.14, 10, 18);
  const intFill = h - FI - baseH;
  const hH = clamp(h * 0.12, 11, 17);
  return [
    outerFrame(x, y, w, h, F, p.frame),
    // Vidrio frontal (parte superior)
    glassFill(x + FI, y + FI, w - FI * 2, intFill - FI, GW),
    // Interior de vitrina (zona de exposición)
    `<rect x="${px(x + FI)}" y="${px(y + FI)}" width="${px(w - FI * 2)}" height="${px(intFill - FI)}" fill="rgba(14,14,20,0.18)" stroke="none"/>`,
    // Travesaño inferior / base
    `<line x1="${px(x + FI)}" y1="${px(y + h - FI - baseH)}" x2="${px(x + w - FI)}" y2="${px(y + h - FI - baseH)}" stroke="${p.div}" stroke-width="${D}"/>`,
    // Base sólida
    `<rect x="${px(x + FI)}" y="${px(y + h - FI - baseH)}" width="${px(w - FI * 2)}" height="${px(baseH)}" fill="rgba(28,28,28,0.14)" stroke="${p.div}" stroke-width="0.5"/>`,
    // Manilla centrada
    lHandle(x + w / 2, y + h * 0.45, hH, "right", DT, p.detail),
  ].join("");
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
  x: number, y: number, w: number, h: number,
  v: string,
  p: Palette
): string {
  switch (tipoNorm) {
    case "Ventana":
      if (sistemaNorm === "Abatible")    return drawVentanaAbatible(x, y, w, h, v, p);
      if (sistemaNorm === "Proyectante") return drawVentanaProyectante(x, y, w, h, v, p);
      return drawVentanaCorredera(x, y, w, h, v, p); // Corredera por defecto

    case "Puerta":
      if (sistemaNorm === "Corredera") return drawPuertaCorredera(x, y, w, h, v, p);
      if (sistemaNorm === "Pivotante") return drawPuertaPivotante(x, y, w, h, v, p);
      return drawPuertaAbatible(x, y, w, h, v, p); // Abatible por defecto

    case "PanoFijo":
      return drawPanoFijo(x, y, w, h, v, p);

    case "Shower":
      if (sistemaNorm === "Corredera") return drawShowerCorredera(x, y, w, h, v, p);
      return drawShowerAbatible(x, y, w, h, v, p); // Abatible por defecto

    case "Cierre":
      if (sistemaNorm === "Plegable") return drawCierrePlegable(x, y, w, h, v, p);
      if (sistemaNorm === "Fijo")     return drawCierreFijo(x, y, w, h, v, p);
      return drawCierreCorredera(x, y, w, h, v, p); // Corredera por defecto

    case "Baranda":
      if (sistemaNorm === "PerfilInferior") return drawBarandaPerfilInferior(x, y, w, h, v, p);
      if (sistemaNorm === "Postes")         return drawBarandaPostes(x, y, w, h, v, p);
      return drawBarandaBotones(x, y, w, h, v, p); // Botones por defecto

    case "Espejo":
      if (sistemaNorm === "Marco")  return drawEspejoMarco(x, y, w, h, v, p);
      if (sistemaNorm === "Pegado") return drawEspejoPegado(x, y, w, h, v, p);
      return drawEspejoMuro(x, y, w, h, v, p); // Muro por defecto

    case "Mesa":
      return drawMesa(x, y, w, h, v, p);

    case "Fachada":
      return drawFachada(x, y, w, h, v, p);

    case "MuroCortina":
      return drawMuroCortina(x, y, w, h, v, p);

    case "Vitrina":
      return drawVitrina(x, y, w, h, v, p);

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
    Shower:     { w:  90, h: 175 },
    Cierre:     { w: 210, h: 115 },
    Baranda:    { w: 210, h:  80 },
    Espejo:     { w: 110, h: 155 },
    Mesa:       { w: 185, h:  75 },
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
    Shower:    { maxW: 132, maxH: 214 },
    Cierre:    { maxW: 240, maxH: 148 },
    Baranda:   { maxW: 240, maxH: 118 },
  };

  return map[tipoNorm] ?? { maxW: 200, maxH: 180 };
}

// ─── Etiqueta del tipo ────────────────────────────────────────────────────────

function buildLabel(tipo: string, sistema: string | null | undefined, variant: string): string {
  if (variant === "pdf") return "";
  const sys = sistema ? ` · ${sistema}` : "";
  return `${tipo}${sys}`;
}

// ─── Exportación principal ────────────────────────────────────────────────────

export function generateComponentSVG(params: ComponentSVGParams): string {
  const variant   = params.variant ?? "default";
  const tipoNorm  = normalizeType(params.tipo);
  const sisNorm   = resolveSistema(params);
  const palette   = resolvePalette(params.colorHex);

  const base  = baseSizeFor(tipoNorm);
  const rW    = params.ancho && params.alto ? params.ancho : base.w;
  const rH    = params.ancho && params.alto ? params.alto  : base.h;
  const fitBox = fitBoxFor(tipoNorm);
  const maxW  = params.maxW ?? fitBox.maxW;
  const maxH  = params.maxH ?? fitBox.maxH;
  const scale = Math.min(maxW / rW, maxH / rH, 1.8);
  const drawW = Math.max(68, Math.round(rW * scale));
  const drawH = Math.max(52, Math.round(rH * scale));

  const isMesa  = tipoNorm === "Mesa";
  const dimLeft = isMesa ? 40 : 46;
  const dimBot  = variant === "pdf" ? 24 : 42;
  const topPad  = variant === "pdf" ? 30 : 12;
  const rightPad = 12;

  const totalW  = drawW + dimLeft + rightPad;
  const totalH  = drawH + topPad + dimBot;
  const originX = dimLeft;
  const originY = topPad;

  const drawing = routeDrawing(tipoNorm, sisNorm, originX, originY, drawW, drawH, variant, palette);

  let dimensions: string;
  if (isMesa) {
    dimensions = dimV(
      originX - 22,
      originY + drawH * 0.28,
      Math.max(14, drawH * 0.16),
      formatMm(params.alto ?? 10),
      palette, variant
    );
  } else {
    const dimY = variant === "pdf" ? originY - 14 : originY + drawH + 18;
    dimensions = [
      dimH(originX, dimY, drawW, formatMm(params.ancho), palette, variant),
      dimV(originX - 20, originY, drawH, formatMm(params.alto), palette, variant),
    ].join("");
  }

  const label = buildLabel(params.tipo, params.sistema, variant);
  const labelEl = label
    ? `<text x="${px(originX + drawW / 2)}" y="${px(totalH - 8)}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="${palette.label}" font-weight="500">${escapeXml(label)}</text>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" aria-hidden="true" role="img">`,
    "<g>",
    drawing,
    dimensions,
    labelEl,
    "</g>",
    "</svg>",
  ].join("");
}
