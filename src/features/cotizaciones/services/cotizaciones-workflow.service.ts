import { impuestos } from "@/constants/impuestos";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
  EstadoCotizacionWorkflow,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  encodeCotizacionItemPresentationMeta,
  type CotizacionItemFreeValueIvaMode,
} from "@/utils/cotizacion-item-presentation";
import {
  normalizeCostInputScope,
  type CostInputScope,
} from "@/features/cotizaciones/types/pricing-mode";

const DEFAULT_FLETE = 0;
const COTIZACION_CODE_STORAGE_PREFIX = "vidrios-saas:cotizacion-code:";
const cotizacionCodeCounters = new Map<string, number>();

function createUniqueWorkflowItemId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type CalculateComponentItemInput = {
  id?: string;
  tipoItem?: CotizacionWorkflowItem["tipoItem"];
  codigo: string;
  tipo: string;
  lineaComercial?: string;
  vidrio?: string;
  nombre: string;
  descripcion?: string;
  ancho?: number | null;
  alto?: number | null;
  cantidad?: number;
  unidad?: string;
  costoProveedorUnitario: number;
  margenPct?: number;
  precioPorM2?: number | null;
  minimoCobrable?: number | null;
  redondeoPrecio?: number | null;
  precioPlantillaSugerido?: number | null;
  precioAjustadoManual?: boolean;
  origenPrecio?: "margen" | "plantilla" | "manual";
  observaciones?: string;
  costInputScope?: CostInputScope;
};

type CalculateFreeValueItemInput = {
  id?: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  valor: number;
  cantidad?: number;
  ivaMode?: CotizacionItemFreeValueIvaMode;
  observaciones?: string;
  allowZeroValue?: boolean;
};

type CreateCotizacionRecordInput = {
  draft: CotizacionWorkflowDraft;
  estado: EstadoCotizacionWorkflow;
  existingId?: string;
  existingCode?: string;
  createdAt?: string;
  now?: Date;
};

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function roundCommercialTotal(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.ceil(value / 1000) * 1000;
}

function normalizePositiveNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Number(value);
}

function normalizeNonNegativeNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value);
}

function buildCotizacionDateSegment(now: Date) {
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  return `${day}${month}${year}`;
}

function formatReadableCotizacionCode(dateSegment: string, sequence: number) {
  return `COT-${dateSegment}-${String(sequence).padStart(3, "0")}`;
}

function getCotizacionCodeStorageKey(dateSegment: string) {
  return `${COTIZACION_CODE_STORAGE_PREFIX}${dateSegment}`;
}

function readPersistedCotizacionCounter(dateSegment: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getCotizacionCodeStorageKey(dateSegment));

    if (!raw) {
      return null;
    }

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function persistCotizacionCounter(dateSegment: string, sequence: number) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getCotizacionCodeStorageKey(dateSegment), String(sequence));
  } catch {
    return;
  }
}

function getNextCotizacionCodeSequence(now: Date) {
  const dateSegment = buildCotizacionDateSegment(now);
  const persisted = readPersistedCotizacionCounter(dateSegment);
  const inMemory = cotizacionCodeCounters.get(dateSegment) ?? 0;
  const nextSequence = Math.max(inMemory, persisted ?? 0) + 1;

  cotizacionCodeCounters.set(dateSegment, nextSequence);
  persistCotizacionCounter(dateSegment, nextSequence);

  return nextSequence;
}

