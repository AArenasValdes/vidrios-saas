import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  seedProfileReferencesForOrganization,
  type SeedProfileReferencesDeps,
} from "@/features/cotizaciones/line-templates/services/seed-profile-references";

export async function seedProfileReferencesServer(
  organizationId: number | string,
  deps?: { admin?: SupabaseClient }
): Promise<{ seeded: number; skipped: number }> {
  const admin = deps?.admin ?? createAdminClient();

  const seedDeps: SeedProfileReferencesDeps = {
    async listVentoraLineTemplates(orgId) {
      const { data, error } = await admin
        .from("cotizacion_line_templates")
        .select("id, catalog_key, catalog_metadata")
        .eq("organization_id", orgId)
        .is("eliminado_en", null)
        .not("catalog_key", "is", null);

      if (error) throw error;
      return data ?? [];
    },

    async updateLineTemplateMetadata({ id, organizationId: orgId, catalogMetadata }) {
      const { error } = await admin
        .from("cotizacion_line_templates")
        .update({ catalog_metadata: catalogMetadata })
        .eq("id", id)
        .eq("organization_id", orgId)
        .is("eliminado_en", null);

      if (error) throw error;
    },
  };

  try {
    return await seedProfileReferencesForOrganization(organizationId, seedDeps);
  } catch (error) {
    console.warn("[seedProfileReferencesServer] failed for org", organizationId, error);
    return { seeded: 0, skipped: 0 };
  }
}
