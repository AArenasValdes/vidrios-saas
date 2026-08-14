import { createMercadoPagoClient } from "../mercadopago.client";

describe("Mercado Pago client", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("envia status pending al crear una suscripcion con plan", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "preapproval-1",
          status: "pending",
          init_point: "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=preapproval-1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = createMercadoPagoClient("access-token");
    await client.createPreapproval({
      providerPlanId: "plan-1",
      payerEmail: "owner@ventora.cl",
      externalReference: "ventora:cl:7:uuid",
      returnUrl: "https://www.ventorap.cl/cuenta-vencida/mercadopago/retorno",
      notificationUrl: "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook",
      reason: "Ventora - Founder Mensual",
      idempotencyKey: "ventora:cl:7:uuid",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          preapproval_plan_id: "plan-1",
          payer_email: "owner@ventora.cl",
          external_reference: "ventora:cl:7:uuid",
          back_url: "https://www.ventorap.cl/cuenta-vencida/mercadopago/retorno",
          notification_url:
            "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook",
          reason: "Ventora - Founder Mensual",
          status: "pending",
        }),
      })
    );
  });

  it("expone el mensaje de error devuelto por Mercado Pago", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Invalid card_token_id",
          status: 400,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = createMercadoPagoClient("access-token");

    await expect(client.getPreapprovalPlan("plan-1")).rejects.toMatchObject({
      status: 400,
      message: "Invalid card_token_id",
    });
  });
});
