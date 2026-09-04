import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { resolveFabricacionHojasForRecipeMatch } from "@/features/fabricacion/services/fabricacion-hojas-resolver.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

function item(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  return {
    id: "item-1",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "L32",
    vidrio: "4mm",
    nombre: "Ventana proyectante",
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
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

describe("resolveFabricacionHojasForRecipeMatch", () => {
  it("usa fabricacionHojas explícita", () => {
    expect(
      resolveFabricacionHojasForRecipeMatch(item(), {
        fabricacionHojas: 2,
        hojasBase: 1,
        guidedVisualConfig: null,
        sistema: "Personalizado",
      })
    ).toBe(2);
  });

  it("prioriza módulos del constructor sobre hojasBase legacy", () => {
    const guidedVisualConfig = createQuoteConstructorPresetConfig("proyectante");
    expect(
      resolveFabricacionHojasForRecipeMatch(item(), {
        fabricacionHojas: null,
        hojasBase: 2,
        guidedVisualConfig,
        sistema: "Personalizado",
      })
    ).toBe(1);
  });

  it("lee hojas del texto cuando no hay constructor", () => {
    expect(
      resolveFabricacionHojasForRecipeMatch(
        item({ descripcion: "2 hojas" }),
        {
          fabricacionHojas: null,
          hojasBase: null,
          guidedVisualConfig: null,
          sistema: "Personalizado",
        }
      )
    ).toBe(2);
  });

  it("usa hojasBase en flujo guiado clásico (no Personalizado)", () => {
    expect(
      resolveFabricacionHojasForRecipeMatch(item({ descripcion: "" }), {
        fabricacionHojas: null,
        hojasBase: 2,
        guidedVisualConfig: null,
        sistema: "Corredera",
      })
    ).toBe(2);
  });

  it("no fuerza hojasBase en Personalizado sin constructor ni texto", () => {
    expect(
      resolveFabricacionHojasForRecipeMatch(item(), {
        fabricacionHojas: null,
        hojasBase: 2,
        guidedVisualConfig: null,
        sistema: "Personalizado",
      })
    ).toBeNull();
  });
});
