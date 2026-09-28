/**
 * Fuente única de despiece para cotización:
 * receta de la línea → motor Paso 3 → snapshot formal → vista legacy opcional.
 * No usa el preview genérico Marco/Hoja/Junquillo.
 */

import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { isFabricacionRecipeReadyForSnapshot } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import { resolveFabricacionHojasForRecipeMatch } from "@/features/fabricacion/services/fabricacion-hojas-resolver.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { isSodalL25FormulaDerivedRecipe } from "@/features/fabricacion/services/fabricacion-evidence-gate.service";
import {
  isL20CatalogKey,
  resolveL20AperturaForCatalogKey,
} from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
import {
  describeSodalL25PautaMessage,
  isSodalL25CatalogKey,
  resolveSodalL25QuoteConfig,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import { resolveEffectiveSodalL25CatalogKey } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { tieneLargosComercialesPendientes } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import {
  resolveWinHouseS60QuoteAperture,
  resolveWinHouseS60QuoteTypology,
  resolveWinHouseS60QuoteVariant,
} from "@/features/fabricacion/services/winhouse-s60-quote-config.service";
import { WINHOUSE_S60_CATALOG_KEY } from "@/features/fabricacion/fixtures/winhouse-s60-recipes";
import { resolveWinHouseNewS75QuoteVariant } from "@/features/fabricacion/services/winhouse-new-s75-quote-config.service";
import {
  crearRecetaWinHouseNewS75,
  WINHOUSE_NEW_S75_SOURCE_REVISION,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
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

/**
 * Cambia cuando el usuario agrega/cambia una línea en el borrador. Se usa para
 * volver a consultar recetas estructurales sin retener una siembra obsoleta.
 */
export function buildQuoteRecipeSeedContextKey(items: CotizacionWorkflowItem[]): string {
  return items
    .map((item) => {
      const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
      return [
        presentation.lineTemplateId,
        presentation.catalogLineKey,
        item.lineaComercial,
        item.nombre,
      ]
        .map((value) => (value ?? "").trim())
        .join(":");
    })
    .sort()
    .join("|");
}

function normalizeLineTemplateId(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function createWinHouseS75QuoteFallback(input: {
  organizationId: number | null;
  lineTemplateId: number;
  lineName: string;
  variant: NonNullable<ReturnType<typeof resolveWinHouseNewS75QuoteVariant>["variant"]>;
}): FabricationRecipeRecord {
  const definition = crearRecetaWinHouseNewS75({
    lineName: input.lineName,
    variant: input.variant.slug,
  });
  const id = `ventora-preview:${input.lineTemplateId}:${input.variant.slug}`;
  const timestamp = "2026-09-26T00:00:00.000Z";
  return {
    id,
    organizationId: input.organizationId,
    lineTemplateId: input.lineTemplateId,
    scope: "organization",
    providerName: "WinHouse",
    lineName: input.lineName,
    typology: input.variant.typology,
    leavesCount: input.variant.leaves,
    variant: input.variant.slug,
    version: 1,
    status: "draft",
    definition,
    sourceType: "supplier",
    sourceReference: `winhouse:new-s75:${input.variant.slug}:${WINHOUSE_NEW_S75_SOURCE_REVISION}`,
    sourceName: "WinHouse",
    sourceRevision: WINHOUSE_NEW_S75_SOURCE_REVISION,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    eliminadoEn: null,
  };
}

function resolveLeavesCount(
  item: CotizacionWorkflowItem,
  presentation: ReturnType<typeof decodeCotizacionItemPresentationMeta>
) {
  return resolveFabricacionHojasForRecipeMatch(item, presentation);
}

export function inferWinHouseCatalogKey(item: CotizacionWorkflowItem): string | null {
  const lineName = `${item.lineaComercial ?? ""} ${item.nombre ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!lineName.includes("winhouse")) return null;
  if (lineName.includes("s60")) return "ventora:winhouse-s60";
  if (lineName.includes("s75") && lineName.includes("triple")) {
    return "ventora:winhouse-new-s75-triple-riel";
  }
  if (lineName.includes("s75") && lineName.includes("doble")) {
    return "ventora:winhouse-new-s75-doble-riel";
  }
  return null;
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
const COMMERCIAL_SISTEMA_AS_APERTURA = new Set([
  "personalizado",
  "personalizada",
  "corredera",
  "abatible",
  "pivotante",
  "plegable",
  "vaiven",
  "vaivén",
  "vidrio templado",
  "colgante",
  "automatica",
  "automática",
  "otro",
]);

export function resolveAperturaForRecipeMatch(
  fabricacionApertura: string | null | undefined,
  sistema: string | null | undefined
) {
  const candidates = [fabricacionApertura, sistema];
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (!value) continue;
    const normalized = value.toLowerCase();
    if (COMMERCIAL_SISTEMA_AS_APERTURA.has(normalized)) {
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
  /** ID resuelto desde el catálogo de la organización para drafts legacy. */
  lineTemplateId?: string | number | null;
  /** Fallback del template seleccionado para drafts que preceden a catalogLineKey. */
  lineCatalogKey?: string | null;
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
  lineTemplateId?: string | number | null;
  lineCatalogKey?: string | null;
}): FabricacionDespieceCotizacionResult {
  const presentation = decodeCotizacionItemPresentationMeta(input.item.observaciones);
  const lineTemplateId =
    normalizeLineTemplateId(input.lineTemplateId) ??
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

  const catalogKey =
    input.lineCatalogKey?.trim() ||
    presentation.catalogLineKey?.trim() ||
    inferWinHouseCatalogKey(input.item) ||
    resolveEffectiveSodalL25CatalogKey({
      catalogLineKey: presentation.catalogLineKey,
      nombre: input.item.lineaComercial,
    }) || null;
  const inferredTipologia = inferirTipologiaFabricacionPieza({
    tipo: input.item.tipo,
    nombre: input.item.nombre,
    descripcion: input.item.descripcion,
    sistema: presentation.sistema,
  });
  const tipologia =
    (catalogKey === WINHOUSE_S60_CATALOG_KEY
      ? resolveWinHouseS60QuoteTypology({
          selectedTypology: presentation.fabricacionTipologia,
          componentType: input.item.tipo,
          componentName: input.item.nombre,
          description: input.item.descripcion,
        })
      : presentation.fabricacionTipologia) || inferredTipologia;

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

  const aperturaFromPresentation = resolveAperturaForRecipeMatch(
    presentation.fabricacionApertura,
    presentation.sistema
  );
  const hojas =
    catalogKey === WINHOUSE_S60_CATALOG_KEY &&
    (tipologia === "pano_fijo" || tipologia === "proyectante")
      ? 1
      : resolveLeavesCount(input.item, presentation);
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
  const s60Config = resolveWinHouseS60QuoteVariant({
    catalogKey,
    tipologia,
    hojas,
    vidrio: input.item.vidrio,
  });
  const apertura =
    (s60Config.handled
      ? resolveWinHouseS60QuoteAperture(s60Config.variant)
      : null) ||
    aperturaFromPresentation ||
    (isL20CatalogKey(catalogKey)
      ? resolveL20AperturaForCatalogKey(catalogKey, presentation.fabricacionVariante)
      : null);
  const s75Config = resolveWinHouseNewS75QuoteVariant({
    catalogKey,
    tipologia,
    hojas,
    vidrio: input.item.vidrio,
    variantHint: presentation.fabricacionVariante,
    configuration: presentation.configuracion,
    componentName: input.item.tipo,
    system: presentation.sistema,
  });

  if (s75Config.handled && !s75Config.variant) {
    return {
      estado: "receta_incompleta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message:
        "Para usar WinHouse New S75 selecciona una geometría definida (2, 3 o 4 hojas; simétrica/asimétrica; hoja 80/98) y un vidrio compatible con un junquillo WinHouse.",
    };
  }
  const needsS75LeafAWidth = Boolean(
    s75Config.variant?.geometrySlug.startsWith("doble_riel_2h_asimetrica_")
  );
  if (
    needsS75LeafAWidth &&
    (presentation.fabricacionAnchoHojaAMm == null ||
      presentation.fabricacionAnchoHojaAMm <= 0 ||
      presentation.fabricacionAnchoHojaAMm >= ancho)
  ) {
    return {
      estado: "receta_incompleta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: true,
      message: "Indica el ancho de la hoja A; la hoja B se calcula con el ancho restante de la ventana.",
    };
  }
  if (s75Config.variant && alto >= 2300) {
    return {
      estado: "receta_incompleta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message:
        "La pauta WinHouse incorpora refuerzos condicionales desde 2300 mm. Ventora aún no los calcula; revisa esta medida manualmente antes de emitir despiece o pauta.",
    };
  }

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

  const recipeResolutionInput = {
    organizationId: input.organizationId,
    lineTemplateId,
    anchoTotalMm: ancho,
    altoTotalMm: alto,
    catalogKey,
    tipologia,
    hojas,
    modulos:
      isSodalL25CatalogKey(catalogKey) ||
      (s60Config.handled && (tipologia === "pano_fijo" || tipologia === "proyectante"))
        ? 1
        : presentation.fabricacionModulos,
    apertura,
    herraje: presentation.fabricacionHerraje || null,
    variante:
      sodalConfig?.variantSlug ||
      s75Config.variant?.slug ||
      (s60Config.handled
        ? s60Config.variant || presentation.fabricacionVariante || null
        : presentation.fabricacionVariante || null),
    glazing: sodalConfig?.glazing ?? null,
    leg: sodalConfig?.leg ?? null,
    reinforcement: sodalConfig?.reinforcement ?? null,
    preferredRecipeId: presentation.fabricationRecipeId || null,
    previewListaParaProbar: true,
  };
  const canPreviewWinHouseDraft = (recipe: FabricationRecipeRecord) =>
    (s60Config.handled || s75Config.handled) &&
    recipe.status !== "validated" &&
    calcularCubicacionYPauta(recipe.definition, {
      anchoTotalMm: ancho,
      altoTotalMm: alto,
      cantidad,
      anchoHojaAMm: presentation.fabricacionAnchoHojaAMm,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      variante: recipe.definition.identidad.variante,
    }).calculable;

  let recipesForResolution = input.recipes;
  if (s75Config.variant) {
    const exactS75Recipes = input.recipes.filter(
      (recipe) =>
        recipe.lineTemplateId === lineTemplateId &&
        recipe.organizationId === input.organizationId &&
        !recipe.eliminadoEn &&
        recipe.status !== "archived" &&
        recipe.definition.identidad.variante === s75Config.variant?.slug
    );
    const hasValidatedS75Recipe = exactS75Recipes.some(
      (recipe) => recipe.status === "validated"
    );
    const hasReadyS75Draft = exactS75Recipes.some(
      (recipe) =>
        isFabricacionRecipeReadyForSnapshot(recipe).ready &&
        canPreviewWinHouseDraft(recipe)
    );
    if (!hasValidatedS75Recipe && !hasReadyS75Draft) {
      recipesForResolution = [
        ...input.recipes.filter(
          (recipe) =>
            !exactS75Recipes.some((exactRecipe) => exactRecipe.id === recipe.id)
        ),
        createWinHouseS75QuoteFallback({
          organizationId: input.organizationId,
          lineTemplateId,
          lineName: input.item.lineaComercial || "WinHouse New S75",
          variant: s75Config.variant,
        }),
      ];
    }
  }
  const resolution = resolveFabricationRecipe(recipesForResolution, recipeResolutionInput);

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
  if (resolution.estado === "receta_no_validada") {
    const preview = evaluarRecetaListaParaProbar(recipe.definition);
    const bypassRecipeMetadataGate = isSodalL25FormulaDerivedRecipe(recipe);
    if (
      !preview.listaParaProbar &&
      !bypassRecipeMetadataGate &&
      !canPreviewWinHouseDraft(recipe)
    ) {
      return {
        estado: "receta_incompleta",
        formal: null,
        cubication: null,
        recipe,
        barsAvailable: false,
        preliminary: true,
        message:
          preview.bloqueos[0] ??
          "La receta aún no está lista para probar en cotización.",
      };
    }
  }

  const readiness = isFabricacionRecipeReadyForSnapshot(recipe);
  if (!readiness.ready && !canPreviewWinHouseDraft(recipe)) {
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
      anchoHojaAMm: presentation.fabricacionAnchoHojaAMm,
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
