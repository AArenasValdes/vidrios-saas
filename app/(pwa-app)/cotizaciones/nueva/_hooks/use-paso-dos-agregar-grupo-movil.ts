"use client";

import { useEffect, useMemo, useState } from "react";

import {
  normalizeCurrencyInput,
  buildComponentFormLinePricingSummary,
  type ComponentFormState,
  type PreferredProvider,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";

import type { PasoDosGrupoDraft } from "./use-paso-dos-agregar-grupo";
import {
  applyLineTemplateToGrupoDraft,
  createInitialPasoDosGrupoDraft,
  buildPasoDosGrupoSelectionPatch,
  getConfigurationOptionsForSubtype,
  getGlassOptionsForSubtype,
  getSubtypeOptionsForCategory,
  getSystemOptionsForSubtype,
  resolveMaterialColorHex,
  syncDraftTemplatePricing,
  type PasoDosGrupoCategoria,
} from "./use-paso-dos-agregar-grupo";

export type PasoDosGrupoPasoMovil = 1 | 2 | 3;

type Params = {
  items: CotizacionWorkflowItem[];
  pricingMode: PricingMode;
  provider: PreferredProvider;
  activeLineTemplates: CotizacionLineTemplate[];
  seedForm?: ComponentFormState | null;
};

function sanitizeDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function usePasoDosAgregarGrupoMovil(params: Params) {
  const activeLineTemplates = params.activeLineTemplates ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [paso, setPaso] = useState<PasoDosGrupoPasoMovil>(1);
  const [draft, setDraft] = useState<PasoDosGrupoDraft>(() =>
    createInitialPasoDosGrupoDraft(params)
  );

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setPaso(1);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
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
    () => getConfigurationOptionsForSubtype(draft.subtipo),
    [draft.subtipo]
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
    setPaso(1);
    setIsOpen(true);
  };

  const closeSheet = () => {
    setIsOpen(false);
    setPaso(1);
  };

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
    setPaso(2);
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

  const updateColorHex = (colorHex: string) => {
    setDraft((current) => ({ ...current, colorHex }));
  };

  const updateSistema = (sistema: string) => {
    setDraft((current) => ({ ...current, sistema }));
  };

  const updateConfiguracion = (configuracion: string) => {
    setDraft((current) => ({ ...current, configuracion }));
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
    }));
  };

  const updatePricingMode = (pricingMode: PricingMode) => {
    setDraft((current) => ({
      ...current,
      pricingMode,
      margenPct:
        pricingMode === "precio_directo"
          ? "0"
          : current.margenPct && Number(current.margenPct) >= 0
            ? current.margenPct
            : "0",
    }));
  };

  const updateMargenPct = (value: string) => {
    setDraft((current) => ({
      ...current,
      margenPct: sanitizeDigits(value),
    }));
  };

  const goBack = () => {
    setPaso((current) => {
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
    draft,
    subtypeOptions,
    systemOptions,
    configurationOptions,
    glassOptions,
    visibleLineTemplates,
    linePricingSummary,
    openSheet,
    closeSheet,
    goToStep,
    selectCategoria,
    selectSubtipo,
    selectCantidad,
    updateCantidad,
    updateMaterial,
    selectLineTemplate,
    updateColorHex,
    updateSistema,
    updateConfiguracion,
    updateVidrio,
    updateAncho,
    updateAlto,
    updatePrecio,
    updatePricingMode,
    updateMargenPct,
    goBack,
    goNext,
  };
}
