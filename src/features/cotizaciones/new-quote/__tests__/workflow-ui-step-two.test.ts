import {
  applyLineTemplateToComponentForm,
  applyQuickEditDraftStatesToItems,
  buildItemFromForm,
  getSheetSchemeOptions,
  getSheetVariantOptions,
  buildQuickEditDraft,
  shouldShowSystemSelectionForComponent,
  isWorkflowItemEffectivelyComplete,
} from "../workflow-ui";
import { calculateComponentItem } from "../../services/cotizaciones-workflow.service";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function createBaseItem() {
  return calculateComponentItem({
    id: "item-1",
    codigo: "V1",
    tipo: "Ventana",
    vidrio: "Incoloro monolitico 5mm",
    nombre: "Ventana living",
    descripcion: "Ventana corredera",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    costoProveedorUnitario: 100000,
    margenPct: 50,
    observaciones: "",
  });
}

describe("workflow-ui paso 2", () => {
  it("debe aplicar borradores rapidos y recalcular el item editado", () => {
    const item = createBaseItem();

    const [actualizado] = applyQuickEditDraftStatesToItems([item], {
      [item.id]: {
        ancho: "1500",
        alto: "1300",
        costoProveedorUnitario: "250000",
      },
    });

    expect(actualizado.ancho).toBe(1500);
    expect(actualizado.alto).toBe(1300);
    expect(actualizado.costoProveedorUnitario).toBe(250000);
    expect(actualizado.precioUnitario).toBe(375000);
    expect(actualizado.precioTotal).toBe(375000);
    expect(actualizado.areaM2).toBe(1.95);
  });

  it("debe conservar el item original si el borrador rapido es invalido", () => {
    const item = createBaseItem();

    const [resultado] = applyQuickEditDraftStatesToItems([item], {
      [item.id]: {
        ancho: "1500",
        alto: "1300",
        costoProveedorUnitario: "-10",
      },
    });

    expect(resultado).toEqual(item);
  });

  it("debe considerar completo un item incompleto si el borrador rapido ya lo completa", () => {
    const itemIncompleto = calculateComponentItem({
      id: "item-2",
      codigo: "V2",
      tipo: "Ventana",
      nombre: "Ventana cocina",
      cantidad: 1,
      costoProveedorUnitario: 0,
      margenPct: 50,
    });

    expect(isWorkflowItemEffectivelyComplete(itemIncompleto)).toBe(false);
    expect(buildQuickEditDraft(itemIncompleto)).toEqual({
      ancho: "",
      alto: "",
      costoProveedorUnitario: "",
    });

    expect(
      isWorkflowItemEffectivelyComplete(itemIncompleto, {
        ancho: "900",
        alto: "1100",
        costoProveedorUnitario: "120000",
      })
    ).toBe(true);
  });

  it("debe marcar ajuste manual cuando una linea con precio automatico cambia el valor final", () => {
    const item = calculateComponentItem({
      id: "item-3",
      codigo: "V3",
      tipo: "Ventana",
      lineaComercial: "Serie 25",
      nombre: "Ventana taller",
      cantidad: 1,
      ancho: 1000,
      alto: 1000,
      costoProveedorUnitario: 145000,
      margenPct: 0,
      precioPorM2: 145000,
      minimoCobrable: 95000,
      redondeoPrecio: 1000,
      precioPlantillaSugerido: 145000,
      precioAjustadoManual: false,
      origenPrecio: "plantilla",
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#a8a8a8",
        material: "Aluminio",
        referencia: "Serie 25",
        pricingMode: "precio_directo",
        lineTemplateId: "tpl-25",
        precioPorM2: 145000,
        minimoCobrable: 95000,
        redondeoPrecio: 1000,
        precioPlantillaSugerido: 145000,
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
      }),
    });

    const [actualizado] = applyQuickEditDraftStatesToItems([item], {
      [item.id]: {
        ancho: "1000",
        alto: "1000",
        costoProveedorUnitario: "160000",
      },
    });

    const meta = decodeCotizacionItemPresentationMeta(actualizado.observaciones);

    expect(actualizado.costoProveedorUnitario).toBe(160000);
    expect(actualizado.precioAjustadoManual).toBe(true);
    expect(meta.precioAjustadoManual).toBe(true);
    expect(meta.origenPrecio).toBe("manual");
  });

  it("debe conservar precio manual al cambiar de linea y solo actualizar la sugerencia", () => {
    const actualizado = applyLineTemplateToComponentForm(
      {
        codigo: "V4",
        tipo: "Ventana",
        material: "Aluminio",
        referencia: "Serie manual",
        lineTemplateId: "tpl-old",
        pricingMode: "precio_directo",
        vidrio: "",
        nombre: "",
        descripcion: "",
        ancho: "1200",
        alto: "1000",
        cantidad: "1",
        costoProveedorUnitario: "160000",
        margenPct: "0",
        precioPorM2: "145000",
        minimoCobrable: "95000",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "145000",
        precioAjustadoManual: true,
        origenPrecio: "manual",
        observaciones: "",
        colorHex: "#a8a8a8",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        loteCantidad: "1",
      },
      {
        id: "tpl-new",
        nombre: "Serie 25",
        material: "Aluminio",
        vidrioPrincipalRecomendado: "Templado 8mm",
        precioM2Sugerido: 150000,
        minimoCobrable: 95000,
        redondeoPrecio: 5000,
      }
    );

    expect(actualizado.lineTemplateId).toBe("tpl-new");
    expect(actualizado.referencia).toBe("Serie 25");
    expect(actualizado.vidrio).toBe("Templado 8mm");
    expect(actualizado.costoProveedorUnitario).toBe("160000");
    expect(actualizado.precioAjustadoManual).toBe(true);
    expect(actualizado.origenPrecio).toBe("manual");
    expect(actualizado.precioPlantillaSugerido).toBe("180000");
  });

  it("debe generar nombre comercial con esquema de hojas sin cambiar precio", () => {
    const item = buildItemFromForm(
      {
        codigo: "V1",
        tipo: "Ventana",
        hojasBase: 2,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "3 hojas",
        sheetVariant: "Fija central",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "tpl-25",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "2400",
        alto: "1200",
        cantidad: "1",
        costoProveedorUnitario: "432000",
        margenPct: "0",
        precioPorM2: "150000",
        minimoCobrable: "0",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "432000",
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null
    );

    expect(item.nombre).toBe("Ventana corredera 3 hojas, fija central");
    expect(item.precioUnitario).toBe(432000);
    expect(decodeCotizacionItemPresentationMeta(item.observaciones)).toEqual(
      expect.objectContaining({
        sheetScheme: "3 hojas",
        sheetVariant: "Fija central",
        isCustomScheme: false,
      })
    );
  });

  it("debe exponer composiciones comerciales segun sistema sin abrir variantes tecnicas", () => {
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Corredera" })).toEqual([
      "2 hojas",
      "3 hojas",
      "4 hojas",
      "Personalizado",
    ]);
    expect(getSheetVariantOptions("4 hojas", { tipo: "Ventana", sistema: "Corredera" })).toEqual([
      "2 fijas + 2 móviles",
      "Todas móviles",
      "Laterales fijas + centrales móviles",
      "Otro",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Abatible" })).toEqual([
      "1 hoja",
      "2 hojas",
      "1 abatible + 1 fija",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Oscilobatiente" })).toEqual([
      "1 hoja",
      "2 hojas",
      "Oscilobatiente + fijo",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Proyectante" })).toEqual([
      "1 hoja",
      "Proyectante + fijo",
      "2 proyectantes",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Paño fijo", sistema: "Fijo" })).toEqual([
      "1 paño",
      "2 paños",
      "3 paños",
      "Personalizado",
    ]);
    expect(shouldShowSystemSelectionForComponent("Paño fijo")).toBe(false);
  });

  it("debe generar nombres comerciales para composiciones no correderas sin cambiar precio", () => {
    const item = buildItemFromForm(
      {
        codigo: "V2",
        tipo: "Ventana",
        hojasBase: 2,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Proyectante",
        configuracion: "",
        sheetScheme: "Proyectante + fijo",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "tpl-25",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "1200",
        alto: "1000",
        cantidad: "1",
        costoProveedorUnitario: "180000",
        margenPct: "0",
        precioPorM2: "150000",
        minimoCobrable: "0",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "180000",
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null
    );

    expect(item.nombre).toBe("Ventana proyectante + fijo");
    expect(item.precioUnitario).toBe(180000);
  });

  it("debe generar nombre comercial para paño fijo sin sistema de apertura visible", () => {
    const item = buildItemFromForm(
      {
        codigo: "PF1",
        tipo: "Paño fijo",
        hojasBase: 1,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Fijo",
        configuracion: "",
        sheetScheme: "2 paños",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "tpl-25",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "1200",
        alto: "1000",
        cantidad: "1",
        costoProveedorUnitario: "180000",
        margenPct: "0",
        precioPorM2: "150000",
        minimoCobrable: "0",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "180000",
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null
    );

    expect(item.nombre).toBe("Paño fijo 2 paños");
    expect(item.precioUnitario).toBe(180000);
  });
});
