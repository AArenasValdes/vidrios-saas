import "server-only";

import type { SolicitudPublicaHorarioDia } from "@/features/organization-profile/types/organization-profile";
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

type SolicitudesResumenPageOptions = {
  page: number;
  pageSize: number;
  estado?: EstadoSolicitudContacto | null;
  search?: string | null;
};

type SolicitudesResumenPageResult = {
  solicitudes: SolicitudContacto[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
};

type SolicitudesResumenGlobal = {
  total: number;
  hoy: number;
  counts: Record<EstadoSolicitudContacto, number>;
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
  contactada_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source_url: string | null;
};

type SolicitudEmpresaPublicaConfigRow = {
  organization_id: string | number;
  empresa_nombre: string | null;
  empresa_logo_url: string | null;
  empresa_direccion: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  brand_color: string | null;
  solicitud_publica_slug: string | null;
  solicitud_publica_descripcion_corta: string | null;
  solicitud_publica_valor: string | null;
  solicitud_publica_mensaje_confianza: string | null;
  solicitud_publica_privacidad: string | null;
  solicitud_publica_horario_desde: string | null;
  solicitud_publica_horario_hasta: string | null;
  solicitud_publica_dias_atencion: string | null;
  solicitud_publica_horario_por_dia?: unknown;
  public_name: string | null;
  public_subtitle: string | null;
  public_zone: string | null;
  public_business_type: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
  public_services: string[] | null;
  final_cta_title: string | null;
  final_cta_subtitle: string | null;
  final_cta_label: string | null;
  business_hours_note: string | null;
  secondary_color: string | null;
  hero_mode: string | null;
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  show_gallery: boolean | null;
  show_schedule: boolean | null;
  show_rating: boolean | null;
  rating_label: string | null;
  jobs_count_label: string | null;
  form_title: string | null;
  form_subtitle: string | null;
  is_published: boolean | null;
  plan_code: string | null;
};

const TABLE_NAME = "solicitudes_contacto";
const ORGANIZATION_PROFILE_TABLE = "organization_profile";
const SOLICITUD_SELECT =
  "id, organization_id, nombre, empresa, correo, telefono, contacto, tipo_trabajo, mensaje, ayuda, contexto, estado, origen, ip, user_agent, creado_en, actualizado_en, contactada_at, utm_source, utm_medium, utm_campaign, source_url";
const SOLICITUD_SELECT_LEGACY =
  "id, organization_id, nombre, empresa, correo, telefono, contacto, tipo_trabajo, mensaje, ayuda, contexto, estado, origen, ip, user_agent, creado_en, actualizado_en, utm_source, utm_medium, utm_campaign, source_url";
const SOLICITUD_RESUMEN_SELECT =
  "id, organization_id, nombre, empresa, correo, telefono, contacto, tipo_trabajo, mensaje, ayuda, contexto, estado, origen, creado_en, actualizado_en, contactada_at";
const SOLICITUD_RESUMEN_SELECT_LEGACY =
  "id, organization_id, nombre, empresa, correo, telefono, contacto, tipo_trabajo, mensaje, ayuda, contexto, estado, origen, creado_en, actualizado_en";
const ORGANIZATION_PROFILE_PUBLIC_SELECT =
  "organization_id, empresa_nombre, empresa_logo_url, empresa_direccion, empresa_telefono, empresa_email, brand_color, solicitud_publica_slug, solicitud_publica_descripcion_corta, solicitud_publica_valor, solicitud_publica_mensaje_confianza, solicitud_publica_privacidad, solicitud_publica_horario_desde, solicitud_publica_horario_hasta, solicitud_publica_dias_atencion, solicitud_publica_horario_por_dia, public_name, public_subtitle, public_zone, public_business_type, instagram_url, facebook_url, tiktok_url, website_url, public_services, final_cta_title, final_cta_subtitle, final_cta_label, business_hours_note, secondary_color, hero_mode, hero_image_url, hero_title, hero_subtitle, show_gallery, show_schedule, show_rating, rating_label, jobs_count_label, form_title, form_subtitle, is_published, plan_code";

const DEFAULT_PUBLIC_SCHEDULE_DAYS = ["1", "2", "3", "4", "5", "6"] as const;
const PUBLIC_SCHEDULE_DAY_ORDER = ["1", "2", "3", "4", "5", "6", "0"] as const;

function normalizePublicHorario(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "").trim();

  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function normalizePublicScheduleByDay(input: {
  schedule?: unknown;
  days?: string[] | null;
  from?: string | null;
  to?: string | null;
}) {
  const enabledDays = new Set(
    (input.days?.length ? input.days : [...DEFAULT_PUBLIC_SCHEDULE_DAYS]).filter((day) =>
      /^[0-6]$/.test(day)
    )
  );
  const fallbackFrom = normalizePublicHorario(input.from, "09:00");
  const fallbackTo = normalizePublicHorario(input.to, "19:00");
  const rows = Array.isArray(input.schedule)
    ? (input.schedule as SolicitudPublicaHorarioDia[])
    : [];
  const rowMap = new Map(rows.map((row) => [row.day, row]));

  return PUBLIC_SCHEDULE_DAY_ORDER.map((day) => {
    const custom = rowMap.get(day);

    return {
      day,
      enabled: custom ? Boolean(custom.enabled) : enabledDays.has(day),
      from: normalizePublicHorario(custom?.from, fallbackFrom),
      to: normalizePublicHorario(custom?.to, fallbackTo),
    };
  });
}

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

function isMissingContactadaAtError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    haystack.includes("contactada_at") &&
    (haystack.includes("column") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

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
    contactadaAt: row.contactada_at,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    sourceUrl: row.source_url,
  };
}

