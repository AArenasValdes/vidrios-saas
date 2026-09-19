import { calculateGlassSheetOptimization } from "../glass-sheet-optimization.service";

describe("glass-sheet-optimization.service", () => {
  it("redondea el consumo al siguiente cuarto de plancha", () => {
    const summary = calculateGlassSheetOptimization({
      requiredAreaM2: 2.88,
      wastePct: 5,
      config: {
        enabled: true,
        widthMm: 3210,
        heightMm: 2250,
        costClp: 85000,
        billingRule: "quarter",
      },
    });

    expect(summary).not.toBeNull();
    expect(summary?.sheetAreaM2).toBe(7.2225);
    expect(summary?.areaWithWasteM2).toBe(3.024);
    expect(summary?.billableSheetFraction).toBe(0.5);
    expect(summary?.billableAreaM2).toBe(3.6113);
    expect(summary?.estimatedMaterialCostClp).toBe(42500);
  });

  it("permite cobrar area exacta sin redondear fraccion", () => {
    const summary = calculateGlassSheetOptimization({
      requiredAreaM2: 1.5,
      wastePct: 10,
      config: {
        enabled: true,
        widthMm: 3000,
        heightMm: 2000,
        costClp: 0,
        billingRule: "exact",
      },
    });

    expect(summary?.areaWithWasteM2).toBe(1.65);
    expect(summary?.billableAreaM2).toBe(1.65);
    expect(summary?.estimatedMaterialCostClp).toBeNull();
  });

  it("no activa optimizacion sin formato de plancha valido", () => {
    expect(
      calculateGlassSheetOptimization({
        requiredAreaM2: 2,
        wastePct: 5,
        config: {
          enabled: true,
          widthMm: 0,
          heightMm: 2250,
          costClp: 85000,
          billingRule: "quarter",
        },
      })
    ).toBeNull();
  });
});
