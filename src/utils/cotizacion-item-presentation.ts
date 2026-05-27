import { normalizePricingMode, type PricingMode } from "@/types/pricing-mode";

export type ComponentMaterial = "Aluminio" | "PVC";
export type CotizacionItemPriceOrigin = "margen" | "plantilla" | "manual";

export type CotizacionItemPresentationMeta = {
  colorHex: string;
  material: ComponentMaterial;
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
  raw: string;
};

type SheetSchemeInput = Pick<
  CotizacionItemPresentationMeta,
  "sheetScheme" | "sheetVariant" | "customSchemeDescription" | "isCustomScheme"
>;

const DEFAULT_COLOR_BY_MATERIAL: Record<ComponentMaterial, string> = {
  Aluminio: "#a8a8a8",
  PVC: "#f0eeeb",
};

const LEGACY_COLOR_HEX = "#b87333";
const WOOD_COLOR = "#8b5e3c";

function normalizeMaterial(value: string | null | undefined): ComponentMaterial {
  return value === "PVC" ? "PVC" : "Aluminio";
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

export function encodeCotizacionItemPresentationMeta(input: {
  colorHex: string;
  material: ComponentMaterial;
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
  raw?: string;
}) {
  const material = normalizeMaterial(input.material);
  const colorHex = normalizeColor(input.colorHex, material);
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
    `[pm:${pricingMode}]` +
    `[lti:${lineTemplateId}]` +
    `[pm2:${precioPorM2}]` +
    `[min:${minimoCobrable}]` +
    `[rnd:${redondeoPrecio}]` +
    `[psu:${precioPlantillaSugerido}]` +
    `[man:${precioAjustadoManual}]` +
    `[po:${origenPrecio}]`;

  return raw ? `${meta} ${raw}` : meta;
}

export function decodeCotizacionItemPresentationMeta(
  observaciones: string | null | undefined
): CotizacionItemPresentationMeta {
  const source = observaciones ?? "";
  const material = normalizeMaterial(source.match(/\[m:([^\]]*)\]/)?.[1]);
  const colorHex = normalizeColor(source.match(/\[c:(#[0-9a-fA-F]{3,8})\]/)?.[1], material);
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
    .replace(/\[pm:[^\]]*\]/g, "")
    .replace(/\[lti:[^\]]*\]/g, "")
    .replace(/\[pm2:[^\]]*\]/g, "")
    .replace(/\[min:[^\]]*\]/g, "")
    .replace(/\[rnd:[^\]]*\]/g, "")
    .replace(/\[psu:[^\]]*\]/g, "")
    .replace(/\[man:[^\]]*\]/g, "")
    .replace(/\[po:[^\]]*\]/g, "")
    .trim();

  return {
    colorHex,
    material,
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
    raw,
  };
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
