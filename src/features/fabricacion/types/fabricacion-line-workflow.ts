import type { CotizacionLineTemplateMaterial } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeTestRecord,
} from "@/features/fabricacion/types/fabricacion-persistence";

export type FabricacionWorkspaceView = "list" | "edit" | "test";

export type FabricacionMobileView = "detail" | "wizard" | "test";

export type RecipeStartMode = "ventora" | "ai" | "blank";

export const FABRICACION_WORKFLOW_STEPS = [
  { id: "base", label: "Base" },
  { id: "components", label: "Componentes" },
  { id: "rules", label: "Reglas" },
  { id: "test", label: "Prueba" },
  { id: "plan", label: "Pauta" },
  { id: "validation", label: "Validar" },
] as const;

export type RecipeWorkflowStepId =
  (typeof FABRICACION_WORKFLOW_STEPS)[number]["id"];

export type PrimaryWorkflowStepId = "line" | "recipe" | "activate";

export type MobileWizardStepId =
  | "origin"
  | "config"
  | "profiles"
  | "glass"
  | "test";

export type RecipeStageProgress = {
  componentCount: number;
  activeProfileRuleCount: number;
  activeProfilePieceCount: number;
  hasComponents: boolean;
  hasRules: boolean;
  hasCutPolicy: boolean;
  hasTest: boolean;
  canValidate: boolean;
  completed: Record<RecipeWorkflowStepId, boolean>;
  currentStep: RecipeWorkflowStepId;
  nextLabel: string;
};

export type FabricacionLineWorkflowState = {
  view: FabricacionWorkspaceView;
  mobileView: FabricacionMobileView;
  mobileWizardStep: MobileWizardStepId;
  selectedId: string | null;
  draft: FabricacionReceta | null;
  providerName: string;
  lineName: string;
  lineMaterial: CotizacionLineTemplateMaterial;
  recipeStartMode: RecipeStartMode;
  hasChangedRecipeStartMode: boolean;
  lineSetupError: string | null;
  feedback: string | null;
  activeStep: RecipeWorkflowStepId;
};

export type FabricacionLineWorkflowContext = {
  selected: FabricationRecipeRecord | null;
  selectedTests: FabricationRecipeTestRecord[];
  focusRecipe: FabricationRecipeRecord | null;
  focusTests: FabricationRecipeTestRecord[];
  focusProgress: RecipeStageProgress | null;
};
