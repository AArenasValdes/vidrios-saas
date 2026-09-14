import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeSourceType,
} from "@/features/fabricacion/types/fabricacion-persistence";
import {
  isLineTemplateReadyForQuote,
  type CotizacionLineTemplate,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export const LINE_TECHNICAL_STATUSES = ["incomplete", "calculable"] as const;
export type LineTechnicalStatus = (typeof LINE_TECHNICAL_STATUSES)[number];

export const LINE_VALIDATION_STATUSES = [
  "unverified",
  "documented",
  "workshop_validated",
] as const;
export type LineValidationStatus = (typeof LINE_VALIDATION_STATUSES)[number];

export const LINE_PRICING_STATUSES = ["missing", "configured"] as const;
export type LinePricingStatus = (typeof LINE_PRICING_STATUSES)[number];

export type LineOperationalStatus = {
  technicalStatus: LineTechnicalStatus;
  validationStatus: LineValidationStatus;
  pricingStatus: LinePricingStatus;
  quotable: boolean;
  recipeId: string | null;
  sourceType: FabricationRecipeSourceType | null;
  sourceReference: string | null;
  sourceName: string | null;
  sourceRevision: string | null;
  label: string;
  detail: string;
  warnings: string[];
};

type StatusInput = {
  template: Pick<
    CotizacionLineTemplate,
    "isActive" | "precioM2Sugerido"
  >;
  recipes?: FabricationRecipeRecord[];
  referenceRecipe?: FabricacionReceta | null;
  referenceSource?: {
    sourceType: FabricationRecipeSourceType;
    sourceReference?: string | null;
    sourceName?: string | null;
    sourceRevision?: string | null;
  } | null;
};

function isActiveRecipe(recipe: FabricationRecipeRecord) {
  return recipe.status !== "archived" && recipe.eliminadoEn === null;
}

function chooseRecipe(recipes: FabricationRecipeRecord[]) {
  return [...recipes]
    .filter(isActiveRecipe)
    .sort((left, right) => {
      const validationRank = (status: FabricationRecipeRecord["status"]) =>
        status === "validated" ? 3 : status === "testing" ? 2 : 1;
      return (
        validationRank(right.status) - validationRank(left.status) ||
        right.version - left.version
      );
    })[0] ?? null;
}

function validationFromRecipe(
  recipe: FabricationRecipeRecord | null,
  referenceSource: StatusInput["referenceSource"]
): LineValidationStatus {
  const sourceType = recipe?.sourceType ?? referenceSource?.sourceType;
  const hasExplicitWorkshopEvidence =
    recipe?.status === "validated" &&
    sourceType === "workshop" &&
    Boolean(
      recipe.sourceName?.trim() ||
        recipe.sourceReference?.trim() ||
        referenceSource?.sourceName?.trim() ||
        referenceSource?.sourceReference?.trim()
    );
  if (hasExplicitWorkshopEvidence) return "workshop_validated";

  if (
    sourceType === "manufacturer" ||
    sourceType === "supplier" ||
    sourceType === "ventora_reference"
  ) {
    return "documented";
  }

  return "unverified";
}

function buildLabel(input: {
  technicalStatus: LineTechnicalStatus;
  validationStatus: LineValidationStatus;
  pricingStatus: LinePricingStatus;
}): Pick<LineOperationalStatus, "label" | "detail"> {
  if (input.pricingStatus === "missing") {
    return {
      label: "Precio pendiente",
      detail:
        input.technicalStatus === "incomplete"
          ? "Falta configurar precio y completar la pauta técnica."
          : "La pauta técnica existe, pero falta precio comercial válido.",
    };
  }

  if (input.technicalStatus === "incomplete") {
    return {
      label: "Configuración técnica pendiente",
      detail: "La línea puede cotizarse cuando tenga precio; la fabricación sigue pendiente.",
    };
  }

  if (input.validationStatus === "workshop_validated") {
    return {
      label: "Validada en taller",
      detail: "La receta tiene prueba validada por el taller.",
    };
  }

  if (input.validationStatus === "documented") {
    return {
      label: "Pauta documentada",
      detail: "La fuente está documentada; todavía requiere confirmación de taller.",
    };
  }

  return {
    label: "Lista para probar",
    detail: "La receta calcula; prueba una medida real antes de usarla como pauta de taller.",
  };
}

export function deriveLineOperationalStatus(input: StatusInput): LineOperationalStatus {
  const persistedRecipe = chooseRecipe(input.recipes ?? []);
  const recipe = persistedRecipe?.definition ?? input.referenceRecipe ?? null;
  const technicalEvaluation = recipe
    ? (() => {
        const gate =
          persistedRecipe?.status === "validated"
            ? { listaParaProbar: true, bloqueos: [] as string[], advertencias: [] as string[] }
            : evaluarRecetaListaParaProbar(recipe);
        const compositionComplete = buildFabricationRecipeSummary(recipe).compositionComplete;
        if (compositionComplete) return gate;
        return {
          ...gate,
          listaParaProbar: false,
          bloqueos: [
            ...gate.bloqueos,
            "Composición técnica pendiente: la receta no puede presentarse como lista para probar.",
          ],
        };
      })()
    : { listaParaProbar: false, bloqueos: ["Sin receta técnica"] as string[], advertencias: [] as string[] };
  const technicalStatus: LineTechnicalStatus = technicalEvaluation.listaParaProbar
    ? "calculable"
    : "incomplete";
  const validationStatus = validationFromRecipe(persistedRecipe, input.referenceSource);
  const pricingStatus: LinePricingStatus = isLineTemplateReadyForQuote(input.template)
    ? "configured"
    : "missing";
  const quotable = Boolean(input.template.isActive) && pricingStatus === "configured";
  const source = persistedRecipe
    ? {
        sourceType: persistedRecipe.sourceType,
        sourceReference: persistedRecipe.sourceReference,
        sourceName: persistedRecipe.sourceName ?? null,
        sourceRevision: persistedRecipe.sourceRevision ?? null,
      }
    : input.referenceSource ?? null;
  const copy = buildLabel({ technicalStatus, validationStatus, pricingStatus });

  return {
    technicalStatus,
    validationStatus,
    pricingStatus,
    quotable,
    recipeId: persistedRecipe?.id ?? null,
    sourceType: source?.sourceType ?? null,
    sourceReference: source?.sourceReference ?? null,
    sourceName: source?.sourceName ?? null,
    sourceRevision: source?.sourceRevision ?? null,
    label: copy.label,
    detail: copy.detail,
    warnings: [
      ...technicalEvaluation.bloqueos,
      ...technicalEvaluation.advertencias,
      ...(pricingStatus === "missing" ? ["Precio comercial pendiente"] : []),
      ...(!input.template.isActive ? ["Línea inactiva"] : []),
    ],
  };
}
