export const QUOTE_CREATION_SURFACE_OPTIONS = [
  "desktop_rapida",
  "desktop_guiada",
  "mobile_por_items",
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
