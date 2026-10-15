import {
  getFabricationRecipeLineTemplateIdsForSnapshotResolution,
  prepareFabricacionSnapshotsForQuoteSave,
  resolveFabricacionSnapshotsIndependently,
  resolveFabricacionTrabajoSnapshotForQuoteSave,
  shouldResolveFabricationRecipesForQuoteSave,
  shouldResolveSupplierPresentationsForQuoteSave,
} from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import { buildConsolidatedCubicationPautaFromSnapshots } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";

function makeItemSnapshot(lengthMm = 2800) {
  return {
    lineTemplateId: 7400,
    pautaBarras: {
      calculable: true,
      barras: [{
        materialKey: "perfil:riel-01",
        codigoPerfil: "R-01",
        nombrePerfil: "Riel",
        indice: 1,
        largoComercialMm: 5800,
        despunteInicialMm: 0,
        usadoMm: lengthMm,
        perdidaCortesMm: 0,
        sobranteMm: 5800 - lengthMm,
        sobranteAprovechable: true,
        cortes: [{ componenteId: "riel", codigoPerfil: "R-01", funcion: "Riel superior", corte: null, largoMm: lengthMm }],
      }],
      advertencias: [],
      totalUsadoMm: lengthMm,
      totalPerdidaCortesMm: 0,
      totalSobranteMm: 5800 - lengthMm,
    },
  } as unknown as FabricacionCotizacionSnapshot;
}

const itemSnapshot = makeItemSnapshot();
const qaDraftSnapshot = {
  ...itemSnapshot,
  recipeId: "veratec-7400-draft",
  recipeVersion: 3,
  recipeStatus: "draft" as const,
  selectedVariant: "monolitico_4mm",
  qaPreliminary: {
    mode: "supplier_catalog_v1_qa_preliminary" as const,
    readiness: "lista_para_validar" as const,
    provenance: { sourceType: "manufacturer", sourceReference: "veratec:7400" },
  },
};
const existingGlobalSnapshot = construirFabricacionTrabajoSnapshot({
  capturedAt: "2026-09-01T12:00:00.000Z",
  items: [{
    id: "item-1",
    codigo: "V1",
    nombre: "Ventana",
    lineaComercial: "Veratec Sliding 7400",
    snapshot: itemSnapshot,
  }],
})!;

const carrier = {
  id: "item-1",
  codigo: "V1",
  nombre: "Ventana",
  lineaComercial: "Veratec Sliding 7400",
  snapshot: itemSnapshot,
};

function workflowItem(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  return {
    id: "item-1",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "Línea 20",
    vidrio: "Vidrio monolítico 5 mm",
    nombre: "Ventana corredera 2 hojas",
    descripcion: "2 hojas móviles",
    ancho: 1500,
    alto: 1600,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 2.4,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 144000,
    precioTotal: 144000,
    precioPorM2: 60000,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: 144000,
    precioAjustadoManual: false,
    origenPrecio: "plantilla",
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: "220",
      catalogLineKey: "ventora:l20",
      sistema: "Corredera",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
      sheetScheme: "2 hojas",
      sheetVariant: "2 móviles",
    }),
    fabricacionSnapshot: null,
    ...overrides,
  };
}

