/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ rol: "admin" }),
}));

import { FabricationCutSettingsSection } from "./fabrication-cut-settings-section";

describe("FabricationCutSettingsSection", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("exige confirmación explícita y guarda parámetros en la API autenticada", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {
        organizationId: 8, perdidaCorteMm: 3, despunteInicialMm: 12,
        procedimiento: "por_pieza", confirmedAt: "2026-11-14T12:00:00Z", confirmedBy: "user-1",
      } }) });
    global.fetch = fetchMock as typeof fetch;

    render(<FabricationCutSettingsSection />);
    fireEvent.click(screen.getByRole("button", { name: /Parámetros de corte/i }));
    await screen.findByText(/Solo para corte de aluminio/i);
    fireEvent.change(screen.getByLabelText(/Pérdida por corte/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Despunte inicial/i), { target: { value: "12" } });
    expect(screen.getByRole("button", { name: "Guardar para mi taller" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    fireEvent.click(screen.getByRole("button", { name: "Guardar para mi taller" }));

    await screen.findByText("Parámetros guardados para el taller.");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/configuracion/fabricacion/parametros-corte", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza", confirmacionExplicita: true }),
    }));
  });

  it("no interpreta campos vacíos como cero confirmado", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) });
    global.fetch = fetchMock as typeof fetch;

    render(<FabricationCutSettingsSection />);
    fireEvent.click(screen.getByRole("button", { name: /Parámetros de corte/i }));
    await screen.findByText(/Solo para corte de aluminio/i);
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    fireEvent.click(screen.getByRole("button", { name: "Guardar para mi taller" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Ingresa ambos valores/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
