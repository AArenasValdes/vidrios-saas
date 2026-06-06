import {
  calculateFreeValueItem,
  calculateCotizacionWorkflowTotals,
  calculateGlobalQuoteWorkflowTotals,
  calculateWorkflowTotalsForPricingMode,
} from "../cotizaciones-workflow.service";
import type { CotizacionWorkflowItem } from "../../types/cotizacion-workflow";

function createItem(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  return {
    id: "item-1",
    codigo: "V2",
    tipo: "ventana",
    lineaComercial: "",
    vidrio: "",
    nombre: "Ventana V2",
    descripcion: "Ventana V2",
    ancho: 1200,
    alto: 1500,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.8,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 288000,
    precioTotal: 288000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: "",
    ...overrides,
  };
}

describe("cotizaciones-workflow.service", () => {
  it("suma IVA exacto al final cuando la cotizacion lo requiere", () => {
    const totals = calculateCotizacionWorkflowTotals([createItem()]);

    expect(totals.subtotal).toBe(288000);
    expect(totals.neto).toBe(288000);
    expect(totals.iva).toBe(54720);
    expect(totals.total).toBe(342720);
  });

  it("deja precios finales sin sumar IVA al final", () => {
    const totals = calculateCotizacionWorkflowTotals([
      createItem({
        precioUnitario: 100000,
        precioTotal: 100000,
      }),
    ], 0, 0, { mostrarIva: false });

    expect(totals.subtotal).toBe(100000);
    expect(totals.iva).toBe(0);
    expect(totals.total).toBe(100000);
  });

  it("mantiene el total final global y separa IVA incluido", () => {
    const totals = calculateGlobalQuoteWorkflowTotals({
      totalClienteManual: 600000,
      mostrarIva: true,
    });

    expect(totals.total).toBe(600000);
    expect(totals.iva).toBeCloseTo(95798.32, 2);
    expect(totals.subtotal).toBeCloseTo(504201.68, 2);
    expect(totals.neto).toBeCloseTo(504201.68, 2);
    expect(totals.flete).toBe(0);
    expect(totals.totalClienteManual).toBe(600000);
  });

  it("mantiene el total final global sin IVA", () => {
    const totals = calculateGlobalQuoteWorkflowTotals({
      totalClienteManual: 600000,
      mostrarIva: false,
    });

    expect(totals.total).toBe(600000);
    expect(totals.iva).toBe(0);
    expect(totals.subtotal).toBe(600000);
    expect(totals.neto).toBe(600000);
  });

  it("deja total global en cero si no hay total manual", () => {
    const totals = calculateGlobalQuoteWorkflowTotals({
      costoTotalFabricacion: 300000,
      margenGlobalPct: 100,
      totalClienteManual: null,
      mostrarIva: true,
    });

    expect(totals.total).toBe(0);
    expect(totals.iva).toBe(0);
    expect(totals.subtotal).toBe(0);
  });

  it("trata item libre como valor visible y usa IVA de la cotizacion", () => {
    const itemLibre = calculateFreeValueItem({
      codigo: "L1",
      nombre: "Mantencion de ventanas",
      valor: 119000,
      ivaMode: "total_incluye_iva",
    });
    const totals = calculateCotizacionWorkflowTotals([itemLibre], 0, 0, { mostrarIva: false });

    expect(itemLibre.tipoItem).toBe("item_libre_con_valor");
    expect(itemLibre.precioUnitario).toBe(119000);
    expect(itemLibre.precioTotal).toBe(119000);
    expect(totals.subtotal).toBe(119000);
    expect(totals.iva).toBe(0);
    expect(totals.total).toBe(119000);
  });

  it("ignora ivaMode legacy del item libre y suma IVA solo por cotizacion", () => {
    const itemLibre = calculateFreeValueItem({
      codigo: "L1",
      nombre: "Mantencion de ventanas",
      valor: 100000,
      ivaMode: "neto_mas_iva",
    });
    const totals = calculateCotizacionWorkflowTotals([itemLibre]);

    expect(itemLibre.precioTotal).toBe(100000);
    expect(totals.subtotal).toBe(100000);
    expect(totals.iva).toBe(19000);
    expect(totals.total).toBe(119000);
  });

  it("calcula el caso observado sin mezclar neto e IVA por item", () => {
    const totalsPreciosFinales = calculateCotizacionWorkflowTotals(
      [
        createItem({ id: "ventana", precioUnitario: 173000, precioTotal: 173000 }),
        calculateFreeValueItem({
          codigo: "L1",
          nombre: "Mantencion",
          valor: 120000,
          ivaMode: "total_incluye_iva",
        }),
        createItem({ id: "puerta", precioUnitario: 154000, precioTotal: 154000 }),
      ],
      0,
      0,
      { mostrarIva: false }
    );
    const totalsSumarIva = calculateCotizacionWorkflowTotals(
      [
        createItem({ id: "ventana", precioUnitario: 173000, precioTotal: 173000 }),
        calculateFreeValueItem({
          codigo: "L1",
          nombre: "Mantencion",
          valor: 120000,
          ivaMode: "total_incluye_iva",
        }),
        createItem({ id: "puerta", precioUnitario: 154000, precioTotal: 154000 }),
      ],
      0,
      0,
      { mostrarIva: true }
    );

    expect(totalsPreciosFinales.subtotal).toBe(447000);
    expect(totalsPreciosFinales.iva).toBe(0);
    expect(totalsPreciosFinales.total).toBe(447000);
    expect(totalsSumarIva.subtotal).toBe(447000);
    expect(totalsSumarIva.iva).toBe(84930);
    expect(totalsSumarIva.total).toBe(531930);
  });

  it("permite item libre descriptivo en cero solo cuando se habilita explicitamente", () => {
    expect(() =>
      calculateFreeValueItem({
        codigo: "L1",
        nombre: "Mantencion de ventanas",
        valor: 0,
        ivaMode: "total_incluye_iva",
      })
    ).toThrow("Ingresa un valor mayor a cero");

    const itemLibre = calculateFreeValueItem({
      codigo: "L1",
      nombre: "Mantencion de ventanas",
      valor: 0,
      ivaMode: "total_incluye_iva",
      allowZeroValue: true,
    });

    expect(itemLibre.precioTotal).toBe(0);
    expect(itemLibre.cantidad).toBe(1);
  });

  it("suma cobros separados al presupuesto por total", () => {
    const itemLibre = calculateFreeValueItem({
      codigo: "L1",
      nombre: "Mantencion de ventanas",
      valor: 119000,
      ivaMode: "total_incluye_iva",
    });

    const totals = calculateWorkflowTotalsForPricingMode({
      items: [itemLibre],
      descuentoPct: 0,
      flete: 0,
      quotePricingMode: "total_global",
      costoTotalFabricacion: 0,
      margenGlobalPct: 0,
      totalClienteManual: 500000,
      mostrarIva: true,
    });

    expect(totals.total).toBe(619000);
    expect(totals.iva).toBeCloseTo(98831.93, 2);
    expect(totals.subtotal).toBeCloseTo(520168.07, 2);
  });
});
