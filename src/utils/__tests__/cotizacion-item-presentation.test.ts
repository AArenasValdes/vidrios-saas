import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

describe("cotizacion-item-presentation", () => {
  it("debe codificar y decodificar la metadata visual del componente", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#2a2a2a",
      material: "Aluminio",
      referencia: "Serie 25",
      pricingMode: "precio_directo",
      raw: "Ventana living con vidrio claro",
    });

    expect(encoded).toContain("[c:#2a2a2a]");
    expect(encoded).toContain("[r:Serie 25]");
    expect(encoded).toContain("[m:Aluminio]");
    expect(encoded).toContain("[pm:precio_directo]");

    expect(decodeCotizacionItemPresentationMeta(encoded)).toEqual({
      colorHex: "#2a2a2a",
      material: "Aluminio",
      referencia: "Serie 25",
      pricingMode: "precio_directo",
      raw: "Ventana living con vidrio claro",
    });
  });

  it("debe soportar cotizaciones antiguas que guardaban la referencia como linea", () => {
    expect(
      decodeCotizacionItemPresentationMeta("[c:#ffffff][l:S60][m:PVC] Cierre de terraza")
    ).toEqual({
      colorHex: "#ffffff",
      material: "PVC",
      referencia: "S60",
      pricingMode: "margen",
      raw: "Cierre de terraza",
    });
  });

  it("debe usar colores por defecto cuando la metadata viene incompleta", () => {
    expect(decodeCotizacionItemPresentationMeta("[m:PVC]")).toEqual({
      colorHex: "#f0eeeb",
      material: "PVC",
      referencia: "",
      pricingMode: "margen",
      raw: "",
    });
  });
});
