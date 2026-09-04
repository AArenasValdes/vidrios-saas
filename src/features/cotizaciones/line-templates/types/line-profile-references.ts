import type { CotizacionLineTemplateCatalogMetadata } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export const LINE_PROFILE_REFERENCE_SEED_VERSION = 1;

export const PROFILE_REFERENCE_SOURCES = {
  SODAL_CATALOG: "https://sodal.cl/catalogos/",
  SODAL_RPT_PDF:
    "https://sodal.cl/wp-content/uploads/2024/03/SODAL_RPT_WEB_2024.pdf",
  PERFILES_CHILE: "https://perfileschile.cl/",
} as const;

export type LineProfileReferenceCodeStatus =
  | "catalog_reference"
  | "pending_validation"
  | "visual_reference";

export type LineProfileReference = {
  code: string | null;
  name: string;
  role: string;
  description: string | null;
  provider: string | null;
  source: string | null;
  codeStatus: LineProfileReferenceCodeStatus;
};

export type LineTemplateWorkshopProfiles = {
  seedVersion: number;
  profiles: LineProfileReference[];
};

export const LINE_PROFILE_REFERENCES_DISCLAIMER =
  "Estas referencias son informativas. La pauta de corte se configura por separado.";

function isMetadataRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLineProfileReference(value: unknown): value is LineProfileReference {
  if (!isMetadataRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.role === "string" &&
    (value.code === null || typeof value.code === "string") &&
    (value.codeStatus === "catalog_reference" ||
      value.codeStatus === "pending_validation" ||
      value.codeStatus === "visual_reference")
  );
}

export function parseLineTemplateWorkshopProfiles(
  raw: unknown
): LineTemplateWorkshopProfiles | null {
  if (!isMetadataRecord(raw)) return null;

  const profiles = Array.isArray(raw.profiles)
    ? raw.profiles.filter(isLineProfileReference)
    : [];

  if (profiles.length === 0) return null;

  const seedVersion =
    typeof raw.seedVersion === "number" && Number.isFinite(raw.seedVersion)
      ? raw.seedVersion
      : 0;

  return { seedVersion, profiles };
}

export function getLineTemplateWorkshopProfiles(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined
): LineTemplateWorkshopProfiles | null {
  return parseLineTemplateWorkshopProfiles(metadata?.workshopProfiles);
}

export function formatLineProfileReferenceCode(
  profile: LineProfileReference
): string {
  const code = profile.code?.trim();
  if (code) return code;
  return "Pendiente de validar";
}

export function formatLineProfileReferenceStatus(
  profile: LineProfileReference
): string {
  if (profile.codeStatus === "pending_validation") {
    return "Pendiente de validar";
  }
  if (profile.codeStatus === "visual_reference") {
    return "Código referencial";
  }
  return "Código referencial";
}

export function buildWorkshopProfilesPayload(
  profiles: LineProfileReference[]
): LineTemplateWorkshopProfiles {
  return {
    seedVersion: LINE_PROFILE_REFERENCE_SEED_VERSION,
    profiles,
  };
}

export function summarizeLineProfileReferences(
  profiles: LineProfileReference[]
): {
  total: number;
  withCode: number;
  pending: number;
} {
  const total = profiles.length;
  const withCode = profiles.filter((profile) => Boolean(profile.code?.trim())).length;
  return {
    total,
    withCode,
    pending: total - withCode,
  };
}

export function formatLineProfileReferenceRowStatus(
  profile: LineProfileReference
): string {
  if (profile.codeStatus === "pending_validation" || !profile.code?.trim()) {
    return "Pendiente";
  }
  return "Código referencial";
}
