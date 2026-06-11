/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PasoDosWizardConfiguracionMovil } from "../paso-dos-wizard-configuracion-movil";

const baseProps = {
  activePricingMode: "margen" as const,
  colorOptions: [
    { label: "Aluminio mate", hex: "#a8a8a8" },
    { label: "Blanco", hex: "#f0eeeb" },
  ],
  displayConfigurationOptions: ["2 hojas"],
  displaySystemOptions: ["Corredera"],
  draft: {
    categoria: "Aberturas" as const,
    subtipo: "Ventana",
    hojasBase: 2 as const,
    cantidad: 2,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    nombre: "",
    descripcion: "",
    ivaMode: "total_incluye_iva" as const,
    cobraPrecioSeparado: false,
    alcanceDetalles: [],
    pricingMode: "margen" as const,
    material: "Aluminio" as const,
    colorHex: "#a8a8a8",
    sistema: "Corredera",
    configuracion: "2 hojas",
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
    mirrorFormat: "single" as const,
    mirrorPaneCount: null,
    mirrorPaneDirection: "vertical" as const,
    mirrorInteriorLine: "fine" as const,
    mirrorCustomPaneCount: "",
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
    palilloEnabled: false,
    palilloType: "",
    costInputScope: "group_total" as const,
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
  onNombreChange: jest.fn(),
  onDescripcionChange: jest.fn(),
  onSelectLineTemplate: jest.fn(),
  onColorChange: jest.fn(),
  onConfiguracionChange: jest.fn(),
  onSheetSchemeChange: jest.fn(),
  onSheetVariantChange: jest.fn(),
  onCustomSchemeDescriptionChange: jest.fn(),
  onMirrorFormatChange: jest.fn(),
  onMirrorPaneCountChange: jest.fn(),
  onMirrorCustomPaneCountChange: jest.fn(),
  onMirrorPaneDirectionChange: jest.fn(),
  onMirrorInteriorLineChange: jest.fn(),
  onPrecioChange: jest.fn(),
  onPricingModeChange: jest.fn(),
  onSistemaChange: jest.fn(),
  onVidrioChange: jest.fn(),
  onPalilloEnabledChange: jest.fn(),
  onPalilloTypeChange: jest.fn(),
  onCostInputScopeChange: jest.fn(),
  onCobraPrecioSeparadoChange: jest.fn(),
  onAddAlcanceDetalle: jest.fn(),
  onUpdateAlcanceDetalle: jest.fn(),
  onRemoveAlcanceDetalle: jest.fn(),
  quotePricingMode: "por_item" as const,
  totalClienteManual: null,
  mostrarIva: true,
  internalObservation: "",
  onGlobalTotalClienteChange: jest.fn(),
  onMostrarIvaChange: jest.fn(),
  onInternalObservationChange: jest.fn(),
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
  it("debe mostrar espejos recomendados al cotizar un espejo", () => {
    render(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        displayConfigurationOptions={["Pulido", "Biselado"]}
        displaySystemOptions={["Muro", "Pegado"]}
        draft={{
          ...baseProps.draft,
          subtipo: "Espejo",
          sistema: "Muro",
          configuracion: "Pulido",
          vidrio: "Espejo 4mm",
        }}
        recommendedReason="Espesores habituales para espejos a medida."
        recommendedVidrios={["Espejo 3mm", "Espejo 4mm", "Espejo 5mm", "Espejo 6mm"]}
      />
    );

    expect(screen.getByText("Espejos")).toBeInTheDocument();
    expect(screen.getByText("Recomendado para espejos a medida.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Espejo 4mm/i })).toBeInTheDocument();
  });

  it("no debe pedir material ni color de perfil para espejos", () => {
    render(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        displayConfigurationOptions={["Pulido", "Biselado"]}
        displaySystemOptions={["Muro", "Pegado"]}
        draft={{
          ...baseProps.draft,
          subtipo: "Espejo",
          sistema: "Muro",
          configuracion: "Pulido",
        }}
      />
    );

    expect(screen.queryByText("Material")).not.toBeInTheDocument();
    expect(screen.queryByText("Color perfil")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aluminio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "PVC" })).not.toBeInTheDocument();
  });

  it("debe mostrar formato del espejo solo para espejos", () => {
    const { rerender } = render(<PasoDosWizardConfiguracionMovil {...baseProps} />);

    expect(screen.queryByText("Formato del espejo")).not.toBeInTheDocument();

    rerender(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        displayConfigurationOptions={["Pulido", "Biselado"]}
        displaySystemOptions={["Muro", "Pegado", "Con instalacion"]}
        draft={{
          ...baseProps.draft,
          subtipo: "Espejo",
          sistema: "Muro",
          configuracion: "Pulido",
          vidrio: "Espejo 4mm",
        }}
      />
    );

    expect(screen.getByText("Formato del espejo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 paño" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dividido en paños" })).toBeInTheDocument();
  });

  it("debe configurar paños de espejo y mostrar ayuda calculada", () => {
    const onMirrorPaneCountChange = jest.fn();
    const onMirrorPaneDirectionChange = jest.fn();
    const onMirrorInteriorLineChange = jest.fn();

    render(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        displayConfigurationOptions={["Pulido", "Biselado"]}
        displaySystemOptions={["Muro", "Pegado", "Con instalacion"]}
        draft={{
          ...baseProps.draft,
          subtipo: "Espejo",
          sistema: "Muro",
          configuracion: "Pulido",
          vidrio: "Espejo 4mm",
          ancho: "3000",
          alto: "870",
          cantidad: 1,
          mirrorFormat: "divided",
          mirrorPaneCount: 6,
          mirrorPaneDirection: "vertical",
          mirrorInteriorLine: "fine",
        }}
        onMirrorPaneCountChange={onMirrorPaneCountChange}
        onMirrorPaneDirectionChange={onMirrorPaneDirectionChange}
        onMirrorInteriorLineChange={onMirrorInteriorLineChange}
      />
    );

    expect(screen.getByText("6 paños de 500 x 870 mm aprox.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(onMirrorPaneCountChange).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole("button", { name: "Horizontal" }));
    expect(onMirrorPaneDirectionChange).toHaveBeenCalledWith("horizontal");
    fireEvent.click(screen.getByRole("button", { name: "Junta marcada" }));
    expect(onMirrorInteriorLineChange).toHaveBeenCalledWith("marked");
  });

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

    fireEvent.click(screen.getByRole("button", { name: /Nueva l(i|í)nea/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /Nueva l(i|í)nea/i })[1]);

    fireEvent.change(screen.getByPlaceholderText(/Ej: L(i|í)nea 5000/i), {
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

    expect(screen.getByPlaceholderText(/Buscar l(i|í)neas/i)).toBeInTheDocument();
  });

  it("debe mostrar esquema de hojas para ventana corredera y permitir descripcion libre", () => {
    const onSheetSchemeChange = jest.fn();
    const onSheetVariantChange = jest.fn();
    const onCustomSchemeDescriptionChange = jest.fn();
    const { rerender } = render(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        onSheetSchemeChange={onSheetSchemeChange}
        onSheetVariantChange={onSheetVariantChange}
        onCustomSchemeDescriptionChange={onCustomSchemeDescriptionChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "3 hojas" }));
    expect(onSheetSchemeChange).toHaveBeenCalledWith("3 hojas");

    rerender(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        draft={{ ...baseProps.draft, sheetScheme: "3 hojas" }}
        onSheetSchemeChange={onSheetSchemeChange}
        onSheetVariantChange={onSheetVariantChange}
        onCustomSchemeDescriptionChange={onCustomSchemeDescriptionChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Otro" }));
    expect(onSheetVariantChange).toHaveBeenCalledWith("Otro");

    rerender(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        draft={{ ...baseProps.draft, sheetScheme: "3 hojas", sheetVariant: "Otro" }}
        onSheetSchemeChange={onSheetSchemeChange}
        onSheetVariantChange={onSheetVariantChange}
        onCustomSchemeDescriptionChange={onCustomSchemeDescriptionChange}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Ej: fijo superior + lateral"), {
      target: { value: "3 hojas, la del medio fija" },
    });
    expect(onCustomSchemeDescriptionChange).toHaveBeenCalledWith(
      "3 hojas, la del medio fija"
    );
  });

  it("debe mostrar precio final y observacion colapsada en presupuesto por total", () => {
    render(
      <PasoDosWizardConfiguracionMovil
        {...baseProps}
        quotePricingMode="total_global"
        totalClienteManual={600000}
        mostrarIva
        draft={{
          ...baseProps.draft,
          subtipo: "Trabajo libre / Mantencion",
          nombre: "Mantencion",
          descripcion: "Mantencion de 5 ventanas existentes.",
          sistema: "",
          configuracion: "",
          vidrio: "",
          ancho: "",
          alto: "",
          precio: "",
          alcanceDetalles: [
            {
              id: "detalle-1",
              tipo: "estructurado",
              subtipo: "Ventana",
              nombre: "3 ventanas correderas 1500 x 2000",
              cantidad: "3",
              ancho: "1500",
              alto: "2000",
              descripcion: "Con retiro de marco existente",
            },
          ],
        }}
      />
    );

    expect(screen.queryByText("Datos del item")).not.toBeInTheDocument();
    expect(screen.queryByText("Cobrar este item por separado")).not.toBeInTheDocument();
    expect(screen.getByText("NOMBRE DEL TRABAJO")).toBeInTheDocument();
    expect(screen.getByText("DESCRIPCION PARA CLIENTE")).toBeInTheDocument();
    expect(screen.getByText("AGREGAR COMPONENTES LIBRES")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3 ventanas correderas 1500 x 2000")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: Colocar ventana")).toBeInTheDocument();
    expect(screen.getByText("PRECIO FINAL")).toBeInTheDocument();
    expect(screen.getByDisplayValue("600.000")).toBeInTheDocument();
    expect(screen.queryByText("Incluye IVA")).not.toBeInTheDocument();
    expect(screen.getByText(/Configura IVA y flete en el resumen/i)).toBeInTheDocument();

    expect(screen.queryByText("Editar detalle incluido")).not.toBeInTheDocument();
    expect(screen.getByText("+ Agregar observacion interna")).toBeInTheDocument();
  });
});