describe("fabricacion-trabajo-snapshot lifecycle", () => {
  it("resuelve presentaciones para altas, borradores y recalculo técnico, no al editar solo datos comerciales", () => {
    expect(shouldResolveSupplierPresentationsForQuoteSave()).toBe(true);
    expect(shouldResolveSupplierPresentationsForQuoteSave({ existingId: "draft-1", finalizingDraft: true })).toBe(true);
    expect(shouldResolveSupplierPresentationsForQuoteSave({ existingId: "quote-1", itemCountToResolve: 1 })).toBe(true);
    expect(shouldResolveSupplierPresentationsForQuoteSave({ existingId: "quote-1", shouldRebuildTrabajoSnapshot: true })).toBe(true);
    expect(shouldResolveSupplierPresentationsForQuoteSave({ existingId: "quote-1" })).toBe(false);
  });

  it("limita la lectura de recetas a líneas únicas de piezas que se resolverán", () => {
    const items = [
      workflowItem({ id: "linea-20" }),
      workflowItem({
        id: "linea-20-duplicada",
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "220",
          catalogLineKey: "ventora:l20",
        }),
      }),
      workflowItem({
        id: "linea-sin-id",
        observaciones: encodeCotizacionItemPresentationMeta({ catalogLineKey: "ventora:l35" }),
      }),
      workflowItem({ id: "ya-resuelta", observaciones: "" }),
    ];

    expect(getFabricationRecipeLineTemplateIdsForSnapshotResolution({
      items,
      itemIdsToResolve: new Set(["linea-20", "linea-20-duplicada", "linea-sin-id"]),
    })).toEqual([220]);
  });

  it("cotización histórica sin snapshots + editar notas conserva NULL y no resuelve recetas", () => {
    const existingId = "cotizacion-historica";

    expect(shouldResolveFabricationRecipesForQuoteSave({
      existingId,
      existingStatus: "creada",
      nextStatus: "creada",
    })).toBe(false);
    expect(
      resolveFabricacionTrabajoSnapshotForQuoteSave({
        existingId,
        existingSnapshot: null,
        capturedAt: "2026-09-30T12:00:00.000Z",
        items: [carrier],
      })
    ).toBeNull();
  });

  it("abrir el resumen interno de una cotización histórica no consulta recetas actuales", () => {
    // El resumen de una cotización persistida solo recibe snapshots congelados; no se habilita el resolver vivo.
    expect(shouldResolveFabricationRecipesForQuoteSave({
      existingId: "cotizacion-historica",
      existingStatus: "creada",
      nextStatus: "creada",
    })).toBe(false);
  });

  it("histórica con snapshot por ítem y global NULL no crea un snapshot global al guardar", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "cotizacion-historica",
      existingSnapshot: null,
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [carrier],
    });

    expect(result).toBeNull();
  });

  it("cotización nueva con receta sí captura un snapshot global", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [carrier],
    });

    expect(result).not.toBeNull();
    expect(result?.bars).toHaveLength(1);
    expect(result?.bars[0].cortes[0]?.codigoItem).toBe("V1");
  });

  it("calcula piezas nuevas agregadas al editar una cotización existente", () => {
    const savedItem = workflowItem({ id: "db-item-1", fabricacionSnapshot: itemSnapshot });
    const newlyAdded = workflowItem({ id: "draft-item-2", codigo: "V2" });
    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [savedItem],
      items: [savedItem, newlyAdded],
    });

    expect(prepared.itemIdsToResolve).toEqual(new Set(["draft-item-2"]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBe(itemSnapshot);
  });

  it("al finalizar un borrador resuelve piezas sin snapshot", () => {
    const draftItem = workflowItem({ id: "draft-item" });
    expect(shouldResolveFabricationRecipesForQuoteSave({
      existingId: "quote-draft",
      existingStatus: "borrador",
      nextStatus: "creada",
    })).toBe(true);

    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-draft",
      finalizingDraft: true,
      existingItems: [draftItem],
      items: [draftItem],
    });
    expect(prepared.itemIdsToResolve).toEqual(new Set(["draft-item"]));
  });

  it("recalcula una pieza modificada y limpia su snapshot anterior", () => {
    const oldItem = workflowItem({ fabricacionSnapshot: itemSnapshot });
    const editedItem = workflowItem({
      vidrio: "Termopanel 4+12+4 de 20 mm",
      fabricacionSnapshot: itemSnapshot,
    });
    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [oldItem],
      items: [editedItem],
    });

    expect(prepared.itemIdsToResolve).toEqual(new Set(["item-1"]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("vuelve a resolver L42 cuando se cambia expresamente de ALAR a Normal", () => {
    const metadata = (variant: string, recipeId: string) =>
      encodeCotizacionItemPresentationMeta({
        lineTemplateId: "210",
        catalogLineKey: "ventora:l42",
        sistema: "Proyectante",
        fabricacionTipologia: "proyectante",
        fabricacionHojas: 1,
        fabricacionModulos: 1,
        fabricacionVariante: variant,
        fabricationRecipeId: recipeId,
      });
    const previous = workflowItem({
      lineaComercial: "Serie 42",
      observaciones: metadata("alar_marco_4201", "1cf1fa7c-1a66-490a-af68-45401f39a349"),
      fabricacionSnapshot: null,
    });
    const changed = workflowItem({
      lineaComercial: "Serie 42",
      observaciones: metadata("normal", ""),
      fabricacionSnapshot: itemSnapshot,
    });
    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "1113",
      existingItems: [previous],
      items: [changed],
    });
    expect(prepared.itemIdsToResolve).toEqual(new Set(["item-1"]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("no completa una pauta histórica ausente al guardar cambios comerciales", () => {
    const oldItem = workflowItem();
    const unchangedTechnicalInput = workflowItem({ precioUnitario: 160000, precioTotal: 160000 });
    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [oldItem],
      items: [unchangedTechnicalInput],
    });

    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("preserva snapshot técnico previo aunque el formulario lo haya omitido", () => {
    const oldItem = workflowItem({ fabricacionSnapshot: itemSnapshot });
    const currentItem = workflowItem();
    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [oldItem],
      items: [currentItem],
    });

    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.items[0]?.fabricacionSnapshot).toBe(itemSnapshot);
  });

  it("reconstruye la pauta conjunta al guardar explícitamente una pieza histórica que no tenía snapshot", () => {
    const oldItem = workflowItem({ id: "item-20", fabricacionSnapshot: null });
    const acceptedItem = workflowItem({ id: "item-20", fabricacionSnapshot: itemSnapshot });
    const alreadySavedItem = workflowItem({
      id: "item-25",
      codigo: "V2",
      fabricacionSnapshot: makeItemSnapshot(1900),
    });
    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [oldItem, alreadySavedItem],
      items: [acceptedItem, alreadySavedItem],
    });

    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.shouldRebuildTrabajoSnapshot).toBe(true);

    const rebuilt = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "quote-1",
      existingSnapshot: existingGlobalSnapshot,
      forceRebuild: prepared.shouldRebuildTrabajoSnapshot,
      capturedAt: "2026-10-14T12:00:00.000Z",
      items: prepared.items.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        nombre: item.nombre,
        lineaComercial: item.lineaComercial,
        snapshot: item.fabricacionSnapshot ?? null,
      })),
    });

    expect(rebuilt?.itemCountWithPauta).toBe(2);
    expect(rebuilt?.bars.flatMap((bar) => bar.cortes.map((cut) => cut.codigoItem))).toEqual(
      expect.arrayContaining(["V1", "V2"])
    );
  });

  it("cotización nueva empaqueta antes con el SKU/largo comercial explícito", () => {
    const profileSnapshot = makeItemSnapshot(3000);
    profileSnapshot.pautaBarras!.barras[0]!.codigoPerfil = "67401VER";
    profileSnapshot.pautaBarras!.barras[0]!.cortes[0]!.codigoPerfil = "67401VER";
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-10-04T12:00:00.000Z",
      items: [{
        ...carrier,
        snapshot: profileSnapshot,
        supplierFamilyKey: "veratec:sliding-7400",
        requireSupplierPresentation: true,
        supplierPresentationSelections: [{
          technicalCode: "67401VER", status: "resolved", presentationId: "presentacion-negra",
          providerKey: "xelena", supplierSku: "67401VER200", finishCode: "200", finishName: "Negro",
          commercialLengthMm: 6800,
        }],
      }],
    });

    expect(result?.bars[0]).toMatchObject({
      supplierPresentationId: "presentacion-negra",
      supplierSku: "67401VER200",
      largoComercialMm: 6800,
    });
  });

  it("la revisión conjunta usa el largo de la presentación resuelta antes del packing", () => {
    const technicalSnapshot = makeItemSnapshot(3000);
    technicalSnapshot.pautaBarras!.barras[0]!.codigoPerfil = "67401VER";
    technicalSnapshot.pautaBarras!.barras[0]!.cortes[0]!.codigoPerfil = "67401VER";
    const reviewed = buildConsolidatedCubicationPautaFromSnapshots([{
      itemId: "item-1",
      codigo: "V1",
      lineaComercial: "Veratec Sliding 7400",
      snapshot: ({
          v: 2, source: "auto", lineTemplateId: "7400", system: "corredera_2_hojas",
          status: "lista_para_validar", widthMm: 1200, heightMm: 1500, quantity: 1,
          capturedAt: "2026-10-05T12:00:00.000Z", cuts: [], bars: [], totalUsedMm: 0,
          totalWasteMm: 0, wastePct: 0, totalProfilesLinealMm: 3000, glass: null,
          accessoryUnits: 0, estimationKind: "recipe",
      } as unknown) as CotizacionItemCubicationSnapshot,
      catalogLineKey: "ventora:veratec-7400-corredera",
      fabricacionSnapshot: {
        ...technicalSnapshot,
        supplierFamilyKey: "veratec:sliding-7400",
      } as unknown as FabricacionCotizacionSnapshot,
      colorHex: "#f0eeeb",
    }], null, {
      supplierPresentationResolutionEnabled: true,
      supplierPresentationSelections: {
        "item-1": [{
          technicalCode: "67401VER", status: "resolved", presentationId: "private-6000",
          providerKey: "taller:3", supplierSku: "QA-ORG3-7401-BLANCO-6000-20261005",
          finishCode: null, finishName: "Blanco", commercialLengthMm: 6000,
        }],
      },
    });

    expect(reviewed.trabajoSnapshot?.bars[0]).toMatchObject({
      supplierPresentationId: "private-6000",
      supplierSku: "QA-ORG3-7401-BLANCO-6000-20261005",
      largoComercialMm: 6000,
    });
  });

  it("la pauta global nueva conserva procedencia de la receta draft preliminar QA", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-10-01T12:00:00.000Z",
      items: [{ ...carrier, snapshot: qaDraftSnapshot }],
    });

    expect(result?.qaPreliminary).toEqual({
      mode: "supplier_catalog_v1_qa_preliminary",
      items: [{
        itemId: "item-1",
        recipeId: "veratec-7400-draft",
        recipeVersion: 3,
        variantKey: "monolitico_4mm",
        recipeStatus: "draft",
        readiness: "lista_para_validar",
        sourceType: "manufacturer",
        sourceReference: "veratec:7400",
      }],
    });
  });

  it("reabrir una cotización conserva el snapshot global aunque la receta haya cambiado", () => {
    const reopened = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "cotizacion-historica",
      existingSnapshot: existingGlobalSnapshot,
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [{
        ...carrier,
        snapshot: makeItemSnapshot(3000),
        requireSupplierPresentation: true,
        supplierPresentationSelections: [{
          technicalCode: "R-01", status: "resolved", presentationId: "new-sku",
          providerKey: "xelena", supplierSku: "NEW-6800", finishCode: "200", finishName: "Negro",
          commercialLengthMm: 6800,
        }],
      }],
    });

    expect(reopened).toBe(existingGlobalSnapshot);
  });

  it("finalizar un borrador vuelve a consolidar la pauta desde snapshots por componente", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "quote-draft",
      existingSnapshot: null,
      forceRebuild: true,
      capturedAt: "2026-10-11T12:00:00.000Z",
      items: [carrier],
    });

    expect(result?.itemCountWithPauta).toBe(1);
    expect(result?.bars.length).toBeGreaterThan(0);
  });

  it("una pieza sin pauta o con error no bloquea los snapshots de las demás", () => {
    const items = [
      workflowItem({ id: "linea-35" }),
      workflowItem({ id: "linea-20" }),
      workflowItem({ id: "linea-42" }),
    ];
    const errors: string[] = [];
    const resolved = resolveFabricacionSnapshotsIndependently({
      items,
      itemIdsToResolve: new Set(items.map((item) => item.id)),
      resolveSnapshot: (item) => {
        if (item.id === "linea-35") return null;
        if (item.id === "linea-20") throw new Error("receta incompatible");
        return itemSnapshot;
      },
      onItemError: (item) => errors.push(item.id),
    });

    expect(resolved.map((item) => item.fabricacionSnapshot ?? null)).toEqual([
      null,
      null,
      itemSnapshot,
    ]);
    expect(errors).toEqual(["linea-20"]);
  });

  it("una cotización sin fabricación sigue siendo guardable sin snapshot", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [],
    });

    expect(result).toBeNull();
    expect(shouldResolveFabricationRecipesForQuoteSave()).toBe(true);
  });
});
