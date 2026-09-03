import {
  crearRecetaEstructuralParaLineaComercial,
  resolveArquetipoEstructuralId,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export type LineTemplateSeedRow = {
  id: number | string;
  catalog_key?: string | null;
  nombre: string;
  proveedor?: string | null;
  material?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
};

export type SeedStructuralDraftDeps = {
  listVentoraLineTemplates: (
    organizationId: string | number
  ) => Promise<LineTemplateSeedRow[]>;
  listLineTemplateIdsWithRecipes: (
    organizationId: string | number
  ) => Promise<Array<number | string>>;
  insertStructuralRecipe: (payload: Record<string, unknown>) => Promise<void>;
};

function resolveStructuralArchetypeId(row: LineTemplateSeedRow): string | null {
  const metadata = row.catalog_metadata ?? {};
  const fromMetadata =
    typeof metadata.structuralArchetypeId === "string"
      ? metadata.structuralArchetypeId
      : null;

  return resolveArquetipoEstructuralId({
    catalogKey: row.catalog_key,
    structuralArchetypeId: fromMetadata,
  });
}

/**
 * Inserta borradores técnicos estructurales para líneas Ventora sin receta.
 * Idempotente: no sobrescribe recetas existentes ni líneas privadas.
 */
export async function seedStructuralDraftsForOrganization(
  organizationId: string | number,
  deps: SeedStructuralDraftDeps
): Promise<{ seeded: number; skipped: number }> {
  const templates = await deps.listVentoraLineTemplates(organizationId);
  const ventoraLines = templates.filter((row) =>
    isVentoraCatalogKey(row.catalog_key)
  );

  if (ventoraLines.length === 0) {
    return { seeded: 0, skipped: 0 };
  }

  const withRecipes = new Set(
    (await deps.listLineTemplateIdsWithRecipes(organizationId)).map(String)
  );

  let seeded = 0;
  let skipped = 0;

  for (const line of ventoraLines) {
    if (withRecipes.has(String(line.id))) {
      skipped += 1;
      continue;
    }

    const archetypeId = resolveStructuralArchetypeId(line);
    if (!archetypeId) {
      skipped += 1;
      continue;
    }

    const definition = crearRecetaEstructuralParaLineaComercial({
      catalogKey: line.catalog_key,
      structuralArchetypeId: archetypeId,
      lineName: line.nombre,
    });

    if (!definition) {
      skipped += 1;
      continue;
    }

    try {
      await deps.insertStructuralRecipe({
        organization_id: organizationId,
        line_template_id: line.id,
        scope: "organization",
        provider_name: line.proveedor?.trim() || "",
        line_name: line.nombre,
        typology: definition.identidad.tipologia,
        leaves_count: definition.identidad.hojas,
        variant: definition.identidad.variante,
        version: 1,
        status: "draft",
        definition,
        source_type: "manual",
        source_reference: `ventora-arquetipo:${archetypeId}`,
      });
      seeded += 1;
    } catch (error) {
      console.warn(
        "[seedStructuralDraftsForOrganization] insert failed",
        line.catalog_key,
        error
      );
      skipped += 1;
    }
  }

  return { seeded, skipped };
}
