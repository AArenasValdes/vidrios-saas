import { resolveManualGlassPaneMeasurements } from "../manual-glass-pane-measurements.service";

const legacy = {
  version: 1,
  entries: [{
    id: "legacy-pane",
    source: "manual",
    version: 1,
    productId: "glass-5mm",
    technicalFingerprint: "fp-v1",
    widthMm: 600,
    heightMm: 1000,
    quantity: 2,
    recordedAt: "2026-10-25T12:00:00.000Z",
  }],
};

describe("manual glass JSONB persistence resolution", () => {
  it("uses the legacy [gpm] value only when the dedicated column is absent", () => {
    expect(resolveManualGlassPaneMeasurements(null, legacy)).toEqual(legacy);
  });

  it("prefers the dedicated JSONB snapshot when both sources exist", () => {
    const current = { ...legacy, entries: [{ ...legacy.entries[0], id: "jsonb-pane" }] };
    expect(resolveManualGlassPaneMeasurements(current, legacy)?.entries[0]?.id).toBe("jsonb-pane");
  });

  it("treats a present empty JSONB snapshot as explicit deletion, not a missing value", () => {
    expect(resolveManualGlassPaneMeasurements({ version: 1, entries: [] }, legacy)).toEqual({ version: 1, entries: [] });
  });

  it("returns null when both JSONB and legacy storage are absent", () => {
    expect(resolveManualGlassPaneMeasurements(null, null)).toBeNull();
  });
});
