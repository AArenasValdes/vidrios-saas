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
  hojasBase?: 1 | 2 | 3 | 4 | null;
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

type WindowLeafCount = 1 | 2 | 3 | 4;

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
  if (s.includes("oscilo")) return "Oscilobatiente";
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

  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) {
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

  if (source.includes("todas moviles") || source.includes(`${hojas} moviles`)) {
    return new Set<number>();
  }

  if (hojas === 2 && source.includes("fija")) {
    return new Set<number>([0]);
  }

  if (hojas === 3) {
    if (source.includes("central") || source.includes("medio")) {
      return new Set<number>([1]);
    }

    if (source.includes("lateral")) {
      return new Set<number>([0]);
    }
  }

  if (hojas === 4 && (source.includes("laterales") || source.includes("2 fijas"))) {
    return new Set<number>([0, 3]);
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
  const fs = v === "pdf" ? 12 : 10;
  const fw2 = v === "pdf" ? "700" : "400";
  const textY = v === "pdf" ? y - 10 : y - 8;
  const textColor = v === "pdf" ? "#616b78" : p.dimTxt;
  return [
    `<line x1="${px(x)}" y1="${px(y)}" x2="${px(x + w)}" y2="${px(y)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x)}" y1="${px(y - tk)}" x2="${px(x)}" y2="${px(y + tk)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x + w)}" y1="${px(y - tk)}" x2="${px(x + w)}" y2="${px(y + tk)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    v !== "pdf" ? arrowTip(x, y, "left", 1, p.dim) : "",
    v !== "pdf" ? arrowTip(x + w, y, "right", 1, p.dim) : "",
    `<text x="${px(x + w / 2)}" y="${px(textY)}" text-anchor="middle" font-size="${fs}" font-family="sans-serif" fill="${textColor}" font-weight="${fw2}">${escapeXml(text)}</text>`,
  ].join("");
}

function dimV(x: number, y: number, h: number, text: string, p: Palette, v: string): string {
  const tk = v === "pdf" ? 2.4 : 6;
  const sw = v === "pdf" ? 0.8 : 1;
  const fs = v === "pdf" ? 12 : 10;
  const fw2 = v === "pdf" ? "700" : "400";
  const textX = v === "pdf" ? x - 15 : x - 11;
  const textColor = v === "pdf" ? "#616b78" : p.dimTxt;
  return [
    `<line x1="${px(x)}" y1="${px(y)}" x2="${px(x)}" y2="${px(y + h)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x - tk)}" y1="${px(y)}" x2="${px(x + tk)}" y2="${px(y)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    `<line x1="${px(x - tk)}" y1="${px(y + h)}" x2="${px(x + tk)}" y2="${px(y + h)}" stroke="${p.dim}" stroke-width="${sw}"/>`,
    v !== "pdf" ? arrowTip(x, y, "up", 1, p.dim) : "",
    v !== "pdf" ? arrowTip(x, y + h, "down", 1, p.dim) : "",
    `<text x="${px(textX)}" y="${px(y + h / 2)}" text-anchor="middle" font-size="${fs}" font-family="sans-serif" fill="${textColor}" font-weight="${fw2}" transform="rotate(-90 ${px(textX)} ${px(y + h / 2)})">${escapeXml(text)}</text>`,
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

function buildWindowPanes(
  x: number,
  y: number,
  w: number,
  h: number,
  v: string,
  hojas: WindowLeafCount,
  p: Palette
) {
  const F = fw(v);
  const D = dw(v);
  const GW = gsw(v);
  const FI = fi(v);
  const glassY = y + FI;
  const glassH = h - FI * 2;

  if (hojas === 1) {
    const pane = {
      x: x + FI,
      y: glassY,
      w: w - FI * 2,
      h: glassH,
    };

    return {
      outer: outerFrame(x, y, w, h, F, p.frame),
      divider: "",
      panes: [
        {
          ...pane,
          centerX: pane.x + pane.w / 2,
          centerY: pane.y + pane.h / 2,
        },
      ] satisfies WindowPane[],
      glass: glassFill(pane.x, pane.y, pane.w, pane.h, GW),
      railY: y + h - FI - D * 0.5,
      handleInset: Math.max(5, F * 1.1),
    };
  }

  const dividerW = Math.max(3.2, D * 1.55);
  const paneW = (w - FI * 2 - dividerW * (hojas - 1)) / hojas;
  const panes = Array.from({ length: hojas }, (_, index) => {
    const pane = {
      x: x + FI + index * (paneW + dividerW),
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

      return `<line x1="${px(dividerX)}" y1="${px(y + FI * 0.5)}" x2="${px(dividerX)}" y2="${px(y + h - FI * 0.5)}" stroke="${p.frame}" stroke-width="${px(dividerW)}" stroke-linecap="square"/>`;
    })
    .join("");

  return {
    outer: outerFrame(x, y, w, h, F, p.frame),
    divider,
    panes,
    glass: panes.map((pane) => glassFill(pane.x, pane.y, pane.w, pane.h, GW)).join(""),
    railY: y + h - FI - D * 0.5,
    handleInset: Math.max(5, F * 1.1),
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
  const D = dw(v);
  const DT = det(v);
  const { outer, divider, panes, glass, railY, handleInset } = buildWindowPanes(
    x,
    y,
    w,
    h,
    v,
    hojas,
    p
  );
  const arrowStroke = DT * 1.15;
  const rail = `<line x1="${px(panes[0].x)}" y1="${px(railY)}" x2="${px(panes[panes.length - 1].x + panes[panes.length - 1].w)}" y2="${px(railY)}" stroke="${p.div}" stroke-width="${px(D * 1.05)}" stroke-linecap="round"/>`;

  if (hojas === 1) {
    const pane = panes[0];
    const arrowW = Math.max(30, pane.w * 0.42);

    return [
      outer,
      glass,
      rail,
      sidePullHandle(pane.x + pane.w - handleInset, pane.centerY, clamp(h * 0.15, 15, 20)),
      directionArrow(
        pane.centerX - arrowW / 2,
        pane.centerY,
        arrowW,
        "left",
        arrowStroke,
        p.detail
      ),
    ].join("");
  }

  const arrowW = clamp(panes[0].w * 0.46, 16, 38);
  const mobileDetails = panes
    .map((pane, index) => {
      if (fixedPaneIndexes.has(index)) {
        const markerInset = Math.max(6, Math.min(10, pane.w * 0.15));

        return [
          `<line x1="${px(pane.x + markerInset)}" y1="${px(pane.y + markerInset)}" x2="${px(pane.x + pane.w - markerInset)}" y2="${px(pane.y + pane.h - markerInset)}" stroke="${p.div}" stroke-width="${px(DT * 0.8)}" stroke-linecap="round" opacity="0.58"/>`,
          `<line x1="${px(pane.x + pane.w - markerInset)}" y1="${px(pane.y + markerInset)}" x2="${px(pane.x + markerInset)}" y2="${px(pane.y + pane.h - markerInset)}" stroke="${p.div}" stroke-width="${px(DT * 0.8)}" stroke-linecap="round" opacity="0.58"/>`,
        ].join("");
      }

      const handleX =
        index % 2 === 0 ? pane.x + pane.w - handleInset : pane.x + handleInset;
      const direction = index % 2 === 0 ? "right" : "left";

      return [
        sidePullHandle(handleX, pane.centerY, clamp(h * 0.15, 13, 20)),
        directionArrow(
          pane.centerX - arrowW / 2,
          pane.centerY,
          arrowW,
          direction,
          arrowStroke,
          p.detail
        ),
      ].join("");
    })
    .join("");

  return [
    outer,
    glass,
    divider,
    rail,
    mobileDetails,
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
  const F = fw(v);
  const DT = det(v);
  const { outer, divider, panes, glass } = buildWindowPanes(x, y, w, h, v, hojas, p);
  const hingeW = clamp(F * 0.8, 4, 7);
  const hingeH = clamp(h * 0.1, 9, 13);
  const handleH = clamp(h * 0.14, 13, 18);
  const leafInset = 5;
  const stroke = DT * 1.2;

  if (hojas === 1) {
    const pane = panes[0];
    const arcRadius = Math.min(pane.w * 0.9, pane.h * 0.9);

    return [
      outer,
      glass,
      hinge(x - hingeW * 0.3, y + h * 0.22, hingeW, hingeH, p.detail),
      hinge(x - hingeW * 0.3, y + h * 0.74, hingeW, hingeH, p.detail),
      lHandle(x + w - fi(v) * 0.85, y + h * 0.5, handleH, "left", DT, p.detail),
      `<line x1="${px(pane.x + leafInset)}" y1="${px(pane.y + leafInset)}" x2="${px(pane.x + pane.w - leafInset)}" y2="${px(pane.y + pane.h - leafInset)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-linecap="round"/>`,
      swingArc(
        pane.x + pane.w - leafInset,
        pane.y + leafInset,
        arcRadius,
        pane.x + leafInset,
        pane.y + pane.h * 0.56,
        stroke,
        p.detail
      ),
    ].join("");
  }

  const leftPane = panes[0];
  const rightPane = panes[1];
  const arcRadius = Math.min(leftPane.w * 0.85, leftPane.h * 0.82);

  return [
    outer,
    glass,
    divider,
    hinge(x - hingeW * 0.3, y + h * 0.22, hingeW, hingeH, p.detail),
    hinge(x - hingeW * 0.3, y + h * 0.74, hingeW, hingeH, p.detail),
    hinge(x + w - hingeW * 0.7, y + h * 0.22, hingeW, hingeH, p.detail),
    hinge(x + w - hingeW * 0.7, y + h * 0.74, hingeW, hingeH, p.detail),
    lHandle(leftPane.x + leftPane.w - Math.max(4.5, F * 0.8), leftPane.centerY, handleH, "left", DT, p.detail),
    lHandle(rightPane.x + Math.max(4.5, F * 0.8), rightPane.centerY, handleH, "right", DT, p.detail),
    `<line x1="${px(leftPane.x + leafInset)}" y1="${px(leftPane.y + leafInset)}" x2="${px(leftPane.x + leftPane.w - leafInset)}" y2="${px(leftPane.y + leftPane.h - leafInset)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-linecap="round"/>`,
    `<line x1="${px(rightPane.x + rightPane.w - leafInset)}" y1="${px(rightPane.y + leafInset)}" x2="${px(rightPane.x + leafInset)}" y2="${px(rightPane.y + rightPane.h - leafInset)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-linecap="round"/>`,
    swingArc(
      leftPane.x + leftPane.w - leafInset,
      leftPane.y + leafInset,
      arcRadius,
      leftPane.x + leafInset,
      leftPane.y + leftPane.h * 0.54,
      stroke,
      p.detail
    ),
    swingArc(
      rightPane.x + leafInset,
      rightPane.y + leafInset,
      arcRadius,
      rightPane.x + rightPane.w - leafInset,
      rightPane.y + rightPane.h * 0.54,
      stroke,
      p.detail
    ),
  ].join("");
}

function drawProyectanteGuides(pane: WindowPane, stroke: number, p: Palette) {
  const topY = pane.y + Math.max(8, pane.h * 0.14);
  const bottomY = pane.y + pane.h - Math.max(10, pane.h * 0.18);
  const topLeftX = pane.x + Math.max(9, pane.w * 0.2);
  const topRightX = pane.x + pane.w - Math.max(9, pane.w * 0.2);

  return [
    `<line x1="${px(topLeftX)}" y1="${px(topY)}" x2="${px(pane.centerX)}" y2="${px(bottomY)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-dasharray="5,3" stroke-linecap="round"/>`,
    `<line x1="${px(topRightX)}" y1="${px(topY)}" x2="${px(pane.centerX)}" y2="${px(bottomY)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-dasharray="5,3" stroke-linecap="round"/>`,
    `<line x1="${px(pane.centerX)}" y1="${px(bottomY - 16)}" x2="${px(pane.centerX)}" y2="${px(bottomY)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-linecap="round"/>`,
    arrowTip(pane.centerX, bottomY, "down", stroke, p.detail),
  ].join("");
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
  const D = dw(v);
  const DT = det(v);
  const { outer, divider, panes, glass } = buildWindowPanes(x, y, w, h, v, hojas, p);
  const handleH = clamp(h * 0.12, 12, 17);
  const stroke = DT * 1.1;
  const hinges = panes
    .map((pane) => {
      const hingeW = Math.max(8, pane.w * 0.18);
      const hingeH = Math.max(3.4, D * 1.2);

      return [
        `<rect x="${px(pane.x + pane.w * 0.26 - hingeW / 2)}" y="${px(pane.y - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="1.1" fill="${p.detail}"/>`,
        `<rect x="${px(pane.x + pane.w * 0.74 - hingeW / 2)}" y="${px(pane.y - hingeH * 0.3)}" width="${px(hingeW)}" height="${px(hingeH)}" rx="1.1" fill="${p.detail}"/>`,
      ].join("");
    })
    .join("");
  const guides = panes.map((pane) => drawProyectanteGuides(pane, stroke, p)).join("");
  const handles =
    hojas === 1
      ? lHandle(x + w * 0.5, y + h - fi(v) * 0.9, handleH, "right", DT, p.detail)
      : panes
          .map((pane) =>
            lHandle(pane.centerX, y + h - fi(v) * 0.9, handleH, "right", DT, p.detail)
          )
          .join("");

  return [outer, glass, divider, hinges, guides, handles].join("");
}

function drawTiltMarker(pane: WindowPane, stroke: number, p: Palette) {
  const topY = pane.y + Math.max(14, pane.h * 0.2);
  const arrowY = pane.y + Math.max(28, pane.h * 0.34);
  const leftX = pane.x + Math.max(10, pane.w * 0.22);
  const rightX = pane.x + pane.w - Math.max(10, pane.w * 0.22);

  return [
    `<line x1="${px(leftX)}" y1="${px(pane.y + pane.h - Math.max(12, pane.h * 0.14))}" x2="${px(pane.centerX)}" y2="${px(topY)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-dasharray="5,3" stroke-linecap="round"/>`,
    `<line x1="${px(rightX)}" y1="${px(pane.y + pane.h - Math.max(12, pane.h * 0.14))}" x2="${px(pane.centerX)}" y2="${px(topY)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-dasharray="5,3" stroke-linecap="round"/>`,
    `<line x1="${px(pane.centerX)}" y1="${px(pane.y + 6)}" x2="${px(pane.centerX)}" y2="${px(arrowY)}" stroke="${p.detail}" stroke-width="${px(stroke)}" stroke-linecap="round"/>`,
    arrowTip(pane.centerX, arrowY, "down", stroke, p.detail),
  ].join("");
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
  const DT = det(v);
  const { outer, divider, panes, glass } = buildWindowPanes(x, y, w, h, v, hojas, p);
  const stroke = DT * 1.1;
  const abatibleLayer = drawVentanaAbatible(x, y, w, h, v, p, hojas)
    .replace(outer, "")
    .replace(glass, "")
    .replace(divider, "");
  const tiltMarkers = panes.map((pane) => drawTiltMarker(pane, stroke, p)).join("");

  return [outer, glass, divider, abatibleLayer, tiltMarkers].join("");
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
  hojasBase: WindowLeafCount | null,
  fixedSlidingPaneIndexes: Set<number>,
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
      if (sistemaNorm === "Oscilobatiente") return drawVentanaOscilobatiente(x, y, w, h, v, p, binaryLeafCount);
      if (sistemaNorm === "Abatible")    return drawVentanaAbatible(x, y, w, h, v, p, binaryLeafCount);
      if (sistemaNorm === "Proyectante") return drawVentanaProyectante(x, y, w, h, v, p, binaryLeafCount);
      return drawVentanaCorredera(x, y, w, h, v, p, hojasBase ?? 2, fixedSlidingPaneIndexes); // Corredera por defecto

    case "Puerta":
      return drawPuertaComposite(x, y, w, h, v, p, sistemaNorm, doorConfig, palilloEnabled, palilloType);

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

export function generateComponentSVG(params: ComponentSVGParams): string {
  const variant   = params.variant ?? "default";
  const tipoNorm  = normalizeType(params.tipo);
  const sisNorm   = resolveSistema(params);
  const hojasBase = resolveWindowLeafCount(params, sisNorm);
  const fixedSlidingPaneIndexes = resolveFixedSlidingPaneIndexes(params, hojasBase);
  const palette   = resolvePalette(params.colorHex);

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
  const drawW = Math.max(isMesaCircular ? 52 : 68, Math.round(rW * scale));
  const drawH = Math.max(isMesaCircular ? 52 : 52, Math.round(rH * scale));
  const dimLeft = variant === "pdf" ? 52 : 46;
  const dimBot  = variant === "pdf" ? 8 : 42;
  const topPad  = variant === "pdf" ? 34 : 12;
  const rightPad = variant === "pdf" ? 6 : 12;

  const totalW  = drawW + dimLeft + rightPad;
  const totalH  = drawH + topPad + dimBot;
  const originX = dimLeft;
  const originY = topPad;

  const drawing = routeDrawing(
    tipoNorm,
    sisNorm,
    hojasBase,
    fixedSlidingPaneIndexes,
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

  const dimY = variant === "pdf" ? originY - 8 : originY + drawH + 18;
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
          originX - (variant === "pdf" ? 22 : 20),
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
// ─── Nuevo sistema de dibujo de puertas (v2) ─────────────────────────────────
// Este bloque se anexa al final de window-drawings.ts

const PD = {
  m: 10,
  sw: 3.2,
  fw: 2.4,
};

function pdFrame(x: number, y: number, w: number, h: number, sw: number, color: string): string {
  const innerOffset = sw * 0.55;
  return [
    `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" rx="2" fill="none" stroke="${color}" stroke-width="${sw}"/>`,
    `<rect x="${px(x + innerOffset)}" y="${px(y + innerOffset)}" width="${px(w - innerOffset * 2)}" height="${px(h - innerOffset * 2)}" rx="1.5" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.55"/>`,
  ].join("\n");
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
  const lines: string[] = [];
  switch (palilloType) {
    case "1 vertical":
      lines.push(pdDiv(x + w / 2, y, x + w / 2, y + h, frameColor, 0.8));
      break;
    case "1 horizontal":
      lines.push(pdDiv(x, y + h / 2, x + w, y + h / 2, frameColor, 0.8));
      break;
    case "Cruzado":
      lines.push(pdDiv(x + w / 2, y, x + w / 2, y + h, frameColor, 0.8));
      lines.push(pdDiv(x, y + h / 2, x + w, y + h / 2, frameColor, 0.8));
      break;
    case "Cuadricula / colonial": {
      const cols = 2, rows = 3;
      for (let c = 1; c < cols + 1; c++) {
        const px2 = x + (w / (cols + 1)) * c;
        lines.push(pdDiv(px2, y, px2, y + h, frameColor, 0.7));
      }
      for (let r = 1; r < rows + 1; r++) {
        const py = y + (h / (rows + 1)) * r;
        lines.push(pdDiv(x, py, x + w, py, frameColor, 0.7));
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
  "1 hoja + fijo lateral": "1_hoja_fijo_lateral",
  "2 hojas + fijo lateral": "2_hojas_fijo_lateral",
  "2 hojas + 2 fijos laterales": "2_hojas_fijo_lateral",
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
