import {
  calculateCotizacionWorkflowTotals,
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
});
