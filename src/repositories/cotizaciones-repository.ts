import { createClient } from "@/lib/supabase/client";
import type { Cotizacion, CrearCotizacionInput } from "@/types/cotizacion";
import type {
  CotizacionItem,
  CotizacionItemBreakdown,
  CrearCotizacionItemBreakdownInput,
  CrearCotizacionItemInput,
} from "@/types/cotizacion-item";
import type { EntityId } from "@/types/common";

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
  estado_comercial: string | null;
  approval_token: string | null;
  approval_token_expires_at: string | null;
  cliente_vio_en: string | null;
  cliente_respondio_en: string | null;
  cliente_respuesta_canal: string | null;
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
  "id, proyecto_id, organization_id, numero, estado, descuento_pct, flete, iva, notas, valido_hasta, actualizado_en, eliminado_en, subtotal_neto, costo_total, margen_pct, utilidad_total, estado_comercial, approval_token, approval_token_expires_at, cliente_vio_en, cliente_respondio_en, cliente_respuesta_canal, creado_en, total";
const COTIZACION_DETAIL_SELECT_LEGACY =
  "id, proyecto_id, organization_id, numero, estado, descuento_pct, flete, iva, notas, valido_hasta, actualizado_en, eliminado_en, subtotal_neto, costo_total, margen_pct, utilidad_total, estado_comercial, creado_en, total";
const COTIZACION_LIST_SELECT =
  "id, proyecto_id, organization_id, numero, estado, approval_token, approval_token_expires_at, cliente_vio_en, cliente_respondio_en, cliente_respuesta_canal, creado_en, actualizado_en, total";
const COTIZACION_LIST_SELECT_LEGACY =
  "id, proyecto_id, organization_id, numero, estado, creado_en, actualizado_en, total";
const COTIZACION_ITEM_SELECT =
  "id, cotizacion_id, codigo, tipo_componente, orden, cantidad, precio_unitario, subtotal, organization_id, ancho, alto, area_m2, linea, color, vidrio, nombre, actualizado_en, eliminado_en, descripcion, unidad, observaciones, tipo_item, creado_en, product_type_id, system_line_id, configuration_id, costo_unitario, costo_total, margen_pct, utilidad";
const COTIZACION_ITEM_SELECT_LEGACY =
  "id, cotizacion_id, cantidad, precio_unitario, subtotal, organization_id, ancho, alto, area_m2, linea, color, vidrio, nombre, actualizado_en, eliminado_en, descripcion, unidad, observaciones, tipo_item, creado_en, product_type_id, system_line_id, configuration_id, costo_unitario, costo_total, margen_pct, utilidad";
const COTIZACION_BREAKDOWN_SELECT =
  "id, cotizacion_item_id, material_id, descripcion, unidad, cantidad, costo_unitario, costo_total, precio_unitario, precio_total, origen, creado_en, organization_id";

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
      haystack.includes("orden")) &&
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
      haystack.includes("cliente_respuesta_canal")) &&
    (haystack.includes("column") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
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
    estadoComercial: row.estado_comercial ?? null,
    approvalToken: row.approval_token ?? null,
    approvalTokenExpiresAt: row.approval_token_expires_at ?? null,
    clienteVioEn: row.cliente_vio_en ?? null,
    clienteRespondioEn: row.cliente_respondio_en ?? null,
    clienteRespuestaCanal: row.cliente_respuesta_canal ?? null,
    creadoEn: row.creado_en,
    items: [],
    total: row.total,
  };
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

