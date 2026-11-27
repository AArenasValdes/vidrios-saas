/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { WorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import type { FabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";
import { CompactCutsView } from "../fabricacion-movil-compact-views";

describe("CompactCutsView — despiece preliminar con distribución teórica (Serie 5000)", () => {
  it("muestra largo preliminar, tiras teóricas y sobrante teórico sin promover cortes a confirmados", () => {
    const summary: FabricationQuoteSummary = {
      items: [],
      compositionsPendingRecipe: [],
      totalItems: 2,
      totalProfilesMl: 0,
      totalGlassM2: 0,
      totalAccessoryUnits: 0,
      totalBars: null,
      trabajoSnapshot: null,
      profileCoverage: {
        status: "partial",
        jointPlanStatus: "blocked",
        requiredCount: 2,
        readyCount: 0,
        pendingCount: 2,
        items: [],
      },
    };
    const materialsDocument: WorkMaterialsDocument = {
      profiles: [],
      accessories: [],
      glassOrder: [],
      profilePriceReferences: [],
      hasJointCuttingPlan: false,
      warnings: [],
    };
    const workOrder: FabricationWorkOrder = {
      materials: materialsDocument,
      cutGroups: [],
      preliminaryCutGroups: [
        {
          key: "v1|5001|6000|1|0",
          itemId: "v1",
          technicalCode: "5001",
          profileName: "Riel superior",
          finish: "Aluminio mate",
          barIndex: 1,
          commercialLengthMm: 6000,
          usedMm: 1400,
          theoreticalRemnantMm: 4600,
          trimMm: null,
          kerfMm: null,
          cuts: [{ itemCode: "V1", component: "Ventana corredera 2 hojas", functionName: "Riel superior", quantity: 1, lengthMm: 1400 }],
        },
        {
          key: "v2|5003|6000|1|0",
          itemId: "v2",
          technicalCode: "5003",
          profileName: "Jamba",
          finish: "Aluminio mate",
          barIndex: 1,
          commercialLengthMm: 6000,
          usedMm: 2394,
          theoreticalRemnantMm: 3606,
          trimMm: null,
          kerfMm: null,
          cuts: [{ itemCode: "V2", component: "Ventana corredera 2 hojas", functionName: "Jamba", quantity: 2, lengthMm: 1197 }],
        },
      ],
      reviewCutGroups: [],
      documentStatus: {
        state: "partial",
        label: "DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN",
        pendingComponents: [],
      },
      hasJointBars: false,
      cutPlanPhysicalState: "sin_pauta",
      glass: [],
      pending: [],
      pricing: { status: "pending", knownNetTotal: null, currency: "CLP", pricedCount: 0, pendingCount: 0 },
    };

    render(
      <CompactCutsView
        summary={summary}
        workOrder={workOrder}
        materialsDocument={materialsDocument}
        companyName="Vidrios Gonzalez"
        quoteCode="COT-271126-002"
        work="QA-PROD-14A4-L5000"
        issueDate="27 nov 2026"
      />
    );

    expect(screen.getByText("Largo preliminar")).toBeInTheDocument();
    expect(screen.getByText("3,79 ml")).toBeInTheDocument();
    expect(screen.getByText("Tiras teóricas")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("8.206 mm")).toBeInTheDocument();
    expect(screen.getByText(/Sin pauta operativa confirmada/i)).toBeInTheDocument();
    expect(screen.getByText(/Tira #1 · 6\.000 mm \(teórica\) · Usado 1\.400 mm · Sobrante teórico 4\.600 mm/i)).toBeInTheDocument();
    expect(screen.getByText(/Documento parcial · no apto para fabricación/i)).toBeInTheDocument();
    expect(screen.queryByText("No hay cortes guardados para este trabajo.")).not.toBeInTheDocument();
    expect(screen.queryByText("Distribución por tira no calculada.")).not.toBeInTheDocument();
  });

  it("muestra largo en revisión, tiras teóricas y sobrantes para recetas PVC sin validar sin confundirlas con snapshots incompatibles", () => {
    const summary: FabricationQuoteSummary = {
      items: [],
      compositionsPendingRecipe: [],
      totalItems: 2,
      totalProfilesMl: 0,
      totalGlassM2: 0,
      totalAccessoryUnits: 0,
      totalBars: null,
      trabajoSnapshot: null,
      profileCoverage: {
        status: "partial",
        jointPlanStatus: "blocked",
        requiredCount: 2,
        readyCount: 0,
        pendingCount: 2,
        items: [],
      },
    };
    const materialsDocument: WorkMaterialsDocument = {
      profiles: [],
      accessories: [],
      glassOrder: [],
      profilePriceReferences: [],
      hasJointCuttingPlan: false,
      warnings: [],
    };
    const workOrder: FabricationWorkOrder = {
      materials: materialsDocument,
      cutGroups: [],
      preliminaryCutGroups: [],
      reviewCutGroups: [
        {
          key: "v1|7401|5800|1|0",
          itemId: "v1",
          technicalCode: "7401",
          profileName: "Marco corredera 2 hojas",
          finish: null,
          barIndex: 1,
          commercialLengthMm: 5800,
          usedMm: 5224,
          theoreticalRemnantMm: 576,
          trimMm: null,
          kerfMm: null,
          reviewReasonKind: "unvalidated",
          cuts: [
            { itemCode: "V1", component: "Ventana corredera 2 hojas", functionName: "Marco", quantity: 2, lengthMm: 1406 },
            { itemCode: "V1", component: "Ventana corredera 2 hojas", functionName: "Marco", quantity: 2, lengthMm: 1206 },
          ],
        },
      ],
      documentStatus: {
        state: "partial",
        label: "DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN",
        pendingComponents: [],
      },
      hasJointBars: false,
      cutPlanPhysicalState: "sin_pauta",
      glass: [],
      pending: [],
      pricing: { status: "pending", knownNetTotal: null, currency: "CLP", pricedCount: 0, pendingCount: 0 },
    };

    render(
      <CompactCutsView
        summary={summary}
        workOrder={workOrder}
        materialsDocument={materialsDocument}
        companyName="Vidrios Gonzalez"
        quoteCode="COT-271126-003"
        work="QA-PROD-PVC-7400"
        issueDate="27 nov 2026"
      />
    );

    expect(screen.getByText("Largo en revisión")).toBeInTheDocument();
    expect(screen.getByText("5,22 ml")).toBeInTheDocument();
    expect(screen.getByText("Tiras teóricas")).toBeInTheDocument();
    expect(screen.getByText("576 mm")).toBeInTheDocument();
    expect(screen.getByText("Recetas sin validar · revisión teórica")).toBeInTheDocument();
    expect(screen.getByText(/Tira #1 · 5\.800 mm \(teórica\) · Usado 5\.224 mm · Sobrante teórico 576 mm/i)).toBeInTheDocument();
    expect(screen.queryByText(/Snapshot incompatible/i)).not.toBeInTheDocument();
  });
});
