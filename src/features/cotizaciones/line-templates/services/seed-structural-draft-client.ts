import { createClient } from "@/lib/supabase/client";
import {
  seedStructuralDraftsForOrganization,
  type SeedStructuralDraftDeps,
} from "@/features/cotizaciones/line-templates/services/seed-structural-draft";
import { fetchOrganizationCountryCodeClient } from "@/features/cotizaciones/line-templates/services/fetch-organization-country-code-client";
import { isChileOrganizationCountry } from "@/features/cotizaciones/line-templates/services/line-catalog-country";

const seededStructuralOrgs = new Set<string>();

/** Rellena borradores técnicos faltantes. Una vez por org y sesión. Solo organizaciones CL. */
export async function ensureStructuralDraftsClient(
  organizationId: string | number
): Promise<boolean> {
  const key = String(organizationId);
  if (seededStructuralOrgs.has(key)) return false;

  const countryCode = await fetchOrganizationCountryCodeClient(organizationId);
  if (!isChileOrganizationCountry(countryCode)) {
    seededStructuralOrgs.add(key);
    return false;
  }

  seededStructuralOrgs.add(key);

  const supabase = createClient();

  const seedDeps: SeedStructuralDraftDeps = {
    async listVentoraLineTemplates(orgId) {
      const { data, error } = await supabase
        .from("cotizacion_line_templates")
        .select("id, catalog_key, nombre, proveedor, material, catalog_metadata")
        .eq("organization_id", orgId)
        .is("eliminado_en", null)
        .not("catalog_key", "is", null);

      if (error) throw error;
      return data ?? [];
    },

    async listLineTemplateIdsWithRecipes(orgId) {
      const { data, error } = await supabase
        .from("fabrication_recipes")
        .select("line_template_id")
        .eq("organization_id", orgId)
        .is("eliminado_en", null)
        .not("line_template_id", "is", null);

      if (error) throw error;
      return ((data ?? []) as Array<{ line_template_id: number | string | null }>)
        .map((row) => row.line_template_id)
        .filter((id): id is number | string => id != null);
    },

    async insertStructuralRecipe(payload) {
      const { error } = await supabase.from("fabrication_recipes").insert(payload);
      if (error) throw error;
    },
  };

  try {
    const result = await seedStructuralDraftsForOrganization(organizationId, seedDeps);
    return result.seeded > 0;
  } catch {
    return false;
  }
}
