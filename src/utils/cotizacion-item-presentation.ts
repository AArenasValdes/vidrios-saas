import { normalizePricingMode, type PricingMode } from "@/types/pricing-mode";
import {
  parseGuidedVisualConfig,
  serializeGuidedVisualConfig,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

export type ComponentMaterial = "Aluminio" | "PVC" | "Cristal";
export type CotizacionItemCatalogCategoria = "aluminio" | "pvc" | "vidrio" | "otros";
export type CotizacionItemPriceOrigin = "margen" | "plantilla" | "manual";
export type CotizacionItemFreeValueIvaMode = "total_incluye_iva" | "neto_mas_iva";
export type CotizacionItemDisplayMode = "componente" | "item_libre";
export type CotizacionMirrorFormat = "single" | "divided";
export type CotizacionMirrorPaneDirection = "vertical" | "horizontal";
export type CotizacionMirrorInteriorLine = "fine" | "marked";

export type CotizacionItemPresentationMeta = {
  colorHex: string;
  material: ComponentMaterial;
  catalogCategoria: CotizacionItemCatalogCategoria;
  catalogEspesor: string;
  catalogTerminacion: string;
  referencia: string;
  sistema: string;
  configuracion: string;
  hojasBase: 1 | 2 | null;
  sheetScheme: string;
  sheetVariant: string;
  customSchemeDescription: string;
  isCustomScheme: boolean;
  pricingMode: PricingMode;
  lineTemplateId: string;
  precioPorM2: number | null;
  minimoCobrable: number | null;
  redondeoPrecio: number | null;
  precioPlantillaSugerido: number | null;
  precioAjustadoManual: boolean;
  origenPrecio: CotizacionItemPriceOrigin;
  ivaMode: CotizacionItemFreeValueIvaMode | null;
  totalClienteVisible: number | null;
  netoCalculado: number | null;
  ivaCalculado: number | null;
  displayMode: CotizacionItemDisplayMode;
  palilloEnabled: boolean;
  palilloType: string;
  encodedMargenPct: number | null;
  encodedCostInputScope: string;
  mirrorFormat: CotizacionMirrorFormat;
  mirrorPaneCount: number | null;
  mirrorPaneDirection: CotizacionMirrorPaneDirection;
  mirrorInteriorLine: CotizacionMirrorInteriorLine;
  guidedVisualConfig: GuidedVisualConfig | null;
  raw: string;
};

type SheetSchemeInput = Pick<
  CotizacionItemPresentationMeta,
  "sheetScheme" | "sheetVariant" | "customSchemeDescription" | "isCustomScheme"
>;

const DEFAULT_COLOR_BY_MATERIAL: Record<ComponentMaterial, string> = {
  Aluminio: "#a8a8a8",
  PVC: "#f0eeeb",
  Cristal: "#dbeafe",
};

const LEGACY_COLOR_HEX = "#b87333";
const WOOD_COLOR = "#8b5e3c";

function normalizeMaterial(value: string | null | undefined): ComponentMaterial {
  if (value === "Cristal") {
    return "Cristal";
  }

  return value === "PVC" ? "PVC" : "Aluminio";
}

function normalizeCatalogCategoria(
  value: string | null | undefined,
  material: ComponentMaterial
): CotizacionItemCatalogCategoria {
  if (value === "vidrio" || material === "Cristal") return "vidrio";
  if (value === "pvc" || material === "PVC") return "pvc";
  if (value === "aluminio" || material === "Aluminio") return "aluminio";
  return "otros";
}

function normalizeColor(colorHex: string | null | undefined, material: ComponentMaterial) {
  if (typeof colorHex === "string" && /^#[0-9a-fA-F]{3,8}$/.test(colorHex.trim())) {
    const normalized = colorHex.trim().toLowerCase();

    if (normalized === LEGACY_COLOR_HEX) {
      return WOOD_COLOR;
    }

    return normalized;
  }

  return DEFAULT_COLOR_BY_MATERIAL[material];
}

function parseOptionalNumber(value: string | null | undefined) {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePriceOrigin(
  value: string | null | undefined,
  pricingMode: PricingMode
): CotizacionItemPriceOrigin {
  if (value === "plantilla" || value === "manual") {
    return value;
  }

  return pricingMode === "precio_directo" ? "manual" : "margen";
}

function normalizeLeafCount(value: number | string | null | undefined): 1 | 2 | null {
  if (value === 1 || value === "1") {
    return 1;
  }

  if (value === 2 || value === "2") {
    return 2;
  }

  return null;
}

function normalizeFreeValueIvaMode(
  value: string | null | undefined
): CotizacionItemFreeValueIvaMode | null {
  if (value === "total_incluye_iva" || value === "neto_mas_iva") {
    return value;
  }

  return null;
}

function normalizeDisplayMode(value: string | null | undefined): CotizacionItemDisplayMode {
  return value === "item_libre" ? "item_libre" : "componente";
}

function normalizeMirrorFormat(value: string | null | undefined): CotizacionMirrorFormat {
  return value === "divided" ? "divided" : "single";
}

function normalizeMirrorPaneCount(value: number | string | null | undefined): number | null {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 2) {
    return null;
  }

  return Math.round(parsed);
}

function normalizeMirrorPaneDirection(
  value: string | null | undefined
): CotizacionMirrorPaneDirection {
  return value === "horizontal" ? "horizontal" : "vertical";
}

function normalizeMirrorInteriorLine(
  value: string | null | undefined
): CotizacionMirrorInteriorLine {
  return value === "marked" ? "marked" : "fine";
}

export function encodeCotizacionItemPresentationMeta(input: {
  colorHex: string;
  material: ComponentMaterial;
  catalogCategoria?: CotizacionItemCatalogCategoria;
  catalogEspesor?: string | null;
  catalogTerminacion?: string | null;
  referencia?: string;
  sistema?: string;
  configuracion?: string;
  hojasBase?: 1 | 2 | null;
  sheetScheme?: string;
  sheetVariant?: string;
  customSchemeDescription?: string;
  isCustomScheme?: boolean;
  pricingMode?: PricingMode;
  lineTemplateId?: string;
  precioPorM2?: number | null;
  minimoCobrable?: number | null;
  redondeoPrecio?: number | null;
  precioPlantillaSugerido?: number | null;
  precioAjustadoManual?: boolean;
  origenPrecio?: CotizacionItemPriceOrigin;
  ivaMode?: CotizacionItemFreeValueIvaMode | null;
  totalClienteVisible?: number | null;
  netoCalculado?: number | null;
  ivaCalculado?: number | null;
  displayMode?: CotizacionItemDisplayMode;
  palilloEnabled?: boolean;
  palilloType?: string;
  margenPct?: number | null;
  costInputScope?: string;
  mirrorFormat?: CotizacionMirrorFormat;
  mirrorPaneCount?: number | null;
  mirrorPaneDirection?: CotizacionMirrorPaneDirection;
  mirrorInteriorLine?: CotizacionMirrorInteriorLine;
  guidedVisualConfig?: GuidedVisualConfig | null;
  raw?: string;
}) {
  const material = normalizeMaterial(input.material);
  const catalogCategoria = normalizeCatalogCategoria(input.catalogCategoria, material);
  const colorHex = normalizeColor(input.colorHex, material);
  const catalogEspesor = (input.catalogEspesor ?? "").trim().replace(/\]/g, "").slice(0, 40);
  const catalogTerminacion = (input.catalogTerminacion ?? "")
    .trim()
    .replace(/\]/g, "")
    .slice(0, 160);
  const referencia = (input.referencia ?? "").trim().replace(/\]/g, "");
  const sistema = (input.sistema ?? "").trim().replace(/\]/g, "");
  const configuracion = (input.configuracion ?? "").trim().replace(/\]/g, "");
  const hojasBase = normalizeLeafCount(input.hojasBase);
  const sheetScheme = (input.sheetScheme ?? "").trim().replace(/\]/g, "");
  const sheetVariant = (input.sheetVariant ?? "").trim().replace(/\]/g, "");
  const customSchemeDescription = (input.customSchemeDescription ?? "")
    .trim()
    .replace(/\]/g, "");
  const isCustomScheme = input.isCustomScheme ? "1" : "0";
  const pricingMode = normalizePricingMode(input.pricingMode);
  const lineTemplateId = (input.lineTemplateId ?? "").trim().replace(/\]/g, "");
  const precioPorM2 =
    input.precioPorM2 !== null && input.precioPorM2 !== undefined
      ? String(Math.round(input.precioPorM2))
      : "";
  const minimoCobrable =
    input.minimoCobrable !== null && input.minimoCobrable !== undefined
      ? String(Math.round(input.minimoCobrable))
      : "";
  const redondeoPrecio =
    input.redondeoPrecio !== null && input.redondeoPrecio !== undefined
      ? String(Math.round(input.redondeoPrecio))
      : "";
  const precioPlantillaSugerido =
    input.precioPlantillaSugerido !== null && input.precioPlantillaSugerido !== undefined
      ? String(Math.round(input.precioPlantillaSugerido))
      : "";
  const precioAjustadoManual = input.precioAjustadoManual ? "1" : "0";
  const origenPrecio = input.origenPrecio ?? (pricingMode === "precio_directo" ? "manual" : "margen");
  const ivaMode = input.ivaMode ?? "";
  const totalClienteVisible =
    input.totalClienteVisible !== null && input.totalClienteVisible !== undefined
      ? String(Math.round(input.totalClienteVisible))
      : "";
  const netoCalculado =
    input.netoCalculado !== null && input.netoCalculado !== undefined
      ? String(Math.round(input.netoCalculado))
      : "";
  const ivaCalculado =
    input.ivaCalculado !== null && input.ivaCalculado !== undefined
      ? String(Math.round(input.ivaCalculado))
      : "";
  const displayMode = input.displayMode ?? "componente";
  const palilloEnabled = input.palilloEnabled ? "1" : "0";
  const palilloType = (input.palilloType ?? "").trim().replace(/\]/g, "");
  const margenPct =
    input.margenPct !== null && input.margenPct !== undefined
      ? String(Math.round(input.margenPct))
      : "";
  const costInputScope = (input.costInputScope ?? "").trim().replace(/\]/g, "");
  const mirrorFormat = normalizeMirrorFormat(input.mirrorFormat);
  const mirrorPaneCount =
    mirrorFormat === "divided" ? normalizeMirrorPaneCount(input.mirrorPaneCount) : null;
  const mirrorPaneDirection = normalizeMirrorPaneDirection(input.mirrorPaneDirection);
  const mirrorInteriorLine = normalizeMirrorInteriorLine(input.mirrorInteriorLine);
  const guidedVisualConfig = input.guidedVisualConfig
    ? serializeGuidedVisualConfig(input.guidedVisualConfig).replace(/\]/g, "")
    : "";
  const raw = (input.raw ?? "").trim();
  const meta =
    `[c:${colorHex}]` +
    `[r:${referencia}]` +
    `[sys:${sistema}]` +
    `[cfg:${configuracion}]` +
    `[hb:${hojasBase ?? ""}]` +
    `[ss:${sheetScheme}]` +
    `[sv:${sheetVariant}]` +
    `[sc:${customSchemeDescription}]` +
    `[isc:${isCustomScheme}]` +
    `[m:${material}]` +
    `[cat:${catalogCategoria}]` +
    `[ce:${catalogEspesor}]` +
    `[ct:${catalogTerminacion}]` +
    `[pm:${pricingMode}]` +
    `[lti:${lineTemplateId}]` +
    `[pm2:${precioPorM2}]` +
    `[min:${minimoCobrable}]` +
    `[rnd:${redondeoPrecio}]` +
    `[psu:${precioPlantillaSugerido}]` +
    `[man:${precioAjustadoManual}]` +
    `[po:${origenPrecio}]` +
    `[ivm:${ivaMode}]` +
    `[tcv:${totalClienteVisible}]` +
    `[net:${netoCalculado}]` +
    `[iva:${ivaCalculado}]` +
    `[dm:${displayMode}]` +
    `[pe:${palilloEnabled}]` +
    `[pt:${palilloType}]` +
    `[mp:${margenPct}]` +
    `[csi:${costInputScope}]` +
    `[mf:${mirrorFormat}]` +
    `[mpc:${mirrorPaneCount ?? ""}]` +
    `[mpd:${mirrorPaneDirection}]` +
    `[mil:${mirrorInteriorLine}]` +
    `[gvc:${guidedVisualConfig}]`;

  return raw ? `${meta} ${raw}` : meta;
}

