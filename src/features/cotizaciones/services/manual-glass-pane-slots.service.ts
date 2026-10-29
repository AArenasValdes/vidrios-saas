import type { GuidedVisualConfig, GuidedModuleType } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { listLeafModules } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import type { QuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";

export type ManualGlassPaneSlot = {
  id: string;
  position: string;
  label: string;
  rectangular: boolean;
};

export type ManualGlassPaneConfiguration = {
  componentType?: string | null;
  system?: string | null;
  configuration?: string | null;
  sheetScheme?: string | null;
  fabricacionHojas?: number | null;
  guidedVisualConfig?: GuidedVisualConfig | null;
  quickCompositionAdjustment?: QuickCompositionAdjustment | null;
  manualPaneCount?: number | null;
};

const moduleLabels: Partial<Record<GuidedModuleType, string>> = {
  fijo: "Fijo", corredera: "Corredero", abatible: "Abatible",
  oscilobatiente: "Oscilobatiente", proyectante: "Proyectante",
  guillotina: "Guillotina", celosia: "Celosía", puerta: "Abatible",
  puerta_corredera: "Corredera", shower_frontal: "Fijo", shower_corredera: "Corredero",
};

const quickTypeLabels = { sliding: "Corredero", fixed: "Fijo", casement: "Abatible", projecting: "Proyectante" } as const;

function componentTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/oscilobatiente/i.test(value)) return "Oscilobatiente";
  if (/proyectante/i.test(value)) return "Proyectante";
  if (/corredera/i.test(value)) return "Corredero";
  if (/fijo/i.test(value)) return "Fijo";
  if (/abatible/i.test(value)) return "Abatible";
  return null;
}

function fingerprint(value: unknown): string {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `pane-config-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** Resolves only pane counts represented explicitly by the quote configuration. */
export function resolveManualGlassPaneSlots(input: ManualGlassPaneConfiguration): {
  slots: ManualGlassPaneSlot[];
  configurationFingerprint: string;
  countIsKnown: boolean;
} {
  const visualModules = input.guidedVisualConfig?.root ? listLeafModules(input.guidedVisualConfig.root) : [];
  const adjustment = input.quickCompositionAdjustment;
  const schemeCount = input.sheetScheme?.trim().match(/^(\d+)\s*hojas?$/i)?.[1];
  const productShapeLabel = `${input.componentType ?? ""} ${input.system ?? ""} ${input.configuration ?? ""}`;
  const slidingConfiguration = /corredera|sliding/i.test(`${productShapeLabel} ${input.sheetScheme ?? ""}`);
  const simpleSinglePaneType = /fijo|proyectante|oscilobatiente|abatible/i.test(productShapeLabel)
    && !/corredera/i.test(`${productShapeLabel} ${input.sheetScheme ?? ""}`);
  const hasInternalDivisions = visualModules.some((module) => Boolean(module.palilloLayout) || module.palillos.length > 0);
  const configuredSlidingCount = slidingConfiguration && !hasInternalDivisions
    ? (schemeCount ? Number(schemeCount) : null)
      ?? (input.fabricacionHojas && input.fabricacionHojas > 1 ? input.fabricacionHojas : null)
    : null;
  // A Constructor split is a trusted pane boundary. A module's palillos are
  // visual dividers and do not state whether the glass is split into pieces.
  const structuralModuleCount = visualModules.length > 1 && !hasInternalDivisions
    ? visualModules.length
    : null;
  const canInferSingleModule = visualModules.length === 1
    && visualModules[0]?.type !== "corredera"
    && visualModules[0]?.type !== "puerta_corredera"
    && visualModules[0]?.type !== "shower_corredera";
  const inferredCount = adjustment?.paneCount
    ?? structuralModuleCount
    ?? configuredSlidingCount
    ?? (!hasInternalDivisions && simpleSinglePaneType ? 1 : null)
    ?? (!hasInternalDivisions && canInferSingleModule ? 1 : null);
  const usesManualCount = inferredCount == null
    && Number.isSafeInteger(input.manualPaneCount)
    && Number(input.manualPaneCount) > 0
    && Number(input.manualPaneCount) <= 12;
  const count = inferredCount ?? (usesManualCount ? Number(input.manualPaneCount) : null);
  const configPayload = {
    componentType: input.componentType ?? null,
    system: input.system ?? null,
    configuration: input.configuration ?? null,
    sheetScheme: input.sheetScheme ?? null,
    fabricacionHojas: input.fabricacionHojas ?? null,
    manualPaneCount: usesManualCount ? input.manualPaneCount : null,
    quick: adjustment ? {
      paneCount: adjustment.paneCount ?? null,
      paneTypes: adjustment.paneTypes ?? {},
      leafWidths: adjustment.leafWidths ?? null,
      fixedTopMm: adjustment.fixedTopMm,
      fixedBottomMm: adjustment.fixedBottomMm,
      fixedLeftMm: adjustment.fixedLeftMm,
      fixedRightMm: adjustment.fixedRightMm,
    } : null,
    modules: visualModules.map((module) => ({
      id: module.id,
      type: module.type,
      glassShape: module.glassShape,
      palillos: module.palillos,
      palilloLayout: module.palilloLayout,
    })),
    frameShape: input.guidedVisualConfig?.frameShape ?? null,
  };
  const configurationFingerprint = fingerprint(configPayload);
  if (!count || count < 1 || count > 12) return { slots: [], configurationFingerprint, countIsKnown: false };

  const slots = Array.from({ length: count }, (_, index): ManualGlassPaneSlot => {
    const paneModule = visualModules.length === count ? visualModules[index] : undefined;
    const quickType = adjustment?.paneTypes?.[`leaf-${index + 1}`];
    const openingType = paneModule ? moduleLabels[paneModule.type] : quickType ? quickTypeLabels[quickType] : componentTypeLabel(productShapeLabel);
    const id = paneModule?.id ?? (usesManualCount ? `manual-pane:v1:${index + 1}` : `pane-${index + 1}`);
    const rectangular = (!paneModule || paneModule.glassShape.kind === "rect")
      && (input.guidedVisualConfig?.frameShape.kind ?? "rect") === "rect";
    return {
      id,
      position: `Paño ${index + 1}`,
      label: `Paño ${index + 1}${openingType ? ` · ${openingType}` : ""}`,
      rectangular,
    };
  });
  return { slots, configurationFingerprint, countIsKnown: true };
}