function extractFallbackSequence(seed: string | number | null | undefined) {
  if (seed === null || seed === undefined) {
    return 1;
  }

  const digits = String(seed).replace(/\D/g, "");

  if (!digits) {
    return 1;
  }

  const parsed = Number.parseInt(digits.slice(-3), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return parsed;
}

export function buildCotizacionCode(now = new Date()) {
  return formatReadableCotizacionCode(
    buildCotizacionDateSegment(now),
    getNextCotizacionCodeSequence(now)
  );
}

export function buildLegacyCotizacionCode(
  now = new Date(),
  stableSeed?: string | number | null
) {
  return formatReadableCotizacionCode(
    buildCotizacionDateSegment(now),
    extractFallbackSequence(stableSeed)
  );
}

export function __resetCotizacionCodeCountersForTests() {
  cotizacionCodeCounters.clear();
}

export function buildCotizacionId(now = new Date()) {
  return `cot-${now.getTime()}`;
}

export function formatCotizacionDate(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function calculateComponentItem(
  input: CalculateComponentItemInput
): CotizacionWorkflowItem {
  const codigo = input.codigo.trim();
  const tipo = input.tipo.trim();
  const lineaComercial = input.lineaComercial?.trim() ?? "";
  const vidrio = (input.vidrio ?? "").trim();
  const nombre = input.nombre.trim();
  const descripcion = (input.descripcion ?? input.nombre).trim();
  const cantidad = Number(input.cantidad) > 0 ? Number(input.cantidad) : 1;
  const costoProveedorUnitario = Number(input.costoProveedorUnitario);
  const margenPct = Number.isFinite(input.margenPct ?? 0) ? Number(input.margenPct ?? 0) : 0;
  const ancho = normalizePositiveNumber(input.ancho);
  const alto = normalizePositiveNumber(input.alto);

  if (!codigo) {
    throw new Error("El codigo del componente es obligatorio");
  }

  if (!tipo) {
    throw new Error("El tipo del componente es obligatorio");
  }

  if (!nombre) {
    throw new Error("El nombre del componente es obligatorio");
  }

  if (!Number.isFinite(costoProveedorUnitario) || costoProveedorUnitario < 0) {
    throw new Error("El costo proveedor debe ser cero o mayor");
  }

  if (!Number.isFinite(margenPct) || margenPct < 0) {
    throw new Error("El margen no puede ser negativo");
  }

  const costInputScope = normalizeCostInputScope(input.costInputScope);
  const costoIngresado = round(costoProveedorUnitario, 2);
  const costoUnitario =
    costInputScope === "group_total" && cantidad > 1
      ? round(costoIngresado / cantidad, 2)
      : costoIngresado;
  const costoTotal =
    costInputScope === "group_total"
      ? costoIngresado
      : round(costoUnitario * cantidad, 2);
  const precioUnitario = round(costoUnitario * (1 + margenPct / 100), 2);
  const precioTotal = round(precioUnitario * cantidad, 2);
  const areaM2 =
    ancho !== null && alto !== null ? round((ancho / 1000) * (alto / 1000), 2) : null;

  return {
    id: input.id ?? createUniqueWorkflowItemId(`item-${codigo.toLowerCase()}`),
    tipoItem: input.tipoItem ?? "componente",
    codigo,
    tipo,
    lineaComercial,
    vidrio,
    nombre,
    descripcion,
    ancho,
    alto,
    cantidad,
    unidad: input.unidad?.trim() || "unidad",
    areaM2,
    costoProveedorUnitario: costoUnitario,
    costoProveedorTotal: costoTotal,
    margenPct: round(margenPct, 2),
    precioUnitario,
    precioTotal,
    precioPorM2: normalizePositiveNumber(input.precioPorM2),
    minimoCobrable: Number.isFinite(input.minimoCobrable) ? Number(input.minimoCobrable) : null,
    redondeoPrecio: Number.isFinite(input.redondeoPrecio) ? Number(input.redondeoPrecio) : null,
    precioPlantillaSugerido: Number.isFinite(input.precioPlantillaSugerido)
      ? Number(input.precioPlantillaSugerido)
      : null,
    precioAjustadoManual: Boolean(input.precioAjustadoManual),
    origenPrecio: input.origenPrecio ?? (margenPct > 0 ? "margen" : "manual"),
    observaciones: input.observaciones?.trim() ?? "",
  };
}

export function calculateFreeValueItem(input: CalculateFreeValueItemInput): CotizacionWorkflowItem {
  const nombre = input.nombre.trim();
  const descripcion = (input.descripcion ?? input.nombre).trim();
  const valorUnitario = round(normalizeNonNegativeNumber(input.valor), 2);
  const cantidad = Number(input.cantidad) > 0 ? Math.round(Number(input.cantidad)) : 1;
  const precioTotal = round(valorUnitario * cantidad, 2);
  const codigo = input.codigo?.trim() || `L${Date.now()}`;

  if (!nombre) {
    throw new Error("El nombre del item libre es obligatorio");
  }

  if (!Number.isFinite(valorUnitario) || (!input.allowZeroValue && valorUnitario <= 0)) {
    throw new Error("Ingresa un valor mayor a cero");
  }

  return {
    id: input.id ?? createUniqueWorkflowItemId("item-libre"),
    tipoItem: "item_libre_con_valor",
    codigo,
    tipo: "Item libre",
    lineaComercial: "",
    vidrio: "",
    nombre,
    descripcion,
    ancho: null,
    alto: null,
    cantidad,
    unidad: "unidad",
    areaM2: null,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: valorUnitario,
    precioTotal,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      pricingMode: "precio_directo",
      ivaMode: "total_incluye_iva",
      totalClienteVisible: precioTotal,
      netoCalculado: precioTotal,
      ivaCalculado: 0,
      displayMode: "item_libre",
      raw: input.observaciones ?? "",
    }),
  };
}

