import {
  isObservedSodal4800Measure,
  isZeta4800SourceReference,
} from "@/features/fabricacion/fixtures/sodal-4800-zeta-catalog";
import type {
  FabricacionEvidencia,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const LEGACY_SODAL_L25_FORMULA_VERSION = "sodal-l25-formula-v2";

export function isZetaConfirmedRecipe(recipe: FabricationRecipeRecord): boolean {
  return recipe.sourceReference?.startsWith("zeta:confirmed:") === true;
}

export function isCompleteZetaEvidence(
  evidence: FabricacionEvidencia | undefined,
): evidence is FabricacionEvidencia {
  if (!evidence) return false;
  if (
    evidence.fuente !== "sistema_zeta" ||
    !evidence.runId ||
    !evidence.projectId ||
    !evidence.planId ||
    !evidence.rawPath ||
    !evidence.htmlPath ||
    !evidence.textPath ||
    evidence.screenshotPaths.length === 0 ||
    !evidence.fecha ||
    !evidence.extractorVersion ||
    !evidence.hashes.html ||
    !evidence.hashes.text ||
    Object.keys(evidence.hashes.screenshots).length === 0 ||
    evidence.sourceFragments.length === 0 ||
    evidence.medidasObservadas.length === 0 ||
    evidence.valores.length === 0
  ) {
    return false;
  }

  const fragmentIds = new Set(evidence.sourceFragments.map((fragment) => fragment.id));
  return evidence.valores.every(
    (value) =>
      value.origen !== "asumido" &&
      Boolean(value.sourceFragmentId) &&
      fragmentIds.has(value.sourceFragmentId!),
  );
}

export function isObservedZetaMeasure(
  recipe: FabricationRecipeRecord,
  widthMm: number | null | undefined,
  heightMm: number | null | undefined,
): boolean {
  if (!isZetaConfirmedRecipe(recipe)) return true;
  if (
    typeof widthMm !== "number" ||
    typeof heightMm !== "number" ||
    !Number.isInteger(widthMm) ||
    !Number.isInteger(heightMm)
  ) {
    return false;
  }

  if (isZeta4800SourceReference(recipe.sourceReference)) {
    return isObservedSodal4800Measure({
      leaves: recipe.definition.identidad.hojas,
      widthMm,
      heightMm,
    });
  }

  const evidence = recipe.definition.evidencia;
  if (isCompleteZetaEvidence(evidence)) {
    return evidence.medidasObservadas.some(
      (measure) => measure.anchoMm === widthMm && measure.altoMm === heightMm,
    );
  }

  // Compatibilidad deliberada: conserva recetas L25 históricas ya activas para
  // no interrumpir cotizaciones existentes. Toda nueva receta Zeta sin evidencia
  // completa queda en testing y no puede llegar aquí por el flujo normal.
  return (
    recipe.status === "validated" &&
    recipe.sourceType === "manufacturer" &&
    recipe.sourceRevision === LEGACY_SODAL_L25_FORMULA_VERSION
  );
}

export function getZetaActivationBlockers(
  recipe: FabricationRecipeRecord,
): string[] {
  if (!isZetaConfirmedRecipe(recipe)) return [];

  const blockers: string[] = [];
  if (!isCompleteZetaEvidence(recipe.definition.evidencia)) {
    blockers.push(
      "La receta Zeta no tiene evidencia 1:1 completa o contiene valores asumidos.",
    );
  }
  return blockers;
}

export function getDefinitionEvidenceBlockers(definition: FabricacionReceta): string[] {
  if (!definition.evidencia) {
    return ["Falta evidencia 1:1 de la fuente primaria."];
  }

  const blockers: string[] = [];
  if (definition.evidencia.valores.some((value) => value.origen === "asumido")) {
    blockers.push("La evidencia contiene valores asumidos.");
  }
  if (definition.evidencia.medidasObservadas.length === 0) {
    blockers.push("La evidencia no declara medidas observadas.");
  }
  const fragmentIds = new Set(
    definition.evidencia.sourceFragments.map((fragment) => fragment.id),
  );
  if (
    definition.evidencia.valores.some(
      (value) => !value.sourceFragmentId || !fragmentIds.has(value.sourceFragmentId),
    )
  ) {
    blockers.push("Hay valores normalizados sin fragmento de origen trazable.");
  }
  return blockers;
}
