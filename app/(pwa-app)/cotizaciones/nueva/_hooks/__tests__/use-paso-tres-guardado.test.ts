import { preparePasoTresGuardado } from "../use-paso-tres-guardado";
import {
  calculateComponentItem,
  calculateFreeValueItem,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";

describe("preparePasoTresGuardado", () => {
  it("debe validar usando los items ya mezclados con borradores rapidos", () => {
    const itemBase = calculateComponentItem({
      id: "item-1",
      codigo: "V1",
      tipo: "Ventana",
      nombre: "Ventana living",
      cantidad: 1,
      costoProveedorUnitario: 0,
      margenPct: 50,
    });

    const itemCompleto = calculateComponentItem({
      ...itemBase,
      ancho: 1000,
      alto: 1200,
      costoProveedorUnitario: 180000,
      margenPct: 50,
    });

    const resultado = preparePasoTresGuardado({
      estado: "creada",
      draft: {
        clienteNombre: "Jose Fuentes",
        clienteTelefono: "+56 9 1111 1111",
        obra: "Casa central",
        direccion: "",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 0,
        observaciones: "",
        items: [itemBase],
      },
      applyQuickEditDraftsToItems: () => [itemCompleto],
    });

    expect(resultado.draftToSave.items[0]).toEqual(itemCompleto);
    expect(resultado.step1Errors).toEqual({});
    expect(resultado.finalErrors).toEqual({});
  });

  it("debe exigir al menos un componente al guardar una cotizacion final", () => {
    const resultado = preparePasoTresGuardado({
      estado: "creada",
      draft: {
        clienteNombre: "Jose Fuentes",
        clienteTelefono: "",
        obra: "Casa central",
        direccion: "",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 0,
        observaciones: "",
        items: [],
      },
      applyQuickEditDraftsToItems: (items) => items,
    });

    expect(resultado.finalErrors.items).toBe("Agrega al menos un componente");
  });

  it("debe permitir presupuesto por total con item libre descriptivo sin precio por item", () => {
    const itemDescriptivo = calculateFreeValueItem({
      codigo: "L1",
      nombre: "Mantencion de ventanas",
      descripcion: "",
      valor: 0,
      ivaMode: "total_incluye_iva",
      allowZeroValue: true,
    });

    const resultado = preparePasoTresGuardado({
      estado: "creada",
      draft: {
        clienteNombre: "Pedro Gonzales",
        clienteTelefono: "",
        obra: "Trabajo de Pedro Gonzales",
        direccion: "",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 0,
        observaciones: "",
        items: [itemDescriptivo],
        quotePricingMode: "total_global",
        totalClienteManual: 250000,
        mostrarIva: true,
        costoTotalFabricacion: 0,
        margenGlobalPct: 0,
        utilidadTotal: 0,
      },
      applyQuickEditDraftsToItems: (items) => items,
    });

    expect(resultado.finalErrors).toEqual({});
    expect(resultado.draftToSave.items[0]?.precioTotal).toBe(0);
  });

  it("debe conservar la validacion del paso 1 al guardar un borrador", () => {
    const resultado = preparePasoTresGuardado({
      estado: "borrador",
      draft: {
        clienteNombre: "",
        clienteTelefono: "",
        obra: "",
        direccion: "",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 0,
        observaciones: "",
        items: [],
      },
      applyQuickEditDraftsToItems: (items) => items,
    });

    expect(resultado.step1Errors.step1).toBeUndefined();
    expect(resultado.finalErrors.step1).toBeUndefined();
  });

  it("debe autocompletar la obra cuando el cliente existe y el campo viene vacio", () => {
    const resultado = preparePasoTresGuardado({
      estado: "borrador",
      draft: {
        clienteNombre: "Jose Fuentes",
        clienteTelefono: "",
        obra: "   ",
        direccion: "",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 0,
        observaciones: "",
        items: [],
      },
      applyQuickEditDraftsToItems: (items) => items,
    });

    expect(resultado.draftToSave.obra).toBe("Trabajo de Jose Fuentes");
    expect(resultado.step1Errors).toEqual({});
    expect(resultado.finalErrors).toEqual({});
  });
});
