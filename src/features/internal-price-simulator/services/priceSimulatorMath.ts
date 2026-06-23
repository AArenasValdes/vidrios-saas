import { computeTotalFromPriceM2 } from "@/features/internal-price-simulator/services/manual-case.service";
import type {
  OptimumStatus,
  PriceOptimizerInputs,
  PriceScenario,
  PriceScenarioKind,
  PriceSimulatorChartPoint,
  PriceSimulatorResult,
  PriceSimulatorValidation,
} from "@/features/internal-price-simulator/types/price-simulator.types";

export function validatePriceOptimizerInputs(
  inputs: PriceOptimizerInputs
): PriceSimulatorValidation {
  const errors: PriceSimulatorValidation["errors"] = [];
  const values = [
    inputs.areaM2,
    inputs.technicalTotalCost,
    inputs.minimumCharge,
    inputs.currentPricePerM2,
    inputs.zeroAcceptanceReferencePriceM2,
  ];

  if (values.some((value) => !Number.isFinite(value))) {
    errors.push("invalid_numbers");
  }

  if (inputs.areaM2 <= 0) {
    errors.push("area_not_positive");
  }

  if (inputs.technicalTotalCost < 0) {
    errors.push("negative_technical_cost");
  }

  if (inputs.minimumCharge < 0) {
    errors.push("negative_minimum_charge");
  }

  if (inputs.currentPricePerM2 <= 0) {
    errors.push("current_price_not_positive");
  }

  if (inputs.zeroAcceptanceReferencePriceM2 <= 0) {
    errors.push("reference_price_not_positive");
  } else if (
    inputs.zeroAcceptanceReferencePriceM2 <= inputs.currentPricePerM2
  ) {
    errors.push("reference_price_not_above_current");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function acceptanceProbability(
  pricePerM2: number,
  referencePriceM2: number
) {
  if (!Number.isFinite(pricePerM2) || !Number.isFinite(referencePriceM2)) {
    return 0;
  }

  if (referencePriceM2 <= 0) {
    return 0;
  }

  return 1 - pricePerM2 / referencePriceM2;
}

export function utilityPerM2(
  pricePerM2: number,
  areaM2: number,
  technicalTotalCost: number,
  referencePriceM2: number
) {
  if (!Number.isFinite(pricePerM2) || !Number.isFinite(areaM2)) {
    return 0;
  }

  return (
    (areaM2 * pricePerM2 - technicalTotalCost) *
    acceptanceProbability(pricePerM2, referencePriceM2)
  );
}

export function firstDerivativePerM2(
  pricePerM2: number,
  areaM2: number,
  technicalTotalCost: number,
  referencePriceM2: number
) {
  if (referencePriceM2 <= 0) {
    return 0;
  }

  return (
    areaM2 -
    (2 * areaM2 * pricePerM2) / referencePriceM2 +
    technicalTotalCost / referencePriceM2
  );
}

export function secondDerivativePerM2(areaM2: number, referencePriceM2: number) {
  if (referencePriceM2 <= 0) {
    return 0;
  }

  return (-2 * areaM2) / referencePriceM2;
}

export function unconstrainedOptimumPerM2(
  areaM2: number,
  technicalTotalCost: number,
  referencePriceM2: number
) {
  if (areaM2 <= 0 || referencePriceM2 <= 0) {
    return 0;
  }

  return (areaM2 * referencePriceM2 + technicalTotalCost) / (2 * areaM2);
}

export function resolveOptimalPricePerM2(inputs: PriceOptimizerInputs) {
  return unconstrainedOptimumPerM2(
    inputs.areaM2,
    inputs.technicalTotalCost,
    inputs.zeroAcceptanceReferencePriceM2
  );
}

export function computePriceSimulatorResult(
  inputs: PriceOptimizerInputs
): PriceSimulatorResult | null {
  const validation = validatePriceOptimizerInputs(inputs);

  if (!validation.isValid) {
    return null;
  }

  const {
    areaM2,
    technicalTotalCost,
    minimumCharge,
    currentPricePerM2,
    zeroAcceptanceReferencePriceM2,
  } = inputs;

  const recommendedPricePerM2 = resolveOptimalPricePerM2(inputs);
  const recommendedTotal = computeTotalFromPriceM2(
    areaM2,
    recommendedPricePerM2,
    minimumCharge
  );
  const currentTotal = computeTotalFromPriceM2(
    areaM2,
    currentPricePerM2,
    minimumCharge
  );
  const maxUtility = utilityPerM2(
    recommendedPricePerM2,
    areaM2,
    technicalTotalCost,
    zeroAcceptanceReferencePriceM2
  );
  const secondDerivative = secondDerivativePerM2(
    areaM2,
    zeroAcceptanceReferencePriceM2
  );
  const optimumStatus: OptimumStatus =
    secondDerivative < 0 ? "confirmed_maximum" : "boundary_maximum";

  return {
    recommendedPricePerM2,
    recommendedTotal,
    currentTotal,
    totalDifference: recommendedTotal - currentTotal,
    maxUtility,
    optimumStatus,
    unconstrainedOptimumPerM2: recommendedPricePerM2,
    secondDerivative,
  };
}

const SCENARIO_LABELS: Record<PriceScenarioKind, string> = {
  actual: "Actual",
  recommended: "Recomendado",
  high: "Alto",
};

function buildScenario(
  kind: PriceScenarioKind,
  pricePerM2: number,
  inputs: PriceOptimizerInputs
): PriceScenario {
  const {
    areaM2,
    technicalTotalCost,
    minimumCharge,
    zeroAcceptanceReferencePriceM2,
  } = inputs;

  return {
    kind,
    label: SCENARIO_LABELS[kind],
    pricePerM2,
    totalPrice: computeTotalFromPriceM2(areaM2, pricePerM2, minimumCharge),
    estimatedMargin: areaM2 * pricePerM2 - technicalTotalCost,
    estimatedUtility: utilityPerM2(
      pricePerM2,
      areaM2,
      technicalTotalCost,
      zeroAcceptanceReferencePriceM2
    ),
    acceptanceProbability: acceptanceProbability(
      pricePerM2,
      zeroAcceptanceReferencePriceM2
    ),
  };
}

export function buildScenarios(
  inputs: PriceOptimizerInputs,
  result: PriceSimulatorResult
): PriceScenario[] {
  return [
    buildScenario("actual", inputs.currentPricePerM2, inputs),
    buildScenario("recommended", result.recommendedPricePerM2, inputs),
    buildScenario("high", inputs.zeroAcceptanceReferencePriceM2, inputs),
  ];
}

export function buildChartPoints(
  inputs: PriceOptimizerInputs,
  pointCount = 80
): PriceSimulatorChartPoint[] {
  const validation = validatePriceOptimizerInputs(inputs);

  if (!validation.isValid || pointCount < 2) {
    return [];
  }

  const minPricePerM2 = Math.max(
    inputs.currentPricePerM2 * 0.5,
    inputs.minimumCharge / Math.max(inputs.areaM2, 1)
  );
  const maxPricePerM2 = inputs.zeroAcceptanceReferencePriceM2;
  const span = maxPricePerM2 - minPricePerM2;

  if (span <= 0) {
    return [];
  }

  const points: PriceSimulatorChartPoint[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const ratio = index / (pointCount - 1);
    const pricePerM2 = minPricePerM2 + span * ratio;

    points.push({
      pricePerM2,
      utility: utilityPerM2(
        pricePerM2,
        inputs.areaM2,
        inputs.technicalTotalCost,
        inputs.zeroAcceptanceReferencePriceM2
      ),
    });
  }

  return points;
}

export function getValidationErrorMessage(
  error: PriceSimulatorValidation["errors"][number]
) {
  switch (error) {
    case "invalid_numbers":
      return "Ingresa solo valores numéricos válidos.";
    case "area_not_positive":
      return "El área total debe ser mayor que cero.";
    case "negative_technical_cost":
      return "El costo técnico total no puede ser negativo.";
    case "negative_minimum_charge":
      return "El mínimo cobrable no puede ser negativo.";
    case "current_price_not_positive":
      return "El precio actual por m² debe ser mayor que cero.";
    case "reference_price_not_positive":
      return "El precio de referencia debe ser mayor que cero.";
    case "reference_price_not_above_current":
      return "El precio de referencia debe ser mayor que el precio actual por m².";
    default:
      return "Revisa los valores ingresados.";
  }
}