function mapSolicitudContactoResumen(
  row: Pick<
    SolicitudContactoRow,
    | "id"
    | "organization_id"
    | "nombre"
    | "empresa"
    | "correo"
    | "telefono"
    | "contacto"
    | "tipo_trabajo"
    | "mensaje"
    | "ayuda"
    | "contexto"
    | "estado"
    | "origen"
    | "creado_en"
    | "actualizado_en"
    | "contactada_at"
  >
): SolicitudContacto {
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
    ip: null,
    userAgent: null,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    contactadaAt: row.contactada_at ?? null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    sourceUrl: null,
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

  const schedule = normalizePublicScheduleByDay(
    {
      schedule: row.solicitud_publica_horario_por_dia,
      days:
        row.solicitud_publica_dias_atencion
          ?.split(",")
          .map((value) => value.trim())
          .filter(Boolean) ?? ["1", "2", "3", "4", "5", "6"],
      from: row.solicitud_publica_horario_desde?.trim() || "09:00",
      to: row.solicitud_publica_horario_hasta?.trim() || "19:00",
    }
  );

  return {
    organizationId: row.organization_id,
    empresaNombre: row.empresa_nombre?.trim() || "Mi empresa",
    empresaLogoUrl: row.empresa_logo_url,
    empresaDireccion: row.empresa_direccion?.trim() || "",
    empresaTelefono: row.empresa_telefono?.trim() || "",
    empresaEmail: row.empresa_email?.trim() || "",
    brandColor: row.brand_color?.trim() || "#1a3a5c",
    solicitudPublicaSlug: resolvedSlug,
    solicitudPublicaDescripcionCorta:
      row.solicitud_publica_descripcion_corta?.trim() || "",
    solicitudPublicaValor: row.solicitud_publica_valor?.trim() || "",
    solicitudPublicaMensajeConfianza:
      row.solicitud_publica_mensaje_confianza?.trim() || "",
    solicitudPublicaPrivacidad: row.solicitud_publica_privacidad?.trim() || "",
    solicitudPublicaHorarioDesde: row.solicitud_publica_horario_desde?.trim() || "",
    solicitudPublicaHorarioHasta: row.solicitud_publica_horario_hasta?.trim() || "",
    solicitudPublicaDiasAtencion: row.solicitud_publica_dias_atencion
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? ["1", "2", "3", "4", "5", "6"],
    solicitudPublicaHorarioPorDia: schedule,
    publicName: row.public_name?.trim() || "",
    publicSubtitle: row.public_subtitle?.trim() || "",
    publicZone: row.public_zone?.trim() || "",
    publicBusinessType: row.public_business_type?.trim() || "",
    instagramUrl: row.instagram_url?.trim() || "",
    facebookUrl: row.facebook_url?.trim() || "",
    tiktokUrl: row.tiktok_url?.trim() || "",
    websiteUrl: row.website_url?.trim() || "",
    publicServices: (row.public_services ?? [])
      .map((value) => value.trim())
      .filter(Boolean) as SolicitudEmpresaPublicaConfig["publicServices"],
    finalCtaTitle: row.final_cta_title?.trim() || "",
    finalCtaSubtitle: row.final_cta_subtitle?.trim() || "",
    finalCtaLabel: row.final_cta_label?.trim() || "",
    businessHoursNote: row.business_hours_note?.trim() || "",
    secondaryColor: row.secondary_color?.trim() || "",
    heroMode: row.hero_mode === "image" ? "image" : "gradient",
    heroImageUrl: row.hero_image_url,
    heroTitle: row.hero_title?.trim() || "",
    heroSubtitle: row.hero_subtitle?.trim() || "",
    showGallery: row.show_gallery ?? true,
    showSchedule: row.show_schedule ?? true,
    showRating: row.show_rating ?? false,
    ratingLabel: row.rating_label?.trim() || "",
    jobsCountLabel: row.jobs_count_label?.trim() || "",
    formTitle: row.form_title?.trim() || "",
    formSubtitle: row.form_subtitle?.trim() || "",
    isPublished: row.is_published ?? false,
    planCode: (row.plan_code as SolicitudEmpresaPublicaConfig["planCode"]) ?? null,
  };
}

