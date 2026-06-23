export type ManualCaseComponent =
  | "ventana_corredera"
  | "puerta"
  | "shower_door"
  | "cierre"
  | "baranda"
  | "otro";

/** Snapshot preparado para futura integración con cotización Ventora por m². */
export type CotizableComponentSnapshot = {
  componentType: ManualCaseComponent;
  widthMm: number;
  heightMm: number;
  quantity: number;
  linePricePerM2: number;
  minimumCharge: number;
};

export type ManualCaseInputs = CotizableComponentSnapshot & {
  technicalTotalCost: number;
  zeroAcceptanceReferencePriceM2: number;
};

export type ManualCaseValidationError =
  | "invalid_numbers"
  | "width_not_positive"
  | "height_not_positive"
  | "quantity_not_positive"
  | "line_price_per_m2_not_positive"
  | "area_is_zero"
  | "negative_minimum_charge"
  | "negative_technical_cost"
  | "reference_price_not_positive"
  | "reference_price_not_above_current";

export type ManualCaseValidation = {
  isValid: boolean;
  errors: ManualCaseValidationError[];
};

export type PriceOptimizerInputs = {
  areaM2: number;
  technicalTotalCost: number;
  minimumCharge: number;
  currentPricePerM2: number;
  zeroAcceptanceReferencePriceM2: number;
};

export type OptimumStatus = "confirmed_maximum" | "boundary_maximum";

export type PriceSimulatorValidationError =
  | "invalid_numbers"
  | "area_not_positive"
  | "negative_technical_cost"
  | "negative_minimum_charge"
  | "current_price_not_positive"
  | "reference_price_not_positive"
  | "reference_price_not_above_current";

export type PriceSimulatorValidation = {
  isValid: boolean;
  errors: PriceSimulatorValidationError[];
};

export type PriceSimulatorResult = {
  recommendedPricePerM2: number;
  recommendedTotal: number;
  currentTotal: number;
  totalDifference: number;
  maxUtility: number;
  optimumStatus: OptimumStatus;
  unconstrainedOptimumPerM2: number;
  secondDerivative: number;
};

export type PriceScenarioKind = "actual" | "recommended" | "high";

export type PriceScenario = {
  kind: PriceScenarioKind;
  label: string;
  pricePerM2: number;
  totalPrice: number;
  estimatedMargin: number;
  estimatedUtility: number;
  acceptanceProbability: number;
};

export type PriceSimulatorChartPoint = {
  pricePerM2: number;
  utility: number;
};

export type ManualCaseDerived = {
  areaM2: number;
  currentTotal: number;
  recommendedPricePerM2: number;
  recommendedTotal: number;
  totalDifference: number;
};
