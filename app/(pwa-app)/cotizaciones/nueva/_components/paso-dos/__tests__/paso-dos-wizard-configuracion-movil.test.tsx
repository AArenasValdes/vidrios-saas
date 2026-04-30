/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { PasoDosWizardConfiguracionMovil } from "../paso-dos-wizard-configuracion-movil";

const baseProps = {
  activePricingMode: "margen" as const,
  colorOptions: [
    { label: "Aluminio natural", hex: "#a8a8a8" },
    { label: "Blanco", hex: "#f0eeeb" },
  ],
  displayConfigurationOptions: ["2 hojas"],
  displaySystemOptions: ["Corredera"],
  draft: {
    categoria: "Aberturas" as const,
    subtipo: "Ventana",
    cantidad: 2,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    pricingMode: "margen" as const,
    material: "Aluminio" as const,
    colorHex: "#a8a8a8",
    sistema: "Corredera",
    configuracion: "2 hojas",
    vidrio: "Incoloro monolitico 5mm",
    ancho: "1200",
    alto: "1500",
    precio: "120000",
    margenPct: "100",
  },
  formattedPriceValue: "$ 120.000",
  glassCatalogGroups: [],
  isRecommendedGlass: () => false,
  onAltoChange: jest.fn(),
  onAnchoChange: jest.fn(),
  onMargenChange: jest.fn(),
  onMaterialChange: jest.fn(),
  onColorChange: jest.fn(),
  onConfiguracionChange: jest.fn(),
  onPrecioChange: jest.fn(),
  onPricingModeChange: jest.fn(),
  onSistemaChange: jest.fn(),
  onVidrioChange: jest.fn(),
  priceHelp: "Base para calcular la venta con margen.",
  priceLabel: "Costo base",
  recommendedReason: "Opciones frecuentes.",
  recommendedVidrios: ["Incoloro monolitico 5mm"],
  searchResults: [],
  showAllConfigurations: false,
  showAllSystems: false,
  showConfigurationToggle: false,
  showSystemToggle: false,
  vidSearch: "",
  onSetShowAllConfigurations: jest.fn(),
  onSetShowAllSystems: jest.fn(),
  onSetVidSearch: jest.fn(),
};

describe("PasoDosWizardConfiguracionMovil", () => {
  it("debe mostrar margen solo cuando aplica", () => {
    const onPricingModeChange = jest.fn();
    const { rerender } = render(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        activePricingMode="margen"
        onPricingModeChange={onPricingModeChange}
      />
    );

    expect(screen.getByLabelText("Margen (%)")).toBeInTheDocument();
    expect(screen.getByText("Costo base")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Valor directo" }));
    expect(onPricingModeChange).toHaveBeenCalledWith("precio_directo");

    rerender(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        activePricingMode="precio_directo"
        draft={{ ...baseProps.draft, pricingMode: "precio_directo", margenPct: "0" }}
        priceLabel="Precio unitario"
        priceHelp="Valor por unidad que cobras al cliente."
      />
    );

    expect(screen.queryByLabelText("Margen (%)")).not.toBeInTheDocument();
    expect(screen.getByText("Precio unitario")).toBeInTheDocument();
  });
});
