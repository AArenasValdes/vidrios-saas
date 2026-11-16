import { createCotizacionesAppService } from "../cotizaciones.service";
import { createCotizacionesRepository } from "../../repositories/cotizaciones-repository";
import { buildItemFromForm, createEmptyComponentForm, mapItemToForm, mapRecordToDraft, reconcileWorkflowItemsPricing } from "../../new-quote/workflow-ui";
import { createQuoteConstructorPresetConfig, preserveExplicitFabricationSnapshot } from "../../visual-composer/services/quote-constructor-workspace.service";
import { splitModule } from "../../visual-composer/types/guided-visual-config";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { crearRecetaPlantillaVentoraCorredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { CotizacionWorkflowDraft } from "../../types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { createClient } from "@/lib/supabase/client";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { recalcularPautaSnapshotConParametrosCorte } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { resolveUniversalPricedLineFallback } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";

jest.mock("@/lib/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/features/proveedor-catalogos/services/supplier-presentations.client", () => ({
  resolveSupplierPresentationsForQuote: jest.fn(async () => null),
}));
jest.mock("@/features/cotizaciones/visual-composer/services/cotizacion-item-visual-configs.service", () => ({
  createCotizacionItemVisualConfigsService: () => ({
    syncFromPersistedItems: async () => undefined,
    hydrateItemsObservaciones: async ({ items }: { items: unknown[] }) => items,
  }),
}));

type Row = Record<string, unknown>;

// Models the fields requested from PostgREST and stores the actual serialized rows.
function createMemoryDatabase(recipeRows: Row[]) {
  const tables: Record<string, Row[]> = {
    fabrication_recipes: recipeRows,
    cotizaciones: [],
    cotizacion_items: [],
    clients: [],
    projects: [],
  };
  let nextId = 1;
  const client = {
    from(table: string) {
      let selection = "*";
      let inserted: Row | null = null;
      let updated: Row | null = null;
      const filters: Array<(row: Row) => boolean> = [];
      const execute = (single: boolean) => {
        if (inserted) {
          const row = { id: nextId++, creado_en: null, actualizado_en: null, eliminado_en: null, ...structuredClone(inserted) };
          tables[table]!.push(row);
          return { data: structuredClone(row), error: null };
        }
        let rows = (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
        if (updated) {
          rows.forEach((row) => Object.assign(row, structuredClone(updated)));
          return { data: structuredClone(single ? rows[0] ?? null : rows), error: null };
        }
        if (table === "fabrication_recipes" && selection !== "*") {
          const columns = selection.split(",").map((column) => column.trim());
          rows = rows.map((row) => Object.fromEntries(columns.filter((column) => column in row).map((column) => [column, row[column]])));
        }
        return { data: structuredClone(single ? rows[0] ?? null : rows), error: null };
      };
      const query = {
        select(value: string) { selection = value; return query; },
        insert(value: Row) { inserted = value; return query; },
        update(value: Row) { updated = value; return query; },
        eq(key: string, value: unknown) { filters.push((row) => String(row[key]) === String(value)); return query; },
        is(key: string, value: unknown) { filters.push((row) => (row[key] ?? null) === value); return query; },
        in(key: string, values: unknown[]) { filters.push((row) => values.includes(row[key])); return query; },
        or() { return query; },
        order() { return query; },
        single: async () => execute(true),
        maybeSingle: async () => execute(true),
        then(resolve: (value: ReturnType<typeof execute>) => void) { resolve(execute(false)); },
      };
      return query;
    },
  };
  return { client, tables };
}

describe("guardado y relectura L25 desde Constructor", () => {
  const variants = [
    ["monolitico_pierna_abierta_2h_1800x1500", "monolithic_open_normal", "open", "normal"],
    ["monolitico_pierna_abierta_reforzada_2h_1800x1500", "monolithic_open_reinforced", "open", "reinforced"],
    ["monolitico_pierna_cerrada_2h_1800x1500", "monolithic_closed_normal", "closed", "normal"],
  ] as const;

  it("calcula recetas persistidas, serializa tres snapshots y relee la pauta conjunta", async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
    try {
      const records: FabricationRecipeRecord[] = variants.map(([fixtureId, variant], index) => {
        const bundle = buildAllSodalL25Recipes().find((entry) => entry.recipeId === fixtureId)!;
        const definition = structuredClone(bundle.definition);
        delete definition.evidencia;
        return {
          id: `recipe-${index}`, organizationId: 3, lineTemplateId: 207, scope: "organization",
          providerName: "SODAL", lineName: "Serie 25", typology: "corredera", leavesCount: 2,
          variant, version: 1, status: "validated", definition, sourceType: "manufacturer",
          sourceReference: bundle.sourceReference, sourceName: "SODAL", sourceRevision: "sodal-l25-formula-v2",
          parentRecipeId: null, validatedAt: null, validatedBy: null, createdAt: "", updatedAt: "", eliminadoEn: null,
        };
      });
      const rows = records.map((recipe) => ({
        id: recipe.id, organization_id: 3, line_template_id: 207, scope: recipe.scope,
        provider_name: recipe.providerName, line_name: recipe.lineName, typology: recipe.typology,
        leaves_count: 2, variant: recipe.variant, version: 1, status: "validated", definition: recipe.definition,
        source_type: recipe.sourceType, source_reference: recipe.sourceReference,
        source_name: recipe.sourceName, source_revision: recipe.sourceRevision,
        parent_recipe_id: null, validated_at: null, created_at: "", updated_at: "", eliminado_en: null,
      }));
      const memory = createMemoryDatabase(rows);
      jest.mocked(createClient).mockReturnValue(memory.client as never);
      const repository = createCotizacionesRepository({ clientFactory: memory.client as never });
      const service = createCotizacionesAppService({
        cotizacionesRepository: repository,
        organizationProfileRepository: { getByOrganizationId: async () => ({ countryCode: "CL" }) } as never,
        readFabricationCutSettings: async () => null,
      });
      const items = variants.map(([, variant, leg, reinforcement], index) => {
        const form = {
          ...createEmptyComponentForm(), codigo: `V${index + 1}`, tipo: "Ventana", referencia: "L25",
          sistema: "Personalizado", configuracion: "Personalizado", hojasBase: 1 as const,
          ancho: "1800", alto: "1500", cantidad: "1", lineTemplateId: "207", catalogLineKey: "ventora:l25",
          vidrio: "Monolítico 5 mm", fabricacionTipologia: "corredera", fabricacionHojas: 2, fabricacionModulos: 2,
          fabricacionApertura: "corredera", fabricacionGlazing: "monolithic", fabricacionLeg: leg,
          fabricacionReinforcement: reinforcement, fabricacionVariante: variant, fabricationRecipeId: records[index]!.id,
          guidedVisualConfig: createQuoteConstructorPresetConfig("corredera", { widthMm: 1800, heightMm: 1500 }),
        };
        const item = buildItemFromForm(form, [], `item-${index}`);
        expect(item.fabricacionSnapshot).toBeNull();
        expect(resolveFabricacionDespieceForQuoteItem({ item, recipes: records, organizationId: 3 }).formal?.recipeId).toBe(records[index]!.id);
        const rebuilt = buildItemFromForm({ ...mapItemToForm(item), fabricacionSnapshot: null, cubicationSnapshot: null }, [item], item.id, {
          fabricationRecipes: records, organizationId: 3,
        });
        expect(preserveExplicitFabricationSnapshot(rebuilt, null).fabricacionSnapshot?.recipeId).toBe(records[index]!.id);
        return item;
      });
      const draft: CotizacionWorkflowDraft = {
        clienteNombre: "Cliente", clienteTelefono: "", obra: "", direccion: "", validez: "",
        descuentoPct: 0, flete: 0, observaciones: "", items, quotePricingMode: "por_item",
        quoteCreationSurface: "mobile_constructor",
      };
      const saved = await service.saveWorkflow({ organizationId: 3, existingCode: "COT-QA", draft, estado: "creada" });
      expect(saved.items.map((item) => item.fabricacionSnapshot?.recipeId)).toEqual(records.map((recipe) => recipe.id));
      expect(memory.tables.cotizacion_items!.every((row) => row.fabricacion_snapshot != null)).toBe(true);
      expect(memory.tables.cotizaciones![0]?.fabricacion_trabajo_snapshot).not.toBeNull();
      const reopened = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
      expect(reopened?.items.map((item) => item.fabricacionSnapshot?.recipeId)).toEqual(records.map((recipe) => recipe.id));
      expect(reopened?.fabricacionTrabajoSnapshot?.itemCountWithPauta).toBe(3);
      const summary = buildFabricationQuoteSummary(reopened!.items, { trabajoSnapshot: reopened!.fabricacionTrabajoSnapshot });
      expect(summary.items).toHaveLength(3);
      expect(summary.profileCoverage?.jointPlanStatus).toBe("theoretical");
      expect(summary.totalBars).toBeNull();
      expect(new Set(reopened!.fabricacionTrabajoSnapshot!.bars.flatMap((bar) => bar.cortes.map((cut) => cut.codigoItem))))
        .toEqual(new Set(["V1", "V2", "V3"]));
      const singleSliding = createQuoteConstructorPresetConfig("corredera");
      const mixed = splitModule(singleSliding, singleSliding.root.id, "vertical");
      const incompatible = buildItemFromForm({
        ...mapItemToForm(items[0]!), guidedVisualConfig: mixed,
      }, [], "incompatible");
      const incompatibleSummary = buildFabricationQuoteSummary([{
        ...incompatible, fabricacionSnapshot: reopened!.items[0]!.fabricacionSnapshot,
      }]);
      expect(incompatibleSummary.profileCoverage?.items[0]).toMatchObject({
        state: "incompatible", reason: expect.stringContaining("composición"),
      });
      expect(incompatibleSummary.profileCoverage?.readyCount).toBe(0);

      const guidedItems = items.map((item) => buildItemFromForm({
        ...mapItemToForm(item), sistema: "Corredera", configuracion: "", hojasBase: 2,
        sheetScheme: "2 hojas", sheetVariant: "2 móviles", guidedVisualConfig: null,
      }, [], item.id));
      const guided = await service.saveWorkflow({
        organizationId: 3, existingCode: "COT-QA-GUIADA", estado: "creada",
        draft: { ...draft, items: guidedItems, quoteCreationSurface: "mobile_guiada" },
      });
      const guidedReopened = await service.getWorkflowById(guided.id, 3, { ensureApprovalToken: false });
      expect(guidedReopened?.items.map((item) => item.fabricacionSnapshot?.recipeId)).toEqual(records.map((recipe) => recipe.id));
      expect(guidedReopened?.fabricacionTrabajoSnapshot?.itemCountWithPauta).toBe(3);
      expect(guidedReopened?.items.map((item) => item.fabricacionSnapshot?.result.perfiles))
        .toEqual(reopened?.items.map((item) => item.fabricacionSnapshot?.result.perfiles));
    } finally {
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    }
  });

  it("aplica parámetros solo a una receta privada de aluminio con metadata explícita, y filtra otra organización", async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
    try {
      const definition = crearRecetaPlantillaVentoraCorredera2H("L5000");
      definition.identidad = {
        ...definition.identidad,
        recetaId: "org-custom-aluminum-2h",
        codigo: "CUSTOM-AL-927",
        nombre: "Corredera privada de aluminio",
        hojas: 2,
        modulos: 2,
        apertura: "corredera",
        variante: "org-2h-normal",
      };
      definition.perfiles = [{
        ...definition.perfiles[0]!,
        id: "custom-profile",
        codigoPerfil: "CUSTOM-2503",
        nombrePerfil: "Jamba personalizada",
        funcion: "Jamba",
        largoComercialMm: 6000,
        reglaMedida: { base: "ancho_total", multiplicador: 1, ajusteMm: -20 },
        reglaCantidad: { tipo: "fija", cantidad: 1 },
        requerido: true,
      }];
      definition.vidrios = [];
      definition.accesorios = [];
      definition.configuracionCorte = {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
      };
      const customRecipe: FabricationRecipeRecord = {
        id: "recipe-org-custom-927", organizationId: 3, lineTemplateId: 927,
        scope: "organization", providerName: "Taller QA", lineName: "Aluminio privado",
        typology: "corredera", leavesCount: 2, variant: "org-2h-normal", version: 1,
        status: "validated", definition, sourceType: "manual",
        sourceReference: "taller:personalizada:qa-927", sourceName: "Taller QA",
        sourceRevision: null, parentRecipeId: null, validatedAt: null, validatedBy: null,
        createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", eliminadoEn: null,
      };
      const recipeRow = {
        id: customRecipe.id, organization_id: customRecipe.organizationId,
        line_template_id: customRecipe.lineTemplateId, scope: customRecipe.scope,
        provider_name: customRecipe.providerName, line_name: customRecipe.lineName,
        typology: customRecipe.typology, leaves_count: customRecipe.leavesCount,
        variant: customRecipe.variant, version: customRecipe.version, status: customRecipe.status,
        definition: customRecipe.definition, source_type: customRecipe.sourceType,
        source_reference: customRecipe.sourceReference, source_name: customRecipe.sourceName,
        source_revision: customRecipe.sourceRevision, parent_recipe_id: customRecipe.parentRecipeId,
        validated_at: customRecipe.validatedAt, created_at: customRecipe.createdAt,
        updated_at: customRecipe.updatedAt, eliminado_en: customRecipe.eliminadoEn,
      };
      const memory = createMemoryDatabase([recipeRow]);
      jest.mocked(createClient).mockReturnValue(memory.client as never);
      const repository = createCotizacionesRepository({ clientFactory: memory.client as never });
      const settings = (organizationId: number) => ({
        perdidaCorteMm: 3,
        despunteInicialMm: 12,
        procedimiento: "por_pieza" as const,
        fuente: "Parámetros de corte confirmados por Taller QA.",
        largosComercialesConfirmados: false,
        confirmedBy: "qa-user",
        confirmedAt: "2026-11-14T12:00:00.000Z",
        organizationId,
      });
      let currentSettings = settings(3);
      const service = createCotizacionesAppService({
        cotizacionesRepository: repository,
        organizationProfileRepository: { getByOrganizationId: async () => ({ countryCode: "CL" }) } as never,
        readFabricationCutSettings: async () => currentSettings,
      });
      const makeItem = (id: string): CotizacionWorkflowDraft["items"][number] => ({
        id,
        codigo: "V1",
        tipo: "Ventana",
        lineaComercial: "Línea privada 927",
        vidrio: "Monolítico 5 mm",
        nombre: "Corredera privada QA",
        descripcion: "2 hojas",
        ancho: 1200,
        alto: 1000,
        cantidad: 2,
        unidad: "unidad",
        areaM2: 1.2,
        costoProveedorUnitario: 0,
        costoProveedorTotal: 0,
        margenPct: 0,
        precioUnitario: 150000,
        precioTotal: 300000,
        precioPorM2: 125000,
        minimoCobrable: null,
        redondeoPrecio: null,
        precioPlantillaSugerido: null,
        precioAjustadoManual: false,
        origenPrecio: "manual",
        observaciones: encodeCotizacionItemPresentationMeta({
          material: "Aluminio",
          catalogCategoria: "aluminio",
          lineTemplateId: "927",
          catalogLineKey: "taller:aluminio:927",
          precioAjustadoManual: false,
          origenPrecio: "manual",
          precioPorM2: 125000,
          sistema: "Corredera",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
          fabricacionApertura: "corredera",
          fabricacionVariante: "org-2h-normal",
        }),
      });
      const makeDraft = (item: CotizacionWorkflowDraft["items"][number]): CotizacionWorkflowDraft => ({
        clienteNombre: "Cliente", clienteTelefono: "", obra: "", direccion: "", validez: "",
        descuentoPct: 10, flete: 5000, observaciones: "", items: [item], quotePricingMode: "por_item",
        quoteCreationSurface: "mobile_constructor",
      });

      const autoPricedItem = makeItem("private-auto-priced");
      autoPricedItem.precioAjustadoManual = false;
      autoPricedItem.origenPrecio = "margen";
      autoPricedItem.observaciones = encodeCotizacionItemPresentationMeta({
        ...decodeCotizacionItemPresentationMeta(autoPricedItem.observaciones),
        fabricationRecipeId: "recipe-org-custom-927",
        origenPrecio: "margen",
      });
      const repricedItem = reconcileWorkflowItemsPricing([autoPricedItem])[0]!;
      expect(decodeCotizacionItemPresentationMeta(repricedItem.observaciones).fabricationRecipeId)
        .toBe("recipe-org-custom-927");

      const ownItem = makeItem("private-own");
      expect(VENTORA_DEFAULT_LINE_CATALOG.some((line) => line.catalogKey === "taller:aluminio:927")).toBe(false);
      const directResolution = resolveFabricacionDespieceForQuoteItem({
        item: ownItem,
        recipes: [customRecipe],
        organizationId: 3,
        lineTemplateId: 927,
        lineCatalogKey: "taller:aluminio:927",
      });
      expect(directResolution.estado).toBe("calculado");
      expect(directResolution.formal?.recipeId).toBe(customRecipe.id);

      const savedWithOwnSettings = await service.saveWorkflow({
        organizationId: 3, existingCode: "COT-QA-PRIVATE-OWN", draft: makeDraft(ownItem), estado: "creada",
      });
      const ownSnapshot = savedWithOwnSettings.items[0]?.fabricacionSnapshot;
      expect(ownSnapshot?.recipeId).toBe("recipe-org-custom-927");
      expect(ownSnapshot?.result.perfiles).toHaveLength(1);
      expect(ownSnapshot?.result.perfiles[0]).toMatchObject({ medidaMm: 1180, cantidadPiezas: 2 });
      expect(ownSnapshot?.pautaBarras?.barras.flatMap((bar) => bar.cortes.map((cut) => cut.largoMm)))
        .toEqual([1180, 1180]);
      expect(ownSnapshot?.pautaBarras?.parametrosFisicos).toMatchObject({
        origenParametros: "organizacion", organizacionId: 3, perdidaCorteMm: 3, despunteInicialMm: 12,
      });
      expect(memory.tables.cotizacion_items?.find((row) => row.codigo === "V1")?.fabricacion_snapshot).toEqual(ownSnapshot);
      const reopened = await service.getWorkflowById(savedWithOwnSettings.id, 3, { ensureApprovalToken: false });
      expect(reopened?.items[0]?.fabricacionSnapshot).toEqual(ownSnapshot);

      const oldSnapshot = reopened?.items[0]?.fabricacionSnapshot;
      expect(oldSnapshot).toBeTruthy();
      const recalculatedSnapshot = recalcularPautaSnapshotConParametrosCorte({
        snapshot: oldSnapshot!,
        recipe: customRecipe,
        parameters: {
          ...settings(3),
          perdidaCorteMm: 5,
          despunteInicialMm: 15,
          fuente: "Ajuste explícito de esta cotización QA.",
        },
      });
      expect(recalculatedSnapshot).toBeTruthy();
      const beforeCommercial = {
        item: reopened!.items[0]!,
        discountPct: reopened!.descuentoPct,
        subtotal: reopened!.subtotal,
        discount: reopened!.descuentoValor,
        net: reopened!.neto,
        vat: reopened!.iva,
        total: reopened!.total,
      };
      expect(beforeCommercial.item).toMatchObject({
        ancho: 1200,
        alto: 1000,
        cantidad: 2,
        precioUnitario: 150000,
        precioTotal: 300000,
        precioPorM2: 125000,
      });
      expect(beforeCommercial.discountPct).toBe(10);
      const recalculatedItem = {
        ...reopened!.items[0]!,
        fabricacionSnapshot: recalculatedSnapshot,
      };
      const recalcDraft = mapRecordToDraft(reopened!);
      recalcDraft.items = [recalculatedItem];
      await service.saveWorkflow({
        organizationId: 3,
        existingId: reopened!.id,
        existingCode: reopened!.codigo,
        existingClientId: reopened!.clientId,
        existingProjectId: reopened!.projectId,
        draft: recalcDraft,
        estado: reopened!.estado,
      });
      const afterRecalc = await service.getWorkflowById(reopened!.id, 3, { ensureApprovalToken: false });
      expect(afterRecalc?.items[0]?.fabricacionSnapshot?.pautaBarras).toEqual(recalculatedSnapshot?.pautaBarras);
      expect(afterRecalc?.items[0]?.fabricacionSnapshot?.input).toEqual(oldSnapshot?.input);
      expect(afterRecalc?.items[0]?.fabricacionSnapshot?.result).toEqual(oldSnapshot?.result);
      expect(afterRecalc?.items[0]?.fabricacionSnapshot?.pauta).toEqual(oldSnapshot?.pauta);
      expect(afterRecalc?.items[0]?.fabricacionSnapshot?.recipeIdentity).toEqual(oldSnapshot?.recipeIdentity);
      expect(afterRecalc?.items[0]).toMatchObject({
        ancho: beforeCommercial.item.ancho,
        alto: beforeCommercial.item.alto,
        cantidad: beforeCommercial.item.cantidad,
        vidrio: beforeCommercial.item.vidrio,
        precioUnitario: beforeCommercial.item.precioUnitario,
        precioTotal: beforeCommercial.item.precioTotal,
        precioPorM2: beforeCommercial.item.precioPorM2,
        observaciones: beforeCommercial.item.observaciones,
      });
      expect(afterRecalc).toMatchObject({
        descuentoPct: beforeCommercial.discountPct,
        subtotal: beforeCommercial.subtotal,
        descuentoValor: beforeCommercial.discount,
        neto: beforeCommercial.net,
        iva: beforeCommercial.vat,
        total: beforeCommercial.total,
      });

      currentSettings = settings(99);
      const savedWithForeignSettings = await service.saveWorkflow({
        organizationId: 3, existingCode: "COT-QA-PRIVATE-FOREIGN", draft: makeDraft(makeItem("private-foreign")), estado: "creada",
      });
      const foreignSnapshot = savedWithForeignSettings.items[0]?.fabricacionSnapshot;
      expect(foreignSnapshot?.recipeId).toBe("recipe-org-custom-927");
      expect(foreignSnapshot?.result.perfiles).toHaveLength(1);
      expect(foreignSnapshot?.result.perfiles[0]).toMatchObject({ medidaMm: 1180, cantidadPiezas: 2 });
      expect(foreignSnapshot?.pautaBarras?.parametrosFisicos).not.toMatchObject({
        origenParametros: "organizacion", organizacionId: 99,
      });
      expect(foreignSnapshot?.pautaBarras?.parametrosFisicos?.organizacionId).not.toBe(99);
    } finally {
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    }
  });
});

