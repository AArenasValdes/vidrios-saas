"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { LuRotateCcw } from "react-icons/lu";
import { PriceSimulatorChart } from "@/features/internal-price-simulator/components/PriceSimulatorChart";
import {
  cloneDefaultManualCaseInputs,
  computeAreaM2FromMm,
  computeGrossTotalFromNet,
  computeIvaFromNet,
  getManualCaseComponentLabel,
  getManualCaseValidationErrorMessage,
  MANUAL_CASE_COMPONENT_OPTIONS,
  manualCaseToOptimizerInputs,
  validateManualCaseInputs,
} from "@/features/internal-price-simulator/services/manual-case.service";
import {
  buildChartPoints,
  buildScenarios,
  computePriceSimulatorResult,
  firstDerivativePerM2,
  secondDerivativePerM2,
} from "@/features/internal-price-simulator/services/priceSimulatorMath";
import type {
  ManualCaseComponent,
  ManualCaseInputs,
  PriceScenarioKind,
} from "@/features/internal-price-simulator/types/price-simulator.types";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./internal-price-simulator-page.module.css";

type MoneyFieldKey =
  | "linePricePerM2"
  | "minimumCharge"
  | "technicalTotalCost"
  | "zeroAcceptanceReferencePriceM2";

const SCENARIO_OPTIONS: Array<{ kind: PriceScenarioKind; label: string }> = [
  { kind: "actual", label: "Actual" },
  { kind: "recommended", label: "Recomendado" },
  { kind: "high", label: "Alto" },
];

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function formatAreaM2(value: number) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSecondDerivativeDisplay(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const decimalPlaces = Math.abs(value) < 0.001 ? 7 : 4;

  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

function getDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatMoneyInput(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  if (value === 0) {
    return "0";
  }

  return new Intl.NumberFormat("es-CL").format(value);
}

function manualCaseToDisplayState(inputs: ManualCaseInputs) {
  return {
    widthMm: String(inputs.widthMm > 0 ? inputs.widthMm : ""),
    heightMm: String(inputs.heightMm > 0 ? inputs.heightMm : ""),
    quantity: String(inputs.quantity > 0 ? inputs.quantity : ""),
    linePricePerM2: formatMoneyInput(inputs.linePricePerM2),
    minimumCharge: formatMoneyInput(inputs.minimumCharge),
    technicalTotalCost: formatMoneyInput(inputs.technicalTotalCost),
    zeroAcceptanceReferencePriceM2: formatMoneyInput(
      inputs.zeroAcceptanceReferencePriceM2
    ),
  };
}

function getOptimumStatusLabel(status: "confirmed_maximum" | "boundary_maximum") {
  return status === "confirmed_maximum"
    ? "Máximo confirmado"
    : "Máximo en límite";
}

export function InternalPriceSimulatorPage() {
  const [manualCase, setManualCase] = useState<ManualCaseInputs>(() =>
    cloneDefaultManualCaseInputs()
  );
  const [displayValues, setDisplayValues] = useState(() =>
    manualCaseToDisplayState(cloneDefaultManualCaseInputs())
  );
  const [selectedScenario, setSelectedScenario] =
    useState<PriceScenarioKind>("recommended");

  const areaM2 = useMemo(() => computeAreaM2FromMm(manualCase), [manualCase]);
  const validation = useMemo(
    () => validateManualCaseInputs(manualCase),
    [manualCase]
  );
  const optimizerInputs = useMemo(
    () => manualCaseToOptimizerInputs(manualCase),
    [manualCase]
  );
  const result = useMemo(
    () => (validation.isValid ? computePriceSimulatorResult(optimizerInputs) : null),
    [optimizerInputs, validation.isValid]
  );
  const scenarios = useMemo(
    () => (result ? buildScenarios(optimizerInputs, result) : []),
    [optimizerInputs, result]
  );
  const chartPoints = useMemo(
    () => (validation.isValid ? buildChartPoints(optimizerInputs) : []),
    [optimizerInputs, validation.isValid]
  );

  const activeScenario = scenarios.find(
    (scenario) => scenario.kind === selectedScenario
  );

  const chartBounds = useMemo(() => {
    if (!validation.isValid) {
      return { min: 0, max: 0 };
    }

    const min = Math.max(
      manualCase.linePricePerM2 * 0.5,
      manualCase.minimumCharge / Math.max(areaM2, 1)
    );

    return {
      min,
      max: manualCase.zeroAcceptanceReferencePriceM2,
    };
  }, [areaM2, manualCase, validation.isValid]);

  const handleMoneyChange = (key: MoneyFieldKey, rawValue: string) => {
    const digits = getDigits(rawValue);
    const numericValue = digits ? Number(digits) : 0;

    setDisplayValues((current) => ({
      ...current,
      [key]: digits ? formatMoneyInput(numericValue) : "",
    }));
    setManualCase((current) => ({
      ...current,
      [key]: numericValue,
    }));
  };

  const handleIntegerChange = (
    key: "widthMm" | "heightMm" | "quantity",
    rawValue: string
  ) => {
    const digits = getDigits(rawValue);
    const numericValue = digits ? Number(digits) : 0;

    setDisplayValues((current) => ({
      ...current,
      [key]: digits,
    }));
    setManualCase((current) => ({
      ...current,
      [key]: numericValue,
    }));
  };

  const handleComponentChange = (componentType: ManualCaseComponent) => {
    setManualCase((current) => ({
      ...current,
      componentType,
    }));
  };

  const handleReset = () => {
    const defaults = cloneDefaultManualCaseInputs();

    setManualCase(defaults);
    setDisplayValues(manualCaseToDisplayState(defaults));
    setSelectedScenario("recommended");
  };

  const renderMoneyField = (key: MoneyFieldKey, label: string) => (
    <label key={key} className={s.field}>
      <span className={s.label}>{label}</span>
      <input
        className={s.input}
        inputMode="numeric"
        value={displayValues[key]}
        onChange={(event) => handleMoneyChange(key, event.target.value)}
        aria-label={label}
      />
    </label>
  );

  return (
    <div className={s.internalPage}>
      <div className={s.internalContainer}>
        <header className={s.brandHeader}>
          <Image
            src="/brand/ventora-logo-premium-dark.svg"
            alt="Ventora"
            width={168}
            height={44}
            className={s.brandLogo}
            priority
          />
          <div className={s.brandMeta}>
            <p className={s.eyebrow}>Herramienta interna</p>
            <h1 className={s.title}>Simulador de precio por m²</h1>
            <p className={s.subtitle}>
              Caso piloto ABPro —{" "}
              {getManualCaseComponentLabel(manualCase.componentType)}
            </p>
          </div>
        </header>

        <div className={s.warningBanner} role="note">
          Prototipo interno de validación académica. No disponible para clientes.
        </div>

        <section
          className={`${s.surfaceCard} ${s.pilotCard}`}
          aria-labelledby="pilot-case-title"
        >
          <h2 id="pilot-case-title" className={s.sectionTitle}>
            Caso piloto
          </h2>
          <div className={s.fieldGrid}>
            <label className={`${s.field} ${s.fieldFull}`}>
              <span className={s.label}>Componente</span>
              <select
                className={s.select}
                value={manualCase.componentType}
                onChange={(event) =>
                  handleComponentChange(event.target.value as ManualCaseComponent)
                }
                aria-label="Componente"
              >
                {MANUAL_CASE_COMPONENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={s.field}>
              <span className={s.label}>Ancho (mm)</span>
              <input
                className={s.input}
                inputMode="numeric"
                value={displayValues.widthMm}
                onChange={(event) =>
                  handleIntegerChange("widthMm", event.target.value)
                }
                aria-label="Ancho en milímetros"
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Alto (mm)</span>
              <input
                className={s.input}
                inputMode="numeric"
                value={displayValues.heightMm}
                onChange={(event) =>
                  handleIntegerChange("heightMm", event.target.value)
                }
                aria-label="Alto en milímetros"
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Cantidad</span>
              <input
                className={s.input}
                inputMode="numeric"
                value={displayValues.quantity}
                onChange={(event) =>
                  handleIntegerChange("quantity", event.target.value)
                }
                aria-label="Cantidad"
              />
            </label>

            {renderMoneyField("linePricePerM2", "Precio actual por m²")}
            {renderMoneyField("minimumCharge", "Mínimo cobrable")}
          </div>

          <div className={s.pilotGrid}>
            <div className={s.pilotItem}>
              <span className={s.label}>Área total calculada</span>
              <strong suppressHydrationWarning>{formatAreaM2(areaM2)} m²</strong>
            </div>
            <div className={s.pilotItem}>
              <span className={s.label}>Total actual cotizado</span>
              <strong suppressHydrationWarning>
                {result
                  ? formatCurrency(result.currentTotal)
                  : formatCurrency(0)}
              </strong>
            </div>
          </div>

          <p className={s.fieldHint}>
            En una futura integración, estos datos podrán provenir directamente
            de un componente cotizado en Ventora.
          </p>
        </section>

        <section
          className={s.surfaceCard}
          aria-labelledby="technical-cost-title"
        >
          <h2 id="technical-cost-title" className={s.sectionTitle}>
            Costo técnico conocido
          </h2>
          {renderMoneyField("technicalTotalCost", "Costo técnico total")}
          <p className={s.fieldHint}>
            Puede provenir de cubicación manual, proveedor o sistema técnico.
          </p>
        </section>

        {validation.errors.length > 0 ? (
          <ul className={s.errorList}>
            {validation.errors.map((error) => (
              <li key={error}>{getManualCaseValidationErrorMessage(error)}</li>
            ))}
          </ul>
        ) : null}

        {result ? (
          <section className={s.resultCard} aria-labelledby="simulator-result-title">
            <div className={s.resultHeader}>
              <h2 id="simulator-result-title" className={s.sectionTitle}>
                Resultado destacado
              </h2>
              <span className={s.statusBadge}>
                {getOptimumStatusLabel(result.optimumStatus)}
              </span>
            </div>
            <p className={s.resultHighlight}>
              {formatCurrency(result.recommendedPricePerM2)}/m²
            </p>
            <div className={s.resultGrid}>
              <div className={s.resultItem}>
                <span className={s.resultLabel}>Precio actual por m²</span>
                <strong>{formatCurrency(manualCase.linePricePerM2)}/m²</strong>
              </div>
              <div className={s.resultItem}>
                <span className={s.resultLabel}>Precio recomendado por m²</span>
                <strong>{formatCurrency(result.recommendedPricePerM2)}/m²</strong>
              </div>
              <div className={s.resultItem}>
                <span className={s.resultLabel}>Total actual</span>
                <strong>{formatCurrency(result.currentTotal)}</strong>
              </div>
              <div className={s.resultItem}>
                <span className={s.resultLabel}>Total recomendado</span>
                <strong>{formatCurrency(result.recommendedTotal)}</strong>
              </div>
              <div className={`${s.resultItem} ${s.resultItemHighlight}`}>
                <span className={s.resultLabel}>Diferencia estimada</span>
                <strong>{formatSignedCurrency(result.totalDifference)}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {scenarios.length > 0 ? (
          <section className={s.surfaceCard} aria-labelledby="simulator-scenarios-title">
            <h2 id="simulator-scenarios-title" className={s.sectionTitle}>
              Escenarios
            </h2>
            <div
              className={s.scenarioSelector}
              role="tablist"
              aria-label="Escenarios de precio"
            >
              {SCENARIO_OPTIONS.map((option) => (
                <button
                  key={option.kind}
                  type="button"
                  role="tab"
                  aria-selected={selectedScenario === option.kind}
                  className={
                    selectedScenario === option.kind
                      ? `${s.scenarioTab} ${s.scenarioTabActive}`
                      : s.scenarioTab
                  }
                  onClick={() => setSelectedScenario(option.kind)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {activeScenario ? (
              <div className={s.scenarioDetail} role="tabpanel">
                <div className={s.scenarioRow}>
                  <span>Precio por m²</span>
                  <strong>{formatCurrency(activeScenario.pricePerM2)}/m²</strong>
                </div>
                <div className={s.scenarioRow}>
                  <span>Margen técnico</span>
                  <strong>{formatCurrency(activeScenario.estimatedMargin)}</strong>
                </div>
                <div className={s.scenarioRow}>
                  <span>Utilidad esperada</span>
                  <strong>{formatCurrency(activeScenario.estimatedUtility)}</strong>
                </div>
                <div className={s.scenarioRow}>
                  <span>Neto</span>
                  <strong>{formatCurrency(activeScenario.totalPrice)}</strong>
                </div>
                <div className={s.scenarioRow}>
                  <span>IVA 19%</span>
                  <strong>
                    {formatCurrency(computeIvaFromNet(activeScenario.totalPrice))}
                  </strong>
                </div>
                <div className={`${s.scenarioRow} ${s.scenarioRowTotal}`}>
                  <span>Total</span>
                  <strong>
                    {formatCurrency(
                      computeGrossTotalFromNet(activeScenario.totalPrice)
                    )}
                  </strong>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <details className={s.accordion}>
          <summary className={s.accordionSummary}>
            Ver análisis matemático
          </summary>
          <div className={s.accordionBody}>
            {renderMoneyField(
              "zeroAcceptanceReferencePriceM2",
              "Precio de referencia (aceptación 0%)"
            )}
            <div className={s.formulaBody}>
              <span>U(p) = (área × p - costo técnico) × (1 - p / k)</span>
              <span>
                U&apos;(p) = área - (2 × área × p / k) + (costo técnico / k)
              </span>
              <span>U&apos;&apos;(p) = -2 × área / k</span>
              <span>p* = (área × k + costo técnico) / (2 × área)</span>
              <span>Variables: p = precio por m², k = precio de referencia</span>
              {result ? (
                <>
                  <span>
                    U&apos;(p*) ={" "}
                    {firstDerivativePerM2(
                      result.recommendedPricePerM2,
                      optimizerInputs.areaM2,
                      optimizerInputs.technicalTotalCost,
                      optimizerInputs.zeroAcceptanceReferencePriceM2
                    ).toFixed(2)}
                  </span>
                  <span>Segunda derivada:</span>
                  <span>
                    U&apos;&apos;(p) ={" "}
                    {formatSecondDerivativeDisplay(
                      secondDerivativePerM2(
                        optimizerInputs.areaM2,
                        optimizerInputs.zeroAcceptanceReferencePriceM2
                      )
                    )}{" "}
                    &lt; 0
                  </span>
                  <span className={s.fieldHint}>
                    Como la segunda derivada es negativa, el punto crítico
                    corresponde a un máximo de utilidad estimada.
                  </span>
                </>
              ) : null}
            </div>
            {result && chartPoints.length > 0 ? (
              <PriceSimulatorChart
                points={chartPoints}
                minPricePerM2={chartBounds.min}
                maxPricePerM2={chartBounds.max}
                optimumPricePerM2={result.recommendedPricePerM2}
                optimumUtility={result.maxUtility}
              />
            ) : null}
          </div>
        </details>

        <div className={s.actions}>
          <button type="button" className={s.resetButton} onClick={handleReset}>
            <LuRotateCcw aria-hidden />
            Restablecer valores
          </button>
        </div>
      </div>
    </div>
  );
}
