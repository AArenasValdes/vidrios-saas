"use client";

import { useState } from "react";
import { Check, Play, Save, X } from "lucide-react";

import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeTestRecord,
} from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-workspace.module.css";

function cloneResult(result: FabricacionResultadoCubicacion) {
  return JSON.parse(JSON.stringify(result)) as FabricacionResultadoCubicacion;
}

function recalculateExpectedTotals(result: FabricacionResultadoCubicacion) {
  return {
    ...result,
    totalLinealMm: result.perfiles.reduce(
      (sum, profile) => sum + profile.totalLinealMm,
      0
    ),
    totalVidrioM2: result.vidrios.reduce(
      (sum, glass) => sum + glass.totalM2,
      0
    ),
  };
}

function positiveNumber(value: string, fallback = 1) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type Props = {
  recipe: FabricationRecipeRecord;
  tests: FabricationRecipeTestRecord[];
  isSaving: boolean;
  onSaveTest: (input: {
    name: string;
    input: FabricacionEntradaCalculo;
    expectedOutput: FabricacionResultadoCubicacion;
    isRequired: boolean;
  }) => Promise<void>;
  onRunTest: (testId: string) => Promise<void>;
};

export function RecipeTestLab({
  recipe,
  tests,
  isSaving,
  onSaveTest,
  onRunTest,
}: Props) {
  const [name, setName] = useState("Trabajo real");
  const [input, setInput] = useState<FabricacionEntradaCalculo>({
    anchoTotalMm: 1200,
    altoTotalMm: 1000,
    cantidad: 1,
    hojas: recipe.definition.identidad.hojas,
    modulos: recipe.definition.identidad.modulos,
    variante: recipe.definition.identidad.variante,
  });
  const [actual, setActual] = useState<FabricacionResultadoCubicacion | null>(null);
  const [expected, setExpected] = useState<FabricacionResultadoCubicacion | null>(null);
  const [isRequired, setIsRequired] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const calculate = () => {
    const next = calcularCubicacionYPauta(recipe.definition, input);
    setActual(next);
    setExpected(cloneResult(next));
    setFeedback(
      next.calculable
        ? "Calculo listo. Ajusta Esperado con las medidas del trabajo real."
        : "La receta no pudo calcularse con estas medidas."
    );
  };

  const save = async () => {
    if (!actual || !expected) return;
    await onSaveTest({
      name: name.trim() || "Trabajo real",
      input,
      expectedOutput: expected,
      isRequired,
    });
    setFeedback("Caso guardado. Ejecutalo para confirmar la coincidencia.");
  };

  return (
    <div className={s.labFlow}>
      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Probar receta</span>
            <h2>Usa una medida que ya hayas fabricado</h2>
          </div>
          <p>La columna Esperado debe reflejar el resultado real de tu taller.</p>
        </div>

        <div className={s.testInputGrid}>
          <label>
            <span>Nombre del caso</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Ancho (mm)</span>
            <input
              type="number"
              min="1"
              value={input.anchoTotalMm}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  anchoTotalMm: positiveNumber(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span>Alto (mm)</span>
            <input
              type="number"
              min="1"
              value={input.altoTotalMm}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  altoTotalMm: positiveNumber(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span>Cantidad</span>
            <input
              type="number"
              min="1"
              value={input.cantidad}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  cantidad: positiveNumber(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span>Hojas</span>
            <input
              type="number"
              min="1"
              value={input.hojas}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  hojas: positiveNumber(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span>Modulos</span>
            <input
              type="number"
              min="1"
              value={input.modulos}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  modulos: positiveNumber(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span>Variante</span>
            <input
              value={input.variante ?? ""}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  variante: event.target.value.trim() || null,
                }))
              }
            />
          </label>
          <label className={s.checkboxField}>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(event) => setIsRequired(event.target.checked)}
            />
            <span>Caso obligatorio para validar</span>
          </label>
        </div>

        <div className={s.actionRow}>
          <button type="button" className={s.primaryButton} onClick={calculate}>
            <Play size={16} />
            Calcular pauta
          </button>
          <button
            type="button"
            className={s.secondaryButton}
            disabled={!actual || !expected || isSaving}
            onClick={() => void save()}
          >
            <Save size={16} />
            Guardar caso
          </button>
          {feedback ? <span className={s.feedbackText}>{feedback}</span> : null}
        </div>
      </section>

      {actual && expected ? (
        <section className={s.editorSection}>
          <div className={s.sectionHeading}>
            <div>
              <span>Comparacion</span>
              <h2>Esperado y calculado</h2>
            </div>
            <p>Verde coincide. Naranjo requiere revisar la receta o el dato esperado.</p>
          </div>

          <div className={s.comparisonTableWrap}>
            <table className={s.comparisonTable}>
              <thead>
                <tr>
                  <th>Perfil / funcion</th>
                  <th>Calculado</th>
                  <th>Esperado</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {actual.perfiles.map((row, index) => {
                  const expectedRow = expected.perfiles[index];
                  const lengthDifference =
                    row.medidaMm - (expectedRow?.medidaMm ?? row.medidaMm);
                  const quantityDifference =
                    row.cantidadPiezas -
                    (expectedRow?.cantidadPiezas ?? row.cantidadPiezas);
                  const matches =
                    lengthDifference === 0 && quantityDifference === 0;

                  return (
                    <tr key={row.componenteId} data-match={matches ? "true" : "false"}>
                      <td>
                        <strong>{row.funcion}</strong>
                        <small>{row.codigoPerfil || "Por asignar"}</small>
                      </td>
                      <td>
                        {row.medidaMm} mm x {row.cantidadPiezas}
                      </td>
                      <td>
                        <div className={s.expectedInputs}>
                          <input
                            aria-label={`Medida esperada ${row.funcion}`}
                            type="number"
                            min="1"
                            value={expectedRow?.medidaMm ?? row.medidaMm}
                            onChange={(event) =>
                              setExpected((current) => {
                                if (!current) return current;
                                return recalculateExpectedTotals({
                                  ...current,
                                  perfiles: current.perfiles.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? {
                                          ...entry,
                                          medidaMm: positiveNumber(event.target.value),
                                          totalLinealMm:
                                            positiveNumber(event.target.value) *
                                            entry.cantidadPiezas,
                                        }
                                      : entry
                                  ),
                                });
                              })
                            }
                          />
                          <span>mm x</span>
                          <input
                            aria-label={`Cantidad esperada ${row.funcion}`}
                            type="number"
                            min="1"
                            value={expectedRow?.cantidadPiezas ?? row.cantidadPiezas}
                            onChange={(event) =>
                              setExpected((current) => {
                                if (!current) return current;
                                return recalculateExpectedTotals({
                                  ...current,
                                  perfiles: current.perfiles.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? {
                                          ...entry,
                                          cantidadPiezas: positiveNumber(
                                            event.target.value
                                          ),
                                          totalLinealMm:
                                            entry.medidaMm *
                                            positiveNumber(event.target.value),
                                        }
                                      : entry
                                  ),
                                });
                              })
                            }
                          />
                        </div>
                      </td>
                      <td>
                        {lengthDifference > 0 ? "+" : ""}
                        {lengthDifference} mm / {quantityDifference > 0 ? "+" : ""}
                        {quantityDifference} u.
                      </td>
                      <td>
                        <span className={s.matchStatus} data-match={matches ? "true" : "false"}>
                          {matches ? <Check size={14} /> : <X size={14} />}
                          {matches ? "Coincide" : "Revisar"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {actual.vidrios.map((glass, index) => {
                  const expectedGlass = expected.vidrios[index];
                  const widthDifference =
                    glass.anchoMm - (expectedGlass?.anchoMm ?? glass.anchoMm);
                  const heightDifference =
                    glass.altoMm - (expectedGlass?.altoMm ?? glass.altoMm);
                  const quantityDifference =
                    glass.cantidadPiezas -
                    (expectedGlass?.cantidadPiezas ?? glass.cantidadPiezas);
                  const matches =
                    widthDifference === 0 &&
                    heightDifference === 0 &&
                    quantityDifference === 0;

                  return (
                    <tr key={glass.vidrioId} data-match={matches ? "true" : "false"}>
                      <td>
                        <strong>{glass.nombre}</strong>
                        <small>Vidrio</small>
                      </td>
                      <td>
                        {glass.anchoMm} x {glass.altoMm} mm · {glass.cantidadPiezas}
                      </td>
                      <td>
                        <div className={s.expectedInputsGlass}>
                          {(["anchoMm", "altoMm", "cantidadPiezas"] as const).map(
                            (field) => (
                              <input
                                key={field}
                                aria-label={`${field} esperado ${glass.nombre}`}
                                type="number"
                                min="1"
                                value={expectedGlass?.[field] ?? glass[field]}
                                onChange={(event) =>
                                  setExpected((current) => {
                                    if (!current) return current;
                                    return recalculateExpectedTotals({
                                      ...current,
                                      vidrios: current.vidrios.map(
                                        (entry, entryIndex) => {
                                          if (entryIndex !== index) return entry;
                                          const next = {
                                            ...entry,
                                            [field]: positiveNumber(event.target.value),
                                          };
                                          return {
                                            ...next,
                                            totalM2:
                                              (next.anchoMm *
                                                next.altoMm *
                                                next.cantidadPiezas) /
                                              1_000_000,
                                          };
                                        }
                                      ),
                                    });
                                  })
                                }
                              />
                            )
                          )}
                        </div>
                      </td>
                      <td>
                        {widthDifference} / {heightDifference} mm · {quantityDifference} u.
                      </td>
                      <td>
                        <span className={s.matchStatus} data-match={matches ? "true" : "false"}>
                          {matches ? <Check size={14} /> : <X size={14} />}
                          {matches ? "Coincide" : "Revisar"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {actual.accesorios.map((accessory, index) => {
                  const expectedAccessory = expected.accesorios[index];
                  const difference =
                    accessory.cantidadUnidades -
                    (expectedAccessory?.cantidadUnidades ??
                      accessory.cantidadUnidades);
                  const matches = difference === 0;

                  return (
                    <tr
                      key={accessory.accesorioId}
                      data-match={matches ? "true" : "false"}
                    >
                      <td>
                        <strong>{accessory.nombre}</strong>
                        <small>{accessory.codigo || "Accesorio"}</small>
                      </td>
                      <td>{accessory.cantidadUnidades} unidades</td>
                      <td>
                        <div className={s.expectedInputsAccessory}>
                          <input
                            aria-label={`Cantidad esperada ${accessory.nombre}`}
                            type="number"
                            min="1"
                            value={
                              expectedAccessory?.cantidadUnidades ??
                              accessory.cantidadUnidades
                            }
                            onChange={(event) =>
                              setExpected((current) => {
                                if (!current) return current;
                                return {
                                  ...current,
                                  accesorios: current.accesorios.map(
                                    (entry, entryIndex) =>
                                      entryIndex === index
                                        ? {
                                            ...entry,
                                            cantidadUnidades: positiveNumber(
                                              event.target.value
                                            ),
                                          }
                                        : entry
                                  ),
                                };
                              })
                            }
                          />
                        </div>
                      </td>
                      <td>{difference} unidades</td>
                      <td>
                        <span className={s.matchStatus} data-match={matches ? "true" : "false"}>
                          {matches ? <Check size={14} /> : <X size={14} />}
                          {matches ? "Coincide" : "Revisar"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={s.resultBands}>
            <div>
              <span>Vidrios</span>
              {actual.vidrios.length === 0 ? (
                <p>Sin vidrios calculados.</p>
              ) : (
                actual.vidrios.map((glass) => (
                  <p key={glass.vidrioId}>
                    <strong>{glass.nombre}</strong> {glass.anchoMm} x {glass.altoMm} mm ·{" "}
                    {glass.cantidadPiezas} u.
                  </p>
                ))
              )}
            </div>
            <div>
              <span>Accesorios</span>
              {actual.accesorios.length === 0 ? (
                <p>Sin accesorios calculados.</p>
              ) : (
                actual.accesorios.map((accessory) => (
                  <p key={accessory.accesorioId}>
                    <strong>{accessory.nombre}</strong> · {accessory.cantidadUnidades} u.
                  </p>
                ))
              )}
            </div>
            <div>
              <span>Advertencias</span>
              {actual.advertencias.length === 0 ? (
                <p>Sin advertencias.</p>
              ) : (
                actual.advertencias.map((warning) => (
                  <p key={`${warning.codigo}-${warning.componenteId ?? ""}`}>
                    {warning.mensaje}
                  </p>
                ))
              )}
            </div>
          </div>

          <details className={s.traceDetails}>
            <summary>Trazabilidad legible</summary>
            {actual.perfiles.flatMap((profile) =>
              profile.trazabilidad.map((trace) => (
                <p key={trace.reglaId}>
                  <strong>{profile.funcion}:</strong> {trace.formula} = {trace.resultado}
                </p>
              ))
            )}
          </details>
        </section>
      ) : null}

      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Casos guardados</span>
            <h2>Pruebas de esta version</h2>
          </div>
          <p>{tests.length} casos registrados</p>
        </div>

        {tests.length === 0 ? (
          <div className={s.emptyInline}>Todavia no hay casos guardados.</div>
        ) : (
          <div className={s.testRows}>
            {tests.map((test) => (
              <div key={test.id} className={s.testRow}>
                <div>
                  <strong>{test.name}</strong>
                  <span>
                    {test.input.anchoTotalMm} x {test.input.altoTotalMm} mm ·{" "}
                    {test.isRequired ? "Obligatorio" : "Opcional"}
                  </span>
                </div>
                <span className={s.matchStatus} data-match={test.passed ? "true" : "false"}>
                  {test.passed ? <Check size={14} /> : <X size={14} />}
                  {test.passed ? "Coincide" : "Sin aprobar"}
                </span>
                <button
                  type="button"
                  className={s.secondaryButton}
                  disabled={isSaving}
                  onClick={() => void onRunTest(test.id)}
                >
                  <Play size={15} />
                  Ejecutar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
