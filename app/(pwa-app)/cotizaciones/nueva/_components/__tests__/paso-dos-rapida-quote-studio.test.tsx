/** @jest-environment jsdom */

import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";

import { PasoDosSeccion } from "../paso-dos-seccion";

jest.mock("../paso-dos-panel-componentes", () => ({
  PasoDosPanelComponentes: ({ quoteStudioPanelMode }: { quoteStudioPanelMode?: string }) => (
    <aside data-testid="components-panel" data-quote-studio-panel-mode={quoteStudioPanelMode} />
  ),
}));

jest.mock(
  "@/features/cotizaciones/visual-composer/components/quote-constructor-workspace",
  () => ({
    QuoteConstructorWorkspace: ({ embeddedInQuoteStudio }: { embeddedInQuoteStudio?: boolean }) => (
      <section data-testid="quote-constructor-workspace" data-embedded={embeddedInQuoteStudio} />
    ),
  })
);

jest.mock(
  "@/features/cotizaciones/visual-composer/components/despiece-review-surface",
  () => ({
    DespieceReviewSurface: () => null,
  })
);

type PasoDosSeccionProps = ComponentProps<typeof PasoDosSeccion>;

describe("PasoDosSeccion en Cotización rápida", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("comparte el shell y panel resumen de Quote Studio", () => {
    window.localStorage.setItem("ventora:quote-desktop-workspace-mode", "rapida");

    render(
      <PasoDosSeccion
        {...({
          formulario: { editingItemId: null },
          panel: {
            items: [],
            isDesktopQuoteStudio: true,
            onDuplicateItem: jest.fn(),
          },
          itemLibreForm: { isOpen: false },
          quoteModeChosen: true,
          quotePricingMode: "por_item",
          isMobileViewport: false,
          hasComponentDraftInProgress: false,
          addGroupSheetProps: { isOpen: false, paso: 1, onClose: jest.fn() },
          onOpenCreator: jest.fn(),
          onOpenFreeTotalNotebook: jest.fn(),
          onSelectMode: jest.fn(),
          onReturnToModeSelector: jest.fn(),
          constructorLineTemplates: [],
          constructorGlassOptions: [],
          totalClienteManual: null,
          formatCurrencyInput: (value: string) => value,
          onAddConstructorPreset: jest.fn(),
          onUpdateConstructorItem: jest.fn(),
          onMoveConstructorItem: jest.fn(),
          onGlobalTotalClienteChange: jest.fn(),
        } as unknown as PasoDosSeccionProps)}
      />
    );

    expect(screen.getByRole("tab", { name: "Cotización rápida" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("quote-constructor-workspace")).toHaveAttribute(
      "data-embedded",
      "true"
    );
    expect(screen.queryByTestId("components-panel")).not.toBeInTheDocument();
  });
});