async function selectSolicitudes(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId?: string | number
) {
  let query = supabase
    .from(TABLE_NAME as never)
    .select(SOLICITUD_SELECT)
    .order("creado_en", { ascending: false });

  if (organizationId !== undefined) {
    query = query.eq("organization_id", organizationId as never);
  }

  const { data, error } = await query;

  if (!error) {
    return ((data as SolicitudContactoRow[] | null) ?? []).map(mapSolicitudContacto);
  }

  if (!isMissingContactadaAtError(error)) {
    throw error;
  }

  let legacyQuery = supabase
    .from(TABLE_NAME as never)
    .select(SOLICITUD_SELECT_LEGACY)
    .order("creado_en", { ascending: false });

  if (organizationId !== undefined) {
    legacyQuery = legacyQuery.eq("organization_id", organizationId as never);
  }

  const { data: legacyData, error: legacyError } = await legacyQuery;

  if (legacyError) {
    throw legacyError;
  }

  return (((legacyData as SolicitudContactoRow[] | null) ?? []).map((row) => ({
    ...row,
    contactada_at: null,
  })) as SolicitudContactoRow[]).map(mapSolicitudContacto);
}

async function selectSolicitudesResumen(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId?: string | number
) {
  let query = supabase
    .from(TABLE_NAME as never)
    .select(SOLICITUD_RESUMEN_SELECT)
    .order("creado_en", { ascending: false });

  if (organizationId !== undefined) {
    query = query.eq("organization_id", organizationId as never);
  }

  const { data, error } = await query;

  if (!error) {
    return (
      (data as Array<
        Pick<
          SolicitudContactoRow,
          | "id"
          | "organization_id"
          | "nombre"
          | "empresa"
          | "correo"
          | "telefono"
          | "contacto"
          | "tipo_trabajo"
          | "mensaje"
          | "ayuda"
          | "contexto"
          | "estado"
          | "origen"
          | "creado_en"
          | "actualizado_en"
          | "contactada_at"
        >
      > | null) ?? []
    ).map(mapSolicitudContactoResumen);
  }

  if (!isMissingContactadaAtError(error)) {
    throw error;
  }

  let legacyQuery = supabase
    .from(TABLE_NAME as never)
    .select(SOLICITUD_RESUMEN_SELECT_LEGACY)
    .order("creado_en", { ascending: false });

  if (organizationId !== undefined) {
    legacyQuery = legacyQuery.eq("organization_id", organizationId as never);
  }

  const { data: legacyData, error: legacyError } = await legacyQuery;

  if (legacyError) {
    throw legacyError;
  }

  return (
    (((legacyData as Array<
      Pick<
        SolicitudContactoRow,
        | "id"
        | "organization_id"
        | "nombre"
        | "empresa"
        | "correo"
        | "telefono"
        | "contacto"
        | "tipo_trabajo"
        | "mensaje"
        | "ayuda"
        | "contexto"
        | "estado"
        | "origen"
        | "creado_en"
        | "actualizado_en"
      >
    > | null) ?? []).map((row) => ({
      ...row,
      contactada_at: null,
    })) as Array<
      Pick<
        SolicitudContactoRow,
        | "id"
        | "organization_id"
        | "nombre"
        | "empresa"
        | "correo"
        | "telefono"
        | "contacto"
        | "tipo_trabajo"
        | "mensaje"
        | "ayuda"
        | "contexto"
        | "estado"
        | "origen"
        | "creado_en"
        | "actualizado_en"
        | "contactada_at"
      >
    >)
  ).map(mapSolicitudContactoResumen);
}

