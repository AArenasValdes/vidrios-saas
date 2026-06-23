import type {
  CotizableComponentSnapshot,
  ManualCaseComponent,
  ManualCaseDerived,
  ManualCaseInputs,
  ManualCaseValidation,
  ManualCaseValidationError,
  PriceOptimizerInputs,
} from "@/features/internal-price-simulator/types/price-simulator.types";

export const MANUAL_CASE_COMPONENT_OPTIONS: Array<{
  value: ManualCaseComponent;
  label: string;
}> = [
  { value: "ventana_corredera", label: "Ventana corredera" },
  { value: "puerta", label: "Puerta" },
  { value: "shower_door", label: "Shower door" },
  { value: "cierre", label: "Cierre" },
  { value: "baranda", label: "Baranda" },
  { value: "otro", label: "Otro" },
];

export const DEFAULT_MANUAL_CASE_INPUTS: ManualCaseInputs = {
  componentType: "ventana_corredera",
  widthMm: 1500,
  heightMm: 1900,
  quantity: 1,
  linePricePerM2: 90_000,
  minimumCharge: 35_000,
  technicalTotalCost: 180_000,
  zeroAcceptanceReferencePriceM2: 120_000,
};

export const CHILE_IVA_RATE = 0.19;

export function computeIvaFromNet(neto: number) {
  if (!Number.isFinite(neto) || neto <= 0) {
    return 0;
  }

  return Math.round(neto * CHILE_IVA_RATE);
}

export function computeGrossTotalFromNet(neto: number) {
  return neto + computeIvaFromNet(neto);
}

export function cloneDefaultManualCaseInputs(): ManualCaseInputs {
  return { ...DEFAULT_MANUAL_CASE_INPUTS };
}

export function getManualCaseComponentLabel(component: ManualCaseComponent) {
  return (
    MANUAL_CASE_COMPONENT_OPTIONS.find((option) => option.value === component)
      ?.label ?? "Otro"
  );
}

export function computeAreaM2FromMm(
  input: Pick<CotizableComponentSnapshot, "widthMm" | "heightMm" | "quantity">
) {
  const { widthMm, heightMm, quantity } = input;

  if (
    !Number.isFinite(widthMm) ||
    !Number.isFinite(heightMm) ||
    !Number.isFinite(quantity)
  ) {
    return 0;
  }

  return (widthMm / 1000) * (heightMm / 1000) * quantity;
}

export function computeTotalFromPriceM2(
  areaM2: number,
  pricePerM2: number,
  minimumCharge: number
) {
  if (!Number.isFinite(areaM2) || !Number.isFinite(pricePerM2)) {
    return 0;
  }

  const rawTotal = areaM2 * pricePerM2;
  return Math.max(rawTotal, Number.isFinite(minimumCharge) ? minimumCharge : 0);
}

export function manualCaseToOptimizerInputs(
  manualCase: ManualCaseInputs
): PriceOptimizerInputs {
  return {
    areaM2: computeAreaM2FromMm(manualCase),
    technicalTotalCost: manualCase.technicalTotalCost,
    minimumCharge: manualCase.minimumCharge,
    currentPricePerM2: manualCase.linePricePerM2,
    zeroAcceptanceReferencePriceM2: manualCase.zeroAcceptanceReferencePriceM2,
  };
}

export function validateManualCaseInputs(
  inputs: ManualCaseInputs
): ManualCaseValidation {
  const errors: ManualCaseValidationError[] = [];
  const numericFields = [
    inputs.widthMm,
    inputs.heightMm,
    inputs.quantity,
    inputs.linePricePerM2,
    inputs.minimumCharge,
    inputs.technicalTotalCost,
    inputs.zeroAcceptanceReferencePriceM2,
  ];

  if (numericFields.some((value) => !Number.isFinite(value))) {
    errors.push("invalid_numbers");
  }

  if (inputs.widthMm <= 0) {
    errors.push("width_not_positive");
  }

  if (inputs.heightMm <= 0) {
    errors.push("height_not_positive");
  }

  if (inputs.quantity <= 0) {
    errors.push("quantity_not_positive");
  }

  if (inputs.linePricePerM2 <= 0) {
    errors.push("line_price_per_m2_not_positive");
  }

  const areaM2 = computeAreaM2FromMm(inputs);

  if (areaM2 <= 0) {
    errors.push("area_is_zero");
  }

  if (inputs.minimumCharge < 0) {
    errors.push("negative_minimum_charge");
  }

  if (inputs.technicalTotalCost < 0) {
    errors.push("negative_technical_cost");
  }

  if (inputs.zeroAcceptanceReferencePriceM2 <= 0) {
    errors.push("reference_price_not_positive");
  } else if (
    inputs.zeroAcceptanceReferencePriceM2 <= inputs.linePricePerM2
  ) {
    errors.push("reference_price_not_above_current");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function computeManualCaseDerived(input: {
  manualCase: ManualCaseInputs;
  recommendedPricePerM2: number;
}): ManualCaseDerived {
  const areaM2 = computeAreaM2FromMm(input.manualCase);
  const currentTotal = computeTotalFromPriceM2(
    areaM2,
    input.manualCase.linePricePerM2,
    input.manualCase.minimumCharge
  );
  const recommendedTotal = computeTotalFromPriceM2(
    areaM2,
    input.recommendedPricePerM2,
    input.manualCase.minimumCharge
  );

  return {
    areaM2,
    currentTotal,
    recommendedPricePerM2: input.recommendedPricePerM2,
    recommendedTotal,
    totalDifference: recommendedTotal - currentTotal,
  };
}

export function getManualCaseValidationErrorMessage(
  error: ManualCaseValidationError
) {
  switch (error) {
    case "invalid_numbers":
      return "Ingresa solo valores numéricos válidos.";
    case "width_not_positive":
      return "El ancho en mm debe ser mayor que cero.";
    case "height_not_positive":
      return "El alto en mm debe ser mayor que cero.";
    case "quantity_not_positive":
      return "La cantidad debe ser mayor que cero.";
    case "line_price_per_m2_not_positive":
      return "El precio actual por m² debe ser mayor que cero.";
    case "area_is_zero":
      return "El área total no puede ser cero.";
    case "negative_minimum_charge":
      return "El mínimo cobrable no puede ser negativo.";
    case "negative_technical_cost":
      return "El costo técnico total no puede ser negativo.";
    case "reference_price_not_positive":
      return "El precio de referencia debe ser mayor que cero.";
    case "reference_price_not_above_current":
      return "El precio de referencia debe ser mayor que el precio actual por m².";
    default:
      return "Revisa los valores ingresados.";
  }
}
