"use client";

import { useMemo, useState } from "react";
import { LuX } from "react-icons/lu";

import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type {
  CotizacionLineTemplate,
  CreateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { ComponentFormLinePricingSummary } from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  ALUMINUM_COLOR_OPTIONS,
  buildGlassValue,
  formatCurrencyInput,
  GLASS_OPTIONS,
  PVC_COLOR_OPTIONS,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  getGlassRecommendations,
  isRecommendedGlass,
} from "@/features/cotizaciones/services/glass-recommendations.service";
import { isFreeValueComponentType } from "@/features/cotizaciones/services/component-catalog.service";
import { generateComponentSVG } from "@/utils/window-drawings";

import type {
  PasoDosFormularioComponenteProps,
  PasoDosItemLibreFormProps,
} from "../../_types/paso-dos";
import type { PasoDosGrupoDraft, AlcanceDetalle } from "../../_hooks/use-paso-dos-agregar-grupo";
import type { PasoDosGrupoPasoMovil } from "../../_hooks/use-paso-dos-agregar-grupo-movil";
import {
  getSubtypeOptionsForCategory,
  shouldHideFreeNotebookCategoryInWizard,
  shouldSkipCantidadForGrupoDraft,
  type PasoDosGrupoEntryMode,
} from "../../_hooks/use-paso-dos-agregar-grupo";
import {
  filterVidrios,
  getColorByMaterial,
  getStageTitle,
  sortGlassOptions,
} from "./paso-dos-wizard-movil.utils";
import { buildPasoDosWizardMovilState } from "./paso-dos-wizard-movil.state";
import { PasoDosListaMovil } from "./paso-dos-lista-movil";
import { PasoDosVariacionRapidaMovil } from "./paso-dos-variacion-rapida-movil";
import { PasoDosWizardCantidadMovil } from "./paso-dos-wizard-cantidad-movil";
import { PasoDosWizardEncabezadoMovil } from "./paso-dos-wizard-encabezado-movil";
import { PasoDosWizardConfiguracionMovil } from "./paso-dos-wizard-configuracion-movil";
import { PasoDosWizardFooterMovil } from "./paso-dos-wizard-footer-movil";
import { PasoDosWizardTipoMovil } from "./paso-dos-wizard-tipo-movil";
import { PasoDosModoCotizacion } from "./paso-dos-modo-cotizacion";
import { PasoDosFormularioComponente } from "../paso-dos-formulario-componente";
import { PasoDosFormularioAcciones } from "./paso-dos-formulario-acciones";
import { PasoDosItemLibreForm } from "./paso-dos-item-libre-form";
import s from "../../page.module.css";

export type WizardActions = {
  isOpen: boolean;
  paso: PasoDosGrupoPasoMovil;
  entryMode: PasoDosGrupoEntryMode;
  draft: PasoDosGrupoDraft;
  subtypeOptions: readonly string[];
  systemOptions: readonly string[];
  configurationOptions: readonly string[];
  glassOptions: readonly string[];
  visibleLineTemplates: readonly CotizacionLineTemplate[];
  linePricingSummary: ComponentFormLinePricingSummary;
  isSavingLineTemplate: boolean;
  onOpen: () => void;
  onOpenFreeTotalNotebook: () => void;
  onClose: () => void;
  onGoToStep: (paso: PasoDosGrupoPasoMovil) => void;
  onBack: () => void;
  onNext: () => void;
  onConfirm: () => void;
  onSelectCategoria: (categoria: PasoDosGrupoDraft["categoria"]) => void;
  onSelectSubtipo: (subtipo: string) => void;
  onSelectCantidad: (cantidad: number) => void;
  onCantidadChange: (value: string) => void;
  onMaterialChange: (material: PasoDosGrupoDraft["material"]) => void;
  onNombreChange: (value: string) => void;
  onDescripcionChange: (value: string) => void;
  onSelectLineTemplate: (templateId: string) => void;
  onApplyCreatedLineTemplate: (template: CotizacionLineTemplate) => void;
  onCreateLineTemplate: (
    input: Omit<CreateCotizacionLineTemplateInput, "organizationId">
  ) => Promise<CotizacionLineTemplate>;
  onColorChange: (colorHex: string) => void;
  onSistemaChange: (value: string) => void;
  onConfiguracionChange: (value: string) => void;
  onPalilloEnabledChange: (enabled: boolean) => void;
  onPalilloTypeChange: (palilloType: string) => void;
  onCostInputScopeChange: (scope: "group_total" | "unit") => void;
  onSheetSchemeChange: (value: string) => void;
  onSheetVariantChange: (value: string) => void;
  onCustomSchemeDescriptionChange: (value: string) => void;
  onVidrioChange: (value: string) => void;
  onAnchoChange: (value: string) => void;
  onAltoChange: (value: string) => void;
  onPrecioChange: (value: string) => void;
  onPricingModeChange: (mode: PricingMode) => void;
  onMargenChange: (value: string) => void;
  onCobraPrecioSeparadoChange: (value: boolean) => void;
  onAddAlcanceDetalle: (initialNombre?: string) => void;
  onUpdateAlcanceDetalle: (detalleId: string, field: keyof AlcanceDetalle, value: string) => void;
  onRemoveAlcanceDetalle: (detalleId: string) => void;
};

