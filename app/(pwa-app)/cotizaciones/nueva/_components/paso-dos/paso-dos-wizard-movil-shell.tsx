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
import { generateComponentSVG } from "@/utils/window-drawings";

import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";
import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import type { PasoDosGrupoPasoMovil } from "../../_hooks/use-paso-dos-agregar-grupo-movil";
import { getSubtypeOptionsForCategory } from "../../_hooks/use-paso-dos-agregar-grupo";
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
import { PasoDosFormularioComponente } from "../paso-dos-formulario-componente";
import s from "../../page.module.css";

export type WizardActions = {
  isOpen: boolean;
  paso: PasoDosGrupoPasoMovil;
  draft: PasoDosGrupoDraft;
  subtypeOptions: readonly string[];
  systemOptions: readonly string[];
  configurationOptions: readonly string[];
  glassOptions: readonly string[];
  visibleLineTemplates: readonly CotizacionLineTemplate[];
  linePricingSummary: ComponentFormLinePricingSummary;
  isSavingLineTemplate: boolean;
  onOpen: () => void;
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
  onSelectLineTemplate: (templateId: string) => void;
  onApplyCreatedLineTemplate: (template: CotizacionLineTemplate) => void;
  onCreateLineTemplate: (
    input: Omit<CreateCotizacionLineTemplateInput, "organizationId">
  ) => Promise<CotizacionLineTemplate>;
  onColorChange: (colorHex: string) => void;
  onSistemaChange: (value: string) => void;
  onConfiguracionChange: (value: string) => void;
  onVidrioChange: (value: string) => void;
  onAnchoChange: (value: string) => void;
  onAltoChange: (value: string) => void;
  onPrecioChange: (value: string) => void;
  onPricingModeChange: (mode: PricingMode) => void;
  onMargenChange: (value: string) => void;
};

type Props = {
  formulario: PasoDosFormularioComponenteProps;
  items: CotizacionWorkflowItem[];
  subtotal: string;
  total: string;
  pricingMode: PricingMode;
  adjustedItems: Record<string, string>;
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
  wizard: WizardActions;
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
];

const QUICK_QUANTITIES = [1, 2, 4, 6] as const;

const VISUAL_STAGES = [
  { id: 1, label: "Tipo" },
  { id: 2, label: "Cantidad" },
  { id: 3, label: "Datos" },
] as const;

export function PasoDosWizardMovil({
  formulario,
  items,
  subtotal,
  total,
  pricingMode,
  adjustedItems,
  variationQuickEdit,
  onGoToSummary,
  onVariationQuickEditChange,
  onEditVariationFull,
  onCloseVariationQuickEdit,
  onEditItem,
  onRemoveItem,
  wizard,
}: Props) {
  const [showAllSystems, setShowAllSystems] = useState(false);
  const [showAllConfigurations, setShowAllConfigurations] = useState(false);
  const [vidSearch, setVidSearch] = useState("");

  const isCompactDataStep = wizard.paso === 3;
  const visualStage = wizard.paso;
  const normalizedCategoryOptions = useMemo(
    () =>
      CATEGORY_OPTIONS.map((option) => ({
        ...option,
        subtitle: option.subtitle.replace("paÃ±os", "paños"),
      })),
    []
  );

  const resetLocalWizardState = () => {
    setShowAllSystems(false);
    setShowAllConfigurations(false);
    setVidSearch("");
  };

  const handleOpenWizard = () => {
    resetLocalWizardState();
    wizard.onOpen();
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
  });
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
  const visibleConfigurationOptions = wizard.configurationOptions.slice(0, 3);
  const displayConfigurationOptions = showAllConfigurations
    ? wizard.configurationOptions
    : visibleConfigurationOptions;
  const materialColorOptions =
    wizard.draft.material === "PVC" ? PVC_COLOR_OPTIONS : ALUMINUM_COLOR_OPTIONS;

  const footerMarkup = (
    <PasoDosWizardFooterMovil
      canContinueFromQuantity={canContinueFromQuantity}
      canSubmitGroup={canSubmitGroup}
      isCompactDataStep={isCompactDataStep}
      onBack={wizard.onBack}
      onClose={handleCloseWizard}
      onConfirm={wizard.onConfirm}
      onNext={wizard.onNext}
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
      <section className={s.stepTwoMobileExperience}>
        <div className={s.stepTwoMobileEditingHeader}>
          <div>
            <span className={s.cardLabel}>Paso 2 / Edicion puntual</span>
            <h2 className={s.stepTwoMobileTitle}>Editar componente</h2>
            <p className={s.stepTwoMobileSubtle}>Ajusta este componente y vuelves a la lista.</p>
          </div>
          <button
            className={s.stepTwoMobileHeaderAction}
            onClick={formulario.onResetStep2Form}
            type="button"
          >
            <LuX aria-hidden />
          </button>
        </div>
        <PasoDosFormularioComponente {...formulario} />
      </section>
    );
  }

  return (
    <section className={s.stepTwoMobileExperience}>
      <PasoDosListaMovil
        isWizardOpen={wizard.isOpen}
        items={items}
        subtotal={subtotal}
        total={total}
        adjustedItems={adjustedItems}
        onEditItem={onEditItem}
        onGoToSummary={onGoToSummary}
        onOpenWizard={handleOpenWizard}
        onRemoveItem={onRemoveItem}
        onSaveAndExit={formulario.onSaveAndExit}
      />

      {wizard.isOpen ? (
        <div className={s.stepTwoMobileCreatorOverlay}>
          <div
            className={`${s.stepTwoMobileCreatorShell} ${
              isCompactDataStep ? s.stepTwoMobileCreatorShellCompact : ""
            }`}
          >
            <PasoDosWizardEncabezadoMovil
              stages={VISUAL_STAGES}
              visualStage={visualStage}
              title={getStageTitle(visualStage)}
              subtitle={
                visualStage === 1
                  ? "Elige el tipo base del componente."
                  : visualStage === 2
                    ? "Indica cuantas unidades iguales van en este grupo."
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
                  onSelectLineTemplate={wizard.onSelectLineTemplate}
                  onColorChange={wizard.onColorChange}
                  onConfiguracionChange={wizard.onConfiguracionChange}
                  onPrecioChange={wizard.onPrecioChange}
                  onPricingModeChange={wizard.onPricingModeChange}
                  onSistemaChange={wizard.onSistemaChange}
                  onVidrioChange={wizard.onVidrioChange}
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
