/** Prefix reserved for database keys that identify private workshop rows, not supplier SKUs. */
export const INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX = "ventora-internal:";

export function isGeneratedWorkshopPresentationKey(value: string | null | undefined): boolean {
  return value?.startsWith(INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX) === true;
}
