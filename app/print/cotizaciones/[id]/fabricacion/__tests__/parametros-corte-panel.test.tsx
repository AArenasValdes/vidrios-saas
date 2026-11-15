/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ rol: "admin", user: { id: "user-1" } }),
}));

import { ParametrosCortePanel } from "../parametros-corte-panel";

describe("ParametrosCortePanel", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("muestra el cálculo previo y solo persiste la pauta tras confirmación", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings: null }) }) as typeof fetch;
    const onPreviewThisJob = jest.fn().mockResolvedValue({ updated: 1, skipped: 1, bars: 5, cuts: 17, physicalPending: 1 });
    const onSaveJobPreview = jest.fn().mockResolvedValue(undefined);
    render(<ParametrosCortePanel eligibleItemCount={2} onPreviewThisJob={onPreviewThisJob} onSaveJobPreview={onSaveJobPreview} />);

    fireEvent.click(screen.getByRole("button", { name: "Configurar cortes" }));
    await screen.findByText(/Solo para perfiles de aluminio/i);
    fireEvent.change(screen.getByLabelText(/Pérdida por corte/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Despunte inicial/i), { target: { value: "12" } });
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    fireEvent.click(screen.getByRole("button", { name: "Previsualizar en este trabajo" }));

    await screen.findByText(/Vista previa: 1 componente, 5 barras y 17 cortes/i);
    expect(onSaveJobPreview).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith("/api/configuracion/fabricacion/parametros-corte", expect.objectContaining({ method: "PUT" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar y usar solo aquí" }));
    await waitFor(() => expect(onSaveJobPreview).toHaveBeenCalledTimes(1));
  });

  it("no interpreta valores vacíos como cero confirmado en ajustes del trabajo", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings: null }) }) as typeof fetch;
    const onPreviewThisJob = jest.fn();
    const onSaveJobPreview = jest.fn();
    render(<ParametrosCortePanel eligibleItemCount={1} onPreviewThisJob={onPreviewThisJob} onSaveJobPreview={onSaveJobPreview} />);

    fireEvent.click(screen.getByRole("button", { name: "Configurar cortes" }));
    await screen.findByText(/Solo para perfiles de aluminio/i);
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    fireEvent.click(screen.getByRole("button", { name: "Previsualizar en este trabajo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Ingresa ambos valores/i);
    expect(onPreviewThisJob).not.toHaveBeenCalled();
    expect(onSaveJobPreview).not.toHaveBeenCalled();
  });

  it("cierra tras guardar parámetros, conserva el resumen y no recalcula ni guarda snapshots del trabajo", async () => {
    let resolvePut!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    const pendingPut = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => { resolvePut = resolve; });
    const savedSettings = {
      organizationId: 8,
      perdidaCorteMm: 3,
      despunteInicialMm: 12,
      procedimiento: "por_pieza" as const,
      confirmedAt: "2026-11-14T12:00:00Z",
      confirmedBy: "user-1",
    };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) })
      .mockReturnValueOnce(pendingPut);
    global.fetch = fetchMock as typeof fetch;
    const onPreviewThisJob = jest.fn();
    const onSaveJobPreview = jest.fn();
    render(<ParametrosCortePanel eligibleItemCount={2} onPreviewThisJob={onPreviewThisJob} onSaveJobPreview={onSaveJobPreview} />);

    fireEvent.click(screen.getByRole("button", { name: "Configurar cortes" }));
    await screen.findByText(/Solo para perfiles de aluminio/i);
    fireEvent.change(screen.getByLabelText(/Pérdida por corte/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Despunte inicial/i), { target: { value: "12" } });
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    const saveButton = screen.getByRole("button", { name: "Guardar para mi taller" });
    fireEvent.click(saveButton);
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolvePut({ ok: true, json: async () => ({ settings: savedSettings }) });

    expect(await screen.findByText(/Parámetros guardados para el taller/)).toBeInTheDocument();
    expect(screen.getByText("3 mm de pérdida · 12 mm de despunte por tira")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/Pérdida por corte/i)).not.toBeInTheDocument();
    expect(onPreviewThisJob).not.toHaveBeenCalled();
    expect(onSaveJobPreview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Despunte inicial/i)).toHaveValue(12);
  });

  it("mantiene abierto el panel y conserva valores si falla el guardado", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "No se pudo guardar." }) }) as typeof fetch;
    render(<ParametrosCortePanel eligibleItemCount={1} onPreviewThisJob={jest.fn()} onSaveJobPreview={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Configurar cortes" }));
    await screen.findByText(/Solo para perfiles de aluminio/i);
    fireEvent.change(screen.getByLabelText(/Pérdida por corte/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Despunte inicial/i), { target: { value: "12" } });
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    fireEvent.click(screen.getByRole("button", { name: "Guardar para mi taller" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Pérdida por corte/i)).toHaveValue(3);
    expect(screen.getByLabelText(/Despunte inicial/i)).toHaveValue(12);
  });

  it("no vuelve a pedir confirmación ni escribe cuando los valores persistidos no cambiaron", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {
      organizationId: 8, perdidaCorteMm: 3, despunteInicialMm: 12,
      procedimiento: "por_pieza", confirmedAt: "2026-11-14T12:00:00Z", confirmedBy: "user-1",
    } }) });
    global.fetch = fetchMock as typeof fetch;
    render(<ParametrosCortePanel eligibleItemCount={1} onPreviewThisJob={jest.fn()} onSaveJobPreview={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Configurar cortes" }));
    await screen.findByText(/Solo para perfiles de aluminio/i);
    expect(screen.getByRole("button", { name: "Guardar para mi taller" })).toBeEnabled();
    expect(screen.getByLabelText(/Confirmo que estos valores/i)).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Guardar para mi taller" }));

    expect(await screen.findByText("Los parámetros ya estaban guardados.")).toBeInTheDocument();
    expect(screen.getByText("3 mm de pérdida · 12 mm de despunte por tira")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar" })).toHaveAttribute("aria-expanded", "false");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
