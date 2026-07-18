/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { ResumenDesktopLateral } from "../resumen-desktop-lateral";
import { createQuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

function buildDraft(overrides: Record<string, unknown> = {}) {
  return {
    clienteNombre: "",
    clienteTelefono: "",
    obra: "",
    direccion: "",
    validez: "15 dias",
    descuentoPct: 0,
    descuentoTipo: "porcentaje" as const,
    descuentoMonto: 0,
    flete: 0,
    observaciones: "",
    items: [],
    quotePricingMode: "por_item" as const,
    quoteStudioFinancial: createQuoteStudioFinancialDraft(),
    ...overrides,
  };
}

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    draft: buildDraft(),
    totalItems: 0,
    subtotal: "$0",
    iva: "$0",
    redondeoComercial: "$0",
    hasRedondeoComercial: false,
    total: "$0",
    mostrarIva: true,
    quotePricingMode: "por_item" as const,
    selectedClientMode: "Nuevo" as const,
    isSaving: false,
    onSaveDraft: jest.fn(),
    onSaveQuote: jest.fn(),
    onContinue: jest.fn(),
    ...overrides,
  };
}

describe("ResumenDesktopLateral", () => {
  it("permite continuar y guardar borrador sin cliente ni obra", () => {
    const onContinue = jest.fn();
    const onSaveDraft = jest.fn();

    render(
      <ResumenDesktopLateral
        {...buildProps({
          draft: buildDraft({ clienteNombre: "", obra: "" }),
          onContinue,
          onSaveDraft,
        })}
      />
    );

    expect(screen.getByText("Cotización rápida")).toBeInTheDocument();
    expect(screen.getByText("Se completa al continuar")).toBeInTheDocument();
    expect(
      screen.getByText(/Puedes cotizar sin cliente/i)
    ).toBeInTheDocument();

    const continueButton = screen.getByRole("button", {
      name: /Continuar al presupuesto/i,
    });
    const draftButton = screen.getByRole("button", { name: /Guardar borrador/i });

    expect(continueButton).toBeEnabled();
    expect(draftButton).toBeEnabled();

    fireEvent.click(continueButton);
    fireEvent.click(draftButton);

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
  });

  it("muestra cliente y obra cuando ya estan definidos", () => {
    render(
      <ResumenDesktopLateral
        {...buildProps({
          draft: buildDraft({ clienteNombre: "Ana Soto", obra: "Terraza" }),
        })}
      />
    );

    expect(screen.getByText("Ana Soto")).toBeInTheDocument();
    expect(screen.getByText("Terraza")).toBeInTheDocument();
    expect(screen.queryByText(/Puedes cotizar sin cliente/i)).not.toBeInTheDocument();
  });
});