export function createCotizacionesRepository(
  deps: CotizacionesRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

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

  async function hydrateCotizacion(base: Cotizacion) {
    const items = await listCotizacionItems(base.id, base.organizationId);

    if (items.length === 0) {
      return base;
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

    async getById(id: EntityId, organizationId: EntityId) {
      const data = await getCotizacionBase(id, organizationId);

      if (!data) {
        return null;
      }

      return hydrateCotizacion(mapCotizacion(data as CotizacionRow));
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
      const insertPayload = {
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
        estado_comercial: input.estadoComercial ?? null,
        approval_token: input.approvalToken ?? null,
        approval_token_expires_at: input.approvalTokenExpiresAt ?? null,
        cliente_vio_en: input.clienteVioEn ?? null,
        cliente_respondio_en: input.clienteRespondioEn ?? null,
        cliente_respuesta_canal: input.clienteRespuestaCanal ?? null,
        total: input.total,
      };
      let data: CotizacionRow | null = null;

      {
        const { data: createdData, error } = await supabase
          .from("cotizaciones")
          .insert(insertPayload)
          .select(COTIZACION_DETAIL_SELECT)
          .single();

        if (!error) {
          data = createdData as CotizacionRow;
        } else if (isMissingApprovalFieldsError(error)) {
          const {
            approval_token: _approvalToken,
            approval_token_expires_at: _approvalTokenExpiresAt,
            cliente_vio_en: _clienteVioEn,
            cliente_respondio_en: _clienteRespondioEn,
            cliente_respuesta_canal: _clienteRespuestaCanal,
            ...legacyInsertPayload
          } = insertPayload;

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

      for (const item of input.items) {
        const createdItem = await createCotizacionItem(item, cotizacion.id);
        const breakdown = item.breakdown ?? [];

        if (breakdown.length > 0) {
          const { error: breakdownError } = await supabase
            .from("quote_item_breakdown")
            .insert(
              breakdown.map((entry) =>
                buildBreakdownInsert(
                  entry,
                  createdItem.id,
                  item.organizationId
                )
              )
            );

          if (breakdownError) {
            if (!isMissingBreakdownTableError(breakdownError)) {
              throw breakdownError;
            }
          }
        }
      }

      const hydrated = await hydrateCotizacion(cotizacion);

      return hydrated;
    },

    async update(id: EntityId, input: CrearCotizacionInput) {
      const updatePayload = {
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
        estado_comercial: input.estadoComercial ?? null,
        approval_token: input.approvalToken ?? null,
        approval_token_expires_at: input.approvalTokenExpiresAt ?? null,
        cliente_vio_en: input.clienteVioEn ?? null,
        cliente_respondio_en: input.clienteRespondioEn ?? null,
        cliente_respuesta_canal: input.clienteRespuestaCanal ?? null,
        total: input.total,
        actualizado_en: new Date().toISOString(),
      };
      let data: CotizacionRow | null = null;

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
          const {
            approval_token: _approvalToken,
            approval_token_expires_at: _approvalTokenExpiresAt,
            cliente_vio_en: _clienteVioEn,
            cliente_respondio_en: _clienteRespondioEn,
            cliente_respuesta_canal: _clienteRespuestaCanal,
            ...legacyUpdatePayload
          } = updatePayload;

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

      const deletedAt = new Date().toISOString();
      const { error: softDeleteItemsError } = await supabase
        .from("cotizacion_items")
        .update({
          eliminado_en: deletedAt,
        })
        .eq("cotizacion_id", id)
        .eq("organization_id", input.organizationId)
        .is("eliminado_en", null);

      if (softDeleteItemsError) {
        throw softDeleteItemsError;
      }

      for (const item of input.items) {
        const createdItem = await createCotizacionItem(item, id);
        const breakdown = item.breakdown ?? [];

        if (breakdown.length > 0) {
          const { error: breakdownError } = await supabase
            .from("quote_item_breakdown")
            .insert(
              breakdown.map((entry) =>
                buildBreakdownInsert(entry, createdItem.id, item.organizationId)
              )
            );

          if (breakdownError) {
            if (!isMissingBreakdownTableError(breakdownError)) {
              throw breakdownError;
            }
          }
        }
      }

      return hydrateCotizacion(mapCotizacion(data as CotizacionRow));
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

      const { error: itemError } = await supabase
        .from("cotizacion_items")
        .update({
          eliminado_en: deletedAt,
        })
        .eq("cotizacion_id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (itemError) {
        throw itemError;
      }
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
};
