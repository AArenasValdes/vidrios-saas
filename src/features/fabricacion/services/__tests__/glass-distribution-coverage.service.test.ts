import { buildGlassDistributionCoverage } from "../glass-distribution-coverage.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { NormalizedGlassPane } from "../glass-pane-normalization.service";

function item(id: string, code: string, glass = "Float 5 mm"): CotizacionWorkflowItem {
  return {
    id, codigo: code, tipo: "componente", lineaComercial: "", vidrio: glass, nombre: `Ventana ${code}`, descripcion: "",
    ancho: null, alto: null, cantidad: 1, unidad: "unidad", areaM2: null, costoProveedorUnitario: 0, costoProveedorTotal: 0,
    margenPct: 0, precioUnitario: 0, precioTotal: 0, precioPorM2: null, minimoCobrable: null, redondeoPrecio: null,
    precioPlantillaSugerido: null, precioAjustadoManual: false, origenPrecio: "manual", observaciones: "", fabricacionSnapshot: null,
  };
}

function pane(quoteItemId: string, glassId: string, overrides: Partial<NormalizedGlassPane> = {}): NormalizedGlassPane {
  return {
    organizationId: 1, quoteId: 1248, quoteItemId, logicalComponentId: `component-${quoteItemId}`, glassId,
    paneId: `${quoteItemId}:${glassId}`, paneUnitIds: [`${quoteItemId}:${glassId}:1`], ordinal: 1,
    productId: `product-${glassId}`, displayName: `Float ${glassId}`, technicalSpec: {
      version: 1, productId: `product-${glassId}`, category: "monolitico", thicknessMm: 5,
      sheetWidthMm: 2500, sheetHeightMm: 1800, pieceOrientation: "unknown", hasConflict: false,
      manualCutStatus: "confirmed", provenance: "catalog", sourceProductId: `product-${glassId}`, sourceValues: null,
      technicalReviewConfirmed: true,
    },
    widthMm: 600, heightMm: 1000, quantity: 1, dimensionProvenance: "validated_recipe", dimensionTraceRuleIds: [],
    recipeStatus: "validated", validationStatus: "eligible_for_manual_planning", warnings: [], snapshotVersion: 1,
    snapshotFingerprint: `fingerprint-${quoteItemId}-${glassId}`, normalizationVersion: 1,
    ...overrides,
  };
}

describe("buildGlassDistributionCoverage", () => {
  it("A: identifica cobertura completa cuando dos componentes tienen paños congelados", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1"), item("item-2", "V2")],
      panes: [pane("item-1", "glass-1"), pane("item-2", "glass-1")],
    });

    expect(coverage).toMatchObject({ status: "complete", completeReferenceCount: 2, pendingReferenceCount: 0, pendingReferences: [] });
  });

  it("B: marca parcial una cotización cuando una referencia no tiene dimensiones", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1"), item("item-2", "V2")],
      panes: [pane("item-1", "glass-1"), pane("item-2", "glass-1", { widthMm: null, heightMm: null, validationStatus: "requires_review", warnings: ["Faltan dimensiones válidas del paño."] })],
    });

    expect(coverage).toMatchObject({ status: "partial", completeReferenceCount: 1, pendingReferenceCount: 1 });
    expect(coverage.pendingReferences[0]).toMatchObject({ componentCode: "V2", reason: "Faltan dimensiones válidas del paño." });
  });

  it("C: devuelve no disponible y no asigna unidades si todos los snapshots carecen de medidas", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1"), item("item-2", "V2")],
      panes: [
        pane("item-1", "glass-1", { widthMm: null, heightMm: null, validationStatus: "requires_review", quantity: 0, paneUnitIds: [] }),
        pane("item-2", "glass-1", { widthMm: null, heightMm: null, validationStatus: "requires_review", quantity: 0, paneUnitIds: [] }),
      ],
    });

    expect(coverage.status).toBe("unavailable");
    expect(coverage.pendingReferenceCount).toBe(2);
    expect(coverage.pendingReferences[0]).not.toHaveProperty("physicalUnitCount");
  });

  it("D: mantiene separados tipos de vidrio completos e incompletos en un mismo componente", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1")],
      panes: [
        pane("item-1", "glass-5mm"),
        pane("item-1", "glass-lam", { productId: "product-lam", displayName: "Laminado", widthMm: null, heightMm: null, validationStatus: "requires_review", warnings: ["Faltan dimensiones válidas del paño."] }),
      ],
    });

    expect(coverage.status).toBe("partial");
    expect(coverage.completeReferenceCount).toBe(1);
    expect(coverage.pendingReferences).toHaveLength(1);
    expect(coverage.pendingReferences[0]?.displayName).toBe("Laminado");
  });

  it("F: conserva como pendiente un snapshot histórico que no es apto para pauta", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1")],
      panes: [pane("item-1", "glass-1", { dimensionProvenance: "legacy_snapshot", validationStatus: "requires_review", warnings: ["El paño proviene de un snapshot legacy sin identidad técnica completa."] })],
    });

    expect(coverage.status).toBe("unavailable");
    expect(coverage.pendingReferences[0]?.reason).toMatch(/snapshot legacy/i);
  });
});
