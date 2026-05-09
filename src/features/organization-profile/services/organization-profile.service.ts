import {
  organizationProfileRepository,
  type OrganizationProfileRepository,
} from "@/features/organization-profile/repositories/organization-profile.repository";
import { normalizePreferredProvider } from "@/features/cotizaciones/services/component-suggestions.service";
import { normalizePricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { EntityId } from "@/types/common";
import type {
  HeroMode,
  OrganizationProfile,
  PublicScheduleDay,
  SolicitudPublicaHorarioDia,
  UpdateOrganizationProfileInput,
} from "@/features/organization-profile/types/organization-profile";

type OrganizationProfileServiceDeps = {
  organizationProfileRepository?: OrganizationProfileRepository;
};

export const DEFAULT_ORGANIZATION_BRAND_COLOR = "#1a3a5c";
export const DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA =
  "Especialistas en vidrios y aluminio. Cuentanos que necesitas y te respondemos por WhatsApp.";
export const DEFAULT_SOLICITUD_PUBLICA_VALOR =
  "Recibe una respuesta comercial inicial, orientacion del trabajo y una base para tu cotizacion.";
export const DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA =
  "Tu solicitud queda registrada al instante para que no se pierda, incluso si estamos ocupados.";
export const DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD =
  "Tus datos se usan solo para esta solicitud y no se comparten fuera de la empresa.";
export const DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE = "09:00";
export const DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA = "19:00";
export const DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
] as const;
export const PUBLIC_SCHEDULE_DAY_ORDER: PublicScheduleDay[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "0",
];
export const DEFAULT_SECONDARY_COLOR = "#25d366";
export const DEFAULT_HERO_TITLE = "Cotiza vidrios y aluminio en menos de 1 minuto";
export const DEFAULT_FORM_TITLE = "Deja tu solicitud";
export const DEFAULT_FORM_SUBTITLE =
  "Cuentanos que necesitas y te contactamos por WhatsApp";

const PUBLIC_SCHEDULE_DAY_LABELS: Record<PublicScheduleDay, string> = {
  "0": "Dom",
  "1": "Lun",
  "2": "Mar",
  "3": "Mie",
  "4": "Jue",
  "5": "Vie",
  "6": "Sab",
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeHorario(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "").trim();

  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeDiasAtencion(value: string[] | null | undefined) {
  const normalized = Array.from(
    new Set(
      (value ?? [])
        .map((entry) => entry.trim())
        .filter((entry) => /^[0-6]$/.test(entry))
    )
  ).sort((left, right) => Number(left) - Number(right));

  if (normalized.length === 0) {
    return [...DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION];
  }

  return normalized;
}

export function buildDefaultSolicitudPublicaHorarioPorDia(input?: {
  days?: string[] | null;
  from?: string | null;
  to?: string | null;
}) {
  const enabledDays = new Set(
    normalizeDiasAtencion(input?.days ?? [...DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION])
  );
  const from = normalizeHorario(
    input?.from,
    DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE
  );
  const to = normalizeHorario(input?.to, DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA);

  return PUBLIC_SCHEDULE_DAY_ORDER.map((day) => ({
    day,
    enabled: enabledDays.has(day),
    from,
    to,
  }));
}

export function normalizeHorarioPorDia(
  value: SolicitudPublicaHorarioDia[] | null | undefined,
  fallback?: {
    days?: string[] | null;
    from?: string | null;
    to?: string | null;
  }
) {
  const baseSchedule = buildDefaultSolicitudPublicaHorarioPorDia(fallback);
  const customMap = new Map(
    (value ?? [])
      .filter((entry): entry is SolicitudPublicaHorarioDia => Boolean(entry?.day))
      .map((entry) => [entry.day, entry])
  );

  return PUBLIC_SCHEDULE_DAY_ORDER.map((day) => {
    const fallbackEntry = baseSchedule.find((entry) => entry.day === day)!;
    const customEntry = customMap.get(day);

    if (!customEntry) {
      return fallbackEntry;
    }

    return {
      day,
      enabled: Boolean(customEntry.enabled),
      from: normalizeHorario(customEntry.from, fallbackEntry.from),
      to: normalizeHorario(customEntry.to, fallbackEntry.to),
    };
  });
}

export function extractLegacyHorarioFields(schedule: SolicitudPublicaHorarioDia[]) {
  const normalized = normalizeHorarioPorDia(schedule);
  const enabledEntries = normalized.filter((entry) => entry.enabled);
  const fallbackEntry = enabledEntries[0] ?? normalized[0];

  return {
    solicitudPublicaHorarioDesde:
      fallbackEntry?.from ?? DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE,
    solicitudPublicaHorarioHasta:
      fallbackEntry?.to ?? DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA,
    solicitudPublicaDiasAtencion: enabledEntries.map((entry) => entry.day),
  };
}

export function normalizePublicRequestSlug(value: string | null | undefined) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized.slice(0, 48);
}

