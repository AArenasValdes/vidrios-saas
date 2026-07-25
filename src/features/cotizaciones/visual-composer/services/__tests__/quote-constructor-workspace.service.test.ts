import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  QUOTE_CONSTRUCTOR_PRESETS,
  createQuoteConstructorPresetConfig,
  getQuoteConstructorItemConfig,
  isQuoteConstructorCompatibleItem,
  isQuoteConstructorPresetDefaultName,
  moveQuoteConstructorItem,
  resolveQuoteConstructorCommercialName,
} from "../quote-constructor-workspace.service";
import { listLeafModules } from "../../types/guided-visual-config";

function item(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  return {
    id: "item-1",
    codigo: "VEN-01",
    tipo: "Ventana",
    lineaComercial: "",
    vidrio: "Incoloro 5mm",
    nombre: "Ventana",
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 100000,
    costoProveedorTotal: 100000,
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

describe("quote constructor workspace service", () => {
  it("expone las doce tipologías visuales del modo rápido", () => {
    expect(QUOTE_CONSTRUCTOR_PRESETS.map((preset) => preset.id)).toEqual([
      "fijo",
      "corredera",
      "abatible",
      "proyectante",
      "puerta",
      "puerta_corredera",
      "pano_libre",
      "oscilobatiente",
      "guillotina",
      "celosia",
      "shower_frontal",
      "shower_corredera",
    ]);
  });

  it("crea preset visual con medidas y tipo solicitado", () => {
    const config = createQuoteConstructorPresetConfig("oscilobatiente", {
      widthMm: 1500,
      heightMm: 1300,
    });
    expect(config.widthMm).toBe(1500);
    expect(config.heightMm).toBe(1300);
    expect(listLeafModules(config.root)[0].type).toBe("oscilobatiente");
  });

  it("nombra comercialmente el preset fijo como Ventana fija", () => {
    expect(QUOTE_CONSTRUCTOR_PRESETS.find((preset) => preset.id === "fijo")?.defaultName).toBe(
      "Ventana fija"
    );
    expect(resolveQuoteConstructorCommercialName(createQuoteConstructorPresetConfig("fijo"))).toBe(
      "Ventana fija"
    );
    expect(resolveQuoteConstructorCommercialName(createQuoteConstructorPresetConfig("corredera"))).toBe(
      "Ventana corredera"
    );
    expect(isQuoteConstructorPresetDefaultName("Ventana fija")).toBe(true);
    expect(isQuoteConstructorPresetDefaultName("Mi ventana del living")).toBe(false);
  });

  it("detecta piezas compatibles y recupera config persistida", () => {
    const config = createQuoteConstructorPresetConfig("corredera");
    const visual = item({
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#111827",
        material: "Aluminio",
        guidedVisualConfig: config,
      }),
    });
    expect(isQuoteConstructorCompatibleItem(visual)).toBe(true);
    expect(getQuoteConstructorItemConfig(visual)?.widthMm).toBe(1200);
    expect(isQuoteConstructorCompatibleItem(item({ tipoItem: "item_libre_con_valor" }))).toBe(false);
  });

  it("reordena sin mutar arreglo original", () => {
    const items = [item({ id: "a" }), item({ id: "b" }), item({ id: "c" })];
    const moved = moveQuoteConstructorItem(items, "b", -1);
    expect(moved.map((current) => current.id)).toEqual(["b", "a", "c"]);
    expect(items.map((current) => current.id)).toEqual(["a", "b", "c"]);
  });
});
