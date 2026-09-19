import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import {
  isSodalL25FormulaVersion,
  isSodalL25SnapshotIdentity,
  SODAL_L25_FORMULA_VERSION,
} from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { isZetaConfirmedSourceReference } from "@/features/fabricacion/zeta/zeta-confirmed-loader";

export type SodalL25SnapshotItemRow = {
  id: number;
  cotizacionId: number;
  organizationId: number;
  codigo: string | null;
  snapshot: FabricacionCotizacionSnapshot;
};

export type BackfillSodalL25FormulaV2Deps = {
  listSodalL25Recipes: () => Promise<FabricationRecipeRecord[]>;
  updateSodalL25Recipe: (
    recipeId: string,
    input: { definition: FabricationRecipeRecord["definition"]; sourceRevision: string }
  ) => Promise<void>;
  listSodalL25SnapshotItems: () => Promise<SodalL25SnapshotItemRow[]>;
  saveSnapshot: (itemId: number, snapshot: FabricacionCotizacionSnapshot) => Promise<void>;
};

export type BackfillSodalL25FormulaV2Result = {
  formulaVersion: typeof SODAL_L25_FORMULA_VERSION;
  recipesExamined: number;
  recipesUpdated: number;
  recipesSkipped: number;
  snapshotsAffected: number;
  snapshotsRecalculated: number;
  snapshotsSkipped: number;
  quote818?: {
    cotizacionId: number;
    items: Array<{
      itemId: number;
      codigo: string | null;
      before: Array<{ code: string; quantity: number; lengthMm: number }>;
      after: Array<{ code: string; quantity: number; lengthMm: number }>;
    }>;
  };
};

export function isDefectiveSodalL25Snapshot(
  snapshot: FabricacionCotizacionSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  const l25 = isSodalL25SnapshotIdentity({
    codigo: snapshot.recipeIdentity.codigo,
    variante: snapshot.recipeIdentity.variante,
  });
  if (!l25) return false;
  return !isSodalL25FormulaVersion(snapshot.formulaVersion);
}

function cutsFromSnapshot(snapshot: FabricacionCotizacionSnapshot) {
  return snapshot.pauta.map((row) => ({
    code: row.codigoPerfil,
    quantity: row.cantidadPiezas,
    lengthMm: row.medidaMm,
  }));
}

export async function backfillSodalL25FormulaV2(
  deps: BackfillSodalL25FormulaV2Deps
): Promise<BackfillSodalL25FormulaV2Result> {
  const recipes = await deps.listSodalL25Recipes();
  const bundles = buildAllSodalL25Recipes();
  const bundleByRef = new Map(bundles.map((bundle) => [bundle.sourceReference, bundle]));

  let recipesUpdated = 0;
  let recipesSkipped = 0;
  const recipesById = new Map<string, FabricationRecipeRecord>();

  for (const recipe of recipes) {
    recipesById.set(recipe.id, recipe);
    if (!isZetaConfirmedSourceReference(recipe.sourceReference)) {
      recipesSkipped += 1;
      continue;
    }
    if (isSodalL25FormulaVersion(recipe.sourceRevision)) {
      recipesSkipped += 1;
      continue;
    }
    const bundle = bundleByRef.get(recipe.sourceReference ?? "");
    if (!bundle) {
      recipesSkipped += 1;
      continue;
    }
    const nextDefinition = {
      ...bundle.definition,
      identidad: {
        ...bundle.definition.identidad,
        recetaId: recipe.definition.identidad.recetaId,
      },
    };
    await deps.updateSodalL25Recipe(recipe.id, {
      definition: nextDefinition,
      sourceRevision: SODAL_L25_FORMULA_VERSION,
    });
    recipesById.set(recipe.id, {
      ...recipe,
      definition: nextDefinition,
      sourceRevision: SODAL_L25_FORMULA_VERSION,
    });
    recipesUpdated += 1;
  }

  const items = await deps.listSodalL25SnapshotItems();
  const affected = items.filter((item) => isDefectiveSodalL25Snapshot(item.snapshot));
  let snapshotsRecalculated = 0;
  let snapshotsSkipped = items.length - affected.length;
  const quote818Items: NonNullable<BackfillSodalL25FormulaV2Result["quote818"]>["items"] = [];

  for (const item of affected) {
    const recipe = recipesById.get(item.snapshot.recipeId);
    if (!recipe) {
      snapshotsSkipped += 1;
      continue;
    }
    const before = cutsFromSnapshot(item.snapshot);
    const next = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: item.snapshot.input,
    });
    await deps.saveSnapshot(item.id, next);
    snapshotsRecalculated += 1;
    if (item.cotizacionId === 818) {
      quote818Items.push({
        itemId: item.id,
        codigo: item.codigo,
        before,
        after: cutsFromSnapshot(next),
      });
    }
  }

  return {
    formulaVersion: SODAL_L25_FORMULA_VERSION,
    recipesExamined: recipes.length,
    recipesUpdated,
    recipesSkipped,
    snapshotsAffected: affected.length,
    snapshotsRecalculated,
    snapshotsSkipped,
    quote818:
      quote818Items.length > 0
        ? { cotizacionId: 818, items: quote818Items }
        : undefined,
  };
}
