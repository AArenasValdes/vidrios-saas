"use client";

import { useCallback, useMemo, useState } from "react";
import { LuX, LuCheck, LuPencil, LuSearch } from "react-icons/lu";

import {
  isFreeValueComponentType,
  getConfigurationOptionsForComponent,
  getConfigurationOptionsForComponentSistema,
  getSystemOptionsForComponent,
  hasPerSystemConfigurations,
} from "@/features/cotizaciones/services/component-catalog.service";
import { LineTemplatePicker } from "@/features/cotizaciones/line-templates/components/line-template-picker";
import { PautaCubicacionPanel } from "./pauta-cubicacion-panel";
import { generateComponentSVG } from "@/utils/window-drawings";
import {
  GuidedVisualComposer,
  ensureGuidedVisualDraft,
} from "@/features/cotizaciones/visual-composer/components/guided-visual-composer";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import {
  describeGuidedVisualConfig,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  CLP,
  COLOR_OPTIONS,
  COMPONENT_TYPE_GROUPS,
  filterLineTemplatesForComponent,
  getCompositionSectionLabel,
  getSheetSchemeOptions,
  getSheetVariantOptions,
  MARGIN_SELECT_OPTIONS,
  MATERIAL_OPTIONS,
  requiresCustomSheetDescription,
  isCubicationPersonalizadoAssistMode,
  isGlassCatalogSelection,
  shouldRequireProfileMaterialForComponent,
  shouldShowGuidedComposerEntry,
  shouldShowSheetSchemeForComponent,
  shouldShowSystemSelectionForComponent,
  buildGlassValue,
  resolveFormPrecioVenta,
  buildEditorSubtitle,
  type FormPriceDisplay,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";

import s from "../../page.module.css";
import editor from "./paso-dos-editor-desktop.module.css";

type Props = PasoDosFormularioComponenteProps;

function hasUnsavedChanges(
  current: PasoDosFormularioComponenteProps["componentForm"],
  snapshot: PasoDosFormularioComponenteProps["componentForm"] | null | undefined
): boolean {
  if (!snapshot) return false;
  const keys: (keyof typeof current)[] = [
    "codigo", "tipo", "material", "referencia", "sistema", "configuracion",
    "sheetScheme", "sheetVariant", "customSchemeDescription",
    "vidrio", "nombre", "descripcion", "ancho", "alto", "cantidad",
    "costoProveedorUnitario", "margenPct", "pricingMode",
    "precioPorM2", "minimoCobrable", "redondeoPrecio",
    "precioAjustadoManual", "lineTemplateId", "colorHex",
    "loteCantidad",
  ];
  return keys.some((k) => String(current[k] ?? "") !== String(snapshot[k] ?? ""));
}

function EditorHeader({
  componentForm,
  precio,
  onEditarPrecio,
  onCerrar,
  hasChanges,
  isDesktopQuoteStudio,
  activeStepLabel,
}: {
  componentForm: Props["componentForm"];
  precio: FormPriceDisplay;
  onEditarPrecio: () => void;
  onCerrar: () => void;
  hasChanges: boolean;
  isDesktopQuoteStudio?: boolean;
  activeStepLabel?: string;
}) {
  const subtitle = useMemo(() => buildEditorSubtitle(componentForm), [componentForm]);
  const pieceType = componentForm.tipo || "Componente";

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (!window.confirm("Tienes cambios sin guardar. ¿Descartar y cerrar?")) return;
    }
    onCerrar();
  }, [hasChanges, onCerrar]);

  return (
    <header className={editor.header}>
      <div className={editor.headerLeft}>
        {isDesktopQuoteStudio ? (
          <>
            <h2 className={editor.headerTitle}>Editando {componentForm.codigo}</h2>
            <p className={editor.headerSubtitle}>
              {pieceType}
              {activeStepLabel ? ` · ${activeStepLabel}` : ""}
            </p>
          </>
        ) : (
          <>
            <h2 className={editor.headerTitle}>
              {componentForm.codigo} · {pieceType}
            </h2>
            <p className={editor.headerSubtitle}>{subtitle}</p>
          </>
        )}
        <div className={editor.headerPrice}>
          <span className={editor.headerPriceLabel}>Total actual:</span>
          <strong className={editor.headerPriceValue}>
            {CLP(precio.precioTotal)}
          </strong>
          <button
            type="button"
            className={editor.headerPriceEdit}
            onClick={onEditarPrecio}
          >
            <LuPencil size={12} aria-hidden />
            Editar precio
          </button>
        </div>
      </div>
      <div className={editor.headerActions}>
        <button
          type="button"
          className={editor.headerIconBtn}
          title="Cerrar"
          aria-label="Cerrar editor"
          onClick={handleClose}
        >
          <LuX size={18} aria-hidden />
        </button>
      </div>
    </header>
  );
}

function EditorTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { key: string; label: string; done?: boolean }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}) {
  return (
    <nav className={editor.tabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`${editor.tab} ${activeTab === tab.key ? editor.tabActive : ""}`}
          onClick={() => onTabChange(tab.key)}
        >
          <span>{tab.label}</span>
          {tab.done ? <LuCheck size={12} className={editor.tabCheck} aria-hidden /> : null}
        </button>
      ))}
    </nav>
  );
}

function EditorFooter({
  codigo,
  precio,
  hasChanges,
  onCancelar,
  onGuardar,
  isSaving,
}: {
  codigo: string;
  precio: FormPriceDisplay;
  hasChanges: boolean;
  onCancelar: () => void;
  onGuardar: () => void;
  isSaving: boolean;
}) {
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (!window.confirm("Tienes cambios sin guardar. ¿Descartar y volver?")) return;
    }
    onCancelar();
  }, [hasChanges, onCancelar]);

  const totalLabel = hasChanges ? "Nuevo total" : "Total actualizado";

  return (
    <footer className={editor.footer}>
      <span className={editor.footerLeft}>
        {codigo} · {totalLabel}: {CLP(precio.precioTotal)}
      </span>
      <div className={editor.footerActions}>
        <button type="button" className={s.btnGhost} onClick={handleCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={s.btnPrimary}
          onClick={onGuardar}
          disabled={isSaving}
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </footer>
  );
}

