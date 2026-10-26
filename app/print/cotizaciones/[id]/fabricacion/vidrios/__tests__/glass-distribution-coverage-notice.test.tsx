/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { GlassDistributionCoverageNotice } from "../glass-distribution-coverage-notice";

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

const item = {
  id: "item-1",
  codigo: "V1",
  nombre: "Corredera 3 hojas",
  tipo: "Ventana corredera",
  vidrio: "Float incoloro 5 mm",
  cantidad: 1,
  observaciones: encodeCotizacionItemPresentationMeta({ sheetScheme: "3 hojas", vidrioLineTemplateId: "501" }),
  manualGlassMeasurements: { version: 2, entries: [] },
} as unknown as CotizacionWorkflowItem;

const coverage = {
  status: "unavailable" as const,
  completeReferenceCount: 0,
  pendingReferenceCount: 3,
  pendingReferences: [1, 2, 3].map(() => ({
    quoteItemId: "item-1",
    componentCode: "V1",
    componentName: "Corredera 3 hojas",
    displayName: null,
    reason: "Falta registrar uno o más paños.",
  })),
  diagnostics: [],
};

describe("GlassDistributionCoverageNotice", () => {
  it("abre el editor en la misma pantalla, agrupa paños por componente y guarda las medidas", async () => {
    const onSaveMeasurements = jest.fn().mockResolvedValue(undefined);
    render(
      <GlassDistributionCoverageNotice
        quoteId="quote-1"
        coverage={coverage}
        items={[item]}
        templates={[glassTemplate]}
        onSaveMeasurements={onSaveMeasurements}
      />
    );

    expect(screen.getByText("3 paños pendientes")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ingresar medidas" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Ingresar medidas" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    await screen.findByLabelText("Posición del paño");
    fireEvent.change(screen.getByLabelText("Posición del paño"), { target: { value: "pane-1" } });
    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar medidas" }));

    await waitFor(() => expect(onSaveMeasurements).toHaveBeenCalledWith("item-1", expect.objectContaining({
      version: 2,
      entries: [expect.objectContaining({ productId: "501", widthMm: 600, heightMm: 1000 })],
    })));
    expect(await screen.findByRole("status")).toHaveTextContent("Medidas guardadas");
  });
});
