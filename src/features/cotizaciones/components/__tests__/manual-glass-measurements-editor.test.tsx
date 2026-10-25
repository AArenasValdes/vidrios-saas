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

    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "750" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1600" } });
    fireEvent.change(screen.getByLabelText("Cantidad física"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      version: 1,
      entries: [expect.objectContaining({
        source: "manual", version: 1, productId: "501", widthMm: 750, heightMm: 1600, quantity: 2,
      })],
    }));
  });

  it("rechaza una ficha de vidrio sin datos técnicos suficientes", () => {
    const onChange = jest.fn();
    const incomplete = { ...glassTemplate, catalogMetadata: { espesor: "5 mm" } } as CotizacionLineTemplate;
    render(<ManualGlassMeasurementsEditor templates={[incomplete]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "750" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1600" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/espesor, categoría, formato de plancha/i);
    expect(onChange).not.toHaveBeenCalled();
  });
});
