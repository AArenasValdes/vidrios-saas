"use client";

import { useMemo, useState } from "react";

import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
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

type Props = {
  activePricingMode: PricingMode;
  colorOptions: readonly { label: string; hex: string }[];
  displayConfigurationOptions: readonly string[];
  displaySystemOptions: readonly string[];
  draft: PasoDosGrupoDraft;
  formattedPriceValue: string;
  glassCatalogGroups: readonly GlassCatalogGroup[];
  isRecommendedGlass: (option: string) => boolean;
  onAltoChange: (value: string) => void;
  onAnchoChange: (value: string) => void;
  onMargenChange: (value: string) => void;
  onMaterialChange: (material: PasoDosGrupoDraft["material"]) => void;
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
  onAltoChange,
  onAnchoChange,
  onMargenChange,
  onMaterialChange,
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
  const primaryColorOptions = useMemo(() => colorOptions.slice(0, 4), [colorOptions]);
  const visibleColorOptions = showAllColors ? colorOptions : primaryColorOptions;

  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileConfigStatus}>
        <strong>
          {getGroupStatusTitle(draft.cantidad, draft.subtipo, draft.sistema)}
        </strong>
        <span>Mismas medidas, mismo sistema y mismo valor inicial.</span>
      </div>

      <div className={s.stepTwoMobileBlockHero}>
        <div className={s.stepTwoMobileBlockLabel}>Sistema</div>
        <div className={s.stepTwoMobileChoiceChips}>
          {displaySystemOptions.map((option) => (
            <button
              key={option}
              className={`${s.stepTwoMobileChoiceChip} ${
                draft.sistema === option ? s.stepTwoMobileChoiceChipActive : ""
              }`}
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
            {showAllSystems ? "Mostrar menos" : "Ver mas sistemas"}
          </button>
        ) : null}
      </div>

      {displayConfigurationOptions.length > 0 ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>Configuracion</div>
          <div className={s.stepTwoMobileChoiceChips}>
            {displayConfigurationOptions.map((option) => (
              <button
                key={option}
                className={`${s.stepTwoMobileChoiceChip} ${
                  draft.configuracion === option ? s.stepTwoMobileChoiceChipActive : ""
                }`}
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

      <div className={s.stepTwoMobileBlockSecundario}>
        <div className={s.stepTwoMobileBlockLabel}>Material</div>
        <div className={s.segmentedChoiceGrid}>
          {(["Aluminio", "PVC"] as const).map((material) => (
            <button
              key={material}
              className={`${s.segmentedChoice} ${
                draft.material === material ? s.segmentedChoiceActive : ""
              }`}
              onClick={() => {
                setShowAllColors(false);
                onMaterialChange(material);
              }}
              type="button"
            >
              <span className={s.segmentedChoiceTitle}>{material}</span>
            </button>
          ))}
        </div>
      </div>

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
                {showAllColors ? "Menos opciones" : "Mas opciones"}
              </button>
            ) : null}
          </div>

          <div className={s.stepTwoMobileColorGridCompact}>
            {visibleColorOptions.map((option) => (
              <button
                key={option.hex}
                className={`${s.stepTwoMobileColorPill} ${
                  draft.colorHex.toLowerCase() === option.hex.toLowerCase()
                    ? s.stepTwoMobileColorPillActive
                    : ""
                }`}
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
