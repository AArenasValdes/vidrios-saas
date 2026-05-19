/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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
    lineTemplateId: "",
    referencia: "",
    ancho: "1200",
    alto: "1500",
    precio: "120000",
    precioPorM2: "",
    minimoCobrable: "",
    redondeoPrecio: "1000",
    margenPct: "100",
  },
  formattedPriceValue: "$ 120.000",
  glassCatalogGroups: [],
  isRecommendedGlass: () => false,
  isSavingLineTemplate: false,
  linePricingSummary: {
    areaM2: null,
    areaTotalM2: null,
    precioBaseUnitario: null,
    precioM2Sugerido: null,
    minimoCobrable: null,
    minimoAplicado: null,
    redondeoPrecio: null,
    redondeoAplicado: null,
    precioUnitarioSugerido: null,
    cantidad: 1,
    totalSugerido: null,
    motivoNoCalculado: null,
  },
  lineTemplateOptions: [],
  onAltoChange: jest.fn(),
  onAnchoChange: jest.fn(),
  onApplyCreatedLineTemplate: jest.fn(),
  onCreateLineTemplate: jest.fn(),
  onMargenChange: jest.fn(),
  onMaterialChange: jest.fn(),
  onSelectLineTemplate: jest.fn(),
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

  it("debe crear una línea rápida con el material heredado y aplicarla al draft", async () => {
    const onCreateLineTemplate = jest.fn().mockResolvedValue({
      id: "tmpl-1",
      organizationId: "org-1",
      nombre: "Línea 5000",
      material: "Aluminio",
      vidrioPrincipalRecomendado: "Templado 8mm",
      precioM2Sugerido: 185000,
      minimoCobrable: 120000,
      redondeoPrecio: 1000,
      isActive: true,
      sortOrder: 1,
      creadoEn: null,
      actualizadoEn: null,
      eliminadoEn: null,
    });
    const onApplyCreatedLineTemplate = jest.fn();

    render(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        onApplyCreatedLineTemplate={onApplyCreatedLineTemplate}
        onCreateLineTemplate={onCreateLineTemplate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Nueva línea" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Nueva línea" })[1]);

    fireEvent.change(screen.getByPlaceholderText("Ej: Línea 5000"), {
      target: { value: "Línea 5000" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ej: 185000"), {
      target: { value: "185000" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ej: Termopanel 4/10/4"), {
      target: { value: "Templado 8mm" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar y usar" }));

    await waitFor(() => {
      expect(onCreateLineTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: "Línea 5000",
          material: "Aluminio",
          vidrioPrincipalRecomendado: "Templado 8mm",
          precioM2Sugerido: 185000,
          isActive: true,
        })
      );
    });

    await waitFor(() => {
      expect(onApplyCreatedLineTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "tmpl-1",
          nombre: "Línea 5000",
        })
      );
    });

    expect(screen.getByPlaceholderText("Buscar líneas...")).toBeInTheDocument();
  });
});
