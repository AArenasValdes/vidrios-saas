import {
  compareLineTemplateGroups,
  groupLineTemplatesByProvider,
  listLineTemplateProviderFilterOptions,
} from "@/features/cotizaciones/line-templates/services/line-template-group.service";

describe("listLineTemplateProviderFilterOptions", () => {
  it("ordena proveedores y deja Sin proveedor al final", () => {
    expect(
      listLineTemplateProviderFilterOptions(["Winart", null, "Alar", "", "Arquetipo", "Winart"])
    ).toEqual(["Alar", "Arquetipo", "Winart", "Sin proveedor"]);
  });
});

describe("groupLineTemplatesByProvider", () => {
  it("agrupa y ordena proveedores con Sin proveedor al final", () => {
    const groups = groupLineTemplatesByProvider([
      { nombre: "Serie Z", proveedor: null },
      { nombre: "Serie B", proveedor: "Winart" },
      { nombre: "Serie A", proveedor: "Alar" },
      { nombre: "Serie C", proveedor: "Winart" },
      { nombre: "Serie Y", proveedor: "" },
    ]);

    expect(groups.map((group) => group.provider)).toEqual([
      "Alar",
      "Winart",
      "Sin proveedor",
    ]);
    expect(groups[1].templates.map((template) => template.nombre)).toEqual([
      "Serie B",
      "Serie C",
    ]);
  });
});

describe("compareLineTemplateGroups", () => {
  it("deja Sin proveedor al final, aunque alfabéticamente vaya antes", () => {
    const groups = [
      { provider: "Sin proveedor", system: "Sin sistema" },
      { provider: "Winart", system: "Corredera" },
      { provider: "AluTech", system: "Abatible" },
    ];

    const sorted = [...groups].sort(compareLineTemplateGroups);

    expect(sorted.map((group) => group.provider)).toEqual([
      "AluTech",
      "Winart",
      "Sin proveedor",
    ]);
  });

  it("dentro del mismo proveedor deja Sin sistema al final", () => {
    const groups = [
      { provider: "Winart", system: "Sin sistema" },
      { provider: "Winart", system: "Corredera" },
      { provider: "Winart", system: "Abatible" },
    ];

    const sorted = [...groups].sort(compareLineTemplateGroups);

    expect(sorted.map((group) => group.system)).toEqual([
      "Abatible",
      "Corredera",
      "Sin sistema",
    ]);
  });
});