async function selectSolicitudesResumenPage(
  supabase: ReturnType<typeof createAdminClient>,
  options: SolicitudesResumenPageOptions,
  organizationId?: string | number
): Promise<SolicitudesResumenPageResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, Math.min(50, options.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const normalizedSearch = options.search?.trim() ?? "";

  type SolicitudesResumenFilterableQuery = {
    eq(column: string, value: never): SolicitudesResumenFilterableQuery;
    or?(filters: string): SolicitudesResumenFilterableQuery;
  };

  const applyFilters = <TQuery extends SolicitudesResumenFilterableQuery>(
    query: TQuery
  ): TQuery => {
    let nextQuery = query as TQuery;

    if (organizationId !== undefined) {
      nextQuery = nextQuery.eq("organization_id", organizationId as never) as TQuery;
    }

    if (options.estado) {
      nextQuery = nextQuery.eq("estado", options.estado as never) as TQuery;
    }

    if (normalizedSearch) {
      const safeSearch = normalizedSearch.replace(/,/g, " ").replace(/\./g, " ");
      nextQuery =
        (nextQuery.or?.(
          `nombre.ilike.%${safeSearch}%,empresa.ilike.%${safeSearch}%,contacto.ilike.%${safeSearch}%,tipo_trabajo.ilike.%${safeSearch}%`
        ) as TQuery | undefined) ?? nextQuery;
    }

    return nextQuery;
  };

  const query = applyFilters(
    supabase
      .from(TABLE_NAME as never)
      .select(SOLICITUD_RESUMEN_SELECT, { count: "exact" })
      .order("creado_en", { ascending: false })
      .range(from, to)
  );

  const { data, error, count } = await query;

  if (!error) {
    const rows =
      ((data as Array<
        Pick<
          SolicitudContactoRow,
          | "id"
          | "organization_id"
          | "nombre"
          | "empresa"
          | "correo"
          | "telefono"
          | "contacto"
          | "tipo_trabajo"
          | "mensaje"
          | "ayuda"
          | "contexto"
          | "estado"
          | "origen"
          | "creado_en"
          | "actualizado_en"
          | "contactada_at"
        >
      > | null) ?? []
    ).map(mapSolicitudContactoResumen);

    return {
      solicitudes: rows,
      totalCount: count ?? rows.length,
      hasMore: from + rows.length < (count ?? rows.length),
      page,
      pageSize,
    };
  }

  if (!isMissingContactadaAtError(error)) {
    throw error;
  }

  const legacyQuery = applyFilters(
    supabase
      .from(TABLE_NAME as never)
      .select(SOLICITUD_RESUMEN_SELECT_LEGACY, { count: "exact" })
      .order("creado_en", { ascending: false })
      .range(from, to)
  );

  const {
    data: legacyData,
    error: legacyError,
    count: legacyCount,
  } = await legacyQuery;

  if (legacyError) {
    throw legacyError;
  }

  const rows = (
    (((legacyData as Array<
      Pick<
        SolicitudContactoRow,
        | "id"
        | "organization_id"
        | "nombre"
        | "empresa"
        | "correo"
        | "telefono"
        | "contacto"
        | "tipo_trabajo"
        | "mensaje"
        | "ayuda"
        | "contexto"
        | "estado"
        | "origen"
        | "creado_en"
        | "actualizado_en"
      >
    > | null) ?? []).map((row) => ({
      ...row,
      contactada_at: null,
    })) as Array<
      Pick<
        SolicitudContactoRow,
        | "id"
        | "organization_id"
        | "nombre"
        | "empresa"
        | "correo"
        | "telefono"
        | "contacto"
        | "tipo_trabajo"
        | "mensaje"
        | "ayuda"
        | "contexto"
        | "estado"
        | "origen"
        | "creado_en"
        | "actualizado_en"
        | "contactada_at"
      >
    >)
  ).map(mapSolicitudContactoResumen);

  return {
    solicitudes: rows,
    totalCount: legacyCount ?? rows.length,
    hasMore: from + rows.length < (legacyCount ?? rows.length),
    page,
    pageSize,
  };
}

