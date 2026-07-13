/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import {
  QuoteStudioFinancialPanel,
  canApplyQuoteStudioRecommendedPrice,
} from "../quote-studio-financial-panel";
import type { QuoteStudioFinancialSummary } from "@/features/cotizaciones/services/quote-studio-financial.service";
import { createQuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

function buildSummary(
  overrides: Partial<QuoteStudioFinancialSummary> = {}
): QuoteStudioFinancialSummary {
  return {
    quotePricingMode: "por_item",
    costoMateriales: 0,
    manoObra: 0,
    traslado: 0,
    otrosCostos: 0,
    merma: 0,
    costoTotal: 0,
    margenObjetivoRealPct: 30,
    precioRecomendadoNeto: 0,
    precioFinalNeto: 192000,
    precioFinalCliente: 228480,
    utilidadEstimada: 0,
    margenRealPct: 0,
    markupEquivalentePct: 0,
    hasCostBasis: false,
    ...overrides,
  };
}

function buildProps(summary: QuoteStudioFinancialSummary) {
  return {
    summary,
    adjustments: createQuoteStudioFinancialDraft(),
    formatCurrencyInput: (value: string) => `$${value}`,
    onAdjustmentChange: jest.fn(),
    onApplyRecommendedPrice: jest.fn(),
  };
}

describe("QuoteStudioFinancialPanel", () => {
  it("muestra solo el estado vacio cuando no hay costos", () => {
    render(<QuoteStudioFinancialPanel {...buildProps(buildSummary())} />);

    expect(screen.getByText("Rentabilidad no disponible")).toBeInTheDocument();
    expect(screen.getByText("Agrega costos para calcular margen y utilidad")).toBeInTheDocument();
    expect(screen.queryByText("Precio de venta")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Usar precio recomendado/i })).not.toBeInTheDocument();
  });

  it("muestra el resumen principal cuando hay base de costos", () => {
    render(
      <QuoteStudioFinancialPanel
        {...buildProps(
          buildSummary({
            hasCostBasis: true,
            costoMateriales: 120000,
            costoTotal: 120000,
            utilidadEstimada: 72000,
            margenRealPct: 37.5,
            precioRecomendadoNeto: 171429,
          })
        )}
      />
    );

    expect(screen.getByText("Precio de venta")).toBeInTheDocument();
    expect(screen.getByText("Costo estimado")).toBeInTheDocument();
    expect(screen.getByText("Utilidad")).toBeInTheDocument();
    expect(screen.getByText("Margen real")).toBeInTheDocument();
    expect(screen.getByText("Precio recomendado")).toBeInTheDocument();
    expect(screen.queryByText("Comparación rápida")).not.toBeInTheDocument();
  });

  it("expande y colapsa el detalle de costos", () => {
    render(<QuoteStudioFinancialPanel {...buildProps(buildSummary())} />);

    fireEvent.click(screen.getByRole("button", { name: /Ver detalle de costos/i }));
    expect(screen.getByLabelText("Detalle de costos")).toBeInTheDocument();
    expect(screen.getByText("Mano de obra")).toBeInTheDocument();
    expect(screen.getByText("Margen objetivo %")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ocultar detalle de costos/i }));
    expect(screen.queryByLabelText("Detalle de costos")).not.toBeInTheDocument();
  });

  it("muestra usar precio recomendado solo con calculo valido", () => {
    expect(canApplyQuoteStudioRecommendedPrice(buildSummary())).toBe(false);
    expect(
      canApplyQuoteStudioRecommendedPrice(
        buildSummary({ hasCostBasis: true, precioRecomendadoNeto: 200000 })
      )
    ).toBe(true);

    const props = buildProps(
      buildSummary({ hasCostBasis: true, precioRecomendadoNeto: 200000, costoTotal: 120000 })
    );

    render(<QuoteStudioFinancialPanel {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Usar precio recomendado/i }));
    expect(props.onApplyRecommendedPrice).toHaveBeenCalledTimes(1);
  });
});
