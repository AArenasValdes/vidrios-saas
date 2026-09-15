import {
  buildQuoteCommercialDefaultsFromProfile,
  buildQuoteDocumentCommercialSections,
  buildQuotePreferencesSummary,
  quoteUsesOrganizationCommercialDefaults,
} from "@/features/cotizaciones/services/quote-commercial-conditions.service";

describe("quote-commercial-conditions.service", () => {
  it("arma defaults desde perfil de empresa", () => {
    const defaults = buildQuoteCommercialDefaultsFromProfile({
      formaPago: "50% anticipo",
      validezPredeterminada: "30 dias",
      condicionesVentaPredeterminadas: "Instalación no incluida",
      terminosCondicionesPredeterminados: "Validez sujeta a stock",
    });

    expect(defaults).toEqual({
      validez: "30 dias",
      condicionesDePago: "50% anticipo",
      condicionesVenta: "Instalación no incluida",
      terminosCondiciones: "Validez sujeta a stock",
    });
  });

  it("resume preferencias comerciales para móvil", () => {
    expect(
      buildQuotePreferencesSummary({
        validezPredeterminada: "15 dias",
        formaPago: "Contado",
      })
    ).toContain("15 días");
  });

  it("detecta si la cotización sigue usando defaults de empresa", () => {
    const profile = {
      formaPago: "50% anticipo",
      validezPredeterminada: "15 dias",
      condicionesVentaPredeterminadas: "Garantía 12 meses",
      terminosCondicionesPredeterminados: "",
    };

    expect(
      quoteUsesOrganizationCommercialDefaults(
        {
          condicionesDePago: "50% anticipo",
          condicionesVenta: "Garantía 12 meses",
          terminosCondiciones: "",
        },
        profile
      )
    ).toBe(true);

    expect(
      quoteUsesOrganizationCommercialDefaults(
        {
          condicionesDePago: "100% contra entrega",
          condicionesVenta: "Garantía 12 meses",
          terminosCondiciones: "",
        },
        profile
      )
    ).toBe(false);
  });

  it("mantiene compatibilidad legacy con observaciones como condiciones", () => {
    const sections = buildQuoteDocumentCommercialSections(
      {
        observaciones: "Instalación incluida en Providencia",
      },
      {
        formaPago: "Transferencia",
      }
    );

    expect(sections).toEqual([
      { title: "Forma de pago", body: "Transferencia" },
      { title: "Condiciones", body: "Instalación incluida en Providencia" },
    ]);
  });

  it("separa notas cuando hay condiciones estructuradas", () => {
    const sections = buildQuoteDocumentCommercialSections(
      {
        condicionesDePago: "50% anticipo",
        condicionesVenta: "Obra limpia y seca",
        observaciones: "Coordinar visita técnica",
      },
      {
        formaPago: "Por definir",
      }
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Forma de pago",
      "Condiciones de venta",
      "Notas",
    ]);
  });
});
