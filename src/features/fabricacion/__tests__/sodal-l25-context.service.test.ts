import {
  applySodalL25VidrioToForm,
  findSodalL25LineRecipe,
  mergeSodalL25WorkspaceRecipes,
  resolveSodalL25QuoteConfig,
  summarizeSodalL25LineCoverage,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function l25Recipe(hojas: 2 | 3 | 4): FabricationRecipeRecord {
  return {
    id: `r${hojas}`,
    organizationId: 1,
    scope: "organization",
    lineTemplateId: 207,
    providerName: "Sodal",
    lineName: "L25",
    typology: "corredera",
    leavesCount: hojas,
    variant: "dvh_open_reinforced",
    version: 1,
    status: "validated",
    definition: {
      identidad: {
        recetaId: `r${hojas}`,
        codigo: "l25",
        nombre: "L25",
        tipologia: "corredera",
        apertura: "corredera",
        hojas,
        modulos: 2,
        variante: "dvh_open_reinforced",
        herraje: null,
      },
      perfiles: [],
      vidrios: [],
      accesorios: [],
    } as FabricationRecipeRecord["definition"],
    sourceType: "manual",
    sourceReference: `zeta:confirmed:sodal/l25/dvh_pierna_abierta_reforzada_${hojas}h`,
    sourceName: null,
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("sodal-l25-context.service", () => {
  it("prioriza el vidrio elegido sobre un glazing L25 stale", () => {
    const config = resolveSodalL25QuoteConfig({
      catalogKey: "ventora:l25",
      presentation: {
        fabricacionGlazing: "monolithic",
        fabricacionLeg: "open",
        fabricacionReinforcement: "reinforced",
        fabricacionVariante: "monolithic_open_reinforced",
        fabricacionHojas: 3,
        sheetScheme: "3 hojas",
      },
      vidrio: "DVH 4+12+4",
      fabricacionHojas: 3,
      sheetScheme: "3 hojas",
    });

    expect(config).toMatchObject({
      glazing: "dvh",
      leg: "open",
      reinforcement: "reinforced",
      variantSlug: "dvh_open_reinforced",
      hojas: 3,
      complete: true,
    });
  });

  it("sincroniza glazing y variante al cambiar el vidrio en el formulario", () => {
    const next = applySodalL25VidrioToForm(
      {
        catalogLineKey: "ventora:l25",
        referencia: "L25",
        fabricacionGlazing: "monolithic",
        fabricacionLeg: "open",
        fabricacionReinforcement: "normal",
        fabricacionVariante: "monolithic_open_normal",
      },
      "DVH 4+12+4"
    );

    expect(next.vidrio).toBe("DVH 4+12+4");
    expect(next.fabricacionGlazing).toBe("dvh");
    expect(next.fabricacionVariante).toBe("dvh_open_normal");
  });

  it("encuentra la receta L25 por hojas y construcción", () => {
    const recipes = [l25Recipe(2), l25Recipe(3), l25Recipe(4)];
    const coverage = summarizeSodalL25LineCoverage(recipes);
    expect(coverage.allLeavesReady).toBe(true);
    expect(coverage.readyCount).toBe(3);
    expect(
      findSodalL25LineRecipe(recipes, {
        hojas: 2,
        glazing: "dvh",
        leg: "open",
        reinforcement: "reinforced",
      })?.id
    ).toBe("r2");
  });

  it("fusiona recetas Ventora y del taller priorizando la copia del taller", () => {
    const ventora = [{ ...l25Recipe(2), id: "v2", scope: "ventora" as const }];
    const organization = [
      {
        ...l25Recipe(2),
        id: "o2-custom",
        scope: "organization" as const,
        version: 2,
      },
      l25Recipe(3),
    ];

    const merged = mergeSodalL25WorkspaceRecipes({ organization, ventora });
    expect(merged).toHaveLength(2);
    expect(
      findSodalL25LineRecipe(merged, {
        hojas: 2,
        glazing: "dvh",
        leg: "open",
        reinforcement: "reinforced",
      })?.id
    ).toBe("o2-custom");
  });
});
