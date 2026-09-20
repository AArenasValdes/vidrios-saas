import { ARQUETIPOS_ESTRUCTURALES, crearRecetaDesdeArquetipoEstructural, crearRecetaEstructuralParaLineaComercial } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import {
  SERIE_45_CATALOG_KEY,
  isCurrentSerie45PracticableRecipe,
} from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import {
  SERIE_4800_CATALOG_KEY,
  SERIE_4800_VARIANT_REFORZADA,
  crearRecetaSerie4800Corredera,
  isCurrentSerie4800CorrederaRecipe,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
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

const SERIE_42_CATALOG_KEYS = new Set([
  "ventora:l42",
  "ventora:serie-42-proyectante-camara",
  "ventora:serie-42-proyectante-sin-camara",
]);

const SERIE_42_LEGACY_SOURCE_REFERENCES = new Set([
  "ventora-proyectante:catalogo-2026-09-13",
  "ventora-serie-42:normal:catalogo-2026-09-13",
]);

const SERIE_42_LEGACY_PROFILE_COUNTS: Record<string, number> = {
  "4201": 2,
  "4202": 2,
  "4204": 1,
  "4206": 2,
  "4209": 2,
  "4229": 2,
};

const SERIE_42_LEGACY_FIVE_PROFILE_COUNTS: Record<string, number> = {
  "4202": 1,
  "4204": 1,
  "4206": 1,
  "4209": 1,
  "4229": 1,
};

const SERIE_32_LEGACY_SOURCE_REFERENCES = new Set([
  "ventora-proyectante:catalogo-2026-09-13",
]);

const SERIE_32_LEGACY_PROFILE_COUNTS: Record<string, number> = {
  "3201": 1,
  "3202": 1,
  "3204": 1,
  "3205": 1,
  "3208": 1,
};

function hasProfileCodeCounts(
  recipe: FabricacionReceta,
  expected: Record<string, number>
): boolean {
  const actual = recipe.perfiles.reduce<Record<string, number>>((counts, profile) => {
    const code = profile.codigoPerfil?.trim();
    if (code) counts[code] = (counts[code] ?? 0) + 1;
    return counts;
  }, {});

  const expectedCodes = Object.keys(expected);
  return (
    Object.keys(actual).length === expectedCodes.length &&
    expectedCodes.every((code) => actual[code] === expected[code])
  );
}

/**
 * Identifica la precarga vieja de AL-42 por su firma técnica, no por UUIDs ni
 * por una comparación JSON completa. Un cambio de código/cantidad del taller
 * rompe la firma y deja la receta intacta.
 */
function isLegacySerie42Seed(
  catalogKey: string,
  sourceReference: string | null,
  recipe: FabricacionReceta
): boolean {
  if (!SERIE_42_CATALOG_KEYS.has(catalogKey)) return false;
  if (!SERIE_42_LEGACY_SOURCE_REFERENCES.has(sourceReference ?? "")) return false;
  return (
    recipe.identidad.tipologia === "proyectante" &&
    recipe.identidad.hojas === 1 &&
    (recipe.identidad.variante === "estandar" ||
      recipe.identidad.variante === "normal") &&
    (hasProfileCodeCounts(recipe, SERIE_42_LEGACY_PROFILE_COUNTS) ||
      hasProfileCodeCounts(recipe, SERIE_42_LEGACY_FIVE_PROFILE_COUNTS))
  );
}

/**
 * Identifica la precarga anterior de L32: cinco perfiles codificados, pero
 * sin cantidades ni descuentos técnicos completos. Solo se migra el borrador
 * Ventora intacto; una receta validada o editada queda fuera del alcance.
 */
function isLegacySerie32Seed(
  catalogKey: string,
  sourceReference: string | null,
  recipe: FabricacionReceta
): boolean {
  if (catalogKey !== "ventora:l32") return false;
  if (!SERIE_32_LEGACY_SOURCE_REFERENCES.has(sourceReference ?? "")) return false;
  return (
    recipe.identidad.tipologia === "proyectante" &&
    recipe.identidad.hojas === 1 &&
    (recipe.identidad.variante === "estandar" || recipe.identidad.variante === "normal") &&
    recipe.perfiles.length === 5 &&
    hasProfileCodeCounts(recipe, SERIE_32_LEGACY_PROFILE_COUNTS)
  );
}

const LINE_45_LEGACY_CODES = new Set(["4501", "4502", "4504", "4508", "4511"]);

function isStaleSerie45VentoraDraft(
  catalogKey: string,
  sourceReference: string | null,
  recipe: FabricacionReceta
): boolean {
  if (catalogKey !== SERIE_45_CATALOG_KEY) return false;
  if (isCurrentSerie45PracticableRecipe(recipe)) return false;
  const source = sourceReference ?? "";
  if (source.startsWith("ventora-arquetipo:")) return true;
  if (source.includes("serie-45")) return true;
  const codes = recipe.perfiles
    .map((profile) => profile.codigoPerfil?.trim())
    .filter((code): code is string => Boolean(code));
  if (codes.length > 0 && codes.every((code) => LINE_45_LEGACY_CODES.has(code))) {
    return true;
  }
  return recipe.identidad.tipologia === "puerta_abatible" && recipe.perfiles.length <= 6;
}

function isStaleSerie4800VentoraDraft(
  catalogKey: string,
  sourceReference: string | null,
  recipe: FabricacionReceta
): boolean {
  if (catalogKey !== SERIE_4800_CATALOG_KEY) return false;
  if (isCurrentSerie4800CorrederaRecipe(recipe)) return false;
  const source = sourceReference ?? "";
  if (source.startsWith("ventora-arquetipo:")) return true;
  if (source.includes("serie-4800") || source.toLowerCase().includes("sodal-4800")) return true;
  const codes = recipe.perfiles
    .map((profile) => profile.codigoPerfil?.trim())
    .filter((code): code is string => Boolean(code));
  return recipe.identidad.tipologia === "corredera" && (codes.length === 0 || recipe.perfiles.length <= 7);
}

function buildSerie4800Replacement(
  row: BorradorProyectanteRow,
  recetaId: string,
  current: FabricacionReceta
): FabricacionReceta {
  const variant =
    current.identidad.variante === SERIE_4800_VARIANT_REFORZADA
      ? SERIE_4800_VARIANT_REFORZADA
      : "normal";
  const replacement = crearRecetaSerie4800Corredera({
    lineName: row.line_name,
    variant,
  });
  return {
    ...enriquecerRecetaDesdeCatalogo({
      receta: replacement,
      catalogKey: SERIE_4800_CATALOG_KEY,
    }),
    estado: "borrador",
    identidad: { ...replacement.identidad, recetaId },
  };
}

function buildCatalogReplacement(
  catalogKey: string | null | undefined,
  row: BorradorProyectanteRow,
  recetaId: string
): FabricacionReceta | null {
  const replacement = crearRecetaEstructuralParaLineaComercial({
    catalogKey,
    lineName: row.line_name,
  });
  return replacement
    ? {
        ...enriquecerRecetaDesdeCatalogo({ receta: replacement, catalogKey }),
        estado: "borrador",
        identidad: { ...replacement.identidad, recetaId },
      }
    : null;
}

// La comparación histórica solo ignora identificadores aleatorios y estado.
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
  const sourceReference = row.source_reference;
  const isPreviousProjectingSeed =
    (catalogKey === "ventora:l32" || catalogKey === "ventora:l42") &&
    sourceReference === "ventora-proyectante:catalogo-2026-09-13";
  const parsed = fabricacionRecetaSchema.safeParse(row.definition);
  if (!parsed.success) return null;
  if (isStaleSerie45VentoraDraft(catalogKey ?? "", sourceReference, parsed.data)) {
    return buildCatalogReplacement(catalogKey, row, parsed.data.identidad.recetaId);
  }
  if (isStaleSerie4800VentoraDraft(catalogKey ?? "", sourceReference, parsed.data)) {
    return buildSerie4800Replacement(row, parsed.data.identidad.recetaId, parsed.data);
  }
  const isLegacySerie42 = isLegacySerie42Seed(catalogKey ?? "", sourceReference, parsed.data);
  const isLegacySerie32 = isLegacySerie32Seed(catalogKey ?? "", sourceReference, parsed.data);
  if (
    !sourceReference?.startsWith("ventora-arquetipo:") &&
    !isPreviousProjectingSeed &&
    !isLegacySerie42 &&
    !isLegacySerie32
  ) return null;
  const isArchetypeSource = sourceReference?.startsWith("ventora-arquetipo:") ?? false;
  const archetypeId = isArchetypeSource
    ? sourceReference!.slice("ventora-arquetipo:".length)
    : "proyectante";
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
  const legacyDefinitions = [original, legacyCatalogDefinition];
  const isUntouchedSeed = legacyDefinitions.some(
    (candidate) => parsedComparable === JSON.stringify(comparable(candidate))
  ) || isLegacySerie42 || isLegacySerie32;
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
