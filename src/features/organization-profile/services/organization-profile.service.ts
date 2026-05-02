import {
  organizationProfileRepository,
  type OrganizationProfileRepository,
} from "@/features/organization-profile/repositories/organization-profile.repository";
import { normalizePreferredProvider } from "@/features/cotizaciones/services/component-suggestions.service";
import type { EntityId } from "@/types/common";
import type {
  OrganizationProfile,
  UpdateOrganizationProfileInput,
} from "@/features/organization-profile/types/organization-profile";
import { normalizePricingMode } from "@/features/cotizaciones/types/pricing-mode";

type OrganizationProfileServiceDeps = {
  organizationProfileRepository?: OrganizationProfileRepository;
};

export const DEFAULT_ORGANIZATION_BRAND_COLOR = "#1a3a5c";
export const DEFAULT_SOLICITUD_PUBLICA_VALOR =
  "Recibe una respuesta comercial inicial, orientación del trabajo y una base para tu cotización.";
export const DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD =
  "Tus datos se usan solo para esta solicitud y no se comparten fuera de la empresa.";

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
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

  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");

  return initials.join("");
}

export function hexToRgbChannels(hex: string) {
  const normalized = sanitizeBrandColor(hex).replace("#", "");

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
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
    solicitudPublicaValor:
      normalizeText(profile?.solicitudPublicaValor) ||
      DEFAULT_SOLICITUD_PUBLICA_VALOR,
    solicitudPublicaPrivacidad:
      normalizeText(profile?.solicitudPublicaPrivacidad) ||
      DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD,
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
          solicitudPublicaValor: normalizeText(input.solicitudPublicaValor),
          solicitudPublicaPrivacidad: normalizeText(input.solicitudPublicaPrivacidad),
          proveedorPreferido: normalizePreferredProvider(input.proveedorPreferido),
          modoPrecioPreferido: normalizePricingMode(input.modoPrecioPreferido),
          margenDefecto: input.margenDefecto,
        });

        return resolveOrganizationProfile(organizationId, persisted);
      } catch (error) {
        if (isDuplicatePublicRequestSlugError(error)) {
          throw new Error("Ese slug público ya está ocupado por otra empresa.");
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
