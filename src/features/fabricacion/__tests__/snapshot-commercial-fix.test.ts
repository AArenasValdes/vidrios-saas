import { createCotizacionesAppService } from "@/features/cotizaciones/services/cotizaciones.service";
import * as XLSX from "xlsx";
import { createWorkMaterialsPdf } from "@/features/fabricacion/services/work-materials-pdf-export.service";
import { buildWorkMaterialsWorkbook } from "@/features/fabricacion/services/work-materials-excel-export.service";
import { createCotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import { buildItemFromForm, createEmptyComponentForm, mapRecordToDraft, reconcileWorkflowItemsPricing } from "@/features/cotizaciones/new-quote/workflow-ui";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { prepareFabricacionSnapshotsForQuoteSave } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import { buildWorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import { buildFabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";
import { createClient } from "@/lib/supabase/client";
import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

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
      if (testCase.name === "L42") {
        expect(materials.accessories.map((entry) => entry.description)).toContain("Burlete cuña 4 mm");
        expect(materials.accessories.map((entry) => entry.description)).not.toContain("Burlete cuña 5 mm");
      }
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
      commercialDraft.items = reconcileWorkflowItemsPricing(commercialDraft.items, commercialDraft.quotePricingMode);
      const commercialItem = commercialDraft.items[0]!;
      const meta = decodeCotizacionItemPresentationMeta(commercialItem.observaciones);
      const manualPrice = 125000;
      commercialItem.precioUnitario = manualPrice;
      commercialItem.precioTotal = manualPrice * commercialItem.cantidad;
      commercialItem.precioAjustadoManual = true;
      commercialItem.origenPrecio = "manual";
      commercialItem.observaciones = encodeCotizacionItemPresentationMeta({ ...meta, precioAjustadoManual: true, origenPrecio: "manual" });
      expect(commercialDraft.items[0]!.fabricacionSnapshot).toEqual(before);
      expect(prepareFabricacionSnapshotsForQuoteSave({ existingId: reopened!.id, existingItems: reopened!.items, items: reconcileWorkflowItemsPricing(commercialDraft.items, commercialDraft.quotePricingMode) }).itemIdsToResolve.size).toBe(0);
      await service.saveWorkflow({ organizationId: 3, existingId: reopened!.id, existingCode: reopened!.codigo,
        existingClientId: reopened!.clientId, existingProjectId: reopened!.projectId, draft: commercialDraft, estado: reopened!.estado });
      const after = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
      expect(after?.items[0]?.fabricacionSnapshot).toEqual(before);
      expect(after?.fabricacionTrabajoSnapshot).toEqual(work);
      expect(after?.items[0]).toMatchObject({ precioUnitario: manualPrice, precioTotal: manualPrice * 2, precioAjustadoManual: true, origenPrecio: "manual" });
      expect(after?.fabricacionTrabajoSnapshot?.bars).toEqual(work.bars);
      expect(await service.getWorkflowById(saved.id, 999, { ensureApprovalToken: false })).toBeNull();

      const technicalDraft = mapRecordToDraft(after!);
      const technicalItem = technicalDraft.items[0]!;
      technicalItem.ancho = 1600;
      await service.saveWorkflow({ organizationId: 3, existingId: after!.id, existingCode: after!.codigo,
        existingClientId: after!.clientId, existingProjectId: after!.projectId, draft: technicalDraft, estado: after!.estado });
      const recalculated = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
      expect(recalculated?.items[0]?.fabricacionSnapshot?.input.anchoTotalMm).toBe(1600);
      expect(recalculated?.items[0]?.fabricacionSnapshot?.recipeId).toBe(snapshot.recipeId);
      expect(recalculated?.items[0]?.fabricacionSnapshot?.result.perfiles).not.toEqual(snapshot.result.perfiles);
      expect(recalculated?.fabricacionTrabajoSnapshot?.bars).not.toEqual(work.bars);
      expect(recalculated?.items[0]?.precioUnitario).toBe(manualPrice);

      const glassDraft = mapRecordToDraft(recalculated!);
      const glassItem = glassDraft.items[0]!;
      glassItem.vidrio = "Incoloro monolítico 5mm";
      const glassMeta = decodeCotizacionItemPresentationMeta(glassItem.observaciones);
      glassItem.observaciones = encodeCotizacionItemPresentationMeta({ ...glassMeta, vidrioLineTemplateId: "glass-qa-5mm", catalogEspesor: "5 mm" });
      await service.saveWorkflow({ organizationId: 3, existingId: recalculated!.id, existingCode: recalculated!.codigo,
        existingClientId: recalculated!.clientId, existingProjectId: recalculated!.projectId, draft: glassDraft, estado: recalculated!.estado });
      let glassReopened = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
      expect(glassReopened?.items[0]?.fabricacionSnapshot?.glassSelection).toMatchObject({ productId: "glass-qa-5mm", displayName: "Incoloro monolítico 5mm" });
      expect(glassReopened?.items[0]?.fabricacionSnapshot?.input.anchoTotalMm).toBe(1600);
      expect(glassReopened?.items[0]?.fabricacionSnapshot?.recipeId).toBe(snapshot.recipeId);
      expect(glassReopened?.items[0]?.precioUnitario).toBe(manualPrice);
      if (testCase.name === "L42") {
        expect(glassReopened?.items[0]?.fabricacionSnapshot?.result.vidrios[0]?.nombre).toBe("Incoloro monolítico 5mm");
        const changedSummary = buildFabricationQuoteSummary(glassReopened!.items, { trabajoSnapshot: glassReopened!.fabricacionTrabajoSnapshot! });
        const changedMaterials = buildWorkMaterialsDocument({ summary: changedSummary, items: glassReopened!.items });
        expect(changedMaterials.accessories.map((entry) => entry.description)).toContain("Burlete cuña 5 mm");
        expect(changedMaterials.accessories.map((entry) => entry.description)).not.toContain("Burlete cuña 4 mm");
        expect(changedMaterials.accessories.map((entry) => entry.description)).not.toContain("Base 42");
        const metadata = { companyName: "Taller QA", quoteCode: "QA-L42", work: "L42", issueDate: "25-11-2026" };
        const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "materials", document: changedMaterials });
        const cells = JSON.stringify(workbook.Sheets);
        expect(cells).toContain("C-425");
        expect(cells).not.toContain("C-424");
        const pdf = createWorkMaterialsPdf(changedMaterials, { companyName: metadata.companyName, quoteCode: metadata.quoteCode,
          workName: metadata.work, issueDate: metadata.issueDate });
        const pdfText = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
        expect(pdfText).toContain("C-425");
        expect(pdfText).not.toContain("C-424");

        const unknownDraft = mapRecordToDraft(glassReopened!);
        unknownDraft.items[0]!.vidrio = "Monolítico 6 mm";
        const unknownMeta = decodeCotizacionItemPresentationMeta(unknownDraft.items[0]!.observaciones);
        unknownDraft.items[0]!.observaciones = encodeCotizacionItemPresentationMeta({
          ...unknownMeta, vidrioLineTemplateId: "", glassTechnicalSpec: null,
        });
        await service.saveWorkflow({ organizationId: 3, existingId: glassReopened!.id, existingCode: glassReopened!.codigo,
          existingClientId: glassReopened!.clientId, existingProjectId: glassReopened!.projectId,
          draft: unknownDraft, estado: glassReopened!.estado });
        const unknown = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
        expect(unknown?.items[0]?.fabricacionSnapshot?.advertencias.some((entry) => entry.codigo === "ACCESORIO_VIDRIO_PENDIENTE")).toBe(true);
        const unknownSummary = buildFabricationQuoteSummary(unknown!.items, { trabajoSnapshot: unknown!.fabricacionTrabajoSnapshot! });
        const unknownMaterials = buildWorkMaterialsDocument({ summary: unknownSummary, items: unknown!.items });
        expect(unknownMaterials.accessories.map((entry) => entry.description)).not.toContain("Burlete cuña 4 mm");
        expect(unknownMaterials.accessories.map((entry) => entry.description)).not.toContain("Burlete cuña 5 mm");
        const unknownWorkbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "materials", document: unknownMaterials });
        expect(JSON.stringify(unknownWorkbook.Sheets)).not.toContain("Burlete cuña");
        expect(JSON.stringify(unknownWorkbook.Sheets)).not.toContain('"v":"C-425"');
        const unknownPdf = createWorkMaterialsPdf(unknownMaterials, { companyName: metadata.companyName, quoteCode: metadata.quoteCode,
          workName: metadata.work, issueDate: metadata.issueDate });
        expect(Buffer.from(unknownPdf.output("arraybuffer")).toString("latin1")).not.toContain("Burlete cu");
        expect(Buffer.from(unknownPdf.output("arraybuffer")).toString("latin1")).not.toContain("Base 42");
        const dvhDraft = mapRecordToDraft(unknown!);
        dvhDraft.items[0]!.vidrio = "DVH 4+12+4";
        await service.saveWorkflow({ organizationId: 3, existingId: unknown!.id, existingCode: unknown!.codigo,
          existingClientId: unknown!.clientId, existingProjectId: unknown!.projectId,
          draft: dvhDraft, estado: unknown!.estado });
        const dvh = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
        const dvhSnapshot = dvh!.items[0]!.fabricacionSnapshot!;
        expect(dvhSnapshot.result.vidrios).toEqual([]);
        expect(dvhSnapshot.pauta.some((profile) => profile.codigoPerfil === "4229")).toBe(false);
        const dvhSummary = buildFabricationQuoteSummary(dvh!.items, { trabajoSnapshot: dvh!.fabricacionTrabajoSnapshot! });
        expect(dvhSummary.items[0]?.statusLabel).toBe("Despiece parcial");
        expect(dvhSummary.profileCoverage?.status).toBe("partial");
        const dvhMaterials = buildWorkMaterialsDocument({ summary: dvhSummary, items: dvh!.items });
        const dvhOrder = buildFabricationWorkOrder({ summary: dvhSummary, materials: dvhMaterials, quoteItems: dvh!.items });
        expect(dvhOrder.documentStatus.state).toBe("partial");
        expect(dvhOrder.preliminaryCutGroups.some((group) => group.technicalCode === "4201")).toBe(true);
        expect(dvhOrder.preliminaryCutGroups.some((group) => group.technicalCode === "4229")).toBe(false);
        expect(dvhOrder.pending.some((pending) => /junquillo/i.test(pending.action))).toBe(true);
        expect(dvhMaterials.glassOrder.every((row) => row.widthMm == null && row.heightMm == null)).toBe(true);
        const dvhWorkbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "materials", document: dvhMaterials, workOrder: dvhOrder });
        expect(JSON.stringify(dvhWorkbook.Sheets)).not.toContain('"v":"4229"');
        expect(JSON.stringify(dvhWorkbook.Sheets)).toContain("DOCUMENTO PARCIAL");
        const dvhPdf = createWorkMaterialsPdf(dvhMaterials, { companyName: metadata.companyName, quoteCode: metadata.quoteCode,
          workName: metadata.work, issueDate: metadata.issueDate }, null, dvhOrder);
        expect(Buffer.from(dvhPdf.output("arraybuffer")).toString("latin1")).not.toContain("4229");
        expect(Buffer.from(dvhPdf.output("arraybuffer")).toString("latin1")).toContain("DOCUMENTO PARCIAL");
        const dvhAgain = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
        expect(dvhAgain?.items[0]?.fabricacionSnapshot).toEqual(dvhSnapshot);
        glassReopened = dvh;
      }
      expect(await service.getWorkflowById(saved.id, 999, { ensureApprovalToken: false })).toBeNull();

      const changedRecipeDraft = mapRecordToDraft(glassReopened!);
      const changedItem = changedRecipeDraft.items[0]!;
      const changedMeta = decodeCotizacionItemPresentationMeta(changedItem.observaciones);
      changedItem.observaciones = encodeCotizacionItemPresentationMeta({
        ...changedMeta, fabricationRecipeId: "receta-no-disponible", fabricacionVariante: "variante-no-disponible",
      });
      await service.saveWorkflow({ organizationId: 3, existingId: glassReopened!.id, existingCode: glassReopened!.codigo,
        existingClientId: glassReopened!.clientId, existingProjectId: glassReopened!.projectId,
        draft: changedRecipeDraft, estado: glassReopened!.estado });
      const incompatible = await service.getWorkflowById(saved.id, 3, { ensureApprovalToken: false });
      expect(incompatible?.items[0]?.fabricacionSnapshot).toBeNull();
      expect(incompatible?.items[0]?.precioUnitario).toBe(manualPrice);
    } finally {
      if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
      if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
    }
  });
});
