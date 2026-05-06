import {
  organizationProfileRepository,
  type OrganizationProfileRepository,
} from "@/features/organization-profile/repositories/organization-profile.repository";
import { normalizePreferredProvider } from "@/features/cotizaciones/services/component-suggestions.service";
import { normalizePricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { EntityId } from "@/types/common";
import type {
  OrganizationProfile,
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
  const labels: Record<string, string> = {
    "0": "Dom",
    "1": "Lun",
    "2": "Mar",
    "3": "Mie",
    "4": "Jue",
    "5": "Vie",
    "6": "Sab",
  };

  return normalizeDiasAtencion(days)
    .map((day) => labels[day] ?? day)
    .join(" · ");
}

export function isOrganizationOpenAtDate(input: {
  days: string[];
  from: string;
  to: string;
  date?: Date;
}) {
  const currentDate = input.date ?? new Date();
  const validDays = normalizeDiasAtencion(input.days);
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
  const dayMap: Record<string, string> = {
    Sun: "0",
    Mon: "1",
    Tue: "2",
    Wed: "3",
    Thu: "4",
    Fri: "5",
    Sat: "6",
  };
  const currentDay = dayMap[weekday] ?? "1";

  if (!validDays.includes(currentDay)) {
    return false;
  }

  const from = normalizeHorario(input.from, DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE);
  const to = normalizeHorario(input.to, DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA);

  return currentHourMinute >= from && currentHourMinute < to;
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

export function resolveOrganizationProfile(
  organizationId: EntityId | null,
  profile: OrganizationProfile | null
): OrganizationProfile {
  const empresaNombre = normalizeText(profile?.empresaNombre) || "Mi empresa";
  const solicitudPublicaSlug =
    normalizePublicRequestSlug(profile?.solicitudPublicaSlug) ||
    normalizePublicRequestSlug(empresaNombre) ||
    "mi-empresa";

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
    solicitudPublicaHorarioDesde: normalizeHorario(
      profile?.solicitudPublicaHorarioDesde,
      DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE
    ),
    solicitudPublicaHorarioHasta: normalizeHorario(
      profile?.solicitudPublicaHorarioHasta,
      DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA
    ),
    solicitudPublicaDiasAtencion: normalizeDiasAtencion(
      profile?.solicitudPublicaDiasAtencion
    ),
    proveedorPreferido: normalizePreferredProvider(profile?.proveedorPreferido),
    modoPrecioPreferido: normalizePricingMode(profile?.modoPrecioPreferido),
    margenDefecto: profile?.margenDefecto ?? 100,
    creadoEn: profile?.creadoEn ?? null,
    actualizadoEn: profile?.actualizadoEn ?? null,
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
          solicitudPublicaHorarioDesde: normalizeHorario(
            input.solicitudPublicaHorarioDesde,
            DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE
          ),
          solicitudPublicaHorarioHasta: normalizeHorario(
            input.solicitudPublicaHorarioHasta,
            DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA
          ),
          solicitudPublicaDiasAtencion: normalizeDiasAtencion(
            input.solicitudPublicaDiasAtencion
          ),
          proveedorPreferido: normalizePreferredProvider(input.proveedorPreferido),
          modoPrecioPreferido: normalizePricingMode(input.modoPrecioPreferido),
          margenDefecto: input.margenDefecto,
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
  };
}

export const organizationProfileService = createOrganizationProfileService();
