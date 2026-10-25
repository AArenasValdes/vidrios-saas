import { parseExplicitGlassThicknessMm, normalizeGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

export type GlassThicknessResolution = {
  thicknessMm: number | null;
  display: string;
  source: "fabrication_snapshot" | "quote_metadata" | "legacy_quote_metadata" | "missing";
  hasConflict: boolean;
  warning: string | null;
};

function formatThickness(mm: number | null) {
  return mm == null ? "" : `${mm.toLocaleString("es-CL", { maximumFractionDigits: 2 })} mm`;
}

/** Resolves only frozen quote data. It deliberately has no catalog input. */
export function resolveFrozenGlassThickness(input: {
  observations?: string | null;
  snapshot?: FabricacionCotizacionSnapshot | null;
  selectedProductId?: string | null;
}): GlassThicknessResolution {
  const presentation = decodeCotizacionItemPresentationMeta(input.observations ?? "");
  const snapshotSpec = normalizeGlassTechnicalSpec(input.snapshot?.glassSelection?.technicalSpec);
  const quoteSpec = normalizeGlassTechnicalSpec(presentation.glassTechnicalSpec);
  const snapshotProductId = input.snapshot?.glassSelection?.productId?.trim() || null;
  const metadataProductId = input.selectedProductId?.trim() || presentation.vidrioLineTemplateId?.trim() || null;
  const idsConflict = Boolean(
    (snapshotProductId && metadataProductId && snapshotProductId !== metadataProductId) ||
    (snapshotProductId && quoteSpec?.productId && snapshotProductId !== quoteSpec.productId) ||
    (metadataProductId && quoteSpec?.productId && metadataProductId !== quoteSpec.productId)
  );
  const legacyThickness = parseExplicitGlassThicknessMm(presentation.catalogEspesor);

  const snapshotThickness = snapshotSpec?.thicknessMm ?? null;
  const quoteThickness = quoteSpec?.thicknessMm ?? null;
  const resolvedSpec = snapshotThickness != null ? snapshotSpec : quoteSpec;
  const resolvedThickness = snapshotThickness ?? quoteThickness;
  if (resolvedSpec && resolvedThickness != null) {
    const legacyConflict = legacyThickness != null && legacyThickness !== resolvedThickness;
    const specConflict = resolvedSpec.hasConflict || snapshotSpec?.hasConflict === true || idsConflict || legacyConflict;
    return {
      thicknessMm: resolvedThickness,
      display: formatThickness(resolvedThickness),
      source: snapshotThickness != null ? "fabrication_snapshot" : "quote_metadata",
      hasConflict: specConflict,
      warning: specConflict ? "Hay datos de espesor o identidad contradictorios; revisar el vidrio guardado." : null,
    };
  }

  // Legacy quote metadata is usable only when its frozen product identity agrees
  // with the product recorded on the fabrication snapshot (when both exist).
  if (legacyThickness != null && !idsConflict) {
    const specConflict = snapshotSpec?.hasConflict === true || quoteSpec?.hasConflict === true;
    return {
      thicknessMm: legacyThickness,
      display: formatThickness(legacyThickness),
      source: "legacy_quote_metadata",
      hasConflict: specConflict,
      warning: specConflict ? "La especificación guardada registra un conflicto; revisar el vidrio." : null,
    };
  }

  const specConflict = snapshotSpec?.hasConflict === true || quoteSpec?.hasConflict === true;
  return {
    thicknessMm: null,
    display: "Pendiente",
    source: "missing",
    hasConflict: idsConflict || specConflict,
    warning: idsConflict
      ? "La identidad del producto de vidrio no coincide; confirmar el espesor."
      : specConflict ? "La especificación guardada registra un conflicto; revisar el vidrio." : null,
  };
}
