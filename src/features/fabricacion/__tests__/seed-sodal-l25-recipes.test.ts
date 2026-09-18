import {
  buildAllSodalL25Recipes,
  SODAL_L25_CANONICAL_RECIPE_IDS,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { seedSodalL25RecipesForOrganization } from "@/features/fabricacion/services/seed-sodal-l25-recipes";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

describe("seed SODAL L25 recipes", () => {
  it("inserta 18 recetas validated idempotentes por source_reference", async () => {
    const inserted: Record<string, unknown>[] = [];
    const archived: string[] = [];
    const recipes: FabricationRecipeRecord[] = [
      {
        id: "legacy-l25",
        organizationId: 1,
        lineTemplateId: 10,
        scope: "organization",
        providerName: "SODAL",
        lineName: "L25",
        typology: "corredera",
        leavesCount: 2,
        variant: "caracol",
        version: 1,
        status: "draft",
        definition: buildAllSodalL25Recipes()[0]!.definition,
        sourceType: "manual",
        sourceReference: "ventora-variant:l25:2h:caracol",
        parentRecipeId: null,
        validatedAt: null,
        validatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        eliminadoEn: null,
      },
    ];

    const deps = {
      async listVentoraLineTemplates() {
        return [{ id: 10, catalog_key: "ventora:l25", nombre: "L25", proveedor: "SODAL" }];
      },
      async listRecipesForOrganization() {
        return recipes;
      },
      async insertSodalRecipe(payload: Record<string, unknown>) {
        inserted.push(payload);
        recipes.push({
          id: String(inserted.length),
          organizationId: 1,
          lineTemplateId: 10,
          scope: "organization",
          providerName: "SODAL",
          lineName: "L25",
          typology: "corredera",
          leavesCount: 2,
          variant: String(payload.variant ?? ""),
          version: 1,
          status: "validated",
          definition: payload.definition as FabricationRecipeRecord["definition"],
          sourceType: "manufacturer",
          sourceReference: String(payload.source_reference ?? ""),
          parentRecipeId: null,
          validatedAt: new Date().toISOString(),
          validatedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          eliminadoEn: null,
        });
      },
      async archiveLegacyRecipe(recipeId: string) {
        archived.push(recipeId);
      },
    };

    const first = await seedSodalL25RecipesForOrganization(1, deps);
    expect(first.seeded).toBe(18);
    expect(first.archived).toBe(1);
    expect(inserted).toHaveLength(18);
    expect(new Set(inserted.map((row) => row.source_reference)).size).toBe(18);
    inserted.forEach((row) => {
      expect(row.status).toBe("validated");
      expect(row.source_type).toBe("manufacturer");
    });

    const second = await seedSodalL25RecipesForOrganization(1, deps);
    expect(second.seeded).toBe(0);
    expect(second.skipped).toBe(18);
    expect(SODAL_L25_CANONICAL_RECIPE_IDS).toHaveLength(18);
  });
});
