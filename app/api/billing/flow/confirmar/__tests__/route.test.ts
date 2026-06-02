const mockHandleReturnOrWebhook = jest.fn();

jest.mock("@/features/billing/services/payment-provider-registry", () => ({
  getPaymentProvider: jest.fn(() => ({
    handleReturnOrWebhook: mockHandleReturnOrWebhook,
  })),
}));

import { GET, POST } from "../route";

describe("/api/billing/flow/confirmar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirige a dashboard cuando Flow retorna pago aprobado", async () => {
    mockHandleReturnOrWebhook.mockResolvedValue({
      status: "aprobado",
      redirectPath: "/dashboard?pago_exitoso=1",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/billing/flow/confirmar?source=return&token=tok_123"
      )
    );

    expect(mockHandleReturnOrWebhook).toHaveBeenCalledWith({
      token: "tok_123",
      source: "return",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard?pago_exitoso=1"
    );
  });

  it("redirige a pago pendiente cuando Flow retorna estado pendiente", async () => {
    mockHandleReturnOrWebhook.mockResolvedValue({
      status: "pendiente",
      redirectPath: "/cuenta-vencida?pago_pendiente=1",
    });

    const response = await POST(
      new Request(
        "http://localhost/api/billing/flow/confirmar?source=return",
        {
          method: "POST",
          body: new URLSearchParams({ token: "tok_pending" }),
        }
      )
    );

    expect(mockHandleReturnOrWebhook).toHaveBeenCalledWith({
      token: "tok_pending",
      source: "return",
    });
    expect(response.headers.get("location")).toBe(
      "http://localhost/cuenta-vencida?pago_pendiente=1"
    );
  });

  it("responde 200 al webhook de confirmacion", async () => {
    mockHandleReturnOrWebhook.mockResolvedValue({
      status: "aprobado",
      redirectPath: "/dashboard?pago_exitoso=1",
    });

    const response = await POST(
      new Request(
        "http://localhost/api/billing/flow/confirmar?source=confirmation",
        {
          method: "POST",
          body: new URLSearchParams({ token: "tok_confirmed" }),
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, status: "aprobado" });
  });

  it("redirige a fallo cuando provider falla en retorno", async () => {
    mockHandleReturnOrWebhook.mockRejectedValue(new Error("flow down"));

    const response = await GET(
      new Request(
        "http://localhost/api/billing/flow/confirmar?source=return&token=tok_error"
      )
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/cuenta-vencida?pago_fallido=1"
    );
  });
});
