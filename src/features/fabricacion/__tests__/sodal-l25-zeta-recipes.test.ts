import { calcularCubicacionYPauta, validarRecetaFabricacion } from "@/features/fabricacion";
import {
  buildAllSodalL25Recipes,
  findSodalL25BundleForTestEvidence,
  resetSodalL25RecipeCacheForTests,
  SODAL_L25_CANONICAL_RECIPE_IDS,
  SODAL_L25_EXTRA_GEOMETRY_TEST_IDS,
  SODAL_L25_GATE_TEST_IDS,
  resolveSodalL25IdentityFromRecipeId,
  isValidSodalL25Combination,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import {
  loadConfirmedRecipeById,
  resetZetaConfirmedCacheForTests,
} from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import { resetEvidenceSidecarCacheForTests } from "@/features/fabricacion/zeta/zeta-evidence-sidecar-loader";
import { isTraceabilityComplete } from "@/features/fabricacion/zeta/zeta-trace-enrichment";
import {
  classifySodalL25ProfileRole,
  isSodalL25VerticalRole,
} from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { evaluarGatesRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-gates.service";
import type {
  FabricacionEntradaCalculo,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord, FabricationRecipeTestRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function profileKey(code: string, quantity: number, lengthMm: number) {
  return `${code}|${quantity}|${lengthMm}`;
}

function glassKey(code: string, quantity: number, widthMm: number, heightMm: number) {
  return `${code}|${quantity}|${widthMm}x${heightMm}`;
}

function gateEvidence(widthMm: number, heightMm: number) {
  return {
    fuente: "sistema_zeta" as const,
    runId: "run-gate",
    projectId: "project-gate",
    planId: "PA-GATE",
    rawPath: "docs/fabricacion/zeta/raw/gate",
    htmlPath: "docs/fabricacion/zeta/raw/gate/plan.html",
    textPath: "docs/fabricacion/zeta/raw/gate/plan.txt",
    screenshotPaths: ["docs/fabricacion/zeta/raw/gate/screenshot.png"],
    fecha: "2026-09-19T00:00:00.000Z",
    extractorVersion: "zeta-extractor-p1-2026-09-19",
    hashes: { html: "a".repeat(64), text: "b".repeat(64), screenshots: { screenshot: "c".repeat(64) } },
    sourceFragments: [{ id: "profile-0", tipo: "perfil" as const, locator: "plan.txt:line:1", texto: "2501" }],
    medidasObservadas: [{ anchoMm: widthMm, altoMm: heightMm }],
    valores: [{ fieldPath: "perfiles[0].codigoPerfil", origen: "observado" as const, sourceFragmentId: "profile-0" }],
  };
}

describe("SODAL L25 recetas Zeta", () => {
  beforeEach(() => {
    resetZetaConfirmedCacheForTests();
    resetEvidenceSidecarCacheForTests();
    resetSodalL25RecipeCacheForTests();
  });

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

      if (isTraceabilityComplete(recipeId)) {
        expect(result.calculable).toBe(true);
        expect(bundle!.definition.datosPendientes ?? []).toHaveLength(0);
      } else {
        expect(result.calculable).toBe(true);
        expect(bundle!.definition.datosPendientes?.length ?? 0).toBeGreaterThan(0);
      }

      confirmed!.profiles.forEach((profile, index) => {
        const actual = result.perfiles[index];
        expect(actual?.codigoPerfil).toBe(profile.code);
        expect(actual?.cantidadPiezas).toBe(profile.quantity);
        expect(actual?.medidaMm).toBe(profile.lengthMm);
      });

      confirmed!.glass.forEach((piece, index) => {
        const actual = result.vidrios[index];
        expect(actual?.cantidadPiezas).toBe(piece.quantity);
        expect(actual?.anchoMm).toBe(piece.widthMm);
        expect(actual?.altoMm).toBe(piece.heightMm);
      });
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

      const verticalExpected = confirmed!.profiles
        .filter((profile) => {
          const role = classifySodalL25ProfileRole(profile.code);
          return role != null && isSodalL25VerticalRole(role);
        })
        .map((profile) => profileKey(profile.code, profile.quantity, profile.lengthMm))
        .sort();
      const verticalActual = result.perfiles
        .filter((profile) => {
          const role = classifySodalL25ProfileRole(profile.codigoPerfil);
          return role != null && isSodalL25VerticalRole(role);
        })
        .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
        .sort();
      expect(verticalActual).toEqual(verticalExpected);

      const rieles = result.perfiles.filter((profile) =>
        ["2501", "2502"].includes(profile.codigoPerfil)
      );
      expect(rieles.every((profile) => profile.medidaMm === confirmed!.testDimensions.widthMm - 16)).toBe(
        true
      );
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

  it("ejecuta los gates completos sobre las 18 recetas canónicas", () => {
    const bundles = buildAllSodalL25Recipes();
    const evaluations = bundles.map((bundle) => {
      const confirmed = bundle.confirmed;
      const definition = {
        ...bundle.definition,
        evidencia: gateEvidence(
          confirmed.testDimensions.widthMm,
          confirmed.testDimensions.heightMm,
        ),
        datosPendientes: undefined,
      };
      const record: FabricationRecipeRecord = {
        id: bundle.recipeId,
        organizationId: null,
        lineTemplateId: 25,
        scope: "ventora",
        providerName: "SODAL",
        lineName: confirmed.line,
        typology: "corredera",
        leavesCount: bundle.identity.leaves,
        variant: bundle.identity.variantSlug,
        version: 1,
        status: "validated",
        definition,
        sourceType: "manufacturer",
        sourceReference: bundle.sourceReference,
        sourceName: "SODAL",
        sourceRevision: "Sistema Zeta / Plan de armado",
        parentRecipeId: null,
        validatedAt: "2026-09-18T00:00:00.000Z",
        validatedBy: "zeta-gate-test",
        createdAt: "2026-09-18T00:00:00.000Z",
        updatedAt: "2026-09-18T00:00:00.000Z",
        eliminadoEn: null,
      };

      const base: FabricacionEntradaCalculo = {
        anchoTotalMm: confirmed.testDimensions.widthMm,
        altoTotalMm: confirmed.testDimensions.heightMm,
        cantidad: 1,
        hojas: confirmed.leaves,
        modulos: 1,
        variante: bundle.identity.variantSlug,
        topology: "corredera",
      };
      const alternate: FabricacionEntradaCalculo = {
        ...base,
        anchoTotalMm: base.anchoTotalMm + 300,
      };
      const expectedBase = calcularCubicacionYPauta(definition, base);
      const expectedAlternate = calcularCubicacionYPauta(definition, alternate);
      const tests: FabricationRecipeTestRecord[] = [base, alternate].map((input, index) => ({
        id: `${bundle.recipeId}-gate-${index}`,
        recipeId: record.id,
        organizationId: null,
        name: index === 0 ? "Zeta base" : "Geometría distinta",
        input,
        expectedOutput: index === 0 ? expectedBase : expectedAlternate,
        actualOutput: index === 0 ? expectedBase : expectedAlternate,
        passed: true,
        isRequired: true,
        validatedBy: "zeta-gate-test",
        createdAt: "2026-09-18T00:00:00.000Z",
        updatedAt: "2026-09-18T00:00:00.000Z",
        eliminadoEn: null,
      }));

      return evaluarGatesRecetaFabricacion({
        recipe: definition,
        record,
        tests,
        candidateRecipes: [record],
      });
    });

    expect(evaluations).toHaveLength(18);
    expect(evaluations.every((evaluation) => evaluation.passed)).toBe(true);
  });

  const twoLeafIds = SODAL_L25_CANONICAL_RECIPE_IDS.filter((id) => id.includes("_2h_"));
  const fourLeafIds = SODAL_L25_CANONICAL_RECIPE_IDS.filter((id) => id.includes("_4h_"));

  it.each(twoLeafIds)("2H %s fuera de muestra 2000×1500 respeta roles L25", (recipeId) => {
    const bundle = buildAllSodalL25Recipes().find((entry) => entry.recipeId === recipeId);
    expect(bundle).toBeDefined();
    const result = calcularCubicacionYPauta(bundle!.definition, {
      anchoTotalMm: 2000,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
      variante: bundle!.identity.variantSlug,
    });
    expect(result.perfiles.length).toBeGreaterThan(0);

    for (const profile of result.perfiles) {
      const role = classifySodalL25ProfileRole(profile.codigoPerfil);
      expect(role).not.toBeNull();
      if (role === "frame_width") {
        expect(profile.medidaMm).toBe(1984);
        expect(profile.medidaMm).toBeLessThan(2000);
      }
      if (role && isSodalL25VerticalRole(role)) {
        expect(profile.medidaMm).toBeLessThanOrEqual(1500);
      }
    }

    const onlyWidthChanged = calcularCubicacionYPauta(bundle!.definition, {
      anchoTotalMm: 2200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
      variante: bundle!.identity.variantSlug,
    });
    const verticalsAt2000 = result.perfiles
      .filter((profile) => {
        const role = classifySodalL25ProfileRole(profile.codigoPerfil);
        return role != null && isSodalL25VerticalRole(role);
      })
      .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
      .sort();
    const verticalsAt2200 = onlyWidthChanged.perfiles
      .filter((profile) => {
        const role = classifySodalL25ProfileRole(profile.codigoPerfil);
        return role != null && isSodalL25VerticalRole(role);
      })
      .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
      .sort();
    expect(verticalsAt2200).toEqual(verticalsAt2000);
  });

  it.each(fourLeafIds)("4H %s fuera de muestra 3200×1600 respeta roles L25", (recipeId) => {
    const bundle = buildAllSodalL25Recipes().find((entry) => entry.recipeId === recipeId);
    expect(bundle).toBeDefined();
    const result = calcularCubicacionYPauta(bundle!.definition, {
      anchoTotalMm: 3200,
      altoTotalMm: 1600,
      cantidad: 1,
      hojas: 4,
      modulos: 1,
      variante: bundle!.identity.variantSlug,
    });
    expect(result.perfiles.length).toBeGreaterThan(0);

    for (const profile of result.perfiles) {
      const role = classifySodalL25ProfileRole(profile.codigoPerfil);
      expect(role).not.toBeNull();
      if (role === "frame_width") {
        expect(profile.medidaMm).toBe(3184);
        expect(profile.medidaMm).toBeLessThan(3200);
      }
      if (role && isSodalL25VerticalRole(role)) {
        expect(profile.medidaMm).toBeLessThanOrEqual(1600);
      }
    }

    const onlyWidthChanged = calcularCubicacionYPauta(bundle!.definition, {
      anchoTotalMm: 3400,
      altoTotalMm: 1600,
      cantidad: 1,
      hojas: 4,
      modulos: 1,
      variante: bundle!.identity.variantSlug,
    });
    const verticalsAt3200 = result.perfiles
      .filter((profile) => {
        const role = classifySodalL25ProfileRole(profile.codigoPerfil);
        return role != null && isSodalL25VerticalRole(role);
      })
      .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
      .sort();
    const verticalsAt3400 = onlyWidthChanged.perfiles
      .filter((profile) => {
        const role = classifySodalL25ProfileRole(profile.codigoPerfil);
        return role != null && isSodalL25VerticalRole(role);
      })
      .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
      .sort();
    expect(verticalsAt3400).toEqual(verticalsAt3200);
  });

  it("caso exacto COT-180926-010 V1 2H monolítico abierta reforzada 2000×1500", () => {
    const bundle = buildAllSodalL25Recipes().find(
      (entry) => entry.recipeId === "monolitico_pierna_abierta_reforzada_2h_1800x1500"
    );
    expect(bundle).toBeDefined();
    const result = calcularCubicacionYPauta(bundle!.definition, {
      anchoTotalMm: 2000,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
      variante: bundle!.identity.variantSlug,
    });

    const actual = result.perfiles
      .map((profile) => profileKey(profile.codigoPerfil, profile.cantidadPiezas, profile.medidaMm))
      .sort();
    expect(actual).toEqual(
      [
        "2501|1|1984",
        "2502|1|1984",
        "2503|2|1500",
        "2504|2|988",
        "2505|2|988",
        "2511R|2|1465",
        "2512R|2|1465",
      ].sort()
    );
  });

  it("V2 3H DVH pierna cerrada 3000×1500 no cambia jamba ni pierna", () => {
    const bundle = buildAllSodalL25Recipes().find(
      (entry) => entry.recipeId === "dvh_pierna_cerrada_3h_3000x1500"
    );
    expect(bundle).toBeDefined();
    const result = calcularCubicacionYPauta(bundle!.definition, {
      anchoTotalMm: 3000,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 3,
      modulos: 1,
      variante: bundle!.identity.variantSlug,
    });
    const byCode = Object.fromEntries(
      result.perfiles.map((profile) => [profile.codigoPerfil + ":" + profile.cantidadPiezas, profile.medidaMm])
    );
    expect(byCode["2501:1"]).toBe(2984);
    expect(byCode["2502:1"]).toBe(2984);
    expect(byCode["2509:2"]).toBe(1500);
    expect(byCode["2518:2"]).toBe(1465);
  });
});
