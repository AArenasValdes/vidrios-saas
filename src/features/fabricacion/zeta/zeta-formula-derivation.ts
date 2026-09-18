import type {
  FabricacionBaseMedida,
  FabricacionReglaMedida,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  ConfirmedRecipe,
  GlassMeasureObservation,
  ProfileMeasureObservation,
} from "@/features/fabricacion/zeta/zeta-types";

type MeasureObservation = {
  widthMm: number;
  heightMm: number;
  leaves: number;
  lengthMm: number;
};

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function baseValueForObservation(
  base: FabricacionBaseMedida,
  observation: MeasureObservation
): number {
  switch (base) {
    case "ancho_total":
      return observation.widthMm;
    case "alto_total":
      return observation.heightMm;
    case "ancho_por_hoja":
      return observation.widthMm / observation.leaves;
    case "alto_por_hoja":
      return observation.heightMm;
    case "fijo_mm":
      return observation.lengthMm;
    default:
      return 0;
  }
}

function evaluateReglaMedida(
  regla: FabricacionReglaMedida,
  observation: MeasureObservation
): number {
  const base = baseValueForObservation(regla.base, observation);
  const multiplicador = regla.multiplicador ?? 1;
  const ajuste = regla.ajusteMm ?? 0;
  if (regla.base === "fijo_mm") {
    return Math.round(regla.valorFijoMm ?? 0);
  }
  return Math.round(base * multiplicador + ajuste);
}

function matchesAllObservations(
  regla: FabricacionReglaMedida,
  observations: MeasureObservation[]
): boolean {
  return observations.every(
    (observation) => evaluateReglaMedida(regla, observation) === observation.lengthMm
  );
}

function inferProfileRole(code: string): FabricacionBaseMedida {
  if (code.startsWith("2501") || code.startsWith("2502")) return "ancho_total";
  if (code.startsWith("2503") || code.startsWith("2509")) return "alto_total";
  if (/^(2506|2507|2510|2518|2519|2529|2530)/.test(code)) return "alto_total";
  return "ancho_por_hoja";
}

function buildCandidateRules(
  observations: MeasureObservation[],
  profileCode: string
): FabricacionReglaMedida[] {
  const candidates: FabricacionReglaMedida[] = [];
  const lengths = uniqueSorted(observations.map((item) => item.lengthMm));
  if (lengths.length === 1) {
    candidates.push({ base: "fijo_mm", valorFijoMm: lengths[0] });
  }

  const bases: FabricacionBaseMedida[] = [
    "ancho_total",
    "alto_total",
    "ancho_por_hoja",
    "alto_por_hoja",
  ];

  for (const base of bases) {
    const offsets = observations.map(
      (observation) => observation.lengthMm - baseValueForObservation(base, observation)
    );
    if (uniqueSorted(offsets).length === 1) {
      candidates.push({ base, ajusteMm: offsets[0] });
    }
  }

  if (observations.length === 1) {
    const observation = observations[0]!;
    const preferredBase = inferProfileRole(profileCode);
    candidates.push({
      base: preferredBase,
      ajusteMm:
        observation.lengthMm - baseValueForObservation(preferredBase, observation),
    });
  }

  return candidates;
}

export class ZetaFormulaDerivationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZetaFormulaDerivationConflictError";
  }
}

export function deriveProfileMeasureRule(
  observations: ProfileMeasureObservation[]
): FabricacionReglaMedida {
  if (observations.length === 0) {
    throw new ZetaFormulaDerivationConflictError("Sin observaciones de perfil.");
  }

  const profileCode = observations[0]?.code ?? "";
  const measureObservations = observations.map((item) => ({
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    leaves: item.leaves,
    lengthMm: item.lengthMm,
  }));

  const candidates = buildCandidateRules(measureObservations, profileCode);
  const matching = candidates.filter((candidate) =>
    matchesAllObservations(candidate, measureObservations)
  );

  if (matching.length === 0) {
    throw new ZetaFormulaDerivationConflictError(
      `No hay regla unívoca para perfil ${profileCode} (${observations
        .map((item) => `${item.recipeId}:${item.lengthMm}`)
        .join(", ")}).`
    );
  }

  const preferredOrder: FabricacionBaseMedida[] = [
    "ancho_total",
    "ancho_por_hoja",
    "alto_total",
    "alto_por_hoja",
    "fijo_mm",
  ];
  matching.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.base);
    const rightIndex = preferredOrder.indexOf(right.base);
    return leftIndex - rightIndex;
  });

  return matching[0]!;
}

