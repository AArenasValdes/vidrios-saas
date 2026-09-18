"use client";

import { RecipeTestLab } from "@/features/fabricacion/components/recipe-test-lab";
import { isRecipeReadyToActivate } from "@/features/fabricacion/components/recipe-activate-panel";
import { applyLargoToProfilesWithoutLength } from "@/features/fabricacion/services/taller-perfiles.service";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeTestRecord,
} from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-mobile.module.css";

type Props = {
  recipe: FabricationRecipeRecord;
  draft: FabricacionReceta | null;
  tests: FabricationRecipeTestRecord[];
  isSaving: boolean;
  onBack: () => void;
  onDraftChange: (recipe: FabricacionReceta) => void;
  onSaveDraft: (recipe: FabricacionReceta) => Promise<void>;
  onSaveTest: (input: {
    name: string;
    input: FabricacionEntradaCalculo;
    expectedOutput: FabricacionResultadoCubicacion;
    isRequired: boolean;
  }) => Promise<void>;
  onRunTest: (testId: string) => Promise<void>;
  onActivate: () => Promise<void>;
  onUpdateStatusTesting: () => Promise<void>;
};

export function FabricacionMobileTestLab({
  recipe,
  draft,
  tests,
  isSaving,
  onBack,
  onDraftChange,
  onSaveDraft,
  onSaveTest,
  onRunTest,
  onActivate,
  onUpdateStatusTesting,
}: Props) {
  const workingRecipe =
    draft && recipe
      ? {
          ...recipe,
          definition: draft,
        }
      : recipe;
  const canValidate =
    workingRecipe.scope === "organization" &&
    workingRecipe.status !== "validated" &&
    isRecipeReadyToActivate(workingRecipe.definition, tests);

  const handleSaveTest = async (input: {
    name: string;
    input: FabricacionEntradaCalculo;
    expectedOutput: FabricacionResultadoCubicacion;
    isRequired: boolean;
  }) => {
    await onSaveTest(input);
    if (
      workingRecipe.status === "draft" ||
      workingRecipe.status === "review_required"
    ) {
      await onUpdateStatusTesting();
    }
  };

  return (
    <div className={s.wizardBody}>
      <RecipeTestLab
        recipe={workingRecipe}
        tests={tests}
        isSaving={isSaving}
        isActivated={workingRecipe.status === "validated"}
        canActivateFromSaved={canValidate}
        onBackToRecipe={onBack}
        onConfigureLengths={onBack}
        onApplyPresetLengths={async () => {
          const next = applyLargoToProfilesWithoutLength(
            workingRecipe.definition,
            VENTORA_LARGO_COMERCIAL_PRESET_MM
          );
          onDraftChange(next);
          await onSaveDraft(next);
        }}
        onActivate={() => void onActivate()}
        onSaveTest={handleSaveTest}
        onRunTest={onRunTest}
      />
    </div>
  );
}
