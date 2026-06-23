import {
  DEFAULT_MANUAL_CASE_INPUTS,
  manualCaseToOptimizerInputs,
  validateManualCaseInputs,
} from "@/features/internal-price-simulator/services/manual-case.service";

describe("manual-case validation", () => {
  it("rechaza medidas en mm no positivas y area cero", () => {
    const validation = validateManualCaseInputs({
      ...DEFAULT_MANUAL_CASE_INPUTS,
      widthMm: 0,
      quantity: 0,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("width_not_positive");
    expect(validation.errors).toContain("quantity_not_positive");
    expect(validation.errors).toContain("area_is_zero");
  });

  it("rechaza precio de referencia menor o igual al actual", () => {
    const validation = validateManualCaseInputs({
      ...DEFAULT_MANUAL_CASE_INPUTS,
      zeroAcceptanceReferencePriceM2: 80_000,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("reference_price_not_above_current");
  });

  it("mapea snapshot manual al optimizador por m2", () => {
    const mapped = manualCaseToOptimizerInputs(DEFAULT_MANUAL_CASE_INPUTS);

    expect(mapped.areaM2).toBeCloseTo(2.85, 5);
    expect(mapped.technicalTotalCost).toBe(180_000);
    expect(mapped.minimumCharge).toBe(35_000);
    expect(mapped.currentPricePerM2).toBe(90_000);
    expect(mapped.zeroAcceptanceReferencePriceM2).toBe(120_000);
  });
});
