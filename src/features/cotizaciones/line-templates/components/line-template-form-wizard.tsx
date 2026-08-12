"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  LuBadgeDollarSign,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuSlidersHorizontal,
  LuTag,
  LuTruck,
  LuX,
} from "react-icons/lu";

import {
  buildGlassValue,
  formatCurrencyInput,
  GLASS_OPTIONS,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplateCuttingPreview } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  type CotizacionLineTemplateCubicationStatus,
  type CotizacionLineTemplateCubicationSystem,
  type CotizacionLineTemplateCategoria,
  type CotizacionLineTemplateCuttingMode,
  type CotizacionLineTemplateEstimationMode,
  type CotizacionLineTemplateMaterial,
  type CotizacionLineTemplateUnidadCobro,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  RECIPE_STATUS_LABELS,
  deriveRecipeStatus,
  upsertRecipeInPack,
  type FabricationRecipe,
  type FabricationRecipePack,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { createStructuralRecipeTemplate } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-templates";
import {
  COMMERCIAL_PENDING_BASES,
  COMMERCIAL_SUGGESTED_TEMPLATES,
  createCommercialTemplateRecipe,
  matchSuggestedTemplateIdByLineName,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";
import { FabricationRecipeEditor } from "@/features/cotizaciones/line-templates/components/fabrication-recipe-editor";
import {
  type CubicationSystemCalibrationPreset,
  type WorkshopCalibrationSuggestion,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-calibration";
import {
  formatLineTemplatePriceLabel,
  LINE_TEMPLATE_CATEGORIA_LABELS,
  LINE_TEMPLATE_UNIDAD_LABELS,
} from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import { formatCurrency } from "@/utils/formatCurrency";

import { LineTemplateMobileEditor } from "./line-template-mobile-editor";
import s from "./lineas-precios-page-client.module.css";

export type LineTemplateFormDraft = {
  nombre: string;
  categoria: CotizacionLineTemplateCategoria | "";
  unidadCobro: CotizacionLineTemplateUnidadCobro | "";
  material: CotizacionLineTemplateMaterial | "";
  espesor: string;
  terminacion: string;
  vidrioPrincipalRecomendado: string;
  costoBase: string;
  precioM2Sugerido: string;
  minimoCobrable: string;
  redondeoPrecio: string;
  mermaPct: string;
  margenObjetivoPct: string;
  proveedor: string;
  lineSystem: string;
  cubicationSystem: CotizacionLineTemplateCubicationSystem;
  cubicationStatus: CotizacionLineTemplateCubicationStatus;
  profileFrame: string;
  profileSash: string;
  profileMeeting: string;
  profileGlazingBead: string;
  profileSill: string;
  profileAccessory: string;
  deductionFrameHorizontalMm: string;
  deductionFrameVerticalMm: string;
  deductionSashHorizontalMm: string;
  deductionSashVerticalMm: string;
  deductionGlassWidthMm: string;
  deductionGlassHeightMm: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  estimationEnabled: boolean;
  estimationMode: CotizacionLineTemplateEstimationMode;
  estimationFrameFactor: string;
  estimationSashFactor: string;
  estimationAccessoryUnits: string;
  cuttingEnabled: boolean;
  cuttingMode: CotizacionLineTemplateCuttingMode;
  cuttingBarLengthMm: string;
  cuttingSawKerfMm: string;
  cuttingSashCount: string;
  isActive: boolean;
  /** Receta en edición (variante activa del pack). */
  fabricationRecipe: FabricationRecipe | null;
  /** Pack de variantes de la línea. */
  fabricationRecipePack: FabricationRecipePack | null;
};

export type LineUsageMode = "solo_cotizar" | "con_estimacion" | "cubicacion_pauta";

function pricingUnitCopy(unidad: CotizacionLineTemplateUnidadCobro) {
  switch (unidad) {
    case "metro_lineal":
      return {
        saleLabel: "Precio de venta por ml",
        costLabel: "Costo estimado por ml",
        saleHelp: "Valor que cobrarás al cliente por cada ml.",
        unitSuffix: "/ml",
      };
    case "unidad":
      return {
        saleLabel: "Precio de venta por unidad",
        costLabel: "Costo estimado por unidad",
        saleHelp: "Valor que cobrarás al cliente por cada unidad.",
        unitSuffix: "/ud",
      };
    case "valor_manual":
      return {
        saleLabel: "Precio de venta",
        costLabel: "Costo estimado",
        saleHelp: "Valor que cobrarás al cliente.",
        unitSuffix: "",
      };
    default:
      return {
        saleLabel: "Precio de venta por m²",
        costLabel: "Costo estimado por m²",
        saleHelp: "Valor que cobrarás al cliente por cada m².",
        unitSuffix: "/m²",
      };
  }
}

const ROUNDING_OPTIONS = [
  { value: "0", label: "Sin redondeo" },
  { value: "1000", label: "Redondear a $1.000" },
  { value: "5000", label: "Redondear a $5.000" },
  { value: "10000", label: "Redondear a $10.000" },
] as const;

const LINE_SYSTEM_OPTIONS = [
  "Corredera",
  "Fija",
  "Proyectante",
  "Puerta",
  "Shower",
  "Cristal",
  "Otro",
] as const;

const GLASS_SELECT_OPTIONS = GLASS_OPTIONS.flatMap((group) =>
  group.items.map((item) => buildGlassValue(group.prefix, item))
);

const USAGE_MODE_OPTIONS: Array<{
  value: LineUsageMode;
  title: string;
  description: string;
}> = [
  {
    value: "solo_cotizar",
    title: "Solo cotizar",
    description: "Usa el precio comercial sin calcular materiales.",
  },
  {
    value: "con_estimacion",
    title: "Cotizar con estimación",
    description: "Entrega cantidades aproximadas, sin una pauta de fabricación validada.",
  },
  {
    value: "cubicacion_pauta",
    title: "Cubicación y pauta",
    description:
      "Cotiza desde ya; la pauta de corte se habilita solo cuando valides la receta.",
  },
];

function getDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatMoneyDigits(value: string) {
  return formatCurrencyInput(getDigits(value));
}

function formatMeasurement(value: number, suffix: string) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ${suffix}`;
}

function buildAdvancedDetailsSummary(draft: LineTemplateFormDraft) {
  const parts: string[] = [];
  if (draft.redondeoPrecio !== "0") parts.push("Redondeo");
  if (draft.mermaPct) parts.push("Merma");
  if (draft.margenObjetivoPct) parts.push("Margen");
  if (draft.proveedor.trim()) parts.push("Proveedor");
  if (draft.lineSystem.trim()) parts.push("Sistema");
  if (draft.vidrioPrincipalRecomendado) parts.push("Vidrio");
  return parts.slice(0, 4).join(" · ");
}

export function resolveLineUsageMode(draft: LineTemplateFormDraft): LineUsageMode {
  if (!draft.estimationEnabled) return "solo_cotizar";
  if (draft.cuttingEnabled) return "cubicacion_pauta";
  return "con_estimacion";
}

export function applyLineUsageMode(
  mode: LineUsageMode,
  draft: LineTemplateFormDraft
): Partial<LineTemplateFormDraft> {
  const isGlassDraft = draft.categoria === "vidrio";
  if (mode === "solo_cotizar") {
    return { estimationEnabled: false, cuttingEnabled: false };
  }
  if (mode === "con_estimacion") {
    return {
      estimationEnabled: true,
      cuttingEnabled: false,
      estimationMode: isGlassDraft ? "vidrio" : getEstimationModeForSystem(draft.cubicationSystem),
    };
  }
  const typology = getTypologyFieldConfig(draft.cubicationSystem);
  return {
    estimationEnabled: true,
    cuttingEnabled: true,
    estimationMode: getEstimationModeForSystem(draft.cubicationSystem),
    cuttingMode: typology.defaultCuttingMode,
  };
}

function getUsageModeLabel(mode: LineUsageMode) {
  return USAGE_MODE_OPTIONS.find((option) => option.value === mode)?.title ?? mode;
}

function getEstimationModeForSystem(
  system: CotizacionLineTemplateCubicationSystem
): LineTemplateFormDraft["estimationMode"] {
  return system === "pano_fijo" ? "marco_simple" : "marco_hojas";
}

type TypologyFieldConfig = {
  profiles: Array<"frame" | "sash" | "meeting" | "glazingBead" | "sill">;
  deductions: Array<
    | "frameHorizontal"
    | "frameVertical"
    | "sashHorizontal"
    | "sashVertical"
    | "glassWidth"
    | "glassHeight"
  >;
  showSashCount: boolean;
  defaultCuttingMode: CotizacionLineTemplateCuttingMode;
};

function getTypologyFieldConfig(
  system: CotizacionLineTemplateCubicationSystem
): TypologyFieldConfig {
  if (system === "corredera_2_hojas") {
    return {
      profiles: ["frame", "sash", "meeting", "glazingBead"],
      deductions: [
        "frameHorizontal",
        "frameVertical",
        "sashHorizontal",
        "sashVertical",
        "glassWidth",
        "glassHeight",
      ],
      showSashCount: true,
      defaultCuttingMode: "marco_hojas",
    };
  }
  if (system === "puerta_abatible_1_hoja") {
    return {
      profiles: ["frame", "sash", "glazingBead", "sill"],
      deductions: [
        "frameHorizontal",
        "frameVertical",
        "sashHorizontal",
        "sashVertical",
        "glassWidth",
        "glassHeight",
      ],
      showSashCount: false,
      defaultCuttingMode: "marco_hojas",
    };
  }
  return {
    profiles: ["frame", "glazingBead"],
    deductions: ["frameHorizontal", "frameVertical", "glassWidth", "glassHeight"],
    showSashCount: false,
    defaultCuttingMode: "marco",
  };
}

type Props = {
  sheetMode: "new" | "edit";
  sheetTitle: string;
  wizardStep: number;
  onWizardStepChange: (step: number) => void;
  draft: LineTemplateFormDraft;
  onDraftChange: <K extends keyof LineTemplateFormDraft>(
    key: K,
    value: LineTemplateFormDraft[K]
  ) => void;
  onDraftPatch: (patch: Partial<LineTemplateFormDraft>) => void;
  showAdvancedDetails: boolean;
  onShowAdvancedDetailsChange: (show: boolean) => void;
  isGlassDraft: boolean;
  saveDisabled: boolean;
  isSaving: boolean;
  onSave: () => void;
  onSaveAndConfigure?: () => void;
  onClose: () => void;
  pricePerM2: number;
  minimum: number;
  costoBase: number;
  unidadCobro: CotizacionLineTemplateUnidadCobro;
  calibrationVanoWidthMm: string;
  calibrationVanoHeightMm: string;
  expectedGlassWidthMm: string;
  expectedGlassHeightMm: string;
  expectedFrameHorizontalMm: string;
  expectedFrameVerticalMm: string;
  onCalibrationVanoWidthMmChange: (value: string) => void;
  onCalibrationVanoHeightMmChange: (value: string) => void;
  onExpectedGlassWidthMmChange: (value: string) => void;
  onExpectedGlassHeightMmChange: (value: string) => void;
  onExpectedFrameHorizontalMmChange: (value: string) => void;
  onExpectedFrameVerticalMmChange: (value: string) => void;
  calibrationWidthMm: number;
  calibrationHeightMm: number;
  expectedGlassWidthValue: number | null;
  expectedGlassHeightValue: number | null;
  glassCalibrationDelta: { widthMm: number; heightMm: number } | null;
  cuttingPreview: CotizacionLineTemplateCuttingPreview;
  systemCalibrationPreset: CubicationSystemCalibrationPreset;
  calibrationSuggestion: WorkshopCalibrationSuggestion;
  onApplySystemCalibrationPreset: () => void;
  onApplyWorkshopCalibrationSuggestion: () => void;
  estimationSampleAreaM2: number;
  estimationSampleFrameMl: number;
  estimationSampleSashMl: number;
  estimationAccessoryUnits: number;
  technicalAdminHref?: string | null;
};

export function LineTemplateFormWizard({
  sheetMode,
  sheetTitle,
  wizardStep,
  onWizardStepChange,
  draft,
  onDraftChange,
  onDraftPatch,
  showAdvancedDetails,
  onShowAdvancedDetailsChange,
  isGlassDraft,
  saveDisabled,
  isSaving,
  onSave,
  onSaveAndConfigure,
  onClose,
  pricePerM2,
  unidadCobro,
  calibrationVanoWidthMm,
  calibrationVanoHeightMm,
  onCalibrationVanoWidthMmChange,
  onCalibrationVanoHeightMmChange,
  estimationSampleAreaM2,
  technicalAdminHref,
}: Props) {
  const sheetBodyRef = useRef<HTMLDivElement | null>(null);
  const moreDetailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [recipeFocusComponentId, setRecipeFocusComponentId] = useState<string | null>(null);
  const [originChoice, setOriginChoice] = useState<
    "plantilla" | "base" | "propia" | null
  >(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [isRecipeWorkspaceOpen, setIsRecipeWorkspaceOpen] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState<boolean | null>(null);

  const usageMode = resolveLineUsageMode(draft);
  const maxStep = isDesktopLayout === false
    ? 2
    : isDesktopLayout && usageMode === "cubicacion_pauta"
      ? 3
      : 2;
  const openStep = Math.min(wizardStep, maxStep);
  const pricingCopy = pricingUnitCopy(unidadCobro);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => setIsDesktopLayout(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const body = sheetBodyRef.current;
    if (!body) return;
    body.scrollTo({ top: 0 });
  }, [openStep]);

  useEffect(() => {
    if (openStep !== 3 || !recipeFocusComponentId) return;
    const timer = window.setTimeout(() => setRecipeFocusComponentId(null), 400);
    return () => window.clearTimeout(timer);
  }, [openStep, recipeFocusComponentId]);

  // No auto-sembrar receta: el maestro elige plantilla / base / propia.

  const wizardSteps = [
    { id: 1, label: "Datos básicos" },
    { id: 2, label: "Uso de la línea" },
    ...(maxStep > 2
      ? [
          { id: 3, label: "Fabricación" },
          ...(!isDesktopLayout ? [{ id: 4, label: "Validación" }] : []),
        ]
      : []),
  ];

  const handleUsageModeSelect = (mode: LineUsageMode) => {
    onDraftPatch(applyLineUsageMode(mode, draft));
    if (mode === "solo_cotizar" && wizardStep > 2) {
      onWizardStepChange(2);
    }
  };

  const handleNext = () => {
    onWizardStepChange(Math.min(openStep + 1, maxStep));
  };

  const handleBack = () => {
    onWizardStepChange(Math.max(openStep - 1, 1));
  };

  const step1Summary = [
    draft.nombre.trim() || "Sin nombre",
    draft.categoria
      ? LINE_TEMPLATE_CATEGORIA_LABELS[draft.categoria as CotizacionLineTemplateCategoria]
      : null,
    pricePerM2 > 0
      ? formatLineTemplatePriceLabel(unidadCobro, pricePerM2, formatCurrency)
      : "Sin precio",
    draft.isActive ? "Activa" : "Inactiva",
  ]
    .filter(Boolean)
    .join(" · ");

  const step2Summary = getUsageModeLabel(usageMode);

  const recipeStatus = draft.fabricationRecipe
    ? deriveRecipeStatus(draft.fabricationRecipe)
    : null;

  const step3Summary = draft.estimationEnabled
    ? draft.fabricationRecipe
      ? `${draft.fabricationRecipe.fabricationType.replaceAll("_", " ")} · ${RECIPE_STATUS_LABELS[recipeStatus ?? "sin_configurar"]}`
      : "Sin receta"
    : "—";

  const step4Summary = usageMode === "cubicacion_pauta"
    ? recipeStatus
      ? RECIPE_STATUS_LABELS[recipeStatus]
      : "Sin validar"
    : draft.estimationEnabled
      ? `Vidrio ${formatMeasurement(estimationSampleAreaM2, "m²")} ejemplo`
      : "—";

  const commercialStateLabel = !draft.isActive
    ? "Inactiva"
    : usageMode === "cubicacion_pauta" && recipeStatus === "validada"
      ? "Lista para cubicar"
      : usageMode === "cubicacion_pauta"
        ? "Pauta pendiente"
        : "Lista para cotizar";

  const ensureRecipe = (): FabricationRecipe => {
    if (draft.fabricationRecipe) return draft.fabricationRecipe;
    return createStructuralRecipeTemplate(
      draft.cubicationSystem === "pano_fijo"
        ? "pano_fijo"
        : draft.cubicationSystem === "puerta_abatible_1_hoja"
          ? "puerta_abatible"
          : "corredera_2_hojas"
    );
  };

  const applyRecipeToDraft = (
    recipe: FabricationRecipe,
    options?: { replacePack?: boolean; setAsDefault?: boolean }
  ) => {
    const pack = options?.replacePack
      ? upsertRecipeInPack(null, recipe, { setAsDefault: true })
      : upsertRecipeInPack(draft.fabricationRecipePack, recipe, {
          setAsDefault: options?.setAsDefault ?? !draft.fabricationRecipePack?.defaultRecipeId,
        });
    const nextStatus = deriveRecipeStatus(recipe);
    onDraftPatch({
      fabricationRecipe: recipe,
      fabricationRecipePack: pack,
      cuttingSashCount: String(recipe.sashCount),
      cubicationStatus:
        nextStatus === "validada"
          ? "validada"
          : nextStatus === "requiere_revision"
            ? "revisar_cambios"
            : nextStatus === "en_validacion"
              ? "en_calibracion"
              : nextStatus === "lista_para_validar"
                ? "lista_para_probar"
                : "sin_configurar",
    });
    setIsRecipeWorkspaceOpen(true);
  };

  const handleRecipeChange = (recipe: FabricationRecipe) => {
    applyRecipeToDraft(recipe);
  };

  const handleStartFromPath = (
    path: "plantilla" | "base" | "propia",
    templateId?: string
  ) => {
    if (path === "propia") {
      const recipe = createStructuralRecipeTemplate(
        draft.cubicationSystem === "pano_fijo"
          ? "pano_fijo"
          : draft.cubicationSystem === "puerta_abatible_1_hoja"
            ? "puerta_abatible"
            : "corredera_2_hojas"
      );
      applyRecipeToDraft(
        { ...recipe, sourceKind: "propia", variant: "propia" },
        { replacePack: true, setAsDefault: true }
      );
      return;
    }
    const id =
      templateId ||
      (path === "plantilla"
        ? matchSuggestedTemplateIdByLineName(draft.nombre) ||
          matchSuggestedTemplateIdByLineName(draft.lineSystem) ||
          "sugerida_l5000_corredera_caracol"
        : "base_pano_fijo");
    const recipe = createCommercialTemplateRecipe(id);
    if (!recipe) return;
    applyRecipeToDraft(recipe, { replacePack: true, setAsDefault: true });
  };

  const suggestedMatchId =
    matchSuggestedTemplateIdByLineName(draft.nombre) ||
    matchSuggestedTemplateIdByLineName(draft.lineSystem);

  const pendingTemplate =
    COMMERCIAL_SUGGESTED_TEMPLATES.find((entry) => entry.id === pendingTemplateId) ??
    null;

  const handleOriginChoice = (choice: "plantilla" | "base" | "propia") => {
    setOriginChoice(choice);
    setIsRecipeWorkspaceOpen(false);
    if (choice === "plantilla") {
      setPendingTemplateId((current) => current ?? suggestedMatchId ?? null);
      return;
    }
    setPendingTemplateId(null);
  };

  const handleChangeRecipeOrigin = () => {
    setIsRecipeWorkspaceOpen(false);
    setOriginChoice(null);
    setPendingTemplateId(suggestedMatchId ?? null);
    onDraftPatch({
      fabricationRecipe: null,
      fabricationRecipePack: null,
    });
  };

  const renderStepHeader = (
    stepId: number,
    title: string,
    subtitle: string,
    summary: string,
    isComplete: boolean
  ) => {
    const isOpen = openStep === stepId;
    return (
      <button
        type="button"
        className={`${s.wizardStepHeader} ${isOpen ? s.wizardStepHeaderOpen : ""} ${
          isComplete ? s.wizardStepHeaderComplete : ""
        }`}
        onClick={() => onWizardStepChange(stepId)}
        aria-expanded={isOpen}
      >
        <span className={s.wizardStepBadge}>
          {isComplete && !isOpen ? <LuCheck aria-hidden /> : stepId}
        </span>
        <span className={s.wizardStepHeaderCopy}>
          <strong>{title}</strong>
          <span>{isOpen ? subtitle : summary}</span>
        </span>
        {isOpen ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}
      </button>
    );
  };

  if (isDesktopLayout === null) {
    return (
      <div className={s.wizardLoadingOverlay} role="status" aria-live="polite">
        <div className={s.wizardLoading}>Preparando editor...</div>
      </div>
    );
  }

  if (!isDesktopLayout) {
    return (
      <LineTemplateMobileEditor
        sheetMode={sheetMode}
        step={openStep}
        onStepChange={onWizardStepChange}
        draft={draft}
        onDraftChange={onDraftChange}
        onDraftPatch={onDraftPatch}
        isGlassDraft={isGlassDraft}
        saveDisabled={saveDisabled}
        isSaving={isSaving}
        onSave={onSave}
        onClose={onClose}
        technicalAdminHref={technicalAdminHref}
      />
    );
  }

  return (
    <div className={s.overlay} role="presentation" onClick={onClose}>
      <section
        className={`${s.sheet} ${s.sheetWizard}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="linea-precio-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={s.sheetHandle} />

        <header className={s.sheetHeader}>
          <div className={s.wizardHeaderTop}>
            <div className={s.sheetHeaderCopy}>
              <h2 id="linea-precio-title">{sheetTitle}</h2>
              <p>
                {openStep === 1
                  ? "Paso 1: escribe el nombre y el precio. Con eso ya puedes guardar."
                  : openStep === 2
                    ? "Paso 2: elige si solo cotizas, o también estimas materiales."
                    : openStep === 3
                      ? "Paso 3: define cómo fabricas esta línea con componentes reales."
                      : "Paso 4: valida con un trabajo real y confirma la receta."}
              </p>
            </div>
            <button type="button" className={s.sheetClose} onClick={onClose} aria-label="Cerrar">
              <LuX aria-hidden />
            </button>
          </div>

          {openStep > 1 ? (
            <div className={s.wizardCompactSummary} aria-label="Resumen de la línea">
              <span>
                <strong>Precio</strong>
                {pricePerM2 > 0
                  ? formatLineTemplatePriceLabel(unidadCobro, pricePerM2, formatCurrency)
                  : "Pendiente"}
              </span>
              <span>
                <strong>Uso</strong>
                {getUsageModeLabel(usageMode)}
              </span>
              <span>
                <strong>Técnico</strong>
                {draft.estimationEnabled
                  ? RECIPE_STATUS_LABELS[recipeStatus ?? "sin_configurar"]
                  : "Sin configurar"}
              </span>
              <span>
                <strong>Estado</strong>
                {commercialStateLabel}
              </span>
            </div>
          ) : null}

          <nav className={s.wizardProgress} aria-label="Progreso del asistente">
            {wizardSteps.map((step) => {
              const isActive = openStep === step.id;
              const isDone = openStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`${s.wizardProgressItem} ${
                    isActive ? s.wizardProgressItemActive : ""
                  } ${isDone ? s.wizardProgressItemDone : ""}`}
                  onClick={() => onWizardStepChange(step.id)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className={s.wizardProgressDot}>
                    {isDone ? <LuCheck aria-hidden /> : step.id}
                  </span>
                  <span className={s.wizardProgressLabel}>{step.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <div className={`${s.sheetBody} ${s.wizardBodyWorkspace}`} ref={sheetBodyRef}>
          <article
            className={`${s.wizardStep} ${openStep === 1 ? s.wizardStepOpen : ""} ${
              openStep !== 1 ? s.wizardStepCollapsed : ""
            }`}
          >
            {openStep !== 1
              ? renderStepHeader(
                  1,
                  "Datos básicos",
                  "Nombre, categoría y precio de venta",
                  step1Summary,
                  openStep > 1
                )
              : null}
            {openStep === 1 ? (
              <div className={`${s.wizardStepBody} ${s.wizardStepBodyWide}`}>
                <div className={s.wizardStep1Surface}>
                <div className={s.wizardStep1Layout}>
                  <section className={s.wizardStep1Section}>
                    <div className={s.wizardFieldGroupHead}>
                      <LuTag aria-hidden />
                      <div>
                        <strong>Datos de la línea</strong>
                        <span>Así aparecerá al cotizar</span>
                      </div>
                    </div>

                    <div className={s.formSectionGrid}>
                      <label className={`${s.fieldBlock} ${s.fieldSpan2}`}>
                        <span className={s.fieldLabel}>Nombre comercial</span>
                        <input
                          className={s.textInput}
                          value={draft.nombre}
                          onChange={(event) => onDraftChange("nombre", event.target.value)}
                          placeholder="Ej: Serie 25 negra"
                        />
                      </label>

                      <label className={s.fieldBlock}>
                        <span className={s.fieldLabel}>Categoría</span>
                        <select
                          className={s.selectInput}
                          value={draft.categoria}
                          onChange={(event) =>
                            onDraftChange(
                              "categoria",
                              event.target.value as CotizacionLineTemplateCategoria
                            )
                          }
                        >
                          {Object.entries(LINE_TEMPLATE_CATEGORIA_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label className={s.fieldBlock}>
                        <span className={s.fieldLabel}>Unidad de cobro</span>
                        <select
                          className={s.selectInput}
                          value={draft.unidadCobro}
                          onChange={(event) =>
                            onDraftChange(
                              "unidadCobro",
                              event.target.value as CotizacionLineTemplateUnidadCobro
                            )
                          }
                        >
                          {Object.entries(LINE_TEMPLATE_UNIDAD_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      {!isGlassDraft ? (
                        <label className={`${s.fieldBlock} ${s.fieldSpan2}`}>
                          <span className={s.fieldLabel}>Material de perfil</span>
                          <div className={s.materialSelect}>
                            {(["Aluminio", "PVC"] as const).map((option) => (
                              <button
                                key={option}
                                type="button"
                                className={`${s.materialSelectButton} ${
                                  draft.material === option
                                    ? s.materialSelectButtonActive
                                    : ""
                                }`}
                                data-material={option}
                                aria-pressed={draft.material === option}
                                onClick={() =>
                                  onDraftChange(
                                    "material",
                                    option as CotizacionLineTemplateMaterial
                                  )
                                }
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </label>
                      ) : null}
                    </div>
                  </section>

                  <section className={s.wizardStep1Section}>
                    <div className={s.wizardFieldGroupHead}>
                      <LuBadgeDollarSign aria-hidden />
                      <div>
                        <strong>Precio y rentabilidad</strong>
                        <span>
                          Define cuánto cobrarás y, opcionalmente, tu costo y mínimo.
                        </span>
                      </div>
                    </div>

                      <div className={`${s.pricingFieldsStack} ${s.pricingFieldsWide}`}>
                        <label
                          className={`${s.fieldBlock} ${s.fieldHighlight} ${s.pricingSaleField}`}
                        >
                          <span className={s.fieldLabel}>
                            {pricingCopy.saleLabel}
                            {pricingCopy.unitSuffix ? (
                              <em className={s.pricingUnitMark}>
                                {pricingCopy.unitSuffix}
                              </em>
                            ) : null}
                          </span>
                          <span className={s.pricingFieldHelp}>{pricingCopy.saleHelp}</span>
                          <div className={s.moneyWrap}>
                            <span className={s.moneyPrefix}>$</span>
                            <input
                              className={`${s.moneyInput} ${s.moneyInputPrimary} ${
                                pricingCopy.unitSuffix ? s.moneyInputWithSuffix : ""
                              }`}
                              inputMode="numeric"
                              value={formatMoneyDigits(draft.precioM2Sugerido)}
                              onChange={(event) =>
                                onDraftChange(
                                  "precioM2Sugerido",
                                  getDigits(event.target.value)
                                )
                              }
                              placeholder="Ej: 65.000"
                              aria-required="true"
                            />
                            {pricingCopy.unitSuffix ? (
                              <span className={s.moneySuffix}>
                                {pricingCopy.unitSuffix}
                              </span>
                            ) : null}
                          </div>
                        </label>

                        <div className={s.pricingSecondaryRow}>
                          <div className={`${s.fieldBlock} ${s.pricingCostField}`}>
                            <label className={s.pricingCostLabelWrap}>
                              <span className={s.fieldLabel}>
                                {pricingCopy.costLabel}
                                <em className={s.optionalMark}>Opcional</em>
                                {pricingCopy.unitSuffix ? (
                                  <em className={s.pricingUnitMark}>
                                    {pricingCopy.unitSuffix}
                                  </em>
                                ) : null}
                              </span>
                              <span className={s.pricingFieldHelp}>
                                Costo aproximado. No se muestra al cliente.
                              </span>
                              <div className={s.moneyWrap}>
                                <span className={s.moneyPrefix}>$</span>
                                <input
                                  className={`${s.moneyInput} ${
                                    pricingCopy.unitSuffix ? s.moneyInputWithSuffix : ""
                                  }`}
                                  inputMode="numeric"
                                  value={formatMoneyDigits(draft.costoBase)}
                                  onChange={(event) =>
                                    onDraftChange(
                                      "costoBase",
                                      getDigits(event.target.value)
                                    )
                                  }
                                  placeholder="Ej: 40.000"
                                />
                                {pricingCopy.unitSuffix ? (
                                  <span className={s.moneySuffix}>
                                    {pricingCopy.unitSuffix}
                                  </span>
                                ) : null}
                              </div>
                            </label>
                            {!draft.costoBase.trim() ? (
                              <div className={s.pricingCostEmptyHint} aria-live="polite">
                                <p>Puedes cotizar sin este dato.</p>
                              </div>
                            ) : null}
                          </div>

                          <label className={`${s.fieldBlock} ${s.pricingCostField}`}>
                            <span className={s.fieldLabel}>
                              Mínimo cobrable
                              <em className={s.optionalMark}>Opcional</em>
                            </span>
                            <span className={s.pricingFieldHelp}>
                              Si el cálculo queda bajo, se cobra este mínimo.
                            </span>
                            <div className={s.moneyWrap}>
                              <span className={s.moneyPrefix}>$</span>
                              <input
                                className={s.moneyInput}
                                inputMode="numeric"
                                value={formatMoneyDigits(draft.minimoCobrable)}
                                onChange={(event) =>
                                  onDraftChange(
                                    "minimoCobrable",
                                    getDigits(event.target.value)
                                  )
                                }
                                placeholder="Ej: 95.000"
                              />
                            </div>
                          </label>
                        </div>
                      </div>
                  </section>
                </div>

                <div className={`${s.activeCard} ${s.activeCardInline} ${s.wizardStep1ActiveRow}`}>
                  <div className={s.activeCardCopy}>
                    <strong>Usar en cotizaciones</strong>
                    <span>Si está apagada, no aparece al cotizar.</span>
                  </div>
                  <button
                    type="button"
                    className={`${s.switch} ${draft.isActive ? s.switchOn : ""}`}
                    onClick={() => onDraftChange("isActive", !draft.isActive)}
                    aria-pressed={draft.isActive}
                    aria-label="Cambiar estado de la línea"
                  >
                    <span className={s.switchThumb} />
                  </button>
                </div>
                </div>

                <button
                  ref={moreDetailsButtonRef}
                  type="button"
                  className={`${s.moreDetailsButton} ${
                    showAdvancedDetails ? s.moreDetailsButtonOpen : ""
                  }`}
                  onClick={() => {
                    const body = sheetBodyRef.current;
                    const previousScrollTop = body?.scrollTop ?? 0;
                    onShowAdvancedDetailsChange(!showAdvancedDetails);
                    window.requestAnimationFrame(() => {
                      if (!body) return;
                      body.scrollTop = previousScrollTop;
                      moreDetailsButtonRef.current?.scrollIntoView({
                        block: "nearest",
                        inline: "nearest",
                      });
                    });
                  }}
                  aria-expanded={showAdvancedDetails}
                >
                  <span className={s.moreDetailsButtonCopy}>
                    <strong>
                      {showAdvancedDetails ? "Ocultar detalles" : "Agregar más detalles"}
                    </strong>
                    <span>
                      {showAdvancedDetails
                        ? "Redondeo, merma, proveedor y más"
                        : buildAdvancedDetailsSummary(draft) ||
                          "Redondeo, merma, margen, proveedor…"}
                    </span>
                  </span>
                  {showAdvancedDetails ? (
                    <LuChevronUp aria-hidden />
                  ) : (
                    <LuChevronDown aria-hidden />
                  )}
                </button>

                {showAdvancedDetails ? (
                  <div className={s.advancedDetails}>
                    <section
                      className={`${s.formSection} ${s.formSectionPrecio}`}
                      aria-labelledby="linea-precio-avanzado-title"
                    >
                      <div className={s.formSectionHead}>
                        <span className={s.formSectionIcon} aria-hidden>
                          <LuSlidersHorizontal />
                        </span>
                        <div className={s.formSectionHeadCopy}>
                          <h3 id="linea-precio-avanzado-title">Reglas de precio</h3>
                          <p>Redondeo y márgenes</p>
                        </div>
                      </div>

                      <div className={s.formSectionGrid}>
                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>Redondeo</span>
                          <select
                            className={s.selectInput}
                            value={draft.redondeoPrecio}
                            onChange={(event) =>
                              onDraftChange("redondeoPrecio", event.target.value)
                            }
                          >
                            {ROUNDING_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>
                            Merma % <em className={s.optionalMark}>opcional</em>
                          </span>
                          <input
                            className={s.textInput}
                            inputMode="decimal"
                            value={draft.mermaPct}
                            onChange={(event) => onDraftChange("mermaPct", event.target.value)}
                            placeholder="5"
                          />
                        </label>

                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>
                            Margen objetivo % <em className={s.optionalMark}>opcional</em>
                          </span>
                          <input
                            className={s.textInput}
                            inputMode="decimal"
                            value={draft.margenObjetivoPct}
                            onChange={(event) =>
                              onDraftChange("margenObjetivoPct", event.target.value)
                            }
                            placeholder="35"
                          />
                        </label>
                      </div>
                    </section>

                    <section
                      className={`${s.formSection} ${s.formSectionProveedor}`}
                      aria-labelledby="linea-proveedor-title"
                    >
                      <div className={s.formSectionHead}>
                        <span className={s.formSectionIcon} aria-hidden>
                          <LuTruck />
                        </span>
                        <div className={s.formSectionHeadCopy}>
                          <h3 id="linea-proveedor-title">Proveedor y vigencia</h3>
                          <p>Referencia comercial</p>
                        </div>
                      </div>

                      <div className={s.formSectionGrid}>
                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>
                            Proveedor <em className={s.optionalMark}>opcional</em>
                          </span>
                          <input
                            className={s.textInput}
                            value={draft.proveedor}
                            onChange={(event) => onDraftChange("proveedor", event.target.value)}
                            placeholder="Ej: Alar"
                          />
                        </label>

                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>
                            Sistema <em className={s.optionalMark}>opcional</em>
                          </span>
                          <input
                            className={s.textInput}
                            list="line-system-options"
                            value={draft.lineSystem}
                            onChange={(event) => onDraftChange("lineSystem", event.target.value)}
                            placeholder="Ej: Corredera"
                          />
                          <datalist id="line-system-options">
                            {LINE_SYSTEM_OPTIONS.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                        </label>

                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>Vigencia desde</span>
                          <input
                            className={s.textInput}
                            type="date"
                            value={draft.vigenciaDesde}
                            onChange={(event) =>
                              onDraftChange("vigenciaDesde", event.target.value)
                            }
                          />
                        </label>

                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>Vigencia hasta</span>
                          <input
                            className={s.textInput}
                            type="date"
                            value={draft.vigenciaHasta}
                            onChange={(event) =>
                              onDraftChange("vigenciaHasta", event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </section>

                    <section
                      className={`${s.formSection} ${s.formSectionUso}`}
                      aria-labelledby="linea-uso-title"
                    >
                      <div className={s.formSectionHead}>
                        <span className={s.formSectionIcon} aria-hidden>
                          <LuSlidersHorizontal />
                        </span>
                        <div className={s.formSectionHeadCopy}>
                          <h3 id="linea-uso-title">
                            {isGlassDraft ? "Detalle del cristal" : "Uso en cotización"}
                          </h3>
                          <p>
                            {isGlassDraft
                              ? "Espesor y terminación opcionales"
                              : "Preferencia al armar el presupuesto"}
                          </p>
                        </div>
                      </div>

                      <div className={s.formSectionGrid}>
                        {isGlassDraft ? (
                          <>
                            <label className={s.fieldBlock}>
                              <span className={s.fieldLabel}>
                                Espesor <em className={s.optionalMark}>opcional</em>
                              </span>
                              <input
                                className={s.textInput}
                                value={draft.espesor}
                                onChange={(event) =>
                                  onDraftChange("espesor", event.target.value)
                                }
                                placeholder="Ej: 10 mm, 5+5, 4-10-4"
                              />
                            </label>

                            <label className={s.fieldBlock}>
                              <span className={s.fieldLabel}>
                                Terminación <em className={s.optionalMark}>opcional</em>
                              </span>
                              <input
                                className={s.textInput}
                                value={draft.terminacion}
                                onChange={(event) =>
                                  onDraftChange("terminacion", event.target.value)
                                }
                                placeholder="Ej: templado, laminado, espejo"
                              />
                            </label>
                          </>
                        ) : (
                          <label className={`${s.fieldBlock} ${s.fieldSpan2}`}>
                            <span className={s.fieldLabel}>Vidrio usado normalmente</span>
                            <select
                              className={s.selectInput}
                              value={draft.vidrioPrincipalRecomendado}
                              onChange={(event) =>
                                onDraftChange("vidrioPrincipalRecomendado", event.target.value)
                              }
                            >
                              <option value="">Sin sugerencia fija</option>
                              {GLASS_SELECT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </section>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className={s.wizardStepSummary}>{step1Summary}</p>
            )}
          </article>

          <article
            className={`${s.wizardStep} ${openStep === 2 ? s.wizardStepOpen : ""} ${
              openStep !== 2 ? s.wizardStepCollapsed : ""
            }`}
          >
            {openStep !== 2
              ? renderStepHeader(
                  2,
                  "Uso de la línea",
                  "Elige cómo quieres usar esta línea al cotizar",
                  step2Summary,
                  openStep > 2
                )
              : null}
            {openStep === 2 ? (
              <div className={s.wizardStepBody}>
                <div className={s.wizardUsageGrid}>
                  {USAGE_MODE_OPTIONS.map((option) => {
                    const disabled =
                      isGlassDraft && option.value === "cubicacion_pauta";
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`${s.wizardUsageCard} ${
                          usageMode === option.value ? s.wizardUsageCardActive : ""
                        }`}
                        onClick={() => !disabled && handleUsageModeSelect(option.value)}
                        aria-pressed={usageMode === option.value}
                        disabled={disabled}
                      >
                        <strong>{option.title}</strong>
                        <span>{option.description}</span>
                      </button>
                    );
                  })}
                </div>
                {isGlassDraft ? (
                  <p className={s.fieldHint}>
                    El cristal no usa pauta de corte de perfiles. Puedes activar estimación de
                    vidrio en los pasos siguientes.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className={s.wizardStepSummary}>{step2Summary}</p>
            )}
          </article>

          {maxStep > 2 ? (
            <article
              className={`${s.wizardStep} ${openStep === 3 ? s.wizardStepOpen : ""} ${
                openStep !== 3 ? s.wizardStepCollapsed : ""
              }`}
            >
              {openStep !== 3
                ? renderStepHeader(
                    3,
                    "Fabricación",
                    isDesktopLayout
                      ? "Guarda la línea y abre su receta técnica"
                      : "Elige origen, revisa componentes y edita solo lo necesario",
                    step3Summary,
                    openStep > 3
                  )
                : null}
              {openStep === 3 ? (
                <div className={`${s.wizardStepBody} ${s.wizardStepBodyWorkspace}`}>
                  {isDesktopLayout ? (
                    <section className={s.desktopTechnicalLaunch}>
                      <div>
                        <h3>La receta se configura en un espacio técnico separado.</h3>
                        <p>
                          Primero guardamos esta línea comercial. Luego defines perfiles,
                          vidrios y accesorios; pruebas una medida real y validas la versión
                          para generar despiece interno.
                        </p>
                      </div>
                      <ol className={s.desktopTechnicalPath}>
                        <li>
                          <span>1</span>
                          <div>
                            <strong>Guardar la línea</strong>
                            <small>El precio queda disponible para cotizar desde ahora.</small>
                          </div>
                        </li>
                        <li>
                          <span>2</span>
                          <div>
                            <strong>Configurar receta</strong>
                            <small>Elige una base, una sugerida o crea una receta propia.</small>
                          </div>
                        </li>
                        <li>
                          <span>3</span>
                          <div>
                            <strong>Probar y validar</strong>
                            <small>Solo una receta validada se usa para el despiece interno.</small>
                          </div>
                        </li>
                      </ol>
                      {technicalAdminHref ? (
                        <Link href={technicalAdminHref} className={s.desktopTechnicalLink}>
                          Abrir administración técnica
                        </Link>
                      ) : (
                        <p className={s.desktopTechnicalNote}>
                          El botón final guardará esta línea y abrirá su receta automáticamente.
                        </p>
                      )}
                    </section>
                  ) : null}
                  <div className={s.technicalRecipeNotice}>
                    <div>
                      <span>Recetas versionadas</span>
                      <strong>La línea comercial y la receta se guardan por separado.</strong>
                      <p>
                        Guarda primero esta línea. Después administra perfiles, vidrios,
                        accesorios y reglas controladas en el módulo técnico.
                      </p>
                    </div>
                    {technicalAdminHref ? (
                      <Link href={technicalAdminHref} className={s.primaryButton}>
                        Administrar recetas
                      </Link>
                    ) : (
                      <small>La opción Administrar aparecerá en la tarjeta de la línea.</small>
                    )}
                  </div>
                  <fieldset
                    className={`${s.legacyRecipeCompatibility} ${s.legacyTechnicalWorkspace}`}
                    disabled
                  >
                    <legend>Configuración anterior, solo lectura</legend>
                  {!isGlassDraft ? (
                    draft.fabricationRecipe && isRecipeWorkspaceOpen ? (
                      <>
                        {(draft.fabricationRecipePack?.recipes.length ?? 0) > 1 ? (
                          <label className={`${s.fieldBlock} ${s.recipeVariantPicker}`}>
                            <span className={s.fieldLabel}>Variante activa de esta línea</span>
                            <select
                              className={s.selectInput}
                              value={draft.fabricationRecipe.id}
                              onChange={(event) => {
                                const next = draft.fabricationRecipePack?.recipes.find(
                                  (entry) => entry.id === event.target.value
                                );
                                if (next) applyRecipeToDraft(next, { setAsDefault: true });
                              }}
                            >
                              {draft.fabricationRecipePack?.recipes.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.variant || entry.id}
                                  {!entry.isActive ? " (inactiva)" : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <FabricationRecipeEditor
                          mode="configure"
                          recipe={draft.fabricationRecipe}
                          vanoWidthMm={calibrationVanoWidthMm}
                          vanoHeightMm={calibrationVanoHeightMm}
                          onRecipeChange={handleRecipeChange}
                          onVanoWidthChange={onCalibrationVanoWidthMmChange}
                          onVanoHeightChange={onCalibrationVanoHeightMmChange}
                          onVariantCreated={(variant) =>
                            applyRecipeToDraft(variant, { setAsDefault: true })
                          }
                          focusComponentId={recipeFocusComponentId}
                          onChangeRecipeOrigin={handleChangeRecipeOrigin}
                        />
                      </>
                    ) : (
                      <div className={s.recipeOriginPicker} aria-label="Origen de la receta">
                        <header className={s.recipeOriginHeader}>
                          <span className={s.recipeOriginEyebrow}>
                            Pauta de corte interna
                          </span>
                          <h3 className={s.recipeOriginTitle}>¿Cómo quieres comenzar?</h3>
                          <p>
                            Primero elige el punto de partida. Después Ventora muestra la
                            pauta para revisar perfiles, fórmulas, códigos y cortes con
                            medidas reales.
                          </p>
                        </header>

                        {draft.fabricationRecipe ? (
                          <section className={s.recipeCurrentCard} aria-label="Pauta actual">
                            <div className={s.recipeCurrentCopy}>
                              <span>Pauta actual</span>
                              <strong>
                                {draft.fabricationRecipe.variant || "Receta en borrador"}
                              </strong>
                              <p>
                                {RECIPE_STATUS_LABELS[recipeStatus ?? "sin_configurar"]} ·{" "}
                                {draft.fabricationRecipe.components.length} componentes ·{" "}
                                {draft.fabricationRecipe.sourceKind === "plantilla_sugerida"
                                  ? "plantilla sugerida"
                                  : draft.fabricationRecipe.sourceKind === "base_tipologica"
                                    ? "base tipológica"
                                    : "receta propia"}
                              </p>
                            </div>
                            <button
                              type="button"
                              className={s.primaryButton}
                              onClick={() => setIsRecipeWorkspaceOpen(true)}
                            >
                              Revisar pauta
                            </button>
                          </section>
                        ) : null}

                        <div
                          className={s.recipeOriginChoiceGrid}
                          role="radiogroup"
                          aria-label="Cómo comenzar la receta"
                        >
                          {(
                            [
                              {
                                id: "plantilla" as const,
                                title: "Usar plantilla sugerida",
                                description:
                                  "Empieza con una receta inicial de Ventora.",
                              },
                              {
                                id: "base" as const,
                                title: "Usar base tipológica",
                                description:
                                  "Obtén la estructura y completa los descuentos de tu taller.",
                              },
                              {
                                id: "propia" as const,
                                title: "Crear desde cero",
                                description:
                                  "Configura manualmente todos los componentes.",
                              },
                            ] as const
                          ).map((option) => {
                            const selected = originChoice === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                className={`${s.recipeOriginChoiceCard} ${
                                  selected ? s.recipeOriginChoiceCardSelected : ""
                                }`}
                                onClick={() => handleOriginChoice(option.id)}
                              >
                                <span
                                  className={`${s.recipeOriginRadio} ${
                                    selected ? s.recipeOriginRadioChecked : ""
                                  }`}
                                  aria-hidden
                                />
                                <span className={s.recipeOriginChoiceCopy}>
                                  <strong>{option.title}</strong>
                                  <span>{option.description}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {originChoice === "plantilla" ? (
                          <section
                            className={s.recipeOriginDetail}
                            aria-label="Plantillas sugeridas"
                          >
                            <div className={s.recipeOriginTemplateGrid}>
                              {COMMERCIAL_SUGGESTED_TEMPLATES.map((template) => {
                                const selected = pendingTemplateId === template.id;
                                const recommended = suggestedMatchId === template.id;
                                return (
                                  <button
                                    key={template.id}
                                    type="button"
                                    className={`${s.recipeOriginTemplateCard} ${
                                      selected ? s.recipeOriginTemplateCardSelected : ""
                                    } ${
                                      recommended && !selected
                                        ? s.recipeOriginTemplateCardRecommended
                                        : ""
                                    }`}
                                    onClick={() => setPendingTemplateId(template.id)}
                                    aria-pressed={selected}
                                  >
                                    <strong>
                                      {template.lineHint || template.title} — Corredera · 2
                                      hojas · Caracol
                                    </strong>
                                    {recommended ? (
                                      <em>Sugerida por el nombre de tu línea</em>
                                    ) : (
                                      <em>Plantilla inicial</em>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {pendingTemplate ? (
                              <div className={s.recipeOriginConfirm}>
                                <div className={s.recipeOriginConfirmCopy}>
                                  <strong>
                                    {pendingTemplate.lineHint || pendingTemplate.title}{" "}
                                    seleccionada
                                  </strong>
                                  <span>Plantilla inicial pendiente de validación</span>
                                </div>
                                <button
                                  type="button"
                                  className={s.primaryButton}
                                  onClick={() =>
                                    handleStartFromPath("plantilla", pendingTemplate.id)
                                  }
                                >
                                  Continuar con esta plantilla
                                </button>
                              </div>
                            ) : (
                              <p className={s.fieldHint}>
                                Elige L5000, L20 o L25 para continuar.
                              </p>
                            )}
                          </section>
                        ) : null}

                        {originChoice === "base" ? (
                          <section
                            className={s.recipeOriginDetail}
                            aria-label="Bases tipológicas"
                          >
                            <div className={s.recipeOriginChipRow}>
                              {COMMERCIAL_PENDING_BASES.map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  className={s.recipeOriginChip}
                                  onClick={() =>
                                    handleStartFromPath("base", template.id)
                                  }
                                >
                                  {template.title}
                                </button>
                              ))}
                            </div>
                          </section>
                        ) : null}

                        {originChoice === "propia" ? (
                          <section
                            className={s.recipeOriginDetail}
                            aria-label="Crear receta desde cero"
                          >
                            <button
                              type="button"
                              className={s.primaryButton}
                              onClick={() => handleStartFromPath("propia")}
                            >
                              Iniciar receta manual
                            </button>
                          </section>
                        ) : null}
                      </div>
                    )
                  ) : (
                    <p className={s.fieldHint}>
                      Para cristal solo se estima vidrio. No se configuran perfiles de aluminio.
                    </p>
                  )}
                  </fieldset>
                </div>
              ) : (
                <p className={s.wizardStepSummary}>{step3Summary}</p>
              )}
            </article>
          ) : null}

          {!isDesktopLayout && maxStep > 2 ? (
            <article
              className={`${s.wizardStep} ${openStep === 4 ? s.wizardStepOpen : ""} ${
                openStep !== 4 ? s.wizardStepCollapsed : ""
              }`}
            >
              {openStep !== 4
                ? renderStepHeader(
                    4,
                    "Validación",
                    "Revisa estado, prueba con un vano real y valida para tu taller",
                    step4Summary,
                    false
                  )
                : null}
              {openStep === 4 ? (
                <div
                  className={`${s.wizardStepBody} ${s.wizardStepBodyTall} ${s.wizardStepBodyWorkspace}`}
                >
                  <div className={s.technicalRecipeNotice}>
                    <div>
                      <span>Laboratorio técnico</span>
                      <strong>Las pruebas y la validación viven en la receta versionada.</strong>
                      <p>
                        Una versión solo se habilita para cotizar cuando sus casos
                        obligatorios coinciden con un trabajo real.
                      </p>
                    </div>
                    {technicalAdminHref ? (
                      <Link href={technicalAdminHref} className={s.primaryButton}>
                        Abrir laboratorio
                      </Link>
                    ) : (
                      <small>Guarda la línea para abrir su laboratorio.</small>
                    )}
                  </div>
                  <fieldset className={s.legacyRecipeCompatibility} disabled>
                    <legend>Validación anterior, solo lectura</legend>
                  {!isGlassDraft ? (
                    <FabricationRecipeEditor
                      mode="validate"
                      recipe={ensureRecipe()}
                      vanoWidthMm={calibrationVanoWidthMm}
                      vanoHeightMm={calibrationVanoHeightMm}
                      onRecipeChange={handleRecipeChange}
                      onVanoWidthChange={onCalibrationVanoWidthMmChange}
                      onVanoHeightChange={onCalibrationVanoHeightMmChange}
                      onRequestConfigureComponent={(componentId) => {
                        setRecipeFocusComponentId(componentId);
                        setIsRecipeWorkspaceOpen(true);
                        onWizardStepChange(3);
                      }}
                    />
                  ) : (
                    <p className={s.fieldHint}>
                      El cristal no usa pauta de perfiles. Puedes guardar la línea solo con precio.
                    </p>
                  )}
                  </fieldset>
                </div>
              ) : (
                <p className={s.wizardStepSummary}>{step4Summary}</p>
              )}
            </article>
          ) : null}
        </div>

        <footer className={`${s.sheetFooter} ${s.wizardFooter}`}>
          <button
            type="button"
            className={s.wizardSecondaryButton}
            onClick={handleBack}
            disabled={openStep <= 1}
          >
            Atrás
          </button>
          <div className={s.wizardFooterActions}>
            {openStep < maxStep ? (
              <>
                {openStep === 1 &&
                isDesktopLayout &&
                !isGlassDraft &&
                usageMode === "cubicacion_pauta" &&
                sheetMode === "new" &&
                onSaveAndConfigure ? (
                  <button
                    type="button"
                    className={s.wizardTertiaryButton}
                    onClick={onSaveAndConfigure}
                    disabled={saveDisabled || isSaving}
                  >
                    Crear y configurar receta
                  </button>
                ) : null}
                {openStep > 1 ? (
                  <button
                    type="button"
                    className={s.wizardSecondaryButton}
                    onClick={onSave}
                    disabled={saveDisabled || isSaving}
                  >
                    {sheetMode === "edit" ? "Guardar línea" : "Crear línea"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={s.primaryButton}
                  onClick={handleNext}
                >
                  Siguiente
                </button>
              </>
            ) : (
              <button
                type="button"
                className={s.primaryButton}
                onClick={
                  isDesktopLayout &&
                  !isGlassDraft &&
                  usageMode === "cubicacion_pauta" &&
                  sheetMode === "new" &&
                  onSaveAndConfigure
                    ? onSaveAndConfigure
                    : onSave
                }
                disabled={saveDisabled || isSaving}
              >
                {isSaving
                  ? "Guardando..."
                  : isGlassDraft
                    ? "Guardar producto"
                    : isDesktopLayout &&
                        usageMode === "cubicacion_pauta" &&
                        sheetMode === "new"
                      ? "Crear y configurar receta"
                      : sheetMode === "edit"
                        ? "Guardar línea"
                        : "Crear línea"}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
