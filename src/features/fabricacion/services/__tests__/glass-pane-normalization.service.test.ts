import { extractNormalizedGlassPanes } from "@/features/fabricacion/services/glass-pane-normalization.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

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
});
