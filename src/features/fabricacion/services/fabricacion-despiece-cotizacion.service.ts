/**
 * Fuente única de despiece para cotización:
 * receta de la línea → motor Paso 3 → snapshot formal → vista legacy opcional.
 * No usa el preview genérico Marco/Hoja/Junquillo.
 */

import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { isFabricacionRecipeReadyForSnapshot } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { resolveFabricacionHojasForRecipeMatch } from "@/features/fabricacion/services/fabricacion-hojas-resolver.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import {
  isSodalCatalogo2026UniversalFallbackKey,
  isReplaceableUniversalStructuralRecipe,
  resolveConfirmedUniversalFallbackVariant,
  resolveUniversalPricedLineFallbacks,
  SODAL_CATALOGO_2026_SOURCE_PREFIX,
  USER_CONFIRMED_UNIVERSAL_WORKSHOP_LINE_KEYS,
} from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { resolveVeratecWorkbookFallback } from "@/features/fabricacion/services/fabricacion-receta-veratec-fallback.service";
import {
  isVeratec7400FourMobileComposition,
  type VeratecQuoteComposition,
} from "@/features/fabricacion/services/veratec-quote-composition.service";
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
  VERATEC_7400_4H_CATALOG_KEY,
} from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";
import {
  VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX,
  VERATEC_BAHAR_5200_PLEGABLE_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-bahar-5200-recipes";
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
  /** Opciones compatibles visibles para que el usuario resuelva una ambigüedad. */
  candidateRecipes?: FabricationRecipeRecord[];
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
  const presentation = resolveQuotePresentationForFabrication(input.item);
  const compositionCatalogKey =
    input.lineCatalogKey?.trim() || presentation.catalogLineKey?.trim() || null;
  const veratec7400FourMobileBaseSelected = isVeratec7400FourMobileComposition(
    presentation,
    compositionCatalogKey
  );
  if (
    (presentation.guidedVisualConfig?.quickCompositionStructural ||
      hasQuickCompositionStructuralChanges(presentation.quickCompositionAdjustment)) &&
    !veratec7400FourMobileBaseSelected
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

/**
 * Recover the exact Veratec 7400 4H identity from the selected commercial line
 * and the visible four-mobile configuration when legacy/edit flows omitted
 * catalog metadata. Explicitly conflicting metadata always takes precedence.
 */
function resolveQuotePresentationForFabrication(item: CotizacionWorkflowItem) {
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  const normalizedLine = (item.lineaComercial ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const normalizedComposition = `${item.nombre ?? ""} ${item.descripcion ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const normalizedSheetVariant = presentation.sheetVariant
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const selectedVeratec4HLine =
    normalizedLine.includes("veratec 7400") && normalizedLine.includes("4 hojas chicas");
  const explicitlyFourMobile =
    /^4\s+moviles$/.test(normalizedSheetVariant) ||
    /4\s+hojas[^.]*4\s+moviles/.test(normalizedComposition);

  const existingCatalogKey = presentation.catalogLineKey.trim();
  const existingKeyBelongsToVeratec7400 =
    !existingCatalogKey ||
    existingCatalogKey === VERATEC_7400_CATALOG_KEY ||
    existingCatalogKey === VERATEC_7400_4H_CATALOG_KEY;
  if (selectedVeratec4HLine && explicitlyFourMobile && existingKeyBelongsToVeratec7400) {
    return {
      ...presentation,
      catalogLineKey: VERATEC_7400_4H_CATALOG_KEY,
      fabricacionTipologia: "corredera",
      fabricacionHojas: 4,
      fabricacionModulos: 4,
      sheetScheme: "4 hojas",
      sheetVariant: "4 móviles",
    } satisfies typeof presentation;
  }

  const baharFoldingVariant = inferVeratecBahar5200FoldingVariant(item, presentation);
  if (!baharFoldingVariant) return presentation;

  return {
    ...presentation,
    catalogLineKey: baharFoldingVariant.catalogKey,
    sistema: "Plegable",
    configuracion: `${baharFoldingVariant.leaves} hojas plegables`,
    fabricacionTipologia: "puerta_abatible",
    fabricacionHojas: baharFoldingVariant.leaves,
    fabricacionModulos: 1,
    fabricacionApertura: "plegable",
    fabricacionVariante: baharFoldingVariant.slug,
  } satisfies typeof presentation;
}

/** Recover the documented Bahar folding identity from the selected commercial line. */
function inferVeratecBahar5200FoldingVariant(
  item: CotizacionWorkflowItem,
  presentation: ReturnType<typeof decodeCotizacionItemPresentationMeta>
): (typeof VERATEC_BAHAR_5200_PLEGABLE_VARIANTS)[number] | null {
  const lineName = (item.lineaComercial ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (item.tipo.toLowerCase() !== "puerta" || !lineName.includes("bahar 5200")) return null;
  const selectedSystem = (presentation.sistema ?? "").trim().toLowerCase();
  const itemComposition = `${item.nombre ?? ""} ${item.descripcion ?? ""}`.toLowerCase();
  if (
    (selectedSystem.includes("corredera") && !selectedSystem.includes("plegable")) ||
    (itemComposition.includes("corredera") && !itemComposition.includes("plegable"))
  ) {
    return null;
  }

  const composition = lineName.match(/plegable\s+(\d+)\s*[/-]\s*(\d+)\s*[/-]\s*(\d+)/);
  if (composition) {
    const key = `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-plegable-${composition[1]}-${composition[2]}-${composition[3]}`;
    return VERATEC_BAHAR_5200_PLEGABLE_VARIANTS.find((variant) => variant.catalogKey === key) ?? null;
  }

  const explicitVariant = VERATEC_BAHAR_5200_PLEGABLE_VARIANTS.find(
    (variant) => variant.slug === presentation.fabricacionVariante
  );
  if (explicitVariant) return explicitVariant;

  const configuredLeaves = `${presentation.configuracion} ${item.nombre ?? ""} ${item.descripcion ?? ""}`
    .match(/(\d+)\s*hojas?/i)?.[1];
  const selectedLeafCount = Number(configuredLeaves) || presentation.fabricacionHojas;
  const isFolding = /plegable/i.test(`${presentation.sistema} ${presentation.configuracion}`);
  if (!isFolding || selectedLeafCount == null) return null;
  return VERATEC_BAHAR_5200_PLEGABLE_VARIANTS.find(
    (variant) => variant.leaves === selectedLeafCount
  ) ?? null;
}

function baharRecipeCalculationSignature(recipe: FabricationRecipeRecord) {
  return JSON.stringify(recipe.definition, (key, value: unknown) =>
    key === "id" || key === "recetaId" ? undefined : value
  );
}

/**
 * Older catalog setup can leave exact duplicate recipes for one Bahar variant.
 * Collapse only records with identical calculation definitions; distinct
 * formulas remain selectable so the quote never silently picks between them.
 */
function collapseEquivalentBaharRecipeDuplicates(input: {
  recipes: FabricationRecipeRecord[];
  lineTemplateId: number;
  organizationId: number | null;
  variant: string;
}): FabricationRecipeRecord[] {
  if (input.organizationId == null) return input.recipes;
  const matching = input.recipes.filter((recipe) =>
    recipe.scope === "organization" &&
    recipe.organizationId === input.organizationId &&
    recipe.lineTemplateId === input.lineTemplateId &&
    !recipe.eliminadoEn &&
    recipe.status !== "archived" &&
    (recipe.variant ?? recipe.definition.identidad.variante) === input.variant
  );
  if (matching.length < 2) return input.recipes;
  const signatures = new Set(matching.map(baharRecipeCalculationSignature));
  if (signatures.size !== 1) return input.recipes;

  const statusRank: Record<FabricationRecipeRecord["status"], number> = {
    validated: 3,
    review_required: 2,
    testing: 2,
    draft: 1,
    archived: 0,
  };
  const preferred = [...matching].sort((left, right) =>
    statusRank[right.status] - statusRank[left.status] ||
    right.version - left.version ||
    right.updatedAt.localeCompare(left.updatedAt)
  )[0];
  const duplicateIds = new Set(matching.map((recipe) => recipe.id));
  const collapsed: FabricationRecipeRecord[] = [];
  let insertedPreferred = false;
  input.recipes.forEach((recipe) => {
    if (duplicateIds.has(recipe.id)) {
      if (!insertedPreferred) {
        collapsed.push(preferred);
        insertedPreferred = true;
      }
      return;
    }
    collapsed.push(recipe);
  });
  return collapsed;
}

/** True only for the exact selected 7400 4H commercial line and 4-mobile item. */
export function isVeratec7400FourMobileQuoteItem(item: CotizacionWorkflowItem): boolean {
  const presentation = resolveQuotePresentationForFabrication(item);
  return isVeratec7400FourMobileComposition(presentation as VeratecQuoteComposition);
}

function resolveLiveFabricacionDespieceForQuoteItem(input: {
  item: CotizacionWorkflowItem;
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
  lineTemplateId?: string | number | null;
  lineCatalogKey?: string | null;
  supplierFamilyKey?: string | null;
}): FabricacionDespieceCotizacionResult {
  const presentation = resolveQuotePresentationForFabrication(input.item);
  const baharFoldingVariant = inferVeratecBahar5200FoldingVariant(input.item, presentation);
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
    baharFoldingVariant?.catalogKey ||
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
  const isBaharExteriorLine = catalogKey === `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-ventana-exterior`;
  const tipologia =
    (catalogKey === "ventora:serie-12-shower-corredera"
      // La identidad exacta del catálogo L12 fija el producto como Shower.
      // Cotizaciones antiguas pueden conservar "Puerta" o "corredera" como
      // clasificación comercial; no deben impedir resolver su receta 2H.
      ? "shower"
      : isBaharExteriorLine
      ? inferredTipologia || presentation.fabricacionTipologia
      : catalogKey === WINHOUSE_S60_CATALOG_KEY
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

  const isSerie32ProjectingLine =
    (catalogKey === "ventora:l32" || catalogKey === "ventora:arquetipo-l32-proyectante") &&
    tipologia === "proyectante";

  const aperturaFromPresentation = resolveAperturaForRecipeMatch(
    presentation.fabricacionApertura,
    presentation.sistema
  );
  const hojas =
    catalogKey === "ventora:serie-12-shower-corredera"
      ? 2
      : catalogKey === WINHOUSE_S60_CATALOG_KEY &&
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
  const apertura = catalogKey === "ventora:serie-12-shower-corredera"
    ? "shower"
    : (s60Config.handled
      ? resolveWinHouseS60QuoteAperture(s60Config.variant)
      : null) ||
      aperturaFromPresentation ||
      (isL20CatalogKey(catalogKey)
        ? catalogKey === "ventora:l20"
          ? "corredera"
          : resolveL20AperturaForCatalogKey(catalogKey, presentation.fabricacionVariante)
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
    configurationId: presentation.fabricacionConfiguracionId || null,
    compositionId: presentation.fabricacionComposicionId || null,
    herraje: presentation.fabricacionHerraje || null,
    variante:
      baharFoldingVariant?.slug ||
      sodalConfig?.variantSlug ||
      s75Config.variant?.slug ||
      (s60Config.handled
        ? s60Config.variant || presentation.fabricacionVariante || null
        : presentation.fabricacionVariante || null),
    glazing: sodalConfig?.glazing ?? null,
    leg: sodalConfig?.leg ?? null,
    reinforcement: sodalConfig?.reinforcement ?? null,
    preferredRecipeId: presentation.fabricationRecipeId || null,
    // L32 Normal 1H resuelve la identidad estructural independiente del vidrio.
    // Su acristalamiento se clasifica después, para evitar que un vidrio no
    // documentado descarte también la geometría de marco y hoja.
    glassName:
      isSerie32ProjectingLine &&
      (!presentation.fabricacionVariante || presentation.fabricacionVariante === "normal")
        ? null
        : input.item.vidrio || null,
    previewListaParaProbar: true,
  };
  const veratecDefaultTwoMobileComposition =
    presentation.sheetScheme.trim().toLowerCase() === "2 hojas" &&
    (!presentation.sheetVariant.trim() ||
      presentation.sheetVariant.trim().toLowerCase() === "2 móviles") &&
    (presentation.fabricacionModulos == null || presentation.fabricacionModulos === 2);
  const explicitVeratecCompositionMismatch =
    (catalogKey === VERATEC_7400_CATALOG_KEY &&
      ((presentation.fabricacionHojas != null && presentation.fabricacionHojas !== 2) ||
        (presentation.fabricacionModulos != null && presentation.fabricacionModulos !== 2) ||
        (Boolean(presentation.sheetScheme.trim()) &&
          !/^2\s+hojas(?:\s+correderas)?$/i.test(presentation.sheetScheme.trim())) ||
        (Boolean(presentation.sheetVariant.trim()) &&
          !/^2\s+m[oó]viles$/i.test(presentation.sheetVariant.trim())))) ||
    (catalogKey === VERATEC_7400_4H_CATALOG_KEY &&
      !isVeratec7400FourMobileComposition(presentation, catalogKey));
  const veratecGeometryOnlyGlass =
    catalogKey === VERATEC_7400_CATALOG_KEY &&
    tipologia === "corredera" &&
    hojas === 2 &&
    veratecDefaultTwoMobileComposition
      ? resolveVeratecGeometryOnlyGlass(input.item.vidrio)
      : null;

  if (veratecGeometryOnlyGlass?.kind === "monolithic_unsupported") {
    const thicknessLabel = veratecGeometryOnlyGlass.thicknessMm == null
      ? "sin espesor identificado"
      : `${veratecGeometryOnlyGlass.thicknessMm} mm`;
    return {
      estado: "composicion_sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: `Sliding 7400 no tiene una variante monolítica habilitada para ${thicknessLabel}. La documentación disponible indica un rango desde 4 mm; no se generó despiece de perfiles ni se sustituyó por la receta de 4 mm.`,
    };
  }

  // Si el espesor coincide con una variante documental 7400 (20/24 mm), deja
  // que el resolver seleccione su receta preliminar y que el taller edite sus
  // cortes en el resumen. Los vidrios fuera de esas variantes conservan el
  // fallback geométrico sin receta ni mapping comercial.
  const hasDocumentedVeratecTpThickness =
    veratecGeometryOnlyGlass?.thicknessMm === 20 ||
    veratecGeometryOnlyGlass?.thicknessMm === 24;
  if (veratecGeometryOnlyGlass && !hasDocumentedVeratecTpThickness) {
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
  const canPreviewRecipeWithDeclaredPendingData = (recipe: FabricationRecipeRecord) =>
    recipe.status !== "validated" &&
    recipe.definition.permitirCalculoPreliminarConPendientes === true &&
    buildFabricationRecipeSummary(recipe.definition).activeRuleCount > 0 &&
    calcularCubicacionYPauta(recipe.definition, {
      anchoTotalMm: ancho,
      altoTotalMm: alto,
      cantidad,
      anchoHojaAMm: presentation.fabricacionAnchoHojaAMm,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      variante: recipe.definition.identidad.variante,
    }).calculable;
  const l20PreliminaryRecipe = (recipe: FabricationRecipeRecord) =>
    isL20CatalogKey(catalogKey) && recipe.status !== "validated"
      ? {
          ...recipe,
          // El permiso es solo para esta vista previa; no se persiste en la receta.
          definition: {
            ...recipe.definition,
            permitirCalculoPreliminarConPendientes: true,
          },
        }
      : recipe;
  const canPreviewCalculatedL20Recipe = (recipe: FabricationRecipeRecord) => {
    const previewRecipe = l20PreliminaryRecipe(recipe);
    if (previewRecipe === recipe) return false;
    if (buildFabricationRecipeSummary(previewRecipe.definition).activeRuleCount === 0) {
      return false;
    }
    const preview = calcularCubicacionYPauta(previewRecipe.definition, {
      anchoTotalMm: ancho,
      altoTotalMm: alto,
      cantidad,
      anchoHojaAMm: presentation.fabricacionAnchoHojaAMm,
      hojas: previewRecipe.definition.identidad.hojas,
      modulos: previewRecipe.definition.identidad.modulos,
      variante: previewRecipe.definition.identidad.variante,
    });
    return preview.calculable && preview.perfiles.length > 0;
  };
  // La validación física del taller no bloquea una fórmula SODAL completa.
  // Sí exigimos perfiles, códigos, medidas, descuentos, cantidades y largos
  // completos, además de que el motor produzca cortes para esta geometría.
  const canCalculateCompleteSodalRecipe = (recipe: FabricationRecipeRecord) => {
    if (!recipe.sourceReference?.startsWith(SODAL_CATALOGO_2026_SOURCE_PREFIX)) {
      return false;
    }
    if (!evaluarRecetaListaParaProbar(recipe.definition).listaParaProbar) {
      return false;
    }
    if (buildFabricationRecipeSummary(recipe.definition).activeRuleCount === 0) {
      return false;
    }
    const result = calcularCubicacionYPauta(recipe.definition, {
      anchoTotalMm: ancho,
      altoTotalMm: alto,
      cantidad,
      anchoHojaAMm: presentation.fabricacionAnchoHojaAMm,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      variante: recipe.definition.identidad.variante,
    });
    return result.calculable && result.perfiles.length > 0;
  };
  const canPreviewPreliminaryRecipe = (recipe: FabricationRecipeRecord) =>
    canPreviewWinHouseDraft(recipe) ||
    canPreviewVeratecDraft(recipe) ||
    canPreviewRecipeWithDeclaredPendingData(recipe) ||
    canPreviewCalculatedL20Recipe(recipe);

  let recipesForResolution = baharFoldingVariant
    ? collapseEquivalentBaharRecipeDuplicates({
        recipes: input.recipes,
        lineTemplateId,
        organizationId: input.organizationId,
        variant: baharFoldingVariant.slug,
      })
    : input.recipes;
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
  let resolution = resolveFabricationRecipe(recipesForResolution, recipeResolutionInput);

  const userConfirmedUniversalLine = Boolean(
    catalogKey && USER_CONFIRMED_UNIVERSAL_WORKSHOP_LINE_KEYS.has(catalogKey),
  );
  const isBahar5200Line = catalogKey?.startsWith(`${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-`) === true;
  const shouldResolveBaharFallback = (state: string) =>
    state === "sin_receta" ||
    (isBahar5200Line && state === "multiples_recetas") ||
    (isBahar5200Line &&
      state === "receta_no_validada" &&
      Boolean(resolution.receta) &&
      !canPreviewPreliminaryRecipe(resolution.receta!));
  const sodalCatalogo2026UniversalLine = isSodalCatalogo2026UniversalFallbackKey(catalogKey);
  const shouldResolveUniversalFallback = (state: string) =>
    state === "sin_receta" ||
    (isSerie32ProjectingLine && state === "composicion_sin_receta") ||
    (userConfirmedUniversalLine &&
      (state === "receta_no_validada" || state === "multiples_recetas")) ||
    (sodalCatalogo2026UniversalLine &&
      (state === "receta_no_validada" || state === "multiples_recetas"));
  const selectedRecipeIsReplaceableConfirmedStructure = () =>
    userConfirmedUniversalLine &&
    resolution.receta != null &&
    isReplaceableUniversalStructuralRecipe(resolution.receta);
  if (
    catalogKey &&
    (shouldResolveUniversalFallback(resolution.estado) ||
      shouldResolveBaharFallback(resolution.estado) ||
      selectedRecipeIsReplaceableConfirmedStructure())
  ) {
    const baharVariantForOpening = isBaharExteriorLine
      ? tipologia === "proyectante"
        ? "bahar_5200_ventana_proyectante"
        : tipologia === "abatible"
          ? "bahar_5200_ventana_exterior"
          : null
      : null;
    const veratecResolutionInput = {
      ...recipeResolutionInput,
      variante: baharVariantForOpening || recipeResolutionInput.variante,
    };
    const veratecFallbacks = resolveVeratecWorkbookFallback({
      catalogKey,
      lineTemplateId,
      organizationId: input.organizationId,
      lineName: input.item.lineaComercial || catalogKey,
      variant: veratecResolutionInput.variante,
      typology: recipeResolutionInput.tipologia,
      recipes: input.recipes,
    });
    if (veratecFallbacks.length > 0) {
      const recipesWithoutIncompleteBaharDraft = isBahar5200Line && resolution.receta &&
        !canPreviewPreliminaryRecipe(resolution.receta)
        ? recipesForResolution.filter((recipe) => recipe.id !== resolution.receta?.id)
        : recipesForResolution;
      resolution = resolveFabricationRecipe(
        [...recipesWithoutIncompleteBaharDraft, ...veratecFallbacks],
        {
          ...veratecResolutionInput,
          variante:
            veratecFallbacks.length === 1 &&
            (!veratecResolutionInput.variante ||
              ["estandar", "default", "normal"].includes(veratecResolutionInput.variante.trim().toLowerCase()))
              ? veratecFallbacks[0]?.variant ?? veratecResolutionInput.variante
              : veratecResolutionInput.variante,
        },
      );
    }
    if (
      shouldResolveUniversalFallback(resolution.estado) ||
      selectedRecipeIsReplaceableConfirmedStructure()
    ) {
      const fallbacks = resolveUniversalPricedLineFallbacks({
        catalogKey,
        lineTemplateId,
        organizationId: input.organizationId,
        lineName: input.item.lineaComercial || catalogKey,
        variant: resolveConfirmedUniversalFallbackVariant({
          catalogKey,
          variant: recipeResolutionInput.variante,
          selectedRecipe: resolution.receta,
        }),
        leavesCount: recipeResolutionInput.hojas,
        typology: recipeResolutionInput.tipologia,
        glassName: recipeResolutionInput.glassName,
        configurationId: recipeResolutionInput.configurationId,
        includeDocumentedVariants: true,
        recipes: input.recipes,
      });
      if (fallbacks.length > 0) {
        const isSodalDocumentedFallback = fallbacks.some((recipe) =>
          recipe.sourceReference?.startsWith("sodal:catalogo-sodal-2026:"),
        );
        const recipesForFallback = isSodalDocumentedFallback
          ? recipesForResolution.filter(
              (recipe) =>
                recipe.lineTemplateId !== lineTemplateId ||
                recipe.status === "validated" ||
                !(recipe.sourceReference?.startsWith("base-ventora:") ||
                  recipe.sourceReference?.startsWith("ventora-arquetipo:")),
            )
          : userConfirmedUniversalLine
            ? recipesForResolution.filter(
                (recipe) =>
                  recipe.lineTemplateId !== lineTemplateId ||
                  (recipe.status === "validated" &&
                    !isReplaceableUniversalStructuralRecipe(recipe)),
              )
            : recipesForResolution;
        resolution = resolveFabricationRecipe(
          [...recipesForFallback, ...fallbacks],
          {
            ...recipeResolutionInput,
            variante:
            fallbacks.some((fallback) => fallback.variant === "normal") &&
              (resolveConfirmedUniversalFallbackVariant({
                catalogKey,
                variant: recipeResolutionInput.variante,
                selectedRecipe: resolution.receta,
              }) === "normal" ||
                ["estandar", "estándar", "default", "al-42 normal"].includes(
                  (recipeResolutionInput.variante ?? "").trim().toLocaleLowerCase("es-CL")
                ))
                ? "normal"
                : recipeResolutionInput.variante,
          },
        );
      }
    }
  }

  // La receta 7400 2H solo cubre dos móviles; la base 4H solo cubre cuatro
  // móviles. No reutilizarlas para composiciones mixtas o croquis distintos.
  if (explicitVeratecCompositionMismatch) {
    return {
      estado: "composicion_sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "La base disponible de Sliding 7400 cubre 2 hojas móviles o 4 hojas móviles, según la configuración. Para esta composición mixta aún falta una receta compatible.",
    };
  }

  if (resolution.estado === "multiples_recetas") {
    return {
      estado: "multiples_recetas",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Hay varias recetas compatibles; elige variante o herraje.",
      candidateRecipes: resolution.candidatas,
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
    const completeDocumentedSodalRecipe = canCalculateCompleteSodalRecipe(recipe);
    if (
      !preview.listaParaProbar &&
      !bypassRecipeMetadataGate &&
      !completeDocumentedSodalRecipe &&
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
  if (
    !readiness.ready &&
    !canCalculateCompleteSodalRecipe(recipe) &&
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
        readiness.message ??
        "Configuración pendiente de completar para esta variante de fabricación.",
    };
  }

  if (
    isSerie32ProjectingLine &&
    isSerie32NormalOneLeafRecipe(recipe, input.organizationId, lineTemplateId) &&
    resolveSerie32NormalGlazing({
      technicalSpec: presentation.glassTechnicalSpec,
      glassName: input.item.vidrio,
    }) !== "documented_monolithic_4mm"
  ) {
    const geometryOnly = buildSerie32StructuralGeometryOnlyFallback({
      recipe,
      organizationId: input.organizationId,
      lineTemplateId,
      item: input.item,
      ancho,
      alto,
      cantidad,
    });
    if (geometryOnly) return geometryOnly;

    return {
      estado: "receta_incompleta",
      formal: null,
      cubication: null,
      recipe,
      barsAvailable: false,
      preliminary: true,
      message:
        "La geometría de acristalamiento de Serie 32 Normal requiere especificación monolítica 4 mm. No se pudo aislar una identidad Normal 1H con perfiles estructurales seguros; no se generó un despiece completo.",
    };
  }

  const formal = construirSnapshotFabricacionCotizacion({
    recipe: canPreviewCalculatedL20Recipe(recipe)
      ? l20PreliminaryRecipe(recipe)
      : recipe,
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
  const isReadySharedOrWorkshopRecipe =
    recipe.id.startsWith("ventora:universal:") ||
    recipe.sourceReference?.startsWith("taller:personalizada:") === true;
  const preliminary =
    resolution.estado === "receta_no_validada" &&
    !isSodalL25CatalogKey(catalogKey) &&
    // El catálogo compartido y la receta propia del taller son bases listas
    // para usar en nuevas cotizaciones. WinHouse/S75 y otras recetas locales
    // de prueba conservan su estado interno de revisión aunque calculen cortes.
    !isReadySharedOrWorkshopRecipe;

  const cubication = fabricacionSnapshotToLegacyCubicationSnapshot(formal);

  const compositionRequiresManualReview = Boolean(
    (presentation.guidedVisualConfig?.quickCompositionStructural ||
      hasQuickCompositionStructuralChanges(presentation.quickCompositionAdjustment)) &&
    isVeratec7400FourMobileComposition(presentation, catalogKey)
  );

  return {
    estado: "calculado",
    formal,
    cubication,
    recipe,
    barsAvailable,
    preliminary,
    message: compositionRequiresManualReview
      ? "Despiece base Veratec 7400 de 4 hojas móviles. La composición visual tiene ajustes; revisa y corrige los cortes antes de confirmar la pauta."
      : barsAvailable
      ? preliminary
        ? "Despiece disponible. La receta aún requiere validación del taller."
        : null
      : tieneLargosComercialesPendientes(recipe.definition)
        ? "Agrega largos comerciales para calcular tiras."
        : "No se pudo armar la pauta de tiras con esta receta.",
  };
}

type Serie32NormalGlazingResolution = "documented_monolithic_4mm" | "unresolved";

function resolveSerie32NormalGlazing(input: {
  technicalSpec: ReturnType<typeof decodeCotizacionItemPresentationMeta>["glassTechnicalSpec"];
  glassName: string | null | undefined;
}): Serie32NormalGlazingResolution {
  const spec = input.technicalSpec;
  const normalized = (input.glassName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const namedThickness = normalized.match(/(?:^|\D)(\d+(?:[.,]\d+)?)\s*mm(?:\D|$)/)?.[1];
  const namedThicknessMm = namedThickness == null
    ? null
    : Number(namedThickness.replace(",", "."));
  const namesOtherComposition = /\b(dvh|termopanel|doble\s+vidriado|laminad[oa]|templad[oa])\b/.test(normalized);
  const explicitlyMonolithic = /\b(monolitic[oa]|simple)\b/.test(normalized);

  if (spec) {
    if (
      spec.hasConflict ||
      spec.category !== "monolitico" ||
      spec.thicknessMm !== 4 ||
      namesOtherComposition ||
      (namedThicknessMm != null && namedThicknessMm !== spec.thicknessMm)
    ) {
      return "unresolved";
    }
    return "documented_monolithic_4mm";
  }

  return explicitlyMonolithic && namedThicknessMm === 4 && !namesOtherComposition
    ? "documented_monolithic_4mm"
    : "unresolved";
}

function buildSerie32StructuralGeometryOnlyFallback(input: {
  recipe: FabricationRecipeRecord;
  organizationId: number | null;
  lineTemplateId: number | null;
  item: CotizacionWorkflowItem;
  ancho: number;
  alto: number;
  cantidad: number;
}): FabricacionDespieceCotizacionResult | null {
  if (!isSerie32NormalOneLeafRecipe(input.recipe, input.organizationId, input.lineTemplateId)) {
    return null;
  }

  const sourceDefinition = enriquecerCodigosPerfilRecetaFabricacion({
    receta: input.recipe.definition,
    sourceType: input.recipe.sourceType,
    sourceReference: input.recipe.sourceReference,
    lineName: input.recipe.lineName,
  });
  const structuralProfiles = sourceDefinition.perfiles.filter((profile) =>
    (profile.codigoPerfil === "3201" && /marco/i.test(profile.funcion)) ||
    (profile.codigoPerfil === "3202" && /hoja/i.test(profile.funcion))
  );
  if (
    structuralProfiles.length !== 4 ||
    structuralProfiles.some((profile) =>
      profile.reglaMedida.base !== "ancho_total" &&
      profile.reglaMedida.base !== "alto_total" &&
      profile.reglaMedida.base !== "ancho_por_hoja" &&
      profile.reglaMedida.base !== "alto_por_hoja"
    )
  ) {
    return null;
  }

  // This is an in-memory projection of the exact recipe. It deliberately drops
  // glazing-dependent profiles/materials and never mutates or persists recipe data.
  const profileDefinition = {
    ...sourceDefinition,
    perfiles: structuralProfiles,
    vidrios: [],
    accesorios: [],
    datosPendientes: [],
  };
  const entrada = {
    anchoTotalMm: input.ancho,
    altoTotalMm: input.alto,
    cantidad: input.cantidad,
    hojas: 1,
    modulos: 1,
    variante: "normal",
  };
  const result = calcularCubicacionYPauta(profileDefinition, entrada);
  if (!result.calculable || result.perfiles.length !== 4) return null;

  const pautaBarras = construirPautaBarrasFabricacion({
    receta: profileDefinition,
    resultado: result,
  });
  const displaySnapshot: FabricacionCotizacionSnapshot = {
    schemaVersion: 1,
    tipo: "fabricacion_receta_snapshot",
    recipeId: input.recipe.id,
    recipeDefinitionId: profileDefinition.identidad.recetaId,
    recipeVersion: input.recipe.version,
    recipeStatus: input.recipe.status,
    recipeScope: input.recipe.scope,
    lineTemplateId: input.recipe.lineTemplateId,
    recipeIdentity: profileDefinition.identidad,
    input: entrada,
    selectedVariant: "normal",
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
    message:
      `Geometría estructural parcial de Serie 32 Proyectante Normal 1H calculada para ${input.item.vidrio?.trim() || "vidrio sin especificación"}. ` +
      "Se muestran únicamente marco 3201 y hoja 3202. Junquillo 3208 y medidas de vidrio quedan pendientes; no es un despiece completo ni una pauta operativa.",
    geometryOnly: {
      sourceRecipeId: input.recipe.id,
      sourceVariant: "normal",
      profiles: result.perfiles,
      bars: pautaBarras,
      pendingCommercial: ["glass", "glass_bead"],
      commercialMaterials: [
        {
          role: "glass",
          label: input.item.vidrio?.trim() || "Vidrio sin especificación",
          status: "unmapped",
          netPrice: null,
        },
        {
          role: "glass_bead",
          label: "Compatibilidad y medida del junquillo 3208 · por confirmar",
          status: "unmapped",
          netPrice: null,
        },
      ],
    },
  };
}

function isSerie32NormalOneLeafRecipe(
  recipe: FabricationRecipeRecord,
  organizationId: number | null,
  lineTemplateId: number | null,
): boolean {
  const identity = recipe.definition.identidad;
  return Boolean(
    organizationId != null &&
    lineTemplateId != null &&
    recipe.organizationId === organizationId &&
    recipe.lineTemplateId === lineTemplateId &&
    !recipe.eliminadoEn &&
    recipe.status !== "archived" &&
    identity.codigo === "L32-PROY-NORMAL-1H" &&
    identity.tipologia === "proyectante" &&
    identity.apertura === "proyectante" &&
    identity.hojas === 1 &&
    identity.modulos === 1 &&
    identity.variante === "normal" &&
    recipe.variant === "normal"
  );
}

type VeratecGeometryOnlyGlass = {
  kind: "monolithic_unmapped" | "monolithic_unsupported" | "termopanel_preliminary" | "termopanel_unmapped";
  thicknessMm: number | null;
};

const VERATEC_7400_AUTOMATED_GLASS_MATRIX = {
  verifiedMonolithic: [4],
  structuralOnlyMonolithic: [5, 6, 8, 10, 12],
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
    if (thicknessMm === VERATEC_7400_AUTOMATED_GLASS_MATRIX.verifiedMonolithic[0]) return null;
    const isAvailableStructuralOnlyThickness =
      thicknessMm != null &&
      VERATEC_7400_AUTOMATED_GLASS_MATRIX.structuralOnlyMonolithic.some(
        (allowed) => allowed === thicknessMm
      );
    return {
      kind: isAvailableStructuralOnlyThickness ? "monolithic_unmapped" : "monolithic_unsupported",
      thicknessMm: thicknessMm != null && Number.isFinite(thicknessMm) ? thicknessMm : null,
    };
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
