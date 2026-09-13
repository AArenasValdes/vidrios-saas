import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import {
  LINE_PROFILE_REFERENCE_SEED_VERSION,
  parseLineTemplateWorkshopProfiles,
} from "@/features/cotizaciones/line-templates/types/line-profile-references";

export type LineTemplateProfileSeedRow = {
  id: number | string;
  catalog_key?: string | null;
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
  }) => Promise<void>;
};

function shouldSeedProfileReferences(
  row: LineTemplateProfileSeedRow
): boolean {
  const existing = parseLineTemplateWorkshopProfiles(
    row.catalog_metadata?.workshopProfiles
  );

  if (!existing) return true;
  return existing.seedVersion < LINE_PROFILE_REFERENCE_SEED_VERSION;
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
    if (!shouldSeedProfileReferences(line) && !identityPatch) {
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
