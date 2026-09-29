import { getSheetSchemeOptions, getSheetVariantOptions } from "@/features/cotizaciones/new-quote/workflow-ui";
import { createEmptyQuickCompositionAdjustment, type QuickCompositionAdjustment, type QuickFixedSide, type QuickPalilloPreset, type QuickPaneType } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";

export type QuickCompositionSelection = {
  tipo: string; sistema: string; configuracion: string; sheetScheme: string; sheetVariant: string;
  ancho: number; alto: number; hojasBase?: number | null; mirrorPaneCount?: number | null; existing?: QuickCompositionAdjustment | null;
};
export type QuickCompositionBase = { supported: true; leafCount: number; adjustment: QuickCompositionAdjustment } | { supported: false; reason: "unsupported_composition" | "invalid_dimensions" };
export type QuickCompositionCapabilities = { adjustable: boolean; panes: boolean; palillos: boolean; invert: boolean; fixedSides: QuickFixedSide[]; leafCount: number; sheetSchemes: Array<{ value: string; leafCount: number; variants: readonly string[] }> };
const sides: QuickFixedSide[] = ["top", "bottom", "left", "right"];
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function resolveLeafCount(input: QuickCompositionSelection): number | null {
  const tipo = norm(input.tipo), system = norm(input.sistema), config = norm(input.configuracion), variant = norm(input.sheetVariant);
  const commercialSchemes = getSheetSchemeOptions({ tipo: input.tipo, sistema: input.sistema, configuracion: input.configuracion });
  const defaultScheme = input.hojasBase
    ? commercialSchemes.find((value) => Number(norm(value).match(/^([1-4]) hojas$/)?.[1]) === input.hojasBase)
    : commercialSchemes.find((value) => /^([1-4]) hojas$/.test(norm(value)) || norm(value) === "2 proyectantes");
  const scheme = norm(input.sheetScheme || defaultScheme || "");
  if (scheme === "personalizado" || variant === "otro") return null;
  if (["pano fijo", "paño fijo"].includes(tipo)) return Number(scheme.match(/^([1-4]) panos?$/)?.[1]) || null;
  if (tipo === "ventana" && system === "corredera") {
    const count = Number(scheme.match(/^([2-4]) hojas$/)?.[1]);
    return count && variant !== "otro" ? count : !scheme && input.hojasBase ? input.hojasBase : null;
  }
  if (tipo === "ventana" && ["abatible", "oscilobatiente", "proyectante"].includes(system)) {
    if (!(scheme === "1 hoja" || scheme === "2 hojas" || system === "proyectante" && scheme === "2 proyectantes")) return null;
    if (!commercialSchemes.some((value) => norm(value) === scheme)) return null;
    return Number(scheme.match(/^(1|2) hojas?$/)?.[1]) || (scheme.includes("2 proyectantes") ? 2 : ["proyectante + fijo", "oscilobatiente + fijo", "1 abatible + 1 fija", "proyectante arriba + fijo abajo", "proyectante abajo + fijo arriba"].includes(input.sheetScheme) ? 2 : null);
  }
  if (tipo === "puerta" && system === "corredera") return config === "1 fija + 1 movil" || config === "2 moviles" ? 2 : config.includes("4 hojas") ? 4 : null;
  if (tipo === "puerta" && system === "abatible") return config.includes("4 hojas") ? 4 : config.includes("2 hojas") || config.includes("fijo lateral") ? 2 : ["1 hoja", "con fijo superior"].includes(config) ? 1 : null;
  if (tipo === "shower door" && system === "corredera" && config === "frontal") return scheme.includes("2 hojas") || scheme.includes("1 fija") ? 2 : null;
  return null;
}

export function buildQuickCompositionBaseConfig(input: QuickCompositionSelection): QuickCompositionBase {
  if (!Number.isFinite(input.ancho) || !Number.isFinite(input.alto) || input.ancho < 1 || input.alto < 1) return { supported: false, reason: "invalid_dimensions" };
  const configuredCount = Number(`${input.sheetScheme} ${input.configuracion}`.match(/(?:^|\D)([1-6])\s*(?:hojas?|paños|panos|módulos|modulos)/i)?.[1]);
  const leafCount = resolveLeafCount(input) ?? input.existing?.paneCount ?? input.existing?.leafWidths?.length ?? input.mirrorPaneCount ?? (configuredCount || input.hojasBase || 1);
  if (!Number.isInteger(leafCount) || leafCount < 1 || leafCount > 6) return { supported: false, reason: "unsupported_composition" };
  return { supported: true, leafCount, adjustment: input.existing ?? createEmptyQuickCompositionAdjustment() };
}

