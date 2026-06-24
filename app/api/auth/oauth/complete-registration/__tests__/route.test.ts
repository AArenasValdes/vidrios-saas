jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/features/auth/services/auth-register-rate-limit.service", () => ({
  assertAuthRegisterRateLimit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/auth/services/auth-oauth-completion.service", () => ({
  AuthOAuthCompletionError: class AuthOAuthCompletionError extends Error {
    code: string;

    constructor(message: string, code = "provision_failed") {
      super(message);
      this.code = code;
    }
  },
  provisionOrganizationFromOAuthUser: jest.fn(),
}));

import { POST } from "@/app/api/auth/oauth/complete-registration/route";
import { createClient } from "@/lib/supabase/server";
import { provisionOrganizationFromOAuthUser } from "@/features/auth/services/auth-oauth-completion.service";

describe("POST /api/auth/oauth/complete-registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rechaza solicitudes sin sesion", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/auth/oauth/complete-registration", {
        method: "POST",
        body: JSON.stringify({ empresaNombre: "Vidrios Test" }),
      })
    );

    expect(response.status).toBe(401);
  });

  it("provisiona cuenta OAuth autenticada", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "auth-1",
              email: "nuevo@test.com",
            },
          },
          error: null,
        }),
      },
    });

    (provisionOrganizationFromOAuthUser as jest.Mock).mockResolvedValue({
      organizationId: 88,
      alreadyProvisioned: false,
      trialEndsAt: "2026-07-01",
    });

    const response = await POST(
      new Request("http://localhost/api/auth/oauth/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ empresaNombre: "Vidrios Test" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      organizationId: 88,
      alreadyProvisioned: false,
      trialEndsAt: "2026-07-01",
    });
  });
});
