"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ALUMINUM_COLOR_OPTIONS,
  buildItemFromForm,
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
  type CostInputScope,
} from "@/features/cotizaciones/types/pricing-mode";
import {
  composeComponentReference,
  getBaseLeafCountForComponent,
  getConfigurationOptionsForComponent,
  getConfigurationOptionsForComponentSistema,
  getComponentTypeOptionsForCategory,
  getSystemOptionsForComponent,
  hasPerSystemConfigurations,
  isFreeValueComponentType,
  resolveCanonicalComponentType,
  resolveComponentCategory,
  splitComponentReference,
  type ComponentCategoryTitle,
} from "@/features/cotizaciones/services/component-catalog.service";

export type PasoDosGrupoCategoria = ComponentCategoryTitle;

export type AlcanceDetalleTipo = "manual" | "estructurado";

export type AlcanceDetalle = {
  id: string;
  tipo: AlcanceDetalleTipo;
  nombre: string;
  cantidad: string;
  ancho: string;
  alto: string;
  descripcion: string;
  subtipo: string;
};

export const ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS = [
  "Ventana",
  "Puerta",
  "Paño fijo",
  "Shower door",
  "Baranda",
  "Espejo",
] as const;

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
  alcanceDetalles: AlcanceDetalle[];
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
  precioAjustadoManual: boolean;
  margenPct: string;
  palilloEnabled: boolean;
  palilloType: string;
  costInputScope: CostInputScope;
};

export type PasoDosGrupoPaso = 1 | 2 | 3 | 4 | 5;

export type PasoDosGrupoEntryMode = "normal" | "free_total_single";

export const FREE_TOTAL_NOTEBOOK_SUBTIPO = "Trabajo libre / Mantencion";
export const FREE_TOTAL_NOTEBOOK_CATEGORIA = "Proyecto libre y Mantencion" as const;

export function shouldHideFreeNotebookCategoryInWizard(
  quotePricingMode: QuotePricingMode,
  entryMode: PasoDosGrupoEntryMode
) {
  return quotePricingMode === "total_global" && entryMode === "normal";
}

export function buildFreeTotalNotebookDraftState(
  params: CreateInitialDraftParams
): PasoDosGrupoDraft {
  const initial = createInitialPasoDosGrupoDraft(params);
  const current = { ...initial, categoria: FREE_TOTAL_NOTEBOOK_CATEGORIA };

  return {
    ...current,
    ...buildPasoDosGrupoSelectionPatch({
      current,
      items: params.items,
      pricingMode: params.pricingMode,
      provider: params.provider,
      subtipo: FREE_TOTAL_NOTEBOOK_SUBTIPO,
    }),
    cantidad: 1,
  };
}

export function resolveFreeTotalNotebookEditScope(
  items: CotizacionWorkflowItem[],
  clickedItemId: string
) {
  const freeItems = items.filter((item) => item.tipoItem === "item_libre_con_valor");
  const mainItem =
    [...freeItems].sort((left, right) =>
      left.codigo.localeCompare(right.codigo, undefined, { numeric: true })
    )[0] ?? items.find((item) => item.id === clickedItemId);

  if (!mainItem) {
    throw new Error("No se encontro el trabajo libre a editar");
  }

  return {
    mainItem,
    mainItemId: mainItem.id,
    detailItems: freeItems.filter((item) => item.id !== mainItem.id),
    editingItemIds: freeItems.map((item) => item.id),
  };
}

export function buildFreeTotalNotebookDraftFromWorkflow(
  params: CreateInitialDraftParams & {
    mainItem: CotizacionWorkflowItem;
    detailItems: CotizacionWorkflowItem[];
    totalClienteManual: number | null;
  }
): PasoDosGrupoDraft {
  const base = buildFreeTotalNotebookDraftState(params);
  const totalValue =
    params.totalClienteManual !== null &&
    params.totalClienteManual !== undefined &&
    params.totalClienteManual > 0
      ? String(Math.round(params.totalClienteManual))
      : "";

  return {
    ...base,
    nombre: params.mainItem.nombre,
    descripcion: params.mainItem.descripcion ?? "",
    precio: totalValue,
    alcanceDetalles: params.detailItems.map((item) => ({
      ...createEmptyAlcanceDetalle("manual", item.nombre.trim()),
      nombre: item.nombre.trim() || item.descripcion.trim(),
      descripcion: item.descripcion ?? "",
      cantidad: String(item.cantidad > 0 ? item.cantidad : 1),
    })),
  };
}

