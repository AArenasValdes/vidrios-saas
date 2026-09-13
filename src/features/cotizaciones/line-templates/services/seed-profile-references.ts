import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import {
  LINE_PROFILE_REFERENCE_SEED_VERSION,
  parseLineTemplateWorkshopProfiles,
} from "@/features/cotizaciones/line-templates/types/line-profile-references";

export type LineTemplateProfileSeedRow = {
  id: number | string;
  catalog_key?: string | null;
  vidrio_principal_recomendado?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
};

export type SeedProfileReferencesDeps = {
  listVentoraLineTemplates: (
    organizationId: string | number
  ) => Promise<LineTemplateProfileSeedRow[]>;
  updateLineTemplateMetadata: (input: {
    id: number | string;
    organizationId: string | number;
    catalogMetadata: Record<string, unknown>;
    vidrioPrincipalRecomendado?: string | null;
  }) => Promise<void>;
};

const DEFAULT_MONOLITHIC_GLASS_RECOMMENDATION = "Incoloro monolítico 4mm";

function shouldSeedProfileReferences(
  row: LineTemplateProfileSeedRow
): boolean {
  const existing = parseLineTemplateWorkshopProfiles(
    row.catalog_metadata?.workshopProfiles
  );

  if (!existing) return true;
  return existing.seedVersion < LINE_PROFILE_REFERENCE_SEED_VERSION;
}

function getGlassRecommendationPatch(
  row: LineTemplateProfileSeedRow
): string | null | undefined {
  const recommendation =
    row.catalog_key === "ventora:serie-3200-puerta-abatible-1h" ||
    row.catalog_key === "ventora:l42" ||
    row.catalog_key === "ventora:serie-42-proyectante-camara" ||
    row.catalog_key === "ventora:serie-42-proyectante-sin-camara" ||
    row.catalog_key === "ventora:s33-corredera-2h"
      ? DEFAULT_MONOLITHIC_GLASS_RECOMMENDATION
      : row.catalog_key === "ventora:s33-rpt-corredera-2h"
        ? "DVH 4+12+4"
        : undefined;

  if (!recommendation) return undefined;
  return row.vidrio_principal_recomendado?.trim() === recommendation
    ? undefined
    : recommendation;
}

function getLegacyLineIdentityPatch(
  row: LineTemplateProfileSeedRow
): Record<string, string> | null {
  const metadata = row.catalog_metadata ?? {};
  const configuration =
    typeof metadata.lineConfiguration === "string"
      ? metadata.lineConfiguration.trim().toLowerCase()
      : "";

  if (
    row.catalog_key === "ventora:s33-corredera-2h" &&
    (configuration !== "s-33 normal / reforzada / tp · corredera 2 hojas" ||
      metadata.lineSystem !== "S-33" ||
      metadata.structuralArchetypeId !== "corredera_2h")
  ) {
    return {
      lineConfiguration: "S-33 Normal / Reforzada / TP · Corredera 2 hojas",
      lineSystem: "S-33",
      structuralArchetypeId: "corredera_2h",
    };
  }

  if (
    row.catalog_key === "ventora:s33-rpt-corredera-2h" &&
    (configuration !== "s-33 rpt · corredera 2 hojas" ||
      metadata.lineSystem !== "S-33" ||
      metadata.structuralArchetypeId !== "corredera_2h")
  ) {
    return {
      lineConfiguration: "S-33 RPT · Corredera 2 hojas",
      lineSystem: "S-33",
      structuralArchetypeId: "corredera_2h",
    };
  }

  if (
    row.catalog_key === "ventora:l42" &&
    (configuration !== "al-42 normal · proyectante / paño fijo" ||
      metadata.lineSystem !== "AL-42" ||
      metadata.structuralArchetypeId !== "proyectante")
  ) {
    return {
      lineConfiguration: "AL-42 normal · Proyectante / paño fijo",
      lineSystem: "AL-42",
      structuralArchetypeId: "proyectante",
    };
  }

  if (
    row.catalog_key === "ventora:serie-42-proyectante-camara" &&
    (configuration !== "al-42 con cámara · proyectante" ||
      metadata.lineSystem !== "AL-42" ||
      metadata.structuralArchetypeId !== "proyectante")
  ) {
    return {
      lineConfiguration: "AL-42 con cámara · Proyectante",
      lineSystem: "AL-42",
      structuralArchetypeId: "proyectante",
    };
  }

  if (
    row.catalog_key === "ventora:serie-42-proyectante-sin-camara" &&
    (configuration !== "al-42 sin cámara · proyectante" ||
      metadata.lineSystem !== "AL-42" ||
      metadata.structuralArchetypeId !== "proyectante")
  ) {
    return {
      lineConfiguration: "AL-42 sin cámara · Proyectante",
      lineSystem: "AL-42",
      structuralArchetypeId: "proyectante",
    };
  }

  if (
    row.catalog_key === "ventora:l32" &&
    configuration === "corredera 2 hojas"
  ) {
    return {
      lineConfiguration: "Proyectante",
      lineSystem: "AL-32",
      structuralArchetypeId: "proyectante",
    };
  }

  if (
    row.catalog_key === "ventora:l42" &&
    configuration === "corredera 2 hojas"
  ) {
    return {
      lineConfiguration: "Proyectante / paño fijo",
      lineSystem: "AL-42",
      structuralArchetypeId: "proyectante",
    };
  }

  return null;
}

/**
 * Rellena referencias de perfiles en catalog_metadata.workshopProfiles.
 * Idempotente: no sobrescribe versiones actuales ni líneas privadas.
 */
export async function seedProfileReferencesForOrganization(
  organizationId: string | number,
  deps: SeedProfileReferencesDeps
): Promise<{ seeded: number; skipped: number }> {
  const templates = await deps.listVentoraLineTemplates(organizationId);
  const ventoraLines = templates.filter((row) =>
    isVentoraCatalogKey(row.catalog_key)
  );

  if (ventoraLines.length === 0) {
    return { seeded: 0, skipped: 0 };
  }

  let seeded = 0;
  let skipped = 0;

  for (const line of ventoraLines) {
    const identityPatch = getLegacyLineIdentityPatch(line);
    const glassRecommendationPatch = getGlassRecommendationPatch(line);
    if (!shouldSeedProfileReferences(line) && !identityPatch && !glassRecommendationPatch) {
      skipped += 1;
      continue;
    }

    const workshopProfiles = getVentoraProfileReferencesForCatalogKey(
      line.catalog_key
    );

    if (!workshopProfiles) {
      skipped += 1;
      continue;
    }

    const currentMetadata =
      line.catalog_metadata && typeof line.catalog_metadata === "object"
        ? { ...line.catalog_metadata }
        : {};

    try {
      await deps.updateLineTemplateMetadata({
        id: line.id,
        organizationId,
        catalogMetadata: {
          ...currentMetadata,
          ...(identityPatch ?? {}),
          workshopProfiles,
        },
        vidrioPrincipalRecomendado: glassRecommendationPatch,
      });
      seeded += 1;
    } catch (error) {
      console.warn(
        "[seedProfileReferencesForOrganization] update failed",
        line.catalog_key,
        error
      );
      skipped += 1;
    }
  }

  return { seeded, skipped };
}
