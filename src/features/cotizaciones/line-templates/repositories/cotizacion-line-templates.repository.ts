import { createClient } from "@/lib/supabase/client";
import type {
  CotizacionLineTemplate,
  CotizacionLineTemplateCategoria,
  CotizacionLineTemplateMaterial,
  CotizacionLineTemplateUnidadCobro,
  CreateCotizacionLineTemplateInput,
  UpdateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { EntityId } from "@/types/common";

type CotizacionLineTemplatesRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type CotizacionLineTemplateRow = {
  id: EntityId;
  organization_id: EntityId;
  nombre: string;
  categoria?: CotizacionLineTemplateCategoria | null;
  unidad_cobro?: CotizacionLineTemplateUnidadCobro | null;
  material: CotizacionLineTemplateMaterial | null;
  vidrio_principal_recomendado: string | null;
  costo_base?: number | string | null;
  precio_m2_sugerido: number | string;
  minimo_cobrable: number | string | null;
  redondeo_precio: number | string | null;
  merma_pct?: number | string | null;
  margen_objetivo_pct?: number | string | null;
  proveedor?: string | null;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
  is_active: boolean | null;
  sort_order: number | null;
  creado_en: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

const TABLE_NAME = "cotizacion_line_templates";
const BASE_SELECT_FIELDS =
  "id, organization_id, nombre, material, vidrio_principal_recomendado, precio_m2_sugerido, minimo_cobrable, redondeo_precio, is_active, sort_order, creado_en, actualizado_en, eliminado_en";
const CATALOG_SELECT_FIELDS =
  "categoria, unidad_cobro, costo_base, merma_pct, margen_objetivo_pct, proveedor, vigencia_desde, vigencia_hasta, catalog_metadata";
const SELECT_FIELDS = `${BASE_SELECT_FIELDS}, ${CATALOG_SELECT_FIELDS}`;
const SELECT_FIELDS_WITHOUT_CATALOG = BASE_SELECT_FIELDS;
const SELECT_FIELDS_WITHOUT_RECOMMENDED_GLASS = `${BASE_SELECT_FIELDS.replace(
  "vidrio_principal_recomendado, ",
  ""
)}, ${CATALOG_SELECT_FIELDS}`;
const LEGACY_SELECT_FIELDS =
  "id, organization_id, nombre, precio_m2_sugerido, minimo_cobrable, redondeo_precio, is_active, sort_order, creado_en, actualizado_en, eliminado_en";

function isMissingColumnError(error: unknown, column: string) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message ?? "") : "";
  return message.toLowerCase().includes(column.toLowerCase());
}

function isMissingCatalogColumnsError(error: unknown) {
  return (
    isMissingColumnError(error, "categoria") ||
    isMissingColumnError(error, "unidad_cobro") ||
    isMissingColumnError(error, "costo_base")
  );
}

function parseOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCategoriaFromRow(
  row: CotizacionLineTemplateRow
): CotizacionLineTemplateCategoria {
  const categoria = row.categoria?.trim().toLowerCase();
  if (
    categoria === "pvc" ||
    categoria === "vidrio" ||
    categoria === "shower" ||
    categoria === "accesorios" ||
    categoria === "otros"
  ) {
    return categoria;
  }

  return row.material === "PVC" ? "pvc" : "aluminio";
}

function normalizeUnidadCobroFromRow(
  row: CotizacionLineTemplateRow
): CotizacionLineTemplateUnidadCobro {
  const unidad = row.unidad_cobro?.trim().toLowerCase();
  if (
    unidad === "metro_lineal" ||
    unidad === "unidad" ||
    unidad === "valor_manual"
  ) {
    return unidad;
  }

  return "m2";
}

function mapCatalogMetadata(
  value: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean" ||
      entry === null
    ) {
      output[key] = entry;
    }
  }

  return output;
}

function mapLegacyRow(
  row: Omit<CotizacionLineTemplateRow, "material" | "vidrio_principal_recomendado"> & {
    material?: CotizacionLineTemplateMaterial | null;
    vidrio_principal_recomendado?: string | null;
  }
): CotizacionLineTemplate {
  return mapRow({
    ...row,
    material: row.material ?? "Aluminio",
    vidrio_principal_recomendado: row.vidrio_principal_recomendado ?? null,
    categoria: row.categoria ?? null,
    unidad_cobro: row.unidad_cobro ?? null,
    costo_base: row.costo_base ?? 0,
    merma_pct: row.merma_pct ?? 0,
    margen_objetivo_pct: row.margen_objetivo_pct ?? null,
    proveedor: row.proveedor ?? null,
    vigencia_desde: row.vigencia_desde ?? null,
    vigencia_hasta: row.vigencia_hasta ?? null,
    catalog_metadata: row.catalog_metadata ?? {},
  });
}

