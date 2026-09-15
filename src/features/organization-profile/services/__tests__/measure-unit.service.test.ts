import {
  formatMeasureFromMm,
  formatMeasurePairFromMm,
  isCompleteMeasureDraft,
  normalizeMeasureUnit,
  parseMeasureToMm,
  sanitizeMeasureInput,
} from "../measure-unit.service";

describe("measure-unit.service", () => {
  it("usa mm como default", () => {
    expect(normalizeMeasureUnit(undefined)).toBe("mm");
    expect(normalizeMeasureUnit("mm")).toBe("mm");
    expect(normalizeMeasureUnit("cm")).toBe("cm");
    expect(normalizeMeasureUnit("px")).toBe("mm");
  });

  it("convierte 120 cm a 1200 mm y 1200 mm a 120 cm", () => {
    expect(parseMeasureToMm("120", "cm")).toBe("1200");
    expect(formatMeasureFromMm("1200", "cm")).toBe("120");
    expect(parseMeasureToMm("1200", "mm")).toBe("1200");
    expect(formatMeasureFromMm("1200", "mm")).toBe("1200");
  });

  it("conserva un decimal al pasar de cm a mm", () => {
    expect(parseMeasureToMm("120.5", "cm")).toBe("1205");
    expect(formatMeasureFromMm("1205", "cm")).toBe("120.5");
  });

  it("no convierte la cantidad: el helper solo opera sobre medidas", () => {
    expect(parseMeasureToMm("3", "mm")).toBe("3");
    expect(formatMeasureFromMm("3", "cm")).toBe("0.3");
  });

  it("mantiene borradores incompletos como 12.", () => {
    expect(sanitizeMeasureInput("12.")).toBe("12.");
    expect(isCompleteMeasureDraft("12.")).toBe(false);
    expect(isCompleteMeasureDraft("12.5")).toBe(true);
    expect(isCompleteMeasureDraft("")).toBe(true);
  });

  it("formatea el par comercial ancho x alto", () => {
    expect(formatMeasurePairFromMm("1200", "1500", "mm")).toBe("1200 x 1500 mm");
    expect(formatMeasurePairFromMm(1200, 1500, "cm")).toBe("120 x 150 cm");
    expect(formatMeasurePairFromMm("", "1500", "cm")).toBeNull();
  });
});
