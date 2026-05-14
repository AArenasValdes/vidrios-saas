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
      lineTemplateId: "tpl-1",
      precioPorM2: 145000,
      minimoCobrable: 95000,
      redondeoPrecio: 1000,
      precioPlantillaSugerido: 261000,
      precioAjustadoManual: true,
      origenPrecio: "manual",
      raw: "Ventana living con vidrio claro",
    });

    expect(encoded).toContain("[c:#2a2a2a]");
    expect(encoded).toContain("[r:Serie 25]");
    expect(encoded).toContain("[m:Aluminio]");
    expect(encoded).toContain("[pm:precio_directo]");
    expect(encoded).toContain("[lti:tpl-1]");
    expect(encoded).toContain("[pm2:145000]");
    expect(encoded).toContain("[min:95000]");
    expect(encoded).toContain("[rnd:1000]");
    expect(encoded).toContain("[psu:261000]");
    expect(encoded).toContain("[man:1]");
    expect(encoded).toContain("[po:manual]");

    expect(decodeCotizacionItemPresentationMeta(encoded)).toEqual({
      colorHex: "#2a2a2a",
      material: "Aluminio",
      referencia: "Serie 25",
      pricingMode: "precio_directo",
      lineTemplateId: "tpl-1",
      precioPorM2: 145000,
      minimoCobrable: 95000,
      redondeoPrecio: 1000,
      precioPlantillaSugerido: 261000,
      precioAjustadoManual: true,
      origenPrecio: "manual",
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
      lineTemplateId: "",
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "margen",
      raw: "Cierre de terraza",
    });
  });

  it("debe conservar referencias compuestas de sistema y configuracion", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      referencia: "Fijo - Premium",
      pricingMode: "margen",
      raw: "",
    });

    expect(decodeCotizacionItemPresentationMeta(encoded).referencia).toBe(
      "Fijo - Premium"
    );
    expect(decodeCotizacionItemPresentationMeta(encoded).origenPrecio).toBe("margen");
  });

  it("debe usar colores por defecto cuando la metadata viene incompleta", () => {
    expect(decodeCotizacionItemPresentationMeta("[m:PVC]")).toEqual({
      colorHex: "#f0eeeb",
      material: "PVC",
      referencia: "",
      pricingMode: "margen",
      lineTemplateId: "",
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "margen",
      raw: "",
    });
  });

  it("debe normalizar un color legado a madera", () => {
    expect(
      decodeCotizacionItemPresentationMeta("[c:#b87333][m:Aluminio] Ventana corredera")
    ).toEqual({
      colorHex: "#8b5e3c",
      material: "Aluminio",
      referencia: "",
      pricingMode: "margen",
      lineTemplateId: "",
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "margen",
      raw: "Ventana corredera",
    });
  });
});
