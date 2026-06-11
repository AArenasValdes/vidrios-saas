"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  type KeyboardEvent,
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
import { OnboardingGuide } from "@/features/onboarding/components/onboarding-guide";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  calculateWorkflowTotalsForPricingMode,
  createCotizacionWorkflowDraft,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CreateCotizacionLineTemplateInput } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
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
  withResolvedWorkflowObra,
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

import { NuevaCotizacionDesktop } from "./_components/desktop/nueva-cotizacion-desktop";
import { NuevaCotizacionMobile } from "./_components/mobile/nueva-cotizacion-mobile";
import { useFlujoNuevaCotizacion } from "./_hooks/use-flujo-nueva-cotizacion";
import {
  buildFreeTotalNotebookDraftFromWorkflow,
  buildStructuredAlcanceDetalleItem,
  buildPasoDosGrupoComponentForm,
  resolveFreeTotalNotebookEditScope,
  resolveMaterialColorHex,
  usePasoDosAgregarGrupo,
} from "./_hooks/use-paso-dos-agregar-grupo";
import { usePasoDosAgregarGrupoMovil } from "./_hooks/use-paso-dos-agregar-grupo-movil";
import { usePasoUnoCliente } from "./_hooks/use-paso-uno-cliente";
import { usePasoDosEdicionRapida } from "./_hooks/use-paso-dos-edicion-rapida";
import { usePasoDosListaComponentes } from "./_hooks/use-paso-dos-lista-componentes";
import { usePasoDosTarjetasComponentes } from "./_hooks/use-paso-dos-tarjetas-componentes";
import { usePasoDosVariaciones } from "./_hooks/use-paso-dos-variaciones";
import { usePasoTresGuardado } from "./_hooks/use-paso-tres-guardado";
import { usePersistenciaNuevaCotizacion } from "./_hooks/use-persistencia-nueva-cotizacion";
import s from "./page.module.css";

