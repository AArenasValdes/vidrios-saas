import {
  applyGlassTechnicalOverride,
  buildCatalogGlassTechnicalSpec,
  resolveGlassTechnicalSpecForProduct,
} from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { getLineTemplateGlassMetadata, mergeLineTemplateGlassMetadata } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { isCatalogGlassPlanable } from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";

describe("glass technical spec", () => {
  it("copia solo valores estructurados del catálogo y deja pendientes los no informados", () => {
    const spec = buildCatalogGlassTechnicalSpec({
      productId: "glass-1",
      metadata: {
        espesor: "5 mm",
        categoriaTecnica: "monolitico",
        planchaAnchoMm: 3210,
        precioM2Sugerido: 75000,
      },
    });
    expect(spec).toMatchObject({
      productId: "glass-1",
      thicknessMm: 5,
      category: "monolitico",
      manualCutStatus: "pending_validation",
      sheetWidthMm: 3210,
      sheetHeightMm: null,
      provenance: "catalog",
    });
    expect(spec).not.toHaveProperty("precioM2Sugerido");
  });

  it("conserva origen y marca conflicto ante override explícito", () => {
    const catalogSpec = buildCatalogGlassTechnicalSpec({
      productId: "glass-1",
      metadata: { espesorMm: 4, categoriaTecnica: "monolitico", corteManualEstado: "confirmed" },
    });
    expect(applyGlassTechnicalOverride({
      catalogSpec,
      override: { thicknessMm: 5 },
    })).toMatchObject({
      thicknessMm: 5,
      provenance: "manual_override",
      sourceProductId: "glass-1",
      sourceValues: { thicknessMm: 4 },
      hasConflict: true,
    });
  });

  it("acepta espesores técnicos decimales sin redondearlos", () => {
    expect(buildCatalogGlassTechnicalSpec({
      productId: "glass-laminated",
      metadata: { espesor: "6,38 mm", categoriaTecnica: "laminado" },
    }).thicknessMm).toBe(6.38);
  });

  it("mantiene pendiente el corte de categorías especiales hasta una revisión explícita", () => {
    const withoutReview = buildCatalogGlassTechnicalSpec({
      productId: "glass-tempered",
      metadata: { categoriaTecnica: "templado", corteManualEstado: "confirmed" },
    });
    const reviewed = buildCatalogGlassTechnicalSpec({
      productId: "glass-tempered",
      metadata: { categoriaTecnica: "templado", revisionTecnicaExplicita: true, corteManualEstado: "confirmed" },
    });
    expect(withoutReview.manualCutStatus).toBe("pending_validation");
    expect(reviewed.manualCutStatus).toBe("confirmed");
    expect(reviewed.technicalReviewConfirmed).toBe(true);
  });

  it("persiste y recupera el estado técnico sin reemplazar metadata comercial adyacente", () => {
    const saved = mergeLineTemplateGlassMetadata({ precioInternoRef: "stable", workshopProfiles: [{ codigo: "A1" }] }, {
      espesor: "6,38",
      espesorMm: 6.38,
      categoriaTecnica: "laminado",
      revisionTecnicaExplicita: true,
      corteManualEstado: "confirmed",
      pieceOrientation: "grain_or_coating_directional",
    });
    expect(getLineTemplateGlassMetadata(saved)).toMatchObject({
      espesorMm: 6.38,
      categoriaTecnica: "laminado",
      revisionTecnicaExplicita: true,
      corteManualEstado: "confirmed",
      pieceOrientation: "grain_or_coating_directional",
    });
    expect(saved).toMatchObject({ precioInternoRef: "stable", workshopProfiles: [{ codigo: "A1" }] });
    expect(buildCatalogGlassTechnicalSpec({ productId: "glass-1", metadata: saved }).pieceOrientation).toBe("grain_or_coating_directional");
  });

  it("persiste forma de compra en metadata y no convierte compra cortada en plancha de taller", () => {
    const saved = mergeLineTemplateGlassMetadata({ existingCommercialFlag: true }, {
      espesor: "5",
      espesorMm: 5,
      categoriaTecnica: "monolitico",
      corteManualEstado: "confirmed",
      purchaseMode: "supplier_cut",
      planchaAnchoMm: 2500,
      planchaAltoMm: 1800,
    });
    const spec = buildCatalogGlassTechnicalSpec({ productId: "glass-1", metadata: saved });

    expect(saved).toMatchObject({ existingCommercialFlag: true, formaCompraVidrio: "supplier_cut" });
    expect(getLineTemplateGlassMetadata(saved).purchaseMode).toBe("supplier_cut");
    expect(spec.purchaseMode).toBe("supplier_cut");
    expect(isCatalogGlassPlanable(spec)).toBe(false);
  });

  it("mantiene sin distribuir los productos legacy sin forma de compra confirmada", () => {
    const spec = buildCatalogGlassTechnicalSpec({
      productId: "glass-legacy",
      metadata: {
        espesor: "5 mm",
        categoriaTecnica: "monolitico",
        revisionTecnicaExplicita: true,
        corteManualEstado: "confirmed",
        planchaAnchoMm: 2500,
        planchaAltoMm: 1800,
      },
    });

    expect(spec.purchaseMode).toBeUndefined();
    expect(isCatalogGlassPlanable(spec)).toBe(false);
  });

  it("congela especificación al reabrir el mismo producto y toma metadata solo si cambia la selección", () => {
    const initial = buildCatalogGlassTechnicalSpec({
      productId: "glass-1",
      metadata: { espesorMm: 4, categoriaTecnica: "monolitico" },
    });
    const sameSelection = resolveGlassTechnicalSpecForProduct({
      productId: "glass-1",
      catalogMetadata: { espesorMm: 6 },
      existing: initial,
    });
    const changedSelection = resolveGlassTechnicalSpecForProduct({
      productId: "glass-2",
      catalogMetadata: { espesorMm: 6, categoriaTecnica: "laminado" },
      existing: initial,
    });
    expect(sameSelection.thicknessMm).toBe(4);
    expect(changedSelection).toMatchObject({ productId: "glass-2", thicknessMm: 6, category: "laminado" });
  });
});
