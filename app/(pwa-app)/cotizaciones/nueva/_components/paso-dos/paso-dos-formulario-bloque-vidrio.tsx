"use client";

import { LuSearch } from "react-icons/lu";

import { buildGlassValue } from "@/features/cotizaciones/new-quote/workflow-ui";
import { isFreeValueComponentType } from "@/features/cotizaciones/services/component-catalog.service";
import { ManualGlassMeasurementsEditor } from "@/features/cotizaciones/components/manual-glass-measurements-editor";
import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosFormularioComponenteProps,
  | "editingItemId"
  | "componentForm"
  | "isMobileViewport"
  | "isGlassPanelOpen"
  | "glassQuery"
  | "recommendedGlassOptions"
  | "recommendedGlassReason"
  | "lineTemplateRecommendedGlass"
  | "filteredGlassGroups"
  | "glassCatalogTemplates"
  | "canCreateCustomGlass"
  | "onToggleGlassPanel"
  | "onGlassQueryChange"
  | "onGlassSelect"
  | "onCreateCustomGlass"
  | "onComponentChange"
>;

export function PasoDosFormularioBloqueVidrio({
  editingItemId,
  componentForm,
  isMobileViewport,
  isGlassPanelOpen,
  glassQuery,
  recommendedGlassOptions,
  recommendedGlassReason,
  lineTemplateRecommendedGlass,
  filteredGlassGroups,
  glassCatalogTemplates,
  canCreateCustomGlass,
  onToggleGlassPanel,
  onGlassQueryChange,
  onGlassSelect,
  onCreateCustomGlass,
  onComponentChange,
}: Props) {
  if (componentForm.tipo === "Trabajo personalizado" || isFreeValueComponentType(componentForm.tipo)) {
    return null;
  }

  const isMirrorComponent = componentForm.tipo === "Espejo";

  return (
    <section className={`${s.formSection} ${s.stepTwoSectionSoft}`}>
      <div className={s.formSectionHead}>
        <span className={s.formSectionEyebrow}>{isMirrorComponent ? "Espejos" : "Vidrio"}</span>
        <strong>{isMirrorComponent ? "Espejos recomendados" : "Vidrio"}</strong>
        {!isMobileViewport ? <p>Se asigna a esta pieza; puedes usar el mismo producto en otras.</p> : null}
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
          {isMobileViewport ? null : (
            <span className={s.helpText}>
              {componentForm.vidrio
                ? "Puedes cambiarlo o limpiarlo desde este selector."
                : 'Ejemplo: "Incoloro monolitico 5mm". Toca "Elegir vidrio" para cargar uno.'}
            </span>
          )}

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

              {glassCatalogTemplates.length > 0 ? (
                <div className={s.stepTwoMobileGlassRecommendedBox}>
                  <div className={s.stepTwoMobileGlassRecommendedHeader}>
                    <strong>Del catálogo de vidrios</strong>
                    <span>Vincula formato de plancha y costo técnico. No cambia el precio de la ventana.</span>
                  </div>
                  {componentForm.vidrio && !componentForm.vidrioLineTemplateId ? <small>El vidrio actual está guardado solo por nombre. Selecciona un producto para vincular su ficha técnica; no se asociará por similitud.</small> : null}
                  {componentForm.vidrioLineTemplateId ? <small>Vínculo para guardar: {glassCatalogTemplates.find((template) => String(template.id) === componentForm.vidrioLineTemplateId)?.nombre ?? "producto seleccionado"}</small> : null}
                  <div className={s.glassChipGrid}>
                    {glassCatalogTemplates.map((template) => {
                      const isActive =
                        componentForm.vidrioLineTemplateId === String(template.id);

                      return (
                        <button
                          key={template.id}
                          type="button"
                          className={`${s.glassChip} ${isActive ? s.glassChipActive : ""}`}
                          onClick={() => onGlassSelect(template.nombre, String(template.id))}
                        >
                          {template.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {recommendedGlassOptions.length > 0 ? (
                <div className={s.stepTwoMobileGlassRecommendedBox}>
                  <div className={s.stepTwoMobileGlassRecommendedHeader}>
                    <strong>
                      {isMirrorComponent
                        ? "Recomendado para espejos"
                        : lineTemplateRecommendedGlass
                          ? "Sugerido por tu línea"
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
                          onClick={() => onGlassSelect(option, "")}
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
                              onClick={() => onGlassSelect(fullValue, "")}
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
                {!isMobileViewport ? (
                  <span className={s.helpText}>Se guarda igual a como saldra en el PDF.</span>
                ) : null}
                {filteredGlassGroups.length > 0 && canCreateCustomGlass ? (
                  <button
                    className={s.inlineSelectorClear}
                    type="button"
                    onClick={() => onCreateCustomGlass(glassQuery)}
                  >
                    Guardar {glassQuery.trim()}
                  </button>
                ) : null}
                {componentForm.vidrio ? (
                  <button className={s.inlineSelectorClear} type="button" onClick={() => onGlassSelect("", "")}>
                    Limpiar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <span className={s.helpText}>
          Elige el vidrio por categoria. Pensado para tocar rapido desde el celular.
        </span>
      </div>
      {isMirrorComponent ? null : (
        <ManualGlassMeasurementsEditor
          compact={isMobileViewport}
          componentId={editingItemId}
          value={componentForm.manualGlassMeasurements}
          automaticDimensionsAvailable={Boolean(componentForm.fabricacionSnapshot?.result?.vidrios?.some((pane) => pane.anchoMm > 0 && pane.altoMm > 0))}
          automaticPanes={componentForm.fabricacionSnapshot?.result?.vidrios?.map((pane) => ({ id: pane.vidrioId, name: pane.nombre, widthMm: pane.anchoMm, heightMm: pane.altoMm, quantity: pane.cantidadPiezas }))}
          automaticRecipeStatus={componentForm.fabricacionSnapshot?.recipeStatus}
          selectedGlassProductId={componentForm.vidrioLineTemplateId}
          paneConfiguration={{ componentType: componentForm.fabricacionTipologia || componentForm.tipo, system: componentForm.sistema, configuration: componentForm.configuracion, sheetScheme: componentForm.sheetScheme, fabricacionHojas: componentForm.fabricacionHojas, guidedVisualConfig: componentForm.guidedVisualConfig, quickCompositionAdjustment: componentForm.quickCompositionAdjustment }}
          templates={glassCatalogTemplates}
          onChange={(value) => onComponentChange("manualGlassMeasurements", value)}
        />
      )}
    </section>
  );
}
