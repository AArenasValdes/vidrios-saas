"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LuArrowLeft,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCopy,
  LuDownload,
  LuEye,
  LuFileCheck2,
  LuFilterX,
  LuFolderOpen,
  LuLayers3,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuPlus,
  LuSave,
  LuSearch,
  LuTrash2,
  LuUserRound,
} from "react-icons/lu";

import { useCotizacionesStore } from "@/hooks/useCotizacionesStore";
import { useOrganizationProfile } from "@/hooks/useOrganizationProfile";
import {
  getComponentSuggestion,
  type PreferredProvider,
} from "@/services/component-suggestions.service";
import {
  calculateComponentItem,
  calculateCotizacionWorkflowTotals,
  createCotizacionWorkflowDraft,
} from "@/services/cotizaciones-workflow.service";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/types/cotizacion-workflow";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";
import { generateComponentSVG } from "@/utils/window-drawings";
import {
  getCotizacionShareExperience,
} from "@/utils/share-capabilities";
import {
  normalizePricingMode,
  type PricingMode,
} from "@/types/pricing-mode";

import s from "./page.module.css";

type StepKey = 1 | 2 | 3;

type ComponentFormState = {
  codigo: string;
  tipo: string;
  material: "Aluminio" | "PVC";
  referencia: string;
  pricingMode: PricingMode;
  vidrio: string;
  nombre: string;
  descripcion: string;
  ancho: string;
  alto: string;
  cantidad: string;
  costoProveedorUnitario: string;
  margenPct: string;
  observaciones: string;
  colorHex: string;
  loteCantidad: string;
};

type FieldErrors = Partial<
  Record<
    keyof ComponentFormState | "clienteNombre" | "obra" | "items" | "step1" | "step2",
    string
  >
>;

type PersistedWorkflowState = {
  version: 2;
  step: StepKey;
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
};

type QuickEditDraftState = {
  ancho: string;
  alto: string;
  costoProveedorUnitario: string;
};

type ComponentListCardViewModel = {
  id: string;
  source: CotizacionWorkflowItem;
  colorHex: string;
  title: string;
  price: string;
  metaPrimary: string;
  metaSecondary: string;
  metaTertiary: string;
  quickEditPriceLabel: string;
  svgMarkup: string;
};

