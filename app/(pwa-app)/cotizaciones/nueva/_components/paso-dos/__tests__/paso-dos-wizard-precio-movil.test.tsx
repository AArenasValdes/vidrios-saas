/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { PasoDosWizardPrecioMovil } from "../paso-dos-wizard-precio-movil";
import type { GuidedTechnicalCostSuggestion } from "@/features/proveedor-catalogos/services/guided-technical-cost-suggestion.service";

const completeSummary: GuidedTechnicalCostSuggestion = {
  status: "complete",
  profilesCostNet: 105000,
  glassCostNet: 15000,
  accessoriesCostNet: null,
  knownNetTotal: 120000,
  usableBaseCostGroupNet: 120000,
  defaultMarkupPct: 100,
  markupAmountNet: 120000,
  suggestedNetTotal: 240000,
  currency: "CLP",
  missingItems: [],
  reason: null,
  costSnapshot: null,
};

const partialSummary: GuidedTechnicalCostSuggestion = {
  status: "partial",
  profilesCostNet: 90000,
  glassCostNet: null,
  accessoriesCostNet: null,
  knownNetTotal: 90000,
  usableBaseCostGroupNet: null,
  defaultMarkupPct: 100,
  markupAmountNet: null,
  suggestedNetTotal: null,
  currency: "CLP",
  missingItems: [
    {
      technicalCode: null,
      description: "Incoloro monolítico 5mm",
      reason: "Falta presentación de compra del vidrio.",
    },
  ],
  reason: null,
  costSnapshot: null,
};

describe("PasoDosWizardPrecioMovil — Costo técnico y sugerencia comercial", () => {
  it("muestra costo verificado, recargo 100% y sugerencia neta sin IVA; adopta y revierte explícitamente", () => {
    const onApply = jest.fn();
    const onRevert = jest.fn();

    const { rerender } = render(
      <PasoDosWizardPrecioMovil
        activePricingMode="precio_directo"
        costInputScope="group_total"
        formattedPriceValue="$ 180.000"
        marginValue="100"
        costoIngresado={180000}
        cantidad={1}
        technicalCostSummary={completeSummary}
        hasAppliedTechnicalCostSuggestion={false}
        onApplyTechnicalCostSuggestion={onApply}
        onRevertTechnicalCostSuggestion={onRevert}
        onCostInputScopeChange={jest.fn()}
        onMargenChange={jest.fn()}
        onPrecioChange={jest.fn()}
        onPricingModeChange={jest.fn()}
        priceHelp="Precio directo"
        priceLabel="Valor directo"
      />
    );

    expect(screen.getByText("Costo verificado")).toBeInTheDocument();
    expect(screen.getByText("$ 240.000")).toBeInTheDocument();
    expect(screen.queryByText(/IVA/i)).not.toBeInTheDocument();
    // Existing manual price is NOT overwritten automatically
    expect(screen.getByDisplayValue("$ 180.000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Usar sugerencia \(\$ 240\.000\)/i }));
    expect(onApply).toHaveBeenCalledTimes(1);

    rerender(
      <PasoDosWizardPrecioMovil
        activePricingMode="margen"
        costInputScope="group_total"
        formattedPriceValue="$ 120.000"
        marginValue="100"
        costoIngresado={120000}
        cantidad={1}
        technicalCostSummary={completeSummary}
        hasAppliedTechnicalCostSuggestion
        onApplyTechnicalCostSuggestion={onApply}
        onRevertTechnicalCostSuggestion={onRevert}
        onCostInputScopeChange={jest.fn()}
        onMargenChange={jest.fn()}
        onPrecioChange={jest.fn()}
        onPricingModeChange={jest.fn()}
        priceHelp="Costo interno"
        priceLabel="Costo base"
      />
    );

    expect(screen.getByText("Sugerencia aplicada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revertir" }));
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it("muestra Costo parcial sin aplicar recargo automático y diferencia costo base manual", () => {
    const onCompleteManual = jest.fn();

    render(
      <PasoDosWizardPrecioMovil
        activePricingMode="margen"
        costInputScope="group_total"
        formattedPriceValue="$ 120.000"
        marginValue="100"
        costoIngresado={120000}
        cantidad={1}
        technicalCostSummary={partialSummary}
        onCompleteManualBaseCost={onCompleteManual}
        onCostInputScopeChange={jest.fn()}
        onMargenChange={jest.fn()}
        onPrecioChange={jest.fn()}
        onPricingModeChange={jest.fn()}
        priceHelp="Costo base"
        priceLabel="Costo base"
      />
    );

    expect(screen.getByText("Costo parcial")).toBeInTheDocument();
    expect(screen.getByText(/No se aplica recargo automático sobre suma parcial/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Usar sugerencia/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Costo base manual \(incluye faltantes no verificados\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completar costo base manual" }));
    expect(onCompleteManual).toHaveBeenCalledTimes(1);
  });
});
