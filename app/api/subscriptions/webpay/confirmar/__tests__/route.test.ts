jest.mock("@/features/subscriptions/services/webpay-suscripcion.service", () => ({
  webpaySuscripcionService: {
    confirmarPago: jest.fn(),
    registrarRetornoIncompleto: jest.fn(),
  },
}));

import { GET, POST } from "../route";
import { webpaySuscripcionService } from "@/features/subscriptions/services/webpay-suscripcion.service";

const webpayServiceMock = jest.mocked(webpaySuscripcionService);

describe("/api/subscriptions/webpay/confirmar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("confirma el retorno normal con token_ws por GET", async () => {
    webpayServiceMock.confirmarPago.mockResolvedValue({
      success: true,
      redirect: "/dashboard?pago_exitoso=1",
      planCode: "founder_full",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/subscriptions/webpay/confirmar?token_ws=abc123"
      )
    );

    expect(webpayServiceMock.confirmarPago).toHaveBeenCalledWith("abc123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard?pago_exitoso=1"
    );
  });

  it("registra retorno abortado con parametros TBK por POST", async () => {
    webpayServiceMock.registrarRetornoIncompleto.mockResolvedValue({
      success: false,
      redirect: "/cuenta-vencida?pago_fallido=1",
    });

    const body = new URLSearchParams({
      TBK_TOKEN: "token-abortado",
      TBK_ORDEN_COMPRA: "VT0001ABC",
      TBK_ID_SESION: "1",
    });

    const response = await POST(
      new Request("http://localhost/api/subscriptions/webpay/confirmar", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      })
    );

    expect(
      webpayServiceMock.registrarRetornoIncompleto
    ).toHaveBeenCalledWith({
      token: "token-abortado",
      buyOrder: "VT0001ABC",
      sessionId: "1",
      reason: "ABORTED",
      rawParams: {
        TBK_TOKEN: "token-abortado",
        TBK_ORDEN_COMPRA: "VT0001ABC",
        TBK_ID_SESION: "1",
      },
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/cuenta-vencida?pago_fallido=1"
    );
  });
});
