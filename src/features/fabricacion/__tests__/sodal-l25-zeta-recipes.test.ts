import { calcularCubicacionYPauta, validarRecetaFabricacion } from "@/features/fabricacion";
import {
  buildAllSodalL25Recipes,
  findSodalL25BundleForTestEvidence,
  SODAL_L25_CANONICAL_RECIPE_IDS,
  SODAL_L25_EXTRA_GEOMETRY_TEST_IDS,
  SODAL_L25_GATE_TEST_IDS,
  resolveSodalL25IdentityFromRecipeId,
  isValidSodalL25Combination,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { loadConfirmedRecipeById } from "@/features/fabricacion/zeta/zeta-confirmed-loader";

function profileKey(code: string, quantity: number, lengthMm: number) {
  return `${code}|${quantity}|${lengthMm}`;
}

function glassKey(code: string, quantity: number, widthMm: number, heightMm: number) {
  return `${code}|${quantity}|${widthMm}x${heightMm}`;
}

describe("SODAL L25 recetas Zeta", () => {
  it("expone 18 recetas canónicas únicas por identidad", () => {
    const bundles = buildAllSodalL25Recipes();
    expect(bundles).toHaveLength(18);
    const slugs = bundles.map((bundle) => `${bundle.identity.variantSlug}:${bundle.identity.leaves}`);
    expect(new Set(slugs).size).toBe(18);
  });

  it("rechaza combinaciones inválidas closed+reinforced", () => {
    expect(
      isValidSodalL25Combination({
        glazing: "dvh",
        leg: "closed",
        reinforcement: "reinforced",
      })
    ).toBe(false);
  });

  it.each(SODAL_L25_CANONICAL_RECIPE_IDS)(
    "canónico %s valida schema y reproduce Zeta @ 0 mm",
    (recipeId) => {
      const confirmed = loadConfirmedRecipeById(recipeId);
      expect(confirmed).not.toBeNull();
      const bundle = buildAllSodalL25Recipes().find((entry) => entry.recipeId === recipeId);
      expect(bundle).toBeDefined();

      const validation = validarRecetaFabricacion(bundle!.definition);
      expect(validation.ok).toBe(true);

      const result = calcularCubicacionYPauta(bundle!.definition, {
        anchoTotalMm: confirmed!.testDimensions.widthMm,
        altoTotalMm: confirmed!.testDimensions.heightMm,
        cantidad: 1,
        hojas: confirmed!.leaves,
        modulos: 1,
        variante: bundle!.identity.variantSlug,
      });

      expect(result.calculable).toBe(true);

      const expectedProfiles = confirmed!.profiles
        .map((profile) => profileKey(profile.code, profile.quantity, profile.lengthMm))
        .sort();
      const actualProfiles = result.perfiles
        .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
        .sort();
      expect(actualProfiles).toEqual(expectedProfiles);

      const expectedGlass = confirmed!.glass
        .map((piece) => glassKey(piece.code, piece.quantity, piece.widthMm, piece.heightMm))
        .sort();
      const actualGlass = result.vidrios
        .map((piece) =>
          glassKey(piece.nombre.includes("Termopanel") ? piece.nombre : piece.nombre, piece.cantidadPiezas, piece.anchoMm, piece.altoMm)
        )
        .sort();

      const actualGlassFromResult = result.vidrios
        .map((piece, index) => {
          const confirmedPiece = confirmed!.glass[index];
          const code = confirmedPiece?.code ?? "GLASS";
          return glassKey(code, piece.cantidadPiezas, piece.anchoMm, piece.altoMm);
        })
        .sort();

      expect(actualGlassFromResult).toEqual(expectedGlass);
    }
  );

  it.each(SODAL_L25_EXTRA_GEOMETRY_TEST_IDS)(
    "extra geométrico %s reproduce la misma receta 3H @ 0 mm",
    (evidenceRecipeId) => {
      const confirmed = loadConfirmedRecipeById(evidenceRecipeId);
      expect(confirmed).not.toBeNull();

      const bundle = findSodalL25BundleForTestEvidence(evidenceRecipeId);
      expect(bundle).not.toBeNull();
      expect(bundle!.identity.leaves).toBe(3);

      const result = calcularCubicacionYPauta(bundle!.definition, {
        anchoTotalMm: confirmed!.testDimensions.widthMm,
        altoTotalMm: confirmed!.testDimensions.heightMm,
        cantidad: 1,
        hojas: confirmed!.leaves,
        modulos: 1,
        variante: bundle!.identity.variantSlug,
      });

      expect(result.calculable).toBe(true);

      const expectedProfiles = confirmed!.profiles
        .map((profile) => profileKey(profile.code, profile.quantity, profile.lengthMm))
        .sort();
      const actualProfiles = result.perfiles
        .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
        .sort();
      expect(actualProfiles).toEqual(expectedProfiles);

      const expectedGlass = confirmed!.glass
        .map((piece) => glassKey(piece.code, piece.quantity, piece.widthMm, piece.heightMm))
        .sort();
      const actualGlass = result.vidrios
        .map((piece, index) => {
          const confirmedPiece = confirmed!.glass[index];
          return glassKey(confirmedPiece!.code, piece.cantidadPiezas, piece.anchoMm, piece.altoMm);
        })
        .sort();
      expect(actualGlass).toEqual(expectedGlass);
    }
  );

  it("matriz gate 22 casos indexada", () => {
    const matrix = SODAL_L25_GATE_TEST_IDS.map((recipeId) => {
      const confirmed = loadConfirmedRecipeById(recipeId)!;
      const bundle =
        SODAL_L25_CANONICAL_RECIPE_IDS.includes(recipeId)
          ? buildAllSodalL25Recipes().find((entry) => entry.recipeId === recipeId)
          : findSodalL25BundleForTestEvidence(recipeId);
      const identity =
        bundle?.identity ?? resolveSodalL25IdentityFromRecipeId(recipeId as never);
      return {
        recipe: recipeId,
        evidence: recipeId,
        canonicalRecipe: bundle?.recipeId ?? null,
        leaves: confirmed.leaves,
        width: confirmed.testDimensions.widthMm,
        height: confirmed.testDimensions.heightMm,
        variant: identity?.variantSlug ?? null,
      };
    });

    expect(matrix).toHaveLength(22);
    expect(matrix.filter((row) => row.variant != null)).toHaveLength(22);
  });
});
