/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { PasoDosPanelLista } from "../paso-dos-panel-lista";

const sourceItem = {
  id: "item-1",
  codigo: "V1",
  tipo: "Ventana",
  tipoItem: "componente",
} as never;

function buildProps() {
  return {
    items: [sourceItem],
    quotePricingMode: "por_item" as const,
    isMobileViewport: false,
    selectedQuickEditItem: null,
    selectedQuickEditViewItem: null,
    selectedQuickEditDraft: null,
    selectedQuickEditPricingLabel: "Precio final",
    selectedQuickEditIndex: 0,
    selectedQuickEditPendingSameTypeCount: 0,
    selectedQuickEditBatchTargets: [],
    effectiveQuickEditBatchSelectionIds: [],
    isQuickEditBatchSelectionOpen: false,
    expandedQuickEditFocusField: null,
    expandedQuickEditItemId: null,
    editingItemId: null,
    visibleComponentListState: {
      cards: [
        {
          id: "item-1",
          source: sourceItem,
          colorHex: "#999999",
          title: "V1 · Ventana",
          price: "$120.000",
          priceLabel: "Precio",
          compactMeta: "1200 x 1500 mm",
          metaPrimary: "1200 x 1500 mm",
          metaSecondary: "Linea base",
          metaTertiary: "",
          quickEditPriceLabel: "Precio",
          svgMarkup: "",
          isComplete: true,
        },
      ],
      paddingTop: 0,
      paddingBottom: 0,
    },
    shouldUseStepTwoListScroll: false,
    fieldErrorItems: undefined,
    stepTwoListRef: { current: null },
    onQuickDraftChange: jest.fn(),
    onQuickCommit: jest.fn(),
    onQuickNavigate: jest.fn(),
    onScrollToSummary: jest.fn(),
    onStartBatchSelection: jest.fn(),
    onToggleBatchTarget: jest.fn(),
    onApplyQuickEditToSameType: jest.fn(),
    onCancelBatchSelection: jest.fn(),
    onMeasureFirstItem: jest.fn(),
    onSelectQuickEditItem: jest.fn(),
    onEditItem: jest.fn(),
    onDuplicateItem: jest.fn(),
    onRemoveItem: jest.fn(),
    onRecalculateTemplatePrice: jest.fn(),
    onSaveQuickPriceTemplateFromItem: jest.fn(),
    isSavingQuickPriceTemplate: false,
    isAddGroupWizardOpen: false,
    activeDraftCard: null,
    onContinueActiveDraft: jest.fn(),
  };
}

describe("PasoDosPanelLista desktop", () => {
  it("duplica la pieza desde la lista sin editar la original", () => {
    const props = buildProps();

    render(<PasoDosPanelLista {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Duplicar V1/i }));

    expect(props.onDuplicateItem).toHaveBeenCalledTimes(1);
    expect(props.onDuplicateItem).toHaveBeenCalledWith(sourceItem);
    expect(props.onEditItem).not.toHaveBeenCalled();
  });

  it("prioriza codigo, medidas y configuracion en Quote Studio", () => {
    const props = buildProps();
    props.isDesktopQuoteStudio = true;
    props.visibleComponentListState.cards[0] = {
      ...props.visibleComponentListState.cards[0],
      listCode: "V1",
      listName: "Ventana corredera living",
      listMeasures: "1200 x 1500 mm",
      listConfiguration: "Linea base · Corredera 2 hojas",
      listQuantity: "2 uds.",
      svgMarkup: "<svg data-testid='piece-drawing'></svg>",
    };

    render(<PasoDosPanelLista {...props} />);

    expect(screen.getByText("V1")).toBeInTheDocument();
    expect(screen.getByText("Ventana corredera living")).toBeInTheDocument();
    expect(screen.getByText("1200 x 1500 mm")).toBeInTheDocument();
    expect(screen.getByText("Linea base · Corredera 2 hojas")).toBeInTheDocument();
    expect(screen.getByText("2 uds.")).toBeInTheDocument();
    expect(document.querySelector("[data-testid='piece-drawing']")).not.toBeNull();
  });
});
