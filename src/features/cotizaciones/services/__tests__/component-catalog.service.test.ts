import {
  getBaseLeafCountForComponent,
  getConfigurationOptionsForComponent,
  getConfigurationOptionsForComponentSistema,
  getComponentTypeOptionsForCategory,
  getSystemOptionsForComponent,
  resolveComponentCategory,
  splitComponentReference,
} from "../component-catalog.service";

describe("component-catalog service", () => {
  it("debe exponer categorias profesionales para el flujo movil", () => {
    expect(getComponentTypeOptionsForCategory("Aberturas")).toEqual([
      "Ventana",
      "Puerta",
      "Paño fijo",
      "Shower door",
    ]);
    expect(getComponentTypeOptionsForCategory("Interiores y decoracion")).toEqual([
      "Espejo",
      "Cubierta de mesa",
    ]);
    const especiales = getComponentTypeOptionsForCategory("Especiales");

    expect(especiales).toContain("Trabajo personalizado");
    expect(especiales).not.toContain("Componente manual");
    expect(especiales).not.toContain("Proyecto a medida");
    expect(especiales).not.toContain("Otro trabajo especial");
  });

  it("debe exponer 'Proyecto libre y Mantencion' con un solo item consolidado", () => {
    const libres = getComponentTypeOptionsForCategory("Proyecto libre y Mantencion");
    expect(libres).toHaveLength(1);
    expect(libres).toEqual(["Trabajo libre / Mantencion"]);
  });

  it("debe exponer circular como sistema de cubierta de mesa", () => {
    expect(getSystemOptionsForComponent("Cubierta de mesa")).toEqual([
      "Recta",
      "Forma especial",
      "Circular",
    ]);
  });

  it("debe separar sistema y configuracion en paño fijo y shower door", () => {
    expect(getSystemOptionsForComponent("Paño fijo")).toEqual(["Fijo"]);
    expect(getConfigurationOptionsForComponent("Paño fijo")).toEqual([
      "Con perfileria",
      "Sin perfileria",
      "Premium",
    ]);

    expect(getSystemOptionsForComponent("Shower door")).toEqual([
      "Corredera",
      "Batiente",
    ]);
    expect(getConfigurationOptionsForComponent("Shower door")).toEqual([
      "Frontal",
      "Esquinero",
      "En L",
    ]);
  });

  it("debe ofrecer oscilobatiente para ventanas y reconocerlo en referencias", () => {
    expect(getSystemOptionsForComponent("Ventana")).toEqual([
      "Corredera",
      "Proyectante",
      "Abatible",
      "Oscilobatiente",
      "Bow Window",
    ]);
    expect(getConfigurationOptionsForComponentSistema("Ventana", "Bow Window")).toEqual([
      "Corredera",
      "Proyectante",
      "Batiente / abatible",
      "Fija",
      "Mixta",
    ]);
    expect(getSystemOptionsForComponent("Ventana 1 hoja")).toEqual(["Fijo"]);

    expect(splitComponentReference("Oscilobatiente", "Ventana")).toEqual({
      sistema: "Oscilobatiente",
      configuracion: "",
    });
    expect(getBaseLeafCountForComponent("Ventana")).toBe(2);
    expect(getBaseLeafCountForComponent("Ventana 1 hoja")).toBe(1);
    expect(getBaseLeafCountForComponent("Paño fijo")).toBe(1);
  });

  it("debe corregir cierre terraza para no usar a medida como sistema", () => {
    expect(getSystemOptionsForComponent("Cierre terraza/logia")).toEqual([
      "Corredera",
      "Plegable",
      "Fijo",
      "Mixto",
    ]);
  });

  it("debe leer referencias antiguas sin romper el nuevo modelo", () => {
    expect(resolveComponentCategory("Cierre (Logia/Balcon)")).toBe(
      "Cierres y exteriores"
    );
    expect(splitComponentReference("Fijo premium", "Paño fijo")).toEqual({
      sistema: "Fijo",
      configuracion: "Premium",
    });
  });

  it("debe aceptar nombres legados aunque el catalogo visible use ñ", () => {
    expect(resolveComponentCategory("Pano Fijo")).toBe("Aberturas");
    expect(resolveComponentCategory("PaÃƒÂ±o Fijo")).toBe("Aberturas");
    expect(getSystemOptionsForComponent("Pano Fijo")).toEqual(["Fijo"]);
    expect(resolveComponentCategory("Ventana fija")).toBe("Aberturas");
    expect(getSystemOptionsForComponent("Ventana fija")).toEqual(["Fijo"]);
    expect(getComponentTypeOptionsForCategory("Aberturas")).toContain("Paño fijo");
    expect(getComponentTypeOptionsForCategory("Aberturas")).not.toContain("Ventana 1 hoja");
  });
});
