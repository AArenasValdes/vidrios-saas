/**
 * Fuente única de despiece para cotización:
 * receta de la línea → motor Paso 3 → snapshot formal → vista legacy opcional.
 * No usa el preview genérico Marco/Hoja/Junquillo.
 */

import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { isFabricacionRecipeReadyForSnapshot } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import { resolveFabricacionHojasForRecipeMatch } from "@/features/fabricacion/services/fabricacion-hojas-resolver.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import {
  describeSodalL25PautaMessage,
  isSodalL25CatalogKey,
  resolveSodalL25QuoteConfig,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import { resolveEffectiveSodalL25CatalogKey } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { tieneLargosComercialesPendientes } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

export type FabricacionDespieceCotizacionEstado =
  | "sin_medidas"
  | "sin_linea"
  | "sin_receta"
  | "multiples_recetas"
  | "receta_incompleta"
  | "calculado";

export type FabricacionDespieceCotizacionResult = {
  estado: FabricacionDespieceCotizacionEstado;
  formal: FabricacionCotizacionSnapshot | null;
  cubication: CotizacionItemCubicationSnapshot | null;
  recipe: FabricationRecipeRecord | null;
  barsAvailable: boolean;
  preliminary: boolean;
  message: string | null;
};

function normalizeLineTemplateId(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function resolveLeavesCount(
  item: CotizacionWorkflowItem,
  presentation: ReturnType<typeof decodeCotizacionItemPresentationMeta>
) {
  return resolveFabricacionHojasForRecipeMatch(item, presentation);
}

function attachFrozenDespieceFallback(
  result: FabricacionDespieceCotizacionResult,
  item: CotizacionWorkflowItem
): FabricacionDespieceCotizacionResult {
  if (result.cubication && result.cubication.cuts.length > 0) {
    return result;
  }
  const frozen = item.fabricacionSnapshot;
  if (!frozen || frozen.pauta.length === 0) {
    return result;
  }
  return {
    ...result,
    cubication: fabricacionSnapshotToLegacyCubicationSnapshot(frozen),
    formal: result.formal ?? frozen,
    barsAvailable:
      result.barsAvailable ||
      Boolean(
        frozen.pautaBarras?.calculable && (frozen.pautaBarras.barras?.length ?? 0) > 0
      ),
  };
}

/** El Constructor guarda sistema/config como "Personalizado"; no es apertura de receta. */
export function resolveAperturaForRecipeMatch(
  fabricacionApertura: string | null | undefined,
  sistema: string | null | undefined
) {
  const candidates = [fabricacionApertura, sistema];
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (!value) continue;
    const normalized = value.toLowerCase();
    if (normalized === "personalizado" || normalized === "personalizada") {
      continue;
    }
    return value;
  }
  return null;
}

export function resolveFabricacionDespieceForQuoteItem(input: {
  item: CotizacionWorkflowItem;
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
}): FabricacionDespieceCotizacionResult {
  return attachFrozenDespieceFallback(
    resolveLiveFabricacionDespieceForQuoteItem(input),
    input.item
  );
}

