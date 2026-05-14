import { createClient } from "@/lib/supabase/client";
import type {
  CotizacionLineTemplate,
  CotizacionLineTemplateMaterial,
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
  material: CotizacionLineTemplateMaterial | null;
  precio_m2_sugerido: number | string;
  minimo_cobrable: number | string | null;
  redondeo_precio: number | string | null;
  is_active: boolean | null;
  sort_order: number | null;
  creado_en: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

const TABLE_NAME = "cotizacion_line_templates";
const SELECT_FIELDS =
  "id, organization_id, nombre, material, precio_m2_sugerido, minimo_cobrable, redondeo_precio, is_active, sort_order, creado_en, actualizado_en, eliminado_en";
const LEGACY_SELECT_FIELDS =
  "id, organization_id, nombre, precio_m2_sugerido, minimo_cobrable, redondeo_precio, is_active, sort_order, creado_en, actualizado_en, eliminado_en";

function isMissingMaterialColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message ?? "") : "";
  return message.toLowerCase().includes("material");
}

function mapLegacyRow(
  row: Omit<CotizacionLineTemplateRow, "material"> & { material?: CotizacionLineTemplateMaterial | null }
): CotizacionLineTemplate {
  return mapRow({ ...row, material: row.material ?? "Aluminio" });
}

function mapRow(row: CotizacionLineTemplateRow): CotizacionLineTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    nombre: row.nombre,
    material: row.material === "PVC" ? "PVC" : "Aluminio",
    precioM2Sugerido: Number(row.precio_m2_sugerido),
    minimoCobrable: Number(row.minimo_cobrable ?? 0),
    redondeoPrecio: Number(row.redondeo_precio ?? 1000),
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    eliminadoEn: row.eliminado_en,
  };
}

export function createCotizacionLineTemplatesRepository(
  deps: CotizacionLineTemplatesRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async listByOrganizationId(organizationId: EntityId, options?: { activeOnly?: boolean }) {
      let query = supabase
        .from(TABLE_NAME)
        .select(SELECT_FIELDS)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("sort_order", { ascending: true })
        .order("nombre", { ascending: true });

      if (options?.activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        if (!isMissingMaterialColumnError(error)) {
          throw error;
        }

        let legacyQuery = supabase
          .from(TABLE_NAME)
          .select(LEGACY_SELECT_FIELDS)
          .eq("organization_id", organizationId)
          .is("eliminado_en", null)
          .order("sort_order", { ascending: true })
          .order("nombre", { ascending: true });

        if (options?.activeOnly) {
          legacyQuery = legacyQuery.eq("is_active", true);
        }

        const { data: legacyData, error: legacyError } = await legacyQuery;

        if (legacyError) {
          throw legacyError;
        }

        return (
          legacyData as Array<
            Omit<CotizacionLineTemplateRow, "material"> & { material?: CotizacionLineTemplateMaterial | null }
          >
        ).map(mapLegacyRow);
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
        if (!isMissingMaterialColumnError(error)) {
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

        return legacyData
          ? mapLegacyRow(
              legacyData as Omit<CotizacionLineTemplateRow, "material"> & {
                material?: CotizacionLineTemplateMaterial | null;
              }
            )
          : null;
      }

      return data ? mapRow(data as CotizacionLineTemplateRow) : null;
    },

    async create(input: CreateCotizacionLineTemplateInput) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({
          organization_id: input.organizationId,
          nombre: input.nombre,
          material: input.material,
          precio_m2_sugerido: input.precioM2Sugerido,
          minimo_cobrable: input.minimoCobrable ?? 0,
          redondeo_precio: input.redondeoPrecio ?? 1000,
          is_active: input.isActive ?? true,
          sort_order: input.sortOrder ?? 0,
        })
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        if (isMissingMaterialColumnError(error)) {
          throw new Error("Falta aplicar la migración nueva de líneas y precios para guardar material.");
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
      const payload: Record<string, unknown> = {
        actualizado_en: new Date().toISOString(),
      };

      if (input.nombre !== undefined) payload.nombre = input.nombre;
      if (input.material !== undefined) payload.material = input.material;
      if (input.precioM2Sugerido !== undefined) {
        payload.precio_m2_sugerido = input.precioM2Sugerido;
      }
      if (input.minimoCobrable !== undefined) {
        payload.minimo_cobrable = input.minimoCobrable;
      }
      if (input.redondeoPrecio !== undefined) {
        payload.redondeo_precio = input.redondeoPrecio;
      }
      if (input.isActive !== undefined) payload.is_active = input.isActive;
      if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        if (isMissingMaterialColumnError(error)) {
          throw new Error("Falta aplicar la migración nueva de líneas y precios para editar material.");
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
