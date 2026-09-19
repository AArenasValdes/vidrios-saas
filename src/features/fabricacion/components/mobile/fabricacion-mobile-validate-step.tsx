"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Pencil,
  Play,
} from "lucide-react";

import { FabricacionPerfilTirasVisual } from "@/features/fabricacion/components/fabricacion-barra-corte";
import { FabricacionTipologiaPreview } from "@/features/fabricacion/components/fabricacion-tipologia-preview";
import { calcularPautaBarrasMultiMedida } from "@/features/fabricacion/services/fabricacion-pauta-multi-medida.service";
import {
  buildFabricationRecipeSummary,
  formatMetersFromMm,
  resolveTiraEstandarRecetaLabel,
  summarizeTirasPorPerfil,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionBarraPauta } from "@/features/fabricacion/types/fabricacion-snapshot";

import s from "./fabricacion-mobile.module.css";

type MeasureRow = {
  id: string;
  anchoMm: number;
  altoMm: number;
  cantidad: number;
};

type ResultTab = "resumen" | "pauta" | "verificacion";

type Props = {
  recipe: FabricationRecipeRecord;
  isSaving: boolean;
  canActivateFromSaved?: boolean;
  onBackToRecipe?: () => void;
  onCorrectProfile?: (profileId: string) => void;
  onSaveDraft?: () => Promise<void> | void;
  onActivate?: () => Promise<void> | void;
  onSaveTest: (input: {
    name: string;
    input: FabricacionEntradaCalculo;
    expectedOutput: FabricacionResultadoCubicacion;
    isRequired: boolean;
  }) => Promise<void>;
};

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
      label: bar.nombrePerfil.trim() || "Perfil",
      largoComercialMm: bar.largoComercialMm,
      barras: [bar],
    });
  }
  return Array.from(groups.values());
}

