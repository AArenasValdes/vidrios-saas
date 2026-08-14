import { GET, POST } from "../route";

describe("/api/billing/flow/confirmar", () => {
  it.each(["GET", "POST"])("mantiene retirado el endpoint Flow (%s)", async (method) => {
    const handler = method === "GET" ? GET : POST;
    const response = await handler(
      new Request("http://localhost/api/billing/flow/confirmar?token=legacy", {
        method,
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Flow no es una pasarela activa en Ventora.",
    });
  });
});
