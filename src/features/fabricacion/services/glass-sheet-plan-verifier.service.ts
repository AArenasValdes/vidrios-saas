import type {
  GlassCuttingProfile,
  GlassCutTreeNode,
  GlassPanePlanningUnit,
  GlassPlannedPane,
  GlassPlannedRemnant,
  GlassRect,
  GlassSheetPlan,
} from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";

const isPositiveInt = (value: number) => Number.isSafeInteger(value) && value > 0;
const isNonNegativeInt = (value: number) => Number.isSafeInteger(value) && value >= 0;
const area = (rect: GlassRect) => rect.widthMm * rect.heightMm;

function sameRect(a: GlassRect, b: GlassRect): boolean {
  return a.xMm === b.xMm && a.yMm === b.yMm && a.widthMm === b.widthMm && a.heightMm === b.heightMm;
}

function intersects(a: GlassRect, b: GlassRect): boolean {
  return a.xMm < b.xMm + b.widthMm && b.xMm < a.xMm + a.widthMm
    && a.yMm < b.yMm + b.heightMm && b.yMm < a.yMm + a.heightMm;
}

function expectedPaneSize(pane: GlassPanePlanningUnit, rotated: boolean): { widthMm: number; heightMm: number } {
  if (rotated) return { widthMm: pane.heightMm ?? 0, heightMm: pane.widthMm ?? 0 };
  return { widthMm: pane.widthMm ?? 0, heightMm: pane.heightMm ?? 0 };
}

function collectTree(
  node: GlassCutTreeNode,
  findings: string[],
  panes: Map<string, { rect: GlassRect; rotated: boolean }>,
  remnants: Map<string, GlassRect>,
  cutIds: string[],
  cutSteps: Array<{ nodeId: string; parentNodeId: string; axis: "x" | "y"; localOffsetMm: number; absolutePositionMm: number; fromMm: number; toMm: number; separationMm: number }>,
  parentNodeId: string,
  expected: GlassRect
): void {
  if (![node.rect.xMm, node.rect.yMm, node.rect.widthMm, node.rect.heightMm].every(Number.isSafeInteger)
    || node.rect.widthMm <= 0 || node.rect.heightMm <= 0) {
    findings.push(`El nodo ${node.nodeId} tiene coordenadas o medidas no enteras positivas.`);
  }
  if (!sameRect(node.rect, expected)) findings.push(`El nodo ${node.nodeId} no conserva el rectángulo asignado por su padre.`);
  if (node.kind === "pane") {
    if (panes.has(node.paneUnitId)) findings.push(`El árbol repite la unidad ${node.paneUnitId}.`);
    panes.set(node.paneUnitId, { rect: node.rect, rotated: node.rotated });
    return;
  }
  if (node.kind === "remnant") {
    if (remnants.has(node.nodeId)) findings.push(`El árbol repite ID de remanente ${node.nodeId}.`);
    remnants.set(node.nodeId, node.rect);
    return;
  }
  cutIds.push(node.nodeId);
  cutSteps.push({
    nodeId: node.nodeId,
    parentNodeId,
    axis: node.axis,
    localOffsetMm: node.offsetMm,
    absolutePositionMm: (node.axis === "x" ? node.rect.xMm : node.rect.yMm) + node.offsetMm,
    fromMm: node.axis === "x" ? node.rect.yMm : node.rect.xMm,
    toMm: node.axis === "x" ? node.rect.yMm + node.rect.heightMm : node.rect.xMm + node.rect.widthMm,
    separationMm: node.separationMm,
  });
  if (!isPositiveInt(node.rect.widthMm) || !isPositiveInt(node.rect.heightMm)
    || !isNonNegativeInt(node.offsetMm) || !isNonNegativeInt(node.separationMm)) {
    findings.push(`El corte ${node.nodeId} contiene una separación u offset inválido.`);
    return;
  }
  const first = node.children[0].rect;
  const second = node.children[1].rect;
  if (node.axis === "x") {
    const expectedFirst = { ...node.rect, widthMm: node.offsetMm };
    const expectedSecond = {
      xMm: node.rect.xMm + node.offsetMm + node.separationMm,
      yMm: node.rect.yMm,
      widthMm: node.rect.widthMm - node.offsetMm - node.separationMm,
      heightMm: node.rect.heightMm,
    };
    if (node.offsetMm <= 0 || expectedSecond.widthMm <= 0 || !sameRect(first, expectedFirst) || !sameRect(second, expectedSecond)) {
      findings.push(`El corte vertical ${node.nodeId} no divide su bloque padre en dos rectángulos válidos.`);
    }
    if (node.separationMm > node.rect.widthMm) findings.push(`La separación del corte ${node.nodeId} excede el bloque.`);
  } else {
    const expectedFirst = { ...node.rect, heightMm: node.offsetMm };
    const expectedSecond = {
      xMm: node.rect.xMm,
      yMm: node.rect.yMm + node.offsetMm + node.separationMm,
      widthMm: node.rect.widthMm,
      heightMm: node.rect.heightMm - node.offsetMm - node.separationMm,
    };
    if (node.offsetMm <= 0 || expectedSecond.heightMm <= 0 || !sameRect(first, expectedFirst) || !sameRect(second, expectedSecond)) {
      findings.push(`El corte horizontal ${node.nodeId} no divide su bloque padre en dos rectángulos válidos.`);
    }
    if (node.separationMm > node.rect.heightMm) findings.push(`La separación del corte ${node.nodeId} excede el bloque.`);
  }
  collectTree(node.children[0], findings, panes, remnants, cutIds, cutSteps, node.nodeId, first);
  collectTree(node.children[1], findings, panes, remnants, cutIds, cutSteps, node.nodeId, second);
}

