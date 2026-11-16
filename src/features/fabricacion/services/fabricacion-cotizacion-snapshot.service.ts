import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { enriquecerCodigosPerfilRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-receta-codigos.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import {
  FABRICACION_COTIZACION_SNAPSHOT_SCHEMA_VERSION,
  type FabricacionCotizacionSnapshot,
} from "@/features/fabricacion/types/fabricacion-snapshot";
import {
  isSodalL25SnapshotIdentity,
  SODAL_L25_FORMULA_VERSION,
} from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { isZetaConfirmedSourceReference } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import {
  resolveFabricacionParametrosCorte,
  type FabricacionParametrosCorteConfirmados,
} from "@/features/fabricacion/services/fabricacion-parametros-corte.service";

function cloneReceta(receta: FabricacionReceta): FabricacionReceta {
  return JSON.parse(JSON.stringify(receta)) as FabricacionReceta;
}

function ordered<T>(values: readonly T[], project: (value: T) => unknown = (value) => value): unknown[] {
  return values.map((value) => project(value)).sort((left, right) => {
    const leftJson = JSON.stringify(left);
    const rightJson = JSON.stringify(right);
    return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
  });
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
    glassSelection: snapshot.glassSelection ?? null,
    vidrios: ordered(snapshot.result.vidrios, (glass) => ({
      vidrioId: glass.vidrioId,
      nombre: glass.nombre,
      anchoMm: glass.anchoMm,
      altoMm: glass.altoMm,
      cantidadPiezas: glass.cantidadPiezas,
      totalM2: glass.totalM2,
      trazabilidad: ordered(glass.trazabilidad),
    })),
    perfiles: ordered(snapshot.result.perfiles, (perfil) => ({
      componenteId: perfil.componenteId,
      codigoPerfil: perfil.codigoPerfil,
      nombrePerfil: perfil.nombrePerfil,
      funcion: perfil.funcion,
      corte: perfil.corte ?? null,
      medidaMm: perfil.medidaMm,
      cantidadPiezas: perfil.cantidadPiezas,
      totalLinealMm: perfil.totalLinealMm,
    })),
    pautaBarras: snapshot.pautaBarras
      ? {
          calculable: snapshot.pautaBarras.calculable,
          parametrosFisicos: snapshot.pautaBarras.parametrosFisicos ?? null,
          barras: ordered(snapshot.pautaBarras.barras, (barra) => ({
            materialKey: barra.materialKey ?? "",
            codigoPerfil: barra.codigoPerfil,
            nombrePerfil: barra.nombrePerfil,
            indice: barra.indice,
            largoComercialMm: barra.largoComercialMm,
            usadoMm: barra.usadoMm,
            sobranteMm: barra.sobranteMm,
            cortes: ordered(barra.cortes, (corte) => ({
              componenteId: corte.componenteId,
              codigoPerfil: corte.codigoPerfil,
              funcion: corte.funcion,
              corte: corte.corte ?? null,
              largoMm: corte.largoMm,
            })),
          })),
        }
      : null,
  });

  return JSON.stringify(project(current)) === JSON.stringify(project(next));
}

/** Stable key for syncing calculations when fallback recipes recreate UUIDs. */
export function buildFabricacionSnapshotSyncKey(
  itemId: string,
  snapshot: FabricacionCotizacionSnapshot
) {
  return JSON.stringify({
    itemId,
    recipeId: snapshot.recipeId,
    recipeVersion: snapshot.recipeVersion,
    input: snapshot.input,
    glassSelection: snapshot.glassSelection ?? null,
    glassPanes: ordered(snapshot.result.vidrios, (glass) => ({
      id: glass.vidrioId,
      name: glass.nombre,
      widthMm: glass.anchoMm,
      heightMm: glass.altoMm,
      quantity: glass.cantidadPiezas,
      totalM2: glass.totalM2,
      trace: ordered(glass.trazabilidad),
    })),
    selectedVariant: snapshot.selectedVariant,
    supplierFamilyKey: snapshot.supplierFamilyKey ?? null,
    recipeIdentity: {
      codigo: snapshot.recipeIdentity.codigo,
      nombre: snapshot.recipeIdentity.nombre,
      tipologia: snapshot.recipeIdentity.tipologia,
      hojas: snapshot.recipeIdentity.hojas,
      modulos: snapshot.recipeIdentity.modulos,
      apertura: snapshot.recipeIdentity.apertura,
      herraje: snapshot.recipeIdentity.herraje,
      variante: snapshot.recipeIdentity.variante,
    },
    profiles: ordered(snapshot.result.perfiles, (profile) => ({
      code: profile.codigoPerfil,
      name: profile.nombrePerfil,
      function: profile.funcion,
      cut: profile.corte ?? null,
      lengthMm: profile.medidaMm,
      quantity: profile.cantidadPiezas,
      totalMm: profile.totalLinealMm,
    })),
    parametrosFisicos: snapshot.pautaBarras?.parametrosFisicos ?? null,
    bars: snapshot.pautaBarras ? ordered(snapshot.pautaBarras.barras, (bar) => ({
      materialKey: bar.materialKey ?? null,
      code: bar.codigoPerfil,
      name: bar.nombrePerfil,
      lengthMm: bar.largoComercialMm,
      cuts: ordered(bar.cortes, (cut) => ({
        code: cut.codigoPerfil,
        function: cut.funcion,
        cut: cut.corte ?? null,
        lengthMm: cut.largoMm,
      })),
    })) : null,
  });
}

