"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { FabricacionMobileValidateStep } from "@/features/fabricacion/components/mobile/fabricacion-mobile-validate-step";
import { isRecipeReadyToActivate } from "@/features/fabricacion/components/recipe-activate-panel";
import { FabricacionItemEditSheet } from "@/features/fabricacion/components/mobile/fabricacion-item-edit-sheet";
import { FabricacionMobileMaterialsStep } from "@/features/fabricacion/components/mobile/fabricacion-mobile-materials-step";
import { FabricacionMobileProductStep } from "@/features/fabricacion/components/mobile/fabricacion-mobile-product-step";
import { FabricacionProfileEditSheet } from "@/features/fabricacion/components/mobile/fabricacion-profile-edit-sheet";
import { FabricacionProfileList } from "@/features/fabricacion/components/mobile/fabricacion-profile-list";
import type { LineVariantSlot } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import {
  crearAccesorioFabricacionVacio,
  crearPerfilFabricacionVacio,
  crearVidrioFabricacionVacio,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { getActiveRecipeProfileRules } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { MOBILE_WIZARD_STEPS } from "@/features/fabricacion/services/fabricacion-line-workflow.utils";
import type { MobileWizardStepId } from "@/features/fabricacion/types/fabricacion-line-workflow";
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

type SheetState =
  | { type: "profile"; id: string }
  | { type: "glass"; id: string }
  | { type: "accessory"; id: string }
  | null;

type Props = {
  templateName: string;
  catalogKey?: string | null;
  selected: FabricationRecipeRecord;
  lineRecipes?: FabricationRecipeRecord[];
  draft: FabricacionReceta;
  tests: FabricationRecipeTestRecord[];
  readOnly: boolean;
  isSaving: boolean;
  step: MobileWizardStepId;
  lineSetupError: string | null;
  onStepChange: (step: MobileWizardStepId) => void;
  onClose: () => void;
  onDraftChange: (recipe: FabricacionReceta) => void;
  onSelectRecipe?: (recipe: FabricationRecipeRecord) => void;
  onCreateMissingSlot?: (slot: LineVariantSlot) => void;
  onContinueToRecipe: () => void;
  onPersistRecipe: (recipe: FabricacionReceta) => Promise<void>;
  onSaveTest: (input: {
    name: string;
    input: FabricacionEntradaCalculo;
    expectedOutput: FabricacionResultadoCubicacion;
    isRequired: boolean;
  }) => Promise<void>;
  onActivate: () => Promise<void>;
  onSaveDraft: (recipe: FabricacionReceta) => Promise<void>;
};

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 16 : -16,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -16 : 16,
    opacity: 0,
  }),
};

