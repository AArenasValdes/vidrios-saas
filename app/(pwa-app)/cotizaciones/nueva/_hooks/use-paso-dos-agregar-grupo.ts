"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ALUMINUM_COLOR_OPTIONS,
  buildItemFromForm,
  buildGlassValue,
  buildCommercialComponentDisplayName,
  buildSheetSchemeLabel,
  buildSuggestedComponentForm,
  filterLineTemplatesForComponent,
  GLASS_OPTIONS,
  getSheetSchemeOptions,
  getComponentTypeLabelForBatch,
  normalizeCurrencyInput,
  MATERIAL_OPTIONS,
  PVC_COLOR_OPTIONS,
  MIRROR_GLASS_THICKNESS_OPTIONS,
  normalizeSearchValue,
  shouldRequireProfileMaterialForComponent,
  shouldAutoSelectFirstSheetScheme,
  shouldShowSheetSchemeForComponent,
  shouldShowSystemSelectionForComponent,
  syncTemplatePricingInComponentForm,
  type ComponentFormState,
  type PreferredProvider,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { describeGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  getLineTemplateGlassMetadata,
  type CotizacionLineTemplate,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { calculateLineTemplatePricing } from "@/features/cotizaciones/services/cotizacion-line-pricing.service";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  DEFAULT_MARGIN_PCT,
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
import { mergeGlassOptions } from "@/features/cotizaciones/new-quote/custom-glass-options";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

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

export type PasoDosGrupoPriceInputMode = "line_m2" | "unit_direct" | "piece_total";

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
  priceInputMode: PasoDosGrupoPriceInputMode;
  material: (typeof MATERIAL_OPTIONS)[number];
  catalogCategoria: ComponentFormState["catalogCategoria"];
  catalogEspesor: string;
  catalogTerminacion: string;
  colorHex: string;
  sistema: string;
  configuracion: string;
  sheetScheme: string;
  sheetVariant: string;
  customSchemeDescription: string;
  isCustomScheme: boolean;
  mirrorFormat: NonNullable<ComponentFormState["mirrorFormat"]>;
  mirrorPaneCount: number | null;
  mirrorPaneDirection: NonNullable<ComponentFormState["mirrorPaneDirection"]>;
  mirrorInteriorLine: NonNullable<ComponentFormState["mirrorInteriorLine"]>;
  mirrorCustomPaneCount: string;
  guidedVisualConfig: GuidedVisualConfig | null;
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

  const componentItems = items.filter(
    (item) => item.id !== mainItem.id && item.tipoItem !== "item_libre_con_valor"
  );
  const detailItems = [
    ...freeItems.filter((item) => item.id !== mainItem.id),
    ...componentItems,
  ];

  return {
    mainItem,
    mainItemId: mainItem.id,
    detailItems,
    editingItemIds: [mainItem.id, ...detailItems.map((item) => item.id)],
  };
}

export function resolveTotalGlobalLeadItem(
  items: CotizacionWorkflowItem[]
): CotizacionWorkflowItem | null {
  const leadCandidates = items.filter((item) => {
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
    return item.tipoItem === "item_libre_con_valor" || meta.displayMode === "item_libre";
  });

  if (leadCandidates.length === 0) {
    return null;
  }

  return [...leadCandidates].sort((left, right) =>
    left.codigo.localeCompare(right.codigo, undefined, { numeric: true })
  )[0];
}