/**
 * Prioriza `config_json` formal sobre el bridge `[gvc:]` al leer.
 * Solo reescribe metadata en memoria; no persiste.
 */
export function mergeFormalGuidedVisualConfigIntoObservaciones(
  observaciones: string | null | undefined,
  formalConfig: GuidedVisualConfig | null | undefined
): string {
  if (!formalConfig) {
    return observaciones ?? "";
  }

  const meta = decodeCotizacionItemPresentationMeta(observaciones);

  return encodeCotizacionItemPresentationMeta({
    ...meta,
    guidedVisualConfig: formalConfig,
    raw: meta.raw,
  });
}

export function decodeCotizacionItemPresentationMeta(
  observaciones: string | null | undefined
): CotizacionItemPresentationMeta {
  const source = observaciones ?? "";
  const material = normalizeMaterial(source.match(/\[m:([^\]]*)\]/)?.[1]);
  const catalogCategoria = normalizeCatalogCategoria(
    source.match(/\[cat:([^\]]*)\]/)?.[1],
    material
  );
  const colorHex = normalizeColor(source.match(/\[c:(#[0-9a-fA-F]{3,8})\]/)?.[1], material);
  const catalogEspesor = source.match(/\[ce:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const catalogTerminacion = source.match(/\[ct:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const sistema = source.match(/\[sys:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const configuracion = source.match(/\[cfg:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const hojasBase = normalizeLeafCount(source.match(/\[hb:([^\]]*)\]/)?.[1]);
  const sheetScheme = source.match(/\[ss:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const sheetVariant = source.match(/\[sv:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const customSchemeDescription = source.match(/\[sc:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const isCustomScheme = source.match(/\[isc:(1|0)\]/)?.[1] === "1";
  const pricingMode = normalizePricingMode(source.match(/\[pm:([^\]]*)\]/)?.[1]);
  const lineTemplateId = source.match(/\[lti:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const precioPorM2 = parseOptionalNumber(source.match(/\[pm2:([^\]]*)\]/)?.[1]);
  const minimoCobrable = parseOptionalNumber(source.match(/\[min:([^\]]*)\]/)?.[1]);
  const redondeoPrecio = parseOptionalNumber(source.match(/\[rnd:([^\]]*)\]/)?.[1]);
  const precioPlantillaSugerido = parseOptionalNumber(
    source.match(/\[psu:([^\]]*)\]/)?.[1]
  );
  const precioAjustadoManual = source.match(/\[man:(1|0)\]/)?.[1] === "1";
  const origenPrecio = normalizePriceOrigin(source.match(/\[po:([^\]]*)\]/)?.[1], pricingMode);
  const ivaMode = normalizeFreeValueIvaMode(source.match(/\[ivm:([^\]]*)\]/)?.[1]);
  const totalClienteVisible = parseOptionalNumber(source.match(/\[tcv:([^\]]*)\]/)?.[1]);
  const netoCalculado = parseOptionalNumber(source.match(/\[net:([^\]]*)\]/)?.[1]);
  const ivaCalculado = parseOptionalNumber(source.match(/\[iva:([^\]]*)\]/)?.[1]);
  const displayMode = normalizeDisplayMode(source.match(/\[dm:([^\]]*)\]/)?.[1]);
  const palilloEnabled = source.match(/\[pe:(1|0)\]/)?.[1] === "1";
  const palilloType = source.match(/\[pt:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const encodedMargenPct = parseOptionalNumber(source.match(/\[mp:([^\]]*)\]/)?.[1]);
  const encodedCostInputScope = source.match(/\[csi:([^\]]*)\]/)?.[1]?.trim() ?? "";
  const mirrorFormat = normalizeMirrorFormat(source.match(/\[mf:([^\]]*)\]/)?.[1]);
  const mirrorPaneCount = normalizeMirrorPaneCount(source.match(/\[mpc:([^\]]*)\]/)?.[1]);
  const mirrorPaneDirection = normalizeMirrorPaneDirection(
    source.match(/\[mpd:([^\]]*)\]/)?.[1]
  );
  const mirrorInteriorLine = normalizeMirrorInteriorLine(
    source.match(/\[mil:([^\]]*)\]/)?.[1]
  );
  const guidedVisualConfig = parseGuidedVisualConfig(
    source.match(/\[gvc:([^\]]*)\]/)?.[1]
  );
  const referencia =
    source.match(/\[r:([^\]]*)\]/)?.[1]?.trim() ??
    source.match(/\[l:([^\]]*)\]/)?.[1]?.trim() ??
    "";
  const raw = source
    .replace(/\[c:[^\]]*\]/g, "")
    .replace(/\[(?:r|l):[^\]]*\]/g, "")
    .replace(/\[sys:[^\]]*\]/g, "")
    .replace(/\[cfg:[^\]]*\]/g, "")
    .replace(/\[hb:[^\]]*\]/g, "")
    .replace(/\[ss:[^\]]*\]/g, "")
    .replace(/\[sv:[^\]]*\]/g, "")
    .replace(/\[sc:[^\]]*\]/g, "")
    .replace(/\[isc:[^\]]*\]/g, "")
    .replace(/\[m:[^\]]*\]/g, "")
    .replace(/\[cat:[^\]]*\]/g, "")
    .replace(/\[ce:[^\]]*\]/g, "")
    .replace(/\[ct:[^\]]*\]/g, "")
    .replace(/\[pm:[^\]]*\]/g, "")
    .replace(/\[lti:[^\]]*\]/g, "")
    .replace(/\[pm2:[^\]]*\]/g, "")
    .replace(/\[min:[^\]]*\]/g, "")
    .replace(/\[rnd:[^\]]*\]/g, "")
    .replace(/\[psu:[^\]]*\]/g, "")
    .replace(/\[man:[^\]]*\]/g, "")
    .replace(/\[po:[^\]]*\]/g, "")
    .replace(/\[ivm:[^\]]*\]/g, "")
    .replace(/\[tcv:[^\]]*\]/g, "")
    .replace(/\[net:[^\]]*\]/g, "")
    .replace(/\[iva:[^\]]*\]/g, "")
    .replace(/\[dm:[^\]]*\]/g, "")
    .replace(/\[pe:[^\]]*\]/g, "")
    .replace(/\[pt:[^\]]*\]/g, "")
    .replace(/\[mp:[^\]]*\]/g, "")
    .replace(/\[csi:[^\]]*\]/g, "")
    .replace(/\[mf:[^\]]*\]/g, "")
    .replace(/\[mpc:[^\]]*\]/g, "")
    .replace(/\[mpd:[^\]]*\]/g, "")
    .replace(/\[mil:[^\]]*\]/g, "")
    .replace(/\[gvc:[^\]]*\]/g, "")
    .trim();

  return {
    colorHex,
    material,
    catalogCategoria,
    catalogEspesor,
    catalogTerminacion,
    referencia,
    sistema,
    configuracion,
    hojasBase,
    sheetScheme,
    sheetVariant,
    customSchemeDescription,
    isCustomScheme,
    pricingMode,
    lineTemplateId,
    precioPorM2,
    minimoCobrable,
    redondeoPrecio,
    precioPlantillaSugerido,
    precioAjustadoManual,
    origenPrecio,
    ivaMode,
    totalClienteVisible,
    netoCalculado,
    ivaCalculado,
    displayMode,
    palilloEnabled,
    palilloType,
    encodedMargenPct,
    encodedCostInputScope,
    mirrorFormat,
    mirrorPaneCount,
    mirrorPaneDirection,
    mirrorInteriorLine,
    guidedVisualConfig,
    raw,
  };
}

