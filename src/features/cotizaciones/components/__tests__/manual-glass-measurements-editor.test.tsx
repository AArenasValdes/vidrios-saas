/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { ManualGlassMeasurementsEditor } from "../manual-glass-measurements-editor";

const glassTemplate = {
  id: 501,
  nombre: "Float incoloro 5 mm",
  categoria: "vidrio",
  material: "Cristal",
  catalogMetadata: {
    espesor: "5 mm",
    categoriaTecnica: "monolitico",
    revisionTecnicaExplicita: true,
    corteManualEstado: "confirmed",
    planchaAnchoMm: 2500,
    planchaAltoMm: 1800,
  },
  isActive: true,
  eliminadoEn: null,
} as unknown as CotizacionLineTemplate;

describe("ManualGlassMeasurementsEditor", () => {
  it("guarda varias unidades de una referencia del catálogo y comunica sus dimensiones finales", () => {
    const onChange = jest.fn();
    render(<ManualGlassMeasurementsEditor templates={[glassTemplate]} paneConfiguration={{ componentType: "Corredera", sheetScheme: "2 hojas" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    fireEvent.change(screen.getByLabelText("Posición del paño"), { target: { value: "pane-1" } });
    expect(screen.getByLabelText("Producto del catálogo")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "750" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1600" } });
    fireEvent.change(screen.getByLabelText("Cantidad por componente"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      version: 2,
      entries: [expect.objectContaining({
        source: "manual", version: 2, productId: "501", widthMm: 750, heightMm: 1600, quantity: 2, quantityBasis: "per_component",
      })],
    }));
  });

  it("solicita la cantidad de paños desconocida y guarda posiciones explícitas", () => {
    const onChange = jest.fn();
    const view = render(<ManualGlassMeasurementsEditor templates={[glassTemplate]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Cantidad de paños del componente"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear posiciones de paño" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ manualPaneCount: 3, expectedPaneCount: 3 }));

    view.rerender(<ManualGlassMeasurementsEditor templates={[glassTemplate]} value={{ version: 2, entries: [], manualPaneCount: 3 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    expect(screen.getByLabelText("Posición del paño")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3 paños identificados");
  });

  it("muestra geometría congelada del snapshot con el estado de la receta", () => {
    render(<ManualGlassMeasurementsEditor
      templates={[glassTemplate]}
      automaticPanes={[{ id: "recipe-glass-1", name: "Hoja izquierda", widthMm: 640, heightMm: 1200, quantity: 2 }]}
      automaticRecipeStatus="lista_para_validar"
      onChange={jest.fn()}
    />);

    expect(screen.getByText("Medidas guardadas en el snapshot")).toBeInTheDocument();
    expect(screen.getByText("640 × 1200 mm · 2 unidades físicas")).toBeInTheDocument();
    expect(screen.getByText("Receta: lista_para_validar")).toBeInTheDocument();
  });

  it("conserva la cantidad física total al editar una referencia v1 histórica", () => {
    const onChange = jest.fn();
    const legacy = {
      version: 1 as const,
      entries: [{
        id: "legacy-pane",
        source: "manual" as const,
        version: 1 as const,
        productId: "501",
        technicalFingerprint: "legacy-fingerprint",
        widthMm: 750,
        heightMm: 1600,
        quantity: 2,
        recordedAt: "2026-10-25T12:00:00.000Z",
      }],
    };
    render(<ManualGlassMeasurementsEditor templates={[glassTemplate]} value={legacy} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar medidas de Float incoloro 5 mm" }));
    expect(screen.getByLabelText("Cantidad física total")).toHaveValue("2");
    fireEvent.click(screen.getByRole("button", { name: "Guardar medidas" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      entries: [expect.objectContaining({ id: "legacy-pane", quantity: 2, quantityBasis: "total" })],
    }));
  });

  it("guarda medidas finales aunque falte el formato de plancha para configurar después", () => {
    const onChange = jest.fn();
    const incomplete = { ...glassTemplate, catalogMetadata: { espesor: "5 mm" } } as CotizacionLineTemplate;
    render(<ManualGlassMeasurementsEditor templates={[incomplete]} paneConfiguration={{ componentType: "Paño fijo" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    fireEvent.change(screen.getByLabelText("Posición del paño"), { target: { value: "pane-1" } });
    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "750" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1600" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      entries: [expect.objectContaining({ widthMm: 750, heightMm: 1600, paneSlotId: "pane-1" })],
    }));
  });

  it("muestra las medidas automáticas sin alerta y conserva el vidrio seleccionado al abrir el respaldo manual", () => {
    const onChange = jest.fn();
    render(
      <ManualGlassMeasurementsEditor
        templates={[glassTemplate]}
        selectedGlassProductId="501"
        automaticDimensionsAvailable
        paneConfiguration={{ componentType: "Paño fijo" }}
        onChange={onChange}
      />
    );

    expect(screen.getByText("Medidas automáticas disponibles")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar medidas manuales" }));
    expect(screen.getByLabelText("Producto del catálogo")).toHaveValue("501");
  });

  it("deja continuar con el vidrio pendiente y ofrece ingreso opcional", () => {
    render(<ManualGlassMeasurementsEditor templates={[glassTemplate]} onChange={jest.fn()} />);

    expect(screen.getByText("Medidas de vidrio pendientes")).toBeInTheDocument();
    expect(screen.getByLabelText("Cantidad de paños del componente")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ancho final (mm)")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("abre el mismo editor al llegar desde la acción de corrección del componente", async () => {
    const previousUrl = window.location.href;
    window.history.replaceState({}, "", "/cotizaciones/nueva?edit=quote-1&step=2&itemId=item-2&focus=glass");
    try {
      render(
        <ManualGlassMeasurementsEditor
          templates={[glassTemplate]}
          selectedGlassProductId="501"
          componentId="item-2"
          paneConfiguration={{ componentType: "Paño fijo" }}
          onChange={jest.fn()}
        />
      );

      expect(await screen.findByLabelText("Producto del catálogo")).toHaveValue("501");
      expect(screen.getByLabelText("Ancho final (mm)")).toBeInTheDocument();
      expect(screen.getByText(/Selecciona un paño y un vidrio, ingresa ancho, alto y cantidad/)).toBeInTheDocument();
    } finally {
      window.history.replaceState({}, "", new URL(previousUrl).pathname + new URL(previousUrl).search);
    }
  });

  it("vuelve a abrir el formulario cuando el enlace cambia al vidrio de otro componente", async () => {
    const previousUrl = window.location.href;
    window.history.replaceState({}, "", "/cotizaciones/nueva?edit=quote-1&step=2&itemId=item-1&focus=glass");
    try {
      const view = render(
        <ManualGlassMeasurementsEditor templates={[glassTemplate]} selectedGlassProductId="501" componentId="item-2" paneConfiguration={{ componentType: "Paño fijo" }} onChange={jest.fn()} />
      );

      expect(screen.queryByLabelText("Producto del catálogo")).not.toBeInTheDocument();

      window.history.replaceState({}, "", "/cotizaciones/nueva?edit=quote-1&step=2&itemId=item-2&focus=glass");
      view.rerender(
        <ManualGlassMeasurementsEditor templates={[glassTemplate]} selectedGlassProductId="501" componentId="item-2" paneConfiguration={{ componentType: "Paño fijo" }} onChange={jest.fn()} />
      );

      expect(await screen.findByLabelText("Producto del catálogo")).toHaveValue("501");
      expect(screen.getByLabelText("Ancho final (mm)")).toBeInTheDocument();
    } finally {
      window.history.replaceState({}, "", new URL(previousUrl).pathname + new URL(previousUrl).search);
    }
  });

  it("no abre el editor de otro componente al usar un enlace dirigido", async () => {
    const previousUrl = window.location.href;
    window.history.replaceState({}, "", "/cotizaciones/nueva?edit=quote-1&step=2&itemId=item-2&focus=glass");
    try {
      render(
        <ManualGlassMeasurementsEditor
          templates={[glassTemplate]}
          componentId="item-1"
          paneConfiguration={{ componentType: "Paño fijo" }}
          onChange={jest.fn()}
        />
      );

      expect(screen.queryByLabelText("Ancho final (mm)")).not.toBeInTheDocument();
    } finally {
      window.history.replaceState({}, "", new URL(previousUrl).pathname + new URL(previousUrl).search);
    }
  });
});
