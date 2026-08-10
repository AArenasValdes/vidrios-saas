"use client";

import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";

import {
  createCotizacionWorkflowDraft,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import {
  buildWorkflowDirtySignature,
  buildWorkflowStorageKey,
  clearPersistedWorkflowState,
  createEmptyComponentForm,
  loadPersistedWorkflowState,
  mapRecordToDraft,
  safelySetWorkflowStorageValue,
  type ComponentFormState,
  type PersistedWorkflowState,
  type QuickEditFieldKey,
  type StepKey,
  type PreferredProvider,
} from "@/features/cotizaciones/new-quote/workflow-ui";

type BootstrapInput = {
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
  step: StepKey;
  expandedQuickEditItemId: string | null;
  expandedQuickEditFocusField?: QuickEditFieldKey | null;
};

type DirtyInput = {
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
};

type RecordMeta = {
  id?: string;
  codigo?: string;
  clientId?: string | number | null;
  projectId?: string | number | null;
} | null;

type UsePersistenciaNuevaCotizacionParams = {
  editId: string | null;
  duplicateId: string | null;
  requestedStep: StepKey | null;
  sourceRecord: CotizacionWorkflowRecord | null;
  loadCotizacionById: (id: string) => Promise<unknown>;
  suggestionProvider: PreferredProvider;
  preferredPricingMode: PricingMode;
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
  step: StepKey;
  hasUnsavedProgress: boolean;
  setDraft: Dispatch<SetStateAction<CotizacionWorkflowDraft>>;
  setComponentForm: Dispatch<SetStateAction<ComponentFormState>>;
  setEditingItemId: Dispatch<SetStateAction<string | null>>;
  setSelectedClientId: Dispatch<SetStateAction<string>>;
  setClientQuery: Dispatch<SetStateAction<string>>;
  setShowStep1MoreData: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<StepKey>>;
  aplicarBootstrapEdicionRapida: (input: {
    itemId: string | null;
    focusField?: QuickEditFieldKey | null;
  }) => void;
  setRecordMeta: Dispatch<SetStateAction<RecordMeta>>;
  setSavedRecord: Dispatch<SetStateAction<CotizacionWorkflowRecord | null>>;
  setLastSaveMode: Dispatch<SetStateAction<"borrador" | "creada" | "actualizada" | null>>;
  setHasUnsavedProgress: Dispatch<SetStateAction<boolean>>;
};

export function usePersistenciaNuevaCotizacion(
  params: UsePersistenciaNuevaCotizacionParams
) {
  const {
    editId,
    duplicateId,
    requestedStep,
    sourceRecord,
    loadCotizacionById,
    suggestionProvider,
    preferredPricingMode,
    draft,
    componentForm,
    editingItemId,
    selectedClientId,
    clientQuery,
    showStep1MoreData,
    step,
    hasUnsavedProgress,
    setDraft,
    setComponentForm,
    setEditingItemId,
    setSelectedClientId,
    setClientQuery,
    setShowStep1MoreData,
    setStep,
    aplicarBootstrapEdicionRapida,
    setRecordMeta,
    setSavedRecord,
    setLastSaveMode,
    setHasUnsavedProgress,
  } = params;
  const initializedRef = useRef(false);
  const hydrationCompleteRef = useRef(false);
  const persistTimeoutRef = useRef<number | null>(null);
  const lastCommittedSignatureRef = useRef("");

  const storageKey = useMemo(
    () => buildWorkflowStorageKey(editId, duplicateId),
    [duplicateId, editId]
  );
  const currentDirtySignature = useMemo(
    () =>
      buildWorkflowDirtySignature({
        draft,
        componentForm,
        editingItemId,
        selectedClientId,
        clientQuery,
        showStep1MoreData,
      }),
    [
      clientQuery,
      componentForm,
      draft,
      editingItemId,
      selectedClientId,
      showStep1MoreData,
    ]
  );
  const persistedSnapshotJson = useMemo(
    () =>
      JSON.stringify({
        version: 5,
        step,
        draft,
        componentForm,
        editingItemId,
        selectedClientId,
        clientQuery,
        showStep1MoreData,
      } satisfies PersistedWorkflowState),
    [
      clientQuery,
      componentForm,
      draft,
      editingItemId,
      selectedClientId,
      showStep1MoreData,
      step,
    ]
  );

  const aplicarBootstrapWorkflow = useCallback(
    (input: BootstrapInput) => {
      setDraft(input.draft);
      setComponentForm(input.componentForm);
      setEditingItemId(input.editingItemId);
      setSelectedClientId(input.selectedClientId);
      setClientQuery(input.clientQuery);
      setShowStep1MoreData(input.showStep1MoreData);
      setStep(input.step);
      aplicarBootstrapEdicionRapida({
        itemId: input.expandedQuickEditItemId,
        focusField: input.expandedQuickEditFocusField,
      });
    },
    [
      aplicarBootstrapEdicionRapida,
      setClientQuery,
      setComponentForm,
      setDraft,
      setEditingItemId,
      setSelectedClientId,
      setShowStep1MoreData,
      setStep,
    ]
  );

  const programarBootstrapWorkflow = useCallback(
    (input: BootstrapInput) => {
      queueMicrotask(() => {
        aplicarBootstrapWorkflow(input);
      });
    },
    [aplicarBootstrapWorkflow]
  );

  const marcarComoGuardado = useCallback(
    (input: DirtyInput) => {
      lastCommittedSignatureRef.current = buildWorkflowDirtySignature(input);
      setHasUnsavedProgress(false);
    },
    [setHasUnsavedProgress]
  );

  const limpiarPersistencia = useCallback(() => {
    clearPersistedWorkflowState(storageKey);
    setHasUnsavedProgress(false);
  }, [setHasUnsavedProgress, storageKey]);

  const persistWorkflowSnapshot = useCallback(
    (input: DirtyInput & { step: StepKey }) => {
      if (typeof window === "undefined" || !hydrationCompleteRef.current) {
        return;
      }

      const snapshot: PersistedWorkflowState = {
        version: 5,
        step: input.step,
        draft: input.draft,
        componentForm: input.componentForm,
        editingItemId: input.editingItemId,
        selectedClientId: input.selectedClientId,
        clientQuery: input.clientQuery,
        showStep1MoreData: input.showStep1MoreData,
      };

      safelySetWorkflowStorageValue(storageKey, JSON.stringify(snapshot));
    },
    [storageKey]
  );

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editId && !duplicateId) return;
    if (!sourceRecord || sourceRecord.items.length === 0) {
      void loadCotizacionById(editId ?? duplicateId ?? "");
    }
  }, [duplicateId, editId, loadCotizacionById, sourceRecord]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (editId || duplicateId) {
      if (!sourceRecord) return;
    }

    if (!editId && !duplicateId && !sourceRecord) {
      const persisted = loadPersistedWorkflowState(storageKey, {
        provider: suggestionProvider,
        pricingMode: preferredPricingMode,
      });
      const blankDraft = createCotizacionWorkflowDraft();
      const blankComponentForm = createEmptyComponentForm(
        [],
        suggestionProvider,
        preferredPricingMode
      );
      const blankSignature = buildWorkflowDirtySignature({
        draft: blankDraft,
        componentForm: blankComponentForm,
        editingItemId: null,
        selectedClientId: "",
        clientQuery: "",
        showStep1MoreData: false,
      });

      initializedRef.current = true;
      lastCommittedSignatureRef.current = blankSignature;

      const shouldStartAtRequestedStep = requestedStep === 2;

      if (persisted && !shouldStartAtRequestedStep) {
        programarBootstrapWorkflow({
          draft: persisted.draft,
          componentForm: persisted.componentForm,
          editingItemId: persisted.editingItemId,
          selectedClientId: persisted.selectedClientId,
          clientQuery: persisted.clientQuery,
          showStep1MoreData: persisted.showStep1MoreData,
          step: persisted.step,
          expandedQuickEditItemId: persisted.draft.items[0]?.id ?? null,
        });
      } else {
        programarBootstrapWorkflow({
          draft: blankDraft,
          componentForm: blankComponentForm,
          editingItemId: null,
          selectedClientId: "",
          clientQuery: "",
          showStep1MoreData: false,
          step: shouldStartAtRequestedStep ? 2 : 1,
          expandedQuickEditItemId: null,
        });
      }

      hydrationCompleteRef.current = true;
      return;
    }

    if (!sourceRecord) return;

    const mappedDraft = mapRecordToDraft(sourceRecord);
    const nextDraft = duplicateId
      ? { ...mappedDraft, obra: `${mappedDraft.obra} copia` }
      : mappedDraft;
    const baseSelectedClientId = sourceRecord.clientId
      ? String(sourceRecord.clientId)
      : "";
    const baseSignature = buildWorkflowDirtySignature({
      draft: nextDraft,
      componentForm: createEmptyComponentForm(
        nextDraft.items,
        suggestionProvider,
        preferredPricingMode
      ),
      editingItemId: null,
      selectedClientId: baseSelectedClientId,
      clientQuery: "",
      showStep1MoreData: false,
    });
    const persisted = loadPersistedWorkflowState(storageKey, {
      provider: suggestionProvider,
      pricingMode: preferredPricingMode,
    });
    const persistedHasItems = (persisted?.draft.items?.length ?? 0) > 0;

    lastCommittedSignatureRef.current = baseSignature;
    if (persisted) {
      programarBootstrapWorkflow({
        draft: persistedHasItems ? persisted.draft : nextDraft,
        selectedClientId: persisted.selectedClientId || baseSelectedClientId,
        componentForm: persistedHasItems
          ? persisted.componentForm
          : createEmptyComponentForm(
              nextDraft.items,
              suggestionProvider,
              preferredPricingMode
            ),
        editingItemId: persistedHasItems ? persisted.editingItemId : null,
        clientQuery: persisted.clientQuery || (sourceRecord.clienteNombre ?? ""),
        showStep1MoreData: persisted.showStep1MoreData,
        step: persistedHasItems
          ? persisted.step
          : requestedStep === 3
            ? 3
            : requestedStep === 2
              ? 2
              : 1,
        expandedQuickEditItemId: persistedHasItems
          ? persisted.editingItemId ?? nextDraft.items[0]?.id ?? null
          : nextDraft.items[0]?.id ?? null,
      });
    } else {
      programarBootstrapWorkflow({
        draft: nextDraft,
        selectedClientId: baseSelectedClientId,
        clientQuery: sourceRecord.clienteNombre ?? "",
        componentForm: createEmptyComponentForm(
          nextDraft.items,
          suggestionProvider,
          preferredPricingMode
        ),
        editingItemId: null,
        showStep1MoreData: false,
        step:
          requestedStep === 3
            ? nextDraft.items.length > 0
              ? 3
              : 2
            : requestedStep === 2
              ? 2
              : 1,
        expandedQuickEditItemId: nextDraft.items[0]?.id ?? null,
      });
    }

    queueMicrotask(() => {
      setRecordMeta({
        id: duplicateId ? undefined : sourceRecord.id,
        codigo: duplicateId ? undefined : sourceRecord.codigo,
        clientId: sourceRecord.clientId ?? null,
        projectId: duplicateId ? null : sourceRecord.projectId ?? null,
      });
      setSavedRecord(null);
      setLastSaveMode(null);
    });
    initializedRef.current = true;
    hydrationCompleteRef.current = true;
  }, [
    duplicateId,
    editId,
    preferredPricingMode,
    programarBootstrapWorkflow,
    requestedStep,
    setLastSaveMode,
    setRecordMeta,
    setSavedRecord,
    sourceRecord,
    storageKey,
    suggestionProvider,
  ]);

  useEffect(() => {
    if (!hydrationCompleteRef.current) {
      return;
    }

    if (persistTimeoutRef.current !== null) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      safelySetWorkflowStorageValue(storageKey, persistedSnapshotJson);
      persistTimeoutRef.current = null;
    }, 250);
  }, [persistedSnapshotJson, storageKey]);

  useEffect(() => {
    if (!hydrationCompleteRef.current) {
      return;
    }

    const nextHasUnsavedProgress =
      currentDirtySignature !== lastCommittedSignatureRef.current;

    setHasUnsavedProgress((current) =>
      current === nextHasUnsavedProgress ? current : nextHasUnsavedProgress
    );
  }, [currentDirtySignature, setHasUnsavedProgress]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedProgress) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProgress]);

  return {
    storageKey,
    persistWorkflowSnapshot,
    marcarComoGuardado,
    limpiarPersistencia,
  };
}
