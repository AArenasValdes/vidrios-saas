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

import { POST } from "../route";
import { verifyMercadoPagoWebhookSignature } from "@/features/subscriptions/providers/mercadopago/mercadopago-signature";
import { processMercadoPagoWebhook } from "@/features/subscriptions/services/mercadopago-webhook.service";

describe("Mercado Pago webhook route", () => {
  beforeEach(() => jest.clearAllMocks());

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
  });
});