function isReusable(remnant: GlassRect, profile: GlassCuttingProfile): boolean {
  const rules = profile.process.reusableRemnant;
  const canUse = (width: number, height: number) =>
    width >= rules.minimumWidthMm && height >= rules.minimumHeightMm;
  if (canUse(remnant.widthMm, remnant.heightMm)) return true;
  return rules.orientation === "rotatable" && canUse(remnant.heightMm, remnant.widthMm);
}

/** Independent structural and area verification. It does not call optimizer helpers. */
export function verifyGlassSheetPlans(input: {
  panes: readonly GlassPanePlanningUnit[];
  profiles: readonly GlassCuttingProfile[];
  sheets: readonly GlassSheetPlan[];
  mode?: "workshop" | "geometric_preview";
}): { passed: boolean; findings: string[] } {
  const mode = input.mode ?? "workshop";
  const findings: string[] = [];
  const expected = new Map(input.panes.flatMap((pane) => pane.paneUnitIds.map((id) => [id, pane] as const)));
  const found = new Map<string, GlassPlannedPane>();
  const allRemnantIds = new Set<string>();
  const allCutIds = new Set<string>();
  const sheetIds = new Set<string>();

  if (expected.size !== input.panes.reduce((sum, pane) => sum + pane.quantity, 0)) {
    findings.push("Las unidades físicas esperadas no tienen identidad única.");
  }
  for (const sheet of input.sheets) {
    if (sheetIds.has(sheet.sheetId)) findings.push(`ID de plancha duplicado: ${sheet.sheetId}.`);
    sheetIds.add(sheet.sheetId);
    const profile = input.profiles.find((candidate) => candidate.profileId === sheet.profileId);
    if (!profile) {
      findings.push(`La plancha ${sheet.sheetId} referencia un perfil de vidrio inexistente.`);
      continue;
    }
    if (profile.process.workshopValidation === "requires_review") findings.push(`El perfil ${profile.profileId} requiere revisión del taller.`);
    if (mode === "workshop" && (profile.sheet.orientation === "unknown" || profile.sheet.source === "unknown")) {
      findings.push(`La orientación o fuente del formato ${profile.profileId} requiere confirmación.`);
    }
    if (mode === "workshop" && (!profile.process.supportedOperations.includes("straight_cut") || !profile.process.supportedOperations.includes("quiebre"))) {
      findings.push(`El perfil ${profile.profileId} no confirma rayado recto y quiebre.`);
    }
    if (!isPositiveInt(sheet.rawSheet.widthMm) || !isPositiveInt(sheet.rawSheet.heightMm)
      || !isPositiveInt(sheet.usableSheet.widthMm) || !isPositiveInt(sheet.usableSheet.heightMm)) {
      findings.push(`La plancha ${sheet.sheetId} tiene dimensiones inválidas.`);
      continue;
    }
    const declaredRawSheet = { xMm: 0, yMm: 0, widthMm: profile.sheet.widthMm, heightMm: profile.sheet.heightMm };
    if (!sameRect(sheet.rawSheet, declaredRawSheet)) findings.push(`La plancha bruta de ${sheet.sheetId} no coincide con el formato declarado en el perfil.`);
    const tableFits = (sheet.rawSheet.widthMm <= profile.process.tableWidthMm && sheet.rawSheet.heightMm <= profile.process.tableHeightMm)
      || (profile.sheet.orientation === "rotatable" && sheet.rawSheet.heightMm <= profile.process.tableWidthMm
        && sheet.rawSheet.widthMm <= profile.process.tableHeightMm);
    if (!tableFits) findings.push(`La plancha ${sheet.sheetId} excede la mesa registrada para el taller.`);
    const trims = profile.process.edgeTrimMm;
    const expectedUsable = {
      xMm: sheet.rawSheet.xMm + trims.left,
      yMm: sheet.rawSheet.yMm + trims.top,
      widthMm: sheet.rawSheet.widthMm - trims.left - trims.right,
      heightMm: sheet.rawSheet.heightMm - trims.top - trims.bottom,
    };
    if (!sameRect(sheet.usableSheet, expectedUsable)) findings.push(`La superficie útil de ${sheet.sheetId} no respeta los despuntes configurados.`);
    if (sheet.usableSheet.xMm < sheet.rawSheet.xMm || sheet.usableSheet.yMm < sheet.rawSheet.yMm
      || sheet.usableSheet.xMm + sheet.usableSheet.widthMm > sheet.rawSheet.xMm + sheet.rawSheet.widthMm
      || sheet.usableSheet.yMm + sheet.usableSheet.heightMm > sheet.rawSheet.yMm + sheet.rawSheet.heightMm) {
      findings.push(`La superficie útil de ${sheet.sheetId} sale de la plancha bruta.`);
    }

    const treePanes = new Map<string, { rect: GlassRect; rotated: boolean }>();
    const treeRemnants = new Map<string, GlassRect>();
    const treeCutIds: string[] = [];
    const reconstructedCutSteps: Array<{ nodeId: string; parentNodeId: string; axis: "x" | "y"; localOffsetMm: number; absolutePositionMm: number; fromMm: number; toMm: number; separationMm: number }> = [];
    collectTree(sheet.cutTree, findings, treePanes, treeRemnants, treeCutIds, reconstructedCutSteps, "usable-sheet", sheet.usableSheet);
    if (sheet.cutTree.kind !== "pane" && sheet.cutTree.kind !== "cut" && sheet.cutTree.kind !== "remnant") {
      findings.push(`El árbol de ${sheet.sheetId} tiene un nodo raíz inválido.`);
    }
    if (treeCutIds.length !== new Set(treeCutIds).size) findings.push(`El árbol de ${sheet.sheetId} repite IDs de corte.`);
    treeCutIds.forEach((id) => {
      if (allCutIds.has(id)) findings.push(`ID de corte duplicado entre planchas: ${id}.`);
      allCutIds.add(id);
    });
    if (treeCutIds.length !== sheet.cutSequence.length
      || treeCutIds.some((id, index) => sheet.cutSequence[index]?.nodeId !== id)) {
      findings.push(`La secuencia de la plancha ${sheet.sheetId} no coincide con el recorrido del árbol guillotina.`);
    }
    sheet.cutSequence.forEach((step, index) => {
      if (step.ordinal !== index + 1 || step.operation !== "rayado_y_quiebre") {
        findings.push(`La secuencia de cortes de ${sheet.sheetId} tiene ordinal u operación inválida.`);
      }
      const reconstructed = reconstructedCutSteps[index];
      if (!reconstructed || step.nodeId !== reconstructed.nodeId || step.parentNodeId !== reconstructed.parentNodeId
        || step.axis !== reconstructed.axis || step.localOffsetMm !== reconstructed.localOffsetMm
        || step.absolutePositionMm !== reconstructed.absolutePositionMm
        || step.fromMm !== reconstructed.fromMm || step.toMm !== reconstructed.toMm
        || step.separationMm !== reconstructed.separationMm) {
        findings.push(`El paso ${step.ordinal} de ${sheet.sheetId} no representa el corte reconstruido del árbol.`);
      }
    });

    const sheetPanes = sheet.panes;
    for (let index = 0; index < sheetPanes.length; index += 1) {
      const pane = sheetPanes[index]!;
      const source = expected.get(pane.paneUnitId);
      if (!source) findings.push(`El plan contiene una unidad no solicitada: ${pane.paneUnitId}.`);
      if (found.has(pane.paneUnitId)) findings.push(`La unidad ${pane.paneUnitId} aparece más de una vez.`);
      found.set(pane.paneUnitId, pane);
      const treePane = treePanes.get(pane.paneUnitId);
      if (!treePane) findings.push(`La unidad ${pane.paneUnitId} no aparece como hoja del árbol.`);
      else if (!sameRect(treePane.rect, pane.rect) || treePane.rotated !== pane.rotated) {
        findings.push(`La posición u orientación de ${pane.paneUnitId} difiere entre el árbol y la lista de paños.`);
      }
      if (source) {
        const size = expectedPaneSize(source, pane.rotated);
        if (!sameRect(pane.rect, { ...pane.rect, widthMm: size.widthMm, heightMm: size.heightMm })) {
          findings.push(`Las dimensiones de ${pane.paneUnitId} no corresponden a su orientación declarada.`);
        }
        if (pane.rotated && source.orientation !== "rotatable") findings.push(`La unidad ${pane.paneUnitId} fue rotada aunque su orientación no lo permite.`);
        if ((mode === "workshop" && (source.validationStatus !== "eligible_for_manual_planning" || source.technicalSpec?.manualCutStatus !== "confirmed"
          || !source.technicalSpec?.technicalReviewConfirmed && ["laminado", "dvh", "templado", "espejo", "otro"].includes(source.technicalSpec?.category ?? "pendiente")))
          || (mode === "workshop" && source.dimensionProvenance !== "validated_recipe")
          || (mode === "geometric_preview" && !(source.recipeStatus === "validated" && source.dimensionProvenance === "validated_recipe")
            && source.dimensionProvenance !== "manual" && source.dimensionProvenance !== "recipe_trace")
          || !Number.isSafeInteger(source.commercialQuantity) || Number(source.commercialQuantity) <= 0
          || source.quantity % Number(source.commercialQuantity) !== 0
          || source.dimensionProvenance === "legacy_snapshot" || source.technicalSpec?.hasConflict
          || (mode === "geometric_preview" && source.technicalSpec?.manualCutStatus === "not_admitted")) {
          findings.push(`La unidad ${pane.paneUnitId} no tiene admisión técnica vigente para corte manual.`);
        }
        if (source.technicalSpec?.productId !== profile.productId
          || source.technicalSpec?.thicknessMm !== profile.thicknessMm
          || source.technicalSpec?.category !== profile.category
          || (mode === "workshop" && (source.technicalSpec?.sheetWidthMm !== profile.sheet.widthMm
          || source.technicalSpec?.sheetHeightMm !== profile.sheet.heightMm))
          || (mode === "geometric_preview" && source.technicalSpec?.sheetWidthMm != null && source.technicalSpec?.sheetWidthMm !== profile.sheet.widthMm)
          || (mode === "geometric_preview" && source.technicalSpec?.sheetHeightMm != null && source.technicalSpec?.sheetHeightMm !== profile.sheet.heightMm)
          || source.finishOrientationKey !== profile.finishOrientationKey) {
          findings.push(`El perfil de la plancha no corresponde a la unidad ${pane.paneUnitId}.`);
        }
        if (!profile.process.supportedCategories.includes(source.technicalSpec?.category ?? "pendiente")
          || !profile.process.supportedThicknessesMm.includes(source.technicalSpec?.thicknessMm ?? -1)) {
          findings.push(`El proceso del taller no admite categoría o espesor de ${pane.paneUnitId}.`);
        }
        if (pane.organizationId !== source.organizationId || pane.quoteId !== source.quoteId
          || pane.quoteItemId !== source.quoteItemId || pane.logicalComponentId !== source.logicalComponentId
          || pane.componentCode !== source.componentCode || pane.quoteCode !== source.quoteCode
          || pane.paneId !== source.paneId || pane.snapshotFingerprint !== source.snapshotFingerprint) {
          findings.push(`La trazabilidad de ${pane.paneUnitId} cambió durante la planificación.`);
        }
      }
      if (pane.rect.xMm < sheet.usableSheet.xMm || pane.rect.yMm < sheet.usableSheet.yMm
        || pane.rect.xMm + pane.rect.widthMm > sheet.usableSheet.xMm + sheet.usableSheet.widthMm
        || pane.rect.yMm + pane.rect.heightMm > sheet.usableSheet.yMm + sheet.usableSheet.heightMm) {
        findings.push(`La unidad ${pane.paneUnitId} sale de la superficie útil.`);
      }
      for (let other = index + 1; other < sheetPanes.length; other += 1) {
        if (intersects(pane.rect, sheetPanes[other]!.rect)) findings.push(`Hay solapamiento entre ${pane.paneUnitId} y ${sheetPanes[other]!.paneUnitId}.`);
      }
    }
    if (treePanes.size !== sheetPanes.length) findings.push(`El árbol de ${sheet.sheetId} y la lista de paños no coinciden.`);

    const suppliedRemnants = new Set(sheet.remnants.map((row) => row.remnantId));
    if (suppliedRemnants.size !== sheet.remnants.length) findings.push(`La plancha ${sheet.sheetId} tiene remanentes duplicados.`);
    sheet.remnants.forEach((remnant: GlassPlannedRemnant) => {
      if (allRemnantIds.has(remnant.remnantId)) findings.push(`ID de retazo duplicado: ${remnant.remnantId}.`);
      allRemnantIds.add(remnant.remnantId);
      const treeRect = treeRemnants.get(remnant.remnantId);
      if (!treeRect || !sameRect(treeRect, remnant.rect)) findings.push(`El retazo ${remnant.remnantId} no corresponde a una hoja remanente del árbol.`);
      if (remnant.areaMm2 !== area(remnant.rect)) findings.push(`El área del retazo ${remnant.remnantId} no coincide con sus dimensiones.`);
      const expectedClass = isReusable(remnant.rect, profile) ? "reusable_candidate" : "waste";
      if (remnant.classification !== expectedClass) findings.push(`La clasificación del retazo ${remnant.remnantId} no respeta los umbrales configurados.`);
      if (remnant.rect.widthMm < profile.process.minimumStripWidthMm || remnant.rect.heightMm < profile.process.minimumStripWidthMm) {
        findings.push(`El retazo ${remnant.remnantId} viola el ancho mínimo de tira configurado.`);
      }
    });
    if (treeRemnants.size !== sheet.remnants.length || [...treeRemnants.keys()].some((id) => !suppliedRemnants.has(id))) {
      findings.push(`El árbol de ${sheet.sheetId} omite o inventa rectángulos remanentes.`);
    }
    if (sheet.cutSequence.some((step) => !isPositiveInt(step.toMm - step.fromMm))) {
      findings.push(`La secuencia de ${sheet.sheetId} contiene un corte sin recorrido físico positivo.`);
    }

    const paneArea = sheet.panes.reduce((sum, pane) => sum + area(pane.rect), 0);
    const reusableArea = sheet.remnants.filter((r) => r.classification === "reusable_candidate").reduce((sum, r) => sum + area(r.rect), 0);
    const wasteArea = sheet.remnants.filter((r) => r.classification === "waste").reduce((sum, r) => sum + area(r.rect), 0);
    const rawArea = area(sheet.rawSheet);
    const usableArea = area(sheet.usableSheet);
    const trimArea = rawArea - usableArea;
    const separationLoss = sumSeparationLoss(sheet.cutTree);
    if (!Number.isSafeInteger(rawArea) || !Number.isSafeInteger(usableArea) || !Number.isSafeInteger(separationLoss)) {
      findings.push(`La plancha ${sheet.sheetId} excede el rango seguro de áreas enteras.`);
    }
    if (paneArea + reusableArea + wasteArea + separationLoss !== usableArea) {
      findings.push(`La conservación de superficie útil no cuadra en ${sheet.sheetId}.`);
    }
    if (paneArea + reusableArea + wasteArea + separationLoss + trimArea !== rawArea) {
      findings.push(`La conservación de superficie bruta no cuadra en ${sheet.sheetId}.`);
    }
    if (sheet.areas.panesMm2 !== paneArea || sheet.areas.reusableRemnantsMm2 !== reusableArea
      || sheet.areas.wasteMm2 !== wasteArea || sheet.areas.edgeTrimMm2 !== trimArea
      || sheet.areas.separationLossMm2 !== separationLoss || sheet.areas.rawSheetMm2 !== rawArea
      || sheet.areas.usableSheetMm2 !== usableArea) {
      findings.push(`Las métricas declaradas por el motor no coinciden con la recomputación de ${sheet.sheetId}.`);
    }
  }
  for (const paneUnitId of expected.keys()) {
    if (!found.has(paneUnitId)) findings.push(`Falta la unidad solicitada ${paneUnitId}.`);
  }
  const paneOrgIds = new Set(input.panes.map((pane) => String(pane.organizationId)));
  if (paneOrgIds.size > 1) findings.push("El lote mezcla organizaciones.");
  return { passed: findings.length === 0, findings };
}

function sumSeparationLoss(node: GlassCutTreeNode): number {
  if (node.kind !== "cut") return 0;
  const own = node.axis === "x" ? node.separationMm * node.rect.heightMm : node.separationMm * node.rect.widthMm;
  return own + sumSeparationLoss(node.children[0]) + sumSeparationLoss(node.children[1]);
}

export type GlassVerifierResult = ReturnType<typeof verifyGlassSheetPlans>;
