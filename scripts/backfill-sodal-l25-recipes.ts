#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

import { createFabricationRecipesRepository } from "@/features/fabricacion/repositories/fabrication-recipes.repository";
import { seedSodalL25RecipesForOrganization } from "@/features/fabricacion/services/seed-sodal-l25-recipes";

async function main() {
  const organizationId = process.argv[2];
  if (!organizationId) {
    console.error("Uso: pnpm tsx scripts/backfill-sodal-l25-recipes.ts <organization_id>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole);
  const repo = createFabricationRecipesRepository(supabase);

  const result = await seedSodalL25RecipesForOrganization(organizationId, {
    async listVentoraLineTemplates(orgId) {
      const { data, error } = await supabase
        .from("cotizacion_line_templates")
        .select("id, catalog_key, nombre, proveedor")
        .eq("organization_id", orgId)
        .is("eliminado_en", null)
        .not("catalog_key", "is", null);
      if (error) throw error;
      return data ?? [];
    },
    async listRecipesForOrganization(orgId) {
      return repo.list({ organizationId: Number(orgId) });
    },
    async insertSodalRecipe(payload) {
      const { error } = await supabase.from("fabrication_recipes").insert(payload);
      if (error) throw error;
    },
    async archiveLegacyRecipe(recipeId) {
      const { error } = await supabase
        .from("fabrication_recipes")
        .update({ status: "archived", eliminado_en: new Date().toISOString() })
        .eq("id", recipeId);
      if (error) throw error;
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
