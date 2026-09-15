import {
  buildQuoteGrandTotalClientLabel,
  buildQuotePdfDisplayDefaultsFromProfile,
  resolveMostrarIvaEnPdf,
} from "@/features/cotizaciones/services/quote-pdf-display.service";

describe("quote-pdf-display.service", () => {
  it("resuelve mostrar IVA en PDF como true por defecto", () => {
    expect(resolveMostrarIvaEnPdf()).toBe(true);
    expect(resolveMostrarIvaEnPdf(null)).toBe(true);
    expect(resolveMostrarIvaEnPdf(undefined)).toBe(true);
  });

  it("respeta false cuando la cotización lo desactiva", () => {
    expect(resolveMostrarIvaEnPdf(false)).toBe(false);
  });

  it("hereda el default de empresa al crear cotización", () => {
    expect(
      buildQuotePdfDisplayDefaultsFromProfile({
        mostrarIvaEnPdf: false,
      })
    ).toEqual({
      mostrarIvaEnPdf: false,
    });
  });

  it("muestra Total final cuando el IVA queda oculto en PDF", () => {
    expect(
      buildQuoteGrandTotalClientLabel({
        mostrarIvaEnPdf: false,
        showItemPrices: true,
      })
    ).toBe("Total final");
  });

  it("mantiene etiquetas actuales cuando el IVA sigue visible", () => {
    expect(
      buildQuoteGrandTotalClientLabel({
        mostrarIvaEnPdf: true,
        showItemPrices: true,
      })
    ).toBe("Total presupuesto");

    expect(
      buildQuoteGrandTotalClientLabel({
        mostrarIvaEnPdf: true,
        showItemPrices: false,
      })
    ).toBe("Precio final");
  });
});
