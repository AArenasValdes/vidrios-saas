import {
  getCountryPreset,
  normalizeSupportedCountryCode,
} from "@/features/organization-region/services/organization-region.service";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";

const LOCAL_MOBILE_PATTERNS: Partial<Record<SupportedCountryCode, RegExp>> = {
  CL: /^9\d{8}$/,
  AR: /^9\d{8,10}$/,
  CO: /^3\d{9}$/,
  MX: /^\d{10}$/,
  PE: /^9\d{8}$/,
  UY: /^9\d{7}$/,
};

function normalizePhoneInput(value: string) {
  return value.normalize("NFKC").trim();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isValidLocalMobileDigits(
  localDigits: string,
  countryCode: SupportedCountryCode | string,
) {
  const pattern =
    LOCAL_MOBILE_PATTERNS[normalizeSupportedCountryCode(countryCode)];
  if (!pattern) {
    return localDigits.length >= 8 && localDigits.length <= 15;
  }
  return pattern.test(localDigits);
}

/** Deja solo la parte local del telefono cuando el usuario pega o escribe con prefijo. */
export function extractLocalPhoneDigits(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string {
  const trimmed = normalizePhoneInput(input);
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

  const digits = digitsOnly(normalized).replace(/^0/, "");
  if (digits.startsWith(countryDigits)) {
    const remainder = digits.slice(countryDigits.length).replace(/^0/, "");
    if (isValidLocalMobileDigits(remainder, countryCode)) {
      return remainder;
    }
  }

  return digits;
}

/** Arma E.164 desde la parte local visible del input de registro. */
export function buildPhoneE164FromLocalDigits(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string | null {
  const localDigits = extractLocalPhoneDigits(input, countryCode);
  if (!localDigits || !isValidLocalMobileDigits(localDigits, countryCode)) {
    return null;
  }

  const preset = getCountryPreset(countryCode);
  const e164Digits = `${preset.phoneCountryCode.slice(1)}${localDigits.replace(/^0/, "")}`;

  return /^[1-9]\d{7,14}$/.test(e164Digits) ? `+${e164Digits}` : null;
}

/** Variante explicita para formularios con prefijo fijo fuera del input. */
export function composeAuthWhatsappFromLocalInput(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string | null {
  return buildPhoneE164FromLocalDigits(input, countryCode);
}

export function ensureAuthWhatsappE164(value: string): string | null {
  const trimmed = normalizePhoneInput(value);
  if (!trimmed) return null;
  const normalized = trimmed.startsWith("+")
    ? trimmed
    : `+${trimmed.replace(/^\+/, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

/** Conserva solo numeros E.164 plausibles; no reemplaza una validacion telecom por pais. */
export function normalizePhoneToE164(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string | null {
  const raw = normalizePhoneInput(input);
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
  const trimmed = normalizePhoneInput(input);
  if (!trimmed) return null;

  const fromLocal = composeAuthWhatsappFromLocalInput(trimmed, countryCode);
  if (fromLocal) return fromLocal;

  const fromE164 = ensureAuthWhatsappE164(trimmed);
  if (fromE164) return fromE164;

  const preset = getCountryPreset(countryCode);
  const candidates = [
    trimmed,
    `${preset.phoneCountryCode} ${trimmed}`,
    `${preset.phoneCountryCode}${trimmed}`,
  ];

  for (const candidate of candidates) {
    const normalized =
      normalizePhoneToE164(candidate, countryCode) ??
      ensureAuthWhatsappE164(candidate);
    if (normalized) return normalized;
  }

  return null;
}

/** Resuelve WhatsApp para signup probando local antes que E.164 ya compuesto. */
export function resolveSignupWhatsapp(
  whatsapp: string,
  whatsappLocal: string,
  countryCode: SupportedCountryCode | string = "CL",
): string | null {
  const localCandidates = [whatsappLocal, whatsapp].filter(Boolean);

  for (const candidate of localCandidates) {
    const fromLocal = composeAuthWhatsappFromLocalInput(candidate, countryCode);
    if (fromLocal) return fromLocal;
  }

  for (const candidate of [whatsapp, whatsappLocal].filter(Boolean)) {
    const resolved = resolveAuthWhatsapp(candidate, countryCode);
    if (resolved) return resolved;
  }

  return null;
}

export function getWhatsappValidationHint(
  countryCode: SupportedCountryCode | string = "CL",
  localInput = "",
): string {
  const preset = getCountryPreset(countryCode);
  const example = preset.phonePlaceholder.replace(/^\+\d+\s*/u, "");
  const trimmedInput = normalizePhoneInput(localInput);

  if (!trimmedInput) {
    return `Ingresa tu numero movil para ${preset.label}. Ejemplo: ${example}. El prefijo ${preset.phoneCountryCode} ya esta incluido.`;
  }

  if (resolveAuthWhatsapp(trimmedInput, countryCode)) {
    return "No pudimos confirmar tu WhatsApp en este momento. Verifica el numero e intenta de nuevo.";
  }

  const localDigits = extractLocalPhoneDigits(trimmedInput, countryCode);
  if (!localDigits) {
    return `Ingresa tu numero movil para ${preset.label}. Ejemplo: ${example}. El prefijo ${preset.phoneCountryCode} ya esta incluido.`;
  }

  return `El numero ingresado no es valido para ${preset.label}. Ejemplo: ${example}. El prefijo ${preset.phoneCountryCode} ya esta incluido.`;
}

export function sanitizeAuthWhatsappLocalInput(value: string) {
  return value.normalize("NFKC").replace(/[^\d\s()-]/g, "");
}
