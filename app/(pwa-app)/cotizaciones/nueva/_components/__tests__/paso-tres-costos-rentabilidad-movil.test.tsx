/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import {
  buildCostosRentabilidadClosedSummary,
  formatAccordionClp,
  PasoTresCostosRentabilidadMovil,
} from "../paso-tres-costos-rentabilidad-movil";
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
    precioFinalNeto: 0,
    precioFinalCliente: 0,
    utilidadEstimada: 0,
    margenRealPct: 0,
    markupEquivalentePct: 0,
    hasCostBasis: false,
    ...overrides,
  };
}

function renderAccordion(summaryOverrides: Partial<QuoteStudioFinancialSummary> = {}) {
  const onChange = jest.fn();
  render(
    <PasoTresCostosRentabilidadMovil
      financialSummary={buildSummary(summaryOverrides)}
      quoteStudioFinancial={createQuoteStudioFinancialDraft()}
      formatCurrencyInput={(value) => value}
      onQuoteStudioFinancialChange={onChange}
    />
  );
  return onChange;
}

describe("PasoTresCostosRentabilidadMovil", () => {
  it("cerrado muestra opcional si no hay base de costos", () => {
    renderAccordion();

    expect(screen.getByRole("button", { name: "Costos y rentabilidad" })).toBeInTheDocument();
    expect(screen.getByText("Opcional")).toBeInTheDocument();
    expect(screen.queryByText("Rentabilidad pendiente")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mano de obra")).not.toBeInTheDocument();
    expect(buildCostosRentabilidadClosedSummary(buildSummary())).toBe("Opcional");
  });

  it("cerrado resume costo, utilidad y margen cuando hay base", () => {
    const summary = buildSummary({
      hasCostBasis: true,
      costoTotal: 220000,
      utilidadEstimada: 220000,
      margenRealPct: 50,
      precioFinalNeto: 440000,
    });

    expect(buildCostosRentabilidadClosedSummary(summary)).toMatch(
      /Costo .*220\.000.*Utilidad .*220\.000.*Margen 50%/
    );

    renderAccordion(summary);
    expect(screen.getByText(/Costo .*220\.000/)).toBeInTheDocument();
  });

  it("abierto muestra campos actuales y metricas internas", () => {
    const onChange = renderAccordion({
      hasCostBasis: true,
      costoMateriales: 180000,
      costoTotal: 220000,
      utilidadEstimada: 220000,
      margenRealPct: 50,
      precioFinalNeto: 440000,
    });

    fireEvent.click(screen.getByRole("button", { name: "Costos y rentabilidad" }));

    expect(screen.getByText("Materiales")).toBeInTheDocument();
    expect(screen.getByLabelText("Mano de obra")).toBeInTheDocument();
    expect(screen.getByLabelText("Costo de traslado")).toBeInTheDocument();
    expect(screen.getByLabelText("Otros costos")).toBeInTheDocument();
    expect(screen.getByLabelText("Merma de materiales %")).toBeInTheDocument();
    expect(screen.getByText("Margen objetivo %")).toBeInTheDocument();
    expect(screen.getByText("Margen real que quieres obtener sobre la venta.")).toBeInTheDocument();
    expect(screen.getByText("Costo total")).toBeInTheDocument();
    expect(screen.getByText("Utilidad")).toBeInTheDocument();
    expect(screen.getByText("Margen real")).toBeInTheDocument();
    expect(screen.getByText("Venta neta")).toBeInTheDocument();
    expect(screen.getByText("Solo visible para tu empresa")).toBeInTheDocument();
    expect(screen.queryByText("Esta cotización está bajo costo.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mano de obra"), { target: { value: "40000" } });
    expect(onChange).toHaveBeenCalledWith("manoObra", "40000");
  });

  it("formatea utilidad negativa con el signo antes del peso", () => {
    expect(formatAccordionClp(-310000)).toMatch(/^-\$/);
    expect(formatAccordionClp(-310000)).not.toMatch(/^\$\-/);

    const summary = buildSummary({
      hasCostBasis: true,
      costoTotal: 820000,
      utilidadEstimada: -310000,
      margenRealPct: -90,
      precioFinalNeto: 510000,
    });

    expect(buildCostosRentabilidadClosedSummary(summary)).toMatch(/Utilidad -\$/);
    expect(buildCostosRentabilidadClosedSummary(summary)).not.toMatch(/Utilidad \$-/);
  });

  it("muestra advertencia discreta cuando la cotizacion esta bajo costo", () => {
    renderAccordion({
      hasCostBasis: true,
      costoTotal: 820000,
      utilidadEstimada: -478000,
      margenRealPct: -139.8,
      precioFinalNeto: 342000,
    });

    fireEvent.click(screen.getByRole("button", { name: "Costos y rentabilidad" }));
    expect(screen.getByText("Esta cotización está bajo costo.")).toBeInTheDocument();
  });
});
