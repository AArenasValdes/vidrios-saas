"use client";

import { useEffect, useState } from "react";

import {
  ADJUST_MODE_LABELS,
  ADJUST_MODES,
  APERTURA_TIPO_LABELS,
  APERTURA_TIPOS,
  FABRICATION_TYPE_LABELS,
  FABRICATION_TYPES,
  HERRAJE_TIPO_LABELS,
  HERRAJE_TIPOS,
  MEASURE_BASE_LABELS,
  MEASURE_BASES,
  QUANTITY_RULE_LABELS,
  QUANTITY_RULES,
  RECIPE_COMPONENT_FUNCTION_LABELS,
  RECIPE_COMPONENT_FUNCTIONS,
  RECIPE_MISSING_PROFILE_LABEL,
  RECIPE_STATUS_LABELS,
  deriveRecipeStatus,
  duplicateRecipeAsVariant,
  herrajeDisplayLabel,
  isComponentConfigured,
  markRecipeDirtyAfterEdit,
  recipeDisplayProfile,
  resolveComponentBarLengthMm,
  type AperturaTipo,
  type FabricationRecipe,
  type FabricationType,
  type HerrajeTipo,
  type RecipeComponent,
  type RecipeComponentFunction,
  type RecipeStatus,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import {
  BASE_TIPOLOGICA_COPY,
  PLANTILLA_SUGERIDA_COPY,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";
import { createStructuralRecipeTemplate } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-templates";
import {
  addRecipeComponentByFunction,
  applyRealMeasuresAsAdjustments,
  buildRecipeCuttingPreview,
  confirmRecipeValidated,
  resolveComponentQuantity,
  type RecipeCuttingPreview,
} from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";

import s from "./lineas-precios-page-client.module.css";

type Props = {
  recipe: FabricationRecipe;
  vanoWidthMm: string;
  vanoHeightMm: string;
  onRecipeChange: (recipe: FabricationRecipe) => void;
  onVanoWidthChange: (value: string) => void;
  onVanoHeightChange: (value: string) => void;
  mode: "configure" | "validate";
  onVariantCreated?: (recipe: FabricationRecipe) => void;
  onChangeRecipeOrigin?: () => void;
  onRequestConfigureComponent?: (componentId: string) => void;
  focusComponentId?: string | null;
};

type ComponentFilter = "todos" | "incompletos" | "sin_codigo" | "advertencias";

function recipeOriginLabel(recipe: FabricationRecipe): string {
  switch (recipe.sourceKind) {
    case "plantilla_sugerida":
      return "Plantilla inicial sugerida";
    case "base_tipologica":
      return "Base tipológica";
    case "migrada":
      return "Receta migrada";
    default:
      return "Receta propia";
  }
}

function recipeOriginHint(recipe: FabricationRecipe): string | null {
  if (recipe.sourceKind === "plantilla_sugerida") return PLANTILLA_SUGERIDA_COPY;
  if (recipe.sourceKind === "base_tipologica") return BASE_TIPOLOGICA_COPY;
  return null;
}

function formatMm(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)} mm`;
}

function quantityValueLabel(rule: RecipeComponent["quantityRule"]) {
  switch (rule) {
    case "fixed":
      return "Cantidad total";
    case "per_sash":
      return "Piezas por hoja";
    case "two_per_sash":
      return "Multiplicador (×2 por hoja)";
    case "per_module":
      return "Piezas por módulo";
    case "two_per_module":
      return "Multiplicador (×2 por módulo)";
    case "custom":
      return "Cantidad personalizada";
    default:
      return "Valor cantidad";
  }
}

function quantityRuleHint(
  rule: RecipeComponent["quantityRule"],
  quantityValue: number,
  sashCount: number,
  resultCuts: number
) {
  const value = Math.max(1, quantityValue);
  const hojas = Math.max(1, sashCount);
  switch (rule) {
    case "fixed":
      return `${resultCuts} corte${resultCuts === 1 ? "" : "s"} fijos por ventana`;
    case "per_sash":
      return `${value} × ${hojas} hojas = ${resultCuts} cortes`;
    case "two_per_sash":
      return `2 × ${value} × ${hojas} hojas = ${resultCuts} cortes`;
    case "per_module":
      return `${value} por módulo = ${resultCuts} cortes`;
    case "two_per_module":
      return `2 × ${value} por módulo = ${resultCuts} cortes`;
    default:
      return `${resultCuts} cortes por ventana`;
  }
}

function parsePositiveDraft(raw: string, fallback: number) {
  const parsed = Math.round(Number(raw.replace(",", ".")));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeDraft(raw: string, fallback: number) {
  const parsed = Math.round(Number(raw.replace(",", ".")));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function recipeStatusToneClass(status: RecipeStatus) {
  switch (status) {
    case "validada":
    case "lista_para_validar":
      return s.recipeToneOk;
    case "en_validacion":
    case "en_configuracion":
    case "requiere_revision":
      return s.recipeToneWarn;
    default:
      return s.recipeToneMuted;
  }
}

function barsStatusLabel(status: RecipeCuttingPreview["barsStatus"]) {
  switch (status) {
    case "calculado":
      return "Calculado";
    case "pauta_parcial":
      return "Pauta parcial";
    default:
      return "No calculable";
  }
}

function barsStatusToneClass(status: RecipeCuttingPreview["barsStatus"]) {
  switch (status) {
    case "calculado":
      return s.recipeToneOk;
    case "pauta_parcial":
      return s.recipeToneWarn;
    default:
      return s.recipeToneMuted;
  }
}

function updateComponent(
  recipe: FabricationRecipe,
  componentId: string,
  patch: Partial<RecipeComponent>
): FabricationRecipe {
  return markRecipeDirtyAfterEdit({
    ...recipe,
    components: recipe.components.map((component) =>
      component.id === componentId ? { ...component, ...patch } : component
    ),
  });
}

export function FabricationRecipeEditor({
  recipe,
  vanoWidthMm,
  vanoHeightMm,
  onRecipeChange,
  onVanoWidthChange,
  onVanoHeightChange,
  mode,
  onVariantCreated,
  onChangeRecipeOrigin,
  onRequestConfigureComponent,
  focusComponentId,
}: Props) {
  const widthMm = Math.max(1, Math.round(Number(vanoWidthMm.replace(",", ".")) || 1200));
  const heightMm = Math.max(1, Math.round(Number(vanoHeightMm.replace(",", ".")) || 1000));
  const recipeWithBarDefaults: FabricationRecipe = {
    ...recipe,
    defaultBarLengthMm: recipe.defaultBarLengthMm ?? 6000,
    defaultKerfMm: recipe.defaultKerfMm ?? 3,
  };
  const preview: RecipeCuttingPreview = buildRecipeCuttingPreview(recipeWithBarDefaults, {
    widthMm,
    heightMm,
    sashCount: recipe.sashCount,
    moduleCount: recipe.moduleCount,
    quantity: 1,
  });
  const status = deriveRecipeStatus(recipeWithBarDefaults);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [adjustDrafts, setAdjustDrafts] = useState<Record<string, string>>({});
  const [barOverrideDrafts, setBarOverrideDrafts] = useState<Record<string, string>>({});
  const [sashDraft, setSashDraft] = useState(String(recipe.sashCount));
  const [moduleDraft, setModuleDraft] = useState(String(recipe.moduleCount));
  const [defaultBarDraft, setDefaultBarDraft] = useState(
    String(recipeWithBarDefaults.defaultBarLengthMm)
  );
  const [defaultKerfDraft, setDefaultKerfDraft] = useState(
    String(recipeWithBarDefaults.defaultKerfMm)
  );
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    focusComponentId ?? null
  );
  const [componentFilter, setComponentFilter] = useState<ComponentFilter>("todos");
  const [identityOpen, setIdentityOpen] = useState(false);

  useEffect(() => {
    setQuantityDrafts((previous) => {
      const next: Record<string, string> = {};
      recipe.components.forEach((component) => {
        next[component.id] = previous[component.id] ?? String(component.quantityValue);
      });
      return next;
    });
    setAdjustDrafts((previous) => {
      const next: Record<string, string> = {};
      recipe.components.forEach((component) => {
        next[component.id] = previous[component.id] ?? String(component.adjustMm);
      });
      return next;
    });
    setBarOverrideDrafts((previous) => {
      const next: Record<string, string> = {};
      recipe.components.forEach((component) => {
        next[component.id] =
          previous[component.id] ??
          (component.barLengthMm != null ? String(component.barLengthMm) : "");
      });
      return next;
    });
  }, [recipe.components]);

  useEffect(() => {
    setSashDraft(String(recipe.sashCount));
  }, [recipe.sashCount]);

  useEffect(() => {
    setModuleDraft(String(recipe.moduleCount));
  }, [recipe.moduleCount]);

  useEffect(() => {
    setDefaultBarDraft(String(recipe.defaultBarLengthMm ?? 6000));
  }, [recipe.defaultBarLengthMm]);

  useEffect(() => {
    setDefaultKerfDraft(String(recipe.defaultKerfMm ?? 3));
  }, [recipe.defaultKerfMm]);

  useEffect(() => {
    if (!focusComponentId) return;
    setActiveComponentId(focusComponentId);
    setComponentFilter("todos");
  }, [focusComponentId]);

  useEffect(() => {
    if (!activeComponentId) return;
    if (recipe.components.some((component) => component.id === activeComponentId)) return;
    setActiveComponentId(null);
  }, [activeComponentId, recipe.components]);

  const handleTypeChange = (type: FabricationType) => {
    const next = createStructuralRecipeTemplate(type);
    onRecipeChange(
      markRecipeDirtyAfterEdit({
        ...next,
        id: recipe.id,
        recipeVersion: recipe.recipeVersion,
        variant: recipe.variant,
        herrajeTipo: recipe.herrajeTipo,
        herrajeLabel: recipe.herrajeLabel,
        sourceKind: recipe.sourceKind,
        isActive: recipe.isActive,
        usageCount: recipe.usageCount,
        lastUsedAt: recipe.lastUsedAt,
        defaultBarLengthMm: recipe.defaultBarLengthMm ?? next.defaultBarLengthMm,
        defaultKerfMm: recipe.defaultKerfMm ?? next.defaultKerfMm,
        versionBumpedSinceValidation: recipe.versionBumpedSinceValidation,
      })
    );
  };

  const commitQuantityValue = (componentId: string, raw: string) => {
    const value = parsePositiveDraft(raw, 1);
    setQuantityDrafts((current) => ({ ...current, [componentId]: String(value) }));
    onRecipeChange(
      updateComponent(recipe, componentId, {
        quantityValue: value,
      })
    );
  };

  const commitAdjustMm = (componentId: string, raw: string, fallback: number) => {
    const value = parseNonNegativeDraft(raw, fallback);
    setAdjustDrafts((current) => ({ ...current, [componentId]: String(value) }));
    onRecipeChange(
      updateComponent(recipe, componentId, {
        adjustMm: value,
      })
    );
  };

  const commitBarOverride = (componentId: string, raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setBarOverrideDrafts((current) => ({ ...current, [componentId]: "" }));
      onRecipeChange(
        updateComponent(recipe, componentId, {
          barLengthMm: null,
        })
      );
      return;
    }
    const value = parsePositiveDraft(trimmed, recipeWithBarDefaults.defaultBarLengthMm);
    const safe = Math.max(1000, value);
    setBarOverrideDrafts((current) => ({ ...current, [componentId]: String(safe) }));
    onRecipeChange(
      updateComponent(recipe, componentId, {
        barLengthMm: safe,
      })
    );
  };

  const configuredCount = recipe.components.filter((component) =>
    isComponentConfigured(component)
  ).length;
  const totalCount = recipe.components.length;

  const getComponentSummary = (component: RecipeComponent) => {
    const configured = isComponentConfigured(component);
    const hasCode =
      component.kind !== "profile" ||
      recipeDisplayProfile(component) !== RECIPE_MISSING_PROFILE_LABEL;
    const previewRow = preview.rows.find((row) => row.componentId === component.id);
    const hasWarning = Boolean(previewRow?.pending || previewRow?.error);
    return { configured, hasCode, previewRow, hasWarning };
  };

  const incompleteCount = recipe.components.filter(
    (component) => !getComponentSummary(component).configured
  ).length;
  const missingCodes = recipe.components.filter(
    (component) => !getComponentSummary(component).hasCode
  ).length;
  const warningCount = recipe.components.filter(
    (component) => getComponentSummary(component).hasWarning
  ).length;

  const filteredComponents = recipe.components.filter((component) => {
    const summary = getComponentSummary(component);
    if (componentFilter === "incompletos") return !summary.configured;
    if (componentFilter === "sin_codigo") return !summary.hasCode;
    if (componentFilter === "advertencias") return summary.hasWarning;
    return true;
  });

  const activeComponent =
    recipe.components.find((component) => component.id === activeComponentId) ?? null;

  const renderFormulaLabel = (component: RecipeComponent) => {
    if (component.kind === "accessory") return "Cantidad";
    const base = MEASURE_BASE_LABELS[component.measureBase];
    if (component.adjustMode === "none" || component.adjustMm === 0) return base;
    return `${base} ${ADJUST_MODE_LABELS[component.adjustMode].toLowerCase()} ${component.adjustMm} mm`;
  };

  const renderCutLabel = (row: RecipeCuttingPreview["rows"][number] | undefined) => {
    if (!row) return "Sin cálculo";
    if (row.pending) return "Pendiente";
    if (row.error) return row.error;
    if (row.kind === "glass") {
      return `${row.quantity} × ${formatMm(row.widthMm)} × ${formatMm(row.heightMm)}`;
    }
    if (row.kind === "accessory") return `${row.quantity} u`;
    return `${row.quantity} corte${row.quantity === 1 ? "" : "s"} de ${formatMm(row.lengthMm)}`;
  };

  const originHint = recipeOriginHint(recipe);

  const renderCompactPreview = () => (
    <aside className={s.recipePreviewSticky} aria-label="Vista previa de cortes">
      <div className={s.cuttingPreviewHead}>
        <strong>
          Vista previa · {formatMm(widthMm).replace(" mm", "")} × {formatMm(heightMm)}
        </strong>
        <span>
          {preview.pendingRequiredCount > 0
            ? `${preview.pendingRequiredCount} pendientes`
            : "Lista para revisar"}
        </span>
      </div>
      <div className={s.cubicationSetupGrid}>
        <label className={s.fieldBlock}>
          <span className={s.fieldLabel}>Ancho vano</span>
          <input
            className={s.textInput}
            inputMode="numeric"
            value={vanoWidthMm}
            onChange={(event) => onVanoWidthChange(event.target.value)}
          />
        </label>
        <label className={s.fieldBlock}>
          <span className={s.fieldLabel}>Alto vano</span>
          <input
            className={s.textInput}
            inputMode="numeric"
            value={vanoHeightMm}
            onChange={(event) => onVanoHeightChange(event.target.value)}
          />
        </label>
      </div>
      <div className={s.cuttingCutList}>
        {preview.rows.map((row) => (
          <div key={row.componentId} className={s.cuttingCutRow}>
            <span>
              {row.functionLabel}
              {row.profileCode !== "Sin perfil" &&
              row.profileCode !== "Por asignar" &&
              row.profileCode !== RECIPE_MISSING_PROFILE_LABEL
                ? ` · ${row.profileCode}`
                : ""}
            </span>
            <strong>{renderCutLabel(row)}</strong>
          </div>
        ))}
      </div>
      <div className={s.recipePreviewBarsMeta}>
        <em className={barsStatusToneClass(preview.barsStatus)}>
          Barras · {barsStatusLabel(preview.barsStatus)}
        </em>
        {preview.profileBarPlans.length > 0 ? (
          <span>
            {preview.profileBarPlans
              .filter((plan) => plan.calculable)
              .reduce((sum, plan) => sum + plan.barsNeeded, 0)}{" "}
            barras ref.
          </span>
        ) : null}
      </div>
    </aside>
  );

  const renderComponentEditor = (component: RecipeComponent) => {
    const quantityDraft = quantityDrafts[component.id] ?? String(component.quantityValue);
    const liveQuantityValue =
      quantityDraft.trim() === ""
        ? component.quantityValue
        : parsePositiveDraft(quantityDraft, component.quantityValue);
    const resultCuts = resolveComponentQuantity(
      { ...component, quantityValue: liveQuantityValue },
      {
        widthMm,
        heightMm,
        sashCount: recipe.sashCount,
        moduleCount: recipe.moduleCount,
        quantity: 1,
      }
    );
    const previewRow = preview.rows.find((row) => row.componentId === component.id);

    return (
      <article className={s.recipeComponentEditor} aria-label="Editar componente">
        <header className={s.recipeComponentEditorHead}>
          <div>
            <span>Editar componente</span>
            <strong>{component.functionLabel}</strong>
          </div>
          <button
            type="button"
            className={s.ghostButton}
            onClick={() => setActiveComponentId(null)}
          >
            Cerrar
          </button>
        </header>

        <div className={s.recipeComponentSections}>
          <div className={s.recipeFieldGroup}>
            <p className={s.recipeFieldGroupTitle}>Identidad</p>
            <div className={s.recipeComponentGrid}>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Código / perfil</span>
                <input
                  className={s.textInput}
                  value={component.profileCode}
                  onChange={(event) =>
                    onRecipeChange(
                      updateComponent(recipe, component.id, {
                        profileCode: event.target.value,
                        profileName: component.profileName || event.target.value,
                      })
                    )
                  }
                  placeholder="Ej: 5001"
                />
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Nombre en taller</span>
                <input
                  className={s.textInput}
                  value={component.profileName}
                  onChange={(event) =>
                    onRecipeChange(
                      updateComponent(recipe, component.id, {
                        profileName: event.target.value,
                      })
                    )
                  }
                  placeholder="Nombre del taller"
                />
              </label>
              {component.kind === "profile" ? (
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Largo comercial</span>
                  <input
                    className={s.textInput}
                    inputMode="numeric"
                    value={barOverrideDrafts[component.id] ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/[^\d]/g, "");
                      setBarOverrideDrafts((current) => ({
                        ...current,
                        [component.id]: raw,
                      }));
                    }}
                    onBlur={(event) =>
                      commitBarOverride(component.id, event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    placeholder={`Hereda ${formatMm(
                      recipeWithBarDefaults.defaultBarLengthMm
                    ).replace(" mm", "")}`}
                  />
                  <span className={s.fieldHint}>
                    {component.barLengthMm != null
                      ? `Personalizado: ${formatMm(component.barLengthMm)}`
                      : `Usa ${formatMm(
                          resolveComponentBarLengthMm(component, recipeWithBarDefaults) ??
                            recipeWithBarDefaults.defaultBarLengthMm
                        )}. Vacío = heredar.`}
                  </span>
                </label>
              ) : null}
            </div>
          </div>

          {component.kind !== "accessory" ? (
            <div className={s.recipeFieldGroup}>
              <p className={s.recipeFieldGroupTitle}>Medida del corte</p>
              <div className={s.recipeComponentGrid}>
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Calcular según</span>
                  <select
                    className={s.selectInput}
                    value={component.measureBase}
                    onChange={(event) =>
                      onRecipeChange(
                        updateComponent(recipe, component.id, {
                          measureBase: event.target
                            .value as RecipeComponent["measureBase"],
                        })
                      )
                    }
                  >
                    {MEASURE_BASES.map((base) => (
                      <option key={base} value={base}>
                        {MEASURE_BASE_LABELS[base]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Ajuste</span>
                  <select
                    className={s.selectInput}
                    value={component.adjustMode}
                    onChange={(event) =>
                      onRecipeChange(
                        updateComponent(recipe, component.id, {
                          adjustMode: event.target.value as RecipeComponent["adjustMode"],
                        })
                      )
                    }
                  >
                    {ADJUST_MODES.map((modeOption) => (
                      <option key={modeOption} value={modeOption}>
                        {ADJUST_MODE_LABELS[modeOption]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>mm de ajuste</span>
                  <input
                    className={s.textInput}
                    inputMode="numeric"
                    value={adjustDrafts[component.id] ?? String(component.adjustMm)}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/[^\d]/g, "");
                      setAdjustDrafts((current) => ({
                        ...current,
                        [component.id]: raw,
                      }));
                    }}
                    onBlur={(event) =>
                      commitAdjustMm(
                        component.id,
                        event.currentTarget.value,
                        component.adjustMm
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    disabled={component.adjustMode === "none"}
                  />
                </label>
              </div>
            </div>
          ) : null}

          <div className={s.recipeFieldGroup}>
            <p className={s.recipeFieldGroupTitle}>Cantidad</p>
            <div className={s.recipeComponentGrid}>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Cómo contar</span>
                <select
                  className={s.selectInput}
                  value={component.quantityRule}
                  onChange={(event) =>
                    onRecipeChange(
                      updateComponent(recipe, component.id, {
                        quantityRule: event.target
                          .value as RecipeComponent["quantityRule"],
                      })
                    )
                  }
                >
                  {QUANTITY_RULES.map((rule) => (
                    <option key={rule} value={rule}>
                      {QUANTITY_RULE_LABELS[rule]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>
                  {quantityValueLabel(component.quantityRule)}
                </span>
                <input
                  className={s.textInput}
                  inputMode="numeric"
                  value={quantityDraft}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^\d]/g, "");
                    setQuantityDrafts((current) => ({
                      ...current,
                      [component.id]: raw,
                    }));
                  }}
                  onBlur={(event) =>
                    commitQuantityValue(component.id, event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>
              <div className={s.recipeResultPill} aria-live="polite">
                <small>Resultado</small>
                <strong>
                  {quantityRuleHint(
                    component.quantityRule,
                    liveQuantityValue,
                    recipe.sashCount,
                    resultCuts
                  )}
                </strong>
                {previewRow?.measureExplanation ? (
                  <span>{previewRow.measureExplanation}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={s.recipeComponentEditorActions}>
          <button
            type="button"
            className={s.ghostButton}
            onClick={() =>
              onRecipeChange(
                markRecipeDirtyAfterEdit({
                  ...recipe,
                  components: [
                    ...recipe.components,
                    {
                      ...component,
                      id: `${component.functionKey}_${Math.random().toString(36).slice(2, 8)}`,
                    },
                  ],
                })
              )
            }
          >
            Duplicar
          </button>
          {!component.required ? (
            <button
              type="button"
              className={s.ghostButtonDanger}
              onClick={() => {
                onRecipeChange(
                  markRecipeDirtyAfterEdit({
                    ...recipe,
                    components: recipe.components.filter(
                      (entry) => entry.id !== component.id
                    ),
                  })
                );
                setActiveComponentId(null);
              }}
            >
              Eliminar
            </button>
          ) : null}
          <button
            type="button"
            className={s.secondaryButton}
            onClick={() => setActiveComponentId(null)}
          >
            Listo
          </button>
        </div>
      </article>
    );
  };

  if (mode === "configure") {
    return (
      <div className={s.recipeEditor}>
        <section className={s.recipeSummaryBar} aria-label="Receta seleccionada">
          <div className={s.recipeSummaryMain}>
            <div className={s.recipeStatusChips}>
              <em className={recipeStatusToneClass(status)}>{RECIPE_STATUS_LABELS[status]}</em>
              <em className={configuredCount === totalCount ? s.recipeToneOk : s.recipeToneWarn}>
                {configuredCount} de {totalCount} componentes completos
              </em>
            </div>
            <p className={s.recipeSummaryLine}>
              <strong>{FABRICATION_TYPE_LABELS[recipe.fabricationType]}</strong>
              <span>· {APERTURA_TIPO_LABELS[recipe.aperturaTipo]}</span>
              <span>· {herrajeDisplayLabel(recipe.herrajeTipo, recipe.herrajeLabel)}</span>
              <span>· {recipeOriginLabel(recipe)}</span>
            </p>
            {originHint ? <p className={s.recipeIdentityHint}>{originHint}</p> : null}
          </div>
          <div className={s.recipeSummaryActions}>
            {onChangeRecipeOrigin ? (
              <button
                type="button"
                className={s.secondaryButton}
                onClick={onChangeRecipeOrigin}
              >
                Cambiar origen
              </button>
            ) : null}
            <button
              type="button"
              className={s.ghostButton}
              onClick={() => setIdentityOpen((open) => !open)}
            >
              {identityOpen ? "Ocultar tipología" : "Ajustar tipología"}
            </button>
          </div>
        </section>

        {identityOpen ? (
          <section className={s.recipeSetupCard} aria-label="Tipología y barras">
            <div className={s.cubicationSetupGrid}>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Tipo de fabricación</span>
                <select
                  className={s.selectInput}
                  value={recipe.fabricationType}
                  onChange={(event) =>
                    handleTypeChange(event.target.value as FabricationType)
                  }
                >
                  {FABRICATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {FABRICATION_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Apertura</span>
                <select
                  className={s.selectInput}
                  value={recipe.aperturaTipo}
                  onChange={(event) =>
                    onRecipeChange(
                      markRecipeDirtyAfterEdit({
                        ...recipe,
                        aperturaTipo: event.target.value as AperturaTipo,
                      })
                    )
                  }
                >
                  {APERTURA_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {APERTURA_TIPO_LABELS[tipo]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Herraje</span>
                <select
                  className={s.selectInput}
                  value={recipe.herrajeTipo}
                  onChange={(event) =>
                    onRecipeChange(
                      markRecipeDirtyAfterEdit({
                        ...recipe,
                        herrajeTipo: event.target.value as HerrajeTipo,
                        herrajeLabel:
                          event.target.value === "otro" ? recipe.herrajeLabel : "",
                      })
                    )
                  }
                >
                  {HERRAJE_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {HERRAJE_TIPO_LABELS[tipo]}
                    </option>
                  ))}
                </select>
              </label>
              {recipe.herrajeTipo === "otro" ? (
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Nombre del herraje</span>
                  <input
                    className={s.textInput}
                    value={recipe.herrajeLabel}
                    onChange={(event) =>
                      onRecipeChange(
                        markRecipeDirtyAfterEdit({
                          ...recipe,
                          herrajeLabel: event.target.value,
                        })
                      )
                    }
                  />
                </label>
              ) : null}
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Variante</span>
                <input
                  className={s.textInput}
                  value={recipe.variant}
                  onChange={(event) =>
                    onRecipeChange(
                      markRecipeDirtyAfterEdit({ ...recipe, variant: event.target.value })
                    )
                  }
                />
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Hojas</span>
                <input
                  className={s.textInput}
                  inputMode="numeric"
                  value={sashDraft}
                  onChange={(event) => setSashDraft(event.target.value)}
                  onBlur={() => {
                    const value = parsePositiveDraft(sashDraft, recipe.sashCount);
                    setSashDraft(String(value));
                    onRecipeChange(
                      markRecipeDirtyAfterEdit({ ...recipe, sashCount: value })
                    );
                  }}
                />
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Módulos</span>
                <input
                  className={s.textInput}
                  inputMode="numeric"
                  value={moduleDraft}
                  onChange={(event) => setModuleDraft(event.target.value)}
                  onBlur={() => {
                    const value = parsePositiveDraft(moduleDraft, recipe.moduleCount);
                    setModuleDraft(String(value));
                    onRecipeChange(
                      markRecipeDirtyAfterEdit({ ...recipe, moduleCount: value })
                    );
                  }}
                />
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Largo barra (mm)</span>
                <input
                  className={s.textInput}
                  inputMode="numeric"
                  value={defaultBarDraft}
                  onChange={(event) =>
                    setDefaultBarDraft(event.target.value.replace(/[^\d]/g, ""))
                  }
                  onBlur={() => {
                    const value = Math.max(
                      1000,
                      parsePositiveDraft(
                        defaultBarDraft,
                        recipeWithBarDefaults.defaultBarLengthMm
                      )
                    );
                    setDefaultBarDraft(String(value));
                    onRecipeChange(
                      markRecipeDirtyAfterEdit({
                        ...recipe,
                        defaultBarLengthMm: value,
                      })
                    );
                  }}
                />
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Pérdida por corte</span>
                <input
                  className={s.textInput}
                  inputMode="numeric"
                  value={defaultKerfDraft}
                  onChange={(event) =>
                    setDefaultKerfDraft(event.target.value.replace(/[^\d]/g, ""))
                  }
                  onBlur={() => {
                    const value = parseNonNegativeDraft(
                      defaultKerfDraft,
                      recipeWithBarDefaults.defaultKerfMm
                    );
                    setDefaultKerfDraft(String(value));
                    onRecipeChange(
                      markRecipeDirtyAfterEdit({
                        ...recipe,
                        defaultKerfMm: value,
                      })
                    );
                  }}
                />
              </label>
            </div>
            <div className={s.recipeSetupActions}>
              <button
                type="button"
                className={s.secondaryButton}
                onClick={() => {
                  const variant = duplicateRecipeAsVariant(
                    recipe,
                    `${recipe.variant} (copia)`
                  );
                  if (onVariantCreated) onVariantCreated(variant);
                  else onRecipeChange(variant);
                }}
              >
                Duplicar como variante
              </button>
            </div>
          </section>
        ) : null}

        <div className={s.recipeConfigureLayout}>
          <section className={s.recipeComponentsPanel} aria-label="Componentes">
            <div className={s.recipeFilterRow} role="tablist" aria-label="Filtrar componentes">
              {(
                [
                  ["todos", `Todos (${totalCount})`],
                  ["incompletos", `Incompletos (${incompleteCount})`],
                  ["sin_codigo", `Sin código (${missingCodes})`],
                  ["advertencias", `Advertencias (${warningCount})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={componentFilter === key}
                  className={`${s.recipeFilterChip} ${
                    componentFilter === key ? s.recipeFilterChipActive : ""
                  }`}
                  onClick={() => setComponentFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={s.recipeTable} role="table" aria-label="Lista de componentes">
              <div className={s.recipeTableHead} role="row">
                <span role="columnheader">Componente</span>
                <span role="columnheader">Código</span>
                <span role="columnheader">Fórmula</span>
                <span role="columnheader">Cant.</span>
                <span role="columnheader">Estado</span>
                <span role="columnheader"> </span>
              </div>
              {filteredComponents.length === 0 ? (
                <p className={s.fieldHint}>No hay componentes en este filtro.</p>
              ) : (
                filteredComponents.map((component) => {
                  const summary = getComponentSummary(component);
                  const isActive = activeComponentId === component.id;
                  const codeLabel =
                    component.kind === "profile"
                      ? summary.hasCode
                        ? recipeDisplayProfile(component)
                        : "Sin código"
                      : component.profileCode || "—";
                  return (
                    <div key={component.id} className={s.recipeTableGroup}>
                      <div
                        className={`${s.recipeTableRow} ${
                          summary.configured ? s.recipeTableRowOk : s.recipeTableRowPending
                        } ${isActive ? s.recipeTableRowActive : ""}`}
                        role="row"
                      >
                        <span role="cell">
                          <strong>{component.functionLabel}</strong>
                        </span>
                        <span role="cell">{codeLabel}</span>
                        <span role="cell">{renderFormulaLabel(component)}</span>
                        <span role="cell">
                          {resolveComponentQuantity(component, {
                            widthMm,
                            heightMm,
                            sashCount: recipe.sashCount,
                            moduleCount: recipe.moduleCount,
                            quantity: 1,
                          })}
                        </span>
                        <span role="cell">
                          <em
                            className={
                              summary.hasWarning
                                ? s.recipeToneWarn
                                : summary.configured
                                  ? s.recipeToneOk
                                  : s.recipeToneMuted
                            }
                          >
                            {summary.hasWarning
                              ? "Advertencia"
                              : summary.configured
                                ? "Listo"
                                : "Incompleto"}
                          </em>
                        </span>
                        <span role="cell">
                          <button
                            type="button"
                            className={s.ghostButton}
                            onClick={() =>
                              setActiveComponentId(isActive ? null : component.id)
                            }
                          >
                            {isActive ? "Cerrar" : "Editar"}
                          </button>
                        </span>
                      </div>
                      {isActive ? renderComponentEditor(component) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className={s.recipeAddRow}>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Agregar componente</span>
                <select
                  className={s.selectInput}
                  defaultValue=""
                  onChange={(event) => {
                    const value = event.target.value as RecipeComponentFunction | "";
                    if (!value) return;
                    const next = addRecipeComponentByFunction(recipe, value);
                    onRecipeChange(next);
                    const added = next.components[next.components.length - 1];
                    if (added) setActiveComponentId(added.id);
                    event.target.value = "";
                  }}
                >
                  <option value="">Elegir función…</option>
                  {RECIPE_COMPONENT_FUNCTIONS.map((fn) => (
                    <option key={fn} value={fn}>
                      {RECIPE_COMPONENT_FUNCTION_LABELS[fn]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {activeComponent &&
            !filteredComponents.some((c) => c.id === activeComponent.id) ? (
              <div className={s.recipeInlineEditor}>{renderComponentEditor(activeComponent)}</div>
            ) : null}
          </section>

          {renderCompactPreview()}
        </div>
      </div>
    );
  }

  // mode === validate → pantalla de revisión
  const realById = new Map(
    (recipe.validationCase?.realCuts ?? []).map((cut) => [cut.componentId, cut.lengthMm])
  );
  const missingCodeComponents = recipe.components.filter(
    (component) => !getComponentSummary(component).hasCode
  );
  const warningComponents = recipe.components.filter(
    (component) => getComponentSummary(component).hasWarning
  );
  const profileRows = preview.rows.filter((row) => row.kind === "profile" && !row.pending);

  return (
    <div className={`${s.recipeEditor} ${s.recipeReview}`}>
      <section className={s.recipeSummaryBar} aria-label="Identidad de la receta">
        <div className={s.recipeSummaryMain}>
          <div className={s.recipeStatusChips}>
            <em className={recipeStatusToneClass(status)}>{RECIPE_STATUS_LABELS[status]}</em>
            <em className={configuredCount === totalCount ? s.recipeToneOk : s.recipeToneWarn}>
              {configuredCount} de {totalCount} listos
            </em>
          </div>
          <p className={s.recipeSummaryLine}>
            <strong>{FABRICATION_TYPE_LABELS[recipe.fabricationType]}</strong>
            <span>· {APERTURA_TIPO_LABELS[recipe.aperturaTipo]}</span>
            <span>· {herrajeDisplayLabel(recipe.herrajeTipo, recipe.herrajeLabel)}</span>
            <span>· {recipe.variant}</span>
          </p>
        </div>
      </section>

      <div className={s.recipeReviewLayout}>
        <section className={s.recipeReviewMain} aria-label="Revisión y comparación">
          <article className={s.recipeReviewCard}>
            <header className={s.recipeSectionHead}>
              <strong>Resumen de componentes</strong>
              <span>Estado rápido sin reabrir formularios</span>
            </header>
            <div className={s.recipeTable} role="table" aria-label="Resumen de componentes">
              <div className={s.recipeReviewSummaryHead} role="row">
                <span role="columnheader">Componente</span>
                <span role="columnheader">Código</span>
                <span role="columnheader">Estado</span>
                <span role="columnheader"> </span>
              </div>
              {recipe.components.map((component) => {
                const summary = getComponentSummary(component);
                return (
                  <div key={component.id} className={s.recipeReviewSummaryRow} role="row">
                    <span role="cell">
                      <strong>{component.functionLabel}</strong>
                    </span>
                    <span role="cell">
                      {component.kind === "profile"
                        ? summary.hasCode
                          ? recipeDisplayProfile(component)
                          : "Sin código"
                        : "Accesorio"}
                    </span>
                    <span role="cell">
                      <em
                        className={
                          summary.configured ? s.recipeToneOk : s.recipeToneWarn
                        }
                      >
                        {summary.configured ? "Listo" : "Incompleto"}
                      </em>
                    </span>
                    <span role="cell">
                      {onRequestConfigureComponent ? (
                        <button
                          type="button"
                          className={s.ghostButton}
                          onClick={() => onRequestConfigureComponent(component.id)}
                        >
                          Corregir
                        </button>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className={s.recipeReviewCard} aria-label="Comparación de cortes">
            <header className={s.recipeSectionHead}>
              <strong>Comparación de cortes</strong>
              <span>Ingresa la medida que cortó o midió el taller para comparar contra el cálculo</span>
            </header>
            <div className={s.recipeCompareTable} role="table" aria-label="Cálculo de prueba">
              <div className={s.recipeCompareTableHead} role="row">
                <span role="columnheader">Componente</span>
                <span role="columnheader">Calculada</span>
                <span role="columnheader">Medida taller</span>
                <span role="columnheader">Diferencia</span>
                <span role="columnheader">Estado</span>
                <span role="columnheader"> </span>
              </div>
              {profileRows.length === 0 ? (
                <p className={s.fieldHint}>No hay perfiles listos para comparar.</p>
              ) : (
                profileRows.map((row) => {
                  const real = realById.get(row.componentId);
                  const calculated = row.lengthMm ?? 0;
                  const delta = real != null ? calculated - real : null;
                  const stateLabel =
                    delta == null
                      ? "Sin comparar"
                      : delta === 0
                        ? "Coincide"
                        : "Requiere ajuste";
                  return (
                    <div key={row.componentId} className={s.recipeCompareTableRow} role="row">
                      <span role="cell">
                        <strong>{row.functionLabel}</strong>
                        <small>{row.profileCode}</small>
                      </span>
                      <span role="cell">{formatMm(calculated)}</span>
                      <span role="cell">
                        <input
                          className={`${s.textInput} ${s.recipeCompareInput}`}
                          inputMode="numeric"
                          aria-label={`Medida de taller ${row.functionLabel}`}
                          value={real != null ? String(real) : ""}
                          onChange={(event) => {
                            const lengthMm = Math.max(
                              0,
                              Math.round(Number(event.target.value)) || 0
                            );
                            const previous = recipe.validationCase?.realCuts ?? [];
                            const nextCuts = [
                              ...previous.filter(
                                (cut) => cut.componentId !== row.componentId
                              ),
                              { componentId: row.componentId, lengthMm },
                            ];
                            onRecipeChange({
                              ...recipe,
                              status: "en_validacion",
                              validationCase: {
                                widthMm,
                                heightMm,
                                sashCount: recipe.sashCount,
                                moduleCount: recipe.moduleCount,
                                realCuts: nextCuts,
                              },
                            });
                          }}
                        />
                      </span>
                      <span role="cell">
                        {delta == null
                          ? "—"
                          : `${delta > 0 ? "+" : ""}${delta} mm`}
                      </span>
                      <span role="cell">
                        <em
                          className={
                            delta == null
                              ? s.recipeToneMuted
                              : delta === 0
                                ? s.recipeToneOk
                                : s.recipeToneWarn
                          }
                        >
                          {stateLabel}
                        </em>
                      </span>
                      <span role="cell">
                        {onRequestConfigureComponent ? (
                          <button
                            type="button"
                            className={s.ghostButton}
                            onClick={() =>
                              onRequestConfigureComponent(row.componentId)
                            }
                          >
                            Corregir
                          </button>
                        ) : null}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <div className={s.recipeValidateActions}>
            <button
              type="button"
              className={`${s.secondaryButton} ${s.recipeValidateSecondary}`}
              onClick={() => {
                const realCuts = recipe.validationCase?.realCuts ?? [];
                if (realCuts.length === 0) return;
                const confirmed = window.confirm(
                  "¿Ajustar la receta con estas medidas reales? Revisa antes de cortar."
                );
                if (!confirmed) return;
                onRecipeChange(applyRealMeasuresAsAdjustments(recipe, realCuts));
              }}
            >
              Ajustar receta con estas medidas
            </button>
            <button
              type="button"
              className={`${s.primaryButton} ${s.recipeValidatePrimary}`}
              onClick={() => {
                const confirmed = window.confirm(
                  "¿Confirmas que validaste esta receta para tu taller con un trabajo real? El taller sigue siendo responsable de revisar la pauta antes de cortar."
                );
                if (!confirmed) return;
                onRecipeChange(confirmRecipeValidated(recipe));
              }}
            >
              Validé esta receta para mi taller
            </button>
          </div>
        </section>

        <aside className={s.recipeReviewAside} aria-label="Progreso y advertencias">
          <article className={s.recipeReviewCard}>
            <header className={s.recipeSectionHead}>
              <strong>Progreso</strong>
              <span>
                {configuredCount} de {totalCount} componentes completos
              </span>
            </header>
            <div className={s.recipeStatusChips}>
              <em className={recipeStatusToneClass(status)}>{RECIPE_STATUS_LABELS[status]}</em>
              <em className={missingCodes > 0 ? s.recipeToneWarn : s.recipeToneOk}>
                {missingCodes > 0 ? `${missingCodes} sin código` : "Códigos listos"}
              </em>
              <em className={warningCount > 0 ? s.recipeToneWarn : s.recipeToneOk}>
                {warningCount > 0 ? `${warningCount} advertencias` : "Sin advertencias"}
              </em>
            </div>
          </article>

          <article className={s.recipeReviewCard}>
            <header className={s.recipeSectionHead}>
              <strong>Cálculo de prueba</strong>
              <span>Vano de referencia</span>
            </header>
            <div className={s.recipeAsideFields}>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Ancho real (mm)</span>
                <input
                  className={s.textInput}
                  inputMode="numeric"
                  value={vanoWidthMm}
                  onChange={(event) => onVanoWidthChange(event.target.value)}
                />
              </label>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Alto real (mm)</span>
                <input
                  className={s.textInput}
                  inputMode="numeric"
                  value={vanoHeightMm}
                  onChange={(event) => onVanoHeightChange(event.target.value)}
                />
              </label>
            </div>
            {preview.profileBarPlans.length > 0 ? (
              <p className={s.fieldHint}>
                Barras: {barsStatusLabel(preview.barsStatus)}. Referencial, no optimiza
                desperdicio.
              </p>
            ) : null}
          </article>

          <article className={s.recipeReviewCard}>
            <header className={s.recipeSectionHead}>
              <strong>Advertencias</strong>
              <span>
                {missingCodeComponents.length + warningComponents.length === 0
                  ? "Sin bloqueos visibles"
                  : "Revisa antes de validar"}
              </span>
            </header>
            {missingCodeComponents.length === 0 && warningComponents.length === 0 ? (
              <p className={s.fieldHint}>Todo listo para validar con un trabajo real.</p>
            ) : (
              <ul className={s.recipeIssueList}>
                {missingCodeComponents.map((component) => (
                  <li key={`code-${component.id}`}>
                    <span>
                      <strong>{component.functionLabel}</strong> sin código
                    </span>
                    {onRequestConfigureComponent ? (
                      <button
                        type="button"
                        className={s.ghostButton}
                        onClick={() => onRequestConfigureComponent(component.id)}
                      >
                        Corregir
                      </button>
                    ) : null}
                  </li>
                ))}
                {warningComponents.map((component) => {
                  const row = getComponentSummary(component).previewRow;
                  return (
                    <li key={`warn-${component.id}`}>
                      <span>
                        <strong>{component.functionLabel}</strong>
                        {row?.error ? ` · ${row.error}` : " · advertencia"}
                      </span>
                      {onRequestConfigureComponent ? (
                        <button
                          type="button"
                          className={s.ghostButton}
                          onClick={() => onRequestConfigureComponent(component.id)}
                        >
                          Corregir
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
}
