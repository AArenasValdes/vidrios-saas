import { crearBaseTipologicaVentora } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { resolveLineFabricationDisplayIdentity } from "@/features/fabricacion/services/resolve-line-fabrication-display-identity.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function buildRecipe(
  definition: ReturnType<typeof crearBaseTipologicaVentora>
): FabricationRecipeRecord {
  return {
    id: "recipe-1",
    organizationId: "org-1",
    scope: "organization",
    lineTemplateId: 10,
    providerName: "Sodal",
    lineName: "Línea 5000",
    version: 1,
    status: "draft",
    sourceType: "manual",
    sourceReference: null,
    sourceName: null,
    sourceRevision: null,
    validatedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    definition,
  };
}

describe("resolveLineFabricationDisplayIdentity", () => {
  it("usa el nombre comercial de la línea como título principal", () => {
    const definition = crearBaseTipologicaVentora({
      tipologia: "corredera",
      hojas: 2,
      lineName: "Línea 5000",
    });

    const identity = resolveLineFabricationDisplayIdentity({
      template: {
        nombre: "Línea 5000",
        catalogKey: "ventora:l5000",
        proveedor: "Sodal",
      },
      recipe: buildRecipe(definition),
    });

    expect(identity.lineTitle).toBe("Línea 5000");
    expect(identity.fabricationTitle).toContain("Corredera");
    expect(identity.fabricationTitle).toContain("2 hojas");
    expect(identity.subtitleParts[0]).toBe("Sodal");
  });

  it("no mezcla tipologías contradictorias cuando el catálogo define proyectante", () => {
    const definition = crearBaseTipologicaVentora({
      tipologia: "corredera",
      hojas: 2,
      lineName: "AL-32",
    });

    const identity = resolveLineFabricationDisplayIdentity({
      template: {
        nombre: "AL-32",
        catalogKey: "ventora:l32",
        proveedor: "Ventora",
      },
      recipe: buildRecipe(definition),
    });

    expect(identity.fabricationTitle).toContain("Proyectante");
    expect(identity.fabricationTitle).not.toContain("Corredera");
  });

  it("expone estado sin receta como quote_only", () => {
    const identity = resolveLineFabricationDisplayIdentity({
      template: {
        nombre: "Línea nueva",
        catalogKey: null,
        proveedor: null,
      },
      status: "quote_only",
    });

    expect(identity.statusLabel).toBe("Sin configurar");
    expect(identity.fabricationTitle).toBe("Fabricación pendiente");
  });
});
