import {
  SODAL_4800_CATALOG_KEY,
  isZeta4800SourceReference,
  isObservedSodal4800Measure,
} from "@/features/fabricacion/fixtures/sodal-4800-zeta-catalog";
import {
  isCurrentSerie4800CorrederaRecipe,
  isSerie4800FormulaSourceReference,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import {
  buildSodalL25VariantSlug,
  isZetaConfirmedSourceReference,
  SODAL_L25_CATALOG_KEY,
  type SodalL25GlazingSlug,
  type SodalL25LegSlug,
  type SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import type { FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";
import {
  isObservedZetaMeasure,
  isZetaConfirmedRecipe,
} from "@/features/fabricacion/services/fabricacion-evidence-gate.service";

export { SODAL_L25_CATALOG_KEY, SODAL_4800_CATALOG_KEY };

export type FabricacionRecetaResolucionInput = {
  organizationId: number | null;
  lineTemplateId: number;
  tipologia: FabricacionTipologia | string;
  hojas?: number | null;
  modulos?: number | null;
  apertura?: string | null;
  herraje?: string | null;
  variante?: string | null;
  topology?: string | null;
  hardwareMode?: string | null;
  preferredRecipeId?: string | null;
  /** Solo se conserva para compatibilidad de entrada; la resolución pública lo ignora. */
  allowPreliminaryNonValidated?: boolean;
  anchoTotalMm?: number | null;
  altoTotalMm?: number | null;
};

export type ResolveFabricationRecipeInput = FabricacionRecetaResolucionInput & {
  catalogKey?: string | null;
  glazing?: SodalL25GlazingSlug | null;
  leg?: SodalL25LegSlug | null;
  reinforcement?: SodalL25ReinforcementSlug | null;
  /**
   * Solo despiece interno de cotización: permite recetas draft/testing
   * listas para probar, marcadas como cálculo preliminar. No valida el taller.
   */
  previewListaParaProbar?: boolean;
};

export type ControlledRecipeTestInput = FabricacionRecetaResolucionInput & {
  catalogKey?: string | null;
  glazing?: SodalL25GlazingSlug | null;
  leg?: SodalL25LegSlug | null;
  reinforcement?: SodalL25ReinforcementSlug | null;
  controlledTest: {
    mode: "controlled_test";
    recipeId: string;
    organizationId: number;
  };
};

export function isSodalL25ZetaValidatedRecipe(recipe: FabricationRecipeRecord): boolean {
  return (
    recipe.status === "validated" &&
    isZetaConfirmedSourceReference(recipe.sourceReference) &&
    !recipe.eliminadoEn
  );
}

function isSodalP2A4800Fallback(recipe: FabricationRecipeRecord): boolean {
  if (isSerie4800FormulaSourceReference(recipe.sourceReference)) return false;
  if (isCurrentSerie4800CorrederaRecipe(recipe.definition)) return false;
  const code = recipe.definition.identidad.codigo?.toUpperCase() ?? "";
  const source = recipe.sourceReference?.toUpperCase() ?? "";
  return (
    code.includes("SODAL-4800") ||
    source.includes("SODAL-4800") ||
    (recipe.sourceType === "manufacturer" &&
      recipe.sourceName?.toUpperCase() === "SODAL" &&
      !isZeta4800SourceReference(recipe.sourceReference))
  );
}

function isSerie4800FormulaRecord(recipe: FabricationRecipeRecord): boolean {
  return (
    isSerie4800FormulaSourceReference(recipe.sourceReference) ||
    isCurrentSerie4800CorrederaRecipe(recipe.definition)
  );
}

export function filterRecipesForCatalogResolution(
  recipes: FabricationRecipeRecord[],
  catalogKey: string | null | undefined
): FabricationRecipeRecord[] {
  if (catalogKey === SODAL_4800_CATALOG_KEY) {
    return recipes.filter(
      (recipe) =>
        !recipe.eliminadoEn &&
        recipe.status !== "archived" &&
        (isZeta4800SourceReference(recipe.sourceReference) ||
          isSerie4800FormulaRecord(recipe))
    );
  }

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

  const topology =
    input.catalogKey === SODAL_L25_CATALOG_KEY ? "corredera" : input.topology;

  const filteredForResolution =
    input.catalogKey === SODAL_4800_CATALOG_KEY
      ? filtered.filter((recipe) => !isSodalP2A4800Fallback(recipe))
      : filtered;
  const controlledPreviewRecipeId = input.previewListaParaProbar
    ? input.preferredRecipeId
    : null;

  if (input.catalogKey === SODAL_4800_CATALOG_KEY) {
    const observed = isObservedSodal4800Measure({
      leaves: input.hojas ?? 0,
      widthMm: input.anchoTotalMm ?? 0,
      heightMm: input.altoTotalMm ?? 0,
    });
    if (!observed) {
      const formulaRecipes = filteredForResolution.filter(isSerie4800FormulaRecord);
      if (formulaRecipes.length === 0) {
        return {
          estado: "sin_receta",
          receta: null,
          candidatas: [],
          descartadas: filteredForResolution.map((recipe) =>
            discard(recipe, "Medida no observada en evidencia Zeta L-4800.")
          ),
          advertencias: ["L-4800 solo admite 2H 1800×1500 o 3H 3000×1500."],
        };
      }
      return resolverRecetaFabricacionCompatibleInternal(formulaRecipes, {
        ...input,
        variante,
        topology,
        allowPreliminaryNonValidated: Boolean(input.previewListaParaProbar),
      }, controlledPreviewRecipeId);
    }
  }

  return resolverRecetaFabricacionCompatibleInternal(filteredForResolution, {
    ...input,
    variante,
    topology,
    // Snapshot/PDF y matching comercial siguen exigiendo receta validada.
    // El despiece interno de cotización puede previsualizar lista_para_probar.
    allowPreliminaryNonValidated: Boolean(input.previewListaParaProbar),
  }, controlledPreviewRecipeId);
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

function resolverRecetaFabricacionCompatibleInternal(
  recipes: FabricationRecipeRecord[],
  input: FabricacionRecetaResolucionInput,
  controlledRecipeId?: string | null,
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
      isZetaConfirmedRecipe(recipe) &&
      !isObservedZetaMeasure(recipe, input.anchoTotalMm, input.altoTotalMm)
    ) {
      descartadas.push(
        discard(recipe, "La medida no está observada en la evidencia Zeta de esta receta."),
      );
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
    if (
      input.topology &&
      identidad.topology &&
      normalizeText(identidad.topology) !== normalizeText(input.topology)
    ) {
      descartadas.push(discard(recipe, "La topologia no coincide."));
      return false;
    }
    if (
      input.hardwareMode &&
      identidad.hardwareMode &&
      normalizeText(identidad.hardwareMode) !== normalizeText(input.hardwareMode)
    ) {
      descartadas.push(discard(recipe, "El modo de herraje no coincide."));
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
      recipe.id === controlledRecipeId &&
      statusAllowsPreliminaryUse(recipe.status)
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

export function resolverRecetaFabricacionCompatible(
  recipes: FabricationRecipeRecord[],
  input: FabricacionRecetaResolucionInput,
): FabricacionRecetaResolucion {
  return resolverRecetaFabricacionCompatibleInternal(recipes, input, null);
}

/**
 * Entrada exclusiva para el laboratorio/pruebas internas.
 * No debe ser usada por cotización, snapshot ni componentes públicos.
 */
export function resolverRecetaFabricacionCompatibleForControlledTest(
  recipes: FabricationRecipeRecord[],
  input: ControlledRecipeTestInput,
): FabricacionRecetaResolucion {
  if (
    !Number.isInteger(input.controlledTest.organizationId) ||
    input.controlledTest.organizationId <= 0 ||
    input.organizationId !== input.controlledTest.organizationId ||
    !input.controlledTest.recipeId
  ) {
    return {
      estado: "sin_receta",
      receta: null,
      candidatas: [],
      descartadas: [],
      advertencias: [
        "La prueba controlada requiere organización y recipeId explícitos.",
      ],
    };
  }

  if (
    input.catalogKey === SODAL_4800_CATALOG_KEY &&
    !isObservedSodal4800Measure({
      leaves: input.hojas ?? 0,
      widthMm: input.anchoTotalMm ?? 0,
      heightMm: input.altoTotalMm ?? 0,
    })
  ) {
    return {
      estado: "sin_receta",
      receta: null,
      candidatas: [],
      descartadas: [],
      advertencias: ["L-4800 4H o medida no observada permanece bloqueada."],
    };
  }

  return resolverRecetaFabricacionCompatibleInternal(
    filterRecipesForCatalogResolution(recipes, input.catalogKey),
    {
      ...input,
      allowPreliminaryNonValidated: false,
    },
    input.controlledTest.recipeId,
  );
}

export function resolveFabricationRecipeForControlledTest(
  recipes: FabricationRecipeRecord[],
  input: ResolveFabricationRecipeInput & {
    controlledTest: ControlledRecipeTestInput["controlledTest"];
  },
): FabricacionRecetaResolucion {
  return resolverRecetaFabricacionCompatibleForControlledTest(recipes, {
    ...input,
    organizationId: input.controlledTest.organizationId,
    controlledTest: input.controlledTest,
  });
}
