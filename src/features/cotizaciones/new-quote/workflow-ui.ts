import {
  getComponentSuggestion,
  type PreferredProvider,
} from "@/features/cotizaciones/services/component-suggestions.service";
import {
  calculateFreeValueItem,
  calculateComponentItem,
  createCotizacionWorkflowDraft,
  resolveWorkflowObraTitle,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { calculateLineTemplatePricing } from "@/features/cotizaciones/services/cotizacion-line-pricing.service";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
  type CotizacionItemFreeValueIvaMode,
} from "@/utils/cotizacion-item-presentation";
import {
  normalizePricingMode,
  normalizeCostInputScope,
  DEFAULT_MARGIN_PCT,
  type PricingMode,
  type CostInputScope,
} from "@/features/cotizaciones/types/pricing-mode";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  COMPONENT_TYPE_GROUPS as CATALOG_COMPONENT_TYPE_GROUPS,
  getBaseLeafCountForComponent,
  resolveCanonicalComponentType,
  splitComponentReference,
} from "@/features/cotizaciones/services/component-catalog.service";

export type StepKey = 1 | 2 | 3;
export type { PreferredProvider };

export type ComponentFormState = {
  codigo: string;
  tipo: string;
  hojasBase?: 1 | 2 | null;
  material: "Aluminio" | "PVC";
  referencia: string;
  sistema?: string;
  configuracion?: string;
  sheetScheme: string;
  sheetVariant: string;
  customSchemeDescription: string;
  isCustomScheme: boolean;
  lineTemplateId: string;
  pricingMode: PricingMode;
  vidrio: string;
  nombre: string;
  descripcion: string;
  ancho: string;
  alto: string;
  cantidad: string;
  costoProveedorUnitario: string;
  margenPct: string;
  precioPorM2: string;
  minimoCobrable: string;
  redondeoPrecio: string;
  precioPlantillaSugerido: string;
  precioAjustadoManual: boolean;
  origenPrecio: "margen" | "plantilla" | "manual";
  observaciones: string;
  colorHex: string;
  loteCantidad: string;
  palilloEnabled?: boolean;
  palilloType?: string;
  costInputScope?: CostInputScope;
};

export type FieldErrors = Partial<
  Record<
    | keyof ComponentFormState
    | "clienteNombre"
    | "obra"
    | "items"
    | "step1"
    | "step2"
    | "costoTotalFabricacion"
    | "margenGlobalPct"
    | "totalClienteManual",
    string
  >
>;

export type PersistedWorkflowState = {
  version: 4;
  step: StepKey;
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
};

export type QuickEditDraftState = {
  ancho: string;
  alto: string;
  costoProveedorUnitario: string;
};

export type QuickEditFieldKey = keyof QuickEditDraftState;

export type FreeValueItemFormState = {
  nombre: string;
  descripcion: string;
  valor: string;
  ivaMode: CotizacionItemFreeValueIvaMode;
};

export type QuickEditBatchTarget = {
  id: string;
  code: string;
  title: string;
};

export type Step1FieldKey =
  | "clientSearch"
  | "clienteNombre"
  | "clienteTelefono"
  | "obra"
  | "direccion"
  | "validez"
  | "observaciones";

export type ComponentListCardViewModel = {
  id: string;
  source: CotizacionWorkflowItem;
  colorHex: string;
  title: string;
  price: string;
  priceLabel: string;
  compactMeta: string;
  metaPrimary: string;
  metaSecondary: string;
  metaTertiary: string;
  quickEditPriceLabel: string;
  svgMarkup: string;
  isComplete: boolean;
};

export type ComponentFormLinePricingSummary = ReturnType<
  typeof calculateLineTemplatePricing
>;

export const COMPONENT_TYPE_GROUPS = CATALOG_COMPONENT_TYPE_GROUPS;

export const VALIDEZ_OPTIONS = ["7 dias", "15 dias", "30 dias"];
export const MATERIAL_OPTIONS = ["Aluminio", "PVC"] as const;
export const MARGIN_SELECT_OPTIONS = [0, 20, 30, 40, 50, 60, 80, 100];

export const SHEET_SCHEME_OPTIONS = ["2 hojas", "3 hojas", "4 hojas", "Personalizado"] as const;

export const SHEET_VARIANT_OPTIONS: Record<string, readonly string[]> = {
  "2 hojas": ["1 fija + 1 móvil", "2 móviles", "Otro"],
  "3 hojas": ["Fija central", "Fijo lateral + 2 móviles", "3 móviles", "Otro"],
  "4 hojas": ["2 fijas + 2 móviles", "Todas móviles", "Laterales fijas + centrales móviles", "Otro"],
};

const COMPOSITION_OPTIONS_BY_SYSTEM: Record<string, readonly string[]> = {
  abatible: ["1 hoja", "2 hojas", "1 abatible + 1 fija", "Personalizado"],
  oscilobatiente: ["1 hoja", "2 hojas", "Oscilobatiente + fijo", "Personalizado"],
  proyectante: ["1 hoja", "Proyectante + fijo", "2 proyectantes", "Personalizado"],
};

const FIXED_PANE_COMPOSITION_OPTIONS = ["1 paño", "2 paños", "3 paños", "Personalizado"] as const;

export const ALUMINUM_COLOR_OPTIONS = [
  { label: "Aluminio mate", hex: "#a8a8a8" },
  { label: "Blanco", hex: "#f0eeeb" },
  { label: "Blanco hueso", hex: "#dfd5c4" },
  { label: "Negro", hex: "#2a2a2a" },
  { label: "Negro mate", hex: "#444444" },
  { label: "Madera", hex: "#8b5e3c" },
  { label: "Titanio", hex: "#7d8791" },
];

export const PVC_COLOR_OPTIONS = [
  { label: "Blanco", hex: "#f0eeeb" },
  { label: "Gris", hex: "#b7bcc4" },
  { label: "Roble Dorado", hex: "#b7834a" },
  { label: "Nogal", hex: "#6f4a34" },
  { label: "Gris Antracita", hex: "#4f555d" },
  { label: "Negro", hex: "#2a2a2a" },
  { label: "Verde (Eléctrico)", hex: "#1f8c5a" },
  { label: "Azul (Alta presión)", hex: "#2968c8" },
  { label: "Naranja (Ventilación)", hex: "#e7842a" },
];

export const COLOR_OPTIONS = [...ALUMINUM_COLOR_OPTIONS];