function mapRow(row: CotizacionLineTemplateRow): CotizacionLineTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    nombre: row.nombre,
    categoria: normalizeCategoriaFromRow(row),
    unidadCobro: normalizeUnidadCobroFromRow(row),
    material:
      row.material === "PVC"
        ? "PVC"
        : row.material === "Cristal" || row.categoria === "vidrio"
          ? "Cristal"
          : "Aluminio",
    vidrioPrincipalRecomendado: row.vidrio_principal_recomendado?.trim() || null,
    costoBase: Number(row.costo_base ?? 0),
    precioM2Sugerido: Number(row.precio_m2_sugerido),
    minimoCobrable: Number(row.minimo_cobrable ?? 0),
    redondeoPrecio: Number(row.redondeo_precio ?? 1000),
    mermaPct: Number(row.merma_pct ?? 0),
    margenObjetivoPct: parseOptionalNumber(row.margen_objetivo_pct),
    proveedor: row.proveedor?.trim() || null,
    vigenciaDesde: row.vigencia_desde ?? null,
    vigenciaHasta: row.vigencia_hasta ?? null,
    catalogMetadata: mapCatalogMetadata(row.catalog_metadata),
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    eliminadoEn: row.eliminado_en,
  };
}

function buildInsertPayload(input: CreateCotizacionLineTemplateInput) {
  return {
    organization_id: input.organizationId,
    nombre: input.nombre,
    categoria: input.categoria ?? "aluminio",
    unidad_cobro: input.unidadCobro ?? "m2",
    material: input.material,
    vidrio_principal_recomendado: input.vidrioPrincipalRecomendado ?? null,
    costo_base: input.costoBase ?? 0,
    precio_m2_sugerido: input.precioM2Sugerido,
    minimo_cobrable: input.minimoCobrable ?? 0,
    redondeo_precio: input.redondeoPrecio ?? 1000,
    merma_pct: input.mermaPct ?? 0,
    margen_objetivo_pct: input.margenObjetivoPct ?? null,
    proveedor: input.proveedor ?? null,
    vigencia_desde: input.vigenciaDesde ?? null,
    vigencia_hasta: input.vigenciaHasta ?? null,
    catalog_metadata: input.catalogMetadata ?? {},
    is_active: input.isActive ?? true,
    sort_order: input.sortOrder ?? 0,
  };
}

function buildUpdatePayload(input: UpdateCotizacionLineTemplateInput) {
  const payload: Record<string, unknown> = {
    actualizado_en: new Date().toISOString(),
  };

  if (input.nombre !== undefined) payload.nombre = input.nombre;
  if (input.categoria !== undefined) payload.categoria = input.categoria;
  if (input.unidadCobro !== undefined) payload.unidad_cobro = input.unidadCobro;
  if (input.material !== undefined) payload.material = input.material;
  if (input.vidrioPrincipalRecomendado !== undefined) {
    payload.vidrio_principal_recomendado = input.vidrioPrincipalRecomendado;
  }
  if (input.costoBase !== undefined) payload.costo_base = input.costoBase;
  if (input.precioM2Sugerido !== undefined) {
    payload.precio_m2_sugerido = input.precioM2Sugerido;
  }
  if (input.minimoCobrable !== undefined) {
    payload.minimo_cobrable = input.minimoCobrable;
  }
  if (input.redondeoPrecio !== undefined) {
    payload.redondeo_precio = input.redondeoPrecio;
  }
  if (input.mermaPct !== undefined) payload.merma_pct = input.mermaPct;
  if (input.margenObjetivoPct !== undefined) {
    payload.margen_objetivo_pct = input.margenObjetivoPct;
  }
  if (input.proveedor !== undefined) payload.proveedor = input.proveedor;
  if (input.vigenciaDesde !== undefined) payload.vigencia_desde = input.vigenciaDesde;
  if (input.vigenciaHasta !== undefined) payload.vigencia_hasta = input.vigenciaHasta;
  if (input.catalogMetadata !== undefined) {
    payload.catalog_metadata = input.catalogMetadata;
  }
  if (input.isActive !== undefined) payload.is_active = input.isActive;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;

  return payload;
}

