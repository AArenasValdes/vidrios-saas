/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { createEmptyComponentForm } from "@/features/cotizaciones/new-quote/workflow-ui";

import { PasoDosWizardMovil, type WizardActions } from "../paso-dos-wizard-movil-shell";

function createWizard(overrides: Partial<WizardActions> = {}): WizardActions {
  return {
    isOpen: true,
    paso: 1,
    draft: {
      categoria: "Aberturas",
      subtipo: "Ventana",
      cantidad: 2,
      usaCantidadPersonalizada: false,
      cantidadPersonalizada: "",
      pricingMode: "margen",
      material: "Aluminio",
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
    onSelectLineTemplate: jest.fn(),
    onApplyCreatedLineTemplate: jest.fn(),
    onCreateLineTemplate: jest.fn(),
    onColorChange: jest.fn(),
    onSistemaChange: jest.fn(),
    onConfiguracionChange: jest.fn(),
    onVidrioChange: jest.fn(),
    onAnchoChange: jest.fn(),
    onAltoChange: jest.fn(),
    onPrecioChange: jest.fn(),
    onPricingModeChange: jest.fn(),
    onMargenChange: jest.fn(),
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
    onPricingModeSelection: jest.fn(),
    onComponentChange: jest.fn(),
    onToggleGlassPanel: jest.fn(),
    onGlassQueryChange: jest.fn(),
    onGlassSelect: jest.fn(),
    onResetStep2Form: jest.fn(),
    onSaveAndExit: jest.fn(),
    onAddOrUpdateItem: jest.fn(),
  },
  items: [],
  subtotal: "$0",
  total: "$0",
  pricingMode: "margen" as const,
  adjustedItems: {},
  variationQuickEdit: null,
  onGoToSummary: jest.fn(),
  onVariationQuickEditChange: jest.fn(),
  onEditVariationFull: jest.fn(),
  onCloseVariationQuickEdit: jest.fn(),
  onEditItem: jest.fn(),
  onRemoveItem: jest.fn(),
};

describe("PasoDosWizardMovil", () => {
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
