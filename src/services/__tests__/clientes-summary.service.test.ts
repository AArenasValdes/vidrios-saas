import { getClientesResumenByOrganizationId } from "../../features/clientes/services/clientes-summary.service";

describe("clientes-summary.service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("debe pedir el resumen de clientes al endpoint unico", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        clientes: [
          {
            id: "cliente-1",
            nombre: "Cliente Uno",
            telefono: null,
            direccion: "Santiago centro 123",
            referencia: "Obra principal",
            obras: 1,
            ultimaGestion: "20 mar 2026",
            ultimaGestionAt: "2026-03-20T00:00:00.000Z",
            estado: "activo",
          },
        ],
      }),
    } as Response);

    const clientes = await getClientesResumenByOrganizationId(77);

    expect(fetchMock).toHaveBeenCalledWith("/api/clientes/resumen", {
      method: "GET",
      cache: "no-store",
    });
    expect(clientes).toHaveLength(1);
    expect(clientes[0]?.nombre).toBe("Cliente Uno");
  });

  it("debe propagar error legible si el endpoint falla", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Fallo clientes",
      }),
    } as Response);

    await expect(getClientesResumenByOrganizationId(77)).rejects.toThrow(
      "Fallo clientes"
    );
  });
});
