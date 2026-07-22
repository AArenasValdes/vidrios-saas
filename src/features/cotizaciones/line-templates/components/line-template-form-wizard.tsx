"use client";

import { useEffect, useRef } from "react";
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
  type FabricationRecipe,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { createStructuralRecipeTemplate } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-templates";
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
  /** Receta de fabricación V1 (componentes reales). Null = aún no iniciada. */
  fabricationRecipe: FabricationRecipe | null;
};

export type LineUsageMode = "solo_cotizar" | "con_estimacion" | "cubicacion_pauta";

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
    description: "Usa una receta de fabricación configurada y validada por el taller.",
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
  if (draft.minimoCobrable) parts.push("Mínimo");
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
    fabricationRecipe:
      draft.fabricationRecipe ??
      createStructuralRecipeTemplate(
        draft.cubicationSystem === "pano_fijo"
          ? "pano_fijo"
          : draft.cubicationSystem === "puerta_abatible_1_hoja"
            ? "puerta_abatible"
            : "corredera_2_hojas"
      ),
  };
}

function getWizardMaxStep(usageMode: LineUsageMode) {
  return usageMode === "solo_cotizar" ? 2 : 4;
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
  onClose,
  pricePerM2,
  unidadCobro,
  calibrationVanoWidthMm,
  calibrationVanoHeightMm,
  onCalibrationVanoWidthMmChange,
  onCalibrationVanoHeightMmChange,
  estimationSampleAreaM2,
}: Props) {
  const sheetBodyRef = useRef<HTMLDivElement | null>(null);
  const moreDetailsButtonRef = useRef<HTMLButtonElement | null>(null);

  const usageMode = resolveLineUsageMode(draft);
  const maxStep = getWizardMaxStep(usageMode);
  const openStep = Math.min(wizardStep, maxStep);

  useEffect(() => {
    const body = sheetBodyRef.current;
    if (!body) return;
    body.scrollTo({ top: 0 });
  }, [openStep]);

  useEffect(() => {
    if (openStep < 3 || isGlassDraft || draft.fabricationRecipe) return;
    if (!draft.estimationEnabled) return;
    const seeded = createStructuralRecipeTemplate(
      draft.cubicationSystem === "pano_fijo"
        ? "pano_fijo"
        : draft.cubicationSystem === "puerta_abatible_1_hoja"
          ? "puerta_abatible"
          : "corredera_2_hojas"
    );
    onDraftPatch({ fabricationRecipe: seeded });
  }, [
    openStep,
    isGlassDraft,
    draft.fabricationRecipe,
    draft.estimationEnabled,
    draft.cubicationSystem,
    onDraftPatch,
  ]);

  const wizardSteps = [
    { id: 1, label: "Datos básicos" },
    { id: 2, label: "Uso de la línea" },
    ...(maxStep > 2
      ? [
          { id: 3, label: "Fabricación" },
          { id: 4, label: "Validación" },
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

  const handleRecipeChange = (recipe: FabricationRecipe) => {
    onDraftPatch({
      fabricationRecipe: recipe,
      cuttingSashCount: String(recipe.sashCount),
      cubicationStatus:
        recipe.status === "validada"
          ? "validada"
          : recipe.status === "requiere_revision"
            ? "revisar_cambios"
            : recipe.status === "en_validacion"
              ? "en_calibracion"
              : recipe.status === "lista_para_validar"
                ? "lista_para_probar"
                : "sin_configurar",
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

        <div className={s.sheetBody} ref={sheetBodyRef}>
          <article
            className={`${s.wizardStep} ${openStep === 1 ? s.wizardStepOpen : ""} ${
              openStep !== 1 ? s.wizardStepCollapsed : ""
            }`}
          >
            {renderStepHeader(
              1,
              "Datos básicos",
              "Nombre, categoría y precio de venta",
              step1Summary,
              openStep > 1
            )}
            {openStep === 1 ? (
              <div className={s.wizardStepBody}>
                <div className={s.wizardFieldGroup}>
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
                        {Object.entries(LINE_TEMPLATE_CATEGORIA_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
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
                        {Object.entries(LINE_TEMPLATE_UNIDAD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
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
                                draft.material === option ? s.materialSelectButtonActive : ""
                              }`}
                              data-material={option}
                              aria-pressed={draft.material === option}
                              onClick={() =>
                                onDraftChange("material", option as CotizacionLineTemplateMaterial)
                              }
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </label>
                    ) : null}
                  </div>
                </div>

                <div className={s.wizardFieldGroup}>
                  <div className={s.wizardFieldGroupHead}>
                    <LuBadgeDollarSign aria-hidden />
                    <div>
                      <strong>Precio de venta</strong>
                      <span>Lo que cobras al cliente</span>
                    </div>
                  </div>

                  <div className={s.formSectionGrid}>
                    <label className={`${s.fieldBlock} ${s.fieldHighlight}`}>
                      <span className={s.fieldLabel}>
                        Precio · {LINE_TEMPLATE_UNIDAD_LABELS[unidadCobro]}
                      </span>
                      <div className={s.moneyWrap}>
                        <span className={s.moneyPrefix}>$</span>
                        <input
                          className={`${s.moneyInput} ${s.moneyInputPrimary}`}
                          inputMode="numeric"
                          value={formatMoneyDigits(draft.precioM2Sugerido)}
                          onChange={(event) =>
                            onDraftChange("precioM2Sugerido", getDigits(event.target.value))
                          }
                          placeholder="150.000"
                        />
                      </div>
                    </label>

                    <label className={s.fieldBlock}>
                      <span className={s.fieldLabel}>
                        Costo <em className={s.optionalMark}>opcional</em>
                      </span>
                      <div className={s.moneyWrap}>
                        <span className={s.moneyPrefix}>$</span>
                        <input
                          className={s.moneyInput}
                          inputMode="numeric"
                          value={formatMoneyDigits(draft.costoBase)}
                          onChange={(event) =>
                            onDraftChange("costoBase", getDigits(event.target.value))
                          }
                          placeholder="90.000"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className={`${s.activeCard} ${s.activeCardInline}`}>
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
                        ? "Mínimo, redondeo, merma, proveedor y más"
                        : buildAdvancedDetailsSummary(draft) ||
                          "Mínimo cobrable, redondeo, merma, margen, proveedor…"}
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
                          <p>Mínimo, redondeo y márgenes</p>
                        </div>
                      </div>

                      <div className={s.formSectionGrid}>
                        <label className={s.fieldBlock}>
                          <span className={s.fieldLabel}>
                            Mínimo cobrable <em className={s.optionalMark}>opcional</em>
                          </span>
                          <div className={s.moneyWrap}>
                            <span className={s.moneyPrefix}>$</span>
                            <input
                              className={s.moneyInput}
                              inputMode="numeric"
                              value={formatMoneyDigits(draft.minimoCobrable)}
                              onChange={(event) =>
                                onDraftChange("minimoCobrable", getDigits(event.target.value))
                              }
                              placeholder="95.000"
                            />
                          </div>
                        </label>

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
            {renderStepHeader(
              2,
              "Uso de la línea",
              "Elige cómo quieres usar esta línea al cotizar",
              step2Summary,
              openStep > 2
            )}
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
              {renderStepHeader(
                3,
                "Define cómo fabricas esta línea",
                "Tipo de fabricación, variante y componentes reales",
                step3Summary,
                openStep > 3
              )}
              {openStep === 3 ? (
                <div className={s.wizardStepBody}>
                  {!isGlassDraft ? (
                    <FabricationRecipeEditor
                      mode="configure"
                      recipe={ensureRecipe()}
                      vanoWidthMm={calibrationVanoWidthMm}
                      vanoHeightMm={calibrationVanoHeightMm}
                      onRecipeChange={handleRecipeChange}
                      onVanoWidthChange={onCalibrationVanoWidthMmChange}
                      onVanoHeightChange={onCalibrationVanoHeightMmChange}
                    />
                  ) : (
                    <p className={s.fieldHint}>
                      Para cristal solo se estima vidrio. No se configuran perfiles de aluminio.
                    </p>
                  )}
                </div>
              ) : (
                <p className={s.wizardStepSummary}>{step3Summary}</p>
              )}
            </article>
          ) : null}

          {maxStep > 2 ? (
            <article
              className={`${s.wizardStep} ${openStep === 4 ? s.wizardStepOpen : ""} ${
                openStep !== 4 ? s.wizardStepCollapsed : ""
              }`}
            >
              {renderStepHeader(
                4,
                "Valida con un trabajo real",
                "Compara cada componente calculado con tus cortes reales",
                step4Summary,
                false
              )}
              {openStep === 4 ? (
                <div className={`${s.wizardStepBody} ${s.wizardStepBodyTall}`}>
                  {!isGlassDraft ? (
                    <FabricationRecipeEditor
                      mode="validate"
                      recipe={ensureRecipe()}
                      vanoWidthMm={calibrationVanoWidthMm}
                      vanoHeightMm={calibrationVanoHeightMm}
                      onRecipeChange={handleRecipeChange}
                      onVanoWidthChange={onCalibrationVanoWidthMmChange}
                      onVanoHeightChange={onCalibrationVanoHeightMmChange}
                    />
                  ) : (
                    <p className={s.fieldHint}>
                      El cristal no usa pauta de perfiles. Puedes guardar la línea solo con precio.
                    </p>
                  )}
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
              <button type="button" className={s.wizardSecondaryButton} onClick={handleNext}>
                Siguiente
              </button>
            ) : null}
            <button
              type="button"
              className={s.primaryButton}
              onClick={onSave}
              disabled={saveDisabled || isSaving}
            >
              {isSaving
                ? "Guardando..."
                : isGlassDraft
                  ? "Guardar producto"
                  : sheetMode === "edit"
                    ? "Guardar línea"
                    : "Guardar línea"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
