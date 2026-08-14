import { createHmac } from "node:crypto";

import {
  buildFlowSignature,
  mapFlowStatus,
  redactFlowSensitiveText,
} from "@/features/billing/providers/flow.provider";

describe("flow provider helpers", () => {
  it("firma parametros ordenados por nombre con HMAC SHA256", () => {
    const params = {
      token: "tok_123",
      apiKey: "key_123",
      amount: 79990,
    };
    const expected = createHmac("sha256", "secret")
      .update("amount79990apiKeykey_123tokentok_123")
      .digest("hex");

    expect(buildFlowSignature(params, "secret")).toBe(expected);
  });

  it("mapea estados Flow al ledger interno", () => {
    expect(mapFlowStatus(1)).toBe("pendiente");
    expect(mapFlowStatus(2)).toBe("aprobado");
    expect(mapFlowStatus(3)).toBe("fallido");
    expect(mapFlowStatus(4)).toBe("cancelado");
    expect(mapFlowStatus(undefined)).toBe("fallido");
  });

  it("redacta credenciales y tokens de errores Flow", () => {
    const text = redactFlowSensitiveText(
      "https://www.flow.cl/api/payment/getStatus?apiKey=key_123&token=tok_123&s=abc token=tok_123",
      ["key_123", "tok_123", "abc"]
    );

    expect(text).not.toContain("key_123");
    expect(text).not.toContain("tok_123");
    expect(text).not.toContain("s=abc");
  });
});