async function runListQuery(
  supabase: ReturnType<typeof createClient>,
  organizationId: EntityId,
  selectFields: string,
  options?: { activeOnly?: boolean }
) {
  let query = supabase
    .from(TABLE_NAME)
    .select(selectFields)
    .eq("organization_id", organizationId)
    .is("eliminado_en", null)
    .order("sort_order", { ascending: true })
    .order("nombre", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  return query;
}

export function createCotizacionLineTemplatesRepository(
  deps: CotizacionLineTemplatesRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async listByOrganizationId(organizationId: EntityId, options?: { activeOnly?: boolean }) {
      const { data, error } = await runListQuery(
        supabase,
        organizationId,
        SELECT_FIELDS,
        options
      );

      if (error) {
        if (isMissingCatalogColumnsError(error)) {
          const { data: fallbackData, error: fallbackError } = await runListQuery(
            supabase,
            organizationId,
            SELECT_FIELDS_WITHOUT_CATALOG,
            options
          );

          if (fallbackError) {
            throw fallbackError;
          }

          return (fallbackData as CotizacionLineTemplateRow[]).map(mapLegacyRow);
        }

        if (isMissingColumnError(error, "vidrio_principal_recomendado")) {
          const { data: fallbackData, error: fallbackError } = await runListQuery(
            supabase,
            organizationId,
            SELECT_FIELDS_WITHOUT_RECOMMENDED_GLASS,
            options
          );

          if (fallbackError) {
            throw fallbackError;
          }

          return (fallbackData as CotizacionLineTemplateRow[]).map(mapLegacyRow);
        }

        if (!isMissingColumnError(error, "material")) {
          throw error;
        }

        const { data: legacyData, error: legacyError } = await runListQuery(
          supabase,
          organizationId,
          LEGACY_SELECT_FIELDS,
          options
        );

        if (legacyError) {
          throw legacyError;
        }

        return (legacyData as CotizacionLineTemplateRow[]).map(mapLegacyRow);
      }

      return (data as CotizacionLineTemplateRow[]).map(mapRow);
    },

    async getById(id: EntityId, organizationId: EntityId) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(SELECT_FIELDS)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        if (isMissingCatalogColumnsError(error)) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(TABLE_NAME)
            .select(SELECT_FIELDS_WITHOUT_CATALOG)
            .eq("id", id)
            .eq("organization_id", organizationId)
            .is("eliminado_en", null)
            .maybeSingle();

          if (fallbackError) {
            throw fallbackError;
          }

          return fallbackData ? mapLegacyRow(fallbackData as CotizacionLineTemplateRow) : null;
        }

        if (isMissingColumnError(error, "vidrio_principal_recomendado")) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(TABLE_NAME)
            .select(SELECT_FIELDS_WITHOUT_RECOMMENDED_GLASS)
            .eq("id", id)
            .eq("organization_id", organizationId)
            .is("eliminado_en", null)
            .maybeSingle();

          if (fallbackError) {
            throw fallbackError;
          }

          return fallbackData ? mapLegacyRow(fallbackData as CotizacionLineTemplateRow) : null;
        }

        if (!isMissingColumnError(error, "material")) {
          throw error;
        }

        const { data: legacyData, error: legacyError } = await supabase
          .from(TABLE_NAME)
          .select(LEGACY_SELECT_FIELDS)
          .eq("id", id)
          .eq("organization_id", organizationId)
          .is("eliminado_en", null)
          .maybeSingle();

        if (legacyError) {
          throw legacyError;
        }

        return legacyData ? mapLegacyRow(legacyData as CotizacionLineTemplateRow) : null;
      }

      return data ? mapRow(data as CotizacionLineTemplateRow) : null;
    },

    async create(input: CreateCotizacionLineTemplateInput) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(buildInsertPayload(input))
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        if (isMissingCatalogColumnsError(error)) {
          throw new Error(
            "Falta aplicar la migracion de catalogo privado para guardar lineas extendidas."
          );
        }
        if (isMissingColumnError(error, "material")) {
          throw new Error("Falta aplicar la migracion nueva de lineas y precios para guardar material.");
        }
        if (isMissingColumnError(error, "vidrio_principal_recomendado")) {
          throw new Error(
            "Falta aplicar la migracion nueva de lineas y precios para guardar el vidrio recomendado."
          );
        }
        throw error;
      }

      return mapRow(data as CotizacionLineTemplateRow);
    },

    async update(
      id: EntityId,
      organizationId: EntityId,
      input: UpdateCotizacionLineTemplateInput
    ) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(buildUpdatePayload(input))
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        if (isMissingCatalogColumnsError(error)) {
          throw new Error(
            "Falta aplicar la migracion de catalogo privado para editar lineas extendidas."
          );
        }
        if (isMissingColumnError(error, "material")) {
          throw new Error("Falta aplicar la migracion nueva de lineas y precios para editar material.");
        }
        if (isMissingColumnError(error, "vidrio_principal_recomendado")) {
          throw new Error(
            "Falta aplicar la migracion nueva de lineas y precios para editar el vidrio recomendado."
          );
        }
        throw error;
      }

      return mapRow(data as CotizacionLineTemplateRow);
    },

    async softDelete(id: EntityId, organizationId: EntityId) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({
          eliminado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (error) {
        throw error;
      }
    },
  };
}

export type CotizacionLineTemplatesRepository = ReturnType<
  typeof createCotizacionLineTemplatesRepository
>;

let defaultCotizacionLineTemplatesRepository: CotizacionLineTemplatesRepository | null = null;

function getDefaultCotizacionLineTemplatesRepository() {
  if (!defaultCotizacionLineTemplatesRepository) {
    defaultCotizacionLineTemplatesRepository = createCotizacionLineTemplatesRepository();
  }

  return defaultCotizacionLineTemplatesRepository;
}

export const cotizacionLineTemplatesRepository: CotizacionLineTemplatesRepository = {
  listByOrganizationId(...args) {
    return getDefaultCotizacionLineTemplatesRepository().listByOrganizationId(...args);
  },
  getById(...args) {
    return getDefaultCotizacionLineTemplatesRepository().getById(...args);
  },
  create(...args) {
    return getDefaultCotizacionLineTemplatesRepository().create(...args);
  },
  update(...args) {
    return getDefaultCotizacionLineTemplatesRepository().update(...args);
  },
  softDelete(...args) {
    return getDefaultCotizacionLineTemplatesRepository().softDelete(...args);
  },
};