function NuevaCotizacionPageContent() {
  const onboarding = useOnboardingChecklist();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const requestedStepParam = searchParams.get("step");
  const requestedStep: StepKey | null =
    requestedStepParam === "2" ? 2 : requestedStepParam === "3" ? 3 : null;
  const glassCloseTimeoutRef = useRef<number | null>(null);
  const step1InputRefs = useRef<Record<Step1FieldKey, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>({
    clientSearch: null,
    clienteNombre: null,
    clienteTelefono: null,
    obra: null,
    direccion: null,
    validez: null,
    observaciones: null,
  });

  const [draft, setDraft] = useState<CotizacionWorkflowDraft>(createCotizacionWorkflowDraft);
  const { profile: organizationProfile } = useOrganizationProfile();
  const {
    activeTemplates: activeLineTemplates,
    createTemplate: createLineTemplate,
    isSaving: isSavingQuickPriceTemplate,
  } = useCotizacionLineTemplates({ activeOnly: true });
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
  const [step, setStep] = useState<StepKey>(1);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<CotizacionWorkflowRecord | null>(null);
  const [lastSaveMode, setLastSaveMode] = useState<keyof typeof STATUS_COPY | null>(null);
  const [isGlassPanelOpen, setIsGlassPanelOpen] = useState(false);
  const [glassQuery, setGlassQuery] = useState("");
  const [showStep1MoreData, setShowStep1MoreData] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);
  const [quoteModeChosen, setQuoteModeChosen] = useState(false);

  useEffect(() => {
    if (draft.items.length > 0) {
      setQuoteModeChosen(true);
    }
  }, [draft.items.length]);
  const [recordMeta, setRecordMeta] = useState<{
    id?: string;
    codigo?: string;
    clientId?: string | number | null;
    projectId?: string | number | null;
  } | null>(null);
  const [sourceSolicitudId, setSourceSolicitudId] = useState<string | null>(() =>
    getNuevaCotizacionSolicitudSourceId()
  );
  const {
    clientes,
    ensureClientesLoaded,
    getCotizacionById,
    loadCotizacionById,
    saveWorkflow,
    isReady,
    isSaving,
  } = useCotizacionesStore({ autoLoadSummary: false });

  const suggestionProvider: PreferredProvider = "";
  const preferredPricingMode = normalizePricingMode(
    organizationProfile?.modoPrecioPreferido
  );
  const quotePricingMode = normalizeQuotePricingMode(draft.quotePricingMode);
  const pasoDosEdicionRapida = usePasoDosEdicionRapida({
    items: draft.items,
    quotePricingMode,
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
    const mediaQuery = window.matchMedia("(max-width: 860px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);

    return () => mediaQuery.removeListener(syncViewport);
  }, []);
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
      }),
    [draft, effectiveWorkflowItems]
  );
  const componentListCards = usePasoDosTarjetasComponentes({
    items: effectiveWorkflowItems,
    borradoresRapidos: syncedQuickEditDrafts,
    quotePricingMode,
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
  const handleAddGroupSheetClosed = (itemCount: number) => {
    if (itemCount > 0) {
      return;
    }

    setQuoteModeChosen(false);
  };

  const pasoDosAgregarGrupo = usePasoDosAgregarGrupo({
    items: draft.items,
    pricingMode: componentForm.pricingMode,
    provider: suggestionProvider,
    seedForm: componentForm,
    onSheetClosed: handleAddGroupSheetClosed,
  });
  const pasoDosAgregarGrupoMovil = usePasoDosAgregarGrupoMovil({
    items: draft.items,
    pricingMode: componentForm.pricingMode,
    provider: suggestionProvider,
    activeLineTemplates,
    seedForm: componentForm,
    onSheetClosed: handleAddGroupSheetClosed,
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

  const handleQuotePricingModeChange = (mode: QuotePricingMode) => {
    if (mode === quotePricingMode) {
      setQuoteModeChosen(true);
      return;
    }

    if (
      draft.items.length > 0 &&
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
    let nextDraft = { ...currentDraft };

    if (!nextDraft.clienteNombre.trim()) {
      nextDraft.clienteNombre = "Cliente";
      if (!nextDraft.obra.trim()) {
        nextDraft.obra = "Cotización";
      }
    }

    nextDraft = withResolvedWorkflowObra(nextDraft);

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
        scrollToSection("component-form");
      });
      return;
    }

    pasoDosVariaciones.setVariationQuickEditDraft(null);
    const parsed = mapItemToForm(item);
    const nextEditingItemId = item.id;
    setEditingItemId(item.id);
    setComponentForm(parsed);
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
      scrollToSection("component-form");
    });
  };
  const pasoDosVariaciones = usePasoDosVariaciones({
    items: draft.items,
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
        });
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
        });
        if (
          !shouldShowSheetSchemeForComponent({ tipo: nextTipo, sistema: nextSistema }) ||
          !sheetSchemeOptions.includes(next.sheetScheme)
        ) {
          next.sheetScheme = "";
          next.sheetVariant = "";
          next.customSchemeDescription = "";
          next.isCustomScheme = false;
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
        material: componentForm.material,
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
        material: itemForm.material,
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
          ? buildItemFromForm(recalculatedForm, current.items, itemId, { quotePricingMode })
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

          nextItems.push(buildItemFromForm(nextForm, nextItems, null, { quotePricingMode }));
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
        editingFreeValueItemId
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

  const handleOpenAddGroupSheet = () => {
    setIsFreeValueItemFormOpen(false);
    setEditingFreeValueItemId(null);
    if (isMobileViewport) {
      pasoDosAgregarGrupoMovil.openSheet(componentForm);
      return;
    }

    pasoDosAgregarGrupo.openSheet(componentForm);
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

  const confirmAddGroup = (
    groupDraft: Parameters<typeof buildPasoDosGrupoComponentForm>[0]["draft"],
    onCloseWizard: () => void
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
          { allowZeroValue: !shouldChargeSeparately }
        );
      } else {
        const nextForm = buildPasoDosGrupoComponentForm({
          items: draft.items,
          pricingMode: componentForm.pricingMode,
          provider: suggestionProvider,
          draft: groupDraft,
        });
        nextItem = buildItemFromForm(nextForm, nextItems, null, { quotePricingMode });
      }

      nextItems.push(nextItem);

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
                  { allowZeroValue: true }
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
      onCloseWizard();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "No se pudo agregar el grupo");
    }
  };

  const handleConfirmAddGroupDesktop = () => {
    confirmAddGroup(pasoDosAgregarGrupo.draft, pasoDosAgregarGrupo.closeSheet);
  };

  const handleConfirmAddGroupMovil = () => {
    confirmAddGroup(pasoDosAgregarGrupoMovil.draft, pasoDosAgregarGrupoMovil.closeSheet);
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
      setQuoteModeChosen(false);
      setFieldErrors((current) => ({
        ...current,
        totalClienteManual: undefined,
        costoTotalFabricacion: undefined,
        margenGlobalPct: undefined,
      }));
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
    onQuoteCreated: async () => {
      if (!sourceSolicitudId) {
        return;
      }

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
    },
    applyQuickEditDraftsToItems,
    resetWorkflowToBlank,
    openPrintViewer: (recordId) => {
      router.replace(`/print/cotizaciones/${recordId}?from=wizard&created=1`);
    },
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

  function goNextFromStep1() {
    const nextDraft = resolveStep1Draft(draft);
    const errors = validateStep1(nextDraft);
    if (errors.step1) {
      setFieldErrors((cur) => ({ ...cur, ...errors }));
      return;
    }
    setFieldErrors((cur) => ({ ...cur, step1: undefined }));
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
    setStep(target);
    if (target === 2 || target === 3) {
      scrollPageToTop();
    }
  };

  const flujo = useFlujoNuevaCotizacion({
    step,
    isMobileViewport,
    isSaving,
    draft,
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
    iva: CLP(totals.iva),
    flete: CLP(totals.flete),
    redondeoComercial: CLP(totals.redondeoComercial ?? 0),
    hasRedondeoComercial: (totals.redondeoComercial ?? 0) > 0,
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
    onRemoveItem: handleRemoveItem,
    onRecalculateTemplatePrice: handleRecalculateTemplatePrice,
    onSaveQuickPriceTemplateFromItem: handleSaveQuickPriceTemplateFromItem,
    onSaveQuickPriceTemplate: handleSaveQuickPriceTemplate,
    onDraftFleteChange: handleDraftFleteChange,
    onGlobalTotalClienteChange: handleGlobalTotalClienteChange,
    onMostrarIvaChange: handleMostrarIvaChange,
    formatCurrencyInput,
    stepTwoListRef: pasoDosLista.listaRef,
    stepTwoSummaryRef: pasoDosLista.resumenRef,
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
      <OnboardingGuide controller={onboarding} routeKey="cotizacion_nueva" />

      {flujo.esVistaMovil ? (
        <NuevaCotizacionMobile
          rootClassName={`${s.root} ${flujo.paso === 2 ? s.rootStepTwoMobile : ""}`}
          layoutClassName={`${s.layout} ${flujo.paso === 1 ? s.layoutStepOne : ""} ${flujo.paso === 2 ? s.layoutStepTwo : ""} ${flujo.paso === 3 ? s.layoutFinalStep : ""}`}
          step={flujo.paso}
          headerProps={{
            step: flujo.paso,
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
              onVidrioChange: pasoDosAgregarGrupoMovil.updateVidrio,
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
          rootClassName={s.root}
          layoutClassName={`${s.layout} ${flujo.paso === 1 ? s.layoutStepOne : ""} ${flujo.paso === 2 ? s.layoutStepTwo : ""} ${flujo.paso === 3 ? s.layoutFinalStep : ""}`}
          step={flujo.paso}
          headerProps={{
            step: flujo.paso,
            isSaving: flujo.estaGuardando,
            isEditing: flujo.esEdicion,
            onGoToStep: goToStep,
            onSaveDraft: flujo.propsResumenDesktop.onSaveDraft,
            onSaveQuote: flujo.propsResumenDesktop.onSaveQuote,
          }}
          stepOneProps={flujo.propsPasoUno}
          stepTwoSectionProps={{
            formulario: flujo.propsPasoDosFormulario,
            panel: flujo.propsPasoDosPanel,
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
            onOpenCreator: handleOpenAddGroupSheet,
            onOpenFreeTotalNotebook: handleOpenFreeTotalNotebook,
            onSelectMode: handleQuotePricingModeChange,
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
            summary: pasoDosAgregarGrupo.summary,
            onClose: pasoDosAgregarGrupo.closeSheet,
            onBack: pasoDosAgregarGrupo.goBack,
            onNext: pasoDosAgregarGrupo.goNext,
            onConfirm: handleConfirmAddGroupDesktop,
            onSelectCategoria: pasoDosAgregarGrupo.selectCategoria,
            onSelectSubtipo: pasoDosAgregarGrupo.selectSubtipo,
            onSelectCantidad: pasoDosAgregarGrupo.selectCantidad,
            onEnableCustomQuantity: pasoDosAgregarGrupo.enableCustomQuantity,
            onCustomQuantityChange: pasoDosAgregarGrupo.updateCustomQuantity,
            onMaterialChange: pasoDosAgregarGrupo.updateMaterial,
            onNombreChange: pasoDosAgregarGrupo.updateNombre,
            onDescripcionChange: pasoDosAgregarGrupo.updateDescripcion,
            onSistemaChange: pasoDosAgregarGrupo.updateSistema,
            onSheetSchemeChange: pasoDosAgregarGrupo.updateSheetScheme,
            onSheetVariantChange: pasoDosAgregarGrupo.updateSheetVariant,
            onCustomSchemeDescriptionChange: pasoDosAgregarGrupo.updateCustomSchemeDescription,
            onVidrioChange: pasoDosAgregarGrupo.updateVidrio,
            onPrecioChange: pasoDosAgregarGrupo.updatePrecio,
            onCobraPrecioSeparadoChange: pasoDosAgregarGrupo.updateCobraPrecioSeparado,
            onAddAlcanceDetalle: pasoDosAgregarGrupo.addAlcanceDetalle,
            onUpdateAlcanceDetalle: pasoDosAgregarGrupo.updateAlcanceDetalle,
            onRemoveAlcanceDetalle: pasoDosAgregarGrupo.removeAlcanceDetalle,
            quotePricingMode,
            totalClienteManual: totals.totalClienteManual,
            mostrarIva: draft.mostrarIva ?? true,
            internalObservation: draft.observaciones,
            onGlobalTotalClienteChange: handleGlobalTotalClienteChange,
            onMostrarIvaChange: handleMostrarIvaChange,
            onInternalObservationChange: handleInternalObservationChange,
            canContinueFromQuantity: pasoDosAgregarGrupo.canContinueFromQuantity,
            canContinueFromConfig: pasoDosAgregarGrupo.canContinueFromConfig,
          }}
        />
      )}
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
