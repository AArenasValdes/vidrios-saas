import { POST } from "../route";

describe("/api/billing/checkout", () => {
  it("mantiene retirado el checkout legacy provider-agnostic", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planCode: "founder_full_annual",
          provider: "flow",
        }),
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error:
        "Este endpoint de checkout fue retirado. Usa Mercado Pago en /api/subscriptions/mercadopago/create.",
    });
  });
});
