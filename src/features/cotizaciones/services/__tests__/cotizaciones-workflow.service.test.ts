import {
  calculateCotizacionWorkflowTotals,
  calculateGlobalQuoteWorkflowTotals,
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
  it("redondea el IVA comercial hacia arriba para evitar montos aleatorios", () => {
    const totals = calculateCotizacionWorkflowTotals([createItem()]);

    expect(totals.subtotal).toBe(288000);
    expect(totals.neto).toBe(288000);
    expect(totals.iva).toBe(55000);
    expect(totals.total).toBe(343000);
  });

  it("respeta el IVA exacto cuando ya cae en una luca cerrada", () => {
    const totals = calculateCotizacionWorkflowTotals([
      createItem({
        precioUnitario: 100000,
        precioTotal: 100000,
      }),
    ]);

    expect(totals.iva).toBe(19000);
    expect(totals.total).toBe(119000);
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
});