type Props = {
  formulario: PasoDosFormularioComponenteProps;
  itemLibreForm: PasoDosItemLibreFormProps;
  items: CotizacionWorkflowItem[];
  subtotal: string;
  total: string;
  pricingMode: PricingMode;
  adjustedItems: Record<string, string>;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  internalObservation: string;
  variationQuickEdit: {
    baseCode: string;
    tipo: string;
    totalItems: number;
    priceLabel: string;
    items: Array<{
      id: string;
      label: string;
      ancho: string;
      alto: string;
      precio: string;
      sistema: string;
    }>;
    systemOptions: readonly string[];
  } | null;
  onGoToSummary: () => void;
  onVariationQuickEditChange: (
    itemId: string,
    key: "ancho" | "alto" | "precio" | "sistema",
    value: string
  ) => void;
  onEditVariationFull: (itemId: string) => void;
  onCloseVariationQuickEdit: () => void;
  onEditItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenFreeValueItemForm: () => void;
  wizard: WizardActions;
  quoteModeChosen: boolean;
  onGlobalTotalClienteChange: (value: string) => void;
  onMostrarIvaChange: () => void;
  onInternalObservationChange: (value: string) => void;
};

const CATEGORY_OPTIONS: Array<{
  title: PasoDosGrupoDraft["categoria"];
  subtitle: string;
  countLabel: string;
}> = [
  {
    title: "Aberturas",
    subtitle: "Ventanas, puertas y paños fijos",
    countLabel: `${getSubtypeOptionsForCategory("Aberturas").length} tipos`,
  },
  {
    title: "Cierres y exteriores",
    subtitle: "Terrazas, logias y barandas",
    countLabel: `${getSubtypeOptionsForCategory("Cierres y exteriores").length} tipos`,
  },
  {
    title: "Interiores y decoracion",
    subtitle: "Espejos y cubiertas",
    countLabel: `${getSubtypeOptionsForCategory("Interiores y decoracion").length} tipos`,
  },
  {
    title: "Especiales",
    subtitle: "Proyectos fuera de catalogo",
    countLabel: `${getSubtypeOptionsForCategory("Especiales").length} tipos`,
  },
  {
    title: "Proyecto libre y Mantencion",
    subtitle: "Reparaciones, cambios de vidrio, mantenciones, sellados y trabajos personalizados",
    countLabel: `${getSubtypeOptionsForCategory("Proyecto libre y Mantencion").length} tipo`,
  },
];

const QUICK_QUANTITIES = [1, 2, 4, 6] as const;

const VISUAL_STAGES = [
  { id: 1, label: "Tipo" },
  { id: 2, label: "Cantidad" },
  { id: 3, label: "Datos" },
] as const;

