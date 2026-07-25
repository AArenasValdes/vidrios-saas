/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import {
  QuoteStudioFinancialPanel,
  buildQuoteStudioApplyRecommendedLabel,
  buildQuoteStudioRecommendedDeltaLabel,
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
  it("muestra estado compacto sin costos y CTA para agregar", () => {
    render(<QuoteStudioFinancialPanel {...buildProps(buildSummary())} />);

    expect(screen.getByText("Sin costos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar costos/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Detalle de costos")).not.toBeInTheDocument();
    expect(screen.queryByText("Precio de venta")).not.toBeInTheDocument();
    expect(screen.queryByText("Rentabilidad no disponible")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Usar precio recomendado/i })).not.toBeInTheDocument();
  });

  it("abre el detalle con hint corto al agregar costos", () => {
    render(<QuoteStudioFinancialPanel {...buildProps(buildSummary())} />);

    fireEvent.click(screen.getByRole("button", { name: /Agregar costos/i }));
    expect(screen.getByLabelText("Detalle de costos")).toBeInTheDocument();
    expect(screen.getByText(/Ingresa mano de obra, traslado u otros/i)).toBeInTheDocument();
    expect(screen.getByText("Mano de obra")).toBeInTheDocument();
  });

  it("en rápida abre costos y conserva el total general visible", () => {
    render(
      <QuoteStudioFinancialPanel
        {...buildProps(buildSummary())}
        embedded
        initialDetailOpen
        showQuoteTotals
      />
    );

    expect(screen.getByText("Subtotal neto")).toBeInTheDocument();
    expect(screen.getByText("IVA 19%")).toBeInTheDocument();
    expect(screen.getByText("Total a cobrar con IVA")).toBeInTheDocument();
    expect(screen.getByLabelText("Detalle de costos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ocultar costos/i })).toBeInTheDocument();
  });

  it("muestra margen con objetivo, delta y CTA anclado al recomendado", () => {
    const summary = buildSummary({
      hasCostBasis: true,
      costoMateriales: 120000,
      costoTotal: 120000,
      utilidadEstimada: 72000,
      margenRealPct: 37.5,
      margenObjetivoRealPct: 30,
      precioFinalNeto: 192000,
      precioRecomendadoNeto: 200000,
    });

    render(<QuoteStudioFinancialPanel {...buildProps(summary)} />);

    expect(screen.getByText("Precio de venta")).toBeInTheDocument();
    expect(screen.getByText("Costo estimado")).toBeInTheDocument();
    expect(screen.getByText("Utilidad")).toBeInTheDocument();
    expect(screen.getByText("Margen real")).toBeInTheDocument();
    expect(screen.getByText(/obj\.\s*30%/i)).toBeInTheDocument();
    expect(screen.getByText("Precio recomendado")).toBeInTheDocument();
    expect(screen.getByText(buildQuoteStudioRecommendedDeltaLabel(summary)!)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: buildQuoteStudioApplyRecommendedLabel(summary) })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajustar costos y margen/i })).toBeInTheDocument();
  });

  it("expande y colapsa el detalle de costos", () => {
    render(
      <QuoteStudioFinancialPanel
        {...buildProps(
          buildSummary({
            hasCostBasis: true,
            costoTotal: 100000,
            precioRecomendadoNeto: 150000,
          })
        )}
      />
    );

    expect(screen.queryByLabelText("Detalle de costos")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ajustar costos y margen/i }));
    expect(screen.getByLabelText("Detalle de costos")).toBeInTheDocument();
    expect(screen.getByText("Mano de obra")).toBeInTheDocument();
    expect(screen.getByText("Margen objetivo %")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ocultar costos/i }));
    expect(screen.queryByLabelText("Detalle de costos")).not.toBeInTheDocument();
  });

  it("muestra usar precio recomendado solo con calculo valido", () => {
    expect(canApplyQuoteStudioRecommendedPrice(buildSummary())).toBe(false);
    expect(
      canApplyQuoteStudioRecommendedPrice(
        buildSummary({ hasCostBasis: true, precioRecomendadoNeto: 200000 })
      )
    ).toBe(true);

    const summary = buildSummary({
      hasCostBasis: true,
      precioRecomendadoNeto: 200000,
      precioFinalNeto: 180000,
      costoTotal: 120000,
    });
    const props = buildProps(summary);

    render(<QuoteStudioFinancialPanel {...props} />);

    fireEvent.click(
      screen.getByRole("button", { name: buildQuoteStudioApplyRecommendedLabel(summary) })
    );
    expect(props.onApplyRecommendedPrice).toHaveBeenCalledTimes(1);
  });
});
