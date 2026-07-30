import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import {
  FABRICACION_COTIZACION_SNAPSHOT_SCHEMA_VERSION,
  type FabricacionCotizacionSnapshot,
} from "@/features/fabricacion/types/fabricacion-snapshot";

function cloneReceta(receta: FabricacionReceta): FabricacionReceta {
  return JSON.parse(JSON.stringify(receta)) as FabricacionReceta;
}

export function construirSnapshotFabricacionCotizacion(input: {
  recipe: FabricationRecipeRecord;
  entrada: FabricacionEntradaCalculo;
  calculatedAt?: string;
}): FabricacionCotizacionSnapshot {
  const definition = cloneReceta(input.recipe.definition);
  const result = calcularCubicacionYPauta(definition, input.entrada);

  return {
    schemaVersion: FABRICACION_COTIZACION_SNAPSHOT_SCHEMA_VERSION,
    tipo: "fabricacion_receta_snapshot",
    recipeId: input.recipe.id,
    recipeDefinitionId: definition.identidad.recetaId,
    recipeVersion: input.recipe.version,
    recipeStatus: input.recipe.status,
    recipeScope: input.recipe.scope,
    lineTemplateId: input.recipe.lineTemplateId,
    recipeIdentity: definition.identidad,
    input: {
      ...input.entrada,
      variante: input.entrada.variante ?? definition.identidad.variante,
    },
    selectedVariant: input.entrada.variante ?? definition.identidad.variante,
    result,
    pauta: result.perfiles,
    vidrios: result.vidrios,
    advertencias: result.advertencias,
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };
}
