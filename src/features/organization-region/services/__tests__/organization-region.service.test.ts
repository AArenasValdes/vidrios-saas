import {
  getCountryPreset,
  resolveOrganizationPricingSettings,
  resolveOrganizationRegionSettings,
} from "../organization-region.service";
import { normalizePhoneToE164 } from "../phone-number.service";

describe("organization region", () => {
  it("usa Chile como compatibilidad cuando no hay configuracion persistida", () => {
    expect(resolveOrganizationRegionSettings()).toMatchObject({
      countryCode: "CL",
      currencyCode: "CLP",
      locale: "es-CL",
      taxLabel: "IVA",
      taxRateDefault: 19,
    });
  });

  it("resuelve los presets regionales soportados", () => {
    expect(getCountryPreset("PE")).toMatchObject({
      currencyCode: "PEN",
      locale: "es-PE",
      phoneCountryCode: "+51",
      taxLabel: "IGV",
      taxRateDefault: 18,
    });
  });

  it("solo mantiene el redondeo comercial chileno cuando corresponde", () => {
    expect(resolveOrganizationPricingSettings({ countryCode: "CL" })).toEqual({
      taxRatePct: 19,
      commercialRoundingIncrement: 1000,
    });
    expect(resolveOrganizationPricingSettings({ countryCode: "MX" })).toEqual({
      taxRatePct: 16,
      commercialRoundingIncrement: 1,
    });
  });

  it("normaliza telefonos locales e internacionales en E.164", () => {
    expect(normalizePhoneToE164("9 1234 5678", "CL")).toBe("+56912345678");
    expect(normalizePhoneToE164("912 345 678", "PE")).toBe("+51912345678");
    expect(normalizePhoneToE164("+52 55 1234 5678", "MX")).toBe("+525512345678");
    expect(normalizePhoneToE164("123", "CL")).toBeNull();
  });
});
