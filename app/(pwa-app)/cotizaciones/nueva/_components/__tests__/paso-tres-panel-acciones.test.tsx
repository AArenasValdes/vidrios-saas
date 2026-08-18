/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

import { PasoTresPanelAcciones } from "../paso-tres-panel-acciones";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

const savedDraft: CotizacionWorkflowRecord = {
  id: "quote-1",
  codigo: "COT-001",
  clienteNombre: "Cliente prueba",
  clienteTelefono: "",
  obra: "Trabajo prueba",
  direccion: "",
  validez: "15 dias",
  descuentoPct: 0,
  descuentoValor: 0,
  observaciones: "",
  estado: "borrador",
  approvalToken: null,
  approvalTokenExpiresAt: null,
  clienteVioEn: null,
  clienteRespondioEn: null,
  clienteRespuestaCanal: null,
  pdfDescargadoEn: null,
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
  items: [],
  subtotal: 0,
  neto: 0,
  iva: 0,
  flete: 0,
  total: 0,
};

function renderPanel(overrides: Partial<ComponentProps<typeof PasoTresPanelAcciones>> = {}) {
  return render(
    <PasoTresPanelAcciones
      savedRecord={savedDraft}
      lastSaveMode="borrador"
      total="$0"
      globalError={null}
      isMobileViewport
      isSaving={false}
      saveIntent={null}
      hasUnsavedDraftChanges={false}
      onGoToStepTwo={jest.fn()}
      onSaveQuote={jest.fn()}
      onSaveDraft={jest.fn()}
      {...overrides}
    />
  );
}

describe("PasoTresPanelAcciones", () => {
  it("no muestra acciones de PDF ni onboarding cuando se guarda como borrador en mobile", () => {
    renderPanel();

    expect(screen.getByText("Borrador guardado")).toBeInTheDocument();
    expect(screen.getByText("Puedes continuar ahora o salir y retomarlo después.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Crear cotizaci/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Salir y continuar después" })).toHaveAttribute(
      "href",
      "/cotizaciones"
    );
    expect(screen.queryByText("Agregar mis datos de empresa")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver PDF profesional")).not.toBeInTheDocument();
  });

  it("muestra cambios sin guardar y no permite crear PDF directo si el borrador guardado cambio", () => {
    renderPanel({ hasUnsavedDraftChanges: true });

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar cambios/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Crear cotizaci/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Ver PDF profesional")).not.toBeInTheDocument();
  });

  it("despues de guardar ofrece el PDF comercial y el despiece interno", () => {
    renderPanel({
      savedRecord: { ...savedDraft, estado: "creada" },
      lastSaveMode: "creada",
      isMobileViewport: false,
    });

    expect(screen.getByRole("link", { name: /Ver PDF profesional/i })).toHaveAttribute(
      "href",
      "/print/cotizaciones/quote-1"
    );
    expect(screen.getByRole("link", { name: /Despiece y pauta/i })).toHaveAttribute(
      "href",
      "/print/cotizaciones/quote-1/fabricacion"
    );
  });

  it("no muestra despiece en el paso 3 antes de guardar la cotizacion", () => {
    renderPanel({
      savedRecord: null,
      lastSaveMode: null,
      isMobileViewport: false,
    });

    expect(screen.getByRole("button", { name: /Abrir y guardar presupuesto/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Despiece y pauta/i })).not.toBeInTheDocument();
  });
});
