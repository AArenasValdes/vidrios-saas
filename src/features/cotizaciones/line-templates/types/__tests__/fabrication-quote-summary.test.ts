import {
  serializeCubicationSnapshot,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { createEmptyQuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import {
  encodeCotizacionItemCubicationOverride,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";
import { VERATEC_7400_4H_CATALOG_KEY } from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  VERATEC_7400_SOURCE_REVISION,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";

import {
  buildFabricationQuoteSummary,
  formatFabricationItemLineCaption,
} from "../fabrication-quote-summary";

jest.mock("@/features/fabricacion/services/fabricacion-despiece-cotizacion.service", () => {
  const actual = jest.requireActual<typeof import("@/features/fabricacion/services/fabricacion-despiece-cotizacion.service")>(
    "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service"
  );
  return {
    ...actual,
    resolveFabricacionDespieceForQuoteItem: jest.fn(actual.resolveFabricacionDespieceForQuoteItem),
  };
});

function snapshot(
  overrides: Partial<CotizacionItemCubicationSnapshot> = {}
): CotizacionItemCubicationSnapshot {
  return {
    v: 1,
    source: "auto",
    lineTemplateId: "line-1",
    system: "corredera_2_hojas",
    status: "validada",
    widthMm: 1200,
    heightMm: 1000,
    quantity: 1,
    capturedAt: "2026-08-19T00:00:00.000Z",
    cuts: [
      {
        label: "Riel",
        functionLabel: "Riel superior",
        quantity: 1,
        lengthMm: 1200,
        totalLinealMm: 1200,
      },
    ],
    bars: [{ index: 1, usedMm: 1200, wasteMm: 4750, cuts: [] }],
    totalUsedMm: 1200,
    totalWasteMm: 4750,
    wastePct: 80,
    totalProfilesLinealMm: 10630,
    glass: { widthMm: 1100, heightMm: 900, quantity: 1, totalM2: 1.2 },
    accessoryUnits: 4,
    ...overrides,
  };
}

describe("fabrication quote summary", () => {
  it("incluye en cobertura los componentes activos con perfilería aunque no tengan snapshot", () => {
    const result = buildFabricationQuoteSummary([{
      id: "v1", codigo: "V1", tipo: "Ventana", nombre: "Corredera 4 hojas",
      lineaComercial: "Serie 5000", ancho: 1800, alto: 1500, cantidad: 1,
      observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "205", catalogLineKey: "ventora:l5000" }),
    }]);

    expect(result.profileCoverage).toMatchObject({
      status: "partial", jointPlanStatus: "blocked", requiredCount: 1, readyCount: 0,
      items: [{ itemId: "v1", state: "missing_snapshot", reason: expect.stringContaining("snapshot") }],
    });
  });

  it("no convierte un servicio libre llamado Instalación de ventanas en componente sin snapshot", () => {
    const freeItem = {
      id: "service-1", tipoItem: "item_libre_con_valor", tipo: "Item libre",
      codigo: "S1", nombre: "Instalación de ventanas", descripcion: "Servicio por total",
      ancho: null, alto: null, cantidad: 1, observaciones: "",
    };
    const windowItem = {
      id: "window-1", tipoItem: "componente", tipo: "Ventana", codigo: "V1",
      nombre: "Corredera 2 hojas", lineaComercial: "L5000", ancho: 1200, alto: 1000,
      cantidad: 1,
      observaciones: encodeCotizacionItemCubicationOverride(
        encodeCotizacionItemPresentationMeta({ lineTemplateId: "205", catalogLineKey: "ventora:l5000" }),
        snapshot({ status: "validada" })
      ),
    };

    const result = buildFabricationQuoteSummary([freeItem, windowItem]);

    expect(result.profileCoverage).toMatchObject({
      status: "partial", jointPlanStatus: "pending", requiredCount: 1, readyCount: 1, pendingCount: 0,
      items: [
        { itemId: "service-1", state: "not_required" },
        { itemId: "window-1", state: "ready" },
      ],
    });
  });

  it("detecta pivotante guardado solo en configuración contra identidad técnica corredera", () => {
    const result = buildFabricationQuoteSummary([{
      id: "pivot-config", codigo: "P1", tipo: "Puerta", nombre: "Puerta",
      lineaComercial: "Serie 5000", ancho: 1800, alto: 2100, cantidad: 1,
      observaciones: encodeCotizacionItemCubicationOverride(encodeCotizacionItemPresentationMeta({
        lineTemplateId: "205", catalogLineKey: "ventora:l5000", sistema: "",
        configuracion: "1 hoja pivotante", fabricacionTipologia: "corredera", fabricacionApertura: "corredera",
      }), snapshot({ status: "validada" })),
    }]);

    expect(result.profileCoverage?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "pivot-config", state: "incompatible" }),
    ]));
    expect(result.items[0]?.statusLabel).toContain("Identidad incompatible");
  });

  it("conserva un snapshot histórico pivotante/corredera para revisión y lo marca incompatible", () => {
    const frozen = snapshot({ system: "corredera_2_hojas" });
    const result = buildFabricationQuoteSummary([{
      id: "p1", codigo: "P1", tipo: "Puerta", nombre: "Puerta pivotante 1 hoja",
      lineaComercial: "Serie 5000", ancho: 1800, alto: 1500, cantidad: 1,
      observaciones: encodeCotizacionItemCubicationOverride(encodeCotizacionItemPresentationMeta({
        lineTemplateId: "205", catalogLineKey: "ventora:l5000", sistema: "Pivotante",
        fabricacionTipologia: "corredera", fabricacionApertura: "corredera",
      }), frozen),
    }]);

    expect(result.items[0]).toMatchObject({
      statusLabel: "Identidad incompatible · revisar snapshot histórico",
      operationalStatus: "incompatible",
      snapshot: { cuts: [{ functionLabel: "Riel superior" }] },
    });
    expect(result.profileCoverage?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "p1", state: "incompatible" }),
    ]));
    expect(frozen.cuts[0]).toMatchObject({ lengthMm: 1200, quantity: 1 });
  });

  it("detecta la incompatibilidad desde la identidad del snapshot formal persistido", () => {
    const formal = {
      schemaVersion: 1, tipo: "fabricacion_receta_snapshot", recipeId: "ventora:universal:l5000:estandar",
      recipeDefinitionId: "l5000-estandar", recipeVersion: 1, recipeStatus: "validated", recipeScope: "global",
      lineTemplateId: 205, recipeIdentity: { recetaId: "l5000", codigo: "L5000-2H", nombre: "L5000 base corredera", tipologia: "corredera", hojas: 2, modulos: 2, apertura: "corredera", herraje: null, variante: "estandar" },
      input: { anchoTotalMm: 1800, altoTotalMm: 1500, cantidad: 1 }, selectedVariant: "estandar",
      result: { accesorios: [], totalLinealMm: 1000 }, pauta: [{ codigoPerfil: "5001", nombrePerfil: "Riel", funcion: "Riel", cantidadPiezas: 2, medidaMm: 1800, totalLinealMm: 3600, trazabilidad: [] }],
      vidrios: [], advertencias: [], calculatedAt: "2026-10-31T00:00:00.000Z",
    } as unknown as FabricacionCotizacionSnapshot;
    const result = buildFabricationQuoteSummary([{
      id: "4216", codigo: "P1", tipo: "Puerta", nombre: "Puerta pivotante 1 hoja",
      lineaComercial: "Serie 5000", ancho: 1800, alto: 1500, cantidad: 1,
      fabricacionSnapshot: formal,
      observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "205", catalogLineKey: "ventora:l5000", sistema: "Pivotante" }),
    }]);

    expect(result.items[0]).toMatchObject({ operationalStatus: "incompatible", statusLabel: "Identidad incompatible · revisar snapshot histórico" });
    expect(result.profileCoverage?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "4216", state: "incompatible" }),
    ]));
  });

  it("distingue cortes válidos por componente de la distribución conjunta pendiente", () => {
    const rows = ["v1", "v2"].map((id) => ({
      id, codigo: id.toUpperCase(), tipo: "Ventana", nombre: "Corredera 2 hojas",
      lineaComercial: "L25", ancho: 1200, alto: 1000, cantidad: 1,
      observaciones: encodeCotizacionItemCubicationOverride(encodeCotizacionItemPresentationMeta({
        lineTemplateId: "135", catalogLineKey: "ventora:l25", fabricacionTipologia: "corredera",
      }), snapshot({ lineTemplateId: "135", status: "validada" })),
    }));
    const result = buildFabricationQuoteSummary(rows);

    expect(result.profileCoverage).toMatchObject({ status: "partial", jointPlanStatus: "pending" });
    expect(result.profileCoverage?.items.map((item) => item.state)).toEqual(["ready", "ready"]);
  });

  it("reconcilia un ID histórico de corte por código solo si identifica una partida única", () => {
    const row = {
      id: "persisted-v1", codigo: "V1", tipo: "Ventana", nombre: "Corredera 2 hojas",
      lineaComercial: "L5000", ancho: 1200, alto: 1000, cantidad: 1,
      observaciones: encodeCotizacionItemCubicationOverride(encodeCotizacionItemPresentationMeta({
        lineTemplateId: "135", fabricacionTipologia: "corredera",
      }), snapshot({ status: "validada" })),
    };
    const work: FabricacionTrabajoSnapshot = {
      schemaVersion: 1, tipo: "fabricacion_trabajo_snapshot", packing: "first_fit_decreasing_sugerido",
      capturedAt: "2026-10-01T00:00:00.000Z", itemCountWithPauta: 1, totalBars: 1,
      totalProfilesLinealMm: 1200, totalWasteMm: 4800, sourcePresentations: [],
      bars: [{ materialKey: "5001", presentationKey: "6m", codigoPerfil: "5001", nombrePerfil: "Riel", acabadoKey: "mate", lineaIds: [135], largoComercialMm: 6000, indice: 1, despunteInicialMm: 0, perdidaCorteMm: 0, usadoMm: 1200, sobranteMm: 4800, cortes: [{ itemId: "legacy-origin-id", codigoItem: "V1", nombreItem: "Corredera", componenteId: "riel", codigoPerfil: "5001", funcion: "Riel", corte: null, largoMm: 1200 }] }],
    };

    const unique = buildFabricationQuoteSummary([row], { trabajoSnapshot: work });
    const ambiguous = buildFabricationQuoteSummary([row, { ...row, id: "other-v1" }], { trabajoSnapshot: work });

    expect(unique.profileCoverage).toMatchObject({ status: "partial", jointPlanStatus: "theoretical" });
    expect(ambiguous.profileCoverage).toMatchObject({ status: "partial", jointPlanStatus: "blocked" });
  });

  it("clasifica como revisión un snapshot con cortes guardados en estado draft", () => {
    const result = buildFabricationQuoteSummary([{
      id: "draft-item", codigo: "V1", tipo: "Ventana", nombre: "Corredera 2 hojas",
      lineaComercial: "L5000", ancho: 1200, alto: 1000, cantidad: 1,
      observaciones: encodeCotizacionItemCubicationOverride(encodeCotizacionItemPresentationMeta({
        lineTemplateId: "135", catalogLineKey: "ventora:l5000", fabricacionTipologia: "corredera",
      }), snapshot({ status: "draft" })),
    }]);

    expect(result.items[0]).toMatchObject({ operationalStatus: "unvalidated", snapshot: { cuts: expect.any(Array) } });
    expect(result.profileCoverage).toMatchObject({ status: "partial", items: [{ itemId: "draft-item", state: "unvalidated" }] });
  });

  it("no materializa pauta con recetas actuales cuando la cotización guardada no tiene snapshots", () => {
    const summary = buildFabricationQuoteSummary([
      {
        id: "historical-item",
        codigo: "V7400",
        nombre: "Ventana",
        lineaComercial: "Veratec Sliding 7400",
        ancho: 1200,
        alto: 1500,
        cantidad: 1,
        observaciones: "",
      },
    ]);

    expect(summary.items).toHaveLength(0);
    expect(summary.trabajoSnapshot).toBeNull();
    expect(summary.totalBars).toBeNull();
  });

  it("expone línea y material por pieza sin mezclarlas", () => {
    const summary = buildFabricationQuoteSummary([
      {
        id: "v1",
        codigo: "V1",
        nombre: "Ventana corredera",
        lineaComercial: "L5000",
        observaciones: `[m:Aluminio][cub:${serializeCubicationSnapshot(
          snapshot({
            lineTemplateId: "l5000",
            totalProfilesLinealMm: 10000,
            bars: [{ index: 1, usedMm: 1000, wasteMm: 5000, cuts: [] }],
          })
        )}]`,
      },
      {
        id: "v2",
        codigo: "V2",
        nombre: "Ventana abatible",
        lineaComercial: "Serie 20",
        observaciones: `[m:PVC][cub:${serializeCubicationSnapshot(
          snapshot({
            lineTemplateId: "serie-20",
            totalProfilesLinealMm: 8000,
            glass: { widthMm: 1100, heightMm: 900, quantity: 1, totalM2: 0.9 },
            accessoryUnits: 2,
            bars: [
              { index: 1, usedMm: 1200, wasteMm: 4750, cuts: [] },
              { index: 2, usedMm: 1200, wasteMm: 4750, cuts: [] },
            ],
          })
        )}]`,
      },
      {
        id: "v3",
        codigo: "V3",
        nombre: "Ventana corredera",
        lineaComercial: "L25",
        observaciones: `[m:Aluminio][cub:${serializeCubicationSnapshot(
          snapshot({
            lineTemplateId: "l25",
            totalProfilesLinealMm: 12000,
          })
        )}]`,
      },
    ]);

    expect(summary.items.map((row) => row.codigo)).toEqual(["V1", "V2", "V3"]);
    expect(formatFabricationItemLineCaption(summary.items[0]!.lineName, summary.items[0]!.material)).toBe(
      "L5000 · Aluminio"
    );
    expect(formatFabricationItemLineCaption(summary.items[1]!.lineName, summary.items[1]!.material)).toBe(
      "Serie 20 · PVC"
    );
    expect(formatFabricationItemLineCaption(summary.items[2]!.lineName, summary.items[2]!.material)).toBe(
      "L25 · Aluminio"
    );
    expect(summary.items[0]!.profilesMl).not.toBe(summary.items[1]!.profilesMl);
    expect(summary.items[1]!.barCount).toBe(2);
    expect(summary.items[2]!.barCount).toBe(1);
    expect(summary.totalItems).toBe(3);
    expect(summary.items).toHaveLength(3);
  });

  it("muestra Sin línea cuando la pieza no tiene identidad de línea", () => {
    expect(formatFabricationItemLineCaption("", "")).toBe("Sin línea");
    expect(formatFabricationItemLineCaption("L25", "")).toBe("L25");
  });

  it("omite snapshots anteriores cuando la composición estructural cambió", () => {
    const adjustment = {
      ...createEmptyQuickCompositionAdjustment(),
      paneTypes: { "leaf-1": "fixed" as const },
    };
    const summary = buildFabricationQuoteSummary([
      {
        id: "edited-1",
        codigo: "V1",
        nombre: "Ventana ajustada",
        lineaComercial: "L5000",
        ancho: 1200,
        alto: 1000,
        cantidad: 1,
        observaciones: encodeCotizacionItemPresentationMeta({
          quickCompositionAdjustment: adjustment,
          cubicationSnapshot: snapshot(),
        }),
      },
    ], {
      recipes: [],
      organizationId: 1,
    });

    expect(summary.items).toHaveLength(0);
    expect(summary.compositionsPendingRecipe).toEqual([
      { itemId: "edited-1", codigo: "V1", nombre: "Ventana ajustada", lineName: "L5000" },
    ]);
    expect(summary.totalProfilesMl).toBe(0);
  });

  it("incluye el despiece base 7400 4H para cuatro hojas móviles en el resumen", () => {
    const adjustment = {
      ...createEmptyQuickCompositionAdjustment(),
      paneTypes: {
        "leaf-1": "sliding" as const,
        "leaf-2": "sliding" as const,
        "leaf-3": "sliding" as const,
        "leaf-4": "sliding" as const,
      },
    };
    const summary = buildFabricationQuoteSummary([
      {
        id: "veratec-4h",
        codigo: "V1",
        tipo: "Ventana",
        nombre: "Ventana corredera 4 hojas",
        lineaComercial: "Veratec 7400 — Corredera 4 hojas chicas",
        vidrio: "Incoloro monolítico 4 mm",
        ancho: 1222,
        alto: 1222,
        cantidad: 1,
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "1523",
          catalogLineKey: VERATEC_7400_4H_CATALOG_KEY,
          sistema: "Corredera",
          sheetScheme: "4 hojas",
          sheetVariant: "4 móviles",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 4,
          fabricacionModulos: 4,
          fabricacionVariante: "estandar",
          quickCompositionAdjustment: adjustment,
        }),
      },
    ], { recipes: [], organizationId: 10 });

    expect(summary.items).toHaveLength(1);
    expect(summary.items[0]?.snapshot.cuts.length).toBeGreaterThan(0);
    expect(summary.compositionsPendingRecipe).toHaveLength(0);
  });

  it("integra el adelanto geométrico 7400 en la pauta por componente con estado revisable", () => {
    const resolveDespieceMock = jest.mocked(resolveFabricacionDespieceForQuoteItem);
    resolveDespieceMock.mockClear();
    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: (() => { let id = 0; return () => `geometry-${id++}`; })(),
    });
    const recipe = {
      id: "veratec-7400-2h-structural",
      organizationId: 10,
      lineTemplateId: 1396,
      scope: "ventora" as const,
      providerName: "VERATEC",
      lineName: "Veratec 7400",
      typology: "corredera",
      leavesCount: 2,
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      version: 1,
      status: "draft" as const,
      definition,
      sourceType: "manufacturer" as const,
      sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      sourceRevision: VERATEC_7400_SOURCE_REVISION,
      parentRecipeId: null,
      validatedAt: null,
      validatedBy: null,
      createdAt: "2026-09-21T00:00:00.000Z",
      updatedAt: "2026-09-21T00:00:00.000Z",
      eliminadoEn: null,
    };
    const summary = buildFabricationQuoteSummary([{
      id: "7400-preliminary",
      codigo: "V7400",
      tipo: "Ventana",
      nombre: "Ventana corredera 2 hojas",
      lineaComercial: "Veratec 7400 — Corredera 2 hojas",
      vidrio: "Incoloro monolítico 5 mm",
      ancho: 1200,
      alto: 1500,
      cantidad: 1,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "1396",
        catalogLineKey: VERATEC_7400_CATALOG_KEY,
        sistema: "Corredera",
        sheetScheme: "2 hojas",
        sheetVariant: "2 móviles",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
      }),
    }], {
      recipes: [recipe],
      organizationId: 10,
      allowLiveFormal: false,
    });

    expect(summary.items).toHaveLength(1);
    expect(summary.items[0]).toMatchObject({
      itemId: "7400-preliminary",
      statusLabel: "Despiece estructural preliminar · acristalamiento pendiente",
      geometryOnly: true,
      snapshot: { estimationKind: "recipe_geometry_only" },
    });
    expect(summary.totalItems).toBe(1);
    expect(summary.totalProfilesMl).toBe(0);
    expect(resolveDespieceMock).toHaveBeenCalledTimes(1);
  });

  it("mantiene en la pauta el corte manual guardado para esa cotización", () => {
    const manual = snapshot({
      source: "manual",
      cuts: [{
        label: "7401",
        profileCode: "7401",
        profileName: "Marco corredera",
        functionLabel: "Marco",
        quantity: 2,
        lengthMm: 1498,
        totalLinealMm: 2996,
      }],
    });
    const summary = buildFabricationQuoteSummary([{
      id: "item-manual",
      codigo: "V1",
      nombre: "Ventana",
      lineaComercial: "Veratec 7400",
      observaciones: encodeCotizacionItemCubicationOverride(encodeCotizacionItemPresentationMeta({
        colorHex: "#a8a8a8",
        material: "Aluminio",
      }), manual),
    }]);

    expect(summary.items[0]?.snapshot.cuts[0]).toMatchObject({ profileCode: "7401", lengthMm: 1498 });
    expect(summary.items[0]?.statusLabel).toBe("Ajustada para esta cotización");
  });

  it("presenta el espesor técnico congelado por separado del nombre comercial", () => {
    const frozen = snapshot({ source: "manual" });
    const summary = buildFabricationQuoteSummary([{
      id: "item-glass-thickness",
      codigo: "V1",
      nombre: "Ventana",
      lineaComercial: "Veratec 7400",
      observaciones: encodeCotizacionItemCubicationOverride(encodeCotizacionItemPresentationMeta({
        glassTechnicalSpec: {
          version: 1,
          productId: "glass-1",
          thicknessMm: 6.38,
          category: "laminado",
          manualCutStatus: "pending_validation",
          technicalReviewConfirmed: false,
          sheetWidthMm: null,
          sheetHeightMm: null,
          provenance: "catalog",
          sourceProductId: "glass-1",
          sourceValues: null,
          hasConflict: false,
        },
        vidrioLineTemplateId: "glass-1",
      }), frozen),
    }]);

    expect(summary.items[0]).toMatchObject({ glassThickness: "6,38 mm", glassThicknessWarning: null });
  });
});
