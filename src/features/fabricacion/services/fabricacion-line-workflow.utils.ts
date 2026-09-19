import { contarBloqueosCriticosReceta } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeStatus,
  FabricationRecipeTestRecord,
} from "@/features/fabricacion/types/fabricacion-persistence";
import type { deriveLineOperationalStatus } from "@/features/fabricacion/services/line-operational-status.service";
import {
  FABRICACION_WORKFLOW_STEPS,
  type PrimaryWorkflowStepId,
  type RecipeStageProgress,
  type RecipeWorkflowStepId,
} from "@/features/fabricacion/types/fabricacion-line-workflow";

export { FABRICACION_WORKFLOW_STEPS };

export const FABRICACION_STATUS_COPY: Record<
  FabricationRecipeStatus,
  { label: string; detail: string; tone: string }
> = {
  draft: {
    label: "Configuración técnica pendiente",
    detail: "Fabricación por completar",
    tone: "draft",
  },
  testing: {
    label: "En prueba",
    detail: "Lista para probar con una medida",
    tone: "testing",
  },
  validated: {
    label: "Validada en taller",
    detail: "Validada por tu taller",
    tone: "validated",
  },
  review_required: {
    label: "Requiere revision",
    detail: "Esta version cambio y debe revisarse",
    tone: "review",
  },
  archived: {
    label: "Archivada",
    detail: "Fuera de uso",
    tone: "archived",
  },
};

export function cloneFabricacionRecipe(recipe: FabricacionReceta) {
  return JSON.parse(JSON.stringify(recipe)) as FabricacionReceta;
}

export function formatFabricacionDate(value: string | null) {
  if (!value) return "Sin validar";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getPrimaryWorkflowStep(
  step: RecipeWorkflowStepId
): PrimaryWorkflowStepId {
  if (step === "base") return "line";
  if (step === "test" || step === "validation") return "activate";
  return "recipe";
}

export function getInternalStepForPrimary(
  step: PrimaryWorkflowStepId
): RecipeWorkflowStepId {
  if (step === "line") return "base";
  if (step === "activate") return "test";
  return "components";
}

export function getRecipeStage(
  recipe: FabricationRecipeRecord,
  recipeTests: FabricationRecipeTestRecord[] = []
): RecipeStageProgress {
  const summary = buildFabricationRecipeSummary(recipe.definition);
  const componentCount =
    recipe.definition.perfiles.length +
    recipe.definition.vidrios.length +
    recipe.definition.accesorios.length;
  const cutSettings = recipe.definition.configuracionCorte;
  const hasComponents = componentCount > 0;
  const hasRules =
    hasComponents &&
    recipe.definition.perfiles.every(
      (profile) => !profile.requerido || Boolean(profile.reglaMedida.base)
    ) &&
    contarBloqueosCriticosReceta(recipe.definition) === 0;
  const hasCutPolicy =
    cutSettings?.perdidaCorteMm != null &&
    cutSettings.despunteInicialMm != null &&
    cutSettings.sobranteMinimoAprovechableMm != null;
  const hasTest =
    recipeTests.length > 0 ||
    recipe.status === "testing" ||
    recipe.status === "validated";
  const requiredTests = recipeTests.filter((test) => test.isRequired !== false);
  const canValidate =
    recipe.status !== "validated" &&
    contarBloqueosCriticosReceta(recipe.definition) === 0 &&
    requiredTests.length > 0 &&
    requiredTests.every((test) => test.passed);
  const completed = {
    base: true,
    components: hasComponents,
    rules: hasRules,
    test: hasTest,
    plan: hasTest,
    validation: recipe.status === "validated",
  } satisfies Record<RecipeWorkflowStepId, boolean>;
  const currentStep: RecipeWorkflowStepId = !hasComponents
    ? "components"
    : !hasTest
      ? "test"
      : recipe.status === "validated"
        ? "validation"
        : "test";

  let nextLabel = "Probar con una medida real";
  if (!hasComponents) nextLabel = "Preparar fabricación";
  else if (!hasTest) nextLabel = "Probar con una medida real";
  else if (canValidate) nextLabel = "Dejar receta validada";

  return {
    componentCount,
    activeProfileRuleCount: summary.activeRuleCount,
    activeProfilePieceCount: summary.activePieceCount,
    hasComponents,
    hasRules,
    hasCutPolicy,
    hasTest,
    canValidate,
    completed,
    currentStep,
    nextLabel,
  };
}

export function getOperationalStatusCopy(
  recipeStatus: FabricationRecipeStatus,
  operationalStatus: ReturnType<typeof deriveLineOperationalStatus>
) {
  const base = FABRICACION_STATUS_COPY[recipeStatus];
  const tone =
    operationalStatus.validationStatus === "workshop_validated"
      ? "validated"
      : operationalStatus.label === "Lista para probar"
        ? "testing"
        : base.tone;
  return {
    ...base,
    label: operationalStatus.label,
    detail: operationalStatus.detail,
    tone,
  };
}

export function formatTypologyLabel(tipologia: string) {
  return tipologia
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function mapWorkflowStepToMobileWizard(
  step: RecipeWorkflowStepId
): "product" | "profiles" | "glass" | "validate" {
  if (step === "base") return "product";
  if (step === "components" || step === "rules") return "profiles";
  if (step === "plan") return "glass";
  return "validate";
}

export function mapMobileWizardToWorkflowStep(
  step: "product" | "profiles" | "glass" | "validate"
): RecipeWorkflowStepId {
  if (step === "product") return "base";
  if (step === "profiles") return "components";
  if (step === "glass") return "components";
  return "test";
}

export const FABRICACION_PRIMARY_WORKFLOW_STEPS = [
  { id: "line", label: "Línea" },
  { id: "recipe", label: "Fabricación" },
  { id: "activate", label: "Probar" },
] as const;

export const MOBILE_WIZARD_STEPS = [
  { id: "product" as const, label: "Producto" },
  { id: "profiles" as const, label: "Perfiles" },
  { id: "glass" as const, label: "Vidrio y accesorios" },
  { id: "validate" as const, label: "Validar" },
];

export function getMobileWizardStepIndex(
  step: "product" | "profiles" | "glass" | "validate"
) {
  return MOBILE_WIZARD_STEPS.findIndex((entry) => entry.id === step);
}

export type FabricacionVisualStatusId = "none" | "draft" | "validated" | "active";

export function getFabricacionVisualStatus(
  status: FabricationRecipeStatus | "quote_only" | null | undefined
): { id: FabricacionVisualStatusId; label: string; tone: string } {
  if (!status || status === "quote_only") {
    return { id: "none", label: "Sin configurar", tone: "quote_only" };
  }
  if (status === "validated") {
    return { id: "active", label: "Activa", tone: "active" };
  }
  if (status === "testing") {
    return { id: "validated", label: "Validada", tone: "validated" };
  }
  return { id: "draft", label: "Borrador", tone: "draft" };
}

export function getPrimaryWorkflowIndex(step: PrimaryWorkflowStepId) {
  return FABRICACION_PRIMARY_WORKFLOW_STEPS.findIndex((entry) => entry.id === step);
}
