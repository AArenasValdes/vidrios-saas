import {
  deriveProfileMeasureRule,
  ZetaFormulaDerivationConflictError,
} from "@/features/fabricacion/zeta/zeta-formula-derivation";
import type { ProfileMeasureObservation } from "@/features/fabricacion/zeta/zeta-types";

function observation(
  code: string,
  lengthMm: number,
  extra?: Partial<ProfileMeasureObservation>
): ProfileMeasureObservation {
  return {
    recipeId: extra?.recipeId ?? "monolitico_pierna_abierta_reforzada_2h_1800x1500",
    widthMm: extra?.widthMm ?? 1800,
    heightMm: extra?.heightMm ?? 1500,
    leaves: extra?.leaves ?? 2,
    lengthMm,
    quantity: extra?.quantity ?? 2,
    code,
    profileIndex: extra?.profileIndex ?? 0,
  };
}

describe("deriveProfileMeasureRule SODAL L25", () => {
  it("asigna alto_total a jamba 2503 y no ancho_total", () => {
    const rule = deriveProfileMeasureRule([observation("2503", 1500, { quantity: 2 })]);
    expect(rule).toEqual({ base: "alto_total", ajusteMm: 0 });
  });

  it("asigna alto_total a pierna reforzada 2512R", () => {
    const rule = deriveProfileMeasureRule([observation("2512R", 1465)]);
    expect(rule).toEqual({ base: "alto_total", ajusteMm: -35 });
  });

  it("asigna ancho_por_hoja a cabezal 2504", () => {
    const rule = deriveProfileMeasureRule([observation("2504", 888)]);
    expect(rule).toEqual({ base: "ancho_por_hoja", ajusteMm: -12 });
  });

  it("asigna ancho_total a riel 2501", () => {
    const rule = deriveProfileMeasureRule([observation("2501", 1784, { quantity: 1 })]);
    expect(rule).toEqual({ base: "ancho_total", ajusteMm: -16 });
  });

  it("falla si el código no tiene rol explícito", () => {
    expect(() => deriveProfileMeasureRule([observation("9999", 1000)])).toThrow(
      ZetaFormulaDerivationConflictError
    );
  });

  it("ignora extra 2400 incompatible y conserva riel canónico", () => {
    const rule = deriveProfileMeasureRule(
      [
        observation("2501", 2984, {
          recipeId: "monolitico_pierna_abierta_3h_3000x1500",
          widthMm: 3000,
          leaves: 3,
          quantity: 1,
        }),
        observation("2501", 2984, {
          recipeId: "monolitico_pierna_abierta_3h_2400x1500",
          widthMm: 2400,
          leaves: 3,
          quantity: 1,
        }),
      ],
      { canonicalRecipeId: "monolitico_pierna_abierta_3h_3000x1500" }
    );
    expect(rule).toEqual({ base: "ancho_total", ajusteMm: -16 });
  });
});
