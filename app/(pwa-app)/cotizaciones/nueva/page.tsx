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
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  calculateCotizacionWorkflowTotals,
  createCotizacionWorkflowDraft,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  normalizePricingMode,
  type PricingMode,
} from "@/features/cotizaciones/types/pricing-mode";
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
  mapItemToForm,
  normalizeCurrencyInput,
  scrollPageToTop,
  scrollToSection,
  STATUS_COPY,
  Step1FieldKey,
  StepKey,
  validateComponentForm,
  validateStep1,
  applyQuotePricingToItems,
  applyLineTemplateToComponentForm,
  buildComponentFormLinePricingSummary,
  type PreferredProvider,
  syncTemplatePricingInComponentForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  clearNuevaCotizacionSolicitudSourceId,
  getNuevaCotizacionSolicitudSourceId,
} from "@/features/cotizaciones/new-quote/solicitud-prefill";

import { NuevaCotizacionDesktop } from "./_components/desktop/nueva-cotizacion-desktop";
import { NuevaCotizacionMobile } from "./_components/mobile/nueva-cotizacion-mobile";
import { useFlujoNuevaCotizacion } from "./_hooks/use-flujo-nueva-cotizacion";
import {
  buildPasoDosGrupoComponentForm,
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
  const pasoDosEdicionRapida = usePasoDosEdicionRapida({
    items: draft.items,
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
    const mediaQuery = window.matchMedia("(max-width: 800px)");
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
    () => calculateCotizacionWorkflowTotals(effectiveWorkflowItems, draft.descuentoPct, draft.flete),
    [draft.descuentoPct, draft.flete, effectiveWorkflowItems]
  );
  const componentListCards = usePasoDosTarjetasComponentes({
    items: effectiveWorkflowItems,
    borradoresRapidos: syncedQuickEditDrafts,
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
  const pasoDosAgregarGrupo = usePasoDosAgregarGrupo({
    items: draft.items,
    pricingMode: componentForm.pricingMode,
    provider: suggestionProvider,
    seedForm: componentForm,
  });
  const pasoDosAgregarGrupoMovil = usePasoDosAgregarGrupoMovil({
    items: draft.items,
    pricingMode: componentForm.pricingMode,
    provider: suggestionProvider,
    activeLineTemplates,
    seedForm: componentForm,
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

  function registerStep1InputRef(
    field: Step1FieldKey,
    node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  ) {
    step1InputRefs.current[field] = node;
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

      if (key === "tipo" && !editingItemId) {
        const next = buildSuggestedComponentForm({
          items: draft.items,
          tipo: value as string,
          provider: suggestionProvider,
          pricingMode: cur.pricingMode,
          defaultMargin: organizationProfile?.margenDefecto,
          current: {
            tipo: value as string,
            codigo: "",
            referencia: "",
            lineTemplateId: "",
            nombre: "",
            descripcion: "",
            vidrio: "",
            material: cur.material,
            loteCantidad: cur.loteCantidad,
            cantidad: cur.cantidad,
            precioPorM2: cur.precioPorM2,
            minimoCobrable: cur.minimoCobrable,
            redondeoPrecio: cur.redondeoPrecio,
            precioPlantillaSugerido: cur.precioPlantillaSugerido,
            precioAjustadoManual: cur.precioAjustadoManual,
            origenPrecio: cur.origenPrecio,
            observaciones: cur.observaciones,
            colorHex: cur.colorHex,
            pricingMode: cur.pricingMode,
          },
        });

        return next;
      }

      const next = { ...cur, [key]: value };
      if (key === "tipo") {
        next.codigo = buildNextComponentCode(draft.items, value as string, editingItemId);
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
          items: applyQuotePricingToItems(current.items, "margen", nextMarginValue),
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
        item.id === itemId ? buildItemFromForm(recalculatedForm, current.items, itemId) : item
      ),
    }));
    setGlobalError(null);
  };

  const handleAddOrUpdateItem = () => {
    const errors = validateComponentForm(componentForm, draft.items, editingItemId);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    try {
      let nextItems: CotizacionWorkflowItem[];
      let nextQuickEditItemId: string | null = editingItemId;

      if (editingItemId) {
        const item = buildItemFromForm(componentForm, draft.items, editingItemId);
        nextItems = draft.items.map((e) => (e.id === editingItemId ? item : e));
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

          nextItems.push(buildItemFromForm(nextForm, nextItems, null));
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

  const handleOpenAddGroupSheet = () => {
    if (isMobileViewport) {
      pasoDosAgregarGrupoMovil.openSheet(componentForm);
      return;
    }

    pasoDosAgregarGrupo.openSheet(componentForm);
  };

  const confirmAddGroup = (
    groupDraft: Parameters<typeof buildPasoDosGrupoComponentForm>[0]["draft"],
    onCloseWizard: () => void
  ) => {
    try {
      const nextForm = buildPasoDosGrupoComponentForm({
        items: draft.items,
        pricingMode: componentForm.pricingMode,
        provider: suggestionProvider,
        draft: groupDraft,
      });
      const nextItems = [...draft.items];
      const nextItem = buildItemFromForm(nextForm, nextItems, null);
      nextItems.push(nextItem);

      setDraft((current) => ({ ...current, items: nextItems }));
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
    const nextEditingItemId = editingItemId === itemId ? null : editingItemId;
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
    setDraft((cur) => ({ ...cur, items: nextItems }));
    if (editingItemId === itemId) {
      setEditingItemId(null);
      setComponentForm(nextComponentForm);
    }
    pasoDosVariaciones.handleItemRemoved(itemId);
    persistenciaWizard.persistWorkflowSnapshot({
      draft: { ...draft, items: nextItems },
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
          : current.pricingMode === "precio_directo"
            ? "0"
            : current.margenPct || "0";
      resolvedMarginValue = nextMarginValue;

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
      items: applyQuotePricingToItems(current.items, pricingMode, resolvedMarginValue),
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
    const errors = validateStep1(draft);
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
      const errors = validateStep1(draft);
      if (errors.step1) {
        setFieldErrors((cur) => ({ ...cur, ...errors }));
        setStep(1);
        return;
      }
    }
    if (target >= 3) {
      const e1 = validateStep1(draft);
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
    >
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
            items: draft.items,
            subtotal: CLP(totals.subtotal),
            total: CLP(totals.total),
            pricingMode: componentForm.pricingMode,
            adjustedItems: pasoDosVariaciones.adjustedItems,
            variationQuickEdit: pasoDosVariaciones.variationQuickEdit,
            onGoToSummary: () => goToStep(3),
            onVariationQuickEditChange: pasoDosVariaciones.handleVariationQuickEditChange,
            onEditVariationFull: pasoDosVariaciones.handleEditVariationFull,
            onCloseVariationQuickEdit: pasoDosVariaciones.handleCloseVariationQuickEdit,
            onEditItem: handleEditItem,
            onRemoveItem: handleRemoveItem,
            wizard: {
              isOpen: pasoDosAgregarGrupoMovil.isOpen,
              paso: pasoDosAgregarGrupoMovil.paso,
              draft: pasoDosAgregarGrupoMovil.draft,
              subtypeOptions: pasoDosAgregarGrupoMovil.subtypeOptions,
              systemOptions: pasoDosAgregarGrupoMovil.systemOptions,
              configurationOptions: pasoDosAgregarGrupoMovil.configurationOptions,
              glassOptions: pasoDosAgregarGrupoMovil.glassOptions,
              visibleLineTemplates: pasoDosAgregarGrupoMovil.visibleLineTemplates,
              linePricingSummary: pasoDosAgregarGrupoMovil.linePricingSummary,
              onOpen: handleOpenAddGroupSheet,
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
              onSelectLineTemplate: pasoDosAgregarGrupoMovil.selectLineTemplate,
              onColorChange: pasoDosAgregarGrupoMovil.updateColorHex,
              onSistemaChange: pasoDosAgregarGrupoMovil.updateSistema,
              onConfiguracionChange: pasoDosAgregarGrupoMovil.updateConfiguracion,
              onVidrioChange: pasoDosAgregarGrupoMovil.updateVidrio,
              onAnchoChange: pasoDosAgregarGrupoMovil.updateAncho,
              onAltoChange: pasoDosAgregarGrupoMovil.updateAlto,
              onPrecioChange: pasoDosAgregarGrupoMovil.updatePrecio,
              onPricingModeChange: pasoDosAgregarGrupoMovil.updatePricingMode,
              onMargenChange: pasoDosAgregarGrupoMovil.updateMargenPct,
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
          }}
          stepThreeProps={{ ...flujo.propsPasoTres, saveIntent: pasoTresGuardado.saveIntent }}
          sideSummaryProps={flujo.propsResumenDesktop}
          addGroupSheetProps={{
            isOpen: pasoDosAgregarGrupo.isOpen,
            paso: pasoDosAgregarGrupo.paso,
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
            onSistemaChange: pasoDosAgregarGrupo.updateSistema,
            onVidrioChange: pasoDosAgregarGrupo.updateVidrio,
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
