import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { evaluateLineCompatibility } from "../line-template-compatibility.service";
import { groupLineTemplatesByFamily } from "../line-template-family.service";

function line(overrides: Partial<CotizacionLineTemplate> = {}): CotizacionLineTemplate {
  return {
    id: 1,
    organizationId: 10,
    catalogKey: null,
    nombre: "Línea taller",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 100000,
    minimoCobrable: 0,
    redondeoPrecio: 0,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 1,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    ...overrides,
  };
}

describe("contrato de familia y compatibilidad", () => {
  it("agrupa familias declaradas y reúne líneas propias en un solo bloque sin reordenar", () => {
    const grouped = groupLineTemplatesByFamily([
      line({ id: 1, catalogKey: "ventora:winhouse-new-s75-doble-riel", nombre: "S75 doble" }),
      line({ id: 3, catalogKey: "ventora:winhouse-new-s75-triple-riel", nombre: "S75 triple" }),
      line({ id: 2, catalogKey: null, nombre: "Línea propia 1", sortOrder: 2 }),
      line({ id: 4, catalogKey: null, nombre: "Línea propia 2", sortOrder: 3 }),
    ]);

    const family = grouped.find((group) => group.key === "ventora:winhouse-new-s75");
    expect(family?.templates.map((item) => item.id)).toEqual([1, 3]);
    expect(grouped.map((group) => group.label)).toEqual(["New S75", "Mis líneas"]);
    expect(grouped.find((group) => group.isOwn)?.templates.map((item) => item.id)).toEqual([2, 4]);
    expect(grouped.flatMap((group) => group.templates.map((item) => item.id))).toEqual([1, 3, 2, 4]);
  });

  it("mantiene claves únicas cuando un mismo org tiene bloques privados separados por familias", () => {
    const grouped = groupLineTemplatesByFamily([
      line({ id: 3, organizationId: 3, catalogKey: null, nombre: "Propia arriba" }),
      line({ id: 8, catalogKey: "ventora:winhouse-new-s75-doble-riel", nombre: "S75 doble" }),
      line({ id: 4, organizationId: 3, catalogKey: null, nombre: "Propia abajo" }),
    ]);

    expect(grouped.map((group) => group.label)).toEqual([
      "Mis líneas",
      "New S75",
      "Mis líneas",
    ]);
    expect(new Set(grouped.map((group) => group.key)).size).toBe(grouped.length);
    expect(grouped.flatMap((group) => group.templates.map((item) => item.id))).toEqual([
      3,
      8,
      4,
    ]);
  });

  it("evalúa compatibilidad declarada aparte de receta y precio comercial", () => {
    const target = line({
      catalogKey: "ventora:veratec-7400-corredera",
      catalogMetadata: {
        compatibility: {
          componentTypes: ["Ventana"],
          openingTypes: ["Corredera"],
          leavesCounts: [2],
          materials: ["PVC"],
        },
      },
      material: "PVC",
      precioM2Sugerido: 125000,
    });
    const compatible = evaluateLineCompatibility({
      line: target,
      context: { componentType: "Ventana", openingType: "Corredera", leavesCount: 2, material: "PVC" },
      recipe: "ready_to_test",
    });
    const incompatible = evaluateLineCompatibility({
      line: target,
      context: { componentType: "Ventana", openingType: "Corredera", leavesCount: 3, material: "PVC" },
    });

    expect(compatible).toMatchObject({ commercial: "compatible", recipe: "ready_to_test", commercialPrice: "configured" });
    expect(incompatible).toMatchObject({ commercial: "incompatible", recipe: "not_checked" });
  });

  it("conserva compatibilidad comercial de una línea propia sin receta", () => {
    expect(evaluateLineCompatibility({
      line: line(),
      context: { componentType: "Ventana", material: "Aluminio" },
    })).toMatchObject({ commercial: "compatible", recipe: "price_only" });
  });
});
