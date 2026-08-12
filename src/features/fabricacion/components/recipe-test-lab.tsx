"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Pencil,
  Play,
  Plus,
  Ruler,
  Trash2,
} from "lucide-react";

import { FabricacionPerfilTirasVisual } from "@/features/fabricacion/components/fabricacion-barra-corte";
import { calcularPautaBarrasMultiMedida } from "@/features/fabricacion/services/fabricacion-pauta-multi-medida.service";
import {
  formatMetersFromMm,
  summarizeTirasPorPerfil,
  VENTORA_LARGO_COMERCIAL_PRESET_MM,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { tieneLargosComercialesPendientes } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { countProfilesWithoutLength } from "@/features/fabricacion/services/taller-perfiles.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeTestRecord,
} from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionBarraPauta } from "@/features/fabricacion/types/fabricacion-snapshot";

import s from "./fabricacion-workspace.module.css";

function groupBarrasByPerfil(barras: FabricacionBarraPauta[]) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      largoComercialMm: number;
      barras: FabricacionBarraPauta[];
    }
  >();
  for (const bar of barras) {
    const key = `${bar.codigoPerfil}::${bar.largoComercialMm}`;
    const current = groups.get(key);
    if (current) {
      current.barras.push(bar);
      continue;
    }
    groups.set(key, {
      key,
      label: bar.nombrePerfil.trim() || bar.codigoPerfil,
      largoComercialMm: bar.largoComercialMm,
      barras: [bar],
    });
  }
  return Array.from(groups.values());
}

type MeasureRow = {
  id: string;
  anchoMm: number;
  altoMm: number;
  cantidad: number;
};

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

function createMeasureRow(partial?: Partial<MeasureRow>): MeasureRow {
  return {
    id: `m-${Math.random().toString(36).slice(2, 9)}`,
    anchoMm: 1200,
    altoMm: 1000,
    cantidad: 1,
    ...partial,
  };
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
  onApplyPresetLengths?: () => Promise<void> | void;
  onActivate?: () => Promise<void> | void;
};

