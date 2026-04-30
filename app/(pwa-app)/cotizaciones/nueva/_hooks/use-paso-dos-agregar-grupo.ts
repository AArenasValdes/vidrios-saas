"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ALUMINUM_COLOR_OPTIONS,
  buildGlassValue,
  buildSuggestedComponentForm,
  GLASS_OPTIONS,
  getComponentTypeLabelForBatch,
  normalizeCurrencyInput,
  MATERIAL_OPTIONS,
  PVC_COLOR_OPTIONS,
  normalizeSearchValue,
  type ComponentFormState,
  type PreferredProvider,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  normalizePricingMode,
  type PricingMode,
} from "@/features/cotizaciones/types/pricing-mode";
import {
  composeComponentReference,
  getConfigurationOptionsForComponent,
  getComponentTypeOptionsForCategory,
  getSystemOptionsForComponent,
  resolveComponentCategory,
  splitComponentReference,
  type ComponentCategoryTitle,
} from "@/features/cotizaciones/services/component-catalog.service";

export type PasoDosGrupoCategoria = ComponentCategoryTitle;

export type PasoDosGrupoDraft = {
  categoria: PasoDosGrupoCategoria;
  subtipo: string;
  cantidad: number;
  usaCantidadPersonalizada: boolean;
  cantidadPersonalizada: string;
  pricingMode: PricingMode;
  material: (typeof MATERIAL_OPTIONS)[number];
  colorHex: string;
  sistema: string;
  configuracion: string;
  vidrio: string;
  ancho: string;
  alto: string;
  precio: string;
  margenPct: string;
};

export type PasoDosGrupoPaso = 1 | 2 | 3 | 4 | 5;

type CreateInitialDraftParams = {
  items: CotizacionWorkflowItem[];
  pricingMode: PricingMode;
  provider: PreferredProvider;
  seedForm?: ComponentFormState | null;
};

type BuildGroupComponentFormParams = CreateInitialDraftParams & {
  draft: PasoDosGrupoDraft;
};

type BuildSelectionPatchParams = CreateInitialDraftParams & {
  current: PasoDosGrupoDraft;
  subtipo: string;
};

function sanitizeDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function resolveDefaultCategory(subtipo: string) {
  return resolveComponentCategory(subtipo);
}

export function resolveMaterialColorHex(
  material: PasoDosGrupoDraft["material"],
  currentColorHex?: string
) {
  const normalizedColor = currentColorHex?.trim().toLowerCase();

  if (material === "PVC") {
    const isKnownPvcColor = PVC_COLOR_OPTIONS.some(
      (option) => option.hex.toLowerCase() === normalizedColor
    );

    if (normalizedColor && isKnownPvcColor) {
      return currentColorHex ?? "#f0eeeb";
    }

    return "#f0eeeb";
  }

  const isKnownColor = ALUMINUM_COLOR_OPTIONS.some(
    (option) => option.hex.toLowerCase() === normalizedColor
  );

  if (
    !normalizedColor ||
    !isKnownColor ||
    normalizedColor === "#f0eeeb" ||
    normalizedColor === "#dfd5c4"
  ) {
    return "#a8a8a8";
  }

  return currentColorHex ?? "#a8a8a8";
}

export function getSubtypeOptionsForCategory(categoria: PasoDosGrupoCategoria) {
  return getComponentTypeOptionsForCategory(categoria);
}

export function getSystemOptionsForSubtype(subtipo: string) {
  return getSystemOptionsForComponent(subtipo);
}

export function getConfigurationOptionsForSubtype(subtipo: string) {
  return getConfigurationOptionsForComponent(subtipo);
}

export function getGlassOptionsForSubtype(subtipo: string) {
  const flattened = GLASS_OPTIONS.flatMap((group) =>
    group.items.map((item) => buildGlassValue(group.prefix, item))
  );

  const normalizedSubtype = normalizeSearchValue(subtipo);
  const preferredOptions =
    normalizedSubtype === "espejo"
      ? ["Esmerilado / Satinado", "Incoloro monolitico 5mm", "Laminado 3+3"]
      : normalizedSubtype === "shower door" || normalizedSubtype === "baranda"
        ? ["Templado 8mm", "Templado 10mm", "Templado 12mm", "Laminado 4+4"]
        : ["Incoloro monolitico 5mm", "Incoloro monolitico 6mm", "DVH 4+9+4", "Templado 8mm"];

  return Array.from(new Set([...preferredOptions, ...flattened]));
}

