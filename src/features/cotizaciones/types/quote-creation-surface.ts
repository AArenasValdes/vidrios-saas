export const QUOTE_CREATION_SURFACE_OPTIONS = [
  "desktop_constructor",
  "desktop_guiada",
  "mobile_constructor",
  "mobile_guiada",
  "total_global",
] as const;

export type QuoteCreationSurface = (typeof QUOTE_CREATION_SURFACE_OPTIONS)[number];

export function normalizeQuoteCreationSurface(
  value: string | null | undefined
): QuoteCreationSurface | null {
  return QUOTE_CREATION_SURFACE_OPTIONS.includes(value as QuoteCreationSurface)
    ? (value as QuoteCreationSurface)
    : null;
}
