jest.mock("@/features/subscriptions/config/mercadopago-cl.config", () => ({
  getMercadoPagoChileConfig: () => ({ webhookSecret: "secret" }),
}));
jest.mock(
  "@/features/subscriptions/providers/mercadopago/mercadopago-signature",
  () => ({ verifyMercadoPagoWebhookSignature: jest.fn() })
);
jest.mock("@/features/subscriptions/services/mercadopago-webhook.service", () => ({
  isMercadoPagoWebhookTopic: (value: string) =>
    value === "subscription_preapproval",
  processMercadoPagoWebhook: jest.fn(),
}));
const claimMercadoPagoEvent = jest.fn();
const markProcessed = jest.fn();
const markFailed = jest.fn();
jest.mock(
  "@/features/subscriptions/repositories/payment-webhook-event.repository",
  () => ({
    createPaymentWebhookEventRepository: () => ({
      claimMercadoPagoEvent,
      markProcessed,
      markFailed,
    }),
  })
);

import { POST } from "../route";
import { verifyMercadoPagoWebhookSignature } from "@/features/subscriptions/providers/mercadopago/mercadopago-signature";
import { processMercadoPagoWebhook } from "@/features/subscriptions/services/mercadopago-webhook.service";

describe("Mercado Pago webhook route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    claimMercadoPagoEvent.mockResolvedValue(true);
    markProcessed.mockResolvedValue(undefined);
    markFailed.mockResolvedValue(undefined);
  });

  it("rechaza firma invalida antes de consultar o escribir", async () => {
    (verifyMercadoPagoWebhookSignature as jest.Mock).mockReturnValue(false);
    const response = await POST(
      new Request(
        "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook?type=subscription_preapproval&data.id=123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "subscription_preapproval", data: { id: "123" } }),
        }
      )
    );

    expect(response.status).toBe(401);
    expect(processMercadoPagoWebhook).not.toHaveBeenCalled();
  });

  it("procesa solo despues de validar firma y topic", async () => {
    (verifyMercadoPagoWebhookSignature as jest.Mock).mockReturnValue(true);
    (processMercadoPagoWebhook as jest.Mock).mockResolvedValue(true);
    const response = await POST(
      new Request(
        "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook?type=subscription_preapproval&data.id=123",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": "req-1",
            "x-signature": "ts=1,v1=digest",
          },
          body: JSON.stringify({ type: "subscription_preapproval", data: { id: "123" } }),
        }
      )
    );

    expect(response.status).toBe(200);
    expect(processMercadoPagoWebhook).toHaveBeenCalledWith({
      topic: "subscription_preapproval",
      resourceId: "123",
    });
    expect(claimMercadoPagoEvent).toHaveBeenCalledWith({
      requestId: "req-1",
      topic: "subscription_preapproval",
      resourceId: "123",
    });
    expect(markProcessed).toHaveBeenCalledWith("req-1");
  });

  it("no procesa dos veces el mismo request-id", async () => {
    (verifyMercadoPagoWebhookSignature as jest.Mock).mockReturnValue(true);
    claimMercadoPagoEvent.mockResolvedValue(false);

    const response = await POST(
      new Request(
        "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook?type=subscription_preapproval&data.id=123",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": "req-1",
            "x-signature": "ts=1,v1=digest",
          },
          body: JSON.stringify({ data: { id: "123" } }),
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true });
    expect(processMercadoPagoWebhook).not.toHaveBeenCalled();
  });

  it("rechaza el payload antes de consultar proveedor si supera 32 KiB", async () => {
    const response = await POST(
      new Request(
        "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook?type=subscription_preapproval&data.id=123",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": "req-large",
            "x-signature": "ts=1,v1=digest",
          },
          body: JSON.stringify({ padding: "x".repeat(40 * 1024) }),
        }
      )
    );

    expect(response.status).toBe(413);
    expect(processMercadoPagoWebhook).not.toHaveBeenCalled();
  });
});