describe("guardado móvil L42 con configuración de catálogo exacta", () => {
  it("mantiene paridad, snapshot y reapertura en Guiada y Constructor para dos dimensiones", async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
    try {
      const universal = resolveUniversalPricedLineFallback({
        catalogKey: "ventora:l42",
        lineTemplateId: 210,
        organizationId: 3,
        lineName: "Serie 42",
        variant: "normal",
        leavesCount: 1,
        recipes: [],
      })!;
      const organizationDraft: FabricationRecipeRecord = {
        ...universal,
        id: "qa-l42-normal-draft",
        scope: "organization",
        organizationId: 3,
        status: "draft",
        sourceType: "manual",
        sourceReference: "ventora-serie-42:normal:catalogo-2026-09-13",
      };
      const recipeRow = {
        id: organizationDraft.id,
        organization_id: 3,
        line_template_id: 210,
        scope: "organization",
        provider_name: "Ventora Test",
        line_name: "Serie 42",
        typology: "proyectante",
        leaves_count: 1,
        variant: "normal",
        version: 1,
        status: "draft",
        definition: organizationDraft.definition,
        source_type: "manual",
        source_reference: organizationDraft.sourceReference,
        source_name: null,
        source_revision: null,
        parent_recipe_id: null,
        validated_at: null,
        created_at: "2026-09-13T00:00:00.000Z",
        updated_at: "2026-09-13T00:00:00.000Z",
        eliminado_en: null,
      };
      const outcomes = new Map<string, Array<{ width: number; height: number; profiles: unknown }>>();

      for (const [surface, system] of [
        ["mobile_guiada", "Proyectante"],
        ["mobile_constructor", "Personalizado"],
      ] as const) {
        const modeOutcomes: Array<{ width: number; height: number; profiles: unknown }> = [];
        for (const [width, height] of [[1200, 1000], [1800, 1200]] as const) {
          const memory = createMemoryDatabase([recipeRow]);
          jest.mocked(createClient).mockReturnValue(memory.client as never);
          const repository = createCotizacionesRepository({ clientFactory: memory.client as never });
          const service = createCotizacionesAppService({
            cotizacionesRepository: repository,
            organizationProfileRepository: { getByOrganizationId: async () => ({ countryCode: "CL" }) } as never,
            readFabricationCutSettings: async () => null,
          });
          const item = buildItemFromForm({
            ...createEmptyComponentForm(),
            codigo: "V1",
            tipo: "Ventana",
            referencia: "Serie 42",
            sistema: system,
            configuracion: system === "Personalizado" ? "Personalizado" : "",
            hojasBase: 1,
            ancho: String(width),
            alto: String(height),
            cantidad: "2",
            lineTemplateId: "210",
            catalogLineKey: "ventora:l42",
            vidrio: "Incoloro monolítico 4mm",
            fabricacionTipologia: "proyectante",
            fabricacionHojas: 1,
            fabricacionModulos: 1,
            fabricacionApertura: "proyectante",
            fabricacionVariante: "normal",
            fabricacionConfiguracionId: surface === "mobile_guiada" ? "ventora:l42:proyectante" : "",
            fabricationRecipeId: surface === "mobile_constructor" ? universal.id : "",
          }, [], `${surface}-${width}`);
          expect(item.fabricacionSnapshot).toBeNull();
          const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
          if (surface === "mobile_guiada") {
            expect(presentation.fabricacionConfiguracionId).toBe("ventora:l42:proyectante");
            expect(presentation.fabricationRecipeId).toBeFalsy();
          } else {
            expect(presentation.fabricacionConfiguracionId).toBeFalsy();
            expect(presentation.fabricationRecipeId).toBe("ventora:universal:l42:normal");
          }
          const expected = resolveFabricacionDespieceForQuoteItem({
            item,
            recipes: [organizationDraft],
            organizationId: 3,
          });
          expect(expected.estado).toBe("calculado");

          const draft: CotizacionWorkflowDraft = {
            clienteNombre: "Cliente QA",
            clienteTelefono: "",
            obra: "PRUEBA QA L42",
            direccion: "",
            validez: "",
            descuentoPct: 0,
            flete: 0,
            observaciones: "",
            items: [item],
            quotePricingMode: "por_item",
            quoteCreationSurface: surface,
          };
          const saved = await service.saveWorkflow({
            organizationId: 3,
            existingCode: `COT-QA-${surface}-${width}`,
            estado: "creada",
            draft,
          });
          const persistedItem = memory.tables.cotizacion_items?.[0];
          expect(persistedItem?.organization_id).toBe(3);
          expect(persistedItem?.fabricacion_snapshot).toMatchObject({
            recipeId: "ventora:universal:l42:normal",
            recipeStatus: "validated",
            lineTemplateId: 210,
          });
          const reopened = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
          const reopenedSnapshot = reopened?.items[0]?.fabricacionSnapshot;
          expect(reopenedSnapshot?.recipeId).toBe("ventora:universal:l42:normal");
          expect(reopenedSnapshot?.input).toMatchObject({
            anchoTotalMm: width,
            altoTotalMm: height,
            cantidad: 2,
          });
          expect(reopened?.fabricacionTrabajoSnapshot?.itemCountWithPauta).toBe(1);
          const canonicalProfiles = (profiles: NonNullable<typeof reopenedSnapshot>['result']['perfiles']) => profiles
            .map(({ codigoPerfil, funcion, medidaMm, cantidadPiezas, totalLinealMm }) => ({
              codigoPerfil, funcion, medidaMm, cantidadPiezas, totalLinealMm,
            }));
          expect(canonicalProfiles(reopenedSnapshot!.result.perfiles))
            .toEqual(canonicalProfiles(expected.formal!.result.perfiles));
          modeOutcomes.push({
            width,
            height,
            profiles: canonicalProfiles(reopenedSnapshot!.result.perfiles),
          });
        }
        outcomes.set(surface, modeOutcomes);
      }

      expect(outcomes.get("mobile_guiada")).toEqual(outcomes.get("mobile_constructor"));
      expect(outcomes.get("mobile_guiada")).toHaveLength(2);
      expect(outcomes.get("mobile_guiada")?.[0]?.profiles)
        .not.toEqual(outcomes.get("mobile_guiada")?.[1]?.profiles);
    } finally {
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    }
  });

  it("no genera snapshot cuando la identidad L42 no coincide con la tipología", () => {
    const universal = resolveUniversalPricedLineFallback({
      catalogKey: "ventora:l42",
      lineTemplateId: 210,
      organizationId: 3,
      lineName: "Serie 42",
      variant: "normal",
      leavesCount: 1,
      recipes: [],
    })!;
    const incompatible = buildItemFromForm({
      ...createEmptyComponentForm(),
      tipo: "Ventana",
      referencia: "Serie 42",
      sistema: "Proyectante",
      ancho: "1200",
      alto: "1000",
      cantidad: "1",
      lineTemplateId: "210",
      catalogLineKey: "ventora:l42",
      fabricacionConfiguracionId: "ventora:l42:proyectante",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricacionApertura: "proyectante",
      fabricacionVariante: "normal",
      fabricationRecipeId: "",
    }, [], "l42-incompatible");
    incompatible.observaciones = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      lineTemplateId: "210",
      catalogLineKey: "ventora:l42",
      fabricacionConfiguracionId: "ventora:l42:proyectante",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricacionApertura: "proyectante",
      fabricacionVariante: "normal",
    });

    const result = resolveFabricacionDespieceForQuoteItem({
      item: incompatible,
      recipes: [],
      organizationId: 3,
    });

    expect(universal).toBeTruthy();
    expect(result.estado).toBe("sin_receta");
    expect(result.formal).toBeNull();
  });
});
