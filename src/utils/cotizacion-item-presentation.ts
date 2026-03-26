import { normalizePricingMode, type PricingMode } from "@/types/pricing-mode";

export type ComponentMaterial = "Aluminio" | "PVC";

export type CotizacionItemPresentationMeta = {
  colorHex: string;
  material: ComponentMaterial;
  referencia: string;
  pricingMode: PricingMode;
  raw: string;
};

const DEFAULT_COLOR_BY_MATERIAL: Record<ComponentMaterial, string> = {
  Aluminio: "#a8a8a8",
  PVC: "#f0eeeb",
};

function normalizeMaterial(value: string | null | undefined): ComponentMaterial {
  return value === "PVC" ? "PVC" : "Aluminio";
}

function normalizeColor(colorHex: string | null | undefined, material: ComponentMaterial) {
  if (typeof colorHex === "string" && /^#[0-9a-fA-F]{3,8}$/.test(colorHex.trim())) {
    return colorHex.trim();
  }

  return DEFAULT_COLOR_BY_MATERIAL[material];
}

export function encodeCotizacionItemPresentationMeta(input: {
  colorHex: string;
  material: ComponentMaterial;
  referencia?: string;
  pricingMode?: PricingMode;
  raw?: string;
}) {
  const material = normalizeMaterial(input.material);
  const colorHex = normalizeColor(input.colorHex, material);
  const referencia = (input.referencia ?? "").trim().replace(/\]/g, "");
  const pricingMode = normalizePricingMode(input.pricingMode);
  const raw = (input.raw ?? "").trim();
  const meta = `[c:${colorHex}][r:${referencia}][m:${material}][pm:${pricingMode}]`;

  return raw ? `${meta} ${raw}` : meta;
}

export function decodeCotizacionItemPresentationMeta(
  observaciones: string | null | undefined
): CotizacionItemPresentationMeta {
  const source = observaciones ?? "";
  const material = normalizeMaterial(source.match(/\[m:([^\]]*)\]/)?.[1]);
  const colorHex = normalizeColor(source.match(/\[c:(#[0-9a-fA-F]{3,8})\]/)?.[1], material);
  const pricingMode = normalizePricingMode(source.match(/\[pm:([^\]]*)\]/)?.[1]);
  const referencia =
    source.match(/\[r:([^\]]*)\]/)?.[1]?.trim() ??
    source.match(/\[l:([^\]]*)\]/)?.[1]?.trim() ??
    "";
  const raw = source
    .replace(/\[c:[^\]]*\]/g, "")
    .replace(/\[(?:r|l):[^\]]*\]/g, "")
    .replace(/\[m:[^\]]*\]/g, "")
    .replace(/\[pm:[^\]]*\]/g, "")
    .trim();

  return {
    colorHex,
    material,
    referencia,
    pricingMode,
    raw,
  };
}
