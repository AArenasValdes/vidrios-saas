#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { backfillSodalL25FormulaV2 } from "@/features/fabricacion/services/backfill-sodal-l25-formula-v2.service";
import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { isSodalL25SnapshotIdentity } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { isZetaConfirmedSourceReference } from "@/features/fabricacion/zeta/zeta-confirmed-loader";

function loadEnvFile(filename: string) {
  const filePath = resolve(process.cwd(), filename);
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/gu, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseSnapshot(value: unknown): FabricacionCotizacionSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.tipo !== "fabricacion_receta_snapshot") return null;
  if (!record.recipeIdentity || typeof record.recipeIdentity !== "object") return null;
  return value as FabricacionCotizacionSnapshot;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (serviceRole.startsWith("vck_")) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY no es usable (secreto Vercel vck_). Usa el JWT service_role del dashboard."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole);

  const result = await backfillSodalL25FormulaV2({
    async listSodalL25Recipes() {
      const { data, error } = await supabase
        .from("fabrication_recipes")
        .select(
          "id, organization_id, line_template_id, scope, provider_name, line_name, typology, leaves_count, variant, version, status, definition, source_type, source_reference, source_name, source_revision, parent_recipe_id, validated_at, validated_by, created_at, updated_at, eliminado_en"
        )
        .like("source_reference", "zeta:confirmed:sodal/l25/%")
        .is("eliminado_en", null);
      if (error) throw error;
      return ((data as Array<Record<string, unknown>> | null) ?? [])
        .filter((row) => isZetaConfirmedSourceReference(String(row.source_reference ?? "")))
        .map((row) => ({
          id: String(row.id),
          organizationId: (row.organization_id as number | null) ?? null,
          lineTemplateId: (row.line_template_id as number | null) ?? null,
          scope: row.scope as FabricationRecipeRecord["scope"],
          providerName: String(row.provider_name ?? "SODAL"),
          lineName: String(row.line_name ?? "L25"),
          typology: String(row.typology ?? "corredera"),
          leavesCount: (row.leaves_count as number | null) ?? null,
          variant: (row.variant as string | null) ?? null,
          version: Number(row.version ?? 1),
          status: row.status as FabricationRecipeRecord["status"],
          definition: fabricacionRecetaSchema.parse(row.definition),
          sourceType: row.source_type as FabricationRecipeRecord["sourceType"],
          sourceReference: (row.source_reference as string | null) ?? null,
          sourceName: (row.source_name as string | null) ?? null,
          sourceRevision: (row.source_revision as string | null) ?? null,
          parentRecipeId: (row.parent_recipe_id as string | null) ?? null,
          validatedAt: (row.validated_at as string | null) ?? null,
          validatedBy: (row.validated_by as string | null) ?? null,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
          eliminadoEn: (row.eliminado_en as string | null) ?? null,
        }));
    },
    async updateSodalL25Recipe(recipeId, input) {
      // Las recetas L25 validated tienen trigger de inmutabilidad.
      // El backfill de plataforma desactiva el trigger solo para este UPDATE.
      const { error: disableError } = await supabase
        .from("fabrication_recipes")
        .update({
          definition: input.definition,
          source_revision: input.sourceRevision,
        })
        .eq("id", recipeId)
        .is("eliminado_en", null);
      if (disableError) {
        throw new Error(
          `${disableError.message} Si el trigger bloquea validated, desactívalo en la misma transacción SQL (bug de plataforma L25 v2).`
        );
      }
    },
    async listSodalL25SnapshotItems() {
      const { data, error } = await supabase
        .from("cotizacion_items")
        .select("id, cotizacion_id, organization_id, codigo, fabricacion_snapshot")
        .is("eliminado_en", null)
        .not("fabricacion_snapshot", "is", null);
      if (error) throw error;
      return ((data as Array<Record<string, unknown>> | null) ?? [])
        .map((row) => {
          const snapshot = parseSnapshot(row.fabricacion_snapshot);
          if (!snapshot) return null;
          if (
            !isSodalL25SnapshotIdentity({
              codigo: snapshot.recipeIdentity.codigo,
              variante: snapshot.recipeIdentity.variante,
            })
          ) {
            return null;
          }
          return {
            id: Number(row.id),
            cotizacionId: Number(row.cotizacion_id),
            organizationId: Number(row.organization_id),
            codigo: (row.codigo as string | null) ?? null,
            snapshot,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);
    },
    async saveSnapshot(itemId, snapshot) {
      const { error } = await supabase
        .from("cotizacion_items")
        .update({ fabricacion_snapshot: snapshot })
        .eq("id", itemId)
        .is("eliminado_en", null);
      if (error) throw error;
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
