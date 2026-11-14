/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ rol: "admin", user: { id: "user-1" } }),
}));

import { ParametrosCortePanel } from "./parametros-corte-panel";

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
});
