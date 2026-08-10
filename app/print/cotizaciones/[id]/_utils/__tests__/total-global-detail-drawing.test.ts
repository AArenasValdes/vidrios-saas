import { resolveTotalGlobalDetailDrawingSvg } from "../total-global-detail-drawing";

function createItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "detail-1",
    tipoItem: "componente" as const,
    codigo: "D1",
    tipo: "Ventana",
    lineaComercial: "",
    vidrio: "",
    nombre: "Ventana proyectante",
    descripcion: "Componente completo",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 0,
    precioTotal: 0,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual" as const,
    observaciones: "[sys:Proyectante][dm:componente]",
    ...overrides,
  };
}

describe("total-global-detail-drawing", () => {
  it("reconstruye dibujo de componente cuando no hay SVG formal", () => {
    const svg = resolveTotalGlobalDetailDrawingSvg({ item: createItem() });

    expect(svg).toContain("<svg");
    expect(svg).toContain("1200 mm");
  });

  it("conserva SVG existente y dibuja referencia para detalle libre", () => {
    const existing = "<svg><rect /></svg>";
    expect(
      resolveTotalGlobalDetailDrawingSvg({
        item: createItem({ tipoItem: "item_libre_con_valor", tipo: "Item libre" }),
        presentationSvg: existing,
      })
    ).toBe(existing);

    const fallback = resolveTotalGlobalDetailDrawingSvg({
      item: createItem({ tipoItem: "item_libre_con_valor", tipo: "Item libre" }),
    });
    expect(fallback).toContain("<svg");
  });
});
