import { createClient } from "@/lib/supabase/client";
import type { Cotizacion, CrearCotizacionInput } from "@/features/cotizaciones/types/cotizacion";
import type {
  CotizacionItem,
  CotizacionItemBreakdown,
  CrearCotizacionItemBreakdownInput,
  CrearCotizacionItemInput,
} from "@/features/cotizaciones/types/cotizacion-item";
import type { EntityId } from "@/types/common";
import { normalizeQuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { normalizeQuoteCreationSurface } from "@/features/cotizaciones/types/quote-creation-surface";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { parseQuoteRegionSnapshot } from "@/features/organization-region/services/quote-region-snapshot.service";

type CotizacionesRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type CotizacionRow = {
  id: EntityId;
  proyecto_id: EntityId | null;
  organization_id: EntityId;
  numero: string | null;
  estado: string;
  descuento_pct: number | string | null;
  flete: number | string | null;
  iva: number | string | null;
  notas: string | null;
  valido_hasta: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
  subtotal_neto: number | string | null;
  costo_total: number | string | null;
  margen_pct: number | string | null;
  utilidad_total: number | string | null;
  costo_materiales_total: number | string | null;
  costo_mano_obra_total: number | string | null;
  costo_traslado_total: number | string | null;
  costo_otros_total: number | string | null;
  merma_pct: number | string | null;
  merma_total: number | string | null;
  margen_objetivo_pct: number | string | null;
  precio_recomendado_neto: number | string | null;
  iva_pct: number | string | null;
  financial_snapshot_version: number | string | null;
  financial_snapshot_calculado_en: string | null;
  cost_basis_status: string | null;
  pricing_mode?: string | null;
  creation_surface?: string | null;
  estado_comercial: string | null;
  approval_token: string | null;
  approval_token_expires_at: string | null;
  cliente_vio_en: string | null;
  cliente_respondio_en: string | null;
  cliente_respuesta_canal: string | null;
  pdf_descargado_en: string | null;
  regional_snapshot?: unknown;
  solicitud_id?: string | null;
  creado_en: string | null;
  total: number;
};

type CotizacionItemRow = {
  id: EntityId;
  cotizacion_id: EntityId | null;
  codigo?: string | null;
  tipo_componente?: string | null;
  orden?: number | null;
  cantidad: number;
  precio_unitario: number | string;
  subtotal: number | string;
  organization_id: EntityId;
  ancho: number | string | null;
  alto: number | string | null;
  area_m2: number | string | null;
  linea: string | null;
  color: string | null;
  vidrio: string | null;
  nombre: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
  descripcion: string | null;
  unidad: string | null;
  observaciones: string | null;
  fabricacion_snapshot?: unknown;
  tipo_item: string | null;
  creado_en: string | null;
  product_type_id: EntityId | null;
  system_line_id: EntityId | null;
  configuration_id: EntityId | null;
  costo_unitario: number | string | null;
  costo_total: number | string | null;
  margen_pct: number | string | null;
  utilidad: number | string | null;
};

type CotizacionItemBreakdownRow = {
  id: EntityId;
  cotizacion_item_id: EntityId;
  material_id: EntityId | null;
  descripcion: string | null;
  unidad: string | null;
  cantidad: number | string | null;
  costo_unitario: number | string | null;
  costo_total: number | string | null;
  precio_unitario: number | string | null;
  precio_total: number | string | null;
  origen: string | null;
  creado_en: string | null;
  organization_id: EntityId | null;
};

const COTIZACION_DETAIL_SELECT =
  "id, proyecto_id, organization_id, numero, estado, descuento_pct, flete, iva, notas, valido_hasta, actualizado_en, eliminado_en, subtotal_neto, costo_total, margen_pct, utilidad_total, costo_materiales_total, costo_mano_obra_total, costo_traslado_total, costo_otros_total, merma_pct, merma_total, margen_objetivo_pct, precio_recomendado_neto, iva_pct, financial_snapshot_version, financial_snapshot_calculado_en, cost_basis_status, pricing_mode, creation_surface, estado_comercial, approval_token, approval_token_expires_at, cliente_vio_en, cliente_respondio_en, cliente_respuesta_canal, pdf_descargado_en, regional_snapshot, solicitud_id, creado_en, total";
const COTIZACION_DETAIL_SELECT_LEGACY =
  "id, proyecto_id, organization_id, numero, estado, descuento_pct, flete, iva, notas, valido_hasta, actualizado_en, eliminado_en, subtotal_neto, costo_total, margen_pct, utilidad_total, estado_comercial, creado_en, total";
const COTIZACION_LIST_SELECT =
  "id, proyecto_id, organization_id, numero, estado, pricing_mode, creation_surface, approval_token, approval_token_expires_at, cliente_vio_en, cliente_respondio_en, cliente_respuesta_canal, pdf_descargado_en, creado_en, actualizado_en, total";
const COTIZACION_LIST_SELECT_LEGACY =
  "id, proyecto_id, organization_id, numero, estado, creado_en, actualizado_en, total";
const COTIZACION_ITEM_SELECT =
  "id, cotizacion_id, codigo, tipo_componente, orden, cantidad, precio_unitario, subtotal, organization_id, ancho, alto, area_m2, linea, color, vidrio, nombre, actualizado_en, eliminado_en, descripcion, unidad, observaciones, fabricacion_snapshot, tipo_item, creado_en, product_type_id, system_line_id, configuration_id, costo_unitario, costo_total, margen_pct, utilidad";
const COTIZACION_ITEM_SELECT_LEGACY =
  "id, cotizacion_id, cantidad, precio_unitario, subtotal, organization_id, ancho, alto, area_m2, linea, color, vidrio, nombre, actualizado_en, eliminado_en, descripcion, unidad, observaciones, tipo_item, creado_en, product_type_id, system_line_id, configuration_id, costo_unitario, costo_total, margen_pct, utilidad";
const COTIZACION_BREAKDOWN_SELECT =
  "id, cotizacion_item_id, material_id, descripcion, unidad, cantidad, costo_unitario, costo_total, precio_unitario, precio_total, origen, creado_en, organization_id";
const COTIZACION_DASHBOARD_SELECT =
  "id, proyecto_id, organization_id, numero, estado, approval_token, approval_token_expires_at, cliente_vio_en, cliente_respondio_en, cliente_respuesta_canal, creado_en, actualizado_en, total";
const COTIZACION_DASHBOARD_METRICS_SELECT =
  "estado, total, actualizado_en, pdf_descargado_en";
const COTIZACION_DASHBOARD_METRICS_SELECT_LEGACY =
  "estado, total, actualizado_en";
const COTIZACION_CLIENT_SUMMARY_SELECT =
  "id, proyecto_id, estado, cliente_vio_en, cliente_respondio_en, creado_en, actualizado_en";
const COTIZACION_CLIENT_SUMMARY_SELECT_LEGACY =
  "id, proyecto_id, estado, creado_en, actualizado_en";

export type CotizacionClienteSummary = {
  id: EntityId;
  proyectoId: EntityId | null;
  estado: string;
  creadoEn: string | null;
  actualizadoEn: string | null;
  clienteVioEn: string | null;
  clienteRespondioEn: string | null;
};

export type CotizacionDashboardMetric = {
  estado: string;
  total: number;
  actualizadoEn: string | null;
  pdfDescargadoEn: string | null;
};

type CotizacionesDashboardFilter = {
  estados?: string[];
  updatedFrom?: string;
  updatedTo?: string;
  respondedFrom?: string;
  respondedTo?: string;
  viewedOnly?: boolean;
  respondedOnly?: boolean;
  pdfDownloadedOnly?: boolean;
  allowedProjectIds?: EntityId[] | null;
  searchProjectIds?: EntityId[] | null;
  search?: string | null;
};

type CotizacionesResumenPageOptions = {
  page: number;
  pageSize: number;
  estado?: string | null;
  period?: "all" | "this_month" | "last_month" | "last_90_days";
  order?: "updated_desc" | "total_desc" | "codigo_desc" | "estado";
  search?: string | null;
  allowedProjectIds?: EntityId[] | null;
  searchProjectIds?: EntityId[] | null;
};

type CotizacionesResumenPageResult = {
  cotizaciones: Cotizacion[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
};

type CotizacionesResumenGlobalResult = {
  totalCount: number;
  totalAmount: number;
  approvedAmount: number;
  pdfGeneratedCount: number;
  counts: {
    borrador: number;
    creada: number;
    enviada: number;
    aprobada: number;
    rechazada: number;
    terminada: number;
  };
};

type HydrateCotizacionOptions = {
  includeBreakdown?: boolean;
};

function getErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  return [candidate.code, candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingComponentFieldsError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    (haystack.includes("codigo") ||
      haystack.includes("tipo_componente") ||
      haystack.includes("orden") ||
      haystack.includes("fabricacion_snapshot")) &&
    (haystack.includes("column") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

function isMissingBreakdownTableError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    haystack.includes("quote_item_breakdown") &&
    (haystack.includes("relation") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

function isMissingApprovalFieldsError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    (haystack.includes("approval_token") ||
      haystack.includes("approval_token_expires_at") ||
      haystack.includes("cliente_vio_en") ||
      haystack.includes("cliente_respondio_en") ||
      haystack.includes("cliente_respuesta_canal") ||
      haystack.includes("pdf_descargado_en") ||
      haystack.includes("costo_materiales_total") ||
      haystack.includes("costo_mano_obra_total") ||
      haystack.includes("costo_traslado_total") ||
      haystack.includes("costo_otros_total") ||
      haystack.includes("merma_pct") ||
      haystack.includes("merma_total") ||
      haystack.includes("margen_objetivo_pct") ||
      haystack.includes("precio_recomendado_neto") ||
      haystack.includes("iva_pct") ||
      haystack.includes("financial_snapshot_version") ||
      haystack.includes("financial_snapshot_calculado_en") ||
      haystack.includes("cost_basis_status") ||
      haystack.includes("solicitud_id")) &&
    (haystack.includes("column") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

function parseFabricacionSnapshot(
  value: unknown
): FabricacionCotizacionSnapshot | null {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== 1 ||
    record.tipo !== "fabricacion_receta_snapshot" ||
    typeof record.recipeId !== "string" ||
    typeof record.recipeVersion !== "number" ||
    typeof record.recipeIdentity !== "object" ||
    typeof record.input !== "object" ||
    typeof record.result !== "object" ||
    !Array.isArray(record.pauta) ||
    !Array.isArray(record.vidrios) ||
    !Array.isArray(record.advertencias) ||
    typeof record.calculatedAt !== "string"
  ) {
    return null;
  }

  return value as FabricacionCotizacionSnapshot;
}

function isMissingCodeSequenceFunctionError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    haystack.includes("reserve_next_cotizacion_code") &&
    (haystack.includes("function") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist") ||
      haystack.includes("could not find"))
  );
}

function normalizeOrganizationSequenceId(organizationId: EntityId) {
  const parsed = Number(organizationId);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error("El organization_id debe ser numerico para reservar codigos de cotizacion.");
  }

  return parsed;
}

function toNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

function mapBreakdown(row: CotizacionItemBreakdownRow): CotizacionItemBreakdown {
  return {
    id: row.id,
    cotizacionItemId: row.cotizacion_item_id,
    organizationId: row.organization_id,
    materialId: row.material_id,
    descripcion: row.descripcion,
    unidad: row.unidad,
    cantidad: Number(row.cantidad ?? 0),
    costoUnitario: Number(row.costo_unitario ?? 0),
    costoTotal: Number(row.costo_total ?? 0),
    precioUnitario: Number(row.precio_unitario ?? 0),
    precioTotal: Number(row.precio_total ?? 0),
    origen: row.origen,
    creadoEn: row.creado_en,
  };
}

function mapCotizacionItem(
  row: CotizacionItemRow,
  breakdown: CotizacionItemBreakdown[]
): CotizacionItem {
  return {
    id: row.id,
    cotizacionId: row.cotizacion_id,
    organizationId: row.organization_id,
    codigo: row.codigo ?? null,
    tipoComponente: row.tipo_componente ?? null,
    orden: row.orden ?? null,
    cantidad: row.cantidad,
    precioUnitario: Number(row.precio_unitario),
    subtotal: Number(row.subtotal),
    ancho: toNumber(row.ancho),
    alto: toNumber(row.alto),
    areaM2: toNumber(row.area_m2),
    linea: row.linea,
    color: row.color,
    vidrio: row.vidrio,
    nombre: row.nombre,
    actualizadoEn: row.actualizado_en,
    eliminadoEn: row.eliminado_en,
    descripcion: row.descripcion,
    unidad: row.unidad,
    observaciones: row.observaciones,
    fabricacionSnapshot: parseFabricacionSnapshot(row.fabricacion_snapshot),
    tipoItem: row.tipo_item,
    creadoEn: row.creado_en,
    productTypeId: row.product_type_id,
    systemLineId: row.system_line_id,
    configurationId: row.configuration_id,
    costoUnitario: toNumber(row.costo_unitario),
    costoTotal: toNumber(row.costo_total),
    margenPct: toNumber(row.margen_pct),
    utilidad: toNumber(row.utilidad),
    breakdown,
  };
}

function mapCotizacion(row: CotizacionRow): Cotizacion {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    organizationId: row.organization_id,
    numero: row.numero,
    estado: row.estado,
    descuentoPct: toNumber(row.descuento_pct ?? null),
    flete: toNumber(row.flete ?? null),
    iva: toNumber(row.iva ?? null),
    notas: row.notas ?? null,
    validoHasta: row.valido_hasta ?? null,
    actualizadoEn: row.actualizado_en,
    eliminadoEn: row.eliminado_en,
    subtotalNeto: toNumber(row.subtotal_neto ?? null),
    costoTotal: toNumber(row.costo_total ?? null),
    margenPct: toNumber(row.margen_pct ?? null),
    utilidadTotal: toNumber(row.utilidad_total ?? null),
    costoMaterialesTotal: toNumber(row.costo_materiales_total ?? null),
    costoManoObraTotal: toNumber(row.costo_mano_obra_total ?? null),
    costoTrasladoTotal: toNumber(row.costo_traslado_total ?? null),
    costoOtrosTotal: toNumber(row.costo_otros_total ?? null),
    mermaPct: toNumber(row.merma_pct ?? null),
    mermaTotal: toNumber(row.merma_total ?? null),
    margenObjetivoPct: toNumber(row.margen_objetivo_pct ?? null),
    precioRecomendadoNeto: toNumber(row.precio_recomendado_neto ?? null),
    ivaPct: toNumber(row.iva_pct ?? null),
    financialSnapshotVersion: toNumber(row.financial_snapshot_version ?? null),
    financialSnapshotCalculadoEn: row.financial_snapshot_calculado_en ?? null,
    costBasisStatus: row.cost_basis_status ?? null,
    pricingMode: normalizeQuotePricingMode(row.pricing_mode),
    creationSurface: normalizeQuoteCreationSurface(row.creation_surface),
    estadoComercial: row.estado_comercial ?? null,
    approvalToken: row.approval_token ?? null,
    approvalTokenExpiresAt: row.approval_token_expires_at ?? null,
    clienteVioEn: row.cliente_vio_en ?? null,
    clienteRespondioEn: row.cliente_respondio_en ?? null,
    clienteRespuestaCanal: row.cliente_respuesta_canal ?? null,
    pdfDescargadoEn: row.pdf_descargado_en ?? null,
    regionalSnapshot: parseQuoteRegionSnapshot(row.regional_snapshot),
    solicitudId: row.solicitud_id ?? null,
    creadoEn: row.creado_en,
    items: [],
    total: row.total,
  };
}

function mapCotizacionClientSummary(row: CotizacionRow): CotizacionClienteSummary {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    estado: row.estado,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    clienteVioEn: row.cliente_vio_en ?? null,
    clienteRespondioEn: row.cliente_respondio_en ?? null,
  };
}

