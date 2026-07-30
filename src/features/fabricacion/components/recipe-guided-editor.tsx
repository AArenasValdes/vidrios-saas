"use client";

import { Plus, Trash2 } from "lucide-react";

import {
  crearAccesorioFabricacionVacio,
  crearPerfilFabricacionVacio,
  crearVidrioFabricacionVacio,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import {
  FABRICACION_BASES_MEDIDA,
  FABRICACION_REGLAS_CANTIDAD,
  FABRICACION_TIPOLOGIAS,
  type FabricacionBaseMedida,
  type FabricacionCondicion,
  type FabricacionReceta,
  type FabricacionReglaCantidadTipo,
} from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-workspace.module.css";

const MEASURE_LABELS: Record<FabricacionBaseMedida, string> = {
  ancho_total: "Ancho total",
  alto_total: "Alto total",
  ancho_modulo: "Ancho de modulo",
  alto_modulo: "Alto de modulo",
  ancho_por_hoja: "Ancho dividido por hojas",
  alto_por_hoja: "Alto total por hoja",
  fijo_mm: "Medida fija",
};

const QUANTITY_LABELS: Record<FabricacionReglaCantidadTipo, string> = {
  fija: "Cantidad fija",
  por_hoja: "Por hoja",
  por_modulo: "Por modulo",
};

function positiveNumber(value: string, fallback = 1) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function integerNumber(value: string) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveDecimal(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function exactConditionValue(
  value: FabricacionCondicion["hojas"] | FabricacionCondicion["modulos"]
) {
  if (typeof value === "number") return value;
  return value?.igual ?? "";
}

function patchCondition(
  condition: FabricacionCondicion | undefined,
  patch: Partial<FabricacionCondicion>
): FabricacionCondicion | undefined {
  const next = { ...condition, ...patch };
  if ("hojas" in patch && patch.hojas === undefined) delete next.hojas;
  if ("modulos" in patch && patch.modulos === undefined) delete next.modulos;
  if ("variante" in patch && patch.variante === undefined) delete next.variante;
  return next.hojas == null && next.modulos == null && next.variante == null
    ? undefined
    : next;
}

function ConditionFields({
  condition,
  readOnly,
  onChange,
}: {
  condition?: FabricacionCondicion;
  readOnly: boolean;
  onChange: (condition: FabricacionCondicion | undefined) => void;
}) {
  return (
    <>
      <label>
        <span>Solo con hojas</span>
        <input
          type="number"
          min="1"
          value={exactConditionValue(condition?.hojas)}
          placeholder="Cualquiera"
          onChange={(event) =>
            onChange(
              patchCondition(condition, {
                hojas: event.target.value
                  ? positiveNumber(event.target.value)
                  : undefined,
              })
            )
          }
          disabled={readOnly}
        />
      </label>
      <label>
        <span>Solo con modulos</span>
        <input
          type="number"
          min="1"
          value={exactConditionValue(condition?.modulos)}
          placeholder="Cualquiera"
          onChange={(event) =>
            onChange(
              patchCondition(condition, {
                modulos: event.target.value
                  ? positiveNumber(event.target.value)
                  : undefined,
              })
            )
          }
          disabled={readOnly}
        />
      </label>
      <label>
        <span>Solo para variante</span>
        <input
          value={
            typeof condition?.variante === "string"
              ? condition.variante
              : Array.isArray(condition?.variante)
                ? condition.variante.join(", ")
                : ""
          }
          placeholder="Cualquiera"
          onChange={(event) =>
            onChange(
              patchCondition(condition, {
                variante: event.target.value.trim() || undefined,
              })
            )
          }
          disabled={readOnly}
        />
      </label>
    </>
  );
}

type Props = {
  recipe: FabricacionReceta;
  providerName: string;
  lineName: string;
  readOnly?: boolean;
  onRecipeChange: (recipe: FabricacionReceta) => void;
  onProviderNameChange: (value: string) => void;
  onLineNameChange: (value: string) => void;
};

export function RecipeGuidedEditor({
  recipe,
  providerName,
  lineName,
  readOnly = false,
  onRecipeChange,
  onProviderNameChange,
  onLineNameChange,
}: Props) {
  const updateIdentity = (
    patch: Partial<FabricacionReceta["identidad"]>
  ) => {
    onRecipeChange({
      ...recipe,
      identidad: { ...recipe.identidad, ...patch },
    });
  };

  const addProfile = () => {
    onRecipeChange({
      ...recipe,
      perfiles: [
        ...recipe.perfiles,
        crearPerfilFabricacionVacio(crypto.randomUUID()),
      ],
    });
  };

  const addGlass = () => {
    onRecipeChange({
      ...recipe,
      vidrios: [
        ...recipe.vidrios,
        crearVidrioFabricacionVacio(crypto.randomUUID()),
      ],
    });
  };

  const addAccessory = () => {
    onRecipeChange({
      ...recipe,
      accesorios: [
        ...recipe.accesorios,
        crearAccesorioFabricacionVacio(crypto.randomUUID()),
      ],
    });
  };

  return (
    <div className={s.editorFlow}>
      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Identidad</span>
            <h2>Como reconoce el taller esta receta</h2>
          </div>
          <p>Estos datos distinguen una variante sin volver a preguntar la tipologia.</p>
        </div>

        <div className={s.formGrid}>
          <label>
            <span>Proveedor</span>
            <input
              value={providerName}
              onChange={(event) => onProviderNameChange(event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Linea</span>
            <input
              value={lineName}
              onChange={(event) => onLineNameChange(event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Nombre de la receta</span>
            <input
              value={recipe.identidad.nombre}
              onChange={(event) => updateIdentity({ nombre: event.target.value })}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Codigo interno</span>
            <input
              value={recipe.identidad.codigo}
              onChange={(event) => updateIdentity({ codigo: event.target.value })}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Tipologia</span>
            <select
              value={recipe.identidad.tipologia}
              onChange={(event) =>
                updateIdentity({
                  tipologia: event.target
                    .value as FabricacionReceta["identidad"]["tipologia"],
                })
              }
              disabled={readOnly}
            >
              {FABRICACION_TIPOLOGIAS.map((typology) => (
                <option key={typology} value={typology}>
                  {typology.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Hojas</span>
            <input
              type="number"
              min="1"
              value={recipe.identidad.hojas}
              onChange={(event) =>
                updateIdentity({ hojas: positiveNumber(event.target.value) })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Modulos</span>
            <input
              type="number"
              min="1"
              value={recipe.identidad.modulos}
              onChange={(event) =>
                updateIdentity({ modulos: positiveNumber(event.target.value) })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Apertura</span>
            <input
              value={recipe.identidad.apertura ?? ""}
              placeholder="Ej. corredera"
              onChange={(event) =>
                updateIdentity({ apertura: event.target.value.trim() || null })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Herraje</span>
            <input
              value={recipe.identidad.herraje ?? ""}
              placeholder="Ej. caracol"
              onChange={(event) =>
                updateIdentity({ herraje: event.target.value.trim() || null })
              }
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Variante</span>
            <input
              value={recipe.identidad.variante}
              onChange={(event) => updateIdentity({ variante: event.target.value })}
              disabled={readOnly}
            />
          </label>
        </div>
      </section>

      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Perfiles y componentes</span>
            <h2>Que se corta y como se mide</h2>
          </div>
          {!readOnly ? (
            <button type="button" className={s.secondaryButton} onClick={addProfile}>
              <Plus size={16} />
              Agregar perfil
            </button>
          ) : null}
        </div>

        {recipe.perfiles.length === 0 ? (
          <div className={s.emptyInline}>
            Todavia no hay perfiles. Agrega el primero para preparar la pauta.
          </div>
        ) : (
          <div className={s.componentList}>
            {recipe.perfiles.map((profile, index) => (
              <article key={profile.id} className={s.componentCard}>
                <div className={s.componentCardHeader}>
                  <strong>{profile.funcion || `Perfil ${index + 1}`}</strong>
                  {!readOnly ? (
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-label={`Eliminar ${profile.funcion || "perfil"}`}
                      title="Eliminar perfil"
                      onClick={() =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.filter(
                            (entry) => entry.id !== profile.id
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
                <div className={s.formGridDense}>
                  <label>
                    <span>Funcion</span>
                    <input
                      value={profile.funcion}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, funcion: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Codigo del perfil</span>
                    <input
                      value={profile.codigoPerfil}
                      placeholder="Por asignar"
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, codigoPerfil: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Nombre usado en taller</span>
                    <input
                      value={profile.nombrePerfil}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, nombrePerfil: event.target.value }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Dimension base</span>
                    <select
                      value={profile.reglaMedida.base}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    base: event.target.value as FabricacionBaseMedida,
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    >
                      {FABRICACION_BASES_MEDIDA.map((base) => (
                        <option key={base} value={base}>
                          {MEASURE_LABELS[base]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {profile.reglaMedida.base === "fijo_mm" ? (
                    <label>
                      <span>Medida fija (mm)</span>
                      <input
                        type="number"
                        min="1"
                        value={profile.reglaMedida.valorFijoMm ?? 1}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            perfiles: recipe.perfiles.map((entry) =>
                              entry.id === profile.id
                                ? {
                                    ...entry,
                                    reglaMedida: {
                                      ...entry.reglaMedida,
                                      valorFijoMm: positiveNumber(event.target.value),
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>Ajuste (mm)</span>
                    <input
                      type="number"
                      value={profile.reglaMedida.ajusteMm ?? 0}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    ajusteMm: integerNumber(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Multiplicador de medida</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={profile.reglaMedida.multiplicador ?? 1}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaMedida: {
                                    ...entry.reglaMedida,
                                    multiplicador: positiveDecimal(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Regla de cantidad</span>
                    <select
                      value={profile.reglaCantidad.tipo}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaCantidad: {
                                    ...entry.reglaCantidad,
                                    tipo: event.target
                                      .value as FabricacionReglaCantidadTipo,
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    >
                      {FABRICACION_REGLAS_CANTIDAD.map((rule) => (
                        <option key={rule} value={rule}>
                          {QUANTITY_LABELS[rule]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Cantidad</span>
                    <input
                      type="number"
                      min="1"
                      value={profile.reglaCantidad.cantidad}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaCantidad: {
                                    ...entry.reglaCantidad,
                                    cantidad: positiveNumber(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Multiplicador de cantidad</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={profile.reglaCantidad.multiplicador ?? 1}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  reglaCantidad: {
                                    ...entry.reglaCantidad,
                                    multiplicador: positiveDecimal(event.target.value),
                                  },
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label>
                    <span>Largo comercial (mm)</span>
                    <input
                      type="number"
                      min="1"
                      value={profile.largoComercialMm ?? ""}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? {
                                  ...entry,
                                  largoComercialMm: event.target.value
                                    ? positiveNumber(event.target.value)
                                    : null,
                                }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <ConditionFields
                    condition={profile.reglaMedida.condicion}
                    readOnly={readOnly}
                    onChange={(condition) =>
                      onRecipeChange({
                        ...recipe,
                        perfiles: recipe.perfiles.map((entry) =>
                          entry.id === profile.id
                            ? {
                                ...entry,
                                reglaMedida: {
                                  ...entry.reglaMedida,
                                  condicion: condition,
                                },
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  condicion: condition,
                                },
                              }
                            : entry
                        ),
                      })
                    }
                  />
                  <label className={s.checkboxField}>
                    <input
                      type="checkbox"
                      checked={profile.requerido}
                      onChange={(event) =>
                        onRecipeChange({
                          ...recipe,
                          perfiles: recipe.perfiles.map((entry) =>
                            entry.id === profile.id
                              ? { ...entry, requerido: event.target.checked }
                              : entry
                          ),
                        })
                      }
                      disabled={readOnly}
                    />
                    <span>Componente obligatorio</span>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Vidrios</span>
            <h2>Medidas de cada paño</h2>
          </div>
          {!readOnly ? (
            <button type="button" className={s.secondaryButton} onClick={addGlass}>
              <Plus size={16} />
              Agregar vidrio
            </button>
          ) : null}
        </div>
        <div className={s.componentList}>
          {recipe.vidrios.map((glass) => (
            <article key={glass.id} className={s.componentCard}>
              <div className={s.componentCardHeader}>
                <strong>{glass.nombre}</strong>
                {!readOnly ? (
                  <button
                    type="button"
                    className={s.iconButton}
                    aria-label={`Eliminar ${glass.nombre}`}
                    title="Eliminar vidrio"
                    onClick={() =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.filter(
                          (entry) => entry.id !== glass.id
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
              <div className={s.formGridDense}>
                <label>
                  <span>Nombre</span>
                  <input
                    value={glass.nombre}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? { ...entry, nombre: event.target.value }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                {(["reglaAncho", "reglaAlto"] as const).map((field) => (
                  <div key={field} className={s.inlineRule}>
                    <label>
                      <span>{field === "reglaAncho" ? "Regla de ancho" : "Regla de alto"}</span>
                      <select
                        value={glass[field].base}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            vidrios: recipe.vidrios.map((entry) =>
                              entry.id === glass.id
                                ? {
                                    ...entry,
                                    [field]: {
                                      ...entry[field],
                                      base: event.target.value as FabricacionBaseMedida,
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      >
                        {FABRICACION_BASES_MEDIDA.map((base) => (
                          <option key={base} value={base}>
                            {MEASURE_LABELS[base]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Ajuste (mm)</span>
                      <input
                        type="number"
                        value={glass[field].ajusteMm ?? 0}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            vidrios: recipe.vidrios.map((entry) =>
                              entry.id === glass.id
                                ? {
                                    ...entry,
                                    [field]: {
                                      ...entry[field],
                                      ajusteMm: integerNumber(event.target.value),
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                    <label>
                      <span>Multiplicador</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={glass[field].multiplicador ?? 1}
                        onChange={(event) =>
                          onRecipeChange({
                            ...recipe,
                            vidrios: recipe.vidrios.map((entry) =>
                              entry.id === glass.id
                                ? {
                                    ...entry,
                                    [field]: {
                                      ...entry[field],
                                      multiplicador: positiveDecimal(
                                        event.target.value
                                      ),
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                  </div>
                ))}
                <label>
                  <span>Regla de cantidad</span>
                  <select
                    value={glass.reglaCantidad.tipo}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  tipo: event.target
                                    .value as FabricacionReglaCantidadTipo,
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  >
                    {FABRICACION_REGLAS_CANTIDAD.map((rule) => (
                      <option key={rule} value={rule}>
                        {QUANTITY_LABELS[rule]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={glass.reglaCantidad.cantidad}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  cantidad: positiveNumber(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span>Multiplicador de cantidad</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={glass.reglaCantidad.multiplicador ?? 1}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        vidrios: recipe.vidrios.map((entry) =>
                          entry.id === glass.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  multiplicador: positiveDecimal(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <ConditionFields
                  condition={glass.condicion}
                  readOnly={readOnly}
                  onChange={(condition) =>
                    onRecipeChange({
                      ...recipe,
                      vidrios: recipe.vidrios.map((entry) =>
                        entry.id === glass.id
                          ? { ...entry, condicion: condition }
                          : entry
                      ),
                    })
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Accesorios</span>
            <h2>Unidades que acompañan la pieza</h2>
          </div>
          {!readOnly ? (
            <button type="button" className={s.secondaryButton} onClick={addAccessory}>
              <Plus size={16} />
              Agregar accesorio
            </button>
          ) : null}
        </div>
        <div className={s.componentList}>
          {recipe.accesorios.map((accessory) => (
            <article key={accessory.id} className={s.componentCard}>
              <div className={s.componentCardHeader}>
                <strong>{accessory.nombre}</strong>
                {!readOnly ? (
                  <button
                    type="button"
                    className={s.iconButton}
                    aria-label={`Eliminar ${accessory.nombre}`}
                    title="Eliminar accesorio"
                    onClick={() =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.filter(
                          (entry) => entry.id !== accessory.id
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
              <div className={s.formGridDense}>
                <label>
                  <span>Nombre</span>
                  <input
                    value={accessory.nombre}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? { ...entry, nombre: event.target.value }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span>Codigo opcional</span>
                  <input
                    value={accessory.codigo}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? { ...entry, codigo: event.target.value }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span>Regla de cantidad</span>
                  <select
                    value={accessory.reglaCantidad.tipo}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  tipo: event.target
                                    .value as FabricacionReglaCantidadTipo,
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  >
                    {FABRICACION_REGLAS_CANTIDAD.map((rule) => (
                      <option key={rule} value={rule}>
                        {QUANTITY_LABELS[rule]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={accessory.reglaCantidad.cantidad}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  cantidad: positiveNumber(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span>Multiplicador de cantidad</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={accessory.reglaCantidad.multiplicador ?? 1}
                    onChange={(event) =>
                      onRecipeChange({
                        ...recipe,
                        accesorios: recipe.accesorios.map((entry) =>
                          entry.id === accessory.id
                            ? {
                                ...entry,
                                reglaCantidad: {
                                  ...entry.reglaCantidad,
                                  multiplicador: positiveDecimal(event.target.value),
                                },
                              }
                            : entry
                        ),
                      })
                    }
                    disabled={readOnly}
                  />
                </label>
                <ConditionFields
                  condition={accessory.condicion}
                  readOnly={readOnly}
                  onChange={(condition) =>
                    onRecipeChange({
                      ...recipe,
                      accesorios: recipe.accesorios.map((entry) =>
                        entry.id === accessory.id
                          ? { ...entry, condicion: condition }
                          : entry
                      ),
                    })
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
