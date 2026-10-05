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
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
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
import { enriquecerCodigosPerfilRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-receta-codigos.service";
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
import {
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
  VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { hasQuickCompositionStructuralChanges } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";

export type FabricacionDespieceCotizacionEstado =
  | "sin_medidas"
  | "sin_linea"
  | "sin_receta"
  | "multiples_recetas"
  | "receta_incompleta"
  | "composicion_sin_receta"
  | "calculado";

export type FabricacionDespieceCotizacionResult = {
  estado: FabricacionDespieceCotizacionEstado;
  formal: FabricacionCotizacionSnapshot | null;
  cubication: CotizacionItemCubicationSnapshot | null;
  recipe: FabricationRecipeRecord | null;
  barsAvailable: boolean;
  preliminary: boolean;
  message: string | null;
  /** Geometría de perfiles disponible aunque el vidrio/accesorio comercial no tenga mapeo. No es snapshot formal. */
  geometryOnly?: {
    sourceRecipeId: string;
    sourceVariant: string;
    profiles: FabricacionCotizacionSnapshot["result"]["perfiles"];
    bars: NonNullable<FabricacionCotizacionSnapshot["pautaBarras"]>;
    pendingCommercial: Array<"glass" | "glass_bead" | "price">;
    commercialMaterials: Array<{
      role: "glass" | "glass_bead" | "price";
      label: string;
      status: "unmapped" | "missing";
      netPrice: null;
    }>;
  } | null;
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
  const explicitKey = decodeCotizacionItemPresentationMeta(item.observaciones).catalogLineKey?.trim();
  return explicitKey?.startsWith("ventora:winhouse-") ? explicitKey : null;
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
  /** Familia explícita del catálogo; permite resolver presentaciones del mismo sistema. */
  supplierFamilyKey?: string | null;
}): FabricacionDespieceCotizacionResult {
  const presentation = decodeCotizacionItemPresentationMeta(input.item.observaciones);
  if (
    presentation.guidedVisualConfig?.quickCompositionStructural ||
    hasQuickCompositionStructuralChanges(presentation.quickCompositionAdjustment)
  ) {
    return {
      estado: "composicion_sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "La composición de hojas cambió. Esta línea aún no tiene una receta compatible; los cortes y la pauta quedan pendientes de revisión.",
    };
  }
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
  supplierFamilyKey?: string | null;
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
    glassName: input.item.vidrio || null,
    previewListaParaProbar: true,
  };
  const veratecDefaultTwoMobileComposition =
    presentation.sheetScheme.trim().toLowerCase() === "2 hojas" &&
    (!presentation.sheetVariant.trim() ||
      presentation.sheetVariant.trim().toLowerCase() === "2 móviles") &&
    (presentation.fabricacionModulos == null || presentation.fabricacionModulos === 2);
  const veratecGeometryOnlyGlass =
    catalogKey === VERATEC_7400_CATALOG_KEY &&
    tipologia === "corredera" &&
    hojas === 2 &&
    veratecDefaultTwoMobileComposition
      ? resolveVeratecGeometryOnlyGlass(input.item.vidrio)
      : null;

  // TP20/TP24 tienen contradicciones de receta todavía abiertas. Este flujo entrega
  // solo geometría estructural; no selecciona recetas ni hereda mappings comerciales.
  if (veratecGeometryOnlyGlass) {
    const fallback = buildVeratecGeometryOnlyFallback({
      recipes: input.recipes,
      organizationId: input.organizationId,
      lineTemplateId,
      item: input.item,
      ancho,
      alto,
      cantidad,
      presentation,
      glassLabel: input.item.vidrio?.trim() || "Vidrio por definir",
      glazingConfiguration: veratecGeometryOnlyGlass,
    });
    if (fallback) return fallback;
  }

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
  const canPreviewVeratecDraft = (recipe: FabricationRecipeRecord) =>
    catalogKey === VERATEC_7400_CATALOG_KEY &&
    recipe.status !== "validated" &&
    recipe.variant === VERATEC_7400_VARIANT_MONOLITICO_4MM &&
    evaluarRecetaListaParaProbar(recipe.definition).listaParaProbar;
  const canPreviewPreliminaryRecipe = (recipe: FabricationRecipeRecord) =>
    canPreviewWinHouseDraft(recipe) || canPreviewVeratecDraft(recipe);

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
      !canPreviewPreliminaryRecipe(recipe)
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
  if (!readiness.ready && !canPreviewPreliminaryRecipe(recipe)) {
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
    supplierFamilyKey: input.supplierFamilyKey,
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

type VeratecGeometryOnlyGlass = {
  kind: "monolithic_unmapped" | "termopanel_preliminary" | "termopanel_unmapped";
  thicknessMm: number | null;
};

const VERATEC_7400_AUTOMATED_GLASS_MATRIX = {
  monolithic: [4],
  termopanel: [20, 24],
} as const;

function resolveVeratecGeometryOnlyGlass(
  glassName: string | null | undefined
): VeratecGeometryOnlyGlass | null {
  const normalized = (glassName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const thicknessText = normalized
    .match(/(?:^|\D)(\d+(?:[.,]\d+)?)\s*mm(?:\D|$)/)?.[1]
    ?.replace(",", ".");
  const compositionMatch = normalized.match(
    /^(?:dvh|termopanel|doble\s+vidriado)\s*(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)$/
  );
  const compositionThicknessMm = compositionMatch
    ? compositionMatch
        .slice(1)
        .reduce((sum, value) => sum + Number(value.replace(",", ".")), 0)
    : null;
  const thicknessMm = thicknessText
    ? Number(thicknessText)
    : compositionThicknessMm != null && Number.isFinite(compositionThicknessMm)
      ? compositionThicknessMm
      : null;

  if (/\bmonolit(?:ico|ic)?\b/.test(normalized)) {
    if (thicknessMm === VERATEC_7400_AUTOMATED_GLASS_MATRIX.monolithic[0]) return null;
    return thicknessMm != null && Number.isFinite(thicknessMm)
      ? { kind: "monolithic_unmapped", thicknessMm }
      : null;
  }

  if (/\b(termopanel|dvh|doble\s+vidriado)\b/.test(normalized)) {
    const isWhitelistedTermopanel =
      thicknessMm != null &&
      VERATEC_7400_AUTOMATED_GLASS_MATRIX.termopanel.some((allowed) => allowed === thicknessMm);
    return {
      kind: isWhitelistedTermopanel ? "termopanel_preliminary" : "termopanel_unmapped",
      thicknessMm: thicknessMm != null && Number.isFinite(thicknessMm) ? thicknessMm : null,
    };
  }

  return null;
}

function buildVeratecGeometryOnlyFallback(input: {
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
  lineTemplateId: number;
  item: CotizacionWorkflowItem;
  ancho: number;
  alto: number;
  cantidad: number;
  presentation: ReturnType<typeof decodeCotizacionItemPresentationMeta>;
  glassLabel: string;
  glazingConfiguration: VeratecGeometryOnlyGlass;
}): FabricacionDespieceCotizacionResult | null {
  const structuralSources = input.recipes.filter((candidate) =>
    candidate.organizationId === input.organizationId &&
    candidate.lineTemplateId === input.lineTemplateId &&
    !candidate.eliminadoEn &&
    candidate.status !== "archived" &&
    candidate.variant === VERATEC_7400_VARIANT_MONOLITICO_4MM &&
    candidate.sourceReference === VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM &&
    candidate.definition.identidad.hojas === 2 &&
    candidate.definition.identidad.modulos === 2
  );
  if (structuralSources.length !== 1) return null;

  const source = structuralSources[0];
  const sourceDefinition = enriquecerCodigosPerfilRecetaFabricacion({
    receta: source.definition,
    sourceType: source.sourceType,
    sourceReference: source.sourceReference,
    lineName: source.lineName,
  });
  // El junquillo cambia con el vidrio. Se excluye junto con el vidrio y los accesorios:
  // este resultado solo reutiliza las reglas geométricas de los perfiles estructurales.
  const profileDefinition = {
    ...sourceDefinition,
    perfiles: sourceDefinition.perfiles.filter(
      (profile) => !/junquillo/i.test(profile.funcion)
    ),
    vidrios: [],
    accesorios: [],
    datosPendientes: [],
  };
  const entrada = {
    anchoTotalMm: input.ancho,
    altoTotalMm: input.alto,
    cantidad: input.cantidad,
    hojas: 2,
    modulos: 2,
    variante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
  };
  const result = calcularCubicacionYPauta(profileDefinition, entrada);
  if (!result.calculable || result.perfiles.length === 0) return null;
  const pautaBarras = construirPautaBarrasFabricacion({
    receta: profileDefinition,
    resultado: result,
  });
  const displaySnapshot: FabricacionCotizacionSnapshot = {
    schemaVersion: 1,
    tipo: "fabricacion_receta_snapshot",
    recipeId: source.id,
    recipeDefinitionId: profileDefinition.identidad.recetaId,
    recipeVersion: source.version,
    recipeStatus: source.status,
    recipeScope: source.scope,
    lineTemplateId: source.lineTemplateId,
    recipeIdentity: profileDefinition.identidad,
    input: entrada,
    selectedVariant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    result,
    pauta: result.perfiles,
    vidrios: [],
    advertencias: result.advertencias,
    pautaBarras,
    calculatedAt: new Date().toISOString(),
  };
  const cubication = fabricacionSnapshotToLegacyCubicationSnapshot(displaySnapshot);
  cubication.estimationKind = "recipe_geometry_only";

  return {
    estado: "receta_incompleta",
    formal: null,
    cubication,
    recipe: null,
    barsAvailable: pautaBarras.calculable && pautaBarras.barras.length > 0,
    preliminary: true,
    message: `Geometría estructural preliminar de Veratec 7400 2H calculada para ${input.glazingConfiguration.kind === "termopanel_preliminary" ? `termopanel ${input.glazingConfiguration.thicknessMm ?? "sin espesor"} mm` : input.glassLabel}. Vidrio, junquillo y precio quedan sin resolver; este resultado no crea un snapshot formal.`,
    geometryOnly: {
      sourceRecipeId: source.id,
      sourceVariant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      profiles: result.perfiles,
      bars: pautaBarras,
      pendingCommercial: ["glass", "glass_bead", "price"],
      commercialMaterials: [
        {
          role: "glass",
          label: input.glassLabel,
          status: "unmapped",
          netPrice: null,
        },
        {
          role: "glass_bead",
          label: "Junquillo para el espesor seleccionado · por definir",
          status: "unmapped",
          netPrice: null,
        },
        {
          role: "price",
          label: "Precio de presentación comercial de perfiles · por definir",
          status: "missing",
          netPrice: null,
        },
      ],
    },
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
  if (resolution.geometryOnly) {
    return resolution.geometryOnly.profiles.length > 0 &&
      resolution.geometryOnly.bars.calculable;
  }
  if (resolution.estado !== "calculado") return false;
  const perfiles = resolution.formal?.result.perfiles ?? [];
  if (perfiles.length === 0) return false;
  return resolution.formal?.result.calculable === true;
}

const FABRICATION_REVIEW_ELIGIBLE_ESTADOS: FabricacionDespieceCotizacionEstado[] = [
  "calculado",
  "receta_incompleta",
  "composicion_sin_receta",
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