function cloneResult(result: FabricacionResultadoCubicacion) {
  return JSON.parse(JSON.stringify(result)) as FabricacionResultadoCubicacion;
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

function formatTypologyLabel(tipologia: string) {
  return tipologia
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const PAUTA_PREVIEW_COUNT = 3;

export function FabricacionMobileValidateStep({
  recipe,
  isSaving,
  canActivateFromSaved = false,
  onBackToRecipe,
  onCorrectProfile,
  onSaveDraft,
  onActivate,
  onSaveTest,
}: Props) {
  const identity = recipe.definition.identidad;
  const summary = buildFabricationRecipeSummary(recipe.definition);
  const [name, setName] = useState("");
  const [measures, setMeasures] = useState<MeasureRow[]>(() => [createMeasureRow()]);
  const [formExpanded, setFormExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<ResultTab>("resumen");
  const [showAllPauta, setShowAllPauta] = useState(false);
  const [showOkProfiles, setShowOkProfiles] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [actualPrimary, setActualPrimary] =
    useState<FabricacionResultadoCubicacion | null>(null);
  const [expected, setExpected] = useState<FabricacionResultadoCubicacion | null>(null);
  const [consolidado, setConsolidado] = useState<FabricacionResultadoCubicacion | null>(
    null
  );
  const [barPlan, setBarPlan] = useState<ReturnType<
    typeof calcularPautaBarrasMultiMedida
  >["pautaBarras"] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [calculatedFingerprint, setCalculatedFingerprint] = useState<string | null>(
    null
  );

  const tiraEstandar = useMemo(
    () => resolveTiraEstandarRecetaLabel(recipe.definition),
    [recipe.definition]
  );
  const tiraLabel = `${(tiraEstandar.largoMm / 1000).toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`;

  const tirasSummary = useMemo(
    () => (barPlan?.barras.length ? summarizeTirasPorPerfil(barPlan.barras) : []),
    [barPlan]
  );
  const barrasPorPerfil = useMemo(
    () => (barPlan?.barras.length ? groupBarrasByPerfil(barPlan.barras) : []),
    [barPlan]
  );
  const totalTiras = tirasSummary.reduce((sum, group) => sum + group.tiras, 0);
  const totalCortes =
    barPlan?.barras.reduce((sum, bar) => sum + bar.cortes.length, 0) ?? 0;
  const dominantLengthMm =
    tirasSummary[0]?.largoComercialMm ?? tiraEstandar.largoMm;
  const accessoryTotal = consolidado
    ? consolidado.accesorios.reduce((sum, item) => sum + item.cantidadUnidades, 0)
    : 0;

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

  const recipeFingerprint = useMemo(
    () =>
      recipe.definition.perfiles
        .map(
          (profile) =>
            `${profile.id}:${profile.reglaMedida.base}:${profile.reglaMedida.ajusteMm ?? ""}:${profile.reglaCantidad.cantidad}`
        )
        .join("|"),
    [recipe.definition.perfiles]
  );

  const hasResults = Boolean(actualPrimary && expected && consolidado);
  const allMatch =
    actualPrimary != null &&
    expected != null &&
    actualPrimary.calculable &&
    profilesAllMatch(actualPrimary, expected);

  const profileRows = useMemo(() => {
    if (!actualPrimary || !expected) return [];
    return actualPrimary.perfiles.map((row, index) => {
      const expectedRow = expected.perfiles[index];
      const matches =
        (expectedRow?.medidaMm ?? row.medidaMm) === row.medidaMm &&
        (expectedRow?.cantidadPiezas ?? row.cantidadPiezas) === row.cantidadPiezas;
      return { row, expectedRow, matches };
    });
  }, [actualPrimary, expected]);

  const mismatchCount = profileRows.filter((entry) => !entry.matches).length;
  const readyToActivate =
    (allMatch && Boolean(actualPrimary)) ||
    (canActivateFromSaved && !hasResults) ||
    (canActivateFromSaved && allMatch);

  const recipeChangedSinceCalc =
    hasResults &&
    calculatedFingerprint != null &&
    calculatedFingerprint !== recipeFingerprint;

  const visiblePautaGroups = showAllPauta
    ? barrasPorPerfil
    : barrasPorPerfil.slice(0, PAUTA_PREVIEW_COUNT);
  const hiddenPautaCount = Math.max(0, barrasPorPerfil.length - PAUTA_PREVIEW_COUNT);

  const calculate = () => {
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
    setCalculatedFingerprint(recipeFingerprint);
    setFormExpanded(false);
    setActiveTab("resumen");
    setShowAllPauta(false);
    setShowOkProfiles(false);
    setFeedback(
      result.consolidado.calculable
        ? null
        : "No se pudo calcular con estas medidas. Revisa la configuración."
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

  const measureSummary = `${primaryMeasure.anchoMm.toLocaleString("es-CL")} × ${primaryMeasure.altoMm.toLocaleString("es-CL")} mm · ${primaryMeasure.cantidad} u.`;

  return (
    <div className={s.validateStep}>
      <div className={s.validateScroll}>
        <aside className={s.validateIdentityCard}>
          <FabricacionTipologiaPreview
            tipologia={identity.tipologia}
            hojas={identity.hojas}
            size="sm"
          />
          <div>
            <strong>
              {recipe.lineName || "Línea"} · {formatTypologyLabel(identity.tipologia)}
              {identity.hojas > 1 ? ` ${identity.hojas}H` : ""}
            </strong>
            <span>
              {summary.activeRuleCount} reglas · {summary.activePieceCount} cortes ·{" "}
              {summary.activeAccessoryCount} acc.
            </span>
          </div>
          {onBackToRecipe ? (
            <button type="button" className={s.validateIdentityEdit} onClick={onBackToRecipe}>
              Editar
            </button>
          ) : null}
        </aside>

        {recipe.status === "validated" || recipe.status === "testing" ? (
          <p className={s.validateActiveHint}>
            Fabricación activa. Prueba medidas y ajusta descuentos en Perfiles si hace falta.
          </p>
        ) : null}

        {hasResults && !formExpanded ? (
          <button
            type="button"
            className={s.validateMeasureSummary}
            onClick={() => setFormExpanded(true)}
          >
            <div>
              <span>Caso de prueba</span>
              <strong>{name.trim() || measureSummary}</strong>
            </div>
            <Pencil size={16} aria-hidden />
          </button>
        ) : (
          <section className={s.validateFormCard}>
            <h2>Medidas de prueba</h2>
            <label className={s.validateField}>
              <span>Nombre del caso (opcional)</span>
              <input
                value={name}
                placeholder="Ej. Ventana living"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className={s.validateMeasureGrid}>
              <label className={s.validateField}>
                <span>Ancho (mm)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={primaryMeasure.anchoMm}
                  onChange={(event) =>
                    setMeasures((current) =>
                      current.map((entry, index) =>
                        index === 0
                          ? {
                              ...entry,
                              anchoMm: positiveNumber(event.target.value),
                            }
                          : entry
                      )
                    )
                  }
                />
              </label>
              <label className={s.validateField}>
                <span>Alto (mm)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={primaryMeasure.altoMm}
                  onChange={(event) =>
                    setMeasures((current) =>
                      current.map((entry, index) =>
                        index === 0
                          ? {
                              ...entry,
                              altoMm: positiveNumber(event.target.value),
                            }
                          : entry
                      )
                    )
                  }
                />
              </label>
              <label className={s.validateField}>
                <span>Cantidad</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={primaryMeasure.cantidad}
                  onChange={(event) =>
                    setMeasures((current) =>
                      current.map((entry, index) =>
                        index === 0
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
            </div>
            <p className={s.validateTiraHint}>Tira estándar: {tiraLabel}</p>
          </section>
        )}

        {feedback ? <div className={s.errorBand}>{feedback}</div> : null}
        {recipeChangedSinceCalc ? (
          <div className={s.validateRecalcHint} role="status">
            Cambiaste una regla. Vuelve a calcular para ver el resultado actualizado.
          </div>
        ) : null}

        {hasResults && consolidado && actualPrimary && expected ? (
          <>
            <div
              className={s.validateSegmented}
              role="tablist"
              aria-label="Resultado de la prueba"
            >
              {(
                [
                  ["resumen", "Resumen"],
                  ["pauta", "Pauta"],
                  ["verificacion", "Verificación"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  className={s.validateSegment}
                  data-active={activeTab === id ? "true" : "false"}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "resumen" ? (
              <section className={s.validatePanel} role="tabpanel">
                <div
                  className={s.validateStatusCard}
                  data-tone={allMatch ? "ok" : mismatchCount > 0 ? "warn" : "neutral"}
                >
                  {allMatch ? (
                    <>
                      <CheckCircle2 size={22} aria-hidden />
                      <div>
                        <strong>Todo coincide con tu fabricación</strong>
                        <p>Listo para guardar y activar.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={22} aria-hidden />
                      <div>
                        <strong>
                          Hay {mismatchCount}{" "}
                          {mismatchCount === 1 ? "perfil por corregir" : "perfiles por corregir"}
                        </strong>
                        <p>Revisa Verificación o ajusta descuentos en Perfiles.</p>
                      </div>
                    </>
                  )}
                </div>

                <div className={s.validateHeroMetric}>
                  <span>Material principal</span>
                  <strong>
                    {totalTiras > 0
                      ? `Necesitas ${totalTiras} ${totalTiras === 1 ? "tira" : "tiras"} de ${formatMetersFromMm(dominantLengthMm)}`
                      : "Sin tiras calculadas"}
                  </strong>
                </div>

                <dl className={s.validateStatsGrid}>
                  <div>
                    <dt>Utilizados</dt>
                    <dd>
                      {formatMetersFromMm(barPlan?.totalUsadoMm ?? consolidado.totalLinealMm)}
                    </dd>
                  </div>
                  <div>
                    <dt>Sobrantes</dt>
                    <dd>{formatMetersFromMm(barPlan?.totalSobranteMm ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Reglas</dt>
                    <dd>{tirasSummary.length || consolidado.perfiles.length}</dd>
                  </div>
                  <div>
                    <dt>Cortes</dt>
                    <dd>{totalCortes}</dd>
                  </div>
                  <div>
                    <dt>Accesorios</dt>
                    <dd>{accessoryTotal}</dd>
                  </div>
                </dl>

                <details
                  className={s.validateMaterialsDisclosure}
                  open={materialsOpen}
                  onToggle={(event) => setMaterialsOpen(event.currentTarget.open)}
                >
                  <summary>Ver materiales completos</summary>
                  <div className={s.validateMaterialsBody}>
                    {tirasSummary.length > 0 ? (
                      <div>
                        <h4>Perfiles</h4>
                        <ul>
                          {tirasSummary.map((group) => (
                            <li key={group.key}>
                              <span>{group.label}</span>
                              <strong>
                                {group.tiras} {group.tiras === 1 ? "tira" : "tiras"}
                              </strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {consolidado.accesorios.length > 0 ? (
                      <div>
                        <h4>Accesorios</h4>
                        <ul>
                          {consolidado.accesorios.map((item) => (
                            <li key={item.accesorioId}>
                              <span>{item.nombre}</span>
                              <strong>{item.cantidadUnidades}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {consolidado.vidrios.length > 0 ? (
                      <div>
                        <h4>Vidrio</h4>
                        <ul>
                          {consolidado.vidrios.map((glass) => (
                            <li key={glass.vidrioId}>
                              <span>
                                {glass.anchoMm} × {glass.altoMm} mm
                              </span>
                              <strong>{glass.cantidadPiezas} pzas.</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </details>
              </section>
            ) : null}

            {activeTab === "pauta" ? (
              <section className={s.validatePanel} role="tabpanel">
                {visiblePautaGroups.length > 0 ? (
                  <div className={s.validatePautaList}>
                    {visiblePautaGroups.map((group, groupIndex) => (
                      <FabricacionPerfilTirasVisual
                        key={group.key}
                        label={group.label}
                        tiras={group.barras.length}
                        largoComercialMm={group.largoComercialMm}
                        barras={group.barras}
                        startIndex={groupIndex * 3}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <p className={s.emptyCopy}>
                    No hay pauta calculada. Revisa largos comerciales en Perfiles.
                  </p>
                )}
                {!showAllPauta && hiddenPautaCount > 0 ? (
                  <button
                    type="button"
                    className={s.secondaryButton}
                    onClick={() => setShowAllPauta(true)}
                  >
                    Ver más perfiles ({hiddenPautaCount})
                  </button>
                ) : null}
              </section>
            ) : null}

            {activeTab === "verificacion" ? (
              <section className={s.validatePanel} role="tabpanel">
                {allMatch ? (
                  <>
                    <div className={s.validateStatusCard} data-tone="ok">
                      <CheckCircle2 size={22} aria-hidden />
                      <div>
                        <strong>Todo coincide con tu fabricación</strong>
                        <p>No hay diferencias con la pauta Ventora.</p>
                      </div>
                    </div>
                    {!showOkProfiles ? (
                      <button
                        type="button"
                        className={s.secondaryButton}
                        onClick={() => setShowOkProfiles(true)}
                      >
                        Ver detalle
                      </button>
                    ) : (
                      <ul className={s.validateCheckList}>
                        {profileRows.map(({ row, matches }) => (
                          <li key={row.componenteId} data-match={matches ? "true" : "false"}>
                            <div>
                              <strong>{row.funcion}</strong>
                              <span>
                                {row.medidaMm.toLocaleString("es-CL")} mm × {row.cantidadPiezas}
                              </span>
                            </div>
                            <span className={s.validateMatchBadge} data-match="true">
                              <Check size={14} aria-hidden />
                              OK
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <>
                    <ul className={s.validateCheckList}>
                      {profileRows
                        .filter((entry) => !entry.matches)
                        .map(({ row }) => (
                          <li key={row.componenteId} data-match="false">
                            <div>
                              <strong>{row.funcion}</strong>
                              <span>
                                {row.medidaMm.toLocaleString("es-CL")} mm × {row.cantidadPiezas}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={s.validateCorrectButton}
                              onClick={() => onCorrectProfile?.(row.componenteId)}
                            >
                              Corregir
                            </button>
                          </li>
                        ))}
                    </ul>
                    {profileRows.some((entry) => entry.matches) ? (
                      <details className={s.validateOkCollapse}>
                        <summary>
                          Perfiles correctos ({profileRows.filter((e) => e.matches).length})
                        </summary>
                        <ul className={s.validateCheckList}>
                          {profileRows
                            .filter((entry) => entry.matches)
                            .map(({ row }) => (
                              <li key={row.componenteId} data-match="true">
                                <div>
                                  <strong>{row.funcion}</strong>
                                  <span>
                                    {row.medidaMm.toLocaleString("es-CL")} mm ×{" "}
                                    {row.cantidadPiezas}
                                  </span>
                                </div>
                                <span className={s.validateMatchBadge} data-match="true">
                                  <Check size={14} aria-hidden />
                                  OK
                                </span>
                              </li>
                            ))}
                        </ul>
                      </details>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      <footer className={s.validateFooter}>
        {!hasResults || formExpanded ? (
          <button
            type="button"
            className={s.primaryButton}
            onClick={calculate}
            disabled={isSaving}
          >
            <Play size={16} aria-hidden />
            Calcular prueba
          </button>
        ) : allMatch && onActivate ? (
          <>
            <button
              type="button"
              className={s.secondaryButton}
              disabled={isSaving}
              onClick={() => void onSaveDraft?.()}
            >
              Guardar borrador
            </button>
            <button
              type="button"
              className={s.primaryButton}
              disabled={!readyToActivate || isSaving || isActivating}
              onClick={() => void handleActivate()}
            >
              <CheckCircle2 size={16} aria-hidden />
              {isActivating ? "Guardando…" : "Guardar y activar"}
            </button>
          </>
        ) : (
          <>
            {onSaveDraft ? (
              <button
                type="button"
                className={s.primaryButton}
                disabled={isSaving}
                onClick={() => void onSaveDraft()}
              >
                Guardar borrador
              </button>
            ) : null}
            <button
              type="button"
              className={s.secondaryButton}
              onClick={() => {
                setActiveTab("verificacion");
                setFormExpanded(false);
              }}
            >
              Revisar diferencias
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
