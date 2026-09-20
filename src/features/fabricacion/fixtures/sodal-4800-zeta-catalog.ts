export const SODAL_4800_CATALOG_KEY = "ventora:serie-4800-corredera-2h";

export const SODAL_4800_OBSERVED_MEASURES = [
  { leaves: 2 as const, widthMm: 1800, heightMm: 1500, planId: "PA-56" },
  { leaves: 3 as const, widthMm: 3000, heightMm: 1500, planId: "PA-54" },
] as const;

export const SODAL_4800_CONFIRMED_RECIPE_IDS = [
  "monolitico_2h_1800x1500",
  "monolitico_3h_3000x1500",
] as const;

export type Sodal4800ConfirmedRecipeId = (typeof SODAL_4800_CONFIRMED_RECIPE_IDS)[number];

/**
 * Identificador puro de procedencia. Se mantiene en este módulo sin imports de
 * evidencia ni filesystem porque el resolver también se usa desde componentes
 * cliente.
 */
export function isZeta4800SourceReference(
  sourceReference: string | null | undefined,
): boolean {
  return (sourceReference ?? "").startsWith("zeta:confirmed:sodal/4800/");
}

export function isObservedSodal4800Measure(input: {
  leaves: number;
  widthMm: number;
  heightMm: number;
}): boolean {
  return SODAL_4800_OBSERVED_MEASURES.some(
    (measure) =>
      measure.leaves === input.leaves &&
      measure.widthMm === input.widthMm &&
      measure.heightMm === input.heightMm
  );
}
