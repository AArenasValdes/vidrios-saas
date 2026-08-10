"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Pencil,
  Play,
  Ruler,
} from "lucide-react";

import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { tieneLargosComercialesPendientes } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
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
    totalVidrioM2: result.vidrios.reduce((sum, glass) => sum + glass.totalM2, 0),
  };
}

function positiveNumber(value: string, fallback = 1) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatLinealMeters(totalLinealMm: number) {
  return `${(totalLinealMm / 1000).toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} m`;
}

function buildOptionalPendingGroups(recipe: FabricacionReceta) {
  const items: string[] = [];
  const withoutLength = recipe.perfiles.filter(
    (profile) => profile.requerido && !profile.largoComercialMm
  ).length;
  if (withoutLength > 0) {
    items.push(
      `${withoutLength} ${
        withoutLength === 1 ? "perfil sin largo comercial" : "perfiles sin largo comercial"
      }`
    );
  }

  const withoutCode = recipe.perfiles.filter(
    (profile) => profile.requerido && !profile.codigoPerfil.trim()
  ).length;
  if (withoutCode > 0) {
    items.push("referencias/códigos pendientes");
  }

  const glassPending = recipe.vidrios.some(
    (glass) => (glass.datosPendientes?.length ?? 0) > 0
  );
  if (glassPending || recipe.vidrios.some((glass) => glass.requerido && !glass.nombre.trim())) {
    items.push("vidrio pendiente de confirmar");
  }

  const accessoryPending = recipe.accesorios.some(
    (accessory) => (accessory.datosPendientes?.length ?? 0) > 0
  );
  if (accessoryPending) {
    items.push("accesorios con información opcional");
  }

  return items;
}

function profilesAllMatch(
  actual: FabricacionResultadoCubicacion,
  expected: FabricacionResultadoCubicacion
) {
  if (actual.perfiles.length !== expected.perfiles.length) return false;
  return actual.perfiles.every((row, index) => {
    const expectedRow = expected.perfiles[index];
    return (
      expectedRow &&
      row.medidaMm === expectedRow.medidaMm &&
      row.cantidadPiezas === expectedRow.cantidadPiezas
    );
  });
}

type Props = {
  recipe: FabricationRecipeRecord;
  tests: FabricationRecipeTestRecord[];
  isSaving: boolean;
  isActivated?: boolean;
  /** Casos obligatorios ya aprobados: permite activar sin recalcular en esta sesión. */
  canActivateFromSaved?: boolean;
  desktopActiveStep?: "test" | "plan" | "validation";
  onSaveTest: (input: {
    name: string;
    input: FabricacionEntradaCalculo;
    expectedOutput: FabricacionResultadoCubicacion;
    isRequired: boolean;
  }) => Promise<void>;
  onRunTest?: (testId: string) => Promise<void>;
  onBackToRecipe?: () => void;
  onConfigureLengths?: () => void;
  onActivate?: () => Promise<void> | void;
};

