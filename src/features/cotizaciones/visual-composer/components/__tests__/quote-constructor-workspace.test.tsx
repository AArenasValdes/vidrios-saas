/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
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

function lineTemplate(): CotizacionLineTemplate {
  return {
    id: "linea-l5000",
    organizationId: "org-1",
    nombre: "L5000",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 100000,
    minimoCobrable: 0,
    redondeoPrecio: 0,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
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
    onOpenDespieceReview: jest.fn(),
    ...overrides,
  };
  render(<QuoteConstructorWorkspace {...props} />);
  return props;
}

describe("QuoteConstructorWorkspace", () => {
  it("muestra presets y varias piezas en el mismo cuaderno", () => {
    const props = renderWorkspace();
    expect(screen.getByLabelText("Más tipologías")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Puerta: elegir entre abatible y corredera")
    ).toBeInTheDocument();
    expect(screen.getByText(/Agregar pieza/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar otra pieza" })).toBeInTheDocument();
    expect(screen.getAllByText("VEN-01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VEN-02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VEN-03").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Corredera" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("corredera");

    fireEvent.click(screen.getByLabelText("Más tipologías"));
    fireEvent.click(screen.getByRole("button", { name: "Guillotina" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("guillotina");

    const doorTrigger = screen.getByLabelText(
      "Puerta: elegir entre abatible y corredera"
    );
    fireEvent.click(doorTrigger);
    const doorMenu = doorTrigger.closest("details");
    expect(doorMenu).not.toBeNull();
    fireEvent.click(
      within(doorMenu as HTMLDetailsElement).getByRole("button", {
        name: "Puerta corredera",
      })
    );
    expect(props.onAddPreset).toHaveBeenCalledWith("puerta_corredera");
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
      activeItemId: "b",
    });

    expect(screen.getAllByText("1/2 piezas listas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Falta precio").length).toBeGreaterThan(0);
    expect(screen.getByText(/Falta completar 1 dato/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Precio unitario" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Faltan precios en 1 pieza" })).toBeInTheDocument();
  });

  it("permite confirmar una pieza completa y pasar a la siguiente pendiente", () => {
    const onActiveItemChange = jest.fn();
    renderWorkspace({
      items: [
        item("a", "VEN-01"),
        { ...item("b", "VEN-02"), precioUnitario: 0, precioTotal: 0 },
      ],
      activeItemId: "a",
      onActiveItemChange,
    });

    expect(screen.getByText(/Lista para confirmar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pieza lista/i }));
    expect(onActiveItemChange).toHaveBeenCalledWith("b");
  });

  it("usa total global sin exponer precio por pieza", () => {
    const props = renderWorkspace({ quotePricingMode: "total_global", totalClienteManual: 450000 });
    expect(screen.queryByLabelText(/Precio unitario/)).not.toBeInTheDocument();
    const totalInput = screen.getByLabelText(/Total del presupuesto/);
    fireEvent.change(totalInput, { target: { value: "500000" } });
    fireEvent.blur(totalInput);
    expect(props.onGlobalTotalChange).toHaveBeenCalledWith("500000");
  });

  it("usa la linea base en piezas nuevas y la aplica a las ya creadas solo por accion explicita", () => {
    const props = renderWorkspace({
      lineTemplates: [lineTemplate()],
      defaultLineTemplateId: "linea-l5000",
    });

    fireEvent.click(screen.getByRole("button", { name: "Fijo" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("fijo", "linea-l5000");

    fireEvent.click(screen.getByRole("button", { name: "Aplicar a 3 piezas" }));
    expect(props.onUpdateItem).toHaveBeenCalledTimes(3);
    expect(props.onUpdateItem).toHaveBeenCalledWith("a", { lineTemplateId: "linea-l5000" });
    expect(props.onUpdateItem).toHaveBeenCalledWith("b", { lineTemplateId: "linea-l5000" });
    expect(props.onUpdateItem).toHaveBeenCalledWith("c", { lineTemplateId: "linea-l5000" });
  });

  it("abre el modal de composición al tocar el croquis de una pieza", () => {
    renderWorkspace({ items: [item("a", "VEN-01")], activeItemId: "a" });

    fireEvent.click(screen.getByRole("button", { name: "Abrir composición de VEN-01" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("evita acciones de revision duplicadas cuando esta dentro de Quote Studio", () => {
    renderWorkspace({ embeddedInQuoteStudio: true });

    expect(screen.queryByRole("button", { name: "Revisar despiece" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revisar cotizaci.n/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar al resumen" })).toBeInTheDocument();
  });

  it("no escribe medidas inválidas y bloquea el CTA hasta corregir", () => {
    const props = renderWorkspace({ items: [item("a", "VEN-01")] });
    const widthInput = screen.getAllByLabelText(/Ancho/)[0];

    fireEvent.change(widthInput, { target: { value: "150" } });
    fireEvent.blur(widthInput);

    expect(props.onUpdateItem).not.toHaveBeenCalled();
    expect(screen.getAllByText("Ancho mínimo 200 mm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Faltan medidas").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Revisar pendientes|Faltan/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revisar cotización" })
    ).not.toBeInTheDocument();

    fireEvent.change(widthInput, { target: { value: "1500" } });
    fireEvent.blur(widthInput);

    expect(props.onUpdateItem).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({
        ancho: "1500",
        guidedVisualConfig: expect.objectContaining({ widthMm: 1500 }),
      })
    );
    expect(screen.queryByText("Ancho mínimo 200 mm")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar cotización" })).toBeInTheDocument();
  });

  it("no escribe cantidad inválida y conserva el draft al cambiar de pieza", () => {
    const onActiveItemChange = jest.fn();
    const props = renderWorkspace({
      items: [item("a", "VEN-01"), item("b", "VEN-02")],
      onActiveItemChange,
    });

    const quantityInputs = screen.getAllByLabelText(/Cantidad/);
    fireEvent.change(quantityInputs[0], { target: { value: "0" } });
    fireEvent.blur(quantityInputs[0]);

    expect(props.onUpdateItem).not.toHaveBeenCalled();
    expect(screen.getAllByText("Cantidad inválida").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText("VEN-02")[0]);
    expect(onActiveItemChange).toHaveBeenCalledWith("b");

    const quantityAfterSwitch = screen.getAllByLabelText(/Cantidad/)[0] as HTMLInputElement;
    expect(quantityAfterSwitch.value).toBe("0");
    expect(screen.getAllByText("Cantidad inválida").length).toBeGreaterThan(0);
  });
});
