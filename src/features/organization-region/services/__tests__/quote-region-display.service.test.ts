import { createQuoteRegionSnapshot } from "../quote-region-snapshot.service";
import {
  formatQuoteCurrency,
  formatQuoteTaxLabel,
  resolveQuotePricingSettings,
  resolveQuoteRegionSnapshotForDisplay,
} from "../quote-region-display.service";

describe("quote region display", () => {
  it("mantiene CLP e IVA 19% para cotizaciones historicas sin snapshot", () => {
    const region = resolveQuoteRegionSnapshotForDisplay(null);

    expect(region.currencyCode).toBe("CLP");
    expect(formatQuoteTaxLabel(null)).toBe("IVA 19%");
    expect(formatQuoteCurrency(1200, null)).toContain("1.200");
  });

  it("usa la moneda e impuesto congelados de la cotizacion", () => {
    const snapshot = createQuoteRegionSnapshot({
      region: { countryCode: "PE" },
      capturedAt: "2026-08-13T00:00:00.000Z",
    });

    expect(formatQuoteTaxLabel(snapshot)).toBe("IGV 18%");
    expect(formatQuoteCurrency(1200, snapshot)).toContain("1,200");
    expect(resolveQuotePricingSettings(snapshot)).toMatchObject({
      taxRatePct: 18,
      commercialRoundingIncrement: 1,
    });
  });
});
