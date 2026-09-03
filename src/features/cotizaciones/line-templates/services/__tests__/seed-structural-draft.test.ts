import { seedStructuralDraftsForOrganization } from "../seed-structural-draft";

describe("seedStructuralDraftsForOrganization", () => {
  it("inserta borradores solo para líneas Ventora sin receta", async () => {
    const inserted: Record<string, unknown>[] = [];

    const result = await seedStructuralDraftsForOrganization("org-1", {
      async listVentoraLineTemplates() {
        return [
          {
            id: 10,
            catalog_key: "ventora:l5000",
            nombre: "Serie 5000",
            proveedor: null,
            catalog_metadata: { structuralArchetypeId: "corredera_2h" },
          },
          {
            id: 11,
            catalog_key: "ventora:optima-s28-corredera-3h",
            nombre: "Óptima S-28 3h",
            proveedor: null,
            catalog_metadata: {},
          },
          {
            id: 12,
            catalog_key: null,
            nombre: "Línea privada",
            proveedor: null,
          },
        ];
      },
      async listLineTemplateIdsWithRecipes() {
        return [11];
      },
      async insertStructuralRecipe(payload) {
        inserted.push(payload);
      },
    });

    expect(result.seeded).toBe(1);
    expect(result.skipped).toBe(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      organization_id: "org-1",
      line_template_id: 10,
      status: "draft",
      source_reference: "ventora-arquetipo:corredera_2h",
    });
    expect(
      (inserted[0]?.definition as { perfiles: unknown[] }).perfiles.length
    ).toBeGreaterThan(0);
  });

  it("no inserta si la línea ya tiene receta", async () => {
    const result = await seedStructuralDraftsForOrganization("org-2", {
      async listVentoraLineTemplates() {
        return [
          {
            id: 20,
            catalog_key: "ventora:l20",
            nombre: "Serie 20",
          },
        ];
      },
      async listLineTemplateIdsWithRecipes() {
        return [20];
      },
      async insertStructuralRecipe() {
        throw new Error("no debería insertar");
      },
    });

    expect(result.seeded).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
