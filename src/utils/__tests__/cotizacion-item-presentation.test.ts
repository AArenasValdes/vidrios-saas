import {
  buildCotizacionItemSheetSchemeLabel,
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
  shouldShowCotizacionItemSheetSchemeSpec,
} from "@/utils/cotizacion-item-presentation";
import {
  createDefaultGuidedVisualConfig,
  countLeafModules,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

describe("cotizacion-item-presentation", () => {
  it("debe codificar y decodificar la metadata visual del componente", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#2a2a2a",
      material: "Aluminio",
      referencia: "Serie 25",
      sistema: "Oscilobatiente",
      configuracion: "Premium",
      hojasBase: 1,
      sheetScheme: "3 hojas",
      sheetVariant: "Fija central",
      customSchemeDescription: "",
      isCustomScheme: false,
      pricingMode: "precio_directo",
      lineTemplateId: "tpl-1",
      precioPorM2: 145000,
      minimoCobrable: 95000,
      redondeoPrecio: 1000,
      precioPlantillaSugerido: 261000,
      precioAjustadoManual: true,
      origenPrecio: "manual",
      ivaMode: null,
      totalClienteVisible: null,
      netoCalculado: null,
      ivaCalculado: null,
      displayMode: "componente",
      raw: "Ventana living con vidrio claro",
    });

    expect(encoded).toContain("[c:#2a2a2a]");
    expect(encoded).toContain("[r:Serie 25]");
    expect(encoded).toContain("[sys:Oscilobatiente]");
    expect(encoded).toContain("[cfg:Premium]");
    expect(encoded).toContain("[hb:1]");
    expect(encoded).toContain("[ss:3 hojas]");
    expect(encoded).toContain("[sv:Fija central]");
    expect(encoded).toContain("[isc:0]");
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
      catalogCategoria: "aluminio",
      catalogEspesor: "",
      catalogTerminacion: "",
      colorHex: "#2a2a2a",
      material: "Aluminio",
      referencia: "Serie 25",
      sistema: "Oscilobatiente",
      configuracion: "Premium",
      hojasBase: 1,
      sheetScheme: "3 hojas",
      sheetVariant: "Fija central",
      customSchemeDescription: "",
      isCustomScheme: false,
      pricingMode: "precio_directo",
      lineTemplateId: "tpl-1",
      precioPorM2: 145000,
      minimoCobrable: 95000,
      redondeoPrecio: 1000,
      precioPlantillaSugerido: 261000,
      precioAjustadoManual: true,
      origenPrecio: "manual",
      ivaMode: null,
      totalClienteVisible: null,
      netoCalculado: null,
      ivaCalculado: null,
      displayMode: "componente",
      palilloEnabled: false,
      palilloType: "",
      encodedMargenPct: null,
      guidedVisualConfig: null,
      encodedCostInputScope: "",
      mirrorFormat: "single",
      mirrorPaneCount: null,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "fine",
      raw: "Ventana living con vidrio claro",
    });
  });

  it("debe soportar cotizaciones antiguas que guardaban la referencia como linea", () => {
    expect(
      decodeCotizacionItemPresentationMeta("[c:#ffffff][l:S60][m:PVC] Cierre de terraza")
    ).toEqual({
      catalogCategoria: "pvc",
      catalogEspesor: "",
      catalogTerminacion: "",
      colorHex: "#ffffff",
      material: "PVC",
      referencia: "S60",
      sistema: "",
      configuracion: "",
      hojasBase: null,
      sheetScheme: "",
      sheetVariant: "",
      customSchemeDescription: "",
      isCustomScheme: false,
      pricingMode: "margen",
      lineTemplateId: "",
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "margen",
      ivaMode: null,
      totalClienteVisible: null,
      netoCalculado: null,
      ivaCalculado: null,
      displayMode: "componente",
      palilloEnabled: false,
      palilloType: "",
      encodedMargenPct: null,
      guidedVisualConfig: null,
      encodedCostInputScope: "",
      mirrorFormat: "single",
      mirrorPaneCount: null,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "fine",
      raw: "Cierre de terraza",
    });
  });

  it("debe codificar y decodificar metadata de producto de cristal", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      material: "Cristal",
      referencia: "Cristal templado 10 mm",
      catalogCategoria: "vidrio",
      catalogEspesor: "10 mm",
      catalogTerminacion: "Templado",
      raw: "Cristal templado para vano fijo",
    });

    expect(encoded).toContain("[m:Cristal]");
    expect(encoded).toContain("[cat:vidrio]");
    expect(encoded).toContain("[ce:10 mm]");
    expect(encoded).toContain("[ct:Templado]");
    expect(decodeCotizacionItemPresentationMeta(encoded)).toEqual(
      expect.objectContaining({
        material: "Cristal",
        referencia: "Cristal templado 10 mm",
        catalogCategoria: "vidrio",
        catalogEspesor: "10 mm",
        catalogTerminacion: "Templado",
        raw: "Cristal templado para vano fijo",
      })
    );
  });

  it("debe preservar sistema, configuracion y composicion de shower door sin variante", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#111827",
      material: "Aluminio",
      referencia: "Corredera - Frontal",
      sistema: "Corredera",
      configuracion: "Frontal",
      sheetScheme: "2 hojas correderas",
      sheetVariant: "",
    });

    expect(decodeCotizacionItemPresentationMeta(encoded)).toEqual(
      expect.objectContaining({
        sistema: "Corredera",
        configuracion: "Frontal",
        sheetScheme: "2 hojas correderas",
        sheetVariant: "",
      })
    );
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
    expect(decodeCotizacionItemPresentationMeta(encoded).hojasBase).toBeNull();
    expect(decodeCotizacionItemPresentationMeta(encoded).sheetScheme).toBe("");
    expect(decodeCotizacionItemPresentationMeta(encoded).origenPrecio).toBe("margen");
  });

  it("debe conservar un esquema de hojas personalizado", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      sistema: "Corredera",
      sheetScheme: "Personalizado",
      sheetVariant: "",
      customSchemeDescription: "3 hojas con pano fijo superior",
      isCustomScheme: true,
    });

    expect(decodeCotizacionItemPresentationMeta(encoded)).toEqual(
      expect.objectContaining({
        sheetScheme: "Personalizado",
        sheetVariant: "",
        customSchemeDescription: "3 hojas con pano fijo superior",
        isCustomScheme: true,
      })
    );
  });

  it("debe codificar formato de espejo dividido sin mezclarlo con observaciones visibles", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      sistema: "Muro",
      mirrorFormat: "divided",
      mirrorPaneCount: 6,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "marked",
      raw: "Nota interna",
    });

    expect(encoded).toContain("[mf:divided]");
    expect(encoded).toContain("[mpc:6]");
    expect(encoded).toContain("[mpd:vertical]");
    expect(encoded).toContain("[mil:marked]");
    expect(decodeCotizacionItemPresentationMeta(encoded)).toEqual(
      expect.objectContaining({
        mirrorFormat: "divided",
        mirrorPaneCount: 6,
        mirrorPaneDirection: "vertical",
        mirrorInteriorLine: "marked",
        raw: "Nota interna",
      })
    );
  });

  it("debe construir una etiqueta comercial de esquema para PDF y detalle", () => {
    expect(
      buildCotizacionItemSheetSchemeLabel({
        sheetScheme: "4 hojas",
        sheetVariant: "Laterales fijas + centrales moviles",
        customSchemeDescription: "",
        isCustomScheme: false,
      })
    ).toBe("4 hojas · Laterales fijas + centrales moviles");

    expect(
      buildCotizacionItemSheetSchemeLabel({
        sheetScheme: "Personalizado",
        sheetVariant: "",
        customSchemeDescription: "3 hojas con pano fijo superior",
        isCustomScheme: true,
      })
    ).toBe("Personalizado: 3 hojas con pano fijo superior");
  });

  it("debe ocultar el esquema en la ficha cuando ya viene en el nombre del item", () => {
    expect(
      shouldShowCotizacionItemSheetSchemeSpec({
        itemName: "Ventana corredera 4 hojas, laterales fijas + centrales moviles",
        sheetSchemeLabel: "4 hojas · Laterales fijas + centrales moviles",
        sheetScheme: "4 hojas",
        sheetVariant: "Laterales fijas + centrales moviles",
        customSchemeDescription: "",
      })
    ).toBe(false);

    expect(
      shouldShowCotizacionItemSheetSchemeSpec({
        itemName: "Ventana corredera",
        sheetSchemeLabel: "4 hojas · Laterales fijas + centrales moviles",
        sheetScheme: "4 hojas",
        sheetVariant: "Laterales fijas + centrales moviles",
        customSchemeDescription: "",
      })
    ).toBe(true);
  });

  it("debe usar colores por defecto cuando la metadata viene incompleta", () => {
    expect(decodeCotizacionItemPresentationMeta("[m:PVC]")).toEqual({
      catalogCategoria: "pvc",
      catalogEspesor: "",
      catalogTerminacion: "",
      colorHex: "#f0eeeb",
      material: "PVC",
      referencia: "",
      sistema: "",
      configuracion: "",
      hojasBase: null,
      sheetScheme: "",
      sheetVariant: "",
      customSchemeDescription: "",
      isCustomScheme: false,
      pricingMode: "margen",
      lineTemplateId: "",
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "margen",
      ivaMode: null,
      totalClienteVisible: null,
      netoCalculado: null,
      ivaCalculado: null,
      displayMode: "componente",
      palilloEnabled: false,
      palilloType: "",
      encodedMargenPct: null,
      guidedVisualConfig: null,
      encodedCostInputScope: "",
      mirrorFormat: "single",
      mirrorPaneCount: null,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "fine",
      raw: "",
    });
  });

  it("debe normalizar un color legado a madera", () => {
    expect(
      decodeCotizacionItemPresentationMeta("[c:#b87333][m:Aluminio] Ventana corredera")
    ).toEqual({
      catalogCategoria: "aluminio",
      catalogEspesor: "",
      catalogTerminacion: "",
      colorHex: "#8b5e3c",
      material: "Aluminio",
      referencia: "",
      sistema: "",
      configuracion: "",
      hojasBase: null,
      sheetScheme: "",
      sheetVariant: "",
      customSchemeDescription: "",
      isCustomScheme: false,
      pricingMode: "margen",
      lineTemplateId: "",
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "margen",
      ivaMode: null,
      totalClienteVisible: null,
      netoCalculado: null,
      ivaCalculado: null,
      displayMode: "componente",
      palilloEnabled: false,
      palilloType: "",
      encodedMargenPct: null,
      guidedVisualConfig: null,
      encodedCostInputScope: "",
      mirrorFormat: "single",
      mirrorPaneCount: null,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "fine",
      raw: "Ventana corredera",
    });
  });

  it("debe guardar metadata de item libre con IVA desglosado", () => {
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      pricingMode: "precio_directo",
      ivaMode: "total_incluye_iva",
      totalClienteVisible: 119000,
      netoCalculado: 100000,
      ivaCalculado: 19000,
      displayMode: "item_libre",
      raw: "Mantencion de ventanas",
    });

    expect(decodeCotizacionItemPresentationMeta(encoded)).toEqual(
      expect.objectContaining({
        ivaMode: "total_incluye_iva",
        totalClienteVisible: 119000,
        netoCalculado: 100000,
        ivaCalculado: 19000,
        displayMode: "item_libre",
        raw: "Mantencion de ventanas",
      })
    );
  });

  it("debe codificar y decodificar guidedVisualConfig V2 en el bridge gvc", () => {
    const guided = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1200 });
    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      sistema: "Corredera",
      sheetScheme: "Personalizado",
      isCustomScheme: true,
      pricingMode: "precio_directo",
      guidedVisualConfig: guided,
    });

    expect(encoded).toContain("[gvc:2|");
    const decoded = decodeCotizacionItemPresentationMeta(encoded);
    expect(decoded.guidedVisualConfig).not.toBeNull();
    expect(decoded.guidedVisualConfig?.widthMm).toBe(1500);
    expect(decoded.guidedVisualConfig?.heightMm).toBe(1200);
    expect(decoded.guidedVisualConfig && countLeafModules(decoded.guidedVisualConfig.root)).toBe(1);
  });
});
