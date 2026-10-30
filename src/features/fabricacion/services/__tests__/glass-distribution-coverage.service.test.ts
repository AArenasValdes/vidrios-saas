import { buildGlassDistributionCoverage, getGlassPaneGeometryExclusionReason, isGlassCoveragePaneComplete, isGlassPaneGeometryComplete } from "../glass-distribution-coverage.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { NormalizedGlassPane } from "../glass-pane-normalization.service";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  applyPalilloPresetToModule,
  createDefaultGuidedVisualConfig,
  listLeafModules,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { resolveManualGlassPaneSlots } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";

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
      technicalReviewConfirmed: true, purchaseMode: "full_sheet",
    },
    widthMm: 600, heightMm: 1000, quantity: 1, commercialQuantity: 1, dimensionProvenance: "validated_recipe", dimensionTraceRuleIds: [],
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

  it("acepta espesores de vidrio decimales válidos, como 4,5 mm", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1")],
      panes: [pane("item-1", "glass-4-5", {
        technicalSpec: {
          ...pane("item-1", "glass-4-5").technicalSpec!,
          category: "dvh",
          thicknessMm: 4.5,
        },
      })],
    });

    expect(coverage).toMatchObject({ status: "complete", completeReferenceCount: 1, pendingReferenceCount: 0 });
  });

  it("B: marca parcial una cotización cuando una referencia no tiene dimensiones", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1"), item("item-2", "V2")],
      panes: [pane("item-1", "glass-1"), pane("item-2", "glass-1", { widthMm: null, heightMm: null, validationStatus: "requires_review", warnings: ["Faltan dimensiones válidas del paño."] })],
    });

    expect(coverage).toMatchObject({ status: "partial", completeReferenceCount: 1, pendingReferenceCount: 1 });
    expect(coverage.pendingReferences[0]).toMatchObject({ componentCode: "V2", reason: "Faltan dimensiones válidas del paño." });
  });

  it("no declara completa una receta automática con dimensiones pero sin validación; exige una receta validada o medida manual", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1")],
      panes: [pane("item-1", "glass-1", {
        dimensionProvenance: "recipe_trace",
        recipeStatus: "lista_para_validar",
        validationStatus: "requires_review",
        warnings: ["La receta no está validada por el taller."],
      })],
    });

    expect(coverage).toMatchObject({ status: "unavailable", completeReferenceCount: 0, pendingReferenceCount: 1 });
    expect(coverage.pendingReferences[0]?.reason).toBe("La receta no está validada por el taller.");
  });

  it("admite recipe_trace con geometría congelada e identidad física solo para vista previa", () => {
    const preliminary = pane("item-1", "glass-1", {
      dimensionProvenance: "recipe_trace",
      recipeStatus: "lista_para_validar",
      validationStatus: "requires_review",
      warnings: ["La receta no está validada por el taller."],
    });

    expect(isGlassPaneGeometryComplete(preliminary)).toBe(true);
    expect(isGlassCoveragePaneComplete(preliminary)).toBe(false);
    expect(getGlassPaneGeometryExclusionReason(preliminary)).toBeNull();
  });

  it("explica por qué bloquea recipe_trace sin medidas físicas suficientes o cantidad coherente", () => {
    const missingDimensions = pane("item-1", "glass-1", {
      dimensionProvenance: "recipe_trace", widthMm: null, heightMm: null,
    });
    const inconsistentQuantity = pane("item-1", "glass-2", {
      dimensionProvenance: "recipe_trace", quantity: 3, commercialQuantity: 2,
      paneUnitIds: ["one", "two", "three"],
    });

    expect(getGlassPaneGeometryExclusionReason(missingDimensions)).toMatch(/dimensiones rectangulares/i);
    expect(getGlassPaneGeometryExclusionReason(inconsistentQuantity)).toMatch(/cantidad comercial/i);
  });

  it("excluye producto incompatible, conflicto técnico y snapshots legacy de la simulación", () => {
    const productMismatch = pane("item-1", "glass-1", {
      dimensionProvenance: "recipe_trace",
      technicalSpec: { ...pane("item-1", "glass-1").technicalSpec!, productId: "other-product" },
    });
    const conflict = pane("item-1", "glass-2", {
      dimensionProvenance: "recipe_trace",
      technicalSpec: { ...pane("item-1", "glass-2").technicalSpec!, hasConflict: true },
    });
    const legacy = pane("item-1", "glass-3", { dimensionProvenance: "legacy_snapshot" });

    expect(getGlassPaneGeometryExclusionReason(productMismatch)).toMatch(/no coincide exactamente/i);
    expect(getGlassPaneGeometryExclusionReason(conflict)).toMatch(/conflicto pendiente/i);
    expect(getGlassPaneGeometryExclusionReason(legacy)).toMatch(/snapshot histórico/i);
  });

  it("no distribuye productos supplier-cut, undecided ni fichas legacy sin purchaseMode", () => {
    const supplierCut = pane("item-1", "supplier-cut", {
      technicalSpec: { ...pane("item-1", "supplier-cut").technicalSpec!, purchaseMode: "supplier_cut" },
    });
    const undecided = pane("item-1", "undecided", {
      technicalSpec: { ...pane("item-1", "undecided").technicalSpec!, purchaseMode: "undecided" },
    });
    const legacy = pane("item-1", "legacy", {
      technicalSpec: { ...pane("item-1", "legacy").technicalSpec!, purchaseMode: undefined },
    });

    expect(getGlassPaneGeometryExclusionReason(supplierCut)).toMatch(/cortado por proveedor/i);
    expect(getGlassPaneGeometryExclusionReason(undecided)).toMatch(/compra por plancha/i);
    expect(getGlassPaneGeometryExclusionReason(legacy)).toMatch(/ficha antigua.*forma de compra/i);
    expect(isGlassPaneGeometryComplete(supplierCut)).toBe(false);
    expect(isGlassPaneGeometryComplete(undecided)).toBe(false);
    expect(isGlassPaneGeometryComplete(legacy)).toBe(false);
    expect(isGlassCoveragePaneComplete(legacy)).toBe(false);
  });

  it("no declara cobertura completa cuando la normalización exige revisión aunque dimensiones y unidades estén presentes", () => {
    const coverage = buildGlassDistributionCoverage({
      items: [item("item-1", "V1")],
      panes: [pane("item-1", "glass-1", {
        validationStatus: "requires_review",
        warnings: ["La ficha técnica cambió desde que se guardó la medición."],
      })],
    });

    expect(coverage).toMatchObject({ status: "unavailable", completeReferenceCount: 0, pendingReferenceCount: 1 });
    expect(coverage.pendingReferences[0]?.reason).toContain("La ficha técnica cambió");
  });

  it("no redondea cinco piezas para cubrir dos slots cuando la cantidad comercial es tres", () => {
    const component = item("item-1", "V1");
    component.cantidad = 3;
    component.observaciones = encodeCotizacionItemPresentationMeta({ fabricacionTipologia: "Corredera", sheetScheme: "2 hojas" });

    const coverage = buildGlassDistributionCoverage({
      items: [component],
      panes: [pane("item-1", "glass-1", {
        quantity: 5,
        paneUnitIds: Array.from({ length: 5 }, (_, index) => `unit-${index + 1}`),
      })],
    });

    expect(coverage.status).not.toBe("complete");
    expect(coverage.completeReferenceCount).toBe(0);
    expect(coverage.pendingReferences[0]?.reason).toContain("múltiplo de la cantidad comercial");
  });

  it("acepta una referencia agrupada con seis piezas para dos slots y cantidad comercial tres", () => {
    const component = item("item-1", "V1");
    component.cantidad = 3;
    component.observaciones = encodeCotizacionItemPresentationMeta({ fabricacionTipologia: "Corredera", sheetScheme: "2 hojas" });

    const coverage = buildGlassDistributionCoverage({
      items: [component],
      panes: [pane("item-1", "grouped-glass", {
        quantity: 6,
        paneUnitIds: Array.from({ length: 6 }, (_, index) => `unit-${index + 1}`),
      })],
    });

    expect(coverage).toMatchObject({ status: "complete", completeReferenceCount: 1, pendingReferenceCount: 0 });
  });

  it("acepta referencias separadas de tres unidades por slot con cantidad comercial tres", () => {
    const component = item("item-1", "V1");
    component.cantidad = 3;
    component.observaciones = encodeCotizacionItemPresentationMeta({ fabricacionTipologia: "Corredera", sheetScheme: "2 hojas" });

    const coverage = buildGlassDistributionCoverage({
      items: [component],
      panes: [
        pane("item-1", "glass-1", { quantity: 3, paneUnitIds: ["a1", "a2", "a3"] }),
        pane("item-1", "glass-2", { quantity: 3, paneUnitIds: ["b1", "b2", "b3"] }),
      ],
    });

    expect(coverage).toMatchObject({ status: "complete", completeReferenceCount: 2, pendingReferenceCount: 0 });
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

  it("considera completa la cobertura manual aunque el componente no tenga snapshot de perfiles", () => {
    const component = item("item-1", "V2", "Float 5 mm");
    component.fabricacionSnapshot = null;
    component.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "component-item-1",
      manualGlassMeasurements: { version: 1, entries: [{
        id: "manual-pane-v2", source: "manual", version: 1, productId: "product-glass-5",
        technicalFingerprint: "catalog-fingerprint", widthMm: 750, heightMm: 1600, quantity: 2,
        recordedAt: "2026-10-25T12:00:00.000Z",
      }] },
    });
    const manualPane = pane("item-1", "manual-pane-v2", { dimensionProvenance: "manual", recipeStatus: null });

    const coverage = buildGlassDistributionCoverage({ items: [component], panes: [manualPane] });

    expect(coverage).toMatchObject({ status: "complete", completeReferenceCount: 1, pendingReferenceCount: 0 });
  });

  it("mantiene pendientes los tres paños que faltan en una configuración explícita de cuatro", () => {
    const component = item("item-1", "V1", "Float 5 mm");
    component.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "component-item-1",
      fabricacionTipologia: "Corredera",
      sheetScheme: "4 hojas",
      manualGlassMeasurements: { version: 2, expectedPaneCount: 4, entries: [{
        id: "manual-pane-1", source: "manual", version: 2, productId: "product-glass-5",
        technicalFingerprint: "catalog-fingerprint", widthMm: 600, heightMm: 1000, quantity: 1,
        quantityBasis: "per_component", paneSlotId: "pane-1", sourcePosition: "Paño 1", rectangularVerified: true,
        recordedAt: "2026-10-25T12:00:00.000Z",
      }] },
    });
    const coverage = buildGlassDistributionCoverage({
      items: [component],
      panes: [pane("item-1", "manual-pane-1", { dimensionProvenance: "manual", recipeStatus: null, paneSlotId: "pane-1" })],
    });
    expect(coverage.status).toBe("partial");
    expect(coverage.pendingReferenceCount).toBe(3);
  });

  it.each([
    ["tres hojas", "3 hojas", 3],
    ["cuatro hojas", "4 hojas", 4],
  ])("no duplica referencias vacías cuando faltan todos los paños de %s", (_label, sheetScheme, expectedCount) => {
    const component = item("item-1", "V1", "Float 10 mm");
    component.observaciones = encodeCotizacionItemPresentationMeta({ fabricacionTipologia: "Corredera", sheetScheme });

    const coverage = buildGlassDistributionCoverage({ items: [component], panes: [] });

    expect(coverage.status).toBe("unavailable");
    expect(coverage.pendingReferenceCount).toBe(expectedCount);
    expect(coverage.pendingReferences.every((reference) => reference.quoteItemId === "item-1")).toBe(true);
  });

  it("exige confirmación para una composición sin conteo confiable y la invalida al cambiar divisiones", () => {
    let visual = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1800 });
    const moduleId = listLeafModules(visual.root)[0]!.id;
    const resolveFingerprint = (config: typeof visual) => {
      const presentation = decodeCotizacionItemPresentationMeta(encodeCotizacionItemPresentationMeta({
        fabricacionTipologia: "Configuración especial",
        guidedVisualConfig: config,
      }));
      return resolveManualGlassPaneSlots({
        componentType: presentation.fabricacionTipologia,
        system: presentation.sistema,
        configuration: presentation.configuracion,
        sheetScheme: presentation.sheetScheme,
        fabricacionHojas: presentation.fabricacionHojas,
        guidedVisualConfig: presentation.guidedVisualConfig,
        quickCompositionAdjustment: presentation.quickCompositionAdjustment,
      });
    };
    const oldResolution = resolveFingerprint(visual);
    visual = applyPalilloPresetToModule(visual, moduleId, "v1");
    const currentResolution = resolveFingerprint(visual);
    const currentFingerprint = currentResolution.configurationFingerprint;
    expect(currentResolution.countIsKnown).toBe(false);
    const component = item("item-1", "V1", "Float 5 mm");
    const measurement = {
      id: "manual-unknown-layout",
      source: "manual" as const,
      version: 2 as const,
      productId: "product-glass-1",
      technicalFingerprint: "catalog-fingerprint",
      widthMm: 600,
      heightMm: 1000,
      quantity: 1,
      quantityBasis: "per_component" as const,
      rectangularVerified: true,
      recordedAt: "2026-10-25T12:00:00.000Z",
    };
    const makeCoverage = (configurationFingerprint: string) => {
      component.observaciones = encodeCotizacionItemPresentationMeta({
        fabricacionTipologia: "Configuración especial",
        guidedVisualConfig: visual,
        manualGlassMeasurements: {
          version: 2,
          entries: [measurement],
          configurationFingerprint,
          allPanesConfirmed: true,
        },
      });
      expect(decodeCotizacionItemPresentationMeta(component.observaciones).manualGlassMeasurements)
        .toMatchObject({ configurationFingerprint, allPanesConfirmed: true });
      const decoded = decodeCotizacionItemPresentationMeta(component.observaciones);
      expect(decoded.fabricacionTipologia).toBe("Configuración especial");
      expect(resolveManualGlassPaneSlots({
        componentType: decoded.fabricacionTipologia || component.tipo,
        system: decoded.sistema,
        configuration: decoded.configuracion,
        sheetScheme: decoded.sheetScheme,
        fabricacionHojas: decoded.fabricacionHojas,
        guidedVisualConfig: decoded.guidedVisualConfig,
        quickCompositionAdjustment: decoded.quickCompositionAdjustment,
      })).toMatchObject({ countIsKnown: false });
      return buildGlassDistributionCoverage({
        items: [component],
        panes: [pane("item-1", measurement.id, { dimensionProvenance: "manual", recipeStatus: null })],
      });
    };

    expect(currentFingerprint).not.toBe(oldResolution.configurationFingerprint);
    const confirmedCoverage = makeCoverage(currentFingerprint);
    expect(confirmedCoverage.completeReferenceCount).toBe(1);
    expect(confirmedCoverage.pendingReferences).toEqual([]);
    expect(makeCoverage(oldResolution.configurationFingerprint)).toMatchObject({ status: "partial", pendingReferenceCount: 1 });
  });
});
