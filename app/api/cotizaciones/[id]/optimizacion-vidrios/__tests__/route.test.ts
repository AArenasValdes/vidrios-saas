jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } },
}));
jest.mock("@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository", () => ({ readQuoteForTechnicalCost: jest.fn() }));
jest.mock("@/features/fabricacion/services/glass-pane-normalization.service", () => ({ extractNormalizedGlassPanesForOrganization: jest.fn() }));
jest.mock("@/features/fabricacion/services/glass-sheet-optimizer.service", () => ({ optimizeGlassCuttingBatch: jest.fn() }));
jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

import { GET, POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { readQuoteForTechnicalCost } from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { extractNormalizedGlassPanesForOrganization } from "@/features/fabricacion/services/glass-pane-normalization.service";
import { optimizeGlassCuttingBatch } from "@/features/fabricacion/services/glass-sheet-optimizer.service";
import { createClient } from "@/lib/supabase/server";

const route = { params: Promise.resolve({ id: "1170" }) };
const row = {
  organizationId: 12, quoteId: 1170, quoteItemId: "item-1", logicalComponentId: "component-1", glassId: "glass-1",
  paneId: "component-1:glass-1", paneUnitIds: ["component-1:glass-1:1"], ordinal: 1, productId: "mono-4",
  displayName: "Monolítico claro", technicalSpec: { productId: "mono-4", thicknessMm: 4, category: "monolitico", sheetWidthMm: 3210, sheetHeightMm: 2250 },
  widthMm: 700, heightMm: 900, quantity: 1, dimensionProvenance: "validated_recipe", dimensionTraceRuleIds: [],
  recipeStatus: "validated", validationStatus: "eligible_for_manual_planning", warnings: [], snapshotVersion: 1,
  snapshotFingerprint: "snapshot-1", normalizationVersion: 1,
};
const quote = { code: "COT-1170", items: [{ id: "item-1", code: "V1", glassDescription: "Monolítico", observaciones: "", fabricacionSnapshot: {} }] };
const supabaseQuery = {
  select: jest.fn(), eq: jest.fn(), in: jest.fn(), is: jest.fn(), maybeSingle: jest.fn(), update: jest.fn(),
  then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
};
for (const method of ["select", "eq", "in", "is", "update"] as const) supabaseQuery[method].mockReturnValue(supabaseQuery);

beforeEach(() => {
  jest.clearAllMocks();
  for (const method of ["select", "eq", "in", "is", "update"] as const) supabaseQuery[method].mockReturnValue(supabaseQuery);
  supabaseQuery.maybeSingle.mockResolvedValue({ data: { id: 43, actualizado_en: "2026-10-23T10:00:00.000Z", catalog_metadata: { fabricationRecipe: { version: 1 }, glassTechnicalSpec: { thicknessMm: 5 } } }, error: null });
  (createClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => supabaseQuery) });
  (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({ profile: { organizationId: 12 }, user: { email: "qa@example.com" } });
  (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue(quote);
  (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([row]);
  (optimizeGlassCuttingBatch as jest.Mock).mockReturnValue([{ status: "feasible", sheets: [], inputFingerprint: "run-1" }]);
});

describe("/api/cotizaciones/[id]/optimizacion-vidrios", () => {
  it("lee snapshots con la organización de la sesión", async () => {
    const response = await GET(new Request("http://localhost"), route);
    expect(response.status).toBe(200);
    expect(readQuoteForTechnicalCost).toHaveBeenCalledWith({ quoteId: 1170, organizationId: 12 });
    expect(extractNormalizedGlassPanesForOrganization).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 12, quoteId: 1170 }));
  });

  it("A: reporta cobertura completa para paños congelados de dos componentes", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [
      { id: "item-1", code: "V1", name: "Corredera", glassDescription: "Float", observaciones: "", fabricacionSnapshot: {} },
      { id: "item-2", code: "V2", name: "Fijo", glassDescription: "Float", observaciones: "", fabricacionSnapshot: {} },
    ] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([
      row,
      { ...row, quoteItemId: "item-2", logicalComponentId: "component-2", paneId: "component-2:glass-1", paneUnitIds: ["component-2:glass-1:1"], snapshotFingerprint: "snapshot-2" },
    ]);

    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(body.coverage).toMatchObject({ status: "complete", completeReferenceCount: 2, pendingReferenceCount: 0 });
    expect(body.panes.map((pane: { physicalUnitCount: number | null }) => pane.physicalUnitCount)).toEqual([1, 1]);
  });

  it("B: informa explícitamente el componente pendiente y omite su cantidad física", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [
      { id: "item-1", code: "V1", name: "Corredera", glassDescription: "Float", observaciones: "", fabricacionSnapshot: {} },
      { id: "item-2", code: "V2", name: "Paño fijo", glassDescription: "Float", observaciones: "", fabricacionSnapshot: {} },
    ] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([
      row,
      { ...row, quoteItemId: "item-2", componentCode: "V2", componentName: "Paño fijo", logicalComponentId: "component-2", paneId: "component-2:glass-1", paneUnitIds: ["component-2:glass-1:1"], widthMm: null, heightMm: null, validationStatus: "requires_review", warnings: ["Faltan dimensiones válidas del paño."], snapshotFingerprint: "snapshot-2" },
    ]);

    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(body.coverage).toMatchObject({ status: "partial", completeReferenceCount: 1, pendingReferenceCount: 1 });
    expect(body.coverage.pendingReferences[0]).toMatchObject({ componentCode: "V2", componentName: "Paño fijo" });
    expect(body.panes[1].physicalUnitCount).toBeNull();
  });

  it("C: marca no disponible y no inventa unidades para componentes sin dimensiones", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [
      { id: "item-1", code: "V1", name: "Corredera", glassDescription: "Float", observaciones: "", fabricacionSnapshot: null },
      { id: "item-2", code: "V2", name: "Paño fijo", glassDescription: "Float", observaciones: "", fabricacionSnapshot: null },
    ] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([]);

    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(body.coverage).toMatchObject({ status: "unavailable", completeReferenceCount: 0, pendingReferenceCount: 2 });
    expect(body.coverage.pendingReferences.every((reference: { reason: string }) => /No existe un paño técnico congelado/.test(reference.reason))).toBe(true);
    expect(body.coverage.pendingReferences[0]).not.toHaveProperty("physicalUnitCount");
  });

  it("D: informa cobertura parcial cuando un grupo de vidrio está completo y otro no", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [
      { id: "item-1", code: "V1", name: "Corredera", glassDescription: "Float + Laminado", observaciones: "", fabricacionSnapshot: {} },
    ] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([
      row,
      { ...row, glassId: "glass-2", paneId: "component-1:glass-2", paneUnitIds: ["component-1:glass-2:1"], productId: "lam-5", displayName: "Laminado", widthMm: null, heightMm: null, validationStatus: "requires_review", warnings: ["Faltan dimensiones válidas del paño."], snapshotFingerprint: "snapshot-2" },
    ]);

    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(body.coverage).toMatchObject({ status: "partial", completeReferenceCount: 1, pendingReferenceCount: 1 });
    expect(body.coverage.pendingReferences[0].displayName).toBe("Laminado");
  });

  it("E: bloquea en el backend la generación del PDF de proveedor si queda una referencia pendiente", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [
      { id: "item-1", code: "V1", name: "Corredera", glassDescription: "Float", observaciones: "", fabricacionSnapshot: {} },
      { id: "item-2", code: "V2", name: "Paño fijo", glassDescription: "Float", observaciones: "", fabricacionSnapshot: {} },
    ] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([
      row,
      { ...row, quoteItemId: "item-2", componentCode: "V2", componentName: "Paño fijo", logicalComponentId: "component-2", paneId: "component-2:glass-1", paneUnitIds: [], widthMm: null, heightMm: null, quantity: 0, validationStatus: "requires_review", warnings: ["Faltan dimensiones válidas del paño."], snapshotFingerprint: "snapshot-2" },
    ]);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ mode: "provider_pdf" }) }), route);
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.error).toMatch(/cobertura de vidrio está incompleta/i);
    expect(body.coverage.pendingReferences[0].componentCode).toBe("V2");
    expect(optimizeGlassCuttingBatch).not.toHaveBeenCalled();
  });

  it("F: conserva como pendiente un snapshot histórico sin alterar sus datos", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [
      { id: "item-1", code: "V1", name: "Corredera", glassDescription: "Float", observaciones: "", fabricacionSnapshot: {} },
    ] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([{
      ...row, dimensionProvenance: "legacy_snapshot", validationStatus: "requires_review", warnings: ["El paño proviene de un snapshot legacy sin identidad técnica completa."],
    }]);

    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(body.coverage.status).toBe("unavailable");
    expect(body.coverage.pendingReferences[0].reason).toMatch(/snapshot legacy/i);
    expect(supabaseQuery.update).not.toHaveBeenCalled();
  });

  it("expone diagnóstico accionable cuando cotización no tiene snapshots de cubicación", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [{ id: "item-1", code: "V1", fabricacionSnapshot: null }] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([]);
    const response = await GET(new Request("http://localhost"), route);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.panes).toEqual([]);
    expect(body.diagnostics[0]).toMatch(/receta compatible y validada.*guarda explícitamente/i);
  });

  it("pasa reglas físicas explícitas al optimizador y mantiene el costo pendiente", async () => {
    const body = {
      pieceOrientation: "grain_or_coating_directional", confirmManualOperations: true,
      sheetOrientation: "grain_or_coating_directional", sheetSource: "workshop_measurement", sheetSourceReference: "medición QA",
      tableWidthMm: 3210, tableHeightMm: 2250, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 },
      separationMm: 0, minimumStripWidthMm: 1, remnantMinimumWidthMm: 400, remnantMinimumHeightMm: 400,
      remnantOrientation: "rotatable",
      processSourceReference: "confirmado para prueba local",
    };
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }), route);
    expect(response.status).toBe(200);
    expect(optimizeGlassCuttingBatch).toHaveBeenCalledWith(expect.objectContaining({
      panes: [expect.objectContaining({ orientation: "grain_or_coating_directional", snapshotFingerprint: "snapshot-1" })],
      profiles: [expect.objectContaining({ purchaseCost: null, sheet: expect.objectContaining({ orientation: "grain_or_coating_directional", sourceReference: "medición QA" }), process: expect.objectContaining({ workshopValidation: "unvalidated", reusableRemnant: expect.objectContaining({ orientation: "rotatable" }) }) })],
    }));
  });

  it("permite distribución geométrica con corte manual pendiente y sin orientación confirmada", async () => {
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([{
      ...row,
      technicalSpec: { ...row.technicalSpec, manualCutStatus: "pending_validation", pieceOrientation: "unknown" },
      validationStatus: "requires_review",
      warnings: ["Corte manual pendiente.", "Orientación pendiente."],
    }]);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ mode: "geometric_preview" }) }), route);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("geometric_preview");
    expect(body.warnings).toContain("La orientación no confirmada se trata como fija: los paños no se giran.");
    expect(optimizeGlassCuttingBatch).toHaveBeenCalledWith(expect.objectContaining({
      mode: "geometric_preview",
      panes: [expect.objectContaining({ orientation: "fixed", validationStatus: "requires_review" })],
      profiles: [expect.objectContaining({ sheet: expect.objectContaining({ orientation: "unknown" }), process: expect.objectContaining({ kerfOrSeparationMm: 0, supportedOperations: [] }) })],
    }));
  });

  it("usa el formato escrito solo para esta vista si falta en el snapshot", async () => {
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([{
      ...row, technicalSpec: { ...row.technicalSpec, sheetWidthMm: null, sheetHeightMm: null },
    }]);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ mode: "geometric_preview", sheetWidthMm: 3200, sheetHeightMm: 2200 }) }), route);
    expect(response.status).toBe(200);
    expect(optimizeGlassCuttingBatch).toHaveBeenCalledWith(expect.objectContaining({
      profiles: [expect.objectContaining({ sheet: expect.objectContaining({ widthMm: 3200, heightMm: 2200, source: "unknown", sourceReference: null }) })],
    }));
  });

  it("guarda perfil reutilizable solo en metadatos de la ficha del mismo tenant y conserva el resto", async () => {
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([{
      ...row, productId: "43", technicalSpec: { ...row.technicalSpec, productId: "43" },
    }]);
    const body = {
      ...{
        pieceOrientation: "fixed", confirmManualOperations: true, sheetOrientation: "fixed", sheetSource: "catalog", sheetSourceReference: "ficha QA",
        tableWidthMm: 3210, tableHeightMm: 2250, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, separationMm: 0, minimumStripWidthMm: 1,
        remnantMinimumWidthMm: 400, remnantMinimumHeightMm: 400, remnantOrientation: "fixed", processSourceReference: "validado por QA local",
      }, mode: "save_workshop_profile", productId: "43",
    };
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }), route);
    expect(response.status).toBe(200);
    expect(supabaseQuery.eq).toHaveBeenCalledWith("organization_id", 12);
    expect(supabaseQuery.update).toHaveBeenCalledWith(expect.objectContaining({ catalog_metadata: expect.objectContaining({
      fabricationRecipe: { version: 1 }, glassTechnicalSpec: { thicknessMm: 5 }, glassCuttingWorkshopProfile: expect.objectContaining({ version: 1, productId: "43" }),
    }) }));
    expect(optimizeGlassCuttingBatch).not.toHaveBeenCalled();
  });

  it("no genera vista previa para una receta pendiente o dimensiones no congeladas", async () => {
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([{ ...row, recipeStatus: "draft", widthMm: null }]);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ mode: "geometric_preview" }) }), route);
    expect(response.status).toBe(422);
    expect(optimizeGlassCuttingBatch).not.toHaveBeenCalled();
  });

  it("rechaza reglas incompletas antes de calcular", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }), route);
    expect(response.status).toBe(400);
    expect(optimizeGlassCuttingBatch).not.toHaveBeenCalled();
  });

  it("no ejecuta el optimizador si no existen paños congelados", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue({ code: "COT-1170", items: [{ id: "item-1", code: "V1", fabricacionSnapshot: null }] });
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([]);
    const body = {
      pieceOrientation: "fixed", confirmManualOperations: true, sheetOrientation: "fixed", sheetSource: "workshop_measurement", sheetSourceReference: "medición QA",
      tableWidthMm: 2500, tableHeightMm: 1800, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, separationMm: 0, minimumStripWidthMm: 1,
      remnantMinimumWidthMm: 400, remnantMinimumHeightMm: 400, remnantOrientation: "fixed", processSourceReference: "fixture QA",
    };
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }), route);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/No hay cubicación técnica congelada/);
    expect(optimizeGlassCuttingBatch).not.toHaveBeenCalled();
  });

  it("bloquea la simulación si receta, orientación o especificación requieren revisión", async () => {
    (extractNormalizedGlassPanesForOrganization as jest.Mock).mockReturnValue([{ ...row, validationStatus: "requires_review", warnings: ["La receta no está validada por el taller."] }]);
    const body = {
      pieceOrientation: "fixed", confirmManualOperations: true, sheetOrientation: "fixed", sheetSource: "workshop_measurement", sheetSourceReference: "medición QA",
      tableWidthMm: 2500, tableHeightMm: 1800, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, separationMm: 0, minimumStripWidthMm: 1,
      remnantMinimumWidthMm: 400, remnantMinimumHeightMm: 400, remnantOrientation: "fixed", processSourceReference: "fixture QA",
    };
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }), route);
    expect(response.status).toBe(422);
    expect((await response.json()).diagnostics).toContain("La receta no está validada por el taller.");
    expect(optimizeGlassCuttingBatch).not.toHaveBeenCalled();
  });
});
