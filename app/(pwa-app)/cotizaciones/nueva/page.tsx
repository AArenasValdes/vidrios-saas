"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Suspense,
  startTransition,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LuArrowLeft,
} from "react-icons/lu";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { resolveOrganizationPricingSettings } from "@/features/organization-region/services/organization-region.service";
import {
  calculateWorkflowTotalsForPricingMode,
  createCotizacionWorkflowDraft,
  resolveSyncedPorItemTotalClienteManual,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import {
  applyQuoteStudioRecommendedPrice,
  buildQuoteStudioFinancialSummary,
} from "@/features/cotizaciones/services/quote-studio-financial.service";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
  QuoteStudioFinancialDraft,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import { createQuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CreateCotizacionLineTemplateInput } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  getLineTemplateCuttingRules,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { applyManualCutsAdjustmentToLineCatalogMetadata } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-adjustment";
import { buildCubicationSnapshotFromCatalogMetadata } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import {
  DEFAULT_MARGIN_PCT,
  normalizePricingMode,
  type PricingMode,
} from "@/features/cotizaciones/types/pricing-mode";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  buildItemFromForm,
  buildNextComponentCode,
  buildSuggestedComponentForm,
  CLP,
  ComponentFormState,
  createEmptyComponentForm,
  FIELD_LIMITS,
  FieldErrors,
  formatCurrencyInput,
  formatDraftPhoneValue,
  getRemainingComponentSlots,
  getSheetSchemeOptions,
  mapItemToForm,
  normalizeCurrencyInput,
  scrollPageToTop,
  scrollToSection,
  shouldShowSheetSchemeForComponent,
  shouldAutoSelectFirstSheetScheme,
  isWorkflowItemComplete,
  STATUS_COPY,
  Step1FieldKey,
  StepKey,
  validateComponentForm,
  validateStep1,
  applyQuotePricingToItems,
  applyLineTemplateToComponentForm,
  buildComponentFormLinePricingSummary,
  buildFreeValueItemFromForm,
  type PreferredProvider,
  createEmptyFreeValueItemForm,
  syncTemplatePricingInComponentForm,
  mapFreeValueItemToForm,
  validateFreeValueItemForm,
  withResolvedStep1QuickQuoteDefaults,
  type FreeValueItemFormState,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  clearNuevaCotizacionSolicitudSourceId,
  getNuevaCotizacionSolicitudSourceId,
} from "@/features/cotizaciones/new-quote/solicitud-prefill";
import {
  isFreeValueComponentType,
  getConfigurationOptionsForComponent,
  getConfigurationOptionsForComponentSistema,
  hasPerSystemConfigurations,
} from "@/features/cotizaciones/services/component-catalog.service";
import {
  normalizeCustomGlassValue,
  readCustomGlassOptions,
  saveCustomGlassOption,
} from "@/features/cotizaciones/new-quote/custom-glass-options";
import {
  QUOTE_CONSTRUCTOR_PRESETS,
  createQuoteConstructorPresetConfig,
  getQuoteConstructorItemConfig,
  moveQuoteConstructorItem,
  type QuoteConstructorItemPatch,
  type QuoteConstructorPresetId,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";

const NuevaCotizacionDesktop = dynamic(
  () => import("./_components/desktop/nueva-cotizacion-desktop").then((m) => ({
    default: m.NuevaCotizacionDesktop,
  })),
);

const NuevaCotizacionMobile = dynamic(
  () => import("./_components/mobile/nueva-cotizacion-mobile").then((m) => ({
    default: m.NuevaCotizacionMobile,
  })),
);
import { useFlujoNuevaCotizacion } from "./_hooks/use-flujo-nueva-cotizacion";
import {
  buildFreeTotalNotebookDraftFromWorkflow,
  buildStructuredAlcanceDetalleItem,
  buildPasoDosGrupoComponentForm,
  resolveFreeTotalNotebookEditScope,
  resolveTotalGlobalNestedDetailItems,
  resolveMaterialColorHex,
  usePasoDosAgregarGrupo,
  type PasoDosGrupoDraft,
  type PasoDosGrupoPaso,
} from "./_hooks/use-paso-dos-agregar-grupo";
import {
  usePasoDosAgregarGrupoMovil,
  type PasoDosGrupoPasoMovil,
} from "./_hooks/use-paso-dos-agregar-grupo-movil";
import { usePasoUnoCliente } from "./_hooks/use-paso-uno-cliente";
import { usePasoDosEdicionRapida } from "./_hooks/use-paso-dos-edicion-rapida";
import { usePasoDosListaComponentes } from "./_hooks/use-paso-dos-lista-componentes";
import { usePasoDosTarjetasComponentes } from "./_hooks/use-paso-dos-tarjetas-componentes";
import { usePasoDosVariaciones } from "./_hooks/use-paso-dos-variaciones";
import { usePasoTresGuardado } from "./_hooks/use-paso-tres-guardado";
import { usePersistenciaNuevaCotizacion } from "./_hooks/use-persistencia-nueva-cotizacion";
import s from "./page.module.css";

function NuevaCotizacionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const requestedStepParam = searchParams.get("step");
  const requestedModeParam = searchParams.get("modo");
  const requestedStep: StepKey | null =
    requestedStepParam === "2" ? 2 : requestedStepParam === "3" ? 3 : null;
  const requestedConstructorMode = requestedModeParam === "constructor";
  const requestedConstructorEntry = requestedConstructorMode && !editId && !duplicateId;
  const glassCloseTimeoutRef = useRef<number | null>(null);
  const pendingNextDraftRef = useRef(false);
  const step1InputRefs = useRef<Record<Step1FieldKey, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>({
    clientSearch: null,
    clienteNombre: null,
    clienteTelefono: null,
    obra: null,
    direccion: null,
    validez: null,
    observaciones: null,
  });

  const [draft, setDraft] = useState<CotizacionWorkflowDraft>(() => ({
    ...createCotizacionWorkflowDraft(),
    quotePricingMode: requestedConstructorEntry ? "por_item" : undefined,
  }));
  const [step, setStep] = useState<StepKey>(() =>
    requestedStep ?? (requestedConstructorEntry ? 2 : 1)
  );
  const { profile: organizationProfile } = useOrganizationProfile();
  const {
    activeTemplates: activeLineTemplates,
    createTemplate: createLineTemplate,
    updateTemplate: updateLineTemplate,
    isSaving: isSavingQuickPriceTemplate,
  } = useCotizacionLineTemplates({ activeOnly: true, enabled: step !== 1 });
  const [isSavingCubicationLineAdjustment, setIsSavingCubicationLineAdjustment] =
    useState(false);
  const [componentForm, setComponentForm] = useState<ComponentFormState>(() =>
    createEmptyComponentForm([], "", "margen", organizationProfile?.margenDefecto)
  );
  const [freeValueItemForm, setFreeValueItemForm] = useState<FreeValueItemFormState>(
    createEmptyFreeValueItemForm
  );
  const [isFreeValueItemFormOpen, setIsFreeValueItemFormOpen] = useState(false);
  const [editingFreeValueItemId, setEditingFreeValueItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<CotizacionWorkflowRecord | null>(null);
  const [lastSaveMode, setLastSaveMode] = useState<keyof typeof STATUS_COPY | null>(null);
  const [isGlassPanelOpen, setIsGlassPanelOpen] = useState(false);
  const [glassQuery, setGlassQuery] = useState("");
  const [customGlassOptions, setCustomGlassOptions] = useState<string[]>([]);
  const [showStep1MoreData, setShowStep1MoreData] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isDesktopQuoteStudio, setIsDesktopQuoteStudio] = useState(false);
  const [editingFormSnapshot, setEditingFormSnapshot] = useState<ComponentFormState | null>(null);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);
  const [quoteModeChosen, setQuoteModeChosen] = useState(requestedConstructorEntry);
  const [mobileCuadernoActive, setMobileCuadernoActive] = useState(false);
  const [duplicateSourceCode, setDuplicateSourceCode] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const customGlassOrganizationId = organizationProfile?.organizationId ?? null;

  useEffect(() => {
    startTransition(() => {
      setCustomGlassOptions(readCustomGlassOptions(customGlassOrganizationId));
    });
  }, [customGlassOrganizationId]);

  useEffect(() => {
    if (draft.items.length > 0) {
      startTransition(() => {
        setQuoteModeChosen(true);
      });
    }
  }, [draft.items.length]);

  const [recordMeta, setRecordMeta] = useState<{
    id?: string;
    codigo?: string;
    clientId?: string | number | null;
    projectId?: string | number | null;
  } | null>(null);
  // null en SSR + primer paint; sessionStorage se lee en effect (evita hydration mismatch)
  const [sourceSolicitudId, setSourceSolicitudId] = useState<string | null>(null);
  const {
    clientes,
    ensureClientesLoaded,
    getCotizacionById,
    loadCotizacionById,
    saveWorkflow,
    isReady,
    isSaving,
  } = useCotizacionesStore({ autoLoadSummary: false });

  useEffect(() => {
    startTransition(() => {
      setSourceSolicitudId(getNuevaCotizacionSolicitudSourceId());
    });
  }, []);

  const suggestionProvider: PreferredProvider = "";
  const preferredPricingMode = normalizePricingMode(
    organizationProfile?.modoPrecioPreferido
  );
  const quotePricingMode = normalizeQuotePricingMode(draft.quotePricingMode);
  const regionalPricing = useMemo(
    () => resolveOrganizationPricingSettings(organizationProfile),
    [organizationProfile]
  );
  const regionalCurrencyInput = useCallback(
    (value: string) => formatCurrencyInput(value, organizationProfile?.locale),
    [organizationProfile?.locale]
  );
  const pasoDosEdicionRapida = usePasoDosEdicionRapida({
    items: draft.items,
    quotePricingMode,
    activeLineTemplates,
    setDraft,
    setGlobalError,
  });
  const sourceRecord = editId || duplicateId ? getCotizacionById(editId ?? duplicateId ?? "") : null;
  const persistenciaWizard = usePersistenciaNuevaCotizacion({
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
    aplicarBootstrapEdicionRapida: pasoDosEdicionRapida.aplicarBootstrapEdicionRapida,
    setRecordMeta,
    setSavedRecord,
    setLastSaveMode,
    setHasUnsavedProgress,
  });

  useEffect(() => {
    return () => {
      if (glassCloseTimeoutRef.current !== null) {
        window.clearTimeout(glassCloseTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 860px)");
    const syncViewport = () => {
      const isMobile = mobileQuery.matches;
      setIsMobileViewport(isMobile);
      if (requestedConstructorEntry && isMobile) {
        setMobileCuadernoActive(true);
      }
    };

    syncViewport();
    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncViewport);
    } else {
      mobileQuery.addListener(syncViewport);
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktop = () => setIsDesktopQuoteStudio(desktopQuery.matches);
    syncDesktop();
    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", syncDesktop);
    } else {
      desktopQuery.addListener(syncDesktop);
    }

    return () => {
      if (typeof mobileQuery.removeEventListener === "function") {
        mobileQuery.removeEventListener("change", syncViewport);
      } else {
        mobileQuery.removeListener(syncViewport);
      }
      if (typeof desktopQuery.removeEventListener === "function") {
        desktopQuery.removeEventListener("change", syncDesktop);
      } else {
        desktopQuery.removeListener(syncDesktop);
      }
    };
  }, [requestedConstructorEntry]);

  useEffect(() => {
    if (!isMobileViewport && step === 2) {
      document.body.dataset.ventoraDesktopStepTwo = "true";
    } else {
      delete document.body.dataset.ventoraDesktopStepTwo;
    }

    return () => {
      delete document.body.dataset.ventoraDesktopStepTwo;
    };
  }, [isMobileViewport, step]);

  useEffect(() => {
    void ensureClientesLoaded();
  }, [ensureClientesLoaded]);

  const pasoUnoCliente = usePasoUnoCliente({
    clientes,
    clientQuery,
    selectedClientId,
    draftClienteNombre: draft.clienteNombre,
    draftClienteTelefono: draft.clienteTelefono,
    draftDireccion: draft.direccion,
    onClientQueryChange: setClientQuery,
    onSelectClient: setSelectedClientId,
    onAplicarClienteSeleccionado: (cliente) => {
      setDraft((cur) => ({
        ...cur,
        clienteNombre: cliente.nombre,
        clienteTelefono: cliente.telefono
          ? formatDraftPhoneValue(cliente.telefono)
          : cur.clienteTelefono,
        direccion: cliente.direccion ?? cur.direccion,
      }));
    },
  });

  const syncedQuickEditDrafts = pasoDosEdicionRapida.borradoresRapidosSincronizados;
  const effectiveWorkflowItems = pasoDosEdicionRapida.itemsEfectivos;
  const totals = useMemo(
    () =>
      calculateWorkflowTotalsForPricingMode({
        ...draft,
        items: effectiveWorkflowItems,
      }, regionalPricing),
    [draft, effectiveWorkflowItems, regionalPricing]
  );
  const quoteStudioFinancial = useMemo(
    () => createQuoteStudioFinancialDraft(draft.quoteStudioFinancial),
    [draft.quoteStudioFinancial]
  );
  const quoteStudioFinancialSummary = useMemo(
    () =>
      buildQuoteStudioFinancialSummary({
        items: effectiveWorkflowItems,
        quotePricingMode,
        neto: totals.neto,
        total: totals.total,
        costoTotalFabricacion: totals.costoTotalFabricacion,
        manoObra: quoteStudioFinancial.manoObra,
        traslado: quoteStudioFinancial.traslado,
        otrosCostos: quoteStudioFinancial.otrosCostos,
        mermaPct: quoteStudioFinancial.mermaPct,
        margenObjetivoRealPct: quoteStudioFinancial.margenObjetivoRealPct,
      }),
    [
      effectiveWorkflowItems,
      quotePricingMode,
      quoteStudioFinancial,
      totals.costoTotalFabricacion,
      totals.neto,
      totals.total,
    ]
  );

  useEffect(() => {
    if (quotePricingMode !== "por_item") {
      return;
    }

    if (
      draft.totalClienteManual !== null &&
      draft.totalClienteManual !== undefined &&
      resolveSyncedPorItemTotalClienteManual(draft.items, draft.totalClienteManual) === null
    ) {
      startTransition(() => {
        setDraft((current) => ({
          ...current,
          totalClienteManual: null,
        }));
      });
    }
  }, [draft.items, draft.totalClienteManual, quotePricingMode]);

  const componentListCards = usePasoDosTarjetasComponentes({
    items: effectiveWorkflowItems,
    borradoresRapidos: syncedQuickEditDrafts,
    quotePricingMode,
    isDesktopQuoteStudio,
  });
  const completedItemsCount = pasoDosEdicionRapida.cantidadCompletos;
  const pendingItemsCount = pasoDosEdicionRapida.cantidadPendientes;
  const effectiveShowOnlyPendingItems = pasoDosEdicionRapida.mostrarSoloPendientesEfectivo;
  const filteredComponentListCards = useMemo(
    () =>
      effectiveShowOnlyPendingItems
        ? componentListCards.filter((item) => !item.isComplete)
        : componentListCards,
    [componentListCards, effectiveShowOnlyPendingItems]
  );
  const selectedQuickEditIndex = pasoDosEdicionRapida.indiceSeleccionado;
  const selectedQuickEditItem = pasoDosEdicionRapida.itemSeleccionado;
  const selectedQuickEditViewItem = pasoDosEdicionRapida.itemVistaSeleccionado;
  const selectedQuickEditDraft = pasoDosEdicionRapida.borradorSeleccionado;
  const selectedQuickEditBatchTargets = pasoDosEdicionRapida.targetsSeleccionMismoTipo;
  const selectedQuickEditPendingSameTypeCount =
    pasoDosEdicionRapida.cantidadPendientesMismoTipo;
  const effectiveQuickEditBatchSelectionIds =
    pasoDosEdicionRapida.idsSeleccionLoteEfectivos;
  const isQuickEditBatchSelectionOpen = pasoDosEdicionRapida.seleccionLoteAbierta;
  const pasoDosLista = usePasoDosListaComponentes({
    paso: step,
    esVistaMovil: isMobileViewport,
    tarjetasFiltradas: filteredComponentListCards,
    cantidadItemsTotales: draft.items.length,
    itemSeleccionadoId: selectedQuickEditItem?.id ?? null,
  });
  type SuspendedFreeTotalNotebookSession = {
    draft: PasoDosGrupoDraft;
    paso: PasoDosGrupoPaso | PasoDosGrupoPasoMovil;
    editingFreeTotalMainItemId: string | null;
    editingFreeTotalItemIds: string[] | null;
    freeTotalNotebookNestedItemIds: string[];
  };
  const suspendedNotebookRef = useRef<SuspendedFreeTotalNotebookSession | null>(null);
  const returnToTotalNotebookAfterSheetCloseRef = useRef(false);
  const returnToModeSelectorAfterSheetCloseRef = useRef(false);
  const onAddGroupSheetClosedRef = useRef<(itemCount: number) => void>(() => {});

  const pasoDosAgregarGrupo = usePasoDosAgregarGrupo({
    items: draft.items,
    pricingMode: componentForm.pricingMode,
    quotePricingMode,
    provider: suggestionProvider,
    seedForm: componentForm,
    customGlassOptions,
    activeLineTemplates,
    onSheetClosed: (itemCount) => onAddGroupSheetClosedRef.current(itemCount),
    lockBodyScroll: false,
  });
  const pasoDosAgregarGrupoMovil = usePasoDosAgregarGrupoMovil({
    items: draft.items,
    pricingMode: componentForm.pricingMode,
    provider: suggestionProvider,
    activeLineTemplates,
    seedForm: componentForm,
    customGlassOptions,
    onSheetClosed: (itemCount) => onAddGroupSheetClosedRef.current(itemCount),
  });

  const handleDraftChange = <K extends keyof CotizacionWorkflowDraft>(
    key: K,
    value: CotizacionWorkflowDraft[K]
  ) => {
    let nextValue = value;

    if (typeof value === "string") {
      if (key === "clienteNombre") {
        nextValue = value.slice(0, FIELD_LIMITS.clienteNombre) as CotizacionWorkflowDraft[K];
      } else if (key === "obra") {
        nextValue = value.slice(0, FIELD_LIMITS.obra) as CotizacionWorkflowDraft[K];
      } else if (key === "direccion") {
        nextValue = value.slice(0, FIELD_LIMITS.direccion) as CotizacionWorkflowDraft[K];
      } else if (key === "observaciones") {
        nextValue = value.slice(0, FIELD_LIMITS.observaciones) as CotizacionWorkflowDraft[K];
      }
    }

    setDraft((cur) => ({ ...cur, [key]: nextValue }));
  };

  const handleDraftPhoneChange = (value: string) => {
    handleDraftChange("clienteTelefono", formatDraftPhoneValue(value));
  };

  const handleDraftFleteChange = (value: string) => {
    const normalizedValue = normalizeCurrencyInput(value);

    handleDraftChange("flete", normalizedValue ? Number(normalizedValue) : 0);
  };

  const handleQuoteStudioFinancialChange = (
    field: keyof QuoteStudioFinancialDraft,
    value: string
  ) => {
    setDraft((current) => {
      const currentFinancial = createQuoteStudioFinancialDraft(current.quoteStudioFinancial);

      if (field === "mermaPct" || field === "margenObjetivoRealPct") {
        const parsed = Number(value.replace(",", "."));
        const normalized = Number.isFinite(parsed) ? parsed : 0;
        const bounded =
          field === "margenObjetivoRealPct"
            ? Math.min(95, Math.max(0, normalized))
            : Math.min(100, Math.max(0, normalized));

        return {
          ...current,
          quoteStudioFinancial: {
            ...currentFinancial,
            [field]: bounded,
          },
        };
      }

      const normalizedValue = normalizeCurrencyInput(value);

      return {
        ...current,
        quoteStudioFinancial: {
          ...currentFinancial,
          [field]: normalizedValue ? Number(normalizedValue) : 0,
        },
      };
    });
  };

  const handleApplyQuoteStudioRecommendedPrice = () => {
    const targetNeto = quoteStudioFinancialSummary.precioRecomendadoNeto;
    const targetSubtotal =
      totals.neto > 0
        ? Math.round((targetNeto / totals.neto) * totals.subtotal * 100) / 100
        : targetNeto;

    const result = applyQuoteStudioRecommendedPrice({
      items: effectiveWorkflowItems,
      quotePricingMode,
      precioRecomendadoNeto: targetNeto,
      currentNeto: totals.neto,
      targetSubtotal,
      totalClienteManual: draft.totalClienteManual,
    });

    const nextTotalClienteManual = result.totalClienteManual;

    if (!result.applied) {
      setToastMessage("No se pudo aplicar el precio recomendado.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    pasoDosEdicionRapida.limpiarBorradoresRapidos();

    const nextItemsById = new Map(result.items.map((item) => [item.id, item]));

    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => nextItemsById.get(item.id) ?? item),
      totalClienteManual: nextTotalClienteManual,
    }));

    setToastMessage(`Precio recomendado aplicado: ${CLP(targetNeto)} netos`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDraftDiscountTypeChange = (value: CotizacionWorkflowDraft["descuentoTipo"]) => {
    setDraft((current) => ({
      ...current,
      descuentoTipo: value,
      descuentoPct: value === "porcentaje" ? current.descuentoPct : 0,
      descuentoMonto: value === "monto" ? current.descuentoMonto ?? 0 : 0,
    }));
  };

  const handleDraftDiscountChange = (value: string) => {
    const normalizedValue = normalizeCurrencyInput(value);
    const numericValue = normalizedValue ? Number(normalizedValue) : 0;

    setDraft((current) => {
      if ((current.descuentoTipo ?? "porcentaje") === "monto") {
        return {
          ...current,
          descuentoMonto: numericValue,
          descuentoPct: 0,
        };
      }

      return {
        ...current,
        descuentoPct: Math.min(100, numericValue),
        descuentoMonto: 0,
      };
    });
  };

  const handleCondicionesPagoChange = (value: string) => {
    handleDraftChange("condicionesDePago", value);
  };

  const hasUnsavedComponentDraft =
    Boolean(editingItemId) ||
    pasoDosAgregarGrupo.isOpen ||
    pasoDosAgregarGrupoMovil.isOpen;
  const hasUnsavedFreeValueDraft =
    isFreeValueItemFormOpen &&
    (Boolean(freeValueItemForm.nombre.trim()) ||
      Boolean(freeValueItemForm.descripcion.trim()) ||
      Boolean(freeValueItemForm.valor.trim()));
  const hasStepTwoRelevantData =
    draft.items.length > 0 || hasUnsavedComponentDraft || hasUnsavedFreeValueDraft;

  const handleQuotePricingModeChange = (
    mode: QuotePricingMode,
    options?: { force?: boolean }
  ) => {
    if (mode === quotePricingMode) {
      setQuoteModeChosen(true);
      if (mode === "por_item" && draft.items.length === 0 && (!isMobileViewport || quoteModeChosen)) {
        handleOpenAddGroupSheet();
      }
      return;
    }

    if (
      !options?.force &&
      hasStepTwoRelevantData &&
      !window.confirm("Cambiar el modo conserva los componentes cargados y ajusta las reglas de precio. ¿Quieres cambiarlo?")
    ) {
      return;
    }

    setQuoteModeChosen(true);
    setDraft((current) => ({
      ...current,
      quotePricingMode: mode,
      totalClienteManual: null,
      costoTotalFabricacion: 0,
      margenGlobalPct: 0,
      utilidadTotal: 0,
    }));
    setFieldErrors((current) => ({
      ...current,
      costoTotalFabricacion: undefined,
      margenGlobalPct: undefined,
      totalClienteManual: undefined,
      costoProveedorUnitario: undefined,
      margenPct: undefined,
    }));
    setGlobalError(null);
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);
    setFreeValueItemForm(createEmptyFreeValueItemForm());

    if (isMobileViewport && mode === "por_item" && draft.items.length === 0 && quoteModeChosen) {
      handleOpenAddGroupSheet();
    }
  };

  const handleGlobalTotalClienteChange = (value: string) => {
    const normalizedValue = normalizeCurrencyInput(value);

    setDraft((current) => ({
      ...current,
      totalClienteManual: normalizedValue ? Number(normalizedValue) : null,
    }));
  };

  const handleMostrarIvaChange = () => {
    setDraft((current) => ({
      ...current,
      mostrarIva: !(current.mostrarIva ?? true),
    }));
  };

  const handleInternalObservationChange = (value: string) => {
    handleDraftChange("observaciones", value);
  };

  function registerStep1InputRef(
    field: Step1FieldKey,
    node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  ) {
    step1InputRefs.current[field] = node;
  }

  function resolveStep1Draft(currentDraft: CotizacionWorkflowDraft) {
    const nextDraft = withResolvedStep1QuickQuoteDefaults(currentDraft);

    if (nextDraft !== currentDraft) {
      setDraft(nextDraft);
    }

    return nextDraft;
  }

  function resetWorkflowToBlank() {
    const nextDraft = createCotizacionWorkflowDraft();
    const nextComponentForm = createEmptyComponentForm(
      [],
      suggestionProvider,
      preferredPricingMode,
      organizationProfile?.margenDefecto
    );

    setDraft(nextDraft);
    setComponentForm(nextComponentForm);
    setFreeValueItemForm(createEmptyFreeValueItemForm());
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);
    setEditingItemId(null);
    setSelectedClientId("");
    setClientQuery("");
    setShowStep1MoreData(false);
    setFieldErrors({});
    setGlobalError(null);
    setSavedRecord(null);
    setLastSaveMode(null);
    setRecordMeta(null);
    pasoDosVariaciones.resetVariationState();
    setStep(1);
    persistenciaWizard.marcarComoGuardado({
      draft: nextDraft,
      componentForm: nextComponentForm,
      editingItemId: null,
      selectedClientId: "",
      clientQuery: "",
      showStep1MoreData: false,
    });
  }

  const handleResetStep1 = () => {
    const nextDraft = createCotizacionWorkflowDraft();

    setSelectedClientId("");
    setClientQuery("");
    setShowStep1MoreData(false);
    setGlobalError(null);
    setFieldErrors((current) => ({
      ...current,
      clienteNombre: undefined,
      obra: undefined,
      step1: undefined,
    }));
    setDraft((current) => ({
      ...current,
      clienteNombre: nextDraft.clienteNombre,
      clienteTelefono: nextDraft.clienteTelefono,
      obra: nextDraft.obra,
      direccion: nextDraft.direccion,
      validez: nextDraft.validez,
      descuentoPct: nextDraft.descuentoPct,
      flete: nextDraft.flete,
      observaciones: nextDraft.observaciones,
    }));
  };

  const openItemForEditing = (
    item: CotizacionWorkflowItem,
    nextItemsOverride?: CotizacionWorkflowItem[]
  ) => {
    pasoDosAgregarGrupo.closeSheet();
    pasoDosAgregarGrupoMovil.closeSheet();

    if (item.tipoItem === "item_libre_con_valor") {
      if (quotePricingMode === "total_global") {
        const currentItems = nextItemsOverride ?? draft.items;
        const scope = resolveFreeTotalNotebookEditScope(currentItems, item.id);
        const notebookDraft = buildFreeTotalNotebookDraftFromWorkflow({
          items: currentItems,
          pricingMode: componentForm.pricingMode,
          provider: suggestionProvider,
          seedForm: componentForm,
          mainItem: scope.mainItem,
          detailItems: scope.detailItems,
          totalClienteManual: draft.totalClienteManual ?? null,
        });

        if (isMobileViewport) {
          pasoDosAgregarGrupoMovil.openFreeTotalNotebookForEdit(
            notebookDraft,
            scope.mainItemId,
            scope.editingItemIds
          );
        } else {
          pasoDosAgregarGrupo.openFreeTotalNotebookForEdit(
            notebookDraft,
            scope.mainItemId,
            scope.editingItemIds
          );
        }

        setEditingFreeValueItemId(null);
        setIsFreeValueItemFormOpen(false);
        setEditingItemId(null);
        setFieldErrors({});
        setGlobalError(null);
        return;
      }

      setFreeValueItemForm(mapFreeValueItemToForm(item));
      setEditingFreeValueItemId(item.id);
      setIsFreeValueItemFormOpen(true);
      setEditingItemId(null);
      setFieldErrors({});
      setGlobalError(null);
      setStep(2);
      window.requestAnimationFrame(() => {
        if (isMobileViewport) {
          scrollToSection("component-form");
        }
      });
      return;
    }

    pasoDosVariaciones.setVariationQuickEditDraft(null);
    const parsed = mapItemToForm(item);
    const nextEditingItemId = item.id;
    setEditingItemId(item.id);
    setComponentForm(parsed);
    setEditingFormSnapshot({ ...parsed });
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setStep(2);
    setFieldErrors({});
    setGlobalError(null);
    pasoDosEdicionRapida.seleccionarItemEdicionRapida(item.id, "ancho");
    persistenciaWizard.persistWorkflowSnapshot({
      draft: nextItemsOverride ? { ...draft, items: nextItemsOverride } : draft,
      componentForm: parsed,
      editingItemId: nextEditingItemId,
      selectedClientId,
      clientQuery,
      showStep1MoreData,
      step: 2,
    });
    window.requestAnimationFrame(() => {
      if (isMobileViewport) {
        scrollToSection("component-form");
      }
    });
  };
  const pasoDosVariaciones = usePasoDosVariaciones({
    items: draft.items,
    activeLineTemplates,
    setItems: (nextItems) => setDraft((current) => ({ ...current, items: nextItems })),
    openItemForEditing,
    clearEditingState: () => {
      setEditingItemId(null);
    },
    clearUiState: () => {
      setFieldErrors({});
      setGlobalError(null);
    },
    openStepTwoTop: () => {
      setStep(2);
      window.requestAnimationFrame(() => {
        scrollPageToTop();
      });
    },
    scrollToList: () => {
      window.requestAnimationFrame(() => {
        scrollToSection("component-list");
      });
    },
  });

  const handleComponentChange = <K extends keyof ComponentFormState>(
    key: K,
    value: ComponentFormState[K]
  ) => {
    setComponentForm((cur) => {
      if (key === "loteCantidad") {
        const digitsOnly = String(value).replace(/[^\d]/g, "");
        const availableSlots = getRemainingComponentSlots(draft.items.length);
        const numericValue = digitsOnly ? Number.parseInt(digitsOnly, 10) : NaN;
        const nextBatch =
          availableSlots === 0
            ? ""
            : Number.isFinite(numericValue) && numericValue > 0
            ? String(Math.min(availableSlots, numericValue))
            : digitsOnly;

        return {
          ...cur,
          loteCantidad: nextBatch,
        } as ComponentFormState;
      }

      if (key === "ancho" || key === "alto") {
        const digitsOnly = String(value).replace(/[^\d]/g, "");
        return syncTemplatePricingInComponentForm({
          ...cur,
          [key]: digitsOnly,
          cubicationSnapshot: null,
        });
      }

      if (key === "cantidad" || key === "lineTemplateId") {
        return {
          ...cur,
          [key]: value,
          cubicationSnapshot: null,
        } as ComponentFormState;
      }

      if (key === "tipo") {
        const nextTipo = String(value);
        const next = buildSuggestedComponentForm({
          items: draft.items,
          tipo: nextTipo,
          provider: suggestionProvider,
          pricingMode: cur.pricingMode,
          defaultMargin: organizationProfile?.margenDefecto,
          current: editingItemId
            ? {
                ...cur,
                tipo: nextTipo,
                sistema: "",
                configuracion: "",
                sheetScheme: "",
                sheetVariant: "",
                customSchemeDescription: "",
                isCustomScheme: false,
                nombre: "",
                descripcion: "",
                cubicationSnapshot: null,
              }
            : {
                ...cur,
                tipo: nextTipo,
                codigo: "",
                referencia: "",
                lineTemplateId: "",
                nombre: "",
                descripcion: "",
                vidrio: "",
                sistema: "",
                configuracion: "",
                sheetScheme: "",
                sheetVariant: "",
                customSchemeDescription: "",
                isCustomScheme: false,
                cubicationSnapshot: null,
              },
        });

        if (editingItemId) {
          next.codigo = cur.codigo;
        }

        if (nextTipo === "Trabajo personalizado") {
          next.descripcion = "";
          next.nombre = "";
        }

        return syncTemplatePricingInComponentForm(next);
      }

      const next = { ...cur, [key]: value };
      if (key === "sistema") {
        const configs = hasPerSystemConfigurations(next.tipo)
          ? getConfigurationOptionsForComponentSistema(next.tipo, String(value))
          : getConfigurationOptionsForComponent(next.tipo);

        if (
          configs.length > 0 &&
          !(next.configuracion && configs.includes(next.configuracion))
        ) {
          next.configuracion = configs[0] ?? "";
        }
      }
      if (key === "tipo" || key === "sistema") {
        const nextTipo = key === "tipo" ? String(value) : next.tipo;
        const nextSistema = key === "sistema" ? String(value) : next.sistema;
        const sheetSchemeOptions = getSheetSchemeOptions({
          tipo: nextTipo,
          sistema: nextSistema,
          configuracion: next.configuracion,
        });
        if (
          !shouldShowSheetSchemeForComponent({ tipo: nextTipo, sistema: nextSistema }) ||
          !sheetSchemeOptions.includes(next.sheetScheme)
        ) {
          next.sheetScheme = shouldAutoSelectFirstSheetScheme({
            tipo: nextTipo,
            sistema: nextSistema,
          })
            ? sheetSchemeOptions[0] ?? ""
            : "";
          next.sheetVariant = "";
          next.customSchemeDescription = "";
          next.isCustomScheme = next.sheetScheme === "Personalizado";
        }
      }
      if (key === "configuracion") {
        const sheetSchemeOptions = getSheetSchemeOptions({
          tipo: next.tipo,
          sistema: next.sistema,
          configuracion: String(value),
        });
        if (
          !shouldShowSheetSchemeForComponent({ tipo: next.tipo, sistema: next.sistema }) ||
          !sheetSchemeOptions.includes(next.sheetScheme)
        ) {
          next.sheetScheme = shouldAutoSelectFirstSheetScheme({
            tipo: next.tipo,
            sistema: next.sistema,
          })
            ? sheetSchemeOptions[0] ?? ""
            : "";
          next.sheetVariant = "";
          next.customSchemeDescription = "";
          next.isCustomScheme = next.sheetScheme === "Personalizado";
        }
      }
      if (key === "sheetScheme") {
        next.sheetVariant = "";
        next.customSchemeDescription =
          value === "Personalizado" ? cur.customSchemeDescription : "";
        next.isCustomScheme = value === "Personalizado";
      }
      if (key === "sheetVariant") {
        next.customSchemeDescription = value === "Otro" ? cur.customSchemeDescription : "";
        next.isCustomScheme = next.sheetScheme === "Personalizado" || value === "Otro";
      }
      if (key === "material") {
        const material = value as ComponentFormState["material"];
        next.colorHex = resolveMaterialColorHex(material, cur.colorHex);
        if (cur.lineTemplateId) {
          next.lineTemplateId = "";
        }
      }
      if (key === "referencia" && value !== cur.referencia && cur.lineTemplateId) {
        next.lineTemplateId = "";
      }
      if (key === "costoProveedorUnitario") {
        const normalizedPrice = String(value || "");
        next.precioAjustadoManual =
          Boolean(cur.referencia.trim() && cur.precioPorM2.trim()) &&
          normalizedPrice !== cur.precioPlantillaSugerido;
        next.origenPrecio =
          cur.referencia.trim() && cur.precioPorM2.trim()
            ? next.precioAjustadoManual
              ? "manual"
              : "plantilla"
            : cur.pricingMode === "precio_directo"
              ? "manual"
              : "margen";
      }
      if (key === "margenPct" && cur.pricingMode === "margen") {
        const nextMarginValue = String(value || "0");
        setDraft((current) => ({
          ...current,
          items: applyQuotePricingToItems(current.items, "margen", nextMarginValue, {
            quotePricingMode,
          }),
        }));
      }
      if (
        key === "ancho" ||
        key === "alto" ||
        key === "cantidad" ||
        key === "precioPorM2" ||
        key === "minimoCobrable" ||
        key === "redondeoPrecio" ||
        key === "referencia"
      ) {
        return syncTemplatePricingInComponentForm(next);
      }
      return next;
    });
    if (fieldErrors[key as keyof FieldErrors]) {
      setFieldErrors((e) => ({ ...e, [key]: undefined }));
    }
    if (key === "loteCantidad" && fieldErrors.step2) {
      setFieldErrors((current) => ({ ...current, step2: undefined }));
    }
  };

  const handleSelectLineTemplate = (templateId: string) => {
    setComponentForm((current) => {
      if (!templateId) {
        return {
          ...current,
          lineTemplateId: "",
          precioPorM2: "",
          minimoCobrable: "",
          redondeoPrecio: "1000",
          precioPlantillaSugerido: "",
          precioAjustadoManual: false,
          origenPrecio: current.pricingMode === "precio_directo" ? "manual" : "margen",
        };
      }

      const template = activeLineTemplates.find(
        (currentTemplate) => String(currentTemplate.id) === templateId
      );

      return template ? applyLineTemplateToComponentForm(current, template) : current;
    });
    setFieldErrors((current) => ({
      ...current,
      costoProveedorUnitario: undefined,
      margenPct: undefined,
    }));
    setGlobalError(null);
  };

  const handleSaveQuickPriceTemplate = async () => {
    const lineName = componentForm.referencia.trim();
    const pricePerSquareMeter = Number(componentForm.precioPorM2 || 0);

    if (!lineName || pricePerSquareMeter <= 0) {
      setGlobalError("Primero define una linea y un precio por m² valido.");
      return;
    }

    try {
      const created = await createLineTemplate({
        nombre: lineName,
        categoria: componentForm.catalogCategoria === "vidrio" ? "vidrio" : undefined,
        unidadCobro: "m2",
        material: componentForm.material,
        catalogMetadata:
          componentForm.catalogCategoria === "vidrio"
            ? {
                espesor: componentForm.catalogEspesor || null,
                terminacion: componentForm.catalogTerminacion || null,
              }
            : undefined,
        precioM2Sugerido: pricePerSquareMeter,
        minimoCobrable: Number(componentForm.minimoCobrable || 0),
        redondeoPrecio: Number(componentForm.redondeoPrecio || 1000),
        isActive: true,
      });

      setComponentForm((current) => applyLineTemplateToComponentForm(current, created));
      setGlobalError(null);
    } catch (error) {
      setGlobalError(
        error instanceof Error ? error.message : "No pudimos guardar el precio rapido."
      );
    }
  };

  const handleSaveCubicationLineAdjustment = async (input?: {
    itemId?: string;
    snapshot?: CotizacionItemCubicationSnapshot | null;
  }) => {
    const sourceItem = input?.itemId
      ? draft.items.find((item) => item.id === input.itemId) ?? null
      : null;
    const form = sourceItem ? mapItemToForm(sourceItem) : componentForm;
    const templateId = form.lineTemplateId.trim();
    const draftSnapshot = input?.snapshot ?? form.cubicationSnapshot;

    if (!templateId) {
      setGlobalError("Selecciona una línea del catálogo antes de guardar el ajuste.");
      return;
    }

    if (!draftSnapshot || draftSnapshot.source !== "manual" || draftSnapshot.cuts.length === 0) {
      setGlobalError("Solo puedes guardar un ajuste cuando la pauta está editada manualmente.");
      return;
    }

    const template = activeLineTemplates.find(
      (currentTemplate) => String(currentTemplate.id) === templateId
    );

    if (!template) {
      setGlobalError("No encontramos la línea del catálogo para guardar el ajuste.");
      return;
    }

    const autoSnapshot = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: templateId,
      catalogMetadata: template.catalogMetadata,
      widthMm: draftSnapshot.widthMm,
      heightMm: draftSnapshot.heightMm,
      quantity: draftSnapshot.quantity,
    });
    const cuttingRules = getLineTemplateCuttingRules(template.catalogMetadata);

    const { nextMetadata, changed, summary } = applyManualCutsAdjustmentToLineCatalogMetadata({
      catalogMetadata: template.catalogMetadata,
      cuts: draftSnapshot.cuts,
      widthMm: draftSnapshot.widthMm,
      heightMm: draftSnapshot.heightMm,
      sashCount: cuttingRules.sashCount,
      autoCuts: autoSnapshot?.cuts,
      autoGlass: autoSnapshot?.glass ?? null,
      manualGlass: draftSnapshot.glass,
    });

    if (!changed) {
      setToastMessage("No hay cambios de perfil o descuento para guardar en la línea.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsSavingCubicationLineAdjustment(true);
    setGlobalError(null);

    try {
      await updateLineTemplate(template.id, { catalogMetadata: nextMetadata });
      const statusNote =
        nextMetadata.cubicationStatus === "revisar_cambios"
          ? " La línea pasó a Revisar cambios."
          : "";
      const detail =
        summary.lines.length > 0 ? ` ${summary.lines.slice(0, 2).join(" · ")}.` : "";
      setToastMessage(`Ajuste guardado en "${template.nombre}".${detail}${statusNote}`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar el ajuste de cubicación en la línea."
      );
    } finally {
      setIsSavingCubicationLineAdjustment(false);
    }
  };

  const handleCreateMobileLineTemplate = async (
    input: Omit<CreateCotizacionLineTemplateInput, "organizationId">
  ) => {
    const created = await createLineTemplate(input);
    setGlobalError(null);
    return created;
  };

  const handleSaveQuickPriceTemplateFromItem = async (itemId: string) => {
    const sourceItem = effectiveWorkflowItems.find((item) => item.id === itemId);

    if (!sourceItem) {
      return;
    }

    const itemForm = mapItemToForm(sourceItem);
    const lineName = itemForm.referencia.trim() || `${sourceItem.tipo} ${sourceItem.codigo}`;
    const pricingSummary = buildComponentFormLinePricingSummary(itemForm);
    const fallbackPrecioM2 =
      pricingSummary.areaM2 && sourceItem.precioUnitario > 0
        ? Math.round(sourceItem.precioUnitario / pricingSummary.areaM2)
        : 0;
    const precioM2Sugerido = Number(itemForm.precioPorM2 || fallbackPrecioM2);

    if (!lineName || precioM2Sugerido <= 0) {
      setGlobalError("Completa una linea y un precio valido antes de guardarlo.");
      return;
    }

    try {
      await createLineTemplate({
        nombre: lineName,
        categoria: itemForm.catalogCategoria === "vidrio" ? "vidrio" : undefined,
        unidadCobro: "m2",
        material: itemForm.material,
        catalogMetadata:
          itemForm.catalogCategoria === "vidrio"
            ? {
                espesor: itemForm.catalogEspesor || null,
                terminacion: itemForm.catalogTerminacion || null,
              }
            : undefined,
        precioM2Sugerido,
        minimoCobrable: Number(itemForm.minimoCobrable || sourceItem.precioUnitario || 0),
        redondeoPrecio: Number(itemForm.redondeoPrecio || 1000),
        isActive: true,
      });
      setGlobalError(null);
    } catch (error) {
      setGlobalError(
        error instanceof Error ? error.message : "No pudimos guardar el precio rapido."
      );
    }
  };

  const handleRecalculateCurrentTemplatePrice = () => {
    const recalculatedForm = syncTemplatePricingInComponentForm(
      {
        ...componentForm,
        precioAjustadoManual: false,
      },
      { forceSuggestedPrice: true }
    );

    if (!recalculatedForm.costoProveedorUnitario) {
      setGlobalError(
        recalculatedForm.referencia.trim() && recalculatedForm.precioPorM2.trim()
          ? "Completa ancho y alto para recalcular con la línea."
          : "Primero elige una línea con precio por m² válido."
      );
      return;
    }

    setComponentForm(recalculatedForm);
    setGlobalError(null);
  };

  const handleRecalculateTemplatePrice = (itemId: string) => {
    const sourceItem = effectiveWorkflowItems.find((item) => item.id === itemId);

    if (!sourceItem) {
      return;
    }

    const currentForm = mapItemToForm(sourceItem);
    const recalculatedForm = syncTemplatePricingInComponentForm(
      {
        ...currentForm,
        precioAjustadoManual: false,
      },
      { forceSuggestedPrice: true }
    );

    if (!recalculatedForm.costoProveedorUnitario) {
      setGlobalError("Completa ancho y alto para recalcular con la linea.");
      return;
    }

    handleQuickItemFieldChange(itemId, "ancho", recalculatedForm.ancho);
    handleQuickItemFieldChange(itemId, "alto", recalculatedForm.alto);
    handleQuickItemFieldChange(
      itemId,
      "costoProveedorUnitario",
      recalculatedForm.costoProveedorUnitario
    );

    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? buildItemFromForm(recalculatedForm, current.items, itemId, {
              quotePricingMode,
              lineTemplates: activeLineTemplates,
            })
          : item
      ),
    }));
    setGlobalError(null);
  };

  const handleAddOrUpdateItem = () => {
    const errors = validateComponentForm(componentForm, draft.items, editingItemId, {
      quotePricingMode,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    try {
      let nextItems: CotizacionWorkflowItem[];
      let nextQuickEditItemId: string | null = editingItemId;

      if (editingItemId) {
        const item = buildItemFromForm(componentForm, draft.items, editingItemId, {
          quotePricingMode,
          lineTemplates: activeLineTemplates,
        });
        const updatedItems = draft.items.map((e) => (e.id === editingItemId ? item : e));
        nextItems = pasoDosVariaciones.resolveItemsAfterFullEditSave(editingItemId, updatedItems);
      } else {
        const nextItemStartIndex = draft.items.length;
        const availableSlots = getRemainingComponentSlots(draft.items.length);
        const quantity = Math.min(
          availableSlots,
          Math.max(1, Number.parseInt(componentForm.loteCantidad || "1", 10) || 1)
        );
        nextItems = [...draft.items];

        for (let index = 0; index < quantity; index += 1) {
          const nextForm =
            index === 0 && quantity === 1
              ? componentForm
              : {
                  ...componentForm,
                  codigo: buildNextComponentCode(nextItems, componentForm.tipo),
                  nombre: "",
                };

          nextItems.push(
            buildItemFromForm(nextForm, nextItems, null, {
              quotePricingMode,
              lineTemplates: activeLineTemplates,
            })
          );
        }

        nextQuickEditItemId =
          nextItems[nextItemStartIndex]?.id ?? nextItems.at(-1)?.id ?? null;
      }

      setDraft((cur) => ({ ...cur, items: nextItems }));
      if (isMobileViewport) {
        pasoDosEdicionRapida.seleccionarItemEdicionRapida(
          nextQuickEditItemId ?? nextItems[0]?.id ?? null,
          "ancho"
        );
        scrollToSection("component-list");
      }
      setEditingItemId(null);
      setComponentForm(
        createEmptyComponentForm(
          nextItems,
          suggestionProvider,
          componentForm.pricingMode,
          organizationProfile?.margenDefecto
        )
      );
      pasoDosVariaciones.setVariationQuickEditDraft(null);
      setIsGlassPanelOpen(false);
      setGlassQuery("");
      setFieldErrors({});
      setGlobalError(null);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "No se pudo guardar el componente");
    }
  };

  const handleFreeValueItemChange = <K extends keyof FreeValueItemFormState>(
    key: K,
    value: FreeValueItemFormState[K]
  ) => {
    setFreeValueItemForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({
      ...current,
      nombre: key === "nombre" ? undefined : current.nombre,
      costoProveedorUnitario: key === "valor" ? undefined : current.costoProveedorUnitario,
    }));
  };

  const handleOpenFreeValueItemForm = () => {
    setDraft((current) => ({ ...current, quotePricingMode: "por_item" }));
    setFreeValueItemForm(createEmptyFreeValueItemForm());
    setEditingFreeValueItemId(null);
    setEditingItemId(null);
    pasoDosAgregarGrupo.closeSheet();
    pasoDosAgregarGrupoMovil.closeSheet();
    setIsFreeValueItemFormOpen(true);
    setFieldErrors({});
    setGlobalError(null);
  };

  const handleCloseFreeValueItemForm = () => {
    setFreeValueItemForm(createEmptyFreeValueItemForm());
    setEditingFreeValueItemId(null);
    setIsFreeValueItemFormOpen(false);
    setFieldErrors({});
    setGlobalError(null);
  };

  const handleSubmitFreeValueItem = () => {
    const errors = validateFreeValueItemForm(freeValueItemForm);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      const item = buildFreeValueItemFromForm(
        freeValueItemForm,
        draft.items,
        editingFreeValueItemId,
        { taxRatePct: regionalPricing.taxRatePct }
      );
      const nextItems = editingFreeValueItemId
        ? draft.items.map((current) => (current.id === editingFreeValueItemId ? item : current))
        : [...draft.items, item];

      setDraft((current) => ({
        ...current,
        quotePricingMode: "por_item",
        items: nextItems,
      }));
      setFreeValueItemForm(createEmptyFreeValueItemForm());
      setEditingFreeValueItemId(null);
      setIsFreeValueItemFormOpen(false);
      setFieldErrors({});
      setGlobalError(null);
      pasoDosEdicionRapida.seleccionarItemEdicionRapida(item.id, null);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "No se pudo guardar el item libre");
    }
  };

  const handleOpenTotalGlobalComponentCreator = () => {
    setQuoteModeChosen(true);
    returnToTotalNotebookAfterSheetCloseRef.current = true;
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);

    const cleanForm = createEmptyComponentForm(
      draft.items,
      suggestionProvider,
      componentForm.pricingMode,
      organizationProfile?.margenDefecto
    );

    if (isMobileViewport) {
      if (
        pasoDosAgregarGrupoMovil.isOpen &&
        pasoDosAgregarGrupoMovil.entryMode === "free_total_single"
      ) {
        suspendedNotebookRef.current = {
          draft: pasoDosAgregarGrupoMovil.draft,
          paso: pasoDosAgregarGrupoMovil.paso,
          editingFreeTotalMainItemId: pasoDosAgregarGrupoMovil.editingFreeTotalMainItemId,
          editingFreeTotalItemIds: pasoDosAgregarGrupoMovil.editingFreeTotalItemIds,
          freeTotalNotebookNestedItemIds: pasoDosAgregarGrupoMovil.freeTotalNotebookNestedItemIds,
        };
      }

      pasoDosVariaciones.setVariationQuickEditDraft(null);
      setEditingItemId(null);
      setComponentForm(cleanForm);
      setIsGlassPanelOpen(false);
      setGlassQuery("");
      setFieldErrors({});
      setGlobalError(null);
      pasoDosAgregarGrupoMovil.openSheet(cleanForm);
      return;
    }

    if (pasoDosAgregarGrupo.isOpen && pasoDosAgregarGrupo.entryMode === "free_total_single") {
      suspendedNotebookRef.current = {
        draft: pasoDosAgregarGrupo.draft,
        paso: pasoDosAgregarGrupo.paso,
        editingFreeTotalMainItemId: pasoDosAgregarGrupo.editingFreeTotalMainItemId,
        editingFreeTotalItemIds: pasoDosAgregarGrupo.editingFreeTotalItemIds,
        freeTotalNotebookNestedItemIds: pasoDosAgregarGrupo.freeTotalNotebookNestedItemIds,
      };
    }

    pasoDosVariaciones.setVariationQuickEditDraft(null);
    setEditingItemId(null);
    setComponentForm(cleanForm);
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setFieldErrors({});
    setGlobalError(null);
    pasoDosAgregarGrupo.openSheet(cleanForm);
  };

  const handleOpenAddGroupSheet = () => {
    if (quotePricingMode === "total_global") {
      handleOpenTotalGlobalComponentCreator();
      return;
    }

    returnToTotalNotebookAfterSheetCloseRef.current = false;
    setQuoteModeChosen(true);
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);
    if (isMobileViewport) {
      pasoDosAgregarGrupoMovil.openSheet(componentForm);
      return;
    }

    const cleanForm = createEmptyComponentForm(
      draft.items,
      suggestionProvider,
      componentForm.pricingMode,
      organizationProfile?.margenDefecto
    );

    pasoDosVariaciones.setVariationQuickEditDraft(null);
    setEditingItemId(null);
    setComponentForm(cleanForm);
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setFieldErrors({});
    setGlobalError(null);
    pasoDosAgregarGrupo.openSheet(cleanForm);
  };

  const handleOpenPorItemComponentCreator = () => {
    returnToTotalNotebookAfterSheetCloseRef.current = false;
    setQuoteModeChosen(true);
    setDraft((current) => ({ ...current, quotePricingMode: "por_item" }));
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);

    const cleanForm = createEmptyComponentForm(
      draft.items,
      suggestionProvider,
      componentForm.pricingMode,
      organizationProfile?.margenDefecto
    );

    pasoDosVariaciones.setVariationQuickEditDraft(null);
    setEditingItemId(null);
    setComponentForm(cleanForm);
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setFieldErrors({});
    setGlobalError(null);

    if (isMobileViewport) {
      pasoDosAgregarGrupoMovil.openSheet(cleanForm);
      return;
    }

    pasoDosAgregarGrupo.openSheet(cleanForm);
  };

  const handleOpenFreeTotalNotebook = () => {
    setQuoteModeChosen(true);
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);
    if (isMobileViewport) {
      pasoDosAgregarGrupoMovil.openFreeTotalNotebook(componentForm);
      return;
    }

    pasoDosAgregarGrupo.openFreeTotalNotebook(componentForm);
  };

  const returnToModeSelector = () => {
    returnToModeSelectorAfterSheetCloseRef.current = true;
    returnToTotalNotebookAfterSheetCloseRef.current = false;
    suspendedNotebookRef.current = null;
    pasoDosAgregarGrupo.closeSheet();
    setEditingItemId(null);
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);
    setMobileCuadernoActive(false);
    setQuoteModeChosen(false);
  };

  const hasComponentDraftInProgress = hasUnsavedComponentDraft;

  const confirmAddGroup = (
    groupDraft: Parameters<typeof buildPasoDosGrupoComponentForm>[0]["draft"],
    onCloseWizard: (nextItemCount: number) => void
  ) => {
    try {
      const isFreeValue = isFreeValueComponentType(groupDraft.subtipo);
      const freeTotalEditMainId =
        pasoDosAgregarGrupoMovil.editingFreeTotalMainItemId ??
        pasoDosAgregarGrupo.editingFreeTotalMainItemId;
      const freeTotalEditItemIds =
        pasoDosAgregarGrupoMovil.editingFreeTotalItemIds ??
        pasoDosAgregarGrupo.editingFreeTotalItemIds;
      const isEditingFreeTotalNotebook = Boolean(freeTotalEditItemIds?.length);
      const nextItems = isEditingFreeTotalNotebook
        ? draft.items.filter((item) => !freeTotalEditItemIds!.includes(item.id))
        : [...draft.items];
      let nextItem: CotizacionWorkflowItem;

      if (isFreeValue) {
        const shouldChargeSeparately =
          quotePricingMode !== "total_global" || groupDraft.cobraPrecioSeparado;
        const normalizedValue = normalizeCurrencyInput(groupDraft.precio || "0");
        nextItem = buildFreeValueItemFromForm(
          {
            nombre: groupDraft.nombre.trim() || groupDraft.subtipo,
            descripcion: groupDraft.descripcion,
            valor: shouldChargeSeparately ? normalizedValue : "0",
            cantidad: String(groupDraft.cantidad > 0 ? groupDraft.cantidad : 1),
            ivaMode: "total_incluye_iva",
          },
          nextItems,
          isEditingFreeTotalNotebook ? freeTotalEditMainId : null,
          {
            allowZeroValue: !shouldChargeSeparately,
            taxRatePct: regionalPricing.taxRatePct,
          }
        );
      } else {
        const nextForm = buildPasoDosGrupoComponentForm({
          items: draft.items,
          pricingMode: componentForm.pricingMode,
          provider: suggestionProvider,
          draft: groupDraft,
        });
        nextItem = buildItemFromForm(nextForm, nextItems, null, {
          quotePricingMode,
          lineTemplates: activeLineTemplates,
        });
      }

      nextItems.push(nextItem);

      if (
        !isFreeValue &&
        quotePricingMode === "total_global" &&
        suspendedNotebookRef.current
      ) {
        suspendedNotebookRef.current = {
          ...suspendedNotebookRef.current,
          freeTotalNotebookNestedItemIds: [
            ...suspendedNotebookRef.current.freeTotalNotebookNestedItemIds,
            nextItem.id,
          ],
        };
      }

      if (isFreeValue && quotePricingMode === "total_global" && groupDraft.alcanceDetalles.length > 0) {
        for (const detalle of groupDraft.alcanceDetalles) {
          if (
            detalle.tipo === "manual" &&
            !detalle.nombre.trim() &&
            !detalle.descripcion.trim()
          ) {
            continue;
          }
          const detalleItem =
            detalle.tipo === "estructurado"
              ? buildStructuredAlcanceDetalleItem({
                  detalle,
                  items: nextItems,
                  provider: suggestionProvider,
                })
              : buildFreeValueItemFromForm(
                  {
                    nombre: detalle.nombre.trim() || "Detalle incluido",
                    descripcion: [
                      detalle.descripcion.trim(),
                      detalle.cantidad && detalle.cantidad !== "1"
                        ? `Cantidad: ${detalle.cantidad}`
                        : "",
                      detalle.ancho ? `Ancho: ${detalle.ancho} mm` : "",
                      detalle.alto ? `Alto: ${detalle.alto} mm` : "",
                    ]
                      .filter(Boolean)
                      .join(". "),
                    valor: "0",
                    cantidad: detalle.cantidad && detalle.cantidad !== "1" ? detalle.cantidad : "1",
                    ivaMode: "total_incluye_iva",
                  },
                  nextItems,
                  null,
                  {
                    allowZeroValue: true,
                    taxRatePct: regionalPricing.taxRatePct,
                  }
                );
          nextItems.push(detalleItem);
        }
      }

      const groupDraftPrecio = Number(normalizeCurrencyInput(groupDraft.precio || "0")) || null;
      const nextTotalClienteManual =
        isFreeValue &&
        quotePricingMode === "total_global" &&
        !groupDraft.cobraPrecioSeparado
          ? draft.totalClienteManual ?? groupDraftPrecio
          : draft.totalClienteManual;

      setDraft((current) => ({
        ...current,
        items: nextItems,
        totalClienteManual: nextTotalClienteManual,
      }));
      setQuoteModeChosen(true);

      if (isMobileViewport) {
        pasoDosEdicionRapida.seleccionarItemEdicionRapida(
          nextItems.at(-1)?.id ?? null,
          "ancho"
        );
        scrollToSection("component-list");
      }
      pasoDosVariaciones.setVariationQuickEditDraft(null);
      setEditingItemId(null);
      setComponentForm(
        createEmptyComponentForm(
          nextItems,
          suggestionProvider,
          componentForm.pricingMode,
          organizationProfile?.margenDefecto
        )
      );
      setIsGlassPanelOpen(false);
      setGlassQuery("");
      setFieldErrors({});
      setGlobalError(null);
      onCloseWizard(nextItems.length);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "No se pudo agregar el grupo");
    }
  };

  const handleConfirmAddGroupDesktop = () => {
    if (!isMobileViewport && quotePricingMode === "por_item") {
      pendingNextDraftRef.current = true;
    }
    confirmAddGroup(pasoDosAgregarGrupo.draft, (nextItemCount) =>
      pasoDosAgregarGrupo.closeSheet({ itemCountOverride: nextItemCount })
    );
  };

  const handleConfirmAddGroupMovil = () => {
    confirmAddGroup(pasoDosAgregarGrupoMovil.draft, (nextItemCount) =>
      pasoDosAgregarGrupoMovil.closeSheet({ itemCountOverride: nextItemCount })
    );
  };

  const handleEditItem = (item: CotizacionWorkflowItem) => {
    const family =
      pasoDosVariaciones.variationFamilies.find((current) => current.itemIds.includes(item.id)) ??
      null;

    if (isMobileViewport && family) {
      pasoDosVariaciones.openVariationQuickEditForFamily(family, item.id);
      return;
    }

    if (isMobileViewport && item.cantidad > 1) {
      pasoDosVariaciones.openVariationQuickEdit(item);
      return;
    }

    pasoDosVariaciones.setVariationQuickEditDraft(null);
    openItemForEditing(item);
  };

  const duplicateItemInPlace = (item: CotizacionWorkflowItem) => {
    const sourceIndex = draft.items.findIndex((current) => current.id === item.id);
    if (sourceIndex === -1) return;

    const nextCode = buildNextComponentCode(draft.items, item.tipo);
    const clone: CotizacionWorkflowItem = {
      ...item,
      id: `item-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      codigo: nextCode,
    };
    const nextItems = [...draft.items];
    nextItems.splice(sourceIndex + 1, 0, clone);

    setDraft((current) => ({ ...current, items: nextItems }));
    setEditingItemId(null);
    setEditingFreeValueItemId(null);
    setIsFreeValueItemFormOpen(false);
    setFieldErrors({});
    setGlobalError(null);
    setToastMessage(`${nextCode} duplicada correctamente`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDuplicateItem = (item: CotizacionWorkflowItem) => {
    setQuoteModeChosen(true);
    pasoDosVariaciones.setVariationQuickEditDraft(null);
    pasoDosAgregarGrupo.closeSheet();
    pasoDosAgregarGrupoMovil.closeSheet();

    if (!isMobileViewport) {
      duplicateItemInPlace(item);
      return;
    }

    if (item.tipoItem === "item_libre_con_valor") {
      setFreeValueItemForm({
        ...mapFreeValueItemToForm(item),
      });
      setEditingFreeValueItemId(null);
      setEditingItemId(null);
      setIsFreeValueItemFormOpen(true);
      setFieldErrors({});
      setGlobalError(null);
      setStep(2);
      return;
    }

    const isCuadernoConstructorPiece =
      quotePricingMode === "por_item" && getQuoteConstructorItemConfig(item) !== null;

    if (isCuadernoConstructorPiece) {
      duplicateItemInPlace(item);
      return;
    }

    const duplicatedForm = {
      ...mapItemToForm(item),
      codigo: "",
      loteCantidad: "1",
    } satisfies ComponentFormState;

    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);
    setEditingItemId(null);
    setComponentForm(duplicatedForm);
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setFieldErrors({});
    setGlobalError(null);
    setDuplicateSourceCode(item.codigo);
    pasoDosAgregarGrupo.openSheet(duplicatedForm);
    pasoDosAgregarGrupo.goToStep(3);
  };

  const handleAddConstructorPreset = (
    presetId: QuoteConstructorPresetId,
    lineTemplateId?: string
  ) => {
    const preset = QUOTE_CONSTRUCTOR_PRESETS.find((current) => current.id === presetId);
    if (!preset) return null;

    const itemId = `item-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    setDraft((current) => {
      const base = createEmptyComponentForm(
        current.items,
        suggestionProvider,
        componentForm.pricingMode,
        organizationProfile?.margenDefecto
      );
      const config = createQuoteConstructorPresetConfig(preset.id);
      let form: ComponentFormState = {
        ...base,
        codigo: buildNextComponentCode(current.items, preset.componentType),
        tipo: preset.componentType,
        nombre: preset.defaultName,
        ancho: "1200",
        alto: "1000",
        cantidad: "1",
        sistema: "Personalizado",
        configuracion: "Personalizado",
        sheetScheme: "Personalizado",
        isCustomScheme: true,
        guidedVisualConfig: config,
      };
      const lineTemplate = lineTemplateId
        ? activeLineTemplates.find((template) => String(template.id) === lineTemplateId)
        : null;
      if (lineTemplate) {
        form = applyLineTemplateToComponentForm(form, lineTemplate);
      }
      const item = buildItemFromForm(form, current.items, itemId, {
        quotePricingMode,
        lineTemplates: activeLineTemplates,
      });
      return { ...current, items: [...current.items, item] };
    });
    setQuoteModeChosen(true);
    setFieldErrors((current) => ({ ...current, items: undefined }));
    return itemId;
  };

  const handleUpdateConstructorItem = (
    itemId: string,
    patch: QuoteConstructorItemPatch
  ) => {
    setDraft((current) => {
      const item = current.items.find((candidate) => candidate.id === itemId);
      if (!item) return current;

      let form = mapItemToForm(item);
      if (patch.lineTemplateId !== undefined) {
        const template = activeLineTemplates.find(
          (candidate) => String(candidate.id) === patch.lineTemplateId
        );
        form = template
          ? applyLineTemplateToComponentForm(form, template)
          : {
              ...form,
              lineTemplateId: "",
              referencia: "",
              precioPorM2: "",
              minimoCobrable: "",
              precioPlantillaSugerido: "",
              precioAjustadoManual: false,
              origenPrecio: "manual",
              cubicationSnapshot: null,
            };
      }

      const { markPriceManual, ...formPatch } = patch;
      form = { ...form, ...formPatch };

      if (patch.material) {
        form.catalogCategoria = patch.material === "PVC" ? "pvc" : "aluminio";
        form.colorHex = resolveMaterialColorHex(patch.material, form.colorHex);
        if (patch.lineTemplateId === undefined && form.lineTemplateId) {
          form = {
            ...form,
            lineTemplateId: "",
            referencia: "",
            precioPorM2: "",
            minimoCobrable: "",
            precioPlantillaSugerido: "",
            precioAjustadoManual: false,
            origenPrecio: "manual",
            cubicationSnapshot: null,
          };
        }
      }
      if (markPriceManual) {
        form.pricingMode = "precio_directo";
        form.precioAjustadoManual = true;
        form.origenPrecio = "manual";
      }
      // Medidas/cantidad invalidan el snapshot salvo que el patch traiga uno nuevo explícito.
      if (
        patch.cubicationSnapshot === undefined &&
        patch.fabricacionSnapshot === undefined &&
        (patch.ancho !== undefined || patch.alto !== undefined || patch.cantidad !== undefined)
      ) {
        form.cubicationSnapshot = null;
        form.fabricacionSnapshot = null;
      }

      const nextItem = buildItemFromForm(form, current.items, itemId, {
        quotePricingMode,
        lineTemplates: activeLineTemplates,
      });
      return {
        ...current,
        items: current.items.map((candidate) =>
          candidate.id === itemId ? nextItem : candidate
        ),
      };
    });
  };

  const handleApplyConstructorLineToItems = (lineTemplateId: string) => {
    const template = activeLineTemplates.find(
      (candidate) => String(candidate.id) === lineTemplateId
    );
    if (!template) return;

    setDraft((current) => {
      const nextItems = current.items.map((item) =>
        buildItemFromForm(
          applyLineTemplateToComponentForm(mapItemToForm(item), template),
          current.items,
          item.id,
          {
            quotePricingMode: current.quotePricingMode,
            lineTemplates: activeLineTemplates,
          }
        )
      );

      return { ...current, items: nextItems };
    });
  };

  const handleMoveConstructorItem = (itemId: string, direction: -1 | 1) => {
    setDraft((current) => ({
      ...current,
      items: moveQuoteConstructorItem(current.items, itemId, direction),
    }));
  };

  const handleDuplicateItemInPaso3 = (item: CotizacionWorkflowItem) => {
    const sourceIndex = draft.items.findIndex((i) => i.id === item.id);
    if (sourceIndex === -1) return;

    const nextCode = buildNextComponentCode(draft.items, item.tipo, item.codigo);
    const clone: CotizacionWorkflowItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      codigo: nextCode,
    };

    const nextItems = [...draft.items];
    nextItems.splice(sourceIndex + 1, 0, clone);

    setDraft((cur) => ({ ...cur, items: nextItems }));
    setToastMessage(`${nextCode} duplicada correctamente`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveItem = (itemId: string) => {
    const nextItems = draft.items.filter((i) => i.id !== itemId);
    const isLastItemRemoved = nextItems.length === 0;
    const nextEditingItemId = editingItemId === itemId ? null : editingItemId;
    const isRemovingEditedFreeItem = editingFreeValueItemId === itemId;
    const nextComponentForm =
      editingItemId === itemId
        ? createEmptyComponentForm(
            nextItems,
            suggestionProvider,
            componentForm.pricingMode,
            organizationProfile?.margenDefecto
          )
        : componentForm;
    const nextExpandedQuickEditItemId = pasoDosEdicionRapida.resolverSeleccionDespuesDeEliminar(
      itemId,
      nextItems
    );
    const nextDraft = isLastItemRemoved
      ? {
          ...draft,
          items: nextItems,
          totalClienteManual: null,
          costoTotalFabricacion: 0,
          margenGlobalPct: 0,
          utilidadTotal: 0,
        }
      : { ...draft, items: nextItems };

    setDraft(nextDraft);
    if (isLastItemRemoved) {
      setFieldErrors((current) => ({
        ...current,
        totalClienteManual: undefined,
        costoTotalFabricacion: undefined,
        margenGlobalPct: undefined,
      }));

      // En móvil el cuaderno permanece vacío; no abrir el wizard guiado legado.
      if (quotePricingMode !== "total_global" && !isMobileViewport) {
        handleOpenAddGroupSheet();
      }
    }
    if (isRemovingEditedFreeItem) {
      setFreeValueItemForm(createEmptyFreeValueItemForm());
      setEditingFreeValueItemId(null);
      setIsFreeValueItemFormOpen(false);
    }
    if (editingItemId === itemId) {
      setEditingItemId(null);
      setComponentForm(nextComponentForm);
    }
    pasoDosVariaciones.handleItemRemoved(itemId);
    persistenciaWizard.persistWorkflowSnapshot({
      draft: nextDraft,
      componentForm: nextComponentForm,
      editingItemId: nextEditingItemId,
      selectedClientId,
      clientQuery,
      showStep1MoreData,
      step,
    });
    window.requestAnimationFrame(() => {
      const nextTargetId = nextExpandedQuickEditItemId;
      if (nextTargetId) {
        pasoDosLista.scrollItemSeleccionadoIntoView(nextTargetId);
      }
    });
  };

  const handleResetStep2Form = () => {
    pasoDosVariaciones.restorePendingForcedFullEditIfNeeded(editingItemId);
    setEditingItemId(null);
    setEditingFormSnapshot(null);
    pasoDosVariaciones.setVariationQuickEditDraft(null);
    setComponentForm(
      createEmptyComponentForm(
        draft.items,
        suggestionProvider,
        componentForm.pricingMode,
        organizationProfile?.margenDefecto
      )
    );
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setFreeValueItemForm(createEmptyFreeValueItemForm());
    setEditingFreeValueItemId(null);
    setIsFreeValueItemFormOpen(false);
    setFieldErrors({});
    setGlobalError(null);
    pasoDosAgregarGrupo.restart();
    pasoDosEdicionRapida.seleccionarItemEdicionRapida(draft.items[0]?.id ?? null, "ancho");
    if (!isMobileViewport) {
      scrollToSection("component-form");
    }
  };

  const hasQuoteStudioUnfinishedPiece = () =>
    Boolean(
      !isMobileViewport &&
        isDesktopQuoteStudio &&
        quotePricingMode === "por_item" &&
        (editingItemId || pasoDosAgregarGrupo.isOpen || isFreeValueItemFormOpen)
    );

  const discardUnfinishedQuoteStudioPiece = () => {
    let discarded = false;

    if (pasoDosAgregarGrupo.isOpen) {
      pasoDosAgregarGrupo.closeSheet({ itemCountOverride: draft.items.length });
      discarded = true;
    }

    if (editingItemId) {
      pasoDosVariaciones.restorePendingForcedFullEditIfNeeded(editingItemId);
      setEditingItemId(null);
      setEditingFormSnapshot(null);
      pasoDosVariaciones.setVariationQuickEditDraft(null);
      setComponentForm(
        createEmptyComponentForm(
          draft.items,
          suggestionProvider,
          componentForm.pricingMode,
          organizationProfile?.margenDefecto
        )
      );
      setIsGlassPanelOpen(false);
      setGlassQuery("");
      discarded = true;
    }

    if (isFreeValueItemFormOpen) {
      setIsFreeValueItemFormOpen(false);
      setEditingFreeValueItemId(null);
      setFreeValueItemForm(createEmptyFreeValueItemForm());
      discarded = true;
    }

    if (discarded) {
      setDuplicateSourceCode("");
      setFieldErrors((current) => ({ ...current, items: undefined }));
      setGlobalError(null);
    }

    return discarded;
  };
  const commitQuickEditDraft = pasoDosEdicionRapida.confirmarBorradorRapido;
  const handleQuickItemFieldChange = pasoDosEdicionRapida.actualizarCampoBorradorRapido;
  const applyQuickEditDraftsToItems = pasoDosEdicionRapida.aplicarBorradoresRapidosAItems;
  const flushQuickEditDrafts = pasoDosEdicionRapida.flushBorradoresRapidos;
  const handleStartQuickEditBatchSelection = pasoDosEdicionRapida.iniciarSeleccionLote;
  const handleToggleQuickEditBatchTarget = pasoDosEdicionRapida.alternarTargetSeleccionLote;
  const handleCancelQuickEditBatchSelection = pasoDosEdicionRapida.cancelarSeleccionLote;
  const handleApplyQuickEditToSameType = pasoDosEdicionRapida.aplicarEdicionRapidaMismoTipo;
  const handleQuickEditNavigate = pasoDosEdicionRapida.navegarEdicionRapida;
  const pasoTresGuardado = usePasoTresGuardado({
    draft,
    componentForm,
    editingItemId,
    selectedClientId,
    clientQuery,
    showStep1MoreData,
    recordMeta,
    isNewWorkflow: !editId && !duplicateId,
    persistenciaWizard,
    saveWorkflow,
    onQuoteCreated: async (record) => {
      if (sourceSolicitudId) {
        try {
          await fetch("/api/solicitudes", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: sourceSolicitudId,
              estado: "cerrada",
            }),
          });
        } finally {
          clearNuevaCotizacionSolicitudSourceId();
          setSourceSolicitudId(null);
        }
      }

      router.push(`/print/cotizaciones/${record.id}?created=1`);
      return true;
    },
    applyQuickEditDraftsToItems,
    pricingOptions: regionalPricing,
    resetWorkflowToBlank,
    openQuotesList: () => {
      router.push("/cotizaciones");
    },
    syncWizardWithRecord: (recordId) => {
      router.replace(`/cotizaciones/nueva?edit=${recordId}`);
    },
    setDraft,
    setRecordMeta,
    setSavedRecord,
    setLastSaveMode,
    setStep,
    setFieldErrors,
    setGlobalError,
  });

  function handleSelectQuickEditItem(itemId: string) {
    const item = draft.items.find((current) => current.id === itemId);

    if (item?.tipoItem === "item_libre_con_valor") {
      return;
    }

    pasoDosEdicionRapida.seleccionarItemEdicionRapida(itemId, "ancho");

    if (isMobileViewport) {
      scrollToSection("component-list");
    }
  }

  function handleScrollToStepTwoSummary() {
    if (isMobileViewport) {
      return;
    }

    window.requestAnimationFrame(() => {
      pasoDosLista.resumenRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  function focusStep1Field(field: Step1FieldKey) {
    const node = step1InputRefs.current[field];
    if (!node) {
      return;
    }

    node.focus();
    if ("select" in node && typeof node.select === "function") {
      node.select();
    }
  }

  function handlePricingModeSelection(pricingMode: PricingMode) {
    let resolvedMarginValue = "0";

    setComponentForm((current) => {
      const nextMarginValue =
        pricingMode === "precio_directo"
          ? "0"
          : pricingMode === "margen"
            ? String(DEFAULT_MARGIN_PCT)
            : "0";
      resolvedMarginValue = nextMarginValue;

      const hasTemplate = Boolean(
        current.referencia.trim() && current.precioPorM2.trim()
      );

      const next = buildSuggestedComponentForm({
        items: draft.items,
        tipo: current.tipo,
        provider: suggestionProvider,
        pricingMode,
        defaultMargin: organizationProfile?.margenDefecto,
        current: {
          ...current,
          pricingMode,
          margenPct: nextMarginValue,
          ...(pricingMode === "margen" && hasTemplate && !current.precioAjustadoManual
            ? { costoProveedorUnitario: "" }
            : {}),
        },
      });

      const normalizedNext = {
        ...next,
        pricingMode,
      };

      return current.referencia.trim() && current.precioPorM2.trim()
        ? syncTemplatePricingInComponentForm(normalizedNext, {
            forceSuggestedPrice: !current.precioAjustadoManual,
          })
        : normalizedNext;
    });
    setDraft((current) => ({
      ...current,
      items: applyQuotePricingToItems(current.items, pricingMode, resolvedMarginValue, {
        quotePricingMode,
      }),
    }));
    setFieldErrors((current) => ({
      ...current,
      costoProveedorUnitario: undefined,
      margenPct: undefined,
    }));
    setGlobalError(null);
  }

  const handleGlassSelect = (nextGlass: string) => {
    handleComponentChange("vidrio", nextGlass);
    setGlassQuery("");

    if (glassCloseTimeoutRef.current !== null) {
      window.clearTimeout(glassCloseTimeoutRef.current);
    }

    glassCloseTimeoutRef.current = window.setTimeout(() => {
      setIsGlassPanelOpen(false);
      glassCloseTimeoutRef.current = null;
    }, 200);
  };

  const handleCreateCustomGlass = (value: string) => {
    const nextOptions = saveCustomGlassOption(
      customGlassOrganizationId,
      customGlassOptions,
      value
    );
    const savedValue = normalizeCustomGlassValue(value);

    setCustomGlassOptions([...nextOptions]);

    if (savedValue) {
      handleComponentChange("vidrio", savedValue);
      setGlassQuery("");
    }
  };

function goNextFromStep1() {
    const nextDraft = resolveStep1Draft(draft);
    const errors = validateStep1(nextDraft);
    if (errors.step1) {
      setFieldErrors((cur) => ({ ...cur, ...errors }));
      return;
    }
    setFieldErrors((cur) => ({ ...cur, step1: undefined }));
    if (draft.items.length === 0) {
      setQuoteModeChosen(false);
    } else {
      setQuoteModeChosen(true);
    }
    setStep(2);
    scrollPageToTop();
  }

  function handleStep1KeyDown(
    field: Step1FieldKey,
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    if (field === "clientSearch") {
      const fueManejado = pasoUnoCliente.manejarEnterBusquedaCliente(event, () => {
        focusStep1Field("obra");
      });
      if (fueManejado) {
        return;
      }
      return;
    }

    event.preventDefault();

    if (field === "clienteNombre") {
      focusStep1Field("clienteTelefono");
      return;
    }

    if (field === "clienteTelefono") {
      focusStep1Field("obra");
      return;
    }

    if (field === "obra") {
      if (showStep1MoreData) {
        focusStep1Field("direccion");
      } else {
        setShowStep1MoreData(true);
        window.requestAnimationFrame(() => focusStep1Field("direccion"));
      }
      return;
    }

    if (field === "direccion") {
      focusStep1Field("validez");
      return;
    }

    if (field === "validez") {
      focusStep1Field("observaciones");
      return;
    }

    if (field === "observaciones") {
      goNextFromStep1();
    }
  }

  const goToStep = (target: StepKey) => {
    const itemsForNextStep =
      target >= 3 && step === 2 ? flushQuickEditDrafts() : draft.items;

    if (target >= 3 && step === 2) {
      setFieldErrors((current) => ({ ...current, items: undefined }));
    }

    if (target === 2) {
      const errors = validateStep1(resolveStep1Draft(draft));
      if (errors.step1) {
        setFieldErrors((cur) => ({ ...cur, ...errors }));
        setStep(1);
        return;
      }
    }
    if (target >= 3) {
      const e1 = validateStep1(resolveStep1Draft(draft));
      if (e1.step1) {
        setFieldErrors((cur) => ({ ...cur, ...e1 }));
        setStep(1);
        return;
      }
    }
    if (target === 3 && itemsForNextStep.length === 0) {
      setFieldErrors((cur) => ({ ...cur, items: "Agrega al menos un componente" }));
      setStep(2);
      return;
    }
    if (target === 3 && step === 2 && !isMobileViewport && isDesktopQuoteStudio && quotePricingMode === "por_item") {
      const hadUnfinishedPiece = hasQuoteStudioUnfinishedPiece();

      if (completedItemsCount === 0) {
        setFieldErrors((cur) => ({
          ...cur,
          items: "Agrega al menos una pieza terminada para ir al resumen.",
        }));
        setStep(2);
        return;
      }

      const discardedUnfinishedPiece =
        hadUnfinishedPiece && discardUnfinishedQuoteStudioPiece();

      const pendingCount = itemsForNextStep.filter(
        (item) =>
          !isWorkflowItemComplete(item, quotePricingMode) ||
          Number(item.precioTotal ?? 0) <= 0
      ).length;

      if (pendingCount > 0) {
        setFieldErrors((cur) => ({
          ...cur,
          items: `Completa ${pendingCount} ${
            pendingCount === 1 ? "pieza pendiente" : "piezas pendientes"
          } para continuar.`,
        }));
        setStep(2);
        return;
      }

      if (discardedUnfinishedPiece) {
        setToastMessage("La pieza sin finalizar no fue agregada.");
        setTimeout(() => setToastMessage(null), 3000);
      }

      setStep(target);
      scrollPageToTop();
      return;
    }
    if (target === 3 && step === 2 && !isMobileViewport) {
      if (pasoDosAgregarGrupo.isOpen) {
        pasoDosAgregarGrupo.closeSheet();
      }
      if (quotePricingMode === "por_item") {
        const pendingCount = itemsForNextStep.filter(
          (item) =>
            !isWorkflowItemComplete(item, quotePricingMode) ||
            Number(item.precioTotal ?? 0) <= 0
        ).length;

        if (pendingCount > 0) {
          setFieldErrors((cur) => ({
            ...cur,
            items: `Completa ${pendingCount} ${
              pendingCount === 1 ? "pieza pendiente" : "piezas pendientes"
            } para continuar.`,
          }));
          setStep(2);
          return;
        }
      } else if (totals.total <= 0) {
        setFieldErrors((cur) => ({
          ...cur,
          items: "Define un valor final mayor a $0 para continuar.",
        }));
        setStep(2);
        return;
      }
    }
    setStep(target);
    if (target === 2 || target === 3) {
      scrollPageToTop();
    }
  };

  useEffect(() => {
    onAddGroupSheetClosedRef.current = (itemCount: number) => {
    setDuplicateSourceCode("");

    if (returnToModeSelectorAfterSheetCloseRef.current) {
      returnToModeSelectorAfterSheetCloseRef.current = false;
      returnToTotalNotebookAfterSheetCloseRef.current = false;
      suspendedNotebookRef.current = null;
      pendingNextDraftRef.current = false;
      setQuoteModeChosen(false);
      setEditingItemId(null);
      setEditingFreeValueItemId(null);
      setIsFreeValueItemFormOpen(false);
      setFieldErrors({});
      setGlobalError(null);
      return;
    }

    const shouldReturnToTotalNotebook =
      returnToTotalNotebookAfterSheetCloseRef.current ||
      (!isMobileViewport && quotePricingMode === "total_global");

    if (shouldReturnToTotalNotebook) {
      const suspended = suspendedNotebookRef.current;
      suspendedNotebookRef.current = null;
      returnToTotalNotebookAfterSheetCloseRef.current = false;
      setQuoteModeChosen(true);
      setEditingItemId(null);
      setEditingFreeValueItemId(null);
      setIsFreeValueItemFormOpen(false);
      setFieldErrors({});
      setGlobalError(null);
      if (suspended) {
        if (isMobileViewport) {
          pasoDosAgregarGrupoMovil.restoreFreeTotalNotebook({
            ...suspended,
            paso: suspended.paso === 1 || suspended.paso === 2 || suspended.paso === 3
              ? suspended.paso
              : 3,
          });
        } else {
          pasoDosAgregarGrupo.restoreFreeTotalNotebook({
            ...suspended,
            paso: suspended.paso === 4 || suspended.paso === 5 ? suspended.paso : 4,
          });
        }
      } else if (isMobileViewport) {
        pasoDosAgregarGrupoMovil.openFreeTotalNotebook(componentForm);
      } else {
        pasoDosAgregarGrupo.openFreeTotalNotebook(componentForm);
      }
      pendingNextDraftRef.current = false;
      return;
    }

    const suspended = suspendedNotebookRef.current;
    if (suspended) {
      suspendedNotebookRef.current = null;
      returnToTotalNotebookAfterSheetCloseRef.current = false;
      if (isMobileViewport) {
        pasoDosAgregarGrupoMovil.restoreFreeTotalNotebook({
          ...suspended,
          paso: suspended.paso === 1 || suspended.paso === 2 || suspended.paso === 3
            ? suspended.paso
            : 3,
        });
      } else {
        pasoDosAgregarGrupo.restoreFreeTotalNotebook({
          ...suspended,
          paso: suspended.paso === 4 || suspended.paso === 5 ? suspended.paso : 4,
        });
      }
      pendingNextDraftRef.current = false;
      return;
    }

    if (itemCount > 0) {
      const shouldOpenNext = pendingNextDraftRef.current;
      pendingNextDraftRef.current = false;
      if (shouldOpenNext) {
        handleOpenAddGroupSheet();
      }
      return;
    }

    if (isMobileViewport) {
      setQuoteModeChosen(false);
    }
    };
  });

  const handleCloseAddGroupSheetDesktop = () => {
    if (!isMobileViewport && pasoDosAgregarGrupo.entryMode === "free_total_single") {
      returnToModeSelector();
      return;
    }

    if (!isMobileViewport && quotePricingMode === "total_global") {
      returnToTotalNotebookAfterSheetCloseRef.current = true;
      pasoDosAgregarGrupo.closeSheet({ itemCountOverride: draft.items.length });
      return;
    }

    returnToTotalNotebookAfterSheetCloseRef.current = false;
    pasoDosAgregarGrupo.closeSheet();
  };

  const handleBackAddGroupSheetDesktop = () => {
    if (!isMobileViewport && pasoDosAgregarGrupo.entryMode === "free_total_single") {
      returnToModeSelector();
      return;
    }

    pasoDosAgregarGrupo.goBack();
  };

  const isTotalGlobalCuadernoOpen =
    !isMobileViewport &&
    quotePricingMode === "total_global" &&
    pasoDosAgregarGrupo.isOpen &&
    pasoDosAgregarGrupo.entryMode === "free_total_single";
  const isMobileTotalGlobalCuadernoOpen =
    isMobileViewport &&
    quotePricingMode === "total_global" &&
    pasoDosAgregarGrupoMovil.isOpen &&
    pasoDosAgregarGrupoMovil.entryMode === "free_total_single";

  const totalGlobalNestedDetailItems = useMemo(
    () => {
      if (isTotalGlobalCuadernoOpen) {
        return resolveTotalGlobalNestedDetailItems(
          draft.items,
          pasoDosAgregarGrupo.freeTotalNotebookNestedItemIds
        );
      }

      if (isMobileTotalGlobalCuadernoOpen) {
        return resolveTotalGlobalNestedDetailItems(
          draft.items,
          pasoDosAgregarGrupoMovil.freeTotalNotebookNestedItemIds
        );
      }

      return [];
    },
    [
      draft.items,
      isMobileTotalGlobalCuadernoOpen,
      isTotalGlobalCuadernoOpen,
      pasoDosAgregarGrupo.freeTotalNotebookNestedItemIds,
      pasoDosAgregarGrupoMovil.freeTotalNotebookNestedItemIds,
    ]
  );

  const panelItemsForStepTwo = useMemo(() => {
    if (!isTotalGlobalCuadernoOpen) {
      return draft.items;
    }

    const nestedIds = new Set(pasoDosAgregarGrupo.freeTotalNotebookNestedItemIds);
    return draft.items.filter((item) => !nestedIds.has(item.id));
  }, [draft.items, isTotalGlobalCuadernoOpen, pasoDosAgregarGrupo.freeTotalNotebookNestedItemIds]);

  const flujo = useFlujoNuevaCotizacion({
    step,
    isMobileViewport,
    isSaving,
    draft,
    financialSummary: quoteStudioFinancialSummary,
    quoteStudioFinancial,
    onQuoteStudioFinancialChange: handleQuoteStudioFinancialChange,
    onApplyQuoteStudioRecommendedPrice: handleApplyQuoteStudioRecommendedPrice,
    fieldErrors,
    clientQuery,
    estadoBusquedaCliente: pasoUnoCliente.estadoBusquedaCliente,
    clientesFiltrados: pasoUnoCliente.clientesFiltrados,
    clienteSeleccionado: pasoUnoCliente.clienteSeleccionado,
    selectedClientId,
    clientesRecientes: pasoUnoCliente.clientesRecientes,
    clientesRecientesMovil: pasoUnoCliente.clientesRecientesMovil,
    showStep1MoreData,
    onRegisterStep1InputRef: registerStep1InputRef,
    editingItemId,
    componentForm,
    quotePricingMode,
    totalClienteManual: totals.totalClienteManual,
    mostrarIva: draft.mostrarIva ?? true,
    activeLineTemplates,
    globalError,
    isSavingQuickPriceTemplate,
    isGlassPanelOpen,
    glassQuery,
    customGlassOptions,
    items: draft.items,
    pendingItemsCount,
    completedItemsCount,
    effectiveShowOnlyPendingItems,
    selectedQuickEditItem,
    selectedQuickEditViewItem,
    selectedQuickEditDraft,
    selectedQuickEditPricingLabel: pasoDosEdicionRapida.etiquetaPrecioSeleccionado,
    selectedQuickEditIndex,
    selectedQuickEditPendingSameTypeCount,
    selectedQuickEditBatchTargets,
    effectiveQuickEditBatchSelectionIds,
    isQuickEditBatchSelectionOpen,
    expandedQuickEditFocusField: pasoDosEdicionRapida.campoFocoExpandido,
    expandedQuickEditItemId: pasoDosEdicionRapida.itemExpandidoId,
    visibleComponentListState: pasoDosLista.estadoVisibleLista,
    shouldUseStepTwoListScroll: pasoDosLista.usarScrollLista,
    subtotal: CLP(totals.subtotal),
    descuento: CLP(totals.descuentoValor),
    iva: CLP(totals.iva),
    flete: CLP(totals.flete),
    redondeoComercial: CLP(totals.redondeoComercial ?? 0),
    hasRedondeoComercial: (totals.redondeoComercial ?? 0) > 0,
    ajusteComercial: CLP((totals as Record<string, unknown>).ajusteComercial as number ?? 0),
    hasAjusteComercial: ((totals as Record<string, unknown>).ajusteComercial as number ?? 0) !== 0,
    total: CLP(totals.total),
    savedRecord,
    lastSaveMode,
    isEditing: Boolean(recordMeta?.id),
    onGoToStep: goToStep,
    onSaveDraft: pasoTresGuardado.guardarBorrador,
    onSaveQuote: pasoTresGuardado.guardarCotizacion,
    onClientQueryChange: setClientQuery,
    onSelectClient: setSelectedClientId,
    onClearSelectedClient: () => {
      setSelectedClientId("");
      setClientQuery("");
    },
    onClienteNombreChange: (value) => {
      handleDraftChange("clienteNombre", value);
      if (fieldErrors.clienteNombre) setFieldErrors((f) => ({ ...f, clienteNombre: undefined }));
    },
    onTelefonoChange: handleDraftPhoneChange,
    onObraChange: (value) => {
      handleDraftChange("obra", value);
      if (fieldErrors.obra) setFieldErrors((f) => ({ ...f, obra: undefined }));
    },
    onDireccionChange: (value) => handleDraftChange("direccion", value),
    onValidezChange: (value) => handleDraftChange("validez", value),
    onObservacionesChange: (value) => handleDraftChange("observaciones", value),
    onStep1KeyDown: handleStep1KeyDown,
    onToggleMoreData: () => setShowStep1MoreData((current) => !current),
    onResetStep1: handleResetStep1,
    onContinueStep1: goNextFromStep1,
    onQuotePricingModeChange: handleQuotePricingModeChange,
    onPricingModeSelection: handlePricingModeSelection,
    onComponentChange: handleComponentChange,
    onSelectLineTemplate: handleSelectLineTemplate,
    onToggleGlassPanel: () => {
      setIsGlassPanelOpen((current) => {
        const next = !current;
        if (!next) {
          setGlassQuery("");
        }
        return next;
      });
    },
    onGlassQueryChange: setGlassQuery,
    onGlassSelect: (value) => {
      handleGlassSelect(value);
      if (!value) {
        setGlassQuery("");
      }
    },
    onCreateCustomGlass: handleCreateCustomGlass,
    onResetStep2Form: handleResetStep2Form,
    onAddOrUpdateItem: handleAddOrUpdateItem,
    onRecalculateCurrentTemplatePrice: handleRecalculateCurrentTemplatePrice,
    onOpenComponentCreator: handleOpenAddGroupSheet,
    onOpenFreeValueItemForm: handleOpenFreeValueItemForm,
    onToggleShowOnlyPendingItems: pasoDosEdicionRapida.toggleMostrarSoloPendientes,
    onQuickDraftChange: handleQuickItemFieldChange,
    onQuickCommit: commitQuickEditDraft,
    onQuickNavigate: handleQuickEditNavigate,
    onScrollToSummary: handleScrollToStepTwoSummary,
    onStartBatchSelection: handleStartQuickEditBatchSelection,
    onToggleBatchTarget: handleToggleQuickEditBatchTarget,
    onApplyQuickEditToSameType: handleApplyQuickEditToSameType,
    onCancelBatchSelection: handleCancelQuickEditBatchSelection,
    onMeasureFirstItem: pasoDosLista.medirPrimeraFila,
    onSelectQuickEditItem: handleSelectQuickEditItem,
    onEditItem: handleEditItem,
    onDuplicateItem: handleDuplicateItem,
    onDuplicateItemPaso3: handleDuplicateItemInPaso3,
    onRemoveItem: handleRemoveItem,
    onRecalculateTemplatePrice: handleRecalculateTemplatePrice,
    onSaveQuickPriceTemplateFromItem: handleSaveQuickPriceTemplateFromItem,
    onSaveQuickPriceTemplate: handleSaveQuickPriceTemplate,
    onSaveCubicationLineAdjustment: handleSaveCubicationLineAdjustment,
    isSavingCubicationLineAdjustment,
    onDraftFleteChange: handleDraftFleteChange,
    onDraftDiscountChange: handleDraftDiscountChange,
    onDraftDiscountTypeChange: handleDraftDiscountTypeChange,
    onCondicionesPagoChange: handleCondicionesPagoChange,
    onGlobalTotalClienteChange: handleGlobalTotalClienteChange,
    onMostrarIvaChange: handleMostrarIvaChange,
    formatCurrencyInput: regionalCurrencyInput,
    stepTwoListRef: pasoDosLista.listaRef,
    stepTwoSummaryRef: pasoDosLista.resumenRef,
    isDesktopQuoteStudio,
    editingFormSnapshot,
    onDuplicateItemFromEditor: () => {
      const item = draft.items.find((i) => i.id === editingItemId);
      if (!item) return;
      const codigo = buildNextComponentCode(draft.items, item.tipo, item.codigo);
      const clone: CotizacionWorkflowItem = { ...item, id: `item-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`, codigo };
      setDraft((cur) => ({ ...cur, items: [...cur.items, clone] }));
    },
  });

  if (!isReady && (editId || duplicateId) && !sourceRecord) return null;

  if (isReady && (editId || duplicateId) && !sourceRecord) {
    return (
      <div className={s.root}>
        <div className={s.pageHeader}>
          <div className={s.pageHeading}>
            <Link href="/cotizaciones" className={s.backLink}>
              <LuArrowLeft aria-hidden /> Volver
            </Link>
            <h1 className={s.pageTitle}>Cotizacion no encontrada</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${s.root} ${
        flujo.paso === 2 && flujo.esVistaMovil ? s.rootStepTwoMobile : ""
      }`}
      data-onboarding-target="cotizacion-nueva-root"
    >
      {flujo.esVistaMovil ? (
        <NuevaCotizacionMobile
          rootClassName={`${s.root} ${flujo.paso === 2 ? s.rootStepTwoMobile : ""}`}
          layoutClassName={`${s.layout} ${flujo.paso === 1 ? s.layoutStepOne : ""} ${flujo.paso === 2 ? s.layoutStepTwo : ""} ${flujo.paso === 3 ? s.layoutFinalStep : ""}`}
          step={flujo.paso}
          headerProps={{
            step: flujo.paso,
            isMobileViewport: true,
            isSaving: flujo.estaGuardando,
            isEditing: flujo.esEdicion,
            onGoToStep: goToStep,
            onSaveDraft: flujo.propsResumenDesktop.onSaveDraft,
            onSaveQuote: flujo.propsResumenDesktop.onSaveQuote,
          }}
          stepOneProps={flujo.propsPasoUno}
          stepTwoWizardProps={{
            formulario: flujo.propsPasoDosFormulario,
            itemLibreForm: {
              isOpen: isFreeValueItemFormOpen,
              editingItemId: editingFreeValueItemId,
              form: freeValueItemForm,
              fieldErrors,
              isSaving,
              onChange: handleFreeValueItemChange,
              onSubmit: handleSubmitFreeValueItem,
              onCancel: handleCloseFreeValueItemForm,
            },
            items: effectiveWorkflowItems,
            subtotal: CLP(totals.subtotal),
            total: CLP(totals.total),
            pricingMode: componentForm.pricingMode,
            adjustedItems: pasoDosVariaciones.adjustedItems,
            variationQuickEdit: pasoDosVariaciones.variationQuickEdit,
            totalClienteManual: totals.totalClienteManual,
            mostrarIva: draft.mostrarIva ?? true,
            internalObservation: draft.observaciones,
            onGoToSummary: () => goToStep(3),
            onGlobalTotalClienteChange: handleGlobalTotalClienteChange,
            onMostrarIvaChange: handleMostrarIvaChange,
            onInternalObservationChange: handleInternalObservationChange,
            onVariationQuickEditChange: pasoDosVariaciones.handleVariationQuickEditChange,
            onEditVariationFull: pasoDosVariaciones.handleEditVariationFull,
            onCloseVariationQuickEdit: pasoDosVariaciones.handleCloseVariationQuickEdit,
            onEditItem: handleEditItem,
            onRemoveItem: handleRemoveItem,
            onOpenFreeValueItemForm: handleOpenFreeValueItemForm,
            quoteModeChosen,
            onQuoteModeChosen: () => setQuoteModeChosen(true),
            mobileCuadernoActive,
            onReturnToModeSelector: returnToModeSelector,
            onEnterCuaderno: () => {
              setQuoteModeChosen(true);
              setMobileCuadernoActive(true);
            },
            cuaderno: {
              lineTemplates: activeLineTemplates,
              glassOptions: pasoDosAgregarGrupoMovil.glassOptions,
              contextCliente: draft.clienteNombre,
              contextObra: draft.obra,
              onAddPreset: handleAddConstructorPreset,
              onUpdateItem: handleUpdateConstructorItem,
              onApplyLineToItems: handleApplyConstructorLineToItems,
              onDuplicateItem: (item) => {
                setQuoteModeChosen(true);
                duplicateItemInPlace(item);
              },
              onRemoveItem: handleRemoveItem,
              onClose: () => setMobileCuadernoActive(false),
              onReturnToModeSelector: returnToModeSelector,
            },
            wizard: {
              isOpen: pasoDosAgregarGrupoMovil.isOpen,
              paso: pasoDosAgregarGrupoMovil.paso,
              entryMode: pasoDosAgregarGrupoMovil.entryMode,
              draft: pasoDosAgregarGrupoMovil.draft,
              subtypeOptions: pasoDosAgregarGrupoMovil.subtypeOptions,
              systemOptions: pasoDosAgregarGrupoMovil.systemOptions,
              configurationOptions: pasoDosAgregarGrupoMovil.configurationOptions,
              glassOptions: pasoDosAgregarGrupoMovil.glassOptions,
              visibleLineTemplates: pasoDosAgregarGrupoMovil.visibleLineTemplates,
              linePricingSummary: pasoDosAgregarGrupoMovil.linePricingSummary,
              isSavingLineTemplate: isSavingQuickPriceTemplate,
              onOpen: handleOpenAddGroupSheet,
              onOpenFreeTotalNotebook: handleOpenFreeTotalNotebook,
              onOpenComponentCreator: handleOpenTotalGlobalComponentCreator,
              nestedDetailItems: totalGlobalNestedDetailItems,
              onClose: pasoDosAgregarGrupoMovil.closeSheet,
              onGoToStep: pasoDosAgregarGrupoMovil.goToStep,
              onBack: pasoDosAgregarGrupoMovil.goBack,
              onNext: pasoDosAgregarGrupoMovil.goNext,
              onConfirm: handleConfirmAddGroupMovil,
              onSelectCategoria: pasoDosAgregarGrupoMovil.selectCategoria,
              onSelectSubtipo: pasoDosAgregarGrupoMovil.selectSubtipo,
              onSelectCantidad: pasoDosAgregarGrupoMovil.selectCantidad,
              onCantidadChange: pasoDosAgregarGrupoMovil.updateCantidad,
              onMaterialChange: pasoDosAgregarGrupoMovil.updateMaterial,
              onNombreChange: pasoDosAgregarGrupoMovil.updateNombre,
              onDescripcionChange: pasoDosAgregarGrupoMovil.updateDescripcion,
              onSelectLineTemplate: pasoDosAgregarGrupoMovil.selectLineTemplate,
              onApplyCreatedLineTemplate: pasoDosAgregarGrupoMovil.applyCreatedLineTemplate,
              onCreateLineTemplate: handleCreateMobileLineTemplate,
              onColorChange: pasoDosAgregarGrupoMovil.updateColorHex,
              onSistemaChange: pasoDosAgregarGrupoMovil.updateSistema,
              onConfiguracionChange: pasoDosAgregarGrupoMovil.updateConfiguracion,
              onPalilloEnabledChange: pasoDosAgregarGrupoMovil.updatePalilloEnabled,
              onPalilloTypeChange: pasoDosAgregarGrupoMovil.updatePalilloType,
              onCostInputScopeChange: pasoDosAgregarGrupoMovil.updateCostInputScope,
              onSheetSchemeChange: pasoDosAgregarGrupoMovil.updateSheetScheme,
              onSheetVariantChange: pasoDosAgregarGrupoMovil.updateSheetVariant,
              onCustomSchemeDescriptionChange: pasoDosAgregarGrupoMovil.updateCustomSchemeDescription,
              onMirrorFormatChange: pasoDosAgregarGrupoMovil.updateMirrorFormat,
              onMirrorPaneCountChange: pasoDosAgregarGrupoMovil.updateMirrorPaneCount,
              onMirrorCustomPaneCountChange: pasoDosAgregarGrupoMovil.updateMirrorCustomPaneCount,
              onMirrorPaneDirectionChange: pasoDosAgregarGrupoMovil.updateMirrorPaneDirection,
              onMirrorInteriorLineChange: pasoDosAgregarGrupoMovil.updateMirrorInteriorLine,
              onVidrioChange: pasoDosAgregarGrupoMovil.updateVidrio,
              onCreateCustomGlass: (value) => {
                const savedValue = normalizeCustomGlassValue(value);
                const nextOptions = saveCustomGlassOption(
                  customGlassOrganizationId,
                  customGlassOptions,
                  value
                );
                setCustomGlassOptions([...nextOptions]);
                if (savedValue) {
                  pasoDosAgregarGrupoMovil.updateVidrio(savedValue);
                }
              },
              onAnchoChange: pasoDosAgregarGrupoMovil.updateAncho,
              onAltoChange: pasoDosAgregarGrupoMovil.updateAlto,
              onPrecioChange: pasoDosAgregarGrupoMovil.updatePrecio,
              onPricingModeChange: pasoDosAgregarGrupoMovil.updatePricingMode,
              onMargenChange: pasoDosAgregarGrupoMovil.updateMargenPct,
              onCobraPrecioSeparadoChange: pasoDosAgregarGrupoMovil.updateCobraPrecioSeparado,
              onAddAlcanceDetalle: pasoDosAgregarGrupoMovil.addAlcanceDetalle,
              onUpdateAlcanceDetalle: pasoDosAgregarGrupoMovil.updateAlcanceDetalle,
              onRemoveAlcanceDetalle: pasoDosAgregarGrupoMovil.removeAlcanceDetalle,
            },
          }}
          stepThreeProps={{ ...flujo.propsPasoTres, saveIntent: pasoTresGuardado.saveIntent }}
        />
      ) : (
        <NuevaCotizacionDesktop
          rootClassName={`${s.root} ${flujo.paso === 1 ? s.rootStepOneDesktop : ""} ${flujo.paso === 2 ? s.rootStepTwoDesktop : ""}`}
          layoutClassName={`${flujo.paso === 1 ? s.layoutStepOne : s.layout} ${flujo.paso === 2 ? s.layoutStepTwo : ""} ${flujo.paso === 3 ? s.layoutFinalStep : ""}`}
          step={flujo.paso}
          headerProps={{
            step: flujo.paso,
            isMobileViewport: false,
            isSaving: flujo.estaGuardando,
            isEditing: flujo.esEdicion,
            onGoToStep: goToStep,
            onSaveDraft: flujo.propsResumenDesktop.onSaveDraft,
            onSaveQuote: flujo.propsResumenDesktop.onSaveQuote,
            isSummaryStepBlocked:
              flujo.paso === 2 &&
              isDesktopQuoteStudio &&
              quotePricingMode === "por_item" &&
              completedItemsCount === 0,
            summaryStepBlockedHint:
              "Agrega al menos una pieza terminada para ir al resumen.",
          }}
          stepOneProps={flujo.propsPasoUno}
          stepTwoSectionProps={{
            formulario: flujo.propsPasoDosFormulario,
            panel: {
              ...flujo.propsPasoDosPanel,
              items: panelItemsForStepTwo,
              isAddGroupWizardOpen: pasoDosAgregarGrupo.isOpen,
              isTotalGlobalCuadernoOpen,
            },
            itemLibreForm: {
              isOpen: isFreeValueItemFormOpen,
              editingItemId: editingFreeValueItemId,
              form: freeValueItemForm,
              fieldErrors,
              isSaving,
              onChange: handleFreeValueItemChange,
              onSubmit: handleSubmitFreeValueItem,
              onCancel: handleCloseFreeValueItemForm,
            },
            quoteModeChosen,
            quotePricingMode,
            isMobileViewport,
            hasComponentDraftInProgress,
            budgetContext: {
              clienteNombre: draft.clienteNombre,
              obra: draft.obra,
            },
            onOpenCreator: quoteModeChosen
              ? handleOpenAddGroupSheet
              : handleOpenPorItemComponentCreator,
            onOpenFreeTotalNotebook: handleOpenFreeTotalNotebook,
            onSelectMode: handleQuotePricingModeChange,
            onReturnToModeSelector: returnToModeSelector,
            duplicateSourceCode,
            constructorLineTemplates: activeLineTemplates,
            constructorGlassOptions: pasoDosAgregarGrupo.glassOptions,
            totalClienteManual: draft.totalClienteManual ?? null,
            formatCurrencyInput: regionalCurrencyInput,
            onAddConstructorPreset: handleAddConstructorPreset,
            onUpdateConstructorItem: handleUpdateConstructorItem,
            onMoveConstructorItem: handleMoveConstructorItem,
            onGlobalTotalClienteChange: handleGlobalTotalClienteChange,
            onClosePieceEditors: () => {
              returnToTotalNotebookAfterSheetCloseRef.current = false;
              returnToModeSelectorAfterSheetCloseRef.current = false;
              if (pasoDosAgregarGrupo.isOpen) {
                pasoDosAgregarGrupo.closeSheet({ itemCountOverride: draft.items.length });
              }
              setEditingItemId(null);
              setIsFreeValueItemFormOpen(false);
              setEditingFreeValueItemId(null);
            },
            isSaving,
            preferredWorkspaceMode: requestedConstructorEntry ? "rapida" : null,
          }}
          stepThreeProps={{ ...flujo.propsPasoTres, saveIntent: pasoTresGuardado.saveIntent }}
          sideSummaryProps={flujo.propsResumenDesktop}
          addGroupSheetProps={{
            isOpen: pasoDosAgregarGrupo.isOpen,
            paso: pasoDosAgregarGrupo.paso,
            entryMode: pasoDosAgregarGrupo.entryMode,
            draft: pasoDosAgregarGrupo.draft,
            subtypeOptions: pasoDosAgregarGrupo.subtypeOptions,
            systemOptions: pasoDosAgregarGrupo.systemOptions,
            glassOptions: pasoDosAgregarGrupo.glassOptions,
            visibleLineTemplates: pasoDosAgregarGrupo.visibleLineTemplates,
            summary: pasoDosAgregarGrupo.summary,
            globalError,
            onClose: handleCloseAddGroupSheetDesktop,
            onBack: handleBackAddGroupSheetDesktop,
            onNext: pasoDosAgregarGrupo.goNext,
            onGoToStep: pasoDosAgregarGrupo.goToStep,
            onConfirm: handleConfirmAddGroupDesktop,
            onSelectCategoria: pasoDosAgregarGrupo.selectCategoria,
            onSelectSubtipo: pasoDosAgregarGrupo.selectSubtipo,
            onSelectCantidad: pasoDosAgregarGrupo.selectCantidad,
            onEnableCustomQuantity: pasoDosAgregarGrupo.enableCustomQuantity,
            onCustomQuantityChange: pasoDosAgregarGrupo.updateCustomQuantity,
            onCantidadInputChange: pasoDosAgregarGrupo.updateCantidadInput,
            onNormalizeCantidadInput: pasoDosAgregarGrupo.normalizeCantidadInput,
            onMaterialChange: pasoDosAgregarGrupo.updateMaterial,
            onSelectLineTemplate: pasoDosAgregarGrupo.selectLineTemplate,
            onColorChange: pasoDosAgregarGrupo.updateColorHex,
            onNombreChange: pasoDosAgregarGrupo.updateNombre,
            onDescripcionChange: pasoDosAgregarGrupo.updateDescripcion,
            onSistemaChange: pasoDosAgregarGrupo.updateSistema,
            configurationOptions: pasoDosAgregarGrupo.configurationOptions,
            onConfiguracionChange: pasoDosAgregarGrupo.updateConfiguracion,
            onSheetSchemeChange: pasoDosAgregarGrupo.updateSheetScheme,
            onSheetVariantChange: pasoDosAgregarGrupo.updateSheetVariant,
            onCustomSchemeDescriptionChange: pasoDosAgregarGrupo.updateCustomSchemeDescription,
            onGuidedVisualConfigChange: pasoDosAgregarGrupo.updateGuidedVisualConfig,
            onVidrioChange: pasoDosAgregarGrupo.updateVidrio,
            onCreateCustomGlass: (value) => {
              const savedValue = normalizeCustomGlassValue(value);
              const nextOptions = saveCustomGlassOption(
                customGlassOrganizationId,
                customGlassOptions,
                value
              );
              setCustomGlassOptions([...nextOptions]);
              if (savedValue) {
                pasoDosAgregarGrupo.updateVidrio(savedValue);
              }
            },
            onAnchoChange: pasoDosAgregarGrupo.updateAncho,
            onAltoChange: pasoDosAgregarGrupo.updateAlto,
            onCubicationSnapshotChange: pasoDosAgregarGrupo.updateCubicationSnapshot,
            onFabricationRecipeIdChange: pasoDosAgregarGrupo.updateFabricationRecipeId,
            onFabricacionSnapshotChange: pasoDosAgregarGrupo.updateFabricacionSnapshot,
            onFabricacionContextoChange: pasoDosAgregarGrupo.updateFabricacionContexto,
            onPrecioChange: pasoDosAgregarGrupo.updatePrecio,
            onPrecioPorM2Change: pasoDosAgregarGrupo.updatePrecioPorM2,
            onMinimoCobrableChange: pasoDosAgregarGrupo.updateMinimoCobrable,
            onRedondeoPrecioChange: pasoDosAgregarGrupo.updateRedondeoPrecio,
            onPriceInputModeChange: pasoDosAgregarGrupo.updatePriceInputMode,
            onToggleCustomizeUnitPrice: pasoDosAgregarGrupo.toggleCustomizeUnitPrice,
            onPricingModeChange: pasoDosAgregarGrupo.updatePricingMode,
            onMargenChange: pasoDosAgregarGrupo.updateMargenPct,
            onCobraPrecioSeparadoChange: pasoDosAgregarGrupo.updateCobraPrecioSeparado,
            onAddAlcanceDetalle: pasoDosAgregarGrupo.addAlcanceDetalle,
            onUpdateAlcanceDetalle: pasoDosAgregarGrupo.updateAlcanceDetalle,
            onRemoveAlcanceDetalle: pasoDosAgregarGrupo.removeAlcanceDetalle,
            nestedDetailItems: totalGlobalNestedDetailItems,
            onEditNestedDetailItem: (itemId) => {
              const item = draft.items.find((entry) => entry.id === itemId);
              if (item) {
                handleEditItem(item);
              }
            },
            onRemoveNestedDetailItem: handleRemoveItem,
            onOpenComponentCreator: handleOpenTotalGlobalComponentCreator,
            quotePricingMode,
            totalClienteManual: totals.totalClienteManual,
            mostrarIva: draft.mostrarIva ?? true,
            internalObservation: draft.observaciones,
            onGlobalTotalClienteChange: handleGlobalTotalClienteChange,
            onMostrarIvaChange: handleMostrarIvaChange,
            onInternalObservationChange: handleInternalObservationChange,
            canContinueFromQuantity: pasoDosAgregarGrupo.canContinueFromQuantity,
            canContinueFromConfig: pasoDosAgregarGrupo.canContinueFromConfig,
            detailOnlyMode: quotePricingMode === "total_global",
          }}
        />
      )}
      {toastMessage ? (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            padding: "0.65rem 1.15rem",
            borderRadius: "10px",
            background: "#06162f",
            color: "#ffffff",
            fontSize: "0.82rem",
            fontWeight: 700,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            pointerEvents: "none",
          }}
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={null}>
      <NuevaCotizacionPageContent />
    </Suspense>
  );
}