function resolveLiveFabricacionDespieceForQuoteItem(input: {
  item: CotizacionWorkflowItem;
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
}): FabricacionDespieceCotizacionResult {
  const presentation = decodeCotizacionItemPresentationMeta(input.item.observaciones);
  const lineTemplateId =
    normalizeLineTemplateId(presentation.lineTemplateId) ??
    normalizeLineTemplateId(input.item.fabricacionSnapshot?.lineTemplateId);
  const ancho = Math.round(input.item.ancho ?? 0);
  const alto = Math.round(input.item.alto ?? 0);
  const cantidad = Math.max(1, Math.round(input.item.cantidad || 1));

  if (ancho <= 0 || alto <= 0) {
    return {
      estado: "sin_medidas",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Indica ancho y alto para calcular el despiece.",
    };
  }

  if (!lineTemplateId) {
    return {
      estado: "sin_linea",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Fabricación no configurada para esta línea.",
    };
  }

  const tipologia =
    presentation.fabricacionTipologia ||
    inferirTipologiaFabricacionPieza({
      tipo: input.item.tipo,
      nombre: input.item.nombre,
      descripcion: input.item.descripcion,
      sistema: presentation.sistema,
    });

  if (!tipologia) {
    return {
      estado: "sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Fabricación no configurada para esta línea.",
    };
  }

  const apertura = resolveAperturaForRecipeMatch(
    presentation.fabricacionApertura,
    presentation.sistema
  );
  const hojas = resolveLeavesCount(input.item, presentation);
  const catalogKey =
    resolveEffectiveSodalL25CatalogKey({
      catalogLineKey: presentation.catalogLineKey,
      nombre: input.item.lineaComercial,
    }) || null;
  const sodalConfig = isSodalL25CatalogKey(catalogKey)
    ? resolveSodalL25QuoteConfig({
        catalogKey,
        presentation,
        vidrio: input.item.vidrio,
        catalogEspesor: presentation.catalogEspesor,
        catalogTerminacion: presentation.catalogTerminacion,
        sheetScheme: presentation.sheetScheme,
        fabricacionHojas: hojas,
      })
    : null;

  if (sodalConfig && !sodalConfig.complete) {
    return {
      estado: "receta_incompleta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: describeSodalL25PautaMessage(sodalConfig),
    };
  }

  const resolution = resolveFabricationRecipe(input.recipes, {
    organizationId: input.organizationId,
    lineTemplateId,
    catalogKey,
    tipologia,
    hojas,
    modulos: isSodalL25CatalogKey(catalogKey) ? 1 : presentation.fabricacionModulos,
    apertura,
    herraje: presentation.fabricacionHerraje || null,
    variante: sodalConfig?.variantSlug || presentation.fabricacionVariante || null,
    glazing: sodalConfig?.glazing ?? null,
    leg: sodalConfig?.leg ?? null,
    reinforcement: sodalConfig?.reinforcement ?? null,
    preferredRecipeId: presentation.fabricationRecipeId || null,
    allowNonValidatedRecipeId: presentation.fabricationRecipeId || null,
    allowPreliminaryNonValidated: !isSodalL25CatalogKey(catalogKey),
  });

  if (resolution.estado === "multiples_recetas") {
    return {
      estado: "multiples_recetas",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Hay varias recetas compatibles; elige variante o herraje.",
    };
  }

  if (
    resolution.estado !== "receta_unica" &&
    resolution.estado !== "receta_no_validada"
  ) {
    return {
      estado: "sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Fabricación no configurada para esta línea.",
    };
  }

  const recipe = resolution.receta;
  const readiness = isFabricacionRecipeReadyForSnapshot(recipe);
  if (!readiness.ready) {
    return {
      estado: "receta_incompleta",
      formal: null,
      cubication: null,
      recipe,
      barsAvailable: false,
      preliminary: true,
      message:
        readiness.message ??
        "Configuración pendiente de completar para esta variante de fabricación.",
    };
  }

  const formal = construirSnapshotFabricacionCotizacion({
    recipe,
    entrada: {
      anchoTotalMm: ancho,
      altoTotalMm: alto,
      cantidad,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      variante: recipe.definition.identidad.variante,
    },
  });
  const barsAvailable = Boolean(
    formal.pautaBarras?.calculable && (formal.pautaBarras.barras?.length ?? 0) > 0
  );
  const preliminary =
    resolution.estado === "receta_no_validada" ||
    (recipe.status !== "validated" && !isSodalL25CatalogKey(catalogKey));

  const cubication = fabricacionSnapshotToLegacyCubicationSnapshot(formal);

  return {
    estado: "calculado",
    formal,
    cubication,
    recipe,
    barsAvailable,
    preliminary,
    message: barsAvailable
      ? preliminary
        ? "Cálculo preliminar: la receta aún no está validada."
        : null
      : tieneLargosComercialesPendientes(recipe.definition)
        ? "Agrega largos comerciales para calcular tiras."
        : "No se pudo armar la pauta de tiras con esta receta.",
  };
}

