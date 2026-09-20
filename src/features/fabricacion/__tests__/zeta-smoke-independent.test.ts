import { calcularCubicacionYPauta } from "@/features/fabricacion";
import { SODAL_4800_CATALOG_KEY } from "@/features/fabricacion/fixtures/sodal-4800-zeta-catalog";
import {
  buildAllSodal4800Recipes,
  SODAL_4800_CONFIRMED_RECIPE_IDS,
} from "@/features/fabricacion/fixtures/sodal-4800-zeta-recipes";
import {
  buildAllSodalL25Recipes,
  resetSodalL25RecipeCacheForTests,
  SODAL_L25_CANONICAL_RECIPE_IDS,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { crearRecetaSodalP2A } from "@/features/fabricacion/fixtures/sodal-p2a-recipes";
import {
  filterRecipesForCatalogResolution,
  resolveFabricationRecipe,
} from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import {
  loadConfirmedRecipeById,
  resetZetaConfirmedCacheForTests,
} from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import { loadEvidenceSidecarByRecipeId, resetEvidenceSidecarCacheForTests } from "@/features/fabricacion/zeta/zeta-evidence-sidecar-loader";
import { isTraceabilityComplete } from "@/features/fabricacion/zeta/zeta-trace-enrichment";
import {
  buildZetaSmokeExpectedFromConfirmed,
  type ZetaSmokeExpected,
} from "@/features/fabricacion/zeta/zeta-smoke-expected";
import type { FabricacionResultadoCubicacion } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function assertMotorMatchesExpected(
  recipeId: string,
  expected: ZetaSmokeExpected,
  result: FabricacionResultadoCubicacion
) {
  if (isTraceabilityComplete(recipeId)) {
    expect(result.calculable).toBe(true);
  } else {
    expect(result.calculable).toBe(false);
  }
  expect(result.perfiles).toHaveLength(expected.profiles.length);
  expected.profiles.forEach((profile, index) => {
    const actual = result.perfiles[index];
    expect(actual?.codigoPerfil).toBe(profile.code);
    expect(actual?.nombrePerfil).toBe(profile.name);
    expect(actual?.cantidadPiezas).toBe(profile.quantity);
    expect(actual?.medidaMm).toBe(profile.lengthMm);
  });

  expect(result.vidrios).toHaveLength(expected.glass.length);
  expected.glass.forEach((piece, index) => {
    const actual = result.vidrios[index];
    expect(actual?.cantidadPiezas).toBe(piece.quantity);
    expect(actual?.anchoMm).toBe(piece.widthMm);
    expect(actual?.altoMm).toBe(piece.heightMm);
  });
}

describe("Zeta smoke independiente", () => {
  beforeEach(() => {
    resetZetaConfirmedCacheForTests();
    resetEvidenceSidecarCacheForTests();
    resetSodalL25RecipeCacheForTests();
  });

  it("expone sidecar por cada confirmed L25/L-4800", () => {
    for (const recipeId of [...SODAL_L25_CANONICAL_RECIPE_IDS, ...SODAL_4800_CONFIRMED_RECIPE_IDS]) {
      expect(loadEvidenceSidecarByRecipeId(recipeId)).not.toBeNull();
    }
  });

  describe("L25 canónicas", () => {
    it.each(SODAL_L25_CANONICAL_RECIPE_IDS)(
      "%s reproduce perfiles en orden sin usar motor como expected",
      (recipeId) => {
        const confirmed = loadConfirmedRecipeById(recipeId);
        expect(confirmed).not.toBeNull();
        const expected = buildZetaSmokeExpectedFromConfirmed(confirmed!);
        const bundle = buildAllSodalL25Recipes().find((entry) => entry.recipeId === recipeId);
        expect(bundle).toBeDefined();

        const runs = Array.from({ length: 3 }, () =>
          calcularCubicacionYPauta(bundle!.definition, {
            anchoTotalMm: confirmed!.testDimensions.widthMm,
            altoTotalMm: confirmed!.testDimensions.heightMm,
            cantidad: 1,
            hojas: confirmed!.leaves,
            modulos: 1,
            variante: bundle!.identity.variantSlug,
          })
        );
        runs.forEach((result) => assertMotorMatchesExpected(recipeId, expected, result));
        expect(runs[1]).toEqual(runs[0]);
        expect(runs[2]).toEqual(runs[0]);

        const barras = construirPautaBarrasFabricacion({
          resultado: runs[0]!,
          receta: bundle!.definition,
        });
        expect(barras.barras.length).toBeGreaterThan(0);
        expect(barras.barras.some((barra) => barra.cortes.length > 0)).toBe(true);
      }
    );
  });

  describe("L-4800 Zeta", () => {
    it.each(SODAL_4800_CONFIRMED_RECIPE_IDS)(
      "%s reproduce evidencia observada en orden",
      (recipeId) => {
        const bundle = buildAllSodal4800Recipes().find((entry) => entry.recipeId === recipeId);
        expect(bundle).toBeDefined();
        const expected = buildZetaSmokeExpectedFromConfirmed(bundle!.confirmed);

        const result = calcularCubicacionYPauta(bundle!.definition, {
          anchoTotalMm: bundle!.confirmed.testDimensions.widthMm,
          altoTotalMm: bundle!.confirmed.testDimensions.heightMm,
          cantidad: 1,
          hojas: bundle!.confirmed.leaves,
          modulos: 1,
          variante: "monolitico",
        });
        assertMotorMatchesExpected(recipeId, expected, result);
      }
    );

    it("bloquea medida no observada", () => {
      const bundle = buildAllSodal4800Recipes()[0]!;
      const record: FabricationRecipeRecord = {
        id: bundle.recipeId,
        organizationId: 1,
        lineTemplateId: 99,
        scope: "ventora",
        providerName: "SODAL",
        lineName: "L-4800",
        typology: "corredera",
        leavesCount: 2,
        variant: "monolitico",
        version: 1,
        status: "testing",
        definition: bundle.definition,
        sourceType: "manufacturer",
        sourceReference: bundle.sourceReference,
        sourceName: "SODAL",
        sourceRevision: "Zeta PA-56",
        parentRecipeId: null,
        validatedAt: null,
        validatedBy: null,
        createdAt: "2026-09-19T00:00:00.000Z",
        updatedAt: "2026-09-19T00:00:00.000Z",
        eliminadoEn: null,
      };

      const resolution = resolveFabricationRecipe([record], {
        organizationId: 1,
        lineTemplateId: 99,
        catalogKey: SODAL_4800_CATALOG_KEY,
        tipologia: "corredera",
        hojas: 2,
        modulos: 1,
        anchoTotalMm: 2000,
        altoTotalMm: 1500,
      });
      expect(resolution.estado).toBe("sin_receta");
    });

    it("conserva destajes Diamond junto a evidencia Zeta y descarta P2A legado", () => {
      const p2a = crearRecetaSodalP2A({
        catalogKey: SODAL_4800_CATALOG_KEY,
        lineName: "Serie 4800",
      })!;
      const zeta = buildAllSodal4800Recipes()[0]!;
      const zetaRecord: FabricationRecipeRecord = {
        id: "zeta-4800",
        organizationId: 1,
        lineTemplateId: 99,
        scope: "ventora",
        providerName: "SODAL",
        lineName: "L-4800",
        typology: "corredera",
        leavesCount: 2,
        variant: "monolitico",
        version: 1,
        status: "testing",
        definition: zeta.definition,
        sourceType: "manufacturer",
        sourceReference: zeta.sourceReference,
        sourceName: "SODAL",
        sourceRevision: "Zeta",
        parentRecipeId: null,
        validatedAt: null,
        validatedBy: null,
        createdAt: "2026-09-19T00:00:00.000Z",
        updatedAt: "2026-09-19T00:00:00.000Z",
        eliminadoEn: null,
      };
      const p2aRecord: FabricationRecipeRecord = {
        ...zetaRecord,
        id: "p2a-4800",
        sourceReference: "SODAL-P2A-4800",
        definition: p2a,
        status: "draft",
      };

      const filtered = filterRecipesForCatalogResolution(
        [zetaRecord, p2aRecord],
        SODAL_4800_CATALOG_KEY
      );
      expect(filtered.map((recipe) => recipe.id).sort()).toEqual(["p2a-4800", "zeta-4800"]);
    });

    it("marca no calculable cuando falta evidencia 1:1", () => {
      const bundle = buildAllSodal4800Recipes()[0]!;
      const recetaSinEvidencia = {
        ...bundle.definition,
        evidencia: undefined,
        datosPendientes: ["Evidencia incompleta"],
      };
      const result = calcularCubicacionYPauta(recetaSinEvidencia, {
        anchoTotalMm: 1800,
        altoTotalMm: 1500,
        cantidad: 1,
        hojas: 2,
        modulos: 1,
        variante: "monolitico",
      });
      expect(result.calculable).toBe(false);
      expect(result.advertencias.some((entry) => entry.codigo === "RECETA_DATOS_PENDIENTES")).toBe(
        true
      );
    });
  });

  describe("L25 gate negativo", () => {
    it("no calcula si datosPendientes por evidencia incompleta", () => {
      const bundle = buildAllSodalL25Recipes()[0]!;
      const receta = {
        ...bundle.definition,
        evidencia: undefined,
        datosPendientes: ["Evidencia Zeta 1:1 incompleta"],
      };
      const result = calcularCubicacionYPauta(receta, {
        anchoTotalMm: 1800,
        altoTotalMm: 1500,
        cantidad: 1,
        hojas: 2,
        modulos: 1,
        variante: bundle.identity.variantSlug,
      });
      expect(result.calculable).toBe(false);
    });
  });
});