export function isCotizacionMirrorDivided(input: {
  tipo?: string | null;
  mirrorFormat: CotizacionMirrorFormat;
  mirrorPaneCount: number | null;
}) {
  return (
    (input.tipo ?? "").trim().toLowerCase().startsWith("esp") &&
    input.mirrorFormat === "divided" &&
    input.mirrorPaneCount !== null &&
    input.mirrorPaneCount >= 2
  );
}

export function buildCotizacionMirrorPaneMeasure(input: {
  ancho: number | null;
  alto: number | null;
  mirrorPaneCount: number | null;
  mirrorPaneDirection: CotizacionMirrorPaneDirection;
}) {
  if (
    !input.ancho ||
    !input.alto ||
    !input.mirrorPaneCount ||
    input.mirrorPaneCount < 2
  ) {
    return null;
  }

  const paneWidth =
    input.mirrorPaneDirection === "vertical"
      ? input.ancho / input.mirrorPaneCount
      : input.ancho;
  const paneHeight =
    input.mirrorPaneDirection === "horizontal"
      ? input.alto / input.mirrorPaneCount
      : input.alto;

  return {
    paneWidth: Math.round(paneWidth),
    paneHeight: Math.round(paneHeight),
    label: `${Math.round(paneWidth)} x ${Math.round(paneHeight)} mm aprox.`,
  };
}

