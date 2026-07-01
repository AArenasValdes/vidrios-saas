/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { createEmptyComponentForm } from "@/features/cotizaciones/new-quote/workflow-ui";

import { PasoDosWizardMovil, type WizardActions } from "../paso-dos-wizard-movil-shell";

function createWizard(overrides: Partial<WizardActions> = {}): WizardActions {
  return {
    isOpen: true,
    paso: 1,
    entryMode: "normal",
    draft: {
      categoria: "Aberturas",
      subtipo: "Ventana",
      hojasBase: 2,
      cantidad: 2,
      usaCantidadPersonalizada: false,
      cantidadPersonalizada: "",
      nombre: "",
      descripcion: "",
      ivaMode: "total_incluye_iva" as const,
      cobraPrecioSeparado: false,
      alcanceDetalles: [],
      pricingMode: "margen",
      material: "Aluminio",
      colorHex: "#a8a8a8",
      sistema: "Corredera",
      configuracion: "2 hojas",
      sheetScheme: "",
      sheetVariant: "",
      customSchemeDescription: "",
      isCustomScheme: false,
      mirrorFormat: "single",
      mirrorPaneCount: null,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "fine",
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
    subtypeOptions: ["Ventana", "Puerta"],
    systemOptions: ["Corredera"],
    configurationOptions: ["2 hojas"],
    glassOptions: ["Incoloro monolitico 5mm", "Templado 8mm"],
    visibleLineTemplates: [],
    linePricingSummary: {
      areaM2: null,
      areaTotalM2: null,
      precioBaseUnitario: null,
      precioM2Sugerido: null,
      minimoCobrable: null,
      minimoAplicado: null,
      redondeoPrecio: null,
      precioUnitarioSugerido: null,
      redondeoAplicado: null,
      cantidad: 1,
      totalSugerido: null,
      motivoNoCalculado: null,
    },
    isSavingLineTemplate: false,
    onOpen: jest.fn(),
    onOpenFreeTotalNotebook: jest.fn(),
    onClose: jest.fn(),
    onGoToStep: jest.fn(),
    onBack: jest.fn(),
    onNext: jest.fn(),
    onConfirm: jest.fn(),
    onSelectCategoria: jest.fn(),
    onSelectSubtipo: jest.fn(),
    onSelectCantidad: jest.fn(),
    onCantidadChange: jest.fn(),
    onMaterialChange: jest.fn(),
    onNombreChange: jest.fn(),
    onDescripcionChange: jest.fn(),
    onSelectLineTemplate: jest.fn(),
    onApplyCreatedLineTemplate: jest.fn(),
    onCreateLineTemplate: jest.fn(),
    onColorChange: jest.fn(),
    onSistemaChange: jest.fn(),
    onConfiguracionChange: jest.fn(),
    onPalilloEnabledChange: jest.fn(),
    onPalilloTypeChange: jest.fn(),
    onCostInputScopeChange: jest.fn(),
    onSheetSchemeChange: jest.fn(),
    onSheetVariantChange: jest.fn(),
    onCustomSchemeDescriptionChange: jest.fn(),
    onMirrorFormatChange: jest.fn(),
    onMirrorPaneCountChange: jest.fn(),
    onMirrorCustomPaneCountChange: jest.fn(),
    onMirrorPaneDirectionChange: jest.fn(),
    onMirrorInteriorLineChange: jest.fn(),
    onVidrioChange: jest.fn(),
    onCreateCustomGlass: jest.fn(),
    onAnchoChange: jest.fn(),
    onAltoChange: jest.fn(),
    onPrecioChange: jest.fn(),
    onPricingModeChange: jest.fn(),
    onMargenChange: jest.fn(),
    onCobraPrecioSeparadoChange: jest.fn(),
    onAddAlcanceDetalle: jest.fn(),
    onUpdateAlcanceDetalle: jest.fn(),
    onRemoveAlcanceDetalle: jest.fn(),
    ...overrides,
  };
}

const baseProps = {
  formulario: {
    itemsCount: 0,
    editingItemId: null,
    componentForm: createEmptyComponentForm(),
    fieldErrors: {},
    globalError: null,
    isMobileViewport: true,
    isSaving: false,
    currentComponentPreviewSvg: "",
    batchPreviewCodes: [],
    visibleBatchPreviewCodes: [],
    hiddenBatchPreviewCount: 0,
    batchPreviewTypeLabel: "",
    isGlassPanelOpen: false,
    glassQuery: "",
    filteredGlassGroups: [],
    canCreateCustomGlass: false,
    quotePricingMode: "por_item" as const,
    onQuotePricingModeChange: jest.fn(),
    onPricingModeSelection: jest.fn(),
    onComponentChange: jest.fn(),
    onToggleGlassPanel: jest.fn(),
    onGlassQueryChange: jest.fn(),
    onGlassSelect: jest.fn(),
    onCreateCustomGlass: jest.fn(),
    onResetStep2Form: jest.fn(),
    onSaveAndExit: jest.fn(),
    onAddOrUpdateItem: jest.fn(),
    activeLineTemplates: [],
    linePricingSummary: null,
    isSavingQuickPriceTemplate: false,
    recommendedGlassOptions: [],
    recommendedGlassReason: "",
    lineTemplateRecommendedGlass: null,
    onSelectLineTemplate: jest.fn(),
    onRecalculateCurrentTemplatePrice: jest.fn(),
    onSaveQuickPriceTemplate: jest.fn(),
  },
  items: [],
  subtotal: "$0",
  total: "$0",
  pricingMode: "margen" as const,
  adjustedItems: {},
  totalClienteManual: null,
  mostrarIva: true,
  internalObservation: "",
  variationQuickEdit: null,
  onGoToSummary: jest.fn(),
  onVariationQuickEditChange: jest.fn(),
  onEditVariationFull: jest.fn(),
  onCloseVariationQuickEdit: jest.fn(),
  onEditItem: jest.fn(),
  onRemoveItem: jest.fn(),
  onOpenFreeValueItemForm: jest.fn(),
  quoteModeChosen: true,
  onGlobalTotalClienteChange: jest.fn(),
  onMostrarIvaChange: jest.fn(),
  onInternalObservationChange: jest.fn(),
  itemLibreForm: {
    isOpen: false,
    editingItemId: null,
    form: { nombre: "", descripcion: "", valor: "", ivaMode: "total_incluye_iva" as const },
    fieldErrors: {},
    isSaving: false,
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  },
};

describe("PasoDosWizardMovil", () => {
  it("muestra selector de modalidad al entrar sin componentes cargados", () => {
    render(
      <PasoDosWizardMovil
        {...baseProps}
        quoteModeChosen={false}
        wizard={createWizard({ isOpen: false })}
      />
    );

    expect(
      screen.getByRole("heading", { name: /como quieres calcular el presupuesto/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Cotizar por items")).toBeInTheDocument();
    expect(screen.getByText("Cotizar libre por total")).toBeInTheDocument();
    expect(screen.queryByText("Componentes cargados")).not.toBeInTheDocument();
  });

  it("debe mostrar etapa 1 con CTA cancelar", () => {
    const wizard = createWizard({ paso: 1 });
    render(<PasoDosWizardMovil {...baseProps} wizard={wizard} />);

    expect(screen.getByText("Que vas a agregar?")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancelar"));
    expect(wizard.onClose).toHaveBeenCalled();
  });

  it("debe mostrar etapa 2 con CTA continuar", () => {
    const wizard = createWizard({ paso: 2 });
    render(<PasoDosWizardMovil {...baseProps} wizard={wizard} />);

    expect(screen.getByText("Cuantas unidades?")).toBeInTheDocument();
    expect(screen.getByText("Continuar")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continuar"));
    expect(wizard.onNext).toHaveBeenCalled();
  });

  it("debe mostrar etapa 3 con CTA agregar componente", () => {
    const wizard = createWizard({ paso: 3 });
    render(<PasoDosWizardMovil {...baseProps} wizard={wizard} />);

    expect(screen.getByText("Datos del grupo")).toBeInTheDocument();
    expect(screen.getByText("Agregar componente")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Agregar componente"));
    expect(wizard.onConfirm).toHaveBeenCalled();
  });
});
