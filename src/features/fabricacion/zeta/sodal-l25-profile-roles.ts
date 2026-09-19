export const SODAL_L25_FORMULA_VERSION = "sodal-l25-formula-v2" as const;

export type SodalL25ProfileRole =
  | "frame_width"
  | "frame_height"
  | "sash_height"
  | "sash_width";

const FRAME_WIDTH_CODES = new Set(["2501", "2502"]);
const FRAME_HEIGHT_CODES = new Set(["2503", "2509"]);
const SASH_HEIGHT_CODES = new Set([
  "2506",
  "2507",
  "2510",
  "2511R",
  "2512R",
  "2517",
  "2518",
  "2519",
  "2522",
  "2529R",
  "2530R",
]);
const SASH_WIDTH_CODES = new Set(["2504", "2505", "2516"]);

export function normalizeSodalL25ProfileCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function classifySodalL25ProfileRole(code: string): SodalL25ProfileRole | null {
  const normalized = normalizeSodalL25ProfileCode(code);
  if (FRAME_WIDTH_CODES.has(normalized)) return "frame_width";
  if (FRAME_HEIGHT_CODES.has(normalized)) return "frame_height";
  if (SASH_HEIGHT_CODES.has(normalized)) return "sash_height";
  if (SASH_WIDTH_CODES.has(normalized)) return "sash_width";
  return null;
}

export function isSodalL25VerticalRole(role: SodalL25ProfileRole): boolean {
  return role === "frame_height" || role === "sash_height";
}

export function isSodalL25HorizontalRole(role: SodalL25ProfileRole): boolean {
  return role === "frame_width" || role === "sash_width";
}

export function isSodalL25FormulaVersion(value: string | null | undefined): boolean {
  return value === SODAL_L25_FORMULA_VERSION;
}

export function isSodalL25SnapshotIdentity(input: {
  codigo?: string | null;
  variante?: string | null;
}): boolean {
  const codigo = (input.codigo ?? "").toUpperCase();
  if (codigo.includes("SODAL-L25")) return true;
  const variante = (input.variante ?? "").trim().toLowerCase();
  return /^(monolithic|dvh)_(open|closed)_(normal|reinforced)$/.test(variante);
}
