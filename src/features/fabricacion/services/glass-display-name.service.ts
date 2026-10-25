/** Formats a glass product name for fabrication documents without changing catalog data. */
export function formatGlassDisplayName(name: string | null | undefined, thicknessMm: number | null | undefined) {
  const label = name?.trim() ?? "";
  if (!label || !Number.isFinite(thicknessMm) || !thicknessMm || thicknessMm <= 0) return label || "Vidrio";
  const thickness = String(thicknessMm).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(".", "[.,]" );
  const suffix = new RegExp(`(?:\\s*[·,–-]\\s*)?${thickness}\\s*m{1,3}\\s*$`, "i");
  return label.replace(suffix, "").trim() || label;
}
