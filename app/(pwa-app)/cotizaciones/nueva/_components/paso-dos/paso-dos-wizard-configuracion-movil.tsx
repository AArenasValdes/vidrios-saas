"use client";

import { useMemo, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";

import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { ComponentFormLinePricingSummary } from "@/features/cotizaciones/new-quote/workflow-ui";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import { getGroupStatusTitle, repairBrokenText } from "./paso-dos-wizard-movil.utils";
import { PasoDosWizardPrecioMovil } from "./paso-dos-wizard-precio-movil";
import { PasoDosWizardVidrioMovil } from "./paso-dos-wizard-vidrio-movil";
import s from "../../page.module.css";

type GlassCatalogGroup = {
  grupo: string;
  options: readonly string[];
};

type Props = {
  activePricingMode: PricingMode;
  colorOptions: readonly { label: string; hex: string }[];
  displayConfigurationOptions: readonly string[];
  displaySystemOptions: readonly string[];
  draft: PasoDosGrupoDraft;
  formattedPriceValue: string;
  glassCatalogGroups: readonly GlassCatalogGroup[];
  isRecommendedGlass: (option: string) => boolean;
  linePricingSummary: ComponentFormLinePricingSummary;
  lineTemplateOptions: readonly CotizacionLineTemplate[];
  onAltoChange: (value: string) => void;
  onAnchoChange: (value: string) => void;
  onMargenChange: (value: string) => void;
  onMaterialChange: (material: PasoDosGrupoDraft["material"]) => void;
  onSelectLineTemplate: (templateId: string) => void;
  onColorChange: (colorHex: string) => void;
  onConfiguracionChange: (value: string) => void;
  onPrecioChange: (value: string) => void;
  onPricingModeChange: (mode: PricingMode) => void;
  onSistemaChange: (value: string) => void;
  onVidrioChange: (value: string) => void;
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
  linePricingSummary,
  lineTemplateOptions,
  onAltoChange,
  onAnchoChange,
  onMargenChange,
  onMaterialChange,
  onSelectLineTemplate,
  onColorChange,
  onConfiguracionChange,
  onPrecioChange,
  onPricingModeChange,
  onSistemaChange,
  onVidrioChange,
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
}: Props) {
  const [showAllColors, setShowAllColors] = useState(false);
  const [isLineSelectorOpen, setIsLineSelectorOpen] = useState(false);
  const [lineSelectorQuery, setLineSelectorQuery] = useState("");

  const primaryColorOptions = useMemo(() => colorOptions.slice(0, 4), [colorOptions]);
  const visibleColorOptions = showAllColors ? colorOptions : primaryColorOptions;
  const selectedLineLabel = useMemo(() => {
    if (!draft.lineTemplateId) {
      return "Precio manual o sin linea";
    }

    return (
      lineTemplateOptions.find((template) => String(template.id) === draft.lineTemplateId)?.nombre ??
      draft.referencia ??
      "Precio manual o sin linea"
    );
  }, [draft.lineTemplateId, draft.referencia, lineTemplateOptions]);

  const filteredLineTemplates = useMemo(() => {
    const normalizedQuery = lineSelectorQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return lineTemplateOptions;
    }

    return lineTemplateOptions.filter((template) => template.nombre.toLowerCase().includes(normalizedQuery));
  }, [lineSelectorQuery, lineTemplateOptions]);

  const openLineSelector = () => {
    setLineSelectorQuery("");
    setIsLineSelectorOpen(true);
  };

  const closeLineSelector = () => {
    setLineSelectorQuery("");
    setIsLineSelectorOpen(false);
  };

  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileConfigStatus}>
        <strong>{getGroupStatusTitle(draft.cantidad, draft.subtipo, draft.sistema)}</strong>
        <span>Mismas medidas, mismo sistema y mismo valor inicial.</span>
      </div>

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
              {repairBrokenText(option)}
            </button>
          ))}
        </div>

        {showSystemToggle ? (
          <button
            className={s.stepTwoMobileSecondaryLink}
            onClick={() => onSetShowAllSystems(!showAllSystems)}
            type="button"
          >
            {showAllSystems ? "Mostrar menos" : "Ver más sistemas"}
          </button>
        ) : null}
      </div>

      {displayConfigurationOptions.length > 0 ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>Configuración</div>
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
              {showAllConfigurations ? "Mostrar menos" : "Ver más opciones"}
            </button>
          ) : null}
        </div>
      ) : null}

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

      <div className={s.stepTwoMobileBlockSecundario}>
        <div className={s.stepTwoMobileBlockHeaderInline}>
          <div className={s.stepTwoMobileBlockLabel}>Línea comercial</div>
          {lineTemplateOptions.length > 0 ? (
            <button className={s.stepTwoMobileSecondaryLink} onClick={openLineSelector} type="button">
              Ver líneas
            </button>
          ) : null}
        </div>
        <button className={s.stepTwoMobileLineTrigger} onClick={openLineSelector} type="button">
          <span className={s.stepTwoMobileLineTriggerLabel}>{selectedLineLabel}</span>
          <span className={s.stepTwoMobileLineTriggerIcon} aria-hidden>
            +
          </span>
        </button>
        {draft.referencia.trim() && draft.precioPorM2.trim() ? (
          <div className={s.stepTwoMobileLineSummary}>
            <span>{draft.referencia}</span>
            <strong>
              {linePricingSummary.precioUnitarioSugerido !== null
                ? `Sugerido: $${linePricingSummary.precioUnitarioSugerido.toLocaleString("es-CL")}`
                : `Base: $${Number(draft.precioPorM2 || 0).toLocaleString("es-CL")}/m²`}
            </strong>
          </div>
        ) : null}
      </div>

      {isLineSelectorOpen ? (
        <div className={s.stepTwoMobileLineSheetOverlay}>
          <button className={s.stepTwoMobileLineSheetBackdrop} onClick={closeLineSelector} type="button" aria-label="Cerrar selector" />
          <div className={s.stepTwoMobileLineSheet}>
            <div className={s.stepTwoMobileLineSheetHandle} />
            <div className={s.stepTwoMobileLineSheetHeader}>
              <div className={s.stepTwoMobileLineSheetHeading}>
                <div className={s.stepTwoMobileBlockLabel}>Línea comercial</div>
                <strong className={s.stepTwoMobileLineSheetTitle}>Elegir línea</strong>
                <span className={s.stepTwoMobileLineSheetSubtitle}>
                  Mostrando líneas de {draft.material}. Usa una guardada o cotiza con precio manual.
                </span>
              </div>
              <button className={s.stepTwoMobileLineSheetClose} onClick={closeLineSelector} type="button">
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.stepTwoMobileLineSearchWrap}>
              <LuSearch className={s.stepTwoMobileLineSearchIcon} aria-hidden />
              <input
                className={s.stepTwoMobileLineSearchInput}
                placeholder="Buscar líneas..."
                type="text"
                value={lineSelectorQuery}
                onChange={(event) => setLineSelectorQuery(event.target.value)}
              />
            </div>
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
                {filteredLineTemplates.length} línea{filteredLineTemplates.length === 1 ? "" : "s"} disponibles
              </span>
            </div>
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
                  <span>Precio manual o sin línea</span>
                  <small>Ingresa el valor directo sin aplicar una línea guardada.</small>
                </div>
                {!draft.lineTemplateId ? <span className={s.stepTwoMobileLineOptionState}>Actual</span> : null}
              </button>
              {filteredLineTemplates.map((template) => (
                <button
                  key={template.id}
                  className={`${s.stepTwoMobileLineOption} ${draft.lineTemplateId === String(template.id) ? s.stepTwoMobileLineOptionActive : ""}`}
                  onClick={() => {
                    onSelectLineTemplate(String(template.id));
                    closeLineSelector();
                  }}
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
                      ${Math.round(template.precioM2Sugerido).toLocaleString("es-CL")}/m² ·{" "}
                      {template.minimoCobrable > 0
                        ? `Mín. $${Math.round(template.minimoCobrable).toLocaleString("es-CL")}`
                        : "Sin mínimo"}{" "}
                      ·{" "}
                      {template.redondeoPrecio > 0
                        ? `Redondeo $${Math.round(template.redondeoPrecio).toLocaleString("es-CL")}`
                        : "Sin redondeo"}
                    </small>
                  </div>
                  {draft.lineTemplateId === String(template.id) ? (
                    <span className={s.stepTwoMobileLineOptionState}>Activa</span>
                  ) : null}
                </button>
              ))}
              {filteredLineTemplates.length === 0 ? (
                <div className={s.stepTwoMobileLineEmptyState}>No encontramos líneas con ese filtro.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {draft.material === "Aluminio" || draft.material === "PVC" ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockHeaderInline}>
            <div className={s.stepTwoMobileBlockLabel}>Color perfil</div>
            {colorOptions.length > primaryColorOptions.length ? (
              <button
                className={s.stepTwoMobileSecondaryLink}
                onClick={() => setShowAllColors((current) => !current)}
                type="button"
              >
                {showAllColors ? "Menos opciones" : "Más opciones"}
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
                <span className={s.stepTwoMobileColorSwatch} style={{ backgroundColor: option.hex }} aria-hidden />
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

      <PasoDosWizardPrecioMovil
        activePricingMode={activePricingMode}
        formattedPriceValue={formattedPriceValue}
        marginValue={draft.margenPct}
        onMargenChange={onMargenChange}
        onPrecioChange={onPrecioChange}
        onPricingModeChange={onPricingModeChange}
        priceHelp={priceHelp}
        priceLabel={priceLabel}
      />

      <PasoDosWizardVidrioMovil
        currentGlass={draft.vidrio}
        glassCatalogGroups={glassCatalogGroups}
        isRecommendedGlass={isRecommendedGlass}
        onSetVidSearch={onSetVidSearch}
        onVidrioChange={onVidrioChange}
        recommendedReason={recommendedReason}
        recommendedVidrios={recommendedVidrios}
        searchResults={searchResults}
        vidSearch={vidSearch}
      />
    </div>
  );
}
