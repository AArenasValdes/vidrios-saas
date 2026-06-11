jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock("@/features/dashboard/services/dashboard-summary-server.service", () => ({
  getDashboardSummaryByOrganizationId: jest.fn(),
}));

import { GET } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { getDashboardSummaryByOrganizationId } from "@/features/dashboard/services/dashboard-summary-server.service";

describe("/api/dashboard/summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("propaga el limite de auth sin consultar el resumen", async () => {
    const { AuthRouteAccessError } = jest.requireMock(
      "@/features/auth/services/auth-route-access.service"
    );
    (resolveAuthenticatedRouteContext as jest.Mock).mockRejectedValue(
      new AuthRouteAccessError(401, "No autorizado.")
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(getDashboardSummaryByOrganizationId).not.toHaveBeenCalled();
    expect(payload).toEqual({ error: "No autorizado." });
  });

  it("pide el resumen usando la organizacion activa", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "auth-1", email: "admin@ventora.cl" },
      profile: { organizationId: "org-77", rol: "admin" },
    });
    (getDashboardSummaryByOrganizationId as jest.Mock).mockResolvedValue({
      totalCount: 3,
      quotedTotal: 99000,
      pdfGeneratedCount: 2,
      approvedCount: 1,
      monthCount: 2,
      approvedTodayCount: 1,
      recentRecords: [],
      alerts: [],
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getDashboardSummaryByOrganizationId).toHaveBeenCalledWith("org-77");
    expect(payload.summary.totalCount).toBe(3);
  });
});
