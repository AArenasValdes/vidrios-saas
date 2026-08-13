export const SUPPORTED_COUNTRY_CODES = ["AR", "CL", "CO", "MX", "PE", "UY"] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];

export type OrganizationRegionSettings = {
  countryCode: SupportedCountryCode;
  currencyCode: string;
  locale: string;
  timezone: string;
  phoneCountryCode: string;
  taxLabel: string;
  taxRateDefault: number;
  taxIdLabel: string;
};

export type CountryPreset = OrganizationRegionSettings & {
  label: string;
  phonePlaceholder: string;
  /**
   * Redondeo comercial del total. Chile conserva miles por compatibilidad;
   * los demas mercados no reciben un redondeo arbitrario de moneda.
   */
  commercialRoundingIncrement: number;
};
