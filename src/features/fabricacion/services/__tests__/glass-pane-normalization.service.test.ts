import { extractNormalizedGlassPanes, extractNormalizedGlassPanesForOrganization } from "@/features/fabricacion/services/glass-pane-normalization.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { buildCatalogGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { getCatalogGlassTechnicalFingerprint } from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";

function paneItem(input: {
  recipeStatus?: string;
  spec?: boolean;
  logicalId?: string;
} = {}): CotizacionWorkflowItem {
  const spec = input.spec === false ? null : {
    version: 1 as const,
    productId: "glass-5mm",
    thicknessMm: 5,
    category: "monolitico" as const,
    manualCutStatus: "confirmed" as const,
    sheetWidthMm: 3210,
    sheetHeightMm: 2250,
    provenance: "catalog" as const,
    sourceProductId: "glass-5mm",
    sourceValues: null,
    hasConflict: false,
  };
  const snapshot = {
    schemaVersion: 1,
    recipeStatus: input.recipeStatus ?? "validated",
    glassSelection: { productId: "glass-5mm", displayName: "Monolítico 5 mm", technicalSpec: spec },
    result: {
      vidrios: [{
        vidrioId: "sash-glass",
        nombre: "paño de hoja",
        anchoMm: 690,
        altoMm: 1390,
        cantidadPiezas: 2,
        totalM2: 1.9182,
        trazabilidad: [
          { fieldPath: "vidrios.sash-glass.anchoMm", origen: "derivado" },
          { fieldPath: "vidrios.sash-glass.altoMm", origen: "derivado" },
          { fieldPath: "vidrios.sash-glass.cantidadPiezas", origen: "observado" },
        ],
      }],
    },
  } as unknown as FabricacionCotizacionSnapshot;

  return {
    id: "physical-row-1",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "Línea validada",
    vidrio: "Monolítico 5 mm",
    nombre: "Ventana",
    descripcion: "Ventana",
    ancho: 1500,
    alto: 1400,
    cantidad: 2,
    unidad: "unidad",
    areaM2: 4.2,
    costoProveedorUnitario: 100,
    costoProveedorTotal: 200,
    margenPct: 0,
    precioUnitario: 200,
    precioTotal: 400,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#888888",
      material: "Aluminio",
      vidrioLineTemplateId: "glass-5mm",
      glassTechnicalSpec: spec,
      logicalComponentId: input.logicalId ?? "logical-component-1",
    }),
    fabricacionSnapshot: snapshot,
  };
}

