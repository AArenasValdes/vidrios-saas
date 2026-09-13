import type { SupabaseClient } from "@supabase/supabase-js";
import { prepararReparacionBorradorCatalogo, type BorradorProyectanteRow } from "@/features/fabricacion/services/reparar-borrador-proyectante.service";
import { listVentoraCatalogKeysWithProfileReferences } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";

/** Repara únicamente precargas intactas; el guardado usa comparación optimista. */
export async function repararBorradoresProyectantes(
  client: SupabaseClient,
  organizationId: string | number
): Promise<number> {
  const supportedKeys = listVentoraCatalogKeysWithProfileReferences();
  const { data: lines, error: lineError } = await client.from("cotizacion_line_templates")
    .select("id, catalog_key").eq("organization_id", organizationId)
    .is("eliminado_en", null).not("catalog_key", "is", null);
  if (lineError) throw lineError;
  const supportedLines = (lines ?? []).filter((line) =>
    supportedKeys.includes(line.catalog_key ?? "")
  );
  if (!supportedLines.length) return 0;
  const { data, error } = await client.from("fabrication_recipes")
    .select("id, line_template_id, line_name, status, version, source_reference, source_type, definition, updated_at")
    .eq("organization_id", organizationId).eq("scope", "organization")
    .eq("status", "draft").eq("version", 1).is("eliminado_en", null)
    .is("validated_at", null).is("parent_recipe_id", null)
    .in("line_template_id", supportedLines.map((line) => line.id));
  if (error) throw error;
  let repaired = 0;
  for (const row of (data ?? []) as BorradorProyectanteRow[]) {
    const line = supportedLines.find((entry) => String(entry.id) === String(row.line_template_id));
    const definition = prepararReparacionBorradorCatalogo(line?.catalog_key, row);
    if (!definition) continue;
    const { data: tests, error: testError } = await client.from("fabrication_recipe_tests")
      .select("id").eq("organization_id", organizationId).eq("recipe_id", row.id).limit(1);
    if (testError) throw testError;
    if (tests?.length) continue;
    const isSerie3200 = line?.catalog_key === "ventora:serie-3200-puerta-abatible-1h";
    const isSerie32 = line?.catalog_key === "ventora:l32";
    const isSerie42 = line?.catalog_key === "ventora:l42" ||
      line?.catalog_key === "ventora:serie-42-proyectante-camara" ||
      line?.catalog_key === "ventora:serie-42-proyectante-sin-camara";
    const isSerieS33 = line?.catalog_key === "ventora:s33-corredera-2h" ||
      line?.catalog_key === "ventora:s33-rpt-corredera-2h";
    const { data: updated, error: updateError } = await client.from("fabrication_recipes")
      .update({
        definition,
        typology: definition.identidad.tipologia,
        leaves_count: definition.identidad.hojas,
        variant: definition.identidad.variante,
        source_reference: isSerie3200
          ? "ventora-serie-3200:catalogo-2026-09-13"
          : isSerie32
            ? "ventora-serie-32:normal:catalogo-2026-09-13-v2"
          : isSerie42
            ? `ventora-serie-42:${definition.identidad.variante}:catalogo-2026-09-13-v2`
            : isSerieS33
              ? `ventora-serie-s33:${definition.identidad.variante}:catalogo-2026-09-13`
            : "ventora-proyectante:catalogo-2026-09-13",
      })
      .eq("id", row.id).eq("organization_id", organizationId).eq("scope", "organization")
      .eq("line_template_id", row.line_template_id).eq("status", "draft").eq("version", 1)
      .eq("updated_at", row.updated_at).eq("definition", JSON.stringify(row.definition))
      .is("eliminado_en", null).select("id");
    if (updateError) throw updateError;
    repaired += updated?.length ?? 0;
  }
  return repaired;
}