async function countSolicitudesBase(
  supabase: ReturnType<typeof createAdminClient>,
  options: {
    organizationId?: string | number;
    estado?: EstadoSolicitudContacto;
    createdFrom?: string;
  }
) {
  let query = supabase
    .from(TABLE_NAME as never)
    .select("id", { count: "exact", head: true });

  if (options.organizationId !== undefined) {
    query = query.eq("organization_id", options.organizationId as never);
  }

  if (options.estado) {
    query = query.eq("estado", options.estado as never);
  }

  if (options.createdFrom) {
    query = query.gte("creado_en", options.createdFrom);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function selectSolicitudesResumenGlobal(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId?: string | number
): Promise<SolicitudesResumenGlobal> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [total, hoy, nueva, contactada, cerrada, descartada] = await Promise.all([
    countSolicitudesBase(supabase, { organizationId }),
    countSolicitudesBase(supabase, { organizationId, createdFrom: todayIso }),
    countSolicitudesBase(supabase, { organizationId, estado: "nueva" }),
    countSolicitudesBase(supabase, { organizationId, estado: "contactada" }),
    countSolicitudesBase(supabase, { organizationId, estado: "cerrada" }),
    countSolicitudesBase(supabase, { organizationId, estado: "descartada" }),
  ]);

  return {
    total,
    hoy,
    counts: {
      nueva,
      contactada,
      cerrada,
      descartada,
    },
  };
}

export function createSolicitudesContactoRepository(
  deps: SolicitudesContactoRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createAdminClient();

  return {
    async listRecent() {
      return selectSolicitudes(supabase);
    },

    async listByOrganizationId(organizationId: string | number) {
      return selectSolicitudes(supabase, organizationId);
    },

    async listResumenByOrganizationId(organizationId: string | number) {
      return selectSolicitudesResumen(supabase, organizationId);
    },

    async listResumen() {
      return selectSolicitudesResumen(supabase);
    },

    async listResumenPageByOrganizationId(
      organizationId: string | number,
      options: SolicitudesResumenPageOptions
    ) {
      return selectSolicitudesResumenPage(supabase, options, organizationId);
    },

    async listResumenPage(options: SolicitudesResumenPageOptions) {
      return selectSolicitudesResumenPage(supabase, options);
    },

    async getResumenGlobalByOrganizationId(organizationId: string | number) {
      return selectSolicitudesResumenGlobal(supabase, organizationId);
    },

    async getResumenGlobal() {
      return selectSolicitudesResumenGlobal(supabase);
    },

    async getPublicConfigBySlug(slug: string) {
      const normalizedSlug = normalizePublicSlug(slug);

      if (!normalizedSlug) {
        return null;
      }

      const { data, error } = await supabase
        .from(ORGANIZATION_PROFILE_TABLE as never)
        .select(ORGANIZATION_PROFILE_PUBLIC_SELECT)
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
        .select(ORGANIZATION_PROFILE_PUBLIC_SELECT)
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

      return mapSolicitudEmpresaPublicaConfig(fallbackRow ?? null, normalizedSlug);
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
        .select(SOLICITUD_SELECT_LEGACY)
        .single();

      if (error) {
        throw error;
      }

      return mapSolicitudContacto({
        ...(data as SolicitudContactoRow),
        contactada_at: null,
      });
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
        .select(SOLICITUD_SELECT_LEGACY)
        .single();

      if (error) {
        throw error;
      }

      return mapSolicitudContacto({
        ...(data as SolicitudContactoRow),
        contactada_at: null,
      });
    },

    async updateStatusById(input: {
      id: string;
      estado: EstadoSolicitudContacto;
      organizationId: string | number;
    }) {
      const now = new Date().toISOString();
      const basePayload = {
        estado: input.estado,
        actualizado_en: now,
      } as Record<string, unknown>;

      if (input.estado === "contactada") {
        basePayload.contactada_at = now;
      } else if (input.estado === "nueva") {
        basePayload.contactada_at = null;
      }

      const query = supabase
        .from(TABLE_NAME as never)
        .update(basePayload as never)
        .eq("id", input.id as never)
        .eq("organization_id", input.organizationId as never);

      const { data, error } = await query.select(SOLICITUD_SELECT).single();

      if (!error) {
        return mapSolicitudContacto(data as SolicitudContactoRow);
      }

      if (!isMissingContactadaAtError(error)) {
        throw error;
      }

      const legacyPayload = {
        estado: input.estado,
        actualizado_en: now,
      };
      const legacyQuery = supabase
        .from(TABLE_NAME as never)
        .update(legacyPayload as never)
        .eq("id", input.id as never)
        .eq("organization_id", input.organizationId as never);

      const { data: legacyData, error: legacyError } = await legacyQuery
        .select(SOLICITUD_SELECT_LEGACY)
        .single();

      if (legacyError) {
        throw legacyError;
      }

      return mapSolicitudContacto({
        ...(legacyData as SolicitudContactoRow),
        contactada_at: input.estado === "contactada" ? now : null,
      });
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
  listResumenByOrganizationId(...args) {
    return getDefaultSolicitudesContactoRepository().listResumenByOrganizationId(
      ...args
    );
  },
  listResumen(...args) {
    return getDefaultSolicitudesContactoRepository().listResumen(...args);
  },
  listResumenPageByOrganizationId(...args) {
    return getDefaultSolicitudesContactoRepository().listResumenPageByOrganizationId(
      ...args
    );
  },
  listResumenPage(...args) {
    return getDefaultSolicitudesContactoRepository().listResumenPage(...args);
  },
  getResumenGlobalByOrganizationId(...args) {
    return getDefaultSolicitudesContactoRepository().getResumenGlobalByOrganizationId(
      ...args
    );
  },
  getResumenGlobal(...args) {
    return getDefaultSolicitudesContactoRepository().getResumenGlobal(...args);
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
