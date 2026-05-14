import {
  applyLineTemplateToComponentForm,
  applyQuickEditDraftStatesToItems,
  buildQuickEditDraft,
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
        loteCantidad: "1",
      },
      {
        id: "tpl-new",
        nombre: "Serie 25",
        material: "Aluminio",
        precioM2Sugerido: 150000,
        minimoCobrable: 95000,
        redondeoPrecio: 5000,
      }
    );

    expect(actualizado.lineTemplateId).toBe("tpl-new");
    expect(actualizado.referencia).toBe("Serie 25");
    expect(actualizado.costoProveedorUnitario).toBe("160000");
    expect(actualizado.precioAjustadoManual).toBe(true);
    expect(actualizado.origenPrecio).toBe("manual");
    expect(actualizado.precioPlantillaSugerido).toBe("180000");
  });
});
