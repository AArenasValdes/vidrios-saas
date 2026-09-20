#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { resolveL20AperturaFromVariant } from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";

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

  const organizationId = process.argv[2] ? Number(process.argv[2]) : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole);
  let query = supabase
    .from("fabrication_recipes")
    .select("id, organization_id, variant, definition, source_reference")
    .is("eliminado_en", null)
    .or(
      "source_reference.like.ventora-variant:l20:%,source_reference.like.merge:alumetrica+haciendoventanas:serie-20:%",
    );

  if (organizationId && Number.isInteger(organizationId) && organizationId > 0) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  let updated = 0;
  for (const row of data ?? []) {
    const apertura = resolveL20AperturaFromVariant(row.variant);
    if (!apertura) continue;
    const definition = row.definition as Record<string, unknown>;
    const identidad = (definition.identidad ?? {}) as Record<string, unknown>;
    if (identidad.apertura === apertura) continue;

    const nextDefinition = {
      ...definition,
      identidad: {
        ...identidad,
        apertura,
      },
    };

    const { error: updateError } = await supabase
      .from("fabrication_recipes")
      .update({ definition: nextDefinition, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (updateError) throw updateError;
    updated += 1;
    console.log(`OK ${row.id} · ${row.variant} → ${apertura}`);
  }

  console.log(JSON.stringify({ scanned: data?.length ?? 0, updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
