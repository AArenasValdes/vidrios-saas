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
  const regexPass = /^[1-9]\d{7,14}$/.test(e164Digits);

  // #region agent log
  if (!regexPass || !localDigits) {
    fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6b77cd",
      },
      body: JSON.stringify({
        sessionId: "6b77cd",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "phone-number.service.ts:buildPhoneE164FromLocalDigits",
        message: "compose failed",
        data: {
          countryCode,
          inputLen: input.trim().length,
          localDigitCount: localDigits.length,
          e164DigitCount: e164Digits.length,
          regexPass,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  return regexPass ? `+${e164Digits}` : null;
}

/** Variante explicita para formularios con prefijo fijo fuera del input. */
export function composeAuthWhatsappFromLocalInput(
  input: string,
  countryCode: SupportedCountryCode | string = "CL",
): string | null {
  return buildPhoneE164FromLocalDigits(input, countryCode);
}

export function ensureAuthWhatsappE164(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/^\+/, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
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

  const fromLocal = composeAuthWhatsappFromLocalInput(trimmed, countryCode);
  if (fromLocal) return fromLocal;

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

export function getWhatsappValidationHint(
  countryCode: SupportedCountryCode | string = "CL",
  localInput = "",
): string {
  const preset = getCountryPreset(countryCode);
  const example = preset.phonePlaceholder.replace(/^\+\d+\s*/u, "");
  const localDigits = extractLocalPhoneDigits(localInput, countryCode);

  if (!localDigits) {
    return `Ingresa tu numero movil para ${preset.label}. Ejemplo: ${example}. El prefijo ${preset.phoneCountryCode} ya esta incluido.`;
  }

  return `El numero ingresado no es valido para ${preset.label}. Ejemplo: ${example}. El prefijo ${preset.phoneCountryCode} ya esta incluido.`;
}
