jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

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

jest.mock("@/features/auth/services/auth-welcome-email.service", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

jest.mock(
  "@/features/cotizaciones/line-templates/services/seed-line-catalog-server",
  () => ({
    seedDefaultLineCatalogServer: jest.fn().mockResolvedValue({
      seeded: 0,
      skipped: 0,
      status: "ok",
    }),
  })
);

import { POST } from "@/app/api/auth/complete-pending-signup/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { provisionOrganizationFromOAuthUser } from "@/features/auth/services/auth-oauth-completion.service";

describe("POST /api/auth/complete-pending-signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("completa el alta pendiente autenticada con metadata de correo", async () => {
    (createAdminClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "auth-1",
              email: "nuevo@test.com",
              email_confirmed_at: "2026-09-20T12:00:00.000Z",
              user_metadata: {
                email_verified: true,
                ventora_signup: {
                  version: 1,
                  nombre: "Alessandro",
                  empresaNombre: "Vidrios Test",
                  whatsapp: "+56912345678",
                  ciudadComuna: "Santiago",
                  countryCode: "CL",
                  consentimientoAceptado: true,
                },
              },
            },
          },
          error: null,
        }),
      },
    });

    (provisionOrganizationFromOAuthUser as jest.Mock).mockResolvedValue({
      organizationId: 55,
      alreadyProvisioned: false,
      trialEndsAt: "2026-10-05",
      accountComplete: true,
      empresaNombre: "Vidrios Test",
    });

    const response = await POST(
      new Request("http://localhost/api/auth/complete-pending-signup", {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      organizacionId: 55,
      rol: "admin",
    });
    expect(provisionOrganizationFromOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: "auth-1",
        email: "nuevo@test.com",
        empresaNombre: "Vidrios Test",
      })
    );
  });

  it("rechaza si no hay sesion", async () => {
    (createAdminClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/auth/complete-pending-signup", {
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
  });
});
