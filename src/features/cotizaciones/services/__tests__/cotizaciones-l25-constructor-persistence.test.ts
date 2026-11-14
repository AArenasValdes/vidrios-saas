import { createCotizacionesAppService } from "../cotizaciones.service";
import { createCotizacionesRepository } from "../../repositories/cotizaciones-repository";
import { buildItemFromForm, createEmptyComponentForm, mapItemToForm } from "../../new-quote/workflow-ui";
import { createQuoteConstructorPresetConfig, preserveExplicitFabricationSnapshot } from "../../visual-composer/services/quote-constructor-workspace.service";
import { splitModule } from "../../visual-composer/types/guided-visual-config";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { CotizacionWorkflowDraft } from "../../types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { createClient } from "@/lib/supabase/client";

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
  const tables: Record<string, Row[]> = { fabrication_recipes: recipeRows, cotizaciones: [], cotizacion_items: [] };
  let nextId = 1;
  const client = {
    from(table: string) {
      let selection = "*";
      let inserted: Row | null = null;
      const filters: Array<(row: Row) => boolean> = [];
      const execute = (single: boolean) => {
        if (inserted) {
          const row = { id: nextId++, creado_en: null, actualizado_en: null, eliminado_en: null, ...structuredClone(inserted) };
          tables[table]!.push(row);
          return { data: structuredClone(row), error: null };
        }
        let rows = (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
        if (table === "fabrication_recipes" && selection !== "*") {
          const columns = selection.split(",").map((column) => column.trim());
          rows = rows.map((row) => Object.fromEntries(columns.filter((column) => column in row).map((column) => [column, row[column]])));
        }
        return { data: structuredClone(single ? rows[0] ?? null : rows), error: null };
      };
      const query = {
        select(value: string) { selection = value; return query; },
        insert(value: Row) { inserted = value; return query; },
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
      expect(summary.profileCoverage?.jointPlanStatus).toBe("ready");
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
});
