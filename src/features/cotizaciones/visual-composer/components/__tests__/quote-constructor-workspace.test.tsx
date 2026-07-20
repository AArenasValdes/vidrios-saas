/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { QuoteConstructorWorkspace } from "../quote-constructor-workspace";

function item(id: string, code: string): CotizacionWorkflowItem {
  return {
    id,
    codigo: code,
    tipo: "Ventana",
    lineaComercial: "",
    vidrio: "Incoloro 5mm",
    nombre: `Ventana ${code}`,
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 100000,
    costoProveedorTotal: 100000,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#111827",
      material: "Aluminio",
      guidedVisualConfig: createQuoteConstructorPresetConfig("fijo"),
    }),
  };
}

function renderWorkspace(overrides: Partial<ComponentProps<typeof QuoteConstructorWorkspace>> = {}) {
  const props: ComponentProps<typeof QuoteConstructorWorkspace> = {
    items: [item("a", "VEN-01"), item("b", "VEN-02"), item("c", "VEN-03")],
    quotePricingMode: "por_item",
    lineTemplates: [],
    glassOptions: ["Incoloro 5mm"],
    activeItemId: "a",
    totalClienteManual: null,
    formatCurrencyInput: (value) => value,
    onActiveItemChange: jest.fn(),
    onAddPreset: jest.fn(),
    onUpdateItem: jest.fn(),
    onDuplicateItem: jest.fn(),
    onRemoveItem: jest.fn(),
    onMoveItem: jest.fn(),
    onEditAdvanced: jest.fn(),
    onRecalculateTemplatePrice: jest.fn(),
    onGlobalTotalChange: jest.fn(),
    onGoToSummary: jest.fn(),
    ...overrides,
  };
  render(<QuoteConstructorWorkspace {...props} />);
  return props;
}

describe("QuoteConstructorWorkspace", () => {
  it("muestra presets y varias piezas en el mismo cuaderno", () => {
    const props = renderWorkspace();
    expect(screen.getByRole("button", { name: "Oscilobatiente" })).toBeInTheDocument();
    expect(screen.getAllByText("VEN-01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VEN-02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VEN-03").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Corredera" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("corredera");
  });

  it("confirma medidas inline y expone acciones de orden", () => {
    const props = renderWorkspace();
    const widthInputs = screen.getAllByLabelText(/Ancho/);
    fireEvent.change(widthInputs[0], { target: { value: "1500" } });
    fireEvent.blur(widthInputs[0]);
    expect(props.onUpdateItem).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({ ancho: "1500" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Acciones de VEN-01" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover pieza a la derecha" }));
    expect(props.onMoveItem).toHaveBeenCalledWith("a", 1);
  });

  it("usa la misma barra de colores del modo presupuesto", () => {
    const props = renderWorkspace();

    expect(screen.getByRole("group", { name: "Colores del perfil" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Negro" }));

    expect(props.onUpdateItem).toHaveBeenCalledWith("a", { colorHex: "#2a2a2a" });
  });

  it("muestra progreso real y estados específicos", () => {
    renderWorkspace({
      items: [
        item("a", "VEN-01"),
        { ...item("b", "VEN-02"), precioUnitario: 0, precioTotal: 0 },
      ],
    });

    expect(screen.getAllByText("1 de 2 completas").length).toBeGreaterThan(0);
    expect(screen.getByText("Falta precio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Faltan precios en 1 pieza" })).toBeInTheDocument();
  });

  it("usa total global sin exponer precio por pieza", () => {
    const props = renderWorkspace({ quotePricingMode: "total_global", totalClienteManual: 450000 });
    expect(screen.queryByLabelText(/Precio unitario/)).not.toBeInTheDocument();
    const totalInput = screen.getByLabelText(/Total del presupuesto/);
    fireEvent.change(totalInput, { target: { value: "500000" } });
    fireEvent.blur(totalInput);
    expect(props.onGlobalTotalChange).toHaveBeenCalledWith("500000");
  });
});
