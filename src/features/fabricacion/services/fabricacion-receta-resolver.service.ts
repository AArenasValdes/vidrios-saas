import {
  buildSodalL25VariantSlug,
  SODAL_L25_CATALOG_KEY,
  type SodalL25GlazingSlug,
  type SodalL25LegSlug,
  type SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { isZetaConfirmedSourceReference } from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import type { FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";

export { SODAL_L25_CATALOG_KEY };

export type FabricacionRecetaResolucionInput = {
  organizationId: number | null;
  lineTemplateId: number;
  tipologia: FabricacionTipologia | string;
  hojas?: number | null;
  modulos?: number | null;
  apertura?: string | null;
  herraje?: string | null;
  variante?: string | null;
  preferredRecipeId?: string | null;
  allowNonValidatedRecipeId?: string | null;
  /** Cotización/UI: si no hay validada, permite una compatible en borrador/prueba. */
  allowPreliminaryNonValidated?: boolean;
};

export type ResolveFabricationRecipeInput = FabricacionRecetaResolucionInput & {
  catalogKey?: string | null;
  glazing?: SodalL25GlazingSlug | null;
  leg?: SodalL25LegSlug | null;
  reinforcement?: SodalL25ReinforcementSlug | null;
};

export function isSodalL25ZetaValidatedRecipe(recipe: FabricationRecipeRecord): boolean {
  return (
    recipe.status === "validated" &&
    isZetaConfirmedSourceReference(recipe.sourceReference) &&
    !recipe.eliminadoEn
  );
}

export function filterRecipesForCatalogResolution(
  recipes: FabricationRecipeRecord[],
  catalogKey: string | null | undefined
): FabricationRecipeRecord[] {
  if (catalogKey !== SODAL_L25_CATALOG_KEY) {
    return recipes;
  }

  const zetaValidated = recipes.filter((recipe) => isSodalL25ZetaValidatedRecipe(recipe));
  if (zetaValidated.length > 0) {
    return zetaValidated;
  }

  return recipes.filter(
    (recipe) => !recipe.eliminadoEn && recipe.status !== "archived"
  );
}

export function resolveFabricationRecipe(
  recipes: FabricationRecipeRecord[],
  input: ResolveFabricationRecipeInput
): FabricacionRecetaResolucion {
  const filtered = filterRecipesForCatalogResolution(recipes, input.catalogKey);
  let variante = input.variante;

  if (
    input.catalogKey === SODAL_L25_CATALOG_KEY &&
    input.glazing &&
    input.leg &&
    input.reinforcement
  ) {
    variante = buildSodalL25VariantSlug({
      glazing: input.glazing,
      leg: input.leg,
      reinforcement: input.reinforcement,
    });
  }

  return resolverRecetaFabricacionCompatible(filtered, {
    ...input,
    variante,
    allowPreliminaryNonValidated:
      input.catalogKey === SODAL_L25_CATALOG_KEY
        ? false
        : input.allowPreliminaryNonValidated,
  });
}

export type FabricacionRecetaDescartada = {
  recipeId: string;
  nombre: string;
  motivo: string;
};

export type FabricacionRecetaResolucion =
  | {
      estado: "sin_receta";
      receta: null;
      candidatas: FabricationRecipeRecord[];
      descartadas: FabricacionRecetaDescartada[];
      advertencias: string[];
    }
  | {
      estado: "receta_unica";
      receta: FabricationRecipeRecord;
      candidatas: FabricationRecipeRecord[];
      descartadas: FabricacionRecetaDescartada[];
      advertencias: string[];
    }
  | {
      estado: "multiples_recetas";
      receta: null;
      candidatas: FabricationRecipeRecord[];
      descartadas: FabricacionRecetaDescartada[];
      advertencias: string[];
    }
  | {
      estado: "receta_no_validada";
      receta: FabricationRecipeRecord;
      candidatas: FabricationRecipeRecord[];
      descartadas: FabricacionRecetaDescartada[];
      advertencias: string[];
    };

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function statusAllowsAutomaticUse(status: FabricationRecipeStatus) {
  return status === "validated";
}

function statusAllowsPreliminaryUse(status: FabricationRecipeStatus) {
  return (
    status === "draft" ||
    status === "testing" ||
    status === "review_required"
  );
}

function pickNewestByIdentity(recipes: FabricationRecipeRecord[]) {
  const byIdentity = new Map<string, FabricationRecipeRecord>();
  recipes.forEach((recipe) => {
    const key = recipe.definition.identidad.recetaId;
    const current = byIdentity.get(key);
    if (!current || recipe.version > current.version) {
      byIdentity.set(key, recipe);
    }
  });
  return Array.from(byIdentity.values());
}

function discard(recipe: FabricationRecipeRecord, motivo: string): FabricacionRecetaDescartada {
  return {
    recipeId: recipe.id,
    nombre: recipe.definition.identidad.nombre,
    motivo,
  };
}

export function resolverRecetaFabricacionCompatible(
  recipes: FabricationRecipeRecord[],
  input: FabricacionRecetaResolucionInput
): FabricacionRecetaResolucion {
  const descartadas: FabricacionRecetaDescartada[] = [];
  const compatible = recipes.filter((recipe) => {
    const identidad = recipe.definition.identidad;

    if (recipe.eliminadoEn) {
      descartadas.push(discard(recipe, "La receta esta archivada."));
      return false;
    }
    if (recipe.lineTemplateId !== input.lineTemplateId) {
      descartadas.push(discard(recipe, "Pertenece a otra linea comercial."));
      return false;
    }
    if (
      recipe.scope === "organization" &&
      input.organizationId !== null &&
      recipe.organizationId !== input.organizationId
    ) {
      descartadas.push(discard(recipe, "Pertenece a otra empresa."));
      return false;
    }
    if (normalizeText(identidad.tipologia) !== normalizeText(input.tipologia)) {
      descartadas.push(discard(recipe, "La tipologia no coincide."));
      return false;
    }
    if (input.hojas != null && identidad.hojas !== input.hojas) {
      descartadas.push(discard(recipe, "La cantidad de hojas no coincide."));
      return false;
    }
    if (input.modulos != null && identidad.modulos !== input.modulos) {
      descartadas.push(discard(recipe, "La cantidad de modulos no coincide."));
      return false;
    }
    if (
      input.apertura &&
      identidad.apertura &&
      normalizeText(identidad.apertura) !== normalizeText(input.apertura)
    ) {
      descartadas.push(discard(recipe, "La apertura no coincide."));
      return false;
    }
    if (input.herraje && identidad.herraje && normalizeText(identidad.herraje) !== normalizeText(input.herraje)) {
      descartadas.push(discard(recipe, "El herraje no coincide."));
      return false;
    }
    if (input.variante && normalizeText(identidad.variante) !== normalizeText(input.variante)) {
      descartadas.push(discard(recipe, "La variante no coincide."));
      return false;
    }

    return true;
  });

  const explicitNonValidated = compatible.find(
    (recipe) =>
      recipe.id === input.allowNonValidatedRecipeId &&
      !statusAllowsAutomaticUse(recipe.status)
  );
  if (explicitNonValidated) {
    return {
      estado: "receta_no_validada",
      receta: explicitNonValidated,
      candidatas: compatible,
      descartadas,
      advertencias: [
        "Receta en prueba: usar solo para revision interna, no como pauta validada.",
      ],
    };
  }

  const validatedByIdentity = new Map<string, FabricationRecipeRecord>();
  compatible
    .filter((recipe) => statusAllowsAutomaticUse(recipe.status))
    .forEach((recipe) => {
      const key = recipe.definition.identidad.recetaId;
      const current = validatedByIdentity.get(key);
      if (!current || recipe.version > current.version) {
        validatedByIdentity.set(key, recipe);
      }
    });
  const validated = Array.from(validatedByIdentity.values());

  const preferred = validated.find(
    (recipe) => recipe.id === input.preferredRecipeId
  );
  if (preferred) {
    return {
      estado: "receta_unica",
      receta: preferred,
      candidatas: validated,
      descartadas,
      advertencias: [],
    };
  }

  if (validated.length === 0) {
    if (input.allowPreliminaryNonValidated) {
      const preliminary = pickNewestByIdentity(
        compatible.filter((recipe) => statusAllowsPreliminaryUse(recipe.status))
      );
      if (preliminary.length === 1) {
        return {
          estado: "receta_no_validada",
          receta: preliminary[0],
          candidatas: preliminary,
          descartadas,
          advertencias: [
            "Receta en prueba: cálculo preliminar, no como pauta validada.",
          ],
        };
      }
      if (preliminary.length > 1) {
        return {
          estado: "multiples_recetas",
          receta: null,
          candidatas: preliminary,
          descartadas,
          advertencias: [
            "Hay mas de una receta compatible sin validar; elige variante o herraje.",
          ],
        };
      }
    }

    return {
      estado: "sin_receta",
      receta: null,
      candidatas: compatible,
      descartadas,
      advertencias:
        compatible.length > 0
          ? ["Hay recetas compatibles, pero ninguna esta validada para uso automatico."]
          : [],
    };
  }

  if (validated.length === 1) {
    return {
      estado: "receta_unica",
      receta: validated[0],
      candidatas: validated,
      descartadas,
      advertencias: input.apertura
        ? ["La apertura se conserva como contexto; esta fase no inventa equivalencias por apertura."]
        : [],
    };
  }

  return {
    estado: "multiples_recetas",
    receta: null,
    candidatas: validated,
    descartadas,
    advertencias: ["Hay mas de una receta validada compatible; elige variante o herraje."],
  };
}