type DashboardCotizacionesFilterableQuery = {
  eq(column: string, value: unknown): DashboardCotizacionesFilterableQuery;
  is(column: string, value: unknown): DashboardCotizacionesFilterableQuery;
  in(column: string, values: readonly unknown[]): DashboardCotizacionesFilterableQuery;
  not(column: string, operator: string, value: unknown): DashboardCotizacionesFilterableQuery;
  gte(column: string, value: string): DashboardCotizacionesFilterableQuery;
  lt(column: string, value: string): DashboardCotizacionesFilterableQuery;
  ilike(column: string, pattern: string): DashboardCotizacionesFilterableQuery;
  or(filters: string): DashboardCotizacionesFilterableQuery;
  order(column: string, options: { ascending: boolean }): DashboardCotizacionesFilterableQuery;
  range(from: number, to: number): DashboardCotizacionesFilterableQuery;
};

function applyCotizacionesDashboardFilters<T extends DashboardCotizacionesFilterableQuery>(
  query: T,
  organizationId: EntityId,
  filters: CotizacionesDashboardFilter = {}
) : T {
  let nextQuery = query
    .eq("organization_id", organizationId)
    .is("eliminado_en", null) as T;

  if (filters.estados && filters.estados.length > 0) {
    if (
      filters.estados.length === 1 &&
      filters.estados[0]?.toLowerCase() === "pendiente"
    ) {
      nextQuery = nextQuery.in("estado", ["borrador", "creada", "enviada"]) as T;
    } else if (
      filters.estados.length === 1 &&
      filters.estados[0]?.toLowerCase() === "pdf_generado"
    ) {
      nextQuery = nextQuery.not("pdf_descargado_en", "is", null) as T;
    } else {
      nextQuery = nextQuery.in("estado", filters.estados) as T;
    }
  }

  if (filters.allowedProjectIds?.length) {
    nextQuery = nextQuery.in("proyecto_id", filters.allowedProjectIds) as T;
  }

  if (filters.viewedOnly) {
    nextQuery = nextQuery.not("cliente_vio_en", "is", null) as T;
  }

  if (filters.respondedOnly) {
    nextQuery = nextQuery.not("cliente_respondio_en", "is", null) as T;
  }

  if (filters.pdfDownloadedOnly) {
    nextQuery = nextQuery.not("pdf_descargado_en", "is", null) as T;
  }

  if (filters.updatedFrom) {
    nextQuery = nextQuery.gte("actualizado_en", filters.updatedFrom) as T;
  }

  if (filters.updatedTo) {
    nextQuery = nextQuery.lt("actualizado_en", filters.updatedTo) as T;
  }

  if (filters.respondedFrom) {
    nextQuery = nextQuery.gte("cliente_respondio_en", filters.respondedFrom) as T;
  }

  if (filters.respondedTo) {
    nextQuery = nextQuery.lt("cliente_respondio_en", filters.respondedTo) as T;
  }

  const normalizedSearch = filters.search?.trim() ?? "";

  if (normalizedSearch) {
    const safeSearch = normalizedSearch.replace(/,/g, " ").replace(/\./g, " ");

    if (filters.searchProjectIds?.length) {
      nextQuery = nextQuery.or(
        `numero.ilike.%${safeSearch}%,proyecto_id.in.(${filters.searchProjectIds.join(",")})`
      ) as T;
    } else {
      nextQuery = nextQuery.ilike("numero", `%${safeSearch}%`) as T;
    }
  }

  return nextQuery;
}

