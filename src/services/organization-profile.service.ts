import {
  organizationProfileRepository,
  type OrganizationProfileRepository,
} from "@/repositories/organization-profile.repository";
import type { EntityId } from "@/types/common";
import type {
  OrganizationProfile,
  UpdateOrganizationProfileInput,
} from "@/types/organization-profile";

type OrganizationProfileServiceDeps = {
  organizationProfileRepository?: OrganizationProfileRepository;
};

export const DEFAULT_ORGANIZATION_BRAND_COLOR = "#1a3a5c";

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
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

  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");

  return initials.join("");
}

export function hexToRgbChannels(hex: string) {
  const normalized = sanitizeBrandColor(hex).replace("#", "");

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
}

export function resolveOrganizationProfile(
  organizationId: EntityId | null,
  profile: OrganizationProfile | null
): OrganizationProfile {
  return {
    organizationId,
    empresaNombre: normalizeText(profile?.empresaNombre) || "Mi empresa",
    empresaLogoUrl: profile?.empresaLogoUrl ?? null,
    empresaDireccion: normalizeText(profile?.empresaDireccion),
    empresaTelefono: normalizeText(profile?.empresaTelefono),
    empresaEmail: normalizeText(profile?.empresaEmail),
    brandColor: sanitizeBrandColor(profile?.brandColor),
    formaPago: normalizeText(profile?.formaPago),
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

      const persisted = await repository.upsertByOrganizationId(organizationId, {
        empresaNombre,
        empresaLogoUrl: input.empresaLogoUrl,
        empresaDireccion: normalizeText(input.empresaDireccion),
        empresaTelefono: normalizeText(input.empresaTelefono),
        empresaEmail,
        brandColor: sanitizeBrandColor(input.brandColor),
        formaPago: normalizeText(input.formaPago),
      });

      return resolveOrganizationProfile(organizationId, persisted);
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