export function resolveQuickCompositionCapabilities(input: QuickCompositionSelection): QuickCompositionCapabilities {
  const base = buildQuickCompositionBaseConfig(input);
  const canAdjust = base.supported;
  const existing = input.existing;
  const existingFixedCount = sides.filter((side) => Boolean(existing?.[`fixed${side[0].toUpperCase()}${side.slice(1)}Mm` as keyof QuickCompositionAdjustment])).length;
  const effectiveLeafCount = base.supported
    ? existing?.paneCount ?? existing?.leafWidths?.length ?? base.leafCount
    : 0;
  const fixedSides = canAdjust && effectiveLeafCount + existingFixedCount < 6 ? sides.filter((side) => !existing?.[`fixed${side[0].toUpperCase()}${side.slice(1)}Mm` as keyof QuickCompositionAdjustment]) : [];
  const sheetSchemes = canAdjust
    ? getSheetSchemeOptions({ tipo: input.tipo, sistema: input.sistema, configuracion: input.configuracion })
      .flatMap((value) => {
        if (!/^([1-6]) (hojas|panos)$/.test(norm(value))) return [];
        const candidate = { ...input, sheetScheme: value, sheetVariant: "" };
        const candidateBase = buildQuickCompositionBaseConfig(candidate);
        if (!candidateBase.supported) return [];
        return [{ value, leafCount: candidateBase.leafCount, variants: getSheetVariantOptions(value, { tipo: input.tipo, sistema: input.sistema }) }];
      })
    : [];
  return { adjustable: canAdjust, panes: canAdjust && effectiveLeafCount > 1, palillos: canAdjust, invert: canAdjust && norm(input.sistema) === "corredera", fixedSides, leafCount: canAdjust ? effectiveLeafCount : 0, sheetSchemes };
}

export function setQuickFixedDimension(adjustment: QuickCompositionAdjustment, side: QuickFixedSide, sizeMm: number | null, totalMm: number): QuickCompositionAdjustment | null {
  if (sizeMm !== null && (!Number.isFinite(sizeMm) || sizeMm < 150 || sizeMm >= totalMm - 300)) return null;
  const oppositeSide: QuickFixedSide = side === "left" ? "right" : side === "right" ? "left" : side === "top" ? "bottom" : "top";
  const opposite = adjustment[`fixed${oppositeSide[0].toUpperCase()}${oppositeSide.slice(1)}Mm` as keyof QuickCompositionAdjustment];
  if (sizeMm !== null && typeof opposite === "number" && sizeMm + opposite > totalMm - 300) return null;
  const key = `fixed${side[0].toUpperCase()}${side.slice(1)}Mm` as const;
  return { ...adjustment, [key]: sizeMm === null ? null : Math.round(sizeMm) };
}

export function setQuickLeafWidths(adjustment: QuickCompositionAdjustment, widths: number[], availableWidthMm: number): QuickCompositionAdjustment | null {
  if (widths.length < 2 || widths.length > 6 || widths.some((width) => !Number.isFinite(width) || width < 200) || Math.abs(widths.reduce((a, b) => a + b, 0) - availableWidthMm) > 1) return null;
  return { ...adjustment, leafWidths: widths.map(Math.round) };
}

export function setQuickPaneCount(adjustment: QuickCompositionAdjustment, paneCount: number, availableWidthMm: number): QuickCompositionAdjustment | null {
  if (!Number.isInteger(paneCount) || paneCount < 1 || paneCount > 6) return null;
  const paneDecorations = Object.fromEntries(Object.entries(adjustment.paneDecorations).filter(([key]) => Number(key.replace("leaf-", "")) <= paneCount));
  const paneTypes = Object.fromEntries(Object.entries(adjustment.paneTypes ?? {}).filter(([key]) => Number(key.replace("leaf-", "")) <= paneCount));
  if (paneCount === 1) return { ...adjustment, paneCount: 1, leafWidths: null, paneDecorations, paneTypes };
  const widths = equalizeQuickLeafWidths(paneCount, availableWidthMm);
  if (widths.some((width) => width < 200)) return null;
  return { ...adjustment, paneCount, leafWidths: widths, paneDecorations, paneTypes };
}

export function equalizeQuickLeafWidths(count: number, availableWidthMm: number): number[] {
  const whole = Math.floor(availableWidthMm / count);
  return Array.from({ length: count }, (_, index) => index === count - 1 ? availableWidthMm - whole * (count - 1) : whole);
}

export function setQuickPaneDecoration(adjustment: QuickCompositionAdjustment, leafIndex: number, preset: QuickPalilloPreset): QuickCompositionAdjustment {
  const key = `leaf-${leafIndex + 1}`;
  const paneDecorations = { ...adjustment.paneDecorations };
  if (preset === "none") delete paneDecorations[key]; else paneDecorations[key] = preset;
  return { ...adjustment, paneDecorations };
}

export function setQuickPaneType(adjustment: QuickCompositionAdjustment, leafIndex: number, paneType: QuickPaneType | null): QuickCompositionAdjustment {
  const key = `leaf-${leafIndex + 1}`;
  const paneTypes = { ...(adjustment.paneTypes ?? {}) };
  if (paneType === null) delete paneTypes[key]; else paneTypes[key] = paneType;
  return { ...adjustment, paneTypes };
}

export function quickCompositionEquals(a: QuickCompositionAdjustment | null, b: QuickCompositionAdjustment | null): boolean {
  return JSON.stringify(a ?? createEmptyQuickCompositionAdjustment()) === JSON.stringify(b ?? createEmptyQuickCompositionAdjustment());
}