function buildItemInsert(
  input: CrearCotizacionItemInput,
  cotizacionId: EntityId
) {
  return {
    cotizacion_id: cotizacionId,
    codigo: input.codigo ?? null,
    tipo_componente: input.tipoComponente ?? null,
    orden: input.orden ?? null,
    cantidad: input.cantidad,
    precio_unitario: input.precioUnitario,
    subtotal: input.subtotal,
    organization_id: input.organizationId,
    ancho: input.ancho ?? null,
    alto: input.alto ?? null,
    area_m2: input.areaM2 ?? null,
    linea: input.linea ?? null,
    color: input.color ?? null,
    vidrio: input.vidrio ?? null,
    nombre: input.nombre ?? null,
    descripcion: input.descripcion ?? null,
    unidad: input.unidad ?? null,
    observaciones: input.observaciones ?? null,
    fabricacion_snapshot: input.fabricacionSnapshot ?? null,
    tipo_item: input.tipoItem ?? null,
    product_type_id: input.productTypeId ?? null,
    system_line_id: input.systemLineId ?? null,
    configuration_id: input.configurationId ?? null,
    costo_unitario: input.costoUnitario ?? null,
    costo_total: input.costoTotal ?? null,
    margen_pct: input.margenPct ?? null,
    utilidad: input.utilidad ?? null,
  };
}

function buildLegacyItemInsert(
  input: CrearCotizacionItemInput,
  cotizacionId: EntityId
) {
  return {
    cotizacion_id: cotizacionId,
    cantidad: input.cantidad,
    precio_unitario: input.precioUnitario,
    subtotal: input.subtotal,
    organization_id: input.organizationId,
    ancho: input.ancho ?? null,
    alto: input.alto ?? null,
    area_m2: input.areaM2 ?? null,
    linea: input.linea ?? null,
    color: input.color ?? null,
    vidrio: input.vidrio ?? null,
    nombre: input.nombre ?? null,
    descripcion: input.descripcion ?? null,
    unidad: input.unidad ?? null,
    observaciones: input.observaciones ?? null,
    tipo_item: input.tipoItem ?? null,
    product_type_id: input.productTypeId ?? null,
    system_line_id: input.systemLineId ?? null,
    configuration_id: input.configurationId ?? null,
    costo_unitario: input.costoUnitario ?? null,
    costo_total: input.costoTotal ?? null,
    margen_pct: input.margenPct ?? null,
    utilidad: input.utilidad ?? null,
  };
}

function buildBreakdownInsert(
  input: CrearCotizacionItemBreakdownInput,
  cotizacionItemId: EntityId,
  organizationId: EntityId
) {
  return {
    cotizacion_item_id: cotizacionItemId,
    material_id: input.materialId ?? null,
    descripcion: input.descripcion ?? null,
    unidad: input.unidad ?? null,
    cantidad: input.cantidad,
    costo_unitario: input.costoUnitario,
    costo_total: input.costoTotal,
    precio_unitario: input.precioUnitario,
    precio_total: input.precioTotal,
    origen: input.origen ?? null,
    organization_id: organizationId,
  };
}