export function sanitizeBrandColor(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toLowerCase();
  }

  return DEFAULT_ORGANIZATION_BRAND_COLOR;
}

export function buildOrganizationInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "ME";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function hexToRgbChannels(hex: string) {
  const normalized = sanitizeBrandColor(hex).replace("#", "");

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
}

export function formatDiasAtencionLabel(days: string[]) {
  return normalizeDiasAtencion(days)
    .map((day) => PUBLIC_SCHEDULE_DAY_LABELS[day as PublicScheduleDay] ?? day)
    .join(" · ");
}

function buildDayRangeLabel(days: PublicScheduleDay[]) {
  if (days.length === 0) {
    return "";
  }

  if (days.length === 1) {
    return PUBLIC_SCHEDULE_DAY_LABELS[days[0]];
  }

  return `${PUBLIC_SCHEDULE_DAY_LABELS[days[0]]}-${PUBLIC_SCHEDULE_DAY_LABELS[days.at(-1)!]}`;
}

export function formatHorarioPorDiaLabel(schedule: SolicitudPublicaHorarioDia[]) {
  const enabledEntries = normalizeHorarioPorDia(schedule).filter((entry) => entry.enabled);

  if (enabledEntries.length === 0) {
    return "Sin horario visible";
  }

  const groups: Array<{ days: PublicScheduleDay[]; from: string; to: string }> = [];

  enabledEntries.forEach((entry) => {
    const lastGroup = groups.at(-1);

    if (
      lastGroup &&
      lastGroup.from === entry.from &&
      lastGroup.to === entry.to &&
      PUBLIC_SCHEDULE_DAY_ORDER.indexOf(entry.day) ===
        PUBLIC_SCHEDULE_DAY_ORDER.indexOf(lastGroup.days.at(-1)!) + 1
    ) {
      lastGroup.days.push(entry.day);
      return;
    }

    groups.push({
      days: [entry.day],
      from: entry.from,
      to: entry.to,
    });
  });

  return groups
    .map((group) => `${buildDayRangeLabel(group.days)} ${group.from}-${group.to}`)
    .join(" · ");
}

export function isOrganizationOpenAtDate(input: {
  schedule?: SolicitudPublicaHorarioDia[] | null;
  days?: string[];
  from?: string;
  to?: string;
  date?: Date;
}) {
  const currentDate = input.date ?? new Date();
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    weekday: "short",
  }).format(currentDate);
  const currentHourMinute = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(currentDate);
  const dayMap: Record<string, PublicScheduleDay> = {
    Sun: "0",
    Mon: "1",
    Tue: "2",
    Wed: "3",
    Thu: "4",
    Fri: "5",
    Sat: "6",
  };
  const currentDay = dayMap[weekday] ?? "1";
  const schedule = input.schedule?.length
    ? normalizeHorarioPorDia(input.schedule, {
        days: input.days,
        from: input.from,
        to: input.to,
      })
    : buildDefaultSolicitudPublicaHorarioPorDia({
        days: input.days,
        from: input.from,
        to: input.to,
      });
  const currentSchedule = schedule.find((entry) => entry.day === currentDay);

  if (!currentSchedule?.enabled) {
    return false;
  }

  return (
    currentHourMinute >= currentSchedule.from &&
    currentHourMinute < currentSchedule.to
  );
}

function isDuplicatePublicRequestSlugError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const haystack = [candidate.code, candidate.message, candidate.details]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("organization_profile_solicitud_publica_slug_uidx") ||
    (haystack.includes("solicitud_publica_slug") && haystack.includes("duplicate"))
  );
}

function normalizeHeroMode(value: string | null | undefined): HeroMode {
  if (value === "image") return "image";
  return "gradient";
}

