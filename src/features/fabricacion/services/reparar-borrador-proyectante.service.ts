import { ARQUETIPOS_ESTRUCTURALES, crearRecetaDesdeArquetipoEstructural, crearRecetaEstructuralParaLineaComercial } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import { enriquecerRecetaDesdeCatalogo } from "@/features/fabricacion/services/enriquecer-receta-desde-catalogo.service";
import { listVentoraCatalogKeysWithProfileReferences } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";

export type BorradorProyectanteRow = {
  id: string;
  line_template_id: number | string;
  line_name: string;
  status: string;
  version: number;
  source_reference: string | null;
  source_type: string;
  definition: unknown;
  updated_at: string;
};

// Solo ignora identificadores aleatorios y el estado normalizado al guardar.
// Cualquier código, medida, cantidad, nota o configuración del taller impide reemplazarlo.
function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .filter(([key]) => !["id", "recetaId", "estado"].includes(key))
    .map(([key, entry]) => [key, comparable(entry)]));
}

export function prepararReparacionBorradorCatalogo(
  catalogKey: string | null | undefined,
  row: BorradorProyectanteRow
): FabricacionReceta | null {
  if (!listVentoraCatalogKeysWithProfileReferences().includes(catalogKey ?? "")) return null;
  if (row.status !== "draft" || row.version !== 1 || row.source_type !== "manual") return null;
  if (!row.source_reference?.startsWith("ventora-arquetipo:")) return null;
  const parsed = fabricacionRecetaSchema.safeParse(row.definition);
  if (!parsed.success) return null;
  const archetypeId = row.source_reference.slice("ventora-arquetipo:".length);
  if (!(archetypeId in ARQUETIPOS_ESTRUCTURALES)) return null;
  const original = fabricacionRecetaSchema.parse(crearRecetaDesdeArquetipoEstructural({
    archetypeId: archetypeId as keyof typeof ARQUETIPOS_ESTRUCTURALES,
    lineName: row.line_name,
    createId: () => "seed",
  }));
  const legacyCatalogDefinition = enriquecerRecetaDesdeCatalogo({
    receta: original,
    catalogKey,
  });
  const parsedComparable = JSON.stringify(comparable(parsed.data));
  const isUntouchedSeed = [original, legacyCatalogDefinition].some(
    (candidate) => parsedComparable === JSON.stringify(comparable(candidate))
  );
  if (!isUntouchedSeed) return null;
  const replacement = crearRecetaEstructuralParaLineaComercial({ catalogKey, lineName: row.line_name });
  return replacement ? {
    ...enriquecerRecetaDesdeCatalogo({ receta: replacement, catalogKey }),
    estado: "borrador",
    identidad: { ...replacement.identidad, recetaId: parsed.data.identidad.recetaId },
  } : null;
}

/** Compatibilidad con el nombre inicial de la reparación AL-32/AL-42. */
export const prepararReparacionBorradorProyectante = prepararReparacionBorradorCatalogo;
