import {
  buildFabricacionSnapshotSyncKey,
  construirSnapshotFabricacionCotizacion,
  fabricacionSnapshotMatchesCalculatedOutput,
  shouldPreserveFrozenFabricationSnapshot,
} from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { resolveVeratecWorkbookFallback } from "@/features/fabricacion/services/fabricacion-receta-veratec-fallback.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { prepareFabricacionSnapshotsForQuoteSave } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function makePersistedOrgRecipe(overrides: Partial<FabricationRecipeRecord> = {}): FabricationRecipeRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: 1,
    lineTemplateId: 20,
    scope: "organization",
    providerName: "Taller",
    lineName: "L20",
    typology: "corredera",
    leavesCount: 2,
    variant: "estandar",
    version: 1,
    status: "validated",
    definition: {
      version: 1,
      estado: "validada",
      identidad: {
        recetaId: "22222222-2222-4222-8222-222222222222",
        codigo: "TALLER-L20-2H",
        nombre: "L20 Taller 2H",
        tipologia: "corredera",
        hojas: 2,
        modulos: 2,
        apertura: "corredera",
        herraje: "estandar",
        variante: "estandar",
      },
      perfiles: [
        {
          id: "riel-sup-persistido",
          codigoPerfil: "2001",
          nombrePerfil: "Riel superior",
          funcion: "Riel superior",
          reglaMedida: { base: "ancho_total", ajusteMm: 0, factor: 1 },
          reglaCantidad: { tipo: "fija", cantidad: 1 },
          requerido: true,
          corte: "90",
        },
      ],
      vidrios: [
        {
          id: "vidrio-hoja-persistido",
          nombre: "Vidrio hoja",
          reglaAncho: { base: "ancho_total", ajusteMm: -80, factor: 0.5 },
          reglaAlto: { base: "alto_total", ajusteMm: -90, factor: 1 },
          reglaCantidad: { tipo: "por_hoja", cantidad: 1 },
          requerido: true,
        },
      ],
      accesorios: [],
      notasValidacion: [],
    },
    sourceType: "workshop",
    sourceReference: "taller:personalizada:l20",
    sourceName: "Taller",
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: "2026-10-01T00:00:00.000Z",
    validatedBy: "user-1",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    eliminadoEn: null,
    ...overrides,
  };
}

