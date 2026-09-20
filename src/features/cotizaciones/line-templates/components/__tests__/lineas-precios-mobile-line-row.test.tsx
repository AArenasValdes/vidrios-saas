import {
  resolveFabricationActionLabel,
  resolveFabricationHint,
  resolveLineCommercialStatus,
} from "@/features/cotizaciones/line-templates/components/lineas-precios-mobile-line-row";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

function buildTemplate(
  overrides: Partial<CotizacionLineTemplate> = {}
): CotizacionLineTemplate {
  return {
    id: "line-1",
    organizationId: "org-1",
    nombre: "Serie 32",
    categoria: "aluminio",
    material: "Aluminio",
    proveedor: null,
    catalogKey: null,
    catalogMetadata: null,
    unidadCobro: "m2",
    precioM2Sugerido: 45000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    costoReferencia: 0,
    isActive: true,
    eliminadoEn: null,
    creadoEn: "2026-01-01T00:00:00.000Z",
    actualizadoEn: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("lineas-precios mobile row status", () => {
  it("prioriza precio pendiente sobre cubicación", () => {
    const template = buildTemplate({ precioM2Sugerido: 0 });

    expect(resolveLineCommercialStatus(template, true)).toEqual({
      label: "Precio pendiente",
      tone: "pending_price",
    });
    expect(
      resolveFabricationHint(template, { tone: "quote_only", label: "Sin configurar" }, true)
    ).toBeNull();
  });

  it("marca lista para cotizar cuando hay precio aunque no haya cubicación", () => {
    const template = buildTemplate();

    expect(resolveLineCommercialStatus(template, false)).toEqual({
      label: "Lista para cotizar",
      tone: "ready",
    });
    expect(
      resolveFabricationHint(template, { tone: "quote_only", label: "Sin configurar" }, false)
    ).toEqual({
      label: "Cubicación opcional",
      tone: "optional",
    });
  });

  it("no usa pendiente genérico para la acción de cubicación con precio", () => {
    expect(
      resolveFabricationActionLabel({ tone: "quote_only", label: "Sin configurar" }, false)
    ).toBe("Configurar fabricación");
  });

  it("usa Ir a fabricación en líneas Ventora aunque falte precio o receta", () => {
    expect(
      resolveFabricationActionLabel(
        { tone: "quote_only", label: "Sin configurar" },
        true,
        "ventora:l25"
      )
    ).toBe("Ir a fabricación");
  });
});
