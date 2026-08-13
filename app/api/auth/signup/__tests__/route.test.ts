jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/features/auth/services/auth-register-rate-limit.service", () => ({
  assertAuthRegisterRateLimit: jest.fn(),
}));

jest.mock("@/features/auth/services/auth-oauth-completion.service", () => ({
  AuthOAuthCompletionError: class AuthOAuthCompletionError extends Error {},
  provisionOrganizationFromOAuthUser: jest.fn(),
}));

import { POST } from "@/app/api/auth/signup/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionOrganizationFromOAuthUser } from "@/features/auth/services/auth-oauth-completion.service";

const createAdminClientMock = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;
const provisionMock = provisionOrganizationFromOAuthUser as jest.MockedFunction<
  typeof provisionOrganizationFromOAuthUser
>;

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crea el acceso confirmado y provisiona la organizacion antes de responder", async () => {
    const createUser = jest.fn().mockResolvedValue({
      data: { user: { id: "auth-new" } },
      error: null,
    });
    createAdminClientMock.mockReturnValue({
      auth: { admin: { createUser } },
    } as never);
    provisionMock.mockResolvedValue({
      organizationId: 88,
      userId: 12,
      email: "nuevo@test.com",
      empresaNombre: "Vidrios Test",
      trialEndsAt: "2026-08-28T00:00:00.000Z",
      alreadyProvisioned: false,
      accountComplete: true,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: "Alessandro Gonzalez",
          empresaNombre: "Vidrios Test",
          email: "NUEVO@Test.com",
          password: "una-clave-segura",
          whatsapp: "+56 9 1234 5678",
          countryCode: "CL",
          ciudadComuna: "",
          consentimientoAceptado: true,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createUser).toHaveBeenCalledWith({
      email: "nuevo@test.com",
      password: "una-clave-segura",
      email_confirm: true,
    });
    expect(provisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: "auth-new",
        email: "nuevo@test.com",
        ciudadComuna: "",
      }),
      expect.objectContaining({ admin: expect.any(Object) }),
    );
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      organizationId: 88,
      accountComplete: true,
    });
  });

  it("rechaza una contrasena corta sin crear un usuario Auth", async () => {
    const createUser = jest.fn();
    createAdminClientMock.mockReturnValue({
      auth: { admin: { createUser } },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nuevo@test.com", password: "corta" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });
});
