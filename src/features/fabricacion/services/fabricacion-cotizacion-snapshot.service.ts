import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
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

/**
 * Compara la salida técnica mostrada en cubicación, despiece y pauta.
 * Se omite `calculatedAt`: recalcular sin cambios no debe reescribir el borrador,
 * pero un cambio de código o nombre de perfil sí debe actualizarlo.
 */
export function fabricacionSnapshotMatchesCalculatedOutput(
  current: FabricacionCotizacionSnapshot | null | undefined,
  next: FabricacionCotizacionSnapshot
): boolean {
  if (!current) return false;

  const project = (snapshot: FabricacionCotizacionSnapshot) => ({
    recipeId: snapshot.recipeId,
    recipeVersion: snapshot.recipeVersion,
    input: snapshot.input,
    perfiles: snapshot.result.perfiles.map((perfil) => ({
      componenteId: perfil.componenteId,
      codigoPerfil: perfil.codigoPerfil,
      nombrePerfil: perfil.nombrePerfil,
      funcion: perfil.funcion,
      medidaMm: perfil.medidaMm,
      cantidadPiezas: perfil.cantidadPiezas,
      totalLinealMm: perfil.totalLinealMm,
    })),
    pautaBarras: snapshot.pautaBarras
      ? {
          calculable: snapshot.pautaBarras.calculable,
          barras: snapshot.pautaBarras.barras.map((barra) => ({
            materialKey: barra.materialKey ?? "",
            codigoPerfil: barra.codigoPerfil,
            nombrePerfil: barra.nombrePerfil,
            indice: barra.indice,
            largoComercialMm: barra.largoComercialMm,
            usadoMm: barra.usadoMm,
            sobranteMm: barra.sobranteMm,
            cortes: barra.cortes.map((corte) => ({
              componenteId: corte.componenteId,
              codigoPerfil: corte.codigoPerfil,
              funcion: corte.funcion,
              largoMm: corte.largoMm,
            })),
          })),
        }
      : null,
  });

  return JSON.stringify(project(current)) === JSON.stringify(project(next));
}

export function construirSnapshotFabricacionCotizacion(input: {
  recipe: FabricationRecipeRecord;
  entrada: FabricacionEntradaCalculo;
  calculatedAt?: string;
}): FabricacionCotizacionSnapshot {
  const definition = cloneReceta(input.recipe.definition);
  const result = calcularCubicacionYPauta(definition, input.entrada);
  const pautaBarras = construirPautaBarrasFabricacion({
    receta: definition,
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
