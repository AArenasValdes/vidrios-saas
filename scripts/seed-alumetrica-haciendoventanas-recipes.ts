#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { createFabricationRecipesRepository } from "@/features/fabricacion/repositories/fabrication-recipes.repository";
import { seedAlumetricaHaciendoVentanasRecipes } from "@/features/fabricacion/services/seed-alumetrica-haciendoventanas-recipes";

function loadEnvFile(filename: string) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/gu, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile(".env.local");

  const organizationId = Number(process.argv[2]);
  const lineAllowlistArg = process.argv[3];
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    console.error(
      "Uso: npx tsx scripts/seed-alumetrica-haciendoventanas-recipes.ts <organization_id> [catalog_key]",
    );
    console.error(
      'Ejemplo: npx tsx scripts/seed-alumetrica-haciendoventanas-recipes.ts 44 ventora:l20',
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const lineAllowlist = lineAllowlistArg ? [lineAllowlistArg] : undefined;
  const supabase = createClient(url, serviceRole);
  const repo = createFabricationRecipesRepository(supabase);

  const result = await seedAlumetricaHaciendoVentanasRecipes(
    { organizationId, lineAllowlist },
    {
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
        return repo.list({ organizationId: orgId });
      },
      async insertRecipe(payload) {
        const { error } = await supabase.from("fabrication_recipes").insert(payload);
        if (error) throw error;
      },
    },
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
