import { GET, POST } from "../route";

describe("/api/subscriptions/webpay/confirmar", () => {
  it.each(["GET", "POST"])("mantiene retirado el endpoint Webpay (%s)", async (method) => {
    const handler = method === "GET" ? GET : POST;
    const response = await handler(
      new Request("http://localhost/api/subscriptions/webpay/confirmar", {
        method,
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Webpay no es una pasarela activa en Ventora.",
    });
  });
});