export function FabricacionMobileWizard({
  templateName,
  catalogKey = null,
  selected,
  lineRecipes = [],
  draft,
  tests,
  readOnly,
  isSaving,
  step,
  lineSetupError,
  onStepChange,
  onClose,
  onDraftChange,
  onSelectRecipe,
  onCreateMissingSlot,
  onContinueToRecipe,
  onPersistRecipe,
  onSaveTest,
  onActivate,
  onSaveDraft,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [direction, setDirection] = useState(1);
  const [sheet, setSheet] = useState<SheetState>(null);
  const stepIndex = MOBILE_WIZARD_STEPS.findIndex((entry) => entry.id === step);
  const previousStep = MOBILE_WIZARD_STEPS[stepIndex - 1]?.id ?? null;
  const nextStep = MOBILE_WIZARD_STEPS[stepIndex + 1]?.id ?? null;
  const stepTitle =
    MOBILE_WIZARD_STEPS.find((entry) => entry.id === step)?.label ?? "Fabricación";
  const wizardProgressPct = Math.round(
    ((stepIndex + 1) / MOBILE_WIZARD_STEPS.length) * 100
  );
  const workingRecipe = useMemo(
    () => ({ ...selected, definition: draft }),
    [draft, selected]
  );
  const canValidate =
    workingRecipe.scope === "organization" &&
    workingRecipe.status !== "validated" &&
    isRecipeReadyToActivate(workingRecipe.definition, tests);
  const profileIds = useMemo(
    () => getActiveRecipeProfileRules(draft).map((profile) => profile.id),
    [draft]
  );

  const goTo = (next: MobileWizardStepId) => {
    const nextIndex = MOBILE_WIZARD_STEPS.findIndex((entry) => entry.id === next);
    setDirection(nextIndex >= stepIndex ? 1 : -1);
    onStepChange(next);
  };

  const goNext = () => {
    if (step === "product") {
      onContinueToRecipe();
      return;
    }
    if (nextStep) goTo(nextStep);
  };

  const goBack = () => {
    if (previousStep) {
      goTo(previousStep);
      return;
    }
    onClose();
  };

  const openSheet = (next: SheetState) => {
    setSheet(next);
  };

  return (
    <div
      className={s.wizard}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fabricacion-wizard-title"
    >
      <header className={s.wizardHeader}>
        <div className={s.wizardTop}>
          <button type="button" className={s.backButton} onClick={goBack} aria-label="Atrás">
            <ArrowLeft aria-hidden />
          </button>
          <div className={s.wizardTitleBlock}>
            <p className={s.stepMeta}>
              Paso {stepIndex + 1} de {MOBILE_WIZARD_STEPS.length}
            </p>
            <h1 id="fabricacion-wizard-title">{stepTitle}</h1>
          </div>
          <button type="button" className={s.backButton} onClick={onClose} aria-label="Cerrar">
            <X aria-hidden />
          </button>
        </div>
        <div
          className={s.wizardProgress}
          role="progressbar"
          aria-valuenow={wizardProgressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Paso ${stepIndex + 1} de ${MOBILE_WIZARD_STEPS.length}`}
        >
          <span style={{ width: `${wizardProgressPct}%` }} />
        </div>
      </header>

      <div
        className={`${s.wizardBody}${step === "validate" ? ` ${s.wizardBodyValidate}` : ""}`}
      >
        {lineSetupError ? <div className={s.errorBand}>{lineSetupError}</div> : null}
        <AnimatePresence mode="sync" custom={direction} initial={false}>
          <motion.div
            key={step}
            className={s.stepPane}
            custom={direction}
            variants={reduceMotion ? undefined : stepVariants}
            initial={reduceMotion ? false : "enter"}
            animate="center"
            exit={reduceMotion ? undefined : "exit"}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === "product" ? (
              <FabricacionMobileProductStep
                templateName={templateName}
                catalogKey={catalogKey}
                selected={selected}
                draft={draft}
                recipes={lineRecipes}
                readOnly={readOnly}
                onDraftChange={onDraftChange}
                onSelectRecipe={onSelectRecipe}
                onCreateMissingSlot={onCreateMissingSlot}
              />
            ) : null}

            {step === "profiles" ? (
              <FabricacionProfileList
                recipe={draft}
                readOnly={readOnly}
                onSelectProfile={(id) => openSheet({ type: "profile", id })}
                onAddProfile={() => {
                  const id = crypto.randomUUID();
                  onDraftChange({
                    ...draft,
                    perfiles: [...draft.perfiles, crearPerfilFabricacionVacio(id)],
                  });
                  openSheet({ type: "profile", id });
                }}
              />
            ) : null}

            {step === "glass" ? (
              <FabricacionMobileMaterialsStep
                draft={draft}
                readOnly={readOnly}
                onAddGlass={() => {
                  const id = crypto.randomUUID();
                  onDraftChange({
                    ...draft,
                    vidrios: [...draft.vidrios, crearVidrioFabricacionVacio(id)],
                  });
                  openSheet({ type: "glass", id });
                }}
                onAddAccessory={() => {
                  const id = crypto.randomUUID();
                  onDraftChange({
                    ...draft,
                    accesorios: [...draft.accesorios, crearAccesorioFabricacionVacio(id)],
                  });
                  openSheet({ type: "accessory", id });
                }}
                onSelectGlass={(id) => openSheet({ type: "glass", id })}
                onSelectAccessory={(id) => openSheet({ type: "accessory", id })}
              />
            ) : null}

            {step === "validate" ? (
              <FabricacionMobileValidateStep
                recipe={workingRecipe}
                isSaving={isSaving}
                canActivateFromSaved={canValidate}
                onBackToRecipe={() => goTo("profiles")}
                onCorrectProfile={(profileId) => openSheet({ type: "profile", id: profileId })}
                onSaveDraft={() => void onSaveDraft(draft)}
                onActivate={
                  workingRecipe.status === "validated" ? undefined : () => void onActivate()
                }
                onSaveTest={onSaveTest}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {step !== "validate" ? (
        <footer className={s.wizardFooter}>
          <button type="button" className={s.secondaryButton} onClick={goBack}>
            Atrás
          </button>
          <button
            type="button"
            className={s.primaryButton}
            disabled={isSaving}
            onClick={goNext}
          >
            Continuar
            <ArrowRight size={16} aria-hidden />
          </button>
        </footer>
      ) : null}

      {sheet?.type === "profile" ? (
        <FabricacionProfileEditSheet
          key={`${selected.id}:${sheet.id}`}
          recipe={draft}
          profileId={sheet.id}
          profileIds={profileIds}
          sourceType={selected.sourceType}
          sourceReference={selected.sourceReference}
          lineName={templateName}
          workshopRecipes={[draft]}
          readOnly={readOnly}
          onClose={() => setSheet(null)}
          onSelectProfile={(id) => setSheet({ type: "profile", id })}
          onRecipeChange={onDraftChange}
          onPersist={onPersistRecipe}
        />
      ) : null}

      {sheet?.type === "glass" || sheet?.type === "accessory" ? (
        <FabricacionItemEditSheet
          recipe={draft}
          kind={sheet.type}
          itemId={sheet.id}
          readOnly={readOnly}
          isSaving={isSaving}
          onClose={() => setSheet(null)}
          onRecipeChange={onDraftChange}
          onPersist={onPersistRecipe}
        />
      ) : null}
    </div>
  );
}