type CreateInitialDraftParams = {
  items: CotizacionWorkflowItem[];
  pricingMode: PricingMode;
  quotePricingMode?: QuotePricingMode;
  provider: PreferredProvider;
  seedForm?: ComponentFormState | null;
  onSheetClosed?: (itemCount: number) => void;
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

export function shouldSkipCantidadForGrupoDraft(
  draft?: Pick<PasoDosGrupoDraft, "categoria" | "subtipo">
) {
  if (!draft) return false;

  if (draft.categoria === FREE_TOTAL_NOTEBOOK_CATEGORIA) {
    return true;
  }

  if (safeTrim(draft.subtipo) === FREE_TOTAL_NOTEBOOK_SUBTIPO) {
    return true;
  }

  return false;
}

export function createEmptyAlcanceDetalle(
  tipo: AlcanceDetalleTipo = "manual",
  initialNombre = ""
): AlcanceDetalle {
  return {
    id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    nombre: initialNombre,
    cantidad: "1",
    ancho: "",
    alto: "",
    descripcion: "",
    subtipo: ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS[0],
  };
}

export function buildStructuredAlcanceDetalleForm(input: {
  detalle: AlcanceDetalle;
  items: CotizacionWorkflowItem[];
  provider: PreferredProvider;
}) {
  const subtipo = resolveCanonicalComponentType(
    safeTrim(input.detalle.subtipo) || ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS[0]
  );
  const cantidad = sanitizeDigits(input.detalle.cantidad) || "1";
  const ancho = sanitizeDigits(input.detalle.ancho);
  const alto = sanitizeDigits(input.detalle.alto);
  const manualName = safeTrim(input.detalle.nombre);
  const description = safeTrim(input.detalle.descripcion);

  return buildSuggestedComponentForm({
    items: input.items,
    tipo: subtipo,
    provider: input.provider,
    pricingMode: "precio_directo",
    current: {
      tipo: subtipo,
      material: "Aluminio",
      referencia: "",
      sistema: "",
      configuracion: "",
      sheetScheme: "",
      sheetVariant: "",
      customSchemeDescription: "",
      isCustomScheme: false,
      lineTemplateId: "",
      pricingMode: "precio_directo",
      vidrio: "",
      nombre: manualName,
      descripcion: description,
      ancho,
      alto,
      cantidad,
      costoProveedorUnitario: "0",
      margenPct: "0",
      precioPorM2: "",
      minimoCobrable: "",
      redondeoPrecio: "1000",
      precioPlantillaSugerido: "",
      precioAjustadoManual: false,
      origenPrecio: "manual",
      observaciones: description,
      colorHex: "#a8a8a8",
      loteCantidad: "1",
    },
  });
}

export function buildStructuredAlcanceDetalleItem(input: {
  detalle: AlcanceDetalle;
  items: CotizacionWorkflowItem[];
  provider: PreferredProvider;
}) {
  return buildItemFromForm(
    buildStructuredAlcanceDetalleForm(input),
    input.items,
    null,
    { quotePricingMode: "total_global" }
  );
}

function buildDefaultFreeValueName(subtipo: string) {
  if (!isFreeValueComponentType(subtipo)) {
    return "";
  }

  return "";
}

export function syncDraftTemplatePricing(draft: PasoDosGrupoDraft): PasoDosGrupoDraft {
  if (!safeTrim(draft.referencia) || !safeTrim(draft.precioPorM2)) {
    return draft;
  }

  if (draft.pricingMode === "margen") {
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

  if (draft.precioAjustadoManual || pricing.totalSugerido === null) {
    return draft;
  }

  return {
    ...draft,
    precio: String(Math.round(pricing.totalSugerido)),
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
    precioAjustadoManual: false,
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

export function getConfigurationOptionsForSubtype(subtipo: string, sistema?: string) {
  if (sistema && hasPerSystemConfigurations(subtipo)) {
    return getConfigurationOptionsForComponentSistema(subtipo, sistema);
  }

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
  const resolvedSistema = seedForm?.sistema?.trim() || systemOptions[0] || "";
  const referenceParts = splitComponentReference(
    seedForm?.referencia || suggestedForm.referencia,
    seededSubtype,
    resolvedSistema
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
    alcanceDetalles: [],
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
    precioAjustadoManual: seedForm?.precioAjustadoManual ?? false,
    margenPct: sanitizeDigits(seedForm?.margenPct ?? suggestedForm.margenPct ?? "0"),
    ivaMode: "total_incluye_iva",
    palilloEnabled: seedForm?.palilloEnabled ?? false,
    palilloType: seedForm?.palilloType ?? "",
    costInputScope: seedForm?.costInputScope ?? "group_total" as CostInputScope,
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
      precioAjustadoManual: draft.precioAjustadoManual,
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
    precioAjustadoManual: draft.precioAjustadoManual,
    loteCantidad: "1",
    palilloEnabled: draft.palilloEnabled,
    palilloType: draft.palilloType,
    costInputScope: draft.costInputScope,
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
  const defaultSistema = systemOptions[0] || "";
  const configurationOptions = getConfigurationOptionsForSubtype(subtipo, defaultSistema);

  return {
    subtipo,
    hojasBase: getBaseLeafCountForComponent(subtipo),
    cantidad: current.cantidad > 0 ? current.cantidad : 1,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    pricingMode: normalizePricingMode(current.pricingMode),
    material: suggestedForm.material,
    colorHex: resolveMaterialColorHex(suggestedForm.material, suggestedForm.colorHex),
    sistema: defaultSistema,
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
    alcanceDetalles: [],
    vidrio: suggestedForm.vidrio,
    palilloEnabled: false,
    palilloType: "",
    costInputScope: "group_total" as CostInputScope,
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
    | "alcanceDetalles"
    | "vidrio"
    | "palilloEnabled"
    | "palilloType"
    | "costInputScope"
  >;
}

export function usePasoDosAgregarGrupo(params: CreateInitialDraftParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [paso, setPaso] = useState<PasoDosGrupoPaso>(1);
  const [entryMode, setEntryMode] = useState<PasoDosGrupoEntryMode>("normal");
  const [editingFreeTotalMainItemId, setEditingFreeTotalMainItemId] = useState<string | null>(null);
  const [editingFreeTotalItemIds, setEditingFreeTotalItemIds] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<PasoDosGrupoDraft>(() => createInitialPasoDosGrupoDraft(params));

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
  const summary = useMemo(() => buildPasoDosGrupoSummary(draft), [draft]);

  const openSheet = (seedForm?: ComponentFormState | null) => {
    const nextDraft = createInitialPasoDosGrupoDraft({
      items: params.items,
      pricingMode: params.pricingMode,
      provider: params.provider,
      seedForm: seedForm ?? params.seedForm ?? undefined,
    });

    setDraft(nextDraft);
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
    setPaso(4);
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
    setPaso(4);
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
    setDraft((current) => ({ ...current, ancho: sanitizeDigits(value) }));
  };

  const updateAlto = (value: string) => {
    setDraft((current) => ({ ...current, alto: sanitizeDigits(value) }));
  };

  const updatePrecio = (value: string) => {
    setDraft((current) => ({
      ...current,
      precio: normalizeCurrencyInput(value),
      precioAjustadoManual: true,
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
      : draft.sistema.trim() !== "" &&
        (!hasPerSystemConfigurations(draft.subtipo) || draft.configuracion.trim() !== "") &&
        draft.vidrio.trim() !== "";

  return {
    isOpen,
    paso,
    entryMode,
    draft,
    subtypeOptions,
    systemOptions,
    configurationOptions,
    glassOptions,
    summary,
    openSheet,
    openFreeTotalNotebook,
    openFreeTotalNotebookForEdit,
    editingFreeTotalMainItemId,
    editingFreeTotalItemIds,
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
    addAlcanceDetalle,
    updateAlcanceDetalle,
    removeAlcanceDetalle,
    goBack,
    goNext,
    canContinueFromQuantity,
    canContinueFromConfig,
  };
}
