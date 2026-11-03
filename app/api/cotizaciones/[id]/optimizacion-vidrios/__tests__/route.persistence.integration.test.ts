/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/features/fabricacion/services/glass-sheet-optimizer.service", () => ({ optimizeGlassCuttingBatch: jest.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { GET, POST } from "../route";
import { optimizeGlassCuttingBatch } from "@/features/fabricacion/services/glass-sheet-optimizer.service";
import { buildCatalogGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { getCatalogGlassTechnicalFingerprint } from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";
import { resolveManualGlassPaneSlots } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const route = { params: Promise.resolve({ id: "1170" }) };
const metadata = {
  espesor: "5 mm",
  categoriaTecnica: "monolitico",
  revisionTecnicaExplicita: true,
  corteManualEstado: "confirmed",
  formaCompraVidrio: "full_sheet",
  planchaAnchoMm: 3210,
  planchaAltoMm: 2250,
};
const glassA = { id: 43, nombre: "Float 5 mm", catalog_metadata: metadata };
const glassB = { id: 44, nombre: "Laminado 5 mm", catalog_metadata: metadata };
const fingerprintA = getCatalogGlassTechnicalFingerprint(buildCatalogGlassTechnicalSpec({ productId: "43", metadata }));
const fingerprintB = getCatalogGlassTechnicalFingerprint(buildCatalogGlassTechnicalSpec({ productId: "44", metadata }));
const manualMeasurements = {
  version: 2,
  expectedPaneCount: 2,
  configurationFingerprint: "",
  entries: [
    {
      id: "manual-float",
      source: "manual",
      version: 2,
      productId: "43",
      technicalFingerprint: fingerprintA,
      widthMm: 600,
      heightMm: 1000,
      quantity: 1,
      quantityBasis: "per_component",
      paneSlotId: "pane-1",
      sourcePosition: "Paño 1",
      rectangularVerified: true,
      recordedAt: "2026-10-27T12:00:00.000Z",
    },
    {
      id: "manual-laminado",
      source: "manual",
      version: 2,
      productId: "44",
      technicalFingerprint: fingerprintB,
      widthMm: 500,
      heightMm: 900,
      quantity: 1,
      quantityBasis: "per_component",
      paneSlotId: "pane-2",
      sourcePosition: "Paño 2",
      rectangularVerified: true,
      recordedAt: "2026-10-27T12:00:00.000Z",
    },
  ],
};
const persistedObservationFields = {
  logicalComponentId: "component-1",
  fabricacionTipologia: "Corredera",
  sheetScheme: "2 hojas",
};
const persistedPresentation = decodeCotizacionItemPresentationMeta(encodeCotizacionItemPresentationMeta(persistedObservationFields));
manualMeasurements.configurationFingerprint = resolveManualGlassPaneSlots({
  componentType: persistedPresentation.fabricacionTipologia || "componente",
  system: persistedPresentation.sistema,
  configuration: persistedPresentation.configuracion,
  sheetScheme: persistedPresentation.sheetScheme,
  fabricacionHojas: persistedPresentation.fabricacionHojas,
  guidedVisualConfig: persistedPresentation.guidedVisualConfig,
  quickCompositionAdjustment: persistedPresentation.quickCompositionAdjustment,
  manualPaneCount: null,
}).configurationFingerprint;
const persistedObservations = encodeCotizacionItemPresentationMeta({ ...persistedObservationFields, manualGlassMeasurements: manualMeasurements });

function createQuery(table: string, quoteRows: unknown[], itemRows: unknown[], catalogRows: unknown[] = []) {
  const rows = table === "cotizaciones" ? quoteRows : table === "cotizacion_items" ? itemRows : catalogRows;
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    is: jest.fn(() => query),
    in: jest.fn(() => query),
    maybeSingle: jest.fn().mockResolvedValue({ data: quoteRows[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve, reject),
  };
  return query;
}

function mockPersistedQuote(input: {
  observations?: string;
  measurements?: typeof manualMeasurements;
  catalogRows?: unknown[];
  quoteId?: number;
  organizationId?: number;
  quoteNumber?: string;
  items?: unknown[];
} = {}) {
  const quoteId = input.quoteId ?? 1170;
  const organizationId = input.organizationId ?? 12;
  const persistedQuote = {
    id: quoteId,
    organization_id: organizationId,
    numero: input.quoteNumber ?? `COT-${quoteId}`,
    creado_en: "2026-10-27T12:00:00.000Z",
    fabricacion_trabajo_snapshot: null,
  };
  const measurements = input.measurements ?? manualMeasurements;
  const persistedItems = input.items ?? [{
    id: 801,
    codigo: "V1",
    nombre: "Ventana corredera 2H",
    descripcion: "Composición de dos paños",
    color: "Blanco",
    vidrio: "Float 5 mm + Laminado 5 mm",
    observaciones: input.observations ?? persistedObservations,
    cantidad: 3,
    fabricacion_snapshot: null,
    manual_glass_measurements: measurements,
  }];
  const adminFrom = jest.fn((table: string) => createQuery(table, [persistedQuote], persistedItems));
  const serverFrom = jest.fn((table: string) => createQuery(table, [], [], input.catalogRows ?? [glassA, glassB]));
  (createAdminClient as jest.Mock).mockReturnValue({ from: adminFrom });
  (createClient as jest.Mock).mockResolvedValue({ from: serverFrom });
  (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({ profile: { organizationId } });
  return { adminFrom, serverFrom };
}

describe("glass coverage API from persisted quote data", () => {
  it("reconciles four confirmed manual panes on a no-recipe item with two panes from a validated item snapshot", async () => {
    const quoteId = 1309;
    const organizationId = 3;
    const qaMetadata = {
      espesor: "5",
      espesorMm: 5,
      categoriaTecnica: "monolitico",
      revisionTecnicaExplicita: false,
      corteManualEstado: "confirmed",
      formaCompraVidrio: "full_sheet",
      planchaAnchoMm: 4000,
      planchaAltoMm: 2200,
    };
    const qaSpec = buildCatalogGlassTechnicalSpec({ productId: "3763", metadata: qaMetadata });
    const v1ObservationFields = {
      logicalComponentId: "ca143e8f-aa7f-4a3b-a844-632421cf0a7d",
      vidrioLineTemplateId: "3763",
      glassTechnicalSpec: qaSpec,
      sistema: "Corredera",
      sheetScheme: "4 hojas",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 4,
    };
    const expectedV1Fingerprint = resolveManualGlassPaneSlots({
      componentType: "corredera",
      system: "Corredera",
      configuration: "",
      sheetScheme: "4 hojas",
      fabricacionHojas: 4,
    }).configurationFingerprint;
    expect(expectedV1Fingerprint).toBe("pane-config-5460b18a");
    const v1Measurements = {
      version: 2,
      expectedPaneCount: 4,
      configurationFingerprint: "pane-config-5460b18a",
      entries: [
        { id: "manual-v1-1", source: "manual", version: 2, productId: "3763", technicalFingerprint: getCatalogGlassTechnicalFingerprint(qaSpec), widthMm: 600, heightMm: 1000, quantity: 1, quantityBasis: "per_component", paneSlotId: "pane-1", sourcePosition: "Paño 1", rectangularVerified: true, recordedAt: "2026-11-03T03:37:46.997Z" },
        { id: "manual-v1-2", source: "manual", version: 2, productId: "3763", technicalFingerprint: getCatalogGlassTechnicalFingerprint(qaSpec), widthMm: 600, heightMm: 1000, quantity: 1, quantityBasis: "per_component", paneSlotId: "pane-2", sourcePosition: "Paño 2", rectangularVerified: true, recordedAt: "2026-11-03T03:37:55.516Z" },
        { id: "manual-v1-3", source: "manual", version: 2, productId: "3763", technicalFingerprint: getCatalogGlassTechnicalFingerprint(qaSpec), widthMm: 600, heightMm: 1100, quantity: 1, quantityBasis: "per_component", paneSlotId: "pane-3", sourcePosition: "Paño 3", rectangularVerified: true, recordedAt: "2026-11-03T03:38:08.230Z" },
        { id: "manual-v1-4", source: "manual", version: 2, productId: "3763", technicalFingerprint: getCatalogGlassTechnicalFingerprint(qaSpec), widthMm: 600, heightMm: 1100, quantity: 1, quantityBasis: "per_component", paneSlotId: "pane-4", sourcePosition: "Paño 4", rectangularVerified: true, recordedAt: "2026-11-03T03:38:18.357Z" },
      ],
    };
    const v2LogicalId = "fcd58fe1-6303-4bcc-ae48-181e34b19354";
    const v2Snapshot = {
      schemaVersion: 1,
      recipeStatus: "validated",
      glassSelection: { productId: "3763", displayName: "QA Monolítico 5 mm", technicalSpec: qaSpec },
      result: { vidrios: [{ vidrioId: "v2-glass", nombre: "Vidrio principal", anchoMm: 900, altoMm: 1000, cantidadPiezas: 2, trazabilidad: [] }] },
    };
    const items = [
      {
        id: "4187", codigo: "V1", tipo_componente: "Ventana", nombre: "Ventana corredera 4 hojas, 2 móviles + 2 fijas",
        descripcion: "Ventana corredera 4 hojas", cantidad: 1, vidrio: "QA Monolítico 5 mm",
        observaciones: encodeCotizacionItemPresentationMeta(v1ObservationFields),
        manual_glass_measurements: v1Measurements,
        fabricacion_snapshot: null,
      },
      {
        id: "4188", codigo: "V2", tipo_componente: "Ventana", nombre: "Ventana corredera 2 hojas, 2 móviles",
        descripcion: "Ventana corredera 2 hojas", cantidad: 1, vidrio: "QA Monolítico 5 mm",
        observaciones: encodeCotizacionItemPresentationMeta({
          logicalComponentId: v2LogicalId,
          vidrioLineTemplateId: "3763",
          glassTechnicalSpec: qaSpec,
          sistema: "Corredera",
          sheetScheme: "2 hojas",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
        }),
        manual_glass_measurements: { version: 2, entries: [] },
        fabricacion_snapshot: v2Snapshot,
      },
    ];
    mockPersistedQuote({
      quoteId,
      organizationId,
      quoteNumber: "COT-031126-001",
      items,
      catalogRows: [{ id: 3763, nombre: "QA Monolítico 5 mm", catalog_metadata: qaMetadata }],
    });

    const qaRoute = { params: Promise.resolve({ id: String(quoteId) }) };
    const response = await GET(new Request("http://localhost"), qaRoute);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.panes).toHaveLength(5);
    expect(body.panes.map((pane: { quoteItemId: string; paneSlotId?: string; quantity: number; physicalUnitCount: number | null; widthMm: number | null; heightMm: number | null }) => ({
      quoteItemId: pane.quoteItemId,
      paneSlotId: pane.paneSlotId,
      quantity: pane.quantity,
      physicalUnitCount: pane.physicalUnitCount,
      widthMm: pane.widthMm,
      heightMm: pane.heightMm,
    }))).toEqual([
      { quoteItemId: "4187", paneSlotId: "pane-1", quantity: 1, physicalUnitCount: 1, widthMm: 600, heightMm: 1000 },
      { quoteItemId: "4187", paneSlotId: "pane-2", quantity: 1, physicalUnitCount: 1, widthMm: 600, heightMm: 1000 },
      { quoteItemId: "4187", paneSlotId: "pane-3", quantity: 1, physicalUnitCount: 1, widthMm: 600, heightMm: 1100 },
      { quoteItemId: "4187", paneSlotId: "pane-4", quantity: 1, physicalUnitCount: 1, widthMm: 600, heightMm: 1100 },
      { quoteItemId: "4188", paneSlotId: undefined, quantity: 2, physicalUnitCount: 2, widthMm: 900, heightMm: 1000 },
    ]);
    expect(new Set(body.panes.map((pane: { paneId: string }) => pane.paneId)).size).toBe(5);
    expect(body.coverage).toMatchObject({ status: "complete", completeReferenceCount: 5, pendingReferenceCount: 0 });
    expect(body.panes.reduce((sum: number, pane: { physicalUnitCount: number | null }) => sum + (pane.physicalUnitCount ?? 0), 0)).toBe(6);
    expect(body.panes.reduce((sum: number, pane: { widthMm: number | null; heightMm: number | null; physicalUnitCount: number | null }) =>
      sum + ((pane.widthMm ?? 0) * (pane.heightMm ?? 0) * (pane.physicalUnitCount ?? 0)) / 1_000_000, 0)).toBeCloseTo(4.32);

    const actualOptimizer = jest.requireActual<typeof import("@/features/fabricacion/services/glass-sheet-optimizer.service")>(
      "@/features/fabricacion/services/glass-sheet-optimizer.service"
    ).optimizeGlassCuttingBatch;
    (optimizeGlassCuttingBatch as jest.Mock).mockImplementationOnce((input) => actualOptimizer(input));
    const calculationResponse = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "geometric_preview" }),
    }), qaRoute);
    const calculation = await calculationResponse.json();

    expect(calculationResponse.status).toBe(200);
    expect(calculation.mode).toBe("geometric_preview");
    expect(calculation.coverage).toMatchObject({ completeReferenceCount: 5, pendingReferenceCount: 0 });
    expect(calculation.results).toHaveLength(1);
    const optimized = calculation.results[0];
    expect(optimized.status).toBe("feasible");
    expect(optimized.verification.passed).toBe(true);
    expect(optimized.summary.paneCount).toBe(6);
    expect(optimized.summary.paneAreaMm2).toBe(4_320_000);
    expect(optimized.summary.sheetCount).toBe(optimized.sheets.length);
    expect(optimized.summary.sheetCount).toBeGreaterThan(0);
    const placedUnits = optimized.sheets.flatMap((sheet: { panes: Array<{ paneUnitId: string; rect: { xMm: number; yMm: number; widthMm: number; heightMm: number } }>; rawSheet: { widthMm: number; heightMm: number } }) =>
      sheet.panes.map((pane) => ({ ...pane, rawSheet: sheet.rawSheet })));
    expect(placedUnits).toHaveLength(6);
    expect(new Set(placedUnits.map((pane: { paneUnitId: string }) => pane.paneUnitId)).size).toBe(6);
    for (const pane of placedUnits) {
      expect(pane.rect.xMm).toBeGreaterThanOrEqual(0);
      expect(pane.rect.yMm).toBeGreaterThanOrEqual(0);
      expect(pane.rect.xMm + pane.rect.widthMm).toBeLessThanOrEqual(pane.rawSheet.widthMm);
      expect(pane.rect.yMm + pane.rect.heightMm).toBeLessThanOrEqual(pane.rawSheet.heightMm);
    }
  });

  it("reopens two persisted fixed panes without a fabrication snapshot and exposes them to preliminary distribution", async () => {
    const quoteId = 1290;
    const organizationId = 3;
    const metadata = {
      espesor: "5 mm",
      espesorMm: 5,
      categoriaTecnica: "monolitico",
      revisionTecnicaExplicita: false,
      corteManualEstado: "confirmed",
      formaCompraVidrio: "full_sheet",
      planchaAnchoMm: 4000,
      planchaAltoMm: 2200,
    };
    const technicalSpec = buildCatalogGlassTechnicalSpec({ productId: "3763", metadata });
    const configurationFingerprint = resolveManualGlassPaneSlots({
      componentType: "Paño fijo",
      system: "Fijo",
      configuration: "Con perfileria",
      sheetScheme: "1 paño",
      fabricacionHojas: 1,
    }).configurationFingerprint;
    const items = ["F1", "F2"].map((code, index) => {
      const itemId = String(index === 0 ? 4078 : 4079);
      const logicalComponentId = index === 0 ? "bcffcc63-e04c-47c4-b3fa-d1a87ddf22bb" : "8f444b2e-8c62-4f13-9741-03d93dc88f59";
      const measurement = {
        version: 2,
        expectedPaneCount: 1,
        configurationFingerprint,
        entries: [{
          id: index === 0 ? "06f12645-bb43-4dde-82df-1f6ef19371cb" : "e915b1ee-6a66-4413-af98-15a8b878277a",
          source: "manual",
          version: 2,
          productId: "3763",
          technicalFingerprint: getCatalogGlassTechnicalFingerprint(technicalSpec),
          widthMm: 600,
          heightMm: 1000,
          quantity: 1,
          quantityBasis: "per_component",
          paneSlotId: "pane-1",
          sourcePosition: "Paño 1",
          rectangularVerified: true,
          recordedAt: "2026-10-30T19:10:45.934Z",
        }],
      };
      return {
        id: itemId,
        codigo: code,
        tipo_componente: "Paño fijo",
        nombre: "Paño fijo con perfilería 1 paño",
        descripcion: "Paño fijo de aluminio con vidrio incoloro",
        cantidad: 1,
        vidrio: "QA Monolítico 5 mm",
        observaciones: encodeCotizacionItemPresentationMeta({
          logicalComponentId,
          vidrioLineTemplateId: "3763",
          glassTechnicalSpec: technicalSpec,
          sistema: "Fijo",
          configuracion: "Con perfileria",
          sheetScheme: "1 paño",
          fabricacionTipologia: "pano_fijo",
          fabricacionHojas: 1,
          fabricacionModulos: 1,
          fabricacionApertura: "fijo",
          fabricacionVariante: "sin_receta",
          fabricacionConfiguracionId: "ventora:l32:pano-fijo",
        }),
        manual_glass_measurements: measurement,
        fabricacion_snapshot: null,
      };
    });

    mockPersistedQuote({
      quoteId,
      organizationId,
      quoteNumber: "COT-291026-007",
      items,
      catalogRows: [{ id: 3763, nombre: "QA Monolítico 5 mm", catalog_metadata: metadata }],
    });
    const qaRoute = { params: Promise.resolve({ id: String(quoteId) }) };
    const response = await GET(new Request("http://localhost"), qaRoute);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.coverage).toMatchObject({ status: "complete", completeReferenceCount: 2, pendingReferenceCount: 0 });
    expect(body.panes.map((pane: { quoteItemId: string; logicalComponentId: string; productId: string; glassId: string; paneSlotId: string; widthMm: number; heightMm: number; quantity: number; physicalUnitCount: number; dimensionProvenance: string; validationStatus: string; warnings: string[] }) => ({
      quoteItemId: pane.quoteItemId,
      logicalComponentId: pane.logicalComponentId,
      productId: pane.productId,
      glassId: pane.glassId,
      paneSlotId: pane.paneSlotId,
      widthMm: pane.widthMm,
      heightMm: pane.heightMm,
      quantity: pane.quantity,
      physicalUnitCount: pane.physicalUnitCount,
      dimensionProvenance: pane.dimensionProvenance,
      validationStatus: pane.validationStatus,
      warnings: pane.warnings,
    }))).toEqual([
      { quoteItemId: "4078", logicalComponentId: "bcffcc63-e04c-47c4-b3fa-d1a87ddf22bb", productId: "3763", glassId: "06f12645-bb43-4dde-82df-1f6ef19371cb", paneSlotId: "pane-1", widthMm: 600, heightMm: 1000, quantity: 1, physicalUnitCount: 1, dimensionProvenance: "manual", validationStatus: "eligible_for_manual_planning", warnings: [] },
      { quoteItemId: "4079", logicalComponentId: "8f444b2e-8c62-4f13-9741-03d93dc88f59", productId: "3763", glassId: "e915b1ee-6a66-4413-af98-15a8b878277a", paneSlotId: "pane-1", widthMm: 600, heightMm: 1000, quantity: 1, physicalUnitCount: 1, dimensionProvenance: "manual", validationStatus: "eligible_for_manual_planning", warnings: [] },
    ]);

    (optimizeGlassCuttingBatch as jest.Mock).mockReturnValue([{ status: "feasible", sheets: [], inputFingerprint: "qa-preview" }]);
    const preview = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ mode: "geometric_preview" }),
    }), qaRoute);
    const previewBody = await preview.json();
    expect(preview.status).toBe(200);
    expect(previewBody.mode).toBe("geometric_preview");
    expect(previewBody.preliminaryPaneCount).toBe(2);
    expect(previewBody.coverage).toMatchObject({ status: "complete", completeReferenceCount: 2, pendingReferenceCount: 0 });
    expect(optimizeGlassCuttingBatch).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "geometric_preview",
      panes: expect.arrayContaining([
        expect.objectContaining({ quoteItemId: "4078", widthMm: 600, heightMm: 1000, quantity: 1, productId: "3763" }),
        expect.objectContaining({ quoteItemId: "4079", widthMm: 600, heightMm: 1000, quantity: 1, productId: "3763" }),
      ]),
    }));
  });

  it("uses persisted quantity once for two different manual pane slots in GET and geometric preview", async () => {
    const { adminFrom } = mockPersistedQuote();

    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(adminFrom).toHaveBeenCalledWith("cotizacion_items");
    expect(body.coverage).toMatchObject({ status: "complete", completeReferenceCount: 2, pendingReferenceCount: 0 });
    expect(body.panes.map((pane: { productId: string; quantity: number; physicalUnitCount: number | null }) => ({
      productId: pane.productId,
      quantity: pane.quantity,
      physicalUnitCount: pane.physicalUnitCount,
    }))).toEqual([
      { productId: "43", quantity: 3, physicalUnitCount: 3 },
      { productId: "44", quantity: 3, physicalUnitCount: 3 },
    ]);
    expect(body.panes.reduce((sum: number, pane: { physicalUnitCount: number | null }) => sum + (pane.physicalUnitCount ?? 0), 0)).toBe(6);

    (optimizeGlassCuttingBatch as jest.Mock).mockReturnValue([{ status: "feasible", sheets: [], inputFingerprint: "preview-1" }]);
    const preview = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ mode: "geometric_preview" }),
    }), route);
    expect(preview.status).toBe(200);
    expect(optimizeGlassCuttingBatch).toHaveBeenCalledWith(expect.objectContaining({
      mode: "geometric_preview",
      panes: expect.arrayContaining([
        expect.objectContaining({ productId: "43", quantity: 3 }),
        expect.objectContaining({ productId: "44", quantity: 3 }),
      ]),
    }));
  });

  it("expone cobertura parcial cuando cambió la ficha técnica persistida del primer vidrio", async () => {
    mockPersistedQuote({ catalogRows: [
      { ...glassA, catalog_metadata: { ...metadata, planchaAnchoMm: 3000 } },
      glassB,
    ] });
    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.coverage).toMatchObject({ status: "partial", completeReferenceCount: 1, pendingReferenceCount: 1 });
    expect(body.panes.map((pane: { physicalUnitCount: number | null }) => pane.physicalUnitCount)).toEqual([null, 3]);
    expect(body.coverage.pendingReferences[0].reason).toMatch(/ficha técnica del vidrio cambió/i);
  });

  it("no habilita unidades ni cobertura cuando el fingerprint de configuración manual quedó obsoleto", async () => {
    const staleMeasurements = { ...manualMeasurements, configurationFingerprint: "old-configuration-fingerprint" };
    const observations = encodeCotizacionItemPresentationMeta({
      logicalComponentId: "component-1",
      fabricacionTipologia: "Corredera",
      sheetScheme: "2 hojas",
      manualGlassMeasurements: staleMeasurements,
    });
    mockPersistedQuote({ observations, measurements: staleMeasurements });
    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.coverage).toMatchObject({ status: "unavailable", completeReferenceCount: 0, pendingReferenceCount: 2 });
    expect(body.panes.map((pane: { physicalUnitCount: number | null }) => pane.physicalUnitCount)).toEqual([null, null]);
    expect(body.coverage.pendingReferences[0].reason).toMatch(/configuración del componente cambió/i);
  });
});
