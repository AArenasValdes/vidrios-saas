import { createClient } from "@/lib/supabase/client";

import {
  seedDefaultLineCatalog,
  type SeedLineTemplateDeps,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { fetchOrganizationCountryCodeClient } from "@/features/cotizaciones/line-templates/services/fetch-organization-country-code-client";
import { resolveDefaultLineCatalogSeedDecision } from "@/features/cotizaciones/line-templates/services/line-catalog-country";

const inFlightByOrg = new Map<string, Promise<boolean>>();

/**
 * Respaldo client-side: inserta líneas canónicas Ventora ausentes con RLS.
 * Solo para organizaciones CL. El sembrado es idempotente y vuelve a revisar
 * el catálogo en cada carga, para incluir claves añadidas en versiones nuevas.
 */
export async function ensureDefaultLineCatalogClient(
  organizationId: string | number
): Promise<boolean> {
  const key = String(organizationId);
  const inFlight = inFlightByOrg.get(key);
  if (inFlight) return inFlight;

  const runSeed = async (): Promise<boolean> => {
    const countryCode = await fetchOrganizationCountryCodeClient(organizationId);
    const decision = resolveDefaultLineCatalogSeedDecision(countryCode);

    if (!decision.shouldSeed) return false;

    const supabase = createClient();
    const seedDeps: SeedLineTemplateDeps = {
      async listAllTemplates(orgId) {
        const { data, error } = await supabase
          .from("cotizacion_line_templates")
          .select("catalog_key, vidrio_principal_recomendado")
          .eq("organization_id", orgId)
          .is("eliminado_en", null);

        if (error) {
          if (error.message?.toLowerCase().includes("catalog_key")) return [];
          throw error;
        }

        return (data ?? []) as Array<{
          catalog_key?: string | null;
          vidrio_principal_recomendado?: string | null;
        }>;
      },
      async insertTemplate(payload) {
        const { error } = await supabase
          .from("cotizacion_line_templates")
          .insert(payload);
        if (error) throw error;
      },
      async setRecommendedGlassIfEmpty(orgId, catalogKey, glass) {
        const blankResult = await supabase
          .from("cotizacion_line_templates")
          .update({ vidrio_principal_recomendado: glass })
          .eq("organization_id", orgId)
          .eq("catalog_key", catalogKey)
          .eq("vidrio_principal_recomendado", "")
          .is("eliminado_en", null);
        if (blankResult.error) throw blankResult.error;

        const nullResult = await supabase
          .from("cotizacion_line_templates")
          .update({ vidrio_principal_recomendado: glass })
          .eq("organization_id", orgId)
          .eq("catalog_key", catalogKey)
          .is("vidrio_principal_recomendado", null)
          .is("eliminado_en", null);
        if (nullResult.error) throw nullResult.error;
      },
    };

    const result = await seedDefaultLineCatalog(organizationId, seedDeps, {
      countryCode,
    });
    return result.seeded > 0;
  };

  const pending = runSeed().catch((error: unknown) => {
    console.warn("[ensureDefaultLineCatalogClient] no se pudo sincronizar el catálogo", error);
    return false;
  });
  inFlightByOrg.set(key, pending);

  try {
    return await pending;
  } finally {
    if (inFlightByOrg.get(key) === pending) inFlightByOrg.delete(key);
  }
}
