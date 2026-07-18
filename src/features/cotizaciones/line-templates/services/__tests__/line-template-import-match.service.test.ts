import {
  extractTechnicalLineCodeCandidate,
  findExistingTemplateForImport,
  isTechnicalPriceFillCandidate,
  mergeCatalogMetadataForCommercialUpdate,
} from "../line-template-import-match.service";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

function makeTemplate(
  overrides: Partial<CotizacionLineTemplate> = {}
): CotizacionLineTemplate {
  return {
    id: 1,
    organizationId: 10,
    nombre: "Linea 15 - Ventana corredera",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 0,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: "Arquetipo",
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {
      catalogSource: "pdf_technical",
      technicalLineCode: "15",
      needsCommercialPrice: true,
      technicalProfileCodes: "1501:RIEL",
    },
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    ...overrides,
  };
}

describe("line-template-import-match.service", () => {
  it("debe extraer codigo de linea desde nombres tipicos", () => {
    expect(extractTechnicalLineCodeCandidate("Linea 15 - Ventana corredera")).toBe("15");
    expect(extractTechnicalLineCodeCandidate("Línea 4000")).toBe("4000");
    expect(extractTechnicalLineCodeCandidate("15")).toBe("15");
    expect(extractTechnicalLineCodeCandidate("Serie Premium")).toBeNull();
  });

  it("debe matchear por nombre exacto, codigo y fuzzy", () => {
    const template = makeTemplate();

    expect(findExistingTemplateForImport([template], "Linea 15 - Ventana corredera")?.kind).toBe(
      "exact_name"
    );
    expect(findExistingTemplateForImport([template], "Linea 15")?.kind).toBe("line_code");
    expect(findExistingTemplateForImport([template], "15")?.kind).toBe("line_code");
    expect(
      findExistingTemplateForImport(
        [makeTemplate({ nombre: "Ventana corredera serie especial", catalogMetadata: {} })],
        "Ventana corredera serie"
      )?.kind
    ).toBe("fuzzy_name");
  });

  it("debe reconocer candidatos de precio tecnico", () => {
    const template = makeTemplate();
    expect(isTechnicalPriceFillCandidate(template, 120000)).toBe(true);
    expect(isTechnicalPriceFillCandidate(template, 0)).toBe(false);
    expect(
      isTechnicalPriceFillCandidate(
        makeTemplate({
          precioM2Sugerido: 120000,
          catalogMetadata: { catalogSource: "pdf_technical", technicalLineCode: "15" },
        }),
        150000
      )
    ).toBe(false);
  });

  it("debe preservar metadata tecnica al cruzar precio comercial", () => {
    const merged = mergeCatalogMetadataForCommercialUpdate(
      {
        catalogSource: "pdf_technical",
        technicalLineCode: "15",
        technicalProfileCodes: "1501:RIEL",
        needsCommercialPrice: true,
      },
      {
        espesor: "6 mm",
      },
      145000
    );

    expect(merged).toEqual(
      expect.objectContaining({
        catalogSource: "pdf_technical",
        technicalLineCode: "15",
        technicalProfileCodes: "1501:RIEL",
        espesor: "6 mm",
      })
    );
    expect(merged.needsCommercialPrice).toBeUndefined();
  });
});
