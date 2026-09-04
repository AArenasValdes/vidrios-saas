"use client";

import { useMemo, useState } from "react";
import { LuChevronLeft, LuSearch, LuX } from "react-icons/lu";

import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type {
  CotizacionLineTemplate,
  CreateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { lineTemplateNeedsCommercialPrice } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { LinePriceEditor } from "@/features/cotizaciones/line-templates/components/line-template-price-editor";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  FIELD_LIMITS,
  getCompositionSectionLabel,
  getSheetSchemeOptions,
  normalizeCurrencyInput,
  formatCurrencyInput,
  getSheetVariantOptions,
  requiresCustomSheetDescription,
  shouldRequireProfileMaterialForComponent,
  shouldShowSystemSelectionForComponent,
  shouldShowSheetSchemeForComponent,
  type ComponentFormLinePricingSummary,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { buildCotizacionMirrorPaneMeasure } from "@/utils/cotizacion-item-presentation";
import {
  getComponentDescripcion,
  getSystemDisplayLabel,
  getPalilloTypeDisplayLabel,
  isFreeValueComponentType,
  PALILLO_OPTIONS,
  PALILLO_TYPE_OPTIONS,
} from "@/features/cotizaciones/services/component-catalog.service";

import {
  ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS,
  type PasoDosGrupoDraft,
} from "../../_hooks/use-paso-dos-agregar-grupo";
import {
  getGroupStatusTitle,
  repairBrokenText,
} from "./paso-dos-wizard-movil.utils";
import { PasoDosWizardPrecioMovil } from "./paso-dos-wizard-precio-movil";
import { PasoDosWizardVidrioMovil } from "./paso-dos-wizard-vidrio-movil";
import s from "../../page.module.css";

type GlassCatalogGroup = {
  grupo: string;
  options: readonly string[];
};

type QuickLineFormState = {
  nombre: string;
  vidrioPrincipalRecomendado: string;
  precioM2Sugerido: string;
  minimoCobrable: string;
  redondeoPrecio: string;
  isActive: boolean;
};

function createQuickLineFormState(
  initialGlass = ""
): QuickLineFormState {
  return {
    nombre: "",
    vidrioPrincipalRecomendado: initialGlass,
    precioM2Sugerido: "",
    minimoCobrable: "",
    redondeoPrecio: "1000",
    isActive: true,
  };
}

type Props = {
  activePricingMode: PricingMode;
  colorOptions: readonly { label: string; hex: string }[];
  displayConfigurationOptions: readonly string[];
  displaySystemOptions: readonly string[];
  draft: PasoDosGrupoDraft;
  formattedPriceValue: string;
  glassCatalogGroups: readonly GlassCatalogGroup[];
  isRecommendedGlass: (option: string) => boolean;
  canCreateCustomGlass: boolean;
  isSavingLineTemplate: boolean;
  linePricingSummary: ComponentFormLinePricingSummary;
  lineTemplateOptions: readonly CotizacionLineTemplate[];
  onAltoChange: (value: string) => void;
  onAnchoChange: (value: string) => void;
  onApplyCreatedLineTemplate: (template: CotizacionLineTemplate) => void;
  onCreateLineTemplate: (
    input: Omit<CreateCotizacionLineTemplateInput, "organizationId">
  ) => Promise<CotizacionLineTemplate>;
  onMargenChange: (value: string) => void;
  onMaterialChange: (material: PasoDosGrupoDraft["material"]) => void;
  onNombreChange: (value: string) => void;
  onDescripcionChange: (value: string) => void;
  onSelectLineTemplate: (templateId: string) => void;
  onColorChange: (colorHex: string) => void;
  onConfiguracionChange: (value: string) => void;
  onSheetSchemeChange: (value: string) => void;
  onSheetVariantChange: (value: string) => void;
  onCustomSchemeDescriptionChange: (value: string) => void;
  onMirrorFormatChange: (value: PasoDosGrupoDraft["mirrorFormat"]) => void;
  onMirrorPaneCountChange: (value: number | null) => void;
  onMirrorCustomPaneCountChange: (value: string) => void;
  onMirrorPaneDirectionChange: (value: PasoDosGrupoDraft["mirrorPaneDirection"]) => void;
  onMirrorInteriorLineChange: (value: PasoDosGrupoDraft["mirrorInteriorLine"]) => void;
  onPrecioChange: (value: string) => void;
  onPricingModeChange: (mode: PricingMode) => void;
  onSistemaChange: (value: string) => void;
  onVidrioChange: (value: string) => void;
  onPalilloEnabledChange: (enabled: boolean) => void;
  onPalilloTypeChange: (palilloType: string) => void;
  onCostInputScopeChange: (scope: "group_total" | "unit") => void;
  onCobraPrecioSeparadoChange: (value: boolean) => void;
  onAddAlcanceDetalle: (initialNombre?: string) => void;
  onUpdateAlcanceDetalle: (
    detalleId: string,
    field: "tipo" | "subtipo" | "nombre" | "cantidad" | "ancho" | "alto" | "descripcion",
    value: string
  ) => void;
  onRemoveAlcanceDetalle: (detalleId: string) => void;
  onOpenComponentCreator?: () => void;
  nestedDetailItems?: readonly CotizacionWorkflowItem[];
  quotePricingMode: QuotePricingMode;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  internalObservation: string;
  onGlobalTotalClienteChange: (value: string) => void;
  onMostrarIvaChange: () => void;
  onInternalObservationChange: (value: string) => void;
  priceHelp: string;
  priceLabel: string;
  recommendedReason: string;
  recommendedVidrios: readonly string[];
  searchResults: readonly string[];
  showAllConfigurations: boolean;
  showAllSystems: boolean;
  showConfigurationToggle: boolean;
  showSystemToggle: boolean;
  vidSearch: string;
  onSetShowAllConfigurations: (value: boolean) => void;
  onSetShowAllSystems: (value: boolean) => void;
  onSetVidSearch: (value: string) => void;
  onCreateCustomGlass: (value: string) => void;
};

export function PasoDosWizardConfiguracionMovil({
  activePricingMode,
  colorOptions,
  displayConfigurationOptions,
  displaySystemOptions,
  draft,
  formattedPriceValue,
  glassCatalogGroups,
  isRecommendedGlass,
  canCreateCustomGlass,
  isSavingLineTemplate,
  linePricingSummary,
  lineTemplateOptions,
  onAltoChange,
  onAnchoChange,
  onApplyCreatedLineTemplate,
  onCreateLineTemplate,
  onMargenChange,
  onMaterialChange,
  onNombreChange,
  onDescripcionChange,
  onSelectLineTemplate,
  onColorChange,
  onConfiguracionChange,
  onSheetSchemeChange,
  onSheetVariantChange,
  onCustomSchemeDescriptionChange,
  onMirrorFormatChange,
  onMirrorPaneCountChange,
  onMirrorCustomPaneCountChange,
  onMirrorPaneDirectionChange,
  onMirrorInteriorLineChange,
  onPrecioChange,
  onPricingModeChange,
  onSistemaChange,
  onVidrioChange,
  onPalilloEnabledChange,
  onPalilloTypeChange,
  onCostInputScopeChange,
  onCobraPrecioSeparadoChange,
  onAddAlcanceDetalle,
  onUpdateAlcanceDetalle,
  onRemoveAlcanceDetalle,
  onOpenComponentCreator,
  nestedDetailItems = [],
  quotePricingMode = "por_item",
  totalClienteManual,
  internalObservation,
  onGlobalTotalClienteChange,
  onInternalObservationChange,
  priceHelp,
  priceLabel,
  recommendedReason,
  recommendedVidrios,
  searchResults,
  showAllConfigurations,
  showAllSystems,
  showConfigurationToggle,
  showSystemToggle,
  vidSearch,
  onSetShowAllConfigurations,
  onSetShowAllSystems,
  onSetVidSearch,
  onCreateCustomGlass,
}: Props) {
  const { organizacionId } = useAuth();
  const [showAllColors, setShowAllColors] = useState(false);
  const [isIphoneViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return /iphone|ipod/i.test(window.navigator.userAgent);
  });
  const [isLineSelectorOpen, setIsLineSelectorOpen] = useState(false);
  const [lineSelectorQuery, setLineSelectorQuery] = useState("");
  const [lineSheetView, setLineSheetView] = useState<"list" | "create">("list");
  const [quickLineForm, setQuickLineForm] = useState<QuickLineFormState>(() =>
    createQuickLineFormState()
  );
  const [isQuickOptionsOpen, setIsQuickOptionsOpen] = useState(false);
  const [quickLineError, setQuickLineError] = useState<string | null>(null);
  const [priceEditorTarget, setPriceEditorTarget] = useState<CotizacionLineTemplate | null>(null);
  const [isInternalObservationOpen, setIsInternalObservationOpen] = useState(
    Boolean(internalObservation.trim())
  );
  const [showPlantillas, setShowPlantillas] = useState(false);
  const availableLineTemplates = lineTemplateOptions;
  const referencia = draft.referencia?.trim() ?? "";
  const precioPorM2 = draft.precioPorM2?.trim() ?? "";
  const isBowWindow = draft.subtipo === "Ventana" && draft.sistema === "Bow Window";
  const showSheetScheme = shouldShowSheetSchemeForComponent({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const showSystemSelection = shouldShowSystemSelectionForComponent(draft.subtipo);
  const requiresProfileMaterial = shouldRequireProfileMaterialForComponent(draft.subtipo);
  const isGlassProduct =
    !requiresProfileMaterial || draft.catalogCategoria === "vidrio" || draft.material === "Cristal";
  const isTrabajoPersonalizado = draft.subtipo === "Trabajo personalizado";
  const isFreeValue = isFreeValueComponentType(draft.subtipo);
  const freeValueGuidance = getComponentDescripcion(draft.subtipo);
  const shouldShowFreeValuePrice =
    quotePricingMode !== "total_global" || draft.cobraPrecioSeparado;
  const sheetSchemeOptions = getSheetSchemeOptions({
    tipo: draft.subtipo,
    sistema: draft.sistema,
    configuracion: draft.configuracion,
  });
  const sheetVariantOptions = getSheetVariantOptions(draft.sheetScheme, {
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const compositionSectionLabel = getCompositionSectionLabel({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const showCustomSchemeDescription = requiresCustomSheetDescription({
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
  });
  const isMirrorComponent = draft.subtipo.trim().toLowerCase() === "espejo";
  const mirrorPaneCountOptions = [2, 3, 4, 5, 6] as const;
  const isCustomMirrorPaneCount =
    draft.mirrorFormat === "divided" &&
    (draft.mirrorCustomPaneCount.trim() !== "" ||
      (draft.mirrorPaneCount !== null && !mirrorPaneCountOptions.includes(
        draft.mirrorPaneCount as (typeof mirrorPaneCountOptions)[number]
      )));
  const mirrorPaneMeasure = buildCotizacionMirrorPaneMeasure({
    ancho: draft.ancho ? Number(draft.ancho) : null,
    alto: draft.alto ? Number(draft.alto) : null,
    mirrorPaneCount: draft.mirrorPaneCount,
    mirrorPaneDirection: draft.mirrorPaneDirection,
  });
  const mirrorPaneHelp =
    draft.mirrorFormat === "divided" && draft.mirrorPaneCount && mirrorPaneMeasure
      ? `${draft.mirrorPaneCount} pa\u00f1os de ${mirrorPaneMeasure.label}`
      : "Ingresa medidas y cantidad de pa\u00f1os para ver la medida aproximada.";
  const globalTotalInputValue =
    totalClienteManual !== null && totalClienteManual !== undefined
      ? formatCurrencyInput(String(totalClienteManual))
      : "";
  const primaryColorOptions = useMemo(() => colorOptions.slice(0, 4), [colorOptions]);
  const visibleColorOptions = showAllColors ? colorOptions : primaryColorOptions;
  const selectedLineTemplate = useMemo(
    () =>
      availableLineTemplates.find((template) => String(template.id) === draft.lineTemplateId) ??
      null,
    [availableLineTemplates, draft.lineTemplateId]
  );
  const selectedLineNeedsPrice = Boolean(
    selectedLineTemplate && lineTemplateNeedsCommercialPrice(selectedLineTemplate)
  );
  const selectedLineLabel = useMemo(() => {
    if (!draft.lineTemplateId) {
      return isGlassProduct ? "Precio manual o sin cristal" : "Precio manual o sin linea";
    }

    return (
      availableLineTemplates.find((template) => String(template.id) === draft.lineTemplateId)?.nombre ??
      referencia ??
      (isGlassProduct ? "Precio manual o sin cristal" : "Precio manual o sin linea")
    );
  }, [availableLineTemplates, draft.lineTemplateId, isGlassProduct, referencia]);

  const filteredLineTemplates = useMemo(() => {
    const normalizedQuery = lineSelectorQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableLineTemplates;
    }

    return availableLineTemplates.filter((template) =>
      template.nombre.toLowerCase().includes(normalizedQuery)
    );
  }, [availableLineTemplates, lineSelectorQuery]);

  const openLineSelector = () => {
    setLineSelectorQuery("");
    setLineSheetView("list");
    setQuickLineError(null);
    setIsLineSelectorOpen(true);
  };

  const closeLineSelector = () => {
    setLineSelectorQuery("");
    setLineSheetView("list");
    setQuickLineForm(createQuickLineFormState());
    setIsQuickOptionsOpen(false);
    setQuickLineError(null);
    setPriceEditorTarget(null);
    setIsLineSelectorOpen(false);
  };

  const handleSelectSavedLine = (template: CotizacionLineTemplate) => {
    if (lineTemplateNeedsCommercialPrice(template)) {
      setPriceEditorTarget(template);
      return;
    }

    onSelectLineTemplate(String(template.id));
    closeLineSelector();
  };

  const openQuickLineForm = () => {
    setLineSheetView("create");
    setQuickLineForm(createQuickLineFormState(draft.vidrio || ""));
    setIsQuickOptionsOpen(false);
    setQuickLineError(null);
  };

  const returnToLineSelector = () => {
    setLineSheetView("list");
    setQuickLineError(null);
  };

  const handleQuickLineChange = <K extends keyof QuickLineFormState>(
    key: K,
    value: QuickLineFormState[K]
  ) => {
    setQuickLineForm((current) => ({ ...current, [key]: value }));
  };

  const handleSaveAndUseQuickLine = async () => {
    const nombre = quickLineForm.nombre.trim();
    const precioM2Sugerido = Number(quickLineForm.precioM2Sugerido || 0);

    if (!nombre || precioM2Sugerido <= 0) {
      setQuickLineError("Completa el nombre comercial y un precio base por m2 válido.");
      return;
    }

    try {
      const created = await onCreateLineTemplate({
        nombre,
        categoria: isGlassProduct ? "vidrio" : undefined,
        unidadCobro: "m2",
        material: isGlassProduct ? "Cristal" : draft.material,
        vidrioPrincipalRecomendado: isGlassProduct
          ? null
          : quickLineForm.vidrioPrincipalRecomendado.trim() || null,
        catalogMetadata: isGlassProduct
          ? {
              espesor: draft.catalogEspesor || null,
              terminacion:
                quickLineForm.vidrioPrincipalRecomendado.trim() ||
                draft.catalogTerminacion ||
                null,
            }
          : undefined,
        precioM2Sugerido,
        minimoCobrable: Number(quickLineForm.minimoCobrable || 0),
        redondeoPrecio: Number(quickLineForm.redondeoPrecio || 1000),
        isActive: quickLineForm.isActive,
      });

      onApplyCreatedLineTemplate(created);
      setLineSelectorQuery("");
      setLineSheetView("list");
      setQuickLineForm(createQuickLineFormState());
      setIsQuickOptionsOpen(false);
      setQuickLineError(null);
    } catch (error) {
      setQuickLineError(
        error instanceof Error ? error.message : "No pudimos guardar la linea en este momento."
      );
    }
  };

  if (isFreeValue && quotePricingMode === "total_global") {
    const includedCount = nestedDetailItems.length;

    return (
      <div className={`${s.stepTwoMobileCreatorStack} ${s.stepTwoNotebookStack}`}>
        <label className={s.stepTwoNotebookField}>
          <span className={s.stepTwoNotebookFieldLabel}>NOMBRE DEL TRABAJO</span>
          <input
            className={s.stepTwoNotebookInput}
            maxLength={120}
            placeholder="Ej: Mantencion de ventanas"
            type="text"
            value={draft.nombre}
            onChange={(event) => onNombreChange(event.target.value)}
          />
        </label>

        {!showPlantillas ? (
          <button
            type="button"
            className={s.stepTwoNotebookPlantillasLink}
            onClick={() => setShowPlantillas(true)}
          >
            + Plantillas rapidas
          </button>
        ) : (
          <div className={s.suggestionChips}>
            <span className={s.suggestionChipsLabel}>Plantillas:</span>
            {["Mantencion", "Cambio de vidrio", "Sellado", "Instalacion", "Reparacion shower", "Otro"].map(
              (chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`${s.suggestionChip} ${
                    draft.nombre === chip ? s.suggestionChipActive : ""
                  }`}
                  onClick={() => {
                    if (!draft.nombre.trim()) onNombreChange(chip);
                  }}
                >
                  {chip}
                </button>
              )
            )}
            <button
              type="button"
              className={s.stepTwoNotebookPlantillasHide}
              onClick={() => setShowPlantillas(false)}
            >
              Ocultar
            </button>
          </div>
        )}

        <label className={s.stepTwoNotebookTextareaCard}>
          <span className={s.stepTwoNotebookTextareaHeader}>DESCRIPCION PARA CLIENTE</span>
          <textarea
            className={s.stepTwoNotebookTextarea}
            maxLength={360}
            placeholder="Ej: Se considera mantencion general de ventanas existentes, ajuste de correderas, revision de pestillos y limpieza de rieles."
            rows={5}
            value={draft.descripcion}
            onChange={(event) => onDescripcionChange(event.target.value)}
          />
        </label>

        <section
          className={s.stepTwoNotebookSection}
          aria-labelledby="componentes-libres-title"
        >
          <div className={s.stepTwoNotebookSectionTop}>
            <div>
              <h3 id="componentes-libres-title" className={s.stepTwoNotebookSectionTitle}>
                Componentes incluidos
              </h3>
              <span className={s.stepTwoNotebookSectionHelp}>
                Se listan en el PDF sin precio individual.
              </span>
            </div>
            <span className={s.stepTwoNotebookSectionCount}>
              {includedCount} {includedCount === 1 ? "incluido" : "incluidos"}
            </span>
          </div>

          {onOpenComponentCreator ? (
            <button
              type="button"
              className={s.stepTwoNotebookComponentButton}
              onClick={onOpenComponentCreator}
            >
              + Agregar componente completo
            </button>
          ) : null}

          {nestedDetailItems.length > 0 ? (
            <div className={s.stepTwoNotebookNestedList}>
              {nestedDetailItems.map((item) => {
                const measures =
                  item.ancho && item.alto
                    ? `${Math.round(item.ancho)} x ${Math.round(item.alto)} mm`
                    : "Sin medidas";
                const quantity = item.cantidad > 1 ? `${item.cantidad} uds.` : "1 ud.";

                return (
                  <article key={item.id} className={s.stepTwoNotebookNestedItem}>
                    <span className={s.stepTwoNotebookNestedCode}>{item.codigo}</span>
                    <div className={s.stepTwoNotebookNestedBody}>
                      <strong>{item.nombre || item.tipo}</strong>
                      <small>
                        {[item.tipo, measures, quantity].filter(Boolean).join(" - ")}
                      </small>
                    </div>
                    <span className={s.stepTwoNotebookNestedBadge}>Incluido</span>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className={s.stepTwoNotebookPriceCard}>
          <div className={s.stepTwoNotebookPriceTitle}>PRECIO FINAL</div>
          <label className={s.stepTwoNotebookPriceField}>
            <input
              className={`${s.stepTwoMobilePrecioInput} ${s.stepTwoMobileFinalPriceInput} ${s.stepTwoNotebookPriceInput}`}
              inputMode="numeric"
              placeholder="Ej: 600.000"
              type="text"
              value={globalTotalInputValue}
              onChange={(event) => onGlobalTotalClienteChange(event.target.value)}
            />
          </label>
          <span className={s.stepTwoMobileBlockHelp}>
            Configura IVA y flete en el resumen, igual que en cotizacion por componentes.
          </span>
        </div>

        <div className={s.stepTwoNotebookInternalBox}>
          {!isInternalObservationOpen ? (
            <button
              type="button"
              className={s.stepTwoNotebookInlineLink}
              onClick={() => setIsInternalObservationOpen(true)}
            >
              + Agregar observacion interna
            </button>
          ) : (
            <>
              <div className={s.stepTwoNotebookInternalHeader}>
                <strong className={s.stepTwoNotebookPriceTitle}>OBSERVACION INTERNA</strong>
                <button
                  type="button"
                  className={s.stepTwoNotebookInlineLink}
                  onClick={() => setIsInternalObservationOpen(false)}
                >
                  Ocultar
                </button>
              </div>
              <textarea
                className={s.stepTwoNotebookInternalTextarea}
                maxLength={280}
                placeholder="Nota solo para uso interno."
                rows={3}
                value={internalObservation}
                onChange={(event) => onInternalObservationChange(event.target.value)}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  if (isFreeValue) {
    return (
      <div className={s.stepTwoMobileCreatorStack}>
        <div className={s.stepTwoMobileConfigStatus}>
          <strong>Datos del item</strong>
          <span>
            {quotePricingMode === "total_global"
              ? "Redacta trabajo principal, detalles incluidos y precio final."
              : "Redacta el trabajo y define el valor."}
          </span>
        </div>

        <div className={s.stepTwoMobileBlockHero}>
          <div className={s.stepTwoMobileBlockLabel}>NOMBRE DEL ITEM</div>
          <label className={s.stepTwoMobileInlineField}>
            <input
              className={s.input}
              maxLength={120}
              placeholder="Ej: Mantencion de ventanas"
              type="text"
              value={draft.nombre}
              onChange={(event) => onNombreChange(event.target.value)}
            />
          </label>
        </div>

        <div className={s.stepTwoMobileBlockHero}>
          <div className={s.stepTwoMobileBlockLabel}>DESCRIPCION PARA CLIENTE</div>
          {freeValueGuidance ? (
            <div className={s.stepTwoMobileGuidanceBox}>
              <strong>{draft.nombre || draft.subtipo}</strong>
              <span>{freeValueGuidance}</span>
            </div>
          ) : null}
          <label className={s.stepTwoMobileInlineField}>
            <textarea
              className={s.textarea}
              maxLength={360}
              placeholder="Ej: Mantencion de 5 ventanas existentes, ajuste de corredera, revision de pestillos y limpieza de rieles."
              rows={4}
              value={draft.descripcion}
              onChange={(event) => onDescripcionChange(event.target.value)}
            />
          </label>
        </div>

        <div className={s.suggestionChips}>
          <span className={s.suggestionChipsLabel}>Sugerencias:</span>
          {["Cambio de vidrio", "Mantencion", "Sellado", "Reparacion shower", "Otro"].map(
            (chip) => (
              <button
                key={chip}
                type="button"
                className={`${s.suggestionChip} ${
                  draft.nombre === chip ? s.suggestionChipActive : ""
                }`}
                onClick={() => onNombreChange(chip)}
              >
                {chip}
              </button>
            )
          )}
        </div>

        {quotePricingMode === "total_global" ? (
          <div className={s.stepTwoMobileBlockHero}>
            <div className={s.stepTwoMobileBlockLabel}>PRECIO</div>
            <button
              type="button"
              className={draft.cobraPrecioSeparado ? s.btnGhost : s.btnPrimary}
              onClick={() => onCobraPrecioSeparadoChange(!draft.cobraPrecioSeparado)}
            >
              {draft.cobraPrecioSeparado
                ? "Quitar cobro separado"
                : "Cobrar este item por separado"}
            </button>
            <span className={s.stepTwoMobileBlockHelp}>
              {draft.cobraPrecioSeparado
                ? "Este valor se sumara al total final de la cotizacion."
                : "Este trabajo queda incluido dentro del precio final del presupuesto."}
            </span>
          </div>
        ) : null}

        {shouldShowFreeValuePrice ? (
          <>
            <div className={s.stepTwoMobileBlockHero}>
              <div className={s.stepTwoMobileBlockLabel}>VALOR A COBRAR</div>
              <label className={s.stepTwoMobileInlineField}>
                <input
                  className={s.stepTwoMobilePrecioInput}
                  id="grupo-precio"
                  inputMode="numeric"
                  placeholder="Ej: 120.000"
                  type="text"
                  value={formatCurrencyInput(draft.precio)}
                  onChange={(event) => onPrecioChange(event.target.value)}
                />
              </label>
              <span className={s.stepTwoMobileBlockHelp}>
                {quotePricingMode === "total_global"
                  ? "Este monto se suma aparte del total de la obra."
                  : "Este valor seguira la configuracion de IVA de la cotizacion."}
              </span>
            </div>
          </>
        ) : null}

        {quotePricingMode === "total_global" ? (
          <>
            <div className={s.stepTwoMobileBlockSecundario}>
              <div className={s.stepTwoMobileBlockLabel}>DETALLES INCLUIDOS</div>
              <span className={s.stepTwoMobileBlockHelp}>
                Manual para texto libre. Estructurado para reutilizar croquis en PDF.
              </span>
            </div>

            {draft.alcanceDetalles.map((detalle, idx) => (
              <div key={detalle.id} className={s.alcanceDetalleCard}>
                <div className={s.alcanceDetalleHeader}>
                  <span className={s.alcanceDetalleIndex}>
                    {detalle.nombre.trim() || `Detalle ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    className={s.iconButton}
                    onClick={() => onRemoveAlcanceDetalle(detalle.id)}
                    aria-label="Eliminar detalle"
                  >
                    <LuX aria-hidden size={14} />
                  </button>
                </div>
                <div className={s.stepTwoMobileChoiceChips}>
                  <button
                    type="button"
                    className={`${s.stepTwoMobileChoiceChip} ${
                      detalle.tipo === "manual" ? s.stepTwoMobileChoiceChipActive : ""
                    }`}
                    onClick={() => onUpdateAlcanceDetalle(detalle.id, "tipo", "manual")}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    className={`${s.stepTwoMobileChoiceChip} ${
                      detalle.tipo === "estructurado" ? s.stepTwoMobileChoiceChipActive : ""
                    }`}
                    onClick={() => onUpdateAlcanceDetalle(detalle.id, "tipo", "estructurado")}
                  >
                    Estructurado
                  </button>
                </div>
                {detalle.tipo === "estructurado" ? (
                  <>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Componente</span>
                      <div className={s.selectWrap}>
                        <select
                          className={s.input}
                          value={detalle.subtipo || ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS[0]}
                          onChange={(event) =>
                            onUpdateAlcanceDetalle(detalle.id, "subtipo", event.target.value)
                          }
                        >
                          {ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <div className={s.alcanceDetalleGrid}>
                      <label className={s.stepTwoMobileInlineField}>
                        <span className={s.label}>Cantidad</span>
                        <input
                          className={s.input}
                          inputMode="numeric"
                          placeholder="1"
                          value={detalle.cantidad}
                          onChange={(event) =>
                            onUpdateAlcanceDetalle(detalle.id, "cantidad", event.target.value)
                          }
                        />
                      </label>
                      <label className={s.stepTwoMobileInlineField}>
                        <span className={s.label}>Ancho (mm)</span>
                        <input
                          className={s.input}
                          inputMode="numeric"
                          placeholder="1500"
                          value={detalle.ancho}
                          onChange={(event) =>
                            onUpdateAlcanceDetalle(detalle.id, "ancho", event.target.value)
                          }
                        />
                      </label>
                      <label className={s.stepTwoMobileInlineField}>
                        <span className={s.label}>Alto (mm)</span>
                        <input
                          className={s.input}
                          inputMode="numeric"
                          placeholder="2000"
                          value={detalle.alto}
                          onChange={(event) =>
                            onUpdateAlcanceDetalle(detalle.id, "alto", event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Etiqueta visible</span>
                      <input
                        className={s.input}
                        placeholder="Ej: 3 ventanas correderas 1500 x 2000"
                        type="text"
                        value={detalle.nombre}
                        onChange={(event) =>
                          onUpdateAlcanceDetalle(detalle.id, "nombre", event.target.value)
                        }
                      />
                    </label>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Nota opcional</span>
                      <input
                        className={s.input}
                        placeholder="Ej: Con retiro de marco existente"
                        type="text"
                        value={detalle.descripcion}
                        onChange={(event) =>
                          onUpdateAlcanceDetalle(detalle.id, "descripcion", event.target.value)
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Nombre</span>
                      <input
                        className={s.input}
                        placeholder="Ej: Sellado perimetral"
                        type="text"
                        value={detalle.nombre}
                        onChange={(event) =>
                          onUpdateAlcanceDetalle(detalle.id, "nombre", event.target.value)
                        }
                      />
                    </label>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Descripcion</span>
                      <input
                        className={s.input}
                        placeholder="Ej: Sellado interior y exterior"
                        type="text"
                        value={detalle.descripcion}
                        onChange={(event) =>
                          onUpdateAlcanceDetalle(detalle.id, "descripcion", event.target.value)
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            ))}

            <button type="button" className={s.btnGhost} onClick={() => onAddAlcanceDetalle()}>
              + Agregar detalle
            </button>

            <div className={s.stepTwoMobileBlockHero}>
              <div className={s.stepTwoMobileBlockLabel}>PRECIO FINAL</div>
              <label className={s.stepTwoMobileInlineField}>
                <input
                  className={`${s.stepTwoMobilePrecioInput} ${s.stepTwoMobileFinalPriceInput}`}
                  inputMode="numeric"
                  placeholder="Ej: 600.000"
                  type="text"
                  value={globalTotalInputValue}
                  onChange={(event) => onGlobalTotalClienteChange(event.target.value)}
                />
              </label>
            </div>

            <div className={s.stepTwoMobileBlockSecundario}>
              {!isInternalObservationOpen ? (
                <button
                  type="button"
                  className={s.stepTwoMobileSecondaryLink}
                  onClick={() => setIsInternalObservationOpen(true)}
                >
                  + Agregar observacion interna
                </button>
              ) : (
                <label className={s.stepTwoMobileInlineField}>
                  <div className={s.stepTwoMobileBlockHeaderInline}>
                    <span className={s.label}>Observacion interna</span>
                    <button
                      type="button"
                      className={s.stepTwoMobileSecondaryLink}
                      onClick={() => setIsInternalObservationOpen(false)}
                    >
                      Ocultar
                    </button>
                  </div>
                  <textarea
                    className={s.textarea}
                    maxLength={FIELD_LIMITS.observaciones}
                    placeholder="Uso interno. No sale en el PDF."
                    rows={3}
                    value={internalObservation}
                    onChange={(event) => onInternalObservationChange(event.target.value)}
                  />
                </label>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileConfigStatus}>
        <strong>{getGroupStatusTitle(draft.cantidad, draft.subtipo, draft.sistema, draft)}</strong>
        <span>
          {isTrabajoPersonalizado
            ? "Describe el alcance como lo vera el cliente."
            : "Mismas medidas, mismo sistema y mismo valor inicial."}
        </span>
      </div>

      {isTrabajoPersonalizado ? (
        <div className={s.stepTwoMobileBlockHero}>
          <div className={s.stepTwoMobileBlockLabel}>Descripcion del trabajo</div>
          <label className={s.stepTwoMobileInlineField}>
            <span className={s.label}>Nombre del trabajo</span>
            <input
              className={s.input}
              maxLength={120}
              placeholder="Ej: Cierre terraza a medida"
              type="text"
              value={draft.nombre}
              onChange={(event) => onNombreChange(event.target.value)}
            />
          </label>
          <label className={s.stepTwoMobileInlineField}>
            <span className={s.label}>Descripcion para cliente</span>
            <textarea
              className={s.textarea}
              maxLength={360}
              placeholder="Ej: Cierre de terraza con 4 hojas, sistema especial, fabricacion a medida e instalacion incluida."
              rows={5}
              value={draft.descripcion}
              onChange={(event) => onDescripcionChange(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {showSystemSelection ? (
      <div className={s.stepTwoMobileBlockHero}>
        <div className={s.stepTwoMobileBlockLabel}>Sistema</div>
        <div className={s.stepTwoMobileChoiceChips}>
          {displaySystemOptions.map((option) => (
            <button
              key={option}
              className={`${s.stepTwoMobileChoiceChip} ${draft.sistema === option ? s.stepTwoMobileChoiceChipActive : ""}`}
              onClick={() => onSistemaChange(option)}
              type="button"
            >
              {repairBrokenText(getSystemDisplayLabel(option))}
            </button>
          ))}
        </div>

        {showSystemToggle ? (
          <button
            className={s.stepTwoMobileSecondaryLink}
            onClick={() => onSetShowAllSystems(!showAllSystems)}
            type="button"
          >
            {showAllSystems ? "Mostrar menos" : "Ver mas sistemas"}
          </button>
        ) : null}
      </div>
      ) : null}

      {displayConfigurationOptions.length > 0 ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>
            {isBowWindow
              ? "Tipo de apertura"
              : draft.subtipo === "Puerta"
                ? "Configuración de puerta"
                : "Configuración"}
          </div>
          <div className={s.stepTwoMobileChoiceChips}>
            {displayConfigurationOptions.map((option) => (
              <button
                key={option}
                className={`${s.stepTwoMobileChoiceChip} ${draft.configuracion === option ? s.stepTwoMobileChoiceChipActive : ""}`}
                onClick={() => onConfiguracionChange(option)}
                type="button"
              >
                {repairBrokenText(option)}
              </button>
            ))}
          </div>

          {showConfigurationToggle ? (
            <button
              className={s.stepTwoMobileSecondaryLink}
              onClick={() => onSetShowAllConfigurations(!showAllConfigurations)}
              type="button"
            >
              {showAllConfigurations ? "Mostrar menos" : "Ver mas opciones"}
            </button>
          ) : null}
        </div>
      ) : null}

      {isMirrorComponent ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>Formato del espejo</div>
          <div className={s.stepTwoMobileChoiceChips}>
            <button
              className={`${s.stepTwoMobileChoiceChip} ${
                draft.mirrorFormat === "single" ? s.stepTwoMobileChoiceChipActive : ""
              }`}
              onClick={() => onMirrorFormatChange("single")}
              type="button"
            >
              1 paño
            </button>
            <button
              className={`${s.stepTwoMobileChoiceChip} ${
                draft.mirrorFormat === "divided" ? s.stepTwoMobileChoiceChipActive : ""
              }`}
              onClick={() => onMirrorFormatChange("divided")}
              type="button"
            >
              Dividido en paños
            </button>
          </div>

          {draft.mirrorFormat === "divided" ? (
            <>
              <div className={s.stepTwoMobileBlockHelp}>Cantidad de paños</div>
              <div className={s.stepTwoMobileChoiceChips}>
                {mirrorPaneCountOptions.map((option) => (
                  <button
                    key={option}
                    className={`${s.stepTwoMobileChoiceChip} ${
                      draft.mirrorPaneCount === option && !isCustomMirrorPaneCount
                        ? s.stepTwoMobileChoiceChipActive
                        : ""
                    }`}
                    onClick={() => onMirrorPaneCountChange(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
                <button
                  className={`${s.stepTwoMobileChoiceChip} ${
                    isCustomMirrorPaneCount ? s.stepTwoMobileChoiceChipActive : ""
                  }`}
                  onClick={() =>
                    onMirrorCustomPaneCountChange(
                      draft.mirrorCustomPaneCount || String(draft.mirrorPaneCount ?? "")
                    )
                  }
                  type="button"
                >
                  Personalizado
                </button>
              </div>

              {isCustomMirrorPaneCount ? (
                <label className={s.stepTwoMobileInlineField}>
                  <span className={s.label}>Cantidad personalizada</span>
                  <input
                    className={s.input}
                    inputMode="numeric"
                    placeholder="Ej: 8"
                    type="text"
                    value={draft.mirrorCustomPaneCount}
                    onChange={(event) => onMirrorCustomPaneCountChange(event.target.value)}
                  />
                </label>
              ) : null}

              <div className={s.stepTwoMobileBlockHelp}>Dirección</div>
              <div className={s.stepTwoMobileChoiceChips}>
                <button
                  className={`${s.stepTwoMobileChoiceChip} ${
                    draft.mirrorPaneDirection === "vertical" ? s.stepTwoMobileChoiceChipActive : ""
                  }`}
                  onClick={() => onMirrorPaneDirectionChange("vertical")}
                  type="button"
                >
                  Vertical
                </button>
                <button
                  className={`${s.stepTwoMobileChoiceChip} ${
                    draft.mirrorPaneDirection === "horizontal" ? s.stepTwoMobileChoiceChipActive : ""
                  }`}
                  onClick={() => onMirrorPaneDirectionChange("horizontal")}
                  type="button"
                >
                  Horizontal
                </button>
              </div>

              <div className={s.stepTwoMobileBlockHelp}>Linea interior</div>
              <div className={s.stepTwoMobileChoiceChips}>
                <button
                  className={`${s.stepTwoMobileChoiceChip} ${
                    draft.mirrorInteriorLine === "fine" ? s.stepTwoMobileChoiceChipActive : ""
                  }`}
                  onClick={() => onMirrorInteriorLineChange("fine")}
                  type="button"
                >
                  Linea fina
                </button>
                <button
                  className={`${s.stepTwoMobileChoiceChip} ${
                    draft.mirrorInteriorLine === "marked" ? s.stepTwoMobileChoiceChipActive : ""
                  }`}
                  onClick={() => onMirrorInteriorLineChange("marked")}
                  type="button"
                >
                  Junta marcada
                </button>
              </div>

              <span className={s.stepTwoMobileBlockHelp}>{mirrorPaneHelp}</span>
            </>
          ) : null}
        </div>
      ) : null}

      {!isTrabajoPersonalizado && !isFreeValue && draft.subtipo === "Puerta" ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>Palillo</div>
          <div className={s.stepTwoMobileChoiceChips}>
            {PALILLO_OPTIONS.map((option) => (
              <button
                key={option}
                className={`${s.stepTwoMobileChoiceChip} ${
                  (option === "Con palillo" && draft.palilloEnabled) ||
                  (option === "Sin palillo" && !draft.palilloEnabled)
                    ? s.stepTwoMobileChoiceChipActive
                    : ""
                }`}
                onClick={() => onPalilloEnabledChange(option === "Con palillo")}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
          {draft.palilloEnabled ? (
            <div className={s.stepTwoMobileChoiceChips} style={{ marginTop: 6 }}>
              {PALILLO_TYPE_OPTIONS.map((typeOption) => (
                <button
                  key={typeOption}
                  className={`${s.stepTwoMobileChoiceChip} ${s.stepTwoMobileChoiceChipSmall} ${
                    draft.palilloType === typeOption ? s.stepTwoMobileChoiceChipActive : ""
                  }`}
                  onClick={() => onPalilloTypeChange(typeOption)}
                  type="button"
                >
                  {getPalilloTypeDisplayLabel(typeOption)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showSheetScheme ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>{compositionSectionLabel}</div>
          <div className={s.stepTwoMobileChoiceChips}>
            {sheetSchemeOptions.map((option) => (
              <button
                key={option}
                className={`${s.stepTwoMobileChoiceChip} ${
                  draft.sheetScheme === option ? s.stepTwoMobileChoiceChipActive : ""
                }`}
                onClick={() => onSheetSchemeChange(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>

          {sheetVariantOptions.length > 0 ? (
            <div className={s.stepTwoMobileChoiceChips}>
              {sheetVariantOptions.map((option) => (
                <button
                  key={option}
                  className={`${s.stepTwoMobileChoiceChip} ${
                    draft.sheetVariant === option ? s.stepTwoMobileChoiceChipActive : ""
                  }`}
                  onClick={() => onSheetVariantChange(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {showCustomSchemeDescription ? (
            <label className={s.field}>
              <span className={s.stepTwoMobileQuickLineLabel}>Describe la composición</span>
              <input
                className={s.stepTwoMobileQuickLineInput}
                maxLength={120}
                placeholder="Ej: fijo superior + lateral"
                type="text"
                value={draft.customSchemeDescription}
                onChange={(event) => onCustomSchemeDescriptionChange(event.target.value)}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {requiresProfileMaterial ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>Material</div>
          <div className={s.stepTwoMobileMaterialGrid}>
            {(["Aluminio", "PVC"] as const).map((material) => (
              <button
                key={material}
                className={`${s.stepTwoMobileMaterialButton} ${draft.material === material ? s.stepTwoMobileMaterialButtonActive : ""}`}
                onClick={() => {
                  setShowAllColors(false);
                  closeLineSelector();
                  onMaterialChange(material);
                }}
                type="button"
              >
                <span className={s.stepTwoMobileMaterialButtonLabel}>{material}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={s.stepTwoMobileBlockSecundario}>
        <div className={s.stepTwoMobileBlockHeaderInline}>
          <div className={s.stepTwoMobileBlockLabel}>
            {isGlassProduct ? "Catalogo de cristales" : "Linea comercial"}
          </div>
          <button className={s.stepTwoMobileSecondaryLink} onClick={openLineSelector} type="button">
            {availableLineTemplates.length > 0
              ? isGlassProduct ? "Ver cristales" : "Ver lineas"
              : isGlassProduct ? "Nuevo cristal" : "Nueva linea"}
          </button>
        </div>
        <button
          className={`${s.stepTwoMobileLineTrigger} ${isLineSelectorOpen ? s.stepTwoMobileLineTriggerOpen : ""}`}
          onClick={openLineSelector}
          type="button"
        >
          <span className={s.stepTwoMobileLineTriggerLabel}>{selectedLineLabel}</span>
          <span className={s.stepTwoMobileLineTriggerIcon} aria-hidden>
            +
          </span>
        </button>
        {selectedLineNeedsPrice && selectedLineTemplate ? (
          <div className={s.stepTwoMobilePendingPriceBanner}>
            <p>
              <strong>{selectedLineTemplate.nombre}</strong> no tiene precio configurado.
              Agrégalo ahora; queda guardado para futuras cotizaciones.
            </p>
            <button
              type="button"
              onClick={() => setPriceEditorTarget(selectedLineTemplate)}
            >
              Agregar precio ahora
            </button>
          </div>
        ) : referencia && precioPorM2 ? (
          <div className={s.stepTwoMobileLineSummary}>
            <span>{referencia}</span>
            <strong>
              {linePricingSummary.precioUnitarioSugerido !== null
                ? `Sugerido: $${linePricingSummary.precioUnitarioSugerido.toLocaleString("es-CL")}`
                : `Base: $${Number(precioPorM2 || 0).toLocaleString("es-CL")}/m2`}
            </strong>
          </div>
        ) : null}
      </div>

      {isLineSelectorOpen ? (
        <div className={s.stepTwoMobileLineSheetOverlay}>
          <button
            className={s.stepTwoMobileLineSheetBackdrop}
            onClick={closeLineSelector}
            type="button"
            aria-label="Cerrar selector"
          />
          <div
            className={`${s.stepTwoMobileLineSheet} ${
              isIphoneViewport ? s.stepTwoMobileLineSheetIphone : ""
            }`}
          >
            <div className={s.stepTwoMobileLineSheetHandle} />
            <div className={s.stepTwoMobileLineSheetHeader}>
              <div className={s.stepTwoMobileLineSheetHeading}>
                <div className={s.stepTwoMobileBlockLabel}>
                  {isGlassProduct ? "Catalogo de cristales" : "Linea comercial"}
                </div>
                <strong className={s.stepTwoMobileLineSheetTitle}>
                  {lineSheetView === "create"
                    ? isGlassProduct
                      ? "Nuevo producto de cristal"
                      : requiresProfileMaterial
                        ? `Nueva linea ${draft.material}`
                        : "Nueva linea"
                    : isGlassProduct ? "Elegir cristal" : "Elegir linea"}
                </strong>
                <span className={s.stepTwoMobileLineSheetSubtitle}>
                  {lineSheetView === "create"
                    ? isGlassProduct
                      ? "Guardalo para usarlo ahora y reutilizarlo en futuras cotizaciones."
                      : "Guardala para usarla ahora y reutilizarla en futuras cotizaciones."
                    : isGlassProduct
                      ? "Mostrando productos de cristal guardados. Usa uno o cotiza con precio manual."
                      : requiresProfileMaterial
                        ? `Mostrando lineas de ${draft.material}. Usa una guardada o cotiza con precio manual.`
                        : "Usa una linea guardada o cotiza con precio manual."}
                </span>
              </div>
              <button className={s.stepTwoMobileLineSheetClose} onClick={closeLineSelector} type="button">
                <LuX aria-hidden />
              </button>
            </div>

            <div className={s.stepTwoMobileLineSheetBody}>
              {lineSheetView === "list" ? (
                <>
                  <div className={s.stepTwoMobileLineSearchWrap}>
                    <LuSearch className={s.stepTwoMobileLineSearchIcon} aria-hidden />
                    <input
                      className={s.stepTwoMobileLineSearchInput}
                      placeholder={isGlassProduct ? "Buscar cristales..." : "Buscar lineas..."}
                      type="text"
                      value={lineSelectorQuery}
                      onChange={(event) => setLineSelectorQuery(event.target.value)}
                    />
                  </div>
                  {requiresProfileMaterial ? (
                    <div className={s.stepTwoMobileLineFilterBanner}>
                      <span
                        className={`${s.stepTwoMobileLineFilterChip} ${
                          draft.material === "PVC"
                            ? s.stepTwoMobileLineFilterChipPvc
                            : s.stepTwoMobileLineFilterChipAluminio
                        }`}
                      >
                        {draft.material}
                      </span>
                      <span className={s.stepTwoMobileLineFilterText}>
                        {filteredLineTemplates.length} linea
                        {filteredLineTemplates.length === 1 ? "" : "s"} disponibles
                      </span>
                    </div>
                  ) : null}
                  <div className={s.stepTwoMobileLineSheetList}>
                    <button
                      className={`${s.stepTwoMobileLineOption} ${s.stepTwoMobileLineOptionUtility} ${!draft.lineTemplateId ? s.stepTwoMobileLineOptionActive : ""}`}
                      onClick={() => {
                        onSelectLineTemplate("");
                        closeLineSelector();
                      }}
                      type="button"
                    >
                      <div className={s.stepTwoMobileLineOptionBody}>
                        <span>{isGlassProduct ? "Precio manual o sin cristal" : "Precio manual o sin linea"}</span>
                        <small>{isGlassProduct ? "Ingresa el valor directo sin aplicar un cristal guardado." : "Ingresa el valor directo sin aplicar una linea guardada."}</small>
                      </div>
                      {!draft.lineTemplateId ? (
                        <span className={s.stepTwoMobileLineOptionState}>Actual</span>
                      ) : null}
                    </button>
                    {filteredLineTemplates.map((template) => (
                      <button
                        key={template.id}
                        className={`${s.stepTwoMobileLineOption} ${draft.lineTemplateId === String(template.id) ? s.stepTwoMobileLineOptionActive : ""}`}
                        onClick={() => handleSelectSavedLine(template)}
                        type="button"
                      >
                        <div className={s.stepTwoMobileLineOptionBody}>
                          <div className={s.stepTwoMobileLineOptionTop}>
                            <span>{template.nombre}</span>
                            <span
                              className={`${s.stepTwoMobileLineOptionMaterialChip} ${
                                template.material === "PVC"
                                  ? s.stepTwoMobileLineOptionMaterialChipPvc
                                  : s.stepTwoMobileLineOptionMaterialChipAluminio
                              }`}
                            >
                              {template.material}
                            </span>
                          </div>
                          <small>
                            {lineTemplateNeedsCommercialPrice(template) ? (
                              <em className={s.stepTwoMobileLinePricePending}>Precio pendiente</em>
                            ) : (
                              <>
                                ${Math.round(template.precioM2Sugerido).toLocaleString("es-CL")}/m2 ·{" "}
                                {template.minimoCobrable > 0
                                  ? `Min. $${Math.round(template.minimoCobrable).toLocaleString("es-CL")}`
                                  : "Sin minimo"}{" "}
                                ·{" "}
                                {template.redondeoPrecio > 0
                                  ? `Redondeo $${Math.round(template.redondeoPrecio).toLocaleString("es-CL")}`
                                  : "Sin redondeo"}
                              </>
                            )}
                          </small>
                        </div>
                        {draft.lineTemplateId === String(template.id) ? (
                          <span className={s.stepTwoMobileLineOptionState}>Actual</span>
                        ) : null}
                      </button>
                    ))}
                    {filteredLineTemplates.length === 0 ? (
                      <div className={s.stepTwoMobileLineEmptyState}>
                        {isGlassProduct ? "No encontramos cristales con ese filtro." : "No encontramos lineas con ese filtro."}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className={s.stepTwoMobileQuickLineForm}>
                  {requiresProfileMaterial ? (
                    <div
                      className={`${s.stepTwoMobileLineFilterChip} ${
                        draft.material === "PVC"
                          ? s.stepTwoMobileLineFilterChipPvc
                          : s.stepTwoMobileLineFilterChipAluminio
                      } ${s.stepTwoMobileQuickLineMaterialBadge}`}
                    >
                      Material: {draft.material}
                    </div>
                  ) : null}

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>Nombre comercial</span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      maxLength={80}
                      placeholder={isGlassProduct ? "Ej: Cristal templado 10 mm" : "Ej: Linea 5000"}
                      type="text"
                      value={quickLineForm.nombre}
                      onChange={(event) => handleQuickLineChange("nombre", event.target.value)}
                    />
                  </label>

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>Precio base / m2</span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      inputMode="numeric"
                      placeholder="Ej: 185.000"
                      type="text"
                      value={
                        quickLineForm.precioM2Sugerido
                          ? formatCurrencyInput(quickLineForm.precioM2Sugerido)
                          : ""
                      }
                      onChange={(event) =>
                        handleQuickLineChange(
                          "precioM2Sugerido",
                          normalizeCurrencyInput(event.target.value)
                        )
                      }
                    />
                  </label>

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>
                      {isGlassProduct ? "Terminacion o descripcion opcional" : "Vidrio usado normalmente"}
                    </span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      placeholder={isGlassProduct ? "Ej: templado, laminado, espejo" : "Ej: Termopanel 4/10/4"}
                      type="text"
                      value={quickLineForm.vidrioPrincipalRecomendado}
                      onChange={(event) =>
                        handleQuickLineChange("vidrioPrincipalRecomendado", event.target.value)
                      }
                    />
                    <span className={s.stepTwoMobileQuickLineHelper}>
                      {isGlassProduct
                        ? "Se guardara como detalle del producto de cristal."
                        : "Este vidrio aparecera primero al cotizar con esta linea."}
                    </span>
                  </label>

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>Mínimo cobrable opcional</span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      inputMode="numeric"
                      placeholder="Ej: 120.000"
                      type="text"
                      value={
                        quickLineForm.minimoCobrable
                          ? formatCurrencyInput(quickLineForm.minimoCobrable)
                          : ""
                      }
                      onChange={(event) =>
                        handleQuickLineChange(
                          "minimoCobrable",
                          normalizeCurrencyInput(event.target.value)
                        )
                      }
                    />
                    <span className={s.stepTwoMobileQuickLineHelper}>
                      Se aplicara cuando el calculo sea menor a este monto.
                    </span>
                  </label>

                  <div className={s.stepTwoMobileQuickLineAdvanced}>
                    <button
                      className={s.stepTwoMobileSecondaryLink}
                      onClick={() => setIsQuickOptionsOpen((current) => !current)}
                      type="button"
                    >
                      {isQuickOptionsOpen ? "Ocultar mas opciones" : "Mas opciones"}
                    </button>

                    {isQuickOptionsOpen ? (
                      <div className={s.stepTwoMobileQuickLineAdvancedBody}>
                        <label className={s.field}>
                          <span className={s.stepTwoMobileQuickLineLabel}>Redondeo del precio</span>
                          <input
                            className={s.stepTwoMobileQuickLineInput}
                            inputMode="numeric"
                            placeholder="Ej: 1.000"
                            type="text"
                            value={
                              quickLineForm.redondeoPrecio
                                ? formatCurrencyInput(quickLineForm.redondeoPrecio)
                                : ""
                            }
                            onChange={(event) =>
                              handleQuickLineChange(
                                "redondeoPrecio",
                                normalizeCurrencyInput(event.target.value)
                              )
                            }
                          />
                        </label>

                        <label className={s.stepTwoMobileQuickLineCheckbox}>
                          <input
                            checked={quickLineForm.isActive}
                            type="checkbox"
                            onChange={(event) =>
                              handleQuickLineChange("isActive", event.target.checked)
                            }
                          />
                          <span>Activa para cotizar</span>
                        </label>
                      </div>
                    ) : null}
                  </div>

                  {quickLineError ? (
                    <div className={s.stepTwoMobileQuickLineError}>{quickLineError}</div>
        ) : null}

        {quotePricingMode === "total_global" ? (
          <>
            <div className={s.stepTwoMobileBlockSecundario}>
              <div className={s.stepTwoMobileBlockLabel}>DETALLES INCLUIDOS</div>
              <span className={s.stepTwoMobileBlockHelp}>
                Manual para texto libre. Estructurado para reutilizar croquis en PDF.
              </span>
            </div>

            {draft.alcanceDetalles.map((detalle, idx) => (
              <div key={detalle.id} className={s.alcanceDetalleCard}>
                <div className={s.alcanceDetalleHeader}>
                  <span className={s.alcanceDetalleIndex}>
                    {detalle.nombre.trim() || `Detalle ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    className={s.iconButton}
                    onClick={() => onRemoveAlcanceDetalle(detalle.id)}
                    aria-label="Eliminar detalle"
                  >
                    <LuX aria-hidden size={14} />
                  </button>
                </div>
                <div className={s.stepTwoMobileChoiceChips}>
                  <button
                    type="button"
                    className={`${s.stepTwoMobileChoiceChip} ${
                      detalle.tipo === "manual" ? s.stepTwoMobileChoiceChipActive : ""
                    }`}
                    onClick={() => onUpdateAlcanceDetalle(detalle.id, "tipo", "manual")}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    className={`${s.stepTwoMobileChoiceChip} ${
                      detalle.tipo === "estructurado" ? s.stepTwoMobileChoiceChipActive : ""
                    }`}
                    onClick={() => onUpdateAlcanceDetalle(detalle.id, "tipo", "estructurado")}
                  >
                    Estructurado
                  </button>
                </div>
                {detalle.tipo === "estructurado" ? (
                  <>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Componente</span>
                      <div className={s.selectWrap}>
                        <select
                          className={s.input}
                          value={detalle.subtipo || ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS[0]}
                          onChange={(event) =>
                            onUpdateAlcanceDetalle(detalle.id, "subtipo", event.target.value)
                          }
                        >
                          {ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <div className={s.alcanceDetalleGrid}>
                      <label className={s.stepTwoMobileInlineField}>
                        <span className={s.label}>Cantidad</span>
                        <input
                          className={s.input}
                          inputMode="numeric"
                          placeholder="1"
                          value={detalle.cantidad}
                          onChange={(e) =>
                            onUpdateAlcanceDetalle(detalle.id, "cantidad", e.target.value)
                          }
                        />
                      </label>
                      <label className={s.stepTwoMobileInlineField}>
                        <span className={s.label}>Ancho (mm)</span>
                        <input
                          className={s.input}
                          inputMode="numeric"
                          placeholder="1500"
                          value={detalle.ancho}
                          onChange={(e) =>
                            onUpdateAlcanceDetalle(detalle.id, "ancho", e.target.value)
                          }
                        />
                      </label>
                      <label className={s.stepTwoMobileInlineField}>
                        <span className={s.label}>Alto (mm)</span>
                        <input
                          className={s.input}
                          inputMode="numeric"
                          placeholder="2000"
                          value={detalle.alto}
                          onChange={(e) =>
                            onUpdateAlcanceDetalle(detalle.id, "alto", e.target.value)
                          }
                        />
                      </label>
                    </div>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Etiqueta visible</span>
                      <input
                        className={s.input}
                        placeholder="Ej: 3 ventanas correderas 1500 x 2000"
                        type="text"
                        value={detalle.nombre}
                        onChange={(e) =>
                          onUpdateAlcanceDetalle(detalle.id, "nombre", e.target.value)
                        }
                      />
                    </label>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Nota opcional</span>
                      <input
                        className={s.input}
                        placeholder="Ej: Con retiro de marco existente"
                        type="text"
                        value={detalle.descripcion}
                        onChange={(e) =>
                          onUpdateAlcanceDetalle(detalle.id, "descripcion", e.target.value)
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Nombre</span>
                      <input
                        className={s.input}
                        placeholder="Ej: Sellado perimetral"
                        type="text"
                        value={detalle.nombre}
                        onChange={(e) =>
                          onUpdateAlcanceDetalle(detalle.id, "nombre", e.target.value)
                        }
                      />
                    </label>
                    <label className={s.stepTwoMobileInlineField}>
                      <span className={s.label}>Descripcion</span>
                      <input
                        className={s.input}
                        placeholder="Ej: Sellado interior y exterior"
                        type="text"
                        value={detalle.descripcion}
                        onChange={(e) =>
                          onUpdateAlcanceDetalle(detalle.id, "descripcion", e.target.value)
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            ))}

            <button
              type="button"
              className={s.btnGhost}
              onClick={() => onAddAlcanceDetalle()}
            >
              + Agregar detalle
            </button>

            <div className={s.stepTwoMobileBlockHero}>
              <div className={s.stepTwoMobileBlockLabel}>PRECIO FINAL</div>
              <label className={s.stepTwoMobileInlineField}>
                <input
                  className={`${s.stepTwoMobilePrecioInput} ${s.stepTwoMobileFinalPriceInput}`}
                  inputMode="numeric"
                  placeholder="Ej: 600.000"
                  type="text"
                  value={globalTotalInputValue}
                  onChange={(event) => onGlobalTotalClienteChange(event.target.value)}
                />
              </label>
            </div>

            <div className={s.stepTwoMobileBlockSecundario}>
              {!isInternalObservationOpen ? (
                <button
                  type="button"
                  className={s.stepTwoMobileSecondaryLink}
                  onClick={() => setIsInternalObservationOpen(true)}
                >
                  + Agregar observacion interna
                </button>
              ) : (
                <label className={s.stepTwoMobileInlineField}>
                  <div className={s.stepTwoMobileBlockHeaderInline}>
                    <span className={s.label}>Observacion interna</span>
                    <button
                      type="button"
                      className={s.stepTwoMobileSecondaryLink}
                      onClick={() => setIsInternalObservationOpen(false)}
                    >
                      Ocultar
                    </button>
                  </div>
                  <textarea
                    className={s.textarea}
                    maxLength={FIELD_LIMITS.observaciones}
                    placeholder="Uso interno. No sale en el PDF."
                    rows={3}
                    value={internalObservation}
                    onChange={(event) => onInternalObservationChange(event.target.value)}
                  />
                </label>
              )}
            </div>
          </>
        ) : null}
      </div>
              )}
            </div>

            <div className={s.stepTwoMobileLineSheetFooter}>
              {lineSheetView === "list" ? (
                <button
                  className={`${s.btnPrimary} ${s.stepTwoMobileLineSheetPrimaryAction}`}
                  onClick={openQuickLineForm}
                  type="button"
                >
                  {isGlassProduct ? "Nuevo cristal" : "Nueva linea"}
                </button>
              ) : (
                <>
                  <button
                    className={`${s.btnGhost} ${s.stepTwoMobileLineSheetSecondaryAction}`}
                    onClick={returnToLineSelector}
                    type="button"
                  >
                    <LuChevronLeft aria-hidden />
                    Volver
                  </button>
                  <button
                    className={`${s.btnPrimary} ${s.stepTwoMobileLineSheetPrimaryAction}`}
                    disabled={isSavingLineTemplate}
                    onClick={() => {
                      void handleSaveAndUseQuickLine();
                    }}
                    type="button"
                  >
                    {isSavingLineTemplate ? "Guardando..." : "Guardar y usar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {requiresProfileMaterial ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockHeaderInline}>
            <div className={s.stepTwoMobileBlockLabel}>Color perfil</div>
            {colorOptions.length > primaryColorOptions.length ? (
              <button
                className={s.stepTwoMobileSecondaryLink}
                onClick={() => setShowAllColors((current) => !current)}
                type="button"
              >
                {showAllColors ? "Menos opciones" : "Mas opciones"}
              </button>
            ) : null}
          </div>

          <div className={s.stepTwoMobileColorGridCompact}>
            {visibleColorOptions.map((option) => (
              <button
                key={option.hex}
                className={`${s.stepTwoMobileColorPill} ${draft.colorHex.toLowerCase() === option.hex.toLowerCase() ? s.stepTwoMobileColorPillActive : ""}`}
                onClick={() => onColorChange(option.hex)}
                type="button"
              >
                <span
                  className={s.stepTwoMobileColorSwatch}
                  style={{ backgroundColor: option.hex }}
                  aria-hidden
                />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={s.stepTwoMobileBlockHero}>
        <div className={s.stepTwoMobileBlockLabel}>Medidas</div>
        <div className={s.stepTwoMobileMedidasRow}>
          <div className={s.stepTwoMobileMedidaField}>
            <label className={s.stepTwoMobileMedidaLabel} htmlFor="grupo-ancho">
              Ancho (mm)
            </label>
            <input
              className={s.stepTwoMobileMedidaInput}
              id="grupo-ancho"
              inputMode="numeric"
              placeholder="1200"
              type="text"
              value={draft.ancho}
              onChange={(event) => onAnchoChange(event.target.value)}
            />
          </div>

          <div className={s.stepTwoMobileBlockX}>x</div>

          <div className={s.stepTwoMobileMedidaField}>
            <label className={s.stepTwoMobileMedidaLabel} htmlFor="grupo-alto">
              Alto (mm)
            </label>
            <input
              className={s.stepTwoMobileMedidaInput}
              id="grupo-alto"
              inputMode="numeric"
              placeholder="1500"
              type="text"
              value={draft.alto}
              onChange={(event) => onAltoChange(event.target.value)}
            />
          </div>
        </div>
      </div>

      {quotePricingMode === "por_item" ? (
        <PasoDosWizardPrecioMovil
          activePricingMode={activePricingMode}
          costInputScope={draft.costInputScope}
          formattedPriceValue={formattedPriceValue}
          marginValue={draft.margenPct}
          onCostInputScopeChange={onCostInputScopeChange}
          onMargenChange={onMargenChange}
          onPrecioChange={onPrecioChange}
          onPricingModeChange={onPricingModeChange}
          priceHelp={priceHelp}
          priceLabel={priceLabel}
        />
      ) : null}

      {isGlassProduct && draft.lineTemplateId ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockHeaderInline}>
            <div>
              <div className={s.stepTwoMobileBlockLabel}>Producto / tipo de vidrio</div>
              <span className={s.stepTwoMobileBlockHelp}>
                Este nombre se guarda en la cotizacion y se muestra en el PDF.
              </span>
            </div>
            <button
              className={s.stepTwoMobileSecondaryLink}
              onClick={openLineSelector}
              type="button"
            >
              Cambiar
            </button>
          </div>
          <div className={s.quickPreviewCard}>
            <div className={s.quickPreviewBody}>
              <strong>{draft.vidrio || selectedLineLabel}</strong>
              <span>
                {[draft.catalogEspesor, draft.catalogTerminacion].filter(Boolean).join(" · ") ||
                  "Producto de cristal seleccionado"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <PasoDosWizardVidrioMovil
          canCreateCustomGlass={canCreateCustomGlass}
          currentGlass={draft.vidrio}
          glassCatalogGroups={glassCatalogGroups}
          isRecommendedGlass={isRecommendedGlass}
          onCreateCustomGlass={onCreateCustomGlass}
          onSetVidSearch={onSetVidSearch}
          onVidrioChange={onVidrioChange}
          recommendedReason={recommendedReason}
          recommendedVidrios={recommendedVidrios}
          searchResults={searchResults}
          subtipo={draft.subtipo}
          vidSearch={vidSearch}
        />
      )}

      {priceEditorTarget && organizacionId ? (
        <LinePriceEditor
          template={priceEditorTarget}
          organizationId={organizacionId}
          onSaved={(updated) => {
            setPriceEditorTarget(null);
            onApplyCreatedLineTemplate(updated);
            closeLineSelector();
          }}
          onClose={() => setPriceEditorTarget(null)}
        />
      ) : null}
    </div>
  );
}
