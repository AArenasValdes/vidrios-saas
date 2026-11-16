/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ rol: "admin" }),
}));

import { FabricationCutSettingsSection } from "../../../../../(pwa-app)/configuracion/empresa/fabrication-cut-settings-section";

describe("FabricationCutSettingsSection", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("exige confirmación explícita y guarda parámetros en la API autenticada", async () => {
    let resolvePut!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    const pendingPut = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => { resolvePut = resolve; });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) })
      .mockReturnValueOnce(pendingPut);
    const savedSettings = {
        organizationId: 8, perdidaCorteMm: 3, despunteInicialMm: 12,
        procedimiento: "por_pieza", confirmedAt: "2026-11-14T12:00:00Z", confirmedBy: "user-1",
      };
    global.fetch = fetchMock as typeof fetch;

    render(<FabricationCutSettingsSection />);
    fireEvent.click(screen.getByRole("button", { name: /Parámetros de corte/i }));
    await screen.findByText(/Solo para corte de aluminio/i);
    fireEvent.change(screen.getByLabelText(/Pérdida por corte/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Despunte inicial/i), { target: { value: "12" } });
    expect(screen.getByRole("button", { name: "Guardar para mi taller" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    const saveButton = screen.getByRole("button", { name: "Guardar para mi taller" });
    fireEvent.click(saveButton);
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/configuracion/fabricacion/parametros-corte", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza", confirmacionExplicita: true }),
    }));
    resolvePut({ ok: true, json: async () => ({ settings: savedSettings }) });
    await screen.findByText("Parámetros guardados para el taller.");
    const trigger = screen.getByRole("button", { name: /Parámetros de corte/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("3 mm de pérdida · 12 mm de despunte por tira");
    expect(screen.queryByLabelText(/Pérdida por corte/i)).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Pérdida por corte/i)).toHaveValue(3);
  });

  it("mantiene abierto el panel y conserva valores si falla el guardado", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "No se pudo guardar." }) });
    global.fetch = fetchMock as typeof fetch;
    render(<FabricationCutSettingsSection />);

    fireEvent.click(screen.getByRole("button", { name: /Parámetros de corte/i }));
    await screen.findByText(/Solo para corte de aluminio/i);
    fireEvent.change(screen.getByLabelText(/Pérdida por corte/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Despunte inicial/i), { target: { value: "12" } });
    fireEvent.click(screen.getByLabelText(/Confirmo que estos valores/i));
    fireEvent.click(screen.getByRole("button", { name: "Guardar para mi taller" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
    expect(screen.getByRole("button", { name: /Parámetros de corte/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Pérdida por corte/i)).toHaveValue(3);
    expect(screen.getByLabelText(/Despunte inicial/i)).toHaveValue(12);
  });

  it("no pide reconfirmación ni hace otra escritura si los valores persistidos no cambiaron", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {
      organizationId: 8, perdidaCorteMm: 3, despunteInicialMm: 12,
      procedimiento: "por_pieza", confirmedAt: "2026-11-14T12:00:00Z", confirmedBy: "user-1",
    } }) });
    global.fetch = fetchMock as typeof fetch;
    render(<FabricationCutSettingsSection />);

    fireEvent.click(screen.getByRole("button", { name: /Parámetros de corte/i }));
    await screen.findByText(/Solo para corte de aluminio/i);
    const saveButton = screen.getByRole("button", { name: "Guardar para mi taller" });
    expect(saveButton).toBeEnabled();
    expect(screen.getByLabelText(/Confirmo que estos valores/i)).not.toBeChecked();
    fireEvent.click(saveButton);

    expect(await screen.findByText("Los parámetros ya estaban guardados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Parámetros de corte/i })).toHaveAttribute("aria-expanded", "false");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
