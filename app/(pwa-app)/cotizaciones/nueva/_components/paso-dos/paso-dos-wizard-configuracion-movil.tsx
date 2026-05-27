"use client";

import { useMemo, useState } from "react";
import { LuChevronLeft, LuSearch, LuX } from "react-icons/lu";

import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type {
  CotizacionLineTemplate,
  CreateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  normalizeCurrencyInput,
  getSheetVariantOptions,
  requiresCustomSheetDescription,
  SHEET_SCHEME_OPTIONS,
  shouldShowSheetSchemeForComponent,
  type ComponentFormLinePricingSummary,
} from "@/features/cotizaciones/new-quote/workflow-ui";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import { getGroupStatusTitle, repairBrokenText } from "./paso-dos-wizard-movil.utils";
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
  onSelectLineTemplate: (templateId: string) => void;
  onColorChange: (colorHex: string) => void;
  onConfiguracionChange: (value: string) => void;
  onSheetSchemeChange: (value: string) => void;
  onSheetVariantChange: (value: string) => void;
  onCustomSchemeDescriptionChange: (value: string) => void;
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
  isSavingLineTemplate,
  linePricingSummary,
  lineTemplateOptions,
  onAltoChange,
  onAnchoChange,
  onApplyCreatedLineTemplate,
  onCreateLineTemplate,
  onMargenChange,
  onMaterialChange,
  onSelectLineTemplate,
  onColorChange,
  onConfiguracionChange,
  onSheetSchemeChange,
  onSheetVariantChange,
  onCustomSchemeDescriptionChange,
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
  const [lineSheetView, setLineSheetView] = useState<"list" | "create">("list");
  const [quickLineForm, setQuickLineForm] = useState<QuickLineFormState>(() =>
    createQuickLineFormState()
  );
  const [isQuickOptionsOpen, setIsQuickOptionsOpen] = useState(false);
  const [quickLineError, setQuickLineError] = useState<string | null>(null);
  const availableLineTemplates = lineTemplateOptions;
  const referencia = draft.referencia?.trim() ?? "";
  const precioPorM2 = draft.precioPorM2?.trim() ?? "";
  const showSheetScheme = shouldShowSheetSchemeForComponent({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const sheetVariantOptions = getSheetVariantOptions(draft.sheetScheme);
  const showCustomSchemeDescription = requiresCustomSheetDescription({
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
  });

  const primaryColorOptions = useMemo(() => colorOptions.slice(0, 4), [colorOptions]);
  const visibleColorOptions = showAllColors ? colorOptions : primaryColorOptions;
  const selectedLineLabel = useMemo(() => {
    if (!draft.lineTemplateId) {
      return "Precio manual o sin línea";
    }

    return (
      availableLineTemplates.find((template) => String(template.id) === draft.lineTemplateId)?.nombre ??
      referencia ??
      "Precio manual o sin línea"
    );
  }, [availableLineTemplates, draft.lineTemplateId, referencia]);

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
    setIsLineSelectorOpen(false);
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
      setQuickLineError("Completa el nombre comercial y un precio base por m² válido.");
      return;
    }

    try {
      const created = await onCreateLineTemplate({
        nombre,
        material: draft.material,
        vidrioPrincipalRecomendado: quickLineForm.vidrioPrincipalRecomendado.trim() || null,
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
        error instanceof Error ? error.message : "No pudimos guardar la línea en este momento."
      );
    }
  };

  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileConfigStatus}>
        <strong>{getGroupStatusTitle(draft.cantidad, draft.subtipo, draft.sistema, draft)}</strong>
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

      {showSheetScheme ? (
        <div className={s.stepTwoMobileBlockSecundario}>
          <div className={s.stepTwoMobileBlockLabel}>Esquema de hojas</div>
          <div className={s.stepTwoMobileChoiceChips}>
            {SHEET_SCHEME_OPTIONS.map((option) => (
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
              <span className={s.stepTwoMobileQuickLineLabel}>Describe el esquema</span>
              <input
                className={s.stepTwoMobileQuickLineInput}
                maxLength={120}
                placeholder="Ej: 3 hojas, la del medio fija"
                type="text"
                value={draft.customSchemeDescription}
                onChange={(event) => onCustomSchemeDescriptionChange(event.target.value)}
              />
            </label>
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
          <button className={s.stepTwoMobileSecondaryLink} onClick={openLineSelector} type="button">
            {availableLineTemplates.length > 0 ? "Ver líneas" : "Nueva línea"}
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
        {referencia && precioPorM2 ? (
          <div className={s.stepTwoMobileLineSummary}>
            <span>{referencia}</span>
            <strong>
              {linePricingSummary.precioUnitarioSugerido !== null
                ? `Sugerido: $${linePricingSummary.precioUnitarioSugerido.toLocaleString("es-CL")}`
                : `Base: $${Number(precioPorM2 || 0).toLocaleString("es-CL")}/m²`}
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
          <div className={s.stepTwoMobileLineSheet}>
            <div className={s.stepTwoMobileLineSheetHandle} />
            <div className={s.stepTwoMobileLineSheetHeader}>
              <div className={s.stepTwoMobileLineSheetHeading}>
                <div className={s.stepTwoMobileBlockLabel}>Línea comercial</div>
                <strong className={s.stepTwoMobileLineSheetTitle}>
                  {lineSheetView === "create" ? `Nueva línea ${draft.material}` : "Elegir línea"}
                </strong>
                <span className={s.stepTwoMobileLineSheetSubtitle}>
                  {lineSheetView === "create"
                    ? "Guárdala para usarla ahora y reutilizarla en futuras cotizaciones."
                    : `Mostrando líneas de ${draft.material}. Usa una guardada o cotiza con precio manual.`}
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
                      {!draft.lineTemplateId ? (
                        <span className={s.stepTwoMobileLineOptionState}>Actual</span>
                      ) : null}
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
                          <span className={s.stepTwoMobileLineOptionState}>Actual</span>
                        ) : null}
                      </button>
                    ))}
                    {filteredLineTemplates.length === 0 ? (
                      <div className={s.stepTwoMobileLineEmptyState}>
                        No encontramos líneas con ese filtro.
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className={s.stepTwoMobileQuickLineForm}>
                  <div
                    className={`${s.stepTwoMobileLineFilterChip} ${
                      draft.material === "PVC"
                        ? s.stepTwoMobileLineFilterChipPvc
                        : s.stepTwoMobileLineFilterChipAluminio
                    } ${s.stepTwoMobileQuickLineMaterialBadge}`}
                  >
                    Material: {draft.material}
                  </div>

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>Nombre comercial</span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      maxLength={80}
                      placeholder="Ej: Línea 5000"
                      type="text"
                      value={quickLineForm.nombre}
                      onChange={(event) => handleQuickLineChange("nombre", event.target.value)}
                    />
                  </label>

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>Precio base / m²</span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      inputMode="numeric"
                      placeholder="Ej: 185000"
                      type="text"
                      value={quickLineForm.precioM2Sugerido}
                      onChange={(event) =>
                        handleQuickLineChange(
                          "precioM2Sugerido",
                          normalizeCurrencyInput(event.target.value)
                        )
                      }
                    />
                  </label>

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>Vidrio usado normalmente</span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      placeholder="Ej: Termopanel 4/10/4"
                      type="text"
                      value={quickLineForm.vidrioPrincipalRecomendado}
                      onChange={(event) =>
                        handleQuickLineChange("vidrioPrincipalRecomendado", event.target.value)
                      }
                    />
                    <span className={s.stepTwoMobileQuickLineHelper}>
                      Este vidrio aparecerá primero al cotizar con esta línea.
                    </span>
                  </label>

                  <label className={s.field}>
                    <span className={s.stepTwoMobileQuickLineLabel}>Mínimo cobrable opcional</span>
                    <input
                      className={s.stepTwoMobileQuickLineInput}
                      inputMode="numeric"
                      placeholder="Ej: 120000"
                      type="text"
                      value={quickLineForm.minimoCobrable}
                      onChange={(event) =>
                        handleQuickLineChange(
                          "minimoCobrable",
                          normalizeCurrencyInput(event.target.value)
                        )
                      }
                    />
                    <span className={s.stepTwoMobileQuickLineHelper}>
                      Se aplicará cuando el cálculo sea menor a este monto.
                    </span>
                  </label>

                  <div className={s.stepTwoMobileQuickLineAdvanced}>
                    <button
                      className={s.stepTwoMobileSecondaryLink}
                      onClick={() => setIsQuickOptionsOpen((current) => !current)}
                      type="button"
                    >
                      {isQuickOptionsOpen ? "Ocultar más opciones" : "Más opciones"}
                    </button>

                    {isQuickOptionsOpen ? (
                      <div className={s.stepTwoMobileQuickLineAdvancedBody}>
                        <label className={s.field}>
                          <span className={s.stepTwoMobileQuickLineLabel}>Redondeo del precio</span>
                          <input
                            className={s.stepTwoMobileQuickLineInput}
                            inputMode="numeric"
                            placeholder="Ej: 1000"
                            type="text"
                            value={quickLineForm.redondeoPrecio}
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
                  Nueva línea
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
