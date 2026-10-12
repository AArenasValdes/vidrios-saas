import { resolveVeratecWorkbookFallback } from "@/features/fabricacion/services/fabricacion-receta-veratec-fallback.service";
import {
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
  VERATEC_7400_VARIANT_TERMOPANEL_20MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import { VERATEC_7400_4H_CATALOG_KEY, VERATEC_7400_4H_VARIANTS } from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const base = {
  lineTemplateId: 700,
  organizationId: 3,
  lineName: "Línea Veratec",
  recipes: [] as FabricationRecipeRecord[],
};

describe("fallback documental Veratec", () => {
  it.each([
    ["ventora:veratec-compact-sliding-2h", null, "compact_sliding_2h"],
    ["ventora:veratec-compact-sliding-3h", null, "compact_sliding_3h"],
    ["ventora:veratec-compact-sliding-4h", null, "compact_sliding_4h"],
    ["ventora:veratec-7400-corredera-3h", "7400_3h_chica_2rieles", "7400_3h_chica_2rieles"],
    ["ventora:veratec-7400-monorriel", "7400_monorriel_hoja_grande", "7400_monorriel_hoja_grande"],
    ["ventora:veratec-bahar-5200-fijo", null, "bahar_5200_fijo"],
    ["ventora:veratec-bahar-5200-ventana-interior", null, "bahar_5200_ventana_interior"],
    ["ventora:veratec-bahar-5200-ventana-exterior", null, "bahar_5200_ventana_exterior"],
    ["ventora:veratec-bahar-5200-ventana-exterior", "bahar_5200_ventana_proyectante", "bahar_5200_ventana_proyectante"],
    ["ventora:veratec-bahar-5200-plegable-3-3-0", null, "bahar_5200_plegable_3_3_0"],
    ["ventora:veratec-bahar-5200-plegable-4-3-1", null, "bahar_5200_plegable_4_3_1"],
    ["ventora:veratec-bahar-5200-plegable-6-5-1", null, "bahar_5200_plegable_6_5_1"],
    ["ventora:veratec-bahar-5200-plegable-7-4-3", null, "bahar_5200_plegable_7_4_3"],
  ])("resuelve %s hacia base preliminar %s", (catalogKey, variant, expectedVariant) => {
    const records = resolveVeratecWorkbookFallback({
      ...base,
      catalogKey,
      variant,
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      scope: "ventora",
      status: "testing",
      sourceType: "supplier",
      variant: expectedVariant,
      validatedAt: null,
      validatedBy: null,
    });
    if (String(expectedVariant).startsWith("bahar_5200")) {
      expect(records[0]?.sourceName).toBe("Veratec · Bahar 52 mm");
    }
  });

  it.each([
    ["ventora:veratec-7400-corredera-3h", ["7400_3h_grande_2rieles", "7400_3h_chica_2rieles"]],
    ["ventora:veratec-7400-monorriel", ["7400_monorriel_hoja_grande", "7400_monorriel_hoja_chica"]],
  ])("devuelve las opciones sin elegir una por defecto para %s", (catalogKey, expected) => {
    const records = resolveVeratecWorkbookFallback({ ...base, catalogKey, variant: null });
    expect(records.map((record) => record.variant)).toEqual(expected);
  });

  it("resuelve bases Elegans desde su propia pauta y no desde fórmulas Bahar", () => {
    for (const catalogKey of [
      "ventora:veratec-elegans-60-fijo",
      "ventora:veratec-elegans-60-ventana-hoja-interior",
      "ventora:veratec-elegans-60-ventana-hoja-exterior",
      "ventora:veratec-elegans-60-puerta-hoja-interior",
      "ventora:veratec-elegans-60-puerta-hoja-exterior",
    ]) {
      const recipes = resolveVeratecWorkbookFallback({ ...base, catalogKey, variant: null });
      expect(recipes).toHaveLength(1);
      expect(recipes[0]).toMatchObject({
        scope: "ventora",
        status: "testing",
        sourceType: "supplier",
        sourceName: "Veratec · pauta de corte facilitada",
        validatedAt: null,
        validatedBy: null,
      });
      expect(recipes[0]?.sourceReference).toContain("pauta-de-corte-veratec.xlsx#");
    }
  });

  it("no sustituye una receta propia ya guardada en la misma línea", () => {
    const localRecipe = {
      ...resolveVeratecWorkbookFallback({
        ...base,
        catalogKey: "ventora:veratec-compact-sliding-2h",
        variant: null,
      })[0],
      id: "taller:receta",
      scope: "organization" as const,
      status: "draft" as const,
    };
    expect(resolveVeratecWorkbookFallback({
      ...base,
      catalogKey: "ventora:veratec-compact-sliding-2h",
      variant: null,
      recipes: [localRecipe],
    })).toEqual([]);
  });

  it("resuelve la base preliminar de Sliding 7400 de 4 hojas chicas", () => {
    const [variant] = VERATEC_7400_4H_VARIANTS;
    const records = resolveVeratecWorkbookFallback({
      ...base,
      catalogKey: VERATEC_7400_4H_CATALOG_KEY,
      variant: variant.slug,
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.definition.identidad.hojas).toBe(4);
    expect(records[0]?.definition.perfiles.length).toBeGreaterThan(0);
    expect(records[0]?.status).toBe("testing");
  });

  it("mantiene IDs de receta y perfiles estables al recalcular la base 7400 4H", () => {
    const input = {
      ...base,
      catalogKey: VERATEC_7400_4H_CATALOG_KEY,
      variant: VERATEC_7400_4H_VARIANTS[0].slug,
    };
    const first = resolveVeratecWorkbookFallback(input)[0];
    const second = resolveVeratecWorkbookFallback(input)[0];

    expect(first?.id).toBe(second?.id);
    expect(first?.definition.identidad.recetaId).toBe(second?.definition.identidad.recetaId);
    expect(first?.definition.perfiles.map((profile) => profile.id)).toEqual(
      second?.definition.perfiles.map((profile) => profile.id),
    );
  });

  it("usa la base 4H cuando la cotización solo trae la variante genérica estandar", () => {
    const records = resolveVeratecWorkbookFallback({
      ...base,
      catalogKey: VERATEC_7400_4H_CATALOG_KEY,
      variant: "estandar",
    });
    expect(records.map((record) => record.variant)).toEqual([VERATEC_7400_4H_VARIANTS[0].slug]);
  });

  it("mantiene disponibles las otras variantes 7400 si el taller solo configuró una", () => {
    const officialVariants = resolveVeratecWorkbookFallback({
      ...base,
      catalogKey: VERATEC_7400_CATALOG_KEY,
      variant: null,
    });
    expect(officialVariants).toHaveLength(3);

    const localMonolithicRecipe = {
      ...officialVariants.find((recipe) => recipe.variant === VERATEC_7400_VARIANT_MONOLITICO_4MM)!,
      id: "taller:7400-monolitico",
      scope: "organization" as const,
      status: "draft" as const,
    };
    const remainingVariants = resolveVeratecWorkbookFallback({
      ...base,
      catalogKey: VERATEC_7400_CATALOG_KEY,
      variant: VERATEC_7400_VARIANT_TERMOPANEL_20MM,
      recipes: [localMonolithicRecipe],
    });

    expect(remainingVariants).toHaveLength(1);
    expect(remainingVariants[0]?.variant).toBe(VERATEC_7400_VARIANT_TERMOPANEL_20MM);
  });

  it("no deja que la receta de otro taller o de Ventora bloquee esta base", () => {
    const foreignRecipe = {
      ...resolveVeratecWorkbookFallback({
        ...base,
        catalogKey: "ventora:veratec-compact-sliding-2h",
        variant: null,
      })[0],
      id: "otro-taller:receta",
      scope: "organization" as const,
      organizationId: 99,
    };
    expect(resolveVeratecWorkbookFallback({
      ...base,
      catalogKey: "ventora:veratec-compact-sliding-2h",
      variant: null,
      recipes: [foreignRecipe],
    })).toHaveLength(1);
  });
});
