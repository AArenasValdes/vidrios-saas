"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import {
  isConnectivityError,
  scrollPageToTop,
  validateStep1,
  withResolvedStep1QuickQuoteDefaults,
  type ComponentFormState,
  type FieldErrors,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { calculateGlobalQuoteWorkflowTotals } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import { normalizeQuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

type SaveStatus = "borrador" | "creada";

export type SaveIntent = "quote" | "draft";

type StepKey = 1 | 2 | 3;

type WorkflowRecordMeta = {
  id?: string;
  codigo?: string;
  clientId?: string | number | null;
  projectId?: string | number | null;
} | null;

type PreparePasoTresGuardadoParams = {
  draft: CotizacionWorkflowDraft;
  estado: SaveStatus;
  applyQuickEditDraftsToItems: (items: CotizacionWorkflowItem[]) => CotizacionWorkflowItem[];
};

type PreparePasoTresGuardadoResult = {
  draftToSave: CotizacionWorkflowDraft;
  step1Errors: FieldErrors;
  finalErrors: FieldErrors;
};

type PersistenciaWizardController = {
  marcarComoGuardado: (input: {
    draft: CotizacionWorkflowDraft;
    componentForm: ComponentFormState;
    editingItemId: string | null;
    selectedClientId: string;
    clientQuery: string;
    showStep1MoreData: boolean;
  }) => void;
  limpiarPersistencia: () => void;
};

type UsePasoTresGuardadoParams = {
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
  recordMeta: WorkflowRecordMeta;
  isNewWorkflow: boolean;
  persistenciaWizard: PersistenciaWizardController;
  saveWorkflow: (input: {
    draft: CotizacionWorkflowDraft;
    estado: SaveStatus;
    existingId?: string;
    existingCode?: string;
    existingClientId?: string | number;
    existingProjectId?: string | number | null;
  }) => Promise<CotizacionWorkflowRecord>;
  onQuoteCreated?: (record: CotizacionWorkflowRecord) => Promise<boolean | void> | boolean | void;
  applyQuickEditDraftsToItems: (items: CotizacionWorkflowItem[]) => CotizacionWorkflowItem[];
  resetWorkflowToBlank: () => void;
  openQuotesList: () => void;
  syncWizardWithRecord: (recordId: string) => void;
  setDraft: Dispatch<SetStateAction<CotizacionWorkflowDraft>>;
  setRecordMeta: Dispatch<SetStateAction<WorkflowRecordMeta>>;
  setSavedRecord: Dispatch<SetStateAction<CotizacionWorkflowRecord | null>>;
  setLastSaveMode: Dispatch<SetStateAction<"borrador" | "creada" | "actualizada" | null>>;
  setStep: Dispatch<SetStateAction<StepKey>>;
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>;
  setGlobalError: Dispatch<SetStateAction<string | null>>;
};

export function preparePasoTresGuardado({
  draft,
  estado,
  applyQuickEditDraftsToItems,
}: PreparePasoTresGuardadoParams): PreparePasoTresGuardadoResult {
  const nextItems = applyQuickEditDraftsToItems(draft.items);
  const draftToSave = withResolvedStep1QuickQuoteDefaults({
    ...draft,
    items: nextItems,
  });
  const step1Errors = validateStep1(draftToSave);
  const finalErrors: FieldErrors = { ...step1Errors };

  const quotePricingMode = normalizeQuotePricingMode(draftToSave.quotePricingMode);

  if (estado === "creada" && draftToSave.items.length === 0 && quotePricingMode !== "total_global") {
    finalErrors.items = "Agrega al menos un componente";
  }

  if (estado === "creada" && quotePricingMode === "total_global") {
    const totals = calculateGlobalQuoteWorkflowTotals({
      totalClienteManual: draftToSave.totalClienteManual,
      mostrarIva: draftToSave.mostrarIva,
    });

    if (totals.total <= 0) {
      finalErrors.totalClienteManual = "Ingresa un total final para el cliente.";
    }
  }

  return {
    draftToSave,
    step1Errors,
    finalErrors,
  };
}

export function usePasoTresGuardado(params: UsePasoTresGuardadoParams) {
  const {
    draft,
    componentForm,
    editingItemId,
    selectedClientId,
    clientQuery,
    showStep1MoreData,
    recordMeta,
    isNewWorkflow,
    persistenciaWizard,
    saveWorkflow,
    onQuoteCreated,
    applyQuickEditDraftsToItems,
    resetWorkflowToBlank,
    openQuotesList,
    syncWizardWithRecord,
    setDraft,
    setRecordMeta,
    setSavedRecord,
    setLastSaveMode,
    setStep,
    setFieldErrors,
    setGlobalError,
  } = params;
  const [saveIntent, setSaveIntent] = useState<SaveIntent | null>(null);

  const handleSave = useCallback(
    async (estado: SaveStatus, options?: { exitAfterSave?: boolean }) => {
      setSaveIntent(estado === "creada" ? "quote" : "draft");

      const { draftToSave, step1Errors, finalErrors } = preparePasoTresGuardado({
        draft,
        estado,
        applyQuickEditDraftsToItems,
      });

      setDraft(draftToSave);

      if (Object.keys(finalErrors).length > 0) {
        setSaveIntent(null);
        setFieldErrors(finalErrors);
        setGlobalError("Completa los campos obligatorios antes de guardar.");
        if (step1Errors.step1) {
          setStep(1);
        } else if (finalErrors.totalClienteManual) {
          setStep(3);
        } else if (estado === "creada") {
          setStep(2);
        }
        return;
      }

      try {
        setGlobalError(null);
        const wasUpdatingRecord = Boolean(recordMeta?.id);
        const record = await saveWorkflow({
          draft: draftToSave,
          estado,
          existingId: recordMeta?.id,
          existingCode: recordMeta?.codigo,
          existingClientId: selectedClientId || recordMeta?.clientId || undefined,
          existingProjectId: recordMeta?.projectId,
        });

        setRecordMeta({
          id: record.id,
          codigo: record.codigo,
          clientId: record.clientId ?? null,
          projectId: record.projectId ?? null,
        });

        persistenciaWizard.marcarComoGuardado({
          draft: draftToSave,
          componentForm,
          editingItemId,
          selectedClientId,
          clientQuery,
          showStep1MoreData,
        });
        persistenciaWizard.limpiarPersistencia();

        if (options?.exitAfterSave) {
          if (isNewWorkflow) {
            resetWorkflowToBlank();
          }
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          openQuotesList();
          return;
        }

        setSaveIntent(null);
        setDraft(draftToSave);
        setSavedRecord(record);
        setLastSaveMode(estado === "borrador" ? "borrador" : wasUpdatingRecord ? "actualizada" : estado);
        setStep(3);
        scrollPageToTop();

        if (estado === "creada") {
          const handledPostSaveNavigation = await onQuoteCreated?.(record);
          if (handledPostSaveNavigation) {
            return;
          }
        }

        if (isNewWorkflow) {
          syncWizardWithRecord(record.id);
        }
      } catch (error) {
        setSaveIntent(null);
        setGlobalError(
          isConnectivityError(error)
            ? "No hay conexion a internet en este momento. Revisa tu red y vuelve a intentar guardar."
            : error instanceof Error
              ? error.message
              : "No se pudo guardar la cotizacion"
        );
      }
    },
    [
      applyQuickEditDraftsToItems,
      clientQuery,
      componentForm,
      draft,
      editingItemId,
      isNewWorkflow,
      onQuoteCreated,
      openQuotesList,
      persistenciaWizard,
      recordMeta,
      resetWorkflowToBlank,
      saveWorkflow,
      selectedClientId,
      setDraft,
      setFieldErrors,
      setGlobalError,
      setLastSaveMode,
      setRecordMeta,
      setSavedRecord,
      setStep,
      showStep1MoreData,
      syncWizardWithRecord,
    ]
  );

  const guardarCotizacion = useCallback(() => {
    void handleSave("creada");
  }, [handleSave]);

  const guardarBorrador = useCallback(
    (options?: { exitAfterSave?: boolean }) => {
      void handleSave("borrador", options);
    },
    [handleSave]
  );

  return {
    saveIntent,
    guardarCotizacion,
    guardarBorrador,
  };
}
