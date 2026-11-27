import { createCotizacionesAppService } from "@/features/cotizaciones/services/cotizaciones.service";
import { createCotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import { buildItemFromForm, createEmptyComponentForm, mapRecordToDraft, reconcileWorkflowItemsPricing } from "@/features/cotizaciones/new-quote/workflow-ui";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { prepareFabricacionSnapshotsForQuoteSave } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import { buildWorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import { buildFabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";
import { createClient } from "@/lib/supabase/client";
import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

jest.mock("@/lib/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/features/proveedor-catalogos/services/supplier-presentations.client", () => ({ resolveSupplierPresentationsForQuote: jest.fn(async () => null) }));
jest.mock("@/features/cotizaciones/visual-composer/services/cotizacion-item-visual-configs.service", () => ({
  createCotizacionItemVisualConfigsService: () => ({ syncFromPersistedItems: async () => undefined, hydrateItemsObservaciones: async ({ items }: { items: unknown[] }) => items }),
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

// Casos representativos con fórmulas existentes, no validación adicional de taller.
const cases = [
  { name: "L20", key: "ventora:l20", line: "20", system: "Corredera", typology: "corredera", leaves: 2, variant: "pierna_abierta_jamba_2009" },
  { name: "L5000", key: "ventora:l5000", line: "5000", system: "Corredera", typology: "corredera", leaves: 2, variant: "caracol" },
  { name: "L42", key: "ventora:l42", line: "42", system: "Proyectante", typology: "proyectante", leaves: 1, variant: "normal" },
] as const;

describe("persistencia simulada y documentos internos de líneas universales", () => {
  it.each(cases)("congela y reabre $name con su pauta y orden interna", async (testCase) => {
    const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
    try {
      const memory = createMemoryDatabase([]);
      jest.mocked(createClient).mockReturnValue(memory.client as never);
      const service = createCotizacionesAppService({
        cotizacionesRepository: createCotizacionesRepository({ clientFactory: memory.client as never }),
        organizationProfileRepository: { getByOrganizationId: async () => ({ countryCode: "CL" }) } as never,
        readFabricationCutSettings: async () => null,
      });
      const item = buildItemFromForm({
        ...createEmptyComponentForm(), codigo: "V1", tipo: "Ventana", referencia: testCase.name,
        sistema: testCase.system, hojasBase: testCase.leaves,
        ancho: "1800", alto: "1500", cantidad: "2", vidrio: "Incoloro monolítico 4mm",
        lineTemplateId: testCase.line, catalogLineKey: testCase.key,
        fabricacionTipologia: testCase.typology, fabricacionHojas: testCase.leaves,
        fabricacionModulos: testCase.leaves, fabricacionApertura: testCase.typology,
        fabricacionVariante: testCase.variant,
      }, [], `item-${testCase.name}`);
      const draft: CotizacionWorkflowDraft = {
        clienteNombre: "Cliente QA", clienteTelefono: "", obra: "PRUEBA QA", direccion: "", validez: "",
        descuentoPct: 0, flete: 0, observaciones: "", items: [item], quotePricingMode: "por_item", quoteCreationSurface: "mobile_guiada",
      };
      const saved = await service.saveWorkflow({ organizationId: 3, existingCode: `QA-${testCase.name}`, draft, estado: "creada" });
      const row = memory.tables.cotizacion_items![0]!;
      expect(row.organization_id).toBe(3);
      expect(row.fabricacion_snapshot).not.toBeNull();
      const reopened = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
      expect(reopened?.items[0]?.fabricacionSnapshot).toEqual(row.fabricacion_snapshot);
      const snapshot = reopened!.items[0]!.fabricacionSnapshot!;
      expect(snapshot.input).toMatchObject({ anchoTotalMm: 1800, altoTotalMm: 1500, cantidad: 2 });
      expect(snapshot.result.perfiles.length).toBeGreaterThan(0);
      const work = reopened!.fabricacionTrabajoSnapshot!;
      expect(work.itemCountWithPauta).toBe(1);
      const summary = buildFabricationQuoteSummary(reopened!.items, { trabajoSnapshot: work });
      const materials = buildWorkMaterialsDocument({ summary, items: reopened!.items });
      const order = buildFabricationWorkOrder({ summary, materials, quoteItems: reopened!.items });
      expect(order.cutPlanPhysicalState).toBe("teorica");
      const expectedCuts = work.bars.flatMap((bar) => bar.cortes.map((cut) => `${bar.codigoPerfil}|${cut.largoMm}`)).sort();
      const orderCuts = order.cutGroups.flatMap((group) => group.cuts.flatMap((cut) => Array.from({ length: cut.quantity }, () => `${group.technicalCode}|${cut.lengthMm}`))).sort();
      expect(expectedCuts.length).toBeGreaterThan(0);
      expect(orderCuts).toEqual(expectedCuts);
      expect(order.materials.profiles.length).toBeGreaterThan(0);
      expect(order.pricing.status).not.toBe("complete");

      const before = structuredClone(snapshot);
      const commercialDraft = mapRecordToDraft(reopened!);
      commercialDraft.items[0]!.precioUnitario += 1000;
      expect(commercialDraft.items[0]!.fabricacionSnapshot).toEqual(before);
      expect(prepareFabricacionSnapshotsForQuoteSave({ existingId: reopened!.id, existingItems: reopened!.items, items: reconcileWorkflowItemsPricing(commercialDraft.items, commercialDraft.quotePricingMode) }).itemIdsToResolve.size).toBe(0);
      await service.saveWorkflow({ organizationId: 3, existingId: reopened!.id, existingCode: reopened!.codigo,
        existingClientId: reopened!.clientId, existingProjectId: reopened!.projectId, draft: commercialDraft, estado: reopened!.estado });
      const after = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
      expect(after?.items[0]?.fabricacionSnapshot).toEqual(before);
      expect(after?.fabricacionTrabajoSnapshot).toEqual(work);
      expect(await service.getWorkflowById(saved.id, 999, { ensureApprovalToken: false })).toBeNull();
    } finally {
      if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
      if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
    }
  });
});