export function deriveGlassMeasureRule(
  observations: GlassMeasureObservation[],
  dimension: "width" | "height"
): FabricacionReglaMedida {
  if (observations.length === 0) {
    throw new ZetaFormulaDerivationConflictError("Sin observaciones de vidrio.");
  }

  const measureObservations = observations.map((item) => ({
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    leaves: item.leaves,
    lengthMm: dimension === "width" ? item.pieceWidthMm : item.pieceHeightMm,
  }));

  const candidates = buildCandidateRules(measureObservations, "glass");
  const matching = candidates.filter((candidate) =>
    matchesAllObservations(candidate, measureObservations)
  );

  if (matching.length === 0) {
    throw new ZetaFormulaDerivationConflictError(
      `No hay regla unívoca para vidrio ${dimension} (${observations
        .map((item) =>
          `${item.recipeId}:${dimension === "width" ? item.pieceWidthMm : item.pieceHeightMm}`
        )
        .join(", ")}).`
    );
  }

  const preferredOrder: FabricacionBaseMedida[] = [
    "ancho_por_hoja",
    "ancho_total",
    "alto_total",
    "fijo_mm",
  ];
  matching.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.base);
    const rightIndex = preferredOrder.indexOf(right.base);
    return leftIndex - rightIndex;
  });

  return matching[0]!;
}

export function deriveFormulasFromConfirmedFamily(input: {
  canonicalRecipeId: string;
  evidenceRecipeIds: string[];
  confirmedById: Map<string, ConfirmedRecipe>;
}): {
  profileRules: FabricacionReglaMedida[];
  glassRules: Array<{ width: FabricacionReglaMedida; height: FabricacionReglaMedida }>;
} {
  const canonical = input.confirmedById.get(input.canonicalRecipeId);
  if (!canonical) {
    throw new Error(`Receta canónica no encontrada: ${input.canonicalRecipeId}`);
  }

  const evidenceRecipes = input.evidenceRecipeIds
    .map((recipeId) => input.confirmedById.get(recipeId))
    .filter((recipe): recipe is ConfirmedRecipe => Boolean(recipe));

  const profileRules = canonical.profiles.map((profile, profileIndex) => {
    const observations: ProfileMeasureObservation[] = [];
    for (const recipe of evidenceRecipes) {
      if (recipe.leaves !== canonical.leaves) continue;
      const observed = recipe.profiles[profileIndex];
      if (!observed) continue;
      if (observed.code !== profile.code || observed.quantity !== profile.quantity) {
        continue;
      }
      observations.push({
        recipeId: recipe.id,
        widthMm: recipe.testDimensions.widthMm,
        heightMm: recipe.testDimensions.heightMm,
        leaves: recipe.leaves,
        lengthMm: observed.lengthMm,
        quantity: observed.quantity,
        code: observed.code,
        profileIndex,
      });
    }

    if (observations.length === 0) {
      observations.push({
        recipeId: canonical.id,
        widthMm: canonical.testDimensions.widthMm,
        heightMm: canonical.testDimensions.heightMm,
        leaves: canonical.leaves,
        lengthMm: profile.lengthMm,
        quantity: profile.quantity,
        code: profile.code,
        profileIndex,
      });
    }

    return deriveProfileMeasureRule(observations);
  });

  const glassRules = canonical.glass.map((piece, glassIndex) => {
    const observations: GlassMeasureObservation[] = [];
    for (const recipe of evidenceRecipes) {
      if (recipe.leaves !== canonical.leaves) continue;
      const observed = recipe.glass[glassIndex];
      if (!observed) continue;
      if (observed.code !== piece.code || observed.quantity !== piece.quantity) {
        continue;
      }
      observations.push({
        recipeId: recipe.id,
        widthMm: recipe.testDimensions.widthMm,
        heightMm: recipe.testDimensions.heightMm,
        leaves: recipe.leaves,
        pieceWidthMm: observed.widthMm,
        pieceHeightMm: observed.heightMm,
        quantity: observed.quantity,
        code: observed.code,
        glassIndex,
      });
    }

    if (observations.length === 0) {
      observations.push({
        recipeId: canonical.id,
        widthMm: canonical.testDimensions.widthMm,
        heightMm: canonical.testDimensions.heightMm,
        leaves: canonical.leaves,
        pieceWidthMm: piece.widthMm,
        pieceHeightMm: piece.heightMm,
        quantity: piece.quantity,
        code: piece.code,
        glassIndex,
      });
    }

    return {
      width: deriveGlassMeasureRule(observations, "width"),
      height: deriveGlassMeasureRule(observations, "height"),
    };
  });

  return { profileRules, glassRules };
}
