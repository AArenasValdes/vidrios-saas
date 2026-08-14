import { createHmac } from "node:crypto";

import { verifyMercadoPagoWebhookSignature } from "../mercadopago-signature";

describe("Mercado Pago webhook signature", () => {
  const secret = "webhook-secret";
  const dataId = "123456";
  const requestId = "req-abc";
  const timestamp = "1723456789";
  const digest = createHmac("sha256", secret)
    .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
    .digest("hex");

  it("acepta la firma HMAC oficial", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        dataId,
        requestId,
        signature: `ts=${timestamp},v1=${digest}`,
        secret,
        nowMs: Number(timestamp) * 1000,
      })
    ).toBe(true);
  });

  it("rechaza firma alterada o headers incompletos", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        dataId,
        requestId,
        signature: `ts=${timestamp},v1=${"0".repeat(64)}`,
        secret,
        nowMs: Number(timestamp) * 1000,
      })
    ).toBe(false);
    expect(
      verifyMercadoPagoWebhookSignature({
        dataId,
        requestId: null,
        signature: `ts=${timestamp},v1=${digest}`,
        secret,
        nowMs: Number(timestamp) * 1000,
      })
    ).toBe(false);
  });

  it("normaliza data.id a minusculas como indica Mercado Pago", () => {
    const mixedId = "ABC-123";
    const mixedDigest = createHmac("sha256", secret)
      .update(`id:${mixedId.toLowerCase()};request-id:${requestId};ts:${timestamp};`)
      .digest("hex");

    expect(
      verifyMercadoPagoWebhookSignature({
        dataId: mixedId,
        requestId,
        signature: `ts=${timestamp},v1=${mixedDigest}`,
        secret,
        nowMs: Number(timestamp) * 1000,
      })
    ).toBe(true);
  });

  it("rechaza una firma valida fuera de la ventana temporal", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        dataId,
        requestId,
        signature: `ts=${timestamp},v1=${digest}`,
        secret,
        nowMs: Number(timestamp) * 1000 + 6 * 60 * 1000,
      })
    ).toBe(false);
  });
});
