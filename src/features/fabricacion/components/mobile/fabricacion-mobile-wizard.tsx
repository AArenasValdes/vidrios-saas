"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, Plus, Trash2 } from "lucide-react";

import { RecipeGlassNamePicker } from "@/features/fabricacion/components/recipe-glass-name-picker";
import { RecipeGuidedEditor } from "@/features/fabricacion/components/recipe-guided-editor";
import { FabricacionProfileEditSheet } from "@/features/fabricacion/components/mobile/fabricacion-profile-edit-sheet";
import { FabricacionProfileList } from "@/features/fabricacion/components/mobile/fabricacion-profile-list";
import {
  crearAccesorioFabricacionVacio,
  crearVidrioFabricacionVacio,
  patchRecipeGlassNombre,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { MOBILE_WIZARD_STEPS } from "@/features/fabricacion/services/fabricacion-line-workflow.utils";
import type { MobileWizardStepId } from "@/features/fabricacion/types/fabricacion-line-workflow";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeSourceType,
} from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionLineTemplateMaterial } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { RecipeStartMode } from "@/features/fabricacion/types/fabricacion-line-workflow";

import s from "./fabricacion-mobile.module.css";

type Props = {
  templateName: string;
  selected: FabricationRecipeRecord;
  draft: FabricacionReceta;
  providerName: string;
  lineName: string;
  lineMaterial: CotizacionLineTemplateMaterial;
  providerOptions: string[];
  recipeStartMode: RecipeStartMode;
  sourceType: FabricationRecipeSourceType;
  sourceReference: string | null;
  workshopRecipes: FabricacionReceta[];
  readOnly: boolean;
  isSaving: boolean;
  step: MobileWizardStepId;
  lineSetupError: string | null;
  onStepChange: (step: MobileWizardStepId) => void;
  onClose: () => void;
  onDraftChange: (recipe: FabricacionReceta) => void;
  onProviderNameChange: (value: string) => void;
  onLineNameChange: (value: string) => void;
  onMaterialChange: (value: CotizacionLineTemplateMaterial) => void;
  onStartModeChange: (mode: RecipeStartMode) => void;
  onContinueToRecipe: () => void;
  onPersistRecipe: (recipe: FabricacionReceta) => Promise<void>;
  onOpenTest: () => void;
};

