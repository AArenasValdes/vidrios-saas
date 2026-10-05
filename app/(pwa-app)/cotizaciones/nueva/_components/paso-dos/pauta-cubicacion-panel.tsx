"use client";

import { useEffect, useMemo, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

import { CubicationAdjustmentChoiceDialog } from "@/components/ui/cubication-adjustment-choice-dialog";
import {
  getLineTemplateCubicationConfig,
  getLineTemplateCuttingRules,
  LINE_TEMPLATE_CUBICATION_STATUS_LABELS,
  type CotizacionLineTemplate,
  type CotizacionLineTemplateCut,
  type CotizacionLineTemplateCuttingPreview,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  summarizeCubicationLineAdjustment,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-adjustment";
import {
  buildCubicationSnapshotFromCatalogMetadata,
  buildPersonalizadoManualCubicationDraft,
  createEmptyCubicationCutDraft,
  cubicationSnapshotMatchesDimensions,
  cubicationSnapshotToPreview,
  GEOMETRIC_FALLBACK_NOTICE,
  isGeometricFallbackSnapshot,
  rebuildCubicationSnapshotWithCuts,
  snapshotUsesFabricationRecipe,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import {
  RECIPE_STATUS_LABELS,
  getFabricationRecipePackFromMetadata,
  herrajeDisplayLabel,
  inferAperturaFromPiece,
  selectRecipeForQuote,
  type FabricationRecipe,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { resolveRecipeFromMetadata } from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { resolveComponentFabricacionHojas } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { hasQuickCompositionStructuralChanges, type QuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import {
  describeIncompleteFabricacionMessage,
  formatVariantDisplayLabel,
  isFabricacionRecipeReadyForSnapshot,
} from "@/features/fabricacion/services/fabricacion-line-variant.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { resolveAperturaForRecipeMatch } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { FabricationVariantSelector } from "@/features/fabricacion/components/fabrication-variant-selector";
import {
  formatSodalL25ContextualLineName,
  formatSodalL25FullRecipeNameFromRecipe,
  formatSodalL25FullRecipeNameFromVariant,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { SODAL_L25_CATALOG_KEY } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import {
  inferSodalL25GlazingFromGlass,
  isSodalL25CatalogKey,
  resolveSodalL25QuoteConfig,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import {
  WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
  WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY,
  WINHOUSE_NEW_S75_VARIANTS,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import {
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import {
  resolveWinHouseNewS75GlassBand,
  resolveWinHouseNewS75QuoteVariant,
} from "@/features/fabricacion/services/winhouse-new-s75-quote-config.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { useSupplierPresentationResolution } from "@/features/proveedor-catalogos/hooks/use-supplier-presentation-resolution";
import { resolveSupplierFinishName } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";

import editor from "./pauta-cubicacion-panel.module.css";

export type PautaCubicacionFormSlice = {
  ancho: string;
  alto: string;
  cantidad: string;
  lineTemplateId: string;
  tipo?: string;
  sistema?: string;
  vidrio?: string;
  /** Variante/herraje elegido cuando hay varias recetas activas compatibles. */
  fabricationRecipeId?: string;
  fabricacionTipologia?: string;
  fabricacionHojas?: number | null;
  fabricacionModulos?: number | null;
  sheetScheme?: string;
  hojasBase?: number | null;
  guidedVisualConfig?: GuidedVisualConfig | null;
  quickCompositionAdjustment?: QuickCompositionAdjustment | null;
  fabricacionApertura?: string;
  fabricacionHerraje?: string;
  fabricacionVariante?: string;
  fabricacionAnchoHojaAMm?: number | null;
  catalogLineKey?: string;
  colorHex?: string | null;
  fabricacionGlazing?: string;
  fabricacionLeg?: string;
  fabricacionReinforcement?: string;
  fabricacionSnapshot?: FabricacionCotizacionSnapshot | null;
  cubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
};

function isPreviewableWinHouseDraft(input: {
  recipe: FabricationRecipeRecord;
  catalogKey: string | null;
  widthMm: number;
  heightMm: number;
  quantity: number;
}): boolean {
  if (
    !input.catalogKey?.startsWith("ventora:winhouse-") ||
    input.recipe.status === "validated" ||
    input.widthMm <= 0 ||
    input.heightMm <= 0 ||
    input.quantity <= 0
  ) {
    return false;
  }

  return calcularCubicacionYPauta(input.recipe.definition, {
    anchoTotalMm: input.widthMm,
    altoTotalMm: input.heightMm,
    cantidad: input.quantity,
    hojas: input.recipe.definition.identidad.hojas,
    modulos: input.recipe.definition.identidad.modulos,
    variante: input.recipe.definition.identidad.variante,
  }).calculable;
}

type Props = {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  onCubicationSnapshotChange: (value: CotizacionItemCubicationSnapshot | null) => void;
  onFabricationRecipeIdChange?: (recipeId: string) => void;
  onFabricacionSnapshotChange?: (snapshot: FabricacionCotizacionSnapshot | null) => void;
  onFabricacionContextoChange?: (value: {
    tipologia: string;
    hojas: number;
    modulos: number;
    apertura: string;
    herraje: string;
    variante: string;
    anchoHojaAMm: number | null;
  }) => void;
  onFabricacionL25ConfigChange?: (value: {
    catalogLineKey: string;
    fabricacionGlazing: string;
    fabricacionLeg: string;
    fabricacionReinforcement: string;
    fabricacionVariante: string;
  }) => void;
  onSaveCubicationLineAdjustment?: (input?: {
    snapshot?: CotizacionItemCubicationSnapshot | null;
  }) => Promise<void> | void;
  isSavingCubicationLineAdjustment?: boolean;
  /** Dónde se elige la línea, para el mensaje de estado pendiente. */
  lineSelectionHint?: "medidas" | "precio";
  /**
   * Si false, oculta el bloque de barras al pie de la pauta expandida
   * (p. ej. cuando el resumen vive en el rail lateral).
   */
  showBarUsageInline?: boolean;
  /**
   * Composición Personalizado: pauta solo como borrador editable,
   * sin plantilla automática de la línea.
   */
  personalizadoAssistMode?: boolean;
  /**
   * `compact`: resumen en Medidas (columna estrecha).
   * `workspace`: paso/tab Despiece con más aire.
   */
  layout?: "compact" | "workspace";
};

function parsePositiveIntegerInput(value: string, fallback = 0) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

/** Resuelve el snapshot activo (draft / guardado / auto) para UI de pauta o rail. */
export function resolveActiveCubicationSnapshot(input: {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  personalizadoAssistMode?: boolean;
}): CotizacionItemCubicationSnapshot | null {
  return resolveActiveCubicationSnapshotInternal(input);
}

function resolveActiveCubicationSnapshotInternal(input: {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  personalizadoAssistMode?: boolean;
}): CotizacionItemCubicationSnapshot | null {
  if (
    input.componentForm.guidedVisualConfig?.quickCompositionStructural ||
    hasQuickCompositionStructuralChanges(input.componentForm.quickCompositionAdjustment)
  ) return null;
  const widthMm = parsePositiveIntegerInput(input.componentForm.ancho);
  const heightMm = parsePositiveIntegerInput(input.componentForm.alto);
  const quantity = parsePositiveIntegerInput(input.componentForm.cantidad, 1);
  const lineTemplateId = input.selectedTemplate
    ? String(input.selectedTemplate.id)
    : input.componentForm.lineTemplateId;
  const rules = input.selectedTemplate
    ? getLineTemplateCuttingRules(input.selectedTemplate.catalogMetadata)
    : null;
  const dims = { lineTemplateId, widthMm, heightMm, quantity };
  const draftMatches = cubicationSnapshotMatchesDimensions(
    input.componentForm.cubicationSnapshot,
    dims
  );
  const savedMatches = cubicationSnapshotMatchesDimensions(
    input.savedCubicationSnapshot,
    dims
  );
  const recipe = input.selectedTemplate
    ? resolveRecipeFromMetadata(input.selectedTemplate.catalogMetadata, {
        preferredRecipeId: input.componentForm.fabricationRecipeId ?? null,
        apertura: inferAperturaFromPiece(
          input.componentForm.tipo,
          input.componentForm.sistema
        ),
      })
    : null;
  const catalogHasRecipe = Boolean(recipe && recipe.components.length > 0);

  const autoSnapshot =
    input.selectedTemplate && widthMm > 0 && heightMm > 0 && recipe
      ? buildCubicationSnapshotFromCatalogMetadata({
          lineTemplateId,
          catalogMetadata: input.selectedTemplate.catalogMetadata,
          widthMm,
          heightMm,
          quantity,
          preferredRecipeId: recipe.id,
          apertura: inferAperturaFromPiece(
            input.componentForm.tipo,
            input.componentForm.sistema
          ),
        })
      : input.selectedTemplate && widthMm > 0 && heightMm > 0
        ? buildCubicationSnapshotFromCatalogMetadata({
            lineTemplateId,
            catalogMetadata: input.selectedTemplate.catalogMetadata,
            widthMm,
            heightMm,
            quantity,
            preferredRecipeId: input.componentForm.fabricationRecipeId ?? null,
            apertura: inferAperturaFromPiece(
              input.componentForm.tipo,
              input.componentForm.sistema
            ),
          })
        : null;

  // Receta de fabricación: nunca mostrar Marco/División genérico si la línea la tiene.
  if (catalogHasRecipe) {
    if (
      draftMatches &&
      input.componentForm.cubicationSnapshot?.source === "manual" &&
      snapshotUsesFabricationRecipe(input.componentForm.cubicationSnapshot) &&
      !isGeometricFallbackSnapshot(input.componentForm.cubicationSnapshot)
    ) {
      return input.componentForm.cubicationSnapshot;
    }
    if (
      savedMatches &&
      input.savedCubicationSnapshot?.source === "manual" &&
      snapshotUsesFabricationRecipe(input.savedCubicationSnapshot) &&
      !isGeometricFallbackSnapshot(input.savedCubicationSnapshot)
    ) {
      return input.savedCubicationSnapshot;
    }
    return autoSnapshot;
  }

  if (input.personalizadoAssistMode) {
    if (draftMatches && input.componentForm.cubicationSnapshot?.source === "manual") {
      return input.componentForm.cubicationSnapshot;
    }
    if (savedMatches && input.savedCubicationSnapshot?.source === "manual") {
      return input.savedCubicationSnapshot;
    }
    if (!input.selectedTemplate || widthMm <= 0 || heightMm <= 0) {
      return null;
    }
    return buildPersonalizadoManualCubicationDraft({
      lineTemplateId,
      catalogMetadata: input.selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }

  if (
    draftMatches &&
    input.componentForm.cubicationSnapshot &&
    !isGeometricFallbackSnapshot(input.componentForm.cubicationSnapshot)
  ) {
    return input.componentForm.cubicationSnapshot;
  }
  if (
    savedMatches &&
    input.savedCubicationSnapshot &&
    !isGeometricFallbackSnapshot(input.savedCubicationSnapshot)
  ) {
    return input.savedCubicationSnapshot;
  }
  if (autoSnapshot) return autoSnapshot;
  if (rules?.enabled) return null;
  return null;
}

/** Resuelve el preview activo (draft / guardado / auto) para UI de pauta o rail. */
export function resolveActiveCubicationPreview(input: {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  personalizadoAssistMode?: boolean;
}): CotizacionLineTemplateCuttingPreview | null {
  const activeSnapshot = resolveActiveCubicationSnapshot(input);
  return activeSnapshot ? cubicationSnapshotToPreview(activeSnapshot) : null;
}

export function formatCubicationMm(value: number) {
  return formatMm(value);
}

export function PautaCubicacionPanel({
  componentForm,
  selectedTemplate,
  savedCubicationSnapshot,
  onCubicationSnapshotChange,
  onFabricationRecipeIdChange,
  onFabricacionSnapshotChange,
  onFabricacionContextoChange,
  onFabricacionL25ConfigChange,
  onSaveCubicationLineAdjustment,
  isSavingCubicationLineAdjustment,
  lineSelectionHint = "precio",
  showBarUsageInline = true,
  personalizadoAssistMode = false,
  layout = "workspace",
}: Props) {
  const [qaPreliminaryAuthorized, setQaPreliminaryAuthorized] = useState(false);
  const widthMm = parsePositiveIntegerInput(componentForm.ancho);
  const heightMm = parsePositiveIntegerInput(componentForm.alto);
  const quantity = parsePositiveIntegerInput(componentForm.cantidad, 1);
  const compositionNeedsRecipeReview = Boolean(
    componentForm.guidedVisualConfig?.quickCompositionStructural ||
    hasQuickCompositionStructuralChanges(componentForm.quickCompositionAdjustment)
  );
  const lineTemplateId = selectedTemplate
    ? String(selectedTemplate.id)
    : componentForm.lineTemplateId;
  const rules = selectedTemplate
    ? getLineTemplateCuttingRules(selectedTemplate.catalogMetadata)
    : null;
  const cubicationConfig = selectedTemplate
    ? getLineTemplateCubicationConfig(selectedTemplate.catalogMetadata)
    : null;
  const pieceApertura = inferAperturaFromPiece(componentForm.tipo, componentForm.sistema);
  const numericLineTemplateId = Number(lineTemplateId);
  const {
    organizationId,
    recipes: persistedRecipes,
    isLoading: isLoadingPersistedRecipes,
    error: persistedRecipeError,
  } = useFabricationRecipes({
    enabled: Number.isInteger(numericLineTemplateId) && numericLineTemplateId > 0,
    lineTemplateId:
      Number.isInteger(numericLineTemplateId) && numericLineTemplateId > 0
        ? numericLineTemplateId
        : undefined,
    skipStructuralSeed: true,
  });
  const explicitTipologia =
    componentForm.fabricacionTipologia ||
    inferirTipologiaFabricacionPieza({
      tipo: componentForm.tipo,
      sistema: componentForm.sistema,
    });
  const effectiveFabricacionHojas = resolveComponentFabricacionHojas({
    sheetScheme: componentForm.sheetScheme,
    fabricacionHojas: componentForm.fabricacionHojas,
    hojasBase: componentForm.hojasBase,
    guidedVisualConfig: componentForm.guidedVisualConfig,
  });
  const catalogKey =
    componentForm.catalogLineKey ||
    selectedTemplate?.catalogKey ||
    null;
  const isSodalL25Line = isSodalL25CatalogKey(catalogKey);
  const selectedS75Variant = WINHOUSE_NEW_S75_VARIANTS.find(
    (variant) => variant.slug === componentForm.fabricacionVariante
  );
  const s75LineRailCount =
    catalogKey === WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY
      ? 2
      : catalogKey === WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY
        ? 3
        : null;
  const resolvedS75Variant = s75LineRailCount
    ? resolveWinHouseNewS75QuoteVariant({
        catalogKey,
        tipologia: explicitTipologia,
        hojas: effectiveFabricacionHojas,
        vidrio: componentForm.vidrio,
        variantHint: componentForm.fabricacionVariante,
        componentName: componentForm.tipo,
        system: componentForm.sistema,
      }).variant
    : null;
  const s75GlassBand =
    resolveWinHouseNewS75GlassBand(componentForm.vidrio) ??
    selectedS75Variant?.glassBand ??
    resolvedS75Variant?.glassBand ??
    "mono_4_6";
  const s75VariantOptions =
    s75LineRailCount
      ? WINHOUSE_NEW_S75_VARIANTS.filter(
          (variant) =>
            variant.railCount === s75LineRailCount &&
            variant.glassBand === s75GlassBand
        )
      : [];
  const selectedS75Geometry =
    selectedS75Variant?.geometrySlug ??
    resolvedS75Variant?.geometrySlug ??
    (s75LineRailCount === 3
      ? "triple_riel_3h_simetrica_80"
      : "doble_riel_2h_simetrica_80");
  const needsS75LeafAWidth = Boolean(
    catalogKey === WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY &&
      selectedS75Geometry.startsWith("doble_riel_2h_asimetrica_")
  );
  const s75LeafAWidth = componentForm.fabricacionAnchoHojaAMm ?? null;
  const s75LeafAWidthValid =
    s75LeafAWidth != null && s75LeafAWidth > 0 && s75LeafAWidth < widthMm;
  const inferredGlazing = inferSodalL25GlazingFromGlass({
    vidrio: componentForm.vidrio,
    catalogEspesor: selectedTemplate?.catalogMetadata
      ? String((selectedTemplate.catalogMetadata as Record<string, unknown>).espesor ?? "")
      : "",
    catalogTerminacion: selectedTemplate?.nombre ?? "",
  });
  const sodalConfig = isSodalL25Line
    ? resolveSodalL25QuoteConfig({
        catalogKey,
        presentation: {
          fabricacionGlazing: inferredGlazing || componentForm.fabricacionGlazing,
          fabricacionLeg: componentForm.fabricacionLeg ?? "",
          fabricacionReinforcement: componentForm.fabricacionReinforcement ?? "",
          fabricacionVariante: componentForm.fabricacionVariante ?? "",
          fabricacionHojas: effectiveFabricacionHojas,
          sheetScheme: componentForm.sheetScheme ?? "",
        },
        vidrio: componentForm.vidrio,
        sheetScheme: componentForm.sheetScheme ?? "",
        fabricacionHojas: effectiveFabricacionHojas,
      })
    : null;
  const formalResolution = useMemo(() => {
    if (compositionNeedsRecipeReview) {
      return {
        estado: "sin_receta" as const,
        receta: null,
        candidatas: [],
        descartadas: [],
        advertencias: [],
      };
    }
    if (
      isLoadingPersistedRecipes ||
      !explicitTipologia ||
      !Number.isInteger(numericLineTemplateId) ||
      numericLineTemplateId <= 0
    ) {
      return null;
    }

    if (isSodalL25Line && sodalConfig && !sodalConfig.complete) {
      return {
        estado: "sin_receta" as const,
        receta: null,
        candidatas: [],
        descartadas: [],
        advertencias: [],
      };
    }

    return resolveFabricationRecipe(persistedRecipes, {
      organizationId,
      lineTemplateId: numericLineTemplateId,
      catalogKey,
      tipologia: explicitTipologia,
      hojas: effectiveFabricacionHojas,
      modulos: componentForm.fabricacionModulos ?? null,
      anchoTotalMm: widthMm,
      altoTotalMm: heightMm,
      apertura:
        resolveAperturaForRecipeMatch(
          componentForm.fabricacionApertura || pieceApertura,
          componentForm.sistema
        ) || null,
      herraje: componentForm.fabricacionHerraje || null,
      variante: componentForm.fabricacionVariante || null,
      glazing: sodalConfig?.glazing ?? null,
      leg: sodalConfig?.leg ?? null,
      reinforcement: sodalConfig?.reinforcement ?? null,
      preferredRecipeId: componentForm.fabricationRecipeId || null,
      glassName: componentForm.vidrio || null,
      previewListaParaProbar: true,
    });
  }, [
    catalogKey,
    compositionNeedsRecipeReview,
    componentForm.fabricacionApertura,
    componentForm.fabricacionHerraje,
    componentForm.fabricacionHojas,
    componentForm.fabricacionModulos,
    componentForm.fabricacionVariante,
    componentForm.fabricationRecipeId,
    componentForm.vidrio,
    componentForm.guidedVisualConfig,
    componentForm.hojasBase,
    componentForm.sheetScheme,
    componentForm.sistema,
    effectiveFabricacionHojas,
    explicitTipologia,
    heightMm,
    isLoadingPersistedRecipes,
    isSodalL25Line,
    numericLineTemplateId,
    organizationId,
    persistedRecipes,
    pieceApertura,
    sodalConfig,
    widthMm,
  ]);
  const sodalLineHeaderLabel = useMemo(() => {
    if (!isSodalL25Line) {
      return selectedTemplate?.nombre ?? "";
    }

    if (formalResolution?.estado === "receta_unica" && formalResolution.receta) {
      return (
        formatSodalL25FullRecipeNameFromRecipe(formalResolution.receta) ??
        formatSodalL25ContextualLineName(effectiveFabricacionHojas)
      );
    }

    if (sodalConfig?.complete) {
      return (
        formatSodalL25FullRecipeNameFromVariant({
          leaves: sodalConfig.hojas,
          variantSlug: sodalConfig.variantSlug,
        }) ?? formatSodalL25ContextualLineName(sodalConfig.hojas)
      );
    }

    return formatSodalL25ContextualLineName(effectiveFabricacionHojas);
  }, [
    effectiveFabricacionHojas,
    formalResolution,
    isSodalL25Line,
    selectedTemplate?.nombre,
    sodalConfig,
  ]);
  const useFormalDomain = persistedRecipes.length > 0;
  const selectedPersistedRecipe =
    formalResolution?.estado === "receta_unica" ||
    formalResolution?.estado === "receta_no_validada"
      ? formalResolution.receta
      : null;
  const qaPreliminaryCandidate = useMemo(() => {
    if (
      !selectedPersistedRecipe ||
      catalogKey !== VERATEC_7400_CATALOG_KEY ||
      selectedPersistedRecipe.status !== "draft" ||
      selectedPersistedRecipe.definition.estado !== "lista_para_validar" ||
      selectedPersistedRecipe.definition.identidad.variante !== VERATEC_7400_VARIANT_MONOLITICO_4MM ||
      (componentForm.fabricationRecipeId != null &&
        componentForm.fabricationRecipeId !== selectedPersistedRecipe.id) ||
      formalResolution?.receta?.id !== selectedPersistedRecipe.id ||
      widthMm <= 0 ||
      heightMm <= 0 ||
      quantity <= 0
    ) {
      return false;
    }

    const compositionComplete = buildFabricationRecipeSummary(
      selectedPersistedRecipe.definition
    ).compositionComplete;
    if (!compositionComplete) return false;
    return calcularCubicacionYPauta(selectedPersistedRecipe.definition, {
      anchoTotalMm: widthMm,
      altoTotalMm: heightMm,
      cantidad: quantity,
      hojas: selectedPersistedRecipe.definition.identidad.hojas,
      modulos: selectedPersistedRecipe.definition.identidad.modulos,
      variante: selectedPersistedRecipe.definition.identidad.variante,
    }).calculable;
  }, [
    catalogKey,
    componentForm.fabricationRecipeId,
    formalResolution?.receta?.id,
    heightMm,
    quantity,
    selectedPersistedRecipe,
    widthMm,
  ]);

  useEffect(() => {
    let cancelled = false;
    setQaPreliminaryAuthorized(false);
    if (!qaPreliminaryCandidate || organizationId == null || String(organizationId) !== "3") {
      return () => {
        cancelled = true;
      };
    }

    void fetch("/api/proveedor-catalogos/qa-context", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        const payload = (await response.json()) as { allowPreliminaryRecipeSnapshots?: boolean };
        return payload.allowPreliminaryRecipeSnapshots === true;
      })
      .then((authorized) => {
        if (!cancelled) setQaPreliminaryAuthorized(authorized);
      })
      .catch(() => {
        if (!cancelled) setQaPreliminaryAuthorized(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, qaPreliminaryCandidate]);

  const selectedPersistedRecipeReady = useMemo(() => {
    if (!selectedPersistedRecipe) return false;
    const compositionComplete = buildFabricationRecipeSummary(
      selectedPersistedRecipe.definition
    ).compositionComplete;
    const technicalGate =
      selectedPersistedRecipe.status === "validated" ||
      evaluarRecetaListaParaProbar(selectedPersistedRecipe.definition).listaParaProbar;
    const calculableWinHouseDraft = isPreviewableWinHouseDraft({
      recipe: selectedPersistedRecipe,
      catalogKey,
      widthMm,
      heightMm,
      quantity,
    });
    // Las recetas Ventora WinHouse se muestran como pauta preliminar cuando
    // sus fórmulas sí calculan, aunque el taller aún deba completar códigos,
    // largos comerciales u otros datos de validación.
    return (compositionComplete && technicalGate) || calculableWinHouseDraft ||
      (qaPreliminaryAuthorized && qaPreliminaryCandidate);
  }, [
    catalogKey,
    heightMm,
    quantity,
    qaPreliminaryAuthorized,
    qaPreliminaryCandidate,
    selectedPersistedRecipe,
    widthMm,
  ]);
  const formalSnapshot = useMemo(() => {
    if (
      !selectedPersistedRecipe ||
      !selectedPersistedRecipeReady ||
      (needsS75LeafAWidth && !s75LeafAWidthValid) ||
      widthMm <= 0 ||
      heightMm <= 0 ||
      quantity <= 0
    ) {
      return null;
    }

    const built = construirSnapshotFabricacionCotizacion({
      recipe: selectedPersistedRecipe,
      supplierFamilyKey:
        typeof selectedTemplate?.catalogMetadata?.familyKey === "string"
          ? selectedTemplate.catalogMetadata.familyKey
          : null,
      entrada: {
        anchoTotalMm: widthMm,
        anchoHojaAMm: s75LeafAWidth,
        altoTotalMm: heightMm,
        cantidad: quantity,
        hojas: selectedPersistedRecipe.definition.identidad.hojas,
        modulos: selectedPersistedRecipe.definition.identidad.modulos,
        variante: selectedPersistedRecipe.definition.identidad.variante,
      },
    });
    if (!qaPreliminaryAuthorized || !qaPreliminaryCandidate) return built;
    return {
      ...built,
      qaPreliminary: {
        mode: "supplier_catalog_v1_qa_preliminary" as const,
        readiness: "lista_para_validar" as const,
        provenance: {
          sourceType: selectedPersistedRecipe.sourceType,
          sourceReference: selectedPersistedRecipe.sourceReference,
        },
      },
    };
  }, [
    explicitTipologia,
    formalResolution?.estado,
    heightMm,
    numericLineTemplateId,
    persistedRecipes.length,
    qaPreliminaryAuthorized,
    qaPreliminaryCandidate,
    quantity,
    selectedPersistedRecipe,
    selectedPersistedRecipeReady,
    needsS75LeafAWidth,
    s75LeafAWidth,
    s75LeafAWidthValid,
    widthMm,
  ]);
  const formalLegacySnapshot = useMemo(
    () =>
      formalSnapshot
        ? fabricacionSnapshotToLegacyCubicationSnapshot(formalSnapshot)
        : null,
    [formalSnapshot]
  );
  useEffect(() => {
    if (!useFormalDomain) return;

    if (!formalSnapshot || !selectedPersistedRecipe) {
      if (componentForm.fabricacionSnapshot) {
        onFabricacionSnapshotChange?.(null);
      }
      return;
    }

    const current = componentForm.fabricacionSnapshot;
    const alreadySynced =
      current?.recipeId === formalSnapshot.recipeId &&
      current?.input.anchoTotalMm === formalSnapshot.input.anchoTotalMm &&
      current?.input.altoTotalMm === formalSnapshot.input.altoTotalMm &&
      current?.input.cantidad === formalSnapshot.input.cantidad;
    const sameLeafAWidth =
      current?.input.anchoHojaAMm === formalSnapshot.input.anchoHojaAMm;
    if (alreadySynced && sameLeafAWidth) return;

    onFabricationRecipeIdChange?.(selectedPersistedRecipe.id);
    onFabricacionContextoChange?.({
      tipologia: selectedPersistedRecipe.definition.identidad.tipologia,
      hojas: selectedPersistedRecipe.definition.identidad.hojas,
      modulos: selectedPersistedRecipe.definition.identidad.modulos,
      apertura:
        selectedPersistedRecipe.definition.identidad.apertura ??
        pieceApertura ??
        "",
      herraje: selectedPersistedRecipe.definition.identidad.herraje ?? "",
      variante: selectedPersistedRecipe.definition.identidad.variante,
      anchoHojaAMm: s75LeafAWidth,
    });
    onFabricacionSnapshotChange?.(formalSnapshot);
    onCubicationSnapshotChange(formalLegacySnapshot);
    // Los callbacks pertenecen al formulario padre; la guarda por identidad evita ciclos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    componentForm.fabricacionSnapshot,
    formalLegacySnapshot,
    formalSnapshot,
    pieceApertura,
    selectedPersistedRecipe,
    useFormalDomain,
  ]);
  const recipePack = selectedTemplate
    ? getFabricationRecipePackFromMetadata(
        selectedTemplate.catalogMetadata as Record<string, unknown>
      )
    : null;
  const recipeSelection =
    recipePack && recipePack.recipes.length > 0
      ? selectRecipeForQuote({
          pack: recipePack,
          apertura: pieceApertura,
          preferredRecipeId: componentForm.fabricationRecipeId ?? null,
        })
      : null;
  const fabricationRecipe =
    recipeSelection?.recipe ??
    (selectedTemplate
      ? resolveRecipeFromMetadata(selectedTemplate.catalogMetadata, {
          preferredRecipeId: componentForm.fabricationRecipeId ?? null,
          apertura: pieceApertura,
        })
      : null);
  const legacyNeedsVariantChoice = Boolean(
    recipeSelection?.needsVariantChoice && !componentForm.fabricationRecipeId
  );
  const formalNeedsVariantChoice =
    formalResolution?.estado === "multiples_recetas";
  const needsVariantChoice = useFormalDomain
    ? formalNeedsVariantChoice
    : legacyNeedsVariantChoice;
  const dims = { lineTemplateId, widthMm, heightMm, quantity };
  const draftMatches = cubicationSnapshotMatchesDimensions(
    componentForm.cubicationSnapshot,
    dims
  );
  const savedMatches = cubicationSnapshotMatchesDimensions(savedCubicationSnapshot, dims);
  const legacyAutoSnapshot =
    !compositionNeedsRecipeReview &&
    !useFormalDomain &&
    !personalizadoAssistMode &&
    selectedTemplate &&
    (rules?.enabled || Boolean(fabricationRecipe)) &&
    widthMm > 0 &&
    heightMm > 0 &&
    !needsVariantChoice
      ? buildCubicationSnapshotFromCatalogMetadata({
          lineTemplateId,
          catalogMetadata: selectedTemplate.catalogMetadata,
          widthMm,
          heightMm,
          quantity,
          preferredRecipeId:
            componentForm.fabricationRecipeId ?? fabricationRecipe?.id ?? null,
          apertura: pieceApertura,
        })
      : null;
  const autoSnapshot = useFormalDomain ? formalLegacySnapshot : legacyAutoSnapshot;
  useEffect(() => {
    if (compositionNeedsRecipeReview || !personalizadoAssistMode || !selectedTemplate || widthMm <= 0 || heightMm <= 0) {
      return;
    }
    const hasUsableManual =
      (draftMatches && componentForm.cubicationSnapshot?.source === "manual") ||
      (savedMatches && savedCubicationSnapshot?.source === "manual");
    if (hasUsableManual) {
      return;
    }
    const next = buildPersonalizadoManualCubicationDraft({
      lineTemplateId: String(selectedTemplate.id),
      catalogMetadata: selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
    if (next) {
      onCubicationSnapshotChange(next);
    }
    // Solo sembrar cuando faltan medidas/manual usable; no reaccionar al objeto draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed acotado a dims/modo
  }, [
    compositionNeedsRecipeReview,
    personalizadoAssistMode,
    selectedTemplate?.id,
    widthMm,
    heightMm,
    quantity,
    draftMatches,
    savedMatches,
    componentForm.cubicationSnapshot?.source,
    savedCubicationSnapshot?.source,
  ]);

  const legacyActiveSnapshot = resolveActiveCubicationSnapshot({
    componentForm,
    selectedTemplate,
    savedCubicationSnapshot,
    personalizadoAssistMode,
  });
  const activeSnapshot: CotizacionItemCubicationSnapshot | null = useFormalDomain
    ? formalLegacySnapshot
    : legacyActiveSnapshot;
  const preview = activeSnapshot ? cubicationSnapshotToPreview(activeSnapshot) : null;
  const hasCuts = Boolean(preview && preview.cuts.length > 0);
  const isManual = activeSnapshot?.source === "manual";
  const statusLabel = personalizadoAssistMode
    ? "Borrador manual"
    : isManual
      ? "Ajustada manualmente"
      : selectedPersistedRecipe
          ? !selectedPersistedRecipeReady
            ? "Configuración técnica pendiente"
            : selectedPersistedRecipe.status === "validated"
              ? "Validada por tu taller"
              : "Cálculo preliminar"
        : draftMatches || savedMatches
          ? "Snapshot guardado"
        : fabricationRecipe
          ? RECIPE_STATUS_LABELS[fabricationRecipe.status]
          : cubicationConfig
            ? LINE_TEMPLATE_CUBICATION_STATUS_LABELS[cubicationConfig.status]
            : "Sin configurar";
  const isValidated = personalizadoAssistMode
    ? false
    : isManual
      ? false
      : activeSnapshot
        ? activeSnapshot.status === "validada"
        : selectedPersistedRecipe
          ? selectedPersistedRecipeReady && selectedPersistedRecipe.status === "validated"
        : fabricationRecipe
          ? fabricationRecipe.status === "validada"
          : cubicationConfig?.status === "validada";
  const readOnlyFormalSnapshot = Boolean(formalSnapshot);

  const supplierPresentationRequests = useMemo(() => {
    const supplierFamilyKey = formalSnapshot?.supplierFamilyKey;
    const resolvedCatalogLineKey = catalogKey ?? selectedTemplate?.catalogKey ?? null;
    const technicalCodes = formalSnapshot?.result.perfiles
      .map((profile) => profile.codigoPerfil.trim())
      .filter(Boolean) ?? [];
    if (!supplierFamilyKey || !resolvedCatalogLineKey || technicalCodes.length === 0) return [];
    return [{
      itemId: "pauta-preview",
      catalogLineKey: resolvedCatalogLineKey,
      familyKey: supplierFamilyKey,
      finishName: resolveSupplierFinishName(null, componentForm.colorHex),
      technicalCodes: [...new Set(technicalCodes)],
    }];
  }, [formalSnapshot, catalogKey, selectedTemplate?.catalogKey, componentForm.colorHex]);
  const supplierPresentationResolution = useSupplierPresentationResolution(supplierPresentationRequests);
  const supplierTrabajoSnapshot = useMemo(() => {
    if (!formalSnapshot || supplierPresentationResolution.result?.enabled !== true) return null;
    return construirFabricacionTrabajoSnapshot({
      items: [{
        id: "pauta-preview",
        codigo: "V1",
        nombre: selectedTemplate?.nombre ?? "Vista previa",
        lineaComercial: selectedTemplate?.nombre ?? "Vista previa",
        colorHex: componentForm.colorHex,
        catalogLineKey: catalogKey ?? selectedTemplate?.catalogKey ?? null,
        supplierFamilyKey: formalSnapshot.supplierFamilyKey,
        supplierPresentationSelections: supplierPresentationResolution.result.selections["pauta-preview"] ?? [],
        requireSupplierPresentation: Boolean(formalSnapshot.supplierFamilyKey),
        snapshot: formalSnapshot,
      }],
    });
  }, [
    formalSnapshot,
    supplierPresentationResolution.result,
    selectedTemplate?.nombre,
    componentForm.colorHex,
    catalogKey,
    selectedTemplate?.catalogKey,
  ]);
  const hasSupplierPresentationResolution = supplierPresentationResolution.result?.enabled === true;
  const previewBars = hasSupplierPresentationResolution
    ? (supplierTrabajoSnapshot?.bars ?? []).map((bar) => ({
        key: `${bar.materialKey}-${bar.presentationKey}-${bar.indice}`,
        codigoPerfil: bar.codigoPerfil,
        indice: bar.indice,
        largoComercialMm: bar.largoComercialMm,
        usadoMm: bar.usadoMm,
        sobranteMm: bar.sobranteMm,
      }))
    : (preview?.bars ?? []).map((bar) => ({
        key: `legacy-${bar.index}`,
        codigoPerfil: bar.profileCode,
        indice: bar.index,
        largoComercialMm: bar.barLengthMm ?? null,
        usadoMm: bar.usedMm,
        sobranteMm: bar.wasteMm,
      }));
  const previewTotalWasteMm = hasSupplierPresentationResolution
    ? supplierTrabajoSnapshot?.totalWasteMm ?? 0
    : preview?.totalWasteMm ?? 0;
  const unresolvedSupplierPresentations = supplierTrabajoSnapshot?.missingPresentations ?? [];

  const [isPautaExpanded, setIsPautaExpanded] = useState(false);
  const adjustmentContextKey = `${selectedTemplate?.id ?? "sin-linea"}:${widthMm}:${heightMm}:${quantity}`;
  const [storedAdjustmentState, setStoredAdjustmentState] = useState<{
    contextKey: string;
    isOpen: boolean;
    hasOffered: boolean;
    pendingSnapshot: CotizacionItemCubicationSnapshot | null;
  }>({
    contextKey: adjustmentContextKey,
    isOpen: false,
    hasOffered: false,
    pendingSnapshot: null,
  });
  const adjustmentState =
    storedAdjustmentState.contextKey === adjustmentContextKey
      ? storedAdjustmentState
      : {
          contextKey: adjustmentContextKey,
          isOpen: false,
          hasOffered: false,
          pendingSnapshot: null,
        };
  const isAdjustmentChoiceOpen = adjustmentState.isOpen;
  const hasOfferedAdjustmentChoice = adjustmentState.hasOffered;
  const pendingAdjustmentSnapshot = adjustmentState.pendingSnapshot;
  const setIsAdjustmentChoiceOpen = (isOpen: boolean) => {
    setStoredAdjustmentState((current) => ({
      ...(current.contextKey === adjustmentContextKey
        ? current
        : adjustmentState),
      contextKey: adjustmentContextKey,
      isOpen,
    }));
  };
  const setHasOfferedAdjustmentChoice = (hasOffered: boolean) => {
    setStoredAdjustmentState((current) => ({
      ...(current.contextKey === adjustmentContextKey
        ? current
        : adjustmentState),
      contextKey: adjustmentContextKey,
      hasOffered,
    }));
  };
  const setPendingAdjustmentSnapshot = (
    pendingSnapshot: CotizacionItemCubicationSnapshot | null
  ) => {
    setStoredAdjustmentState((current) => ({
      ...(current.contextKey === adjustmentContextKey
        ? current
        : adjustmentState),
      contextKey: adjustmentContextKey,
      pendingSnapshot,
    }));
  };

  const adjustmentSummary = useMemo(() => {
    if (!selectedTemplate || !activeSnapshot || activeSnapshot.source !== "manual") {
      return null;
    }
    if (!autoSnapshot) return null;
    return summarizeCubicationLineAdjustment({
      catalogMetadata: selectedTemplate.catalogMetadata,
      cuts: activeSnapshot.cuts,
      widthMm,
      heightMm,
      sashCount: rules?.sashCount,
      autoCuts: autoSnapshot.cuts,
      autoGlass: autoSnapshot.glass,
      manualGlass: activeSnapshot.glass,
    });
  }, [
    selectedTemplate,
    activeSnapshot,
    autoSnapshot,
    widthMm,
    heightMm,
    rules?.sashCount,
  ]);

  const commitSnapshot = (next: CotizacionItemCubicationSnapshot | null) => {
    onCubicationSnapshotChange(next);
  };

  const ensureEditableBase = () => {
    if (activeSnapshot) return activeSnapshot;
    if (personalizadoAssistMode && selectedTemplate) {
      return buildPersonalizadoManualCubicationDraft({
        lineTemplateId,
        catalogMetadata: selectedTemplate.catalogMetadata,
        widthMm,
        heightMm,
        quantity,
      });
    }
    return autoSnapshot;
  };

  const handleCutFieldChange = (
    cutIndex: number,
    field: "label" | "functionLabel" | "lengthMm" | "quantity",
    value: string
  ) => {
    const base = ensureEditableBase();
    if (!base) return;

    const previousLength = base.cuts[cutIndex]?.lengthMm;
    const nextCuts = base.cuts.map((cut, index) => {
      if (index !== cutIndex) return cut;
      if (field === "label" || field === "functionLabel") {
        return { ...cut, [field]: value };
      }
      const numeric = parsePositiveIntegerInput(value, field === "quantity" ? 1 : 1);
      return {
        ...cut,
        [field]: numeric,
        totalLinealMm: field === "lengthMm" ? numeric * cut.quantity : cut.lengthMm * numeric,
      };
    });

    const nextSnapshot = rebuildCubicationSnapshotWithCuts(base, nextCuts, {
      source: "manual",
      barLengthMm: rules?.barLengthMm,
      sawKerfMm: rules?.sawKerfMm,
    });
    commitSnapshot(nextSnapshot);

    if (
      field === "lengthMm" &&
      !personalizadoAssistMode &&
      onSaveCubicationLineAdjustment &&
      !hasOfferedAdjustmentChoice
    ) {
      const nextLength = parsePositiveIntegerInput(value, 1);
      if (previousLength != null && previousLength !== nextLength) {
        setHasOfferedAdjustmentChoice(true);
        setPendingAdjustmentSnapshot(nextSnapshot);
        setIsAdjustmentChoiceOpen(true);
      }
    }
  };

  const handleAddCut = () => {
    const base = ensureEditableBase();
    if (!base) return;
    commitSnapshot(
      rebuildCubicationSnapshotWithCuts(base, [...base.cuts, createEmptyCubicationCutDraft()], {
        source: "manual",
        barLengthMm: rules?.barLengthMm,
        sawKerfMm: rules?.sawKerfMm,
      })
    );
  };

  const handleRemoveCut = (cutIndex: number) => {
    const base = ensureEditableBase();
    if (!base || base.cuts.length <= 1) return;
    const nextCuts = base.cuts.filter((_, index) => index !== cutIndex);
    commitSnapshot(
      rebuildCubicationSnapshotWithCuts(base, nextCuts, {
        source: "manual",
        barLengthMm: rules?.barLengthMm,
        sawKerfMm: rules?.sawKerfMm,
      })
    );
  };

  const handleRecalcular = () => {
    if (personalizadoAssistMode) {
      return;
    }
    if (!autoSnapshot) return;
    setHasOfferedAdjustmentChoice(false);
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    commitSnapshot(autoSnapshot);
  };

  const handleRestaurar = () => {
    if (personalizadoAssistMode) {
      return;
    }
    if (!autoSnapshot) return;
    setHasOfferedAdjustmentChoice(false);
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    commitSnapshot({ ...autoSnapshot, source: "auto" });
  };

  const handleReiniciarBorradorPersonalizado = () => {
    if (!personalizadoAssistMode || !selectedTemplate) {
      return;
    }
    const next = buildPersonalizadoManualCubicationDraft({
      lineTemplateId,
      catalogMetadata: selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
    if (next) {
      commitSnapshot(next);
    }
  };

  const handleGuardarAjusteLinea = () => {
    if (!isManual || !onSaveCubicationLineAdjustment) {
      return;
    }
    setPendingAdjustmentSnapshot(
      activeSnapshot?.source === "manual" ? activeSnapshot : null
    );
    setIsAdjustmentChoiceOpen(true);
  };

  const handleKeepQuoteOnly = () => {
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
  };

  const handleConfirmSaveToLine = () => {
    const snapshot =
      pendingAdjustmentSnapshot?.source === "manual"
        ? pendingAdjustmentSnapshot
        : activeSnapshot?.source === "manual"
          ? activeSnapshot
          : null;
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    void onSaveCubicationLineAdjustment?.({ snapshot });
  };

  const glassAreaLabel = preview?.glass
    ? `${preview.glass.totalM2.toLocaleString("es-CL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} m²`
    : "—";
  const glassSizeLabel = preview?.glass
    ? `${preview.glass.widthMm.toLocaleString("es-CL")} × ${preview.glass.heightMm.toLocaleString("es-CL")} mm`
    : null;
  const profilesSummary = preview
    ? `${(preview.totalProfilesLinealMm / 1000).toFixed(2)} ml`
    : "—";
  const profilesCutUnits = preview
    ? preview.cuts.reduce((sum, cut) => sum + Math.max(1, cut.quantity), 0)
    : 0;
  const profilesCutsLabel = preview
    ? `${profilesCutUnits} ${profilesCutUnits === 1 ? "corte" : "cortes"}`
    : null;

  const handlePersistedRecipeSelection = (recipeId: string) => {
    onFabricationRecipeIdChange?.(recipeId);
    const recipe = formalResolution?.candidatas.find(
      (candidate) => candidate.id === recipeId
    );
    if (!recipe) {
      onFabricacionSnapshotChange?.(null);
      onCubicationSnapshotChange(null);
      return;
    }

    onFabricacionContextoChange?.({
      tipologia: recipe.definition.identidad.tipologia,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      apertura: recipe.definition.identidad.apertura ?? pieceApertura ?? "",
      herraje: recipe.definition.identidad.herraje ?? "",
      variante: recipe.definition.identidad.variante,
      anchoHojaAMm: s75LeafAWidth,
    });

    const compositionComplete = buildFabricationRecipeSummary(
      recipe.definition
    ).compositionComplete;
    const technicalGate =
      recipe.status === "validated" ||
      evaluarRecetaListaParaProbar(recipe.definition).listaParaProbar ||
      isPreviewableWinHouseDraft({
        recipe,
        catalogKey,
        widthMm,
        heightMm,
        quantity,
      });
    if (
      !compositionComplete ||
      !technicalGate ||
      (needsS75LeafAWidth && !s75LeafAWidthValid) ||
      widthMm <= 0 ||
      heightMm <= 0
    ) {
      onFabricacionSnapshotChange?.(null);
      onCubicationSnapshotChange(null);
      return;
    }

    const snapshot = construirSnapshotFabricacionCotizacion({
      recipe,
      supplierFamilyKey:
        typeof selectedTemplate?.catalogMetadata?.familyKey === "string"
          ? selectedTemplate.catalogMetadata.familyKey
          : null,
      entrada: {
        anchoTotalMm: widthMm,
        anchoHojaAMm: s75LeafAWidth,
        altoTotalMm: heightMm,
        cantidad: quantity,
        hojas: recipe.definition.identidad.hojas,
        modulos: recipe.definition.identidad.modulos,
        variante: recipe.definition.identidad.variante,
      },
    });
    onFabricacionSnapshotChange?.(snapshot);
    onCubicationSnapshotChange(
      fabricacionSnapshotToLegacyCubicationSnapshot(snapshot)
    );
  };

  const waitingReason = persistedRecipeError
    ? `No se pudo cargar la receta de fabricación: ${persistedRecipeError}`
    : compositionNeedsRecipeReview
      ? "La composición cambió. La pauta automática queda pendiente hasta tener una receta compatible."
    : isSodalL25Line && sodalConfig && !sodalConfig.complete
    ? "Selecciona la configuración L25 para generar la pauta de corte."
    : needsS75LeafAWidth && !s75LeafAWidthValid
      ? "Indica el ancho de la hoja A; la hoja B se calcula con el ancho restante."
    : needsVariantChoice
    ? "Elige la variante de fabricación para esta configuración."
    : !selectedTemplate
    ? lineSelectionHint === "medidas"
      ? personalizadoAssistMode
        ? "Elige una línea comercial en Terminaciones para armar el borrador de pauta."
        : "Elige una línea comercial en Terminaciones para generar la pauta."
      : personalizadoAssistMode
        ? "Elige una línea comercial en Precio para armar el borrador de pauta."
        : "Elige una línea comercial en Precio para generar la pauta de esta pieza."
    : useFormalDomain && formalResolution?.estado === "sin_receta"
      ? effectiveFabricacionHojas != null
        ? "No hay receta compatible con esta tipología y cantidad de hojas."
        : formalResolution.candidatas.length > 0
          ? "Hay recetas para esta linea, pero ninguna validada coincide con esta pieza."
          : "Esta linea todavia no tiene una receta compatible validada."
    : useFormalDomain && selectedPersistedRecipe && !selectedPersistedRecipeReady
      ? describeIncompleteFabricacionMessage(
          isFabricacionRecipeReadyForSnapshot(selectedPersistedRecipe).pendingFields
        )
    : useFormalDomain && isLoadingPersistedRecipes
      ? "Cargando receta de fabricación…"
    : !useFormalDomain &&
        !personalizadoAssistMode &&
        !rules?.enabled &&
        !fabricationRecipe
      ? "Esta línea no tiene pauta activa. Actívala en Líneas y precios."
      : widthMm <= 0 || heightMm <= 0
        ? "Completa ancho y alto para ver vidrio, perfiles y cortes."
        : !hasCuts
          ? "Con estas medidas aún no hay cortes para mostrar."
          : null;

  const s75LeafWidthControl = needsS75LeafAWidth ? (
    <label className={editor.s75LeafSplitControl}>
      <span>Ancho hoja A (mm)</span>
      <input
        type="number"
        min={1}
        max={Math.max(1, widthMm - 1)}
        step={1}
        value={s75LeafAWidth ?? ""}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          const nextWidth = raw.trim() ? parsePositiveIntegerInput(raw, 0) : null;
          onFabricacionContextoChange?.({
            tipologia: selectedPersistedRecipe?.definition.identidad.tipologia ?? explicitTipologia ?? "corredera",
            hojas: selectedPersistedRecipe?.definition.identidad.hojas ?? 2,
            modulos: selectedPersistedRecipe?.definition.identidad.modulos ?? 2,
            apertura: selectedPersistedRecipe?.definition.identidad.apertura ?? "corredera",
            herraje: selectedPersistedRecipe?.definition.identidad.herraje ?? "",
            variante: componentForm.fabricacionVariante ?? "",
            anchoHojaAMm: nextWidth,
          });
          onFabricacionSnapshotChange?.(null);
          onCubicationSnapshotChange(null);
        }}
        aria-label="Ancho de la hoja A en milímetros"
      />
      <small>
        {s75LeafAWidthValid
          ? `Hoja B: ${formatMm(widthMm - s75LeafAWidth)}`
          : "La hoja A debe ser menor que el ancho total."}
      </small>
    </label>
  ) : null;

  const s75GeometryControl = s75LineRailCount ? (
    <label className={editor.s75GeometryControl}>
      <span>Configuración de corte WinHouse New S75</span>
      <select
        aria-label="Configuración de corte WinHouse New S75"
        value={selectedS75Geometry}
        disabled={s75VariantOptions.length === 0}
        onChange={(event) => {
          const nextVariant = s75VariantOptions.find(
            (variant) => variant.geometrySlug === event.currentTarget.value
          );
          if (!nextVariant) return;

          const isTwoLeafAsymmetric =
            nextVariant.geometrySlug.startsWith("doble_riel_2h_asimetrica_");
          onFabricationRecipeIdChange?.("");
          onFabricacionContextoChange?.({
            tipologia: nextVariant.typology,
            hojas: nextVariant.leaves,
            modulos: nextVariant.leaves,
            apertura: "corredera",
            herraje: "",
            variante: nextVariant.slug,
            anchoHojaAMm: isTwoLeafAsymmetric ? s75LeafAWidth : null,
          });
          onFabricacionSnapshotChange?.(null);
          onCubicationSnapshotChange(null);
        }}
      >
        {s75VariantOptions.map((variant) => (
          <option key={variant.geometrySlug} value={variant.geometrySlug}>
            {variant.geometryLabel}
          </option>
        ))}
      </select>
      <small>El vidrio elegido selecciona automáticamente la banda de junquillo de la pauta.</small>
    </label>
  ) : null;


  if (
    needsVariantChoice &&
    selectedTemplate &&
    (formalResolution?.estado === "multiples_recetas" || recipeSelection)
  ) {
    return (
      <section
        className={`${editor.cubicacionCard} ${
          layout === "compact" ? editor.cubicacionCardCompact : editor.cubicacionCardWorkspace
        }`}
        aria-label="Cubicación y pauta"
      >
        <header className={editor.cubicacionCardHead}>
          <div>
            <small>{layout === "compact" ? "Estimación" : "Despiece"}</small>
            <strong>Cubicación y pauta</strong>
            <p>
              Tipología y hojas ya elegidas
              {effectiveFabricacionHojas
                ? ` · ${effectiveFabricacionHojas} hojas`
                : ""}
              . Elige la variante de fabricación.
            </p>
          </div>
          <em className={editor.cubicacionStatusMuted}>Elegir variante</em>
        </header>
        <label className={editor.cubicacionWaiting}>
          <span>Variante de fabricación</span>
          <select
            value={componentForm.fabricationRecipeId ?? ""}
            onChange={(event) => {
              const recipeId = event.target.value;
              if (useFormalDomain) {
                handlePersistedRecipeSelection(recipeId);
                return;
              }
              onFabricationRecipeIdChange?.(recipeId);
              if (!selectedTemplate || !recipeId || widthMm <= 0 || heightMm <= 0) return;
              const next = buildCubicationSnapshotFromCatalogMetadata({
                lineTemplateId: String(selectedTemplate.id),
                catalogMetadata: selectedTemplate.catalogMetadata,
                widthMm,
                heightMm,
                quantity,
                preferredRecipeId: recipeId,
                apertura: pieceApertura,
              });
              onCubicationSnapshotChange(next);
            }}
          >
            <option value="">Selecciona…</option>
            {useFormalDomain && formalResolution?.estado === "multiples_recetas"
              ? formalResolution.candidatas.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {formatVariantDisplayLabel(candidate)}
                    {` · ${candidate.definition.identidad.hojas} hojas · v${candidate.version}`}
                  </option>
                ))
              : recipeSelection?.candidates.map((candidate: FabricationRecipe) => (
                  <option key={candidate.id} value={candidate.id}>
                    {herrajeDisplayLabel(
                      candidate.herrajeTipo,
                      candidate.herrajeLabel
                    )}
                    {candidate.variant ? ` · ${candidate.variant}` : ""}
                  </option>
                ))}
          </select>
        </label>
      </section>
    );
  }

  if (waitingReason) {
    return (
      <section
        className={`${editor.cubicacionCard} ${
          layout === "compact" ? editor.cubicacionCardCompact : editor.cubicacionCardWorkspace
        }`}
        aria-label="Cubicación y pauta"
      >
        <header className={editor.cubicacionCardHead}>
          <div>
            <small>{layout === "compact" ? "Estimación" : "Despiece"}</small>
            <strong>Cubicación y pauta</strong>
            <p>
              {personalizadoAssistMode
                ? "Composición Personalizado: la pauta se arma a mano."
                : "Estimación interna sin precio. Aparece al tener línea y vano."}
            </p>
          </div>
          <em className={editor.cubicacionStatusMuted}>Pendiente</em>
        </header>
        <div className={editor.cubicacionWaiting}>
          {waitingReason}
          {s75GeometryControl}
          {s75LeafWidthControl}
          {isSodalL25Line && sodalConfig && effectiveFabricacionHojas ? (
            <FabricationVariantSelector
              recipes={persistedRecipes}
              glazing={sodalConfig.glazing}
              hojas={effectiveFabricacionHojas}
              leg={(componentForm.fabricacionLeg as "" | "open" | "closed") ?? ""}
              reinforcement={
                (componentForm.fabricacionReinforcement as "" | "normal" | "reinforced") ?? ""
              }
              onLegChange={(value) => {
                onFabricacionL25ConfigChange?.({
                  catalogLineKey: SODAL_L25_CATALOG_KEY,
                  fabricacionGlazing: sodalConfig.glazing,
                  fabricacionLeg: value,
                  fabricacionReinforcement: componentForm.fabricacionReinforcement ?? "",
                  fabricacionVariante: componentForm.fabricacionVariante ?? "",
                });
              }}
              onReinforcementChange={(value) => {
                const variantSlug =
                  componentForm.fabricacionLeg && value
                    ? `${sodalConfig.glazing}_${componentForm.fabricacionLeg}_${value}`
                    : componentForm.fabricacionVariante ?? "";
                onFabricacionL25ConfigChange?.({
                  catalogLineKey: SODAL_L25_CATALOG_KEY,
                  fabricacionGlazing: sodalConfig.glazing,
                  fabricacionLeg: componentForm.fabricacionLeg ?? "",
                  fabricacionReinforcement: value,
                  fabricacionVariante: variantSlug,
                });
              }}
            />
          ) : null}
        </div>
      </section>
    );
  }

  if (!preview || !activeSnapshot) {
    return null;
  }

  const cardClassName = [
    editor.cubicacionCard,
    layout === "compact" ? editor.cubicacionCardCompact : editor.cubicacionCardWorkspace,
    personalizadoAssistMode ? editor.cubicacionCardPersonalizado : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cardClassName} aria-label="Cubicación y pauta">
      <header className={editor.cubicacionCardHead}>
        <div>
          <small>{layout === "compact" ? "Estimación de materiales" : "Despiece"}</small>
          <strong>
            {personalizadoAssistMode ? "Pauta manual (Personalizado)" : "Cubicación y pauta"}
          </strong>
          <p>
            {formatMm(widthMm)} × {formatMm(heightMm)} · {quantity}{" "}
            {quantity === 1 ? "unidad" : "unidades"}
            {sodalLineHeaderLabel ? ` · ${sodalLineHeaderLabel}` : ""}
          </p>
        </div>
        <em
          className={
            personalizadoAssistMode || isManual || !isValidated
              ? editor.cubicacionStatusWarn
              : editor.cubicacionStatusOk
          }
        >
          {statusLabel}
        </em>
      </header>


      {s75GeometryControl}
      {s75LeafWidthControl}
      <div className={editor.cubicacionHero} aria-label="Resumen de cubicación">
        <span>
          <small>{personalizadoAssistMode ? "Vidrio (vano)" : "Vidrio"}</small>
          <strong>{glassAreaLabel}</strong>
          {glassSizeLabel ? <em>{glassSizeLabel}</em> : null}
        </span>
        <span>
          <small>Perfiles</small>
          <strong>{profilesSummary}</strong>
          {profilesCutsLabel ? <em>{profilesCutsLabel}</em> : null}
        </span>
        <span>
          <small>Tiras</small>
          <strong>{supplierPresentationResolution.isResolving ? "…" : previewBars.length}</strong>
          <em>
            {supplierPresentationResolution.isResolving
              ? "resolviendo presentaciones"
              : unresolvedSupplierPresentations.length > 0
                ? `${unresolvedSupplierPresentations.length} perfiles sin presentación comercial`
                : `según pauta sugerida · sobra ${formatMm(previewTotalWasteMm)}`}
          </em>
        </span>
        <span>
          <small>Accesorios</small>
          <strong>{preview.accessoryUnits}</strong>
          <em>unidades est.</em>
        </span>
      </div>

      {unresolvedSupplierPresentations.length > 0 ? (
        <div className={editor.cubicacionNotice} role="status">
          <strong>Pauta parcial: faltan presentaciones comerciales.</strong>
          {unresolvedSupplierPresentations.map((entry) => (
            <span key={`${entry.itemId}-${entry.technicalCode}`}>{entry.technicalCode}: {entry.reason}</span>
          ))}
        </div>
      ) : null}

      {readOnlyFormalSnapshot && selectedPersistedRecipe?.status !== "validated" ? (
        <p className={editor.cubicacionNotice}>
          Cálculo preliminar basado en una receta documentada. Tu taller aún debe
          validarla antes de usarla como pauta de fabricación.
        </p>
      ) : readOnlyFormalSnapshot ? (
        <p className={editor.cubicacionNotice}>
          Snapshot de receta version {formalSnapshot?.recipeVersion}. Para cambiar la
          pauta, crea una nueva version de la receta.
        </p>
      ) : isGeometricFallbackSnapshot(activeSnapshot) ? (
        <p className={`${editor.cubicacionNotice} ${editor.cubicacionNoticePersonalizado}`}>
          {GEOMETRIC_FALLBACK_NOTICE}
        </p>
      ) : personalizadoAssistMode ? (
        <p className={`${editor.cubicacionNotice} ${editor.cubicacionNoticePersonalizado}`}>
          Esta composición es Personalizado: no usamos la pauta automática de la línea.
          Completa o corrige los cortes abajo. Es un borrador de taller, no fabricación
          automática.
        </p>
      ) : isManual ? (
        <p className={editor.cubicacionNotice}>
          Ajuste solo para esta cotización. No cambia la línea del catálogo.
        </p>
      ) : savedMatches && !draftMatches ? (
        <p className={editor.cubicacionNotice}>
          Pauta congelada al guardar esta pieza. Puedes editarla o recalcular.
        </p>
      ) : !isValidated ? (
        <p className={editor.cubicacionNotice}>
          Configuración sugerida por Ventora. Revísala y ajústala según cómo trabaja tu taller.
          Esta pauta aún no ha sido validada por tu taller.
        </p>
      ) : null}

      <div className={editor.cubicacionToolbar}>
        <div className={editor.cubicacionActions}>
          {personalizadoAssistMode ? (
            <button
              type="button"
              className={editor.cubicacionActionBtn}
              onClick={handleReiniciarBorradorPersonalizado}
            >
              Reiniciar borrador
            </button>
          ) : (
            <>
              <button
                type="button"
                className={editor.cubicacionActionBtn}
                onClick={handleRecalcular}
                disabled={readOnlyFormalSnapshot}
              >
                Recalcular
              </button>
              <button
                type="button"
                className={editor.cubicacionActionBtn}
                onClick={handleRestaurar}
                disabled={!isManual || !autoSnapshot}
              >
                Restaurar cálculo
              </button>
            </>
          )}
          {isPautaExpanded && !readOnlyFormalSnapshot ? (
            <button type="button" className={editor.cubicacionActionBtn} onClick={handleAddCut}>
              Agregar corte
            </button>
          ) : null}
          {!readOnlyFormalSnapshot &&
          !personalizadoAssistMode &&
          onSaveCubicationLineAdjustment ? (
            <button
              type="button"
              className={editor.cubicacionActionBtnPrimary}
              onClick={handleGuardarAjusteLinea}
              disabled={!isManual || Boolean(isSavingCubicationLineAdjustment)}
            >
              {isSavingCubicationLineAdjustment
                ? "Guardando…"
                : "Guardar ajuste para esta línea"}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={`${editor.cubicacionToggle} ${isPautaExpanded ? editor.cubicacionToggleOpen : ""}`}
          onClick={() => setIsPautaExpanded((current) => !current)}
          aria-expanded={isPautaExpanded}
        >
          {isPautaExpanded ? "Ocultar pauta" : "Ver pauta de cortes"}
          <LuChevronDown aria-hidden />
        </button>
      </div>

      {isPautaExpanded ? (
        <div className={editor.cubicacionPanelBody}>
          <div className={editor.cubicacionTableScroll}>
            <div
              className={editor.cubicacionTable}
              role="table"
              aria-label={
                readOnlyFormalSnapshot
                  ? "Pauta de corte de receta"
                  : "Pauta de corte editable"
              }
            >
              <div className={editor.cubicacionTableHeadEditable} role="row">
                <span role="columnheader">Perfil</span>
                <span role="columnheader">Función</span>
                <span role="columnheader">Medida mm</span>
                <span role="columnheader">Cant.</span>
                <span role="columnheader">Total</span>
                <span role="columnheader">
                  <span className={editor.srOnly}>Acciones</span>
                </span>
              </div>
              {preview.cuts.map((cut: CotizacionLineTemplateCut, cutIndex: number) => (
                <div
                  key={`cut-row-${cutIndex}`}
                  className={editor.cubicacionTableRowEditable}
                  role="row"
                >
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Perfil</span>
                    <input
                      value={cut.label}
                      disabled={readOnlyFormalSnapshot}
                      onChange={(event) =>
                        handleCutFieldChange(cutIndex, "label", event.target.value)
                      }
                    />
                  </label>
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Función</span>
                    <input
                      value={cut.functionLabel}
                      disabled={readOnlyFormalSnapshot}
                      onChange={(event) =>
                        handleCutFieldChange(cutIndex, "functionLabel", event.target.value)
                      }
                    />
                  </label>
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Medida mm</span>
                    <input
                      inputMode="numeric"
                      value={String(cut.lengthMm)}
                      disabled={readOnlyFormalSnapshot}
                      onChange={(event) =>
                        handleCutFieldChange(cutIndex, "lengthMm", event.target.value)
                      }
                    />
                  </label>
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Cantidad</span>
                    <input
                      inputMode="numeric"
                      value={String(cut.quantity)}
                      disabled={readOnlyFormalSnapshot}
                      onChange={(event) =>
                        handleCutFieldChange(cutIndex, "quantity", event.target.value)
                      }
                    />
                  </label>
                  <strong role="cell">{formatMm(cut.totalLinealMm)}</strong>
                  <button
                    type="button"
                    className={editor.cubicacionRemoveCut}
                    onClick={() => handleRemoveCut(cutIndex)}
                    disabled={readOnlyFormalSnapshot || preview.cuts.length <= 1}
                    aria-label="Quitar corte"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {showBarUsageInline ? (
            <div className={editor.cubicacionBars}>
              <span className={editor.cubicacionBarsNote}>
                Pauta sugerida de tiras
              </span>
              {supplierPresentationResolution.isResolving ? (
                <span>Resolviendo el largo de las presentaciones comerciales…</span>
              ) : previewBars.slice(0, 3).map((bar) => (
                <span key={bar.key}>
                  {bar.codigoPerfil} · Barra {bar.indice} · {bar.largoComercialMm == null ? "largo sin dato" : formatMm(bar.largoComercialMm)} · usado {formatMm(bar.usadoMm)} · sobrante {formatMm(bar.sobranteMm)}
                </span>
              ))}
              {previewBars.length > 3 ? (
                <span>+ {previewBars.length - 3} barras más</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <CubicationAdjustmentChoiceDialog
        open={isAdjustmentChoiceOpen}
        lineName={selectedTemplate?.nombre}
        summaryLines={
          pendingAdjustmentSnapshot && selectedTemplate && autoSnapshot
            ? summarizeCubicationLineAdjustment({
                catalogMetadata: selectedTemplate.catalogMetadata,
                cuts: pendingAdjustmentSnapshot.cuts,
                widthMm,
                heightMm,
                sashCount: rules?.sashCount,
                autoCuts: autoSnapshot.cuts,
                autoGlass: autoSnapshot.glass,
                manualGlass: pendingAdjustmentSnapshot.glass,
              }).lines
            : (adjustmentSummary?.lines ?? [])
        }
        isSaving={Boolean(isSavingCubicationLineAdjustment)}
        onKeepQuoteOnly={handleKeepQuoteOnly}
        onSaveToLine={handleConfirmSaveToLine}
        onCancel={() => {
          setIsAdjustmentChoiceOpen(false);
          setPendingAdjustmentSnapshot(null);
        }}
      />
    </section>
  );
}