export function calculateCotizacionWorkflowTotals(
  items: CotizacionWorkflowItem[],
  descuentoPct = 0,
  flete = DEFAULT_FLETE,
  options: { mostrarIva?: boolean } = {}
) {
  const mostrarIva = options.mostrarIva ?? true;
  const subtotal = round(
    items.reduce((accumulator, item) => accumulator + item.precioTotal, 0),
    2
  );
  const descuentoValor = round(subtotal * (descuentoPct / 100), 2);
  const neto = round(subtotal - descuentoValor, 2);
  const iva = mostrarIva ? round(neto * impuestos.iva, 2) : 0;
  const totalSinRedondeo = round(neto + iva + flete, 2);
  const total = roundCommercialTotal(totalSinRedondeo);
  const redondeoComercial = round(total - totalSinRedondeo, 2);

  return {
    subtotal,
    descuentoValor,
    neto,
    iva,
    flete,
    redondeoComercial,
    total,
  };
}

export function calculateGlobalQuoteWorkflowTotals(input: {
  costoTotalFabricacion?: number | null;
  margenGlobalPct?: number | null;
  totalClienteManual?: number | null;
  mostrarIva?: boolean;
  items?: CotizacionWorkflowItem[];
  flete?: number;
}) {
  const costoTotalFabricacion = round(
    normalizeNonNegativeNumber(input.costoTotalFabricacion),
    2
  );
  const hasManualTotal =
    input.totalClienteManual !== null &&
    input.totalClienteManual !== undefined &&
    Number.isFinite(input.totalClienteManual) &&
    input.totalClienteManual >= 0;
  const totalBase = hasManualTotal ? round(Number(input.totalClienteManual), 2) : 0;
  const extraTotal = round(
    (input.items ?? [])
      .filter((item) => item.tipoItem === "item_libre_con_valor" && item.precioTotal > 0)
      .reduce((accumulator, item) => accumulator + item.precioTotal, 0),
    2
  );
  const neto = round(totalBase + extraTotal, 2);
  const flete = round(normalizeNonNegativeNumber(input.flete), 2);
  const mostrarIva = input.mostrarIva ?? true;
  const iva = mostrarIva ? round(neto * impuestos.iva, 2) : 0;
  const totalSinRedondeo = round(neto + iva + flete, 2);
  const total = roundCommercialTotal(totalSinRedondeo);
  const redondeoComercial = round(total - totalSinRedondeo, 2);
  const utilidadTotal = round(total - costoTotalFabricacion, 2);
  const margenGlobalPct =
    costoTotalFabricacion === 0 ? 0 : round((utilidadTotal / costoTotalFabricacion) * 100, 2);

  return {
    subtotal: neto,
    descuentoValor: 0,
    neto,
    iva,
    flete,
    redondeoComercial,
    total,
    costoTotalFabricacion,
    margenGlobalPct,
    utilidadTotal,
    totalClienteManual: hasManualTotal ? totalBase : null,
  };
}

