import { getDashboardSummaryByOrganizationId } from "../../features/cotizaciones/services/dashboard-summary.service";

const listRecentByOrganizationId = jest.fn();
const listDashboardAlertCandidatesByOrganizationId = jest.fn();
const countByOrganizationId = jest.fn();
const sumTotalByOrganizationId = jest.fn();
const listProjectsByIds = jest.fn();
const listClientsByIds = jest.fn();
const buildCotizacionAlerts = jest.fn();

jest.mock("@/features/cotizaciones/repositories/cotizaciones-repository", () => ({
  cotizacionesRepository: {
    listRecentByOrganizationId: (...args: unknown[]) => listRecentByOrganizationId(...args),
    listDashboardAlertCandidatesByOrganizationId: (...args: unknown[]) =>
      listDashboardAlertCandidatesByOrganizationId(...args),
    countByOrganizationId: (...args: unknown[]) => countByOrganizationId(...args),
    sumTotalByOrganizationId: (...args: unknown[]) => sumTotalByOrganizationId(...args),
  },
}));

jest.mock("@/features/projects/repositories/projects.repository", () => ({
  projectsRepository: {
    listByIds: (...args: unknown[]) => listProjectsByIds(...args),
  },
}));

jest.mock("@/features/clientes/repositories/clientes-repository", () => ({
  clientesRepository: {
    listByIds: (...args: unknown[]) => listClientsByIds(...args),
  },
}));

jest.mock("@/features/cotizaciones/services/cotizacion-alerts.service", () => ({
  buildCotizacionAlerts: (...args: unknown[]) => buildCotizacionAlerts(...args),
}));

jest.mock("@/features/cotizaciones/services/cotizaciones-workflow.service", () => ({
  buildLegacyCotizacionCode: () => "LEGACY-001",
}));

describe("dashboard-summary.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    listRecentByOrganizationId.mockResolvedValue([
      {
        id: 100,
        proyectoId: 10,
        organizationId: 77,
        numero: "COT-100",
        estado: "creada",
        descuentoPct: 0,
        flete: 0,
        iva: 114000,
        notas: "",
        validoHasta: null,
        subtotalNeto: 600000,
        costoTotal: 300000,
        margenPct: 100,
        utilidadTotal: 300000,
        estadoComercial: null,
        approvalToken: null,
        approvalTokenExpiresAt: null,
        clienteVioEn: null,
        clienteRespondioEn: null,
        clienteRespuestaCanal: null,
        creadoEn: "2026-04-01T10:00:00.000Z",
        actualizadoEn: "2026-04-01T10:00:00.000Z",
        eliminadoEn: null,
        items: [],
        total: 714000,
      },
    ]);

    listDashboardAlertCandidatesByOrganizationId.mockResolvedValue([
      {
        id: 200,
        proyectoId: 10,
        organizationId: 77,
        numero: "COT-200",
        estado: "aprobada",
        descuentoPct: 0,
        flete: 0,
        iva: 114000,
        notas: "",
        validoHasta: null,
        subtotalNeto: 600000,
        costoTotal: 300000,
        margenPct: 100,
        utilidadTotal: 300000,
        estadoComercial: null,
        approvalToken: null,
        approvalTokenExpiresAt: null,
        clienteVioEn: null,
        clienteRespondioEn: "2026-04-02T10:00:00.000Z",
        clienteRespuestaCanal: "manual_app",
        creadoEn: "2026-04-01T10:00:00.000Z",
        actualizadoEn: "2026-04-02T10:00:00.000Z",
        eliminadoEn: null,
        items: [],
        total: 714000,
      },
    ]);

    countByOrganizationId.mockResolvedValueOnce(3);
    countByOrganizationId.mockResolvedValueOnce(8);
    countByOrganizationId.mockResolvedValueOnce(1);
    sumTotalByOrganizationId.mockResolvedValue(714000);

    listProjectsByIds.mockResolvedValue([
      {
        id: 10,
        titulo: "Casa Norte",
        descripcion: null,
        clienteId: 1,
        organizationId: 77,
        creadoEn: null,
        estado: "activo",
        actualizadoEn: null,
        eliminadoEn: null,
      },
    ]);

    listClientsByIds.mockResolvedValue([
      {
        id: 1,
        organizationId: 77,
        nombre: "Alejandro Flores",
        telefono: "+56 9 1111 2222",
        direccion: "Los Olivos 123",
        correo: null,
        creadoEn: null,
        actualizadoEn: null,
        eliminadoEn: null,
      },
    ]);

    buildCotizacionAlerts.mockReturnValue([
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
    ]);
  });

  it("usa consultas chicas para dashboard y mantiene datos resumidos", async () => {
    const summary = await getDashboardSummaryByOrganizationId(77);

    expect(listRecentByOrganizationId).toHaveBeenCalledWith(77, 50);
    expect(listDashboardAlertCandidatesByOrganizationId).toHaveBeenCalledWith(77, 21);
    expect(countByOrganizationId).toHaveBeenCalledTimes(3);
    expect(sumTotalByOrganizationId).toHaveBeenCalledWith(77, {
      estados: ["aprobada"],
      updatedFrom: expect.any(String),
      updatedTo: expect.any(String),
    });
    expect(summary.recentRecords).toHaveLength(1);
    expect(summary.recentRecords[0].clienteNombre).toBe("Alejandro Flores");
    expect(summary.alerts).toHaveLength(1);
    expect(summary.pendingCount).toBe(3);
    expect(summary.monthCount).toBe(8);
    expect(summary.approvedTodayCount).toBe(1);
    expect(summary.approvedMonthTotal).toBe(714000);
  });
});