export function FabricacionMobileWizard({
  templateName,
  selected,
  draft,
  providerName,
  lineName,
  lineMaterial,
  providerOptions,
  recipeStartMode,
  sourceType,
  sourceReference,
  workshopRecipes,
  readOnly,
  isSaving,
  step,
  lineSetupError,
  onStepChange,
  onClose,
  onDraftChange,
  onProviderNameChange,
  onLineNameChange,
  onMaterialChange,
  onStartModeChange,
  onContinueToRecipe,
  onPersistRecipe,
  onOpenTest,
}: Props) {
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const stepIndex = MOBILE_WIZARD_STEPS.findIndex((entry) => entry.id === step);
  const previousStep = MOBILE_WIZARD_STEPS[stepIndex - 1]?.id ?? null;
  const nextStep = MOBILE_WIZARD_STEPS[stepIndex + 1]?.id ?? null;

  const stepTitle = useMemo(
    () => MOBILE_WIZARD_STEPS.find((entry) => entry.id === step)?.label ?? "Fabricación",
    [step]
  );

  const goNext = () => {
    if (step === "origin" || step === "config") {
      onContinueToRecipe();
      return;
    }
    if (step === "test") {
      onOpenTest();
      return;
    }
    if (nextStep) onStepChange(nextStep);
  };

  const goBack = () => {
    if (previousStep) {
      onStepChange(previousStep);
      return;
    }
    onClose();
  };

  return (
    <div className={s.wizard}>
      <header className={s.wizardHeader}>
        <div className={s.wizardTop}>
          <button type="button" className={s.backButton} onClick={goBack} aria-label="Atrás">
            <ChevronLeft aria-hidden />
          </button>
          <h1>{stepTitle}</h1>
          <button type="button" className={s.backButton} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <nav className={s.stepper} aria-label="Pasos de fabricación">
          {MOBILE_WIZARD_STEPS.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={s.stepChip}
              data-active={entry.id === step ? "true" : "false"}
              onClick={() => onStepChange(entry.id)}
            >
              {index + 1}. {entry.label}
            </button>
          ))}
        </nav>
      </header>

      <div className={s.wizardBody}>
        {lineSetupError ? <div className={s.errorBand}>{lineSetupError}</div> : null}

        {step === "origin" || step === "config" ? (
          <RecipeGuidedEditor
            recipe={draft}
            providerName={providerName}
            lineName={lineName}
            material={lineMaterial}
            providerOptions={providerOptions}
            startMode={recipeStartMode}
            sourceType={sourceType}
            sourceReference={sourceReference}
            readOnly={readOnly}
            desktopActiveStep="base"
            onRecipeChange={onDraftChange}
            onProviderNameChange={onProviderNameChange}
            onLineNameChange={onLineNameChange}
            onMaterialChange={onMaterialChange}
            onStartModeChange={onStartModeChange}
          />
        ) : null}

        {step === "profiles" ? (
          <FabricacionProfileList
            profiles={draft.perfiles}
            onSelectProfile={setEditingProfileId}
          />
        ) : null}

        {step === "glass" ? (
          <div className={s.card}>
            <div className={s.cardHeading}>
              <div>
                <h2>Vidrio</h2>
                <p>Define el vidrio base de la receta</p>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={() =>
                    onDraftChange({
                      ...draft,
                      vidrios: [
                        ...draft.vidrios,
                        crearVidrioFabricacionVacio(crypto.randomUUID()),
                      ],
                    })
                  }
                >
                  <Plus size={16} aria-hidden />
                  Agregar
                </button>
              ) : null}
            </div>
            {draft.vidrios.length === 0 ? (
              <p>Sin vidrio definido. Puedes agregarlo ahora o al cotizar cada pieza.</p>
            ) : (
              draft.vidrios.map((glass) => (
                <div key={glass.id} className={s.sheetSection}>
                  <RecipeGlassNamePicker
                    value={glass.nombre}
                    readOnly={readOnly}
                    onChange={(nextName) =>
                      onDraftChange(patchRecipeGlassNombre(draft, glass.id, nextName))
                    }
                  />
                  {!readOnly ? (
                    <button
                      type="button"
                      className={s.secondaryButton}
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          vidrios: draft.vidrios.filter((entry) => entry.id !== glass.id),
                        })
                      }
                    >
                      <Trash2 size={15} aria-hidden />
                      Quitar vidrio
                    </button>
                  ) : null}
                </div>
              ))
            )}

            <div className={s.cardHeading} style={{ marginTop: 18 }}>
              <div>
                <h2>Accesorios</h2>
                <p>Lista preliminar para cubicación</p>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={() =>
                    onDraftChange({
                      ...draft,
                      accesorios: [
                        ...draft.accesorios,
                        crearAccesorioFabricacionVacio(crypto.randomUUID()),
                      ],
                    })
                  }
                >
                  <Plus size={16} aria-hidden />
                  Agregar
                </button>
              ) : null}
            </div>
            {draft.accesorios.length === 0 ? (
              <p>Sin accesorios definidos.</p>
            ) : (
              draft.accesorios.map((accessory) => (
                <label key={accessory.id} className={s.sheetSection}>
                  <span>Nombre</span>
                  <input
                    value={accessory.nombre}
                    disabled={readOnly}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        accesorios: draft.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? { ...entry, nombre: event.target.value }
                            : entry
                        ),
                      })
                    }
                  />
                </label>
              ))
            )}
          </div>
        ) : null}

        {step === "test" ? (
          <div className={s.card}>
            <h2>Probar y guardar</h2>
            <p>
              Guarda el borrador y abre el laboratorio con una medida real para
              validar la receta de {templateName}.
            </p>
            <button
              type="button"
              className={s.primaryButton}
              disabled={isSaving}
              onClick={() => void onPersistRecipe(draft).then(onOpenTest)}
            >
              Abrir laboratorio
            </button>
          </div>
        ) : null}
      </div>

      <footer className={s.wizardFooter}>
        <button type="button" className={s.secondaryButton} onClick={goBack}>
          <ArrowLeft size={16} aria-hidden />
          Atrás
        </button>
        <button
          type="button"
          className={s.primaryButton}
          disabled={isSaving}
          onClick={goNext}
        >
          {step === "test" ? "Probar" : "Continuar"}
          <ArrowRight size={16} aria-hidden />
        </button>
      </footer>

      {editingProfileId ? (
        <FabricacionProfileEditSheet
          recipe={draft}
          profileId={editingProfileId}
          sourceType={sourceType}
          sourceReference={sourceReference}
          lineName={lineName}
          workshopRecipes={workshopRecipes}
          readOnly={readOnly}
          onClose={() => setEditingProfileId(null)}
          onRecipeChange={onDraftChange}
          onPersist={onPersistRecipe}
        />
      ) : null}
    </div>
  );
}