export function calculateWorkflowTotalsForPricingMode(
  draft: Pick<
    CotizacionWorkflowDraft,
    | "items"
    | "descuentoPct"
    | "flete"
    | "quotePricingMode"
    | "costoTotalFabricacion"
    | "margenGlobalPct"
    | "totalClienteManual"
    | "mostrarIva"
  >
) {
  const quotePricingMode = normalizeQuotePricingMode(draft.quotePricingMode);

  if (quotePricingMode === "total_global") {
    return calculateGlobalQuoteWorkflowTotals({
      costoTotalFabricacion: draft.costoTotalFabricacion,
      margenGlobalPct: draft.margenGlobalPct,
      totalClienteManual: draft.totalClienteManual,
      mostrarIva: draft.mostrarIva,
      items: draft.items,
      flete: draft.flete,
    });
  }

  return {
    ...calculateCotizacionWorkflowTotals(draft.items, draft.descuentoPct, draft.flete, {
      mostrarIva: draft.mostrarIva ?? true,
    }),
    costoTotalFabricacion: round(
      draft.items.reduce((accumulator, item) => accumulator + item.costoProveedorTotal, 0),
      2
    ),
    margenGlobalPct: 0,
    utilidadTotal: 0,
    totalClienteManual: null,
  };
}

export function createCotizacionWorkflowDraft(): CotizacionWorkflowDraft {
  return {
    clienteNombre: "",
    clienteTelefono: "+56 9 ",
    obra: "",
    direccion: "",
    validez: "15 dias",
    descuentoPct: 0,
    flete: DEFAULT_FLETE,
    observaciones: "",
    items: [],
    quotePricingMode: "por_item",
    costoTotalFabricacion: 0,
    margenGlobalPct: 100,
    utilidadTotal: 0,
    totalClienteManual: null,
    mostrarIva: true,
  };
}

export function resolveWorkflowObraTitle(input: {
  obra: string;
  clienteNombre: string;
}): string {
  const normalizedObra = input.obra.trim();
  if (normalizedObra) {
    return normalizedObra;
  }

  const normalizedClientName = input.clienteNombre.trim();
  if (normalizedClientName) {
    return `Trabajo de ${normalizedClientName}`.slice(0, 80);
  }

  return "Solicitud comercial";
}

export function createCotizacionRecord(
  input: CreateCotizacionRecordInput
): CotizacionWorkflowRecord {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const quotePricingMode: QuotePricingMode = normalizeQuotePricingMode(
    input.draft.quotePricingMode
  );
  const totals = calculateWorkflowTotalsForPricingMode(input.draft);

  return {
    id: input.existingId ?? buildCotizacionId(now),
    codigo: input.existingCode ?? buildCotizacionCode(now),
    clienteNombre: input.draft.clienteNombre.trim(),
    clienteTelefono: input.draft.clienteTelefono.trim(),
    obra: resolveWorkflowObraTitle({
      obra: input.draft.obra,
      clienteNombre: input.draft.clienteNombre,
    }),
    direccion: input.draft.direccion.trim(),
    validez: input.draft.validez,
    descuentoPct: input.draft.descuentoPct,
    observaciones: input.draft.observaciones.trim(),
    estado: input.estado,
    approvalToken: null,
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
    pdfDescargadoEn: null,
    createdAt: input.createdAt ?? timestamp,
    updatedAt: timestamp,
    items: input.draft.items,
    quotePricingMode,
    mostrarIva: input.draft.mostrarIva ?? true,
    ...totals,
  };
}

export function cloneCotizacionAsDraft(record: CotizacionWorkflowRecord, now = new Date()) {
  return createCotizacionRecord({
    draft: {
      clienteNombre: record.clienteNombre,
      clienteTelefono: record.clienteTelefono,
      obra: `${record.obra} copia`,
      direccion: record.direccion,
      validez: record.validez,
      descuentoPct: record.descuentoPct,
      flete: record.flete,
      observaciones: record.observaciones,
      items: record.items.map((item, index) => ({
        ...item,
        id: `copy-item-${now.getTime()}-${index + 1}`,
      })),
      quotePricingMode: record.quotePricingMode,
      costoTotalFabricacion: record.costoTotalFabricacion,
      margenGlobalPct: record.margenGlobalPct,
      utilidadTotal: record.utilidadTotal,
      totalClienteManual: record.totalClienteManual,
      mostrarIva: record.mostrarIva ?? true,
    },
    estado: "borrador",
    now,
  });
}
