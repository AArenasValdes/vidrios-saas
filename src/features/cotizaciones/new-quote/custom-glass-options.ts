const CUSTOM_GLASS_STORAGE_PREFIX = "vidrios-saas:custom-glass-options:";
const FALLBACK_STORAGE_SCOPE = "local";
const MAX_CUSTOM_GLASS_OPTIONS = 80;
const MAX_CUSTOM_GLASS_LENGTH = 80;

function getStorageScope(organizationId: string | number | null | undefined) {
  const normalized = organizationId === null || organizationId === undefined ? "" : String(organizationId).trim();
  return normalized || FALLBACK_STORAGE_SCOPE;
}

function getStorageKey(organizationId: string | number | null | undefined) {
  return `${CUSTOM_GLASS_STORAGE_PREFIX}${getStorageScope(organizationId)}`;
}

export function normalizeCustomGlassValue(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_CUSTOM_GLASS_LENGTH);
}

function normalizeComparableGlassValue(value: string) {
  return normalizeCustomGlassValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function hasGlassOption(
  options: readonly string[],
  value: string
) {
  const comparableValue = normalizeComparableGlassValue(value);

  if (!comparableValue) {
    return false;
  }

  return options.some((option) => normalizeComparableGlassValue(option) === comparableValue);
}

export function mergeGlassOptions(
  baseOptions: readonly string[],
  customOptions: readonly string[]
) {
  const merged = [...baseOptions];

  for (const option of customOptions) {
    const normalized = normalizeCustomGlassValue(option);

    if (normalized && !hasGlassOption(merged, normalized)) {
      merged.push(normalized);
    }
  }

  return merged;
}

export function readCustomGlassOptions(
  organizationId: string | number | null | undefined
) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(organizationId));
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map(normalizeCustomGlassValue)
      .filter(Boolean)
      .slice(0, MAX_CUSTOM_GLASS_OPTIONS);
  } catch {
    return [];
  }
}

export function writeCustomGlassOptions(
  organizationId: string | number | null | undefined,
  options: readonly string[]
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getStorageKey(organizationId),
      JSON.stringify(options.slice(0, MAX_CUSTOM_GLASS_OPTIONS))
    );
  } catch {
    // Best effort: la cotizacion igual conserva el vidrio seleccionado.
  }
}

export function saveCustomGlassOption(
  organizationId: string | number | null | undefined,
  currentOptions: readonly string[],
  value: string
) {
  const normalized = normalizeCustomGlassValue(value);

  if (!normalized) {
    return currentOptions;
  }

  if (hasGlassOption(currentOptions, normalized)) {
    return currentOptions;
  }

  const nextOptions = [normalized, ...currentOptions].slice(0, MAX_CUSTOM_GLASS_OPTIONS);
  writeCustomGlassOptions(organizationId, nextOptions);

  return nextOptions;
}
