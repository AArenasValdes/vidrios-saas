/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import {
  buildCostosRentabilidadClosedSummary,
  formatAccordionClp,
  PasoTresCostosRentabilidadMovil,
} from "../paso-tres-costos-rentabilidad-movil";
import type { QuoteStudioFinancialSummary } from "@/features/cotizaciones/services/quote-studio-financial.service";
import { QUOTE_PROFITABILITY_COPY } from "@/features/cotizaciones/services/quote-studio-financial.service";
import { createQuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

function buildSummary(
  overrides: Partial<QuoteStudioFinancialSummary> = {}
): QuoteStudioFinancialSummary {
  return {
    quotePricingMode: "por_item",
    materialCostSource: "none",
    costBasisStatus: "sin_materiales",
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
    isProfitabilityComplete: false,
    hasCostBasis: false,
    unknownMaterialItemCount: 0,
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
  it("cerrado muestra rentabilidad pendiente si no hay base de costos", () => {
    renderAccordion();

    expect(screen.getByRole("button", { name: "Costos y rentabilidad" })).toBeInTheDocument();
    expect(screen.getByText(QUOTE_PROFITABILITY_COPY.pendiente)).toBeInTheDocument();
    expect(screen.queryByLabelText("Mano de obra")).not.toBeInTheDocument();
    expect(buildCostosRentabilidadClosedSummary(buildSummary())).toBe(
      QUOTE_PROFITABILITY_COPY.pendiente
    );
  });

  it("cerrado muestra rentabilidad incompleta cuando hay costos parciales", () => {
    const summary = buildSummary({
      materialCostSource: "partial",
      costBasisStatus: "materiales_parciales",
      costoMateriales: 120000,
      unknownMaterialItemCount: 1,
    });

    expect(buildCostosRentabilidadClosedSummary(summary)).toBe(
      QUOTE_PROFITABILITY_COPY.incompleta
    );
  });

  it("cerrado resume costo, utilidad y margen cuando hay rentabilidad completa", () => {
    const summary = buildSummary({
      materialCostSource: "calculated",
      costBasisStatus: "materiales_completos",
      isProfitabilityComplete: true,
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

  it("abierto muestra campos actuales y metricas internas solo si esta completa", () => {
    const onChange = renderAccordion({
      materialCostSource: "calculated",
      costBasisStatus: "materiales_completos",
      isProfitabilityComplete: true,
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
    expect(screen.getByLabelText(QUOTE_PROFITABILITY_COPY.mermaEstimadaLabel)).toBeInTheDocument();
    expect(screen.getByText("Costo total")).toBeInTheDocument();
    expect(screen.getByText("Utilidad")).toBeInTheDocument();
    expect(screen.getByText("Margen real")).toBeInTheDocument();
    expect(screen.getByText("Venta neta")).toBeInTheDocument();
    expect(screen.getByText("Solo visible para tu empresa")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mano de obra"), { target: { value: "40000" } });
    expect(onChange).toHaveBeenCalledWith("manoObra", "40000");
  });

  it("formatea utilidad negativa con el signo antes del peso", () => {
    expect(formatAccordionClp(-310000)).toMatch(/^-\$/);
    expect(formatAccordionClp(-310000)).not.toMatch(/^\$\-/);

    const summary = buildSummary({
      materialCostSource: "calculated",
      isProfitabilityComplete: true,
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
      materialCostSource: "calculated",
      isProfitabilityComplete: true,
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