function TabConfiguracion({
  componentForm,
  fieldErrors,
  currentComponentPreviewSvg,
  onComponentChange,
}: Pick<
  Props,
  "componentForm" | "fieldErrors" | "currentComponentPreviewSvg" | "onComponentChange"
>) {
  const [isGuidedComposerOpen, setIsGuidedComposerOpen] = useState(false);
  const [guidedDraft, setGuidedDraft] = useState<GuidedVisualConfig | null>(null);
  const requiresProfileMaterial = shouldRequireProfileMaterialForComponent(componentForm.tipo);
  const showSystemSelection = shouldShowSystemSelectionForComponent(componentForm.tipo);
  const canUseGuidedComposer =
    !isFreeValueComponentType(componentForm.tipo) &&
    shouldShowGuidedComposerEntry({
      tipo: componentForm.tipo,
      material: componentForm.material,
      catalogCategoria: componentForm.catalogCategoria,
      sistema: componentForm.sistema,
      sheetScheme: componentForm.sheetScheme,
      configuracion: componentForm.configuracion,
      guidedVisualConfig: componentForm.guidedVisualConfig,
    });
  const systemOptions = getSystemOptionsForComponent(componentForm.tipo);
  const commonDesktopSystemOptions = ["Corredera", "Proyectante", "Abatible", "Oscilobatiente"].filter((option) =>
    systemOptions.includes(option)
  );
  const secondaryDesktopSystemOptions = systemOptions.filter(
    (option) => !commonDesktopSystemOptions.includes(option)
  );
  const selectedSistema = componentForm.sistema?.trim() ?? "";
  const configurationOptions = hasPerSystemConfigurations(componentForm.tipo)
    ? getConfigurationOptionsForComponentSistema(
        componentForm.tipo,
        componentForm.sistema?.trim() || systemOptions[0] || ""
      )
    : getConfigurationOptionsForComponent(componentForm.tipo);
  const showSheetScheme = shouldShowSheetSchemeForComponent({
    tipo: componentForm.tipo,
    sistema: componentForm.sistema,
  });
  const sheetSchemeOptions = getSheetSchemeOptions({
    tipo: componentForm.tipo,
    sistema: componentForm.sistema,
    configuracion: componentForm.configuracion,
  });
  const sheetVariantOptions = getSheetVariantOptions(componentForm.sheetScheme, {
    tipo: componentForm.tipo,
    sistema: componentForm.sistema,
  });
  const compositionSectionLabel = getCompositionSectionLabel({
    tipo: componentForm.tipo,
    sistema: componentForm.sistema,
  });
  const showCustomSchemeDescription = requiresCustomSheetDescription({
    sheetScheme: componentForm.sheetScheme,
    sheetVariant: componentForm.sheetVariant,
  });
  const configPreviewSvg = useMemo(() => {
    if (componentForm.guidedVisualConfig) {
      return renderGuidedVisualSvg(componentForm.guidedVisualConfig, {
        maxW: 176,
        maxH: 118,
        colorHex: componentForm.colorHex,
        variant: "summary",
        showSelection: false,
        showLabels: false,
        showDimensions: false,
      });
    }

    return generateComponentSVG({
      tipo: componentForm.tipo,
      sistema: componentForm.sistema,
      configuracion: componentForm.configuracion,
      sheetScheme: componentForm.sheetScheme,
      sheetVariant: componentForm.sheetVariant,
      customSchemeDescription: componentForm.customSchemeDescription,
      isCustomScheme: componentForm.isCustomScheme,
      referencia: componentForm.referencia,
      ancho: componentForm.ancho ? Number(componentForm.ancho) : null,
      alto: componentForm.alto ? Number(componentForm.alto) : null,
      colorHex: componentForm.colorHex,
      maxW: 176,
      maxH: 118,
      mirrorFormat: componentForm.mirrorFormat,
      mirrorPaneCount: componentForm.mirrorPaneCount,
      mirrorPaneDirection: componentForm.mirrorPaneDirection,
      mirrorInteriorLine: componentForm.mirrorInteriorLine,
    });
  }, [componentForm]);
  const configPreviewSummary = componentForm.guidedVisualConfig
    ? describeGuidedVisualConfig(componentForm.guidedVisualConfig)
    : [componentForm.sistema, componentForm.configuracion, componentForm.sheetScheme, componentForm.sheetVariant]
        .filter((part) => part?.trim())
        .join(" · ");

  const openGuidedComposer = () => {
    setGuidedDraft(
      ensureGuidedVisualDraft({
        current: componentForm.guidedVisualConfig ?? null,
        widthMm: componentForm.ancho ? Number(componentForm.ancho) : null,
        heightMm: componentForm.alto ? Number(componentForm.alto) : null,
      })
    );
    setIsGuidedComposerOpen(true);
  };

  const applyGuidedComposer = (next: GuidedVisualConfig) => {
    setGuidedDraft(next);
    onComponentChange("guidedVisualConfig", next);
    onComponentChange("ancho", String(next.widthMm));
    onComponentChange("alto", String(next.heightMm));
    onComponentChange("isCustomScheme", true);
    if (sheetSchemeOptions.includes("Personalizado")) {
      onComponentChange("sheetScheme", "Personalizado");
    }
    if (configurationOptions.includes("Personalizado")) {
      onComponentChange("configuracion", "Personalizado");
    }
    onComponentChange("customSchemeDescription", describeGuidedVisualConfig(next));
    setIsGuidedComposerOpen(false);
  };

  const clearGuidedComposer = () => {
    onComponentChange("guidedVisualConfig", null);
    onComponentChange("customSchemeDescription", "");
    const keepsPersonalizado =
      componentForm.sheetScheme === "Personalizado" ||
      componentForm.configuracion === "Personalizado";
    onComponentChange("isCustomScheme", keepsPersonalizado);
    setIsGuidedComposerOpen(false);
  };

  const selectConfiguracion = (option: string) => {
    if (
      componentForm.guidedVisualConfig &&
      componentForm.configuracion === "Personalizado" &&
      option !== "Personalizado"
    ) {
      onComponentChange("guidedVisualConfig", null);
      onComponentChange("customSchemeDescription", "");
    }
    onComponentChange("configuracion", option);
  };

  const selectSheetScheme = (option: string) => {
    if (componentForm.guidedVisualConfig && option !== "Personalizado") {
      onComponentChange("guidedVisualConfig", null);
      onComponentChange("customSchemeDescription", "");
    }
    onComponentChange("sheetScheme", option);
    onComponentChange("isCustomScheme", option === "Personalizado");
  };

  return (
    <div className={editor.tabContent}>
      {requiresProfileMaterial ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Material</span>
            <strong>Elige el material base</strong>
            <p>Selecciona rapido si este componente es de aluminio o PVC.</p>
          </div>
          <div className={`${s.segmentedChoiceGrid} ${s.materialChoiceGridCompact}`} role="radiogroup" aria-label="Material del componente">
            {MATERIAL_OPTIONS.map((materialOption) => (
              <label
                key={materialOption}
                className={`${s.segmentedChoice} ${s.materialChoiceCompact} ${
                  componentForm.material === materialOption ? s.segmentedChoiceActive : ""
                }`}
              >
                <input
                  className={s.segmentedChoiceInput}
                  type="radio"
                  name="component-material"
                  value={materialOption}
                  checked={componentForm.material === materialOption}
                  onChange={() => onComponentChange("material", materialOption)}
                />
                <span className={s.segmentedChoiceTitle}>{materialOption}</span>
                <span className={s.segmentedChoiceHint}>
                  {materialOption === "Aluminio"
                    ? "Perfil comun para ventanas, puertas y cierres."
                    : "Alternativa liviana para espejos, tapas y trabajos puntuales."}
                </span>
              </label>
            ))}
          </div>
          {fieldErrors.material ? <span className={s.fieldError}>{fieldErrors.material}</span> : null}
        </section>
      ) : null}

      <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Componente</span>
          <strong>Elige el tipo de trabajo</strong>
          <p>Selecciona ventana, puerta, shower, cierre u otro componente base.</p>
        </div>
        <div className={s.stepTwoDesktopTypeGridWrap}>
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>
              Tipo de componente <span className={s.required}>*</span>
            </span>
            <div className={`${s.typeSelector} ${fieldErrors.tipo ? s.typeSelectorError : ""}`}>
              {COMPONENT_TYPE_GROUPS.map((group) => (
                <section key={group.title} className={s.typeGroup}>
                  <div className={s.typeGroupTitle}>{group.title}</div>
                  <div className={s.typeGroupGrid}>
                    {group.items.map((typeOption) => (
                      <button
                        key={typeOption}
                        type="button"
                        className={`${s.typeChip} ${componentForm.tipo === typeOption ? s.typeChipActive : ""}`}
                        onClick={() => onComponentChange("tipo", typeOption)}
                      >
                        {typeOption}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {fieldErrors.tipo ? <span className={s.fieldError}>{fieldErrors.tipo}</span> : null}
          </div>
        </div>
      </section>

      {showSystemSelection ? (
        <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Sistema</span>
            <strong>Sistema del componente</strong>
          </div>
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>Sistema</span>
            <div className={s.stepTwoDesktopSystemPicker}>
              <div className={s.typeGroupGrid} role="group" aria-label="Sistemas frecuentes">
                {commonDesktopSystemOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${s.typeChip} ${
                      componentForm.sistema === option ? s.typeChipActive : ""
                    }`}
                    onClick={() => onComponentChange("sistema", option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {secondaryDesktopSystemOptions.length > 0 ? (
                <details
                  className={s.stepTwoDesktopOtherSystems}
                  open={secondaryDesktopSystemOptions.includes(selectedSistema)}
                >
                  <summary>Otros sistemas</summary>
                  <div className={s.typeGroupGrid} role="group" aria-label="Otros sistemas">
                    {secondaryDesktopSystemOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`${s.typeChip} ${
                          componentForm.sistema === option ? s.typeChipActive : ""
                        }`}
                        onClick={() => onComponentChange("sistema", option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {configurationOptions.length > 0 ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Configuracion</span>
            <strong>
              {componentForm.tipo === "Puerta" ? "Configuracion de puerta" : "Configuracion"}
            </strong>
          </div>
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>
              {componentForm.tipo === "Puerta" ? "Configuracion de puerta" : "Configuracion"}
            </span>
            <div className={s.typeGroupGrid} role="group" aria-label="Configuracion del componente">
              {configurationOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${s.typeChip} ${
                    componentForm.configuracion === option ? s.typeChipActive : ""
                  }`}
                  onClick={() => selectConfiguracion(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {showSheetScheme ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Composicion</span>
            <strong>{compositionSectionLabel}</strong>
          </div>
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>{compositionSectionLabel}</span>
            <div className={editor.compositionGrid} role="group" aria-label={compositionSectionLabel}>
              {sheetSchemeOptions.map((option) => (
                <button
                  key={option}
                  className={`${editor.compositionChip} ${
                    componentForm.sheetScheme === option ? editor.compositionChipActive : ""
                  }`}
                  onClick={() => selectSheetScheme(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
            {sheetVariantOptions.length > 0 ? (
              <div className={editor.compositionVariantGrid} role="group" aria-label="Variante del esquema">
                {sheetVariantOptions.map((option) => (
                  <button
                    key={option}
                    className={`${editor.compositionChip} ${
                      componentForm.sheetVariant === option ? editor.compositionChipActive : ""
                    }`}
                    onClick={() => onComponentChange("sheetVariant", option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
            {showCustomSchemeDescription && !componentForm.guidedVisualConfig ? (
              <label className={s.field}>
                <span className={s.label}>Describe la composición</span>
                <input
                  className={s.input}
                  maxLength={120}
                  placeholder="Ej: fijo superior + lateral"
                  value={componentForm.customSchemeDescription}
                  onChange={(event) =>
                    onComponentChange("customSchemeDescription", event.target.value)
                  }
                />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      {canUseGuidedComposer ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Composición personalizada</span>
            <strong>
              {componentForm.guidedVisualConfig
                ? "Editar módulos"
                : "Abrir constructor visual"}
            </strong>
            <p>Divide el marco y asigna el tipo de cada módulo.</p>
          </div>
          <div className={editor.compositionGrid}>
            <button
              type="button"
              className={`${editor.compositionChip} ${
                componentForm.guidedVisualConfig ? editor.compositionChipActive : ""
              }`}
              onClick={openGuidedComposer}
            >
              {componentForm.guidedVisualConfig ? "Editar composición" : "Abrir constructor"}
            </button>
            {componentForm.guidedVisualConfig ? (
              <button
                type="button"
                className={editor.compositionChip}
                onClick={clearGuidedComposer}
              >
                Quitar dibujo
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {configPreviewSvg || currentComponentPreviewSvg ? (
        <div className={editor.configPreviewCard}>
          <div className={editor.configPreviewThumb}>
            <div
              className={editor.configPreviewSvg}
              dangerouslySetInnerHTML={{ __html: configPreviewSvg || currentComponentPreviewSvg }}
            />
          </div>
          <div className={editor.configPreviewCopy}>
            <span>Vista de la pieza</span>
            <strong>{componentForm.tipo}</strong>
            {configPreviewSummary ? <p>{configPreviewSummary}</p> : null}
          </div>
        </div>
      ) : null}

      {guidedDraft ? (
        <GuidedVisualComposer
          open={isGuidedComposerOpen}
          config={guidedDraft}
          colorHex={componentForm.colorHex}
          pieceTitle={
            [componentForm.tipo, componentForm.sistema].filter(Boolean).join(" ") || "Pieza"
          }
          onChange={setGuidedDraft}
          onApply={applyGuidedComposer}
          onClose={() => setIsGuidedComposerOpen(false)}
          onClear={componentForm.guidedVisualConfig ? clearGuidedComposer : undefined}
        />
      ) : null}
    </div>
  );
}

/* ─── Tab 2: Medidas y terminaciones ─── */

function TabMedidas({
  componentForm,
  fieldErrors,
  currentComponentPreviewSvg,
  linePricingSummary,
  isGlassPanelOpen,
  glassQuery,
  recommendedGlassOptions,
  recommendedGlassReason,
  lineTemplateRecommendedGlass,
  filteredGlassGroups,
  canCreateCustomGlass,
  onComponentChange,
  onToggleGlassPanel,
  onGlassQueryChange,
  onGlassSelect,
  onCreateCustomGlass,
  onEditarPrecio,
}: Pick<
  Props,
  | "componentForm"
  | "fieldErrors"
  | "currentComponentPreviewSvg"
  | "linePricingSummary"
  | "isGlassPanelOpen"
  | "glassQuery"
  | "recommendedGlassOptions"
  | "recommendedGlassReason"
  | "lineTemplateRecommendedGlass"
  | "filteredGlassGroups"
  | "canCreateCustomGlass"
  | "onComponentChange"
  | "onToggleGlassPanel"
  | "onGlassQueryChange"
  | "onGlassSelect"
  | "onCreateCustomGlass"
> & {
  onEditarPrecio: () => void;
}) {
  const isMirrorComponent = componentForm.tipo === "Espejo";
  const hideGlass = componentForm.tipo === "Trabajo personalizado" || isFreeValueComponentType(componentForm.tipo);

  return (
    <div className={editor.tabContent}>
      <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Medidas</span>
          <strong>Dimensiones del componente</strong>
          <p>Si elegiste una linea comercial, el precio sugerido se recalcula al cambiar las medidas.</p>
        </div>
        <div className={s.stepTwoMobileMedidasRow}>
          <div className={s.stepTwoMobileMedidaField}>
            <label className={s.stepTwoMobileMedidaLabel} htmlFor="editor-ancho">
              Ancho (mm)
            </label>
            <input
              className={s.stepTwoMobileMedidaInput}
              id="editor-ancho"
              inputMode="numeric"
              placeholder="1200"
              type="text"
              value={componentForm.ancho}
              onChange={(event) => onComponentChange("ancho", event.target.value)}
            />
          </div>
          <div className={s.stepTwoMobileBlockX}>x</div>
          <div className={s.stepTwoMobileMedidaField}>
            <label className={s.stepTwoMobileMedidaLabel} htmlFor="editor-alto">
              Alto (mm)
            </label>
            <input
              className={s.stepTwoMobileMedidaInput}
              id="editor-alto"
              inputMode="numeric"
              placeholder="1500"
              type="text"
              value={componentForm.alto}
              onChange={(event) => onComponentChange("alto", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Cantidad</span>
          <strong>Cantidad por componente</strong>
        </div>
        <div className={s.formGrid2}>
          <label className={s.field}>
            <span className={s.label}>Unidades de esta pieza</span>
            <input
              className={`${s.input} ${fieldErrors.cantidad ? s.inputError : ""}`}
              type="number"
              min="1"
              step="1"
              value={componentForm.cantidad}
              onChange={(event) => onComponentChange("cantidad", event.target.value)}
            />
            {fieldErrors.cantidad ? <span className={s.fieldError}>{fieldErrors.cantidad}</span> : null}
          </label>
          <label className={s.field}>
            <span className={s.label}>Codigo</span>
            <input
              className={`${s.input} ${s.inputMono} ${fieldErrors.codigo ? s.inputError : ""}`}
              value={componentForm.codigo}
              onChange={(event) => onComponentChange("codigo", event.target.value.toUpperCase())}
              placeholder="V1"
            />
            {fieldErrors.codigo ? <span className={s.fieldError}>{fieldErrors.codigo}</span> : null}
          </label>
        </div>
      </section>

      {!hideGlass ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>{isMirrorComponent ? "Espejos" : "Vidrio"}</span>
            <strong>{isMirrorComponent ? "Espejos recomendados" : "Vidrio"}</strong>
          </div>
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>Tipo de vidrio</span>
            <div className={s.inlineSelector}>
              <button
                className={`${s.inlineSelectorTrigger} ${isGlassPanelOpen ? s.inlineSelectorTriggerActive : ""}`}
                type="button"
                onClick={onToggleGlassPanel}
              >
                <span className={componentForm.vidrio ? s.inlineSelectorValue : s.inlineSelectorPlaceholder}>
                  {componentForm.vidrio || "Sin vidrio seleccionado"}
                </span>
                <span className={s.inlineSelectorMeta}>{isGlassPanelOpen ? "Cerrar" : "Elegir"}</span>
              </button>
              {isGlassPanelOpen ? (
                <div className={s.inlineSelectorPanel}>
                  <div className={s.glassSearchWrap}>
                  <LuSearch className={s.glassSearchIcon} aria-hidden /> 
                    <input
                      className={s.glassSearchInput}
                      value={glassQuery}
                      onChange={(event) => onGlassQueryChange(event.target.value)}
                      placeholder="Buscar por vidrio o categoria"
                    />
                  </div>
                  {recommendedGlassOptions.length > 0 ? (
                    <div className={s.stepTwoMobileGlassRecommendedBox}>
                      <div className={s.stepTwoMobileGlassRecommendedHeader}>
                        <strong>
                          {isMirrorComponent
                            ? "Recomendado para espejos"
                            : lineTemplateRecommendedGlass
                              ? "Recomendado para esta linea"
                              : "Vidrios sugeridos"}
                        </strong>
                        <span>{recommendedGlassReason}</span>
                      </div>
                      <div className={s.glassChipGrid}>
                        {recommendedGlassOptions.map((option) => {
                          const isActive = componentForm.vidrio === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${s.glassChip} ${isActive ? s.glassChipActive : ""}`}
                              onClick={() => onGlassSelect(option)}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className={s.glassGroups}>
                    {filteredGlassGroups.length === 0 ? (
                      <div className={s.glassEmptyState}>
                        <span>No encontramos opciones con ese texto.</span>
                        {canCreateCustomGlass ? (
                          <button
                            className={s.glassChip}
                            type="button"
                            onClick={() => onCreateCustomGlass(glassQuery)}
                          >
                            Guardar {glassQuery.trim()}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      filteredGlassGroups.map((group, groupIndex) => (
                        <section key={group.grupo} className={s.glassGroup}>
                          {groupIndex > 0 ? <div className={s.glassDivider} /> : null}
                          <div className={s.glassGroupTitle}>{group.grupo}</div>
                          <div className={s.glassChipGrid}>
                            {group.items.map((glassItem) => {
                              const fullValue = buildGlassValue(group.prefix, glassItem);
                              const isActive = componentForm.vidrio === fullValue;
                              return (
                                <button
                                  key={`${group.grupo}-${glassItem}`}
                                  type="button"
                                  className={`${s.glassChip} ${isActive ? s.glassChipActive : ""}`}
                                  onClick={() => onGlassSelect(fullValue)}
                                >
                                  {glassItem}
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                  <div className={s.inlineSelectorActions}>
                    {componentForm.vidrio ? (
                      <button className={s.inlineSelectorClear} type="button" onClick={() => onGlassSelect("")}>
                        Limpiar
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {!hideGlass && !isFreeValueComponentType(componentForm.tipo) && shouldRequireProfileMaterialForComponent(componentForm.tipo) ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Color</span>
            <strong>Color del perfil</strong>
          </div>
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>Color</span>
            <div className={s.colorSwatches}>
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  title={color.label}
                  className={`${s.colorSwatch} ${componentForm.colorHex === color.hex ? s.colorSwatchActive : ""}`}
                  style={{ background: color.hex }}
                  onClick={() => onComponentChange("colorHex", color.hex)}
                />
              ))}
            </div>
            <div className={s.colorLabel}>
              {COLOR_OPTIONS.find((color) => color.hex === componentForm.colorHex)?.label ?? "Color"}
            </div>
          </div>
        </section>
      ) : null}

      {currentComponentPreviewSvg ? (
        <div className={`${s.quickPreviewCard} ${s.stepTwoPreviewCard}`}>
          <div className={s.quickPreviewThumb}>
            <div
              className={s.quickPreviewThumbSvg}
              dangerouslySetInnerHTML={{ __html: currentComponentPreviewSvg }}
            />
          </div>
        </div>
      ) : null}

      {linePricingSummary.areaM2 !== null ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Area calculada</span>
            <strong>Area</strong>
          </div>
          <div className={editor.areaDisplay}>
            <span className={editor.areaValue}>{linePricingSummary.areaM2} m2</span>
            {linePricingSummary.precioUnitarioSugerido !== null ? (
              <span className={editor.areaHint}>
                Precio sugerido: {CLP(linePricingSummary.precioUnitarioSugerido)} / unidad
              </span>
            ) : null}
          </div>

          {componentForm.referencia?.trim() ? (
            <div className={editor.lineaActual}>
              <span className={editor.lineaActualLabel}>
                Linea actual: {componentForm.referencia}
              </span>
              <button
                type="button"
                className={editor.lineaActualAction}
                onClick={onEditarPrecio}
              >
                Cambiar precio
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {componentForm.nombre?.trim() || componentForm.descripcion?.trim() ? (
        <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
          <div className={s.formSectionHead}>
            <span className={s.formSectionEyebrow}>Detalles</span>
            <strong>Nombre y descripcion</strong>
          </div>
          <label className={s.field}>
            <span className={s.label}>Nombre visible</span>
            <input
              className={s.input}
              value={componentForm.nombre}
              onChange={(event) => onComponentChange("nombre", event.target.value)}
              placeholder="Ej: Ventana living"
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>Descripcion comercial</span>
            <textarea
              className={s.textarea}
              rows={2}
              value={componentForm.descripcion}
              onChange={(event) => onComponentChange("descripcion", event.target.value)}
              placeholder="Ej: Ventana corredera 2 hojas color negro linea S60, vidrio 5mm."
            />
          </label>
        </section>
      ) : null}
    </div>
  );
}

/* ─── Tab 3: Despiece ─── */

function TabDespiece({
  componentForm,
  activeLineTemplates,
  savedCubicationSnapshot,
  onSaveCubicationLineAdjustment,
  isSavingCubicationLineAdjustment,
  onComponentChange,
}: Pick<
  Props,
  | "componentForm"
  | "activeLineTemplates"
  | "savedCubicationSnapshot"
  | "onSaveCubicationLineAdjustment"
  | "isSavingCubicationLineAdjustment"
  | "onComponentChange"
>) {
  const selectedLineTemplate =
    activeLineTemplates.find(
      (template) => String(template.id) === componentForm.lineTemplateId
    ) ?? null;
  const personalizadoAssistMode = isCubicationPersonalizadoAssistMode({
    tipo: componentForm.tipo,
    sistema: componentForm.sistema,
    sheetScheme: componentForm.sheetScheme,
    configuracion: componentForm.configuracion,
    isCustomScheme: componentForm.isCustomScheme,
  });

  if (isFreeValueComponentType(componentForm.tipo)) {
    return null;
  }

  return (
    <div className={editor.tabContent}>
      <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Despiece</span>
          <strong>Cubicación y pauta de cortes</strong>
          <p>Revisa el despiece estimado según medidas, línea y partida configurada.</p>
        </div>
        <PautaCubicacionPanel
          componentForm={componentForm}
          selectedTemplate={selectedLineTemplate}
          savedCubicationSnapshot={savedCubicationSnapshot}
          onCubicationSnapshotChange={(value) =>
            onComponentChange("cubicationSnapshot", value)
          }
          onSaveCubicationLineAdjustment={onSaveCubicationLineAdjustment}
          isSavingCubicationLineAdjustment={isSavingCubicationLineAdjustment}
          lineSelectionHint="precio"
          showBarUsageInline
          personalizadoAssistMode={personalizadoAssistMode}
          layout="workspace"
        />
      </section>
    </div>
  );
}

/* ─── Tab 4: Precio ─── */

function TabPrecio({
  componentForm,
  fieldErrors,
  activeLineTemplates,
  linePricingSummary,
  isSavingQuickPriceTemplate,
  precioDisplay,
  onComponentChange,
  onSelectLineTemplate,
  onPricingModeSelection,
  onRecalculateCurrentTemplatePrice,
  onSaveQuickPriceTemplate,
}: Pick<
  Props,
  | "componentForm"
  | "fieldErrors"
  | "activeLineTemplates"
  | "linePricingSummary"
  | "isSavingQuickPriceTemplate"
  | "onComponentChange"
  | "onSelectLineTemplate"
  | "onPricingModeSelection"
  | "onRecalculateCurrentTemplatePrice"
  | "onSaveQuickPriceTemplate"
> & {
  precioDisplay: FormPriceDisplay;
}) {
  const isGlassCatalogItem = isGlassCatalogSelection(componentForm);
  const visibleLineTemplates = filterLineTemplatesForComponent(activeLineTemplates, componentForm);
  const catalogLabel = isGlassCatalogItem ? "Producto de cristal" : "Linea comercial";
  const catalogLabelLower = isGlassCatalogItem ? "producto de cristal" : "linea";
  const cantidad = Number(componentForm.cantidad) > 0 ? Number(componentForm.cantidad) : 1;

  return (
    <div className={editor.tabContent}>
      <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>{catalogLabel}</span>
          <strong>{isGlassCatalogItem ? "Cristal y referencia" : "Linea y referencia"}</strong>
          <p>
            {isGlassCatalogItem
              ? "Elige un producto de cristal guardado si quieres calcular por m2."
              : "Elige una linea comercial si quieres calcular por m2."}
          </p>
        </div>
        <div className={`${s.field} ${s.fieldFull}`}>
          <span className={s.label}>{catalogLabel}</span>
          <div className={s.formGrid2}>
            <LineTemplatePicker
              templates={visibleLineTemplates}
              value={componentForm.lineTemplateId}
              onChange={onSelectLineTemplate}
              mode={isGlassCatalogItem ? "glass" : "profile"}
              ariaLabel={`Seleccionar ${catalogLabelLower}`}
            />
            <label className={s.field}>
              <span className={s.label}>
                {isGlassCatalogItem ? "Nombre visible del cristal" : "Nombre visible de la linea"}
              </span>
              <input
                className={s.input}
                value={componentForm.referencia}
                onChange={(event) => onComponentChange("referencia", event.target.value)}
                placeholder={isGlassCatalogItem ? "Ej: Cristal templado 10 mm" : "Ej: S60, Serie 25, Linea premium"}
              />
            </label>
          </div>
        </div>
      </section>

      <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Metodo</span>
          <strong>Forma de precio</strong>
        </div>

        <div className={s.field}>
          <span className={s.label}>Metodo de precio</span>
          <div className={s.segmentedChoiceGrid} role="radiogroup" aria-label="Metodo de precio">
            <label className={`${s.segmentedChoice} ${componentForm.pricingMode === "precio_directo" && componentForm.lineTemplateId && componentForm.precioPorM2?.trim() ? s.segmentedChoiceActive : ""}`}>
              <input
                className={s.segmentedChoiceInput}
                type="radio"
                name="editor-pricing-mode"
                value="linea"
                checked={componentForm.pricingMode === "precio_directo" && Boolean(componentForm.lineTemplateId && componentForm.precioPorM2?.trim())}
                onChange={() => {
                  onPricingModeSelection("precio_directo");
                }}
              />
              <span className={s.segmentedChoiceTitle}>Precio por linea</span>
              <span className={s.segmentedChoiceHint}>Calculado automaticamente desde m2, minimo y redondeo.</span>
            </label>
            <label className={`${s.segmentedChoice} ${componentForm.pricingMode === "margen" ? s.segmentedChoiceActive : ""}`}>
              <input
                className={s.segmentedChoiceInput}
                type="radio"
                name="editor-pricing-mode"
                value="margen"
                checked={componentForm.pricingMode === "margen"}
                onChange={() => onPricingModeSelection("margen")}
              />
              <span className={s.segmentedChoiceTitle}>Costo + margen</span>
              <span className={s.segmentedChoiceHint}>Calcula la venta desde precio base y margen.</span>
            </label>
            <label className={`${s.segmentedChoice} ${componentForm.pricingMode === "precio_directo" && (!componentForm.lineTemplateId || !componentForm.precioPorM2?.trim()) ? s.segmentedChoiceActive : ""}`}>
              <input
                className={s.segmentedChoiceInput}
                type="radio"
                name="editor-pricing-mode"
                value="manual"
                checked={componentForm.pricingMode === "precio_directo" && (!componentForm.lineTemplateId || !componentForm.precioPorM2?.trim())}
                onChange={() => onPricingModeSelection("precio_directo")}
              />
              <span className={s.segmentedChoiceTitle}>Precio manual</span>
              <span className={s.segmentedChoiceHint}>Tu defines el precio final sin calculo automatico.</span>
            </label>
          </div>
        </div>

        {componentForm.pricingMode === "precio_directo" && componentForm.lineTemplateId && componentForm.precioPorM2?.trim() ? (
          <div className={s.lineTemplateSummaryCard}>
            <div className={s.lineTemplateSummaryHeader}>
              <div>
                <span className={s.lineTemplateSummaryEyebrow}>Precio por linea</span>
                <strong className={s.lineTemplateSummaryTitle}>{componentForm.referencia}</strong>
              </div>
              <span className={`${s.lineTemplateSummaryStatus} ${componentForm.precioAjustadoManual ? s.lineTemplateSummaryStatusManual : s.lineTemplateSummaryStatusAutomatic}`}>
                {componentForm.precioAjustadoManual ? "Precio ajustado manualmente" : "Precio automatico por linea"}
              </span>
            </div>
            <div className={s.lineTemplateSummaryGrid}>
              <div>
                <span className={s.lineTemplateSummaryLabel}>Precio por m2</span>
                <strong>{CLP(Number(componentForm.precioPorM2 || 0))}</strong>
              </div>
              <div>
                <span className={s.lineTemplateSummaryLabel}>Minimo</span>
                <strong>{CLP(Number(componentForm.minimoCobrable || 0))}</strong>
              </div>
              <div>
                <span className={s.lineTemplateSummaryLabel}>Redondeo</span>
                <strong>{Number(componentForm.redondeoPrecio || 0) > 0 ? CLP(Number(componentForm.redondeoPrecio || 0)) : "Sin redondeo"}</strong>
              </div>
              <div>
                <span className={s.lineTemplateSummaryLabel}>Precio sugerido</span>
                <strong>{linePricingSummary.precioUnitarioSugerido !== null ? CLP(linePricingSummary.precioUnitarioSugerido) : linePricingSummary.motivoNoCalculado ?? "Completa medidas"}</strong>
              </div>
            </div>
            <div className={s.lineTemplateSummaryActions}>
              {componentForm.precioAjustadoManual ? (
                <button type="button" className={s.btnGhost} onClick={onRecalculateCurrentTemplatePrice}>
                  Recalcular con linea
                </button>
              ) : null}
              <button type="button" className={s.btnGhost} onClick={onSaveQuickPriceTemplate} disabled={isSavingQuickPriceTemplate}>
                {isSavingQuickPriceTemplate ? "Guardando..." : "Guardar como precio rapido"}
              </button>
            </div>
            <div className={editor.lineaAjusteRow}>
              <span className={s.label}>Ajustar valor de esta pieza</span>
              <input
                className={s.input}
                inputMode="numeric"
                value={componentForm.costoProveedorUnitario}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^\d]/g, "");
                  onComponentChange("costoProveedorUnitario", digits);
                }}
                placeholder="Precio unitario"
              />
              <span className={s.helpText}>Sin modificar la linea global.</span>
            </div>
          </div>
        ) : null}

        {componentForm.pricingMode === "margen" ? (
          <div className={editor.margenFields}>
            <div className={s.formGrid2}>
              <label className={s.field}>
                <span className={s.label}>Costo estimado</span>
                <input
                  className={s.input}
                  inputMode="numeric"
                  value={componentForm.costoProveedorUnitario}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/[^\d]/g, "");
                    onComponentChange("costoProveedorUnitario", digits);
                  }}
                  placeholder="0"
                />
              </label>
              <label className={s.field}>
                <span className={s.label}>Margen %</span>
                <div className={s.selectWrap}>
                  <select
                    className={s.input}
                    value={componentForm.margenPct}
                    onChange={(event) => onComponentChange("margenPct", event.target.value)}
                    aria-label="Margen a aplicar"
                  >
                    {MARGIN_SELECT_OPTIONS.map((preset) => (
                      <option key={preset} value={String(preset)}>
                        {preset === 0 ? "0% (sin margen)" : `${preset}%`}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.margenPct ? <span className={s.fieldError}>{fieldErrors.margenPct}</span> : null}
              </label>
            </div>
            {precioDisplay.precioUnitario > 0 ? (
              <div className={editor.precioSugerido}>
                <span>Precio sugerido: {CLP(precioDisplay.precioUnitario)} / unidad</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {componentForm.pricingMode === "precio_directo" && (!componentForm.lineTemplateId || !componentForm.precioPorM2?.trim()) ? (
          <div className={editor.margenFields}>
            <div className={s.field}>
              <span className={s.label}>Precio final</span>
              <input
                className={s.input}
                inputMode="numeric"
                value={componentForm.costoProveedorUnitario}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^\d]/g, "");
                  onComponentChange("costoProveedorUnitario", digits);
                }}
                placeholder="Ej: 120000"
              />
              <span className={s.helpText}>Valor por unidad. Se multiplica por cantidad.</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${s.formSection} ${editor.resumenSection}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Resumen</span>
          <strong>Resumen de esta pieza</strong>
        </div>
        <div className={editor.resumenGrid}>
          <div className={editor.resumenItem}>
            <span className={editor.resumenLabel}>Cantidad</span>
            <strong className={editor.resumenValue}>{cantidad}</strong>
          </div>
          <div className={editor.resumenItem}>
            <span className={editor.resumenLabel}>Precio unitario</span>
            <strong className={editor.resumenValue}>{CLP(precioDisplay.precioUnitario)}</strong>
          </div>
          <div className={editor.resumenItem}>
            <span className={editor.resumenLabel}>Total de esta pieza</span>
            <strong className={`${editor.resumenValue} ${editor.resumenTotal}`}>
              {CLP(precioDisplay.precioTotal)}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}

/* â”€â”€â”€ Tab detalles (Trabajo libre) â”€â”€â”€ */

function TabDetallesLibre({
  componentForm,
  fieldErrors,
  onComponentChange,
}: Pick<Props, "componentForm" | "fieldErrors" | "onComponentChange">) {
  return (
    <div className={editor.tabContent}>
      <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Detalles</span>
          <strong>Nombre y descripcion del trabajo</strong>
        </div>
        <label className={s.field}>
          <span className={s.label}>Nombre del trabajo</span>
          <input
            className={s.input}
            value={componentForm.nombre}
            onChange={(event) => onComponentChange("nombre", event.target.value)}
            placeholder="Ej: Mantencion de ventanas"
          />
          {fieldErrors.nombre ? <small className={s.inlineError}>{fieldErrors.nombre}</small> : null}
        </label>
        <label className={s.field}>
          <span className={s.label}>Descripcion para cliente</span>
          <textarea
            className={s.textarea}
            rows={3}
            value={componentForm.descripcion}
            onChange={(event) => onComponentChange("descripcion", event.target.value)}
            placeholder="Ej: Mantencion de 5 ventanas existentes, ajuste de corredera, revision de pestillos y limpieza de rieles."
          />
        </label>
        <div className={s.field}>
          <span className={s.label}>Incluye (visible en PDF)</span>
          <input
            className={s.input}
            value={componentForm.observaciones ?? ""}
            onChange={(event) => onComponentChange("observaciones", event.target.value)}
            placeholder="Ej: Incluye traslado, instalacion y materiales."
          />
        </div>
      </section>
    </div>
  );
}

/* â”€â”€â”€ Editor principal â”€â”€â”€ */

export function PasoDosEditorDesktop(props: Props) {
  const {
    componentForm,
    onAddOrUpdateItem,
    onResetStep2Form,
    isSaving,
  } = props;

  const isFreeValue = useMemo(
    () => componentForm.tipo === "Trabajo personalizado" || isFreeValueComponentType(componentForm.tipo),
    [componentForm.tipo]
  );

  const [formSnapshot] = useState(() =>
    props.originalFormSnapshot ? { ...props.originalFormSnapshot } : null
  );

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isFreeValue) return "detalles";
    return "configuracion";
  });

  const effectiveTab = useMemo(() => {
    if (isFreeValue && activeTab !== "detalles" && activeTab !== "precio") {
      return "detalles";
    }
    return activeTab;
  }, [isFreeValue, activeTab]);

  const precioDisplay = useMemo(
    () => resolveFormPrecioVenta(componentForm, props.linePricingSummary),
    [
      componentForm,
      props.linePricingSummary,
    ]
  );

  const hasChanges = useMemo(
    () => hasUnsavedChanges(componentForm, formSnapshot),
    [componentForm, formSnapshot]
  );

  const handleEditarPrecio = useCallback(() => {
    setActiveTab("precio");
  }, []);

  const handleCerrar = useCallback(() => {
    onResetStep2Form();
  }, [onResetStep2Form]);

  const handleCancelar = useCallback(() => {
    onResetStep2Form();
  }, [onResetStep2Form]);

  const tabs: { key: string; label: string; done?: boolean }[] = isFreeValue
    ? [
        { key: "detalles", label: "Detalles", done: Boolean(componentForm.nombre?.trim()) },
        { key: "precio", label: "Precio", done: precioDisplay.precioTotal > 0 },
      ]
    : [
        {
          key: "configuracion",
          label: "Configuracion",
          done: Boolean(componentForm.tipo && componentForm.sistema),
        },
        {
          key: "medidas",
          label: "Medidas",
          done: Boolean(componentForm.ancho || componentForm.alto || componentForm.vidrio),
        },
        {
          key: "despiece",
          label: "Despiece",
          done: Boolean(componentForm.ancho && componentForm.alto),
        },
        { key: "precio", label: "Precio", done: precioDisplay.precioTotal > 0 },
      ];

  const activeStepLabel = tabs.find((tab) => tab.key === effectiveTab)?.label;

  return (
    <section className={editor.root} id="component-form">
      <EditorHeader
        componentForm={componentForm}
        precio={precioDisplay}
        onEditarPrecio={handleEditarPrecio}
        onCerrar={handleCerrar}
        hasChanges={hasChanges}
        isDesktopQuoteStudio={props.isDesktopQuoteStudio}
        activeStepLabel={activeStepLabel}
      />

      <EditorTabs
        tabs={tabs}
        activeTab={effectiveTab}
        onTabChange={setActiveTab}
      />

      <div className={editor.tabBody}>
        {!isFreeValue && effectiveTab === "configuracion" ? (
          <TabConfiguracion
            componentForm={componentForm}
            fieldErrors={props.fieldErrors}
            currentComponentPreviewSvg={props.currentComponentPreviewSvg}
            onComponentChange={props.onComponentChange}
          />
        ) : !isFreeValue && effectiveTab === "medidas" ? (
          <TabMedidas
            componentForm={componentForm}
            fieldErrors={props.fieldErrors}
            currentComponentPreviewSvg={props.currentComponentPreviewSvg}
            linePricingSummary={props.linePricingSummary}
            isGlassPanelOpen={props.isGlassPanelOpen}
            glassQuery={props.glassQuery}
            recommendedGlassOptions={props.recommendedGlassOptions}
            recommendedGlassReason={props.recommendedGlassReason}
            lineTemplateRecommendedGlass={props.lineTemplateRecommendedGlass}
            filteredGlassGroups={props.filteredGlassGroups}
            canCreateCustomGlass={props.canCreateCustomGlass}
            onComponentChange={props.onComponentChange}
            onToggleGlassPanel={props.onToggleGlassPanel}
            onGlassQueryChange={props.onGlassQueryChange}
            onGlassSelect={props.onGlassSelect}
            onCreateCustomGlass={props.onCreateCustomGlass}
            onEditarPrecio={handleEditarPrecio}
          />
        ) : !isFreeValue && effectiveTab === "despiece" ? (
          <TabDespiece
            componentForm={componentForm}
            activeLineTemplates={props.activeLineTemplates}
            savedCubicationSnapshot={props.savedCubicationSnapshot}
            onSaveCubicationLineAdjustment={props.onSaveCubicationLineAdjustment}
            isSavingCubicationLineAdjustment={props.isSavingCubicationLineAdjustment}
            onComponentChange={props.onComponentChange}
          />
        ) : isFreeValue && effectiveTab === "detalles" ? (
          <TabDetallesLibre
            componentForm={componentForm}
            fieldErrors={props.fieldErrors}
            onComponentChange={props.onComponentChange}
          />
        ) : effectiveTab === "precio" ? (
          <TabPrecio
            componentForm={componentForm}
            fieldErrors={props.fieldErrors}
            activeLineTemplates={props.activeLineTemplates}
            linePricingSummary={props.linePricingSummary}
            isSavingQuickPriceTemplate={props.isSavingQuickPriceTemplate}
            precioDisplay={precioDisplay}
            onComponentChange={props.onComponentChange}
            onSelectLineTemplate={props.onSelectLineTemplate}
            onPricingModeSelection={props.onPricingModeSelection}
            onRecalculateCurrentTemplatePrice={props.onRecalculateCurrentTemplatePrice}
            onSaveQuickPriceTemplate={props.onSaveQuickPriceTemplate}
          />
        ) : null}
      </div>

      <EditorFooter
        codigo={componentForm.codigo}
        precio={precioDisplay}
        hasChanges={hasChanges}
        onCancelar={handleCancelar}
        onGuardar={onAddOrUpdateItem}
        isSaving={isSaving}
      />
    </section>
  );
}
