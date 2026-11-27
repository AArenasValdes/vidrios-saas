import {
  buildAllSodalL25Recipes,
  findSodalL25BundleForTestEvidence,
  SODAL_L25_CANONICAL_RECIPE_IDS,
  SODAL_L25_EXTRA_GEOMETRY_TEST_IDS,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { SODAL_L25_CATALOG_KEY } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { loadConfirmedRecipeById } from "@/features/fabricacion/zeta/zeta-confirmed-loader";

/** Cada fila remite a una observación Zeta, no a un producto cartesiano. */
export function buildUniversalCoverageMotorCases() {
  const canonical = buildAllSodalL25Recipes();
  return [...SODAL_L25_CANONICAL_RECIPE_IDS, ...SODAL_L25_EXTRA_GEOMETRY_TEST_IDS].map((evidenceId) => {
    const bundle = canonical.find((entry) => entry.recipeId === evidenceId)
      ?? findSodalL25BundleForTestEvidence(evidenceId);
    const confirmed = loadConfirmedRecipeById(evidenceId);
    if (!bundle || !confirmed) throw new Error(`Falta evidencia o receta canónica: ${evidenceId}`);
    return {
      catalogKey: SODAL_L25_CATALOG_KEY,
      recipeId: bundle.recipeId,
      evidenceId,
      evidencePath: `docs/fabricacion/zeta/confirmed/sodal/l25/${evidenceId}.json`,
      sourceReference: bundle.sourceReference,
      identity: bundle.identity,
      dimensions: confirmed.testDimensions,
      bundle,
      confirmed,
    };
  });
}
