import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { normalizeGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { enriquecerCodigosPerfilRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-receta-codigos.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
  FabricacionTrazabilidadRegla,
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

const VOLATILE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FALLBACK_ID_PREFIXES = [
  "veratec:workbook:",
  "ventora:universal:",
  "ventora:documental:",
  "ventora:system:",
  "arquetipo:",
  "winhouse:",
  "fallback:",
] as const;

function hasFallbackIdPrefix(value: string | null | undefined): boolean {
  if (!value) return false;
  return FALLBACK_ID_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function isFallbackRecipeSnapshot(snapshot: FabricacionCotizacionSnapshot): boolean {
  return snapshot.recipeScope !== "organization" && hasFallbackIdPrefix(snapshot.recipeId);
}

/**
 * Diferencia IDs internos volátiles (UUIDs efímeros regenerados en fallbacks o
 * IDs determinísticos de fallback) de IDs técnicos/persistidos reales.
 */
function normalizeComparableInternalId(
  id: string,
  snapshot: FabricacionCotizacionSnapshot
): string {
  if (!isFallbackRecipeSnapshot(snapshot)) return id;
  if (hasFallbackIdPrefix(id) || id.startsWith("uuid-") || /^sodal-2026-\d+-[a-z0-9]+$/.test(id)) {
    return "__volatile__";
  }
  if (VOLATILE_UUID_PATTERN.test(id)) {
    return "__volatile__";
  }
  return id;
}

/** Preserva base, fórmula, entradas y sufijos de regla; solo cambia el ID interno. */
function normalizeFallbackTrace(
  trace: FabricacionTrazabilidadRegla,
  snapshot: FabricacionCotizacionSnapshot
): FabricacionTrazabilidadRegla {
  const match = trace.componenteId.match(/^(.*?)(:ancho|:alto)?$/);
  if (!match) return trace;
  const baseId = match[1];
  const normalized = normalizeComparableInternalId(baseId, snapshot);
  if (normalized === baseId || !trace.reglaId.startsWith(`${trace.componenteId}:`)) return trace;
  const component = `${normalized}${match[2] ?? ""}`;
  return {
    ...trace,
    componenteId: component,
    reglaId: `${component}${trace.reglaId.slice(trace.componenteId.length)}`,
  };
}
/**
 * Compara la salida técnica mostrada en cubicación, despiece y pauta.
 * Se omite `calculatedAt` y los IDs internos volátiles regenerados por
 * recetas fallback, pero se conservan los IDs técnicos/persistidos reales y
 * cualquier cambio en identidad, medidas, cantidades, códigos o vidrios.
 */
export function fabricacionSnapshotMatchesCalculatedOutput(
  current: FabricacionCotizacionSnapshot | null | undefined,
  next: FabricacionCotizacionSnapshot
): boolean {
  if (!current) return false;

  const project = (snapshot: FabricacionCotizacionSnapshot) => ({
    recipeId: snapshot.recipeId,
    recipeVersion: snapshot.recipeVersion,
    recipeIdentity: {
      codigo: snapshot.recipeIdentity.codigo,
      nombre: snapshot.recipeIdentity.nombre,
      tipologia: snapshot.recipeIdentity.tipologia,
      hojas: snapshot.recipeIdentity.hojas,
      modulos: snapshot.recipeIdentity.modulos,
      apertura: snapshot.recipeIdentity.apertura ?? null,
      herraje: snapshot.recipeIdentity.herraje ?? null,
      variante: snapshot.recipeIdentity.variante,
    },
    input: snapshot.input,
    glassSelection: snapshot.glassSelection ?? null,
    vidrios: ordered(snapshot.result.vidrios, (glass) => ({
      vidrioId: normalizeComparableInternalId(glass.vidrioId, snapshot),
      nombre: glass.nombre,
      anchoMm: glass.anchoMm,
      altoMm: glass.altoMm,
      cantidadPiezas: glass.cantidadPiezas,
      totalM2: glass.totalM2,
      trazabilidad: ordered(glass.trazabilidad, (trace) => normalizeFallbackTrace(trace, snapshot)),
    })),
    perfiles: ordered(snapshot.result.perfiles, (perfil) => ({
      componenteId: normalizeComparableInternalId(perfil.componenteId, snapshot),
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
              componenteId: normalizeComparableInternalId(corte.componenteId, snapshot),
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

/**
 * Determina si un snapshot histórico congelado debe preservarse durante la
 * reapertura de una cotización o una edición comercial menor.
 * Solo permite resincronizar automáticamente cuando el ítem aún no tiene
 * snapshot o cuando cambiaron sus entradas técnicas efectivas (medidas,
 * cantidad, vidrio, línea o variante).
 */
export function shouldPreserveFrozenFabricationSnapshot(
  current: FabricacionCotizacionSnapshot | null | undefined,
  next: FabricacionCotizacionSnapshot
): boolean {
  if (!current) return false;
  if (fabricacionSnapshotMatchesCalculatedOutput(current, next)) return true;

  const projectTechnicalInputs = (snapshot: FabricacionCotizacionSnapshot) => ({
    lineTemplateId: snapshot.lineTemplateId ?? null,
    selectedVariant: snapshot.selectedVariant,
    supplierFamilyKey: snapshot.supplierFamilyKey ?? null,
    input: snapshot.input,
    glassSelection: snapshot.glassSelection ?? null,
  });

  return (
    JSON.stringify(projectTechnicalInputs(current)) ===
    JSON.stringify(projectTechnicalInputs(next))
  );
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
      id: normalizeComparableInternalId(glass.vidrioId, snapshot),
      name: glass.nombre,
      widthMm: glass.anchoMm,
      heightMm: glass.altoMm,
      quantity: glass.cantidadPiezas,
      totalM2: glass.totalM2,
      trace: ordered(glass.trazabilidad, (trace) => normalizeFallbackTrace(trace, snapshot)),
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
  glassSelection?: FabricacionCotizacionSnapshot["glassSelection"];
  storeGlassSelection?: boolean;
}): FabricacionCotizacionSnapshot {
  const definition = enriquecerCodigosPerfilRecetaFabricacion({
    receta: cloneReceta(input.recipe.definition),
    sourceType: input.recipe.sourceType,
    sourceReference: input.recipe.sourceReference,
    lineName: input.recipe.lineName,
  });
  // Las recetas Normal guardadas antes de esta condición conservan las dos
  // alternativas explícitas. Solo se anotan cuando ambas identidades coinciden.
  if (definition.identidad.codigo === "AL-42-PROY-NORMAL-V1") {
    const four = definition.accesorios.find((entry) => entry.codigo === "C-424" && entry.nombre === "Burlete cuña 4 mm");
    const five = definition.accesorios.find((entry) => entry.codigo === "C-425" && entry.nombre === "Burlete cuña 5 mm");
    if (four && five && !four.compatibilidadVidrio && !five.compatibilidadVidrio) {
      four.compatibilidadVidrio = { grupo: "burlete-cuna", categoria: "monolitico", espesorMm: 4 };
      five.compatibilidadVidrio = { grupo: "burlete-cuna", categoria: "monolitico", espesorMm: 5 };
    }
    const base = definition.accesorios.find((entry) => entry.codigo === "C-425" && entry.nombre === "Base 42" && entry.observaciones?.includes("Confirmar aplicación según vidrio."));
    if (base && base.aplicacionPendiente === undefined) base.aplicacionPendiente = true;
  }
  const specification = normalizeGlassTechnicalSpec(input.glassSelection?.technicalSpec);
  const name = input.glassSelection?.displayName?.trim() ?? "";
  const dvh = /\b(?:dvh|termopanel|doble\s+vidriado)\b/i.test(name);
  const monolithic = /\b(?:monol[ií]tico|float)\b/i.test(name);
  const thickness = name.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b/i);
  const namedThickness = thickness ? Number(thickness[1]?.replace(",", ".")) : null;
  const nameConflicts = specification && ((dvh && specification.category !== "dvh") ||
    (monolithic && specification.category !== "monolitico") ||
    (!dvh && namedThickness != null && specification.thicknessMm != null && namedThickness !== specification.thicknessMm));
  const selectedGlass = specification
    ? { categoria: specification.hasConflict || nameConflicts ? null : specification.category,
        espesorMm: specification.hasConflict || nameConflicts ? null : specification.thicknessMm }
    : { categoria: dvh ? "dvh" : monolithic ? "monolitico" : null,
        espesorMm: dvh ? null : namedThickness };
  const result = calcularCubicacionYPauta(definition, input.entrada, selectedGlass);
  const l42NormalMonolithic = definition.identidad.codigo === "AL-42-PROY-NORMAL-V1" &&
    definition.vidrios.length === 1 && definition.vidrios[0]?.nombre === "Monolítico 4 mm" &&
    definition.perfiles.some((profile) => profile.codigoPerfil === "4229" && profile.nombrePerfil === "Junquillo 4229 horizontal") &&
    definition.perfiles.some((profile) => profile.codigoPerfil === "4229" && profile.nombrePerfil === "Junquillo 4229 vertical");
  if (l42NormalMonolithic) {
    if (selectedGlass.categoria === "dvh" || dvh || specification?.category === "dvh") {
      // El titular confirmó el 25-11-2026 que 4201 y 4202 de L42 Normal
      // conservan sus cortes con DVH 4+12+4; no confirmó junquillo ni vidrio.
      const components = name.match(/\d+(?:[.,]\d+)?/g) ?? [];
      const confirmedComposition = selectedGlass.categoria === "dvh" && components.length === 3 &&
        components[0] === "4" && components[1] === "12" && components[2] === "4";
      result.perfiles = confirmedComposition ? result.perfiles.filter((perfil) => !(perfil.codigoPerfil === "4229" &&
        (perfil.nombrePerfil === "Junquillo 4229 horizontal" || perfil.nombrePerfil === "Junquillo 4229 vertical"))) : [];
      result.vidrios = [];
      result.totalLinealMm = result.perfiles.reduce((sum, perfil) => sum + perfil.totalLinealMm, 0);
      result.totalVidrioM2 = 0;
      result.advertencias.push({
        codigo: "COMPOSICION_VIDRIO_PENDIENTE",
        nivel: "advertencia",
        mensaje: confirmedComposition
          ? "Despiece parcial: faltan junquillo compatible y medidas de vidrio para la composición DVH seleccionada."
          : "Composición DVH pendiente: faltan cortes estructurales confirmados, junquillo y medidas de vidrio.",
      });
    } else if (selectedGlass.categoria === "monolitico" && name) {
      result.vidrios = result.vidrios.map((vidrio) => vidrio.nombre === "Monolítico 4 mm" ? { ...vidrio, nombre: name } : vidrio);
    }
  }
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
    ...(input.storeGlassSelection && input.glassSelection ? { glassSelection: input.glassSelection } : {}),
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
