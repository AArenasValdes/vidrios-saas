import { getDashboardSummaryByOrganizationId } from "../../features/cotizaciones/services/dashboard-summary.service";

describe("dashboard-summary.service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("debe pedir el resumen del dashboard al endpoint unico", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: {
          recentRecords: [
            {
              id: "100",
              codigo: "COT-100",
              clientId: 1,
              projectId: 10,
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
              pdfDescargadoEn: null,
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
          alerts: [
            {
              id: "alert-200",
              cotizacionId: "200",
              codigo: "COT-200",
              href: "/cotizaciones/200",
              kind: "aprobada",
              title: "Cotizacion aprobada",
              message: "ok",
              occurredAt: "2026-04-02T10:00:00.000Z",
            },
          ],
          totalCount: 14,
          quotedTotal: 714000,
          pdfGeneratedCount: 5,
          approvedCount: 3,
          monthCount: 8,
          approvedTodayCount: 1,
        },
      }),
    } as Response);

    const summary = await getDashboardSummaryByOrganizationId(77);

    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/summary", {
      method: "GET",
      cache: "no-store",
    });
    expect(summary.totalCount).toBe(14);
    expect(summary.quotedTotal).toBe(714000);
    expect(summary.pdfGeneratedCount).toBe(5);
    expect(summary.recentRecords[0]?.clienteNombre).toBe("Alejandro Flores");
    expect(summary.alerts).toHaveLength(1);
  });

  it("debe propagar error legible si el endpoint falla", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Fallo dashboard",
      }),
    } as Response);

    await expect(getDashboardSummaryByOrganizationId(77)).rejects.toThrow(
      "Fallo dashboard"
    );
  });
});
