import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  buildLineOptionViewModel,
  filterLineCatalogTemplates,
  getDefaultLineCatalogTab,
  groupLineCatalogTemplates,
  hasEnoughLineCompatibilityContext,
} from "../line-option-presentation.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "../default-line-catalog";
import { resolveLineCompatibilityOpeningType } from "../line-template-compatibility.service";
import {
  createDefaultGuidedVisualConfig,
  listLeafModules,
  splitModule,
  updateModuleType,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

function line(overrides: Partial<CotizacionLineTemplate> = {}): CotizacionLineTemplate {
  return {
    id: 1, organizationId: 3, catalogKey: null, nombre: "Línea taller", categoria: "pvc",
    unidadCobro: "m2", material: "PVC", vidrioPrincipalRecomendado: null, costoBase: 0,
    precioM2Sugerido: 80000, minimoCobrable: 35000, redondeoPrecio: 1000, mermaPct: 0,
    margenObjetivoPct: null, proveedor: "Taller", vigenciaDesde: null, vigenciaHasta: null,
    catalogMetadata: {}, isActive: true, sortOrder: 1, creadoEn: null, actualizadoEn: null,
    eliminadoEn: null, ...overrides,
  };
}

describe("line option presentation contract", () => {
  it("keeps commercial labels separate from technical state and never exposes a zero cost", () => {
    const model = buildLineOptionViewModel({ template: line(), selected: false });
    expect(model).toMatchObject({
      commercialPriceLabel: "$80.000/m²", minimumLabel: "Mín. $35.000", fabricationState: "Sin despiece",
      costState: "Sin costos", origin: "propia", selected: false,
    });
    expect(JSON.stringify(model)).not.toContain("recipeId");
    expect(JSON.stringify(model)).not.toContain("snapshot");
  });

  it("requires component, opening and material before showing compatible tab", () => {
    expect(hasEnoughLineCompatibilityContext({ componentType: "Ventana", openingType: "Corredera" })).toBe(false);
    expect(hasEnoughLineCompatibilityContext({ componentType: "Personalizado", openingType: "Corredera", material: "Aluminio" })).toBe(false);
    expect(hasEnoughLineCompatibilityContext({ componentType: "Ventana", openingType: "Configuración propia", material: "Aluminio" })).toBe(false);
    expect(hasEnoughLineCompatibilityContext({ componentType: "Ventana", openingType: "Corredera 2 hojas", material: "Aluminio" })).toBe(true);
    expect(getDefaultLineCatalogTab({ hasCompatibilityContext: false, hasOwnLines: true })).toBe("all");
    expect(getDefaultLineCatalogTab({ hasCompatibilityContext: true, hasOwnLines: true })).toBe("compatible");
  });

  it("uses the chosen configuration when the generic system field says Personalizado", () => {
    expect(resolveLineCompatibilityOpeningType("Personalizado", "Corredera 2 hojas")).toBe("Corredera 2 hojas");
    expect(resolveLineCompatibilityOpeningType("Corredera", "Corredera 2 hojas")).toBe("Corredera");
  });

  it("resuelve Shower Corredera como apertura corredera aunque el sistema diga Shower", () => {
    expect(resolveLineCompatibilityOpeningType("Shower", "Corredera 2 hojas")).toBe("Corredera 2 hojas");
    let composition = createDefaultGuidedVisualConfig();
    composition = updateModuleType(composition, listLeafModules(composition.root)[0].id, "shower_corredera");
    expect(resolveLineCompatibilityOpeningType("Shower", "1 hojas", composition)).toBe("Corredera");
  });

  it("mantiene Línea 12 en Compatibles cuando Shower resuelve sus dos hojas comerciales", () => {
    const line12 = line({
      id: 12,
      catalogKey: "ventora:serie-12-shower-corredera",
      nombre: "Línea 12 — Shower Door",
      material: "Aluminio",
      catalogMetadata: { compatibility: {
        componentTypes: ["Shower", "Shower Door"],
        openingTypes: ["Corredera"],
        leavesCounts: [2],
        materials: ["Aluminio"],
      } },
    });

    expect(filterLineCatalogTemplates({
      templates: [line12],
      tab: "compatible",
      context: { componentType: "Shower Door", openingType: "Corredera", leavesCount: 2, material: "Aluminio" },
    })).toEqual([line12]);
  });

  it("uses the effective constructor opening when system and configuration are still generic", () => {
    let composition = createDefaultGuidedVisualConfig();
    composition = updateModuleType(composition, listLeafModules(composition.root)[0].id, "corredera");
    expect(resolveLineCompatibilityOpeningType("Personalizado", "1 hojas", composition)).toBe("Corredera");

    const context = {
      componentType: "Ventana",
      openingType: resolveLineCompatibilityOpeningType("Personalizado", "1 hojas", composition),
      material: "Aluminio",
    };
    expect(hasEnoughLineCompatibilityContext(context)).toBe(true);
  });

  it("recognizes sliding panels with fixed sides but leaves mixed openings unresolved", () => {
    let composition = createDefaultGuidedVisualConfig();
    composition = splitModule(composition, listLeafModules(composition.root)[0].id, "vertical", 0.5);
    let leaves = listLeafModules(composition.root);
    composition = updateModuleType(composition, leaves[0].id, "corredera");
    composition = updateModuleType(composition, leaves[1].id, "fijo");
    expect(resolveLineCompatibilityOpeningType("Personalizado", "", composition)).toBe("Corredera");

    leaves = listLeafModules(composition.root);
    composition = updateModuleType(composition, leaves[1].id, "abatible");
    expect(resolveLineCompatibilityOpeningType("Personalizado", "", composition)).toBeNull();
  });

  it("filters compatible lines from explicit compatibility and keeps private lines under their own tab", () => {
    const compatible = line({ id: 2, catalogKey: "ventora:veratec-7400-corredera", proveedor: "Veratec", catalogMetadata: {
      compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], materials: ["PVC"] },
    } });
    const incompatible = line({ id: 3, catalogKey: "ventora:other", catalogMetadata: {
      compatibility: { componentTypes: ["Puerta"], materials: ["PVC"] },
    } });
    const own = line({ id: 4 });
    const context = { componentType: "Ventana", openingType: "Corredera", material: "PVC" };
    expect(filterLineCatalogTemplates({ templates: [compatible, incompatible, own], tab: "compatible", context }).map((entry) => entry.id)).toEqual([2]);
    expect(filterLineCatalogTemplates({ templates: [compatible, incompatible, own], tab: "own", context }).map((entry) => entry.id)).toEqual([4]);
  });

  it("starts with the shared catalog and excludes glass when the piece uses aluminum", () => {
    const aluminum = line({ id: 41, catalogKey: "ventora:l25", material: "Aluminio", proveedor: "Ventora" });
    const glass = line({ id: 42, catalogKey: "ventora:cristal-10", material: "Cristal", categoria: "vidrio", proveedor: "Ventora" });
    const ownGlass = line({ id: 43, material: "Cristal", categoria: "vidrio", proveedor: "Taller" });

    expect(getDefaultLineCatalogTab({ hasCompatibilityContext: false, hasOwnLines: true })).toBe("all");
    expect(filterLineCatalogTemplates({
      templates: [aluminum, glass, ownGlass],
      tab: "all",
      material: "Aluminio",
    }).map((template) => template.id)).toEqual([41]);
  });

  it("only calls catalog lines compatible when their declared opening and leaf count match", () => {
    const twoLeaves = line({ id: 20, catalogKey: "ventora:l5000", material: "Aluminio" });
    const threeLeaves = line({
      id: 30,
      catalogKey: "ventora:fixture-sliding-3h",
      material: "Aluminio",
      nombre: "Corredera 3 hojas",
      catalogMetadata: { compatibility: {
        componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [3], materials: ["Aluminio"],
      } },
    });
    const context = { componentType: "Ventana", openingType: "Corredera", leavesCount: 2, material: "Aluminio" };

    expect(filterLineCatalogTemplates({ templates: [twoLeaves, threeLeaves], tab: "compatible", context }))
      .toEqual([twoLeaves]);
  });

  it("does not put a catalog line without compatibility evidence in Compatibles", () => {
    const unclassified = line({ id: 50, catalogKey: "ventora:sin-compatibilidad", material: "Aluminio" });

    expect(filterLineCatalogTemplates({
      templates: [unclassified],
      tab: "compatible",
      context: { componentType: "Ventana", openingType: "Corredera", leavesCount: 2, material: "Aluminio" },
    })).toEqual([]);
  });

  it("does not offer the retired fixed-pane entry for Serie 20", () => {
    const result = filterLineCatalogTemplates({
      templates: [line({ id: 20, catalogKey: "ventora:l20-fijos", nombre: "Serie 20 — Paño fijo" })],
      tab: "all",
    });
    expect(result).toEqual([]);
  });

  it("consolidates interleaved private lines into one group without matching by names", () => {
    const items = [
      line({ id: 1, nombre: "Propia A" }),
      line({ id: 2, catalogKey: "ventora:winhouse-new-s75-doble-riel", catalogMetadata: { familyKey: "ventora:winhouse-new-s75" } }),
      line({ id: 3, nombre: "Propia B" }),
    ];
    const groups = groupLineCatalogTemplates(items);
    expect(groups.filter((group) => group.origin === "propia")).toHaveLength(1);
    expect(groups.map((group) => group.label)).toEqual(["Mis líneas", "Taller"]);
    expect(groups.flatMap((group) => group.templates.map((item) => item.id))).toEqual([1, 3, 2]);
  });

  it("shows Sliding 7400 once as a family with separate configuration rows", () => {
    const familyLines = VENTORA_DEFAULT_LINE_CATALOG
      .filter((template) => template.catalogMetadata?.familyKey === "veratec:sliding-7400")
      .map((template, index) => line({
        ...template,
        id: index + 10,
        organizationId: 3,
      }));
    const groups = groupLineCatalogTemplates(familyLines);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("VERATEC");
    expect(groups[0].families).toHaveLength(1);
    expect(groups[0].families[0]).toMatchObject({ key: "veratec:sliding-7400", label: "Sliding 7400" });
    expect(groups[0].families[0].templates).toHaveLength(4);
    expect(groups[0].families[0].templates.map((template) => template.catalogKey)).toContain("ventora:veratec-7400-corredera");
  });

  it("filters an explicit 3H configuration without hiding the family when recipes or prices are absent", () => {
    const lines = VENTORA_DEFAULT_LINE_CATALOG
      .filter((template) => template.catalogMetadata?.familyKey === "veratec:sliding-7400")
      .map((template, index) => line({ ...template, id: index + 20, organizationId: 3 }));
    const compatible = filterLineCatalogTemplates({
      templates: lines,
      tab: "compatible",
      context: { componentType: "Ventana", openingType: "Corredera", leavesCount: 3, material: "PVC" },
    });

    expect(compatible.map((template) => template.catalogKey)).toEqual(["ventora:veratec-7400-corredera-3h"]);
    expect(compatible[0].precioM2Sugerido).toBe(0);
    expect(compatible[0].catalogMetadata?.needsCommercialPrice).toBe(true);
  });
});
