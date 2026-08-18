/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

import { CotizacionDetalleDesktopView } from "../cotizacion-detalle-desktop-view";
import { buildCotizacionDetalleMobileViewModel } from "../cotizacion-detalle-mobile-view-model";

function createRecord(): CotizacionWorkflowRecord {
  return {
    id: "q1",
    codigo: "COT-180826-001",
    clienteNombre: "Taller Demo",
    clienteTelefono: "+56 9 1111 1111",
    obra: "Obra 1",
    direccion: "Calle 1",
    validez: "15 dias",
    descuentoPct: 0,
    observaciones: "",
    estado: "creada",
    approvalToken: null,
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
    pdfDescargadoEn: null,
    createdAt: "2026-08-18T12:00:00.000Z",
    updatedAt: "2026-08-18T12:00:00.000Z",
    subtotal: 100000,
    descuentoValor: 0,
    neto: 100000,
    iva: 19000,
    flete: 0,
    total: 119000,
    items: [],
  };
}

describe("CotizacionDetalleDesktopView", () => {
  it("expone Despiece y pauta hacia la vista interna de fabricación", () => {
    render(
      <CotizacionDetalleDesktopView
        model={buildCotizacionDetalleMobileViewModel(createRecord())}
        isHydratingItems={false}
        isPreparingPdf={false}
        isSaving={false}
        isUpdatingResponse={false}
        whatsappDisabled={false}
        updatedLabel="hoy"
        editHref="/cotizaciones/nueva?edit=q1"
        editComponentsHref="/cotizaciones/nueva?edit=q1&step=2"
        fabricacionHref="/print/cotizaciones/q1/fabricacion"
        copyFeedback={null}
        onDelete={jest.fn()}
        onCopyApprovalLink={jest.fn()}
        onManualResponseChange={jest.fn()}
        onOpenPdf={jest.fn()}
        onOpenWhatsappShare={jest.fn()}
      />
    );

    const action = screen.getByRole("link", { name: /Despiece y pauta/i });
    expect(action).toHaveAttribute("href", "/print/cotizaciones/q1/fabricacion");
    expect(screen.queryByRole("link", { name: /Resumen fabricaci.n/i })).not.toBeInTheDocument();
  });
});
