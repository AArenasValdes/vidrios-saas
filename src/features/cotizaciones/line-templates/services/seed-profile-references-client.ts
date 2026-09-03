import { createClient } from "@/lib/supabase/client";
import {
  seedProfileReferencesForOrganization,
  type SeedProfileReferencesDeps,
} from "@/features/cotizaciones/line-templates/services/seed-profile-references";
import { fetchOrganizationCountryCodeClient } from "@/features/cotizaciones/line-templates/services/fetch-organization-country-code-client";
import { isChileOrganizationCountry } from "@/features/cotizaciones/line-templates/services/line-catalog-country";

const seededProfileReferenceOrgs = new Set<string>();

/** Rellena referencias de perfiles faltantes. Una vez por org y sesión. Solo organizaciones CL. */
export async function ensureProfileReferencesClient(
  organizationId: string | number
): Promise<boolean> {
  const key = String(organizationId);
  if (seededProfileReferenceOrgs.has(key)) return false;

  const countryCode = await fetchOrganizationCountryCodeClient(organizationId);
  if (!isChileOrganizationCountry(countryCode)) {
    seededProfileReferenceOrgs.add(key);
    return false;
  }

  seededProfileReferenceOrgs.add(key);

  const supabase = createClient();

  const seedDeps: SeedProfileReferencesDeps = {
    async listVentoraLineTemplates(orgId) {
      const { data, error } = await supabase
        .from("cotizacion_line_templates")
        .select("id, catalog_key, catalog_metadata")
        .eq("organization_id", orgId)
        .is("eliminado_en", null)
        .not("catalog_key", "is", null);

      if (error) throw error;
      return data ?? [];
    },

    async updateLineTemplateMetadata({ id, organizationId: orgId, catalogMetadata }) {
      const { error } = await supabase
        .from("cotizacion_line_templates")
        .update({ catalog_metadata: catalogMetadata })
        .eq("id", id)
        .eq("organization_id", orgId)
        .is("eliminado_en", null);

      if (error) throw error;
    },
  };

  try {
    const result = await seedProfileReferencesForOrganization(
      organizationId,
      seedDeps
    );
    return result.seeded > 0;
  } catch {
    return false;
  }
}
