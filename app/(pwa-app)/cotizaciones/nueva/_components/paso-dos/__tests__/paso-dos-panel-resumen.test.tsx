/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import { QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT } from "../quote-studio-desktop-edition";
import { PasoDosPanelResumen } from "../paso-dos-panel-resumen";

const desktopClasses = {
  footer: "footer",
  footerHint: "footerHint",
  totalsRow: "totalsRow",
  totalItem: "totalItem",
  totalItemWide: "totalItemWide",
  summaryButton: "summaryButton",
};

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ id: "item-1", precioTotal: 120000 }],
    quotePricingMode: "por_item" as const,
    isMobileViewport: false,
    subtotal: "$120.000",
    iva: "$22.800",
    total: "$142.800",
    mostrarIva: true,
    pendingItemsCount: 0,
    completedItemsCount: 1,
    isDesktopQuoteStudio: true,
    stepTwoSummaryRef: { current: null },
    onGoToSummary: jest.fn(),
    layout: "desktop" as const,
    desktopClasses,
    isPieceInEdition: false,
    ...overrides,
  };
}

describe("PasoDosPanelResumen desktop quote studio", () => {
  it("muestra Ir al resumen habilitado mientras hay pieza en edicion y piezas terminadas", () => {
    render(
      <PasoDosPanelResumen
        {...buildProps({
          isPieceInEdition: true,
          completedItemsCount: 2,
        })}
      />
    );

    expect(screen.getByRole("button", { name: /Ir al resumen/i })).toBeEnabled();
    expect(
      screen.queryByText(QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT)
    ).not.toBeInTheDocument();
  });

  it("bloquea Ir al resumen sin piezas terminadas durante la edicion", () => {
    render(
      <PasoDosPanelResumen
        {...buildProps({
          isPieceInEdition: true,
          completedItemsCount: 0,
          items: [],
          pieceInEditionHint: QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT,
        })}
      />
    );

    expect(screen.getByRole("button", { name: /Ir al resumen/i })).toBeDisabled();
    expect(screen.getByText(QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT)).toBeInTheDocument();
  });

  it("muestra Ir al resumen tambien cuando no hay pieza en edicion", () => {
    render(<PasoDosPanelResumen {...buildProps()} />);

    expect(screen.getByRole("button", { name: /Ir al resumen/i })).toBeInTheDocument();
    expect(screen.getByText("Subtotal neto")).toBeInTheDocument();
    expect(screen.getByText("Total a cobrar")).toBeInTheDocument();
    expect(
      screen.queryByText(QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT)
    ).not.toBeInTheDocument();
  });
});
