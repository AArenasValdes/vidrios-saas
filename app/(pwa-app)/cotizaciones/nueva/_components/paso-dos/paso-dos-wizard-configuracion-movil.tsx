"use client";

import { LuSearch, LuX } from "react-icons/lu";

import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import {
  getGroupStatusTitle,
  repairBrokenText,
} from "./paso-dos-wizard-movil.utils";
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
  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileConfigStatus}>
        <strong>
          {getGroupStatusTitle(
            draft.cantidad,
            draft.subtipo,
            draft.sistema
          )}
        </strong>
        <span>Mismas medidas y mismo precio</span>
      </div>

      <div className={s.stepTwoMobileBlockSecundario}>
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
              onClick={() => onMaterialChange(material)}
              type="button"
            >
              <span className={s.segmentedChoiceTitle}>{material}</span>
            </button>
          ))}
        </div>
      </div>

      {draft.material === "Aluminio" ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>Color aluminio</div>
          <div className={s.stepTwoMobileColorGrid}>
            {colorOptions.map((option) => (
              <button
                key={option.hex}
                className={`${s.stepTwoMobileColorOption} ${
                  draft.colorHex.toLowerCase() === option.hex.toLowerCase()
                    ? s.stepTwoMobileColorOptionActive
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

      <div className={s.stepTwoMobileBlockPrecio}>
        <div className={s.stepTwoMobileBlockLabel}>Modo de precio</div>
        <div className={s.segmentedChoiceGrid}>
          {(
            [
              { value: "precio_directo", label: "Valor directo" },
              { value: "margen", label: "Con margen" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              className={`${s.segmentedChoice} ${
                activePricingMode === option.value ? s.segmentedChoiceActive : ""
              }`}
              onClick={() => onPricingModeChange(option.value)}
              type="button"
            >
              <span className={s.segmentedChoiceTitle}>{option.label}</span>
            </button>
          ))}
        </div>

        {activePricingMode === "margen" ? (
          <div className={s.stepTwoMobileMarginField}>
            <label className={s.stepTwoMobileMedidaLabel} htmlFor="grupo-margen">
              Margen (%)
            </label>
            <input
              className={s.stepTwoMobileMarginInput}
              id="grupo-margen"
              inputMode="numeric"
              placeholder="60"
              type="text"
              value={draft.margenPct}
              onChange={(event) => onMargenChange(event.target.value)}
            />
          </div>
        ) : null}

        <div className={s.stepTwoMobileBlockLabel}>{priceLabel}</div>
        <input
          className={s.stepTwoMobilePrecioInput}
          id="grupo-precio"
          inputMode="numeric"
          placeholder="$ 120.000"
          type="text"
          value={formattedPriceValue}
          onChange={(event) => onPrecioChange(event.target.value)}
        />
        <span className={s.stepTwoMobileBlockHelp}>{priceHelp}</span>
      </div>

      <div className={s.stepTwoMobileBlockSecundario}>
        <div className={s.stepTwoMobileBlockLabel}>Cristal / Vidrio</div>
        <p className={s.stepTwoMobileGlassIntro}>
          Te sugerimos segun el tipo y sistema, pero puedes elegir cualquier vidrio.
        </p>

        <div className={s.stepTwoMobileVidrioSearchWrap}>
          <LuSearch
            aria-hidden
            className={s.stepTwoMobileVidrioSearchIcon}
            size={14}
          />
          <input
            className={s.stepTwoMobileVidrioSearchInput}
            placeholder='Buscar... ej: "inc", "dvh", "temp"'
            type="text"
            value={vidSearch}
            onChange={(event) => onSetVidSearch(event.target.value)}
          />
          {vidSearch ? (
            <button
              className={s.stepTwoMobileVidrioSearchClear}
              onClick={() => onSetVidSearch("")}
              type="button"
              aria-label="Limpiar busqueda"
            >
              <LuX aria-hidden size={11} />
            </button>
          ) : null}
        </div>

        {vidSearch.trim() ? (
          <div className={s.stepTwoMobileChoiceChips}>
            {searchResults.length > 0 ? (
              searchResults.map((option) => (
                <button
                  key={option}
                  className={`${s.stepTwoMobileChoiceChip} ${
                    draft.vidrio === option
                      ? s.stepTwoMobileChoiceChipActive
                      : ""
                  }`}
                  onClick={() => {
                    onVidrioChange(option);
                    onSetVidSearch("");
                  }}
                  type="button"
                >
                  {repairBrokenText(option)}
                </button>
              ))
            ) : (
              <span className={s.stepTwoMobileVidrioNoResults}>
                Sin resultados para {vidSearch}. Prueba con dvh o temp.
              </span>
            )}
          </div>
        ) : (
          <>
            {recommendedVidrios.length > 0 ? (
              <div className={s.stepTwoMobileGlassRecommendedBox}>
                <div className={s.stepTwoMobileGlassRecommendedHeader}>
                  <div>
                    <div className={s.stepTwoMobileVidrioRecLabel}>
                      Recomendados para este sistema
                    </div>
                    <span>{recommendedReason}</span>
                  </div>
                </div>
                <div className={s.stepTwoMobileChoiceChips}>
                  {recommendedVidrios.map((option) => (
                    <button
                      key={option}
                      className={`${s.stepTwoMobileChoiceChip} ${s.stepTwoMobileChoiceChipRec} ${
                        draft.vidrio === option
                          ? s.stepTwoMobileChoiceChipActive
                          : ""
                      }`}
                      onClick={() => onVidrioChange(option)}
                      type="button"
                    >
                      <span>{repairBrokenText(option)}</span>
                      <small className={s.stepTwoMobileChoiceChipBadge}>
                        Recomendado
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={s.stepTwoMobileGlassCatalog}>
              <div className={s.stepTwoMobileGlassCatalogTitle}>
                Catalogo completo
              </div>
              {glassCatalogGroups.map((group) => (
                <div className={s.stepTwoMobileGlassGroup} key={group.grupo}>
                  <div className={s.stepTwoMobileGlassGroupTitle}>
                    {repairBrokenText(group.grupo)}
                  </div>
                  <div className={s.stepTwoMobileChoiceChips}>
                    {group.options.map((option) => (
                      <button
                        key={option}
                        className={`${s.stepTwoMobileChoiceChip} ${
                          isRecommendedGlass(option)
                            ? s.stepTwoMobileChoiceChipRecSoft
                            : ""
                        } ${
                          draft.vidrio === option
                            ? s.stepTwoMobileChoiceChipActive
                            : ""
                        }`}
                        onClick={() => onVidrioChange(option)}
                        type="button"
                      >
                        {repairBrokenText(option)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {draft.vidrio ? (
              <span className={s.stepTwoMobileBlockHelp}>
                Vidrio elegido: {repairBrokenText(draft.vidrio)}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
