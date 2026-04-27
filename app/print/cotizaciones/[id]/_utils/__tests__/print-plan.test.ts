import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

import { buildPrintPlan } from "../print-plan";

function createItems(count: number): CotizacionWorkflowItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    codigo: `V${index + 1}`,
    tipo: "Ventana",
    vidrio: "Incoloro monolitico 5mm",
    nombre: `Ventana ${index + 1}`,
    descripcion: "",
    ancho: 1000,
    alto: 1200,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 100000,
    costoProveedorTotal: 100000,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    observaciones: "",
  }));
}

describe("print-plan", () => {
  it("debe mover el tercer componente a otra pagina cuando la pagina final lleva resumen", () => {
    const plan = buildPrintPlan(createItems(3));

    expect(plan).toHaveLength(2);
    expect(plan.map((page) => page.items).map((items) => items.length)).toEqual([2, 1]);
    expect(plan[0]).toMatchObject({ kind: "cover", startIndex: 0 });
    expect(plan[1]).toMatchObject({ kind: "components", startIndex: 2 });
  });

  it("debe mantener maximo tres componentes en paginas sin resumen", () => {
    const plan = buildPrintPlan(createItems(5));

    expect(plan.map((page) => page.items).map((items) => items.length)).toEqual([3, 2]);
    expect(plan.at(-1)?.startIndex).toBe(3);
  });

  it("debe evitar una ultima pagina de tres componentes porque tambien contiene totales", () => {
    const plan = buildPrintPlan(createItems(6));

    expect(plan.map((page) => page.items).map((items) => items.length)).toEqual([2, 2, 2]);
    expect(plan.at(-1)?.startIndex).toBe(4);
  });
});
