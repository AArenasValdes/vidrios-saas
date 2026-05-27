import type { PasoDosGrupoDraft } from "../../../_hooks/use-paso-dos-agregar-grupo";
import { buildPasoDosWizardMovilState } from "../paso-dos-wizard-movil.state";

function createDraft(overrides: Partial<PasoDosGrupoDraft> = {}): PasoDosGrupoDraft {
  return {
    categoria: "Aberturas",
    subtipo: "Ventana",
    hojasBase: 2,
    cantidad: 2,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    pricingMode: "precio_directo",
    material: "Aluminio",
    colorHex: "#a8a8a8",
    sistema: "Corredera",
    configuracion: "",
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
    vidrio: "Incoloro monolitico 5mm",
    lineTemplateId: "",
    referencia: "",
    ancho: "1200",
    alto: "1500",
    precio: "120000",
    precioPorM2: "",
    minimoCobrable: "",
    redondeoPrecio: "1000",
    margenPct: "0",
    ...overrides,
  };
}

describe("paso-dos-wizard-movil state", () => {
  it("debe construir el estado visual para precio directo", () => {
    const state = buildPasoDosWizardMovilState({
      draft: createDraft(),
      pricingMode: "margen",
    });

    expect(state.activePricingMode).toBe("precio_directo");
    expect(state.cantidadDisplayValue).toBe("2");
    expect(state.canContinueFromQuantity).toBe(true);
    expect(state.canSubmitGroup).toBe(true);
    expect(state.priceLabel).toBe("Precio unitario");
  });

  it("debe bloquear continuar si la cantidad personalizada sigue vacia", () => {
    const state = buildPasoDosWizardMovilState({
      draft: createDraft({
        usaCantidadPersonalizada: true,
        cantidadPersonalizada: "",
      }),
      pricingMode: "precio_directo",
    });

    expect(state.cantidadDisplayValue).toBe("");
    expect(state.canContinueFromQuantity).toBe(false);
  });

  it("debe exigir margen cuando el modo es con margen", () => {
    const state = buildPasoDosWizardMovilState({
      draft: createDraft({
        pricingMode: "margen",
        margenPct: "",
      }),
      pricingMode: "margen",
    });

    expect(state.activePricingMode).toBe("margen");
    expect(state.canSubmitGroup).toBe(false);
    expect(state.priceLabel).toBe("Costo base");
  });
});
