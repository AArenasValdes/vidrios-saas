import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  seedStructuralDraftsForOrganization,
  type SeedStructuralDraftDeps,
} from "@/features/cotizaciones/line-templates/services/seed-structural-draft";

export async function seedStructuralDraftsServer(
  organizationId: number | string,
  deps?: { admin?: SupabaseClient }
): Promise<{ seeded: number; skipped: number }> {
  const admin = deps?.admin ?? createAdminClient();

  const seedDeps: SeedStructuralDraftDeps = {
    async listVentoraLineTemplates(orgId) {
      const { data, error } = await admin
        .from("cotizacion_line_templates")
        .select("id, catalog_key, nombre, proveedor, material, catalog_metadata")
        .eq("organization_id", orgId)
        .is("eliminado_en", null)
        .not("catalog_key", "is", null);

      if (error) throw error;
      return data ?? [];
    },

    async listLineTemplateIdsWithRecipes(orgId) {
      const { data, error } = await admin
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
      const { error } = await admin.from("fabrication_recipes").insert(payload);
      if (error) throw error;
    },
  };

  try {
    return await seedStructuralDraftsForOrganization(organizationId, seedDeps);
  } catch (error) {
    console.warn("[seedStructuralDraftsServer] failed for org", organizationId, error);
    return { seeded: 0, skipped: 0 };
  }
}
