import { getCotizacionesResumenByOrganizationId } from "../../features/cotizaciones/services/cotizaciones-summary.service";

describe("cotizaciones-summary.service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("debe pedir el resumen de cotizaciones al endpoint unico", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        cotizaciones: [
          {
            id: "cot-1",
            codigo: "COT-001",
            clientId: "cliente-1",
            projectId: "proyecto-1",
            clienteNombre: "Alejandro Flores",
            clienteTelefono: "+56 9 1111 2222",
            obra: "Casa Norte",
            direccion: "Los Olivos 123",
            validez: "15 dias",
            descuentoPct: 0,
            observaciones: "",
            estado: "creada",
            approvalToken: null,
            approvalTokenExpiresAt: null,
            clienteVioEn: null,
            clienteRespondioEn: null,
            clienteRespuestaCanal: null,
            createdAt: "2026-04-01T10:00:00.000Z",
            updatedAt: "2026-04-01T10:00:00.000Z",
            items: [],
            subtotal: 714000,
            descuentoValor: 0,
            neto: 600000,
            iva: 114000,
            flete: 0,
            total: 714000,
          },
        ],
      }),
    } as Response);

    const cotizaciones = await getCotizacionesResumenByOrganizationId(77);

    expect(fetchMock).toHaveBeenCalledWith("/api/cotizaciones/resumen?page=1&pageSize=50", {
      method: "GET",
      cache: "no-store",
    });
    expect(cotizaciones).toHaveLength(1);
    expect(cotizaciones[0]?.codigo).toBe("COT-001");
  });

  it("debe propagar error legible si el endpoint falla", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Fallo cotizaciones",
      }),
    } as Response);

    await expect(getCotizacionesResumenByOrganizationId(77)).rejects.toThrow(
      "Fallo cotizaciones"
    );
  });
});
