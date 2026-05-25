import {
  getComponentSuggestion,
  type PreferredProvider,
} from "@/features/cotizaciones/services/component-suggestions.service";
import {
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
} from "@/utils/cotizacion-item-presentation";
import {
  normalizePricingMode,
  type PricingMode,
} from "@/features/cotizaciones/types/pricing-mode";
import {
  COMPONENT_TYPE_GROUPS as CATALOG_COMPONENT_TYPE_GROUPS,
  getBaseLeafCountForComponent,
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
};

export type FieldErrors = Partial<
  Record<
    keyof ComponentFormState | "clienteNombre" | "obra" | "items" | "step1" | "step2",
    string
  >
>;

export type PersistedWorkflowState = {
  version: 3;
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

    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) {
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
        descuentoPct: Number.isFinite(persistedDraft.descuentoPct)
          ? persistedDraft.descuentoPct
          : emptyDraft.descuentoPct,
        flete: Number.isFinite(persistedDraft.flete) ? persistedDraft.flete : emptyDraft.flete,
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

function isSingleLeafWindowType(tipo: string) {
  return normalizeSearchValue(tipo) === "ventana 1 hoja";
}

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
  return {
    ancho: item.ancho ? String(item.ancho) : "",
    alto: item.alto ? String(item.alto) : "",
    costoProveedorUnitario:
      item.costoProveedorUnitario > 0 ? String(Math.round(item.costoProveedorUnitario)) : "",
  };
}

export function isQuickEditDraftComplete(draft: QuickEditDraftState) {
  const ancho = Number(draft.ancho);
  const alto = Number(draft.alto);
  const costo = Number(draft.costoProveedorUnitario);

  return ancho > 0 && alto > 0 && costo > 0;
}

export function isWorkflowItemComplete(item: CotizacionWorkflowItem) {
  return (
    (item.ancho ?? 0) > 0 &&
    (item.alto ?? 0) > 0 &&
    Number(item.costoProveedorUnitario ?? 0) > 0
  );
}

export function isWorkflowItemEffectivelyComplete(
  item: CotizacionWorkflowItem,
  draftState?: QuickEditDraftState
) {
  return draftState ? isQuickEditDraftComplete(draftState) : isWorkflowItemComplete(item);
}

export function applyQuickEditDraftStatesToItems(
  items: CotizacionWorkflowItem[],
  quickEditDrafts: Record<string, QuickEditDraftState>
) {
  return items.map((item) => {
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

      return buildItemFromForm(nextForm, items, item.id);
    } catch {
      return item;
    }
  });
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

  const baseValue = defaultMargin ?? suggestionMarginPct;

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
  };
}

export function mapItemToForm(item: CotizacionWorkflowItem): ComponentFormState {
  const {
    colorHex,
    referencia,
    sistema,
    configuracion,
    hojasBase,
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
  } =
    decodeCotizacionItemPresentationMeta(item.observaciones);

  const referenceParts = splitComponentReference(
    referencia || item.lineaComercial || "",
    item.tipo
  );
  const resolvedSystem = sistema || referenceParts.sistema;

  return {
    codigo: item.codigo,
    tipo: item.tipo,
    hojasBase: hojasBase ?? resolveLegacyWindowLeafCount(item.tipo, resolvedSystem),
    material,
    referencia: referencia || item.lineaComercial || "",
    sistema: resolvedSystem,
    configuracion: configuracion || referenceParts.configuracion,
    lineTemplateId,
    pricingMode,
    vidrio: item.vidrio ?? "",
    nombre: item.nombre,
    descripcion: item.descripcion,
    ancho: item.ancho ? String(item.ancho) : "",
    alto: item.alto ? String(item.alto) : "",
    cantidad: String(item.cantidad),
    costoProveedorUnitario: String(item.costoProveedorUnitario),
    margenPct: String(item.margenPct),
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
  };
}

export function buildItemFromForm(
  form: ComponentFormState,
  items: CotizacionWorkflowItem[],
  editingItemId: string | null
) {
  const autoName = form.nombre.trim() || buildAutoComponentName(form);
  const rawDescription = form.descripcion.trim();
  const normalizedAutoName = normalizeComparableComponentText(autoName);
  const descripcion =
    rawDescription &&
    normalizeComparableComponentText(rawDescription) !== normalizedAutoName &&
    !isLegacyAutoComponentLabel(form.tipo, rawDescription)
      ? rawDescription
      : "";
  const pricingMode = normalizePricingMode(form.pricingMode);
  const syncedForm = syncTemplatePricingInComponentForm(form);
  const costoProveedorUnitario = Number(syncedForm.costoProveedorUnitario || 0);
  const margenPct =
    pricingMode === "precio_directo" ? 0 : Number(syncedForm.margenPct || 0);
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
      material: syncedForm.material,
      pricingMode,
      lineTemplateId: syncedForm.lineTemplateId,
      precioPorM2: syncedForm.precioPorM2 ? Number(syncedForm.precioPorM2) : null,
      minimoCobrable: syncedForm.minimoCobrable ? Number(syncedForm.minimoCobrable) : null,
      redondeoPrecio: syncedForm.redondeoPrecio ? Number(syncedForm.redondeoPrecio) : null,
      precioPlantillaSugerido: linePricingSummary.precioUnitarioSugerido,
      precioAjustadoManual: syncedForm.precioAjustadoManual,
      origenPrecio,
      raw: syncedForm.observaciones,
    }),
  });
}

export function applyQuotePricingToItems(
  items: CotizacionWorkflowItem[],
  pricingMode: PricingMode,
  marginValue: string
) {
  const normalizedMargin = pricingMode === "precio_directo" ? 0 : Number(marginValue || 0);

  return items.map((item) => {
    const {
      colorHex,
      referencia,
      sistema,
      configuracion,
      hojasBase,
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
  editingItemId: string | null
): FieldErrors {
  const errors: FieldErrors = {};
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
  if (hasCostValue && (Number.isNaN(costo) || costo < 0)) {
    errors.costoProveedorUnitario =
      form.pricingMode === "precio_directo"
        ? "Ingresa el precio final"
        : "Ingresa el precio base";
  }
  if (form.pricingMode === "margen") {
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

export function validateStep1(draft: CotizacionWorkflowDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.clienteNombre.trim()) errors.clienteNombre = "El nombre del cliente es obligatorio";
  if (Object.keys(errors).length > 0) {
    errors.step1 = "Completa al menos el nombre del cliente para continuar.";
  }
  return errors;
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
