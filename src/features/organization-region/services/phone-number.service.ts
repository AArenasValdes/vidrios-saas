import { getCountryPreset } from "@/features/organization-region/services/organization-region.service";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Conserva solo numeros E.164 plausibles; no reemplaza una validacion telecom por pais. */
export function normalizePhoneToE164(
  input: string,
  countryCode: SupportedCountryCode | string = "CL"
): string | null {
  const raw = input.trim();
  const preset = getCountryPreset(countryCode);
  const digits = digitsOnly(raw.startsWith("00") ? raw.slice(2) : raw);

  if (!digits) return null;

  const international = raw.startsWith("+") || raw.startsWith("00");
  const localDigits = international
    ? digits
    : `${preset.phoneCountryCode.slice(1)}${digits.replace(/^0/, "")}`;

  return /^[1-9]\d{7,14}$/.test(localDigits) ? `+${localDigits}` : null;
}
