export type ComponentMaterial = "Aluminio" | "PVC";

export type CotizacionItemPresentationMeta = {
  colorHex: string;
  material: ComponentMaterial;
  referencia: string;
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
  raw?: string;
}) {
  const material = normalizeMaterial(input.material);
  const colorHex = normalizeColor(input.colorHex, material);
  const referencia = (input.referencia ?? "").trim().replace(/\]/g, "");
  const raw = (input.raw ?? "").trim();
  const meta = `[c:${colorHex}][r:${referencia}][m:${material}]`;

  return raw ? `${meta} ${raw}` : meta;
}

export function decodeCotizacionItemPresentationMeta(
  observaciones: string | null | undefined
): CotizacionItemPresentationMeta {
  const source = observaciones ?? "";
  const material = normalizeMaterial(source.match(/\[m:([^\]]*)\]/)?.[1]);
  const colorHex = normalizeColor(source.match(/\[c:(#[0-9a-fA-F]{3,8})\]/)?.[1], material);
  const referencia =
    source.match(/\[r:([^\]]*)\]/)?.[1]?.trim() ??
    source.match(/\[l:([^\]]*)\]/)?.[1]?.trim() ??
    "";
  const raw = source
    .replace(/\[c:[^\]]*\]/g, "")
    .replace(/\[(?:r|l):[^\]]*\]/g, "")
    .replace(/\[m:[^\]]*\]/g, "")
    .trim();

  return {
    colorHex,
    material,
    referencia,
    raw,
  };
}
