import { createClient } from "@/lib/supabase/client";
import {
  seedDefaultLineCatalog,
  type SeedLineTemplateDeps,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { fetchOrganizationCountryCodeClient } from "@/features/cotizaciones/line-templates/services/fetch-organization-country-code-client";
import { resolveDefaultLineCatalogSeedDecision } from "@/features/cotizaciones/line-templates/services/line-catalog-country";

const seededOrgs = new Set<string>();
const blockedMissingCountryOrgs = new Set<string>();

/**
 * Respaldo client-side: inserta líneas canónicas Ventora ausentes con RLS.
 * Solo para organizaciones CL. Se ejecuta como máximo una vez por org y sesión.
 */
export async function ensureDefaultLineCatalogClient(
  organizationId: string | number
): Promise<boolean> {
  const key = String(organizationId);
  if (seededOrgs.has(key) || blockedMissingCountryOrgs.has(key)) {
    return false;
  }

  const countryCode = await fetchOrganizationCountryCodeClient(organizationId);
  const decision = resolveDefaultLineCatalogSeedDecision(countryCode);

  if (!decision.shouldSeed) {
    if (decision.status === "blocked_missing_country") {
      blockedMissingCountryOrgs.add(key);
    } else {
      seededOrgs.add(key);
    }
    return false;
  }

  seededOrgs.add(key);

  const supabase = createClient();

  const seedDeps: SeedLineTemplateDeps = {
    async listAllTemplates(orgId) {
      const { data, error } = await supabase
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
      const { error } = await supabase
        .from("cotizacion_line_templates")
        .insert(payload);

      if (error) throw error;
    },
  };

  try {
    const result = await seedDefaultLineCatalog(organizationId, seedDeps, {
      countryCode,
    });
    return result.seeded > 0;
  } catch {
    return false;
  }
}
