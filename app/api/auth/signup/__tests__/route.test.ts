jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/features/auth/services/auth-register-rate-limit.service", () => ({
  assertAuthRegisterRateLimit: jest.fn(),
  assertAuthRegisterIdentityRateLimit: jest.fn(),
}));

jest.mock("@/features/auth/services/auth-account-activation-email.service", () => ({
  sendAccountActivationEmail: jest.fn(),
}));

import { POST } from "@/app/api/auth/signup/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccountActivationEmail } from "@/features/auth/services/auth-account-activation-email.service";

const createAdminClientMock = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;
const sendActivationMock = sendAccountActivationEmail as jest.MockedFunction<
  typeof sendAccountActivationEmail
>;

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crea acceso no confirmado y envia activacion antes de provisionar", async () => {
    const generateLink = jest.fn().mockResolvedValue({
      data: {
        user: { id: "auth-new" },
        properties: {
          action_link:
            "https://yrtrwgkaopfumpidjthk.supabase.co/auth/v1/verify?token=one-time",
        },
      },
      error: null,
    });
    const deleteUser = jest.fn();
    createAdminClientMock.mockReturnValue({
      auth: { admin: { generateLink, deleteUser } },
    } as never);
    sendActivationMock.mockResolvedValue({ sent: true });

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

    expect(response.status).toBe(202);
    expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({
      type: "signup",
      email: "nuevo@test.com",
      password: "una-clave-segura",
      options: expect.objectContaining({
        redirectTo: expect.stringContaining("provider=email"),
      }),
    }));
    expect(sendActivationMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      verificationRequired: true,
      accountComplete: false,
    });
  });

  it("rechaza una contrasena corta sin crear un usuario Auth", async () => {
    const generateLink = jest.fn();
    createAdminClientMock.mockReturnValue({
      auth: { admin: { generateLink } },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nuevo@test.com", password: "corta" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(generateLink).not.toHaveBeenCalled();
  });
});
