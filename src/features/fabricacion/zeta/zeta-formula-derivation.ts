import type {
  FabricacionBaseMedida,
  FabricacionReglaMedida,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
  classifySodalL25ProfileRole,
  type SodalL25ProfileRole,
} from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import type {
  ConfirmedRecipe,
  GlassMeasureObservation,
  ProfileMeasureObservation,
} from "@/features/fabricacion/zeta/zeta-types";

type MeasureObservation = {
  recipeId?: string;
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
  if (regla.base === "fijo_mm") {
    return Math.round(regla.valorFijoMm ?? 0);
  }
  const base = baseValueForObservation(regla.base, observation);
  const multiplicador = regla.multiplicador ?? 1;
  const ajuste = regla.ajusteMm ?? 0;
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

function ruleFromBase(
  base: FabricacionBaseMedida,
  observations: MeasureObservation[]
): FabricacionReglaMedida | null {
  if (observations.length === 0) return null;
  const offsets = observations.map(
    (observation) => observation.lengthMm - baseValueForObservation(base, observation)
  );
  const unique = uniqueSorted(offsets);
  if (unique.length !== 1) return null;
  return { base, ajusteMm: unique[0] };
}

function requiredBasesForRole(role: SodalL25ProfileRole): FabricacionBaseMedida[] {
  if (role === "frame_width") return ["ancho_total"];
  if (role === "frame_height" || role === "sash_height") return ["alto_total"];
  return ["ancho_por_hoja", "ancho_total"];
}

function compatibleObservationsForRole(input: {
  role: SodalL25ProfileRole;
  observations: MeasureObservation[];
  canonicalRecipeId?: string;
}): MeasureObservation[] {
  const { observations, canonicalRecipeId } = input;
  if (observations.length <= 1) return observations;

  const canonical =
    observations.find((item) => item.recipeId === canonicalRecipeId) ?? observations[0]!;
  const kept: MeasureObservation[] = [canonical];

  for (const observation of observations) {
    if (observation === canonical) continue;
    const stillMatches = requiredBasesForRole(input.role).some((base) =>
      Boolean(ruleFromBase(base, [canonical, observation]))
    );
    if (stillMatches) kept.push(observation);
  }

  return kept;
}

function pickUnambiguousRule(
  matching: FabricacionReglaMedida[],
  profileCode: string,
  preferredBases: FabricacionBaseMedida[]
): FabricacionReglaMedida {
  const withoutFixed = matching.filter((item) => item.base !== "fijo_mm");
  const pool = withoutFixed.length > 0 ? withoutFixed : matching;
  if (pool.length === 1) return pool[0]!;

  for (const base of preferredBases) {
    const preferred = pool.find((item) => item.base === base);
    if (preferred) return preferred;
  }

  const ranked = [...pool].sort((left, right) => {
    const leftAbs = Math.abs(left.ajusteMm ?? 0);
    const rightAbs = Math.abs(right.ajusteMm ?? 0);
    return leftAbs - rightAbs;
  });

  const bestAbs = Math.abs(ranked[0]?.ajusteMm ?? 0);
  const tied = ranked.filter((item) => Math.abs(item.ajusteMm ?? 0) === bestAbs);
  if (tied.length !== 1) {
    throw new ZetaFormulaDerivationConflictError(
      `Regla ambigua para perfil ${profileCode}: ${tied
        .map((item) => `${item.base}:${item.ajusteMm ?? 0}`)
        .join(", ")}.`
    );
  }
  return tied[0]!;
}

export class ZetaFormulaDerivationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZetaFormulaDerivationConflictError";
  }
}

export function deriveProfileMeasureRule(
  observations: ProfileMeasureObservation[],
  options?: { canonicalRecipeId?: string }
): FabricacionReglaMedida {
  if (observations.length === 0) {
    throw new ZetaFormulaDerivationConflictError("Sin observaciones de perfil.");
  }

  const profileCode = observations[0]?.code ?? "";
  const role = classifySodalL25ProfileRole(profileCode);
  if (!role) {
    throw new ZetaFormulaDerivationConflictError(
      `Perfil L25 sin rol explícito: ${profileCode}. No se elige una base arbitraria.`
    );
  }

  const measureObservations: MeasureObservation[] = observations.map((item) => ({
    recipeId: item.recipeId,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    leaves: item.leaves,
    lengthMm: item.lengthMm,
  }));
  const usable = compatibleObservationsForRole({
    role,
    observations: measureObservations,
    canonicalRecipeId: options?.canonicalRecipeId,
  });

  const matching: FabricacionReglaMedida[] = [];
  for (const base of requiredBasesForRole(role)) {
    const rule = ruleFromBase(base, usable);
    if (rule && matchesAllObservations(rule, usable)) matching.push(rule);
  }

  if (matching.length === 0 && role === "sash_width") {
    const lengths = uniqueSorted(usable.map((item) => item.lengthMm));
    if (lengths.length === 1) {
      matching.push({ base: "fijo_mm", valorFijoMm: lengths[0] });
    }
  }

  if (matching.length === 0) {
    throw new ZetaFormulaDerivationConflictError(
      `No hay regla unívoca de rol ${role} para perfil ${profileCode} (${observations
        .map((item) => `${item.recipeId}:${item.lengthMm}`)
        .join(", ")}).`
    );
  }

  return pickUnambiguousRule(matching, profileCode, requiredBasesForRole(role));
}

export function deriveGlassMeasureRule(
  observations: GlassMeasureObservation[],
  dimension: "width" | "height",
  options?: { canonicalRecipeId?: string }
): FabricacionReglaMedida {
  if (observations.length === 0) {
    throw new ZetaFormulaDerivationConflictError("Sin observaciones de vidrio.");
  }

  const role: SodalL25ProfileRole = dimension === "width" ? "sash_width" : "sash_height";
  const measureObservations: MeasureObservation[] = observations.map((item) => ({
    recipeId: item.recipeId,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    leaves: item.leaves,
    lengthMm: dimension === "width" ? item.pieceWidthMm : item.pieceHeightMm,
  }));
  const usable = compatibleObservationsForRole({
    role,
    observations: measureObservations,
    canonicalRecipeId: options?.canonicalRecipeId,
  });

  const matching: FabricacionReglaMedida[] = [];
  for (const base of requiredBasesForRole(role)) {
    const rule = ruleFromBase(base, usable);
    if (rule && matchesAllObservations(rule, usable)) matching.push(rule);
  }

  if (matching.length === 0) {
    throw new ZetaFormulaDerivationConflictError(
      `No hay regla unívoca para vidrio ${dimension} (${observations
        .map((item) =>
          `${item.recipeId}:${dimension === "width" ? item.pieceWidthMm : item.pieceHeightMm}`
        )
        .join(", ")}).`
    );
  }

  return pickUnambiguousRule(matching, `glass:${dimension}`, requiredBasesForRole(role));
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

    return deriveProfileMeasureRule(observations, { canonicalRecipeId: canonical.id });
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
      width: deriveGlassMeasureRule(observations, "width", {
        canonicalRecipeId: canonical.id,
      }),
      height: deriveGlassMeasureRule(observations, "height", {
        canonicalRecipeId: canonical.id,
      }),
    };
  });

  return { profileRules, glassRules };
}
