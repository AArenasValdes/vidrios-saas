import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const MERCADOPAGO_WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000;

function parseSignature(signature: string) {
  const parts = new Map<string, string>();

  for (const item of signature.split(",")) {
    const [key, ...valueParts] = item.trim().split("=");
    const value = valueParts.join("=").trim();

    if (key && value) {
      parts.set(key, value);
    }
  }

  return {
    timestamp: parts.get("ts") ?? "",
    digest: parts.get("v1")?.toLowerCase() ?? "",
  };
}

export function verifyMercadoPagoWebhookSignature(input: {
  dataId: string;
  requestId: string | null;
  signature: string | null;
  secret: string;
  nowMs?: number;
}) {
  if (!input.dataId || !input.requestId || !input.signature || !input.secret) {
    return false;
  }

  const { timestamp, digest } = parseSignature(input.signature);

  if (!timestamp || !/^[a-f0-9]{64}$/.test(digest)) {
    return false;
  }

  const timestampNumber = Number(timestamp);
  const timestampMs =
    timestampNumber >= 1_000_000_000_000
      ? timestampNumber
      : timestampNumber * 1000;
  const nowMs = input.nowMs ?? Date.now();

  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(nowMs - timestampMs) > MERCADOPAGO_WEBHOOK_MAX_SKEW_MS
  ) {
    return false;
  }

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", input.secret)
    .update(manifest)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(digest, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
