import type {
  CountryPreset,
  SupportedCountryCode,
} from "@/features/organization-region/types/organization-region";

export const COUNTRY_PRESETS: Record<SupportedCountryCode, CountryPreset> = {
  AR: { countryCode: "AR", label: "Argentina", currencyCode: "ARS", locale: "es-AR", timezone: "America/Argentina/Buenos_Aires", phoneCountryCode: "+54", phonePlaceholder: "+54 11 1234 5678", taxLabel: "IVA", taxRateDefault: 21, taxIdLabel: "CUIT", commercialRoundingIncrement: 1 },
  CL: { countryCode: "CL", label: "Chile", currencyCode: "CLP", locale: "es-CL", timezone: "America/Santiago", phoneCountryCode: "+56", phonePlaceholder: "+56 9 1234 5678", taxLabel: "IVA", taxRateDefault: 19, taxIdLabel: "RUT", commercialRoundingIncrement: 1000 },
  CO: { countryCode: "CO", label: "Colombia", currencyCode: "COP", locale: "es-CO", timezone: "America/Bogota", phoneCountryCode: "+57", phonePlaceholder: "+57 300 123 4567", taxLabel: "IVA", taxRateDefault: 19, taxIdLabel: "NIT", commercialRoundingIncrement: 1 },
  MX: { countryCode: "MX", label: "Mexico", currencyCode: "MXN", locale: "es-MX", timezone: "America/Mexico_City", phoneCountryCode: "+52", phonePlaceholder: "+52 55 1234 5678", taxLabel: "IVA", taxRateDefault: 16, taxIdLabel: "RFC", commercialRoundingIncrement: 1 },
  PE: { countryCode: "PE", label: "Peru", currencyCode: "PEN", locale: "es-PE", timezone: "America/Lima", phoneCountryCode: "+51", phonePlaceholder: "+51 912 345 678", taxLabel: "IGV", taxRateDefault: 18, taxIdLabel: "RUC", commercialRoundingIncrement: 1 },
  UY: { countryCode: "UY", label: "Uruguay", currencyCode: "UYU", locale: "es-UY", timezone: "America/Montevideo", phoneCountryCode: "+598", phonePlaceholder: "+598 94 123 456", taxLabel: "IVA", taxRateDefault: 22, taxIdLabel: "RUT", commercialRoundingIncrement: 1 },
};

export const COUNTRY_PRESET_OPTIONS = Object.values(COUNTRY_PRESETS);
