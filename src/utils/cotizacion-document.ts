function toTrimmedString(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeDocumentOptionalText(value: string | null | undefined) {
  return toTrimmedString(value);
}

export function normalizeDocumentText(
  value: string | null | undefined,
  fallback: string
) {
  const normalized = toTrimmedString(value);

  return normalized || fallback;
}

export function truncateDocumentText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function buildDocumentCompanyName(value: string | null | undefined) {
  return normalizeDocumentText(value, "Mi empresa");
}

export function buildDocumentInitials(value: string | null | undefined) {
  const companyName = buildDocumentCompanyName(value);
  const words = companyName.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "ME";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function buildDocumentContactLine(
  parts: Array<string | null | undefined>,
  separator = " | "
) {
  return parts
    .map((part) => normalizeDocumentOptionalText(part))
    .filter(Boolean)
    .join(separator);
}

export function resolveDocumentPaymentTerms(value: string | null | undefined) {
  return normalizeDocumentText(value, "Por definir con la empresa");
}

export function resolveDocumentConditionsText(
  value: string | null | undefined
) {
  return normalizeDocumentText(value, "Sin observaciones adicionales.");
}

export function formatDocumentCompanyPhoneNumber(phone: string | null | undefined) {
  const normalizedPhone = normalizeDocumentOptionalText(phone);
  const digits = normalizedPhone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const normalized = digits.startsWith("56")
    ? digits
    : digits.startsWith("9") && digits.length === 9
      ? `56${digits}`
      : digits;

  if (normalized.length === 11 && normalized.startsWith("569")) {
    return `+56 9 ${normalized.slice(3, 7)} ${normalized.slice(7)}`;
  }

  return normalizedPhone;
}
