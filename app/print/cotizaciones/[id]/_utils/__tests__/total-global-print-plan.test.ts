import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

import { buildTotalGlobalPrintPlan } from "../total-global-print-plan";

function createItems(count: number): CotizacionWorkflowItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    codigo: `D${index + 1}`,
    tipo: "Detalle incluido",
    vidrio: "",
    nombre: `Detalle incluido ${index + 1}`,
    descripcion: `Descripcion del detalle ${index + 1}`,
    ancho: 1000,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 0,
    precioTotal: 0,
    observaciones: "",
    lineaComercial: "",
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual" as const,
  }));
}

describe("total-global-print-plan", () => {
  it("debe usar la portada para detalles cuando la descripcion es corta", () => {
    const pages = buildTotalGlobalPrintPlan({
      descriptionChunks: ["Mantencion completa de componentes y limpieza general."],
      items: createItems(2),
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      kind: "global-cover",
      startIndex: 0,
    });
    expect(pages[0].kind === "global-cover" ? pages[0].items : []).toHaveLength(2);
  });

  it("debe mandar detalles restantes a otra pagina sin perder numeracion", () => {
    const pages = buildTotalGlobalPrintPlan({
      descriptionChunks: ["Mantencion completa de componentes y limpieza general."],
      items: createItems(4),
    });

    expect(pages).toHaveLength(2);
    expect(pages[0].kind === "global-cover" ? pages[0].items : []).toHaveLength(2);
    expect(pages[1]).toMatchObject({
      kind: "global-details",
      startIndex: 2,
    });
    expect(pages[1].kind === "global-details" ? pages[1].items : []).toHaveLength(2);
  });

  it("debe separar detalles cuando la descripcion es larga", () => {
    const longDescription = "Servicio de mantencion ".repeat(40);
    const pages = buildTotalGlobalPrintPlan({
      descriptionChunks: [longDescription],
      items: createItems(2),
    });

    expect(pages).toHaveLength(2);
    expect(pages[0].kind === "global-cover" ? pages[0].items : []).toHaveLength(0);
    expect(pages[1]).toMatchObject({
      kind: "global-details",
      startIndex: 0,
    });
  });

  it("debe conservar paginas de continuacion de descripcion antes de detalles", () => {
    const pages = buildTotalGlobalPrintPlan({
      descriptionChunks: ["Primera parte extensa", "Continuacion extensa"],
      items: createItems(1),
    });

    expect(pages.map((page) => page.kind)).toEqual([
      "global-cover",
      "global-description",
      "global-details",
    ]);
  });
});
