"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FabricacionLineLoadingSkeleton } from "@/features/fabricacion/components/mobile/fabricacion-line-loading-skeleton";
import { FabricacionLineMobileDetail } from "@/features/fabricacion/components/mobile/fabricacion-line-mobile-detail";
import { FabricacionMobileWizard } from "@/features/fabricacion/components/mobile/fabricacion-mobile-wizard";
import { setFabricacionEditorOpen } from "@/features/fabricacion/services/fabricacion-editor-chrome.store";
import {
  isSodalL25CatalogKey,
  resolveEffectiveSodalL25CatalogKey,
  resolveSodalL25CommercialLineDisplayName,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    fabricacionLineRecipes,
    selected,
    selectedTests,
    draft,
    setDraft,
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
    openMobileFabrication,
    handleContinueToRecipe,
    handleSave,
    handleValidate,
    createRecipeTest,
    updateRecipe,
    openEditor,
    openTestLab,
  } = workflow;

  const editorOpen = mobileView === "wizard";

  useEffect(() => {
    setFabricacionEditorOpen(editorOpen);
    return () => setFabricacionEditorOpen(false);
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const hasEditor = params.get("editor") === "1";
    if (editorOpen && !hasEditor) {
      params.set("editor", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    if (!editorOpen && hasEditor) {
      params.delete("editor");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [editorOpen, pathname, router, searchParams]);

  if (isLoadingTemplates || isLoading || isResolvingOrganization) {
    return <FabricacionLineLoadingSkeleton />;
  }

  if (!template) {
    return <div className={s.errorBand}>No se encontró la línea comercial solicitada.</div>;
  }

  const isL25 = isSodalL25CatalogKey(
    resolveEffectiveSodalL25CatalogKey({
      catalogKey: template.catalogKey,
      nombre: template.nombre,
    })
  );

  if (editorOpen && selected && draft) {
    const readOnly = selected.status === "validated" && !isL25;
    return (
      <FabricacionMobileWizard
        templateName={resolveSodalL25CommercialLineDisplayName({
          nombre: template.nombre,
          catalogKey: template.catalogKey,
        })}
        catalogKey={template.catalogKey}
        selected={selected}
        lineRecipes={fabricacionLineRecipes}
        draft={draft}
        tests={selectedTests}
        readOnly={readOnly}
        isSaving={isSaving}
        step={mobileWizardStep}
        lineSetupError={workflow.lineSetupError}
        onStepChange={navigateMobileWizardStep}
        onClose={() => setMobileView("detail")}
        onDraftChange={setDraft}
        onSelectRecipe={(recipe) => openEditor(recipe, "base")}
        onContinueToRecipe={handleContinueToRecipe}
        onPersistRecipe={async (recipe) => {
          setDraft(recipe);
          try {
            await handleSave(recipe, { silent: true });
          } catch (error) {
            throw error instanceof Error
              ? error
              : new Error("No se pudo guardar la receta.");
          }
        }}
        onSaveDraft={async (recipe) => {
          setDraft(recipe);
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
          if (selected.status === "draft" || selected.status === "review_required") {
            await updateRecipe(selected.id, { status: "testing" });
          }
        }}
        onActivate={async () => {
          await handleValidate({ stayOnStep: false });
        }}
      />
    );
  }

  return (
    <FabricacionLineMobileDetail
      template={template}
      currentRecipe={focusRecipe}
      lineRecipes={fabricacionLineRecipes}
      olderRecipes={
        isL25
          ? []
          : lineRecipes.slice(1)
      }
      error={error}
      feedback={feedback}
      isSaving={isSaving}
      onConfigure={() => void openMobileFabrication()}
      onEdit={() => void openMobileFabrication(focusRecipe)}
      onTest={() => {
        if (!focusRecipe) return;
        void openTestLab(focusRecipe, "test");
      }}
    />
  );
}