const COMPONENT_TYPE_GROUPS = [
  {
    title: "Aberturas",
    items: ["Ventana", "Puerta", "Paño Fijo", "Shower door"],
  },
  {
    title: "Cierres y exterior",
    items: ["Cierre (Logia/Balcón)", "Baranda"],
  },
  {
    title: "Vidrio decorativo",
    items: ["Espejo", "Tapa de mesa", "Otro"],
  },
] as const;
const VALIDEZ_OPTIONS = ["7 dias", "15 dias", "30 dias"];
const MATERIAL_OPTIONS = ["Aluminio", "PVC"] as const;
const MARGIN_PRESET_OPTIONS = [30, 50, 80, 100];
const COLOR_OPTIONS = [
  { label: "Aluminio natural", hex: "#a8a8a8" },
  { label: "Blanco", hex: "#f0eeeb" },
  { label: "Blanco hueso", hex: "#dfd5c4" },
  { label: "Negro", hex: "#2a2a2a" },
  { label: "Negro mate", hex: "#444444" },
  { label: "Bronce", hex: "#b87333" },
];
const GLASS_OPTIONS = [
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
    items: ["Bronce 6mm", "Gris 6mm", "Azul 6mm"],
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

function isConnectivityError(error: unknown) {
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

const STATUS_COPY = {
  borrador: {
    title: "Borrador guardado",
    description: "Podes seguir editando sin perder el avance.",
  },
  creada: {
    title: "Presupuesto listo",
    description: "Disponible para PDF y envio por WhatsApp.",
  },
  actualizada: {
    title: "Cambios guardados",
    description: "El presupuesto fue actualizado correctamente.",
  },
} as const;

const FIELD_LIMITS = {
  clienteNombre: 80,
  obra: 80,
  direccion: 120,
  observaciones: 280,
} as const;
const STEP_TWO_VIRTUALIZATION_THRESHOLD = 14;
const STEP_TWO_VIRTUALIZATION_OVERSCAN = 4;
const STEP_TWO_DEFAULT_ROW_HEIGHT = 110;
const STEP_TWO_DEFAULT_GAP = 13;

const STEP_LABELS = [
  { id: 1 as StepKey, title: "Cliente", sub: "Obra y contacto" },
  { id: 2 as StepKey, title: "Componentes", sub: "Carga y precios" },
  { id: 3 as StepKey, title: "Resumen", sub: "Guardar y enviar" },
];

function buildWorkflowStorageKey(editId: string | null, duplicateId: string | null) {
  if (editId) return `cotizacion-workflow:edit:${editId}`;
  if (duplicateId) return `cotizacion-workflow:duplicate:${duplicateId}`;
  return "cotizacion-workflow:new";
}

function loadPersistedWorkflowState(
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

    if (parsed.version !== 1 && parsed.version !== 2) {
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

function clearPersistedWorkflowState(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

function buildWorkflowDirtySignature(input: {
  draft: CotizacionWorkflowDraft;
  componentForm: ComponentFormState;
  editingItemId: string | null;
  selectedClientId: string;
  clientQuery: string;
  showStep1MoreData: boolean;
}) {
  return JSON.stringify(input);
}

const CLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

function getColorLabel(colorHex: string) {
  return COLOR_OPTIONS.find((color) => color.hex === colorHex)?.label ?? "Color a definir";
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

function buildNextComponentCode(items: CotizacionWorkflowItem[], tipo = "Ventana") {
  const prefix = getComponentPrefix(tipo);
  const count = items.filter((i) => i.codigo.startsWith(prefix)).length + 1;
  return `${prefix}${count}`;
}

function buildAutoComponentName(form: Pick<ComponentFormState, "codigo" | "tipo">) {
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

function normalizeCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.replace(/^0+(?=\d)/, "");
}

function formatCurrencyInput(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function buildQuickEditDraft(item: CotizacionWorkflowItem): QuickEditDraftState {
  return {
    ancho: item.ancho ? String(item.ancho) : "",
    alto: item.alto ? String(item.alto) : "",
    costoProveedorUnitario:
      item.costoProveedorUnitario > 0 ? String(Math.round(item.costoProveedorUnitario)) : "",
  };
}

const MobileQuickEditor = memo(function MobileQuickEditor({
  item,
  initialDraft,
  itemIndex,
  totalItems,
  pricingLabel,
  onDraftChange,
  onCommit,
  onNavigate,
  onScrollToSummary,
}: {
  item: CotizacionWorkflowItem;
  initialDraft: QuickEditDraftState;
  itemIndex: number;
  totalItems: number;
  pricingLabel: string;
  onDraftChange: (
    itemId: string,
    key: keyof QuickEditDraftState,
    value: string
  ) => void;
  onCommit: (itemId: string, draft: QuickEditDraftState) => void;
  onNavigate: (direction: -1 | 1) => void;
  onScrollToSummary: () => void;
}) {
  const [localDraft, setLocalDraft] = useState<QuickEditDraftState>(initialDraft);

  useEffect(() => {
    setLocalDraft(initialDraft);
  }, [item.id]);

  const handleFieldChange = useCallback(
    (key: keyof QuickEditDraftState, value: string) => {
      const normalizedValue =
        key === "costoProveedorUnitario"
          ? normalizeCurrencyInput(value)
          : value.replace(/[^\d]/g, "");

      setLocalDraft((current) => {
        const nextDraft = {
          ...current,
          [key]: normalizedValue,
        };

        onDraftChange(item.id, key, normalizedValue);

        return nextDraft;
      });
    },
    [item.id, onDraftChange]
  );

  const handleBlur = useCallback(() => {
    onCommit(item.id, localDraft);
  }, [item.id, localDraft, onCommit]);

  const handleNavigate = useCallback(
    (direction: -1 | 1) => {
      handleBlur();
      onNavigate(direction);
    },
    [handleBlur, onNavigate]
  );

  const handleSummary = useCallback(() => {
    handleBlur();
    onScrollToSummary();
  }, [handleBlur, onScrollToSummary]);

  return (
    <section className={s.mobileQuickEditor}>
      <div className={s.mobileQuickEditorHeader}>
        <div>
          <span className={s.mobileQuickEditorEyebrow}>Edicion rapida</span>
          <strong>
            {item.codigo} · {item.tipo}
          </strong>
        </div>
        <span className={s.mobileQuickEditorPrice}>{CLP(item.precioTotal)}</span>
      </div>

      <div className={s.mobileQuickEditorNav}>
        <span className={s.mobileQuickEditorNavPill}>
          {itemIndex + 1} de {totalItems}
        </span>
        <div className={s.mobileQuickEditorNavButtons}>
          <button
            type="button"
            className={s.mobileQuickEditorNavButton}
            onClick={() => handleNavigate(-1)}
            disabled={itemIndex <= 0}
          >
            Anterior
          </button>
          <button
            type="button"
            className={s.mobileQuickEditorNavButton}
            onClick={() => handleNavigate(1)}
            disabled={itemIndex >= totalItems - 1}
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className={s.mobileQuickEditorMeta}>
        {item.vidrio || "Sin vidrio"} · {item.cantidad} {item.cantidad === 1 ? "ud." : "uds."}
      </div>

      <div className={s.quickEditRow}>
        <label className={s.quickEditField}>
          <span>Ancho</span>
          <input
            className={s.quickEditInput}
            inputMode="numeric"
            value={localDraft.ancho}
            onChange={(event) => handleFieldChange("ancho", event.target.value)}
            onBlur={handleBlur}
            placeholder="-"
          />
        </label>
        <label className={s.quickEditField}>
          <span>Alto</span>
          <input
            className={s.quickEditInput}
            inputMode="numeric"
            value={localDraft.alto}
            onChange={(event) => handleFieldChange("alto", event.target.value)}
            onBlur={handleBlur}
            placeholder="-"
          />
        </label>
        <label className={`${s.quickEditField} ${s.quickEditFieldWide}`}>
          <span>{pricingLabel}</span>
          <input
            className={s.quickEditInput}
            inputMode="numeric"
            value={formatCurrencyInput(localDraft.costoProveedorUnitario)}
            onChange={(event) =>
              handleFieldChange("costoProveedorUnitario", event.target.value)
            }
            onBlur={handleBlur}
            placeholder="0"
          />
        </label>
      </div>

      <button
        className={`${s.btnPrimary} ${s.mobileQuickEditorSummaryButton}`}
        type="button"
        onClick={handleSummary}
      >
        Ver cierre del paso <LuChevronDown aria-hidden />
      </button>
    </section>
  );
});

function normalizeSearchValue(value: string) {
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

function formatDraftPhoneValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "+56 9 ";
  }

  if (trimmed.startsWith("+") && !trimmed.startsWith("+56")) {
    return value;
  }

  return formatChilePhoneInput(value);
}

function buildClientInitials(nombre: string) {
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

function buildGlassValue(prefix: string, item: string) {
  return prefix ? `${prefix} ${item}` : item;
}

function pickSuggestedString(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function resolveSuggestedMarginValue(
  pricingMode: PricingMode,
  suggestionMarginPct: number,
  currentValue: string | null | undefined
) {
  if (pricingMode === "precio_directo") {
    return "0";
  }

  return pickSuggestedString(currentValue, String(suggestionMarginPct));
}

function getPricingModeSummaryLabel(pricingMode: PricingMode) {
  return pricingMode === "precio_directo" ? "Precio directo" : "Con margen";
}

function filterGlassOptions(query: string) {
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

function buildSuggestedComponentForm(
  input: {
    items?: CotizacionWorkflowItem[];
    tipo?: string;
    provider?: PreferredProvider;
    pricingMode?: PricingMode;
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
    material:
      current.material === "PVC" || current.material === "Aluminio"
        ? current.material
        : suggestion.material,
    referencia: pickSuggestedString(current.referencia, suggestion.referencia),
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
      current.margenPct
    ),
    observaciones: current.observaciones ?? "",
    colorHex:
      typeof current.colorHex === "string" && /^#[0-9a-fA-F]{3,8}$/.test(current.colorHex)
        ? current.colorHex
        : suggestion.colorHex,
    loteCantidad: current.loteCantidad ?? "1",
  };
}

function createEmptyComponentForm(
  items: CotizacionWorkflowItem[] = [],
  provider: PreferredProvider = "",
  pricingMode: PricingMode = "margen"
): ComponentFormState {
  return buildSuggestedComponentForm({
    items,
    tipo: "Ventana",
    provider,
    pricingMode,
  });
}

function mapRecordToDraft(record: CotizacionWorkflowRecord): CotizacionWorkflowDraft {
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

function mapItemToForm(item: CotizacionWorkflowItem): ComponentFormState {
  const { colorHex, referencia, material, pricingMode, raw } =
    decodeCotizacionItemPresentationMeta(
    item.observaciones
    );
  return {
    codigo: item.codigo,
    tipo: item.tipo,
    material,
    referencia,
    pricingMode,
    vidrio: item.vidrio ?? "",
    nombre: item.nombre,
    descripcion: item.descripcion,
    ancho: item.ancho ? String(item.ancho) : "",
    alto: item.alto ? String(item.alto) : "",
    cantidad: String(item.cantidad),
    costoProveedorUnitario: String(item.costoProveedorUnitario),
    margenPct: String(item.margenPct),
    observaciones: raw,
    colorHex,
    loteCantidad: "1",
  };
}

function mapItemToDuplicateForm(
  item: CotizacionWorkflowItem,
  items: CotizacionWorkflowItem[]
): ComponentFormState {
  const duplicated = mapItemToForm(item);
  const nextCode = buildNextComponentCode(items, item.tipo);
  const previousAutoName = buildAutoComponentName(duplicated);
  const descriptionLooksAutoGenerated =
    normalizeComparableComponentText(duplicated.descripcion) ===
      normalizeComparableComponentText(previousAutoName) ||
    isLegacyAutoComponentLabel(item.tipo, duplicated.descripcion);

  return {
    ...duplicated,
    codigo: nextCode,
    nombre: item.nombre.trim() === previousAutoName ? "" : duplicated.nombre,
    descripcion: descriptionLooksAutoGenerated ? "" : duplicated.descripcion,
  };
}

function buildItemFromForm(
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
  const costoProveedorUnitario = Number(form.costoProveedorUnitario || 0);
  const margenPct =
    pricingMode === "precio_directo" ? 0 : Number(form.margenPct || 0);

  return calculateComponentItem({
    id: editingItemId ?? undefined,
    codigo: form.codigo.trim() || buildNextComponentCode(items, form.tipo),
    tipo: form.tipo,
    vidrio: form.vidrio,
    nombre: autoName,
    descripcion,
    ancho: form.ancho ? Number(form.ancho) : null,
    alto: form.alto ? Number(form.alto) : null,
    cantidad: Number(form.cantidad || 1),
    unidad: "unidad",
    costoProveedorUnitario,
    margenPct,
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: form.colorHex,
      referencia: form.referencia,
      material: form.material,
      pricingMode,
      raw: form.observaciones,
    }),
  });
}

function validateComponentForm(
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
  )
    errors.codigo = "Ese codigo ya existe en esta cotizacion";
  if (!form.tipo.trim()) errors.tipo = "Selecciona un tipo";
  if (!form.material.trim()) errors.material = "Selecciona material";
  const qty = Number(form.cantidad);
  if (!form.cantidad || isNaN(qty) || qty < 1) errors.cantidad = "Minimo 1";
  const hasCostValue = form.costoProveedorUnitario.trim() !== "";
  const costo = Number(form.costoProveedorUnitario);
  if (hasCostValue && (isNaN(costo) || costo < 0))
    errors.costoProveedorUnitario =
      form.pricingMode === "precio_directo"
        ? "Ingresa el valor unitario"
        : "Ingresa el costo del proveedor";
  if (form.pricingMode === "margen") {
    const margen = Number(form.margenPct);
    if (form.margenPct === "" || isNaN(margen) || margen < 0)
      errors.margenPct = "El margen de ganancia no puede ser negativo";
  }
  const lote = Number(form.loteCantidad);
  if (!editingItemId && (!form.loteCantidad || isNaN(lote) || lote < 1)) {
    errors.step2 = "Indica cuántos componentes quieres agregar";
  }
  return errors;
}

function validateStep1(draft: CotizacionWorkflowDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.clienteNombre.trim()) errors.clienteNombre = "El nombre del cliente es obligatorio";
  if (!draft.obra.trim()) errors.obra = "La obra o proyecto es obligatoria";
  if (Object.keys(errors).length > 0) errors.step1 = "Completa cliente y obra para continuar.";
  return errors;
}

function scrollPageToTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToSection(sectionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function NuevaCotizacionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const requestedStepParam = searchParams.get("step");
  const requestedStep: StepKey | null =
    requestedStepParam === "2" ? 2 : requestedStepParam === "3" ? 3 : null;
  const initializedRef = useRef(false);
  const hydrationCompleteRef = useRef(false);
  const persistTimeoutRef = useRef<number | null>(null);
  const quickEditDraftsRef = useRef<Record<string, QuickEditDraftState>>({});
  const lastCommittedSignatureRef = useRef("");
  const glassCloseTimeoutRef = useRef<number | null>(null);
  const stepTwoListScrollFrameRef = useRef<number | null>(null);
  const stepTwoListRef = useRef<HTMLDivElement | null>(null);
  const stepTwoSummaryRef = useRef<HTMLDivElement | null>(null);
  const storageKey = useMemo(() => buildWorkflowStorageKey(editId, duplicateId), [duplicateId, editId]);

  const [draft, setDraft] = useState<CotizacionWorkflowDraft>(createCotizacionWorkflowDraft);
  const [componentForm, setComponentForm] = useState<ComponentFormState>(createEmptyComponentForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [step, setStep] = useState<StepKey>(1);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<CotizacionWorkflowRecord | null>(null);
  const [lastSaveMode, setLastSaveMode] = useState<keyof typeof STATUS_COPY | null>(null);
  const [shareExperience] = useState(getCotizacionShareExperience);
  const [isGlassPanelOpen, setIsGlassPanelOpen] = useState(false);
  const [glassQuery, setGlassQuery] = useState("");
  const [showStep1MoreData, setShowStep1MoreData] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);
  const [stepTwoListScrollTop, setStepTwoListScrollTop] = useState(0);
  const [stepTwoListHeight, setStepTwoListHeight] = useState(0);
  const [stepTwoListRowHeight, setStepTwoListRowHeight] = useState(STEP_TWO_DEFAULT_ROW_HEIGHT);
  const [stepTwoListGap, setStepTwoListGap] = useState(STEP_TWO_DEFAULT_GAP);
  const [expandedQuickEditItemId, setExpandedQuickEditItemId] = useState<string | null>(null);
  const [recordMeta, setRecordMeta] = useState<{
    id?: string;
    codigo?: string;
    clientId?: string | number | null;
    projectId?: string | number | null;
  } | null>(null);

  const {
    clientes,
    ensureClientesLoaded,
    getCotizacionById,
    loadCotizacionById,
    saveWorkflow,
    isReady,
    isSaving,
  } = useCotizacionesStore();
  const {
    profile: organizationProfile,
    saveProfile: saveOrganizationProfile,
  } = useOrganizationProfile();
  const suggestionProvider: PreferredProvider = "";
  const preferredPricingMode = normalizePricingMode(
    organizationProfile?.modoPrecioPreferido
  );
  const deferredWorkflowItems = useDeferredValue(draft.items);

  const sourceRecord = editId || duplicateId ? getCotizacionById(editId ?? duplicateId ?? "") : null;

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
      }
      if (glassCloseTimeoutRef.current !== null) {
        window.clearTimeout(glassCloseTimeoutRef.current);
      }
      if (stepTwoListScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(stepTwoListScrollFrameRef.current);
        stepTwoListScrollFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const nextDrafts: Record<string, QuickEditDraftState> = {};

    draft.items.forEach((item) => {
      nextDrafts[item.id] = quickEditDraftsRef.current[item.id] ?? buildQuickEditDraft(item);
    });

    quickEditDraftsRef.current = nextDrafts;
  }, [draft.items]);

  useEffect(() => {
    if (draft.items.length === 0) {
      setExpandedQuickEditItemId(null);
      return;
    }

    setExpandedQuickEditItemId((current) => {
      if (current && draft.items.some((item) => item.id === current)) {
        return current;
      }

      return draft.items[0]?.id ?? null;
    });
  }, [draft.items]);

  useEffect(() => {
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
    if (!editId && !duplicateId) return;
    if (!sourceRecord || sourceRecord.items.length === 0) {
      void loadCotizacionById(editId ?? duplicateId ?? "");
    }
  }, [duplicateId, editId, loadCotizacionById, sourceRecord]);

  useEffect(() => {
    void ensureClientesLoaded();
  }, [ensureClientesLoaded]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (editId || duplicateId) {
      if (!sourceRecord) return;
    }
    if (!editId && !duplicateId && !sourceRecord) {
      const persisted = loadPersistedWorkflowState(storageKey, {
        provider: suggestionProvider,
        pricingMode: preferredPricingMode,
      });
      const blankSignature = buildWorkflowDirtySignature({
        draft: createCotizacionWorkflowDraft(),
        componentForm: createEmptyComponentForm(
          [],
          suggestionProvider,
          preferredPricingMode
        ),
        editingItemId: null,
        selectedClientId: "",
        clientQuery: "",
        showStep1MoreData: false,
      });

      initializedRef.current = true;
      lastCommittedSignatureRef.current = blankSignature;
      if (persisted) {
        setDraft(persisted.draft);
        setComponentForm(persisted.componentForm);
        setEditingItemId(persisted.editingItemId);
        setSelectedClientId(persisted.selectedClientId);
        setClientQuery(persisted.clientQuery);
        setShowStep1MoreData(persisted.showStep1MoreData);
        setStep(persisted.step);
      } else {
        setSelectedClientId("");
        setComponentForm(
          createEmptyComponentForm([], suggestionProvider, preferredPricingMode)
        );
        setStep(1);
      }
      hydrationCompleteRef.current = true;
      return;
    }
    if (!sourceRecord) return;

    const nextDraft = mapRecordToDraft(sourceRecord);
    const baseDraft = duplicateId ? { ...nextDraft, obra: `${nextDraft.obra} copia` } : nextDraft;
    const baseSelectedClientId = sourceRecord.clientId ? String(sourceRecord.clientId) : "";
    const baseSignature = buildWorkflowDirtySignature({
      draft: baseDraft,
      componentForm: createEmptyComponentForm(
        baseDraft.items,
        suggestionProvider,
        preferredPricingMode
      ),
      editingItemId: null,
      selectedClientId: baseSelectedClientId,
      clientQuery: "",
      showStep1MoreData: false,
    });
    const persisted = loadPersistedWorkflowState(storageKey, {
      provider: suggestionProvider,
      pricingMode: preferredPricingMode,
    });

    lastCommittedSignatureRef.current = baseSignature;
    if (persisted) {
      setDraft(persisted.draft);
      setSelectedClientId(persisted.selectedClientId);
      setComponentForm(persisted.componentForm);
      setEditingItemId(persisted.editingItemId);
      setClientQuery(persisted.clientQuery);
      setShowStep1MoreData(persisted.showStep1MoreData);
      setStep(persisted.step);
    } else {
      setDraft(baseDraft);
      setSelectedClientId(baseSelectedClientId);
      setClientQuery(sourceRecord.clienteNombre ?? "");
      setComponentForm(
        createEmptyComponentForm(
          baseDraft.items,
          suggestionProvider,
          preferredPricingMode
        )
      );
      if (requestedStep === 3) {
        setStep(baseDraft.items.length > 0 ? 3 : 2);
      } else if (requestedStep === 2) {
        setStep(2);
      } else {
        setStep(1);
      }
    }
    setRecordMeta({
      id: duplicateId ? undefined : sourceRecord.id,
      codigo: duplicateId ? undefined : sourceRecord.codigo,
      clientId: sourceRecord.clientId ?? null,
      projectId: duplicateId ? null : sourceRecord.projectId ?? null,
    });
    setSavedRecord(null);
    setLastSaveMode(null);
    initializedRef.current = true;
    hydrationCompleteRef.current = true;
  }, [
    duplicateId,
    editId,
    preferredPricingMode,
    suggestionProvider,
    requestedStep,
    sourceRecord,
    storageKey,
  ]);

  useEffect(() => {
    if (!hydrationCompleteRef.current) {
      return;
    }

    if (persistTimeoutRef.current !== null) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    const snapshot: PersistedWorkflowState = {
      version: 2,
      step,
      draft,
      componentForm,
      editingItemId,
      selectedClientId,
      clientQuery,
      showStep1MoreData,
    };

    persistTimeoutRef.current = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
      persistTimeoutRef.current = null;
    }, 250);
  }, [
    clientQuery,
    componentForm,
    draft,
    editingItemId,
    selectedClientId,
    showStep1MoreData,
    step,
    storageKey,
  ]);

  useEffect(() => {
    if (!hydrationCompleteRef.current) {
      return;
    }

    const currentSignature = buildWorkflowDirtySignature({
      draft,
      componentForm,
      editingItemId,
      selectedClientId,
      clientQuery,
      showStep1MoreData,
    });

    setHasUnsavedProgress(currentSignature !== lastCommittedSignatureRef.current);
  }, [clientQuery, componentForm, draft, editingItemId, selectedClientId, showStep1MoreData]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedProgress) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProgress]);

  useEffect(() => {
    const shouldObserveScrollableList =
      !isMobileViewport && draft.items.length >= STEP_TWO_VIRTUALIZATION_THRESHOLD;

    if (step !== 2 || !shouldObserveScrollableList) {
      return;
    }

    const listNode = stepTwoListRef.current;

    if (!listNode) {
      return;
    }

    const syncMetrics = () => {
      setStepTwoListHeight(listNode.clientHeight);
      setStepTwoListScrollTop(listNode.scrollTop);
    };
    const handleScroll = () => {
      if (stepTwoListScrollFrameRef.current !== null) {
        return;
      }

      stepTwoListScrollFrameRef.current = window.requestAnimationFrame(() => {
        setStepTwoListScrollTop(listNode.scrollTop);
        stepTwoListScrollFrameRef.current = null;
      });
    };

    syncMetrics();
    listNode.addEventListener("scroll", handleScroll, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        syncMetrics();
      });

      observer.observe(listNode);

      return () => {
        listNode.removeEventListener("scroll", handleScroll);
        if (stepTwoListScrollFrameRef.current !== null) {
          window.cancelAnimationFrame(stepTwoListScrollFrameRef.current);
          stepTwoListScrollFrameRef.current = null;
        }
        observer.disconnect();
      };
    }

    window.addEventListener("resize", syncMetrics);

    return () => {
      listNode.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", syncMetrics);
      if (stepTwoListScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(stepTwoListScrollFrameRef.current);
        stepTwoListScrollFrameRef.current = null;
      }
    };
  }, [draft.items.length, isMobileViewport, step]);

  const filteredClientes = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clientes.slice(0, 6);
    return clientes
      .filter((c) => {
        const haystack = `${c.nombre ?? ""} ${c.telefono ?? ""} ${c.direccion ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [clientQuery, clientes]);
  const recentClients = useMemo(() => clientes.slice(0, 8), [clientes]);
  const mobileRecentClients = useMemo(() => recentClients.slice(0, 4), [recentClients]);

  const selectedClient = useMemo(
    () => clientes.find((c) => String(c.id) === selectedClientId) ?? null,
    [clientes, selectedClientId]
  );
  const clientSearchState = useMemo(() => {
    if (selectedClient) {
      return "Usando un cliente existente para esta cotizacion.";
    }

    if (clientQuery.trim() !== "" && filteredClientes.length === 0) {
      return "No encontramos coincidencias. Puedes seguir y crear un cliente nuevo.";
    }

    return "Busca un cliente existente o completa los datos de abajo para crear uno nuevo.";
  }, [clientQuery, filteredClientes.length, selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((cur) => ({
      ...cur,
      clienteNombre: selectedClient.nombre,
      clienteTelefono: selectedClient.telefono
        ? formatDraftPhoneValue(selectedClient.telefono)
        : cur.clienteTelefono,
      direccion: selectedClient.direccion ?? cur.direccion,
    }));
    setClientQuery(selectedClient.nombre);
  }, [selectedClient]);

  const totals = useMemo(
    () => calculateCotizacionWorkflowTotals(draft.items, draft.descuentoPct, draft.flete),
    [draft.descuentoPct, draft.flete, draft.items]
  );
  const filteredGlassGroups = useMemo(() => filterGlassOptions(glassQuery), [glassQuery]);
  const stepOneSummary = useMemo(
    () => ({
      cliente: draft.clienteNombre.trim() || "Pendiente",
      proyecto: draft.obra.trim() || "Pendiente",
      piezas: draft.items.length > 0 ? String(draft.items.length) : "0",
      subtotal: totals.subtotal > 0 ? CLP(totals.subtotal) : "0",
      iva: totals.iva > 0 ? CLP(totals.iva) : "0",
      total: totals.total > 0 ? CLP(totals.total) : "0",
      clienteMuted: !draft.clienteNombre.trim(),
      proyectoMuted: !draft.obra.trim(),
      piezasMuted: draft.items.length === 0,
      subtotalMuted: totals.subtotal === 0,
      ivaMuted: totals.iva === 0,
      totalMuted: totals.total === 0,
    }),
    [draft.clienteNombre, draft.obra, draft.items.length, totals.iva, totals.subtotal, totals.total]
  );

  const currentComponentPreviewSvg = useMemo(
    () =>
      generateComponentSVG({
        tipo: componentForm.tipo,
        ancho: null,
        alto: null,
        colorHex: componentForm.colorHex,
        maxW: 92,
        maxH: 72,
      }),
    [componentForm.colorHex, componentForm.tipo]
  );

  const componentListCards = useMemo<ComponentListCardViewModel[]>(
    () =>
      deferredWorkflowItems.map((item) => {
        const { colorHex, referencia, material, pricingMode } =
          decodeCotizacionItemPresentationMeta(item.observaciones);

        return {
          id: item.id,
          source: item,
          colorHex,
          title: `${item.codigo} · ${item.tipo}`,
          price: CLP(item.precioTotal),
          metaPrimary: `${material} · ${item.cantidad} ${
            item.cantidad === 1 ? "ud." : "uds."
          }`,
          metaSecondary: `${
            item.ancho && item.alto ? `${item.ancho}x${item.alto} mm` : "Sin medidas"
          } · ${item.vidrio || "Sin vidrio"} · ${
            pricingMode === "precio_directo"
              ? "precio directo"
              : `margen ${item.margenPct}%`
          }`,
          metaTertiary: referencia ? `Ref. ${referencia}` : "",
          quickEditPriceLabel: pricingMode === "precio_directo" ? "Valor" : "Costo",
          svgMarkup: generateComponentSVG({
            tipo: item.tipo,
            ancho: item.ancho,
            alto: item.alto,
            colorHex,
            maxW: 46,
            maxH: 46,
          }),
        };
      }),
    [deferredWorkflowItems]
  );
  const stepTwoItemIndexById = useMemo(
    () => new Map(draft.items.map((item, index) => [item.id, index])),
    [draft.items]
  );
  const selectedQuickEditIndex = expandedQuickEditItemId
    ? stepTwoItemIndexById.get(expandedQuickEditItemId) ?? -1
    : -1;
  const selectedQuickEditItem =
    selectedQuickEditIndex >= 0 ? draft.items[selectedQuickEditIndex] ?? null : null;
  const selectedQuickEditDraft = selectedQuickEditItem
    ? quickEditDraftsRef.current[selectedQuickEditItem.id] ??
      buildQuickEditDraft(selectedQuickEditItem)
    : null;
  const shouldVirtualizeStepTwoList = false;
  const visibleComponentListState = useMemo(() => {
    if (!shouldVirtualizeStepTwoList || stepTwoListHeight <= 0) {
      return {
        cards: componentListCards,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }

    const rowHeight = Math.max(1, stepTwoListRowHeight);
    const gap = Math.max(0, stepTwoListGap);
    const stride = rowHeight + gap;
    const startIndex = Math.max(
      0,
      Math.floor(stepTwoListScrollTop / stride) - STEP_TWO_VIRTUALIZATION_OVERSCAN
    );
    const visibleCount =
      Math.ceil(stepTwoListHeight / stride) + STEP_TWO_VIRTUALIZATION_OVERSCAN * 2;
    const endIndex = Math.min(componentListCards.length, startIndex + visibleCount);
    const hiddenBefore = startIndex;
    const hiddenAfter = Math.max(0, componentListCards.length - endIndex);

    return {
      cards: componentListCards.slice(startIndex, endIndex),
      paddingTop:
        hiddenBefore > 0
          ? hiddenBefore * rowHeight + Math.max(0, hiddenBefore - 1) * gap
          : 0,
      paddingBottom:
        hiddenAfter > 0
          ? hiddenAfter * rowHeight + Math.max(0, hiddenAfter - 1) * gap
          : 0,
    };
  }, [
    componentListCards,
    shouldVirtualizeStepTwoList,
    stepTwoListGap,
    stepTwoListHeight,
    stepTwoListRowHeight,
    stepTwoListScrollTop,
  ]);
  const handleStepTwoListMeasure = useCallback((node: HTMLElement | null) => {
    if (!node || !stepTwoListRef.current) {
      return;
    }

    const listStyles = window.getComputedStyle(stepTwoListRef.current);
    const nextGap = Number.parseFloat(listStyles.rowGap || listStyles.gap || "0");
    const nextRowHeight = Math.ceil(node.getBoundingClientRect().height);

    if (Number.isFinite(nextGap) && Math.abs(nextGap - stepTwoListGap) > 1) {
      setStepTwoListGap(nextGap);
    }

    if (Number.isFinite(nextRowHeight) && Math.abs(nextRowHeight - stepTwoListRowHeight) > 2) {
      setStepTwoListRowHeight(nextRowHeight);
    }
  }, [stepTwoListGap, stepTwoListRowHeight]);

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

  const resetWorkflowToBlank = useCallback(() => {
    const nextDraft = createCotizacionWorkflowDraft();
    const nextComponentForm = createEmptyComponentForm(
      [],
      suggestionProvider,
      preferredPricingMode
    );
    const blankSignature = buildWorkflowDirtySignature({
      draft: nextDraft,
      componentForm: nextComponentForm,
      editingItemId: null,
      selectedClientId: "",
      clientQuery: "",
      showStep1MoreData: false,
    });

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
    setStep(1);
    lastCommittedSignatureRef.current = blankSignature;
    setHasUnsavedProgress(false);
  }, [preferredPricingMode, suggestionProvider]);

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

  const handleComponentChange = <K extends keyof ComponentFormState>(
    key: K,
    value: ComponentFormState[K]
  ) => {
    setComponentForm((cur) => {
      if (key === "tipo" && !editingItemId) {
        const next = buildSuggestedComponentForm({
          items: draft.items,
          tipo: value as string,
          provider: suggestionProvider,
          pricingMode: cur.pricingMode,
          current: {
            tipo: value as string,
            codigo: "",
            referencia: "",
            nombre: "",
            descripcion: "",
            vidrio: "",
            material: cur.material,
            loteCantidad: cur.loteCantidad,
            cantidad: cur.cantidad,
            observaciones: cur.observaciones,
            colorHex: cur.colorHex,
            pricingMode: cur.pricingMode,
          },
        });

        return next;
      }

      const next = { ...cur, [key]: value };
      if (key === "tipo" && !editingItemId) {
        const prefix = getComponentPrefix(value as string);
        const count = draft.items.filter((i) => i.codigo.startsWith(prefix)).length + 1;
        next.codigo = `${prefix}${count}`;
      }
      if (key === "material") {
        const material = value as ComponentFormState["material"];
        if (material === "PVC") {
          next.colorHex = "#f0eeeb";
        }

        if (
          material === "Aluminio" &&
          (cur.colorHex === "#f0eeeb" || cur.colorHex === "#dfd5c4")
        ) {
          next.colorHex = "#a8a8a8";
        }
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

  const handleAddOrUpdateItem = () => {
    const errors = validateComponentForm(componentForm, draft.items, editingItemId);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    try {
      let nextItems: CotizacionWorkflowItem[];

      if (editingItemId) {
        const item = buildItemFromForm(componentForm, draft.items, editingItemId);
        nextItems = draft.items.map((e) => (e.id === editingItemId ? item : e));
      } else {
        const quantity = Math.max(1, Number.parseInt(componentForm.loteCantidad || "1", 10) || 1);
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
      }

      setDraft((cur) => ({ ...cur, items: nextItems }));
      if (!editingItemId && isMobileViewport) {
        setExpandedQuickEditItemId(nextItems.at(-1)?.id ?? null);
      }
      setEditingItemId(null);
      setComponentForm(
        createEmptyComponentForm(nextItems, suggestionProvider, preferredPricingMode)
      );
      setIsGlassPanelOpen(false);
      setGlassQuery("");
      setFieldErrors({});
      setGlobalError(null);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "No se pudo guardar el componente");
    }
  };

  const handleEditItem = (item: CotizacionWorkflowItem) => {
    const parsed = mapItemToForm(item);
    setEditingItemId(item.id);
    setComponentForm(parsed);
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setStep(2);
    setFieldErrors({});
    setGlobalError(null);
    setExpandedQuickEditItemId(item.id);
    scrollToSection("component-form");
  };

  const handleDuplicateItem = (item: CotizacionWorkflowItem) => {
    setEditingItemId(null);
    const duplicated = mapItemToDuplicateForm(item, draft.items);
    setComponentForm({
      ...duplicated,
      loteCantidad: "1",
    });
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setStep(2);
    setFieldErrors({});
    setGlobalError(null);
    scrollToSection("component-form");
  };

  const handleRemoveItem = (itemId: string) => {
    const nextItems = draft.items.filter((i) => i.id !== itemId);
    setDraft((cur) => ({ ...cur, items: nextItems }));
    setExpandedQuickEditItemId((current) =>
      current === itemId ? nextItems[0]?.id ?? null : current
    );
    if (editingItemId === itemId) {
      setEditingItemId(null);
      setComponentForm(
        createEmptyComponentForm(nextItems, suggestionProvider, preferredPricingMode)
      );
    }
  };

  const handleCancelItemEdit = () => {
    setEditingItemId(null);
    setComponentForm(
      createEmptyComponentForm(draft.items, suggestionProvider, preferredPricingMode)
    );
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setFieldErrors({});
    setGlobalError(null);
  };

  const handleResetStep2Form = () => {
    setEditingItemId(null);
    setComponentForm(
      createEmptyComponentForm(draft.items, suggestionProvider, preferredPricingMode)
    );
    setIsGlassPanelOpen(false);
    setGlassQuery("");
    setFieldErrors({});
    setGlobalError(null);
    scrollToSection("component-form");
  };

  const commitQuickEditDraft = useCallback(
    (itemId: string, draftOverride?: QuickEditDraftState) => {
      if (draftOverride) {
        quickEditDraftsRef.current[itemId] = draftOverride;
      }

      startTransition(() => {
        setDraft((current) => {
          const target = current.items.find((item) => item.id === itemId);
          const draftState = quickEditDraftsRef.current[itemId];

          if (!target || !draftState) {
            return current;
          }

          try {
            const currentDraft = buildQuickEditDraft(target);

            if (
              currentDraft.ancho === draftState.ancho &&
              currentDraft.alto === draftState.alto &&
              currentDraft.costoProveedorUnitario === draftState.costoProveedorUnitario
            ) {
              return current;
            }

            const nextForm = {
              ...mapItemToForm(target),
              ancho: draftState.ancho,
              alto: draftState.alto,
              costoProveedorUnitario: draftState.costoProveedorUnitario,
            } as ComponentFormState;
            const nextItem = buildItemFromForm(nextForm, current.items, target.id);

            return {
              ...current,
              items: current.items.map((item) => (item.id === itemId ? nextItem : item)),
            };
          } catch {
            return current;
          }
        });
      });
    },
    []
  );

  const handleQuickItemFieldChange = useCallback(
    (itemId: string, key: keyof QuickEditDraftState, value: string) => {
      const base = quickEditDraftsRef.current[itemId] ?? {
        ancho: "",
        alto: "",
        costoProveedorUnitario: "",
      };

      quickEditDraftsRef.current[itemId] = {
        ...base,
        [key]: value,
      };
    },
    []
  );

  const applyQuickEditDraftsToItems = useCallback(
    (items: CotizacionWorkflowItem[]) =>
      items.map((item) => {
        const draftState = quickEditDraftsRef.current[item.id];

        if (!draftState) {
          return item;
        }

        try {
          const nextForm = {
            ...mapItemToForm(item),
            ancho: draftState.ancho,
            alto: draftState.alto,
            costoProveedorUnitario: draftState.costoProveedorUnitario,
          } as ComponentFormState;

          return buildItemFromForm(nextForm, items, item.id);
        } catch {
          return item;
        }
      }),
    []
  );

  const flushQuickEditDrafts = useCallback(() => {
    const nextItems = applyQuickEditDraftsToItems(draft.items);
    startTransition(() => {
      setDraft((current) => ({ ...current, items: nextItems }));
    });

    return nextItems;
  }, [applyQuickEditDraftsToItems, draft.items]);

  const handleSelectQuickEditItem = useCallback((itemId: string) => {
    setExpandedQuickEditItemId(itemId);
  }, []);

  const handleQuickEditNavigate = useCallback((direction: -1 | 1) => {
    if (selectedQuickEditIndex < 0) {
      return;
    }

    const nextItem = draft.items[selectedQuickEditIndex + direction];

    if (!nextItem) {
      return;
    }

    handleSelectQuickEditItem(nextItem.id);
  }, [draft.items, handleSelectQuickEditItem, selectedQuickEditIndex]);

  const handleScrollToStepTwoSummary = useCallback(() => {
    window.requestAnimationFrame(() => {
      stepTwoSummaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, []);

  const handlePricingModeSelection = useCallback(
    (pricingMode: PricingMode) => {
      setComponentForm((current) => {
        const nextMarginValue =
          pricingMode === "precio_directo"
            ? "0"
            : current.pricingMode === "precio_directo"
              ? ""
              : current.margenPct;

        const next = buildSuggestedComponentForm({
          items: draft.items,
          tipo: current.tipo,
          provider: suggestionProvider,
          pricingMode,
          current: {
            ...current,
            pricingMode,
            margenPct: nextMarginValue,
          },
        });

        return {
          ...next,
          pricingMode,
        };
      });
      setFieldErrors((current) => ({
        ...current,
        costoProveedorUnitario: undefined,
        margenPct: undefined,
      }));
      setGlobalError(null);

      if (!organizationProfile) {
        return;
      }

      void saveOrganizationProfile({
        empresaNombre: organizationProfile.empresaNombre,
        empresaLogoUrl: organizationProfile.empresaLogoUrl,
        empresaDireccion: organizationProfile.empresaDireccion,
        empresaTelefono: organizationProfile.empresaTelefono,
        empresaEmail: organizationProfile.empresaEmail,
        brandColor: organizationProfile.brandColor,
        formaPago: organizationProfile.formaPago,
        proveedorPreferido: organizationProfile.proveedorPreferido,
        modoPrecioPreferido: pricingMode,
      }).catch(() => {
        return;
      });
    },
    [draft.items, organizationProfile, saveOrganizationProfile, suggestionProvider]
  );

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

  const goNextFromStep1 = () => {
    const errors = validateStep1(draft);
    if (errors.step1) {
      setFieldErrors((cur) => ({ ...cur, ...errors }));
      return;
    }
    setFieldErrors((cur) => ({ ...cur, step1: undefined }));
    setStep(2);
    scrollPageToTop();
  };

  const goToStep = (target: StepKey) => {
    if (target >= 3 && step === 2) {
      flushQuickEditDrafts();
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
    if (target === 3 && draft.items.length === 0) {
      setFieldErrors((cur) => ({ ...cur, items: "Agrega al menos un componente" }));
      setStep(2);
      return;
    }
    setStep(target);
    if (target === 2 || target === 3) {
      scrollPageToTop();
    }
  };

  const handleSave = useCallback(async (
    estado: "borrador" | "creada",
    options?: { exitAfterSave?: boolean }
  ) => {
    const nextItems = applyQuickEditDraftsToItems(draft.items);
    const draftToSave = {
      ...draft,
      items: nextItems,
    };
    setDraft(draftToSave);

    const step1Errors = validateStep1(draftToSave);
    const finalErrors: FieldErrors = { ...step1Errors };
    if (estado === "creada" && draftToSave.items.length === 0) {
      finalErrors.items = "Agrega al menos un componente";
    }

    if (Object.keys(finalErrors).length > 0) {
      setFieldErrors(finalErrors);
      setGlobalError("Completa los campos obligatorios antes de guardar.");
      if (step1Errors.step1) setStep(1);
      else if (estado === "creada") setStep(2);
      return;
    }

    try {
      setGlobalError(null);
      const record = await saveWorkflow({
        draft: draftToSave,
        estado,
        existingId: recordMeta?.id,
        existingCode: recordMeta?.codigo,
        existingClientId: selectedClientId || recordMeta?.clientId || undefined,
        existingProjectId: recordMeta?.projectId,
      });
      setRecordMeta({
        id: record.id,
        codigo: record.codigo,
        clientId: record.clientId ?? null,
        projectId: record.projectId ?? null,
      });
      lastCommittedSignatureRef.current = buildWorkflowDirtySignature({
        draft: draftToSave,
        componentForm,
        editingItemId,
        selectedClientId,
        clientQuery,
        showStep1MoreData,
      });
      clearPersistedWorkflowState(storageKey);
      setHasUnsavedProgress(false);
      if (!editId && !duplicateId) {
        resetWorkflowToBlank();
      }
      if (options?.exitAfterSave) {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        router.push("/cotizaciones");
        return;
      }
      if (estado === "creada") {
        router.push(`/print/cotizaciones/${record.id}?from=wizard&created=1`);
        return;
      }
      setSavedRecord(record);
      setLastSaveMode(recordMeta?.id ? "actualizada" : estado);
      setStep(3);
      scrollPageToTop();
      if (!editId && !duplicateId) {
        router.replace(`/cotizaciones/nueva?edit=${record.id}`);
      }
    } catch (err) {
      setGlobalError(
        isConnectivityError(err)
          ? "No hay conexion a internet en este momento. Revisa tu red y vuelve a intentar guardar."
          : err instanceof Error
            ? err.message
            : "No se pudo guardar la cotizacion"
      );
    }
  }, [
    applyQuickEditDraftsToItems,
    clientQuery,
    componentForm,
    draft,
    duplicateId,
    editId,
    editingItemId,
    recordMeta,
    resetWorkflowToBlank,
    router,
    saveWorkflow,
    selectedClientId,
    showStep1MoreData,
    storageKey,
  ]);

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
    <div className={s.root}>
      <div className={s.mobileTopBand}>
        <div className={s.pageHeader}>
          <div className={s.pageHeading}>
            <Link href="/cotizaciones" className={s.backLink}>
              <LuArrowLeft aria-hidden /> Volver a cotizaciones
            </Link>
            <h1 className={s.pageTitle}>
              {recordMeta?.id ? "Editar presupuesto" : "Nuevo presupuesto"}
            </h1>
            <p className={s.pageSub}>Flujo simple para obra: cliente, componentes y envio.</p>
          </div>
          <div className={`${s.headerActions} ${step === 1 ? s.headerActionsStep1 : ""}`}>
            {step !== 2 ? (
              <>
                <button className={s.btnGhost} onClick={() => void handleSave("borrador")} type="button" disabled={isSaving}>
                  <LuSave aria-hidden /> {isSaving ? "Guardando..." : "Borrador"}
                </button>
                <button className={s.btnPrimary} onClick={() => void handleSave("creada")} type="button" disabled={isSaving}>
                  <LuFileCheck2 aria-hidden /> {isSaving ? "Guardando..." : step === 3 ? "Guardar y abrir visor" : "Guardar presupuesto"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className={s.wizardWrap}>
          <div className={s.stepper}>
            {STEP_LABELS.map((item, index) => {
              const state = step === item.id ? "active" : step > item.id ? "done" : "idle";
              const lineDone = step > item.id;
              return (
                <div key={item.id} className={s.stepperItem}>
                  <button type="button" className={s.stepperButton} onClick={() => goToStep(item.id)}>
                    <span className={`${s.stepperDot} ${s[`stepperDot_${state}`]}`}>
                      {state === "done" ? <LuCheck size={12} aria-hidden /> : item.id}
                    </span>
                    <span className={`${s.stepperText} ${s[`stepperText_${state}`]}`}>
                      <strong>{item.title}</strong>
                      <small>{item.sub}</small>
                    </span>
                  </button>
                  {index < STEP_LABELS.length - 1 && (
                    <span
                      className={`${s.stepperLine} ${lineDone ? s.stepperLine_done : ""}`}
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${s.layout} ${step === 2 ? s.layoutStepTwo : ""} ${step === 3 ? s.layoutFinalStep : ""}`}>
        <div className={s.mainCol}>
          {step === 1 && (
            <section className={`${s.card} ${s.heroCard}`}>
              <div className={s.heroCardHeader}>
                <div>
                  <div className={s.cardLabel}>Paso 1 · Cliente y obra</div>
                  <h2 className={s.heroTitle}>¿Para quién es el trabajo?</h2>
                  <p className={s.heroSub}>Busca un cliente existente o carga uno nuevo sin salir del flujo.</p>
                </div>
                <div className={s.heroCardActions}>
                  <button
                    className={`${s.btnGhost} ${s.heroCardActionButton}`}
                    type="button"
                    onClick={handleResetStep1}
                  >
                    <LuFilterX aria-hidden />
                    Limpiar datos
                  </button>
                  <div className={s.heroBadge}>Paso 1 de 3</div>
                </div>
              </div>

              <div className={s.clientSearchWrap}>
                <label className={s.field}>
                  <span className={s.label}>Buscar cliente</span>
                  <div className={s.searchField}>
                    <LuSearch className={s.searchIcon} aria-hidden />
                    <input
                      className={s.searchInput}
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                      placeholder="Buscar cliente existente..."
                    />
                  </div>
                </label>
                <p className={s.searchHint}>{clientSearchState}</p>

                {clientQuery.trim() !== "" && filteredClientes.length > 0 && !selectedClient && (
                  <div className={s.clientDropdown}>
                    {filteredClientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        className={s.clientOption}
                        onClick={() => setSelectedClientId(String(cliente.id))}
                      >
                        <span className={s.clientAvatar}>{buildClientInitials(cliente.nombre)}</span>
                        <span className={s.clientOptionText}>
                          <strong>{cliente.nombre}</strong>
                          <span className={s.clientMetaList}>
                            <small className={s.clientMeta}>
                              <LuPhone size={12} aria-hidden />
                              {cliente.telefono ? formatDraftPhoneValue(cliente.telefono) : "Sin telefono"}
                            </small>
                            <small className={s.clientMeta}>
                              <LuMapPin size={12} aria-hidden />
                              {cliente.direccion || "Sin direccion"}
                            </small>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={s.mobileOnlyBlock}>
                <div className={s.mobileRecentLabel}>RECIENTES</div>
                {recentClients.length > 0 ? (
                  <div className={s.mobileRecentScroller}>
                    {mobileRecentClients.map((cliente) => {
                      const active = String(cliente.id) === selectedClientId;

                      return (
                        <button
                          key={cliente.id}
                          type="button"
                          className={`${s.mobileRecentChip} ${active ? s.mobileRecentChipActive : ""}`}
                          onClick={() => setSelectedClientId(String(cliente.id))}
                        >
                          <span className={s.mobileRecentAvatar}>{buildClientInitials(cliente.nombre)}</span>
                          <span>{cliente.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={s.mobileRecentEmpty}>Todavia no hay clientes recientes.</div>
                )}
                <div className={s.mobileDivider}>
                  <span>O ingresa uno nuevo</span>
                </div>
              </div>

              {selectedClient ? (
                <div className={s.selectedClientCard}>
                  <div className={s.selectedClientHeader}>
                    <span className={s.inlineTagSuccess}>cliente existente</span>
                    <span>Los datos de esta cotizacion quedan vinculados a este cliente.</span>
                  </div>
                  <div className={s.selectedClientAvatar}>{buildClientInitials(selectedClient.nombre)}</div>
                  <div className={s.selectedClientInfo}>
                    <strong>{selectedClient.nombre}</strong>
                    <span className={s.clientMeta}>
                      <LuPhone size={12} aria-hidden />
                      {selectedClient.telefono ? formatDraftPhoneValue(selectedClient.telefono) : "Sin telefono"}
                    </span>
                    <span className={s.clientMeta}>
                      <LuMapPin size={12} aria-hidden />
                      {selectedClient.direccion || "Sin direccion"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={s.linkButton}
                    onClick={() => {
                      setSelectedClientId("");
                      setClientQuery("");
                    }}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className={s.inlinePanel}>
                  <div className={s.inlinePanelHead}>
                    <span className={s.inlineTag}>nuevo cliente</span>
                    <span>Se creara junto con la cotizacion cuando guardes.</span>
                  </div>
                  <div className={s.formGrid2}>
                    <label className={s.field}>
                      <span className={s.label}>Nombre cliente <span className={s.required}>*</span></span>
                      <input
                        className={`${s.input} ${fieldErrors.clienteNombre ? s.inputError : ""}`}
                        maxLength={FIELD_LIMITS.clienteNombre}
                        value={draft.clienteNombre}
                        onChange={(e) => {
                          handleDraftChange("clienteNombre", e.target.value);
                          if (fieldErrors.clienteNombre) setFieldErrors((f) => ({ ...f, clienteNombre: undefined }));
                        }}
                        placeholder="Ej: Roberto Fuentes"
                      />
                      {fieldErrors.clienteNombre && <span className={s.fieldError}>{fieldErrors.clienteNombre}</span>}
                    </label>
                    <label className={s.field}>
                      <span className={s.label}>Telefono</span>
                      <input
                        className={s.input}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        pattern="[0-9 ]*"
                        value={draft.clienteTelefono}
                        onChange={(e) => handleDraftPhoneChange(e.target.value)}
                        placeholder="8234 5678"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className={s.formGrid2}>
                <label className={`${s.field} ${s.fieldFull}`}>
                  <span className={s.label}>Obra o proyecto <span className={s.required}>*</span></span>
                  <input
                        className={`${s.input} ${fieldErrors.obra ? s.inputError : ""}`}
                    maxLength={FIELD_LIMITS.obra}
                    value={draft.obra}
                    onChange={(e) => {
                      handleDraftChange("obra", e.target.value);
                      if (fieldErrors.obra) setFieldErrors((f) => ({ ...f, obra: undefined }));
                    }}
                    placeholder="Ej: Casa Los Pescadores"
                  />
                  {fieldErrors.obra && <span className={s.fieldError}>{fieldErrors.obra}</span>}
                </label>
              </div>

              <button
                type="button"
                className={s.mobileMoreButton}
                onClick={() => setShowStep1MoreData((current) => !current)}
                aria-expanded={showStep1MoreData}
              >
                Más datos {showStep1MoreData ? "↑" : "↓"}
              </button>

              <div
                className={`${s.formGrid2} ${
                  showStep1MoreData ? s.mobileOptionalFieldsOpen : s.mobileOptionalFieldsClosed
                }`}
              >
                <label className={s.field}>
                  <span className={s.label}>Direccion</span>
                  <input
                    className={s.input}
                    maxLength={FIELD_LIMITS.direccion}
                    value={draft.direccion}
                    onChange={(e) => handleDraftChange("direccion", e.target.value)}
                    placeholder="Ej: Los Pescadores 221, Coquimbo"
                  />
                </label>
                <label className={s.field}>
                  <span className={s.label}>Validez</span>
                  <div className={s.selectWrap}>
                    <select
                      className={s.input}
                      value={draft.validez}
                      onChange={(e) => handleDraftChange("validez", e.target.value)}
                    >
                      {VALIDEZ_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className={s.field}>
                  <span className={s.label}>Condiciones comerciales</span>
                  <textarea
                    className={s.textarea}
                    rows={2}
                    maxLength={FIELD_LIMITS.observaciones}
                    value={draft.observaciones}
                    onChange={(e) => handleDraftChange("observaciones", e.target.value)}
                    placeholder="Ej: Anticipo 50% al confirmar, saldo contra entrega."
                  />
                </label>
              </div>

              {isMobileViewport && (
                <section className={`${s.sideCard} ${s.mobileOnlyBlock} ${s.mobileSummaryCard} ${s.stepOneMobileSummary}`}>
                  <div className={s.mobileSummaryTitle}>Resumen rápido</div>
                  <div className={s.mobileSummaryRow}><span>Cliente</span><strong className={stepOneSummary.clienteMuted ? s.mobileSummaryMuted : ""}>{stepOneSummary.cliente}</strong></div>
                  <div className={s.mobileSummaryRow}><span>Proyecto</span><strong className={stepOneSummary.proyectoMuted ? s.mobileSummaryMuted : ""}>{stepOneSummary.proyecto}</strong></div>
                  <div className={s.mobileSummaryRow}><span>Piezas</span><strong className={stepOneSummary.piezasMuted ? s.mobileSummaryMuted : ""}>{stepOneSummary.piezas}</strong></div>
                  <div className={s.mobileSummaryDivider} />
                  <div className={s.mobileSummaryRow}><span>Subtotal</span><strong className={stepOneSummary.subtotalMuted ? s.mobileSummaryMuted : ""}>{stepOneSummary.subtotal}</strong></div>
                  <div className={s.mobileSummaryRow}><span>IVA</span><strong className={stepOneSummary.ivaMuted ? s.mobileSummaryMuted : ""}>{stepOneSummary.iva}</strong></div>
                  <div className={s.mobileSummaryDivider} />
                  <div className={s.mobileSummaryTotal}><span>Total</span><strong className={stepOneSummary.totalMuted ? s.mobileSummaryMuted : ""}>{stepOneSummary.total}</strong></div>
                </section>
              )}

              {fieldErrors.step1 && <div className={s.inlineError}>{fieldErrors.step1}</div>}

              <div className={s.stickyActionsInline}>
                <button
                  className={`${s.btnGhost} ${s.mobileStepAction} ${s.mobileStepActionReset}`}
                  type="button"
                  onClick={handleResetStep1}
                >
                  <LuFilterX aria-hidden />
                  Limpiar datos
                </button>
                <button
                  className={`${s.btnGhost} ${s.mobileStepAction} ${s.mobileStepActionSecondary}`}
                  type="button"
                  onClick={() => void handleSave("borrador", { exitAfterSave: true })}
                  disabled={isSaving}
                >
                  <LuSave aria-hidden /> {isSaving ? "Guardando..." : "Guardar y salir"}
                </button>
                <button
                  className={`${s.btnPrimary} ${s.mobileStepAction} ${s.mobileStepActionPrimary}`}
                  type="button"
                  onClick={goNextFromStep1}
                >
                  Continuar <LuChevronRight aria-hidden />
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <div className={s.stepTwoLayout}>
              <section className={`${s.card} ${s.stepTwoFormCard}`} id="component-form">
                <div className={s.cardHeaderRow}>
                  <div>
                    <div className={s.cardLabel}>Paso 2 · Componentes</div>
                    <h2 className={s.cardTitle}>{editingItemId ? "Editando componente" : "Agregar componente"}</h2>
                  </div>
                  {draft.items.length > 0 && (
                    <span className={s.headerPill}>{draft.items.length} cargado{draft.items.length !== 1 ? "s" : ""}</span>
                  )}
                </div>

                <div className={s.formFields}>
                  <section className={`${s.formSection} ${s.providerOnboardingCard}`}>
                    <div className={s.formSectionHead}>
                      <span className={s.formSectionEyebrow}>Precio</span>
                      <strong>Modo de precio del maestro</strong>
                      <p>
                        Define si este presupuesto trabaja con margen o con valor directo. El cambio se aplica al instante.
                      </p>
                    </div>

                    <div className={s.field}>
                      <span className={s.label}>Modo de precio</span>
                      <div className={s.segmentedChoiceGrid} role="radiogroup" aria-label="Modo de precio">
                        <label
                          className={`${s.segmentedChoice} ${
                            componentForm.pricingMode === "margen"
                              ? s.segmentedChoiceActive
                              : ""
                          }`}
                        >
                          <input
                            className={s.segmentedChoiceInput}
                            type="radio"
                            name="pricing-mode"
                            value="margen"
                            checked={componentForm.pricingMode === "margen"}
                            onChange={() => handlePricingModeSelection("margen")}
                          />
                          <span className={s.segmentedChoiceTitle}>Con margen</span>
                          <span className={s.segmentedChoiceHint}>
                            Calcula precio final desde costo + utilidad.
                          </span>
                        </label>
                        <label
                          className={`${s.segmentedChoice} ${
                            componentForm.pricingMode === "precio_directo"
                              ? s.segmentedChoiceActive
                              : ""
                          }`}
                        >
                          <input
                            className={s.segmentedChoiceInput}
                            type="radio"
                            name="pricing-mode"
                            value="precio_directo"
                            checked={componentForm.pricingMode === "precio_directo"}
                            onChange={() => handlePricingModeSelection("precio_directo")}
                          />
                          <span className={s.segmentedChoiceTitle}>Valor directo</span>
                          <span className={s.segmentedChoiceHint}>
                            Oculta el margen y cargas el valor final por unidad.
                          </span>
                        </label>
                      </div>
                      <span className={s.helpText}>
                        {componentForm.pricingMode === "precio_directo"
                          ? "Ocultamos el margen y trabajas con el precio final por componente."
                          : "Calculamos la venta a partir del costo proveedor y el margen sugerido."}
                      </span>
                    </div>

                    {componentForm.pricingMode === "margen" ? (
                      <div className={s.field}>
                        <span className={s.label}>
                          Margen ganancia (%) <span className={s.required}>*</span>
                        </span>
                        <input
                          className={`${s.input} ${fieldErrors.margenPct ? s.inputError : ""}`}
                          type="number"
                          min="0"
                          step="1"
                          value={componentForm.margenPct}
                          onChange={(event) =>
                            handleComponentChange("margenPct", event.target.value)
                          }
                          placeholder="100"
                        />
                        {fieldErrors.margenPct ? (
                          <span className={s.fieldError}>{fieldErrors.margenPct}</span>
                        ) : null}
                        <div className={s.presetRow}>
                          {MARGIN_PRESET_OPTIONS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`${s.presetButton} ${
                                componentForm.margenPct === String(preset)
                                  ? s.presetButtonActive
                                  : ""
                              }`}
                              onClick={() =>
                                handleComponentChange("margenPct", String(preset))
                              }
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className={s.formSection}>
                    <div className={s.formSectionHead}>
                      <span className={s.formSectionEyebrow}>Material</span>
                      <strong>Elige la base del sistema</strong>
                      <p>Selecciona rápido si este componente se trabaja en aluminio o PVC.</p>
                    </div>

                    <div
                      className={s.segmentedChoiceGrid}
                      role="radiogroup"
                      aria-label="Material del componente"
                    >
                      {MATERIAL_OPTIONS.map((materialOption) => (
                        <label
                          key={materialOption}
                          className={`${s.segmentedChoice} ${
                            componentForm.material === materialOption
                              ? s.segmentedChoiceActive
                              : ""
                          }`}
                        >
                          <input
                            className={s.segmentedChoiceInput}
                            type="radio"
                            name="component-material"
                            value={materialOption}
                            checked={componentForm.material === materialOption}
                            onChange={() =>
                              handleComponentChange(
                                "material",
                                materialOption as ComponentFormState["material"]
                              )
                            }
                          />
                          <span className={s.segmentedChoiceTitle}>{materialOption}</span>
                          <span className={s.segmentedChoiceHint}>
                            {materialOption === "Aluminio"
                              ? "Perfil estándar para cierres, ventanas y puertas."
                              : "Alternativa liviana para espejos, tapas y trabajos puntuales."}
                          </span>
                        </label>
                      ))}
                    </div>
                    {fieldErrors.material ? (
                      <span className={s.fieldError}>{fieldErrors.material}</span>
                    ) : null}
                  </section>

                  <section className={s.formSection}>
                    <div className={s.formSectionHead}>
                      <span className={s.formSectionEyebrow}>Modo rapido</span>
                      <strong>Elige el componente y confirma la base</strong>
                      <p>Te sugerimos configuración inicial para que solo ajustes lo necesario.</p>
                    </div>

                    <div className={s.quickPreviewCard}>
                      <div className={s.quickPreviewThumb}>
                        <div
                          className={s.quickPreviewThumbSvg}
                          dangerouslySetInnerHTML={{ __html: currentComponentPreviewSvg }}
                        />
                      </div>
                      <div className={s.quickPreviewBody}>
                        <strong>{componentForm.tipo}</strong>
                        <span>
                          Vista rápida del sistema base. Las medidas finales se ajustan abajo en
                          componentes cargados.
                        </span>
                      </div>
                    </div>

                    <div className={`${s.field} ${s.fieldFull}`}>
                        <span className={s.label}>Tipo de componente <span className={s.required}>*</span></span>
                        <div className={`${s.typeSelector} ${fieldErrors.tipo ? s.typeSelectorError : ""}`}>
                          {COMPONENT_TYPE_GROUPS.map((group) => (
                            <section key={group.title} className={s.typeGroup}>
                              <div className={s.typeGroupTitle}>{group.title}</div>
                              <div className={s.typeGroupGrid}>
                                {group.items.map((typeOption) => (
                                  <button
                                    key={typeOption}
                                    type="button"
                                    className={`${s.typeChip} ${
                                      componentForm.tipo === typeOption ? s.typeChipActive : ""
                                    }`}
                                    onClick={() => handleComponentChange("tipo", typeOption)}
                                  >
                                    {typeOption}
                                  </button>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                        {fieldErrors.tipo ? <span className={s.fieldError}>{fieldErrors.tipo}</span> : null}
                    </div>

                    {!editingItemId ? (
                      <div className={`${s.field} ${s.fieldFull}`}>
                        <span className={s.label}>¿Cuántos deseas agregar?</span>
                        <div className={s.batchCountRow}>
                          {[1, 2, 3, 4].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`${s.batchCountButton} ${
                                componentForm.loteCantidad === String(preset)
                                  ? s.batchCountButtonActive
                                  : ""
                              }`}
                              onClick={() => handleComponentChange("loteCantidad", String(preset))}
                            >
                              {preset}
                            </button>
                          ))}
                          <input
                            className={`${s.input} ${s.batchCountInput}`}
                            type="number"
                            min="1"
                            step="1"
                            value={componentForm.loteCantidad}
                            onChange={(event) =>
                              handleComponentChange("loteCantidad", event.target.value)
                            }
                            aria-label="Cantidad de componentes"
                          />
                        </div>
                        <span className={s.helpText}>
                          Se generan varios componentes base de una vez para editarlos rápido en la lista.
                        </span>
                      </div>
                    ) : (
                      <div className={s.quickEditBadge}>Editando {componentForm.codigo}</div>
                    )}
                  </section>

                  <details className={`${s.formSection} ${s.advancedSection}`}>
                    <summary className={`${s.mobileMoreButton} ${s.advancedSummaryButton}`}>
                      Opciones avanzadas ↓
                    </summary>

                    <div className={s.formSectionHead}>
                      <span className={s.formSectionEyebrow}>Configuracion</span>
                      <strong>Línea, color y ajustes finos</strong>
                      <p>Aquí puedes corregir la sugerencia inicial si este componente necesita algo distinto.</p>
                    </div>

                    <div className={s.formGrid2}>
                      <label className={s.field}>
                        <span className={s.label}>Referencia o linea habitual</span>
                        <input
                          className={s.input}
                          value={componentForm.referencia}
                          onChange={(e) => handleComponentChange("referencia", e.target.value)}
                          placeholder="Ej: S60, Serie 25, linea propia del maestro"
                        />
                        <span className={s.helpText}>Opcional. Solo aparece en el PDF si la cargas.</span>
                      </label>
                    </div>

                    <div className={`${s.field} ${s.fieldFull}`}>
                      <span className={s.label}>Color</span>
                      <div className={s.colorSwatches}>
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color.hex}
                            type="button"
                            title={color.label}
                            className={`${s.colorSwatch} ${componentForm.colorHex === color.hex ? s.colorSwatchActive : ""}`}
                            style={{ background: color.hex }}
                            onClick={() => handleComponentChange("colorHex", color.hex)}
                          />
                        ))}
                      </div>
                      <div className={s.colorLabel}>
                        {COLOR_OPTIONS.find((c) => c.hex === componentForm.colorHex)?.label ?? "Color"}
                      </div>
                    </div>
                  </details>

                  <section className={s.formSection}>
                    <div className={s.formSectionHead}>
                      <span className={s.formSectionEyebrow}>Vidrio</span>
                      <strong>Vidrio visible desde el inicio</strong>
                      <p>El tipo de vidrio queda abierto porque es una decisión frecuente en terreno.</p>
                    </div>

                    <div className={`${s.field} ${s.fieldFull}`}>
                      <span className={s.label}>Tipo de vidrio</span>
                      <div className={s.inlineSelector}>
                          <button
                            className={`${s.inlineSelectorTrigger} ${
                              isGlassPanelOpen ? s.inlineSelectorTriggerActive : ""
                            }`}
                            type="button"
                            onClick={() => {
                              setIsGlassPanelOpen((current) => {
                                const next = !current;
                                if (!next) {
                                  setGlassQuery("");
                                }
                                return next;
                              });
                            }}
                          >
                            <span
                              className={
                                componentForm.vidrio
                                  ? s.inlineSelectorValue
                                  : s.inlineSelectorPlaceholder
                              }
                            >
                              {componentForm.vidrio || "Sin vidrio seleccionado"}
                            </span>
                            <span className={s.inlineSelectorMeta}>
                              {isGlassPanelOpen ? "Cerrar" : "Elegir vidrio"}
                            </span>
                          </button>
                          <span className={s.helpText}>
                            {componentForm.vidrio
                              ? "Puedes cambiarlo o limpiarlo desde este selector."
                              : 'Ejemplo: "Incoloro monolítico 5mm". Toca "Elegir vidrio" para cargar uno.'}
                          </span>

                          {isGlassPanelOpen ? (
                            <div className={s.inlineSelectorPanel}>
                              <div className={s.glassSearchWrap}>
                                <LuSearch className={s.glassSearchIcon} aria-hidden />
                                <input
                                  className={s.glassSearchInput}
                                  value={glassQuery}
                                  onChange={(event) => setGlassQuery(event.target.value)}
                                  placeholder="Buscar por vidrio o categoria"
                                />
                              </div>

                              <div className={s.glassGroups}>
                                {filteredGlassGroups.length === 0 ? (
                                  <div className={s.glassEmptyState}>
                                    No encontramos opciones con ese texto.
                                  </div>
                                ) : (
                                  filteredGlassGroups.map((group, groupIndex) => (
                                    <section key={group.grupo} className={s.glassGroup}>
                                      {groupIndex > 0 ? <div className={s.glassDivider} /> : null}
                                      <div className={s.glassGroupTitle}>{group.grupo}</div>
                                      <div className={s.glassChipGrid}>
                                        {group.items.map((glassItem) => {
                                          const fullValue = buildGlassValue(group.prefix, glassItem);
                                          const isActive = componentForm.vidrio === fullValue;

                                          return (
                                            <button
                                              key={`${group.grupo}-${glassItem}`}
                                              type="button"
                                              className={`${s.glassChip} ${
                                                isActive ? s.glassChipActive : ""
                                              }`}
                                              onClick={() => handleGlassSelect(fullValue)}
                                            >
                                              {glassItem}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </section>
                                  ))
                                )}
                              </div>

                              <div className={s.inlineSelectorActions}>
                                <span className={s.helpText}>
                                  Se guarda exactamente como se mostrara en el PDF.
                                </span>
                                {componentForm.vidrio ? (
                                  <button
                                    className={s.inlineSelectorClear}
                                    type="button"
                                    onClick={() => {
                                      handleComponentChange("vidrio", "");
                                      setGlassQuery("");
                                    }}
                                  >
                                    Limpiar
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <span className={s.helpText}>
                          Selecciona el vidrio por categoria. Optimizado para tocar rapido desde el celular.
                        </span>
                      </div>
                    </section>

                    <details className={`${s.formSection} ${s.advancedSection}`}>
                      <summary className={`${s.mobileMoreButton} ${s.advancedSummaryButton}`}>
                        Codigo, cantidad y detalles ↓
                      </summary>

                      <div className={s.formGrid2}>
                        <label className={s.field}>
                          <span className={s.label}>Codigo <span className={s.required}>*</span></span>
                          <input
                            className={`${s.input} ${s.inputMono} ${
                              fieldErrors.codigo ? s.inputError : ""
                            }`}
                            value={componentForm.codigo}
                            onChange={(event) =>
                              handleComponentChange("codigo", event.target.value.toUpperCase())
                            }
                            placeholder="V1"
                          />
                          {fieldErrors.codigo ? <span className={s.fieldError}>{fieldErrors.codigo}</span> : null}
                        </label>

                        <label className={s.field}>
                          <span className={s.label}>Cantidad por componente</span>
                          <input
                            className={`${s.input} ${fieldErrors.cantidad ? s.inputError : ""}`}
                            type="number"
                            min="1"
                            step="1"
                            value={componentForm.cantidad}
                            onChange={(event) => handleComponentChange("cantidad", event.target.value)}
                          />
                          {fieldErrors.cantidad ? <span className={s.fieldError}>{fieldErrors.cantidad}</span> : null}
                        </label>
                      </div>

                      <div className={s.formGrid2}>
                        <label className={s.field}>
                          <span className={s.label}>Nombre visible</span>
                          <input className={`${s.input} ${fieldErrors.nombre ? s.inputError : ""}`} value={componentForm.nombre} onChange={(e) => handleComponentChange("nombre", e.target.value)} placeholder="Ej: Ventana living" />
                          <span className={s.helpText}>Opcional. Si lo dejas vacio, usamos {buildAutoComponentName(componentForm)}.</span>
                        </label>
                      </div>

                      <div className={s.formGrid2}>
                        <label className={s.field}>
                          <span className={s.label}>Descripcion comercial</span>
                          <textarea className={s.textarea} rows={2} value={componentForm.descripcion} onChange={(e) => handleComponentChange("descripcion", e.target.value)} placeholder="Ej: Ventana corredera 2 hojas color negro linea S60, vidrio 5mm." />
                        </label>
                      </div>
                  </details>
                </div>

                {fieldErrors.step2 && <div className={s.inlineError}>{fieldErrors.step2}</div>}
                {globalError && <div className={s.inlineError}>{globalError}</div>}

                <div className={s.cardFooter}>
                  <div className={s.footerButtonGroup}>
                    <button
                      className={s.btnGhost}
                      type="button"
                      onClick={handleResetStep2Form}
                    >
                      <LuFilterX aria-hidden />
                      {editingItemId ? "Limpiar edicion" : "Limpiar formulario"}
                    </button>
                    <button
                      className={s.btnGhost}
                      type="button"
                      onClick={() => void handleSave("borrador", { exitAfterSave: true })}
                      disabled={isSaving}
                    >
                      <LuSave aria-hidden /> {isSaving ? "Guardando..." : "Guardar y salir"}
                    </button>
                    <button className={s.btnPrimary} onClick={handleAddOrUpdateItem} type="button">
                      {editingItemId ? <LuPencil aria-hidden /> : <LuPlus aria-hidden />}
                      {editingItemId ? "Guardar componente" : "Agregar componente"}
                    </button>
                  </div>
                </div>
              </section>

              <aside className={`${s.card} ${s.stepTwoPanel}`}>
                <div className={s.stepTwoPanelHeader}>
                  <div className={s.stepTwoPanelTitle}>Componentes cargados</div>
                  <span className={s.stepTwoCounter}>{draft.items.length}</span>
                </div>

                {selectedQuickEditItem && selectedQuickEditDraft ? (
                  <MobileQuickEditor
                    key={selectedQuickEditItem.id}
                    item={selectedQuickEditItem}
                    initialDraft={selectedQuickEditDraft}
                    itemIndex={selectedQuickEditIndex}
                    totalItems={draft.items.length}
                    pricingLabel={
                      decodeCotizacionItemPresentationMeta(selectedQuickEditItem.observaciones)
                        .pricingMode === "precio_directo"
                        ? "Valor"
                        : "Costo"
                    }
                    onDraftChange={handleQuickItemFieldChange}
                    onCommit={commitQuickEditDraft}
                    onNavigate={handleQuickEditNavigate}
                    onScrollToSummary={handleScrollToStepTwoSummary}
                  />
                ) : null}

                {fieldErrors.items && <div className={s.inlineError}>{fieldErrors.items}</div>}

                {draft.items.length === 0 ? (
                  <div className={`${s.emptyState} ${s.stepTwoPanelEmpty}`}>
                    <LuFolderOpen size={32} aria-hidden />
                    <strong>Sin componentes todavia</strong>
                    <span>Agrega una ventana, puerta o cierre usando el formulario de la izquierda.</span>
                  </div>
                ) : (
                  <div className={s.stepTwoList} ref={stepTwoListRef}>
                    {visibleComponentListState.paddingTop > 0 ? (
                      <div
                        aria-hidden
                        className={s.stepTwoVirtualSpacer}
                        style={{ height: `${visibleComponentListState.paddingTop}px` }}
                      />
                    ) : null}
                    {visibleComponentListState.cards.map((item, index) => {
                      const isQuickEditSelected = expandedQuickEditItemId === item.id;

                      return (
                        <article
                          key={item.id}
                          ref={(node) => {
                            if (index === 0) {
                              handleStepTwoListMeasure(node);
                            }
                          }}
                          onClick={() => handleSelectQuickEditItem(item.id)}
                          className={`${s.stepTwoListCard} ${
                            editingItemId === item.id ? s.stepTwoListCardEditing : ""
                          } ${isQuickEditSelected ? s.stepTwoListCardSelected : ""}`}
                        >
                          <div className={s.stepTwoListThumb}>
                            <div
                              className={s.stepTwoListThumbSvg}
                              dangerouslySetInnerHTML={{
                                __html: item.svgMarkup,
                              }}
                            />
                          </div>

                          <div className={s.stepTwoListBody}>
                            <div className={s.stepTwoListTop}>
                              <div className={s.stepTwoListName}>{item.title}</div>
                              <span className={s.stepTwoListPrice}>{item.price}</span>
                            </div>

                            <div className={s.stepTwoMetaLine}>{item.metaPrimary}</div>
                            <div className={s.stepTwoMetaLine}>{item.metaSecondary}</div>
                            {item.metaTertiary ? (
                              <div className={s.stepTwoMetaLine}>{item.metaTertiary}</div>
                            ) : null}
                          </div>

                          <div className={s.stepTwoCardActions}>
                            <button
                              className={s.iconButton}
                              onClick={() => handleDuplicateItem(item.source)}
                              type="button"
                              title="Duplicar como base"
                            >
                              <LuCopy size={14} aria-hidden />
                            </button>
                            <button className={s.iconButton} onClick={() => handleEditItem(item.source)} type="button" title="Editar">
                              <LuPencil size={14} aria-hidden />
                            </button>
                            <button className={s.iconButtonDanger} onClick={() => handleRemoveItem(item.id)} type="button" title="Eliminar">
                              <LuTrash2 size={14} aria-hidden />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {visibleComponentListState.paddingBottom > 0 ? (
                      <div
                        aria-hidden
                        className={s.stepTwoVirtualSpacer}
                        style={{ height: `${visibleComponentListState.paddingBottom}px` }}
                      />
                    ) : null}
                  </div>
                )}

                <div className={s.stepTwoPanelFooter} ref={stepTwoSummaryRef}>
                  <div className={s.stepTwoTotalsGrid}>
                    <div className={s.stepTwoTotalCell}>
                      <span>Subtotal</span>
                      <strong>{CLP(totals.subtotal)}</strong>
                    </div>
                    <div className={s.stepTwoTotalCell}>
                      <span>IVA</span>
                      <strong>{CLP(totals.iva)}</strong>
                    </div>
                    <div className={`${s.stepTwoTotalCell} ${s.stepTwoTotalCellWide}`}>
                      <span>Total</span>
                      <strong>{CLP(totals.total)}</strong>
                    </div>
                  </div>
                  <button
                    className={`${s.btnPrimary} ${s.stepTwoSummaryButton}`}
                    type="button"
                    onClick={() => goToStep(3)}
                  >
                    Continuar al resumen <LuChevronRight aria-hidden />
                  </button>
                </div>
              </aside>
            </div>
          )}

          {step === 3 && (
            <section className={`${s.card} ${s.summaryHero}`}>
              <div className={s.heroCardHeader}>
                <div>
                  <div className={s.cardLabel}>Paso 3 · Resumen final</div>
                  <h2 className={s.heroTitle}>Vista final y envio</h2>
                  <p className={s.heroSub}>
                    Menos ruido y mas claridad: revisa el total, guarda y mira el presupuesto tal como se enviara.
                  </p>
                </div>
                <div className={s.heroBadge}>Paso 3 de 3</div>
              </div>

              <div className={s.finalStageGrid}>
                <div className={s.finalStageMain}>
                  <div className={s.summaryGrid}>
                    <div className={s.summaryBlock}>
                      <span>Cliente</span>
                      <strong>{draft.clienteNombre || "-"}</strong>
                    </div>
                    <div className={s.summaryBlock}>
                      <span>Proyecto</span>
                      <strong>{draft.obra || "-"}</strong>
                    </div>
                    <div className={s.summaryBlock}>
                      <span>Componentes</span>
                      <strong>{draft.items.length}</strong>
                    </div>
                    <div className={s.summaryBlock}>
                      <span>Validez</span>
                      <strong>{draft.validez}</strong>
                    </div>
                  </div>

                  <div className={s.summaryAdjustments}>
                    <div className={s.summaryAdjustmentCard}>
                      <div className={s.summaryAdjustmentHeader}>
                        <div>
                          <span className={s.summaryAdjustmentEyebrow}>Ajuste final</span>
                          <strong>Flete opcional</strong>
                        </div>
                        <span className={s.summaryAdjustmentValue}>
                          {draft.flete > 0 ? CLP(draft.flete) : "No incluido"}
                        </span>
                      </div>
                      <label className={s.field}>
                        <span className={s.label}>Valor del flete</span>
                        <div className={s.moneyInputWrap}>
                          <span className={s.moneyPrefix}>CLP</span>
                          <input
                            className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
                            inputMode="numeric"
                            value={draft.flete > 0 ? formatCurrencyInput(String(draft.flete)) : ""}
                            onChange={(event) => handleDraftFleteChange(event.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <span className={s.helpText}>
                          Se suma al total final y solo aparece en el PDF si es mayor a 0.
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className={s.totalPanel}>
                    <div className={s.totalRow}><span>Subtotal</span><strong>{CLP(totals.subtotal)}</strong></div>
                    <div className={s.totalRow}><span>IVA 19%</span><strong>{CLP(totals.iva)}</strong></div>
                    {totals.flete > 0 ? (
                      <div className={s.totalRow}><span>Flete</span><strong>{CLP(totals.flete)}</strong></div>
                    ) : null}
                    <div className={s.totalGrand}><span>Total</span><strong>{CLP(totals.total)}</strong></div>
                  </div>

                  {savedRecord ? (
                    <section className={s.mobileFinalReadyCard}>
                      <div className={s.mobileFinalReadyEyebrow}>Paso final listo</div>
                      <strong>Tu presupuesto ya esta guardado y listo para revisarlo.</strong>
                      <p>
                        Dejamos este cierre sin PDF embebido para que la pantalla no se rompa ni se abra nada solo.
                        Usa los botones de abajo cuando quieras revisar, compartir o descargar el archivo final.
                      </p>
                    </section>
                  ) : (
                    <section className={s.previewPlaceholder}>
                      <div className={s.previewPlaceholderTitle}>Guarda el presupuesto para ver la version final real</div>
                      <p className={s.previewPlaceholderText}>
                        En cuanto guardes, aqui mismo veras el documento final tal como saldra en PDF y WhatsApp.
                      </p>
                    </section>
                  )}
                </div>

                <aside className={s.finalActionCard}>
                  {savedRecord && lastSaveMode ? (
                    <>
                      <div className={s.savedBadge}>
                        <LuUserRound size={16} aria-hidden />
                        <div>
                          <strong>{STATUS_COPY[lastSaveMode].title}</strong>
                          <span>{STATUS_COPY[lastSaveMode].description}</span>
                        </div>
                      </div>
                      <div className={s.savedMeta}>
                        <span>{savedRecord.codigo}</span>
                        <strong>{CLP(savedRecord.total)}</strong>
                      </div>
                      <div className={s.actionCluster}>
                        <Link
                          className={s.btnPrimary}
                          href={`/print/cotizaciones/${savedRecord.id}`}
                          target={isMobileViewport ? undefined : "_blank"}
                        >
                          <LuPhone aria-hidden /> Abrir visor PDF
                        </Link>
                        <Link className={s.btnGhost} href={`/print/cotizaciones/${savedRecord.id}`} target="_blank">
                          <LuDownload aria-hidden /> Abrir visor para descargar
                        </Link>
                        <Link className={s.btnGhost} href={`/cotizaciones/${savedRecord.id}`}>
                          <LuFolderOpen aria-hidden /> Ver detalle
                        </Link>
                        <button className={s.btnGhost} type="button" onClick={() => goToStep(2)}>
                          <LuPencil aria-hidden /> Editar componentes
                        </button>
                      </div>
                      <p className={s.actionHintCard}>
                        Desde el visor PDF puedes revisar la hoja final y luego elegir si compartir por WhatsApp, imprimir o descargar.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className={s.finalActionTitle}>Acciones finales</div>
                      <p className={s.finalActionText}>
                        Guarda primero y luego habilitamos la vista real, el PDF y el envio por WhatsApp.
                      </p>
                      {globalError ? <div className={s.inlineError}>{globalError}</div> : null}
                      <div className={s.actionCluster}>
                        <button className={s.btnPrimary} onClick={() => void handleSave("creada")} type="button" disabled={isSaving}>
                          <LuFileCheck2 aria-hidden /> Guardar y abrir visor
                        </button>
                        <button className={s.btnGhost} onClick={() => void handleSave("borrador")} type="button" disabled={isSaving}>
                          <LuSave aria-hidden /> Guardar borrador
                        </button>
                        <button className={s.btnGhost} type="button" onClick={() => goToStep(2)}>
                          <LuPencil aria-hidden /> Volver a componentes
                        </button>
                      </div>
                    </>
                  )}
                </aside>
              </div>
            </section>
          )}
        </div>

        {step !== 3 && step !== 2 && !isMobileViewport ? (
          <aside className={s.sideCol}>
            <section className={s.sideCard}>
              <div className={s.sideTitle}>Resumen rapido</div>
              <div className={s.sideRow}><span>Cliente</span><strong>{draft.clienteNombre || "-"}</strong></div>
              <div className={s.sideRow}><span>Modo cliente</span><strong>{selectedClient ? "Existente" : "Nuevo"}</strong></div>
              <div className={s.sideRow}><span>Proyecto</span><strong>{draft.obra || "-"}</strong></div>
              <div className={s.sideDivider} />
              <div className={s.sideRow}><span>Componentes</span><strong>{draft.items.length}</strong></div>
              <div className={s.sideRow}><span>Subtotal</span><strong>{CLP(totals.subtotal)}</strong></div>
              <div className={s.sideRow}><span>IVA</span><strong>{CLP(totals.iva)}</strong></div>
              <div className={s.sideTotal}><span>Total</span><strong>{CLP(totals.total)}</strong></div>
            </section>

            <section className={s.sideCard}>
              <div className={s.sideTitle}>Acciones</div>
              <div className={s.actionCluster}>
                <button className={s.btnGhost} onClick={() => void handleSave("borrador")} type="button" disabled={isSaving}>
                  <LuSave aria-hidden /> Guardar borrador
                </button>
                <button className={s.btnPrimary} onClick={() => void handleSave("creada")} type="button" disabled={isSaving}>
                  <LuFileCheck2 aria-hidden /> Guardar presupuesto
                </button>
              </div>
            </section>
          </aside>
        ) : null}
      </div>
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
