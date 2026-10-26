import type { GlassPanePlanningUnit, GlassCuttingProfile } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import { optimizeGlassCuttingBatch, isGlassCuttingPlanCurrent } from "@/features/fabricacion/services/glass-sheet-optimizer.service";
import { verifyGlassSheetPlans } from "@/features/fabricacion/services/glass-sheet-plan-verifier.service";

function profile(overrides: Partial<GlassCuttingProfile> = {}): GlassCuttingProfile {
  const base: GlassCuttingProfile = {
    profileId: "mono-6-2500x1800",
    productId: "vidrio-mono-claro",
    thicknessMm: 6,
    category: "monolitico",
    finishOrientationKey: "claro:sin-direccion",
    sheet: { widthMm: 2500, heightMm: 1800, orientation: "rotatable", source: "supplier_document", sourceReference: "spec-test" },
    process: {
      tableWidthMm: 2500,
      tableHeightMm: 1800,
      supportedCategories: ["monolitico"],
      supportedThicknessesMm: [6],
      edgeTrimMm: { top: 10, right: 10, bottom: 10, left: 10 },
      kerfOrSeparationMm: 0,
      minimumStripWidthMm: 1,
      reusableRemnant: { minimumWidthMm: 400, minimumHeightMm: 400, orientation: "rotatable" },
      supportedOperations: ["straight_cut", "quiebre"],
      sequence: [],
      workshopValidation: "unvalidated",
      sourceReference: "workshop-test",
    },
    purchaseCost: null,
  };
  return { ...base, ...overrides, sheet: { ...base.sheet, ...overrides.sheet }, process: { ...base.process, ...overrides.process } };
}

function pane(input: {
  id: string;
  width: number | null;
  height: number | null;
  quantity?: number;
  organizationId?: string;
  quoteId?: string;
  productId?: string | null;
  thickness?: number | null;
  category?: "monolitico" | "laminado" | "dvh" | "templado" | "espejo" | "otro" | "pendiente";
  orientation?: "fixed" | "rotatable" | "grain_or_coating_directional" | "unknown";
  status?: "eligible_for_manual_planning" | "requires_review";
  recipeStatus?: string | null;
  dimensionProvenance?: "validated_recipe" | "recipe_trace" | "manual" | "legacy_snapshot" | "missing";
  manualCutStatus?: "confirmed" | "not_admitted" | "pending_validation";
  sheetWidth?: number | null;
  sheetHeight?: number | null;
}): GlassPanePlanningUnit {
  const quantity = input.quantity ?? 1;
  return {
    organizationId: input.organizationId ?? "org-1",
    quoteId: input.quoteId ?? "quote-1",
    quoteCode: String(input.quoteId ?? "COT-1"),
    quoteItemId: `item-${input.id}`,
    logicalComponentId: `component-${input.id}`,
    glassId: `glass-${input.id}`,
    paneId: `pane-${input.id}`,
    paneUnitIds: Array.from({ length: quantity }, (_, index) => `unit-${input.id}-${index + 1}`),
    componentCode: `V-${input.id}`,
    productId: input.productId === undefined ? "vidrio-mono-claro" : input.productId,
    finishOrientationKey: "claro:sin-direccion",
    orientation: input.orientation ?? "rotatable",
    technicalSpec: {
      version: 1,
      productId: input.productId === undefined ? "vidrio-mono-claro" : input.productId,
      thicknessMm: input.thickness === undefined ? 6 : input.thickness,
      category: input.category ?? "monolitico",
      manualCutStatus: input.manualCutStatus ?? "confirmed",
      technicalReviewConfirmed: true,
      sheetWidthMm: input.sheetWidth === undefined ? 2500 : input.sheetWidth,
      sheetHeightMm: input.sheetHeight === undefined ? 1800 : input.sheetHeight,
      provenance: "catalog",
      sourceProductId: "vidrio-mono-claro",
      sourceValues: null,
      hasConflict: false,
    },
    widthMm: input.width,
    heightMm: input.height,
    quantity,
    dimensionProvenance: input.dimensionProvenance ?? "validated_recipe",
    dimensionTraceRuleIds: ["glass-rule-1"],
    recipeStatus: input.recipeStatus === undefined ? "validated" : input.recipeStatus,
    validationStatus: input.status ?? "eligible_for_manual_planning",
    warnings: input.status === "requires_review" ? ["Revisión requerida"] : [],
    snapshotVersion: 1,
    snapshotFingerprint: `snapshot-${input.id}`,
    normalizationVersion: 1,
  };
}

