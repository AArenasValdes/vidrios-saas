import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CrearSolicitudEmpresaInput,
  CrearSolicitudContactoInput,
  EstadoSolicitudContacto,
  SolicitudEmpresaPublicaConfig,
  SolicitudContacto,
} from "@/features/solicitudes/types/solicitud-contacto";

type SolicitudesContactoRepositoryDeps = {
  clientFactory?: ReturnType<typeof createAdminClient>;
};

type SolicitudContactoRow = {
  id: string;
  organization_id: string | number | null;
  nombre: string;
  empresa: string;
  correo: string | null;
  telefono: string | null;
  contacto: string | null;
  tipo_trabajo: string | null;
  mensaje: string | null;
  ayuda: string;
  contexto: string;
  estado: string;
  origen: string;
  ip: string | null;
  user_agent: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source_url: string | null;
};

type SolicitudEmpresaPublicaConfigRow = {
  organization_id: string | number;
  empresa_nombre: string | null;
  empresa_logo_url: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  brand_color: string | null;
  solicitud_publica_slug: string | null;
  solicitud_publica_valor: string | null;
  solicitud_publica_privacidad: string | null;
};

const TABLE_NAME = "solicitudes_contacto";
const ORGANIZATION_PROFILE_TABLE = "organization_profile";
const SOLICITUD_SELECT = `id, organization_id, nombre, empresa, correo, telefono, contacto, tipo_trabajo, mensaje, ayuda, contexto, estado, origen, ip, user_agent, creado_en, actualizado_en, utm_source, utm_medium, utm_campaign, source_url`;