export function buildCotizacionMirrorFormatLabel(input: {
  mirrorPaneCount: number | null;
}) {
  return input.mirrorPaneCount && input.mirrorPaneCount >= 2
    ? `Dividido en ${input.mirrorPaneCount} pa\u00f1os`
    : "1 pa\u00f1o";
}

export function buildCotizacionItemSheetSchemeLabel(input: SheetSchemeInput): string {
  const sheetScheme = input.sheetScheme.trim();
  const sheetVariant = input.sheetVariant.trim();
  const customSchemeDescription = input.customSchemeDescription.trim();
  const isCustom =
    input.isCustomScheme ||
    sheetScheme.toLowerCase() === "personalizado" ||
    sheetVariant.toLowerCase() === "otro";

  if (isCustom) {
    if (sheetScheme && customSchemeDescription) {
      return `${sheetScheme}: ${customSchemeDescription}`;
    }

    return customSchemeDescription || sheetScheme;
  }

  if (sheetScheme && sheetVariant) {
    return `${sheetScheme} · ${sheetVariant}`;
  }

  return sheetScheme || sheetVariant || customSchemeDescription;
}

function normalizePresentationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function shouldShowCotizacionItemSheetSchemeSpec(input: {
  itemName: string;
  sheetSchemeLabel: string;
  sheetScheme: string;
  sheetVariant: string;
  customSchemeDescription: string;
}): boolean {
  const sheetSchemeLabel = input.sheetSchemeLabel.trim();

  if (!sheetSchemeLabel) {
    return false;
  }

  const normalizedName = normalizePresentationText(input.itemName);
  const parts = [
    input.sheetScheme,
    input.sheetVariant,
    input.customSchemeDescription,
    sheetSchemeLabel,
  ]
    .map((part) => normalizePresentationText(part))
    .filter(Boolean);

  return !parts.some((part) => normalizedName.includes(part));
}
