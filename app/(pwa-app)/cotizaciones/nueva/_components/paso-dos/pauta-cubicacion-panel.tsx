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
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { resolveAperturaForRecipeMatch } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolverRecetaFabricacionCompatible } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";

import editor from "./pauta-cubicacion-panel.module.css";

export type PautaCubicacionFormSlice = {
  ancho: string;
  alto: string;
  cantidad: string;
  lineTemplateId: string;
  tipo?: string;
  sistema?: string;
  /** Variante/herraje elegido cuando hay varias recetas activas compatibles. */
  fabricationRecipeId?: string;
  fabricacionTipologia?: string;
  fabricacionHojas?: number | null;
  fabricacionModulos?: number | null;
  fabricacionApertura?: string;
  fabricacionHerraje?: string;
  fabricacionVariante?: string;
  fabricacionSnapshot?: FabricacionCotizacionSnapshot | null;
  cubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
};

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
  onSaveCubicationLineAdjustment,
  isSavingCubicationLineAdjustment,
  lineSelectionHint = "precio",
  showBarUsageInline = true,
  personalizadoAssistMode = false,
  layout = "workspace",
}: Props) {
  const widthMm = parsePositiveIntegerInput(componentForm.ancho);
  const heightMm = parsePositiveIntegerInput(componentForm.alto);
  const quantity = parsePositiveIntegerInput(componentForm.cantidad, 1);
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
  } = useFabricationRecipes({
    enabled: Number.isInteger(numericLineTemplateId) && numericLineTemplateId > 0,
    lineTemplateId:
      Number.isInteger(numericLineTemplateId) && numericLineTemplateId > 0
        ? numericLineTemplateId
        : undefined,
  });
  const explicitTipologia =
    componentForm.fabricacionTipologia ||
    inferirTipologiaFabricacionPieza({
      tipo: componentForm.tipo,
      sistema: componentForm.sistema,
    });
  const formalResolution = useMemo(() => {
    if (
      isLoadingPersistedRecipes ||
      !explicitTipologia ||
      !Number.isInteger(numericLineTemplateId) ||
      numericLineTemplateId <= 0
    ) {
      return null;
    }

    return resolverRecetaFabricacionCompatible(persistedRecipes, {
      organizationId,
      lineTemplateId: numericLineTemplateId,
      tipologia: explicitTipologia,
      hojas: componentForm.fabricacionHojas ?? null,
      modulos: componentForm.fabricacionModulos ?? null,
      apertura:
        resolveAperturaForRecipeMatch(
          componentForm.fabricacionApertura || pieceApertura,
          componentForm.sistema
        ) || null,
      herraje: componentForm.fabricacionHerraje || null,
      variante: componentForm.fabricacionVariante || null,
      preferredRecipeId: componentForm.fabricationRecipeId || null,
      allowNonValidatedRecipeId: componentForm.fabricationRecipeId || null,
      allowPreliminaryNonValidated: true,
    });
  }, [
    componentForm.fabricacionApertura,
    componentForm.fabricacionHerraje,
    componentForm.fabricacionHojas,
    componentForm.fabricacionModulos,
    componentForm.fabricacionVariante,
    componentForm.fabricationRecipeId,
    explicitTipologia,
    isLoadingPersistedRecipes,
    numericLineTemplateId,
    organizationId,
    persistedRecipes,
    pieceApertura,
  ]);
  const useFormalDomain = persistedRecipes.length > 0;
  const selectedPersistedRecipe =
    formalResolution?.estado === "receta_unica" ||
    formalResolution?.estado === "receta_no_validada"
      ? formalResolution.receta
      : null;
  const formalSnapshot = useMemo(() => {
    if (
      !selectedPersistedRecipe ||
      widthMm <= 0 ||
      heightMm <= 0 ||
      quantity <= 0
    ) {
      return null;
    }

    const built = construirSnapshotFabricacionCotizacion({
      recipe: selectedPersistedRecipe,
      entrada: {
        anchoTotalMm: widthMm,
        altoTotalMm: heightMm,
        cantidad: quantity,
        hojas: selectedPersistedRecipe.definition.identidad.hojas,
        modulos: selectedPersistedRecipe.definition.identidad.modulos,
        variante: selectedPersistedRecipe.definition.identidad.variante,
      },
    });
    return built;
  }, [
    explicitTipologia,
    formalResolution?.estado,
    heightMm,
    numericLineTemplateId,
    persistedRecipes.length,
    quantity,
    selectedPersistedRecipe,
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
    if (alreadySynced) return;

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
    if (!personalizadoAssistMode || !selectedTemplate || widthMm <= 0 || heightMm <= 0) {
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
      : draftMatches || savedMatches
        ? "Snapshot guardado"
        : selectedPersistedRecipe
          ? selectedPersistedRecipe.status === "validated"
            ? "Validada por tu taller"
            : "Receta en prueba"
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
          ? selectedPersistedRecipe.status === "validated"
        : fabricationRecipe
          ? fabricationRecipe.status === "validada"
          : cubicationConfig?.status === "validada";
  const readOnlyFormalSnapshot = Boolean(formalSnapshot);

  const [isPautaExpanded, setIsPautaExpanded] = useState(layout === "workspace");
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
    if (!recipe || widthMm <= 0 || heightMm <= 0) {
      onFabricacionSnapshotChange?.(null);
      return;
    }

    const snapshot = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: {
        anchoTotalMm: widthMm,
        altoTotalMm: heightMm,
        cantidad: quantity,
        hojas: recipe.definition.identidad.hojas,
        modulos: recipe.definition.identidad.modulos,
        variante: recipe.definition.identidad.variante,
      },
    });
    onFabricacionContextoChange?.({
      tipologia: recipe.definition.identidad.tipologia,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      apertura: recipe.definition.identidad.apertura ?? pieceApertura ?? "",
      herraje: recipe.definition.identidad.herraje ?? "",
      variante: recipe.definition.identidad.variante,
    });
    onFabricacionSnapshotChange?.(snapshot);
    onCubicationSnapshotChange(
      fabricacionSnapshotToLegacyCubicationSnapshot(snapshot)
    );
  };

  const waitingReason = needsVariantChoice
    ? "Elige el herraje o variante de fabricación para esta tipología."
    : !selectedTemplate
    ? lineSelectionHint === "medidas"
      ? personalizadoAssistMode
        ? "Elige una línea comercial en Terminaciones para armar el borrador de pauta."
        : "Elige una línea comercial en Terminaciones para generar la pauta."
      : personalizadoAssistMode
        ? "Elige una línea comercial en Precio para armar el borrador de pauta."
        : "Elige una línea comercial en Precio para generar la pauta de esta pieza."
    : useFormalDomain && formalResolution?.estado === "sin_receta"
      ? formalResolution.candidatas.length > 0
        ? "Hay recetas para esta linea, pero ninguna validada coincide con esta pieza."
        : "Esta linea todavia no tiene una receta compatible validada."
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
              Tipología ya elegida
              {pieceApertura ? ` · ${pieceApertura.replaceAll("_", " ")}` : ""}. Elige solo
              herraje o variante.
            </p>
          </div>
          <em className={editor.cubicacionStatusMuted}>Elegir variante</em>
        </header>
        <label className={editor.cubicacionWaiting}>
          <span>Herraje / variante</span>
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
                    {candidate.definition.identidad.variante}
                    {candidate.definition.identidad.herraje
                      ? ` · ${candidate.definition.identidad.herraje}`
                      : ""}
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
        <div className={editor.cubicacionWaiting}>{waitingReason}</div>
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
            {selectedTemplate ? ` · ${selectedTemplate.nombre}` : ""}
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
          <strong>{preview.bars.length}</strong>
          <em>según pauta sugerida · sobra {formatMm(preview.totalWasteMm)}</em>
        </span>
        <span>
          <small>Accesorios</small>
          <strong>{preview.accessoryUnits}</strong>
          <em>unidades est.</em>
        </span>
      </div>

      {readOnlyFormalSnapshot ? (
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
          Pauta sugerida. Revisa la línea antes de usarla como fabricación.
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
              {preview.bars.slice(0, 3).map((bar) => (
                <span key={bar.index}>
                  Tira {bar.index}: usado {formatMm(bar.usedMm)} · sobra{" "}
                  {formatMm(bar.wasteMm)}
                </span>
              ))}
              {preview.bars.length > 3 ? (
                <span>+ {preview.bars.length - 3} tiras más</span>
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
