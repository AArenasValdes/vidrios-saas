import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  seedDefaultLineCatalog,
  type SeedDefaultLineCatalogResult,
  type SeedLineTemplateDeps,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import {
  isChileOrganizationCountry,
  normalizeOrganizationCountryCode,
} from "@/features/cotizaciones/line-templates/services/line-catalog-country";
import { seedStructuralDraftsServer } from "@/features/cotizaciones/line-templates/services/seed-structural-draft-server";
import { seedProfileReferencesServer } from "@/features/cotizaciones/line-templates/services/seed-profile-references-server";

async function fetchOrganizationCountryCodeServer(
  organizationId: number | string,
  admin: SupabaseClient
): Promise<string | null> {
  const { data, error } = await admin
    .from("organization_profile")
    .select("country_code")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.warn(
      "[seedDefaultLineCatalogServer] no se pudo leer country_code",
      organizationId,
      error
    );
    return null;
  }

  return normalizeOrganizationCountryCode(data?.country_code);
}

/**
 * Seed server-side con service_role. Seguro para llamar tras provisionar una org.
 * Solo sembra el catálogo base de Chile cuando organization_profile.country_code = CL.
 */
export async function seedDefaultLineCatalogServer(
  organizationId: number | string,
  deps?: { admin?: SupabaseClient }
): Promise<SeedDefaultLineCatalogResult> {
  const admin = deps?.admin ?? createAdminClient();
  const countryCode = await fetchOrganizationCountryCodeServer(organizationId, admin);

  const seedDeps: SeedLineTemplateDeps = {
    async listAllTemplates(orgId) {
      const { data, error } = await admin
        .from("cotizacion_line_templates")
        .select("catalog_key")
        .eq("organization_id", orgId)
        .is("eliminado_en", null);

      if (error) {
        if (error.message?.toLowerCase().includes("catalog_key")) {
          return [];
        }
        throw error;
      }

      return (data ?? []) as Array<{ catalog_key?: string | null }>;
    },

    async insertTemplate(payload) {
      const { error } = await admin
        .from("cotizacion_line_templates")
        .insert(payload);

      if (error) {
        throw error;
      }
    },
  };

  try {
    const result = await seedDefaultLineCatalog(organizationId, seedDeps, {
      countryCode,
    });

    if (isChileOrganizationCountry(countryCode)) {
      await seedStructuralDraftsServer(organizationId, { admin }).catch(() => undefined);
      await seedProfileReferencesServer(organizationId, { admin }).catch(() => undefined);
    }

    return result;
  } catch (err) {
    console.warn("[seedDefaultLineCatalogServer] failed for org", organizationId, err);
    return { seeded: 0, skipped: 0, status: "blocked_missing_country" };
  }
}
