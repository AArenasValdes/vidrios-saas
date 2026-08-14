import { createMercadoPagoClient } from "../mercadopago.client";

describe("Mercado Pago client", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("crea suscripcion pending sin preapproval_plan_id para checkout hosted", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "preapproval-1",
          status: "pending",
          init_point:
            "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=preapproval-1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = createMercadoPagoClient("access-token");
    await client.createPreapproval({
      payerEmail: "owner@ventora.cl",
      externalReference: "ventora:cl:7:uuid",
      returnUrl: "https://www.ventorap.cl/dashboard?mp=confirming",
      notificationUrl: "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook",
      reason: "Ventora - Founder Mensual",
      idempotencyKey: "ventora:cl:7:uuid",
      autoRecurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 8_990,
        currency_id: "CLP",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          payer_email: "owner@ventora.cl",
          external_reference: "ventora:cl:7:uuid",
          back_url: "https://www.ventorap.cl/dashboard?mp=confirming",
          notification_url:
            "https://www.ventorap.cl/api/subscriptions/mercadopago/webhook",
          reason: "Ventora - Founder Mensual",
          status: "pending",
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: 8_990,
            currency_id: "CLP",
          },
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
