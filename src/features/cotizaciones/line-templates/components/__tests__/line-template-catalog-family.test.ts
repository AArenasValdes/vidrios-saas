import {
  groupLineTemplatesByFamily,
  groupLineTemplatesByDocumentedFamily,
  resolveLineTemplateFamilyKey,
} from "@/features/cotizaciones/line-templates/components/line-template-catalog-family";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { resolveSupplierFamilyKeyForLineTemplate } from "@/features/cotizaciones/line-templates/services/line-template-family.service";

function makeTemplate(
  partial: Partial<CotizacionLineTemplate> & Pick<CotizacionLineTemplate, "nombre">,
): CotizacionLineTemplate {
  return {
    id: partial.id ?? "1",
    organizationId: "org-1",
    nombre: partial.nombre,
    material: partial.material ?? "Aluminio",
    proveedor: partial.proveedor ?? null,
    precioM2Sugerido: partial.precioM2Sugerido ?? 0,
    minimoCobrable: partial.minimoCobrable ?? 0,
    redondeoPrecio: partial.redondeoPrecio ?? 1000,
    unidadCobro: partial.unidadCobro ?? "m2",
    isActive: partial.isActive ?? true,
    categoria: partial.categoria ?? "linea",
    catalogKey: partial.catalogKey ?? null,
    catalogMetadata: partial.catalogMetadata ?? null,
    vidrioPrincipalRecomendado: partial.vidrioPrincipalRecomendado ?? null,
    linea: partial.linea ?? null,
    eliminadoEn: partial.eliminadoEn ?? null,
    creadoEn: partial.creadoEn ?? null,
    actualizadoEn: partial.actualizadoEn ?? null,
  };
}

describe("line-template-catalog-family", () => {
  it("clasifica Serie 20 corredera y fijos en familias distintas", () => {
    const corredera = makeTemplate({
      nombre: "Serie 20",
      catalogKey: "ventora:l20",
      catalogMetadata: {
        lineConfiguration: "Corredera 2 hojas",
        structuralArchetypeId: "corredera_2h",
      },
    });
    const fijos = makeTemplate({
      nombre: "Serie 20 — Fijos",
      catalogKey: "ventora:l20-fijos",
      catalogMetadata: {
        lineConfiguration: "Fijos 2 hojas",
        structuralArchetypeId: "corredera_2h",
      },
    });

    expect(resolveLineTemplateFamilyKey(corredera)).toBe("correderas");
    expect(resolveLineTemplateFamilyKey(fijos)).toBe("fijos");
  });

  it("expone la familia Fijos en el agrupador cuando hay línea comercial", () => {
    const groups = groupLineTemplatesByFamily([
      makeTemplate({
        nombre: "Serie 20 — Fijos",
        catalogKey: "ventora:l20-fijos",
        catalogMetadata: { lineConfiguration: "Fijos 2 hojas" },
      }),
      makeTemplate({
        nombre: "Serie 20",
        catalogKey: "ventora:l20",
        catalogMetadata: { lineConfiguration: "Corredera 2 hojas" },
      }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["correderas", "fijos"]);
    expect(groups.find((group) => group.key === "fijos")?.templates).toHaveLength(1);
  });

  it("agrupa Veratec por familia documental aunque la configuración no indique arquetipo", () => {
    const families = groupLineTemplatesByDocumentedFamily([
      makeTemplate({ id: "1", proveedor: "VERATEC", nombre: "Elevadora 2 paños", catalogMetadata: { familyKey: "veratec:elevadora", familyLabel: "Elevadora", configurationKey: "elevadora:2" } }),
      makeTemplate({ id: "2", proveedor: "VERATEC", nombre: "Elevadora 4 paños", catalogMetadata: { familyKey: "veratec:elevadora", familyLabel: "Elevadora", configurationKey: "elevadora:4" } }),
      makeTemplate({ id: "3", proveedor: "VERATEC", nombre: "EKO 130", catalogMetadata: { familyKey: "veratec:eko-130", familyLabel: "EKO 130" } }),
    ]);
    expect(families.map((family) => [family.key, family.label, family.templates.length])).toEqual([
      ["veratec:eko-130", "EKO 130", 1],
      ["veratec:elevadora", "Elevadora", 2],
    ]);
  });

  it("reconoce una 7400 persistida antes de guardar familyKey sin reescribir la fila", () => {
    const [family] = groupLineTemplatesByDocumentedFamily([
      makeTemplate({ id: "7400", proveedor: "VERATEC", catalogKey: "ventora:veratec-7400-corredera", nombre: "Veratec 7400 — Corredera 2 hojas", catalogMetadata: {} }),
    ]);
    expect(family).toMatchObject({ key: "veratec:sliding-7400", label: "Sliding 7400" });
  });

  it("resuelve la familia de proveedor desde la identidad canónica para plantillas antiguas", () => {
    const template = makeTemplate({
      id: "7400",
      proveedor: "VERATEC",
      catalogKey: "ventora:veratec-7400-corredera",
      nombre: "Veratec 7400 — Corredera 2 hojas",
      catalogMetadata: {},
    });

    expect(resolveSupplierFamilyKeyForLineTemplate(template)).toBe("veratec:sliding-7400");
  });
});