export function resolveTotalGlobalNestedDetailItems(
  items: CotizacionWorkflowItem[],
  nestedItemIds?: string[] | null
): CotizacionWorkflowItem[] {
  if (nestedItemIds && nestedItemIds.length > 0) {
    const nestedSet = new Set(nestedItemIds);
    return items.filter((item) => nestedSet.has(item.id));
  }

  const lead = resolveTotalGlobalLeadItem(items);
  if (!lead) {
    return [];
  }

  return items.filter((item) => item.id !== lead.id);
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
  customGlassOptions?: readonly string[];
  activeLineTemplates?: readonly CotizacionLineTemplate[];
  onSheetClosed?: (itemCount: number) => void;
  lockBodyScroll?: boolean;
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
      catalogCategoria: "aluminio",
      catalogEspesor: "",
      catalogTerminacion: "",
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

function moneyToNumber(value: string | null | undefined) {
  return Number(String(value ?? "").replace(/[^\d]/g, "")) || 0;
}

export function buildGrupoDraftLinePricingSummary(
  draft: Pick<
    PasoDosGrupoDraft,
    "ancho" | "alto" | "cantidad" | "precioPorM2" | "minimoCobrable" | "redondeoPrecio"
  >
) {
  return calculateLineTemplatePricing({
    ancho: draft.ancho ? Number(draft.ancho) : null,
    alto: draft.alto ? Number(draft.alto) : null,
    cantidad: draft.cantidad,
    precioM2Sugerido: draft.precioPorM2 ? Number(draft.precioPorM2) : null,
    minimoCobrable: draft.minimoCobrable ? Number(draft.minimoCobrable) : 0,
    redondeoPrecio: draft.redondeoPrecio ? Number(draft.redondeoPrecio) : 1000,
  });
}

export function resolveGrupoDraftSubtotal(draft: PasoDosGrupoDraft) {
  const qty = Math.max(1, draft.cantidad);

  if (draft.priceInputMode === "piece_total") {
    const total = moneyToNumber(draft.precio);
    return total;
  }

  if (draft.priceInputMode === "unit_direct") {
    return Math.round(moneyToNumber(draft.precio) * qty);
  }

  if (draft.precioAjustadoManual && moneyToNumber(draft.precio) > 0) {
    return Math.round(moneyToNumber(draft.precio) * qty);
  }

  const summary = buildGrupoDraftLinePricingSummary(draft);
  return Math.round(summary.totalSugerido ?? 0);
}

export function resolveGrupoDraftReferentialUnitPrice(draft: PasoDosGrupoDraft) {
  const qty = Math.max(1, draft.cantidad);

  if (draft.priceInputMode === "piece_total") {
    const total = moneyToNumber(draft.precio);
    return total > 0 ? total / qty : 0;
  }

  return resolveGrupoDraftUnitPrice(draft);
}

export function resolveGrupoDraftUnitPrice(draft: PasoDosGrupoDraft) {
  const qty = Math.max(1, draft.cantidad);
  const subtotal = resolveGrupoDraftSubtotal(draft);

  if (subtotal <= 0) {
    return 0;
  }

  return Math.round(subtotal / qty);
}

export function isGrupoDraftPriceStepValid(draft: PasoDosGrupoDraft) {
  if (draft.priceInputMode === "piece_total") {
    return moneyToNumber(draft.precio) > 0;
  }

  if (draft.priceInputMode === "unit_direct") {
    return moneyToNumber(draft.precio) > 0;
  }

  const summary = buildGrupoDraftLinePricingSummary(draft);

  if (!summary.areaM2 || moneyToNumber(draft.precioPorM2) <= 0) {
    return false;
  }

  return resolveGrupoDraftSubtotal(draft) > 0;
}

function resolveDraftSubtotalForModeSwitch(draft: PasoDosGrupoDraft) {
  if (draft.priceInputMode === "piece_total") {
    return moneyToNumber(draft.precio);
  }

  if (draft.priceInputMode === "unit_direct") {
    return Math.round(moneyToNumber(draft.precio) * Math.max(1, draft.cantidad));
  }

  if (draft.precioAjustadoManual && moneyToNumber(draft.precio) > 0) {
    return Math.round(moneyToNumber(draft.precio) * Math.max(1, draft.cantidad));
  }

  const summary = buildGrupoDraftLinePricingSummary(draft);
  return Math.round(summary.totalSugerido ?? 0);
}

function resolveInitialPriceInputMode(input: {
  precioPorM2?: string;
  referencia?: string;
  lineTemplateId?: string;
  priceInputMode?: PasoDosGrupoPriceInputMode;
}) {
  if (
    input.priceInputMode === "line_m2" ||
    input.priceInputMode === "unit_direct" ||
    input.priceInputMode === "piece_total"
  ) {
    return input.priceInputMode;
  }

  const hasLinePricing =
    safeTrim(input.precioPorM2) !== "" &&
    (safeTrim(input.referencia) !== "" || safeTrim(input.lineTemplateId) !== "");

  return hasLinePricing ? "line_m2" : "unit_direct";
}

export function syncDraftTemplatePricing(draft: PasoDosGrupoDraft): PasoDosGrupoDraft {
  if (draft.priceInputMode === "unit_direct" || draft.priceInputMode === "piece_total") {
    return draft;
  }

  if (!safeTrim(draft.referencia) && !safeTrim(draft.precioPorM2)) {
    return draft;
  }

  if (draft.pricingMode === "margen") {
    return draft;
  }

  if (draft.precioAjustadoManual) {
    return draft;
  }

  const pricing = buildGrupoDraftLinePricingSummary(draft);

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
    | "categoria"
    | "material"
    | "catalogMetadata"
    | "vidrioPrincipalRecomendado"
    | "precioM2Sugerido"
    | "minimoCobrable"
    | "redondeoPrecio"
  >
): PasoDosGrupoDraft {
  const glassMetadata = getLineTemplateGlassMetadata(template.catalogMetadata);

  return syncDraftTemplatePricing({
    ...draft,
    material: template.material,
    catalogCategoria: template.categoria === "vidrio" ? "vidrio" : template.categoria === "pvc" ? "pvc" : "aluminio",
    catalogEspesor: glassMetadata.espesor ?? "",
    catalogTerminacion: glassMetadata.terminacion ?? "",
    lineTemplateId: String(template.id),
    referencia: template.nombre,
    vidrio:
      template.categoria === "vidrio"
        ? template.nombre
        : template.vidrioPrincipalRecomendado?.trim() || draft.vidrio,
    pricingMode: "precio_directo",
    priceInputMode: "line_m2",
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
    if (!normalizedColor || normalizedColor === "#a8a8a8" || normalizedColor === "#f0eeeb") {
      return "#ffffff";
    }

    const isKnownPvcColor = PVC_COLOR_OPTIONS.some(
      (option) => option.hex.toLowerCase() === normalizedColor
    );

    if (normalizedColor && isKnownPvcColor) {
      return currentColorHex ?? "#ffffff";
    }

    return "#ffffff";
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

/**
 * Tras cambiar sistema/configuración: si hay guided visual y el tipo sigue admitiendo
 * composición personalizada, reaplica flags Personalizado; si no, limpia guided + esquema.
 */
export function resolveCompositionPatchAfterSystemChange(input: {
  draft: Pick<
    PasoDosGrupoDraft,
    | "subtipo"
    | "sheetScheme"
    | "sheetVariant"
    | "customSchemeDescription"
    | "isCustomScheme"
    | "guidedVisualConfig"
  >;
  sistema: string;
  configuracion: string;
}): Pick<
  PasoDosGrupoDraft,
  | "sheetScheme"
  | "sheetVariant"
  | "customSchemeDescription"
  | "isCustomScheme"
  | "guidedVisualConfig"
> {
  const { draft, sistema, configuracion } = input;
  const showSheetScheme = shouldShowSheetSchemeForComponent({
    tipo: draft.subtipo,
    sistema,
  });
  const sheetSchemeOptions = getSheetSchemeOptions({
    tipo: draft.subtipo,
    sistema,
    configuracion,
  });
  const guided = draft.guidedVisualConfig;
  const keepsProfileMaterial = shouldRequireProfileMaterialForComponent(draft.subtipo);

  if (guided && keepsProfileMaterial) {
    const personalizadoAllowed =
      !showSheetScheme ||
      sheetSchemeOptions.length === 0 ||
      sheetSchemeOptions.includes("Personalizado");

    if (personalizadoAllowed) {
      return {
        guidedVisualConfig: guided,
        sheetScheme: showSheetScheme && sheetSchemeOptions.includes("Personalizado")
          ? "Personalizado"
          : draft.sheetScheme,
        sheetVariant: "",
        customSchemeDescription: describeGuidedVisualConfig(guided),
        isCustomScheme: true,
      };
    }

    return {
      guidedVisualConfig: null,
      sheetScheme: shouldAutoSelectFirstSheetScheme({
        tipo: draft.subtipo,
        sistema,
      })
        ? sheetSchemeOptions[0] ?? ""
        : "",
      sheetVariant: "",
      customSchemeDescription: "",
      isCustomScheme: false,
    };
  }

  const shouldKeepComposition =
    showSheetScheme && sheetSchemeOptions.includes(draft.sheetScheme);

  if (shouldKeepComposition) {
    return {
      guidedVisualConfig: null,
      sheetScheme: draft.sheetScheme,
      sheetVariant: draft.sheetVariant,
      customSchemeDescription: draft.customSchemeDescription,
      isCustomScheme: draft.isCustomScheme,
    };
  }

  return {
    guidedVisualConfig: null,
    sheetScheme: shouldAutoSelectFirstSheetScheme({
      tipo: draft.subtipo,
      sistema,
    })
      ? sheetSchemeOptions[0] ?? ""
      : "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
  };
}

export function getGlassOptionsForSubtype(
  subtipo: string,
  customGlassOptions: readonly string[] = []
) {
  const flattened = GLASS_OPTIONS.flatMap((group) =>
    group.items.map((item) => buildGlassValue(group.prefix, item))
  );

  const normalizedSubtype = normalizeSearchValue(subtipo);
  const preferredOptions =
    normalizedSubtype === "espejo"
      ? [...MIRROR_GLASS_THICKNESS_OPTIONS, "Esmerilado / Satinado"]
      : normalizedSubtype === "shower door" || normalizedSubtype === "baranda"
        ? ["Templado 8mm", "Templado 10mm", "Templado 12mm", "Laminado 4+4"]
        : ["Incoloro monolitico 5mm", "Incoloro monolitico 6mm", "DVH 4+9+4", "Templado 8mm"];

  return mergeGlassOptions(Array.from(new Set([...preferredOptions, ...flattened])), customGlassOptions);
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
    configuracion: draft.configuracion,
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
    customSchemeDescription: draft.customSchemeDescription,
    isCustomScheme: draft.isCustomScheme,
  });

  const materialSegment = shouldRequireProfileMaterialForComponent(draft.subtipo)
    ? ` ${draft.material.toLowerCase()}`
    : "";

  if (
    shouldShowSheetSchemeForComponent({ tipo: draft.subtipo, sistema: draft.sistema }) &&
    sheetLabel
  ) {
    return `${cantidad} ${baseName}${materialSegment} con ${draft.vidrio.toLowerCase()}`;
  }

  const systemSegment = shouldShowSystemSelectionForComponent(draft.subtipo)
    ? ` ${systemLabel.toLowerCase()}`
    : "";

  return `${cantidad} ${subtipo}${systemSegment}${materialSegment} con ${draft.vidrio.toLowerCase()}`;
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
    priceInputMode: resolveInitialPriceInputMode({
      precioPorM2: seedForm?.precioPorM2,
      referencia,
      lineTemplateId: seedForm?.lineTemplateId,
    }),
    material: suggestedForm.material,
    catalogCategoria: suggestedForm.catalogCategoria,
    catalogEspesor: suggestedForm.catalogEspesor,
    catalogTerminacion: suggestedForm.catalogTerminacion,
    colorHex: resolveMaterialColorHex(suggestedForm.material, suggestedForm.colorHex),
    sistema: seedForm?.sistema?.trim() || referenceParts.sistema || systemOptions[0] || "",
    configuracion: seedForm?.configuracion?.trim() || referenceParts.configuracion,
    sheetScheme: seedForm?.sheetScheme ?? "",
    sheetVariant: seedForm?.sheetVariant ?? "",
    customSchemeDescription: seedForm?.customSchemeDescription ?? "",
    isCustomScheme: seedForm?.isCustomScheme ?? false,
    mirrorFormat: seedForm?.mirrorFormat ?? "single",
    mirrorPaneCount: seedForm?.mirrorPaneCount ?? null,
    mirrorPaneDirection: seedForm?.mirrorPaneDirection ?? "vertical",
    mirrorInteriorLine: seedForm?.mirrorInteriorLine ?? "fine",
    mirrorCustomPaneCount: seedForm?.mirrorCustomPaneCount ?? "",
    guidedVisualConfig: seedForm?.guidedVisualConfig ?? null,
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
  const syncedDraft = syncDraftTemplatePricing(draft);
  const resolvedUnitCost =
    syncedDraft.priceInputMode === "piece_total"
      ? syncedDraft.precio
      : (() => {
          const unitPrice = resolveGrupoDraftUnitPrice(syncedDraft);
          return unitPrice > 0 ? String(unitPrice) : syncedDraft.precio;
        })();

  const baseForm = buildSuggestedComponentForm({
    items,
    tipo: syncedDraft.subtipo,
    provider,
    pricingMode,
    current: {
      tipo: syncedDraft.subtipo,
      hojasBase: syncedDraft.hojasBase,
      material: syncedDraft.material,
      catalogCategoria: syncedDraft.catalogCategoria,
      catalogEspesor: syncedDraft.catalogEspesor,
      catalogTerminacion: syncedDraft.catalogTerminacion,
      colorHex: syncedDraft.colorHex,
      referencia: composeComponentReference(syncedDraft.sistema, syncedDraft.configuracion),
      sistema: syncedDraft.sistema,
      configuracion: syncedDraft.configuracion,
      sheetScheme: syncedDraft.sheetScheme,
      sheetVariant: syncedDraft.sheetVariant,
      customSchemeDescription: syncedDraft.customSchemeDescription,
      isCustomScheme: syncedDraft.isCustomScheme,
      mirrorFormat: syncedDraft.mirrorFormat,
      mirrorPaneCount: syncedDraft.mirrorPaneCount,
      mirrorPaneDirection: syncedDraft.mirrorPaneDirection,
      mirrorInteriorLine: syncedDraft.mirrorInteriorLine,
      mirrorCustomPaneCount: syncedDraft.mirrorCustomPaneCount,
      guidedVisualConfig: syncedDraft.guidedVisualConfig,
      nombre: syncedDraft.nombre ?? "",
      descripcion: syncedDraft.descripcion ?? "",
      pricingMode: syncedDraft.pricingMode,
      vidrio: syncedDraft.vidrio,
      ancho: syncedDraft.ancho,
      alto: syncedDraft.alto,
      cantidad: String(Math.max(1, syncedDraft.cantidad)),
      costoProveedorUnitario: resolvedUnitCost,
      margenPct: syncedDraft.pricingMode === "precio_directo" ? "0" : syncedDraft.margenPct || "0",
      precioAjustadoManual: syncedDraft.precioAjustadoManual,
      loteCantidad: "1",
    },
  });

  return syncTemplatePricingInComponentForm({
    ...baseForm,
    hojasBase: syncedDraft.hojasBase,
    material: syncedDraft.material,
    catalogCategoria: syncedDraft.catalogCategoria,
    catalogEspesor: syncedDraft.catalogEspesor,
    catalogTerminacion: syncedDraft.catalogTerminacion,
    colorHex: syncedDraft.colorHex,
    referencia:
      safeTrim(syncedDraft.referencia) ||
      composeComponentReference(syncedDraft.sistema, syncedDraft.configuracion),
    sistema: syncedDraft.sistema,
    configuracion: syncedDraft.configuracion,
    sheetScheme: syncedDraft.sheetScheme,
    sheetVariant: syncedDraft.sheetVariant,
    customSchemeDescription: syncedDraft.customSchemeDescription,
    isCustomScheme: syncedDraft.isCustomScheme,
    mirrorFormat: syncedDraft.mirrorFormat,
    mirrorPaneCount: syncedDraft.mirrorPaneCount,
    mirrorPaneDirection: syncedDraft.mirrorPaneDirection,
    mirrorInteriorLine: syncedDraft.mirrorInteriorLine,
    mirrorCustomPaneCount: syncedDraft.mirrorCustomPaneCount,
    guidedVisualConfig: syncedDraft.guidedVisualConfig,
    nombre: syncedDraft.nombre ?? "",
    descripcion: syncedDraft.descripcion ?? "",
    lineTemplateId: syncedDraft.lineTemplateId,
    pricingMode: syncedDraft.pricingMode,
    vidrio: syncedDraft.vidrio,
    ancho: syncedDraft.ancho,
    alto: syncedDraft.alto,
    cantidad: String(Math.max(1, syncedDraft.cantidad)),
    costoProveedorUnitario: resolvedUnitCost,
    margenPct: syncedDraft.pricingMode === "precio_directo" ? "0" : syncedDraft.margenPct || "0",
    precioPorM2: syncedDraft.precioPorM2,
    minimoCobrable: syncedDraft.minimoCobrable,
    redondeoPrecio: syncedDraft.redondeoPrecio || "1000",
    precioAjustadoManual:
      syncedDraft.priceInputMode === "unit_direct" || syncedDraft.priceInputMode === "piece_total"
        ? true
        : syncedDraft.precioAjustadoManual,
    loteCantidad: "1",
    palilloEnabled: syncedDraft.palilloEnabled,
    palilloType: syncedDraft.palilloType,
    costInputScope: syncedDraft.priceInputMode === "piece_total" ? "group_total" : "unit",
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

  const selectionPatch: Pick<
    PasoDosGrupoDraft,
    | "subtipo"
    | "hojasBase"
    | "cantidad"
    | "usaCantidadPersonalizada"
    | "cantidadPersonalizada"
    | "pricingMode"
    | "material"
    | "catalogCategoria"
    | "catalogEspesor"
    | "catalogTerminacion"
    | "colorHex"
    | "sistema"
    | "configuracion"
    | "sheetScheme"
    | "sheetVariant"
    | "customSchemeDescription"
    | "isCustomScheme"
    | "mirrorFormat"
    | "mirrorPaneCount"
    | "mirrorPaneDirection"
    | "mirrorInteriorLine"
    | "mirrorCustomPaneCount"
    | "nombre"
    | "descripcion"
    | "cobraPrecioSeparado"
    | "alcanceDetalles"
    | "vidrio"
    | "palilloEnabled"
    | "palilloType"
    | "costInputScope"
  > = {
    subtipo,
    hojasBase: getBaseLeafCountForComponent(subtipo),
    cantidad: current.cantidad > 0 ? current.cantidad : 1,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    pricingMode: normalizePricingMode(current.pricingMode),
    material: suggestedForm.material,
    catalogCategoria: suggestedForm.catalogCategoria,
    catalogEspesor: suggestedForm.catalogEspesor,
    catalogTerminacion: suggestedForm.catalogTerminacion,
    colorHex: resolveMaterialColorHex(suggestedForm.material, suggestedForm.colorHex),
    sistema: defaultSistema,
    configuracion: configurationOptions[0] || "",
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
    mirrorFormat: "single",
    mirrorPaneCount: null,
    mirrorPaneDirection: "vertical",
    mirrorInteriorLine: "fine",
    mirrorCustomPaneCount: "",
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
  };

  return selectionPatch;
}

export function usePasoDosAgregarGrupo(params: CreateInitialDraftParams) {
  const activeLineTemplates = useMemo(
    () => params.activeLineTemplates ?? [],
    [params.activeLineTemplates]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [paso, setPaso] = useState<PasoDosGrupoPaso>(1);
  const [entryMode, setEntryMode] = useState<PasoDosGrupoEntryMode>("normal");
  const [editingFreeTotalMainItemId, setEditingFreeTotalMainItemId] = useState<string | null>(null);
  const [editingFreeTotalItemIds, setEditingFreeTotalItemIds] = useState<string[] | null>(null);
  const [freeTotalNotebookNestedItemIds, setFreeTotalNotebookNestedItemIds] = useState<string[]>(
    []
  );
  const [draft, setDraft] = useState<PasoDosGrupoDraft>(() => createInitialPasoDosGrupoDraft(params));
  const lockBodyScroll = params.lockBodyScroll !== false;

  const resetFreeTotalEditState = () => {
    setEditingFreeTotalMainItemId(null);
    setEditingFreeTotalItemIds(null);
    setFreeTotalNotebookNestedItemIds([]);
  };

  const registerFreeTotalNestedDetailItem = (itemId: string) => {
    setFreeTotalNotebookNestedItemIds((current) =>
      current.includes(itemId) ? current : [...current, itemId]
    );
  };

  useEffect(() => {
    if (!isOpen || !lockBodyScroll) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, lockBodyScroll]);

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
    () => getGlassOptionsForSubtype(draft.subtipo, params.customGlassOptions),
    [draft.subtipo, params.customGlassOptions]
  );
  const visibleLineTemplates = useMemo(
    () =>
      filterLineTemplatesForComponent(activeLineTemplates, {
        tipo: draft.subtipo,
        material: draft.material,
        catalogCategoria: draft.catalogCategoria,
      }),
    [activeLineTemplates, draft.catalogCategoria, draft.material, draft.subtipo]
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
    setFreeTotalNotebookNestedItemIds(itemIds.filter((itemId) => itemId !== mainItemId));
    setEntryMode("free_total_single");
    setPaso(4);
    setIsOpen(true);
  };

  const restoreFreeTotalNotebook = (input: {
    draft: PasoDosGrupoDraft;
    paso?: PasoDosGrupoPaso;
    editingFreeTotalMainItemId?: string | null;
    editingFreeTotalItemIds?: string[] | null;
    freeTotalNotebookNestedItemIds?: string[];
  }) => {
    setDraft(input.draft);
    setEditingFreeTotalMainItemId(input.editingFreeTotalMainItemId ?? null);
    setEditingFreeTotalItemIds(input.editingFreeTotalItemIds ?? null);
    setFreeTotalNotebookNestedItemIds(input.freeTotalNotebookNestedItemIds ?? []);
    setEntryMode("free_total_single");
    setPaso(input.paso ?? 4);
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

  const closeSheet = (options?: { itemCountOverride?: number }) => {
    const itemCount = options?.itemCountOverride ?? params.items.length;

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
    setDraft((current) => {
      const nextPatch = buildPasoDosGrupoSelectionPatch({
        current,
        items: params.items,
        pricingMode: params.pricingMode,
        provider: params.provider,
        subtipo,
      });
      const keepsProfileMaterial = shouldRequireProfileMaterialForComponent(subtipo);

      return {
        ...current,
        ...nextPatch,
        sistema: "",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        guidedVisualConfig: keepsProfileMaterial ? current.guidedVisualConfig : null,
        ...(keepsProfileMaterial && current.guidedVisualConfig
          ? {
              sheetScheme: "Personalizado",
              isCustomScheme: true,
              customSchemeDescription: describeGuidedVisualConfig(current.guidedVisualConfig),
            }
          : {}),
      };
    });
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

  const updateCantidadInput = (value: string) => {
    const digitsOnly = sanitizeDigits(value);
    const parsed = Number.parseInt(digitsOnly || "0", 10);

    setDraft((current) =>
      syncDraftTemplatePricing({
        ...current,
        usaCantidadPersonalizada: true,
        cantidadPersonalizada: digitsOnly,
        cantidad: digitsOnly && parsed > 0 ? parsed : 0,
      })
    );
  };

  const normalizeCantidadInput = () => {
    setDraft((current) => {
      const parsed = Number.parseInt(
        current.cantidadPersonalizada || String(Math.max(0, current.cantidad)),
        10
      );
      const nextCantidad = parsed > 0 ? parsed : 1;

      return syncDraftTemplatePricing({
        ...current,
        cantidad: nextCantidad,
        cantidadPersonalizada: "",
        usaCantidadPersonalizada: false,
      });
    });
  };

  const updateMaterial = (material: PasoDosGrupoDraft["material"]) => {
    setDraft((current) => ({
      ...current,
      material,
      catalogCategoria: material === "PVC" ? "pvc" : material === "Cristal" ? "vidrio" : "aluminio",
      catalogEspesor: "",
      catalogTerminacion: "",
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
        catalogCategoria: current.material === "PVC" ? "pvc" : current.material === "Cristal" ? "vidrio" : "aluminio",
        catalogEspesor: "",
        catalogTerminacion: "",
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
    setDraft((current) => {
      const nextConfigOptions = getConfigurationOptionsForSubtype(current.subtipo, sistema);
      const nextConfig = nextConfigOptions[0] || "";
      const compositionPatch = resolveCompositionPatchAfterSystemChange({
        draft: current,
        sistema,
        configuracion: nextConfig,
      });
      const isPersonalizadoSistema = sistema === "Personalizado";

      return {
        ...current,
        sistema,
        configuracion: nextConfig,
        ...compositionPatch,
        ...(isPersonalizadoSistema
          ? {
              isCustomScheme: true,
              sheetScheme: compositionPatch.sheetScheme || current.sheetScheme || "",
              customSchemeDescription:
                compositionPatch.customSchemeDescription ||
                current.customSchemeDescription ||
                "",
            }
          : {}),
      };
    });
  };

  const updateConfiguracion = (configuracion: string) => {
    setDraft((current) => {
      const leavingGuidedPersonalizado =
        Boolean(current.guidedVisualConfig) &&
        current.configuracion === "Personalizado" &&
        configuracion !== "Personalizado";
      const draftForPatch = leavingGuidedPersonalizado
        ? { ...current, guidedVisualConfig: null }
        : current;
      const compositionPatch = resolveCompositionPatchAfterSystemChange({
        draft: draftForPatch,
        sistema: current.sistema,
        configuracion,
      });

      return {
        ...current,
        configuracion,
        ...compositionPatch,
        ...(leavingGuidedPersonalizado ? { guidedVisualConfig: null } : {}),
      };
    });
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
    setDraft((current) => {
      const leavingGuided =
        Boolean(current.guidedVisualConfig) && sheetScheme !== "Personalizado";

      return {
        ...current,
        sheetScheme,
        sheetVariant: "",
        customSchemeDescription:
          sheetScheme === "Personalizado" ? current.customSchemeDescription : "",
        isCustomScheme: sheetScheme === "Personalizado",
        ...(leavingGuided
          ? {
              guidedVisualConfig: null,
            }
          : {}),
      };
    });
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

  const updateGuidedVisualConfig = (
    guidedVisualConfig: PasoDosGrupoDraft["guidedVisualConfig"]
  ) => {
    setDraft((current) => {
      if (!guidedVisualConfig) {
        const keepsPersonalizadoChoice =
          current.sheetScheme === "Personalizado" ||
          current.configuracion === "Personalizado";

        return {
          ...current,
          guidedVisualConfig: null,
          customSchemeDescription: keepsPersonalizadoChoice
            ? ""
            : current.customSchemeDescription,
          isCustomScheme: keepsPersonalizadoChoice,
        };
      }

      const sheetSchemeOptions = getSheetSchemeOptions({
        tipo: current.subtipo,
        sistema: current.sistema,
        configuracion: current.configuracion,
      });
      const configOptions = getConfigurationOptionsForSubtype(
        current.subtipo,
        current.sistema
      );

      return {
        ...current,
        guidedVisualConfig,
        ancho: String(guidedVisualConfig.widthMm),
        alto: String(guidedVisualConfig.heightMm),
        isCustomScheme: true,
        sheetScheme: sheetSchemeOptions.includes("Personalizado")
          ? "Personalizado"
          : current.sheetScheme,
        configuracion: configOptions.includes("Personalizado")
          ? "Personalizado"
          : current.configuracion,
        sheetVariant: "",
        customSchemeDescription: describeGuidedVisualConfig(guidedVisualConfig),
      };
    });
  };

  const updateMirrorFormat = (mirrorFormat: PasoDosGrupoDraft["mirrorFormat"]) => {
    setDraft((current) => ({
      ...current,
      mirrorFormat,
      mirrorPaneCount: mirrorFormat === "divided" ? current.mirrorPaneCount ?? 2 : null,
      mirrorCustomPaneCount: mirrorFormat === "divided" ? current.mirrorCustomPaneCount : "",
    }));
  };

  const updateMirrorPaneCount = (paneCount: number | null) => {
    setDraft((current) => ({
      ...current,
      mirrorPaneCount: paneCount && paneCount >= 2 ? Math.round(paneCount) : null,
      mirrorCustomPaneCount: "",
    }));
  };

  const updateMirrorCustomPaneCount = (value: string) => {
    const digitsOnly = sanitizeDigits(value);
    const parsed = Number.parseInt(digitsOnly || "0", 10);

    setDraft((current) => ({
      ...current,
      mirrorFormat: "divided",
      mirrorCustomPaneCount: digitsOnly,
      mirrorPaneCount: parsed >= 2 ? parsed : null,
    }));
  };

  const updateMirrorPaneDirection = (
    mirrorPaneDirection: PasoDosGrupoDraft["mirrorPaneDirection"]
  ) => {
    setDraft((current) => ({ ...current, mirrorPaneDirection }));
  };

  const updateMirrorInteriorLine = (
    mirrorInteriorLine: PasoDosGrupoDraft["mirrorInteriorLine"]
  ) => {
    setDraft((current) => ({ ...current, mirrorInteriorLine }));
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

  const updatePrecioPorM2 = (value: string) => {
    setDraft((current) => {
      const next = {
        ...current,
        precioPorM2: normalizeCurrencyInput(value),
      };

      if (current.priceInputMode === "line_m2" && current.precioAjustadoManual) {
        return next;
      }

      return syncDraftTemplatePricing({
        ...next,
        precioAjustadoManual: false,
      });
    });
  };

  const updateMinimoCobrable = (value: string) => {
    setDraft((current) => {
      const next = {
        ...current,
        minimoCobrable: normalizeCurrencyInput(value),
      };

      if (current.priceInputMode === "line_m2" && current.precioAjustadoManual) {
        return next;
      }

      return syncDraftTemplatePricing({
        ...next,
        precioAjustadoManual: false,
      });
    });
  };

  const updateRedondeoPrecio = (value: string) => {
    setDraft((current) => {
      const next = {
        ...current,
        redondeoPrecio: normalizeCurrencyInput(value),
      };

      if (current.priceInputMode === "line_m2" && current.precioAjustadoManual) {
        return next;
      }

      return syncDraftTemplatePricing({
        ...next,
        precioAjustadoManual: false,
      });
    });
  };

  const updatePriceInputMode = (mode: PasoDosGrupoPriceInputMode) => {
    setDraft((current) => {
      if (current.priceInputMode === mode) {
        return current;
      }

      const qty = Math.max(1, current.cantidad);
      const currentSubtotal = resolveDraftSubtotalForModeSwitch(current);

      if (mode === "piece_total") {
        return {
          ...current,
          priceInputMode: "piece_total",
          pricingMode: "precio_directo",
          margenPct: "0",
          costInputScope: "group_total",
          precio: currentSubtotal > 0 ? String(currentSubtotal) : current.precio,
          precioAjustadoManual: true,
        };
      }

      if (mode === "unit_direct") {
        const unitPrice =
          current.priceInputMode === "piece_total" && moneyToNumber(current.precio) > 0
            ? String(Math.round(moneyToNumber(current.precio) / qty))
            : current.precioAjustadoManual && moneyToNumber(current.precio) > 0
              ? current.precio
              : (() => {
                  const summary = buildGrupoDraftLinePricingSummary(current);
                  return summary.precioUnitarioSugerido !== null
                    ? String(Math.round(summary.precioUnitarioSugerido))
                    : currentSubtotal > 0
                      ? String(Math.round(currentSubtotal / qty))
                      : current.precio;
                })();

        return {
          ...current,
          priceInputMode: "unit_direct",
          pricingMode: "precio_directo",
          margenPct: "0",
          costInputScope: "unit",
          precio: unitPrice,
          precioAjustadoManual: true,
        };
      }

      return syncDraftTemplatePricing({
        ...current,
        priceInputMode: "line_m2",
        pricingMode: "precio_directo",
        margenPct: "0",
        costInputScope: "unit",
        precioAjustadoManual: false,
      });
    });
  };

  const toggleCustomizeUnitPrice = (enabled: boolean) => {
    setDraft((current) => {
      if (current.priceInputMode !== "line_m2") {
        return current;
      }

      if (!enabled) {
        return syncDraftTemplatePricing({
          ...current,
          precioAjustadoManual: false,
        });
      }

      const summary = buildGrupoDraftLinePricingSummary(current);
      const unitPrice =
        summary.precioUnitarioSugerido !== null
          ? String(Math.round(summary.precioUnitarioSugerido))
          : current.precio;

      return {
        ...current,
        precioAjustadoManual: true,
        precio: unitPrice,
      };
    });
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
        ...(shouldClearTemplateAutoPrice ? { precio: "" } : {}),
      };

      return pricingMode === "precio_directo" && hasTemplate
        ? syncDraftTemplatePricing(nextDraft)
        : nextDraft;
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

  const goToStep = (nextPaso: PasoDosGrupoPaso) => {
    setPaso(nextPaso);
  };

  const canContinueFromQuantity =
    !draft.usaCantidadPersonalizada ||
    (draft.cantidadPersonalizada.trim() !== "" && Number(draft.cantidadPersonalizada) > 0);
  const isTrabajoPersonalizado = draft.subtipo === "Trabajo personalizado";
  const isFreeValueItem = isFreeValueComponentType(draft.subtipo);
  const requiresConfiguration =
    getConfigurationOptionsForComponentSistema(draft.subtipo, draft.sistema).length > 0;
  const canContinueFromConfig = isFreeValueItem
    ? (draft.nombre ?? "").trim() !== "" &&
      (params.quotePricingMode === "total_global" && !draft.cobraPrecioSeparado
        ? true
        : (draft.precio ?? "").trim() !== "")
    : isTrabajoPersonalizado
      ? (draft.nombre ?? "").trim() !== "" || (draft.descripcion ?? "").trim() !== ""
      : draft.sistema.trim() !== "" &&
        (!requiresConfiguration || draft.configuracion.trim() !== "") &&
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
    visibleLineTemplates,
    summary,
    openSheet,
    openFreeTotalNotebook,
    openFreeTotalNotebookForEdit,
    restoreFreeTotalNotebook,
    editingFreeTotalMainItemId,
    editingFreeTotalItemIds,
    freeTotalNotebookNestedItemIds,
    registerFreeTotalNestedDetailItem,
    restart,
    closeSheet,
    selectCategoria,
    selectSubtipo,
    selectCantidad,
    enableCustomQuantity,
    updateCustomQuantity,
    updateCantidadInput,
    normalizeCantidadInput,
    updateMaterial,
    selectLineTemplate,
    updateColorHex,
    updateSistema,
    updateConfiguracion,
    updatePalilloEnabled,
    updatePalilloType,
    updateCostInputScope,
    updateSheetScheme,
    updateSheetVariant,
    updateCustomSchemeDescription,
    updateGuidedVisualConfig,
    updateMirrorFormat,
    updateMirrorPaneCount,
    updateMirrorCustomPaneCount,
    updateMirrorPaneDirection,
    updateMirrorInteriorLine,
    updateNombre,
    updateDescripcion,
    updateIvaMode,
    updateCobraPrecioSeparado,
    updateVidrio,
    updateAncho,
    updateAlto,
    updatePrecio,
    updatePrecioPorM2,
    updateMinimoCobrable,
    updateRedondeoPrecio,
    updatePriceInputMode,
    toggleCustomizeUnitPrice,
    updatePricingMode,
    updateMargenPct,
    addAlcanceDetalle,
    updateAlcanceDetalle,
    removeAlcanceDetalle,
    goBack,
    goNext,
    goToStep,
    canContinueFromQuantity,
    canContinueFromConfig,
  };
}
