"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ALUMINUM_COLOR_OPTIONS,
  buildGlassValue,
  buildCommercialComponentDisplayName,
  buildSheetSchemeLabel,
  buildSuggestedComponentForm,
  GLASS_OPTIONS,
  getSheetSchemeOptions,
  getComponentTypeLabelForBatch,
  normalizeCurrencyInput,
  MATERIAL_OPTIONS,
  PVC_COLOR_OPTIONS,
  normalizeSearchValue,
  shouldShowSheetSchemeForComponent,
  shouldShowSystemSelectionForComponent,
  syncTemplatePricingInComponentForm,
  type ComponentFormState,
  type PreferredProvider,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { calculateLineTemplatePricing } from "@/features/cotizaciones/services/cotizacion-line-pricing.service";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  normalizePricingMode,
  type PricingMode,
} from "@/features/cotizaciones/types/pricing-mode";
import {
  composeComponentReference,
  getBaseLeafCountForComponent,
  getConfigurationOptionsForComponent,
  getComponentTypeOptionsForCategory,
  getSystemOptionsForComponent,
  isFreeValueComponentType,
  resolveCanonicalComponentType,
  resolveComponentCategory,
  splitComponentReference,
  type ComponentCategoryTitle,
} from "@/features/cotizaciones/services/component-catalog.service";

export type PasoDosGrupoCategoria = ComponentCategoryTitle;

export type PasoDosGrupoDraft = {
  categoria: PasoDosGrupoCategoria;
  subtipo: string;
  hojasBase: 1 | 2 | null;
  cantidad: number;
  usaCantidadPersonalizada: boolean;
  cantidadPersonalizada: string;
  nombre: string;
  descripcion: string;
  ivaMode: "total_incluye_iva" | "neto_mas_iva";
  cobraPrecioSeparado: boolean;
  pricingMode: PricingMode;
  material: (typeof MATERIAL_OPTIONS)[number];
  colorHex: string;
  sistema: string;
  configuracion: string;
  sheetScheme: string;
  sheetVariant: string;
  customSchemeDescription: string;
  isCustomScheme: boolean;
  vidrio: string;
  lineTemplateId: string;
  referencia: string;
  ancho: string;
  alto: string;
  precio: string;
  precioPorM2: string;
  minimoCobrable: string;
  redondeoPrecio: string;
  margenPct: string;
};

export type PasoDosGrupoPaso = 1 | 2 | 3 | 4 | 5;