describe("snapshot identidad y estabilidad histórica", () => {
  it("estabiliza IDs y timestamps de fallbacks Veratec y Universal entre ejecuciones", () => {
    const veratecFirst = resolveVeratecWorkbookFallback({
      catalogKey: "ventora:veratec-7400-corredera",
      lineTemplateId: 7400,
      organizationId: 1,
      lineName: "Veratec 7400",
      variant: "monolitico_4mm",
      recipes: [],
    });
    const veratecSecond = resolveVeratecWorkbookFallback({
      catalogKey: "ventora:veratec-7400-corredera",
      lineTemplateId: 7400,
      organizationId: 1,
      lineName: "Veratec 7400",
      variant: "monolitico_4mm",
      recipes: [],
    });

    expect(veratecFirst).toHaveLength(1);
    expect(veratecFirst[0]!.createdAt).toBe(veratecSecond[0]!.createdAt);
    expect(veratecFirst[0]!.definition.perfiles.map((p) => p.id)).toEqual(
      veratecSecond[0]!.definition.perfiles.map((p) => p.id)
    );
    expect(veratecFirst[0]!.definition.vidrios.map((v) => v.id)).toEqual(
      veratecSecond[0]!.definition.vidrios.map((v) => v.id)
    );

    const universalFirst = resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l20",
      lineTemplateId: 20,
      organizationId: 1,
      lineName: "L20",
      variant: "estandar",
      recipes: [],
    });
    const universalSecond = resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l20",
      lineTemplateId: 20,
      organizationId: 1,
      lineName: "L20",
      variant: "estandar",
      recipes: [],
    });

    expect(universalFirst).toHaveLength(1);
    expect(universalFirst[0]!.definition.perfiles.map((p) => p.id)).toEqual(
      universalSecond[0]!.definition.perfiles.map((p) => p.id)
    );
  });

  it("tolera UUIDs volátiles históricos en recetas fallback sin falsos positivos", () => {
    const [recipe] = resolveVeratecWorkbookFallback({
      catalogKey: "ventora:veratec-7400-corredera",
      lineTemplateId: 7400,
      organizationId: 1,
      lineName: "Veratec 7400",
      variant: "monolitico_4mm",
      recipes: [],
    });
    expect(recipe).toBeDefined();

    const currentRecalculated = construirSnapshotFabricacionCotizacion({
      recipe: recipe!,
      entrada: {
        anchoTotalMm: 1500,
        altoTotalMm: 1200,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "monolitico_4mm",
      },
      calculatedAt: "2026-11-22T12:00:00.000Z",
    });

    // Simula un snapshot histórico guardado antes de determinizar los fallbacks,
    // cuando cada perfil y vidrio recibía un crypto.randomUUID() distinto.
    const historicalWithVolatileUuids = structuredClone(currentRecalculated);
    historicalWithVolatileUuids.calculatedAt = "2026-10-01T10:00:00.000Z";
    historicalWithVolatileUuids.recipeIdentity.recetaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const idMap = new Map<string, string>();
    historicalWithVolatileUuids.result.perfiles = historicalWithVolatileUuids.result.perfiles.map(
      (perfil, index) => {
        const volatileId = `bbbbbbbb-bbbb-4bbb-8bbb-${String(index).padStart(12, "0")}`;
        idMap.set(perfil.componenteId, volatileId);
        return { ...perfil, componenteId: volatileId };
      }
    );
    historicalWithVolatileUuids.result.vidrios = historicalWithVolatileUuids.result.vidrios.map(
      (vidrio, index) => ({
        ...vidrio,
        vidrioId: `cccccccc-cccc-4ccc-8ccc-${String(index).padStart(12, "0")}`,
      })
    );
    if (historicalWithVolatileUuids.pautaBarras) {
      historicalWithVolatileUuids.pautaBarras.barras =
        historicalWithVolatileUuids.pautaBarras.barras.map((barra) => ({
          ...barra,
          cortes: barra.cortes.map((corte) => ({
            ...corte,
            componenteId: idMap.get(corte.componenteId) ?? corte.componenteId,
          })),
        }));
    }

    expect(
      fabricacionSnapshotMatchesCalculatedOutput(
        historicalWithVolatileUuids,
        currentRecalculated
      )
    ).toBe(true);
    expect(buildFabricacionSnapshotSyncKey("item-1", historicalWithVolatileUuids)).toBe(
      buildFabricacionSnapshotSyncKey("item-1", currentRecalculated)
    );
  });

  it("conserva la sensibilidad ante IDs técnicos/persistidos reales y cambios efectivos", () => {
    const recipe = makePersistedOrgRecipe();
    const base = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "estandar",
      },
    });

    const changedGlassId = structuredClone(base);
    changedGlassId.result.vidrios[0]!.vidrioId = "vidrio-fijo-persistido";
    expect(fabricacionSnapshotMatchesCalculatedOutput(base, changedGlassId)).toBe(false);
    expect(buildFabricacionSnapshotSyncKey("item-1", base)).not.toBe(
      buildFabricacionSnapshotSyncKey("item-1", changedGlassId)
    );

    const changedComponentId = structuredClone(base);
    changedComponentId.result.perfiles[0]!.componenteId = "riel-sup-alternativo";
    expect(fabricacionSnapshotMatchesCalculatedOutput(base, changedComponentId)).toBe(false);

    const changedMeasure = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: { ...base.input, anchoTotalMm: 1250 },
    });
    expect(fabricacionSnapshotMatchesCalculatedOutput(base, changedMeasure)).toBe(false);

    const changedQuantity = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: { ...base.input, cantidad: 2 },
    });
    expect(fabricacionSnapshotMatchesCalculatedOutput(base, changedQuantity)).toBe(false);

    const changedProfileCode = structuredClone(base);
    changedProfileCode.result.perfiles[0]!.codigoPerfil = "2099";
    expect(fabricacionSnapshotMatchesCalculatedOutput(base, changedProfileCode)).toBe(false);
  });

  it("preserva snapshots históricos congelados en reapertura y edición comercial menor", () => {
    const oldRecipe = makePersistedOrgRecipe({ version: 1 });
    const updatedRecipe = makePersistedOrgRecipe({ version: 2 });
    updatedRecipe.definition.perfiles[0]!.codigoPerfil = "2099-NUEVO";

    const historicalSnapshot = construirSnapshotFabricacionCotizacion({
      recipe: oldRecipe,
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "estandar",
      },
      calculatedAt: "2026-09-01T10:00:00.000Z",
    });

    const recalculatedFromNewRecipe = construirSnapshotFabricacionCotizacion({
      recipe: updatedRecipe,
      entrada: historicalSnapshot.input,
      calculatedAt: "2026-11-22T12:00:00.000Z",
    });

    // Aunque la receta vigente cambió de versión/código, las entradas técnicas no cambiaron:
    expect(
      fabricacionSnapshotMatchesCalculatedOutput(historicalSnapshot, recalculatedFromNewRecipe)
    ).toBe(false);
    expect(
      shouldPreserveFrozenFabricationSnapshot(historicalSnapshot, recalculatedFromNewRecipe)
    ).toBe(true);

    // Si cambia una entrada técnica (ej. ancho), sí debe permitir recalcular:
    const recalculatedWithNewWidth = construirSnapshotFabricacionCotizacion({
      recipe: updatedRecipe,
      entrada: { ...historicalSnapshot.input, anchoTotalMm: 1350 },
    });
    expect(
      shouldPreserveFrozenFabricationSnapshot(historicalSnapshot, recalculatedWithNewWidth)
    ).toBe(false);

    // En guardado tras edición comercial menor (ej. precio/nombre), lifecycle no reemplaza ni reconstruye:
    const savedItem: CotizacionWorkflowItem = {
      id: "item-hist-1",
      codigo: "V1",
      tipo: "Ventana",
      lineaComercial: "L20",
      vidrio: "Monolítico 4mm",
      nombre: "Ventana living",
      descripcion: "",
      ancho: 1200,
      alto: 1000,
      cantidad: 1,
      unidad: "unidad",
      areaM2: 1.2,
      costoProveedorUnitario: 0,
      costoProveedorTotal: 0,
      margenPct: 0,
      precioUnitario: 120000,
      precioTotal: 120000,
      precioPorM2: 100000,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: 120000,
      precioAjustadoManual: false,
      origenPrecio: "plantilla",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "20",
        catalogLineKey: "ventora:l20",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionVariante: "estandar",
      }),
      fabricacionSnapshot: historicalSnapshot,
    };
    const minorCommercialEdit: CotizacionWorkflowItem = {
      ...savedItem,
      precioUnitario: 135000,
      precioTotal: 135000,
      precioAjustadoManual: true,
      origenPrecio: "manual",
    };

    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "cot-hist-1",
      existingItems: [savedItem],
      items: [minorCommercialEdit],
    });
    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.shouldRebuildTrabajoSnapshot).toBe(false);
    expect(prepared.items[0]?.fabricacionSnapshot).toBe(historicalSnapshot);
  });
});