function buildCotizacionUpdatePayload(input: CrearCotizacionInput) {
  return {
    proyecto_id: input.proyectoId ?? null,
    organization_id: input.organizationId,
    numero: input.numero ?? null,
    estado: input.estado,
    descuento_pct: input.descuentoPct ?? null,
    flete: input.flete ?? null,
    iva: input.iva ?? null,
    notas: input.notas ?? null,
    valido_hasta: input.validoHasta ?? null,
    subtotal_neto: input.subtotalNeto ?? null,
    costo_total: input.costoTotal ?? null,
    margen_pct: input.margenPct ?? null,
    utilidad_total: input.utilidadTotal ?? null,
    costo_materiales_total: input.costoMaterialesTotal ?? null,
    costo_mano_obra_total: input.costoManoObraTotal ?? null,
    costo_traslado_total: input.costoTrasladoTotal ?? null,
    costo_otros_total: input.costoOtrosTotal ?? null,
    merma_pct: input.mermaPct ?? null,
    merma_total: input.mermaTotal ?? null,
    margen_objetivo_pct: input.margenObjetivoPct ?? null,
    precio_recomendado_neto: input.precioRecomendadoNeto ?? null,
    iva_pct: input.ivaPct ?? null,
    financial_snapshot_version: input.financialSnapshotVersion ?? null,
    financial_snapshot_calculado_en: input.financialSnapshotCalculadoEn ?? null,
    cost_basis_status: input.costBasisStatus ?? null,
    pricing_mode: input.pricingMode ?? "por_item",
    creation_surface: input.creationSurface ?? null,
    estado_comercial: input.estadoComercial ?? null,
    approval_token: input.approvalToken ?? null,
    approval_token_expires_at: input.approvalTokenExpiresAt ?? null,
    cliente_vio_en: input.clienteVioEn ?? null,
    cliente_respondio_en: input.clienteRespondioEn ?? null,
    cliente_respuesta_canal: input.clienteRespuestaCanal ?? null,
    regional_snapshot: input.regionalSnapshot ?? null,
    solicitud_id: input.solicitudId ?? null,
    total: input.total,
    actualizado_en: new Date().toISOString(),
  };
}

function buildCotizacionInsertPayload(input: CrearCotizacionInput) {
  const { actualizado_en: updatedAt, ...payload } = buildCotizacionUpdatePayload(input);
  void updatedAt;
  return payload;
}

type CotizacionWritePayload =
  | ReturnType<typeof buildCotizacionUpdatePayload>
  | ReturnType<typeof buildCotizacionInsertPayload>;

function stripLegacyCotizacionExtensionFields(payload: CotizacionWritePayload) {
  const {
    approval_token: approvalToken,
    approval_token_expires_at: approvalTokenExpiresAt,
    cliente_vio_en: clienteVioEn,
    cliente_respondio_en: clienteRespondioEn,
    cliente_respuesta_canal: clienteRespuestaCanal,
    costo_materiales_total: costoMaterialesTotal,
    costo_mano_obra_total: costoManoObraTotal,
    costo_traslado_total: costoTrasladoTotal,
    costo_otros_total: costoOtrosTotal,
    merma_pct: mermaPct,
    merma_total: mermaTotal,
    margen_objetivo_pct: margenObjetivoPct,
    precio_recomendado_neto: precioRecomendadoNeto,
    iva_pct: ivaPct,
    financial_snapshot_version: financialSnapshotVersion,
    financial_snapshot_calculado_en: financialSnapshotCalculadoEn,
    cost_basis_status: costBasisStatus,
    solicitud_id: solicitudId,
    creation_surface: creationSurface,
    ...legacyPayload
  } = payload;

  void approvalToken;
  void approvalTokenExpiresAt;
  void clienteVioEn;
  void clienteRespondioEn;
  void clienteRespuestaCanal;
  void costoMaterialesTotal;
  void costoManoObraTotal;
  void costoTrasladoTotal;
  void costoOtrosTotal;
  void mermaPct;
  void mermaTotal;
  void margenObjetivoPct;
  void precioRecomendadoNeto;
  void ivaPct;
  void financialSnapshotVersion;
  void financialSnapshotCalculadoEn;
  void costBasisStatus;
  void solicitudId;
  void creationSurface;

  return legacyPayload;
}

function mapSnapshotItemToCreateInput(item: CotizacionItem): CrearCotizacionItemInput {
  return {
    codigo: item.codigo,
    tipoComponente: item.tipoComponente,
    orden: item.orden,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    subtotal: item.subtotal,
    organizationId: item.organizationId,
    ancho: item.ancho,
    alto: item.alto,
    areaM2: item.areaM2,
    linea: item.linea,
    color: item.color,
    vidrio: item.vidrio,
    nombre: item.nombre,
    descripcion: item.descripcion,
    unidad: item.unidad,
    observaciones: item.observaciones,
    fabricacionSnapshot: item.fabricacionSnapshot,
    tipoItem: item.tipoItem,
    productTypeId: item.productTypeId,
    systemLineId: item.systemLineId,
    configurationId: item.configurationId,
    costoUnitario: item.costoUnitario,
    costoTotal: item.costoTotal,
    margenPct: item.margenPct,
    utilidad: item.utilidad,
    breakdown: item.breakdown.map((entry) => ({
      materialId: entry.materialId,
      descripcion: entry.descripcion,
      unidad: entry.unidad,
      cantidad: entry.cantidad,
      costoUnitario: entry.costoUnitario,
      costoTotal: entry.costoTotal,
      precioUnitario: entry.precioUnitario,
      precioTotal: entry.precioTotal,
      origen: entry.origen,
    })),
  };
}