export function construirSnapshotFabricacionCotizacion(input: {
  recipe: FabricationRecipeRecord;
  entrada: FabricacionEntradaCalculo;
  supplierFamilyKey?: string | null;
  organizationCutSettings?: FabricacionParametrosCorteConfirmados | null;
  jobCutSettings?: FabricacionParametrosCorteConfirmados | null;
  calculatedAt?: string;
}): FabricacionCotizacionSnapshot {
  const definition = enriquecerCodigosPerfilRecetaFabricacion({
    receta: cloneReceta(input.recipe.definition),
    sourceType: input.recipe.sourceType,
    sourceReference: input.recipe.sourceReference,
    lineName: input.recipe.lineName,
  });
  const result = calcularCubicacionYPauta(definition, input.entrada);
  const parametrosCorte = resolveFabricacionParametrosCorte({
    recipeConfiguration: definition.configuracionCorte,
    organizationSettings: input.organizationCutSettings,
    jobOverride: input.jobCutSettings,
  });
  const pautaBarras = construirPautaBarrasFabricacion({
    receta: definition,
    resultado: result,
    parametrosCorte: parametrosCorte.source === "unknown" ? null : parametrosCorte,
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
    ...(input.supplierFamilyKey ? { supplierFamilyKey: input.supplierFamilyKey } : {}),
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
    formulaVersion: resolveSnapshotFormulaVersion(input.recipe, definition.identidad),
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };
}

/** Recalcula únicamente barras desde geometría congelada y una receta con versión exacta. */
export function recalcularPautaSnapshotConParametrosCorte(input: {
  snapshot: FabricacionCotizacionSnapshot;
  recipe: FabricationRecipeRecord;
  parameters: FabricacionParametrosCorteConfirmados;
}): FabricacionCotizacionSnapshot | null {
  if (
    input.recipe.id !== input.snapshot.recipeId ||
    input.recipe.version !== input.snapshot.recipeVersion ||
    input.recipe.definition.identidad.recetaId !== input.snapshot.recipeDefinitionId ||
    !input.snapshot.result.calculable ||
    input.snapshot.pauta.length === 0
  ) {
    return null;
  }

  const lengthsByComponent: Record<string, number> = {};
  for (const bar of input.snapshot.pautaBarras?.barras ?? []) {
    for (const cut of bar.cortes) {
      const previous = lengthsByComponent[cut.componenteId];
      if (previous !== undefined && previous !== bar.largoComercialMm) return null;
      lengthsByComponent[cut.componenteId] = bar.largoComercialMm;
    }
  }
  const requiredProfileIds = new Set(
    input.snapshot.result.perfiles.map((profile) => profile.componenteId)
  );
  // No reinterpretamos longitudes históricas si el snapshot no las conserva.
  if ([...requiredProfileIds].some((id) => !Number.isFinite(lengthsByComponent[id]))) {
    return null;
  }

  const definition = enriquecerCodigosPerfilRecetaFabricacion({
    receta: cloneReceta(input.recipe.definition),
    sourceType: input.recipe.sourceType,
    sourceReference: input.recipe.sourceReference,
    lineName: input.recipe.lineName,
  });
  const snapshotIdentity = input.snapshot.recipeIdentity;
  const recipeIdentity = definition.identidad;
  if (
    snapshotIdentity.codigo !== recipeIdentity.codigo ||
    snapshotIdentity.tipologia !== recipeIdentity.tipologia ||
    snapshotIdentity.hojas !== recipeIdentity.hojas ||
    snapshotIdentity.modulos !== recipeIdentity.modulos ||
    snapshotIdentity.apertura !== recipeIdentity.apertura ||
    snapshotIdentity.herraje !== recipeIdentity.herraje ||
    snapshotIdentity.variante !== recipeIdentity.variante ||
    snapshotIdentity.configurationId !== recipeIdentity.configurationId ||
    snapshotIdentity.compositionId !== recipeIdentity.compositionId ||
    input.snapshot.result.perfiles.some((row) => {
      const profile = definition.perfiles.find((entry) => entry.id === row.componenteId);
      return !profile || profile.codigoPerfil.trim() !== row.codigoPerfil.trim();
    })
  ) return null;
  const parametrosCorte = resolveFabricacionParametrosCorte({
    recipeConfiguration: definition.configuracionCorte,
    jobOverride: input.parameters,
  });
  const pautaBarras = construirPautaBarrasFabricacion({
    receta: definition,
    resultado: input.snapshot.result,
    parametrosCorte,
    largosComercialesPorComponenteId: lengthsByComponent,
  });
  return {
    ...input.snapshot,
    pautaBarras,
    advertencias: [
      ...input.snapshot.result.advertencias,
      ...pautaBarras.advertencias,
    ],
    calculatedAt: new Date().toISOString(),
  };
}

function resolveSnapshotFormulaVersion(
  recipe: FabricationRecipeRecord,
  identity: FabricacionReceta["identidad"]
): string | undefined {
  if (
    isZetaConfirmedSourceReference(recipe.sourceReference) ||
    isSodalL25SnapshotIdentity({
      codigo: identity.codigo,
      variante: identity.variante,
    })
  ) {
    return SODAL_L25_FORMULA_VERSION;
  }
  return undefined;
}
