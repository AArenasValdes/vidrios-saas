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
    render(<ManualGlassMeasurementsEditor templates={[glassTemplate]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
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

  it("rechaza una ficha de vidrio sin datos técnicos suficientes", () => {
    const onChange = jest.fn();
    const incomplete = { ...glassTemplate, catalogMetadata: { espesor: "5 mm" } } as CotizacionLineTemplate;
    render(<ManualGlassMeasurementsEditor templates={[incomplete]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "750" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1600" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/espesor, categoría, formato de plancha/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("muestra las medidas automáticas sin alerta y conserva el vidrio seleccionado al abrir el respaldo manual", () => {
    const onChange = jest.fn();
    render(
      <ManualGlassMeasurementsEditor
        templates={[glassTemplate]}
        selectedGlassProductId="501"
        automaticDimensionsAvailable
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
    expect(screen.getByRole("button", { name: "Ingresar medidas" })).toBeInTheDocument();
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
        <ManualGlassMeasurementsEditor templates={[glassTemplate]} selectedGlassProductId="501" componentId="item-2" onChange={jest.fn()} />
      );

      expect(screen.queryByLabelText("Producto del catálogo")).not.toBeInTheDocument();

      window.history.replaceState({}, "", "/cotizaciones/nueva?edit=quote-1&step=2&itemId=item-2&focus=glass");
      view.rerender(
        <ManualGlassMeasurementsEditor templates={[glassTemplate]} selectedGlassProductId="501" componentId="item-2" onChange={jest.fn()} />
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
          onChange={jest.fn()}
        />
      );

      expect(screen.queryByLabelText("Ancho final (mm)")).not.toBeInTheDocument();
    } finally {
      window.history.replaceState({}, "", new URL(previousUrl).pathname + new URL(previousUrl).search);
    }
  });
});
