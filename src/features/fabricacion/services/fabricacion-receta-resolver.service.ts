import type { FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";

export type FabricacionRecetaResolucionInput = {
  organizationId: number | null;
  lineTemplateId: number;
  tipologia: FabricacionTipologia | string;
  hojas?: number | null;
  modulos?: number | null;
  apertura?: string | null;
  herraje?: string | null;
  variante?: string | null;
  allowNonValidatedRecipeId?: string | null;
};

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

  const validated = compatible.filter((recipe) => statusAllowsAutomaticUse(recipe.status));

  if (validated.length === 0) {
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
