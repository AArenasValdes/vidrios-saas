/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { QuoteConstructorWorkspace } from "../quote-constructor-workspace";

jest.mock("@/features/cotizaciones/visual-composer/components/guided-visual-composer", () => ({
  GuidedVisualComposer: ({ open }: { open?: boolean }) =>
    open ? <div role="dialog">Composición guiada</div> : null,
}));

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => ({
    organizationId: null,
    recipes: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
  }),
}));

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

function lineTemplate(
  overrides: Partial<CotizacionLineTemplate> = {}
): CotizacionLineTemplate {
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
    ...overrides,
  };
}

function itemWithLine(
  id: string,
  code: string,
  template: CotizacionLineTemplate
): CotizacionWorkflowItem {
  return {
    ...item(id, code),
    lineaComercial: template.nombre,
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#111827",
      material: template.material,
      lineTemplateId: String(template.id),
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

  it("no expone selector global ni aplicar línea a varias piezas", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        item("c", "VEN-03"),
      ],
      lineTemplates: [l5000, serie20],
      activeItemId: "a",
      embeddedInQuoteStudio: true,
    });

    expect(screen.queryByLabelText("Línea para nuevas piezas")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aplicar a \d+ piezas?/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar despiece" })).toBeInTheDocument();
    expect(screen.getByLabelText("Línea de VEN-01")).toBeInTheDocument();
    expect(screen.getByText("L5000 · Aluminio")).toBeInTheDocument();
    expect(screen.getByText("Serie 20 · PVC")).toBeInTheDocument();
    expect(screen.getByLabelText("Elegir línea de VEN-03")).toBeInTheDocument();
    expect(screen.queryByText("Sin línea")).not.toBeInTheDocument();
  });

  it("sugiere en la pieza nueva la línea de la pieza activa, sin tocar las anteriores", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    const l25 = lineTemplate({
      id: "linea-l25",
      nombre: "L25",
    });
    const props = renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        itemWithLine("c", "VEN-03", l25),
      ],
      lineTemplates: [l5000, serie20, l25],
      activeItemId: "b",
    });

    fireEvent.click(screen.getByRole("button", { name: "Fijo" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("fijo", "linea-serie20");
    expect(props.onUpdateItem).not.toHaveBeenCalled();
  });

  it("al cambiar la línea de la pieza activa no actualiza las demás", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    const l25 = lineTemplate({
      id: "linea-l25",
      nombre: "L25",
    });
    const props = renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        itemWithLine("c", "VEN-03", l25),
      ],
      lineTemplates: [l5000, serie20, l25],
      activeItemId: "b",
    });

    fireEvent.click(screen.getByLabelText("Línea de VEN-02"));
    fireEvent.click(screen.getByRole("option", { name: /L25/i }));

    expect(props.onUpdateItem).toHaveBeenCalledTimes(1);
    expect(props.onUpdateItem).toHaveBeenCalledWith("b", { lineTemplateId: "linea-l25" });
    expect(props.onUpdateItem).not.toHaveBeenCalledWith(
      "a",
      expect.anything()
    );
    expect(props.onUpdateItem).not.toHaveBeenCalledWith(
      "c",
      expect.anything()
    );
  });

  it("cambia la línea desde la card de esa pieza y no toca las demás", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    const l25 = lineTemplate({
      id: "linea-l25",
      nombre: "L25",
    });
    const onActiveItemChange = jest.fn();
    const props = renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        itemWithLine("c", "VEN-03", l25),
      ],
      lineTemplates: [l5000, serie20, l25],
      activeItemId: "a",
      onActiveItemChange,
    });

    fireEvent.click(screen.getByLabelText("Cambiar línea de VEN-02"));
    expect(onActiveItemChange).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByRole("option", { name: /L25/i }));

    expect(props.onUpdateItem).toHaveBeenCalledTimes(1);
    expect(props.onUpdateItem).toHaveBeenCalledWith("b", { lineTemplateId: "linea-l25" });
    expect(props.onUpdateItem).not.toHaveBeenCalledWith("a", expect.anything());
    expect(props.onUpdateItem).not.toHaveBeenCalledWith("c", expect.anything());
  });

  it("abre el selector existente desde + Elegir línea en una pieza sin asignar", () => {
    const l5000 = lineTemplate();
    const props = renderWorkspace({
      items: [item("a", "VEN-01"), itemWithLine("b", "VEN-02", l5000)],
      lineTemplates: [l5000],
      activeItemId: "b",
    });

    fireEvent.click(screen.getByLabelText("Elegir línea de VEN-01"));
    fireEvent.click(screen.getByRole("option", { name: /L5000/i }));

    expect(props.onUpdateItem).toHaveBeenCalledTimes(1);
    expect(props.onUpdateItem).toHaveBeenCalledWith("a", { lineTemplateId: "linea-l5000" });
    expect(props.onUpdateItem).not.toHaveBeenCalledWith("b", expect.anything());
  });

  it("abre el modal de composición al tocar el croquis de una pieza", () => {
    renderWorkspace({ items: [item("a", "VEN-01")], activeItemId: "a" });

    fireEvent.click(screen.getByRole("button", { name: "Abrir composición de VEN-01" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("en Quote Studio mueve Revisar despiece al header de piezas y deja un solo CTA de avance", () => {
    renderWorkspace({
      embeddedInQuoteStudio: true,
      inspectorRailSlot: (
        <button type="button">Continuar al resumen</button>
      ),
    });

    expect(screen.getByRole("button", { name: "Revisar despiece" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revisar cotizaci.n/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Abrir configuraci.n guiada/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Continuar al resumen" })).toHaveLength(1);
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
