import { createHmac } from "node:crypto";

import {
  buildFlowSignature,
  mapFlowStatus,
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
});
