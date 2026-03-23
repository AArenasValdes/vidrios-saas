import { impuestos } from "@/constants/impuestos";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
  EstadoCotizacionWorkflow,
} from "@/types/cotizacion-workflow";

const DEFAULT_FLETE = 0;
const COTIZACION_CODE_STORAGE_PREFIX = "vidrios-saas:cotizacion-code:";
const cotizacionCodeCounters = new Map<string, number>();

type CalculateComponentItemInput = {
  id?: string;
  codigo: string;
  tipo: string;
  vidrio?: string;
  nombre: string;
  descripcion?: string;
  ancho?: number | null;
  alto?: number | null;
  cantidad?: number;
  unidad?: string;
  costoProveedorUnitario: number;
  margenPct?: number;
  observaciones?: string;
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

function normalizePositiveNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return null;
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

  const costoProveedorTotal = round(costoProveedorUnitario * cantidad, 2);
  const precioUnitario = round(costoProveedorUnitario * (1 + margenPct / 100), 2);
  const precioTotal = round(precioUnitario * cantidad, 2);
  const areaM2 =
    ancho !== null && alto !== null ? round((ancho / 1000) * (alto / 1000), 2) : null;

  return {
    id: input.id ?? `item-${codigo.toLowerCase()}-${Date.now()}`,
    codigo,
    tipo,
    vidrio,
    nombre,
    descripcion,
    ancho,
    alto,
    cantidad,
    unidad: input.unidad?.trim() || "unidad",
    areaM2,
    costoProveedorUnitario: round(costoProveedorUnitario, 2),
    costoProveedorTotal,
    margenPct: round(margenPct, 2),
    precioUnitario,
    precioTotal,
    observaciones: input.observaciones?.trim() ?? "",
  };
}

export function calculateCotizacionWorkflowTotals(
  items: CotizacionWorkflowItem[],
  descuentoPct = 0,
  flete = DEFAULT_FLETE
) {
  const subtotal = round(
    items.reduce((accumulator, item) => accumulator + item.precioTotal, 0),
    2
  );

  const descuentoValor = round(subtotal * (descuentoPct / 100), 2);
  const neto = round(subtotal - descuentoValor, 2);
  const iva = round(neto * impuestos.iva, 2);
  const total = round(neto + iva + flete, 2);

  return {
    subtotal,
    descuentoValor,
    neto,
    iva,
    flete,
    total,
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
  };
}

export function createCotizacionRecord(
  input: CreateCotizacionRecordInput
): CotizacionWorkflowRecord {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const totals = calculateCotizacionWorkflowTotals(
    input.draft.items,
    input.draft.descuentoPct,
    input.draft.flete
  );

  return {
    id: input.existingId ?? buildCotizacionId(now),
    codigo: input.existingCode ?? buildCotizacionCode(now),
    clienteNombre: input.draft.clienteNombre.trim(),
    clienteTelefono: input.draft.clienteTelefono.trim(),
    obra: input.draft.obra.trim(),
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
    createdAt: input.createdAt ?? timestamp,
    updatedAt: timestamp,
    items: input.draft.items,
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
    },
    estado: "borrador",
    now,
  });
}
