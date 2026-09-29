const mockListRecentPendingMercadoPago = jest.fn();
const mockListMercadoPagoDueBefore = jest.fn();
const mockSynchronizeMercadoPagoSubscriptionForOrganization = jest.fn();

jest.mock("@/features/subscriptions/config/mercadopago-cl.config", () => ({
  getMercadoPagoChileConfig: () => ({ accessToken: "access-token" }),
}));
jest.mock(
  "@/features/subscriptions/repositories/organization-subscription.repository",
  () => ({
    createOrganizationSubscriptionRepository: () => ({
      listRecentPendingMercadoPago: (...args: unknown[]) =>
        mockListRecentPendingMercadoPago(...args),
      listMercadoPagoDueBefore: (...args: unknown[]) =>
        mockListMercadoPagoDueBefore(...args),
    }),
  })
);
jest.mock(
  "@/features/subscriptions/services/mercadopago-webhook.service",
  () => ({
    synchronizeMercadoPagoSubscriptionForOrganization: (...args: unknown[]) =>
      mockSynchronizeMercadoPagoSubscriptionForOrganization(...args),
  })
);

import { GET } from "../route";

describe("Mercado Pago billing reconciliation cron", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
    mockListRecentPendingMercadoPago.mockResolvedValue([]);
    mockListMercadoPagoDueBefore.mockResolvedValue([]);
    mockSynchronizeMercadoPagoSubscriptionForOrganization.mockResolvedValue(true);
  });

  afterAll(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("rechaza llamadas sin el secreto de Vercel", async () => {
    const response = await GET(new Request("https://ventora.test/api/cron/mercadopago-billing"));

    expect(response.status).toBe(401);
    expect(mockListRecentPendingMercadoPago).not.toHaveBeenCalled();
  });

  it("reconcilia organizaciones recientes y vencidas sin duplicar cuentas", async () => {
    mockListRecentPendingMercadoPago.mockResolvedValue([{ organization_id: 43 }]);
    mockListMercadoPagoDueBefore.mockResolvedValue([
      { organization_id: 43 },
      { organization_id: 52 },
    ]);

    const response = await GET(
      new Request("https://ventora.test/api/cron/mercadopago-billing", {
        headers: { authorization: "Bearer cron-test-secret" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ scanned: 2, synchronized: 2, failed: 0 });
    expect(
      mockSynchronizeMercadoPagoSubscriptionForOrganization
    ).toHaveBeenCalledTimes(2);
    expect(
      mockSynchronizeMercadoPagoSubscriptionForOrganization
    ).toHaveBeenCalledWith(43, { includePaymentDetails: false });
    expect(
      mockSynchronizeMercadoPagoSubscriptionForOrganization
    ).toHaveBeenCalledWith(52, { includePaymentDetails: false });
  });
});
