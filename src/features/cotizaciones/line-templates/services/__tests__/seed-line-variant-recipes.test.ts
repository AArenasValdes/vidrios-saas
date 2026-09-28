import { WINHOUSE_NEW_S75_VARIANTS } from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import { seedLineVariantRecipesForOrganization } from "../seed-line-variant-recipes";

describe("seedLineVariantRecipesForOrganization", () => {
  it("siembra todas las variantes S75 cuando la línea antigua no tiene catalog_key", async () => {
    const inserted: Array<Record<string, unknown>> = [];

    const result = await seedLineVariantRecipesForOrganization("org-test", {
      listVentoraLineTemplates: async () => [
        {
          id: 226,
          catalog_key: null,
          nombre: "WinHouse New S75 — Doble riel",
          proveedor: "WinHouse",
        },
      ],
      listRecipesForOrganization: async () => [],
      insertVariantRecipe: async (payload) => {
        inserted.push(payload);
      },
    });

    const expected = WINHOUSE_NEW_S75_VARIANTS.filter((variant) => variant.railCount === 2);
    expect(result).toEqual({ seeded: expected.length, skipped: 0 });
    expect(inserted).toHaveLength(expected.length);
    expect(new Set(inserted.map((recipe) => recipe.variant))).toEqual(
      new Set(expected.map((variant) => variant.slug))
    );
    expect(inserted.every((recipe) => recipe.source_type === "supplier")).toBe(true);
  });

  it("no infiere S75 para otra marca aunque el nombre mencione la serie", async () => {
    const insertVariantRecipe = jest.fn();

    const result = await seedLineVariantRecipesForOrganization("org-test", {
      listVentoraLineTemplates: async () => [
        {
          id: 227,
          catalog_key: null,
          nombre: "New S75 — Doble riel",
          proveedor: "Proveedor de taller",
        },
      ],
      listRecipesForOrganization: async () => [],
      insertVariantRecipe,
    });

    expect(result).toEqual({ seeded: 0, skipped: 0 });
    expect(insertVariantRecipe).not.toHaveBeenCalled();
  });
});
