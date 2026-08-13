import { COUNTRY_PRESETS } from "@/features/organization-region/config/country-presets";
import type {
  OrganizationRegionSettings,
  SupportedCountryCode,
} from "@/features/organization-region/types/organization-region";

const DEFAULT_COUNTRY_CODE: SupportedCountryCode = "CL";

export type OrganizationPricingSettings = {
  taxRatePct: number;
  commercialRoundingIncrement: number;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function normalizeSupportedCountryCode(
  value: string | null | undefined
): SupportedCountryCode {
  const normalized = normalizeText(value).toUpperCase() as SupportedCountryCode;
  return COUNTRY_PRESETS[normalized] ? normalized : DEFAULT_COUNTRY_CODE;
}

export function getCountryPreset(value: string | null | undefined) {
  return COUNTRY_PRESETS[normalizeSupportedCountryCode(value)];
}

export function resolveOrganizationRegionSettings(
  source?:
    | (Partial<Omit<OrganizationRegionSettings, "countryCode">> & {
        countryCode?: string | null;
      })
    | null
): OrganizationRegionSettings {
  const preset = getCountryPreset(source?.countryCode);
  const taxRate = Number(source?.taxRateDefault);
  const currencyCode = normalizeText(source?.currencyCode).toUpperCase();
  const locale = normalizeText(source?.locale);
  const timezone = normalizeText(source?.timezone);
  const phoneCountryCode = normalizeText(source?.phoneCountryCode);
  const taxLabel = normalizeText(source?.taxLabel);
  const taxIdLabel = normalizeText(source?.taxIdLabel);

  return {
    countryCode: preset.countryCode,
    currencyCode: /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : preset.currencyCode,
    locale: /^[a-z]{2}-[A-Z]{2}$/.test(locale) ? locale : preset.locale,
    timezone: timezone.length <= 80 ? timezone || preset.timezone : preset.timezone,
    phoneCountryCode: /^\+[1-9]\d{0,3}$/.test(phoneCountryCode)
      ? phoneCountryCode
      : preset.phoneCountryCode,
    taxLabel: taxLabel.slice(0, 40) || preset.taxLabel,
    taxRateDefault: Number.isFinite(taxRate) && taxRate >= 0 && taxRate <= 100
      ? taxRate
      : preset.taxRateDefault,
    taxIdLabel: taxIdLabel.slice(0, 40) || preset.taxIdLabel,
  };
}

export function resolveOrganizationPricingSettings(
  source?:
    | (Partial<Omit<OrganizationRegionSettings, "countryCode">> & {
        countryCode?: string | null;
      })
    | null
): OrganizationPricingSettings {
  const region = resolveOrganizationRegionSettings(source);
  const preset = COUNTRY_PRESETS[region.countryCode];

  return {
    taxRatePct: region.taxRateDefault,
    commercialRoundingIncrement: preset.commercialRoundingIncrement,
  };
}
