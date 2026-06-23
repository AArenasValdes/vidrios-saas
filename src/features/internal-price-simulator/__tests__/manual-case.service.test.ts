import {
  cloneDefaultManualCaseInputs,
  computeAreaM2FromMm,
  computeTotalFromPriceM2,
  DEFAULT_MANUAL_CASE_INPUTS,
} from "@/features/internal-price-simulator/services/manual-case.service";

describe("manual-case.service", () => {
  it("clona defaults sin mutar la constante compartida", () => {
    const clone = cloneDefaultManualCaseInputs();
    clone.widthMm = 9999;

    expect(DEFAULT_MANUAL_CASE_INPUTS.widthMm).toBe(1500);
    expect(clone.widthMm).toBe(9999);
  });

  it("calcula area en m2 desde milimetros sin inflar unidades", () => {
    const areaM2 = computeAreaM2FromMm({
      widthMm: 1500,
      heightMm: 1900,
      quantity: 1,
    });

    expect(areaM2).toBeCloseTo(2.85, 5);
    expect(areaM2).toBeLessThan(10);
  });

  it("calcula total actual con minimo cobrable", () => {
    const areaM2 = computeAreaM2FromMm(DEFAULT_MANUAL_CASE_INPUTS);

    expect(
      computeTotalFromPriceM2(
        areaM2,
        DEFAULT_MANUAL_CASE_INPUTS.linePricePerM2,
        DEFAULT_MANUAL_CASE_INPUTS.minimumCharge
      )
    ).toBeCloseTo(256_500, 0);
  });

  it("recalcula area al cambiar medidas en mm y cantidad", () => {
    const areaM2 = computeAreaM2FromMm({
      widthMm: 1200,
      heightMm: 2000,
      quantity: 2,
    });

    expect(areaM2).toBeCloseTo(4.8, 5);
    expect(computeTotalFromPriceM2(areaM2, 90_000, 35_000)).toBe(432_000);
  });
});