/** Pieza con línea + receta de fabricación y despiece calculable (uso interno, no PDF cliente). */
export function canOpenDespiecePreviewForQuoteItem(input: {
  item: CotizacionWorkflowItem;
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
}): boolean {
  if (input.organizationId == null) return false;
  const resolution = resolveFabricacionDespieceForQuoteItem(input);
  if (resolution.estado !== "calculado") return false;
  const perfiles = resolution.formal?.result.perfiles ?? [];
  if (perfiles.length === 0) return false;
  return resolution.formal?.result.calculable === true;
}

const FABRICATION_REVIEW_ELIGIBLE_ESTADOS: FabricacionDespieceCotizacionEstado[] = [
  "calculado",
  "receta_incompleta",
  "multiples_recetas",
];

/** Línea con cubicación/despiece configurado o en camino (L25, receta del taller, etc.). */
export function isQuoteItemFabricationReviewEligible(input: {
  item: CotizacionWorkflowItem;
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
}): boolean {
  const presentation = decodeCotizacionItemPresentationMeta(input.item.observaciones);
  if (
    input.item.tipoItem === "item_libre_con_valor" ||
    presentation.displayMode === "item_libre"
  ) {
    return false;
  }

  const frozen = input.item.fabricacionSnapshot;
  if (
    (frozen?.pauta?.length ?? 0) > 0 ||
    (frozen?.pautaBarras?.barras?.length ?? 0) > 0
  ) {
    return true;
  }

  const catalogKey = resolveEffectiveSodalL25CatalogKey({
    catalogLineKey: presentation.catalogLineKey,
    nombre: input.item.lineaComercial,
  });
  if (isSodalL25CatalogKey(catalogKey)) {
    return true;
  }

  if (input.organizationId == null) return false;

  const resolution = resolveFabricacionDespieceForQuoteItem(input);
  if (resolution.estado === "sin_medidas") return false;

  return FABRICATION_REVIEW_ELIGIBLE_ESTADOS.includes(resolution.estado);
}

export function buildQuoteFabricationReviewEligibility(input: {
  items: CotizacionWorkflowItem[];
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
}): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (input.organizationId == null || input.items.length === 0) {
    return map;
  }

  for (const item of input.items) {
    if (
      isQuoteItemFabricationReviewEligible({
        item,
        recipes: input.recipes,
        organizationId: input.organizationId,
      })
    ) {
      map.set(item.id, true);
    }
  }

  return map;
}

export function anyQuoteItemHasFabricationReview(input: {
  items: CotizacionWorkflowItem[];
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
  eligibilityByItemId?: Map<string, boolean>;
}): boolean {
  if (input.eligibilityByItemId) {
    return input.eligibilityByItemId.size > 0;
  }
  return buildQuoteFabricationReviewEligibility(input).size > 0;
}

export function buildQuoteDespiecePreviewEligibility(input: {
  items: CotizacionWorkflowItem[];
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
}): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (input.organizationId == null || input.items.length === 0) {
    return map;
  }

  for (const item of input.items) {
    if (
      canOpenDespiecePreviewForQuoteItem({
        item,
        recipes: input.recipes,
        organizationId: input.organizationId,
      })
    ) {
      map.set(item.id, true);
    }
  }

  return map;
}

export function anyQuoteItemCanOpenDespiecePreview(input: {
  items: CotizacionWorkflowItem[];
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
  eligibilityByItemId?: Map<string, boolean>;
}): boolean {
  if (input.eligibilityByItemId) {
    return input.eligibilityByItemId.size > 0;
  }
  return buildQuoteDespiecePreviewEligibility(input).size > 0;
}

export function findFirstQuoteItemWithDespiecePreview(input: {
  items: CotizacionWorkflowItem[];
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
  eligibilityByItemId?: Map<string, boolean>;
}): CotizacionWorkflowItem | null {
  const eligibility =
    input.eligibilityByItemId ??
    buildQuoteDespiecePreviewEligibility(input);

  for (const item of input.items) {
    if (eligibility.get(item.id)) {
      return item;
    }
  }

  return null;
}
