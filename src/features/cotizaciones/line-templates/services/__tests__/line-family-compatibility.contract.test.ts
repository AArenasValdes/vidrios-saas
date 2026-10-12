import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { VENTORA_DEFAULT_LINE_CATALOG } from "../default-line-catalog";
import { evaluateLineCompatibility } from "../line-template-compatibility.service";
import { groupLineTemplatesByFamily } from "../line-template-family.service";
import { filterLineCatalogTemplates } from "../line-option-presentation.service";

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

  it("reconoce Abatir como apertura abatible para líneas Veratec Elegans", () => {
    const elegans = VENTORA_DEFAULT_LINE_CATALOG.find(
      (entry) => entry.catalogKey === "ventora:veratec-elegans-60-ventana-hoja-interior",
    );
    expect(elegans).toBeDefined();
    if (!elegans) throw new Error("Falta la línea canónica Elegans 60");

    const target = line({ ...elegans, catalogMetadata: {}, material: "PVC" });
    const result = evaluateLineCompatibility({
      line: target,
      context: { componentType: "Ventana", openingType: "Abatir", leavesCount: 1, material: "PVC" },
    });
    expect(result).toMatchObject({ commercial: "compatible" });
    expect(filterLineCatalogTemplates({
      templates: [target],
      tab: "compatible",
      context: { componentType: "Ventana", openingType: "Abatir", leavesCount: 1, material: "PVC" },
    })).toEqual([target]);
  });

  it("incluye Elegans 60 paño fijo en Compatibles aunque su fila guardada use Ventana", () => {
    const stored = line({
      catalogKey: "ventora:veratec-elegans-60-fijo",
      nombre: "Elegans 60 · Paño fijo",
      material: "PVC",
      categoria: "pvc",
      catalogMetadata: {
        compatibility: {
          componentTypes: ["Ventana"],
          openingTypes: ["Fijo"],
          leavesCounts: [1],
          materials: ["PVC"],
        },
      },
    });

    expect(filterLineCatalogTemplates({
      templates: [stored],
      tab: "compatible",
      context: { componentType: "Paño fijo", openingType: "Fijo", leavesCount: 1, material: "PVC" },
    })).toEqual([stored]);
  });

  it("conserva compatibilidad comercial de una línea propia sin receta", () => {
    expect(evaluateLineCompatibility({
      line: line(),
      context: { componentType: "Ventana", material: "Aluminio" },
    })).toMatchObject({ commercial: "compatible", recipe: "price_only" });
  });

  it("recupera compatibilidad Veratec canónica cuando la fila guardada no conserva metadata", () => {
    const compact2h = VENTORA_DEFAULT_LINE_CATALOG.find(
      (entry) => entry.catalogKey === "ventora:veratec-compact-sliding-2h"
    );
    const compact3h = VENTORA_DEFAULT_LINE_CATALOG.find(
      (entry) => entry.catalogKey === "ventora:veratec-compact-sliding-3h"
    );
    expect(compact2h).toBeDefined();
    expect(compact3h).toBeDefined();

    const storedWithoutMetadata = line({
      ...compact2h,
      catalogMetadata: {},
      material: "PVC",
    });
    const storedThreeLeafWithoutMetadata = line({
      ...compact3h,
      catalogMetadata: {},
      material: "PVC",
    });

    expect(evaluateLineCompatibility({
      line: storedWithoutMetadata,
      context: { componentType: "Ventana", openingType: "Corredera", leavesCount: 2, material: "PVC" },
    }).commercial).toBe("compatible");
    expect(evaluateLineCompatibility({
      line: storedThreeLeafWithoutMetadata,
      context: { componentType: "Ventana", openingType: "Corredera", leavesCount: 2, material: "PVC" },
    }).commercial).toBe("incompatible");
  });

  it("amplía la línea Bahar exterior ya guardada para la apertura proyectante", () => {
    const stored = line({
      catalogKey: "ventora:veratec-bahar-5200-ventana-exterior",
      material: "PVC",
      catalogMetadata: {
        compatibility: {
          componentTypes: ["Ventana"],
          openingTypes: ["Abatible"],
          leavesCounts: [1],
          materials: ["PVC"],
        },
      },
    });

    expect(evaluateLineCompatibility({
      line: stored,
      context: { componentType: "Ventana", openingType: "Abatible", leavesCount: 1, material: "PVC" },
    }).commercial).toBe("compatible");
    expect(evaluateLineCompatibility({
      line: stored,
      context: { componentType: "Ventana", openingType: "Proyectante", leavesCount: 1, material: "PVC" },
    }).commercial).toBe("compatible");
  });

  it("incluye paño fijo Bahar guardado con compatibilidad anterior", () => {
    const stored = line({
      catalogKey: "ventora:veratec-bahar-5200-fijo",
      nombre: "Bahar 5200 · Paño fijo",
      material: "PVC",
      categoria: "pvc",
      catalogMetadata: {
        compatibility: {
          componentTypes: ["Ventana"],
          openingTypes: ["Fijo"],
          materials: ["PVC"],
        },
      },
    });

    expect(filterLineCatalogTemplates({
      templates: [stored],
      tab: "compatible",
      context: { componentType: "Paño fijo", openingType: "Fijo", leavesCount: 1, material: "PVC" },
    })).toEqual([stored]);
  });

  it("muestra plegables Bahar en Compatibles solo para puerta plegable y sus hojas", () => {
    const stored = line({
      catalogKey: "ventora:veratec-bahar-5200-plegable-3-3-0",
      nombre: "Bahar 5200 · Plegable 3/3/0",
      material: "PVC",
      categoria: "pvc",
      catalogMetadata: {},
    });
    const templates = [stored];

    expect(filterLineCatalogTemplates({
      templates,
      tab: "compatible",
      context: { componentType: "Puerta", openingType: "Plegable", leavesCount: 3, material: "PVC" },
    })).toEqual([stored]);
    expect(filterLineCatalogTemplates({
      templates,
      tab: "compatible",
      context: { componentType: "Puerta", openingType: "Puerta plegable", leavesCount: 3, material: "PVC" },
    })).toEqual([stored]);
    expect(filterLineCatalogTemplates({
      templates,
      tab: "compatible",
      context: { componentType: "Puerta", openingType: "Corredera", leavesCount: 3, material: "PVC" },
    })).toEqual([]);
  });
});
