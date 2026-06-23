import {
  DEFAULT_MANUAL_CASE_INPUTS,
  manualCaseToOptimizerInputs,
} from "@/features/internal-price-simulator/services/manual-case.service";
import {
  buildScenarios,
  computePriceSimulatorResult,
  secondDerivativePerM2,
  unconstrainedOptimumPerM2,
  utilityPerM2,
} from "@/features/internal-price-simulator/services/priceSimulatorMath";

describe("priceSimulatorMath (modelo por m²)", () => {
  const optimizerInputs = manualCaseToOptimizerInputs(DEFAULT_MANUAL_CASE_INPUTS);

  it("calcula el caso piloto ABPro con unidades correctas", () => {
    expect(optimizerInputs.areaM2).toBeCloseTo(2.85, 5);

    const result = computePriceSimulatorResult(optimizerInputs);

    expect(result).not.toBeNull();
    expect(result?.currentTotal).toBeCloseTo(256_500, 0);
    expect(result?.recommendedPricePerM2).toBeCloseTo(91_579, 0);
    expect(result?.recommendedTotal).toBeCloseTo(261_000, 0);
    expect(result?.totalDifference).toBeCloseTo(4_500, 0);
    expect(result?.optimumStatus).toBe("confirmed_maximum");
    expect(result?.secondDerivative).toBeLessThan(0);
  });

  it("usa la formula U(p) con precio por m2", () => {
    const p = unconstrainedOptimumPerM2(
      optimizerInputs.areaM2,
      optimizerInputs.technicalTotalCost,
      optimizerInputs.zeroAcceptanceReferencePriceM2
    );

    const utility = utilityPerM2(
      p,
      optimizerInputs.areaM2,
      optimizerInputs.technicalTotalCost,
      optimizerInputs.zeroAcceptanceReferencePriceM2
    );

    expect(p).toBeCloseTo(91_578.947, 1);
    expect(utility).toBeGreaterThan(0);
    expect(
      secondDerivativePerM2(
        optimizerInputs.areaM2,
        optimizerInputs.zeroAcceptanceReferencePriceM2
      )
    ).toBeLessThan(0);
  });

  it("construye escenarios Actual, Recomendado y Alto", () => {
    const result = computePriceSimulatorResult(optimizerInputs);

    expect(result).not.toBeNull();

    const scenarios = buildScenarios(optimizerInputs, result!);

    expect(scenarios).toHaveLength(3);
    expect(scenarios[0]?.kind).toBe("actual");
    expect(scenarios[0]?.pricePerM2).toBe(90_000);
    expect(scenarios[1]?.kind).toBe("recommended");
    expect(scenarios[1]?.pricePerM2).toBeCloseTo(91_579, 0);
    expect(scenarios[2]?.kind).toBe("high");
    expect(scenarios[2]?.pricePerM2).toBe(120_000);
  });
});
