import { getCountryPreset } from "@/features/organization-region/services/organization-region.service";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Deja solo la parte local del telefono cuando el usuario pega o escribe con prefijo. */
export function extractLocalPhoneDigits(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const preset = getCountryPreset(countryCode);
  const countryDigits = preset.phoneCountryCode.slice(1);
  const normalized = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;

  if (normalized.startsWith(preset.phoneCountryCode)) {
    return digitsOnly(normalized.slice(preset.phoneCountryCode.length)).replace(
      /^0/,
      "",
    );
  }

  if (normalized.startsWith("+")) {
    const internationalDigits = digitsOnly(normalized);
    if (internationalDigits.startsWith(countryDigits)) {
      return internationalDigits.slice(countryDigits.length).replace(/^0/, "");
    }
    return internationalDigits;
  }

  return digitsOnly(normalized).replace(/^0/, "");
}

/** Arma E.164 desde la parte local visible del input de registro. */
export function buildPhoneE164FromLocalDigits(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string | null {
  const localDigits = extractLocalPhoneDigits(input, countryCode);
  if (!localDigits) return null;

  const preset = getCountryPreset(countryCode);
  const e164Digits = `${preset.phoneCountryCode.slice(1)}${localDigits.replace(/^0/, "")}`;

  return /^[1-9]\d{7,14}$/.test(e164Digits) ? `+${e164Digits}` : null;
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

/** Resuelve WhatsApp para auth usando varios formatos de entrada habituales. */
export function resolveAuthWhatsapp(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const preset = getCountryPreset(countryCode);
  const candidates = [
    trimmed,
    `${preset.phoneCountryCode} ${trimmed}`,
    `${preset.phoneCountryCode}${trimmed}`,
    extractLocalPhoneDigits(trimmed, countryCode),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized =
      buildPhoneE164FromLocalDigits(candidate, countryCode) ??
      normalizePhoneToE164(candidate, countryCode);
    if (normalized) return normalized;
  }

  return null;
}

export function getWhatsappValidationHint(
  countryCode: SupportedCountryCode | string = "CL",
): string {
  const preset = getCountryPreset(countryCode);
  const example = preset.phonePlaceholder.replace(/^\+\d+\s*/u, "");
  return `Ingresa un WhatsApp valido para ${preset.label}. Ejemplo: ${example}. No incluyas el prefijo ${preset.phoneCountryCode}; ya aparece en el campo.`;
}