const VISUAL_STAGES_FREE_VALUE = [
  { id: 1, label: "Tipo", paso: 1 as const },
  { id: 2, label: "Datos", paso: 3 as const },
] as const;

const VISUAL_STAGES_FREE_TOTAL_SINGLE = [{ id: 3, label: "Datos" }] as const;

export function PasoDosWizardMovil({
  formulario,
  itemLibreForm,
  items,
  subtotal,
  total,
  pricingMode,
  adjustedItems,
  totalClienteManual,
  mostrarIva,
  internalObservation,
  variationQuickEdit,
  onGoToSummary,
  onVariationQuickEditChange,
  onEditVariationFull,
  onCloseVariationQuickEdit,
  onEditItem,
  onRemoveItem,
  onOpenFreeValueItemForm,
  wizard,
  quoteModeChosen,
  onGlobalTotalClienteChange,
  onMostrarIvaChange,
  onInternalObservationChange,
}: Props) {
  const [showAllSystems, setShowAllSystems] = useState(false);
  const [showAllConfigurations, setShowAllConfigurations] = useState(false);
  const [vidSearch, setVidSearch] = useState("");

  const quotePricingMode = formulario.quotePricingMode;
  const isCompactDataStep = wizard.paso === 3;
  const visualStage = wizard.paso;
  const normalizedCategoryOptions = useMemo(() => {
    const base = CATEGORY_OPTIONS.map((option) => ({
      ...option,
      subtitle: option.subtitle.replace("paÃ±os", "paños"),
    }));

    if (shouldHideFreeNotebookCategoryInWizard(quotePricingMode, wizard.entryMode)) {
      return base.filter((option) => option.title !== "Proyecto libre y Mantencion");
    }

    return base;
  }, [quotePricingMode, wizard.entryMode]);

  const resetLocalWizardState = () => {
    setShowAllSystems(false);
    setShowAllConfigurations(false);
    setVidSearch("");
  };

  const handleOpenWizard = () => {
    resetLocalWizardState();
    wizard.onOpen();
  };

  const handleSelectModeAndOpen = (mode: typeof quotePricingMode) => {
    formulario.onQuotePricingModeChange(mode);
    if (mode === "por_item") {
      handleOpenWizard();
    }
  };

  const handleSelectFreeTotalMode = () => {
    formulario.onQuotePricingModeChange("total_global");
    resetLocalWizardState();
    wizard.onOpenFreeTotalNotebook();
  };

  const handleCloseWizard = () => {
    resetLocalWizardState();
    wizard.onClose();
  };

  const subtypePreviewMarkup = useMemo(
    () =>
      Object.fromEntries(
        wizard.subtypeOptions.map((subtipo) => [
          subtipo,
          generateComponentSVG({
            tipo: subtipo,
            sistema: wizard.draft.subtipo === subtipo ? wizard.draft.sistema : undefined,
            configuracion: wizard.draft.subtipo === subtipo ? wizard.draft.configuracion : undefined,
            ancho: null,
            alto: null,
            colorHex: wizard.draft.colorHex || getColorByMaterial(wizard.draft.material),
            maxW: 62,
            maxH: 54,
          }),
        ])
      ),
    [
      wizard.draft.colorHex,
      wizard.draft.configuracion,
      wizard.draft.material,
      wizard.draft.sistema,
      wizard.draft.subtipo,
      wizard.subtypeOptions,
    ]
  );

  const isSingleStepFreeTotal = wizard.entryMode === "free_total_single";
  const shouldSkipCantidadStep =
    isSingleStepFreeTotal || shouldSkipCantidadForGrupoDraft(wizard.draft);
  const wizardStages = isSingleStepFreeTotal
    ? VISUAL_STAGES_FREE_TOTAL_SINGLE
    : shouldSkipCantidadStep
      ? VISUAL_STAGES_FREE_VALUE
      : VISUAL_STAGES;

  const {
    activePricingMode,
    cantidadDisplayValue,
    canContinueFromQuantity,
    canSubmitGroup,
    priceHelp,
    priceLabel,
  } = buildPasoDosWizardMovilState({
    draft: wizard.draft,
    pricingMode,
    quotePricingMode,
  });
  const effectiveCanSubmitGroup =
    quotePricingMode === "total_global"
      ? canSubmitGroup && (totalClienteManual ?? 0) > 0
      : canSubmitGroup;
  const formattedPriceValue = formatCurrencyInput(wizard.draft.precio);
  const visibleLineTemplates = wizard.visibleLineTemplates;

  const orderedGlassOptions = useMemo(
    () => sortGlassOptions(wizard.glassOptions),
    [wizard.glassOptions]
  );

  const glassRecommendation = useMemo(
    () =>
      getGlassRecommendations(
        {
          subtipo: wizard.draft.subtipo,
          sistema: wizard.draft.sistema,
          lineTemplateRecommendedGlass:
            visibleLineTemplates.find(
              (template) => String(template.id) === wizard.draft.lineTemplateId
            )?.vidrioPrincipalRecomendado ?? null,
        },
        orderedGlassOptions
      ),
    [orderedGlassOptions, visibleLineTemplates, wizard.draft.lineTemplateId, wizard.draft.sistema, wizard.draft.subtipo]
  );

  const searchResults = useMemo(
    () => filterVidrios(vidSearch, orderedGlassOptions),
    [vidSearch, orderedGlassOptions]
  );
  const glassCatalogGroups = useMemo(
    () =>
      GLASS_OPTIONS.map((group) => ({
        grupo: group.grupo,
        options: sortGlassOptions(
          group.items.map((item) => buildGlassValue(group.prefix, item))
        ),
      })),
    []
  );

  const visibleSystemOptions = wizard.systemOptions.slice(0, 3);
  const displaySystemOptions = showAllSystems
    ? wizard.systemOptions
    : visibleSystemOptions;
  const visibleConfigurationOptions = wizard.configurationOptions.slice(
    0,
    wizard.draft.subtipo === "Puerta" ? 6 : 3
  );
  const displayConfigurationOptions = showAllConfigurations
    ? wizard.configurationOptions
    : visibleConfigurationOptions;
  const materialColorOptions =
    wizard.draft.material === "PVC" ? PVC_COLOR_OPTIONS : ALUMINUM_COLOR_OPTIONS;

  const footerMarkup = (
    <PasoDosWizardFooterMovil
      canContinueFromQuantity={canContinueFromQuantity}
      canSubmitGroup={effectiveCanSubmitGroup}
      isCompactDataStep={isCompactDataStep}
      isFreeValueItem={isFreeValueComponentType(wizard.draft.subtipo)}
      isTotalGlobal={quotePricingMode === "total_global"}
      precioFormateado={formatCurrencyInput(wizard.draft.precio)}
      onBack={wizard.onBack}
      onClose={handleCloseWizard}
      onConfirm={wizard.onConfirm}
      onNext={wizard.onNext}
      isSingleStepFreeTotal={isSingleStepFreeTotal}
      visualStage={visualStage}
      wizardStep={wizard.paso}
    />
  );

  if (variationQuickEdit) {
    return (
      <PasoDosVariacionRapidaMovil
        baseCode={variationQuickEdit.baseCode}
        tipo={variationQuickEdit.tipo}
        totalItems={variationQuickEdit.totalItems}
        priceLabel={variationQuickEdit.priceLabel}
        items={variationQuickEdit.items}
        systemOptions={variationQuickEdit.systemOptions}
        onDraftChange={onVariationQuickEditChange}
        onEditFull={onEditVariationFull}
        onClose={onCloseVariationQuickEdit}
      />
    );
  }

  if (formulario.editingItemId) {
    return (
      <section className={`${s.stepTwoMobileExperience} ${s.stepTwoMobilePointEditShell}`}>
        <div className={s.stepTwoMobileEditingHeader}>
          <div>
            <span className={s.cardLabel}>Paso 2 / Edicion puntual</span>
            <h2 className={s.stepTwoMobileTitle}>Editar componente</h2>
            <p className={s.stepTwoMobileSubtle}>
              {formulario.componentForm.codigo.trim()
                ? `${formulario.componentForm.codigo} · ${formulario.componentForm.tipo}`
                : formulario.componentForm.tipo}
            </p>
          </div>
          <button
            className={s.stepTwoMobileHeaderAction}
            onClick={formulario.onResetStep2Form}
            type="button"
            aria-label="Volver a la lista"
          >
            <LuX aria-hidden />
          </button>
        </div>
        <div className={s.stepTwoMobilePointEditScroll}>
          <PasoDosFormularioComponente {...formulario} variant="mobilePointEdit" />
        </div>
        <PasoDosFormularioAcciones {...formulario} variant="mobilePointEdit" />
      </section>
    );
  }

  if (itemLibreForm.isOpen) {
    return (
      <section className={s.stepTwoMobileExperience}>
        <PasoDosItemLibreForm {...itemLibreForm} />
      </section>
    );
  }

  return (
    <section className={s.stepTwoMobileExperience}>
      {!wizard.isOpen && items.length === 0 && !quoteModeChosen ? (
        <PasoDosModoCotizacion
          onSelectMode={handleSelectModeAndOpen}
          onSelectFreeTotalMode={handleSelectFreeTotalMode}
        />
      ) : (
        <PasoDosListaMovil
          isWizardOpen={wizard.isOpen}
          items={items}
          subtotal={subtotal}
          total={total}
          quotePricingMode={quotePricingMode}
          totalClienteManual={totalClienteManual}
          mostrarIva={mostrarIva}
          adjustedItems={adjustedItems}
          onEditItem={onEditItem}
          onGoToSummary={onGoToSummary}
          onOpenWizard={handleOpenWizard}
          onOpenFreeValueItemForm={onOpenFreeValueItemForm}
          onRemoveItem={onRemoveItem}
          onSaveAndExit={formulario.onSaveAndExit}
        />
      )}

      {wizard.isOpen ? (
        <div className={s.stepTwoMobileCreatorOverlay}>
          <div
            className={`${s.stepTwoMobileCreatorShell} ${
              isCompactDataStep ? s.stepTwoMobileCreatorShellCompact : ""
            }`}
          >
            <PasoDosWizardEncabezadoMovil
              stages={wizardStages}
              hideStages={isSingleStepFreeTotal}
              centerStages={wizardStages.length === 2}
              visualStage={visualStage}
              title={
                isSingleStepFreeTotal
                  ? "Cotiza libre por total"
                  : shouldSkipCantidadStep && quotePricingMode === "total_global" && visualStage === 3
                    ? "Datos del trabajo"
                    : getStageTitle(visualStage)
              }
              subtitle={
                isSingleStepFreeTotal
                  ? "Describe el trabajo, agrega detalles y define el precio final."
                  : visualStage === 1
                    ? "Elige el tipo base del componente."
                    : visualStage === 2
                      ? "Indica cuantas unidades iguales van en este grupo."
                      : shouldSkipCantidadStep
                        ? "Redacta el trabajo y define el valor."
                        : quotePricingMode === "total_global"
                          ? "Completa datos comerciales y precio final antes de agregar."
                          : "Completa sistema, medidas y valor antes de agregar."
              }
              onClose={handleCloseWizard}
              onGoToStep={wizard.onGoToStep}
            />

            <div
              className={`${s.stepTwoMobileCreatorBody} ${
                isCompactDataStep ? s.stepTwoMobileCreatorBodyCompact : ""
              }`}
            >
              {visualStage === 1 ? (
                <PasoDosWizardTipoMovil
                  categoryOptions={normalizedCategoryOptions}
                  draft={wizard.draft}
                  subtypeOptions={wizard.subtypeOptions}
                  subtypePreviewMarkup={subtypePreviewMarkup}
                  onSelectCategoria={wizard.onSelectCategoria}
                  onSelectSubtipo={wizard.onSelectSubtipo}
                />
              ) : null}

              {visualStage === 2 ? (
                <PasoDosWizardCantidadMovil
                  cantidadDisplayValue={cantidadDisplayValue}
                  draft={wizard.draft}
                  quickQuantities={QUICK_QUANTITIES}
                  onCantidadChange={wizard.onCantidadChange}
                  onSelectCantidad={wizard.onSelectCantidad}
                />
              ) : null}

              {wizard.paso === 3 ? (
                <PasoDosWizardConfiguracionMovil
                  activePricingMode={activePricingMode}
                  colorOptions={materialColorOptions}
                  draft={wizard.draft}
                  displayConfigurationOptions={displayConfigurationOptions}
                  displaySystemOptions={displaySystemOptions}
                  formattedPriceValue={formattedPriceValue}
                  glassCatalogGroups={glassCatalogGroups}
                  isRecommendedGlass={(option) =>
                    isRecommendedGlass(option, glassRecommendation.recommendedOptions)
                  }
                  linePricingSummary={wizard.linePricingSummary}
                  lineTemplateOptions={visibleLineTemplates}
                  isSavingLineTemplate={wizard.isSavingLineTemplate}
                  onAltoChange={wizard.onAltoChange}
                  onAnchoChange={wizard.onAnchoChange}
                  onApplyCreatedLineTemplate={wizard.onApplyCreatedLineTemplate}
                  onCreateLineTemplate={wizard.onCreateLineTemplate}
                  onMargenChange={wizard.onMargenChange}
                  onMaterialChange={wizard.onMaterialChange}
                  onNombreChange={wizard.onNombreChange}
                  onDescripcionChange={wizard.onDescripcionChange}
                  onSelectLineTemplate={wizard.onSelectLineTemplate}
                  onColorChange={wizard.onColorChange}
                  onConfiguracionChange={wizard.onConfiguracionChange}
                  onPalilloEnabledChange={wizard.onPalilloEnabledChange}
                  onPalilloTypeChange={wizard.onPalilloTypeChange}
                  onCostInputScopeChange={wizard.onCostInputScopeChange}
                  onSheetSchemeChange={wizard.onSheetSchemeChange}
                  onSheetVariantChange={wizard.onSheetVariantChange}
                  onCustomSchemeDescriptionChange={wizard.onCustomSchemeDescriptionChange}
                  onPrecioChange={wizard.onPrecioChange}
                  onPricingModeChange={wizard.onPricingModeChange}
                  onCobraPrecioSeparadoChange={wizard.onCobraPrecioSeparadoChange}
                  onSistemaChange={wizard.onSistemaChange}
                  onVidrioChange={wizard.onVidrioChange}
                  onAddAlcanceDetalle={wizard.onAddAlcanceDetalle}
                  onUpdateAlcanceDetalle={wizard.onUpdateAlcanceDetalle}
                  onRemoveAlcanceDetalle={wizard.onRemoveAlcanceDetalle}
                  quotePricingMode={quotePricingMode}
                  totalClienteManual={totalClienteManual}
                  mostrarIva={mostrarIva}
                  internalObservation={internalObservation}
                  onGlobalTotalClienteChange={onGlobalTotalClienteChange}
                  onMostrarIvaChange={onMostrarIvaChange}
                  onInternalObservationChange={onInternalObservationChange}
                  priceHelp={priceHelp}
                  priceLabel={priceLabel}
                  recommendedReason={glassRecommendation.reason}
                  recommendedVidrios={glassRecommendation.recommendedOptions}
                  searchResults={searchResults}
                  showAllSystems={showAllSystems}
                  showAllConfigurations={showAllConfigurations}
                  showConfigurationToggle={
                    wizard.configurationOptions.length > visibleConfigurationOptions.length
                  }
                  showSystemToggle={
                    wizard.systemOptions.length > visibleSystemOptions.length
                  }
                  vidSearch={vidSearch}
                  onSetShowAllConfigurations={setShowAllConfigurations}
                  onSetShowAllSystems={setShowAllSystems}
                  onSetVidSearch={setVidSearch}
                />
              ) : null}

              {isCompactDataStep ? footerMarkup : null}
            </div>

            {!isCompactDataStep ? footerMarkup : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