type CreateInitialDraftParams = {
  items: CotizacionWorkflowItem[];
  pricingMode: PricingMode;
  quotePricingMode?: QuotePricingMode;
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

function safeTrim(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function isProyectoLibreMantencion(categoria: PasoDosGrupoCategoria) {
  return categoria === "Proyecto libre y Mantencion";
}

export function shouldSkipCantidadForGrupoDraft(
  draft: Pick<PasoDosGrupoDraft, "categoria" | "subtipo">
) {
  return isProyectoLibreMantencion(draft.categoria) && isFreeValueComponentType(draft.subtipo);
}

function buildDefaultFreeValueName(subtipo: string) {
  if (!isFreeValueComponentType(subtipo)) {
    return "";
  }

  if (subtipo === "Item libre con valor") {
    return "Trabajo adicional";
  }

  return subtipo;
}

export function syncDraftTemplatePricing(draft: PasoDosGrupoDraft): PasoDosGrupoDraft {
  if (!safeTrim(draft.referencia) || !safeTrim(draft.precioPorM2)) {
    return draft;
  }

  const pricing = calculateLineTemplatePricing({
    ancho: draft.ancho ? Number(draft.ancho) : null,
    alto: draft.alto ? Number(draft.alto) : null,
    cantidad: draft.cantidad,
    precioM2Sugerido: draft.precioPorM2 ? Number(draft.precioPorM2) : null,
    minimoCobrable: draft.minimoCobrable ? Number(draft.minimoCobrable) : 0,
    redondeoPrecio: draft.redondeoPrecio ? Number(draft.redondeoPrecio) : 1000,
  });

  if (pricing.precioUnitarioSugerido === null) {
    return draft;
  }

  return {
    ...draft,
    precio: String(Math.round(pricing.precioUnitarioSugerido)),
  };
}

export function applyLineTemplateToGrupoDraft(
  draft: PasoDosGrupoDraft,
  template: Pick<
    CotizacionLineTemplate,
    | "id"
    | "nombre"
    | "material"
    | "vidrioPrincipalRecomendado"
    | "precioM2Sugerido"
    | "minimoCobrable"
    | "redondeoPrecio"
  >
): PasoDosGrupoDraft {
  return syncDraftTemplatePricing({
    ...draft,
    material: template.material,
    lineTemplateId: String(template.id),
    referencia: template.nombre,
    vidrio: template.vidrioPrincipalRecomendado?.trim() || draft.vidrio,
    pricingMode: "precio_directo",
    precioPorM2: String(Math.round(template.precioM2Sugerido)),
    minimoCobrable: String(Math.round(template.minimoCobrable)),
    redondeoPrecio: String(Math.round(template.redondeoPrecio || 1000)),
    margenPct: "0",
  });
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
  if (draft.subtipo === "Trabajo personalizado") {
    const customText =
      (draft.descripcion ?? "").trim() ||
      (draft.nombre ?? "").trim() ||
      "Trabajo personalizado";
    return `${cantidad} ${customText}`;
  }

  const subtipo = getComponentTypeLabelForBatch(draft.subtipo, cantidad);
  const systemLabel = composeComponentReference(draft.sistema, draft.configuracion);
  const sheetLabel = buildSheetSchemeLabel(draft);
  const baseName = buildCommercialComponentDisplayName({
    tipo: draft.subtipo,
    sistema: draft.sistema,
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
    customSchemeDescription: draft.customSchemeDescription,
    isCustomScheme: draft.isCustomScheme,
  });

  if (
    shouldShowSheetSchemeForComponent({ tipo: draft.subtipo, sistema: draft.sistema }) &&
    sheetLabel
  ) {
    return `${cantidad} ${baseName} ${draft.material.toLowerCase()} con ${draft.vidrio.toLowerCase()}`;
  }

  const systemSegment = shouldShowSystemSelectionForComponent(draft.subtipo)
    ? ` ${systemLabel.toLowerCase()}`
    : "";

  return `${cantidad} ${subtipo}${systemSegment} ${draft.material.toLowerCase()} con ${draft.vidrio.toLowerCase()}`;
}

export function createInitialPasoDosGrupoDraft({
  items,
  pricingMode,
  provider,
  seedForm,
}: CreateInitialDraftParams): PasoDosGrupoDraft {
  const seededSubtype = resolveCanonicalComponentType(
    seedForm?.tipo?.trim() || getSubtypeOptionsForCategory("Aberturas")[0]
  );
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
  const referencia = seedForm?.referencia ?? suggestedForm.referencia ?? "";

  return {
    categoria,
    subtipo: seededSubtype,
    hojasBase: seedForm?.hojasBase ?? getBaseLeafCountForComponent(seededSubtype),
    cantidad: Math.max(1, Number.parseInt(seedForm?.cantidad || "1", 10) || 1),
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    nombre: seedForm?.nombre ?? "",
    descripcion:
      seededSubtype === "Trabajo personalizado"
        ? seedForm?.descripcion ?? ""
        : seedForm?.descripcion ?? suggestedForm.descripcion,
    cobraPrecioSeparado: false,
    pricingMode: normalizePricingMode(seedForm?.pricingMode ?? pricingMode),
    material: suggestedForm.material,
    colorHex: resolveMaterialColorHex(suggestedForm.material, suggestedForm.colorHex),
    sistema: seedForm?.sistema?.trim() || referenceParts.sistema || systemOptions[0] || "",
    configuracion: seedForm?.configuracion?.trim() || referenceParts.configuracion,
    sheetScheme: seedForm?.sheetScheme ?? "",
    sheetVariant: seedForm?.sheetVariant ?? "",
    customSchemeDescription: seedForm?.customSchemeDescription ?? "",
    isCustomScheme: seedForm?.isCustomScheme ?? false,
    vidrio: seedForm?.vidrio?.trim() || suggestedForm.vidrio,
    lineTemplateId: seedForm?.lineTemplateId ?? "",
    referencia,
    ancho: sanitizeDigits(seedForm?.ancho ?? ""),
    alto: sanitizeDigits(seedForm?.alto ?? ""),
    precio: sanitizeDigits(seedForm?.costoProveedorUnitario ?? ""),
    precioPorM2: sanitizeDigits(seedForm?.precioPorM2 ?? ""),
    minimoCobrable: sanitizeDigits(seedForm?.minimoCobrable ?? ""),
    redondeoPrecio: sanitizeDigits(seedForm?.redondeoPrecio ?? "1000"),
    margenPct: sanitizeDigits(seedForm?.margenPct ?? suggestedForm.margenPct ?? "0"),
    ivaMode: "total_incluye_iva",
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
      hojasBase: draft.hojasBase,
      material: draft.material,
      colorHex: draft.colorHex,
      referencia: composeComponentReference(draft.sistema, draft.configuracion),
      sistema: draft.sistema,
      configuracion: draft.configuracion,
      sheetScheme: draft.sheetScheme,
      sheetVariant: draft.sheetVariant,
      customSchemeDescription: draft.customSchemeDescription,
      isCustomScheme: draft.isCustomScheme,
      nombre: draft.nombre ?? "",
      descripcion: draft.descripcion ?? "",
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

  return syncTemplatePricingInComponentForm({
    ...baseForm,
    hojasBase: draft.hojasBase,
    material: draft.material,
    colorHex: draft.colorHex,
    referencia:
      safeTrim(draft.referencia) ||
      composeComponentReference(draft.sistema, draft.configuracion),
    sistema: draft.sistema,
    configuracion: draft.configuracion,
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
    customSchemeDescription: draft.customSchemeDescription,
    isCustomScheme: draft.isCustomScheme,
    nombre: draft.nombre ?? "",
    descripcion: draft.descripcion ?? "",
    lineTemplateId: draft.lineTemplateId,
    pricingMode: draft.pricingMode,
    vidrio: draft.vidrio,
    ancho: draft.ancho,
    alto: draft.alto,
    cantidad: String(Math.max(1, draft.cantidad)),
    costoProveedorUnitario: draft.precio,
    margenPct: draft.pricingMode === "precio_directo" ? "0" : draft.margenPct || "0",
    precioPorM2: draft.precioPorM2,
    minimoCobrable: draft.minimoCobrable,
    redondeoPrecio: draft.redondeoPrecio || "1000",
    loteCantidad: "1",
  });
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
    hojasBase: getBaseLeafCountForComponent(subtipo),
    cantidad: isProyectoLibreMantencion(current.categoria) ? 1 : current.cantidad,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    pricingMode: normalizePricingMode(current.pricingMode),
    material: suggestedForm.material,
    colorHex: resolveMaterialColorHex(suggestedForm.material, suggestedForm.colorHex),
    sistema: systemOptions[0] || "",
    configuracion: configurationOptions[0] || "",
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
    nombre: buildDefaultFreeValueName(subtipo),
    descripcion: isFreeValueComponentType(subtipo)
      ? ""
      : subtipo === "Trabajo personalizado"
        ? ""
        : suggestedForm.descripcion,
    cobraPrecioSeparado: false,
    vidrio: suggestedForm.vidrio,
  } satisfies Pick<
    PasoDosGrupoDraft,
    | "subtipo"
    | "hojasBase"
    | "cantidad"
    | "usaCantidadPersonalizada"
    | "cantidadPersonalizada"
    | "pricingMode"
    | "material"
    | "colorHex"
    | "sistema"
    | "configuracion"
    | "sheetScheme"
    | "sheetVariant"
    | "customSchemeDescription"
    | "isCustomScheme"
    | "nombre"
    | "descripcion"
    | "cobraPrecioSeparado"
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
    const forcedGlobalNotebook =
      params.quotePricingMode === "total_global" && subtipo === "Trabajo personalizado";
    const shouldSkipCantidad =
      forcedGlobalNotebook ||
      shouldSkipCantidadForGrupoDraft({
        categoria: draft.categoria,
        subtipo,
      });

    setDraft((current) => ({
      ...current,
      ...(forcedGlobalNotebook ? { categoria: "Proyecto libre y Mantencion" as const } : {}),
      ...buildPasoDosGrupoSelectionPatch({
        current: forcedGlobalNotebook
          ? { ...current, categoria: "Proyecto libre y Mantencion" as const }
          : current,
        items: params.items,
        pricingMode: params.pricingMode,
        provider: params.provider,
        subtipo,
      }),
    }));
    setPaso(shouldSkipCantidad ? 4 : 3);
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
    setDraft((current) => {
      const sheetSchemeOptions = getSheetSchemeOptions({ tipo: current.subtipo, sistema });
      const shouldKeepComposition =
        shouldShowSheetSchemeForComponent({ tipo: current.subtipo, sistema }) &&
        sheetSchemeOptions.includes(current.sheetScheme);

      return {
        ...current,
        sistema,
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
    setPaso((current) => {
      if (current <= 1) {
        return current;
      }

      const isFreeValue = isFreeValueComponentType(draft.subtipo);
      const shouldSkipCantidad = shouldSkipCantidadForGrupoDraft(draft);

      if (current === 4 && isFreeValue && shouldSkipCantidad) {
        return 2 as PasoDosGrupoPaso;
      }

      return (current - 1) as PasoDosGrupoPaso;
    });
  };

  const goNext = () => {
    setPaso((current) => {
      if (current >= 5) {
        return current;
      }

      const isFreeValue = isFreeValueComponentType(draft.subtipo);
      const shouldSkipCantidad = shouldSkipCantidadForGrupoDraft(draft);

      if (current === 2 && isFreeValue && shouldSkipCantidad) {
        return 4 as PasoDosGrupoPaso;
      }

      return (current + 1) as PasoDosGrupoPaso;
    });
  };

  const canContinueFromQuantity =
    !draft.usaCantidadPersonalizada ||
    (draft.cantidadPersonalizada.trim() !== "" && Number(draft.cantidadPersonalizada) > 0);
  const isTrabajoPersonalizado = draft.subtipo === "Trabajo personalizado";
  const isFreeValueItem = isFreeValueComponentType(draft.subtipo);
  const canContinueFromConfig = isFreeValueItem
    ? (draft.nombre ?? "").trim() !== "" &&
      (params.quotePricingMode === "total_global" && !draft.cobraPrecioSeparado
        ? true
        : (draft.precio ?? "").trim() !== "")
    : isTrabajoPersonalizado
      ? (draft.nombre ?? "").trim() !== "" || (draft.descripcion ?? "").trim() !== ""
      : draft.sistema.trim() !== "" && draft.vidrio.trim() !== "";

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
    goBack,
    goNext,
    canContinueFromQuantity,
    canContinueFromConfig,
  };
}
