import { createClient } from "@/lib/supabase/client";
import { repararBorradoresProyectantes } from "@/features/fabricacion/repositories/reparar-borrador-proyectante.repository";
import {
  seedStructuralDraftsForOrganization,
  type SeedStructuralDraftDeps,
} from "@/features/cotizaciones/line-templates/services/seed-structural-draft";
import { fetchOrganizationCountryCodeClient } from "@/features/cotizaciones/line-templates/services/fetch-organization-country-code-client";
import { isChileOrganizationCountry } from "@/features/cotizaciones/line-templates/services/line-catalog-country";

const structuralSeedRuns = new Map<string, Promise<boolean>>();
const projectingRepairRuns = new Map<string, Promise<number>>();

/** Comparte la reparación entre catálogo y editor, sin crear líneas ni recetas. */
export function ensureCatalogDraftsClient(organizationId: string | number): Promise<number> {
  const key = String(organizationId);
  const existing = projectingRepairRuns.get(key);
  if (existing) return existing;
  const run = fetchOrganizationCountryCodeClient(organizationId)
    .then((country) => isChileOrganizationCountry(country)
      ? repararBorradoresProyectantes(createClient(), organizationId)
      : 0)
    .catch((error) => {
      projectingRepairRuns.delete(key);
      throw error;
    });
  projectingRepairRuns.set(key, run);
  return run;
}

/** Compatibilidad para las cargas que solo conocían AL-32/AL-42. */
export const ensureProyectanteDraftsClient = ensureCatalogDraftsClient;

/** Rellena borradores técnicos faltantes. Una vez por org y sesión. Solo organizaciones CL. */
export function ensureStructuralDraftsClient(
  organizationId: string | number
): Promise<boolean> {
  const key = String(organizationId);
  const existing = structuralSeedRuns.get(key);
  if (existing) return existing;

  const run = prepareStructuralDrafts(organizationId).catch((error) => {
    structuralSeedRuns.delete(key);
    throw error;
  });
  structuralSeedRuns.set(key, run);
  return run;
}

async function prepareStructuralDrafts(organizationId: string | number): Promise<boolean> {
  const countryCode = await fetchOrganizationCountryCodeClient(organizationId);
  if (!isChileOrganizationCountry(countryCode)) {
    return false;
  }

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

  const repaired = await ensureCatalogDraftsClient(organizationId);
  const result = await seedStructuralDraftsForOrganization(organizationId, seedDeps);
  return repaired > 0 || result.seeded > 0;
}
