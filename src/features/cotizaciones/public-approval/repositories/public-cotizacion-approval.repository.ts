import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { EntityId } from "@/types/common";

type CotizacionApprovalRow = {
  id: EntityId;
  organization_id: EntityId;
  proyecto_id: EntityId | null;
  numero: string | null;
  estado: string;
  notas: string | null;
  valido_hasta: string | null;
  subtotal_neto: number | string | null;
  descuento_pct: number | string | null;
  pricing_mode?: string | null;
  flete: number | string | null;
  iva: number | string | null;
  total: number | string;
  approval_token: string | null;
  approval_token_expires_at: string | null;
  cliente_vio_en: string | null;
  cliente_respondio_en: string | null;
  cliente_respuesta_canal: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

type ProjectRow = {
  id: EntityId;
  titulo: string;
  cliente_id: EntityId | null;
};

type ClientRow = {
  id: EntityId;
  nombre: string | null;
  telefono: string | null;
  direccion: string | null;
};

type OrganizationProfileRow = {
  organization_id: EntityId;
  empresa_nombre: string | null;
  empresa_logo_url: string | null;
  empresa_direccion: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  brand_color: string | null;
  forma_pago: string | null;
  margen_defecto: number | null;
};

type PublicItemRow = {
  id: EntityId;
  cotizacion_id: EntityId | null;
  codigo: string | null;
  tipo_item: string | null;
  tipo_componente: string | null;
  cantidad: number;
  precio_unitario: number | string;
  subtotal: number | string;
  ancho: number | string | null;
  alto: number | string | null;
  vidrio: string | null;
  nombre: string | null;
  descripcion: string | null;
  unidad: string | null;
  observaciones: string | null;
  orden: number | null;
  eliminado_en: string | null;
};

const ORGANIZATION_PROFILE_SELECT = `
  organization_id,
  empresa_nombre,
  empresa_logo_url,
  empresa_direccion,
  empresa_telefono,
  empresa_email,
  brand_color,
  forma_pago,
  margen_defecto
`;

const ORGANIZATION_PROFILE_SELECT_LEGACY = `
  organization_id,
  empresa_nombre,
  empresa_logo_url,
  empresa_direccion,
  empresa_telefono,
  empresa_email,
  brand_color,
  forma_pago
`;

const COTIZACION_APPROVAL_SELECT = `
  id,
  organization_id,
  proyecto_id,
  numero,
  estado,
  notas,
  valido_hasta,
  subtotal_neto,
  descuento_pct,
  pricing_mode,
  flete,
  iva,
  total,
  approval_token,
  approval_token_expires_at,
  cliente_vio_en,
  cliente_respondio_en,
  cliente_respuesta_canal,
  creado_en,
  actualizado_en,
  eliminado_en
`;

const COTIZACION_APPROVAL_SELECT_FALLBACK = `
  id,
  organization_id,
  proyecto_id,
  numero,
  estado,
  notas,
  valido_hasta,
  subtotal_neto,
  descuento_pct,
  flete,
  iva,
  total,
  approval_token,
  approval_token_expires_at,
  creado_en,
  actualizado_en,
  eliminado_en
`;

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

function isMissingApprovalTrackingFieldsError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    (haystack.includes("cliente_vio_en") ||
      haystack.includes("cliente_respondio_en") ||
      haystack.includes("cliente_respuesta_canal")) &&
    (haystack.includes("column") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

function isMissingRelationError(error: unknown, relationName: string) {
  const haystack = getErrorText(error);

  return (
    haystack.includes(relationName.toLowerCase()) &&
    (haystack.includes("relation") ||
      haystack.includes("table") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

function isMissingOrganizationProfileMarginColumnError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    haystack.includes("organization_profile") &&
    haystack.includes("margen_defecto") &&
    (haystack.includes("column") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

export function createPublicCotizacionApprovalRepository() {
  const supabase = createAdminClient();

  return {
    async getByApprovalToken(token: string) {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select(COTIZACION_APPROVAL_SELECT)
        .eq("approval_token", token)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error && !isMissingApprovalTrackingFieldsError(error)) {
        throw error;
      }

      let cotizacion = data as CotizacionApprovalRow | null;

      if (error && isMissingApprovalTrackingFieldsError(error)) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("cotizaciones")
          .select(COTIZACION_APPROVAL_SELECT_FALLBACK)
          .eq("approval_token", token)
          .is("eliminado_en", null)
          .maybeSingle();

        if (fallbackError) {
          throw fallbackError;
        }

        cotizacion = fallbackData
          ? ({
              ...(fallbackData as CotizacionApprovalRow),
              cliente_vio_en: null,
              cliente_respondio_en: null,
              cliente_respuesta_canal: null,
            } as CotizacionApprovalRow)
          : null;
      }

      if (!cotizacion) {
        return null;
      }
      const projectPromise = cotizacion.proyecto_id
        ? supabase
            .from("projects")
            .select("id, titulo, cliente_id")
            .eq("id", cotizacion.proyecto_id)
            .eq("organization_id", cotizacion.organization_id)
            .is("eliminado_en", null)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const itemsPromise = supabase
        .from("cotizacion_items")
        .select(
          "id, cotizacion_id, codigo, tipo_item, tipo_componente, cantidad, precio_unitario, subtotal, ancho, alto, vidrio, nombre, descripcion, unidad, observaciones, orden, eliminado_en"
        )
        .eq("cotizacion_id", cotizacion.id)
        .eq("organization_id", cotizacion.organization_id)
        .is("eliminado_en", null)
        .order("orden", { ascending: true })
        .order("creado_en", { ascending: true });

      const profilePromise = supabase
        .from("organization_profile")
        .select(ORGANIZATION_PROFILE_SELECT)
        .eq("organization_id", cotizacion.organization_id)
        .maybeSingle();

      const [projectResult, itemsResult, initialProfileResult] = await Promise.all([
        projectPromise,
        itemsPromise,
        profilePromise,
      ]);

      if (projectResult.error) {
        throw projectResult.error;
      }

      if (itemsResult.error) {
        throw itemsResult.error;
      }

      let organizationProfile = initialProfileResult.data as OrganizationProfileRow | null;

      if (initialProfileResult.error && !isMissingOrganizationProfileMarginColumnError(initialProfileResult.error)) {
        throw initialProfileResult.error;
      }

      if (initialProfileResult.error && isMissingOrganizationProfileMarginColumnError(initialProfileResult.error)) {
        const { data: fallbackProfile, error: fallbackProfileError } = await supabase
          .from("organization_profile")
          .select(ORGANIZATION_PROFILE_SELECT_LEGACY)
          .eq("organization_id", cotizacion.organization_id)
          .maybeSingle();

        if (fallbackProfileError) {
          throw fallbackProfileError;
        }

        organizationProfile = fallbackProfile
          ? ({
              ...(fallbackProfile as Omit<OrganizationProfileRow, "margen_defecto">),
              margen_defecto: null,
            } as OrganizationProfileRow)
          : null;
      }

      const project = projectResult.data as ProjectRow | null;

      const clientResult =
        project?.cliente_id !== null && project?.cliente_id !== undefined
          ? await supabase
              .from("clients")
              .select("id, nombre, telefono, direccion")
              .eq("id", project.cliente_id)
              .eq("organization_id", cotizacion.organization_id)
              .is("eliminado_en", null)
              .maybeSingle()
          : { data: null, error: null };

      if (clientResult.error && !isMissingRelationError(clientResult.error, "clients")) {
        throw clientResult.error;
      }

      return {
        cotizacion,
        project,
        client: clientResult.error
          ? null
          : (clientResult.data as ClientRow | null),
        organizationProfile,
        items: ((itemsResult.data as PublicItemRow[] | null) ?? []).filter(
          (item) => item.eliminado_en === null
        ),
      };
    },

    async markViewed(token: string) {
      const viewedAt = new Date().toISOString();
      const { error } = await supabase
        .from("cotizaciones")
        .update(
          {
            cliente_vio_en: viewedAt,
          } as never
        )
        .eq("approval_token", token)
        .is("eliminado_en", null)
        .is("cliente_vio_en", null);

      if (error && !isMissingApprovalTrackingFieldsError(error)) {
        throw error;
      }

      return viewedAt;
    },

    async respond(token: string, estado: "aprobada" | "rechazada") {
      const respondedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("cotizaciones")
        .update(
          {
            estado,
            cliente_respondio_en: respondedAt,
            cliente_respuesta_canal: "link_publico",
            cliente_vio_en: respondedAt,
          } as never
        )
        .eq("approval_token", token)
        .is("eliminado_en", null)
        .in("estado", ["borrador", "creada", "enviada"])
        .is("cliente_respondio_en", null)
        .select(COTIZACION_APPROVAL_SELECT)
        .maybeSingle();

      if (error && !isMissingApprovalTrackingFieldsError(error)) {
        throw error;
      }

      if (error && isMissingApprovalTrackingFieldsError(error)) {
        const { error: fallbackError } = await supabase
          .from("cotizaciones")
          .update(
            {
              estado,
            } as never
          )
          .eq("approval_token", token)
          .is("eliminado_en", null)
          .in("estado", ["borrador", "creada", "enviada"]);

        if (fallbackError) {
          throw fallbackError;
        }

        return this.getByApprovalToken(token);
      }

      return (data as CotizacionApprovalRow | null) ?? null;
    },
  };
}

export type PublicCotizacionApprovalRepository = ReturnType<
  typeof createPublicCotizacionApprovalRepository
>;

let defaultPublicCotizacionApprovalRepository: PublicCotizacionApprovalRepository | null = null;

function getDefaultPublicCotizacionApprovalRepository() {
  if (!defaultPublicCotizacionApprovalRepository) {
    defaultPublicCotizacionApprovalRepository = createPublicCotizacionApprovalRepository();
  }

  return defaultPublicCotizacionApprovalRepository;
}

export const publicCotizacionApprovalRepository: PublicCotizacionApprovalRepository = {
  getByApprovalToken(...args) {
    return getDefaultPublicCotizacionApprovalRepository().getByApprovalToken(...args);
  },
  markViewed(...args) {
    return getDefaultPublicCotizacionApprovalRepository().markViewed(...args);
  },
  respond(...args) {
    return getDefaultPublicCotizacionApprovalRepository().respond(...args);
  },
};
