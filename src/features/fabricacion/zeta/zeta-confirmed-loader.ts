import dvh_pierna_abierta_2h_1800x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_2h_1800x1500.json";
import dvh_pierna_abierta_3h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_3h_3000x1500.json";
import dvh_pierna_abierta_4h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_4h_3000x1500.json";
import dvh_pierna_abierta_reforzada_2h_1800x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_2h_1800x1500.json";
import dvh_pierna_abierta_reforzada_3h_2400x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_3h_2400x1500.json";
import dvh_pierna_abierta_reforzada_3h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_3h_3000x1500.json";
import dvh_pierna_abierta_reforzada_4h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_4h_3000x1500.json";
import dvh_pierna_cerrada_2h_1800x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_2h_1800x1500.json";
import dvh_pierna_cerrada_3h_2400x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_3h_2400x1500.json";
import dvh_pierna_cerrada_3h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_3h_3000x1500.json";
import dvh_pierna_cerrada_4h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_4h_3000x1500.json";
import monolitico_pierna_abierta_2h_1800x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_2h_1800x1500.json";
import monolitico_pierna_abierta_3h_2400x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_3h_2400x1500.json";
import monolitico_pierna_abierta_3h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_3h_3000x1500.json";
import monolitico_pierna_abierta_4h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_4h_3000x1500.json";
import monolitico_pierna_abierta_reforzada_2h_1800x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_2h_1800x1500.json";
import monolitico_pierna_abierta_reforzada_3h_2400x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_3h_2400x1500.json";
import monolitico_pierna_abierta_reforzada_3h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_3h_3000x1500.json";
import monolitico_pierna_abierta_reforzada_4h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_4h_3000x1500.json";
import monolitico_pierna_cerrada_2h_1800x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_2h_1800x1500.json";
import monolitico_pierna_cerrada_3h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_3h_3000x1500.json";
import monolitico_pierna_cerrada_4h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_4h_3000x1500.json";

export { isZetaConfirmedSourceReference } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";

import { normalizeConfirmedRecipe } from "@/features/fabricacion/zeta/zeta-normalize";
import type { ConfirmedRecipe } from "@/features/fabricacion/zeta/zeta-types";

const CONFIRMED_RAW_BY_ID = {
  dvh_pierna_abierta_2h_1800x1500,
  dvh_pierna_abierta_3h_3000x1500,
  dvh_pierna_abierta_4h_3000x1500,
  dvh_pierna_abierta_reforzada_2h_1800x1500,
  dvh_pierna_abierta_reforzada_3h_2400x1500,
  dvh_pierna_abierta_reforzada_3h_3000x1500,
  dvh_pierna_abierta_reforzada_4h_3000x1500,
  dvh_pierna_cerrada_2h_1800x1500,
  dvh_pierna_cerrada_3h_2400x1500,
  dvh_pierna_cerrada_3h_3000x1500,
  dvh_pierna_cerrada_4h_3000x1500,
  monolitico_pierna_abierta_2h_1800x1500,
  monolitico_pierna_abierta_3h_2400x1500,
  monolitico_pierna_abierta_3h_3000x1500,
  monolitico_pierna_abierta_4h_3000x1500,
  monolitico_pierna_abierta_reforzada_2h_1800x1500,
  monolitico_pierna_abierta_reforzada_3h_2400x1500,
  monolitico_pierna_abierta_reforzada_3h_3000x1500,
  monolitico_pierna_abierta_reforzada_4h_3000x1500,
  monolitico_pierna_cerrada_2h_1800x1500,
  monolitico_pierna_cerrada_3h_3000x1500,
  monolitico_pierna_cerrada_4h_3000x1500,
} as const;

export type ConfirmedRecipeId = keyof typeof CONFIRMED_RAW_BY_ID;

export const SODAL_L25_CONFIRMED_RECIPE_IDS = Object.keys(
  CONFIRMED_RAW_BY_ID
) as ConfirmedRecipeId[];

let cachedConfirmed: ConfirmedRecipe[] | null = null;
let cachedById: Map<string, ConfirmedRecipe> | null = null;

export function resetZetaConfirmedCacheForTests(): void {
  cachedConfirmed = null;
  cachedById = null;
}

export function loadAllConfirmedRecipes(): ConfirmedRecipe[] {
  if (cachedConfirmed) return cachedConfirmed;
  cachedConfirmed = SODAL_L25_CONFIRMED_RECIPE_IDS.map((recipeId) =>
    normalizeConfirmedRecipe(CONFIRMED_RAW_BY_ID[recipeId], recipeId)
  );
  return cachedConfirmed;
}

export function loadConfirmedRecipeById(recipeId: string): ConfirmedRecipe | null {
  const map = loadConfirmedRecipesById();
  return map.get(recipeId) ?? null;
}

export function loadConfirmedRecipesById(): Map<string, ConfirmedRecipe> {
  if (cachedById) return cachedById;
  cachedById = new Map(
    loadAllConfirmedRecipes().map((recipe) => [recipe.id, recipe] as const)
  );
  return cachedById;
}

export function buildZetaSourceReference(recipeId: string): string {
  return `zeta:confirmed:sodal/l25/${recipeId}`;
}

export function recipeIdFromZetaSourceReference(
  sourceReference: string | null | undefined
): string | null {
  const prefix = "zeta:confirmed:sodal/l25/";
  const value = sourceReference ?? "";
  if (!value.startsWith(prefix)) return null;
  const recipeId = value.slice(prefix.length).trim();
  return recipeId.length > 0 ? recipeId : null;
}
