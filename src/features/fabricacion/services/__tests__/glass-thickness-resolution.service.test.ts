import { resolveFrozenGlassThickness } from "@/features/fabricacion/services/glass-thickness-resolution.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const spec = {
  version: 1 as const,
  productId: "glass-1",
  thicknessMm: 6.38,
  category: "laminado" as const,
  manualCutStatus: "pending_validation" as const,
  technicalReviewConfirmed: false,
  sheetWidthMm: null,
  sheetHeightMm: null,
  provenance: "catalog" as const,
  sourceProductId: "glass-1",
  sourceValues: null,
  hasConflict: false,
};

function snapshot(thicknessMm: number | null = 6.38) {
  return {
    glassSelection: {
      productId: "glass-1",
      displayName: "Catálogo 6,38 mm",
      technicalSpec: { ...spec, thicknessMm },
    },
  } as unknown as FabricacionCotizacionSnapshot;
}

describe("glass-thickness-resolution.service", () => {
  it("prioriza el espesor técnico congelado y advierte si contradice metadatos guardados", () => {
    const result = resolveFrozenGlassThickness({
      snapshot: snapshot(),
      observations: encodeCotizacionItemPresentationMeta({ catalogEspesor: "4 mm", vidrioLineTemplateId: "glass-1" }),
    });
    expect(result).toMatchObject({
      thicknessMm: 6.38,
      display: "6,38 mm",
      source: "fabrication_snapshot",
      hasConflict: true,
    });
    expect(result.warning).toBeTruthy();
  });

  it("conserva metadata legacy explícita solo cuando la identidad coincide", () => {
    expect(resolveFrozenGlassThickness({
      observations: encodeCotizacionItemPresentationMeta({ catalogEspesor: "5 mm", vidrioLineTemplateId: "glass-1" }),
      snapshot: snapshot(null),
    })).toMatchObject({ thicknessMm: 5, display: "5 mm", source: "legacy_quote_metadata", hasConflict: false });
    expect(resolveFrozenGlassThickness({
      observations: encodeCotizacionItemPresentationMeta({ catalogEspesor: "5 mm", vidrioLineTemplateId: "glass-2" }),
      snapshot: snapshot(null),
    })).toMatchObject({ thicknessMm: null, display: "Pendiente", source: "missing", hasConflict: true });
  });

  it("usa la especificación congelada de la cotización cuando falta el espesor en un snapshot antiguo compatible", () => {
    expect(resolveFrozenGlassThickness({
      snapshot: snapshot(null),
      observations: encodeCotizacionItemPresentationMeta({
        vidrioLineTemplateId: "glass-1",
        glassTechnicalSpec: spec,
      }),
    })).toMatchObject({ thicknessMm: 6.38, display: "6,38 mm", source: "quote_metadata", hasConflict: false });
  });

  it("deja incompleto el espesor histórico ausente y no lo infiere del nombre", () => {
    expect(resolveFrozenGlassThickness({
      observations: encodeCotizacionItemPresentationMeta({ vidrioLineTemplateId: "glass-1" }),
      snapshot: snapshot(null),
    })).toMatchObject({ thicknessMm: null, display: "Pendiente", source: "missing" });
  });

  it("conserva el conflicto y no presenta como confiable un espesor legacy si la especificación está en conflicto", () => {
    const conflicted = { ...spec, thicknessMm: null, hasConflict: true };
    expect(resolveFrozenGlassThickness({
      snapshot: { ...snapshot(null), glassSelection: { productId: "glass-1", displayName: "Vidrio", technicalSpec: conflicted } },
      observations: encodeCotizacionItemPresentationMeta({ catalogEspesor: "5 mm", vidrioLineTemplateId: "glass-1" }),
    })).toMatchObject({ thicknessMm: 5, hasConflict: true, source: "legacy_quote_metadata" });
  });
});
