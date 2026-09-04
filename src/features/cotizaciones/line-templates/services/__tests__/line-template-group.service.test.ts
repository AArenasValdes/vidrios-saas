import {
  partitionLineTemplatesByCatalogOrigin,
  sortVentoraCatalogTemplates,
} from "@/features/cotizaciones/line-templates/services/line-template-group.service";

describe("line-template-group.service catalog origin", () => {
  it("particiona líneas Ventora y propias", () => {
    const templates = [
      { catalogKey: "ventora:l42", nombre: "Serie 42" },
      { catalogKey: null, nombre: "Línea taller" },
      { catalogKey: "ventora:l32", nombre: "Serie 32" },
      { catalogKey: "custom:linea", nombre: "AM custom" },
    ];

    const { ventora, propias } = partitionLineTemplatesByCatalogOrigin(templates);

    expect(ventora.map((line) => line.catalogKey)).toEqual([
      "ventora:l32",
      "ventora:l42",
    ]);
    expect(propias.map((line) => line.nombre)).toEqual(["AM custom", "Línea taller"]);
  });

  it("ordena ventora según catálogo canónico", () => {
    const sorted = sortVentoraCatalogTemplates([
      { catalogKey: "ventora:l42", nombre: "Serie 42" },
      { catalogKey: "ventora:l5000", nombre: "L5000" },
      { catalogKey: "ventora:l20", nombre: "L20" },
    ]);

    expect(sorted.map((line) => line.catalogKey)).toEqual([
      "ventora:l5000",
      "ventora:l20",
      "ventora:l42",
    ]);
  });
});
