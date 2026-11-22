/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { PasoDosWizardPrecioMovil } from "../paso-dos-wizard-precio-movil";
import type { GuidedTechnicalCostSuggestion } from "@/features/proveedor-catalogos/services/guided-technical-cost-suggestion.service";

const completeSummary: GuidedTechnicalCostSuggestion = {
  status: "complete",
  recipeStatus: "validated",
  isRecipeValidated: true,
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
  nonVerifiedReasons: [],
  reason: null,
  costSnapshot: null,
};

const partialSummary: GuidedTechnicalCostSuggestion = {
  status: "partial",
  recipeStatus: "validated",
  isRecipeValidated: true,
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
  nonVerifiedReasons: [],
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
    expect(screen.getByText(/Costo base manual: representa el total completo de la base/i)).toBeInTheDocument();
    expect(screen.getByText(/No incluye mano de obra ni instalación/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completar costo base manual" }));
    expect(onCompleteManual).toHaveBeenCalledTimes(1);
  });

  it("advierte si el costo base manual es menor que los materiales conocidos y muestra equivalencia Por unidad vs grupo", () => {
    const { rerender } = render(
      <PasoDosWizardPrecioMovil
        activePricingMode="margen"
        costInputScope="group_total"
        formattedPriceValue="$ 80.000"
        marginValue="100"
        costoIngresado={80000}
        cantidad={2}
        technicalCostSummary={partialSummary}
        onCostInputScopeChange={jest.fn()}
        onMargenChange={jest.fn()}
        onPrecioChange={jest.fn()}
        onPricingModeChange={jest.fn()}
        priceHelp="Costo base"
        priceLabel="Costo base"
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/menor que los materiales conocidos/i);

    rerender(
      <PasoDosWizardPrecioMovil
        activePricingMode="margen"
        costInputScope="unit"
        formattedPriceValue="$ 60.000"
        marginValue="100"
        costoIngresado={60000}
        cantidad={2}
        technicalCostSummary={{
          ...partialSummary,
          isRecipeValidated: false,
          recipeStatus: "testing",
          nonVerifiedReasons: ["Receta en estado testing sin validación física de taller."],
        }}
        onCostInputScopeChange={jest.fn()}
        onMargenChange={jest.fn()}
        onPrecioChange={jest.fn()}
        onPricingModeChange={jest.fn()}
        priceHelp="Costo base"
        priceLabel="Costo base"
      />
    );

    // 60.000 / u * 2 = 120.000 >= 90.000 known -> no under-cost warning, and transparent equivalence shown
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/\$ 60\.000 \/ u × 2 u/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sin validación física de taller/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Costo verificado")).not.toBeInTheDocument();
  });

  it("permite actualizar o revertir cuando la configuración cambia tras aplicar sugerencia", () => {
    const onApply = jest.fn();
    const onRevert = jest.fn();

    render(
      <PasoDosWizardPrecioMovil
        activePricingMode="margen"
        costInputScope="group_total"
        formattedPriceValue="$ 120.000"
        marginValue="100"
        costoIngresado={120000}
        cantidad={2}
        technicalCostSummary={{
          ...completeSummary,
          usableBaseCostGroupNet: 220000,
          markupAmountNet: 220000,
          suggestedNetTotal: 440000,
        }}
        hasAppliedTechnicalCostSuggestion={false}
        isAppliedTechnicalCostSuggestionOutdated
        onApplyTechnicalCostSuggestion={onApply}
        onRevertTechnicalCostSuggestion={onRevert}
        onCostInputScopeChange={jest.fn()}
        onMargenChange={jest.fn()}
        onPrecioChange={jest.fn()}
        onPricingModeChange={jest.fn()}
        priceHelp="Costo base"
        priceLabel="Costo base"
      />
    );

    expect(screen.getByText(/La configuración cambió: la sugerencia anterior quedó desactualizada/i)).toBeInTheDocument();
    expect(screen.getByText(/Equivalente por unidad/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Usar sugerencia \(\$ 440\.000\)/i }));
    expect(onApply).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Revertir" }));
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it("muestra cálculo provisional de vidrio con advertencia cuando las dimensiones son nominales sin confirmar", () => {
    render(
      <PasoDosWizardPrecioMovil
        activePricingMode="precio_directo"
        costInputScope="group_total"
        formattedPriceValue="$ 216.000"
        marginValue="100"
        costoIngresado={0}
        cantidad={1}
        technicalCostSummary={{
          ...partialSummary,
          profilesCostNet: 97221,
          glassCostNet: 39150,
          glassMeasurementStatus: "nominal_unconfirmed",
          glassCostIsProvisional: true,
          knownNetTotal: 136371,
          missingItems: [
            {
              itemKind: "accessory",
              identityKey: "accessory|carros",
              technicalCode: null,
              description: "Carros o rodamientos",
              reason: "Falta presentación de compra.",
            },
          ],
          nonVerifiedReasons: [
            "El vidrio usa geometría nominal con descuentos de corte pendientes de confirmar; su costo es provisional.",
          ],
          reason:
            "El vidrio usa geometría nominal con descuentos de corte pendientes de confirmar; su costo es provisional.",
        }}
        onCostInputScopeChange={jest.fn()}
        onMargenChange={jest.fn()}
        onPrecioChange={jest.fn()}
        onPricingModeChange={jest.fn()}
        priceHelp="Valor directo"
        priceLabel="Valor directo"
      />
    );

    expect(screen.getByText("Costo parcial")).toBeInTheDocument();
    expect(screen.queryByText("Costo verificado")).not.toBeInTheDocument();
    expect(screen.getByText("$ 39.150")).toBeInTheDocument();
    expect(
      screen.getByText(/Provisional: geometría nominal con descuentos de corte pendientes de confirmar/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/\$ 136\.371/)).toBeInTheDocument();
  });
});
