import { resolveVeratecWorkbookFallback } from "@/features/fabricacion/services/fabricacion-receta-veratec-fallback.service";
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
    ["ventora:veratec-elegans-60-ventana-hoja-interior", null, "elegans_ventana_hoja_interior"],
    ["ventora:veratec-elegans-60-ventana-hoja-exterior", null, "elegans_ventana_hoja_exterior"],
    ["ventora:veratec-elegans-60-puerta-hoja-interior", null, "elegans_puerta_hoja_interior"],
    ["ventora:veratec-elegans-60-puerta-hoja-exterior", null, "elegans_puerta_hoja_exterior"],
    ["ventora:veratec-7400-corredera-3h", "7400_3h_chica_2rieles", "7400_3h_chica_2rieles"],
    ["ventora:veratec-7400-monorriel", "7400_monorriel_hoja_grande", "7400_monorriel_hoja_grande"],
    ["ventora:veratec-elegans-60-fijo", "elegans_fijo_marco_normal", "elegans_fijo_marco_normal"],
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
      sourceName: "Veratec · pauta de corte facilitada",
      variant: expectedVariant,
      validatedAt: null,
      validatedBy: null,
    });
  });

  it.each([
    ["ventora:veratec-7400-corredera-3h", ["7400_3h_grande_2rieles", "7400_3h_chica_2rieles"]],
    ["ventora:veratec-7400-monorriel", ["7400_monorriel_hoja_grande", "7400_monorriel_hoja_chica"]],
    ["ventora:veratec-elegans-60-fijo", ["elegans_fijo_marco_normal", "elegans_fijo_marco_rebajado"]],
  ])("devuelve las opciones sin elegir una por defecto para %s", (catalogKey, expected) => {
    const records = resolveVeratecWorkbookFallback({ ...base, catalogKey, variant: null });
    expect(records.map((record) => record.variant)).toEqual(expected);
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
