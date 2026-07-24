"use client";

import { useEffect, useState } from "react";

import {
  ADJUST_MODE_LABELS,
  ADJUST_MODES,
  FABRICATION_TYPE_LABELS,
  FABRICATION_TYPES,
  MEASURE_BASE_LABELS,
  MEASURE_BASES,
  QUANTITY_RULE_LABELS,
  QUANTITY_RULES,
  RECIPE_COMPONENT_FUNCTION_LABELS,
  RECIPE_COMPONENT_FUNCTIONS,
  RECIPE_STATUS_LABELS,
  deriveRecipeStatus,
  duplicateRecipeAsVariant,
  isComponentConfigured,
  markRecipeDirtyAfterEdit,
  recipeDisplayProfile,
  resolveComponentBarLengthMm,
  type FabricationRecipe,
  type FabricationType,
  type RecipeComponent,
  type RecipeComponentFunction,
  type RecipeStatus,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
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
};

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

function formatBarCutsLine(cuts: Array<{ lengthMm: number }>) {
  return cuts.map((cut) => formatMm(cut.lengthMm).replace(" mm", "")).join(" + ");
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

  useEffect(() => {
    setQuantityDrafts((previous) => {
      const next: Record<string, string> = {};
      recipe.components.forEach((component) => {
        next[component.id] =
          previous[component.id] ?? String(component.quantityValue);
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

  const handleTypeChange = (type: FabricationType) => {
    const next = createStructuralRecipeTemplate(type);
    onRecipeChange({
      ...next,
      variant: recipe.variant,
      defaultBarLengthMm: recipe.defaultBarLengthMm ?? next.defaultBarLengthMm,
      defaultKerfMm: recipe.defaultKerfMm ?? next.defaultKerfMm,
    });
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
  const pendingCount = Math.max(0, recipe.components.length - configuredCount);
  const missingCodes = recipe.components.filter(
    (component) =>
      component.kind === "profile" &&
      component.required &&
      recipeDisplayProfile(component) === "Perfil sin código"
  ).length;

  if (mode === "configure") {
    return (
      <div className={s.recipeEditor}>
        <header className={s.recipeIntro}>
          <div>
            <p className={s.recipeIntroEyebrow}>Paso 3 · Fabricación</p>
            <h3 className={s.recipeIntroTitle}>Receta de cortes de esta línea</h3>
            <p className={s.recipeIntroText}>
              Define cada perfil real del taller. La medida va en “Calcular según”, los mm en
              “Ajuste”, y cuántas piezas salen en “Cómo contar”.
            </p>
          </div>
          <div className={s.recipeStatusChips}>
            <em className={recipeStatusToneClass(status)}>{RECIPE_STATUS_LABELS[status]}</em>
            <em className={pendingCount > 0 ? s.recipeToneWarn : s.recipeToneOk}>
              {pendingCount > 0
                ? `${pendingCount} pendientes`
                : `${configuredCount} componentes listos`}
            </em>
            {missingCodes > 0 ? (
              <em className={s.recipeToneMuted}>
                {missingCodes} sin código de perfil
              </em>
            ) : null}
          </div>
        </header>

        <section className={s.recipeSetupCard} aria-label="Datos de la tipología">
          <div className={s.recipeSectionHead}>
            <strong>Tipología</strong>
            <span>Tipo, hojas y variante de esta línea</span>
          </div>
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
              <span className={s.fieldLabel}>Variante</span>
              <input
                className={s.textInput}
                value={recipe.variant}
                onChange={(event) =>
                  onRecipeChange(
                    markRecipeDirtyAfterEdit({ ...recipe, variant: event.target.value })
                  )
                }
                placeholder="estandar, reforzada, termopanel…"
              />
            </label>

            <label className={s.fieldBlock}>
              <span className={s.fieldLabel}>Cantidad de hojas</span>
              <input
                className={s.textInput}
                inputMode="numeric"
                value={sashDraft}
                onChange={(event) => setSashDraft(event.target.value)}
                onBlur={() => {
                  const value = parsePositiveDraft(sashDraft, recipe.sashCount);
                  setSashDraft(String(value));
                  onRecipeChange(
                    markRecipeDirtyAfterEdit({
                      ...recipe,
                      sashCount: value,
                    })
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
                    markRecipeDirtyAfterEdit({
                      ...recipe,
                      moduleCount: value,
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
              onClick={() =>
                onRecipeChange(duplicateRecipeAsVariant(recipe, `${recipe.variant} (copia)`))
              }
            >
              Duplicar como variante
            </button>
          </div>
        </section>

        <section className={s.recipeSetupCard} aria-label="Barras comerciales">
          <div className={s.recipeSectionHead}>
            <strong>Barras comerciales</strong>
            <span>
              Largo y pérdida por corte para estimar barras. Cada perfil hereda estos valores
              salvo que lo sobrescribas.
            </span>
          </div>
          <div className={s.cubicationSetupGrid}>
            <label className={s.fieldBlock}>
              <span className={s.fieldLabel}>Largo comercial predeterminado</span>
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
                placeholder="Ej: 6000"
              />
              <span className={s.fieldHint}>Ejemplo: 6.000 mm</span>
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
                placeholder="Ej: 3"
              />
              <span className={s.fieldHint}>Ejemplo: 3 mm (sierra / disco)</span>
            </label>
          </div>
        </section>

        <section className={s.recipeComponentsSection} aria-label="Componentes de la receta">
          <div className={s.recipeSectionHead}>
            <strong>Componentes de la fabricación</strong>
            <span>
              {recipe.components.length}{" "}
              {recipe.components.length === 1 ? "componente" : "componentes"} · una tarjeta por
              perfil o accesorio
            </span>
          </div>

          <div className={s.recipeComponentList}>
            {recipe.components.map((component, index) => {
              const configured = isComponentConfigured(component);
              const hasCode =
                component.kind !== "profile" ||
                recipeDisplayProfile(component) !== "Perfil sin código";
              const quantityDraft =
                quantityDrafts[component.id] ?? String(component.quantityValue);
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
                <article
                  key={component.id}
                  className={`${s.recipeComponentCard} ${
                    configured ? s.recipeCardReady : s.recipeCardPending
                  }`}
                >
                  <header className={s.recipeComponentHead}>
                    <div className={s.recipeComponentTitleBlock}>
                      <span className={s.recipeComponentIndex}>{index + 1}</span>
                      <div>
                        <strong>{component.functionLabel}</strong>
                        <div className={s.recipeComponentBadges}>
                          <em className={component.required ? s.badgeRequired : s.badgeOptional}>
                            {component.required ? "Obligatorio" : "Opcional"}
                          </em>
                          <em className={configured ? s.badgeReady : s.badgePending}>
                            {configured ? "Listo" : "Pendiente"}
                          </em>
                          {component.kind === "profile" ? (
                            <em className={hasCode ? s.badgeReady : s.badgeMuted}>
                              {hasCode ? recipeDisplayProfile(component) : "Sin código"}
                            </em>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className={s.recipeComponentActions}>
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
                          onClick={() =>
                            onRecipeChange(
                              markRecipeDirtyAfterEdit({
                                ...recipe,
                                components: recipe.components.filter(
                                  (entry) => entry.id !== component.id
                                ),
                              })
                            )
                          }
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  </header>

                  <div className={s.recipeComponentSections}>
                    <div className={s.recipeFieldGroup}>
                      <p className={s.recipeFieldGroupTitle}>1. Identidad del perfil</p>
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
                            placeholder="Nombre reconocido por el taller"
                          />
                        </label>
                        {component.kind === "profile" ? (
                          <label className={s.fieldBlock}>
                            <span className={s.fieldLabel}>
                              Largo comercial{" "}
                              <em className={s.optionalMark}>Opcional</em>
                            </span>
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
                                if (event.key === "Enter") {
                                  event.currentTarget.blur();
                                }
                              }}
                              placeholder={`Hereda ${formatMm(
                                recipeWithBarDefaults.defaultBarLengthMm
                              ).replace(" mm", "")}`}
                            />
                            <span className={s.fieldHint}>
                              {component.barLengthMm != null
                                ? `Personalizado: ${formatMm(component.barLengthMm)}`
                                : `Usa el largo general (${formatMm(
                                    resolveComponentBarLengthMm(
                                      component,
                                      recipeWithBarDefaults
                                    ) ?? recipeWithBarDefaults.defaultBarLengthMm
                                  )}). Déjalo vacío para heredar.`}
                            </span>
                          </label>
                        ) : null}
                      </div>
                    </div>

                    {component.kind !== "accessory" ? (
                      <div className={s.recipeFieldGroup}>
                        <p className={s.recipeFieldGroupTitle}>2. Medida del corte</p>
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
                                    adjustMode: event.target
                                      .value as RecipeComponent["adjustMode"],
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
                              value={
                                adjustDrafts[component.id] ?? String(component.adjustMm)
                              }
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
                                if (event.key === "Enter") {
                                  event.currentTarget.blur();
                                }
                              }}
                              disabled={component.adjustMode === "none"}
                            />
                          </label>
                        </div>
                        <p className={s.recipeFieldGroupHint}>
                          La fórmula está en “Calcular según”. El ajuste solo suma o resta mm.
                        </p>
                      </div>
                    ) : null}

                    <div className={s.recipeFieldGroup}>
                      <p className={s.recipeFieldGroupTitle}>3. Cantidad de piezas</p>
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
                              commitQuantityValue(
                                component.id,
                                event.currentTarget.value
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
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
                </article>
              );
            })}
          </div>

          <div className={s.recipeAddRow}>
            <label className={s.fieldBlock}>
              <span className={s.fieldLabel}>Agregar otro componente</span>
              <select
                className={s.selectInput}
                defaultValue=""
                onChange={(event) => {
                  const value = event.target.value as RecipeComponentFunction | "";
                  if (!value) return;
                  onRecipeChange(addRecipeComponentByFunction(recipe, value));
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
        </section>

        <section className={s.cuttingPreview} aria-label="Vista previa de cortes">
          <div className={s.cuttingPreviewHead}>
            <strong>
              Vista previa · vano {formatMm(widthMm).replace(" mm", "")} × {formatMm(heightMm)}
            </strong>
            <span>
              {preview.pendingRequiredCount > 0
                ? `${preview.pendingRequiredCount} pendientes`
                : "Lista para validar con un trabajo real"}
            </span>
          </div>
          <div className={s.cuttingCutList}>
            {preview.rows.map((row) => (
              <div key={row.componentId} className={s.cuttingCutRow}>
                <span>
                  {row.functionLabel}
                  {row.profileCode !== "Sin perfil" &&
                  row.profileCode !== "Por asignar" &&
                  row.profileCode !== "Perfil sin código"
                    ? ` · ${row.profileCode}`
                    : ""}
                </span>
                <strong>
                  {row.pending
                    ? "Pendiente de configurar"
                    : row.error
                      ? row.error
                      : row.kind === "glass"
                        ? `${row.quantity} × ${formatMm(row.widthMm)} × ${formatMm(row.heightMm)}`
                        : row.kind === "accessory"
                          ? `${row.quantity} u`
                          : `${row.quantity} corte${row.quantity === 1 ? "" : "s"} de ${formatMm(row.lengthMm)}`}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className={s.barDistribution} aria-label="Distribución sugerida de cortes">
          <div className={s.barDistributionHead}>
            <div>
              <strong>Distribución sugerida de cortes</strong>
              <span>
                Referencia de taller con First Fit Decreasing. No garantiza desperdicio mínimo.
              </span>
            </div>
            <em className={barsStatusToneClass(preview.barsStatus)}>
              {barsStatusLabel(preview.barsStatus)}
            </em>
          </div>

          {preview.profileBarPlans.length === 0 ? (
            <p className={s.fieldHint}>
              Agrega perfiles con código y largo comercial para estimar barras. Vidrios y
              accesorios no usan barras.
            </p>
          ) : (
            <div className={s.barPlanList}>
              {preview.profileBarPlans.map((plan) => (
                <article
                  key={plan.key}
                  className={`${s.barPlanCard} ${
                    plan.calculable ? s.barPlanCardOk : s.barPlanCardPending
                  }`}
                >
                  <header className={s.barPlanCardHead}>
                    <div>
                      <strong>
                        {plan.profileCode}
                        {plan.profileName && plan.profileName !== plan.profileCode
                          ? ` · ${plan.profileName}`
                          : ""}
                      </strong>
                      <span>
                        {plan.functionLabels.join(" · ") || "Perfil"}
                        {plan.barLengthMm
                          ? ` · Largo ${formatMm(plan.barLengthMm)}`
                          : " · Sin largo comercial"}
                      </span>
                    </div>
                    {plan.calculable ? (
                      <em className={s.recipeToneOk}>
                        {plan.cutCount} cortes · {plan.barsNeeded} barra
                        {plan.barsNeeded === 1 ? "" : "s"}
                      </em>
                    ) : (
                      <em className={s.recipeToneWarn}>{plan.pendingLabel}</em>
                    )}
                  </header>

                  {plan.calculable ? (
                    <div className={s.barPlanMeta}>
                      <span>Pérdida por corte: {formatMm(plan.kerfMm)}</span>
                      <span>
                        Aprovechamiento medio:{" "}
                        {plan.bars.length > 0
                          ? `${(
                              plan.bars.reduce((sum, bar) => sum + bar.utilizationPct, 0) /
                              plan.bars.length
                            ).toFixed(0)}%`
                          : "—"}
                      </span>
                    </div>
                  ) : (
                    <p className={s.fieldHint}>
                      El despiece se mantiene. Completa código y largo comercial para estimar
                      barras de este perfil.
                    </p>
                  )}

                  {plan.calculable
                    ? plan.bars.map((bar) => (
                        <div key={`${plan.key}-${bar.index}`} className={s.barSuggestionRow}>
                          <strong>
                            Barra {bar.index} · {formatMm(bar.barLengthMm)}
                          </strong>
                          <p className={s.barSuggestionCuts}>{formatBarCutsLine(bar.cuts)}</p>
                          <span>
                            Usado: {formatMm(bar.usedMm)} · Pérdida:{" "}
                            {formatMm(bar.kerfTotalMm)} · Sobrante: {formatMm(bar.wasteMm)} ·{" "}
                            {bar.utilizationPct.toFixed(0)}%
                          </span>
                        </div>
                      ))
                    : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // mode === validate
  const realById = new Map(
    (recipe.validationCase?.realCuts ?? []).map((cut) => [cut.componentId, cut.lengthMm])
  );

  return (
    <div className={s.recipeEditor}>
      <p className={s.fieldHint}>
        Usa una ventana que ya hayas fabricado. Ventora comparará sus cálculos con tus cortes
        reales.
      </p>

      <div className={s.cubicationSetupGrid}>
        <label className={s.fieldBlock}>
          <span className={s.fieldLabel}>Ancho real del vano (mm)</span>
          <input
            className={s.textInput}
            inputMode="numeric"
            value={vanoWidthMm}
            onChange={(event) => onVanoWidthChange(event.target.value)}
          />
        </label>
        <label className={s.fieldBlock}>
          <span className={s.fieldLabel}>Alto real del vano (mm)</span>
          <input
            className={s.textInput}
            inputMode="numeric"
            value={vanoHeightMm}
            onChange={(event) => onVanoHeightChange(event.target.value)}
          />
        </label>
      </div>

      <div className={s.recipeCompareList}>
        {preview.rows
          .filter((row) => row.kind === "profile" && !row.pending)
          .map((row) => {
            const real = realById.get(row.componentId);
            const calculated = row.lengthMm ?? 0;
            const delta = real != null ? calculated - real : null;
            return (
              <article key={row.componentId} className={s.recipeCompareCard}>
                <strong>
                  {row.functionLabel} · {row.profileCode}
                </strong>
                <span>Calculado: {formatMm(calculated)}</span>
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Medida real (mm)</span>
                  <input
                    className={s.textInput}
                    inputMode="numeric"
                    value={real != null ? String(real) : ""}
                    onChange={(event) => {
                      const lengthMm = Math.max(0, Math.round(Number(event.target.value)) || 0);
                      const previous = recipe.validationCase?.realCuts ?? [];
                      const nextCuts = [
                        ...previous.filter((cut) => cut.componentId !== row.componentId),
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
                </label>
                <span>
                  {delta == null
                    ? "Sin comparar"
                    : delta === 0
                      ? "Coincide"
                      : `Diferencia: ${delta > 0 ? "+" : ""}${delta} mm · Requiere ajuste`}
                </span>
              </article>
            );
          })}
      </div>

      <div className={s.recipeStatusRow}>
        <button
          type="button"
          className={s.secondaryButton}
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
          className={s.primaryButton}
          onClick={() => {
            const confirmed = window.confirm(
              "Confirma que estas medidas coinciden con tu fabricación real. El taller es responsable de revisar la pauta antes de cortar."
            );
            if (!confirmed) return;
            onRecipeChange(confirmRecipeValidated(recipe));
          }}
        >
          Marcar receta como validada
        </button>
      </div>

      <p className={s.fieldHint}>
        Estado: {RECIPE_STATUS_LABELS[deriveRecipeStatus(recipe)]}. La distribución de barras es
        referencial, no una optimización de mínimo desperdicio.
      </p>
    </div>
  );
}
