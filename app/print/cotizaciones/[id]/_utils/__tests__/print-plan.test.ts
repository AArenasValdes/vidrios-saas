import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

import { buildPrintPlan, isFreePrintItem } from "../print-plan";

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

function createFreeItem(id: string, nombre: string): CotizacionWorkflowItem {
  return {
    id,
    codigo: id,
    tipo: "Trabajo libre / Mantencion",
    tipoItem: "item_libre_con_valor",
    vidrio: "",
    nombre,
    descripcion: "Mantención de ventanas",
    ancho: null,
    alto: null,
    cantidad: 1,
    unidad: "unidad",
    areaM2: null,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 120000,
    precioTotal: 120000,
    observaciones: "[dm:item_libre]",
  };
}

describe("print-plan", () => {
  it("debe mover el tercer componente a otra pagina cuando la pagina final lleva resumen", () => {
    const result = buildPrintPlan(createItems(3));

    expect(result.freeItems).toHaveLength(0);
    expect(result.pages).toHaveLength(2);
    expect(result.pages.map((page) => page.items).map((items) => items.length)).toEqual([2, 1]);
    expect(result.pages[0]).toMatchObject({ kind: "cover", startIndex: 0 });
    expect(result.pages[1]).toMatchObject({ kind: "components", startIndex: 2 });
  });

  it("debe mantener maximo tres componentes en paginas sin resumen", () => {
    const result = buildPrintPlan(createItems(5));

    expect(result.freeItems).toHaveLength(0);
    expect(result.pages.map((page) => page.items).map((items) => items.length)).toEqual([3, 2]);
    expect(result.pages.at(-1)?.startIndex).toBe(3);
  });

  it("debe evitar una ultima pagina de tres componentes porque tambien contiene totales", () => {
    const result = buildPrintPlan(createItems(6));

    expect(result.freeItems).toHaveLength(0);
    expect(result.pages.map((page) => page.items).map((items) => items.length)).toEqual([2, 2, 2]);
    expect(result.pages.at(-1)?.startIndex).toBe(4);
  });

  describe("separacion de items libres", () => {
    it("debe separar items libres de componentes tecnicos", () => {
      const items = [createItems(2)[0], createFreeItem("free-1", "Mantención"), createItems(1)[0]];
      const result = buildPrintPlan(items);

      expect(result.freeItems).toHaveLength(1);
      expect(result.freeItems[0].id).toBe("free-1");
      expect(result.pages[0].items).toHaveLength(2);
    });

    it("debe devolver solo pagina vacia cuando todos son items libres", () => {
      const items = [
        createFreeItem("free-1", "Mantención"),
        createFreeItem("free-2", "Sellado"),
      ];
      const result = buildPrintPlan(items);

      expect(result.freeItems).toHaveLength(2);
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].items).toHaveLength(0);
      expect(result.pages[0].kind).toBe("cover");
    });

    it("debe mantener el orden original de items tecnicos", () => {
      const items = [createItems(4)[0], createItems(4)[1], createItems(4)[2], createItems(4)[3]];
      const result = buildPrintPlan(items);

      expect(result.freeItems).toHaveLength(0);
      expect(result.pages[0].items).toHaveLength(2);
      expect(result.pages[1].items).toHaveLength(2);
    });
  });

  describe("isFreePrintItem", () => {
    it("debe detectar item libre por tipoItem", () => {
      const item = createFreeItem("free-1", "Mantención");
      expect(isFreePrintItem(item)).toBe(true);
    });

    it("debe detectar item libre por metadata displayMode", () => {
      const item: CotizacionWorkflowItem = {
        ...createItems(1)[0],
        tipo: "Trabajo personalizado",
        observaciones: "[dm:item_libre]",
      };
      expect(isFreePrintItem(item)).toBe(true);
    });

    it("debe devolver false para componente tecnico", () => {
      const item = createItems(1)[0];
      expect(isFreePrintItem(item)).toBe(false);
    });
  });
});
