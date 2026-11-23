import { crearRecetaWinHouseS60Candidata, WINHOUSE_S60_VARIANTS } from "@/features/fabricacion/fixtures/winhouse-s60-recipes";
import { resolveVeratecWorkbookFallback } from "@/features/fabricacion/services/fabricacion-receta-veratec-fallback.service";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import {
  ensureLogicalComponentIdsForQuoteSave,
  getFabricationRecipeLineTemplateIdsForSnapshotResolution,
  prepareFabricacionSnapshotsForQuoteSave,
  resolveFabricacionSnapshotsIndependently,
  resolveFabricacionTrabajoSnapshotForQuoteSave,
  shouldResolveFabricationRecipesForQuoteSave,
  shouldResolveSupplierPresentationsForQuoteSave,
} from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";
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

  it("guardar parámetros del taller no reescribe snapshots históricos al abrir, recargar y persistir datos comerciales", () => {
    const frozenItem = workflowItem({ fabricacionSnapshot: itemSnapshot });
    const frozenWorkSnapshot = existingGlobalSnapshot;
    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "cotizacion-historica",
      existingItems: [frozenItem],
      items: [{ ...frozenItem }],
    });
    const workSnapshotAfterSave = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "cotizacion-historica",
      existingSnapshot: frozenWorkSnapshot,
      capturedAt: "2026-11-15T12:00:00.000Z",
      items: [{ ...carrier, snapshot: prepared.items[0]?.fabricacionSnapshot ?? null }],
    });

    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.items[0]?.fabricacionSnapshot).toEqual(itemSnapshot);
    expect(workSnapshotAfterSave).toBe(frozenWorkSnapshot);

    // Reopening/rehydration reads the persisted values; it does not resolve current recipes.
    const reloadedItem = workflowItem({ fabricacionSnapshot: structuredClone(prepared.items[0]?.fabricacionSnapshot) });
    expect(reloadedItem.fabricacionSnapshot).toEqual(itemSnapshot);
    expect(reloadedItem).toMatchObject({
      ancho: frozenItem.ancho,
      alto: frozenItem.alto,
      cantidad: frozenItem.cantidad,
      vidrio: frozenItem.vidrio,
      precioUnitario: frozenItem.precioUnitario,
      precioTotal: frozenItem.precioTotal,
    });
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

  it("invalida el snapshot si cambia solo el producto de vidrio o su espesor congelado", () => {
    const saved = workflowItem({
      fabricacionSnapshot: itemSnapshot,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "220",
        vidrioLineTemplateId: "glass-1",
        catalogEspesor: "4 mm",
      }),
    });
    const changedProduct = {
      ...saved,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "220",
        vidrioLineTemplateId: "glass-2",
        catalogEspesor: "4 mm",
      }),
    };
    const changedThickness = {
      ...saved,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "220",
        vidrioLineTemplateId: "glass-1",
        catalogEspesor: "5 mm",
      }),
    };

    for (const changed of [changedProduct, changedThickness]) {
      const prepared = prepareFabricacionSnapshotsForQuoteSave({
        existingId: "quote-1",
        existingItems: [saved],
        items: [changed],
      });
      expect(prepared.itemIdsToResolve).toEqual(new Set(["item-1"]));
      expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
    }

    const structuredThicknessChange = {
      ...saved,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "220",
        vidrioLineTemplateId: "glass-1",
        catalogEspesor: "4 mm",
        glassTechnicalSpec: {
          version: 1 as const,
          productId: "glass-1",
          thicknessMm: 5,
          category: "monolitico" as const,
          manualCutStatus: "pending_validation" as const,
          sheetWidthMm: null,
          sheetHeightMm: null,
          provenance: "catalog" as const,
          sourceProductId: "glass-1",
          sourceValues: null,
          hasConflict: false,
        },
      }),
    };
    expect(prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [saved],
      items: [structuredThicknessChange],
    }).itemIdsToResolve).toEqual(new Set(["item-1"]));
  });

  it("asigna IDs lógicos al guardar y conserva IDs existentes entre reemplazos", () => {
    const withoutId = workflowItem();
    const firstSave = ensureLogicalComponentIdsForQuoteSave([withoutId]);
    const assignedId = firstSave[0] && decodeCotizacionItemPresentationMeta(firstSave[0].observaciones).logicalComponentId;
    expect(assignedId).toMatch(/^[0-9a-f-]{36}$/i);

    const physicalRowReplacement = ensureLogicalComponentIdsForQuoteSave([
      { ...firstSave[0]!, id: "new-physical-row-id" },
    ]);
    expect(decodeCotizacionItemPresentationMeta(physicalRowReplacement[0]!.observaciones).logicalComponentId)
      .toBe(assignedId);
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

  it.each([
    ["configuración", "fabricacionConfiguracionId" as const],
    ["composición", "fabricacionComposicionId" as const],
  ])("invalida la pauta anterior al cambiar la identidad de %s", (_label, identityField) => {
    const metadata = (identity: string) => encodeCotizacionItemPresentationMeta({
      lineTemplateId: "220",
      catalogLineKey: "universal:aluminio:l20",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      [identityField]: identity,
    });
    const previous = workflowItem({
      observaciones: metadata("configuracion-a"),
      fabricacionSnapshot: itemSnapshot,
    });
    const changed = workflowItem({
      observaciones: metadata("configuracion-b"),
      fabricacionSnapshot: itemSnapshot,
    });

    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [previous],
      items: [changed],
    });

    expect(prepared.itemIdsToResolve).toEqual(new Set(["item-1"]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("conserva el snapshot de L20 ante cambios solo comerciales de nombre y descripción", () => {
    const previous = workflowItem({ fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, nombre: "Ventana comedor", descripcion: "Marco blanco", precioUnitario: 99999 };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.items[0]?.fabricacionSnapshot).toBe(itemSnapshot);
    expect(prepared.shouldRebuildTrabajoSnapshot).toBe(false);
  });

  it("comprueba que edición comercial de L20 no cambia despiece resuelto", () => {
    const previous = workflowItem();
    const edited = { ...previous, nombre: "Ventana comedor", descripcion: "Marco blanco" };
    const resolve = (item: CotizacionWorkflowItem) => resolveFabricacionDespieceForQuoteItem({
      item, recipes: [], organizationId: 1, lineTemplateId: 220, lineCatalogKey: "ventora:l20",
    });
    const before = resolve(previous);
    const after = resolve(edited);
    expect(before.estado).toBe("calculado");
    expect(after.estado).toBe("calculado");
    const cuts = (result: typeof before) => result.formal?.result.perfiles.map((profile) => ({
      codigo: profile.codigoPerfil, funcion: profile.funcion,
      medidaMm: profile.medidaMm, cantidad: profile.cantidadPiezas,
    }));
    expect(cuts(before)?.length).toBeGreaterThan(0);
    expect(cuts(after)).toEqual(cuts(before));
  });
  it("invalida L20 legacy cuando el texto cambia la tipología inferida", () => {
    const meta = encodeCotizacionItemPresentationMeta({ lineTemplateId: "220", catalogLineKey: "ventora:l20" });
    const previous = workflowItem({ observaciones: meta, nombre: "Ventana corredera", descripcion: "", fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, nombre: "Ventana proyectante" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("invalida L20 legacy cuando el texto cambia la cantidad inferida de hojas", () => {
    const meta = encodeCotizacionItemPresentationMeta({ lineTemplateId: "220", catalogLineKey: "ventora:l20", fabricacionTipologia: "corredera" });
    const previous = workflowItem({ observaciones: meta, nombre: "Ventana corredera 2 hojas", descripcion: "", fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, nombre: "Ventana corredera 3 hojas" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("invalida si el nuevo nombre introduce un conflicto pivotante", () => {
    const previous = workflowItem({ tipo: "Puerta", nombre: "Puerta corredera", fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, nombre: "Puerta pivotante" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("mantiene comparación conservadora del texto de familias especiales", () => {
    const meta = encodeCotizacionItemPresentationMeta({ lineTemplateId: "5200", catalogLineKey: "ventora:veratec-bahar-5200-ventana-exterior", fabricacionTipologia: "abatible" });
    const previous = workflowItem({ observaciones: meta, lineaComercial: "Bahar 5200", nombre: "Ventana abatible", fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, nombre: "Ventana proyectante" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });
  it.each(["veratec", "winhouse"] as const)("conserva snapshot legacy %s al editar solo descripción comercial", (system) => {
    const isS60 = system === "winhouse";
    const lineTemplateId = isS60 ? 560 : 1396;
    const catalogKey = isS60 ? "ventora:winhouse-s60" : "ventora:veratec-7400-corredera";
    const lineName = isS60 ? "WinHouse S60" : "Veratec 7400";
    const baseRecipe = resolveVeratecWorkbookFallback({ catalogKey: "ventora:veratec-7400-corredera", lineTemplateId: 1396, organizationId: 1, lineName: "Veratec 7400", variant: "monolitico_4mm", recipes: [] })[0]!;
    const variant = WINHOUSE_S60_VARIANTS.fijoMonolitico;
    const privateRecipe = { ...baseRecipe, id: "private-s60-fijo", lineTemplateId: 560, scope: "organization" as const, lineName, typology: "pano_fijo" as const, leavesCount: 1, variant, status: "draft" as const, definition: crearRecetaWinHouseS60Candidata({ lineName, variant }), sourceReference: "taller:personalizada:s60" };
    const recipes = isS60 ? [privateRecipe] : [];
    const previous = workflowItem({ lineaComercial: lineName, vidrio: "Monolítico 4 mm", nombre: "Ventana", descripcion: isS60 ? "fijo" : "Corredera 2 hojas", ancho: 1200, alto: 1500, observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: String(lineTemplateId), catalogLineKey: catalogKey, sistema: isS60 ? "Fijo" : "Corredera", fabricacionHojas: isS60 ? 1 : 2, fabricacionModulos: isS60 ? 1 : 2 }) });
    const resolve = (item: CotizacionWorkflowItem) => resolveFabricacionDespieceForQuoteItem({ item, recipes, organizationId: 1, lineTemplateId, lineCatalogKey: catalogKey });
    const initial = resolve(previous);
    expect(initial.estado).toBe("calculado");
    const saved = { ...previous, fabricacionSnapshot: initial.formal };
    const edited = { ...saved, descripcion: `${saved.descripcion} - entrega coordinada` };
    const direct = resolve({ ...edited, fabricacionSnapshot: null });
    expect(direct.estado).toBe("calculado");
    const cuts = (value: typeof initial) => value.formal?.result.perfiles.map((profile) => [profile.codigoPerfil, profile.medidaMm, profile.cantidadPiezas]);
    expect(cuts(direct)).toEqual(cuts(initial));
    const glass = (value: typeof initial) => value.formal?.result.vidrios.map((pane) => [pane.nombre, pane.anchoMm, pane.altoMm, pane.cantidadPiezas]);
    expect(glass(direct)).toEqual(glass(initial));
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [saved], items: [edited] });
    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.items[0]?.fabricacionSnapshot).toEqual(saved.fabricacionSnapshot);
    const renamed = { ...saved, nombre: "Ventana comedor" };
    const renamedLive = resolve({ ...renamed, fabricacionSnapshot: null });
    expect(cuts(renamedLive)).toEqual(cuts(initial));
    const renamedSave = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [saved], items: [renamed] });
    expect(renamedSave.itemIdsToResolve.size).toBe(0);
    expect(renamedSave.items[0]?.fabricacionSnapshot).toEqual(saved.fabricacionSnapshot);
    const reopened = structuredClone(prepared.items[0]!);
    expect(prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: prepared.items, items: [reopened] }).items[0]?.fabricacionSnapshot).toEqual(saved.fabricacionSnapshot);
    if (isS60) {
      const technical = { ...saved, descripcion: "proyectante" };
      const changed = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [saved], items: [technical] });
      expect(changed.itemIdsToResolve).toEqual(new Set([saved.id]));
      expect(changed.items[0]?.fabricacionSnapshot).toBeNull();
      expect(resolve({ ...technical, fabricacionSnapshot: null }).estado).toBe("sin_receta");
    }
  });
  it("conserva snapshot L32 estructurado al cambiar solo el nombre comercial", () => {
    const item = workflowItem({ lineaComercial: "L32", vidrio: "Monolítico 4 mm", nombre: "Ventana oficina", descripcion: "Proyectante", ancho: 1200, alto: 1000, observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "32", catalogLineKey: "ventora:l32", sistema: "Proyectante", fabricacionTipologia: "proyectante", fabricacionHojas: 1, fabricacionModulos: 1, fabricacionVariante: "normal" }) });
    const resolve = (piece: CotizacionWorkflowItem) => resolveFabricacionDespieceForQuoteItem({ item: piece, recipes: [], organizationId: 1, lineTemplateId: 32, lineCatalogKey: "ventora:l32" });
    const initial = resolve(item);
    expect(initial.estado).toBe("calculado");
    const historical = { ...item, fabricacionSnapshot: initial.formal };
    const renamed = { ...historical, nombre: "Ventana dormitorio" };
    const current = resolve({ ...renamed, fabricacionSnapshot: null });
    const cuts = (value: typeof initial) => value.formal?.result.perfiles.map((profile) => [profile.codigoPerfil, profile.medidaMm, profile.cantidadPiezas]);
    expect(current.estado).toBe("calculado");
    expect(cuts(current)).toEqual(cuts(initial));
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [historical], items: [renamed] });
    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.items[0]?.fabricacionSnapshot).toEqual(historical.fabricacionSnapshot);
    const technical = { ...historical, observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "32", catalogLineKey: "ventora:l32", sistema: "Proyectante", fabricacionTipologia: "pano_fijo", fabricacionHojas: 1, fabricacionModulos: 1, fabricacionVariante: "normal" }) };
    const invalidated = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [historical], items: [technical] });
    expect(invalidated.itemIdsToResolve).toEqual(new Set([historical.id]));
    expect(invalidated.items[0]?.fabricacionSnapshot).toBeNull();
  });
  it("invalida WinHouse S60 si el nombre cambia la tipología efectiva", () => {
    const previous = workflowItem({ lineaComercial: "WinHouse S60", nombre: "Ventana fija", descripcion: "fijo", observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "560", catalogLineKey: "ventora:winhouse-s60", sistema: "Fijo", fabricacionHojas: 1 }), fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, nombre: "Ventana proyectante" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("invalida Veratec si el nombre introduce conflicto pivotante", () => {
    const previous = workflowItem({ tipo: "Puerta", lineaComercial: "Veratec 7400", nombre: "Puerta corredera", descripcion: "2 hojas", observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "1396", catalogLineKey: "ventora:veratec-7400-corredera", sistema: "Corredera", fabricacionTipologia: "corredera", fabricacionHojas: 2 }), fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, nombre: "Puerta pivotante" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });
  it("invalida Veratec 7400 legacy si cambian las hojas inferidas del texto", () => {
    const previous = workflowItem({ lineaComercial: "Veratec 7400", nombre: "Ventana", descripcion: "Corredera 2 hojas", observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "1396", catalogLineKey: "ventora:veratec-7400-corredera", sistema: "Corredera" }), fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, descripcion: "Corredera 3 hojas" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("conserva el control textual para la recuperación legacy Veratec 4H", () => {
    const previous = workflowItem({ lineaComercial: "Veratec 7400 4 hojas chicas", nombre: "Ventana", descripcion: "4 hojas 2 móviles", observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "1396", catalogLineKey: "ventora:veratec-7400-corredera", sistema: "Corredera" }), fabricacionSnapshot: itemSnapshot });
    const edited = { ...previous, descripcion: "4 hojas 4 móviles" };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [edited] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([previous.id]));
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

  it("al cambiar solo el proveedor conserva los cortes por pieza y reconstruye la pauta de compra", () => {
    const itemWithProvider = (providerKey: string) => workflowItem({
      fabricacionSnapshot: itemSnapshot,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "220",
        catalogLineKey: "universal:aluminio:l20",
        supplierProviderKey: providerKey,
      }),
    });
    const previous = itemWithProvider("arquetipo");
    const edited = itemWithProvider("alumco");

    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [previous],
      // The edit form can omit this snapshot while changing provider metadata.
      items: [{ ...edited, fabricacionSnapshot: null }],
    });

    expect(prepared.itemIdsToResolve).toEqual(new Set());
    expect(prepared.items[0]?.fabricacionSnapshot).toBe(itemSnapshot);
    expect(prepared.shouldRebuildTrabajoSnapshot).toBe(true);
    expect(shouldResolveSupplierPresentationsForQuoteSave({
      existingId: "quote-1",
      itemCountToResolve: prepared.itemIdsToResolve.size,
      shouldRebuildTrabajoSnapshot: prepared.shouldRebuildTrabajoSnapshot,
    })).toBe(true);
  });

  it("no reconstruye la pauta por un cambio comercial cuando el proveedor no cambia", () => {
    const meta = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "220",
      catalogLineKey: "universal:aluminio:l20",
      supplierProviderKey: "arquetipo",
    });
    const previous = workflowItem({ fabricacionSnapshot: itemSnapshot, observaciones: meta });
    const edited = workflowItem({
      fabricacionSnapshot: null,
      observaciones: meta,
      precioUnitario: 160000,
      precioTotal: 160000,
    });

    const prepared = prepareFabricacionSnapshotsForQuoteSave({
      existingId: "quote-1",
      existingItems: [previous],
      items: [edited],
    });

    expect(prepared.itemIdsToResolve.size).toBe(0);
    expect(prepared.shouldRebuildTrabajoSnapshot).toBe(false);
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