function sanitizeSecondaryColor(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toLowerCase();
  }

  return DEFAULT_SECONDARY_COLOR;
}

export function resolveOrganizationProfile(
  organizationId: EntityId | null,
  profile: OrganizationProfile | null
): OrganizationProfile {
  const empresaNombre = normalizeText(profile?.empresaNombre) || "Mi empresa";
  const solicitudPublicaSlug =
    normalizePublicRequestSlug(profile?.solicitudPublicaSlug) ||
    normalizePublicRequestSlug(empresaNombre) ||
    "mi-empresa";
  const solicitudPublicaHorarioPorDia = normalizeHorarioPorDia(
    profile?.solicitudPublicaHorarioPorDia,
    {
      days: profile?.solicitudPublicaDiasAtencion,
      from: profile?.solicitudPublicaHorarioDesde,
      to: profile?.solicitudPublicaHorarioHasta,
    }
  );
  const legacyHorario = extractLegacyHorarioFields(solicitudPublicaHorarioPorDia);

  return {
    organizationId,
    empresaNombre,
    empresaLogoUrl: profile?.empresaLogoUrl ?? null,
    empresaDireccion: normalizeText(profile?.empresaDireccion),
    empresaTelefono: normalizeText(profile?.empresaTelefono),
    empresaEmail: normalizeText(profile?.empresaEmail),
    brandColor: sanitizeBrandColor(profile?.brandColor),
    formaPago: normalizeText(profile?.formaPago),
    solicitudPublicaSlug,
    solicitudPublicaDescripcionCorta:
      normalizeText(profile?.solicitudPublicaDescripcionCorta) ||
      DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
    solicitudPublicaValor:
      normalizeText(profile?.solicitudPublicaValor) ||
      DEFAULT_SOLICITUD_PUBLICA_VALOR,
    solicitudPublicaMensajeConfianza:
      normalizeText(profile?.solicitudPublicaMensajeConfianza) ||
      DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
    solicitudPublicaPrivacidad:
      normalizeText(profile?.solicitudPublicaPrivacidad) ||
      DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD,
    solicitudPublicaHorarioDesde: legacyHorario.solicitudPublicaHorarioDesde,
    solicitudPublicaHorarioHasta: legacyHorario.solicitudPublicaHorarioHasta,
    solicitudPublicaDiasAtencion: legacyHorario.solicitudPublicaDiasAtencion,
    solicitudPublicaHorarioPorDia,
    proveedorPreferido: normalizePreferredProvider(profile?.proveedorPreferido),
    modoPrecioPreferido: normalizePricingMode(profile?.modoPrecioPreferido),
    margenDefecto: profile?.margenDefecto ?? 100,
    creadoEn: profile?.creadoEn ?? null,
    actualizadoEn: profile?.actualizadoEn ?? null,
    publicName: normalizeText(profile?.publicName) || empresaNombre,
    publicSubtitle: normalizeText(profile?.publicSubtitle),
    publicZone: normalizeText(profile?.publicZone),
    publicBusinessType: normalizeText(profile?.publicBusinessType),
    secondaryColor: sanitizeSecondaryColor(profile?.secondaryColor),
    heroMode: normalizeHeroMode(profile?.heroMode),
    heroImageUrl: profile?.heroImageUrl ?? null,
    heroTitle: normalizeText(profile?.heroTitle) || DEFAULT_HERO_TITLE,
    heroSubtitle: normalizeText(profile?.heroSubtitle),
    showGallery: profile?.showGallery ?? true,
    showSchedule: profile?.showSchedule ?? true,
    showRating: profile?.showRating ?? false,
    ratingLabel: normalizeText(profile?.ratingLabel),
    jobsCountLabel: normalizeText(profile?.jobsCountLabel),
    formTitle: normalizeText(profile?.formTitle) || DEFAULT_FORM_TITLE,
    formSubtitle: normalizeText(profile?.formSubtitle) || DEFAULT_FORM_SUBTITLE,
    isPublished: profile?.isPublished ?? false,
  };
}