export function createCotizacionesRepository(
  deps: CotizacionesRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  async function softDeleteActiveItems(
    cotizacionId: EntityId,
    organizationId: EntityId,
    deletedAt = new Date().toISOString()
  ) {
    const { error } = await supabase
      .from("cotizacion_items")
      .update({
        eliminado_en: deletedAt,
      })
      .eq("cotizacion_id", cotizacionId)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null);

    if (error) {
      throw error;
    }
  }

  async function insertBreakdownEntries(
    breakdown: CrearCotizacionItemBreakdownInput[],
    cotizacionItemId: EntityId,
    organizationId: EntityId
  ) {
    if (breakdown.length === 0) {
      return;
    }

    const { error: breakdownError } = await supabase
      .from("quote_item_breakdown")
      .insert(
        breakdown.map((entry) =>
          buildBreakdownInsert(entry, cotizacionItemId, organizationId)
        )
      );

    if (breakdownError && !isMissingBreakdownTableError(breakdownError)) {
      throw breakdownError;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
async function restoreCotizacionSnapshot(snapshot: Cotizacion) {
    const snapshotInput: CrearCotizacionInput = {
      organizationId: snapshot.organizationId,
      solicitudId: snapshot.solicitudId,
      proyectoId: snapshot.proyectoId,
      numero: snapshot.numero,
      estado: snapshot.estado,
      descuentoPct: snapshot.descuentoPct,
      flete: snapshot.flete,
      iva: snapshot.iva,
      notas: snapshot.notas,
      validoHasta: snapshot.validoHasta,
      subtotalNeto: snapshot.subtotalNeto,
      costoTotal: snapshot.costoTotal,
      margenPct: snapshot.margenPct,
      utilidadTotal: snapshot.utilidadTotal,
      costoMaterialesTotal: snapshot.costoMaterialesTotal,
      costoManoObraTotal: snapshot.costoManoObraTotal,
      costoTrasladoTotal: snapshot.costoTrasladoTotal,
      costoOtrosTotal: snapshot.costoOtrosTotal,
      mermaPct: snapshot.mermaPct,
      mermaTotal: snapshot.mermaTotal,
      margenObjetivoPct: snapshot.margenObjetivoPct,
      precioRecomendadoNeto: snapshot.precioRecomendadoNeto,
      ivaPct: snapshot.ivaPct,
      financialSnapshotVersion: snapshot.financialSnapshotVersion,
      financialSnapshotCalculadoEn: snapshot.financialSnapshotCalculadoEn,
      costBasisStatus: snapshot.costBasisStatus,
      pricingMode: snapshot.pricingMode,
      creationSurface: snapshot.creationSurface ?? null,
      estadoComercial: snapshot.estadoComercial,
      approvalToken: snapshot.approvalToken,
      approvalTokenExpiresAt: snapshot.approvalTokenExpiresAt,
      clienteVioEn: snapshot.clienteVioEn,
      clienteRespondioEn: snapshot.clienteRespondioEn,
      clienteRespuestaCanal: snapshot.clienteRespuestaCanal,
      total: snapshot.total,
      items: snapshot.items.map(mapSnapshotItemToCreateInput),
    };
    const updatePayload = buildCotizacionUpdatePayload(snapshotInput);
    let restoreError: unknown = null;

    const { error } = await supabase
      .from("cotizaciones")
      .update(updatePayload)
      .eq("id", snapshot.id)
      .eq("organization_id", snapshot.organizationId);

    if (error && isMissingApprovalFieldsError(error)) {
      const legacyUpdatePayload = stripLegacyCotizacionExtensionFields(updatePayload);

      const { error: legacyError } = await supabase
        .from("cotizaciones")
        .update(legacyUpdatePayload)
        .eq("id", snapshot.id)
        .eq("organization_id", snapshot.organizationId);

      restoreError = legacyError;
    } else {
      restoreError = error;
    }

    if (restoreError) {
      throw restoreError;
    }

    await softDeleteActiveItems(snapshot.id, snapshot.organizationId);

    for (const item of snapshot.items.map(mapSnapshotItemToCreateInput)) {
      const createdItem = await createCotizacionItem(item, snapshot.id);
      await insertBreakdownEntries(
        item.breakdown ?? [],
        createdItem.id,
        snapshot.organizationId
      );
    }
  }

  async function listCotizacionItems(
    cotizacionId: EntityId,
    organizationId: EntityId
  ) {
    const { data, error } = await supabase
      .from("cotizacion_items")
      .select(COTIZACION_ITEM_SELECT)
      .eq("cotizacion_id", cotizacionId)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("orden", { ascending: true })
      .order("creado_en", { ascending: true });

    if (!error) {
      return (data as CotizacionItemRow[]) ?? [];
    }

    if (!isMissingComponentFieldsError(error)) {
      throw error;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("cotizacion_items")
      .select(COTIZACION_ITEM_SELECT_LEGACY)
      .eq("cotizacion_id", cotizacionId)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: true });

    if (legacyError) {
      throw legacyError;
    }

    return (legacyData as CotizacionItemRow[]) ?? [];
  }

  async function createCotizacionItem(
    input: CrearCotizacionItemInput,
    cotizacionId: EntityId
  ) {
    const { data, error } = await supabase
      .from("cotizacion_items")
      .insert(buildItemInsert(input, cotizacionId))
      .select(COTIZACION_ITEM_SELECT)
      .single();

    if (!error) {
      return data as CotizacionItemRow;
    }

    if (!isMissingComponentFieldsError(error)) {
      throw error;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("cotizacion_items")
      .insert(buildLegacyItemInsert(input, cotizacionId))
      .select(COTIZACION_ITEM_SELECT_LEGACY)
      .single();

    if (legacyError) {
      throw legacyError;
    }

    return legacyData as CotizacionItemRow;
  }

  async function hydrateCotizacion(
    base: Cotizacion,
    options: HydrateCotizacionOptions = {}
  ) {
    const items = await listCotizacionItems(base.id, base.organizationId);

    if (items.length === 0) {
      return base;
    }

    if (options.includeBreakdown === false) {
      return {
        ...base,
        items: items.map((item) => mapCotizacionItem(item, [])),
      };
    }

    const itemIds = items.map((item) => item.id);
    const { data: breakdownData, error: breakdownError } = await supabase
      .from("quote_item_breakdown")
      .select(COTIZACION_BREAKDOWN_SELECT)
      .eq("organization_id", base.organizationId)
      .in("cotizacion_item_id", itemIds)
      .order("creado_en", { ascending: true });

    if (breakdownError) {
      if (!isMissingBreakdownTableError(breakdownError)) {
        throw breakdownError;
      }

      return {
        ...base,
        items: items.map((item) => mapCotizacionItem(item, [])),
      };
    }

    const breakdownByItemId = new Map<EntityId, CotizacionItemBreakdown[]>();

    for (const breakdownRow of (breakdownData as CotizacionItemBreakdownRow[]) ?? []) {
      const mappedBreakdown = mapBreakdown(breakdownRow);
      const current = breakdownByItemId.get(mappedBreakdown.cotizacionItemId) ?? [];

      current.push(mappedBreakdown);
      breakdownByItemId.set(mappedBreakdown.cotizacionItemId, current);
    }

    return {
      ...base,
      items: items.map((item) =>
        mapCotizacionItem(item, breakdownByItemId.get(item.id) ?? [])
      ),
    };
  }

  async function listCotizacionesBase(
    organizationId: EntityId
  ): Promise<CotizacionRow[]> {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select(COTIZACION_LIST_SELECT)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: false });

    if (!error) {
      return (data as CotizacionRow[]) ?? [];
    }

    if (!isMissingApprovalFieldsError(error)) {
      throw error;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("cotizaciones")
      .select(COTIZACION_LIST_SELECT_LEGACY)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: false });

    if (legacyError) {
      throw legacyError;
    }

    return ((legacyData as CotizacionRow[]) ?? []).map((row) => ({
      ...row,
      approval_token: null,
      approval_token_expires_at: null,
      cliente_vio_en: null,
      cliente_respondio_en: null,
      cliente_respuesta_canal: null,
    }));
  }

  async function listDashboardCotizacionesBase(
    organizationId: EntityId,
    limit?: number
  ): Promise<CotizacionRow[]> {
    if (typeof limit === "number" && limit <= 0) {
      return [];
    }

    const query = supabase
      .from("cotizaciones")
      .select(COTIZACION_DASHBOARD_SELECT)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: false });

    const { data, error } =
      typeof limit === "number"
        ? await query.range(0, Math.max(limit, 0) - 1)
        : await query;

    if (!error) {
      return (data as CotizacionRow[]) ?? [];
    }

    if (!isMissingApprovalFieldsError(error)) {
      throw error;
    }

    const legacyQuery = supabase
      .from("cotizaciones")
      .select(COTIZACION_LIST_SELECT_LEGACY)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: false });

    const { data: legacyData, error: legacyError } =
      typeof limit === "number"
        ? await legacyQuery.range(0, Math.max(limit, 0) - 1)
        : await legacyQuery;

    if (legacyError) {
      throw legacyError;
    }

    return ((legacyData as CotizacionRow[]) ?? []).map((row) => ({
      ...row,
      approval_token: null,
      approval_token_expires_at: null,
      cliente_vio_en: null,
      cliente_respondio_en: null,
      cliente_respuesta_canal: null,
    }));
  }

  async function listDashboardMetricsRows(
    organizationId: EntityId,
    select: string,
    includesPdfDownloadedAt: boolean
  ): Promise<CotizacionDashboardMetric[]> {
    const pageSize = 1_000;
    const rows: CotizacionDashboardMetric[] = [];

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select(select)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("actualizado_en", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      const page =
        (data as Array<{
          estado: string | null;
          total: number | string | null;
          actualizado_en: string | null;
          pdf_descargado_en?: string | null;
        }>) ?? [];

      rows.push(
        ...page.map((row) => ({
          estado: row.estado ?? "borrador",
          total: Number(row.total ?? 0),
          actualizadoEn: row.actualizado_en,
          pdfDescargadoEn: includesPdfDownloadedAt
            ? row.pdf_descargado_en ?? null
            : null,
        }))
      );

      if (page.length < pageSize) {
        return rows;
      }
    }
  }

  async function listDashboardMetricsBase(
    organizationId: EntityId
  ): Promise<CotizacionDashboardMetric[]> {
    try {
      return await listDashboardMetricsRows(
        organizationId,
        COTIZACION_DASHBOARD_METRICS_SELECT,
        true
      );
    } catch (error) {
      if (!isMissingApprovalFieldsError(error)) {
        throw error;
      }

      return listDashboardMetricsRows(
        organizationId,
        COTIZACION_DASHBOARD_METRICS_SELECT_LEGACY,
        false
      );
    }
  }

  async function listClientSummaryBase(
    organizationId: EntityId
  ): Promise<CotizacionRow[]> {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select(COTIZACION_CLIENT_SUMMARY_SELECT)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null);

    if (!error) {
      return (data as CotizacionRow[]) ?? [];
    }

    if (!isMissingApprovalFieldsError(error)) {
      throw error;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("cotizaciones")
      .select(COTIZACION_CLIENT_SUMMARY_SELECT_LEGACY)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null);

    if (legacyError) {
      throw legacyError;
    }

    return ((legacyData as CotizacionRow[]) ?? []).map((row) => ({
      ...row,
      cliente_vio_en: null,
      cliente_respondio_en: null,
    }));
  }

  async function countCotizacionesBase(
    organizationId: EntityId,
    filters: CotizacionesDashboardFilter = {}
  ) {
    const query = applyCotizacionesDashboardFilters(
      supabase.from("cotizaciones").select("id", { count: "exact", head: true }),
      organizationId,
      filters
    );

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async function sumCotizacionesTotalBase(
    organizationId: EntityId,
    filters: CotizacionesDashboardFilter = {}
  ) {
    const query = applyCotizacionesDashboardFilters(
      supabase.from("cotizaciones").select("total"),
      organizationId,
      filters
    );

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return ((data as Array<{ total: number | string | null }>) ?? []).reduce(
      (sum, row) => sum + Number(row.total ?? 0),
      0
    );
  }

  async function listCotizacionesPageBase(
    organizationId: EntityId,
    options: CotizacionesResumenPageOptions
  ): Promise<CotizacionesResumenPageResult> {
    const page = Math.max(1, options.page);
    const pageSize = Math.max(1, Math.min(50, options.pageSize));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const normalizedSearch = options.search?.trim() ?? "";
    const normalizedOrder = options.order ?? "updated_desc";
    const normalizedPeriod = options.period ?? "all";

    const applyFilters = <TQuery extends DashboardCotizacionesFilterableQuery>(
      query: TQuery
    ): TQuery => {
      let nextQuery = applyCotizacionesDashboardFilters(query, organizationId, {
        estados: options.estado ? [options.estado] : undefined,
        allowedProjectIds: options.allowedProjectIds,
        searchProjectIds: options.searchProjectIds,
        search: normalizedSearch || null,
      });

      if (normalizedPeriod !== "all") {
        const now = new Date();
        let fromDate: Date | null = null;
        let toDate: Date | null = null;

        if (normalizedPeriod === "this_month") {
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          toDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else if (normalizedPeriod === "last_month") {
          fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          toDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (normalizedPeriod === "last_90_days") {
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        }

        if (fromDate) {
          nextQuery = nextQuery.gte("actualizado_en", fromDate.toISOString()) as TQuery;
        }

        if (toDate) {
          nextQuery = nextQuery.lt("actualizado_en", toDate.toISOString()) as TQuery;
        }
      }

      if (normalizedOrder === "total_desc") {
        nextQuery = nextQuery.order("total", { ascending: false }) as TQuery;
      } else if (normalizedOrder === "codigo_desc") {
        nextQuery = nextQuery.order("numero", { ascending: false }) as TQuery;
      } else if (normalizedOrder === "estado") {
        nextQuery = nextQuery
          .order("estado", { ascending: true })
          .order("actualizado_en", { ascending: false }) as TQuery;
      } else {
        nextQuery = nextQuery.order("actualizado_en", { ascending: false }) as TQuery;
      }

      return nextQuery.range(from, to) as TQuery;
    };

    const query = applyFilters(
      supabase.from("cotizaciones").select(COTIZACION_LIST_SELECT, { count: "exact" })
    );
    const { data, error, count } = await query;

    if (!error) {
      const rows = ((data as CotizacionRow[]) ?? []).map(mapCotizacion);
      return {
        cotizaciones: rows,
        totalCount: count ?? rows.length,
        hasMore: from + rows.length < (count ?? rows.length),
        page,
        pageSize,
      };
    }

    if (!isMissingApprovalFieldsError(error)) {
      throw error;
    }

    const legacyQuery = applyFilters(
      supabase
        .from("cotizaciones")
        .select(COTIZACION_LIST_SELECT_LEGACY, { count: "exact" })
    );
    const {
      data: legacyData,
      error: legacyError,
      count: legacyCount,
    } = await legacyQuery;

    if (legacyError) {
      throw legacyError;
    }

    const rows = (((legacyData as CotizacionRow[]) ?? []).map((row) => ({
      ...row,
      approval_token: null,
      approval_token_expires_at: null,
      cliente_vio_en: null,
      cliente_respondio_en: null,
      cliente_respuesta_canal: null,
      pdf_descargado_en: null,
    })) as CotizacionRow[]).map(mapCotizacion);

    return {
      cotizaciones: rows,
      totalCount: legacyCount ?? rows.length,
      hasMore: from + rows.length < (legacyCount ?? rows.length),
      page,
      pageSize,
    };
  }

  async function getCotizacionesResumenGlobalBase(
    organizationId: EntityId,
    filters: CotizacionesDashboardFilter = {}
  ): Promise<CotizacionesResumenGlobalResult> {
    const query = applyCotizacionesDashboardFilters(
      supabase.from("cotizaciones").select("estado, total, pdf_descargado_en"),
      organizationId,
      filters
    );
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows =
      ((data as Array<{
        estado: string | null;
        total: number | string | null;
        pdf_descargado_en?: string | null;
      }>) ?? []);

    return rows.reduce<CotizacionesResumenGlobalResult>(
      (summary, row) => {
        const estado = (row.estado ?? "borrador").toLowerCase();
        const total = Number(row.total ?? 0);

        summary.totalCount += 1;
        summary.totalAmount += total;

        if (row.pdf_descargado_en) {
          summary.pdfGeneratedCount += 1;
        }

        if (estado === "borrador") {
          summary.counts.borrador += 1;
        } else if (estado === "creada") {
          summary.counts.creada += 1;
        } else if (estado === "enviada") {
          summary.counts.enviada += 1;
        } else if (estado === "aprobada") {
          summary.counts.aprobada += 1;
          summary.approvedAmount += total;
        } else if (estado === "rechazada") {
          summary.counts.rechazada += 1;
        } else if (estado === "terminada") {
          summary.counts.terminada += 1;
        }

        return summary;
      },
      {
        totalCount: 0,
        totalAmount: 0,
        approvedAmount: 0,
        pdfGeneratedCount: 0,
        counts: {
          borrador: 0,
          creada: 0,
          enviada: 0,
          aprobada: 0,
          rechazada: 0,
          terminada: 0,
        },
      }
    );
  }

  async function listDashboardAlertCandidatesBase(
    organizationId: EntityId,
    recentResponseDays = 21
  ): Promise<CotizacionRow[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - recentResponseDays);
    const cutoffIso = cutoff.toISOString();

    const [viewedData, responseData] = await Promise.all([
      supabase
        .from("cotizaciones")
        .select(COTIZACION_DASHBOARD_SELECT)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .not("cliente_vio_en", "is", null)
        .is("cliente_respondio_en", null)
        .order("cliente_vio_en", { ascending: false }),
      supabase
        .from("cotizaciones")
        .select(COTIZACION_DASHBOARD_SELECT)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .in("estado", ["aprobada", "rechazada"])
        .not("cliente_respondio_en", "is", null)
        .gte("cliente_respondio_en", cutoffIso)
        .order("cliente_respondio_en", { ascending: false }),
    ]);

    const { data: viewedRows, error: viewedError } = viewedData;
    const { data: responseRows, error: responseError } = responseData;

    if (viewedError) {
      throw viewedError;
    }

    if (responseError) {
      throw responseError;
    }

    const byId = new Map<EntityId, CotizacionRow>();

    for (const row of ((viewedRows as CotizacionRow[]) ?? []).concat(
      (responseRows as CotizacionRow[]) ?? []
    )) {
      byId.set(row.id, row);
    }

    return Array.from(byId.values());
  }

  async function getCotizacionBase(id: EntityId, organizationId: EntityId) {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select(COTIZACION_DETAIL_SELECT)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .maybeSingle();

    if (!error) {
      return data as CotizacionRow | null;
    }

    if (!isMissingApprovalFieldsError(error)) {
      throw error;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("cotizaciones")
      .select(COTIZACION_DETAIL_SELECT_LEGACY)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .maybeSingle();

    if (legacyError) {
      throw legacyError;
    }

    if (!legacyData) {
      return null;
    }

    return {
      ...(legacyData as CotizacionRow),
      approval_token: null,
      approval_token_expires_at: null,
      cliente_vio_en: null,
      cliente_respondio_en: null,
      cliente_respuesta_canal: null,
    };
  }

  return {
    async listByOrganizationId(organizationId: EntityId) {
      const rows = await listCotizacionesBase(organizationId);

      return rows.map(mapCotizacion);
    },

    async listPageByOrganizationId(
      organizationId: EntityId,
      options: CotizacionesResumenPageOptions
    ) {
      return listCotizacionesPageBase(organizationId, options);
    },

    async getResumenGlobalByOrganizationId(
      organizationId: EntityId,
      filters: CotizacionesDashboardFilter = {}
    ) {
      return getCotizacionesResumenGlobalBase(organizationId, filters);
    },

    async listRecentByOrganizationId(organizationId: EntityId, limit = 50) {
      const rows = await listDashboardCotizacionesBase(organizationId, limit);

      return rows.map(mapCotizacion);
    },

    async listClientSummaryByOrganizationId(organizationId: EntityId) {
      const rows = await listClientSummaryBase(organizationId);

      return rows.map(mapCotizacionClientSummary);
    },

    async listDashboardAlertCandidatesByOrganizationId(
      organizationId: EntityId,
      recentResponseDays = 21
    ) {
      const rows = await listDashboardAlertCandidatesBase(organizationId, recentResponseDays);

      return rows.map(mapCotizacion);
    },

    async listDashboardMetricsByOrganizationId(organizationId: EntityId) {
      return listDashboardMetricsBase(organizationId);
    },

    async countByOrganizationId(
      organizationId: EntityId,
      filters: CotizacionesDashboardFilter = {}
    ) {
      return countCotizacionesBase(organizationId, filters);
    },

    async sumTotalByOrganizationId(
      organizationId: EntityId,
      filters: CotizacionesDashboardFilter = {}
    ) {
      return sumCotizacionesTotalBase(organizationId, filters);
    },

    async getById(
      id: EntityId,
      organizationId: EntityId,
      options: HydrateCotizacionOptions = {}
    ) {
      const data = await getCotizacionBase(id, organizationId);

      if (!data) {
        return null;
      }

      return hydrateCotizacion(mapCotizacion(data as CotizacionRow), options);
    },

    async reserveNextCode(organizationId: EntityId, quoteDate = new Date()) {
      const { data, error } = await supabase.rpc("reserve_next_cotizacion_code", {
        p_organization_id: normalizeOrganizationSequenceId(organizationId),
        p_quote_date: quoteDate.toISOString().slice(0, 10),
      });

      if (error) {
        if (isMissingCodeSequenceFunctionError(error)) {
          return null;
        }

        throw error;
      }

      return typeof data === "string" && data.trim() ? data : null;
    },

    async create(input: CrearCotizacionInput) {
      const insertPayload = buildCotizacionInsertPayload(input);
      let data: CotizacionRow | null = null;
      let createdQuoteId: EntityId | null = null;

      try {
        {
          const { data: createdData, error } = await supabase
            .from("cotizaciones")
            .insert(insertPayload)
            .select(COTIZACION_DETAIL_SELECT)
            .single();

          if (!error) {
            data = createdData as CotizacionRow;
          } else if (isMissingApprovalFieldsError(error)) {
            const legacyInsertPayload = stripLegacyCotizacionExtensionFields(insertPayload);

            const { data: legacyData, error: legacyError } = await supabase
              .from("cotizaciones")
              .insert(legacyInsertPayload)
              .select(COTIZACION_DETAIL_SELECT_LEGACY)
              .single();

            if (legacyError) {
              throw legacyError;
            }

            data = {
              ...(legacyData as CotizacionRow),
              approval_token: null,
              approval_token_expires_at: null,
              cliente_vio_en: null,
              cliente_respondio_en: null,
              cliente_respuesta_canal: null,
            };
          } else {
            throw error;
          }
        }

        const cotizacion = mapCotizacion(data as CotizacionRow);
        createdQuoteId = cotizacion.id;

        for (const item of input.items) {
          const createdItem = await createCotizacionItem(item, cotizacion.id);
          await insertBreakdownEntries(
            item.breakdown ?? [],
            createdItem.id,
            item.organizationId
          );
        }

        return hydrateCotizacion(cotizacion);
      } catch (error) {
        if (createdQuoteId !== null) {
          try {
            await supabase
              .from("cotizaciones")
              .update({
                eliminado_en: new Date().toISOString(),
              })
              .eq("id", createdQuoteId)
              .eq("organization_id", input.organizationId)
              .is("eliminado_en", null);
            await softDeleteActiveItems(createdQuoteId, input.organizationId);
          } catch (rollbackError) {
            console.error("No se pudo revertir una creación parcial de cotización.", rollbackError);
          }
        }

        throw error;
      }
    },

  async update(
    id: EntityId,
    input: CrearCotizacionInput,
    _previousSnapshot: Cotizacion | null = null
    ) {
      void _previousSnapshot;
      const updatePayload = buildCotizacionUpdatePayload(input);
      let data: CotizacionRow | null = null;
      const createdItemIds: EntityId[] = [];

      try {
        {
          const { data: updatedData, error } = await supabase
            .from("cotizaciones")
            .update(updatePayload)
            .eq("id", id)
            .eq("organization_id", input.organizationId)
            .is("eliminado_en", null)
            .select(COTIZACION_DETAIL_SELECT)
            .single();

          if (!error) {
            data = updatedData as CotizacionRow;
          } else if (isMissingApprovalFieldsError(error)) {
            const legacyUpdatePayload = stripLegacyCotizacionExtensionFields(updatePayload);

            const { data: legacyData, error: legacyError } = await supabase
              .from("cotizaciones")
              .update(legacyUpdatePayload)
              .eq("id", id)
              .eq("organization_id", input.organizationId)
              .is("eliminado_en", null)
              .select(COTIZACION_DETAIL_SELECT_LEGACY)
              .single();

            if (legacyError) {
              throw legacyError;
            }

            data = {
              ...(legacyData as CotizacionRow),
              approval_token: null,
              approval_token_expires_at: null,
              cliente_vio_en: null,
              cliente_respondio_en: null,
              cliente_respuesta_canal: null,
            };
          } else {
            throw error;
          }
        }

        await softDeleteActiveItems(id, input.organizationId);

        for (const item of input.items) {
          const createdItem = await createCotizacionItem(item, id);
          createdItemIds.push(createdItem.id);
          await insertBreakdownEntries(
            item.breakdown ?? [],
            createdItem.id,
            item.organizationId
          );
        }

        return hydrateCotizacion(mapCotizacion(data as CotizacionRow));
      } catch (error) {
        if (createdItemIds.length > 0) {
          try {
            const deletedAt = new Date().toISOString();
            for (const itemId of createdItemIds) {
              await supabase
                .from("cotizacion_items")
                .update({ eliminado_en: deletedAt })
                .eq("id", itemId)
                .is("eliminado_en", null);
            }
          } catch (cleanupError) {
            console.error(
              "No se pudo limpiar items huerfanos tras una actualizacion parcial de cotizacion.",
              cleanupError
            );
          }
        }

        throw error;
      }
    },

    async softDelete(id: EntityId, organizationId: EntityId) {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from("cotizaciones")
        .update({
          eliminado_en: deletedAt,
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (error) {
        throw error;
      }

      await softDeleteActiveItems(id, organizationId, deletedAt);
    },

    async updateApprovalAccess(
      id: EntityId,
      organizationId: EntityId,
      input: Pick<
        CrearCotizacionInput,
        | "approvalToken"
        | "approvalTokenExpiresAt"
        | "clienteVioEn"
        | "clienteRespondioEn"
        | "clienteRespuestaCanal"
      >
    ) {
      const { data, error } = await supabase
        .from("cotizaciones")
        .update({
          approval_token: input.approvalToken ?? null,
          approval_token_expires_at: input.approvalTokenExpiresAt ?? null,
          cliente_vio_en: input.clienteVioEn ?? null,
          cliente_respondio_en: input.clienteRespondioEn ?? null,
          cliente_respuesta_canal: input.clienteRespuestaCanal ?? null,
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .select(COTIZACION_DETAIL_SELECT)
        .single();

      if (error) {
        if (isMissingApprovalFieldsError(error)) {
          const fallback = await getCotizacionBase(id, organizationId);

          if (!fallback) {
            throw new Error("No se pudo recuperar la cotizacion despues de actualizar el acceso publico.");
          }

          return hydrateCotizacion(mapCotizacion(fallback));
        }

        throw error;
      }

      return hydrateCotizacion(mapCotizacion(data as CotizacionRow));
    },

    async updateManualResponse(
      id: EntityId,
      organizationId: EntityId,
      input: {
        estado: "creada" | "aprobada" | "rechazada" | "terminada";
        clienteRespondioEn: string | null;
        clienteRespuestaCanal: string | null;
      }
    ) {
      const { error } = await supabase
        .from("cotizaciones")
        .update({
          estado: input.estado,
          cliente_respondio_en: input.clienteRespondioEn,
          cliente_respuesta_canal: input.clienteRespuestaCanal,
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (error && !isMissingApprovalFieldsError(error)) {
        throw error;
      }

      if (error && isMissingApprovalFieldsError(error)) {
        const { error: legacyError } = await supabase
          .from("cotizaciones")
          .update({
            estado: input.estado,
          })
          .eq("id", id)
          .eq("organization_id", organizationId)
          .is("eliminado_en", null);

        if (legacyError) {
          throw legacyError;
        }
      }

      const updated = await getCotizacionBase(id, organizationId);

      if (!updated) {
        throw new Error(
          "La respuesta se guardo, pero no se pudo recuperar la cotizacion actualizada."
        );
      }

      return hydrateCotizacion(mapCotizacion(updated));
    },

    async updateShareStatus(
      id: EntityId,
      organizationId: EntityId,
      input: {
        estado: "enviada";
      }
    ) {
      const { error } = await supabase
        .from("cotizaciones")
        .update({
          estado: input.estado,
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (error) {
        throw error;
      }

      const updated = await getCotizacionBase(id, organizationId);

      if (!updated) {
        throw new Error(
          "La cotizacion se marco como enviada, pero no se pudo recuperar el registro actualizado."
        );
      }

      return hydrateCotizacion(mapCotizacion(updated));
    },

    async recordPdfDownload(id: EntityId, organizationId: EntityId) {
      const existing = await getCotizacionBase(id, organizationId);

      if (!existing) {
        throw new Error("No se encontro la cotizacion para registrar la descarga del PDF.");
      }

      if (existing.pdf_descargado_en) {
        return hydrateCotizacion(mapCotizacion(existing));
      }

      const downloadedAt = new Date().toISOString();
      const { error } = await supabase
        .from("cotizaciones")
        .update({
          pdf_descargado_en: downloadedAt,
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (error && !isMissingApprovalFieldsError(error)) {
        throw error;
      }

      if (error && isMissingApprovalFieldsError(error)) {
        return hydrateCotizacion(mapCotizacion(existing));
      }

      const updated = await getCotizacionBase(id, organizationId);

      if (!updated) {
        throw new Error(
          "La descarga del PDF se registro, pero no se pudo recuperar la cotizacion actualizada."
        );
      }

      return hydrateCotizacion(mapCotizacion(updated));
    },
  };
}

export type CotizacionesRepository = ReturnType<
  typeof createCotizacionesRepository
>;

let defaultCotizacionesRepository: CotizacionesRepository | null = null;

function getDefaultCotizacionesRepository() {
  if (!defaultCotizacionesRepository) {
    defaultCotizacionesRepository = createCotizacionesRepository();
  }

  return defaultCotizacionesRepository;
}

export const cotizacionesRepository: CotizacionesRepository = {
  listByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().listByOrganizationId(...args);
  },
  listPageByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().listPageByOrganizationId(...args);
  },
  getResumenGlobalByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().getResumenGlobalByOrganizationId(...args);
  },
  listRecentByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().listRecentByOrganizationId(...args);
  },
  listClientSummaryByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().listClientSummaryByOrganizationId(...args);
  },
  listDashboardAlertCandidatesByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().listDashboardAlertCandidatesByOrganizationId(
      ...args
    );
  },
  listDashboardMetricsByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().listDashboardMetricsByOrganizationId(
      ...args
    );
  },
  countByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().countByOrganizationId(...args);
  },
  sumTotalByOrganizationId(...args) {
    return getDefaultCotizacionesRepository().sumTotalByOrganizationId(...args);
  },
  getById(...args) {
    return getDefaultCotizacionesRepository().getById(...args);
  },
  reserveNextCode(...args) {
    return getDefaultCotizacionesRepository().reserveNextCode(...args);
  },
  create(...args) {
    return getDefaultCotizacionesRepository().create(...args);
  },
  update(...args) {
    return getDefaultCotizacionesRepository().update(...args);
  },
  softDelete(...args) {
    return getDefaultCotizacionesRepository().softDelete(...args);
  },
  updateApprovalAccess(...args) {
    return getDefaultCotizacionesRepository().updateApprovalAccess(...args);
  },
  updateManualResponse(...args) {
    return getDefaultCotizacionesRepository().updateManualResponse(...args);
  },
  updateShareStatus(...args) {
    return getDefaultCotizacionesRepository().updateShareStatus(...args);
  },
  recordPdfDownload(...args) {
    return getDefaultCotizacionesRepository().recordPdfDownload(...args);
  },
};
