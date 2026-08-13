export const LATAM_COUNTRY_OPTIONS = [
  { code: "CL", label: "Chile", dial: "56", placeholder: "+56 9 1234 5678" },
  { code: "AR", label: "Argentina", dial: "54", placeholder: "+54 11 1234 5678" },
  { code: "CO", label: "Colombia", dial: "57", placeholder: "+57 300 123 4567" },
  { code: "MX", label: "México", dial: "52", placeholder: "+52 55 1234 5678" },
  { code: "PE", label: "Perú", dial: "51", placeholder: "+51 912 345 678" },
  { code: "UY", label: "Uruguay", dial: "598", placeholder: "+598 94 123 456" },
] as const;

export type LatamCountryCode = (typeof LATAM_COUNTRY_OPTIONS)[number]["code"];

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeLatamCountryCode(
  value: string | null | undefined
): LatamCountryCode {
  const normalized = (value ?? "CL").trim().toUpperCase();
  return LATAM_COUNTRY_OPTIONS.some((item) => item.code === normalized)
    ? (normalized as LatamCountryCode)
    : "CL";
}

export function getLatamCountryOption(countryCode: string | null | undefined) {
  const code = normalizeLatamCountryCode(countryCode);
  return LATAM_COUNTRY_OPTIONS.find((item) => item.code === code) ?? LATAM_COUNTRY_OPTIONS[0];
}

/** Normaliza a E.164 para los mercados Latam de Ventora. */
export function normalizeLatamMobilePhone(
  input: string,
  countryCode: string | null | undefined = "CL"
): string | null {
  const raw = input.trim();
  const option = getLatamCountryOption(countryCode);
  const digits = digitsOnly(raw.startsWith("00") ? raw.slice(2) : raw);

  if (!digits) {
    return null;
  }

  const international = raw.startsWith("+") || raw.startsWith("00");
  const localDigits = international
    ? digits
    : `${option.dial}${digits.replace(/^0/, "")}`;

  return /^[1-9]\d{7,14}$/.test(localDigits) ? `+${localDigits}` : null;
}

export function isValidLatamMobilePhone(
  input: string,
  countryCode: string | null | undefined = "CL"
): boolean {
  return normalizeLatamMobilePhone(input, countryCode) !== null;
}