export function createOrganizationProfileService(
  deps: OrganizationProfileServiceDeps = {}
) {
  const repository =
    deps.organizationProfileRepository ?? organizationProfileRepository;

  return {
    async getByOrganizationId(organizationId: EntityId) {
      const profile = await repository.getByOrganizationId(organizationId);
      return resolveOrganizationProfile(organizationId, profile);
    },

    async updateByOrganizationId(
      organizationId: EntityId,
      input: UpdateOrganizationProfileInput
    ) {
      const empresaNombre = normalizeText(input.empresaNombre);

      if (!empresaNombre) {
        throw new Error("El nombre de la empresa es obligatorio");
      }

      const empresaEmail = normalizeText(input.empresaEmail).toLowerCase();

      if (empresaEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empresaEmail)) {
        throw new Error("El correo de la empresa no es valido");
      }

      const solicitudPublicaSlug =
        normalizePublicRequestSlug(input.solicitudPublicaSlug) ||
        normalizePublicRequestSlug(empresaNombre) ||
        "mi-empresa";
      const solicitudPublicaHorarioPorDia = normalizeHorarioPorDia(
        input.solicitudPublicaHorarioPorDia,
        {
          days: input.solicitudPublicaDiasAtencion,
          from: input.solicitudPublicaHorarioDesde,
          to: input.solicitudPublicaHorarioHasta,
        }
      );
      const legacyHorario = extractLegacyHorarioFields(solicitudPublicaHorarioPorDia);

      try {
        const persisted = await repository.upsertByOrganizationId(organizationId, {
          empresaNombre,
          empresaLogoUrl: input.empresaLogoUrl,
          empresaDireccion: normalizeText(input.empresaDireccion),
          empresaTelefono: normalizeText(input.empresaTelefono),
          empresaEmail,
          brandColor: sanitizeBrandColor(input.brandColor),
          formaPago: normalizeText(input.formaPago),
          solicitudPublicaSlug,
          solicitudPublicaDescripcionCorta: normalizeText(
            input.solicitudPublicaDescripcionCorta
          ),
          solicitudPublicaValor: normalizeText(input.solicitudPublicaValor),
          solicitudPublicaMensajeConfianza: normalizeText(
            input.solicitudPublicaMensajeConfianza
          ),
          solicitudPublicaPrivacidad: normalizeText(input.solicitudPublicaPrivacidad),
          solicitudPublicaHorarioDesde: legacyHorario.solicitudPublicaHorarioDesde,
          solicitudPublicaHorarioHasta: legacyHorario.solicitudPublicaHorarioHasta,
          solicitudPublicaDiasAtencion: legacyHorario.solicitudPublicaDiasAtencion,
          solicitudPublicaHorarioPorDia,
          proveedorPreferido: normalizePreferredProvider(input.proveedorPreferido),
          modoPrecioPreferido: normalizePricingMode(input.modoPrecioPreferido),
          margenDefecto: input.margenDefecto,
          publicName: normalizeText(input.publicName),
          publicSubtitle: normalizeText(input.publicSubtitle),
          publicZone: normalizeText(input.publicZone),
          publicBusinessType: normalizeText(input.publicBusinessType),
          secondaryColor: sanitizeSecondaryColor(input.secondaryColor),
          heroMode: normalizeHeroMode(input.heroMode),
          heroImageUrl: input.heroImageUrl,
          heroTitle: normalizeText(input.heroTitle),
          heroSubtitle: normalizeText(input.heroSubtitle),
          showGallery: input.showGallery,
          showSchedule: input.showSchedule,
          showRating: input.showRating,
          ratingLabel: normalizeText(input.ratingLabel),
          jobsCountLabel: normalizeText(input.jobsCountLabel),
          formTitle: normalizeText(input.formTitle),
          formSubtitle: normalizeText(input.formSubtitle),
          isPublished: input.isPublished,
        });

        return resolveOrganizationProfile(organizationId, persisted);
      } catch (error) {
        if (isDuplicatePublicRequestSlugError(error)) {
          throw new Error("Ese slug publico ya esta ocupado por otra empresa.");
        }

        throw error;
      }
    },

    async uploadLogo(organizationId: EntityId, file: File) {
      if (!file.type.startsWith("image/")) {
        throw new Error("El logo debe ser una imagen");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("El logo no puede pesar mas de 5 MB");
      }

      return repository.uploadLogo(organizationId, file);
    },

    async uploadHeroImage(organizationId: EntityId, file: File) {
      return repository.uploadHeroImage(organizationId, file);
    },
  };
}

export const organizationProfileService = createOrganizationProfileService();
