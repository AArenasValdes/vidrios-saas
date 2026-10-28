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
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const route = { params: Promise.resolve({ id: "1170" }) };
const metadata = {
  espesor: "5 mm",
  categoriaTecnica: "monolitico",
  revisionTecnicaExplicita: true,
  corteManualEstado: "confirmed",
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
const persistedObservations = encodeCotizacionItemPresentationMeta({
  logicalComponentId: "component-1",
  fabricacionTipologia: "Corredera",
  sheetScheme: "2 hojas",
  manualGlassMeasurements: manualMeasurements,
});

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

function mockPersistedQuote(input: { observations?: string; measurements?: typeof manualMeasurements; catalogRows?: unknown[] } = {}) {
  const persistedQuote = {
    id: 1170,
    organization_id: 12,
    numero: "COT-1170",
    creado_en: "2026-10-27T12:00:00.000Z",
    fabricacion_trabajo_snapshot: null,
  };
  const measurements = input.measurements ?? manualMeasurements;
  const persistedItems = [{
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
  (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({ profile: { organizationId: 12 } });
  return { adminFrom, serverFrom };
}

describe("glass coverage API from persisted quote data", () => {
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