for (const option of PVC_COLOR_OPTIONS) {
  if (!COLOR_OPTIONS.some((current) => current.hex.toLowerCase() === option.hex.toLowerCase())) {
    COLOR_OPTIONS.push(option);
  }
}

const LEGACY_COLOR_HEX = "#b87333";
const WOOD_COLOR = "#8b5e3c";

export const GLASS_OPTIONS = [
  {
    grupo: "Incoloro monolítico",
    items: ["3mm", "4mm", "5mm", "6mm", "8mm", "10mm", "12mm"],
    prefix: "Incoloro monolítico",
  },
  {
    grupo: "DVH (doble vidriado)",
    items: ["4+9+4", "4+12+4", "6+12+4", "3+3+9+4", "3+3 / 12 / 3+3."],
    prefix: "DVH",
  },
  {
    grupo: "Laminado",
    items: ["3+3", "4+4", "5+5", "6+6"],
    prefix: "Laminado",
  },
  {
    grupo: "Templado",
    items: ["6mm", "8mm", "10mm", "12mm"],
    prefix: "Templado",
  },
  {
    grupo: "Reflectivo",
    items: ["Cafe 6mm", "Gris 6mm", "Azul 6mm"],
    prefix: "Reflectivo",
  },
  {
    grupo: "Especial",
    items: [
      "Catedral Semilla",
      "Catedral Stipolite",
      "Esmerilado / Satinado",
      "Acanalado (Fluted)",
      "Pacífico",
    ],
    prefix: "",
  },
] as const;

export const STATUS_COPY = {
  borrador: {
    title: "Borrador guardado",
    description: "Puedes seguir editando sin perder el avance.",
  },
  creada: {
    title: "Presupuesto listo",
    description: "Listo para PDF y envio por WhatsApp.",
  },
  actualizada: {
    title: "Cambios guardados",
    description: "El presupuesto fue actualizado correctamente.",
  },
} as const;

export const FIELD_LIMITS = {
  clienteNombre: 80,
  obra: 80,
  direccion: 120,
  observaciones: 280,
} as const;

export const STEP_TWO_SCROLL_THRESHOLD = 4;
export const STEP_TWO_VIRTUALIZATION_THRESHOLD = 14;
export const STEP_TWO_VIRTUALIZATION_OVERSCAN = 4;
export const STEP_TWO_DEFAULT_ROW_HEIGHT = 110;
export const STEP_TWO_DEFAULT_GAP = 13;
export const MAX_COMPONENTS_PER_QUOTE = 200;

export const STEP_LABELS = [
  { id: 1 as StepKey, title: "Cliente", sub: "Obra y contacto" },
  { id: 2 as StepKey, title: "Componentes", sub: "Carga y precios" },
  { id: 3 as StepKey, title: "Resumen", sub: "Guardar y enviar" },
];

export function isConnectivityError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("internet_disconnected") ||
    message.includes("fetch")
  );
}

export function buildWorkflowStorageKey(editId: string | null, duplicateId: string | null) {
  if (editId) return `cotizacion-workflow:edit:${editId}`;
  if (duplicateId) return `cotizacion-workflow:duplicate:${duplicateId}`;
  return "cotizacion-workflow:new";
}

export function loadPersistedWorkflowState(
  storageKey: string,
  defaults: {
    provider?: PreferredProvider;
    pricingMode?: PricingMode;
  } = {}
): PersistedWorkflowState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      version?: number;
      step?: StepKey;
      draft?: CotizacionWorkflowDraft;
      componentForm?: Partial<ComponentFormState>;
      editingItemId?: string | null;
      selectedClientId?: string;
      clientQuery?: string;
      showStep1MoreData?: boolean;
    };

    if (
      parsed.version !== 1 &&
      parsed.version !== 2 &&
      parsed.version !== 3 &&
      parsed.version !== 4
    ) {
      return null;
    }

    const emptyDraft = createCotizacionWorkflowDraft();
    const persistedDraft = parsed.draft ?? emptyDraft;

    return {
      ...parsed,
      step: parsed.step ?? 1,
      editingItemId: parsed.editingItemId ?? null,
      selectedClientId: parsed.selectedClientId ?? "",
      clientQuery: parsed.clientQuery ?? "",
      showStep1MoreData: parsed.showStep1MoreData ?? false,
      draft: {
        ...emptyDraft,
        ...persistedDraft,
        quotePricingMode: normalizeQuotePricingMode(persistedDraft.quotePricingMode),
        descuentoPct: Number.isFinite(persistedDraft.descuentoPct)
          ? persistedDraft.descuentoPct
          : emptyDraft.descuentoPct,
        flete: Number.isFinite(persistedDraft.flete) ? persistedDraft.flete : emptyDraft.flete,
        costoTotalFabricacion: Number.isFinite(persistedDraft.costoTotalFabricacion)
          ? Number(persistedDraft.costoTotalFabricacion)
          : emptyDraft.costoTotalFabricacion,
        margenGlobalPct: Number.isFinite(persistedDraft.margenGlobalPct)
          ? Number(persistedDraft.margenGlobalPct)
          : emptyDraft.margenGlobalPct,
        utilidadTotal: Number.isFinite(persistedDraft.utilidadTotal)
          ? Number(persistedDraft.utilidadTotal)
          : emptyDraft.utilidadTotal,
        totalClienteManual:
          persistedDraft.totalClienteManual !== null &&
          persistedDraft.totalClienteManual !== undefined &&
          Number.isFinite(persistedDraft.totalClienteManual)
            ? Number(persistedDraft.totalClienteManual)
            : null,
        items: persistedDraft.items ?? emptyDraft.items,
      },
      componentForm: {
        ...createEmptyComponentForm(
          persistedDraft.items,
          defaults.provider,
          defaults.pricingMode
        ),
        ...parsed.componentForm,
        loteCantidad: parsed.componentForm?.loteCantidad ?? "1",
      },
    } as PersistedWorkflowState;
  } catch {
    return null;
  }
}

