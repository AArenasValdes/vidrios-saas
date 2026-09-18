"use client";

import { ChevronLeft } from "lucide-react";

import { FabricacionLineMobileDetail } from "@/features/fabricacion/components/mobile/fabricacion-line-mobile-detail";
import { FabricacionMobileTestLab } from "@/features/fabricacion/components/mobile/fabricacion-mobile-test-lab";
import { FabricacionMobileWizard } from "@/features/fabricacion/components/mobile/fabricacion-mobile-wizard";
import { useFabricacionLineWorkflow } from "@/features/fabricacion/hooks/use-fabricacion-line-workflow";

import s from "./fabricacion-mobile.module.css";

type Props = {
  lineTemplateId: number;
  initialSuggestedRecipeId?: string | null;
};

export function FabricacionLineMobileShell({
  lineTemplateId,
  initialSuggestedRecipeId = null,
}: Props) {
  const workflow = useFabricacionLineWorkflow({
    lineTemplateId,
    initialSuggestedRecipeId,
    enableDesktopBootstrap: false,
    isDesktopWorkspace: false,
    hasResolvedWorkspaceViewport: true,
  });

  const {
    template,
    focusRecipe,
    lineRecipes,
    selected,
    selectedTests,
    draft,
    setDraft,
    providerName,
    setProviderName,
    lineName,
    setLineName,
    lineMaterial,
    setLineMaterial,
    providerOptions,
    recipeStartMode,
    setRecipeStartMode,
    setHasChangedRecipeStartMode,
    lineSetupError,
    feedback,
    isSaving,
    isLoading,
    isLoadingTemplates,
    isResolvingOrganization,
    error,
    mobileView,
    setMobileView,
    mobileWizardStep,
    navigateMobileWizardStep,
    recipes,
    openMobileFabrication,
    handleContinueToRecipe,
    handleSave,
    handleValidate,
    createRecipeTest,
    runRecipeTest,
    updateRecipe,
    navigateToRecipeStep,
  } = workflow;

  if (isLoadingTemplates || isLoading || isResolvingOrganization) {
    return <div className={s.errorBand}>Cargando fabricación...</div>;
  }

  if (!template) {
    return <div className={s.errorBand}>No se encontró la línea comercial solicitada.</div>;
  }

  if (mobileView === "test" && selected) {
    return (
      <div className={s.wizard}>
        <header className={s.wizardHeader}>
          <div className={s.wizardTop}>
            <button
              type="button"
              className={s.backButton}
              onClick={() => setMobileView("detail")}
              aria-label="Volver al detalle"
            >
              <ChevronLeft aria-hidden />
            </button>
            <h1>Probar fabricación</h1>
            <span />
          </div>
        </header>
        <FabricacionMobileTestLab
          recipe={selected}
          draft={draft}
          tests={selectedTests}
          isSaving={isSaving}
          onBack={() => {
            void navigateToRecipeStep(selected, "components");
            setMobileView("wizard");
          }}
          onDraftChange={setDraft}
          onSaveDraft={async (recipe) => {
            await handleSave(recipe, { silent: true });
          }}
          onSaveTest={async (input) => {
            await createRecipeTest({
              recipeId: selected.id,
              name: input.name,
              input: input.input,
              expectedOutput: input.expectedOutput,
              isRequired: input.isRequired,
            });
          }}
          onRunTest={async (testId) => {
            await runRecipeTest(selected.id, testId);
          }}
          onActivate={async () => {
            await handleValidate({ stayOnStep: false });
          }}
          onUpdateStatusTesting={async () => {
            if (
              selected.status === "draft" ||
              selected.status === "review_required"
            ) {
              await updateRecipe(selected.id, { status: "testing" });
            }
          }}
        />
      </div>
    );
  }

  if (mobileView === "wizard" && selected && draft) {
    const readOnly = selected.status === "validated";
    return (
      <FabricacionMobileWizard
        templateName={template.nombre}
        selected={selected}
        draft={draft}
        providerName={providerName}
        lineName={lineName}
        lineMaterial={lineMaterial}
        providerOptions={providerOptions}
        recipeStartMode={recipeStartMode}
        sourceType={selected.sourceType}
        sourceReference={selected.sourceReference}
        workshopRecipes={recipes
          .filter((entry) => entry.scope === "organization")
          .map((entry) => entry.definition)}
        readOnly={readOnly}
        isSaving={isSaving}
        step={mobileWizardStep}
        lineSetupError={lineSetupError}
        onStepChange={navigateMobileWizardStep}
        onClose={() => setMobileView("detail")}
        onDraftChange={setDraft}
        onProviderNameChange={setProviderName}
        onLineNameChange={setLineName}
        onMaterialChange={setLineMaterial}
        onStartModeChange={(mode) => {
          setRecipeStartMode(mode);
          setHasChangedRecipeStartMode(true);
        }}
        onContinueToRecipe={handleContinueToRecipe}
        onPersistRecipe={async (recipe) => {
          setDraft(recipe);
          await handleSave(recipe, { silent: true });
        }}
        onOpenTest={() => {
          void navigateToRecipeStep(selected, "test");
        }}
      />
    );
  }

  return (
    <FabricacionLineMobileDetail
      template={template}
      currentRecipe={focusRecipe}
      olderRecipes={lineRecipes.slice(1)}
      error={error}
      feedback={feedback}
      isSaving={isSaving}
      onConfigure={() => void openMobileFabrication()}
      onEdit={() => void openMobileFabrication(focusRecipe)}
      onTest={() => {
        if (!focusRecipe) return;
        void navigateToRecipeStep(focusRecipe, "test");
      }}
    />
  );
}
