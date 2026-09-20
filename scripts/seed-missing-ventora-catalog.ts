#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import {
  getMissingVentoraCatalogKeys,
  seedDefaultLineCatalog,
  type SeedLineTemplateDeps,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";

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
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    console.error("Uso: npx tsx scripts/seed-missing-ventora-catalog.ts <organization_id>");
    console.error("Ejemplo: npx tsx scripts/seed-missing-ventora-catalog.ts 44");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole);

  const { data: profile, error: profileError } = await supabase
    .from("organization_profile")
    .select("country_code")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (profileError) throw profileError;

  const countryCode = profile?.country_code?.trim().toUpperCase() ?? null;
  if (countryCode !== "CL") {
    console.error(`Org ${organizationId} no es CL (country_code=${countryCode ?? "null"})`);
    process.exit(1);
  }

  const { data: existingRows, error: listError } = await supabase
    .from("cotizacion_line_templates")
    .select("catalog_key")
    .eq("organization_id", organizationId)
    .is("eliminado_en", null);
  if (listError) throw listError;

  const existingKeys = (existingRows ?? []).map((row) => row.catalog_key);
  const missingBefore = getMissingVentoraCatalogKeys(existingKeys);
  console.log("Faltantes antes:", missingBefore);

  const deps: SeedLineTemplateDeps = {
    async listAllTemplates(orgId) {
      const { data, error } = await supabase
        .from("cotizacion_line_templates")
        .select("catalog_key")
        .eq("organization_id", orgId)
        .is("eliminado_en", null);
      if (error) throw error;
      return (data ?? []) as Array<{ catalog_key?: string | null }>;
    },
    async insertTemplate(payload) {
      const { error } = await supabase.from("cotizacion_line_templates").insert(payload);
      if (error) throw error;
    },
  };

  const result = await seedDefaultLineCatalog(organizationId, deps, { countryCode });
  const missingAfter = getMissingVentoraCatalogKeys([
    ...existingKeys,
    ...(missingBefore.length ? missingBefore : []),
  ]);

  console.log(
    JSON.stringify(
      {
        organizationId,
        seeded: result.seeded,
        skipped: result.skipped,
        status: result.status,
        insertedKeys: missingBefore.filter((key) => !missingAfter.includes(key)),
        stillMissing: getMissingVentoraCatalogKeys(
          (
            await supabase
              .from("cotizacion_line_templates")
              .select("catalog_key")
              .eq("organization_id", organizationId)
              .is("eliminado_en", null)
          ).data?.map((row) => row.catalog_key) ?? [],
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