export function clearPersistedWorkflowState(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function buildWorkflowDirtySignature(input: {
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
}) {
  return JSON.stringify(input);
}

export const CLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

function resolveLegacyWindowLeafCount(tipo: string, sistema?: string | null) {
  const normalizedType = normalizeSearchValue(tipo);

  if (normalizedType !== "ventana") {
    return getBaseLeafCountForComponent(tipo);
  }

  const normalizedSystem = normalizeSearchValue(sistema ?? "");
  if (
    normalizedSystem === "abatible" ||
    normalizedSystem === "proyectante" ||
    normalizedSystem === "oscilobatiente"
  ) {
    return 1;
  }

  return 2;
}

function getComponentPrefix(tipo: string) {
  const n = tipo.trim().toLowerCase();
  if (n.startsWith("vent")) return "V";
  if (n.startsWith("puert")) return "P";
  if (n.includes("fijo")) return "F";
  if (n.startsWith("cier")) return "C";
  if (n.startsWith("show")) return "S";
  if (n.startsWith("bar")) return "B";
  if (n.startsWith("esp")) return "E";
  if (n.startsWith("tap")) return "M";
  return "I";
}

export function buildNextComponentCode(
  items: CotizacionWorkflowItem[],
  tipo = "Ventana",
  excludeItemId?: string | null
) {
  const prefix = getComponentPrefix(tipo);
  const count =
    items.filter((i) => i.id !== excludeItemId && i.codigo.startsWith(prefix)).length + 1;
  return `${prefix}${count}`;
}

function normalizeLegacyAluminumColorHex(value: string) {
  return value.toLowerCase() === LEGACY_COLOR_HEX ? WOOD_COLOR : value;
}

export function buildUpcomingComponentCodes(
  items: CotizacionWorkflowItem[],
  tipo: string,
  quantity: number
) {
  const safeQuantity = Math.min(MAX_COMPONENTS_PER_QUOTE, Math.max(0, quantity));
  if (safeQuantity === 0) {
    return [];
  }
  const prefix = getComponentPrefix(tipo);
  const existingCount = items.filter((item) => item.codigo.startsWith(prefix)).length;

  return Array.from({ length: safeQuantity }, (_, index) => `${prefix}${existingCount + index + 1}`);
}

export function getComponentTypeLabelForBatch(tipo: string, quantity: number) {
  const normalized = tipo.trim().toLowerCase() || "componentes";
  if (quantity === 1) {
    return normalized;
  }

  if (normalized === "ventana 1 hoja") {
    return "ventanas 1 hoja";
  }

  if (normalized.endsWith("z")) {
    return `${normalized.slice(0, -1)}ces`;
  }

  if (normalized.endsWith("s")) {
    return normalized;
  }

  return `${normalized}s`;
}

export function getRemainingComponentSlots(itemsCount: number) {
  return Math.max(0, MAX_COMPONENTS_PER_QUOTE - itemsCount);
}

export function buildAutoComponentName(form: Pick<ComponentFormState, "codigo" | "tipo">) {
  const codigo = form.codigo.trim();
  const tipo = form.tipo.trim() || "Componente";

  return codigo ? `${tipo} ${codigo}` : tipo;
}

function lowerFirst(value: string) {
  const clean = value.trim();

  if (!clean) {
    return "";
  }

  return `${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
}

export function shouldShowSheetSchemeForComponent(input: {
  tipo: string;
  sistema?: string | null;
}) {
  const tipo = normalizeSearchValue(input.tipo);
  const sistema = normalizeSearchValue(input.sistema ?? "");

  if (tipo === "pano fijo" || tipo === "paño fijo") {
    return true;
  }

  return (
    tipo === "ventana" &&
    ["corredera", "abatible", "oscilobatiente", "proyectante"].includes(sistema)
  );
}

export function shouldShowSystemSelectionForComponent(tipo: string) {
  const normalizedTipo = normalizeSearchValue(tipo);

  return normalizedTipo !== "pano fijo" && normalizedTipo !== "paño fijo";
}

export function getSheetSchemeOptions(input: { tipo: string; sistema?: string | null }) {
  const tipo = normalizeSearchValue(input.tipo);
  const sistema = normalizeSearchValue(input.sistema ?? "");

  if (tipo === "pano fijo" || tipo === "paño fijo") {
    return FIXED_PANE_COMPOSITION_OPTIONS;
  }

  if (tipo === "ventana" && sistema === "corredera") {
    return SHEET_SCHEME_OPTIONS;
  }

  if (tipo === "ventana") {
    return COMPOSITION_OPTIONS_BY_SYSTEM[sistema] ?? [];
  }

  return [];
}

export function getCompositionSectionLabel(input: { tipo: string; sistema?: string | null }) {
  const tipo = normalizeSearchValue(input.tipo);
  const sistema = normalizeSearchValue(input.sistema ?? "");

  if (tipo === "pano fijo" || tipo === "paño fijo") {
    return "Composición de paños";
  }

  return sistema === "corredera" ? "Esquema de hojas" : "Composición";
}

export function getSheetVariantOptions(
  sheetScheme: string,
  input?: { tipo?: string; sistema?: string | null }
) {
  if (input) {
    const tipo = normalizeSearchValue(input.tipo ?? "");
    const sistema = normalizeSearchValue(input.sistema ?? "");

    if (!(tipo === "ventana" && sistema === "corredera")) {
      return [];
    }
  }

  return SHEET_VARIANT_OPTIONS[sheetScheme] ?? [];
}

export function requiresCustomSheetDescription(input: {
  sheetScheme: string;
  sheetVariant: string;
}) {
  return input.sheetScheme === "Personalizado" || input.sheetVariant === "Otro";
}

export function buildSheetSchemeLabel(input: {
  sheetScheme: string;
  sheetVariant: string;
  customSchemeDescription: string;
  isCustomScheme: boolean;
}) {
  const scheme = input.sheetScheme.trim();
  const variant = input.sheetVariant.trim();
  const customDescription = input.customSchemeDescription.trim();
  const isCustomScheme = input.isCustomScheme || scheme === "Personalizado";

  if (isCustomScheme) {
    return customDescription ? `personalizada: ${customDescription}` : "personalizada";
  }

  if (!scheme) {
    return "";
  }

  if (variant === "Otro") {
    return customDescription ? `${scheme}, ${lowerFirst(customDescription)}` : `${scheme}, otro`;
  }

  return variant ? `${scheme}, ${lowerFirst(variant)}` : scheme;
}

export function buildCommercialComponentDisplayName(
  form: Pick<
    ComponentFormState,
    "tipo" | "sistema" | "sheetScheme" | "sheetVariant" | "customSchemeDescription" | "isCustomScheme"
  > & { configuracion?: string; palilloEnabled?: boolean; palilloType?: string }
) {
  const tipo = form.tipo.trim() || "Componente";
  const sistema = form.sistema?.trim() ?? "";
  const configuracion = (form as { configuracion?: string }).configuracion?.trim() ?? "";
  const normalizedTipo = normalizeSearchValue(tipo);
  const normalizedSistema = normalizeSearchValue(sistema);
  const scheme = form.sheetScheme.trim();
  const normalizedScheme = normalizeSearchValue(scheme);
  const shouldAvoidDuplicatedSystem =
    normalizedTipo === "ventana" &&
    Boolean(normalizedSistema) &&
    normalizedScheme.startsWith(normalizedSistema);
  const baseSistema =
    sistema && !shouldAvoidDuplicatedSystem && shouldShowSystemSelectionForComponent(tipo)
      ? `${tipo} ${sistema.toLowerCase()}`
      : tipo;
  const base = configuracion ? `${baseSistema} ${configuracion.toLowerCase()}` : baseSistema;

  if (!shouldShowSheetSchemeForComponent({ tipo, sistema })) {
    const palilloEnabled = (form as { palilloEnabled?: boolean }).palilloEnabled;
    const palilloType = (form as { palilloType?: string }).palilloType?.trim();
    if (palilloEnabled && palilloType) {
      return `${base} con palillo ${palilloType.toLowerCase()}`;
    }
    if (palilloEnabled) {
      return `${base} con palillo`;
    }

    return base;
  }

  let schemeLabel = buildSheetSchemeLabel(form);

  if (normalizeSearchValue(tipo) === "pano fijo" && schemeLabel.startsWith("personalizada")) {
    schemeLabel = schemeLabel.replace(/^personalizada/, "personalizado");
  }

  const displaySchemeLabel = shouldAvoidDuplicatedSystem ? lowerFirst(schemeLabel) : schemeLabel;

  return displaySchemeLabel ? `${base} ${displaySchemeLabel}` : base;
}

function normalizeComparableComponentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isLegacyAutoComponentLabel(tipo: string, descripcion: string) {
  const normalizedDescription = normalizeComparableComponentText(descripcion);
  const normalizedTipo = normalizeComparableComponentText(tipo);

  if (!normalizedDescription || !normalizedTipo) {
    return false;
  }

  const descriptionParts = normalizedDescription.split(" ");
  const tipoParts = normalizedTipo.split(" ");

  if (descriptionParts.length !== tipoParts.length + 1) {
    return false;
  }

  const trailingCode = descriptionParts.at(-1) ?? "";

  if (!/^[a-z]{1,3}\d{1,4}$/.test(trailingCode)) {
    return false;
  }

  return descriptionParts.slice(0, -1).join(" ") === normalizedTipo;
}

export function normalizeCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.replace(/^0+(?=\d)/, "");
}

export function formatCurrencyInput(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function buildQuickEditDraft(item: CotizacionWorkflowItem): QuickEditDraftState {
  if (item.tipoItem === "item_libre_con_valor") {
    return {
      ancho: "",
      alto: "",
      costoProveedorUnitario: String(Math.round(item.precioTotal)),
    };
  }

  const { encodedCostInputScope } =
    decodeCotizacionItemPresentationMeta(item.observaciones);

  return {
    ancho: item.ancho ? String(item.ancho) : "",
    alto: item.alto ? String(item.alto) : "",
    costoProveedorUnitario:
      item.costoProveedorUnitario > 0
        ? String(
            Math.round(
              encodedCostInputScope === "group_total" && item.cantidad > 0
                ? item.costoProveedorUnitario * item.cantidad
                : item.costoProveedorUnitario
            )
          )
        : "",
  };
}

export function isQuickEditDraftComplete(
  draft: QuickEditDraftState,
  quotePricingMode: QuotePricingMode = "por_item"
) {
  const ancho = Number(draft.ancho);
  const alto = Number(draft.alto);
  const costo = Number(draft.costoProveedorUnitario);

  return ancho > 0 && alto > 0 && (quotePricingMode === "total_global" || costo > 0);
}

export function isWorkflowItemComplete(
  item: CotizacionWorkflowItem,
  quotePricingMode: QuotePricingMode = "por_item"
) {
  if (item.tipoItem === "item_libre_con_valor") {
    const hasName = item.nombre.trim().length > 0;
    const hasQuantity = item.cantidad > 0;

    if (normalizeQuotePricingMode(quotePricingMode) === "total_global") {
      return hasName && hasQuantity;
    }

    return hasName && hasQuantity && item.precioTotal > 0;
  }

  return (
    (item.ancho ?? 0) > 0 &&
    (item.alto ?? 0) > 0 &&
    (quotePricingMode === "total_global" || Number(item.costoProveedorUnitario ?? 0) > 0)
  );
}

export function isWorkflowItemEffectivelyComplete(
  item: CotizacionWorkflowItem,
  draftState?: QuickEditDraftState,
  quotePricingMode: QuotePricingMode = "por_item"
) {
  if (item.tipoItem === "item_libre_con_valor") {
    return isWorkflowItemComplete(item, quotePricingMode);
  }

  return draftState
    ? isQuickEditDraftComplete(draftState, quotePricingMode)
    : isWorkflowItemComplete(item, quotePricingMode);
}

export function applyQuickEditDraftStatesToItems(
  items: CotizacionWorkflowItem[],
  quickEditDrafts: Record<string, QuickEditDraftState>,
  quotePricingMode: QuotePricingMode = "por_item"
) {
  return items.map((item) => {
    if (item.tipoItem === "item_libre_con_valor") {
      return item;
    }

    const draftState = quickEditDrafts[item.id];

    if (!draftState) {
      return item;
    }

    try {
      const currentForm = mapItemToForm(item);
      const currentQuickDraft = buildQuickEditDraft(item);
      const isManualTemplateOverride =
        Boolean(currentForm.referencia.trim() && currentForm.precioPorM2.trim()) &&
        draftState.costoProveedorUnitario !== currentQuickDraft.costoProveedorUnitario;
      const nextForm = {
        ...currentForm,
        ancho: draftState.ancho,
        alto: draftState.alto,
        costoProveedorUnitario: draftState.costoProveedorUnitario,
        precioAjustadoManual:
          currentForm.precioAjustadoManual || isManualTemplateOverride,
      } as ComponentFormState;

      return buildItemFromForm(nextForm, items, item.id, { quotePricingMode });
    } catch {
      return item;
    }
  });
}

export function createEmptyFreeValueItemForm(): FreeValueItemFormState {
  return {
    nombre: "",
    descripcion: "",
    valor: "",
    ivaMode: "total_incluye_iva",
  };
}

export function mapFreeValueItemToForm(item: CotizacionWorkflowItem): FreeValueItemFormState {
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);

  return {
    nombre: item.nombre,
    descripcion: item.descripcion,
    valor: String(Math.round(item.precioTotal)),
    ivaMode: meta.ivaMode ?? "total_incluye_iva",
  };
}

export function buildFreeValueItemFromForm(
  form: FreeValueItemFormState,
  items: CotizacionWorkflowItem[],
  editingItemId: string | null,
  options?: { allowZeroValue?: boolean }
) {
  const normalizedValue = normalizeCurrencyInput(form.valor);
  const existingIndex = editingItemId
    ? items.findIndex((item) => item.id === editingItemId)
    : -1;
  const nextIndex = existingIndex >= 0 ? existingIndex + 1 : items.length + 1;

  return calculateFreeValueItem({
    id: editingItemId ?? undefined,
    codigo:
      editingItemId && existingIndex >= 0
        ? items[existingIndex].codigo
        : `L${nextIndex}`,
    nombre: form.nombre,
    descripcion: form.descripcion,
    valor: normalizedValue ? Number(normalizedValue) : 0,
    ivaMode: "total_incluye_iva",
    allowZeroValue: options?.allowZeroValue,
  });
}

export function validateFreeValueItemForm(form: FreeValueItemFormState): FieldErrors {
  const errors: FieldErrors = {};
  const valor = Number(normalizeCurrencyInput(form.valor));

  if (!form.nombre.trim()) {
    errors.nombre = "Ingresa el nombre del item";
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    errors.costoProveedorUnitario = "Ingresa un valor mayor a cero";
  }

  return errors;
}

export function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatChilePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "+56 9 ";
  }

  let localDigits = digits;

  if (localDigits.startsWith("56")) {
    localDigits = localDigits.slice(2);
  }

  if (localDigits.startsWith("9")) {
    localDigits = localDigits.slice(1);
  }

  localDigits = localDigits.slice(0, 8);

  const firstBlock = localDigits.slice(0, 4);
  const secondBlock = localDigits.slice(4, 8);

  if (!firstBlock) {
    return "+56 9 ";
  }

  if (!secondBlock) {
    return `+56 9 ${firstBlock}`;
  }

  return `+56 9 ${firstBlock} ${secondBlock}`;
}

export function formatDraftPhoneValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "+56 9 ";
  }

  if (trimmed.startsWith("+") && !trimmed.startsWith("+56")) {
    return value;
  }

  return formatChilePhoneInput(value);
}

export function buildClientInitials(nombre: string) {
  const words = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "CL";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function buildGlassValue(prefix: string, item: string) {
  return prefix ? `${prefix} ${item}` : item;
}

function pickSuggestedString(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function resolveSuggestedMarginValue(
  pricingMode: PricingMode,
  suggestionMarginPct: number,
  currentValue: string | null | undefined,
  defaultMargin?: number
) {
  if (pricingMode === "precio_directo") {
    return "0";
  }

  const baseValue = defaultMargin ?? DEFAULT_MARGIN_PCT;

  return pickSuggestedString(currentValue, String(baseValue));
}

export function buildComponentFormLinePricingSummary(
  form: Pick<
    ComponentFormState,
    | "ancho"
    | "alto"
    | "cantidad"
    | "precioPorM2"
    | "minimoCobrable"
    | "redondeoPrecio"
  >
) {
  return calculateLineTemplatePricing({
    ancho: form.ancho ? Number(form.ancho) : null,
    alto: form.alto ? Number(form.alto) : null,
    cantidad: form.cantidad ? Number(form.cantidad) : 1,
    precioM2Sugerido: form.precioPorM2 ? Number(form.precioPorM2) : null,
    minimoCobrable: form.minimoCobrable ? Number(form.minimoCobrable) : 0,
    redondeoPrecio: form.redondeoPrecio ? Number(form.redondeoPrecio) : 1000,
  });
}

export function syncTemplatePricingInComponentForm(
  form: ComponentFormState,
  options?: { forceSuggestedPrice?: boolean }
) {
  const referencia = typeof form.referencia === "string" ? form.referencia.trim() : "";
  const precioPorM2 = typeof form.precioPorM2 === "string" ? form.precioPorM2.trim() : "";

  if (!referencia || !precioPorM2) {
    return form;
  }

  const pricingSummary = buildComponentFormLinePricingSummary(form);
  const suggestedPrice =
    pricingSummary.precioUnitarioSugerido !== null
      ? String(Math.round(pricingSummary.precioUnitarioSugerido))
      : "";

  if (form.pricingMode === "margen") {
    return {
      ...form,
      precioPlantillaSugerido: suggestedPrice,
      origenPrecio: "margen" as ComponentFormState["origenPrecio"],
    };
  }

  const nextForm: ComponentFormState = {
    ...form,
    pricingMode: "precio_directo",
    margenPct: "0",
    precioPlantillaSugerido: suggestedPrice,
    origenPrecio: form.precioAjustadoManual ? "manual" : "plantilla",
  };

  if (
    !form.precioAjustadoManual &&
    suggestedPrice &&
    (options?.forceSuggestedPrice || form.costoProveedorUnitario !== suggestedPrice)
  ) {
    nextForm.costoProveedorUnitario = suggestedPrice;
  }

  return nextForm;
}

export function applyLineTemplateToComponentForm(
  form: ComponentFormState,
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
) {
  const preserveManualPrice = form.precioAjustadoManual;

  return syncTemplatePricingInComponentForm(
    {
      ...form,
      material: template.material,
      referencia: template.nombre,
      lineTemplateId: String(template.id),
      vidrio: template.vidrioPrincipalRecomendado?.trim() || form.vidrio,
      pricingMode: "precio_directo",
      margenPct: "0",
      precioPorM2: String(Math.round(template.precioM2Sugerido)),
      minimoCobrable: String(Math.round(template.minimoCobrable)),
      redondeoPrecio: String(Math.round(template.redondeoPrecio ?? 0)),
      precioAjustadoManual: preserveManualPrice,
      origenPrecio: preserveManualPrice ? "manual" : "plantilla",
    },
    { forceSuggestedPrice: !preserveManualPrice }
  );
}

export function filterGlassOptions(query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  return GLASS_OPTIONS.map((group) => {
    const items = group.items.filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      const fullValue = buildGlassValue(group.prefix, item);
      const haystack = [group.grupo, item, fullValue].map(normalizeSearchValue).join(" ");

      return haystack.includes(normalizedQuery);
    });

    return {
      ...group,
      items,
    };
  }).filter((group) => group.items.length > 0);
}

export function buildSuggestedComponentForm(
  input: {
    items?: CotizacionWorkflowItem[];
    tipo?: string;
    provider?: PreferredProvider;
    pricingMode?: PricingMode;
    defaultMargin?: number;
    current?: Partial<ComponentFormState>;
  } = {}
): ComponentFormState {
  const items = input.items ?? [];
  const tipo = input.tipo ?? input.current?.tipo ?? "Ventana";
  const pricingMode = normalizePricingMode(
    input.current?.pricingMode ?? input.pricingMode
  );
  const suggestion = getComponentSuggestion({
    tipo,
    provider: input.provider,
  });
  const current = input.current ?? {};

  return {
    codigo: pickSuggestedString(current.codigo, buildNextComponentCode(items, tipo)),
    tipo,
    hojasBase: current.hojasBase ?? getBaseLeafCountForComponent(tipo),
    material:
      current.material === "PVC" || current.material === "Aluminio"
        ? current.material
        : suggestion.material,
    referencia: pickSuggestedString(current.referencia, suggestion.referencia),
    sistema: current.sistema ?? splitComponentReference(current.referencia ?? suggestion.referencia, tipo).sistema,
    configuracion:
      current.configuracion ??
      splitComponentReference(current.referencia ?? suggestion.referencia, tipo).configuracion,
    sheetScheme: current.sheetScheme ?? "",
    sheetVariant: current.sheetVariant ?? "",
    customSchemeDescription: current.customSchemeDescription ?? "",
    isCustomScheme: current.isCustomScheme ?? false,
    lineTemplateId: current.lineTemplateId ?? "",
    pricingMode,
    vidrio: pickSuggestedString(current.vidrio, suggestion.vidrio),
    nombre: current.nombre ?? "",
    descripcion: pickSuggestedString(current.descripcion, suggestion.descripcion),
    ancho: current.ancho ?? "",
    alto: current.alto ?? "",
    cantidad: current.cantidad ?? "1",
    costoProveedorUnitario: current.costoProveedorUnitario ?? "",
    margenPct: resolveSuggestedMarginValue(
      pricingMode,
      suggestion.margenPct,
      current.margenPct,
      input.defaultMargin
    ),
    precioPorM2: current.precioPorM2 ?? "",
    minimoCobrable: current.minimoCobrable ?? "",
    redondeoPrecio: current.redondeoPrecio ?? "1000",
    precioPlantillaSugerido: current.precioPlantillaSugerido ?? "",
    precioAjustadoManual: current.precioAjustadoManual ?? false,
    origenPrecio:
      current.origenPrecio ?? (pricingMode === "precio_directo" ? "manual" : "margen"),
    observaciones: current.observaciones ?? "",
    colorHex:
      typeof current.colorHex === "string" && /^#[0-9a-fA-F]{3,8}$/.test(current.colorHex)
        ? normalizeLegacyAluminumColorHex(current.colorHex)
        : suggestion.colorHex,
    loteCantidad: current.loteCantidad ?? "1",
  };
}

export function createEmptyComponentForm(
  items: CotizacionWorkflowItem[] = [],
  provider: PreferredProvider = "",
  pricingMode: PricingMode = "margen",
  defaultMargin?: number
): ComponentFormState {
  return buildSuggestedComponentForm({
    items,
    tipo: "Ventana",
    provider,
    pricingMode,
    defaultMargin,
  });
}

export function mapRecordToDraft(record: CotizacionWorkflowRecord): CotizacionWorkflowDraft {
  return {
    clienteNombre: record.clienteNombre,
    clienteTelefono: record.clienteTelefono,
    obra: record.obra,
    direccion: record.direccion,
    validez: record.validez,
    descuentoPct: record.descuentoPct,
    flete: record.flete,
    observaciones: record.observaciones,
    items: record.items,
    quotePricingMode: normalizeQuotePricingMode(record.quotePricingMode),
    costoTotalFabricacion: record.costoTotalFabricacion ?? 0,
    margenGlobalPct: record.margenGlobalPct ?? 100,
    utilidadTotal: record.utilidadTotal ?? 0,
    totalClienteManual: record.totalClienteManual ?? null,
  };
}

export function mapItemToForm(item: CotizacionWorkflowItem): ComponentFormState {
  if (item.tipoItem === "item_libre_con_valor") {
    return {
      ...createEmptyComponentForm(),
      codigo: item.codigo,
      tipo: "Trabajo personalizado",
      nombre: item.nombre,
      descripcion: item.descripcion,
      cantidad: "1",
      costoProveedorUnitario: String(Math.round(item.precioTotal)),
      margenPct: "0",
      pricingMode: "precio_directo",
      observaciones: decodeCotizacionItemPresentationMeta(item.observaciones).raw,
    };
  }

  const canonicalTipo = resolveCanonicalComponentType(item.tipo);
  const {
    colorHex,
    referencia,
    sistema,
    configuracion,
    hojasBase,
    sheetScheme,
    sheetVariant,
    customSchemeDescription,
    isCustomScheme,
    material,
    pricingMode,
    raw,
    lineTemplateId,
    precioPorM2,
    minimoCobrable,
    redondeoPrecio,
    precioPlantillaSugerido,
    precioAjustadoManual,
    origenPrecio,
    encodedMargenPct,
    encodedCostInputScope,
  } =
    decodeCotizacionItemPresentationMeta(item.observaciones);

  const referenceParts = splitComponentReference(
    referencia || item.lineaComercial || "",
    canonicalTipo
  );
  const resolvedSystem = sistema || referenceParts.sistema;

  return {
    codigo: item.codigo,
    tipo: canonicalTipo,
    hojasBase: hojasBase ?? resolveLegacyWindowLeafCount(item.tipo, resolvedSystem),
    material,
    referencia: referencia || item.lineaComercial || "",
    sistema: resolvedSystem,
    configuracion: configuracion || referenceParts.configuracion,
    sheetScheme,
    sheetVariant,
    customSchemeDescription,
    isCustomScheme,
    lineTemplateId,
    pricingMode,
    vidrio: item.vidrio ?? "",
    nombre: item.nombre,
    descripcion: item.descripcion,
    ancho: item.ancho ? String(item.ancho) : "",
    alto: item.alto ? String(item.alto) : "",
    cantidad: String(item.cantidad),
    costoProveedorUnitario: String(
      encodedCostInputScope === "group_total" && item.cantidad > 0
        ? Math.round(item.costoProveedorUnitario * item.cantidad)
        : item.costoProveedorUnitario
    ),
    margenPct: String(
      item.margenPct > 0
        ? item.margenPct
        : encodedMargenPct !== null && encodedMargenPct > 0
          ? encodedMargenPct
          : pricingMode === "margen"
            ? DEFAULT_MARGIN_PCT
            : 0
    ),
    precioPorM2:
      precioPorM2 !== null
        ? String(Math.round(precioPorM2))
        : item.precioPorM2 !== null
          ? String(Math.round(item.precioPorM2))
          : "",
    minimoCobrable:
      minimoCobrable !== null
        ? String(Math.round(minimoCobrable))
        : item.minimoCobrable !== null
          ? String(Math.round(item.minimoCobrable))
          : "",
    redondeoPrecio:
      redondeoPrecio !== null
        ? String(Math.round(redondeoPrecio))
        : item.redondeoPrecio !== null
          ? String(Math.round(item.redondeoPrecio))
          : "1000",
    precioPlantillaSugerido:
      precioPlantillaSugerido !== null
        ? String(Math.round(precioPlantillaSugerido))
        : item.precioPlantillaSugerido !== null
          ? String(Math.round(item.precioPlantillaSugerido))
          : "",
    precioAjustadoManual: precioAjustadoManual || item.precioAjustadoManual,
    origenPrecio: origenPrecio || item.origenPrecio,
    observaciones: raw,
    colorHex: normalizeLegacyAluminumColorHex(colorHex),
    loteCantidad: "1",
    costInputScope: (encodedCostInputScope || "unit") as CostInputScope,
  };
}

export function buildItemFromForm(
  form: ComponentFormState,
  items: CotizacionWorkflowItem[],
  editingItemId: string | null,
  options?: { quotePricingMode?: QuotePricingMode }
) {
  const pricingMode = normalizePricingMode(form.pricingMode);
  const quotePricingMode = normalizeQuotePricingMode(options?.quotePricingMode);
  const syncedForm = syncTemplatePricingInComponentForm(form);
  const costoProveedorUnitario =
    quotePricingMode === "total_global" ? 0 : Number(syncedForm.costoProveedorUnitario || 0);
  const margenPct =
    quotePricingMode === "total_global"
      ? 0
      : pricingMode === "precio_directo"
        ? 0
        : Number(syncedForm.margenPct || 0);
  const linePricingSummary = buildComponentFormLinePricingSummary(syncedForm);
  const hasTemplateReference =
    typeof syncedForm.referencia === "string" && syncedForm.referencia.trim().length > 0;
  const hasTemplatePrice =
    typeof syncedForm.precioPorM2 === "string" && syncedForm.precioPorM2.trim().length > 0;
  const referenceParts = splitComponentReference(syncedForm.referencia, syncedForm.tipo);
  const sistema = syncedForm.sistema?.trim() || referenceParts.sistema;
  const configuracion = syncedForm.configuracion?.trim() || referenceParts.configuracion;
  const hojasBase =
    syncedForm.hojasBase ??
    getBaseLeafCountForComponent(syncedForm.tipo) ??
    resolveLegacyWindowLeafCount(syncedForm.tipo, sistema);
  const sheetSchemeEnabled = shouldShowSheetSchemeForComponent({
    tipo: syncedForm.tipo,
    sistema,
  });
  const sheetSchemeOptions = getSheetSchemeOptions({ tipo: syncedForm.tipo, sistema });
  const sheetVariantOptions = getSheetVariantOptions(syncedForm.sheetScheme, {
    tipo: syncedForm.tipo,
    sistema,
  });
  const sheetScheme =
    sheetSchemeEnabled && sheetSchemeOptions.includes(syncedForm.sheetScheme)
      ? syncedForm.sheetScheme.trim()
      : "";
  const sheetVariant =
    sheetSchemeEnabled && sheetVariantOptions.includes(syncedForm.sheetVariant)
      ? syncedForm.sheetVariant.trim()
      : "";
  const customSchemeDescription = sheetSchemeEnabled
    ? syncedForm.customSchemeDescription.trim()
    : "";
  const isCustomScheme =
    sheetSchemeEnabled &&
    (syncedForm.isCustomScheme ||
      sheetScheme === "Personalizado" ||
      sheetVariant === "Otro");
  const generatedDisplayName = buildCommercialComponentDisplayName({
    tipo: syncedForm.tipo,
    sistema,
    sheetScheme,
    sheetVariant,
    customSchemeDescription,
    isCustomScheme,
    configuracion,
    palilloEnabled: syncedForm.palilloEnabled,
    palilloType: syncedForm.palilloType,
  });
  const autoName = form.nombre.trim() || generatedDisplayName || buildAutoComponentName(form);
  const rawDescription = form.descripcion.trim();
  const normalizedAutoName = normalizeComparableComponentText(autoName);
  const descripcion =
    rawDescription &&
    normalizeComparableComponentText(rawDescription) !== normalizedAutoName &&
    !isLegacyAutoComponentLabel(form.tipo, rawDescription)
      ? rawDescription
      : "";
  const origenPrecio =
    hasTemplateReference && hasTemplatePrice
      ? syncedForm.precioAjustadoManual
        ? "manual"
        : "plantilla"
      : pricingMode === "precio_directo"
        ? "manual"
        : "margen";

  return calculateComponentItem({
    id: editingItemId ?? undefined,
    codigo: syncedForm.codigo.trim() || buildNextComponentCode(items, syncedForm.tipo),
    tipo: syncedForm.tipo,
    lineaComercial: syncedForm.referencia.trim(),
    vidrio: syncedForm.vidrio,
    nombre: autoName,
    descripcion,
    ancho: syncedForm.ancho ? Number(syncedForm.ancho) : null,
    alto: syncedForm.alto ? Number(syncedForm.alto) : null,
    cantidad: Number(syncedForm.cantidad || 1),
    unidad: "unidad",
    costoProveedorUnitario,
    margenPct,
    costInputScope: syncedForm.costInputScope,
    precioPorM2: syncedForm.precioPorM2 ? Number(syncedForm.precioPorM2) : null,
    minimoCobrable: syncedForm.minimoCobrable ? Number(syncedForm.minimoCobrable) : null,
    redondeoPrecio: syncedForm.redondeoPrecio ? Number(syncedForm.redondeoPrecio) : null,
    precioPlantillaSugerido: linePricingSummary.precioUnitarioSugerido,
    precioAjustadoManual: syncedForm.precioAjustadoManual,
    origenPrecio,
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: syncedForm.colorHex,
      referencia: syncedForm.referencia,
      sistema,
      configuracion,
      hojasBase,
      sheetScheme,
      sheetVariant,
      customSchemeDescription,
      isCustomScheme,
      material: syncedForm.material,
      pricingMode,
      lineTemplateId: syncedForm.lineTemplateId,
      precioPorM2: syncedForm.precioPorM2 ? Number(syncedForm.precioPorM2) : null,
      minimoCobrable: syncedForm.minimoCobrable ? Number(syncedForm.minimoCobrable) : null,
      redondeoPrecio: syncedForm.redondeoPrecio ? Number(syncedForm.redondeoPrecio) : null,
      precioPlantillaSugerido:
        quotePricingMode === "total_global" ? null : linePricingSummary.precioUnitarioSugerido,
      precioAjustadoManual:
        quotePricingMode === "total_global" ? false : syncedForm.precioAjustadoManual,
      origenPrecio: quotePricingMode === "total_global" ? "manual" : origenPrecio,
      palilloEnabled: syncedForm.palilloEnabled,
      palilloType: syncedForm.palilloType,
      margenPct: Number.isFinite(margenPct) ? margenPct : null,
      costInputScope: syncedForm.costInputScope,
      raw: syncedForm.observaciones,
    }),
    tipoItem: "componente",
  });
}

export function applyQuotePricingToItems(
  items: CotizacionWorkflowItem[],
  pricingMode: PricingMode,
  marginValue: string
) {
  const normalizedMargin = pricingMode === "precio_directo" ? 0 : Number(marginValue || 0);

  return items.map((item) => {
    if (item.tipoItem === "item_libre_con_valor") {
      return item;
    }

    const {
      colorHex,
      referencia,
      sistema,
      configuracion,
      hojasBase,
      sheetScheme,
      sheetVariant,
      customSchemeDescription,
      isCustomScheme,
      material,
      raw,
      lineTemplateId,
      precioPorM2,
      minimoCobrable,
      redondeoPrecio,
      precioAjustadoManual,
    } = decodeCotizacionItemPresentationMeta(item.observaciones);

    return calculateComponentItem({
      id: item.id,
      codigo: item.codigo,
      tipo: item.tipo,
      lineaComercial: item.lineaComercial || referencia,
      vidrio: item.vidrio,
      nombre: item.nombre,
      descripcion: item.descripcion,
      ancho: item.ancho,
      alto: item.alto,
      cantidad: item.cantidad,
      unidad: item.unidad,
      costoProveedorUnitario: item.costoProveedorUnitario,
      margenPct: normalizedMargin,
      precioPorM2: precioPorM2 ?? item.precioPorM2,
      minimoCobrable: minimoCobrable ?? item.minimoCobrable,
      redondeoPrecio: redondeoPrecio ?? item.redondeoPrecio,
      precioPlantillaSugerido: item.precioPlantillaSugerido,
      precioAjustadoManual:
        pricingMode === "precio_directo"
          ? precioAjustadoManual || item.precioAjustadoManual
          : false,
      origenPrecio: pricingMode === "precio_directo" ? item.origenPrecio : "margen",
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex,
        referencia,
        sistema,
        configuracion,
        hojasBase,
        sheetScheme,
        sheetVariant,
        customSchemeDescription,
        isCustomScheme,
        material,
        pricingMode,
        lineTemplateId,
        precioPorM2: precioPorM2 ?? item.precioPorM2,
        minimoCobrable: minimoCobrable ?? item.minimoCobrable,
        redondeoPrecio: redondeoPrecio ?? item.redondeoPrecio,
        precioPlantillaSugerido: item.precioPlantillaSugerido,
        precioAjustadoManual:
          pricingMode === "precio_directo"
            ? precioAjustadoManual || item.precioAjustadoManual
            : false,
        origenPrecio: pricingMode === "precio_directo" ? item.origenPrecio : "margen",
        raw,
      }),
    });
  });
}

export function validateComponentForm(
  form: ComponentFormState,
  items: CotizacionWorkflowItem[],
  editingItemId: string | null,
  options?: { quotePricingMode?: QuotePricingMode }
): FieldErrors {
  const errors: FieldErrors = {};
  const quotePricingMode = normalizeQuotePricingMode(options?.quotePricingMode);
  if (!form.codigo.trim()) errors.codigo = "El codigo es obligatorio";
  else if (
    items.some(
      (i) => i.codigo.toLowerCase() === form.codigo.trim().toLowerCase() && i.id !== editingItemId
    )
  ) {
    errors.codigo = "Ese codigo ya existe en esta cotizacion";
  }
  if (!form.tipo.trim()) errors.tipo = "Selecciona un tipo";
  if (!form.material.trim()) errors.material = "Selecciona material";
  const qty = Number(form.cantidad);
  if (!form.cantidad || Number.isNaN(qty) || qty < 1) errors.cantidad = "Minimo 1";
  const hasCostValue = form.costoProveedorUnitario.trim() !== "";
  const costo = Number(form.costoProveedorUnitario);
  if (quotePricingMode !== "total_global" && hasCostValue && (Number.isNaN(costo) || costo < 0)) {
    errors.costoProveedorUnitario =
      form.pricingMode === "precio_directo"
        ? "Ingresa el precio final"
        : "Ingresa el precio base";
  }
  if (quotePricingMode !== "total_global" && form.pricingMode === "margen") {
    const margen = Number(form.margenPct);
    if (form.margenPct === "" || Number.isNaN(margen) || margen < 0) {
      errors.margenPct = "El margen de ganancia no puede ser negativo";
    }
  }
  const lote = Number(form.loteCantidad);
  if (!editingItemId && (!form.loteCantidad || Number.isNaN(lote) || lote < 1)) {
    errors.step2 = "Indica cuántas piezas quieres agregar ahora.";
  }
  if (!editingItemId && items.length + Math.max(1, lote || 1) > MAX_COMPONENTS_PER_QUOTE) {
    errors.step2 = `Puedes cargar hasta ${MAX_COMPONENTS_PER_QUOTE} piezas por cotización.`;
  }
  return errors;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateStep1(_draft: CotizacionWorkflowDraft): FieldErrors {
  return {};
}

export function withResolvedWorkflowObra(
  draft: CotizacionWorkflowDraft
): CotizacionWorkflowDraft {
  const resolvedObra = resolveWorkflowObraTitle({
    obra: draft.obra,
    clienteNombre: draft.clienteNombre,
  });

  if (resolvedObra === draft.obra) {
    return draft;
  }

  return {
    ...draft,
    obra: resolvedObra,
  };
}

export function scrollPageToTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function scrollToSection(sectionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}
