"use client";

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
  type FabricationRecipe,
  type FabricationType,
  type RecipeComponent,
  type RecipeComponentFunction,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { createStructuralRecipeTemplate } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-templates";
import {
  addRecipeComponentByFunction,
  applyRealMeasuresAsAdjustments,
  buildRecipeCuttingPreview,
  confirmRecipeValidated,
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
  const preview: RecipeCuttingPreview = buildRecipeCuttingPreview(recipe, {
    widthMm,
    heightMm,
    sashCount: recipe.sashCount,
    moduleCount: recipe.moduleCount,
    quantity: 1,
  });
  const status = deriveRecipeStatus(recipe);

  const handleTypeChange = (type: FabricationType) => {
    const next = createStructuralRecipeTemplate(type);
    onRecipeChange({
      ...next,
      variant: recipe.variant,
    });
  };

  if (mode === "configure") {
    return (
      <div className={s.recipeEditor}>
        <p className={s.fieldHint}>
          Ventora cargó una estructura sugerida. Confirma los perfiles y cortes que utiliza tu
          taller.
        </p>

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
              value={String(recipe.sashCount)}
              onChange={(event) =>
                onRecipeChange(
                  markRecipeDirtyAfterEdit({
                    ...recipe,
                    sashCount: Math.max(1, Math.round(Number(event.target.value)) || 1),
                  })
                )
              }
            />
          </label>

          <label className={s.fieldBlock}>
            <span className={s.fieldLabel}>Módulos</span>
            <input
              className={s.textInput}
              inputMode="numeric"
              value={String(recipe.moduleCount)}
              onChange={(event) =>
                onRecipeChange(
                  markRecipeDirtyAfterEdit({
                    ...recipe,
                    moduleCount: Math.max(1, Math.round(Number(event.target.value)) || 1),
                  })
                )
              }
            />
          </label>
        </div>

        <div className={s.recipeStatusRow}>
          <strong>Estado técnico:</strong>
          <span>{RECIPE_STATUS_LABELS[status]}</span>
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

        <div className={s.profileRoleCard}>
          <div className={s.profileRoleHead}>
            <strong>Perfiles que componen esta fabricación</strong>
            <span>Una fila por componente real</span>
          </div>

          <div className={s.recipeComponentList}>
            {recipe.components.map((component) => {
              const configured = isComponentConfigured(component);
              return (
                <article key={component.id} className={s.recipeComponentCard}>
                  <header className={s.recipeComponentHead}>
                    <div>
                      <strong>{component.functionLabel}</strong>
                      <span>
                        {component.required ? "Obligatorio" : "Opcional"}
                        {!configured ? " · Pendiente de configurar" : ""}
                      </span>
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
                          className={s.ghostButton}
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
                      <span className={s.fieldLabel}>Nombre</span>
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
                    {component.kind !== "accessory" ? (
                      <>
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
                            value={String(component.adjustMm)}
                            onChange={(event) =>
                              onRecipeChange(
                                updateComponent(recipe, component.id, {
                                  adjustMm: Math.max(
                                    0,
                                    Math.round(Number(event.target.value)) || 0
                                  ),
                                })
                              )
                            }
                            disabled={component.adjustMode === "none"}
                          />
                        </label>
                      </>
                    ) : null}
                    <label className={s.fieldBlock}>
                      <span className={s.fieldLabel}>Cantidad</span>
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
                      <span className={s.fieldLabel}>Valor cantidad</span>
                      <input
                        className={s.textInput}
                        inputMode="numeric"
                        value={String(component.quantityValue)}
                        onChange={(event) =>
                          onRecipeChange(
                            updateComponent(recipe, component.id, {
                              quantityValue: Math.max(
                                1,
                                Math.round(Number(event.target.value)) || 1
                              ),
                            })
                          )
                        }
                      />
                    </label>
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
        </div>

        <div className={s.cuttingPreview}>
          <div className={s.cuttingPreviewHead}>
            <strong>
              Ejemplo vano {formatMm(widthMm).replace(" mm", "")} × {formatMm(heightMm)}
            </strong>
            <span>
              {preview.pendingRequiredCount > 0
                ? `${preview.pendingRequiredCount} pendientes`
                : "Reglas listas para validar"}
            </span>
          </div>
          <div className={s.cuttingCutList}>
            {preview.rows.map((row) => (
              <div key={row.componentId} className={s.cuttingCutRow}>
                <span>
                  {row.functionLabel}
                  {row.profileCode !== "Sin perfil" && row.profileCode !== "Por asignar"
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
          {preview.barSuggestions.length > 0 ? (
            <p className={s.fieldHint}>
              Distribución sugerida por perfil (pauta referencial, no optimización de desperdicio).
            </p>
          ) : null}
        </div>
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
