import { buildCotizacionItemPrintSpecs } from "../item-print-specs";

const baseInput = {
  dimensionsLabel: "800 x 1800 mm",
  surfaceLabel: "1.44 m2 aprox.",
  vidrio: "Espejo 4mm",
  material: "PVC",
  colorName: "Blanco",
  systemLabel: "Muro",
  lineLabel: "Muro - Pulido",
  configuracion: "Pulido",
};

describe("buildCotizacionItemPrintSpecs", () => {
  it("debe omitir material y color para espejos y cubiertas de mesa", () => {
    const espejoSpecs = buildCotizacionItemPrintSpecs({
      ...baseInput,
      tipo: "Espejo",
    });
    const mesaSpecs = buildCotizacionItemPrintSpecs({
      ...baseInput,
      tipo: "Cubierta de mesa",
      vidrio: "Templado 8mm",
      systemLabel: "Recta",
      lineLabel: "Recta - Canto pulido",
      configuracion: "Canto pulido",
    });

    expect(espejoSpecs.map((spec) => spec.key)).toEqual([
      "Dimensiones",
      "Configuración",
      "Sistema",
      "Línea",
      "Vidrio",
      "Superficie",
    ]);
    expect(mesaSpecs.map((spec) => spec.key)).not.toContain("Material");
    expect(mesaSpecs.map((spec) => spec.key)).not.toContain("Color");
  });

  it("debe mantener material y color para componentes con perfileria", () => {
    const ventanaSpecs = buildCotizacionItemPrintSpecs({
      ...baseInput,
      tipo: "Ventana",
      vidrio: "Incoloro monolitico 5mm",
      systemLabel: "Corredera",
      lineLabel: "Serie 25",
      configuracion: "2 hojas",
    });

    expect(ventanaSpecs.map((spec) => spec.key)).toEqual([
      "Dimensiones",
      "Configuración",
      "Sistema",
      "Línea",
      "Material",
      "Color",
      "Vidrio",
      "Superficie",
    ]);
  });
});
