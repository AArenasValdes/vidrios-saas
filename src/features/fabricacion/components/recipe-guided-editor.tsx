"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Columns3,
  DoorOpen,
  GripVertical,
  Info,
  Layers3,
  MoreVertical,
  Package,
  PanelTop,
  Pencil,
  Plus,
  Ruler,
  SlidersHorizontal,
  Square,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { RecipeTextAssistant } from "@/features/fabricacion/components/recipe-text-assistant";
import { RecipeCommercialLengthPicker } from "@/features/fabricacion/components/recipe-commercial-length-picker";
import { RecipeProfileReferencePicker } from "@/features/fabricacion/components/recipe-profile-reference-picker";

import {
  BASES_TIPOLOGICAS_VENTORA,
  crearBaseTipologicaVentora,
  resolverBaseEstructuralVentora,
  resumirBaseEstructural,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  crearAccesorioFabricacionVacio,
  crearPerfilFabricacionVacio,
  crearVidrioFabricacionVacio,
  patchFabricacionPerfil,
  reorderFabricacionItems,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import {
  applyLargoToProfilesWithoutLength,
  applyTallerPerfilToComponent,
  collectFrequentLargosMm,
  collectTallerPerfilesFromRecipes,
  countProfilesWithoutLength,
  mergeTallerPerfilCatalogs,
  readStoredTallerPerfiles,
  upsertStoredTallerPerfil,
  type TallerPerfilRef,
} from "@/features/fabricacion/services/taller-perfiles.service";
import {
  LINE_TEMPLATE_MATERIALS,
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

const MEASURE_LABELS: Record<FabricacionBaseMedida, string> = {
  ancho_total: "Ancho total",
  alto_total: "Alto total",
  ancho_modulo: "Ancho de modulo",
  alto_modulo: "Alto de modulo",
  ancho_por_hoja: "Ancho dividido por hojas",
  alto_por_hoja: "Alto total por hoja",
  fijo_mm: "Medida fija",
};

const QUANTITY_LABELS: Record<FabricacionReglaCantidadTipo, string> = {
  fija: "Cantidad fija",
  por_hoja: "Por hoja",
  por_modulo: "Por modulo",
};

const TYPOLOGY_OPTIONS = [
  { label: "Corredera", tipologia: "corredera", supported: true, icon: Columns3 },
  { label: "Abatible", tipologia: "abatible", supported: false, icon: BookOpen },
  { label: "Proyectante", tipologia: "proyectante", supported: false, icon: PanelTop },
  { label: "Fija", tipologia: "pano_fijo", supported: false, icon: Square },
  { label: "Puerta", tipologia: "puerta_abatible", supported: false, icon: DoorOpen },
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

/**
 * - pending: base estructural sin ajuste conocido → "Por confirmar", sin badge
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
  const base = MEASURE_LABELS[profile.reglaMedida.base].toLocaleLowerCase("es");
  const multiplier = profile.reglaMedida.multiplicador ?? 1;
  const adjustment = profile.reglaMedida.ajusteMm ?? 0;
  const measure = [
    multiplier !== 1 ? `${base} por ${multiplier}` : base,
    adjustment < 0
      ? `menos ${Math.abs(adjustment)} mm`
      : adjustment > 0
        ? `mas ${adjustment} mm`
        : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `Genera ${profile.reglaCantidad.cantidad} pieza(s) ${QUANTITY_LABELS[
    profile.reglaCantidad.tipo
  ].toLocaleLowerCase("es")} de ${measure}.`;
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
  onMaterialChange,
  onStartModeChange,
  onBaseApplied,
}: Props) {
  const isGuidedDesktop = desktopActiveStep != null;
  const isRecipeWorkspaceDesktop = () =>
    isGuidedDesktop &&
    (desktopActiveStep === "components" || desktopActiveStep === "rules");
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(
    () => new Set()
  );
  const [showAiHelper, setShowAiHelper] = useState(preferAiAssist);
  const [showBaseIncludes, setShowBaseIncludes] = useState(false);
  const [draggingProfileIndex, setDraggingProfileIndex] = useState<number | null>(
    null
  );
  const [dragOverProfileIndex, setDragOverProfileIndex] = useState<number | null>(
    null
  );
  const [openProfileActionsId, setOpenProfileActionsId] = useState<string | null>(
    null
  );
  const selectedTypologyOption =
    TYPOLOGY_OPTIONS.find(
      (option) => option.tipologia === recipe.identidad.tipologia
    ) ?? TYPOLOGY_OPTIONS[TYPOLOGY_OPTIONS.length - 1];
  const selectedTypologyBase = resolverBaseEstructuralVentora({
    tipologia: recipe.identidad.tipologia,
    hojas: recipe.identidad.hojas,
  });
  const leafLabel =
    selectedTypologyOption.label === "Personalizada"
      ? "Hoja personalizada"
      : `Hoja ${selectedTypologyOption.label.toLowerCase()}`;
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

  useEffect(() => {
    if (preferAiAssist) setShowAiHelper(true);
  }, [preferAiAssist]);

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

  const profilesWithoutLength = countProfilesWithoutLength(recipe);
  const applyLengthCandidate = useMemo(() => {
    if (profilesWithoutLength === 0) return null;
    const counts = new Map<number, number>();
    for (const profile of recipe.perfiles) {
      const largo = profile.largoComercialMm;
      if (typeof largo !== "number" || largo <= 0) continue;
      counts.set(largo, (counts.get(largo) ?? 0) + 1);
    }
    if (counts.size === 0) return null;
    return Array.from(counts.entries()).sort(
      (left, right) => right[1] - left[1] || left[0] - right[0]
    )[0]?.[0] ?? null;
  }, [profilesWithoutLength, recipe.perfiles]);

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
    const nextHojas = catalogEntry?.hojasSugeridas ?? recipe.identidad.hojas;
    const nextModulos =
      catalogEntry?.modulosSugeridos ?? recipe.identidad.modulos;
    updateIdentity({
      tipologia,
      apertura: tipologia === "personalizada" ? null : tipologia,
      hojas: nextHojas,
      modulos: nextModulos,
    });
    const resolved = resolverBaseEstructuralVentora({
      tipologia,
      hojas: nextHojas,
    });
    if (resolved) {
      onStartModeChange?.("ventora");
      return;
    }
    onStartModeChange?.(selectedStartMode === "ai" ? "ai" : "blank");
  };

  const selectStartMode = (mode: "ventora" | "ai" | "blank") => {
    if (mode === "ventora" && !basePreview) return;
    onStartModeChange?.(mode);
    if (onStartModeChange) return;
    if (mode === "ventora") applyVentoraBase();
    else if (mode === "blank") resetToBlankStructure();
    else setShowAiHelper(true);
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

  useEffect(() => {
    if (!openProfileActionsId) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`.${s.recipeBuildRowActions}`)) return;
      setOpenProfileActionsId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenProfileActionsId(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openProfileActionsId]);

  const removeProfile = (profileId: string) => {
    onRecipeChange({
      ...recipe,
      perfiles: recipe.perfiles.filter((entry) => entry.id !== profileId),
    });
    setOpenProfileActionsId((current) =>
      current === profileId ? null : current
    );
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
      {!readOnly && !isGuidedDesktop ? (
        <RecipeTextAssistant
          recipe={recipe}
          providerName={providerName}
          lineName={lineName}
          onApply={onRecipeChange}
        />
      ) : null}
      {isGuidedDesktop && desktopActiveStep === "base" ? (
      <section id="recipe-identity" className={`${s.editorSection} ${s.lineSetupCard}`}>
        <div className={s.lineSetupCardHeading}>
          <h2>1. Datos de la línea</h2>
          <p>Define qué estás fabricando. Con esto basta para empezar.</p>
        </div>

        <div className={s.lineSetupPrimaryGrid}>
          <label>
            <span>Proveedor <em>(opcional)</em></span>
            <select
              value={providerName}
              onChange={(event) => onProviderNameChange(event.target.value)}
              disabled={readOnly}
            >
              <option value="">Sin definir</option>
              {providerName && !providerOptions.includes(providerName) ? (
                <option value={providerName}>{providerName}</option>
              ) : null}
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Línea <b aria-hidden="true">*</b></span>
            <input
              value={lineName}
              onChange={(event) => onLineNameChange(event.target.value)}
              disabled={readOnly}
              required
            />
          </label>
          <label>
            <span>Nombre interno de la receta <b aria-hidden="true">*</b></span>
            <input
              value={recipe.identidad.nombre}
              onChange={(event) => updateIdentity({ nombre: event.target.value })}
              disabled={readOnly}
              required
            />
          </label>
        </div>

        <div className={s.lineSetupClassification}>
          <label className={s.lineSetupMaterialField}>
            <span>Material <b aria-hidden="true">*</b></span>
            <select
              value={material}
              onChange={(event) =>
                onMaterialChange?.(event.target.value as CotizacionLineTemplateMaterial)
              }
              disabled={readOnly || !onMaterialChange}
              required
            >
              {LINE_TEMPLATE_MATERIALS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <fieldset className={s.lineSetupTypologyFieldset}>
            <legend>Tipología <b aria-hidden="true">*</b></legend>
            <div className={s.lineSetupTypologyGrid} role="radiogroup" aria-label="Tipología de la línea">
              {TYPOLOGY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = selectedTypologyOption.tipologia === option.tipologia;
                return (
                  <button
                    key={option.tipologia}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={s.lineSetupTypologyOption}
                    data-selected={selected}
                    onClick={() => selectTypology(option.tipologia)}
                    disabled={readOnly}
                  >
                    <Icon size={28} strokeWidth={1.6} aria-hidden="true" />
                    <strong>{option.label}</strong>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className={s.lineSetupSecondaryGrid}>
          <label>
            <span>Hojas <b aria-hidden="true">*</b></span>
            <select
              value={recipe.identidad.hojas}
              onChange={(event) => updateIdentity({ hojas: positiveNumber(event.target.value) })}
              disabled={readOnly}
              required
            >
              {[1, 2, 3, 4, 5, 6].map((leaves) => (
                <option key={leaves} value={leaves}>
                  {leaves} {leaves === 1 ? "hoja" : "hojas"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Variante / apertura personalizada <em>(opcional)</em></span>
            <input
              value={recipe.identidad.variante}
              placeholder="Ej. Corredera con traba multipunto"
              onChange={(event) => updateIdentity({ variante: event.target.value })}
              disabled={readOnly}
            />
          </label>
        </div>

        <section className={s.lineSetupBaseSection} aria-labelledby="line-setup-base-title">
          <div>
            <h3 id="line-setup-base-title">¿Cómo quieres comenzar?</h3>
            <p>Parte con una estructura preparada o crea tu propia receta.</p>
          </div>
          <div className={s.lineSetupBaseChoices} role="radiogroup" aria-label="Cómo comenzar la receta">
            <button
              type="button"
              role="radio"
              aria-checked={selectedStartMode === "ventora"}
              className={s.lineSetupBaseChoice}
              data-selected={selectedStartMode === "ventora"}
              disabled={readOnly || !basePreview}
              onClick={() => selectStartMode("ventora")}
            >
              <span className={s.lineSetupRadio} aria-hidden="true" />
              <span className={s.lineSetupBaseChoiceIcon} aria-hidden="true">
                <Layers3 size={18} strokeWidth={1.75} />
              </span>
              <span className={s.lineSetupBaseChoiceBody}>
                <span className={s.lineSetupBaseChoiceTitle}>
                  <strong>Usar base de Ventora</strong>
                  {basePreview ? (
                    <em className={s.lineSetupRecommendedBadge}>Recomendado</em>
                  ) : null}
                </span>
                <small>
                  Ventora prepara las funciones habituales para esta tipología. Tú
                  revisas y ajustas lo que usa tu taller.
                </small>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={selectedStartMode === "ai"}
              className={s.lineSetupBaseChoice}
              data-selected={selectedStartMode === "ai"}
              disabled={readOnly}
              onClick={() => selectStartMode("ai")}
            >
              <span className={s.lineSetupRadio} aria-hidden="true" />
              <span className={s.lineSetupBaseChoiceIcon} aria-hidden="true">
                <BrainCircuit size={18} strokeWidth={1.75} />
              </span>
              <span className={s.lineSetupBaseChoiceBody}>
                <span className={s.lineSetupBaseChoiceTitle}>
                  <strong>Ayudarme con IA</strong>
                </span>
                <small>
                  Describe cómo fabricas y Ventora prepara un borrador para que lo
                  revises.
                </small>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={selectedStartMode === "blank"}
              className={s.lineSetupBaseChoice}
              data-selected={selectedStartMode === "blank"}
              disabled={readOnly}
              onClick={() => selectStartMode("blank")}
            >
              <span className={s.lineSetupRadio} aria-hidden="true" />
              <span className={s.lineSetupBaseChoiceIcon} aria-hidden="true">
                <SlidersHorizontal size={18} strokeWidth={1.75} />
              </span>
              <span className={s.lineSetupBaseChoiceBody}>
                <span className={s.lineSetupBaseChoiceTitle}>
                  <strong>Empezar desde cero</strong>
                </span>
                <small>Para talleres que ya conocen completamente su receta.</small>
              </span>
            </button>
          </div>

          {selectedStartMode === "ventora" && basePreview && selectedTypologyBase ? (
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

          {selectedStartMode === "ventora" && !basePreview ? (
            <p className={s.lineSetupBaseEmpty}>
              No hay una base preparada para esta combinación. Puedes continuar con
              Ayudarme con IA o Empezar desde cero.
            </p>
          ) : null}
        </section>
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
                {option.supported ? "Base disponible" : "Pendiente / manual o IA"}
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
                <span>Base disponible en Ventora</span>
                <h3>
                  {selectedTypologyBase?.label} · {recipe.identidad.hojas}{" "}
                  {recipe.identidad.hojas === 1 ? "hoja" : "hojas"}
                </h3>
                <p>Prepara una estructura orientativa. Los codigos, ajustes en mm y largos comerciales quedan como Por confirmar.</p>
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
                  Usar base y continuar
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!readOnly && !basePreview ? (
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
                onClick={() => setShowAiHelper((current) => !current)}
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

        {!readOnly && basePreview ? (
          <div className={s.aiAssistInline}>
            <button
              type="button"
              className={s.textButton}
              onClick={() => setShowAiHelper((current) => !current)}
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
                  ? "Confirma largo comercial y los tres parámetros de corte para generar la pauta."
                  : "Completa primero una prueba con medidas reales."}
              </div>
            )}
          </div>
        ) : null}
      </section>
      ) : null}

      {isRecipeWorkspaceDesktop() ? (
      <>
      {!readOnly && (preferAiAssist || showAiHelper) ? (
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
      <section id="recipe-components" className={s.recipeBuildCard}>
        <header className={s.recipeBuildHeader}>
          <div>
            <h2>2. Receta de fabricación</h2>
            <p>Configura funciones, perfiles y descuentos sugeridos.</p>
          </div>
        </header>
        <div className={s.recipeBuildNotice}>
          <Info size={16} aria-hidden="true" />
          Puedes avanzar sin códigos ni largos. El despiece sale con función + fórmula; el perfil une material; el largo habilita barras.
        </div>
        <p className={s.recipeBuildFieldHint}>
          Usa el mismo perfil en varias funciones si realmente se cortan de la misma barra.
        </p>

        <section className={s.recipeBuildGroup} aria-labelledby="recipe-build-marco">
          <div className={s.recipeBuildGroupHeading}>
            <h3 id="recipe-build-marco">Marco</h3>
            <div className={s.recipeBuildGroupHeadingActions}>
              {!readOnly && applyLengthCandidate != null ? (
                <button
                  type="button"
                  className={s.recipeBuildQuietAction}
                  onClick={() => {
                    const confirmed = window.confirm(
                      `¿Aplicar ${applyLengthCandidate.toLocaleString("es-CL")} mm a los ${profilesWithoutLength} perfiles sin largo?`
                    );
                    if (!confirmed) return;
                    onRecipeChange(
                      applyLargoToProfilesWithoutLength(recipe, applyLengthCandidate)
                    );
                  }}
                >
                  Aplicar {applyLengthCandidate.toLocaleString("es-CL")} mm a los perfiles sin largo
                </button>
              ) : null}
              {!readOnly ? (
                <button type="button" className={`${s.secondaryButton} ${s.recipeBuildAddButton}`} onClick={addProfile}>
                  <Plus size={15} />
                  Agregar perfil
                </button>
              ) : (
                <span>{recipe.perfiles.length} {recipe.perfiles.length === 1 ? "perfil" : "perfiles"}</span>
              )}
            </div>
          </div>
          {recipe.perfiles.length === 0 ? (
            <div className={s.emptyInline}>Agrega el primer perfil para preparar esta receta.</div>
          ) : (
            <div className={s.recipeBuildTableWrap}>
              <div className={s.recipeBuildTable} role="table" aria-label="Perfiles del marco">
                <div className={s.recipeBuildTableHeader} role="row">
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span>Función</span>
                  <span title="Perfil real del taller. El código comercial es opcional.">
                    Perfil / referencia
                  </span>
                  <span title="Define de qué medida sale este corte.">Calcular según</span>
                  <span title="mm que se suman o restan a la medida base.">Ajuste</span>
                  <span title="Cantidad de cortes de esta función por pieza.">Cantidad</span>
                  <span title="Medida de la tira que compras.">Largo comercial</span>
                  <span aria-hidden="true" />
                </div>
                {recipe.perfiles.map((profile, index) => {
                  const adjustmentState = getAdjustmentDisplayState(
                    profile,
                    adjustedAwayFromSuggestion.has(profile.id)
                  );
                  const showSuggestedBadge = adjustmentState === "suggested";
                  const showCustomBadge = adjustmentState === "custom";
                  const adjustmentPending = adjustmentState === "pending";
                  const currentAdjustment = profile.reglaMedida.ajusteMm;
                  const isDragging = draggingProfileIndex === index;
                  const isDropTarget =
                    dragOverProfileIndex === index &&
                    draggingProfileIndex != null &&
                    draggingProfileIndex !== index;

                  return (
                  <div
                    key={profile.id}
                    className={s.recipeBuildTableRow}
                    role="row"
                    data-dragging={isDragging}
                    data-drop-target={isDropTarget}
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
                    <label className={s.recipeBuildCheckbox} aria-label={`Perfil ${profile.funcion || index + 1} obligatorio`}>
                      <span className={s.srOnly}>Componente obligatorio</span>
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
                    </label>
                    <label className={s.recipeBuildFunction}>
                      <span className={s.srOnly}>Función</span>
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
                      {profile.codigoPerfil.trim() ? (
                        <small>Cód. {profile.codigoPerfil}</small>
                      ) : null}
                    </label>
                    <RecipeProfileReferencePicker
                      profile={profile}
                      recipe={recipe}
                      catalog={tallerPerfilCatalog}
                      readOnly={readOnly}
                      onSelect={(tallerPerfil) =>
                        assignTallerPerfil(profile.id, tallerPerfil)
                      }
                    />
                    <label className={s.recipeBuildMeasure}>
                      <span className={s.srOnly}>Calcular según</span>
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
                        {FABRICACION_BASES_MEDIDA.map((base) => <option key={base} value={base}>{MEASURE_LABELS[base]}</option>)}
                      </select>
                    </label>
                    <div className={s.recipeBuildAdjustment}>
                      <label>
                        <span className={s.srOnly}>Ajuste sugerido</span>
                        <input
                          type="number"
                          value={
                            adjustmentPending || currentAdjustment == null
                              ? ""
                              : currentAdjustment
                          }
                          placeholder="Por confirmar"
                          title={
                            adjustmentPending
                              ? "Usa el descuento que realmente aplica tu taller."
                              : undefined
                          }
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (!raw.trim()) {
                              updateProfile(profile.id, (entry) => {
                                const pending = new Set(entry.datosPendientes ?? []);
                                pending.add("Confirmar ajuste o descuento en mm");
                                return {
                                  ...entry,
                                  reglaMedida: {
                                    base: entry.reglaMedida.base,
                                    valorFijoMm: entry.reglaMedida.valorFijoMm,
                                    multiplicador: entry.reglaMedida.multiplicador,
                                    condicion: entry.reglaMedida.condicion,
                                  },
                                  datosPendientes: Array.from(pending),
                                };
                              });
                              setAdjustedAwayFromSuggestion((prev) => {
                                if (!prev.has(profile.id)) return prev;
                                const next = new Set(prev);
                                next.delete(profile.id);
                                return next;
                              });
                              return;
                            }
                            const nextAdjustment = integerNumber(raw);
                            if (
                              suggestedAdjustmentIds.has(profile.id) ||
                              hasDocumentedAdjustment(profile)
                            ) {
                              setAdjustedAwayFromSuggestion((prev) => {
                                const next = new Set(prev);
                                next.add(profile.id);
                                return next;
                              });
                            }
                            updateProfile(profile.id, (entry) => {
                              const pending = (entry.datosPendientes ?? []).filter(
                                (detail) => !AJUSTE_PENDIENTE_RE.test(detail)
                              );
                              return {
                                ...entry,
                                reglaMedida: {
                                  ...entry.reglaMedida,
                                  ajusteMm: nextAdjustment,
                                },
                                datosPendientes:
                                  pending.length > 0 ? pending : undefined,
                              };
                            });
                          }}
                          disabled={readOnly}
                        />
                        <small>mm</small>
                      </label>
                      {showSuggestedBadge ? (
                        <span className={s.recipeBuildSuggestedBadge}>Sugerido</span>
                      ) : null}
                      {showCustomBadge ? (
                        <span className={s.recipeBuildCustomBadge}>Personalizado</span>
                      ) : null}
                    </div>
                    <label className={s.recipeBuildQuantity}>
                      <span className={s.srOnly}>Cantidad</span>
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
                    <RecipeCommercialLengthPicker
                      value={profile.largoComercialMm}
                      usedByWorkshop={frequentLargos.usedByWorkshop}
                      otherFrequent={frequentLargos.otherFrequent}
                      readOnly={readOnly}
                      onChange={(nextValue) =>
                        updateProfile(profile.id, (entry) => {
                          const pending = (entry.datosPendientes ?? []).filter(
                            (detail) => !/largo comercial/i.test(detail)
                          );
                          if (nextValue == null) {
                            pending.push("Confirmar largo comercial");
                          }
                          return {
                            ...entry,
                            largoComercialMm: nextValue,
                            datosPendientes:
                              pending.length > 0 ? pending : undefined,
                          };
                        })
                      }
                    />
                    <div
                      className={s.recipeBuildRowActions}
                      data-open={openProfileActionsId === profile.id}
                      data-drop-up={index >= Math.max(0, recipe.perfiles.length - 2)}
                    >
                      <button
                        type="button"
                        className={s.recipeBuildRowActionsTrigger}
                        aria-label={`Más opciones para ${profile.funcion || `perfil ${index + 1}`}`}
                        aria-expanded={openProfileActionsId === profile.id}
                        aria-haspopup="menu"
                        disabled={readOnly}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenProfileActionsId((current) =>
                            current === profile.id ? null : profile.id
                          );
                        }}
                      >
                        <MoreVertical size={17} aria-hidden="true" />
                      </button>
                      {openProfileActionsId === profile.id ? (
                        <div
                          className={s.recipeBuildRowActionsMenu}
                          role="menu"
                          aria-label={`Opciones de ${profile.funcion || `perfil ${index + 1}`}`}
                        >
                          <label>
                            <span>Nombre usado en taller</span>
                            <input
                              value={profile.nombrePerfil}
                              onChange={(event) =>
                                updateProfile(profile.id, (entry) => ({
                                  ...entry,
                                  nombrePerfil: event.target.value,
                                }))
                              }
                              disabled={readOnly}
                            />
                          </label>
                          {!readOnly ? (
                            <button
                              type="button"
                              className={s.dangerTextButton}
                              role="menuitem"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                removeProfile(profile.id);
                              }}
                            >
                              <Trash2 size={15} /> Eliminar perfil
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <details className={`${s.recipeBuildDisclosure} ${s.recipeBuildLeaves}`}>
          <summary>
            <PanelTop size={16} aria-hidden="true" />
            <strong id="recipe-build-hojas">Hojas</strong>
            <em>{leafLabel}</em>
            <b>{recipe.identidad.hojas} {recipe.identidad.hojas === 1 ? "unidad" : "unidades"}</b>
            <span className={s.recipeBuildDisclosureChevron} aria-hidden="true"><ChevronDown size={15} /></span>
          </summary>
        </details>

        <details className={s.recipeBuildDisclosure}>
          <summary>
            <PanelTop size={18} aria-hidden="true" />
            <strong>Vidrio</strong>
            <span>(opcional)</span>
            <small>{recipe.vidrios.length}</small>
            <span className={s.recipeBuildDisclosureChevron} aria-hidden="true"><ChevronDown size={16} /></span>
          </summary>
          <div className={s.recipeBuildDisclosureContent}>
            {!readOnly ? <button type="button" className={s.secondaryButton} onClick={addGlass}><Plus size={16} />Agregar vidrio</button> : null}
            {recipe.vidrios.length === 0 ? (
              <p>Aún no agregas vidrios para esta receta.</p>
            ) : (
              recipe.vidrios.map((glass) => (
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
              ))
            )}
          </div>
        </details>

        <details className={s.recipeBuildDisclosure}>
          <summary>
            <Package size={18} aria-hidden="true" />
            <strong>Accesorios</strong>
            <span>(opcional)</span>
            <small>{recipe.accesorios.length}</small>
            <span className={s.recipeBuildDisclosureChevron} aria-hidden="true"><ChevronDown size={16} /></span>
          </summary>
          <div className={s.recipeBuildDisclosureContent}>
            {!readOnly ? <button type="button" className={s.secondaryButton} onClick={addAccessory}><Plus size={16} />Agregar accesorio</button> : null}
            {recipe.accesorios.length === 0 ? (
              <p>Aún no agregas accesorios para esta receta.</p>
            ) : (
              recipe.accesorios.map((accessory) => (
                <div key={accessory.id} className={s.recipeBuildInlineItem}>
                  <label>
                    <span>Accesorio</span>
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
                  {!readOnly ? (
                    <button
                      type="button"
                      className={s.dangerTextButton}
                      onClick={() => removeAccessory(accessory.id)}
                    >
                      <Trash2 size={15} /> Eliminar
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </details>
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
                          {MEASURE_LABELS[base]}
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
                              {QUANTITY_LABELS[rule]}
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
                          {MEASURE_LABELS[base]}
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
                          {QUANTITY_LABELS[rule]}
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
                            {MEASURE_LABELS[base]}
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
                        {QUANTITY_LABELS[rule]}
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
                        {QUANTITY_LABELS[rule]}
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