describe("glass-pane-normalization.service", () => {
  it("extrae cantidad congelada sin volver a multiplicarla por cantidad de ítem", () => {
    const [pane] = extractNormalizedGlassPanes({
      organizationId: 4,
      quoteId: 88,
      item: paneItem(),
    });
    expect(pane).toMatchObject({
      organizationId: 4,
      quoteId: 88,
      quantity: 2,
      validationStatus: "eligible_for_manual_planning",
      widthMm: 690,
      heightMm: 1390,
      logicalComponentId: "logical-component-1",
    });
    expect(pane?.paneUnitIds).toEqual([
      "logical-component-1:sash-glass:1",
      "logical-component-1:sash-glass:2",
    ]);
  });

  it("mantiene receta preliminar, vidrio incompleto e identidad faltante en revisión", () => {
    for (const item of [
      paneItem({ recipeStatus: "lista_para_validar" }),
      paneItem({ spec: false }),
      paneItem({ logicalId: "" }),
    ]) {
      const [pane] = extractNormalizedGlassPanes({ organizationId: "org-2", quoteId: "q-2", item });
      expect(pane?.validationStatus).toBe("requires_review");
      expect(pane?.warnings.length).toBeGreaterThan(0);
    }
  });

  it("no expone ni consulta catálogo vivo y produce fingerprint determinista del snapshot", () => {
    const item = paneItem();
    const first = extractNormalizedGlassPanes({ organizationId: 4, quoteId: 88, item })[0];
    const second = extractNormalizedGlassPanes({ organizationId: 4, quoteId: 88, item })[0];
    expect(first?.snapshotFingerprint).toBe(second?.snapshotFingerprint);
    expect(first?.productId).toBe("glass-5mm");
    expect(first?.technicalSpec?.thicknessMm).toBe(5);
  });

  it("preserva las dimensiones guardadas si un snapshot histórico no incluye trazabilidad", () => {
    const item = paneItem();
    const snapshot = JSON.parse(JSON.stringify(item.fabricacionSnapshot)) as FabricacionCotizacionSnapshot;
    (snapshot.result.vidrios[0] as unknown as { trazabilidad?: unknown }).trazabilidad = undefined;

    const [pane] = extractNormalizedGlassPanes({
      organizationId: 4,
      quoteId: 88,
      item: { ...item, fabricacionSnapshot: snapshot },
    });

    expect(pane).toMatchObject({ widthMm: 690, heightMm: 1390, quantity: 2 });
    expect(pane?.dimensionTraceRuleIds).toEqual([]);
  });

  it("rehidrata las seis unidades físicas esperadas desde resultados congelados sin multiplicarlas por la cantidad del componente", () => {
    const item = paneItem();
    const snapshot = JSON.parse(JSON.stringify(item.fabricacionSnapshot)) as FabricacionCotizacionSnapshot;
    snapshot.result.vidrios = [
      {
        vidrioId: "paño-fijo", nombre: "Paño fijo", anchoMm: 535, altoMm: 872,
        cantidadPiezas: 4, totalM2: 1.86608, trazabilidad: [],
      },
      {
        vidrioId: "paño-hoja", nombre: "Paño hoja", anchoMm: 600, altoMm: 1000,
        cantidadPiezas: 2, totalM2: 1.2, trazabilidad: [],
      },
    ];
    snapshot.vidrios = snapshot.result.vidrios;
    const persistedAndReopened = JSON.parse(JSON.stringify({
      ...item,
      cantidad: 1,
      fabricacionSnapshot: snapshot,
    })) as CotizacionWorkflowItem;

    const panes = extractNormalizedGlassPanes({ organizationId: 4, quoteId: 88, item: persistedAndReopened });
    expect(panes.map(({ widthMm, heightMm, quantity }) => ({ widthMm, heightMm, quantity }))).toEqual([
      { widthMm: 535, heightMm: 872, quantity: 4 },
      { widthMm: 600, heightMm: 1000, quantity: 2 },
    ]);
    expect(panes.reduce((sum, pane) => sum + pane.quantity, 0)).toBe(6);
    expect(panes.flatMap((pane) => pane.paneUnitIds)).toHaveLength(6);
    expect(panes.reduce((sum, pane) => sum + (pane.widthMm ?? 0) * (pane.heightMm ?? 0) * pane.quantity, 0)).toBe(3_066_080);
  });

  it("permite varias referencias manuales completas sin snapshot ni receta de perfiles", () => {
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const specA = buildCatalogGlassTechnicalSpec({ productId: "501", metadata });
    const specB = buildCatalogGlassTechnicalSpec({ productId: "502", metadata });
    const item = paneItem();
    item.fabricacionSnapshot = null;
    item.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-1",
      manualGlassMeasurements: { version: 1, entries: [
        { id: "manual-a", source: "manual", version: 1, productId: "501", technicalFingerprint: getCatalogGlassTechnicalFingerprint(specA), widthMm: 600, heightMm: 1000, quantity: 2, recordedAt: "2026-10-25T12:00:00Z" },
        { id: "manual-b", source: "manual", version: 1, productId: "502", technicalFingerprint: getCatalogGlassTechnicalFingerprint(specB), widthMm: 500, heightMm: 900, quantity: 1, recordedAt: "2026-10-25T12:00:00Z" },
      ] },
    });

    const panes = extractNormalizedGlassPanes({
      organizationId: 4,
      quoteId: 1248,
      item,
      catalogGlassProducts: new Map([
        ["501", { name: "Float 5 mm", catalogMetadata: metadata }],
        ["502", { name: "Laminado 5 mm", catalogMetadata: { ...metadata, categoriaTecnica: "monolitico" } }],
      ]),
    });

    expect(panes.map(({ glassId, widthMm, heightMm, quantity, dimensionProvenance, validationStatus }) => ({ glassId, widthMm, heightMm, quantity, dimensionProvenance, validationStatus }))).toEqual([
      { glassId: "manual-a", widthMm: 600, heightMm: 1000, quantity: 2, dimensionProvenance: "manual", validationStatus: "eligible_for_manual_planning" },
      { glassId: "manual-b", widthMm: 500, heightMm: 900, quantity: 1, dimensionProvenance: "manual", validationStatus: "eligible_for_manual_planning" },
    ]);
  });

  it("prioriza una receta automática válida sin borrar la medida manual persistida", () => {
    const item = paneItem();
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const spec = buildCatalogGlassTechnicalSpec({ productId: "glass-5mm", metadata });
    item.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-1",
      manualGlassMeasurements: { version: 1, entries: [
        { id: "manual-fallback", source: "manual", version: 1, productId: "glass-5mm", technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec), widthMm: 620, heightMm: 1010, quantity: 1, recordedAt: "2026-10-25T12:00:00Z" },
      ] },
    });

    const panes = extractNormalizedGlassPanes({
      organizationId: 4,
      quoteId: 1248,
      item,
      catalogGlassProducts: new Map([["glass-5mm", { name: "Float 5 mm", catalogMetadata: metadata }]]),
    });

    expect(panes).toHaveLength(1);
    expect(panes[0]).toMatchObject({ glassId: "sash-glass", widthMm: 690, heightMm: 1390, dimensionProvenance: "validated_recipe" });
    expect(JSON.stringify(decodeCotizacionItemPresentationMeta(item.observaciones).manualGlassMeasurements)).toContain("manual-fallback");
  });

  it("recupera la medida manual si el resultado automático deja de resolver ese producto", () => {
    const item = paneItem();
    const automaticSnapshot = JSON.parse(JSON.stringify(item.fabricacionSnapshot)) as FabricacionCotizacionSnapshot;
    automaticSnapshot.result.vidrios[0]!.anchoMm = 0;
    item.fabricacionSnapshot = automaticSnapshot;
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const spec = buildCatalogGlassTechnicalSpec({ productId: "glass-5mm", metadata });
    item.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-1",
      manualGlassMeasurements: { version: 1, entries: [
        { id: "manual-fallback", source: "manual", version: 1, productId: "glass-5mm", technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec), widthMm: 620, heightMm: 1010, quantity: 1, recordedAt: "2026-10-25T12:00:00Z" },
      ] },
    });

    const panes = extractNormalizedGlassPanes({
      organizationId: 4,
      quoteId: 1248,
      item,
      catalogGlassProducts: new Map([["glass-5mm", { name: "Float 5 mm", catalogMetadata: metadata }]]),
    });

    expect(panes).toHaveLength(1);
    expect(panes[0]).toMatchObject({ glassId: "manual-fallback", widthMm: 620, heightMm: 1010, quantity: 1, dimensionProvenance: "manual", validationStatus: "eligible_for_manual_planning" });
  });

  it("usa el respaldo manual si la receta válida solo cubre parte de los paños del mismo vidrio", () => {
    const item = paneItem();
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const spec = buildCatalogGlassTechnicalSpec({ productId: "glass-5mm", metadata });
    item.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-1",
      manualGlassMeasurements: { version: 2, expectedPaneCount: 2, configurationFingerprint: "two-panes", entries: [1, 2].map((index) => ({
        id: `manual-slot-${index}`, source: "manual" as const, version: 2 as const, productId: "glass-5mm",
        technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec), widthMm: 600 + index, heightMm: 1000,
        quantity: 1, quantityBasis: "per_component" as const, paneSlotId: `pane-${index}`, sourcePosition: `Paño ${index}`,
        rectangularVerified: true, recordedAt: "2026-10-25T12:00:00Z",
      })) },
    });
    const panes = extractNormalizedGlassPanes({
      organizationId: 4, quoteId: 1248, item,
      catalogGlassProducts: new Map([["glass-5mm", { name: "Float 5 mm", catalogMetadata: metadata }]]),
    });
    expect(panes).toHaveLength(2);
    expect(panes.every((pane) => pane.dimensionProvenance === "manual")).toBe(true);
    expect(panes.map((pane) => pane.paneSlotId)).toEqual(["pane-1", "pane-2"]);
  });

  it("combina V1 automática y V2 manual sin exigir despiece de perfiles para V2", () => {
    const automatic = paneItem();
    const manual = { ...paneItem(), id: "physical-row-2", codigo: "V2", nombre: "Paño fijo", fabricacionSnapshot: null };
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const spec = buildCatalogGlassTechnicalSpec({ productId: "502", metadata });
    manual.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-v2",
      manualGlassMeasurements: { version: 1, entries: [
        { id: "manual-fixed", source: "manual", version: 1, productId: "502", technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec), widthMm: 750, heightMm: 1600, quantity: 1, recordedAt: "2026-10-25T12:00:00Z" },
      ] },
    });

    const panes = extractNormalizedGlassPanesForOrganization({
      organizationId: 4,
      quoteId: 1248,
      items: [automatic, manual],
      catalogGlassProducts: new Map([["502", { name: "Float 5 mm", catalogMetadata: metadata }]]),
    });

    expect(panes.map(({ quoteItemId, widthMm, heightMm, dimensionProvenance, validationStatus }) => ({ quoteItemId, widthMm, heightMm, dimensionProvenance, validationStatus }))).toEqual([
      { quoteItemId: "physical-row-1", widthMm: 690, heightMm: 1390, dimensionProvenance: "validated_recipe", validationStatus: "eligible_for_manual_planning" },
      { quoteItemId: "physical-row-2", widthMm: 750, heightMm: 1600, dimensionProvenance: "manual", validationStatus: "eligible_for_manual_planning" },
    ]);
  });

  it("multiplica una sola vez los tres paños manuales por la cantidad cotizada", () => {
    const item = paneItem();
    item.fabricacionSnapshot = null;
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const spec = buildCatalogGlassTechnicalSpec({ productId: "501", metadata });
    item.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-1",
      manualGlassMeasurements: { version: 2, expectedPaneCount: 3, configurationFingerprint: "fixture", entries: [1, 2, 3].map((index) => ({
        id: `manual-${index}`, source: "manual" as const, version: 2 as const, productId: "501",
        technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec), widthMm: 600 + index,
        heightMm: 1000, quantity: 1, quantityBasis: "per_component" as const,
        paneSlotId: `pane-${index}`, sourcePosition: `Paño ${index}`, rectangularVerified: true,
        recordedAt: "2026-10-25T12:00:00Z",
      })) },
    });
    const panes = extractNormalizedGlassPanes({
      organizationId: 4, quoteId: 1248, item,
      catalogGlassProducts: new Map([["501", { name: "Float 5 mm", catalogMetadata: metadata }]]),
    });
    expect(panes.map((pane) => pane.quantity)).toEqual([2, 2, 2]);
    expect(panes.flatMap((pane) => pane.paneUnitIds)).toHaveLength(6);
  });

  it("excluye las geometrías no rectangulares de la optimización rectangular verificada", () => {
    const item = paneItem();
    item.fabricacionSnapshot = null;
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const spec = buildCatalogGlassTechnicalSpec({ productId: "glass-5mm", metadata });
    item.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-1",
      manualGlassMeasurements: { version: 2, entries: [{
        id: "manual-non-rectangular",
        source: "manual",
        version: 2,
        productId: "glass-5mm",
        technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec),
        widthMm: 600,
        heightMm: 1000,
        quantity: 1,
        quantityBasis: "per_component",
        rectangularVerified: false,
        recordedAt: "2026-10-25T12:00:00Z",
      }] },
    });

    const [pane] = extractNormalizedGlassPanes({
      organizationId: 4,
      quoteId: 1248,
      item,
      catalogGlassProducts: new Map([["glass-5mm", { name: "Float 5 mm", catalogMetadata: metadata }]]),
    });

    expect(pane).toMatchObject({ validationStatus: "requires_review" });
    expect(pane?.warnings).toContain("La geometría del paño no es rectangular y no se puede enviar como corte rectangular verificado.");
  });

  it("mantiene una referencia manual pendiente si su ficha técnica de catálogo cambió", () => {
    const metadata = { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 };
    const originalSpec = buildCatalogGlassTechnicalSpec({ productId: "501", metadata });
    const item = paneItem();
    item.fabricacionSnapshot = null;
    item.observaciones = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-component-1",
      manualGlassMeasurements: { version: 1, entries: [
        { id: "manual-a", source: "manual", version: 1, productId: "501", technicalFingerprint: getCatalogGlassTechnicalFingerprint(originalSpec), widthMm: 600, heightMm: 1000, quantity: 2, recordedAt: "2026-10-25T12:00:00Z" },
      ] },
    });

    const [pane] = extractNormalizedGlassPanes({
      organizationId: 4,
      quoteId: 1248,
      item,
      catalogGlassProducts: new Map([["501", { name: "Float actualizado", catalogMetadata: { ...metadata, planchaAnchoMm: 3000 } }]]),
    });

    expect(pane).toMatchObject({ dimensionProvenance: "manual", validationStatus: "requires_review", widthMm: 600, heightMm: 1000, quantity: 2 });
    expect(pane?.warnings.join(" ")).toMatch(/cambió/i);
  });
});
