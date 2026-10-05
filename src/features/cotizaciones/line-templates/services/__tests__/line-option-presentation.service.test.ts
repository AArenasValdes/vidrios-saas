import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  buildLineOptionViewModel,
  filterLineCatalogTemplates,
  getDefaultLineCatalogTab,
  groupLineCatalogTemplates,
  hasEnoughLineCompatibilityContext,
} from "../line-option-presentation.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "../default-line-catalog";

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
    expect(getDefaultLineCatalogTab({ hasCompatibilityContext: false, hasOwnLines: true })).toBe("own");
    expect(getDefaultLineCatalogTab({ hasCompatibilityContext: true, hasOwnLines: true })).toBe("compatible");
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
    expect(filterLineCatalogTemplates({ templates: [compatible, incompatible, own], tab: "compatible", context }).map((entry) => entry.id)).toEqual([2, 4]);
    expect(filterLineCatalogTemplates({ templates: [compatible, incompatible, own], tab: "own", context }).map((entry) => entry.id)).toEqual([4]);
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
    expect(groups[0].families[0].templates).toHaveLength(3);
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