function run(panes: GlassPanePlanningUnit[], board = profile(), searchNodeLimit = 45_000) {
  const compatiblePanes = panes.map((row) => row.technicalSpec ? {
    ...row,
    technicalSpec: { ...row.technicalSpec, sheetWidthMm: board.sheet.widthMm, sheetHeightMm: board.sheet.heightMm },
  } : row);
  return optimizeGlassCuttingBatch({ panes: compatiblePanes, profiles: [board], searchNodeLimit })[0]!;
}

describe("optimizeGlassCuttingBatch", () => {
  it("TC-01: rechaza de inmediato un paño que excede la plancha", () => {
    const result = run([pane({ id: "oversize", width: 4000, height: 100 })]);
    expect(result.status).toBe("infeasible_piece");
    expect(result.geometricFeasibility).toBe("not_found");
  });

  it("expresa cortes anidados con desplazamiento local y coordenadas absolutas verificables", () => {
    const board = profile({
      sheet: { widthMm: 2500, heightMm: 1800, orientation: "fixed", source: "supplier_document", sourceReference: "test" },
      process: { ...profile().process, tableWidthMm: 2500, tableHeightMm: 1800, edgeTrimMm: { top: 10, right: 10, bottom: 10, left: 10 } },
    });
    const result = run([
      pane({ id: "nested-a", width: 1200, height: 800 }),
      pane({ id: "nested-b", width: 800, height: 600 }),
    ], board);
    expect(result.status).toBe("feasible");
    const sheet = result.sheets[0]!;
    const nodes = new Map<string, Extract<typeof sheet.cutTree, { kind: "cut" }>>();
    const visit = (node: typeof sheet.cutTree) => {
      if (node.kind !== "cut") return;
      nodes.set(node.nodeId, node);
      node.children.forEach(visit);
    };
    visit(sheet.cutTree);
    expect(sheet.cutSequence.length).toBeGreaterThan(1);
    expect(sheet.cutSequence.some((step) => {
      const parent = nodes.get(step.nodeId);
      return parent != null && (parent.rect.xMm > 0 || parent.rect.yMm > 0);
    })).toBe(true);
    for (const step of sheet.cutSequence) {
      const node = nodes.get(step.nodeId)!;
      expect(step.localOffsetMm).toBe(node.offsetMm);
      expect(step.absolutePositionMm).toBe((step.axis === "x" ? node.rect.xMm : node.rect.yMm) + node.offsetMm);
      expect(step.fromMm).toBe(step.axis === "x" ? node.rect.yMm : node.rect.xMm);
      expect(step.toMm).toBe(step.axis === "x" ? node.rect.yMm + node.rect.heightMm : node.rect.xMm + node.rect.widthMm);
    }
  });

  it("TC-02: usa dos planchas cuando el área cabe, pero la geometría no permite dos piezas juntas", () => {
    const board = profile({ sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 1000, tableHeightMm: 1000 } as GlassCuttingProfile["process"] });
    const result = run([pane({ id: "a", width: 600, height: 600 }), pane({ id: "b", width: 600, height: 600 })], board);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(2);
    expect(result.minimumSheetCountProven).toBe(true);
  });

  it("TC-03: rota un paño cuando la orientación lo permite", () => {
    const board = profile({ sheet: { widthMm: 500, heightMm: 1200, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 500, tableHeightMm: 1200 } as GlassCuttingProfile["process"] });
    const result = run([pane({ id: "rotatable", width: 1100, height: 400 })], board);
    expect(result.status).toBe("feasible");
    expect(result.sheets[0]?.panes[0]?.rotated).toBe(true);
    expect(result.sheets[0]?.panes[0]?.rect).toMatchObject({ widthMm: 400, heightMm: 1100 });
  });

  it("TC-04: no rota paños con orientación fija", () => {
    const board = profile({ sheet: { widthMm: 500, heightMm: 1200, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 500, tableHeightMm: 1200 } as GlassCuttingProfile["process"] });
    const result = run([pane({ id: "fixed", width: 1100, height: 400, orientation: "fixed" })], board);
    expect(result.status).toBe("infeasible_piece");
  });

  it("TC-05: no usa solo el área para declarar factible un patrón que exige dos planchas", () => {
    const board = profile({ sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 1000, tableHeightMm: 1000 } as GlassCuttingProfile["process"] });
    const result = run([pane({ id: "a", width: 700, height: 400 }), pane({ id: "b", width: 700, height: 400 }), pane({ id: "c", width: 700, height: 400 })], board);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(2);
  });

  it("TC-06: aplica márgenes y acepta ajuste exacto sin margen", () => {
    const trimmed = profile({ sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 10, right: 10, bottom: 10, left: 10 }, tableWidthMm: 1000, tableHeightMm: 1000 } as GlassCuttingProfile["process"] });
    expect(run([pane({ id: "margin", width: 990, height: 990 })], trimmed).status).toBe("infeasible_piece");
    const noTrim = profile({ sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 1000, tableHeightMm: 1000 } as GlassCuttingProfile["process"] });
    expect(run([pane({ id: "exact", width: 1000, height: 1000 })], noTrim).status).toBe("feasible");
  });

  it("TC-07: rechaza tiras residuales menores al límite y acepta un corte exacto", () => {
    const board = profile({ sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 1000, tableHeightMm: 1000, minimumStripWidthMm: 40 } as GlassCuttingProfile["process"] });
    expect(run([pane({ id: "short-strip", width: 985, height: 1000 })], board).status).toBe("infeasible_proven");
    expect(run([pane({ id: "exact", width: 1000, height: 1000 })], board).status).toBe("feasible");
  });

  it("TC-08: evita un encaje pinwheel no guillotina y usa dos planchas", () => {
    const board = profile({ sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "catalog", sourceReference: "test" }, process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 1000, tableHeightMm: 1000 } as GlassCuttingProfile["process"] });
    const result = run(["a", "b", "c", "d"].map((id) => pane({ id, width: 600, height: 400, orientation: "rotatable" })), board);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(2);
  });

  it("TC-09: expande cantidades a identidades físicas únicas", () => {
    const result = run([pane({ id: "qty", width: 500, height: 500, quantity: 3 })]);
    expect(result.status).toBe("feasible");
    expect(result.sheets.flatMap((sheet) => sheet.panes.map((row) => row.paneUnitId)).sort()).toEqual([
      "unit-qty-1", "unit-qty-2", "unit-qty-3",
    ]);
  });

  it("TC-10: separa grupos por identidad técnica y espesor", () => {
    const panes = [pane({ id: "4mm", width: 500, height: 500, thickness: 4 }), pane({ id: "5mm", width: 500, height: 500, thickness: 5 })];
    const result = optimizeGlassCuttingBatch({ panes, profiles: [
      profile({ profileId: "p4", thicknessMm: 4, process: { ...profile().process, supportedThicknessesMm: [4] } }),
      profile({ profileId: "p5", thicknessMm: 5, process: { ...profile().process, supportedThicknessesMm: [5] } }),
    ] });
    expect(result).toHaveLength(2);
    expect(result.every((row) => row.status === "feasible")).toBe(true);
  });

  it("TC-11/12: pausa paños no admitidos, pendientes, legacy o sin dimensiones", () => {
    for (const value of [
      pane({ id: "manual-not-admitted", width: 500, height: 500, manualCutStatus: "not_admitted" }),
      pane({ id: "pending", width: 500, height: 500, status: "requires_review" }),
      pane({ id: "legacy", width: 500, height: 500, dimensionProvenance: "legacy_snapshot", status: "requires_review" }),
      pane({ id: "missing-dim", width: null, height: 500, dimensionProvenance: "missing", status: "requires_review" }),
    ]) expect(run([value]).status).toBe("requires_review");
    expect(optimizeGlassCuttingBatch({ panes: [pane({ id: "no-profile", width: 500, height: 500 })], profiles: [] })[0]?.status).toBe("requires_review");
  });

  it("TC-13: calcula geometría aunque el costo de compra esté pendiente", () => {
    const result = run([pane({ id: "no-cost", width: 500, height: 500 })], profile({ purchaseCost: null }));
    expect(result.status).toBe("feasible");
    expect(result.summary.costStatus).toBe("pending");
    expect(result.summary.purchaseCost).toBeNull();
  });

  it("permite vista geométrica con validación manual pendiente y orientación desconocida, sin girar el paño", () => {
    const sourcePane = pane({ id: "preview-pending", width: 700, height: 900, manualCutStatus: "pending_validation", orientation: "unknown", status: "requires_review" });
    const previewProfile = profile({
      sheet: { widthMm: 2500, heightMm: 1800, orientation: "unknown", source: "unknown", sourceReference: null },
      process: { ...profile().process, tableWidthMm: 2500, tableHeightMm: 1800, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, minimumStripWidthMm: 0, reusableRemnant: { minimumWidthMm: 1, minimumHeightMm: 1, orientation: "unknown" }, supportedOperations: [] },
    });
    const result = optimizeGlassCuttingBatch({ panes: [sourcePane], profiles: [previewProfile], mode: "geometric_preview" })[0]!;
    expect(result.status).toBe("feasible");
    expect(result.verification.passed).toBe(true);
    expect(result.productionReadiness).toBe("requires_workshop_validation");
    expect(result.sheets[0]?.panes[0]?.rotated).toBe(false);
    expect(result.sheets[0]?.cutSequence.length).toBeGreaterThan(0);
  });

  it("permite PDF preliminar con medidas manuales, pero sigue bloqueando el modo de taller sin receta validada", () => {
    const manualPane = pane({
      id: "manual-preview",
      width: 500,
      height: 1000,
      recipeStatus: null,
      dimensionProvenance: "manual",
    });
    const preview = optimizeGlassCuttingBatch({
      panes: [manualPane],
      profiles: [profile()],
      mode: "geometric_preview",
    })[0]!;

    expect(preview.status).toBe("feasible");
    expect(preview.verification.passed).toBe(true);
    expect(preview.productionReadiness).toBe("requires_workshop_validation");

    const workshop = optimizeGlassCuttingBatch({ panes: [manualPane], profiles: [profile()], mode: "workshop" })[0]!;
    expect(workshop.status).toBe("requires_review");
    expect(workshop.errors).toContain("La receta del paño pane-manual-preview no está validada.");
  });

  it("TC-14: clasifica candidatos de retazo según umbrales explícitos y conserva áreas", () => {
    const result = run([pane({ id: "remnant", width: 1600, height: 1000 })], profile({
      sheet: { widthMm: 2500, heightMm: 1800, orientation: "fixed", source: "catalog", sourceReference: "test" },
      process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 2500, tableHeightMm: 1800,
        reusableRemnant: { minimumWidthMm: 400, minimumHeightMm: 400, orientation: "fixed" } } as GlassCuttingProfile["process"],
    }));
    expect(result.status).toBe("feasible");
    expect(result.verification.passed).toBe(true);
    expect(result.summary.reusableRemnantsMm2 + result.summary.wasteMm2 + result.summary.paneAreaMm2).toBe(2500 * 1800);
    expect(result.sheets[0]?.remnants.some((row) => row.classification === "reusable_candidate")).toBe(true);
  });

  it("TC-15: cambia el fingerprint si cambian dimensiones congeladas", () => {
    const first = run([pane({ id: "fingerprint", width: 500, height: 500 })]);
    const second = run([pane({ id: "fingerprint", width: 501, height: 500 })]);
    expect(isGlassCuttingPlanCurrent(first, second.inputFingerprint)).toBe(false);
  });

  it("TC-16: es determinista al permutar entradas, respeta enteros y verifica sin solapes", () => {
    const panes = [pane({ id: "a", width: 700, height: 400 }), pane({ id: "b", width: 400, height: 700 }), pane({ id: "c", width: 300, height: 400 })];
    const first = run(panes);
    const second = run([...panes].reverse());
    expect(second.inputFingerprint).toBe(first.inputFingerprint);
    expect(second.sheets.map((sheet) => sheet.cutTree)).toEqual(first.sheets.map((sheet) => sheet.cutTree));
    expect(verifyGlassSheetPlans({ panes, profiles: [profile()], sheets: first.sheets }).passed).toBe(true);
    for (const sheet of first.sheets) for (const pane of sheet.panes) {
      expect(Number.isSafeInteger(pane.rect.xMm + pane.rect.widthMm)).toBe(true);
      expect(Number.isSafeInteger(pane.rect.yMm + pane.rect.heightMm)).toBe(true);
    }
  });

  it("el verificador rechaza una lista de piezas que no coincide con el árbol", () => {
    const source = pane({ id: "tamper", width: 500, height: 500 });
    const result = run([source]);
    const sheet = result.sheets[0]!;
    const tamperedSheets = [{
      ...sheet,
      panes: sheet.panes.map((row) => ({ ...row, rect: { ...row.rect, xMm: row.rect.xMm + 1 } })),
    }];
    expect(verifyGlassSheetPlans({ panes: [source], profiles: [profile()], sheets: tamperedSheets }).passed).toBe(false);
  });

  it("rechaza lotes que mezclan organizaciones", () => {
    const result = optimizeGlassCuttingBatch({
      panes: [pane({ id: "org-a", width: 500, height: 500 }), pane({ id: "org-b", width: 500, height: 500, organizationId: "org-2" })],
      profiles: [profile()],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe("invalid_input");
  });

  it("resuelve el caso de referencia 4×535×872 + 2×600×1000 en una plancha útil", () => {
    const board = profile();
    const panes = [pane({ id: "small", width: 535, height: 872, quantity: 4 }), pane({ id: "large", width: 600, height: 1000, quantity: 2 })];
    const startedAt = performance.now();
    const result = run(panes, board);
    console.info(`glass optimizer benchmark referencia n=6: sheets=${result.summary.sheetCount}, states=${result.search.visitedStates}, elapsedMs=${(performance.now() - startedAt).toFixed(2)}`);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(1);
    expect(result.summary.paneAreaMm2).toBe(3_066_080);
    expect(result.summary.usableSheetAreaMm2 - result.summary.paneAreaMm2 - result.summary.separationLossMm2).toBe(1_348_320);
    expect(result.verification.passed).toBe(true);
    expect(result.productionReadiness).toBe("requires_workshop_validation");
  });

  it("mantiene búsqueda acotada para 12 unidades físicas", () => {
    const board = profile({
      sheet: { widthMm: 2500, heightMm: 1800, orientation: "fixed", source: "catalog", sourceReference: "test" },
      process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 2500, tableHeightMm: 1800 } as GlassCuttingProfile["process"],
    });
    const result = run([pane({ id: "batch-12", width: 500, height: 500, quantity: 12 })], board);
    expect(result.status).toBe("feasible");
    expect(result.summary.paneCount).toBe(12);
    expect(result.search.visitedStates).toBeLessThan(250_000);
  });

  it("construye una cuadrícula verificable de 20 unidades sin ampliar la búsqueda exacta", () => {
    const board = profile({
      sheet: { widthMm: 2500, heightMm: 1800, orientation: "fixed", source: "catalog", sourceReference: "test" },
      process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 2500, tableHeightMm: 1800 } as GlassCuttingProfile["process"],
    });
    const result = run([pane({ id: "batch-20", width: 100, height: 100, quantity: 20 })], board);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(1);
    expect(result.summary.paneCount).toBe(20);
    expect(result.search.visitedStates).toBe(0);
  });

  it("encuentra un plan constructivo para el contraejemplo de cinco piezas que agotaba la búsqueda", () => {
    const board = profile({
      sheet: { widthMm: 2500, heightMm: 1800, orientation: "fixed", source: "catalog", sourceReference: "test" },
      process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 2500, tableHeightMm: 1800 } as GlassCuttingProfile["process"],
    });
    const dimensions = [[543, 827], [530, 827], [1725, 880], [1760, 885], [487, 995]] as const;
    const result = run(dimensions.map(([width, height], index) => pane({ id: `qa-five-${index}`, width, height })), board, 1);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(2);
    expect(result.minimumSheetCountProven).toBe(false);
    expect(result.verification.passed).toBe(true);
  });

  it("conserva un retazo grande antes de fragmentarlo al colocar dos paños fijos", () => {
    const board = profile({
      sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "catalog", sourceReference: "test" },
      process: {
        edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 1000, tableHeightMm: 1000,
        reusableRemnant: { minimumWidthMm: 600, minimumHeightMm: 800, orientation: "fixed" },
      } as GlassCuttingProfile["process"],
    });
    const result = run([
      pane({ id: "wide-tall", width: 400, height: 600, orientation: "fixed" }),
      pane({ id: "small", width: 400, height: 400, orientation: "fixed" }),
    ], board);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(1);
    expect(result.sheets[0]?.remnants).toContainEqual(expect.objectContaining({ rect: { xMm: 400, yMm: 0, widthMm: 600, heightMm: 1000 }, classification: "reusable_candidate" }));
  });

  it("el verificador rechaza formato bruto alterado, retazos duplicados y perfiles pendientes de proceso", () => {
    const source = pane({ id: "verify-hardening", width: 500, height: 500 });
    const result = run([source]);
    const sheet = result.sheets[0]!;
    const badRaw = [{ ...sheet, rawSheet: { ...sheet.rawSheet, widthMm: sheet.rawSheet.widthMm - 100 } }];
    expect(verifyGlassSheetPlans({ panes: [source], profiles: [profile()], sheets: badRaw }).passed).toBe(false);

    const duplicateRemnant = sheet.remnants.length > 1
      ? [{ ...sheet, remnants: [sheet.remnants[0]!, ...sheet.remnants.slice(1).map((row) => ({ ...row, rect: sheet.remnants[0]!.rect, areaMm2: sheet.remnants[0]!.areaMm2 }))] }]
      : [sheet];
    expect(verifyGlassSheetPlans({ panes: [source], profiles: [profile()], sheets: duplicateRemnant }).passed).toBe(false);

    const unknownProfile = profile({ sheet: { orientation: "unknown", source: "unknown" } });
    expect(verifyGlassSheetPlans({ panes: [source], profiles: [unknownProfile], sheets: [sheet] }).passed).toBe(false);
    const pendingProfile = profile({ process: { workshopValidation: "requires_review" } });
    expect(verifyGlassSheetPlans({ panes: [source], profiles: [pendingProfile], sheets: [sheet] }).passed).toBe(false);
  });

  it("construye y verifica lotes medianos y grandes sin afirmar mínimo global", () => {
    const board = profile({
      sheet: { widthMm: 2500, heightMm: 1800, orientation: "fixed", source: "catalog", sourceReference: "test" },
      process: { edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, tableWidthMm: 2500, tableHeightMm: 1800 } as GlassCuttingProfile["process"],
    });
    const runVaried = (count: number) => run(Array.from({ length: count }, (_, index) => pane({
      id: `varied-${count}-${index}`,
      width: 420 + (index * 137) % 580,
      height: 620 + (index * 191) % 780,
      orientation: index % 3 === 0 ? "fixed" : "rotatable",
    })), board);
    for (const count of [10, 20, 50, 100]) {
      const startedAt = performance.now();
      const result = runVaried(count);
      const elapsedMs = performance.now() - startedAt;
      console.info(`glass optimizer benchmark n=${count}: sheets=${result.summary.sheetCount}, states=${result.search.visitedStates}, elapsedMs=${elapsedMs.toFixed(2)}`);
      expect(result.status).toBe("feasible");
      expect(result.verification.passed).toBe(true);
      expect(result.summary.paneCount).toBe(count);
      expect(result.minimumSheetCountProven).toBe(false);
    }
    const laCaleraRows = [[829, 2017, 2], [843, 2015, 2], [876, 2281, 4], [857, 2042, 2], [543, 827, 1], [530, 827, 1], [867, 2046, 2], [887, 2045, 2], [862, 2049, 2], [867, 2040, 2], [806, 2042, 2], [487, 995, 1], [427, 942, 1], [1725, 880, 1], [1760, 885, 1]] as const;
    const laCaleraPanes = laCaleraRows.map(([width, height, quantity], index) => pane({ id: `la-calera-${index + 1}`, width, height, quantity, orientation: "rotatable" }));
    const laCalera = run(laCaleraPanes, board);
    console.info(`glass optimizer benchmark La Calera n=26: sheets=${laCalera.summary.sheetCount}, states=${laCalera.search.visitedStates}`);
    expect(laCalera.status).toBe("feasible");
    expect(laCalera.summary.sheetCount).toBeLessThanOrEqual(12);
    expect(laCalera.summary.paneCount).toBe(26);
    expect(laCalera.verification.passed).toBe(true);
    expect(laCalera.minimumSheetCountProven).toBe(false);
  });

  it("construye un árbol guillotina de una plancha para 8 piezas fijas y una tira", () => {
    const board = profile({
      sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "workshop_measurement", sourceReference: "regression" },
      process: { ...profile().process, tableWidthMm: 1000, tableHeightMm: 1000, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, minimumStripWidthMm: 1 },
    });
    const pieces = Array.from({ length: 8 }, (_, index) => pane({ id: `fixed-${index}`, width: 240, height: 450, orientation: "fixed" }));
    pieces.push(pane({ id: "long-strip", width: 960, height: 100, orientation: "fixed" }));
    const result = run(pieces, board);
    expect(result.status).toBe("feasible");
    expect(result.summary.sheetCount).toBe(1);
    expect(result.verification.passed).toBe(true);
  });

  it("prefiere un corte que conserva el retazo horizontal de 600 por 1000", () => {
    const board = profile({
      sheet: { widthMm: 1000, heightMm: 1000, orientation: "fixed", source: "workshop_measurement", sourceReference: "regression" },
      process: { ...profile().process, tableWidthMm: 1000, tableHeightMm: 1000, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 },
        minimumStripWidthMm: 1, reusableRemnant: { minimumWidthMm: 600, minimumHeightMm: 800, orientation: "fixed" } },
    });
    const result = run([pane({ id: "large", width: 400, height: 600, orientation: "fixed" }), pane({ id: "small", width: 400, height: 400, orientation: "fixed" })], board);
    expect(result.status).toBe("feasible");
    expect(result.summary.reusableRemnantsMm2).toBe(600_000);
  });

  it("frena una expansión excesiva de cantidades antes de asignar unidades", () => {
    const row = pane({ id: "too-many", width: 100, height: 100, quantity: 2001 });
    const result = run([row]);
    expect(result.status).toBe("invalid_input");
    expect(result.errors[0]).toContain("límite seguro");
  });
});
