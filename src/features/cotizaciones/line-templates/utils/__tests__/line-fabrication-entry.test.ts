import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import {
  resolveLineFabricationActionLabel,
  shouldOfferLineFabricationWorkspace,
} from "@/features/cotizaciones/line-templates/utils/line-fabrication-entry";

describe("line-fabrication-entry", () => {
  it("ofrece Ir a fabricación en todas las líneas del catálogo Ventora", () => {
    expect(VENTORA_DEFAULT_LINE_CATALOG.length).toBeGreaterThanOrEqual(29);

    for (const line of VENTORA_DEFAULT_LINE_CATALOG) {
      expect(shouldOfferLineFabricationWorkspace({
        catalogKey: line.catalogKey,
        categoria: "vidrio",
      })).toBe(true);

      expect(
        resolveLineFabricationActionLabel({
          catalogKey: line.catalogKey,
          technicalTone: "quote_only",
          needsPrice: true,
        })
      ).toBe("Ir a fabricación");
    }
  });

  it("mantiene Ver fabricación cuando la receta Ventora ya está validada", () => {
    expect(
      resolveLineFabricationActionLabel({
        catalogKey: "ventora:l25",
        technicalTone: "validated",
        needsPrice: false,
      })
    ).toBe("Ver fabricación");
  });

  it("oculta fabricación solo en cristales propios del taller", () => {
    expect(
      shouldOfferLineFabricationWorkspace({
        catalogKey: null,
        categoria: "vidrio",
      })
    ).toBe(false);

    expect(
      shouldOfferLineFabricationWorkspace({
        catalogKey: null,
        categoria: "aluminio",
      })
    ).toBe(true);

    expect(
      resolveLineFabricationActionLabel({
        catalogKey: null,
        technicalTone: "quote_only",
        needsPrice: false,
      })
    ).toBe("Configurar fabricación");
  });
});
