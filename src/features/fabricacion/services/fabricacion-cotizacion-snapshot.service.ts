import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { tieneLargosComercialesPendientes } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import {
  applyLargoToProfilesWithoutLength,
  inferDominantLargoComercialMm,
} from "@/features/fabricacion/services/taller-perfiles.service";
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

/** Solo para cálculo: repite el largo ya definido en perfiles que aún no lo tienen. */
function resolveRecetaParaPautaBarras(receta: FabricacionReceta): FabricacionReceta {
  if (!tieneLargosComercialesPendientes(receta)) return receta;
  const fallback = inferDominantLargoComercialMm(receta);
  if (fallback == null) return receta;
  return applyLargoToProfilesWithoutLength(receta, fallback);
}

export function construirSnapshotFabricacionCotizacion(input: {
  recipe: FabricationRecipeRecord;
  entrada: FabricacionEntradaCalculo;
  calculatedAt?: string;
}): FabricacionCotizacionSnapshot {
  const definition = cloneReceta(input.recipe.definition);
  const result = calcularCubicacionYPauta(definition, input.entrada);
  const recetaParaPauta = resolveRecetaParaPautaBarras(definition);
  const pautaBarras = construirPautaBarrasFabricacion({
    receta: recetaParaPauta,
    resultado: result,
  });

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
    advertencias: [...result.advertencias, ...pautaBarras.advertencias],
    pautaBarras,
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };
}