export function buildPasoDosGrupoSummary(draft: PasoDosGrupoDraft) {
  const cantidad = Math.max(1, draft.cantidad);
  const subtipo = getComponentTypeLabelForBatch(draft.subtipo, cantidad);
  const systemLabel = composeComponentReference(draft.sistema, draft.configuracion);

  return `${cantidad} ${subtipo} ${systemLabel.toLowerCase()} ${draft.material.toLowerCase()} con ${draft.vidrio.toLowerCase()}`;
}

export function createInitialPasoDosGrupoDraft({
  items,
  pricingMode,
  provider,
  seedForm,
}: CreateInitialDraftParams): PasoDosGrupoDraft {
  const seededSubtype = seedForm?.tipo?.trim() || getSubtypeOptionsForCategory("Aberturas")[0];
  const categoria = resolveDefaultCategory(seededSubtype);
  const suggestedForm = buildSuggestedComponentForm({
    items,
    tipo: seededSubtype,
    provider,
    pricingMode,
    current: seedForm ?? undefined,
  });
  const systemOptions = getSystemOptionsForSubtype(seededSubtype);
  const referenceParts = splitComponentReference(
    seedForm?.referencia || suggestedForm.referencia,
    seededSubtype
  );

  return {
    categoria,
    subtipo: seededSubtype,
    cantidad: Math.max(1, Number.parseInt(seedForm?.cantidad || "1", 10) || 1),
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    pricingMode: normalizePricingMode(seedForm?.pricingMode ?? pricingMode),
    material: suggestedForm.material,
    colorHex: resolveMaterialColorHex(suggestedForm.material, suggestedForm.colorHex),
    sistema: referenceParts.sistema || systemOptions[0] || "",
    configuracion: referenceParts.configuracion,
    vidrio: seedForm?.vidrio?.trim() || suggestedForm.vidrio,
    ancho: sanitizeDigits(seedForm?.ancho ?? ""),
    alto: sanitizeDigits(seedForm?.alto ?? ""),
    precio: sanitizeDigits(seedForm?.costoProveedorUnitario ?? ""),
    margenPct: sanitizeDigits(seedForm?.margenPct ?? suggestedForm.margenPct ?? "0"),
  };
}

export function buildPasoDosGrupoComponentForm({
  items,
  pricingMode,
  provider,
  draft,
}: BuildGroupComponentFormParams) {
  const baseForm = buildSuggestedComponentForm({
    items,
    tipo: draft.subtipo,
    provider,
    pricingMode,
    current: {
      tipo: draft.subtipo,
      material: draft.material,
      colorHex: draft.colorHex,
      referencia: composeComponentReference(draft.sistema, draft.configuracion),
      pricingMode: draft.pricingMode,
      vidrio: draft.vidrio,
      ancho: draft.ancho,
      alto: draft.alto,
      cantidad: String(Math.max(1, draft.cantidad)),
      costoProveedorUnitario: draft.precio,
      margenPct: draft.pricingMode === "precio_directo" ? "0" : draft.margenPct || "0",
      loteCantidad: "1",
    },
  });

  return {
    ...baseForm,
    material: draft.material,
    colorHex: draft.colorHex,
    referencia: composeComponentReference(draft.sistema, draft.configuracion),
    pricingMode: draft.pricingMode,
    vidrio: draft.vidrio,
    ancho: draft.ancho,
    alto: draft.alto,
    cantidad: String(Math.max(1, draft.cantidad)),
    costoProveedorUnitario: draft.precio,
    margenPct: draft.pricingMode === "precio_directo" ? "0" : draft.margenPct || "0",
    loteCantidad: "1",
  };
}

export function buildPasoDosGrupoSelectionPatch({
  current,
  items,
  pricingMode,
  provider,
  subtipo,
}: BuildSelectionPatchParams) {
  const suggestedForm = buildSuggestedComponentForm({
    items,
    tipo: subtipo,
    provider,
    pricingMode,
  });
  const systemOptions = getSystemOptionsForSubtype(subtipo);
  const configurationOptions = getConfigurationOptionsForSubtype(subtipo);

  return {
    subtipo,
    pricingMode: normalizePricingMode(current.pricingMode),
    material: suggestedForm.material,
    colorHex: resolveMaterialColorHex(suggestedForm.material, suggestedForm.colorHex),
    sistema: systemOptions[0] || "",
    configuracion: configurationOptions[0] || "",
    vidrio: suggestedForm.vidrio,
  } satisfies Pick<
    PasoDosGrupoDraft,
    | "subtipo"
    | "pricingMode"
    | "material"
    | "colorHex"
    | "sistema"
    | "configuracion"
    | "vidrio"
  >;
}