export function RecipeTestLab({
  recipe,
  tests,
  isSaving,
  isActivated = false,
  canActivateFromSaved = false,
  desktopActiveStep,
  onSaveTest,
  onBackToRecipe,
  onConfigureLengths,
  onActivate,
}: Props) {
  const identity = recipe.definition.identidad;
  const [name, setName] = useState("");
  const [anchoMm, setAnchoMm] = useState(1200);
  const [altoMm, setAltoMm] = useState(1000);
  const [cantidad, setCantidad] = useState(1);
  const [actual, setActual] = useState<FabricacionResultadoCubicacion | null>(null);
  const [expected, setExpected] = useState<FabricacionResultadoCubicacion | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const input = useMemo<FabricacionEntradaCalculo>(
    () => ({
      anchoTotalMm: anchoMm,
      altoTotalMm: altoMm,
      cantidad,
      hojas: identity.hojas,
      modulos: identity.modulos,
      variante: identity.variante,
    }),
    [anchoMm, altoMm, cantidad, identity.hojas, identity.modulos, identity.variante]
  );

  const missingCommercialLengths = tieneLargosComercialesPendientes(
    recipe.definition
  );
  const optionalPending = buildOptionalPendingGroups(recipe.definition);
  const barPlan = actual
    ? construirPautaBarrasFabricacion({
        receta: recipe.definition,
        resultado: actual,
      })
    : null;

  const allMatch =
    actual != null &&
    expected != null &&
    actual.calculable &&
    profilesAllMatch(actual, expected);
  const readyToActivate =
    (allMatch && Boolean(actual)) ||
    (canActivateFromSaved && actual == null) ||
    (canActivateFromSaved && allMatch);

  const glassPieces = actual
    ? actual.vidrios.reduce((sum, glass) => sum + glass.cantidadPiezas, 0)
    : 0;
  const accessoryUnits = actual
    ? actual.accesorios.reduce((sum, item) => sum + item.cantidadUnidades, 0)
    : 0;

  const calculate = () => {
    const next = calcularCubicacionYPauta(recipe.definition, input);
    setActual(next);
    setExpected(cloneResult(next));
    setFeedback(
      next.calculable
        ? null
        : "La receta no pudo calcularse con estas medidas."
    );
  };

  const handleActivate = async () => {
    if (!onActivate || !readyToActivate) return;
    setIsActivating(true);
    try {
      if (actual && expected && allMatch) {
        await onSaveTest({
          name: name.trim() || `Prueba ${anchoMm}×${altoMm}`,
          input,
          expectedOutput: expected,
          isRequired: true,
        });
      }
      await onActivate();
    } finally {
      setIsActivating(false);
    }
  };

  if (isActivated || recipe.status === "validated") {
    return (
      <div className={s.labFlow} data-guided-desktop={desktopActiveStep ? "true" : "false"}>
        <section className={`${s.editorSection} ${s.activateSuccessCard}`}>
          <div className={s.activateSuccessIcon} aria-hidden="true">
            <CheckCircle2 size={28} />
          </div>
          <h2>Receta validada</h2>
          <p>Ya puedes generar despiece y pauta desde tus cotizaciones.</p>
          {onBackToRecipe ? (
            <button
              type="button"
              className={s.secondaryButton}
              onClick={onBackToRecipe}
            >
              <ArrowLeft size={16} />
              Volver a receta
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className={s.labFlow} data-guided-desktop={desktopActiveStep ? "true" : "false"}>
      <section className={s.editorSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Probar y activar</span>
            <h2>Prueba tu receta con una medida real</h2>
          </div>
          <p>Comprueba que Ventora obtiene el mismo despiece que utilizas en taller.</p>
        </div>

        <div className={`${s.testInputGrid} ${s.testInputGridCompact}`}>
          <label>
            <span>Nombre del caso (opcional)</span>
            <input
              value={name}
              placeholder="Ej. Ventana living"
              onChange={(event) => setName(event.target.value)}
              aria-label="Nombre del caso"
            />
          </label>
          <label>
            <span>Ancho (mm)</span>
            <input
              type="number"
              min="1"
              value={anchoMm}
              aria-label="Ancho (mm)"
              onChange={(event) => setAnchoMm(positiveNumber(event.target.value))}
            />
          </label>
          <label>
            <span>Alto (mm)</span>
            <input
              type="number"
              min="1"
              value={altoMm}
              aria-label="Alto (mm)"
              onChange={(event) => setAltoMm(positiveNumber(event.target.value))}
            />
          </label>
          <label>
            <span>Cantidad</span>
            <input
              type="number"
              min="1"
              value={cantidad}
              aria-label="Cantidad"
              onChange={(event) => setCantidad(positiveNumber(event.target.value))}
            />
          </label>
        </div>

        <div className={s.actionRow}>
          <button type="button" className={s.primaryButton} onClick={calculate}>
            <Play size={16} />
            Calcular fabricación
          </button>
          {feedback ? <span className={s.feedbackText}>{feedback}</span> : null}
        </div>

        {missingCommercialLengths ? (
          <p className={s.labSoftHint}>
            Barras no disponibles · agrega largos comerciales si quieres calcularlas.
          </p>
        ) : null}
      </section>

      {actual && expected ? (
        <section className={`${s.editorSection} ${s.labResultHero}`}>
          <div className={s.sectionHeading}>
            <div>
              <span>Resultado</span>
              <h2>Compara con tu taller</h2>
            </div>
            <p>
              {anchoMm.toLocaleString("es-CL")} × {altoMm.toLocaleString("es-CL")} mm
              {cantidad > 1 ? ` · ${cantidad} unidades` : ""}
            </p>
          </div>

          <div className={s.comparisonTableWrap}>
            <table className={`${s.comparisonTable} ${s.comparisonTableCompact}`}>
              <thead>
                <tr>
                  <th>Función</th>
                  <th>Ventora calculó</th>
                  <th>En mi taller uso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {actual.perfiles.map((row, index) => {
                  const expectedRow = expected.perfiles[index];
                  const lengthDifference =
                    (expectedRow?.medidaMm ?? row.medidaMm) - row.medidaMm;
                  const quantityDifference =
                    (expectedRow?.cantidadPiezas ?? row.cantidadPiezas) -
                    row.cantidadPiezas;
                  const matches =
                    lengthDifference === 0 && quantityDifference === 0;

                  return (
                    <tr
                      key={row.componenteId}
                      data-match={matches ? "true" : "false"}
                    >
                      <td>
                        <strong>{row.funcion}</strong>
                      </td>
                      <td>
                        {row.medidaMm.toLocaleString("es-CL")} mm × {row.cantidadPiezas}
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
                                  perfiles: current.perfiles.map(
                                    (entry, entryIndex) =>
                                      entryIndex === index
                                        ? {
                                            ...entry,
                                            medidaMm: positiveNumber(
                                              event.target.value
                                            ),
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
                          <span>mm ×</span>
                          <input
                            aria-label={`Cantidad esperada ${row.funcion}`}
                            type="number"
                            min="1"
                            value={
                              expectedRow?.cantidadPiezas ?? row.cantidadPiezas
                            }
                            onChange={(event) =>
                              setExpected((current) => {
                                if (!current) return current;
                                return recalculateExpectedTotals({
                                  ...current,
                                  perfiles: current.perfiles.map(
                                    (entry, entryIndex) =>
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
                        {matches ? (
                          <span className={s.matchStatusQuiet} data-match="true">
                            <Check size={14} aria-hidden="true" />
                            Coincide
                          </span>
                        ) : (
                          <span className={s.matchStatus} data-match="false">
                            <AlertTriangle size={14} aria-hidden="true" />
                            Diferencia
                            {lengthDifference !== 0
                              ? ` de ${Math.abs(lengthDifference)} mm`
                              : ""}
                            {quantityDifference !== 0
                              ? ` · ${Math.abs(quantityDifference)} u.`
                              : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={s.labResultSummary} aria-label="Resumen del cálculo">
            <div>
              <span>Perfiles</span>
              <strong>{formatLinealMeters(actual.totalLinealMm)}</strong>
            </div>
            <div>
              <span>Vidrio</span>
              <strong>
                {glassPieces} {glassPieces === 1 ? "pieza" : "piezas"}
              </strong>
            </div>
            <div>
              <span>Accesorios</span>
              <strong>
                {accessoryUnits}{" "}
                {accessoryUnits === 1 ? "unidad" : "unidades"}
              </strong>
            </div>
          </div>

          {optionalPending.length > 0 ? (
            <div className={s.optionalPendingCard}>
              <div>
                <strong>Datos opcionales pendientes</strong>
                <ul>
                  {optionalPending.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {onConfigureLengths || onBackToRecipe ? (
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={onConfigureLengths ?? onBackToRecipe}
                >
                  <Pencil size={15} />
                  Revisar receta
                </button>
              ) : null}
            </div>
          ) : null}

          <section className={s.barPlanSection} aria-labelledby="bar-plan-heading">
            <div className={s.sectionHeading}>
              <div>
                <span>Opcional</span>
                <h2 id="bar-plan-heading">Barras y sobrantes</h2>
              </div>
            </div>
            {barPlan?.barras.length ? (
              <div className={s.barPlanList}>
                {barPlan.barras.map((bar) => (
                  <article
                    className={s.barRow}
                    key={`${bar.codigoPerfil}-${bar.indice}`}
                  >
                    <div className={s.barLabel}>
                      <strong>
                        Barra {bar.indice} · {bar.codigoPerfil}
                      </strong>
                      <span>
                        {bar.largoComercialMm.toLocaleString("es-CL")} mm
                      </span>
                    </div>
                    <div
                      className={s.barTrack}
                      aria-label={`Cortes de barra ${bar.indice}`}
                    >
                      {bar.cortes.map((cut, index) => (
                        <span
                          key={`${cut.componenteId}-${index}`}
                          style={{ flexGrow: cut.largoMm, flexBasis: 0 }}
                          title={`${cut.funcion}: ${cut.largoMm} mm`}
                        >
                          {cut.largoMm}
                        </span>
                      ))}
                      {bar.sobranteMm > 0 ? (
                        <i style={{ flexGrow: bar.sobranteMm, flexBasis: 0 }}>
                          Sobrante {bar.sobranteMm} mm
                        </i>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={s.barEmptyCard}>
                <p>Agrega los largos comerciales para obtener la distribución de barras.</p>
                {onConfigureLengths || onBackToRecipe ? (
                  <button
                    type="button"
                    className={s.secondaryButton}
                    onClick={onConfigureLengths ?? onBackToRecipe}
                  >
                    <Ruler size={15} />
                    Configurar largos
                  </button>
                ) : null}
              </div>
            )}
          </section>

          {allMatch ? (
            <div className={s.labReadyCard}>
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <strong>Todo coincide con tu fabricación</strong>
                <p>Esta receta está lista para usar.</p>
              </div>
            </div>
          ) : (
            <div className={s.labDiffCard}>
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>Hay diferencias con tu taller</strong>
                <p>
                  Ajusta los valores esperados o vuelve a la receta para corregir
                  medidas y ajustes.
                </p>
              </div>
              {onBackToRecipe ? (
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={onBackToRecipe}
                >
                  <Pencil size={15} />
                  Corregir receta
                </button>
              ) : null}
            </div>
          )}
        </section>
      ) : canActivateFromSaved ? (
        <section className={`${s.editorSection} ${s.labReadyCard}`}>
          <CheckCircle2 size={22} aria-hidden="true" />
          <div>
            <strong>Todo coincide con tu fabricación</strong>
            <p>Esta receta está lista para usar.</p>
          </div>
        </section>
      ) : null}

      <div className={s.guidedFooter}>
        {onBackToRecipe ? (
          <button
            type="button"
            className={s.secondaryButton}
            onClick={onBackToRecipe}
          >
            <ArrowLeft size={16} />
            Volver a receta
          </button>
        ) : (
          <span />
        )}
        {onActivate ? (
          <button
            type="button"
            className={s.validateButton}
            disabled={!readyToActivate || isSaving || isActivating}
            onClick={() => void handleActivate()}
          >
            <CheckCircle2 size={17} />
            Activar receta
          </button>
        ) : null}
      </div>

      {tests.length > 0 ? (
        <details className={s.labSavedCases}>
          <summary>
            Casos guardados <span>{tests.length}</span>
          </summary>
          <div className={s.testRows}>
            {tests.map((test) => (
              <div key={test.id} className={s.testRow}>
                <div>
                  <strong>{test.name}</strong>
                  <span>
                    {test.input.anchoTotalMm} × {test.input.altoTotalMm} mm
                  </span>
                </div>
                <span
                  className={s.matchStatusQuiet}
                  data-match={test.passed ? "true" : "false"}
                >
                  {test.passed ? (
                    <>
                      <Check size={14} /> Coincide
                    </>
                  ) : (
                    "Sin aprobar"
                  )}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
