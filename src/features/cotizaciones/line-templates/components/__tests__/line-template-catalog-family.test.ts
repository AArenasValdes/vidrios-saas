import {
  groupLineTemplatesByFamily,
  resolveLineTemplateFamilyKey,
} from "@/features/cotizaciones/line-templates/components/line-template-catalog-family";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

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
});
