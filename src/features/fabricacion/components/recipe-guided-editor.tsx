"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  DoorOpen,
  GripVertical,
  Info,
  Layers3,
  Package,
  PanelTop,
  Pencil,
  Plus,
  Ruler,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { RecipeTextAssistant } from "@/features/fabricacion/components/recipe-text-assistant";
import { RecipeCommercialLengthPicker } from "@/features/fabricacion/components/recipe-commercial-length-picker";
import { RecipeProfileReferencePicker } from "@/features/fabricacion/components/recipe-profile-reference-picker";
import {
  FabricacionTipologiaPreview,
  resolvePreviewZoneFromFuncion,
  type FabricacionPreviewZone,
} from "@/features/fabricacion/components/fabricacion-tipologia-preview";

import {
  BASES_TIPOLOGICAS_VENTORA,
  crearBaseTipologicaVentora,
  esBaseTipologicaEstructural,
  esBaseTipologicaValidada,
  resolverBaseEstructuralVentora,
  resumirBaseEstructural,
  tipologiaPideSelectorHojas,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  crearAccesorioFabricacionVacio,
  crearPerfilFabricacionVacio,
  crearVidrioFabricacionVacio,
  contarBloqueosCriticosReceta,
  countProfilesGeometricallyPending,
  patchFabricacionPerfil,
  reorderFabricacionItems,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import {
  applyLargoToAllProfiles,
  applyTallerPerfilToComponent,
  collectFrequentLargosMm,
  collectTallerPerfilesFromRecipes,
  mergeTallerPerfilCatalogs,
  readStoredTallerPerfiles,
  upsertStoredTallerPerfil,
  type TallerPerfilRef,
} from "@/features/fabricacion/services/taller-perfiles.service";
import {
  describePerfilTallerResumen,
  describeProfileRuleLegacy,
  formatLargoComercialCorto,
  groupProfilesForSheet,
  labelBaseMedida,
  labelReglaCantidadTipo,
  profileTieneOverrideLargoComercial,
  resolveTiraEstandarRecetaLabel,
  type FabricacionSheetGroupId,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import {
  type CotizacionLineTemplateMaterial,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  FABRICACION_BASES_MEDIDA,
  FABRICACION_REGLAS_CANTIDAD,
  type FabricacionBaseMedida,
  type FabricacionComponentePerfil,
  type FabricacionCondicion,
  type FabricacionEntradaCalculo,
  type FabricacionReceta,
  type FabricacionReglaCantidadTipo,
  type FabricacionTipologia,
} from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-workspace.module.css";

/** Asistente IA oculto temporalmente en la UI de fabricación. */
const SHOW_FABRICATION_AI_ASSIST = false;

const TYPOLOGY_OPTIONS = [
  { label: "Corredera 2H", tipologia: "corredera", supported: true, icon: Columns3 },
  { label: "Abatible", tipologia: "abatible", supported: true, icon: BookOpen },
  { label: "Proyectante", tipologia: "proyectante", supported: true, icon: PanelTop },
  { label: "Fijo", tipologia: "pano_fijo", supported: true, icon: Square },
  { label: "Puerta", tipologia: "puerta_abatible", supported: true, icon: DoorOpen },
  { label: "Personalizada", tipologia: "personalizada", supported: false, icon: SlidersHorizontal },
] satisfies Array<{
  label: string;
  tipologia: FabricacionTipologia;
  supported: boolean;
  icon: LucideIcon;
}>;

function positiveNumber(value: string, fallback = 1) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function integerNumber(value: string) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNonNegativeNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function positiveDecimal(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const TIRA_PRIMARY_MM = [6000, 5950, 5900] as const;

function parseTiraMetrosToMm(value: string): number | null {
  const meters = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return Math.round(meters * 1000);
}

function formatTiraMetros(largoMm: number) {
  return (largoMm / 1000).toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function exactConditionValue(
  value: FabricacionCondicion["hojas"] | FabricacionCondicion["modulos"]
) {
  if (typeof value === "number") return value;
  return value?.igual ?? "";
}

function patchCondition(
  condition: FabricacionCondicion | undefined,
  patch: Partial<FabricacionCondicion>
): FabricacionCondicion | undefined {
  const next = { ...condition, ...patch };
  if ("hojas" in patch && patch.hojas === undefined) delete next.hojas;
  if ("modulos" in patch && patch.modulos === undefined) delete next.modulos;
  if ("variante" in patch && patch.variante === undefined) delete next.variante;
  return next.hojas == null && next.modulos == null && next.variante == null
    ? undefined
    : next;
}

const AJUSTE_PENDIENTE_RE = /ajuste|descuento/i;
const AJUSTE_DOCUMENTADO_OBS_RE =
  /ajuste documentado|descuento documentado|documentad[oa] en ventora|sugerido por plantilla|regla documentada/i;

type AdjustmentDisplayState = "pending" | "suggested" | "custom" | "set";

function hasPendingAdjustment(
  profile: FabricacionReceta["perfiles"][number]
): boolean {
  return (profile.datosPendientes ?? []).some((detail) =>
    AJUSTE_PENDIENTE_RE.test(detail)
  );
}

function hasDocumentedAdjustment(
  profile: FabricacionReceta["perfiles"][number]
): boolean {
  return AJUSTE_DOCUMENTADO_OBS_RE.test(profile.observaciones ?? "");
}

function resolveProfileGroupBadge(
  funcion: string
): { id: FabricacionSheetGroupId; label: string } {
  const key = funcion.trim().toLocaleLowerCase("es");
  if (
    key.includes("riel superior") ||
    key.includes("riel inferior") ||
    key.includes("jamba") ||
    key.includes("marco superior") ||
    key.includes("marco inferior") ||
    key.includes("marco lateral") ||
    key.includes("marco horizontal") ||
    key.includes("marco vertical") ||
    key.includes("guía") ||
    key.includes("guia") ||
    key.includes("perfil lateral")
  ) {
    return { id: "marco", label: "Marco" };
  }
  if (
    key.includes("zócalo") ||
    key.includes("zocalo") ||
    key.includes("cabezal") ||
    key.includes("pierna") ||
    key.includes("traslapo") ||
    key.includes("hoja superior") ||
    key.includes("hoja inferior") ||
    key.includes("hoja lateral") ||
    key.includes("hoja horizontal") ||
    key.includes("hoja vertical") ||
    key.includes("travesaño") ||
    key.includes("travesano") ||
    key.includes("perfil de hoja")
  ) {
    return { id: "hojas", label: "Hoja" };
  }
  return { id: "otros", label: "Pieza" };
}

/**
 * - pending: base estructural sin ajuste conocido → vacío/0, sin badge
 * - suggested: ajuste precargado de documentación/plantilla → valor + "Sugerido"
 * - custom: el taller cambió un valor sugerido → valor, sin "Sugerido"
 * - set: valor presente sin origen sugerido → valor sin badge
 */
function getAdjustmentDisplayState(
  profile: FabricacionReceta["perfiles"][number],
  adjustedAwayFromSuggestion: boolean
): AdjustmentDisplayState {
  if (adjustedAwayFromSuggestion) return "custom";
  if (hasPendingAdjustment(profile) || profile.reglaMedida.ajusteMm == null) {
    return "pending";
  }
  if (hasDocumentedAdjustment(profile)) return "suggested";
  return "set";
}

function resolvePieceWorkshopStatus(
  profile: FabricacionReceta["perfiles"][number],
  adjustedAwayFromSuggestion: boolean
): { label: "Lista" | "Falta descuento" | "Revisada"; tone: "ready" | "review" | "custom" } {
  const state = getAdjustmentDisplayState(profile, adjustedAwayFromSuggestion);
  if (state === "pending") return { label: "Falta descuento", tone: "review" };
  if (state === "custom") return { label: "Revisada", tone: "custom" };
  return { label: "Lista", tone: "ready" };
}

function isVentoraSuggestedAdjustment(
  profile: FabricacionReceta["perfiles"][number]
) {
  return (
    !hasPendingAdjustment(profile) &&
    profile.reglaMedida.ajusteMm != null &&
    hasDocumentedAdjustment(profile)
  );
}

function describeProfileRule(profile: FabricacionReceta["perfiles"][number]) {
  return describeProfileRuleLegacy(profile);
}

function ConditionFields({
  condition,
  readOnly,
  onChange,
}: {
  condition?: FabricacionCondicion;
  readOnly: boolean;
  onChange: (condition: FabricacionCondicion | undefined) => void;
}) {
  return (
    <>
      <label>
        <span>Solo con hojas</span>
        <input
          type="number"
          min="1"
          value={exactConditionValue(condition?.hojas)}
          placeholder="Cualquiera"
          onChange={(event) =>
            onChange(
              patchCondition(condition, {
                hojas: event.target.value
                  ? positiveNumber(event.target.value)
                  : undefined,
              })
            )
          }
          disabled={readOnly}
        />
      </label>
      <label>
        <span>Solo con modulos</span>
        <input
          type="number"
          min="1"
          value={exactConditionValue(condition?.modulos)}
          placeholder="Cualquiera"
          onChange={(event) =>
            onChange(
              patchCondition(condition, {
                modulos: event.target.value
                  ? positiveNumber(event.target.value)
                  : undefined,
              })
            )
          }
          disabled={readOnly}
        />
      </label>
      <label>
        <span>Solo para variante</span>
        <input
          value={
            typeof condition?.variante === "string"
              ? condition.variante
              : Array.isArray(condition?.variante)
                ? condition.variante.join(", ")
                : ""
          }
          placeholder="Cualquiera"
          onChange={(event) =>
            onChange(
              patchCondition(condition, {
                variante: event.target.value.trim() || undefined,
              })
            )
          }
          disabled={readOnly}
        />
      </label>
    </>
  );
}

type Props = {
  recipe: FabricacionReceta;
  providerName: string;
  lineName: string;
  material?: CotizacionLineTemplateMaterial;
  providerOptions?: string[];
  /** Otras recetas del taller para reutilizar perfiles y largos frecuentes. */
  workshopRecipes?: FabricacionReceta[];
  startMode?: "ventora" | "ai" | "blank";
  preferAiAssist?: boolean;
  readOnly?: boolean;
  desktopActiveStep?: "base" | "components" | "rules" | "plan";
  pautaInput?: FabricacionEntradaCalculo | null;
  onRecipeChange: (recipe: FabricacionReceta) => void;
  onProviderNameChange: (value: string) => void;
  onLineNameChange: (value: string) => void;
  onMaterialChange?: (value: CotizacionLineTemplateMaterial) => void;
  onStartModeChange?: (value: "ventora" | "ai" | "blank") => void;
  onBaseApplied?: () => void;
  /** Persiste el borrador actual (p. ej. al tocar Guardar en el drawer). */
  onPersistRecipe?: (recipe: FabricacionReceta) => Promise<void> | void;
  onContinueToTest?: () => void;
};

export function RecipeGuidedEditor({
  recipe,
  providerName,
  lineName,
  material = "Aluminio",
  providerOptions = [],
  workshopRecipes = [],
  startMode,
  preferAiAssist = false,
  readOnly = false,
  desktopActiveStep,
  pautaInput = null,
  onRecipeChange,
  onProviderNameChange,
  onLineNameChange,
  onStartModeChange,
  onBaseApplied,
  onPersistRecipe,
  onContinueToTest,
}: Props) {
  const isGuidedDesktop = desktopActiveStep != null;
  const isRecipeWorkspaceDesktop = () =>
    isGuidedDesktop &&
    (desktopActiveStep === "components" || desktopActiveStep === "rules");
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(
    () => new Set()
  );
  const [showAiHelperManual, setShowAiHelperManual] = useState(false);
  const showAiHelper =
    SHOW_FABRICATION_AI_ASSIST && (preferAiAssist || showAiHelperManual);
  const [showBaseIncludes, setShowBaseIncludes] = useState(false);
  const [draggingProfileIndex, setDraggingProfileIndex] = useState<number | null>(
    null
  );
  const [dragOverProfileIndex, setDragOverProfileIndex] = useState<number | null>(
    null
  );
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);
  const [editingAccessoryIds, setEditingAccessoryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [showGlassEditor, setShowGlassEditor] = useState(false);
  const [showCustomTira, setShowCustomTira] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [openReview, setOpenReview] = useState<
    "piezas" | "accesorios" | "vidrio" | null
  >("piezas");
  const [hoverPreviewZone, setHoverPreviewZone] =
    useState<FabricacionPreviewZone>(null);
  const [isPersistingDrawer, setIsPersistingDrawer] = useState(false);
  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const drawerAdjustmentRef = useRef<HTMLInputElement>(null);
  const recipeRef = useRef(recipe);
  recipeRef.current = recipe;
  const selectedTypologyOption =
    TYPOLOGY_OPTIONS.find(
      (option) => option.tipologia === recipe.identidad.tipologia
    ) ?? TYPOLOGY_OPTIONS[TYPOLOGY_OPTIONS.length - 1];
  const selectedTypologyBase = resolverBaseEstructuralVentora({
    tipologia: recipe.identidad.tipologia,
    hojas: recipe.identidad.hojas,
  });
  const isValidatedBase =
    selectedTypologyBase != null && esBaseTipologicaValidada(selectedTypologyBase);
  const isStructuralBase =
    selectedTypologyBase != null && esBaseTipologicaEstructural(selectedTypologyBase);
  const showHojasPicker = tipologiaPideSelectorHojas(recipe.identidad.tipologia);
  const [adjustedAwayFromSuggestion, setAdjustedAwayFromSuggestion] = useState<
    Set<string>
  >(() => new Set());
  const suggestedAdjustmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const profile of recipe.perfiles) {
      if (isVentoraSuggestedAdjustment(profile)) ids.add(profile.id);
    }
    return ids;
  }, [recipe.perfiles]);
  const basePreview = useMemo(() => {
    if (!selectedTypologyBase) return null;
    return crearBaseTipologicaVentora({
      tipologia: selectedTypologyBase.tipologia,
      hojas: recipe.identidad.hojas,
      modulos: recipe.identidad.modulos,
      lineName,
    });
  }, [
    lineName,
    recipe.identidad.hojas,
    recipe.identidad.modulos,
    selectedTypologyBase,
  ]);
  const basePreviewSummary = useMemo(
    () => (basePreview ? resumirBaseEstructural(basePreview) : null),
    [basePreview]
  );
  const selectedStartMode = startMode ?? (basePreview ? "ventora" : "blank");

  const pautaPreview = useMemo(() => {
    if (!pautaInput || recipe.perfiles.length === 0) return null;
    try {
      const result = calcularCubicacionYPauta(recipe, pautaInput);
      return construirPautaBarrasFabricacion({ receta: recipe, resultado: result });
    } catch {
      return null;
    }
  }, [pautaInput, recipe]);

  const tallerPerfilCatalog = useMemo(
    () =>
      mergeTallerPerfilCatalogs(
        collectTallerPerfilesFromRecipes([recipe, ...workshopRecipes]),
        readStoredTallerPerfiles()
      ),
    [recipe, workshopRecipes]
  );

  const frequentLargos = useMemo(
    () => collectFrequentLargosMm([recipe, ...workshopRecipes]),
    [recipe, workshopRecipes]
  );

  const tiraEstandar = useMemo(
    () => resolveTiraEstandarRecetaLabel(recipe),
    [recipe.configuracionCorte?.largoComercialDefaultMm, recipe]
  );

  const tiraEstandarMm = tiraEstandar.largoMm;
  const tiraEstandarLabel = formatLargoComercialCorto(tiraEstandarMm) ?? "6,00 m";
  const isPrimaryTira = (TIRA_PRIMARY_MM as readonly number[]).includes(
    tiraEstandarMm
  );
  const pendingDiscountCount = useMemo(
    () => countProfilesGeometricallyPending(recipe),
    [recipe]
  );
  const tiraAplicadaEnPiezas =
    recipe.perfiles.length > 0 &&
    recipe.perfiles.every((profile) => profile.largoComercialMm === tiraEstandarMm);

  const profileSheetGroups = useMemo(
    () => groupProfilesForSheet(recipe.perfiles),
    [recipe.perfiles]
  );

  const drawerProfile = drawerProfileId
    ? recipe.perfiles.find((entry) => entry.id === drawerProfileId) ?? null
    : null;
  const drawerProfileIndex = drawerProfile
    ? recipe.perfiles.findIndex((entry) => entry.id === drawerProfile.id)
    : -1;

  useEffect(() => {
    if (!drawerProfileId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerProfileId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerProfileId]);

  useEffect(() => {
    if (!drawerProfileId) return;
    const scrollEl = drawerScrollRef.current;
    if (scrollEl) scrollEl.scrollTop = 0;
    const focusTimer = window.requestAnimationFrame(() => {
      drawerAdjustmentRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusTimer);
  }, [drawerProfileId]);

  const sheetPreviewZone: FabricacionPreviewZone = drawerProfile
    ? resolvePreviewZoneFromFuncion(drawerProfile.funcion)
    : hoverPreviewZone;

  const updateIdentity = (
    patch: Partial<FabricacionReceta["identidad"]>
  ) => {
    onRecipeChange({
      ...recipe,
      identidad: { ...recipe.identidad, ...patch },
    });
  };

  const selectTypology = (tipologia: FabricacionTipologia) => {
    const catalogEntry = BASES_TIPOLOGICAS_VENTORA.find(
      (entry) => entry.tipologia === tipologia
    );
    const typologyOption =
      TYPOLOGY_OPTIONS.find((option) => option.tipologia === tipologia) ??
      selectedTypologyOption;
    const nextHojas = catalogEntry?.hojasSugeridas ?? recipe.identidad.hojas;
    const nextModulos =
      catalogEntry?.modulosSugeridos ?? recipe.identidad.modulos;
    updateIdentity({
      tipologia,
      apertura: tipologia === "personalizada" ? null : tipologia,
      hojas: nextHojas,
      modulos: nextModulos,
      nombre: `${lineName.trim() || "Línea"} · ${typologyOption.label}`,
    });
    const resolved = resolverBaseEstructuralVentora({
      tipologia,
      hojas: nextHojas,
    });
    if (resolved) {
      onStartModeChange?.("ventora");
      return;
    }
    onStartModeChange?.("blank");
  };

  const selectStartMode = (mode: "ventora" | "ai" | "blank") => {
    if (mode === "ai" && !SHOW_FABRICATION_AI_ASSIST) return;
    if (mode === "ventora" && !basePreview) return;
    onStartModeChange?.(mode);
    if (onStartModeChange) return;
    if (mode === "ventora") applyVentoraBase();
    else if (mode === "blank") resetToBlankStructure();
    else if (SHOW_FABRICATION_AI_ASSIST) setShowAiHelperManual(true);
  };

  const applyVentoraBase = () => {
    if (!basePreview) return;
    onRecipeChange({
      ...basePreview,
      version: recipe.version,
      identidad: {
        ...basePreview.identidad,
        recetaId: recipe.identidad.recetaId,
        codigo: recipe.identidad.codigo,
        nombre: recipe.identidad.nombre,
        hojas: recipe.identidad.hojas,
        modulos: recipe.identidad.modulos,
        variante: recipe.identidad.variante,
      },
    });
    setExpandedComponents(new Set());
    onBaseApplied?.();
  };

  const resetToBlankStructure = () => {
    onRecipeChange({
      ...recipe,
      perfiles: [],
      vidrios: [],
      accesorios: [],
      configuracionCorte: {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
      },
      notasValidacion: [],
    });
    setExpandedComponents(new Set());
  };

  const addProfile = () => {
    const id = crypto.randomUUID();
    setExpandedComponents((current) => new Set(current).add(id));
    onRecipeChange({
      ...recipe,
      perfiles: [
        ...recipe.perfiles,
        crearPerfilFabricacionVacio(id),
      ],
    });
  };

  const updateProfile = (
    profileId: string,
    patch: (profile: FabricacionComponentePerfil) => FabricacionComponentePerfil
  ) => {
    onRecipeChange(patchFabricacionPerfil(recipe, profileId, patch));
  };

  const assignTallerPerfil = (
    profileId: string,
    tallerPerfil: TallerPerfilRef
  ) => {
    upsertStoredTallerPerfil(tallerPerfil);
    updateProfile(profileId, (entry) =>
      applyTallerPerfilToComponent(entry, tallerPerfil, { prefillLargo: true })
    );
  };

  const reorderProfiles = (fromIndex: number, toIndex: number) => {
    const nextProfiles = reorderFabricacionItems(
      recipe.perfiles,
      fromIndex,
      toIndex
    );
    if (nextProfiles === recipe.perfiles) return;
    onRecipeChange({ ...recipe, perfiles: nextProfiles });
  };

  const clearProfileDragState = () => {
    setDraggingProfileIndex(null);
    setDragOverProfileIndex(null);
  };

  const removeProfile = (profileId: string) => {
    onRecipeChange({
      ...recipe,
      perfiles: recipe.perfiles.filter((entry) => entry.id !== profileId),
    });
  };

  const removeGlass = (glassId: string) => {
    onRecipeChange({
      ...recipe,
      vidrios: recipe.vidrios.filter((entry) => entry.id !== glassId),
    });
  };

  const removeAccessory = (accessoryId: string) => {
    onRecipeChange({
      ...recipe,
      accesorios: recipe.accesorios.filter((entry) => entry.id !== accessoryId),
    });
  };

  const addGlass = () => {
    const id = crypto.randomUUID();
    setExpandedComponents((current) => new Set(current).add(id));
    onRecipeChange({
      ...recipe,
      vidrios: [
        ...recipe.vidrios,
        crearVidrioFabricacionVacio(id),
      ],
    });
  };

  const addAccessory = () => {
    const id = crypto.randomUUID();
    setExpandedComponents((current) => new Set(current).add(id));
    onRecipeChange({
      ...recipe,
      accesorios: [
        ...recipe.accesorios,
        crearAccesorioFabricacionVacio(id),
      ],
    });
  };

  const setComponentExpanded = (id: string, expanded: boolean) => {
    setExpandedComponents((current) => {
      const next = new Set(current);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const closeProfileDrawer = () => setDrawerProfileId(null);

  const goToAdjacentProfile = (direction: -1 | 1) => {
    if (drawerProfileIndex < 0) return;
    const nextIndex = drawerProfileIndex + direction;
    const next = recipe.perfiles[nextIndex];
    if (!next) return;
    setDrawerProfileId(next.id);
  };

  const openProfileDrawer = (profileId: string) => {
    setDrawerProfileId(profileId);
  };

  const applyRecipeTira = (nextValue: number) => {
    onRecipeChange({
      ...recipe,
      configuracionCorte: {
        perdidaCorteMm: recipe.configuracionCorte?.perdidaCorteMm ?? null,
        despunteInicialMm: recipe.configuracionCorte?.despunteInicialMm ?? null,
        sobranteMinimoAprovechableMm:
          recipe.configuracionCorte?.sobranteMinimoAprovechableMm ?? null,
        largoComercialDefaultMm: nextValue,
      },
    });
  };

  const persistDrawerRecipe = async (options?: {
    close?: boolean;
    goNext?: boolean;
  }) => {
    if (readOnly) {
      if (options?.close) closeProfileDrawer();
      return;
    }
    if (onPersistRecipe) {
      setIsPersistingDrawer(true);
      try {
        await onPersistRecipe(recipeRef.current);
      } finally {
        setIsPersistingDrawer(false);
      }
    }
    if (options?.goNext) {
      goToAdjacentProfile(1);
      return;
    }
    if (options?.close !== false) {
      closeProfileDrawer();
    }
  };

  const applyAdjustmentValue = (
    profileId: string,
    raw: string,
    profile: FabricacionComponentePerfil
  ) => {
    if (!raw.trim()) {
      updateProfile(profileId, (entry) => {
        const pending = (entry.datosPendientes ?? []).filter(
          (detail) => !AJUSTE_PENDIENTE_RE.test(detail)
        );
        return {
          ...entry,
          reglaMedida: {
            ...entry.reglaMedida,
            ajusteMm: 0,
          },
          datosPendientes: pending.length > 0 ? pending : undefined,
        };
      });
      setAdjustedAwayFromSuggestion((prev) => {
        if (!prev.has(profileId)) return prev;
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
      return;
    }
    const nextAdjustment = integerNumber(raw);
    if (
      suggestedAdjustmentIds.has(profileId) ||
      hasDocumentedAdjustment(profile)
    ) {
      setAdjustedAwayFromSuggestion((prev) => {
        const next = new Set(prev);
        next.add(profileId);
        return next;
      });
    }
    updateProfile(profileId, (entry) => {
      const pending = (entry.datosPendientes ?? []).filter(
        (detail) => !AJUSTE_PENDIENTE_RE.test(detail)
      );
      return {
        ...entry,
        reglaMedida: {
          ...entry.reglaMedida,
          ajusteMm: nextAdjustment,
        },
        datosPendientes: pending.length > 0 ? pending : undefined,
      };
    });
  };

  const renderProfileDrawerFields = (
    profile: FabricacionComponentePerfil,
    index: number
  ) => {
    const adjustmentState = getAdjustmentDisplayState(
      profile,
      adjustedAwayFromSuggestion.has(profile.id)
    );
    const showSuggestedBadge = adjustmentState === "suggested";
    const showCustomBadge = adjustmentState === "custom";
    const currentAdjustment = profile.reglaMedida.ajusteMm;
    const groupBadge = resolveProfileGroupBadge(profile.funcion);
    const pieceName = profile.funcion.trim() || `Perfil ${index + 1}`;
    const previewZone = resolvePreviewZoneFromFuncion(profile.funcion);
    const hasPrev = index > 0;
    const hasNext = index < recipe.perfiles.length - 1;

    return (
      <div
        className={s.fabDrawerPiece}
        role="group"
        aria-label={`Editar ${pieceName}`}
      >
        <header className={s.fabDrawerPieceHeader}>
          <div className={s.fabDrawerPieceHeaderMain}>
            <div className={s.fabDrawerPieceBadges}>
              <span className={s.fabDrawerBadge} data-group={groupBadge.id}>
                {groupBadge.label}
              </span>
            </div>
            <h2>{pieceName}</h2>
            <p>Cambia solo si tu taller lo corta distinto</p>
          </div>
          <button
            type="button"
            className={s.fabDrawerClose}
            aria-label="Cerrar editor"
            onClick={closeProfileDrawer}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={s.fabDrawerNav}>
          <button
            type="button"
            className={s.fabDrawerNavBtn}
            disabled={!hasPrev}
            onClick={() => goToAdjacentProfile(-1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Anterior
          </button>
          <span>
            Pieza {index + 1} de {recipe.perfiles.length}
          </span>
          <button
            type="button"
            className={s.fabDrawerNavBtn}
            disabled={!hasNext}
            onClick={() => goToAdjacentProfile(1)}
          >
            Siguiente
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={s.fabDrawerPreviewRow}>
          <FabricacionTipologiaPreview
            tipologia={recipe.identidad.tipologia}
            hojas={recipe.identidad.hojas}
            highlightZone={previewZone}
            size="sm"
          />
          <dl className={s.fabDrawerSummary}>
            <div>
              <dt>Función</dt>
              <dd>{pieceName}</dd>
            </div>
            <div>
              <dt>Medida</dt>
              <dd>{labelBaseMedida(profile.reglaMedida.base, "human")}</dd>
            </div>
            <div>
              <dt>Cantidad</dt>
              <dd>
                {Math.max(1, Math.round(profile.reglaCantidad.cantidad))}{" "}
                {Math.max(1, Math.round(profile.reglaCantidad.cantidad)) === 1
                  ? "pieza"
                  : "piezas"}
              </dd>
            </div>
            <div>
              <dt>Cantidad de cortes</dt>
              <dd>
                {Math.max(1, Math.round(profile.reglaCantidad.cantidad))}
              </dd>
            </div>
          </dl>
        </div>

        <div className={s.fabDrawerScroll} ref={drawerScrollRef}>
          <section className={s.fabDrawerSection}>
            <h3>Medida de corte</h3>
            <label>
              <span>Medida</span>
              <select
                value={profile.reglaMedida.base}
                onChange={(event) =>
                  updateProfile(profile.id, (entry) => ({
                    ...entry,
                    reglaMedida: {
                      ...entry.reglaMedida,
                      base: event.target.value as FabricacionBaseMedida,
                    },
                  }))
                }
                disabled={readOnly}
              >
                {FABRICACION_BASES_MEDIDA.map((base) => (
                  <option key={base} value={base}>
                    {labelBaseMedida(base, "human")}
                  </option>
                ))}
              </select>
            </label>
            <div className={s.fabDrawerAdjustment}>
              <label>
                <span>Descuento (mm)</span>
                <input
                  ref={drawerAdjustmentRef}
                  type="number"
                  value={currentAdjustment == null ? "" : currentAdjustment}
                  placeholder="0"
                  onChange={(event) =>
                    applyAdjustmentValue(profile.id, event.target.value, profile)
                  }
                  disabled={readOnly}
                />
              </label>
              {showSuggestedBadge ? (
                <span className={s.recipeBuildSuggestedBadge}>
                  Sugerido por Ventora
                </span>
              ) : null}
              {showCustomBadge ? (
                <span className={s.recipeBuildCustomBadge}>
                  Cambiaste este valor
                </span>
              ) : null}
            </div>
            <p className={s.fabDrawerHint}>
              Es lo que se resta a la medida antes de cortar.
            </p>
          </section>

          <section className={s.fabDrawerSection}>
            <h3>Largo especial (opcional)</h3>
            <div className={s.fabDrawerFieldBlock}>
              <span className={s.fabDrawerFieldLabel}>Excepción al largo estándar</span>
              <RecipeCommercialLengthPicker
                value={profile.largoComercialMm}
                usedByWorkshop={frequentLargos.usedByWorkshop}
                otherFrequent={frequentLargos.otherFrequent}
                readOnly={readOnly}
                onChange={(nextValue) =>
                  updateProfile(profile.id, (entry) => ({
                    ...entry,
                    largoComercialMm: nextValue,
                  }))
                }
              />
            </div>
            <p className={s.fabDrawerHint}>
              Si no defines uno, Ventora usa la tira estándar de la receta (
              {tiraEstandarLabel}).
            </p>
            {!readOnly && profileTieneOverrideLargoComercial(profile) ? (
              <button
                type="button"
                className={s.fabDrawerQuickLargo}
                onClick={() =>
                  updateProfile(profile.id, (entry) => ({
                    ...entry,
                    largoComercialMm: null,
                  }))
                }
              >
                Usar tira estándar
              </button>
            ) : null}
          </section>

          <section className={s.fabDrawerSection}>
            <h3>Cantidad</h3>
            <label>
              <span>Cantidad de piezas</span>
              <input
                type="number"
                min="1"
                value={profile.reglaCantidad.cantidad}
                onChange={(event) =>
                  updateProfile(profile.id, (entry) => ({
                    ...entry,
                    reglaCantidad: {
                      ...entry.reglaCantidad,
                      cantidad: positiveNumber(event.target.value),
                    },
                  }))
                }
                disabled={readOnly}
              />
            </label>
          </section>

          <section className={s.fabDrawerSection}>
            <h3>Identificar perfil (opcional)</h3>
            <label>
              <span>Función</span>
              <input
                value={profile.funcion}
                placeholder={`Perfil ${index + 1}`}
                onChange={(event) =>
                  updateProfile(profile.id, (entry) => ({
                    ...entry,
                    funcion: event.target.value,
                  }))
                }
                disabled={readOnly}
              />
            </label>
            <label>
              <span>Nombre usado en taller</span>
              <input
                value={profile.nombrePerfil}
                placeholder="Opcional"
                onChange={(event) =>
                  updateProfile(profile.id, (entry) => ({
                    ...entry,
                    nombrePerfil: event.target.value,
                  }))
                }
                disabled={readOnly}
              />
            </label>
            <div className={s.fabDrawerFieldBlock}>
              <span className={s.fabDrawerFieldLabel}>
                Código de fabricante (opcional)
              </span>
              <RecipeProfileReferencePicker
                profile={profile}
                recipe={recipe}
                catalog={tallerPerfilCatalog}
                readOnly={readOnly}
                onSelect={(tallerPerfil) =>
                  assignTallerPerfil(profile.id, tallerPerfil)
                }
              />
            </div>
          </section>

          <section className={s.fabDrawerSection}>
            <h3>Opciones</h3>
            <label className={s.fabDrawerCheckbox}>
              <input
                type="checkbox"
                checked={profile.requerido}
                onChange={(event) =>
                  updateProfile(profile.id, (entry) => ({
                    ...entry,
                    requerido: event.target.checked,
                  }))
                }
                disabled={readOnly}
              />
              <span>Componente obligatorio</span>
            </label>
            {!readOnly ? (
              <button
                type="button"
                className={`${s.dangerTextButton} ${s.fabDrawerDanger}`}
                onClick={() => {
                  removeProfile(profile.id);
                  closeProfileDrawer();
                }}
              >
                <Trash2 size={15} /> Eliminar perfil
              </button>
            ) : null}
          </section>
        </div>

        <footer className={s.fabDrawerFooter}>
          <button
            type="button"
            className={s.fabGhostAction}
            disabled={isPersistingDrawer}
            onClick={closeProfileDrawer}
          >
            Cancelar
          </button>
          <div className={s.fabDrawerFooterPrimary}>
            {hasNext && !readOnly ? (
              <button
                type="button"
                className={s.secondaryButton}
                disabled={isPersistingDrawer}
                onClick={() => void persistDrawerRecipe({ goNext: true })}
              >
                {isPersistingDrawer ? "Guardando…" : "Guardar y siguiente"}
              </button>
            ) : null}
            <button
              type="button"
              className={`${s.primaryButton} ${s.fabPrimaryCta}`}
              disabled={isPersistingDrawer}
              onClick={() => void persistDrawerRecipe({ close: true })}
            >
              {isPersistingDrawer ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </footer>
      </div>
    );
  };

  return (
    <div
      className={s.editorFlow}
      data-guided-desktop={isGuidedDesktop ? "true" : "false"}
      data-active-step={desktopActiveStep}
    >
      {desktopActiveStep !== "base" && !isRecipeWorkspaceDesktop() ? (
      <section className={s.editorOrientation} aria-label="Guía de configuración">
        <div>
          <span>Configuración de taller</span>
          <strong>
            {desktopActiveStep === "components"
                ? "Primero define qué materiales usa esta línea. La pauta viene después."
                : desktopActiveStep === "rules"
                  ? "Indica cómo se mide y cuántas piezas genera cada componente."
                  : desktopActiveStep === "plan"
                    ? "Confirma los parámetros de corte y revisa la distribución referencial."
                    : "Primero define qué materiales usa esta línea. La pauta de barras viene después."}
          </strong>
        </div>
        {!isGuidedDesktop ? <p>Esto no cambia el precio ni el PDF del cliente.</p> : null}
      </section>
      ) : null}
      {!readOnly && !isGuidedDesktop && SHOW_FABRICATION_AI_ASSIST ? (
        <RecipeTextAssistant
          recipe={recipe}
          providerName={providerName}
          lineName={lineName}
          onApply={onRecipeChange}
        />
      ) : null}
      {isGuidedDesktop && desktopActiveStep === "base" ? (
      <section id="recipe-identity" className={`${s.editorSection} ${s.lineSetupCard} ${s.fabTypologyHero}`}>
        <header className={s.fabSheetHeader}>
          <h1>{lineName.trim() || "Tu línea"}</h1>
          <p className={s.fabCompactMeta}>
            {providerName ? <span>{providerName}</span> : null}
            {providerName && material ? <span aria-hidden="true"> · </span> : null}
            {material ? <span>{material}</span> : null}
            {!providerName && !material ? (
              <span>Completa los datos de la línea</span>
            ) : null}
          </p>
        </header>

        {(!lineName.trim() || !providerName) ? (
          <div className={s.fabCompactMeta}>
            {!lineName.trim() ? (
              <label>
                <span className={s.srOnly}>Línea</span>
                <input
                  value={lineName}
                  onChange={(event) => onLineNameChange(event.target.value)}
                  placeholder="Nombre de la línea"
                  disabled={readOnly}
                  required
                />
              </label>
            ) : null}
            {!providerName ? (
              <label>
                <span className={s.srOnly}>Proveedor</span>
                <select
                  value={providerName}
                  onChange={(event) => onProviderNameChange(event.target.value)}
                  disabled={readOnly}
                >
                  <option value="">Proveedor</option>
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        <h2 className={s.fabTypologyQuestion}>¿Qué fabricas con esta línea?</h2>
        <div className={s.fabTypologyGrid} role="radiogroup" aria-label="Tipología de la línea">
          {TYPOLOGY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = selectedTypologyOption.tipologia === option.tipologia;
            return (
              <button
                key={option.tipologia}
                type="button"
                role="radio"
                aria-checked={selected}
                className={s.fabTypologyCard}
                data-selected={selected}
                onClick={() => selectTypology(option.tipologia)}
                disabled={readOnly}
              >
                <span className={s.fabTypologyCardVisual} aria-hidden="true">
                  {option.tipologia === "personalizada" ? (
                    <Icon size={28} strokeWidth={1.5} />
                  ) : (
                    <FabricacionTipologiaPreview
                      tipologia={option.tipologia}
                      hojas={
                        option.tipologia === "corredera"
                          ? 2
                          : option.tipologia === "abatible" ||
                              option.tipologia === "puerta_abatible"
                            ? recipe.identidad.hojas
                            : 1
                      }
                      size="sm"
                    />
                  )}
                </span>
                <strong>{option.label}</strong>
              </button>
            );
          })}
        </div>

        {showHojasPicker && selectedTypologyBase ? (
          <section className={s.fabHojasPicker} aria-label="Número de hojas">
            <h3>¿Cuántas hojas tiene esta tipología?</h3>
            <div className={s.fabHojasPickerOptions} role="radiogroup">
              {[1, 2].map((count) => (
                <button
                  key={count}
                  type="button"
                  role="radio"
                  aria-checked={recipe.identidad.hojas === count}
                  data-selected={recipe.identidad.hojas === count ? "true" : "false"}
                  disabled={readOnly}
                  onClick={() => updateIdentity({ hojas: count })}
                >
                  {count} {count === 1 ? "hoja" : "hojas"}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {basePreview && selectedTypologyBase ? (
          <section className={s.fabStartBlock} aria-labelledby="fab-start-title">
            <h3 id="fab-start-title">Empezar con</h3>
            <div role="radiogroup" aria-label="Cómo comenzar la fabricación">
              <button
                type="button"
                role="radio"
                aria-checked={selectedStartMode === "ventora"}
                className={s.fabStartPrimary}
                data-selected={selectedStartMode === "ventora"}
                disabled={readOnly || !basePreview}
                onClick={() => selectStartMode("ventora")}
              >
                <span className={s.lineSetupRadio} aria-hidden="true" />
                <span>
                  <strong>
                    {isValidatedBase
                      ? "Base Ventora disponible"
                      : "Estructura preparada"}
                  </strong>
                  {basePreview ? (
                    <em className={s.lineSetupRecommendedBadge}>
                      {isValidatedBase ? "Lista para revisar" : "Recomendado"}
                    </em>
                  ) : null}
                </span>
                <small>
                  {isValidatedBase
                    ? "Ventora prepara las funciones habituales para esta tipología. Tú revisas y ajustas lo que usa tu taller."
                    : "Ventora agregará las piezas habituales. Tú completas las medidas de corte."}
                </small>
                <span className={s.fabStartPrimaryCta}>
                  {isValidatedBase ? "Preparar fabricación" : "Preparar estructura"}
                </span>
              </button>
              <div className={s.fabStartSecondary}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedStartMode === "blank"}
                  data-selected={selectedStartMode === "blank"}
                  disabled={readOnly}
                  onClick={() => selectStartMode("blank")}
                >
                  Configurar desde cero
                </button>
                {SHOW_FABRICATION_AI_ASSIST ? (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedStartMode === "ai"}
                    data-selected={selectedStartMode === "ai"}
                    disabled={readOnly}
                    onClick={() => selectStartMode("ai")}
                  >
                    Ayúdame con IA
                  </button>
                ) : null}
              </div>
            </div>

            {selectedStartMode === "ventora" && basePreview ? (
              <div className={s.lineSetupBaseSummary}>
                <div>
                  <strong>{basePreviewSummary?.title}</strong>
                  <span>{basePreviewSummary?.countsLabel}</span>
                </div>
                <button
                  type="button"
                  className={s.lineSetupBaseIncludesToggle}
                  onClick={() => setShowBaseIncludes((current) => !current)}
                  aria-expanded={showBaseIncludes}
                >
                  {showBaseIncludes ? "Ocultar detalle" : "Ver qué incluye"}
                </button>
                {showBaseIncludes ? (
                  <ul className={s.lineSetupBaseIncludes}>
                    {basePreview.perfiles.slice(0, 8).map((profile) => (
                      <li key={profile.id}>{profile.funcion || profile.nombrePerfil}</li>
                    ))}
                    {basePreview.vidrios.map((glass) => (
                      <li key={glass.id}>{glass.nombre || "Vidrio"}</li>
                    ))}
                    {basePreview.accesorios.map((accessory) => (
                      <li key={accessory.id}>{accessory.nombre || "Accesorio"}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {!basePreview && selectedTypologyOption.tipologia === "personalizada" ? (
          <section className={s.fabStartBlock}>
            <button
              type="button"
              className={s.fabStartPrimary}
              data-selected={selectedStartMode === "blank" ? "true" : "false"}
              disabled={readOnly}
              onClick={() => selectStartMode("blank")}
            >
              <span>
                <strong>Empezar desde cero</strong>
              </span>
              <small>
                Agrega las piezas que usa tu taller y Ventora las reutilizará al cotizar.
              </small>
              <span className={s.fabStartPrimaryCta}>Configuración personalizada</span>
            </button>
            {SHOW_FABRICATION_AI_ASSIST ? (
              <div className={s.fabStartSecondary}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => selectStartMode("ai")}
                >
                  Ayúdame con IA
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!basePreview && selectedTypologyOption.tipologia !== "personalizada" ? (
          <section className={s.fabStartBlock}>
            <p className={s.lineSetupBaseEmpty}>
              No hay una base preparada para esta combinación. Puedes continuar
              configurando desde cero.
            </p>
            <div className={s.fabStartSecondary}>
              {SHOW_FABRICATION_AI_ASSIST ? (
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => selectStartMode("ai")}
                >
                  Ayúdame con IA
                </button>
              ) : null}
              <button
                type="button"
                disabled={readOnly}
                onClick={() => selectStartMode("blank")}
              >
                Configurar desde cero
              </button>
            </div>
          </section>
        ) : null}
      </section>
      ) : null}

      {!isGuidedDesktop ? (
      <section id="recipe-identity" className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>1 · Base de la receta</span>
            <h2>¿Qué línea estás preparando?</h2>
          </div>
          <p>Con lo mínimo basta para empezar. Los detalles técnicos quedan disponibles cuando los necesites.</p>
        </div>

        <div className={s.formGrid}>
          <label>
            <span>Proveedor</span>
            <input
              value={providerName}
              onChange={(event) => onProviderNameChange(event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Linea</span>
            <input
              value={lineName}
              onChange={(event) => onLineNameChange(event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Nombre de la receta</span>
            <input
              value={recipe.identidad.nombre}
              onChange={(event) => updateIdentity({ nombre: event.target.value })}
              disabled={readOnly}
            />
          </label>
        </div>

        <div className={s.typologyChooser} role="radiogroup" aria-label="Tipologia de la receta">
          {TYPOLOGY_OPTIONS.map((option) => (
            <button
              key={option.tipologia}
              type="button"
              role="radio"
              aria-checked={selectedTypologyOption.tipologia === option.tipologia}
              className={s.typologyOption}
              data-selected={selectedTypologyOption.tipologia === option.tipologia}
              data-supported={option.supported ? "true" : "false"}
              onClick={() => selectTypology(option.tipologia)}
              disabled={readOnly}
            >
              <strong>{option.label}</strong>
              <span>
                {option.supported ? "Base disponible" : "Pendiente / manual"}
              </span>
            </button>
          ))}
        </div>

        <div className={s.formGrid}>
          <label>
            <span>Hojas</span>
            <input
              type="number"
              min="1"
              value={recipe.identidad.hojas}
              onChange={(event) =>
                updateIdentity({ hojas: positiveNumber(event.target.value) })
              }
              disabled={readOnly}
            />
          </label>
          {recipe.identidad.tipologia === "personalizada" ? (
            <label>
              <span>Apertura personalizada</span>
              <input
                value={recipe.identidad.apertura ?? ""}
                placeholder="Ej. corredera especial"
                onChange={(event) =>
                  updateIdentity({ apertura: event.target.value.trim() || null })
                }
                disabled={readOnly}
              />
            </label>
          ) : null}
        </div>

        {!readOnly && basePreview ? (
          <section className={s.baseSuggestionCard}>
            <div className={s.baseSuggestionHeader}>
              <div>
                <span>
                  {isValidatedBase ? "Base Ventora disponible" : "Estructura preparada"}
                </span>
                <h3>
                  {selectedTypologyBase?.label} · {recipe.identidad.hojas}{" "}
                  {recipe.identidad.hojas === 1 ? "hoja" : "hojas"}
                </h3>
                <p>
                  {isValidatedBase
                    ? "Prepara una estructura orientativa. Los códigos, ajustes en mm y largos comerciales quedan como Por confirmar."
                    : "Ventora agregará las piezas habituales. Tú completas las medidas de corte."}
                </p>
              </div>
              <span className={s.baseSuggestionBadge}>
                <Layers3 size={15} aria-hidden="true" />
                {basePreview.perfiles.length} perfiles · {basePreview.vidrios.length} vidrio ·{" "}
                {basePreview.accesorios.length} accesorios
              </span>
            </div>
            <div className={s.baseSuggestionPreview}>
              {basePreview.perfiles.slice(0, 8).map((profile) => (
                <span key={profile.id}>{profile.funcion}</span>
              ))}
            </div>
            <div className={s.baseSuggestionActions}>
              <p>
                <CheckCircle2 size={15} aria-hidden="true" />
                Ventora sugiere, tu corriges, pruebas una medida real y validas.
              </p>
              <div>
                <button type="button" className={s.secondaryButton} onClick={resetToBlankStructure}>
                  Empezar desde cero
                </button>
                <button type="button" className={s.primaryButton} onClick={applyVentoraBase}>
                  {isValidatedBase ? "Usar base y continuar" : "Preparar estructura"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!readOnly && !basePreview && SHOW_FABRICATION_AI_ASSIST ? (
          <section className={s.baseSuggestionCard} data-muted="true">
            <div className={s.baseSuggestionHeader}>
              <div>
                <span>Sin base preparada</span>
                <h3>Personalizada</h3>
                <p>Usa IA como ayuda secundaria o empieza desde cero con tus propios componentes.</p>
              </div>
            </div>
            <div className={s.baseSuggestionActions}>
              <button
                type="button"
                className={s.secondaryButton}
                onClick={() => setShowAiHelperManual((current) => !current)}
              >
                <BrainCircuit size={16} />
                Ayudarme con IA
              </button>
              <button type="button" className={s.secondaryButton} onClick={resetToBlankStructure}>
                Empezar desde cero
              </button>
            </div>
          </section>
        ) : null}

        {!readOnly && basePreview && SHOW_FABRICATION_AI_ASSIST ? (
          <div className={s.aiAssistInline}>
            <button
              type="button"
              className={s.textButton}
              onClick={() => setShowAiHelperManual((current) => !current)}
            >
              <BrainCircuit size={15} />
              Ayudarme con IA para una fabricación distinta
            </button>
          </div>
        ) : null}

        {!readOnly && showAiHelper ? (
          <RecipeTextAssistant
            recipe={recipe}
            providerName={providerName}
            lineName={lineName}
            applyLabel="Aplicar borrador IA"
            onApply={onRecipeChange}
          />
        ) : null}

        <details className={s.editorAdvancedDetails}>
          <summary>Ver detalles técnicos de esta receta</summary>
          <div className={s.formGrid}>
          <label>
            <span>Codigo interno</span>
            <input
              value={recipe.identidad.codigo}
              onChange={(event) => updateIdentity({ codigo: event.target.value })}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Modulos</span>
            <input
              type="number"
              min="1"
              value={recipe.identidad.modulos}
              onChange={(event) =>
                updateIdentity({ modulos: positiveNumber(event.target.value) })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Herraje</span>
            <input
              value={recipe.identidad.herraje ?? ""}
              placeholder="Ej. caracol"
              onChange={(event) =>
                updateIdentity({ herraje: event.target.value.trim() || null })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Variante</span>
            <input
              value={recipe.identidad.variante}
              onChange={(event) => updateIdentity({ variante: event.target.value })}
              disabled={readOnly}
            />
          </label>
          </div>
        </details>
      </section>
      ) : null}

      {(!isGuidedDesktop || desktopActiveStep === "plan") ? (
      <section id="recipe-cut-policy" className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Pauta</span>
            <h2>Parámetros de corte del taller</h2>
          </div>
          <p>Estos datos ajustan la distribución referencial de barras.</p>
        </div>
        <div className={s.formGrid}>
          <label>
            <span>Perdida por corte (mm)</span>
            <input
              type="number"
              min="0"
              value={recipe.configuracionCorte?.perdidaCorteMm ?? ""}
              placeholder="Por confirmar"
              onChange={(event) =>
                onRecipeChange({
                  ...recipe,
                  configuracionCorte: {
                    perdidaCorteMm: nullableNonNegativeNumber(event.target.value),
                    despunteInicialMm:
                      recipe.configuracionCorte?.despunteInicialMm ?? null,
                    sobranteMinimoAprovechableMm:
                      recipe.configuracionCorte?.sobranteMinimoAprovechableMm ?? null,
                  },
                })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Despunte inicial (mm)</span>
            <input
              type="number"
              min="0"
              value={recipe.configuracionCorte?.despunteInicialMm ?? ""}
              placeholder="Por confirmar"
              onChange={(event) =>
                onRecipeChange({
                  ...recipe,
                  configuracionCorte: {
                    perdidaCorteMm:
                      recipe.configuracionCorte?.perdidaCorteMm ?? null,
                    despunteInicialMm: nullableNonNegativeNumber(event.target.value),
                    sobranteMinimoAprovechableMm:
                      recipe.configuracionCorte?.sobranteMinimoAprovechableMm ?? null,
                  },
                })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Sobrante minimo aprovechable (mm)</span>
            <input
              type="number"
              min="0"
              value={
                recipe.configuracionCorte?.sobranteMinimoAprovechableMm ?? ""
              }
              placeholder="Por confirmar"
              onChange={(event) =>
                onRecipeChange({
                  ...recipe,
                  configuracionCorte: {
                    perdidaCorteMm:
                      recipe.configuracionCorte?.perdidaCorteMm ?? null,
                    despunteInicialMm:
                      recipe.configuracionCorte?.despunteInicialMm ?? null,
                    sobranteMinimoAprovechableMm: nullableNonNegativeNumber(
                      event.target.value
                    ),
                  },
                })
              }
              disabled={readOnly}
            />
          </label>
        </div>
        {isGuidedDesktop ? (
          <div className={s.pautaPreview}>
            <div className={s.pautaPreviewHeading}>
              <div>
                <strong>Distribución referencial</strong>
                <span>
                  {pautaInput
                    ? `Prueba de ${pautaInput.anchoTotalMm} × ${pautaInput.altoTotalMm} mm`
                    : "Guarda una prueba real para visualizar las barras."}
                </span>
              </div>
            </div>
            {pautaPreview?.barras.length ? (
              <div className={s.barPlanList}>
                {pautaPreview.barras.map((bar) => (
                  <article className={s.barRow} key={`${bar.codigoPerfil}-${bar.indice}`}>
                    <div className={s.barLabel}>
                      <strong>Barra {bar.indice} · {bar.codigoPerfil}</strong>
                      <span>{bar.largoComercialMm.toLocaleString("es-CL")} mm</span>
                    </div>
                    <div className={s.barTrack} aria-label={`Cortes de barra ${bar.indice}`}>
                      {bar.cortes.map((cut, index) => (
                        <span
                          key={`${cut.componenteId}-${index}`}
                          style={{ flexGrow: cut.largoMm, flexBasis: 0 }}
                          title={`${cut.funcion}: ${cut.largoMm} mm`}
                        >
                          {cut.largoMm}
                        </span>
                      ))}
                      {bar.sobranteMm > 0 ? (
                        <i style={{ flexGrow: bar.sobranteMm, flexBasis: 0 }}>
                          Sobrante {bar.sobranteMm} mm
                        </i>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={s.emptyInline}>
                {pautaInput
                  ? "Con largo comercial en los perfiles, las tiras se calculan desde los cortes."
                  : "Completa primero una prueba con medidas reales."}
              </div>
            )}
          </div>
        ) : null}
      </section>
      ) : null}

      {isRecipeWorkspaceDesktop() ? (
      <>
      {!readOnly && SHOW_FABRICATION_AI_ASSIST && (preferAiAssist || showAiHelper) ? (
        <section className={s.recipeBuildAiAssist} aria-label="Ayuda con IA">
          <div className={s.recipeBuildAiAssistHeading}>
            <BrainCircuit size={18} aria-hidden="true" />
            <div>
              <strong>Ayudarme con IA</strong>
              <p>Ventora propone un borrador. Tú revisas, pruebas una medida y validas.</p>
            </div>
          </div>
          <RecipeTextAssistant
            recipe={recipe}
            providerName={providerName}
            lineName={lineName}
            applyLabel="Aplicar borrador IA"
            onApply={onRecipeChange}
          />
        </section>
      ) : null}
      <section id="recipe-components" className={`${s.recipeBuildCard} ${s.fabSheet} ${s.fabPrepFlow}`}>
        <header className={s.fabPrepPageHead}>
          <h2>Así fabricas esta ventana</h2>
          <p>
            Ventora ya preparó las medidas y piezas habituales. Revisa solo si
            en tu taller lo haces distinto.
          </p>
        </header>

        <section className={s.fabPrepHero} aria-label="Fabricación preparada">
          <div className={s.fabPrepHeroMain}>
            <h3>Fabricación preparada</h3>
            <ul className={s.fabPrepStats} aria-label="Resumen de fabricación">
              <li>
                <Package size={16} aria-hidden="true" />
                <strong>{recipe.perfiles.length}</strong>
                <span>
                  {recipe.perfiles.length === 1 ? "Pieza" : "Piezas"}
                </span>
              </li>
              <li>
                <Layers3 size={16} aria-hidden="true" />
                <strong>{recipe.accesorios.length}</strong>
                <span>
                  {recipe.accesorios.length === 1 ? "Accesorio" : "Accesorios"}
                </span>
              </li>
              <li>
                <Square size={16} aria-hidden="true" />
                <strong>{recipe.vidrios.length}</strong>
                <span>{recipe.vidrios.length === 1 ? "Vidrio" : "Vidrios"}</span>
              </li>
              <li>
                <Ruler size={16} aria-hidden="true" />
                <strong>{tiraEstandarLabel}</strong>
                <span>Tira base para pauta</span>
              </li>
            </ul>
          </div>
          <FabricacionTipologiaPreview
            tipologia={recipe.identidad.tipologia}
            hojas={recipe.identidad.hojas}
            highlightZone={sheetPreviewZone}
            size="sm"
            className={s.fabSheetPreview}
          />
          {!readOnly && onContinueToTest && recipe.perfiles.length > 0 ? (
            <button
              type="button"
              className={`${s.primaryButton} ${s.fabPrimaryCta} ${s.fabPreparedCta}`}
              onClick={onContinueToTest}
            >
              Probar con una medida real
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ) : null}
        </section>

        <section className={s.fabTiraBlock} aria-label="Tira que compras">
          <header>
            <h3>Tira que compras</h3>
            <p>Ventora usa esta medida para calcular la pauta de corte.</p>
          </header>
          <div className={s.fabTiraWorkspace}>
          {!readOnly ? (
            <div className={s.fabPrepTiraChoices}>
              {TIRA_PRIMARY_MM.map((largo) => (
                <button
                  key={largo}
                  type="button"
                  className={s.fabPrepTiraChip}
                  data-selected={tiraEstandarMm === largo ? "true" : "false"}
                  onClick={() => {
                    applyRecipeTira(largo);
                    setShowCustomTira(false);
                  }}
                >
                  {tiraEstandarMm === largo ? (
                    <CheckCircle2 size={14} aria-hidden="true" />
                  ) : null}
                  {formatTiraMetros(largo)} m
                </button>
              ))}
              <button
                type="button"
                className={s.fabPrepTiraChip}
                data-selected={!isPrimaryTira || showCustomTira ? "true" : "false"}
                onClick={() => setShowCustomTira(true)}
              >
                Ingresar otra medida
              </button>
            </div>
          ) : null}
          {!readOnly && (showCustomTira || !isPrimaryTira) ? (
            <label className={s.fabTiraCustom}>
              <span>Otra medida (m)</span>
              <input
                key={tiraEstandarMm}
                type="text"
                inputMode="decimal"
                defaultValue={formatTiraMetros(tiraEstandarMm)}
                placeholder="Ej. 6,40"
                aria-label="Ingresar otra medida de tira en metros"
                onBlur={(event) => {
                  const next = parseTiraMetrosToMm(event.target.value);
                  if (next != null) applyRecipeTira(next);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const next = parseTiraMetrosToMm(
                    (event.target as HTMLInputElement).value
                  );
                  if (next != null) applyRecipeTira(next);
                }}
              />
            </label>
          ) : null}
          {!readOnly && recipe.perfiles.length > 0 ? (
            <button
              type="button"
              className={s.fabTiraApply}
              data-applied={tiraAplicadaEnPiezas ? "true" : "false"}
              onClick={() =>
                onRecipeChange(applyLargoToAllProfiles(recipe, tiraEstandarMm))
              }
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              {tiraAplicadaEnPiezas
                ? "Aplicada a todas las piezas"
                : "Aplicar a todas las piezas"}
            </button>
          ) : null}
          <p className={s.fabTiraFoot}>
            <Info size={14} aria-hidden="true" />
            Esto cambia barras, sobrantes y pauta. No cambia las medidas de las
            piezas.
          </p>
          </div>
        </section>

        {recipe.perfiles.length === 0 ||
        contarBloqueosCriticosReceta(recipe) > 0 ? (
          <p className={s.fabPrepBlockWarn}>
            Falta lo mínimo para calcular. Revisa las piezas de la ventana.
          </p>
        ) : null}

        {pendingDiscountCount > 0 ? (
          <div className={s.fabPrepDiscountWarn} role="status">
            <AlertTriangle size={16} aria-hidden="true" />
            <p>
              Faltan descuentos en {pendingDiscountCount}{" "}
              {pendingDiscountCount === 1 ? "pieza" : "piezas"} para completar
              la pauta de corte.
            </p>
            <button
              type="button"
              className={s.fabWarnAction}
              onClick={() => {
                setOpenReview("piezas");
                document
                  .getElementById("fab-review-piezas")
                  ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
              }}
            >
              Revisar piezas pendientes
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <section
          id="fab-review-piezas"
          className={s.fabPiecesPanel}
          aria-label="Piezas de la ventana"
        >
          <header className={s.fabPiecesHead}>
            <div>
              <h3>Piezas de la ventana</h3>
              <p>
                {recipe.perfiles.length}{" "}
                {recipe.perfiles.length === 1
                  ? "pieza preparada"
                  : "piezas preparadas"}
              </p>
            </div>
          </header>
          <div className={s.fabPrepGroups}>

        {recipe.perfiles.length === 0 ? (
          recipe.identidad.tipologia === "personalizada" ? (
            <div className={s.fabEmptyPersonalizada}>
              <strong>Configuración personalizada</strong>
              <p>
                Agrega las piezas que usa tu taller y Ventora las reutilizará al cotizar.
              </p>
              {!readOnly ? (
                <button
                  type="button"
                  className={s.primaryButton}
                  onClick={addProfile}
                >
                  <Plus size={15} />
                  Agregar primera pieza
                </button>
              ) : null}
            </div>
          ) : (
            <div className={s.emptyInline}>
              Agrega el primer perfil para preparar esta fabricación.
            </div>
          )
        ) : (
          <div role="list" aria-label="Perfiles de fabricación" className={s.fabSheetProfileList}>
            {profileSheetGroups.map((group) => (
              <section key={group.id} className={s.fabSheetGroup} aria-label={group.label}>
                <h3>{group.label}</h3>
                {group.profiles.map((profile) => {
                  const index = recipe.perfiles.findIndex((entry) => entry.id === profile.id);
                  const tallerResumen = describePerfilTallerResumen(profile);
                  const pieceStatus = resolvePieceWorkshopStatus(
                    profile,
                    adjustedAwayFromSuggestion.has(profile.id)
                  );
                  const tiraCorta = `Tira: ${
                    profileTieneOverrideLargoComercial(profile)
                      ? formatLargoComercialCorto(profile.largoComercialMm) ??
                        tiraEstandarLabel
                      : tiraEstandarLabel
                  }`;
                  const isDragging = draggingProfileIndex === index;
                  const isDropTarget =
                    dragOverProfileIndex === index &&
                    draggingProfileIndex != null &&
                    draggingProfileIndex !== index;

                  const isEditing = drawerProfileId === profile.id;

                  return (
                    <article
                      key={profile.id}
                      className={s.fabSheetRow}
                      role="listitem"
                      data-dragging={isDragging}
                      data-drop-target={isDropTarget}
                      data-editing={isEditing ? "true" : "false"}
                      data-highlighted={
                        hoverPreviewZone != null &&
                        resolvePreviewZoneFromFuncion(profile.funcion) ===
                          hoverPreviewZone
                          ? "true"
                          : "false"
                      }
                      onMouseEnter={() =>
                        setHoverPreviewZone(
                          resolvePreviewZoneFromFuncion(profile.funcion)
                        )
                      }
                      onMouseLeave={() => setHoverPreviewZone(null)}
                      onFocus={() =>
                        setHoverPreviewZone(
                          resolvePreviewZoneFromFuncion(profile.funcion)
                        )
                      }
                      onBlur={() => setHoverPreviewZone(null)}
                      onDragOver={(event) => {
                        if (readOnly || draggingProfileIndex == null) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        if (dragOverProfileIndex !== index) {
                          setDragOverProfileIndex(index);
                        }
                      }}
                      onDrop={(event) => {
                        if (readOnly || draggingProfileIndex == null) return;
                        event.preventDefault();
                        reorderProfiles(draggingProfileIndex, index);
                        clearProfileDragState();
                      }}
                      onDragEnd={clearProfileDragState}
                    >
                      <button
                        type="button"
                        className={s.recipeBuildGrip}
                        draggable={!readOnly}
                        aria-label={`Mover ${profile.funcion || `perfil ${index + 1}`}. Arrastra o usa Alt+flechas.`}
                        title="Arrastra para reordenar"
                        disabled={readOnly}
                        onDragStart={(event) => {
                          if (readOnly) {
                            event.preventDefault();
                            return;
                          }
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(index));
                          setDraggingProfileIndex(index);
                          setDragOverProfileIndex(index);
                        }}
                        onKeyDown={(event) => {
                          if (readOnly) return;
                          if (!event.altKey) return;
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            reorderProfiles(index, index - 1);
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            reorderProfiles(index, index + 1);
                          }
                        }}
                      >
                        <GripVertical size={15} aria-hidden="true" />
                      </button>
                      <div className={s.fabPrepRowMain}>
                        <span className={s.fabSheetFunction}>
                          {profile.funcion.trim() || `Pieza ${index + 1}`}
                        </span>
                        <span className={s.fabSheetMeasure}>
                          {tallerResumen.cortesMedida}
                        </span>
                      </div>
                      <span
                        className={s.fabPieceDiscount}
                        data-pending={
                          tallerResumen.pendingDiscount ? "true" : "false"
                        }
                      >
                        {tallerResumen.pendingDiscount
                          ? "Falta descuento"
                          : tallerResumen.descuentoLabel}
                      </span>
                      <span className={s.fabPieceTira}>{tiraCorta}</span>
                      {pieceStatus.label === "Lista" ||
                      pieceStatus.label === "Revisada" ? (
                      <span
                        className={s.fabPrepBadge}
                        data-tone={pieceStatus.tone}
                      >
                        {pieceStatus.label}
                      </span>
                      ) : (
                        <span className={s.fabPrepBadgeSpacer} />
                      )}
                      <button
                        type="button"
                        className={s.fabSheetEdit}
                        data-emphasis={
                          tallerResumen.pendingDiscount ? "true" : "false"
                        }
                        aria-expanded={drawerProfileId === profile.id}
                        onClick={() => openProfileDrawer(profile.id)}
                      >
                        {tallerResumen.pendingDiscount
                          ? "Definir descuento"
                          : "Editar pieza"}
                        {tallerResumen.pendingDiscount ? (
                          <ChevronRight size={14} aria-hidden="true" />
                        ) : null}
                      </button>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        )}
          </div>
        </section>

        <details
          className={s.fabReviewAccordion}
          open={openReview === "accesorios"}
          onToggle={(event) => {
            const isOpen = event.currentTarget.open;
            setOpenReview((current) => {
              if (isOpen) return "accesorios";
              return current === "accesorios" ? null : current;
            });
          }}
        >
          <summary>
            <span>
              <strong>Accesorios</strong>
              <em>
                {recipe.accesorios.length}{" "}
                {recipe.accesorios.length === 1 ? "accesorio" : "accesorios"}
              </em>
            </span>
            <b>Ver / editar</b>
          </summary>
        <section className={s.fabSheetGroup} aria-label="Accesorios">
          {recipe.accesorios.length === 0 ? (
            <p className={s.emptyInline}>Sin accesorios sugeridos.</p>
          ) : (
            recipe.accesorios.map((accessory) => {
              const isEditing = editingAccessoryIds.has(accessory.id);
              return (
                <div
                  key={accessory.id}
                  className={s.fabAccessoryRow}
                >
                  <div className={s.fabPrepRowMain}>
                    <span className={s.fabSheetFunction}>
                      {accessory.nombre.trim() || "Accesorio"}
                    </span>
                    <span className={s.fabSheetMeasure}>
                      {accessory.reglaCantidad.cantidad}{" "}
                      {accessory.reglaCantidad.cantidad === 1
                        ? "unidad"
                        : "unidades"}
                    </span>
                  </div>
                  {!readOnly ? (
                    <button
                      type="button"
                      className={s.fabSheetEdit}
                      aria-expanded={isEditing}
                      onClick={() =>
                        setEditingAccessoryIds((current) => {
                          const next = new Set(current);
                          if (next.has(accessory.id)) next.delete(accessory.id);
                          else next.add(accessory.id);
                          return next;
                        })
                      }
                    >
                      Editar
                    </button>
                  ) : null}
                  {isEditing ? (
                    <div className={s.fabDrawerForm}>
                      <label>
                        <span>Nombre</span>
                        <input
                          value={accessory.nombre}
                          onChange={(event) =>
                            onRecipeChange({
                              ...recipe,
                              accesorios: recipe.accesorios.map((entry) =>
                                entry.id === accessory.id
                                  ? { ...entry, nombre: event.target.value }
                                  : entry
                              ),
                            })
                          }
                          disabled={readOnly}
                        />
                      </label>
                      <label>
                        <span>Cantidad</span>
                        <input
                          type="number"
                          min={1}
                          value={accessory.reglaCantidad.cantidad}
                          onChange={(event) =>
                            onRecipeChange({
                              ...recipe,
                              accesorios: recipe.accesorios.map((entry) =>
                                entry.id === accessory.id
                                  ? {
                                      ...entry,
                                      reglaCantidad: {
                                        ...entry.reglaCantidad,
                                        cantidad: positiveNumber(event.target.value),
                                      },
                                    }
                                  : entry
                              ),
                            })
                          }
                          disabled={readOnly}
                        />
                      </label>
                      <button
                        type="button"
                        className={s.dangerTextButton}
                        onClick={() => removeAccessory(accessory.id)}
                      >
                        <Trash2 size={15} /> Eliminar
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </section>
        </details>

        <details
          className={s.fabReviewAccordion}
          open={openReview === "vidrio"}
          onToggle={(event) => {
            const isOpen = event.currentTarget.open;
            setOpenReview((current) => {
              if (isOpen) return "vidrio";
              return current === "vidrio" ? null : current;
            });
          }}
        >
          <summary>
            <span>
              <strong>Vidrio</strong>
              <em>
                {recipe.vidrios.length === 0
                  ? "Sin vidrio"
                  : "1 por hoja"}
              </em>
            </span>
            <b>Ver / editar</b>
          </summary>
        <section className={s.fabSheetGroup} aria-label="Vidrio">
          {recipe.vidrios.length === 0 ? (
            <p className={s.emptyInline}>Esta ventana no tiene vidrio preparado.</p>
          ) : (
            <div className={s.fabAccessoryRow}>
              <div className={s.fabPrepRowMain}>
                <span className={s.fabSheetFunction}>
                  {Math.max(1, recipe.identidad.hojas)}{" "}
                  {recipe.identidad.hojas === 1 ? "vidrio" : "vidrios"}
                </span>
                <span className={s.fabSheetMeasure}>
                  Medida preliminar según ancho y alto.
                </span>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  className={s.fabSheetEdit}
                  aria-expanded={showGlassEditor}
                  onClick={() => setShowGlassEditor((current) => !current)}
                >
                  Editar
                </button>
              ) : null}
            </div>
          )}
          {recipe.vidrios.some(
            (glass) =>
              glass.reglaAncho.ajusteMm == null || glass.reglaAlto.ajusteMm == null
          ) ? (
            <p className={s.fabPrepHeroHint}>
              Medida referencial. Puedes ajustar el descuento de vidrio si tu
              taller usa otro.
            </p>
          ) : null}
          {showGlassEditor ? (
            <div className={s.fabDrawerForm}>
              {!readOnly ? (
                <button type="button" className={s.secondaryButton} onClick={addGlass}>
                  <Plus size={16} /> Agregar vidrio
                </button>
              ) : null}
              {recipe.vidrios.map((glass) => (
                <div key={glass.id} className={s.recipeBuildInlineItem}>
                  <label>
                    <span>Vidrio</span>
                    <input
                      value={glass.nombre}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          vidrios: recipe.vidrios.map((entry) =>
                            entry.id === glass.id
                              ? { ...entry, nombre: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  {!readOnly ? (
                    <button
                      type="button"
                      className={s.dangerTextButton}
                      onClick={() => removeGlass(glass.id)}
                    >
                      <Trash2 size={15} /> Eliminar
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
        </details>

        <details
          className={s.fabAdvancedSection}
          open={showAdvancedOptions}
          onToggle={(event) =>
            setShowAdvancedOptions((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className={s.fabAdvancedSummary}>
            <span>Opciones avanzadas</span>
            <ChevronRight size={16} aria-hidden="true" />
          </summary>
          <p className={s.fabAdvancedHint}>
            Solo necesitas esto si tu taller trabaja distinto.
          </p>
          {!readOnly ? (
            <button type="button" className={s.secondaryButton} onClick={addProfile}>
              <Plus size={16} />
              Agregar perfil
            </button>
          ) : null}
          {!readOnly ? (
            <button type="button" className={s.secondaryButton} onClick={addAccessory}>
              <Plus size={16} /> Agregar accesorio
            </button>
          ) : null}
          <div className={s.fabAdvancedFields}>
            <label>
              <span>Pérdida por corte (mm)</span>
              <input
                type="number"
                min="0"
                value={recipe.configuracionCorte?.perdidaCorteMm ?? ""}
                placeholder="0"
                onChange={(event) =>
                  onRecipeChange({
                    ...recipe,
                    configuracionCorte: {
                      perdidaCorteMm: nullableNonNegativeNumber(event.target.value),
                      despunteInicialMm:
                        recipe.configuracionCorte?.despunteInicialMm ?? null,
                      sobranteMinimoAprovechableMm:
                        recipe.configuracionCorte?.sobranteMinimoAprovechableMm ??
                        null,
                      largoComercialDefaultMm:
                        recipe.configuracionCorte?.largoComercialDefaultMm ?? null,
                    },
                  })
                }
                disabled={readOnly}
              />
            </label>
            <label>
              <span>Despunte (mm)</span>
              <input
                type="number"
                min="0"
                value={recipe.configuracionCorte?.despunteInicialMm ?? ""}
                placeholder="0"
                onChange={(event) =>
                  onRecipeChange({
                    ...recipe,
                    configuracionCorte: {
                      perdidaCorteMm:
                        recipe.configuracionCorte?.perdidaCorteMm ?? null,
                      despunteInicialMm: nullableNonNegativeNumber(
                        event.target.value
                      ),
                      sobranteMinimoAprovechableMm:
                        recipe.configuracionCorte?.sobranteMinimoAprovechableMm ??
                        null,
                      largoComercialDefaultMm:
                        recipe.configuracionCorte?.largoComercialDefaultMm ?? null,
                    },
                  })
                }
                disabled={readOnly}
              />
            </label>
            <label>
              <span>Sobrante mínimo (mm)</span>
              <input
                type="number"
                min="0"
                value={
                  recipe.configuracionCorte?.sobranteMinimoAprovechableMm ?? ""
                }
                placeholder="0"
                onChange={(event) =>
                  onRecipeChange({
                    ...recipe,
                    configuracionCorte: {
                      perdidaCorteMm:
                        recipe.configuracionCorte?.perdidaCorteMm ?? null,
                      despunteInicialMm:
                        recipe.configuracionCorte?.despunteInicialMm ?? null,
                      sobranteMinimoAprovechableMm: nullableNonNegativeNumber(
                        event.target.value
                      ),
                      largoComercialDefaultMm:
                        recipe.configuracionCorte?.largoComercialDefaultMm ?? null,
                    },
                  })
                }
                disabled={readOnly}
              />
            </label>
          </div>
        </details>

        {drawerProfile && drawerProfileIndex >= 0 ? (
          <div className={s.fabDrawer} role="presentation">
            <button
              type="button"
              className={s.fabDrawerBackdrop}
              aria-label="Cerrar editor"
              onClick={closeProfileDrawer}
            />
            <aside
              className={`${s.fabDrawerPanel} ${s.fabDrawerPanelPiece}`}
              role="dialog"
              aria-modal="true"
              aria-label={`Editar ${drawerProfile.funcion || "perfil"}`}
            >
              {renderProfileDrawerFields(drawerProfile, drawerProfileIndex)}
            </aside>
          </div>
        ) : null}
      </section>
      </>
      ) : null}

      {!isRecipeWorkspaceDesktop() && (!isGuidedDesktop || desktopActiveStep === "components" || desktopActiveStep === "rules") ? (
      <section id="recipe-components" className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div className={s.sectionTitleBlock}>
            <div className={s.sectionIconFrame} aria-hidden>
              <Ruler size={24} />
            </div>
            <div>
              <span>{desktopActiveStep === "rules" ? "Reglas de perfiles" : "Perfiles"}</span>
            <h2>{desktopActiveStep === "rules" ? "Cómo se corta y mide cada perfil" : "Perfiles que componen la línea"}</h2>
            </div>
          </div>
          <p>{desktopActiveStep === "rules" ? "Configura medida, cantidad y largo comercial." : "Agrega los perfiles usados por el taller."}</p>
          {!readOnly && desktopActiveStep !== "rules" ? (
            <button type="button" className={s.secondaryButton} onClick={addProfile}>
              <Plus size={16} />
              Agregar perfil
            </button>
          ) : null}
        </div>

        {recipe.perfiles.length === 0 ? (
          <div className={s.emptyInline}>
            Todavia no hay perfiles. Agrega el primero para preparar la pauta.
          </div>
        ) : (
          <div className={s.componentList}>
            {isGuidedDesktop && desktopActiveStep === "components" ? (
              recipe.perfiles.map((profile, index) => (
                <details
                  key={profile.id}
                  className={s.componentCompactRow}
                  open={expandedComponents.has(profile.id)}
                  onToggle={(event) =>
                    setComponentExpanded(profile.id, event.currentTarget.open)
                  }
                >
                  <summary>
                    <span className={s.componentCompactMark} aria-hidden>
                      <Ruler size={17} />
                    </span>
                    <span>
                      <strong>{profile.funcion || `Perfil ${index + 1}`}</strong>
                      <small>{profile.codigoPerfil || "Código por asignar"}</small>
                    </span>
                    <em>{profile.requerido ? "Obligatorio" : "Opcional"}</em>
                    <span className={s.componentCompactEdit}><Pencil size={14} /> Editar</span>
                  </summary>
                  <div className={s.formGridDense}>
                    <label>
                      <span>Función</span>
                      <input
                        value={profile.funcion}
                        onChange={(event) => onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) => entry.id === profile.id ? { ...entry, funcion: event.target.value } : entry),
                        })}
                        disabled={readOnly}
                      />
                    </label>
                    <label>
                      <span>Código del perfil</span>
                      <input
                        value={profile.codigoPerfil}
                        placeholder="Por asignar"
                        onChange={(event) => onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) => entry.id === profile.id ? { ...entry, codigoPerfil: event.target.value } : entry),
                        })}
                        disabled={readOnly}
                      />
                    </label>
                    <label>
                      <span>Nombre usado en taller</span>
                      <input
                        value={profile.nombrePerfil}
                        onChange={(event) => onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) => entry.id === profile.id ? { ...entry, nombrePerfil: event.target.value } : entry),
                        })}
                        disabled={readOnly}
                      />
                    </label>
                    <label className={s.checkboxField}>
                      <input
                        type="checkbox"
                        checked={profile.requerido}
                        onChange={(event) => onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) => entry.id === profile.id ? { ...entry, requerido: event.target.checked } : entry),
                        })}
                        disabled={readOnly}
                      />
                      <span>Componente obligatorio</span>
                    </label>
                    {!readOnly ? (
                      <button
                        type="button"
                        className={s.dangerTextButton}
                        onClick={() => onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.filter((entry) => entry.id !== profile.id),
                        })}
                      >
                        <Trash2 size={15} /> Eliminar perfil
                      </button>
                    ) : null}
                  </div>
                </details>
              ))
            ) : (
            recipe.perfiles.map((profile, index) => (
              <article key={profile.id} className={s.componentCard}>
                <div className={s.componentCardHeader}>
                  <div>
                    <strong>{profile.funcion || `Perfil ${index + 1}`}</strong>
                    <small>{describeProfileRule(profile)}</small>
                  </div>
                  {!readOnly ? (
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-label={`Eliminar ${profile.funcion || "perfil"}`}
                      title="Eliminar perfil"
                      onClick={() =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.filter(
                            (entry) => entry.id !== profile.id
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
                <div className={s.formGridDense}>
                  {!isGuidedDesktop ? (
                  <>
                  <label>
                    <span>Funcion</span>
                    <input
                      value={profile.funcion}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, funcion: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Codigo del perfil</span>
                    <input
                      value={profile.codigoPerfil}
                      placeholder="Por asignar"
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, codigoPerfil: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Nombre usado en taller</span>
                    <input
                      value={profile.nombrePerfil}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, nombrePerfil: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label className={s.checkboxField}>
                    <input
                      type="checkbox"
                      checked={profile.requerido}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, requerido: event.target.checked }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                    <span>Componente obligatorio</span>
                  </label>
                  </>
                  ) : null}
                  {isGuidedDesktop && desktopActiveStep === "rules" ? (
                  <>
                  <label>
                    <span>Medida base</span>
                    <select
                      value={profile.reglaMedida.base}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    base: event.target.value as FabricacionBaseMedida,
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    >
                      {FABRICACION_BASES_MEDIDA.map((base) => (
                        <option key={base} value={base}>
                          {labelBaseMedida(base, "technical")}
                        </option>
                      ))}
                    </select>
                  </label>
                  {profile.reglaMedida.base === "fijo_mm" ? (
                    <label>
                      <span>Medida fija (mm)</span>
                      <input
                        type="number"
                        min="1"
                        value={profile.reglaMedida.valorFijoMm ?? 1}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            perfiles: recipe.perfiles.map((entry) =>
                              entry.id === profile.id
                                ? {
                                    ...entry,
                                    reglaMedida: {
                                      ...entry.reglaMedida,
                                      valorFijoMm: positiveNumber(event.target.value),
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>Ajuste</span>
                    <input
                      type="number"
                      value={profile.reglaMedida.ajusteMm ?? 0}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    ajusteMm: integerNumber(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Cantidad</span>
                    <input
                      type="number"
                      min="1"
                      value={profile.reglaCantidad.cantidad}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaCantidad: {
                                    ...entry.reglaCantidad,
                                    cantidad: positiveNumber(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Largo comercial</span>
                    <input
                      type="number"
                      min="1"
                      value={profile.largoComercialMm ?? ""}
                      placeholder="Por confirmar"
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  largoComercialMm: event.target.value
                                    ? positiveNumber(event.target.value)
                                    : null,
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <details className={s.ruleAdvancedDetails}>
                    <summary>Mas opciones</summary>
                    <div className={s.formGridDense}>
                      <label>
                        <span>Multiplicador de medida</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={profile.reglaMedida.multiplicador ?? 1}
                          onChange={(event) =>
                            onRecipeChange({
                              ...recipe,
                              perfiles: recipe.perfiles.map((entry) =>
                                entry.id === profile.id
                                  ? {
                                      ...entry,
                                      reglaMedida: {
                                        ...entry.reglaMedida,
                                        multiplicador: positiveDecimal(event.target.value),
                                      },
                                    }
                                  : entry
                              ),
                            })
                          }
                          disabled={readOnly}
                        />
                      </label>
                      <label>
                        <span>Regla de cantidad</span>
                        <select
                          value={profile.reglaCantidad.tipo}
                          onChange={(event) =>
                            onRecipeChange({
                              ...recipe,
                              perfiles: recipe.perfiles.map((entry) =>
                                entry.id === profile.id
                                  ? {
                                      ...entry,
                                      reglaCantidad: {
                                        ...entry.reglaCantidad,
                                        tipo: event.target.value as FabricacionReglaCantidadTipo,
                                      },
                                    }
                                  : entry
                              ),
                            })
                          }
                          disabled={readOnly}
                        >
                          {FABRICACION_REGLAS_CANTIDAD.map((rule) => (
                            <option key={rule} value={rule}>
                              {labelReglaCantidadTipo(rule, "technical")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Multiplicador de cantidad</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={profile.reglaCantidad.multiplicador ?? 1}
                          onChange={(event) =>
                            onRecipeChange({
                              ...recipe,
                              perfiles: recipe.perfiles.map((entry) =>
                                entry.id === profile.id
                                  ? {
                                      ...entry,
                                      reglaCantidad: {
                                        ...entry.reglaCantidad,
                                        multiplicador: positiveDecimal(event.target.value),
                                      },
                                    }
                                  : entry
                              ),
                            })
                          }
                          disabled={readOnly}
                        />
                      </label>
                      <label>
                        <span>Observaciones</span>
                        <textarea
                          value={profile.observaciones ?? ""}
                          placeholder="Dato de taller, fuente o restriccion"
                          onChange={(event) =>
                            onRecipeChange({
                              ...recipe,
                              perfiles: recipe.perfiles.map((entry) =>
                                entry.id === profile.id
                                  ? { ...entry, observaciones: event.target.value }
                                  : entry
                              ),
                            })
                          }
                          disabled={readOnly}
                        />
                      </label>
                      <label>
                        <span>Datos pendientes</span>
                        <textarea
                          value={(profile.datosPendientes ?? []).join("\n")}
                          placeholder="Uno por linea. Deja vacio al confirmar."
                          onChange={(event) =>
                            onRecipeChange({
                              ...recipe,
                              perfiles: recipe.perfiles.map((entry) =>
                                entry.id === profile.id
                                  ? {
                                      ...entry,
                                      datosPendientes: event.target.value
                                        .split("\n")
                                        .map((value) => value.trim())
                                        .filter(Boolean),
                                    }
                                  : entry
                              ),
                            })
                          }
                          disabled={readOnly}
                        />
                      </label>
                      <ConditionFields
                        condition={profile.reglaMedida.condicion}
                        readOnly={readOnly}
                        onChange={(condition) =>
                          onRecipeChange({
                            ...recipe,
                            perfiles: recipe.perfiles.map((entry) =>
                              entry.id === profile.id
                                ? {
                                    ...entry,
                                    reglaMedida: {
                                      ...entry.reglaMedida,
                                      condicion: condition,
                                    },
                                    reglaCantidad: {
                                      ...entry.reglaCantidad,
                                      condicion: condition,
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                      />
                    </div>
                  </details>
                  </>
                  ) : null}
                  {!isGuidedDesktop ? (
                  <>
                  <label>
                    <span>Dimension base</span>
                    <select
                      value={profile.reglaMedida.base}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    base: event.target.value as FabricacionBaseMedida,
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    >
                      {FABRICACION_BASES_MEDIDA.map((base) => (
                        <option key={base} value={base}>
                          {labelBaseMedida(base, "technical")}
                        </option>
                      ))}
                    </select>
                  </label>
                  {profile.reglaMedida.base === "fijo_mm" ? (
                    <label>
                      <span>Medida fija (mm)</span>
                      <input
                        type="number"
                        min="1"
                        value={profile.reglaMedida.valorFijoMm ?? 1}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            perfiles: recipe.perfiles.map((entry) =>
                              entry.id === profile.id
                                ? {
                                    ...entry,
                                    reglaMedida: {
                                      ...entry.reglaMedida,
                                      valorFijoMm: positiveNumber(event.target.value),
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>Ajuste (mm)</span>
                    <input
                      type="number"
                      value={profile.reglaMedida.ajusteMm ?? 0}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    ajusteMm: integerNumber(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Multiplicador de medida</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={profile.reglaMedida.multiplicador ?? 1}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    multiplicador: positiveDecimal(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Regla de cantidad</span>
                    <select
                      value={profile.reglaCantidad.tipo}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaCantidad: {
                                    ...entry.reglaCantidad,
                                    tipo: event.target
                                      .value as FabricacionReglaCantidadTipo,
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    >
                      {FABRICACION_REGLAS_CANTIDAD.map((rule) => (
                        <option key={rule} value={rule}>
                          {labelReglaCantidadTipo(rule, "technical")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Cantidad</span>
                    <input
                      type="number"
                      min="1"
                      value={profile.reglaCantidad.cantidad}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaCantidad: {
                                    ...entry.reglaCantidad,
                                    cantidad: positiveNumber(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Multiplicador de cantidad</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={profile.reglaCantidad.multiplicador ?? 1}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaCantidad: {
                                    ...entry.reglaCantidad,
                                    multiplicador: positiveDecimal(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Largo comercial (mm)</span>
                    <input
                      type="number"
                      min="1"
                      value={profile.largoComercialMm ?? ""}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  largoComercialMm: event.target.value
                                    ? positiveNumber(event.target.value)
                                    : null,
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Observaciones</span>
                    <textarea
                      value={profile.observaciones ?? ""}
                      placeholder="Dato de taller, fuente o restriccion"
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, observaciones: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Datos pendientes</span>
                    <textarea
                      value={(profile.datosPendientes ?? []).join("\n")}
                      placeholder="Uno por linea. Deja vacio al confirmar."
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  datosPendientes: event.target.value
                                    .split("\n")
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <ConditionFields
                    condition={profile.reglaMedida.condicion}
                    readOnly={readOnly}
                    onChange={(condition) =>
                      onRecipeChange({
                        ...recipe,
                        perfiles: recipe.perfiles.map((entry) =>
                          entry.id === profile.id
                            ? {
                                ...entry,
                                reglaMedida: {
                                  ...entry.reglaMedida,
                                  condicion: condition,
                                },
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  condicion: condition,
                                },
                              }
                            : entry
                        ),
                      })
                    }
                  />
                  {!isGuidedDesktop ? <label className={s.checkboxField}>
                    <input
                      type="checkbox"
                      checked={profile.requerido}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, requerido: event.target.checked }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                    <span>Componente obligatorio</span>
                  </label> : null}
                  </>
                  ) : null}
                </div>
              </article>
            ))
            )}
          </div>
        )}
      </section>
      ) : null}

      {!isRecipeWorkspaceDesktop() && (!isGuidedDesktop || desktopActiveStep === "components") ? (
      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div className={s.sectionTitleBlock}>
            <div className={s.sectionIconFrame} aria-hidden>
              <PanelTop size={24} />
            </div>
            <div>
              <span>Vidrios</span>
            <h2>Vidrios permitidos en la línea</h2>
            </div>
          </div>
          {!readOnly ? (
            <button type="button" className={s.secondaryButton} onClick={addGlass}>
              <Plus size={16} />
              Agregar vidrio
            </button>
          ) : null}
        </div>
        <div className={s.componentList}>
          {isGuidedDesktop && recipe.vidrios.length === 0 ? (
            <div className={s.emptyInline}>Aún no agregas vidrios. Puedes continuar si esta línea no los requiere.</div>
          ) : null}
          {isGuidedDesktop && desktopActiveStep === "components" ? (
            recipe.vidrios.map((glass) => (
              <details
                key={glass.id}
                className={s.componentCompactRow}
                open={expandedComponents.has(glass.id)}
                onToggle={(event) =>
                  setComponentExpanded(glass.id, event.currentTarget.open)
                }
              >
                <summary>
                  <span className={s.componentCompactMark} aria-hidden>
                    <PanelTop size={17} />
                  </span>
                  <span><strong>{glass.nombre || "Vidrio sin nombre"}</strong><small>Paño de vidrio</small></span>
                  <em>Vidrio</em>
                  <span className={s.componentCompactEdit}><Pencil size={14} /> Editar</span>
                </summary>
                <div className={s.formGridDense}>
                  <label>
                    <span>Nombre</span>
                    <input
                      value={glass.nombre}
                      onChange={(event) => onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) => entry.id === glass.id ? { ...entry, nombre: event.target.value } : entry),
                      })}
                      disabled={readOnly}
                    />
                  </label>
                  {!readOnly ? (
                    <button type="button" className={s.dangerTextButton} onClick={() => onRecipeChange({
                      ...recipe,
                      vidrios: recipe.vidrios.filter((entry) => entry.id !== glass.id),
                    })}>
                      <Trash2 size={15} /> Eliminar vidrio
                    </button>
                  ) : null}
                </div>
              </details>
            ))
          ) : (
          recipe.vidrios.map((glass) => (
            <article key={glass.id} className={s.componentCard}>
              <div className={s.componentCardHeader}>
                <strong>{glass.nombre}</strong>
                {!readOnly ? (
                  <button
                    type="button"
                    className={s.iconButton}
                    aria-label={`Eliminar ${glass.nombre}`}
                    title="Eliminar vidrio"
                    onClick={() =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.filter(
                          (entry) => entry.id !== glass.id
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
              <div className={s.formGridDense}>
                {!isGuidedDesktop ? (
                <label>
                  <span>Nombre</span>
                  <input
                    value={glass.nombre}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? { ...entry, nombre: event.target.value }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                ) : null}
                {(!isGuidedDesktop || desktopActiveStep === "rules") ? (
                <>
                {(["reglaAncho", "reglaAlto"] as const).map((field) => (
                  <div key={field} className={s.inlineRule}>
                    <label>
                      <span>{field === "reglaAncho" ? "Regla de ancho" : "Regla de alto"}</span>
                      <select
                        value={glass[field].base}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            vidrios: recipe.vidrios.map((entry) =>
                              entry.id === glass.id
                                ? {
                                    ...entry,
                                    [field]: {
                                      ...entry[field],
                                      base: event.target.value as FabricacionBaseMedida,
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      >
                        {FABRICACION_BASES_MEDIDA.map((base) => (
                          <option key={base} value={base}>
                            {labelBaseMedida(base, "technical")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Ajuste (mm)</span>
                      <input
                        type="number"
                        value={glass[field].ajusteMm ?? 0}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            vidrios: recipe.vidrios.map((entry) =>
                              entry.id === glass.id
                                ? {
                                    ...entry,
                                    [field]: {
                                      ...entry[field],
                                      ajusteMm: integerNumber(event.target.value),
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                    <label>
                      <span>Multiplicador</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={glass[field].multiplicador ?? 1}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            vidrios: recipe.vidrios.map((entry) =>
                              entry.id === glass.id
                                ? {
                                    ...entry,
                                    [field]: {
                                      ...entry[field],
                                      multiplicador: positiveDecimal(
                                        event.target.value
                                      ),
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                  </div>
                ))}
                <label>
                  <span>Regla de cantidad</span>
                  <select
                    value={glass.reglaCantidad.tipo}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  tipo: event.target
                                    .value as FabricacionReglaCantidadTipo,
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  >
                    {FABRICACION_REGLAS_CANTIDAD.map((rule) => (
                      <option key={rule} value={rule}>
                        {labelReglaCantidadTipo(rule, "technical")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={glass.reglaCantidad.cantidad}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  cantidad: positiveNumber(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span>Multiplicador de cantidad</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={glass.reglaCantidad.multiplicador ?? 1}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  multiplicador: positiveDecimal(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <ConditionFields
                  condition={glass.condicion}
                  readOnly={readOnly}
                  onChange={(condition) =>
                    onRecipeChange({
                      ...recipe,
                      vidrios: recipe.vidrios.map((entry) =>
                        entry.id === glass.id
                          ? { ...entry, condicion: condition }
                          : entry
                      ),
                    })
                  }
                />
                </>
                ) : null}
              </div>
            </article>
          ))
          )}
        </div>
      </section>
      ) : null}

      {!isRecipeWorkspaceDesktop() && (!isGuidedDesktop || desktopActiveStep === "components") ? (
      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div className={s.sectionTitleBlock}>
            <div className={s.sectionIconFrame} aria-hidden>
              <Package size={24} />
            </div>
            <div>
              <span>Accesorios</span>
            <h2>Accesorios que acompañan la pieza</h2>
            </div>
          </div>
          {!readOnly ? (
            <button type="button" className={s.secondaryButton} onClick={addAccessory}>
              <Plus size={16} />
              Agregar accesorio
            </button>
          ) : null}
        </div>
        <div className={s.componentList}>
          {isGuidedDesktop && recipe.accesorios.length === 0 ? (
            <div className={s.emptyInline}>Aún no agregas accesorios. Puedes continuar si esta línea no los requiere.</div>
          ) : null}
          {isGuidedDesktop && desktopActiveStep === "components" ? (
            recipe.accesorios.map((accessory) => (
              <details
                key={accessory.id}
                className={s.componentCompactRow}
                open={expandedComponents.has(accessory.id)}
                onToggle={(event) =>
                  setComponentExpanded(accessory.id, event.currentTarget.open)
                }
              >
                <summary>
                  <span className={s.componentCompactMark} aria-hidden>
                    <Package size={17} />
                  </span>
                  <span><strong>{accessory.nombre || "Accesorio sin nombre"}</strong><small>{accessory.codigo || "Sin código"}</small></span>
                  <em>Accesorio</em>
                  <span className={s.componentCompactEdit}><Pencil size={14} /> Editar</span>
                </summary>
                <div className={s.formGridDense}>
                  <label>
                    <span>Nombre</span>
                    <input
                      value={accessory.nombre}
                      onChange={(event) => onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) => entry.id === accessory.id ? { ...entry, nombre: event.target.value } : entry),
                      })}
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Código opcional</span>
                    <input
                      value={accessory.codigo}
                      onChange={(event) => onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) => entry.id === accessory.id ? { ...entry, codigo: event.target.value } : entry),
                      })}
                      disabled={readOnly}
                    />
                  </label>
                  {!readOnly ? (
                    <button type="button" className={s.dangerTextButton} onClick={() => onRecipeChange({
                      ...recipe,
                      accesorios: recipe.accesorios.filter((entry) => entry.id !== accessory.id),
                    })}>
                      <Trash2 size={15} /> Eliminar accesorio
                    </button>
                  ) : null}
                </div>
              </details>
            ))
          ) : (
          recipe.accesorios.map((accessory) => (
            <article key={accessory.id} className={s.componentCard}>
              <div className={s.componentCardHeader}>
                <strong>{accessory.nombre}</strong>
                {!readOnly ? (
                  <button
                    type="button"
                    className={s.iconButton}
                    aria-label={`Eliminar ${accessory.nombre}`}
                    title="Eliminar accesorio"
                    onClick={() =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.filter(
                          (entry) => entry.id !== accessory.id
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
              <div className={s.formGridDense}>
                {!isGuidedDesktop ? (
                <>
                <label>
                  <span>Nombre</span>
                  <input
                    value={accessory.nombre}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? { ...entry, nombre: event.target.value }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span>Codigo opcional</span>
                  <input
                    value={accessory.codigo}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? { ...entry, codigo: event.target.value }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                </>
                ) : null}
                {(!isGuidedDesktop || desktopActiveStep === "rules") ? (
                <>
                <label>
                  <span>Regla de cantidad</span>
                  <select
                    value={accessory.reglaCantidad.tipo}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  tipo: event.target
                                    .value as FabricacionReglaCantidadTipo,
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  >
                    {FABRICACION_REGLAS_CANTIDAD.map((rule) => (
                      <option key={rule} value={rule}>
                        {labelReglaCantidadTipo(rule, "technical")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={accessory.reglaCantidad.cantidad}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  cantidad: positiveNumber(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span>Multiplicador de cantidad</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={accessory.reglaCantidad.multiplicador ?? 1}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  multiplicador: positiveDecimal(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <ConditionFields
                  condition={accessory.condicion}
                  readOnly={readOnly}
                  onChange={(condition) =>
                    onRecipeChange({
                      ...recipe,
                      accesorios: recipe.accesorios.map((entry) =>
                        entry.id === accessory.id
                          ? { ...entry, condicion: condition }
                          : entry
                      ),
                    })
                  }
                />
                </>
                ) : null}
              </div>
            </article>
          ))
          )}
        </div>
      </section>
      ) : null}
    </div>
  );
}