function normalizePublicSlug(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

function mapSolicitudContacto(row: SolicitudContactoRow): SolicitudContacto {
  return {
    id: row.id,
    organizationId: row.organization_id,
    nombre: row.nombre,
    empresa: row.empresa,
    correo: row.correo,
    telefono: row.telefono,
    contacto: row.contacto,
    tipoTrabajo: row.tipo_trabajo,
    mensaje: row.mensaje,
    ayuda: row.ayuda as SolicitudContacto["ayuda"],
    contexto: row.contexto as SolicitudContacto["contexto"],
    estado: row.estado as SolicitudContacto["estado"],
    origen: row.origen,
    ip: row.ip,
    userAgent: row.user_agent,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    sourceUrl: row.source_url,
  };
}

function mapSolicitudEmpresaPublicaConfig(
  row: SolicitudEmpresaPublicaConfigRow | null,
  fallbackSlug?: string
): SolicitudEmpresaPublicaConfig | null {
  const resolvedSlug =
    row?.solicitud_publica_slug?.trim() || fallbackSlug || null;

  if (!row || !resolvedSlug) {
    return null;
  }

  return {
    organizationId: row.organization_id,
    empresaNombre: row.empresa_nombre?.trim() || "Mi empresa",
    empresaLogoUrl: row.empresa_logo_url,
    empresaTelefono: row.empresa_telefono?.trim() || "",
    empresaEmail: row.empresa_email?.trim() || "",
    brandColor: row.brand_color?.trim() || "#1a3a5c",
    solicitudPublicaSlug: resolvedSlug,
    solicitudPublicaValor:
      row.solicitud_publica_valor?.trim() ||
      "Recibe una respuesta comercial inicial, orientación del trabajo y una base para tu cotización.",
    solicitudPublicaPrivacidad:
      row.solicitud_publica_privacidad?.trim() ||
      "Tus datos se usan solo para esta solicitud y no se comparten fuera de la empresa.",
  };
}

export function createSolicitudesContactoRepository(
  deps: SolicitudesContactoRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createAdminClient();

  return {
    async listRecent() {
      const { data, error } = await supabase
        .from(TABLE_NAME as never)
        .select(SOLICITUD_SELECT)
        .order("creado_en", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data as SolicitudContactoRow[] | null) ?? []).map(
        mapSolicitudContacto
      );
    },

    async listByOrganizationId(organizationId: string | number) {
      const { data, error } = await supabase
        .from(TABLE_NAME as never)
        .select(SOLICITUD_SELECT)
        .eq("organization_id", organizationId as never)
        .order("creado_en", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data as SolicitudContactoRow[] | null) ?? []).map(
        mapSolicitudContacto
      );
    },

    async getPublicConfigBySlug(slug: string) {
      const normalizedSlug = normalizePublicSlug(slug);
      const { data, error } = await supabase
        .from(ORGANIZATION_PROFILE_TABLE as never)
        .select(
          `organization_id, empresa_nombre, empresa_logo_url, empresa_telefono, empresa_email, brand_color, solicitud_publica_slug, solicitud_publica_valor, solicitud_publica_privacidad`
        )
        .eq("solicitud_publica_slug", normalizedSlug)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const directMatch = mapSolicitudEmpresaPublicaConfig(
        (data as SolicitudEmpresaPublicaConfigRow | null) ?? null
      );

      if (directMatch) {
        return directMatch;
      }

      const fallbackNeedle = normalizedSlug.replace(/-/g, " ");
      const { data: fallbackRows, error: fallbackError } = await supabase
        .from(ORGANIZATION_PROFILE_TABLE as never)
        .select(
          `organization_id, empresa_nombre, empresa_logo_url, empresa_telefono, empresa_email, brand_color, solicitud_publica_slug, solicitud_publica_valor, solicitud_publica_privacidad`
        )
        .ilike("empresa_nombre", `%${fallbackNeedle}%`)
        .limit(12);

      if (fallbackError) {
        throw fallbackError;
      }

      const fallbackRow = (
        (fallbackRows as SolicitudEmpresaPublicaConfigRow[] | null) ?? []
      ).find(
        (candidate) =>
          normalizePublicSlug(
            candidate.solicitud_publica_slug || candidate.empresa_nombre
          ) === normalizedSlug
      );

      if (fallbackRow && !fallbackRow.solicitud_publica_slug?.trim()) {
        const { error: syncSlugError } = await supabase
          .from(ORGANIZATION_PROFILE_TABLE as never)
          .update({
            solicitud_publica_slug: normalizedSlug,
          } as never)
          .eq("organization_id", fallbackRow.organization_id as never);

        if (!syncSlugError) {
          fallbackRow.solicitud_publica_slug = normalizedSlug;
        }
      }

      return mapSolicitudEmpresaPublicaConfig(
        fallbackRow ?? null,
        normalizedSlug
      );
    },

    async create(input: CrearSolicitudContactoInput) {
      const { data, error } = await supabase
        .from(TABLE_NAME as never)
        .insert({
          organization_id: null,
          nombre: input.nombre,
          empresa: input.empresa,
          correo: input.correo,
          telefono: input.telefono,
          contacto: input.correo || input.telefono,
          tipo_trabajo: null,
          mensaje: null,
          ayuda: input.ayuda,
          contexto: "landing",
          estado: "nueva",
          origen: input.origen ?? "landing",
          ip: input.ip ?? null,
          user_agent: input.userAgent ?? null,
          utm_source: input.utmSource ?? null,
          utm_medium: input.utmMedium ?? null,
          utm_campaign: input.utmCampaign ?? null,
          source_url: input.sourceUrl ?? null,
          actualizado_en: new Date().toISOString(),
        } as never)
        .select(SOLICITUD_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapSolicitudContacto(data as SolicitudContactoRow);
    },

    async createPublicRequest(input: CrearSolicitudEmpresaInput) {
      const isEmailContact = input.contacto.includes("@");
      const { data, error } = await supabase
        .from(TABLE_NAME as never)
        .insert({
          organization_id: input.organizationId,
          nombre: input.nombre,
          empresa: input.empresa,
          correo: isEmailContact ? input.contacto : null,
          telefono: isEmailContact ? null : input.contacto,
          contacto: input.contacto,
          tipo_trabajo: input.tipoTrabajo,
          mensaje: input.mensaje?.trim() || null,
          ayuda: "cotizacion",
          contexto: "empresa-publica",
          estado: "nueva",
          origen: input.origen ?? "solicitud-publica",
          ip: input.ip ?? null,
          user_agent: input.userAgent ?? null,
          utm_source: input.utmSource ?? null,
          utm_medium: input.utmMedium ?? null,
          utm_campaign: input.utmCampaign ?? null,
          source_url: input.sourceUrl ?? null,
          actualizado_en: new Date().toISOString(),
        } as never)
        .select(SOLICITUD_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapSolicitudContacto(data as SolicitudContactoRow);
    },

    async updateStatusById(input: {
      id: string;
      estado: EstadoSolicitudContacto;
      organizationId?: string | number | null;
    }) {
      let query = supabase
        .from(TABLE_NAME as never)
        .update({
          estado: input.estado,
          actualizado_en: new Date().toISOString(),
        } as never)
        .eq("id", input.id as never);

      if (input.organizationId !== undefined && input.organizationId !== null) {
        query = query.eq("organization_id", input.organizationId as never);
      }

      const { data, error } = await query.select(SOLICITUD_SELECT).single();

      if (error) {
        throw error;
      }

      return mapSolicitudContacto(data as SolicitudContactoRow);
    },
  };
}

export type SolicitudesContactoRepository = ReturnType<
  typeof createSolicitudesContactoRepository
>;

let defaultSolicitudesContactoRepository: SolicitudesContactoRepository | null =
  null;

function getDefaultSolicitudesContactoRepository() {
  if (!defaultSolicitudesContactoRepository) {
    defaultSolicitudesContactoRepository =
      createSolicitudesContactoRepository();
  }

  return defaultSolicitudesContactoRepository;
}

export const solicitudesContactoRepository: SolicitudesContactoRepository = {
  listRecent(...args) {
    return getDefaultSolicitudesContactoRepository().listRecent(...args);
  },
  listByOrganizationId(...args) {
    return getDefaultSolicitudesContactoRepository().listByOrganizationId(
      ...args
    );
  },
  getPublicConfigBySlug(...args) {
    return getDefaultSolicitudesContactoRepository().getPublicConfigBySlug(
      ...args
    );
  },
  create(...args) {
    return getDefaultSolicitudesContactoRepository().create(...args);
  },
  createPublicRequest(...args) {
    return getDefaultSolicitudesContactoRepository().createPublicRequest(
      ...args
    );
  },
  updateStatusById(...args) {
    return getDefaultSolicitudesContactoRepository().updateStatusById(...args);
  },
};
