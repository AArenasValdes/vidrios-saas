jest.mock("@/features/auth/services/auth-register-rate-limit.service", () => ({
  assertAuthRegisterRateLimit: jest.fn(),
}));

jest.mock("@/features/admin/services/organization-provision.service", () => ({
  OrganizationProvisionError: class OrganizationProvisionError extends Error {
    code = "invalid_input";
    constructor(message: string, code = "invalid_input") {
      super(message);
      this.code = code;
    }
  },
  provisionOrganizationAccount: jest.fn(),
}));

import { POST } from "@/app/api/auth/register/route";
import { provisionOrganizationAccount } from "@/features/admin/services/organization-provision.service";
import { OrganizationProvisionError } from "@/features/admin/services/organization-provision.service";

const mockProvision = provisionOrganizationAccount as jest.MockedFunction<
  typeof provisionOrganizationAccount
>;

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crea cuenta y responde ok", async () => {
    mockProvision.mockResolvedValue({
      organizationId: 12,
      authUserId: "auth-1",
      userId: 3,
      email: "dueno@empresa.cl",
      empresaNombre: "Vidrios del Sur",
    });

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dueno@empresa.cl",
          password: "clave1234",
          empresaNombre: "Vidrios del Sur",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      organizationId: 12,
      email: "dueno@empresa.cl",
    });
  });

  it("responde 409 si el correo ya existe", async () => {
    mockProvision.mockRejectedValue(
      new OrganizationProvisionError("Ya existe", "email_taken")
    );

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dueno@empresa.cl",
          password: "clave1234",
          empresaNombre: "Vidrios",
        }),
      })
    );

    expect(response.status).toBe(409);
  });
});
