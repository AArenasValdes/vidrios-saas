"use client";

import { LuPencil, LuPlus } from "react-icons/lu";

import {
  CLP,
  COMPONENT_TYPE_GROUPS,
  getCompositionSectionLabel,
  getSheetSchemeOptions,
  getSheetVariantOptions,
  MARGIN_SELECT_OPTIONS,
  MATERIAL_OPTIONS,
  MAX_COMPONENTS_PER_QUOTE,
  requiresCustomSheetDescription,
  shouldShowSheetSchemeForComponent,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { isFreeValueComponentType } from "@/features/cotizaciones/services/component-catalog.service";
import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosFormularioComponenteProps,
  | "itemsCount"
  | "editingItemId"
  | "componentForm"
  | "quotePricingMode"
  | "fieldErrors"
  | "isMobileViewport"
  | "currentComponentPreviewSvg"
  | "batchPreviewCodes"
  | "visibleBatchPreviewCodes"
  | "hiddenBatchPreviewCount"
  | "batchPreviewTypeLabel"
  | "activeLineTemplates"
  | "linePricingSummary"
  | "isSavingQuickPriceTemplate"
  | "onPricingModeSelection"
  | "onComponentChange"
  | "onSelectLineTemplate"
  | "onRecalculateCurrentTemplatePrice"
  | "onSaveQuickPriceTemplate"
>;

export function PasoDosFormularioBloqueConfiguracion({
  itemsCount,
  editingItemId,
  componentForm,
  quotePricingMode,
  fieldErrors,
  isMobileViewport,
  currentComponentPreviewSvg,
  batchPreviewCodes,
  visibleBatchPreviewCodes,
  hiddenBatchPreviewCount,
  batchPreviewTypeLabel,
  activeLineTemplates,
  linePricingSummary,
  isSavingQuickPriceTemplate,
  onPricingModeSelection,
  onComponentChange,
  onSelectLineTemplate,
  onRecalculateCurrentTemplatePrice,
  onSaveQuickPriceTemplate,
}: Props) {
  const visibleLineTemplates = activeLineTemplates.filter(
    (template) => template.material === componentForm.material
  );
  const showSheetScheme = shouldShowSheetSchemeForComponent({
    tipo: componentForm.tipo,
    sistema: componentForm.sistema,
  });
  const sheetSchemeOptions = getSheetSchemeOptions({
    tipo: componentForm.tipo,
    sistema: componentForm.sistema,
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
  const availableSlots = Math.max(1, MAX_COMPONENTS_PER_QUOTE - itemsCount);
  const batchPresetOptions = Array.from(
    new Set(
      (isMobileViewport ? [1, 2, 4, 8] : [1, 2, 3, 4]).filter((preset) => preset <= availableSlots)
    )
  );
  const isTrabajoPersonalizado = componentForm.tipo === "Trabajo personalizado";
  const isFreeValue = isTrabajoPersonalizado || isFreeValueComponentType(componentForm.tipo);
  const trabajoPersonalizadoTexto =
    componentForm.descripcion.trim() ||
    componentForm.nombre.trim() ||
    "Describe el trabajo para que aparezca como alcance comercial.";

  const linePricingBlock = (
    <>
      <div className={`${s.field} ${s.fieldFull}`}>
        <span className={s.label}>Linea comercial</span>
        <div className={s.formGrid2}>
          <div className={s.selectWrap}>
            <select
              className={s.input}
              value={componentForm.lineTemplateId}
              onChange={(event) => onSelectLineTemplate(event.target.value)}
              aria-label="Seleccionar linea comercial"
            >
              <option value="">Precio manual o sin linea</option>
              {visibleLineTemplates.map((template) => (
                <option key={template.id} value={String(template.id)}>
                  {`${template.nombre} · ${template.material} · ${CLP(template.precioM2Sugerido)}/m² · Mín. ${
                    template.minimoCobrable > 0 ? CLP(template.minimoCobrable) : "Sin mínimo"
                  } · Redondeo ${
                    template.redondeoPrecio > 0 ? CLP(template.redondeoPrecio) : "Sin redondeo"
                  }`}
                </option>
              ))}
            </select>
          </div>
          <label className={s.field}>
            <span className={s.label}>Nombre visible de la linea</span>
            <input
              className={s.input}
              value={componentForm.referencia}
              onChange={(event) => onComponentChange("referencia", event.target.value)}
              placeholder="Ej: S60, Serie 25, Linea premium"
            />
          </label>
        </div>
        <span className={s.helpText}>
          Si eliges una linea de {componentForm.material}, Ventora sugerira el precio final cuando cargues medidas.
        </span>
      </div>

      {componentForm.referencia.trim() && componentForm.precioPorM2.trim() ? (
        <div className={s.lineTemplateSummaryCard}>
          <div className={s.lineTemplateSummaryHeader}>
            <div>
              <span className={s.lineTemplateSummaryEyebrow}>Precio por línea</span>
              <strong className={s.lineTemplateSummaryTitle}>{componentForm.referencia}</strong>
            </div>
            <span
              className={`${s.lineTemplateSummaryStatus} ${
                componentForm.precioAjustadoManual
                  ? s.lineTemplateSummaryStatusManual
                  : s.lineTemplateSummaryStatusAutomatic
              }`}
            >
              {componentForm.precioAjustadoManual
                ? "Precio ajustado manualmente"
                : "Precio automático por línea"}
            </span>
          </div>
          <div className={s.lineTemplateSummaryGrid}>
            <div>
              <span className={s.lineTemplateSummaryLabel}>Precio por m²</span>
              <strong>{CLP(Number(componentForm.precioPorM2 || 0))}</strong>
            </div>
            <div>
              <span className={s.lineTemplateSummaryLabel}>Minimo</span>
              <strong>{CLP(Number(componentForm.minimoCobrable || 0))}</strong>
            </div>
            <div>
              <span className={s.lineTemplateSummaryLabel}>Redondeo</span>
              <strong>
                {Number(componentForm.redondeoPrecio || 0) > 0
                  ? CLP(Number(componentForm.redondeoPrecio || 0))
                  : "Sin redondeo"}
              </strong>
            </div>
            <div>
              <span className={s.lineTemplateSummaryLabel}>Precio sugerido</span>
              <strong>
                {linePricingSummary.precioUnitarioSugerido !== null
                  ? CLP(linePricingSummary.precioUnitarioSugerido)
                  : linePricingSummary.motivoNoCalculado ?? "Completa medidas"}
              </strong>
            </div>
          </div>
          <details className={s.lineTemplateBreakdown}>
            <summary className={s.lineTemplateBreakdownSummary}>Ver cálculo</summary>
            <div className={s.lineTemplateBreakdownGrid}>
              <div>
                <span>Área calculada</span>
                <strong>
                  {linePricingSummary.areaM2 !== null ? `${linePricingSummary.areaM2} m²` : "-"}
                </strong>
              </div>
              <div>
                <span>Precio base aplicado</span>
                <strong>
                  {linePricingSummary.precioBaseUnitario !== null
                    ? CLP(linePricingSummary.precioBaseUnitario)
                    : "-"}
                </strong>
              </div>
              <div>
                <span>Mínimo</span>
                <strong>
                  {linePricingSummary.minimoCobrable !== null
                    ? linePricingSummary.minimoAplicado !== null
                      ? `Aplicado · ${CLP(linePricingSummary.minimoAplicado)}`
                      : `No aplicado · ${CLP(linePricingSummary.minimoCobrable)}`
                    : "Sin mínimo"}
                </strong>
              </div>
              <div>
                <span>Redondeo</span>
                <strong>
                  {linePricingSummary.redondeoPrecio && linePricingSummary.redondeoPrecio > 0
                    ? linePricingSummary.redondeoAplicado && linePricingSummary.redondeoAplicado > 0
                      ? `+${CLP(linePricingSummary.redondeoAplicado)}`
                      : "No aplicado"
                    : "Sin redondeo"}
                </strong>
              </div>
              <div>
                <span>Cantidad</span>
                <strong>{componentForm.cantidad || "1"}</strong>
              </div>
              <div>
                <span>Total sugerido</span>
                <strong>
                  {linePricingSummary.totalSugerido !== null ? CLP(linePricingSummary.totalSugerido) : "-"}
                </strong>
              </div>
            </div>
          </details>
          <div className={s.lineTemplateSummaryActions}>
            {componentForm.precioAjustadoManual ? (
              <button type="button" className={s.btnGhost} onClick={onRecalculateCurrentTemplatePrice}>
                Recalcular con línea
              </button>
            ) : null}
            <button
              type="button"
              className={s.btnGhost}
              onClick={onSaveQuickPriceTemplate}
              disabled={isSavingQuickPriceTemplate}
            >
              {isSavingQuickPriceTemplate ? "Guardando..." : "Guardar como precio rapido"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {!isFreeValue ? (
      <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Material</span>
          <strong>{isMobileViewport ? "Elige el material" : "Elige el material base"}</strong>
          {!isMobileViewport ? <p>Selecciona rapido si este componente es de aluminio o PVC.</p> : null}
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
              {!isMobileViewport ? (
                <span className={s.segmentedChoiceHint}>
                  {materialOption === "Aluminio"
                    ? "Perfil comun para ventanas, puertas y cierres."
                    : "Alternativa liviana para espejos, tapas y trabajos puntuales."}
                </span>
              ) : null}
            </label>
          ))}
        </div>
        {fieldErrors.material ? <span className={s.fieldError}>{fieldErrors.material}</span> : null}
      </section>
      ) : null}

      {!isFreeValue ? (
      <section className={`${s.formSection} ${s.providerOnboardingCard} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Precio</span>
          <strong>
            {quotePricingMode === "total_global"
              ? "Linea para el detalle"
              : isMobileViewport
                ? "Linea y precio"
                : "Linea y forma de precio"}
          </strong>
          {!isMobileViewport ? (
            <p>
              {quotePricingMode === "total_global"
                ? "Elige linea, medidas y vidrio para que el detalle comercial quede claro."
                : "Elige una linea comercial si quieres calcular por m² sin salir a la calculadora."}
            </p>
          ) : null}
        </div>

        {linePricingBlock}

        {quotePricingMode === "por_item" ? (
          <div className={s.field}>
            <span className={s.label}>Forma de cobro</span>
            <div className={s.segmentedChoiceGrid} role="radiogroup" aria-label="Modo de precio">
              <label className={`${s.segmentedChoice} ${componentForm.pricingMode === "margen" ? s.segmentedChoiceActive : ""}`}>
                <input
                  className={s.segmentedChoiceInput}
                  type="radio"
                  name="pricing-mode"
                  value="margen"
                  checked={componentForm.pricingMode === "margen"}
                  onChange={() => onPricingModeSelection("margen")}
                />
                <span className={s.segmentedChoiceTitle}>Con margen</span>
                {!isMobileViewport ? (
                  <span className={s.segmentedChoiceHint}>Calcula la venta desde precio base y margen.</span>
                ) : null}
              </label>
              <label
                className={`${s.segmentedChoice} ${
                  componentForm.pricingMode === "precio_directo" ? s.segmentedChoiceActive : ""
                }`}
              >
                <input
                  className={s.segmentedChoiceInput}
                  type="radio"
                  name="pricing-mode"
                  value="precio_directo"
                  checked={componentForm.pricingMode === "precio_directo"}
                  onChange={() => onPricingModeSelection("precio_directo")}
                />
                <span className={s.segmentedChoiceTitle}>Precio final manual</span>
                {!isMobileViewport ? (
                  <span className={s.segmentedChoiceHint}>Tu defines el precio final sin margen automatico.</span>
                ) : null}
              </label>
            </div>
            {!isMobileViewport ? (
              <span className={s.helpText}>
                {componentForm.pricingMode === "precio_directo"
                  ? "Tu escribes el valor final por componente."
                  : "El sistema calcula la venta con el margen."}
              </span>
            ) : null}
          </div>
        ) : null}

        {quotePricingMode === "por_item" && componentForm.pricingMode === "margen" ? (
          <div className={s.field}>
            <span className={s.label}>
              Margen <span className={s.required}>*</span>
            </span>
            <div className={s.selectWrap}>
              <select
                className={`${s.input} ${fieldErrors.margenPct ? s.inputError : ""}`}
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
          </div>
        ) : null}
      </section>
      ) : null}

      <section className={`${s.formSection} ${s.stepTwoSectionStrong}`}>
        <div className={s.formSectionHead}>
          <span className={s.formSectionEyebrow}>Carga rapida</span>
          <strong>{isMobileViewport ? "Elige el componente" : "Elige el componente base"}</strong>
          {!isMobileViewport ? <p>Te sugerimos una base para que ajustes solo lo necesario.</p> : null}
        </div>

        <div className={`${s.quickPreviewCard} ${s.stepTwoPreviewCard}`}>
          <div className={s.quickPreviewThumb}>
            {isTrabajoPersonalizado ? (
              <div className={s.customWorkPreview}>
                <strong>Descripcion del trabajo</strong>
                <span>{trabajoPersonalizadoTexto}</span>
              </div>
            ) : (
              <div className={s.quickPreviewThumbSvg} dangerouslySetInnerHTML={{ __html: currentComponentPreviewSvg }} />
            )}
          </div>
          <div className={s.quickPreviewBody}>
            <strong>{componentForm.tipo}</strong>
            {!isMobileViewport ? (
              <span>
                {isTrabajoPersonalizado
                  ? "Detalle libre para trabajos especiales o fabricacion a medida."
                  : "Vista rapida. Las medidas y valores finales se ajustan abajo."}
              </span>
            ) : null}
          </div>
        </div>

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

        {showSheetScheme ? (
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>{compositionSectionLabel}</span>
            <div className={s.batchCountRow} role="group" aria-label={compositionSectionLabel}>
              {sheetSchemeOptions.map((option) => (
                <button
                  key={option}
                  className={`${s.batchCountButton} ${
                    componentForm.sheetScheme === option ? s.batchCountButtonActive : ""
                  }`}
                  onClick={() => onComponentChange("sheetScheme", option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>

            {sheetVariantOptions.length > 0 ? (
              <div className={s.typeGroupGrid} role="group" aria-label="Variante del esquema">
                {sheetVariantOptions.map((option) => (
                  <button
                    key={option}
                    className={`${s.typeChip} ${
                      componentForm.sheetVariant === option ? s.typeChipActive : ""
                    }`}
                    onClick={() => onComponentChange("sheetVariant", option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            {showCustomSchemeDescription ? (
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
        ) : null}

        {!editingItemId ? (
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>
              {isMobileViewport ? "Cuantas piezas quieres cargar" : "Cuantos quieres agregar ahora"}
            </span>
            <div className={s.batchCountRow}>
              {batchPresetOptions.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`${s.batchCountButton} ${
                    componentForm.loteCantidad === String(preset) ? s.batchCountButtonActive : ""
                  }`}
                  onClick={() => onComponentChange("loteCantidad", String(preset))}
                >
                  {preset}
                </button>
              ))}
              <input
                className={`${s.input} ${s.batchCountInput}`}
                type="number"
                min="1"
                max={availableSlots}
                step="1"
                value={componentForm.loteCantidad}
                onChange={(event) => onComponentChange("loteCantidad", event.target.value)}
                aria-label="Cantidad de componentes"
              />
            </div>
            {isMobileViewport ? (
              <div className={s.batchPreviewWrap}>
                <span className={s.batchPreviewLabel}>
                  {batchPreviewCodes.length > 0
                    ? `Se crean ${batchPreviewCodes.length} ${batchPreviewTypeLabel}`
                    : `Llegaste al limite de ${MAX_COMPONENTS_PER_QUOTE}`}
                </span>
                <div className={s.batchPreviewCodes}>
                  {visibleBatchPreviewCodes.map((code) => (
                    <span key={code} className={s.batchPreviewCode}>
                      {code}
                    </span>
                  ))}
                  {hiddenBatchPreviewCount > 0 ? (
                    <span className={`${s.batchPreviewCode} ${s.batchPreviewCodeMuted}`}>+{hiddenBatchPreviewCount} mas</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <span className={s.helpText}>
                Si son parecidas, primero cargas una y despues copias medidas y costo.
              </span>
            )}
          </div>
        ) : (
          <div className={s.quickEditBadge}>
            {editingItemId ? <LuPencil aria-hidden /> : <LuPlus aria-hidden />}
            Editando {componentForm.codigo}
          </div>
        )}
      </section>
    </>
  );
}

