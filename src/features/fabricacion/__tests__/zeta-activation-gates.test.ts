import {
  getDefinitionEvidenceBlockers,
  isObservedZetaMeasure,
} from "@/features/fabricacion/services/fabricacion-evidence-gate.service";
import { resolverRecetaFabricacionCompatible } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import type {
  FabricacionEvidencia,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function completeEvidence(): FabricacionEvidencia {
  return {
    fuente: "sistema_zeta",
    runId: "run-1",
    projectId: "project-1",
    planId: "PA-1",
    rawPath: "docs/fabricacion/zeta/raw/sodal/l25/recipe",
    htmlPath: "docs/fabricacion/zeta/raw/sodal/l25/recipe/plan.html",
    textPath: "docs/fabricacion/zeta/raw/sodal/l25/recipe/plan.txt",
    screenshotPaths: ["docs/fabricacion/zeta/raw/sodal/l25/recipe/screenshot.png"],
    fecha: "2026-09-19T00:00:00.000Z",
    extractorVersion: "zeta-extractor-p1-2026-09-19",
    hashes: {
      html: "a".repeat(64),
      text: "b".repeat(64),
      screenshots: { "screenshot.png": "c".repeat(64) },
    },
    sourceFragments: [
      { id: "profile-0", tipo: "perfil", locator: "plan.txt:line:1", texto: "2501" },
    ],
    medidasObservadas: [{ anchoMm: 1800, altoMm: 1500 }],
    valores: [
      { fieldPath: "perfiles[0].codigoPerfil", origen: "observado", sourceFragmentId: "profile-0" },
    ],
  };
}

describe("gates de activación Zeta", () => {
  it("mantiene L25 documental en prueba y no como receta validada", () => {
    expect(buildAllSodalL25Recipes().every((bundle) =>
      bundle.definition.estado === "lista_para_validar" &&
      bundle.definition.notasValidacion?.some((note) => /validación de taller/i.test(note)),
    )).toBe(true);
  });

  it("bloquea la validación si falta evidencia o hay valores asumidos", () => {
    const bundle = buildAllSodalL25Recipes()[0]!;
    expect(getDefinitionEvidenceBlockers({ ...bundle.definition, evidencia: undefined })).toEqual([
      "Falta evidencia 1:1 de la fuente primaria.",
    ]);
    expect(getDefinitionEvidenceBlockers(bundle.definition)).toContain(
      "La evidencia contiene valores asumidos.",
    );

    const definition = {
      ...bundle.definition,
      evidencia: {
        ...completeEvidence(),
        valores: [{ fieldPath: "identidad.modulos", origen: "asumido" as const }],
      },
    };
    expect(getDefinitionEvidenceBlockers(definition)).toEqual([
      "La evidencia contiene valores asumidos.",
      "Hay valores normalizados sin fragmento de origen trazable.",
    ]);
  });

  it("solo permite resolver medidas observadas para una receta Zeta con evidencia completa", () => {
    const bundle = buildAllSodalL25Recipes()[0]!;
    const recipe: FabricationRecipeRecord = {
      id: "recipe-1",
      organizationId: 1,
      lineTemplateId: 25,
      scope: "organization",
      providerName: "SODAL",
      lineName: "L25",
      typology: "corredera",
      leavesCount: 2,
      variant: bundle.identity.variantSlug,
      version: 1,
      status: "validated",
      definition: { ...bundle.definition, evidencia: completeEvidence() },
      sourceType: "manufacturer",
      sourceReference: "zeta:confirmed:sodal/l25/test",
      sourceName: "SODAL",
      sourceRevision: "zeta-evidence-p1",
      parentRecipeId: null,
      validatedAt: "2026-09-19T00:00:00.000Z",
      validatedBy: "workshop-user",
      createdAt: "2026-09-19T00:00:00.000Z",
      updatedAt: "2026-09-19T00:00:00.000Z",
      eliminadoEn: null,
    };

    expect(isObservedZetaMeasure(recipe, 1800, 1500)).toBe(true);
    expect(isObservedZetaMeasure(recipe, 2000, 1500)).toBe(false);

    const unsupported = resolverRecetaFabricacionCompatible([recipe], {
      organizationId: 1,
      lineTemplateId: 25,
      tipologia: "corredera",
      hojas: 2,
      modulos: 1,
      variante: bundle.identity.variantSlug,
      anchoTotalMm: 2000,
      altoTotalMm: 1500,
    });
    expect(unsupported.estado).toBe("sin_receta");
  });
});
