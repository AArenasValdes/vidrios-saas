import {
  normalizeMercadoPagoExternalReference,
  resolveMercadoPagoCheckoutUrl,
} from "../mercadopago-reference";

describe("Mercado Pago reference helpers", () => {
  it("normaliza external_reference numerico de Mercado Pago", () => {
    expect(normalizeMercadoPagoExternalReference(12345)).toBe("12345");
    expect(normalizeMercadoPagoExternalReference("ventora:cl:7:uuid")).toBe(
      "ventora:cl:7:uuid"
    );
  });

  it("resuelve sandbox_init_point cuando init_point no viene", () => {
    expect(
      resolveMercadoPagoCheckoutUrl({
        sandbox_init_point:
          "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=test",
      })
    ).toBe("https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=test");
  });
});
