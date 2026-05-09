jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "../auth-route-access.service";
import { createClient } from "@/lib/supabase/server";

function createUsersQueryMock(options: {
  authRow?: unknown;
  emailRow?: unknown;
  error?: unknown;
}) {
  let lookupMode: "auth" | "email" = "auth";

  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(function (field: string) {
      if (field === "auth_user_id") {
        lookupMode = "auth";
      }

      return this;
    }),
    ilike: jest.fn(function () {
      lookupMode = "email";
      return this;
    }),
    is: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => {
      if (options.error) {
        return {
          data: null,
          error: options.error,
        };
      }

      return {
        data: lookupMode === "auth" ? options.authRow ?? null : options.emailRow ?? null,
        error: null,
      };
    }),
  };
}

describe("auth-route-access.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rechaza cuando no existe un usuario autenticado", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
      from: jest.fn(),
    });

    await expect(resolveAuthenticatedRouteContext()).rejects.toMatchObject({
      status: 401,
      message: "No autorizado.",
    } satisfies Partial<AuthRouteAccessError>);
  });

  it("prefiere el perfil por auth_user_id antes de caer al correo", async () => {
    const usersQuery = createUsersQueryMock({
      authRow: {
        auth_user_id: "auth-1",
        organization_id: "org-77",
        rol: "admin",
      },
      emailRow: {
        auth_user_id: null,
        organization_id: "org-email",
        rol: "viewer",
      },
    });

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "auth-1",
              email: "admin@ventora.cl",
            },
          },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue(usersQuery),
    });

    const result = await resolveAuthenticatedRouteContext();

    expect(result.profile).toEqual({
      organizationId: "org-77",
      rol: "admin",
    });
    expect(usersQuery.ilike).not.toHaveBeenCalled();
  });

  it("cae al lookup por correo cuando auth_user_id aun no esta sincronizado", async () => {
    const usersQuery = createUsersQueryMock({
      authRow: null,
      emailRow: {
        auth_user_id: null,
        organization_id: "org-88",
        rol: "viewer",
      },
    });

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "auth-2",
              email: "viewer@ventora.cl",
            },
          },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue(usersQuery),
    });

    const result = await resolveAuthenticatedRouteContext();

    expect(usersQuery.ilike).toHaveBeenCalledWith("correo", "viewer@ventora.cl");
    expect(result.profile).toEqual({
      organizationId: "org-88",
      rol: "viewer",
    });
  });
});
