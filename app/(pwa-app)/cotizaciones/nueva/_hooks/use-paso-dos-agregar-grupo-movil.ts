"use client";

import { useEffect, useMemo, useState } from "react";

import {
  normalizeCurrencyInput,
  buildComponentFormLinePricingSummary,
  getSheetSchemeOptions,
  shouldShowSheetSchemeForComponent,
  type ComponentFormState,
  type PreferredProvider,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import { DEFAULT_MARGIN_PCT } from "@/features/cotizaciones/types/pricing-mode";
import type { CostInputScope } from "@/features/cotizaciones/types/pricing-mode";
import { isFreeValueComponentType } from "@/features/cotizaciones/services/component-catalog.service";

import type { PasoDosGrupoDraft } from "./use-paso-dos-agregar-grupo";
import type { AlcanceDetalle } from "./use-paso-dos-agregar-grupo";
import {
  applyLineTemplateToGrupoDraft,
  buildFreeTotalNotebookDraftState,
  createEmptyAlcanceDetalle,
  createInitialPasoDosGrupoDraft,
  buildPasoDosGrupoSelectionPatch,
  getConfigurationOptionsForSubtype,
  getGlassOptionsForSubtype,
  getSubtypeOptionsForCategory,
  getSystemOptionsForSubtype,
  resolveMaterialColorHex,
  shouldSkipCantidadForGrupoDraft,
  syncDraftTemplatePricing,
  type PasoDosGrupoCategoria,
  type PasoDosGrupoEntryMode,
} from "./use-paso-dos-agregar-grupo";

export type PasoDosGrupoPasoMovil = 1 | 2 | 3;

type Params = {
  items: CotizacionWorkflowItem[];
  pricingMode: PricingMode;
  provider: PreferredProvider;
  activeLineTemplates: CotizacionLineTemplate[];
  seedForm?: ComponentFormState | null;
  onSheetClosed?: (itemCount: number) => void;
};

function sanitizeDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function usePasoDosAgregarGrupoMovil(params: Params) {
  const activeLineTemplates = params.activeLineTemplates;
  const [isOpen, setIsOpen] = useState(false);
  const [paso, setPaso] = useState<PasoDosGrupoPasoMovil>(1);
  const [entryMode, setEntryMode] = useState<PasoDosGrupoEntryMode>("normal");
  const [editingFreeTotalMainItemId, setEditingFreeTotalMainItemId] = useState<string | null>(null);
  const [editingFreeTotalItemIds, setEditingFreeTotalItemIds] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<PasoDosGrupoDraft>(() =>
    createInitialPasoDosGrupoDraft(params)
  );

  const resetFreeTotalEditState = () => {
    setEditingFreeTotalMainItemId(null);
    setEditingFreeTotalItemIds(null);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const subtypeOptions = useMemo(
    () => getSubtypeOptionsForCategory(draft.categoria),
    [draft.categoria]
  );
  const systemOptions = useMemo(
    () => getSystemOptionsForSubtype(draft.subtipo),
    [draft.subtipo]
  );
  const configurationOptions = useMemo(
    () => getConfigurationOptionsForSubtype(draft.subtipo, draft.sistema),
    [draft.subtipo, draft.sistema]
  );
  const glassOptions = useMemo(
    () => getGlassOptionsForSubtype(draft.subtipo),
    [draft.subtipo]
  );
  const visibleLineTemplates = useMemo(
    () =>
      activeLineTemplates.filter(
        (template) => template.material === draft.material
      ),
    [activeLineTemplates, draft.material]
  );
  const linePricingSummary = useMemo(
    () =>
      buildComponentFormLinePricingSummary({
        ancho: draft.ancho,
        alto: draft.alto,
        cantidad: String(Math.max(1, draft.cantidad)),
        precioPorM2: draft.precioPorM2,
        minimoCobrable: draft.minimoCobrable,
        redondeoPrecio: draft.redondeoPrecio,
      }),
    [draft.alto, draft.ancho, draft.cantidad, draft.minimoCobrable, draft.precioPorM2, draft.redondeoPrecio]
  );

  const openSheet = (seedForm?: ComponentFormState | null) => {
    setDraft(
      createInitialPasoDosGrupoDraft({
        items: params.items,
        pricingMode: params.pricingMode,
        provider: params.provider,
        seedForm: seedForm ?? params.seedForm ?? undefined,
      })
    );
    resetFreeTotalEditState();
    setEntryMode("normal");
    setPaso(1);
    setIsOpen(true);
  };

  const openFreeTotalNotebook = (seedForm?: ComponentFormState | null) => {
    resetFreeTotalEditState();
    const nextDraft = buildFreeTotalNotebookDraftState({
      items: params.items,
      pricingMode: params.pricingMode,
      provider: params.provider,
      seedForm: seedForm ?? params.seedForm ?? undefined,
    });

    setDraft(nextDraft);
    setEntryMode("free_total_single");
    setPaso(3);
    setIsOpen(true);
  };

  const openFreeTotalNotebookForEdit = (
    nextDraft: PasoDosGrupoDraft,
    mainItemId: string,
    itemIds: string[]
  ) => {
    resetFreeTotalEditState();
    setDraft(nextDraft);
    setEditingFreeTotalMainItemId(mainItemId);
    setEditingFreeTotalItemIds(itemIds);
    setEntryMode("free_total_single");
    setPaso(3);
    setIsOpen(true);
  };

  const closeSheet = () => {
    const itemCount = params.items.length;

    setIsOpen(false);
    setPaso(1);
    setEntryMode("normal");
    resetFreeTotalEditState();
    params.onSheetClosed?.(itemCount);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSheet();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
    // closeSheet se recrea por render; el listener se re-registra al abrir/cerrar el sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const goToStep = (nextPaso: PasoDosGrupoPasoMovil) => {
    setPaso(nextPaso);
  };

  const selectCategoria = (categoria: PasoDosGrupoCategoria) => {
    const nextSubtype = getSubtypeOptionsForCategory(categoria)[0] ?? draft.subtipo;

    setDraft((current) => ({
      ...current,
      categoria,
      ...buildPasoDosGrupoSelectionPatch({
        current,
        items: params.items,
        pricingMode: params.pricingMode,
        provider: params.provider,
        subtipo: nextSubtype,
      }),
    }));
  };

  const selectSubtipo = (subtipo: string) => {
    const shouldSkipCantidad = shouldSkipCantidadForGrupoDraft({
      categoria: draft.categoria,
      subtipo,
    });

    setDraft((current) => ({
      ...current,
      ...buildPasoDosGrupoSelectionPatch({
        current,
        items: params.items,
        pricingMode: params.pricingMode,
        provider: params.provider,
        subtipo,
      }),
    }));
    setPaso(shouldSkipCantidad ? 3 : 2);
  };

  const selectCantidad = (cantidad: number) => {
    setDraft((current) => ({
      ...current,
      cantidad: Math.max(1, cantidad),
      usaCantidadPersonalizada: true,
      cantidadPersonalizada: String(Math.max(1, cantidad)),
    }));
  };

  const updateCantidad = (value: string) => {
    const digits = sanitizeDigits(value);
    const parsed = Number.parseInt(digits || "0", 10);

    setDraft((current) => ({
      ...current,
      usaCantidadPersonalizada: true,
      cantidadPersonalizada: digits,
      cantidad: digits && parsed > 0 ? parsed : current.cantidad,
    }));
  };

  const updateMaterial = (material: PasoDosGrupoDraft["material"]) => {
    setDraft((current) => ({
      ...current,
      material,
      lineTemplateId: "",
      referencia: "",
      precioPorM2: "",
      minimoCobrable: "",
      redondeoPrecio: "1000",
      colorHex: resolveMaterialColorHex(material, current.colorHex),
    }));
  };

  const selectLineTemplate = (templateId: string) => {
    if (!templateId) {
      setDraft((current) => ({
        ...current,
        lineTemplateId: "",
        referencia: "",
        precioPorM2: "",
        minimoCobrable: "",
        redondeoPrecio: "1000",
      }));
      return;
    }

    const template = activeLineTemplates.find(
      (currentTemplate) => String(currentTemplate.id) === templateId
    );

    if (!template) {
      return;
    }

    setDraft((current) => applyLineTemplateToGrupoDraft(current, template));
  };

  const applyCreatedLineTemplate = (template: CotizacionLineTemplate) => {
    setDraft((current) => applyLineTemplateToGrupoDraft(current, template));
  };

  const updateColorHex = (colorHex: string) => {
    setDraft((current) => ({ ...current, colorHex }));
  };

  const updateSistema = (sistema: string) => {
    setDraft((current) => {
      const sheetSchemeOptions = getSheetSchemeOptions({ tipo: current.subtipo, sistema });
      const shouldKeepComposition =
        shouldShowSheetSchemeForComponent({ tipo: current.subtipo, sistema }) &&
        sheetSchemeOptions.includes(current.sheetScheme);
      const nextConfigOptions = getConfigurationOptionsForSubtype(current.subtipo, sistema);
      const nextConfig = nextConfigOptions[0] || "";

      return {
        ...current,
        sistema,
        configuracion: nextConfig,
        ...(shouldKeepComposition
          ? {}
          : {
              sheetScheme: "",
              sheetVariant: "",
              customSchemeDescription: "",
              isCustomScheme: false,
            }),
      };
    });
  };

  const updateConfiguracion = (configuracion: string) => {
    setDraft((current) => ({ ...current, configuracion }));
  };

  const updatePalilloEnabled = (enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      palilloEnabled: enabled,
      palilloType: enabled ? current.palilloType : "",
    }));
  };

  const updatePalilloType = (palilloType: string) => {
    setDraft((current) => ({ ...current, palilloType }));
  };

  const updateCostInputScope = (scope: CostInputScope) => {
    setDraft((current) => ({ ...current, costInputScope: scope }));
  };

  const updateSheetScheme = (sheetScheme: string) => {
    setDraft((current) => ({
      ...current,
      sheetScheme,
      sheetVariant: "",
      customSchemeDescription: sheetScheme === "Personalizado" ? current.customSchemeDescription : "",
      isCustomScheme: sheetScheme === "Personalizado",
    }));
  };

  const updateSheetVariant = (sheetVariant: string) => {
    setDraft((current) => ({
      ...current,
      sheetVariant,
      customSchemeDescription: sheetVariant === "Otro" ? current.customSchemeDescription : "",
      isCustomScheme: current.sheetScheme === "Personalizado" || sheetVariant === "Otro",
    }));
  };

  const updateCustomSchemeDescription = (customSchemeDescription: string) => {
    setDraft((current) => ({ ...current, customSchemeDescription }));
  };

  const updateNombre = (nombre: string) => {
    setDraft((current) => ({ ...current, nombre }));
  };

  const updateDescripcion = (descripcion: string) => {
    setDraft((current) => ({ ...current, descripcion }));
  };

  const updateIvaMode = (ivaMode: PasoDosGrupoDraft["ivaMode"]) => {
    setDraft((current) => ({ ...current, ivaMode }));
  };

  const updateCobraPrecioSeparado = (cobraPrecioSeparado: boolean) => {
    setDraft((current) => ({
      ...current,
      cobraPrecioSeparado,
      precio: cobraPrecioSeparado ? current.precio : "",
    }));
  };

  const updateVidrio = (vidrio: string) => {
    setDraft((current) => ({ ...current, vidrio }));
  };

  const updateAncho = (value: string) => {
    setDraft((current) => syncDraftTemplatePricing({ ...current, ancho: sanitizeDigits(value) }));
  };

  const updateAlto = (value: string) => {
    setDraft((current) => syncDraftTemplatePricing({ ...current, alto: sanitizeDigits(value) }));
  };

  const updatePrecio = (value: string) => {
    setDraft((current) => ({
      ...current,
      precio: normalizeCurrencyInput(value),
      precioAjustadoManual: true,
    }));
  };

  const updatePricingMode = (pricingMode: PricingMode) => {
    setDraft((current) => {
      const hasTemplate = Boolean(
        (current.referencia ?? "").trim() && (current.precioPorM2 ?? "").trim()
      );
      const shouldClearTemplateAutoPrice =
        pricingMode === "margen" && hasTemplate && !current.precioAjustadoManual;

      const nextDraft = {
        ...current,
        pricingMode,
        margenPct: pricingMode === "precio_directo" ? "0" : String(DEFAULT_MARGIN_PCT),
        ...(shouldClearTemplateAutoPrice
          ? { precio: "" }
          : {}),
      };
      const directModeDraft =
        pricingMode === "precio_directo" && hasTemplate && !nextDraft.precio.trim()
          ? { ...nextDraft, precioAjustadoManual: false }
          : nextDraft;
      const resolvedDraft =
        pricingMode === "precio_directo" && hasTemplate
          ? syncDraftTemplatePricing(directModeDraft)
          : directModeDraft;

      return resolvedDraft;
    });
  };

  const updateMargenPct = (value: string) => {
    setDraft((current) => ({
      ...current,
      margenPct: sanitizeDigits(value),
    }));
  };

  const addAlcanceDetalle = (initialNombre = "") => {
    setDraft((current) => ({
      ...current,
      alcanceDetalles: [
        ...current.alcanceDetalles,
        createEmptyAlcanceDetalle("manual", initialNombre),
      ],
    }));
  };

  const updateAlcanceDetalle = (
    detalleId: string,
    field: keyof AlcanceDetalle,
    value: string
  ) => {
    setDraft((current) => ({
      ...current,
      alcanceDetalles: current.alcanceDetalles.map((d) =>
        d.id === detalleId ? { ...d, [field]: value } : d
      ),
    }));
  };

  const removeAlcanceDetalle = (detalleId: string) => {
    setDraft((current) => ({
      ...current,
      alcanceDetalles: current.alcanceDetalles.filter((d) => d.id !== detalleId),
    }));
  };

  const goBack = () => {
    if (entryMode === "free_total_single") {
      return;
    }

    setPaso((current) => {
      const isFreeValue = isFreeValueComponentType(draft.subtipo);
      const shouldSkipCantidad = shouldSkipCantidadForGrupoDraft(draft);

      if (current === 3 && isFreeValue && shouldSkipCantidad) return 1;
      if (current === 3) return 2;
      if (current === 2) return 1;
      return current;
    });
  };

  const goNext = () => {
    setPaso((current) => (current === 2 ? 3 : current));
  };

  return {
    isOpen,
    paso,
    entryMode,
    draft,
    subtypeOptions,
    systemOptions,
    configurationOptions,
    glassOptions,
    visibleLineTemplates,
    linePricingSummary,
    openSheet,
    openFreeTotalNotebook,
    openFreeTotalNotebookForEdit,
    editingFreeTotalMainItemId,
    editingFreeTotalItemIds,
    closeSheet,
    goToStep,
    selectCategoria,
    selectSubtipo,
    selectCantidad,
    updateCantidad,
    updateMaterial,
    selectLineTemplate,
    applyCreatedLineTemplate,
    updateColorHex,
    updateSistema,
    updateConfiguracion,
    updatePalilloEnabled,
    updatePalilloType,
    updateCostInputScope,
    updateSheetScheme,
    updateSheetVariant,
    updateCustomSchemeDescription,
    updateNombre,
    updateDescripcion,
    updateIvaMode,
    updateCobraPrecioSeparado,
    updateVidrio,
    updateAncho,
    updateAlto,
    updatePrecio,
    updatePricingMode,
    updateMargenPct,
    addAlcanceDetalle,
    updateAlcanceDetalle,
    removeAlcanceDetalle,
    goBack,
    goNext,
  };
}