export function RecipeTestLab({
  recipe,
  isSaving,
  isActivated = false,
  canActivateFromSaved = false,
  desktopActiveStep,
  onSaveTest,
  onBackToRecipe,
  onConfigureLengths,
  onApplyPresetLengths,
  onActivate,
}: Props) {
  const identity = recipe.definition.identidad;
  const [name, setName] = useState("");
  const [measures, setMeasures] = useState<MeasureRow[]>(() => [
    createMeasureRow(),
  ]);
  const [actualPrimary, setActualPrimary] =
    useState<FabricacionResultadoCubicacion | null>(null);
  const [expected, setExpected] = useState<FabricacionResultadoCubicacion | null>(
    null
  );
  const [consolidado, setConsolidado] =
    useState<FabricacionResultadoCubicacion | null>(null);
  const [barPlan, setBarPlan] = useState<ReturnType<
    typeof calcularPautaBarrasMultiMedida
  >["pautaBarras"] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [showPauta, setShowPauta] = useState(false);
  const [correctingIds, setCorrectingIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isApplyingLengths, setIsApplyingLengths] = useState(false);

  const missingCommercialLengths = tieneLargosComercialesPendientes(
    recipe.definition
  );
  const profilesWithoutLength = countProfilesWithoutLength(recipe.definition);
  const presetMeters = (VENTORA_LARGO_COMERCIAL_PRESET_MM / 1000).toLocaleString(
    "es-CL",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  const tirasSummary = useMemo(
    () => (barPlan?.barras.length ? summarizeTirasPorPerfil(barPlan.barras) : []),
    [barPlan]
  );
  const barrasPorPerfil = useMemo(
    () => (barPlan?.barras.length ? groupBarrasByPerfil(barPlan.barras) : []),
    [barPlan]
  );
  const totalTiras = tirasSummary.reduce((sum, group) => sum + group.tiras, 0);
  const totalCortes = barPlan?.barras.reduce(
    (sum, bar) => sum + bar.cortes.length,
    0
  ) ?? 0;
  const dominantLengthMm =
    tirasSummary[0]?.largoComercialMm ?? VENTORA_LARGO_COMERCIAL_PRESET_MM;

  const allMatch =
    actualPrimary != null &&
    expected != null &&
    actualPrimary.calculable &&
    profilesAllMatch(actualPrimary, expected);
  const readyToActivate =
    (allMatch && Boolean(actualPrimary)) ||
    (canActivateFromSaved && actualPrimary == null) ||
    (canActivateFromSaved && allMatch);

  const primaryMeasure = measures[0] ?? createMeasureRow();
  const primaryInput = useMemo<FabricacionEntradaCalculo>(
    () => ({
      anchoTotalMm: primaryMeasure.anchoMm,
      altoTotalMm: primaryMeasure.altoMm,
      cantidad: primaryMeasure.cantidad,
      hojas: identity.hojas,
      modulos: identity.modulos,
      variante: identity.variante,
    }),
    [
      primaryMeasure.anchoMm,
      primaryMeasure.altoMm,
      primaryMeasure.cantidad,
      identity.hojas,
      identity.modulos,
      identity.variante,
    ]
  );

  const calculate = () => {
    if (missingCommercialLengths) {
      setFeedback(null);
      setActualPrimary(null);
      setExpected(null);
      setConsolidado(null);
      setBarPlan(null);
      return;
    }

    const validMeasures = measures.filter(
      (row) => row.anchoMm > 0 && row.altoMm > 0 && row.cantidad > 0
    );
    if (validMeasures.length === 0) {
      setFeedback("Agrega al menos una medida válida.");
      return;
    }

    const result = calcularPautaBarrasMultiMedida({
      receta: recipe.definition,
      medidas: validMeasures.map((row) => ({
        anchoTotalMm: row.anchoMm,
        altoTotalMm: row.altoMm,
        cantidad: row.cantidad,
      })),
    });

    const primary = result.resultadosPorFila[0] ?? null;
    setActualPrimary(primary);
    setExpected(primary ? cloneResult(primary) : null);
    setConsolidado(result.consolidado);
    setBarPlan(result.pautaBarras);
    setCorrectingIds(new Set());
    setFeedback(
      result.consolidado.calculable
        ? null
        : "No se pudo calcular con estas medidas. Revisa la configuración de fabricación."
    );
  };

  const handleActivate = async () => {
    if (!onActivate || !readyToActivate) return;
    setIsActivating(true);
    try {
      if (actualPrimary && expected && allMatch) {
        await onSaveTest({
          name:
            name.trim() ||
            `Prueba ${primaryMeasure.anchoMm}×${primaryMeasure.altoMm}`,
          input: primaryInput,
          expectedOutput: expected,
          isRequired: true,
        });
      }
      await onActivate();
    } finally {
      setIsActivating(false);
    }
  };

  const handleApplyPresetLengths = async () => {
    if (!onApplyPresetLengths) {
      onConfigureLengths?.();
      return;
    }
    setIsApplyingLengths(true);
    try {
      await onApplyPresetLengths();
      setFeedback(null);
    } finally {
      setIsApplyingLengths(false);
    }
  };

  if (isActivated || recipe.status === "validated") {
    return (
      <div
        className={s.labFlow}
        data-guided-desktop={desktopActiveStep ? "true" : "false"}
      >
        <section className={`${s.editorSection} ${s.activateSuccessCard} ${s.fabLabSuccess}`}>
          <div className={s.activateSuccessIcon} aria-hidden="true">
            <CheckCircle2 size={28} />
          </div>
          <h2>Fabricación lista</h2>
          <p>
            Cuando cotices una {recipe.lineName || "línea"}{" "}
            {identity.tipologia.replaceAll("_", " ")}
            {identity.hojas > 1 ? ` de ${identity.hojas} hojas` : ""}, Ventora
            calculará automáticamente sus perfiles, tiras y pauta.
          </p>
          {onBackToRecipe ? (
            <button
              type="button"
              className={s.primaryButton}
              onClick={onBackToRecipe}
            >
              <ArrowLeft size={16} />
              Volver a la línea
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div
      className={`${s.labFlow} ${s.fabLabFlow}`}
      data-guided-desktop={desktopActiveStep ? "true" : "false"}
    >
      <section className={`${s.editorSection} ${s.fabLabIntro}`}>
        <header className={s.fabSheetHeader}>
          <h2>Prueba tu fabricación</h2>
          <p>
            Ingresa una o varias medidas reales. Ventora te dirá qué necesitas
            comprar y cómo cortar.
          </p>
        </header>

        <label className={s.fabLabOptionalName}>
          <span>Nombre del caso (opcional)</span>
          <input
            value={name}
            placeholder="Ej. Ventanas living + cocina"
            onChange={(event) => setName(event.target.value)}
            aria-label="Nombre del caso"
          />
        </label>

        <div className={s.fabMeasureBoard}>
          <div className={s.fabMeasureHead}>
            <span>Ancho</span>
            <span>Alto</span>
            <span>Cantidad</span>
            <span aria-hidden="true" />
          </div>
          {measures.map((row) => (
            <div key={row.id} className={s.fabMeasureRow}>
              <label>
                <span className={s.srOnly}>Ancho mm</span>
                <input
                  type="number"
                  min={1}
                  aria-label="Ancho mm"
                  value={row.anchoMm}
                  onChange={(event) =>
                    setMeasures((current) =>
                      current.map((entry) =>
                        entry.id === row.id
                          ? {
                              ...entry,
                              anchoMm: positiveNumber(event.target.value),
                            }
                          : entry
                      )
                    )
                  }
                />
                <em>mm</em>
              </label>
              <label>
                <span className={s.srOnly}>Alto mm</span>
                <input
                  type="number"
                  min={1}
                  aria-label="Alto mm"
                  value={row.altoMm}
                  onChange={(event) =>
                    setMeasures((current) =>
                      current.map((entry) =>
                        entry.id === row.id
                          ? {
                              ...entry,
                              altoMm: positiveNumber(event.target.value),
                            }
                          : entry
                      )
                    )
                  }
                />
                <em>mm</em>
              </label>
              <label>
                <span className={s.srOnly}>Cantidad</span>
                <input
                  type="number"
                  min={1}
                  aria-label="Cantidad"
                  value={row.cantidad}
                  onChange={(event) =>
                    setMeasures((current) =>
                      current.map((entry) =>
                        entry.id === row.id
                          ? {
                              ...entry,
                              cantidad: positiveNumber(event.target.value),
                            }
                          : entry
                      )
                    )
                  }
                />
              </label>
              {measures.length > 1 ? (
                <button
                  type="button"
                  className={s.dangerTextButton}
                  aria-label="Quitar medida"
                  onClick={() =>
                    setMeasures((current) =>
                      current.filter((entry) => entry.id !== row.id)
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>

        <div className={s.fabLabActions}>
          <button
            type="button"
            className={s.fabGhostAction}
            onClick={() =>
              setMeasures((current) => [...current, createMeasureRow()])
            }
          >
            <Plus size={16} />
            Otra medida
          </button>
          <button
            type="button"
            className={`${s.primaryButton} ${s.fabPrimaryCta}`}
            onClick={calculate}
            disabled={missingCommercialLengths}
          >
            <Play size={16} />
            Calcular materiales
          </button>
          {feedback ? <span className={s.feedbackText}>{feedback}</span> : null}
        </div>

        {missingCommercialLengths ? (
          <div className={s.fabLengthGate} role="status">
            <strong>Faltan largos comerciales para calcular las tiras</strong>
            <p>
              Ventora ya sabe los cortes necesarios, pero necesita el largo
              comercial de {profilesWithoutLength}{" "}
              {profilesWithoutLength === 1 ? "perfil" : "perfiles"} para armar
              la pauta sugerida.
            </p>
            <div className={s.fabLabActions}>
              <button
                type="button"
                className={`${s.primaryButton} ${s.fabPrimaryCta}`}
                disabled={isApplyingLengths || isSaving}
                onClick={() => void handleApplyPresetLengths()}
              >
                <Ruler size={16} />
                Usar {presetMeters} m en todos
              </button>
              {onConfigureLengths || onBackToRecipe ? (
                <button
                  type="button"
                  className={s.fabGhostAction}
                  onClick={onConfigureLengths ?? onBackToRecipe}
                >
                  Configurar individualmente
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {actualPrimary && expected && consolidado && !missingCommercialLengths ? (
        <section
          className={`${s.editorSection} ${s.labResultHero} ${s.fabLabResult}`}
          data-reveal="true"
        >
          <header className={s.fabResultHero}>
            <h2>
              {totalTiras > 0 ? (
                <>
                  Necesitas {totalTiras}{" "}
                  {totalTiras === 1 ? "tira" : "tiras"} de{" "}
                  {formatMetersFromMm(dominantLengthMm)}
                </>
              ) : (
                <>Para fabricar esto necesitas</>
              )}
            </h2>
            <ul className={s.fabResultStats} aria-label="Resumen del cálculo">
              <li>
                <strong>{formatMetersFromMm(barPlan?.totalUsadoMm ?? consolidado.totalLinealMm)}</strong>
                <span>utilizados</span>
              </li>
              <li>
                <strong>{formatMetersFromMm(barPlan?.totalSobranteMm ?? 0)}</strong>
                <span>sobrantes</span>
              </li>
              <li>
                <strong>{tirasSummary.length || consolidado.perfiles.length}</strong>
                <span>
                  {(tirasSummary.length || consolidado.perfiles.length) === 1
                    ? "perfil"
                    : "perfiles"}
                </span>
              </li>
              <li>
                <strong>{totalCortes}</strong>
                <span>{totalCortes === 1 ? "corte" : "cortes"}</span>
              </li>
              <li>
                <strong>
                  {consolidado.accesorios.reduce(
                    (sum, item) => sum + item.cantidadUnidades,
                    0
                  )}
                </strong>
                <span>accesorios</span>
              </li>
            </ul>
          </header>

          <div className={s.fabVisualCutSection}>
            <h3>Tiras y cortes</h3>
            {barrasPorPerfil.length > 0 ? (
              <div className={s.fabVisualCutGroups}>
                {barrasPorPerfil.map((group, groupIndex) => (
                  <FabricacionPerfilTirasVisual
                    key={group.key}
                    label={group.label}
                    tiras={group.barras.length}
                    largoComercialMm={group.largoComercialMm}
                    barras={group.barras}
                    startIndex={groupIndex * 3}
                  />
                ))}
              </div>
            ) : (
              <div className={s.barEmptyCard}>
                <p>
                  No hay tiras calculadas. Revisa los largos comerciales en la
                  configuración de fabricación.
                </p>
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
          </div>

          <div className={s.fabMaterialsGrid}>
            <div className={s.fabLabProfilesBlock}>
              <h3>Perfiles</h3>
              {tirasSummary.length > 0 ? (
                <ul className={s.fabMaterialList}>
                  {tirasSummary.map((group) => (
                    <li key={group.key}>
                      <strong>{group.label}</strong>
                      <span>
                        {group.tiras} {group.tiras === 1 ? "tira" : "tiras"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.fabLabSecondaryMeters}>Sin tiras calculadas</p>
              )}
            </div>

            {consolidado.accesorios.length > 0 ? (
              <div className={s.fabLabAccessoriesBlock}>
                <h3>Accesorios</h3>
                <ul className={s.fabMaterialList}>
                  {consolidado.accesorios.map((item) => (
                    <li key={item.accesorioId}>
                      <strong>
                        {item.cantidadUnidades}{" "}
                        {item.nombre.trim().toLocaleLowerCase("es")}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {consolidado.vidrios.length > 0 ? (
              <div className={s.fabLabAccessoriesBlock}>
                <h3>Vidrio</h3>
                <ul className={s.fabMaterialList}>
                  {consolidado.vidrios.map((glass) => (
                    <li key={glass.vidrioId}>
                      <strong>
                        {glass.cantidadPiezas}{" "}
                        {glass.cantidadPiezas === 1 ? "pieza" : "piezas"}
                      </strong>
                      <span>
                        {glass.anchoMm.toLocaleString("es-CL")} ×{" "}
                        {glass.altoMm.toLocaleString("es-CL")} mm
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <details
            className={`${s.pautaSugeridaDisclosure} ${s.fabPautaDetails}`}
            open={showPauta}
            onToggle={(event) => setShowPauta(event.currentTarget.open)}
          >
            <summary>Ver pauta sugerida (detalle)</summary>
            <div className={s.fabPautaDetailBody}>
              {barPlan?.barras.length ? (
                <ul className={s.fabPautaCutList}>
                  {barPlan.barras.map((bar) => (
                    <li key={`${bar.codigoPerfil}-${bar.indice}`}>
                      <strong>
                        {bar.nombrePerfil || bar.codigoPerfil} · Tira{" "}
                        {bar.indice} ·{" "}
                        {bar.largoComercialMm.toLocaleString("es-CL")} mm
                      </strong>
                      <span>
                        {bar.cortes
                          .map((cut) => `${cut.largoMm.toLocaleString("es-CL")} mm`)
                          .join(" · ")}
                        {bar.sobranteMm > 0
                          ? ` · Sobrante ${bar.sobranteMm.toLocaleString("es-CL")} mm`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.labSoftHint}>
                  Sin pauta sugerida hasta configurar largos y corte.
                </p>
              )}
            </div>
          </details>

          <div className={s.fabCompareBlock}>
            <header className={s.fabSheetHeader}>
              <h2>¿Coincide con tu taller?</h2>
              <p>
                Primera medida: {primaryMeasure.anchoMm.toLocaleString("es-CL")}{" "}
                × {primaryMeasure.altoMm.toLocaleString("es-CL")} mm
                {primaryMeasure.cantidad > 1
                  ? ` · ${primaryMeasure.cantidad} unidades`
                  : ""}
              </p>
            </header>

            <ul className={s.fabCompareList}>
              {actualPrimary.perfiles.map((row, index) => {
                const expectedRow = expected.perfiles[index];
                const lengthDifference =
                  (expectedRow?.medidaMm ?? row.medidaMm) - row.medidaMm;
                const quantityDifference =
                  (expectedRow?.cantidadPiezas ?? row.cantidadPiezas) -
                  row.cantidadPiezas;
                const matches =
                  lengthDifference === 0 && quantityDifference === 0;
                const isCorrecting = correctingIds.has(row.componenteId);

                return (
                  <li key={row.componenteId} className={s.fabCompareRow}>
                    <div className={s.fabCompareMain}>
                      <strong>{row.funcion}</strong>
                      <span>
                        Ventora: {row.medidaMm.toLocaleString("es-CL")} mm ×{" "}
                        {row.cantidadPiezas}
                      </span>
                    </div>
                    {!isCorrecting ? (
                      <div className={s.fabCompareActions}>
                        {matches ? (
                          <span
                            className={s.matchStatusQuiet}
                            data-match="true"
                          >
                            <Check size={14} aria-hidden="true" />
                            Coincide
                          </span>
                        ) : (
                          <span className={s.matchStatus} data-match="false">
                            <AlertTriangle size={14} aria-hidden="true" />
                            Diferencia
                          </span>
                        )}
                        <button
                          type="button"
                          className={s.fabSheetEdit}
                          onClick={() =>
                            setCorrectingIds((current) => {
                              const next = new Set(current);
                              next.add(row.componenteId);
                              return next;
                            })
                          }
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Corregir
                        </button>
                      </div>
                    ) : (
                      <div className={s.fabCompareCorrect}>
                        <span>En mi taller uso:</span>
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
                                              positiveNumber(
                                                event.target.value
                                              ) * entry.cantidadPiezas,
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
                                              positiveNumber(
                                                event.target.value
                                              ),
                                          }
                                        : entry
                                  ),
                                });
                              })
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className={s.secondaryButton}
                          onClick={() =>
                            setCorrectingIds((current) => {
                              const next = new Set(current);
                              next.delete(row.componenteId);
                              return next;
                            })
                          }
                        >
                          Listo
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {allMatch ? (
            <div className={s.fabFinalSuccess}>
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <strong>Todo coincide con tu fabricación</strong>
                <p>
                  Esta configuración ya puede usarse automáticamente cuando
                  cotices esta línea.
                </p>
              </div>
              {onActivate ? (
                <button
                  type="button"
                  className={`${s.primaryButton} ${s.fabPrimaryCta} ${s.fabFinalCta}`}
                  disabled={!readyToActivate || isSaving || isActivating}
                  onClick={() => void handleActivate()}
                >
                  <CheckCircle2 size={18} />
                  {isActivating
                    ? "Guardando…"
                    : "Dejar lista para cotizar"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className={s.labDiffCard}>
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>Hay diferencias con tu taller</strong>
                <p>
                  Usa Corregir en cada pieza o vuelve a la fabricación para
                  ajustar la medida de corte.
                </p>
              </div>
              {onBackToRecipe ? (
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={onBackToRecipe}
                >
                  <ArrowLeft size={15} />
                  Volver a fabricación
                </button>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