export function usePasoDosAgregarGrupo(params: CreateInitialDraftParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [paso, setPaso] = useState<PasoDosGrupoPaso>(1);
  const [draft, setDraft] = useState<PasoDosGrupoDraft>(() => createInitialPasoDosGrupoDraft(params));

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
  const summary = useMemo(() => buildPasoDosGrupoSummary(draft), [draft]);

  const openSheet = (seedForm?: ComponentFormState | null) => {
    const nextDraft = createInitialPasoDosGrupoDraft({
      items: params.items,
      pricingMode: params.pricingMode,
      provider: params.provider,
      seedForm: seedForm ?? params.seedForm ?? undefined,
    });

    setDraft(nextDraft);
    setPaso(1);
    setIsOpen(true);
  };

  const restart = (seedForm?: ComponentFormState | null) => {
    setDraft(
      createInitialPasoDosGrupoDraft({
        items: params.items,
        pricingMode: params.pricingMode,
        provider: params.provider,
        seedForm: seedForm ?? params.seedForm ?? undefined,
      })
    );
    setPaso(1);
  };

  const closeSheet = () => {
    setIsOpen(false);
    setPaso(1);
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
    setPaso(3);
  };

  const selectCantidad = (cantidad: number) => {
    setDraft((current) => ({
      ...current,
      cantidad: Math.max(1, cantidad),
      usaCantidadPersonalizada: false,
      cantidadPersonalizada: "",
    }));
  };

  const enableCustomQuantity = () => {
    setDraft((current) => ({
      ...current,
      usaCantidadPersonalizada: true,
      cantidadPersonalizada: current.cantidad > 4 ? String(current.cantidad) : "",
    }));
  };

  const updateCustomQuantity = (value: string) => {
    const digitsOnly = sanitizeDigits(value);
    const parsed = Number.parseInt(digitsOnly || "0", 10);

    setDraft((current) => ({
      ...current,
      usaCantidadPersonalizada: true,
      cantidadPersonalizada: digitsOnly,
      cantidad: digitsOnly && parsed > 0 ? parsed : current.cantidad,
    }));
  };

  const updateMaterial = (material: PasoDosGrupoDraft["material"]) => {
    setDraft((current) => ({
      ...current,
      material,
      colorHex: resolveMaterialColorHex(material, current.colorHex),
    }));
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
    setDraft((current) => ({ ...current, ancho: sanitizeDigits(value) }));
  };

  const updateAlto = (value: string) => {
    setDraft((current) => ({ ...current, alto: sanitizeDigits(value) }));
  };

  const updatePrecio = (value: string) => {
    setDraft((current) => ({
      ...current,
      precio: normalizeCurrencyInput(value),
    }));
  };

  const goBack = () => {
    setPaso((current) => (current > 1 ? ((current - 1) as PasoDosGrupoPaso) : current));
  };

  const goNext = () => {
    setPaso((current) => (current < 5 ? ((current + 1) as PasoDosGrupoPaso) : current));
  };

  const canContinueFromQuantity =
    !draft.usaCantidadPersonalizada ||
    (draft.cantidadPersonalizada.trim() !== "" && Number(draft.cantidadPersonalizada) > 0);
  const canContinueFromConfig = draft.sistema.trim() !== "" && draft.vidrio.trim() !== "";

  return {
    isOpen,
    paso,
    draft,
    subtypeOptions,
    systemOptions,
    configurationOptions,
    glassOptions,
    summary,
    openSheet,
    restart,
    closeSheet,
    selectCategoria,
    selectSubtipo,
    selectCantidad,
    enableCustomQuantity,
    updateCustomQuantity,
    updateMaterial,
    updateColorHex,
    updateSistema,
    updateConfiguracion,
    updateVidrio,
    updateAncho,
    updateAlto,
    updatePrecio,
    goBack,
    goNext,
    canContinueFromQuantity,
    canContinueFromConfig,
  };
}
