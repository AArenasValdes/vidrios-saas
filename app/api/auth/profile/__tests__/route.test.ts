jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/user-scoped", () => ({
  createUserScopedClient: jest.fn(),
}));

jest.mock("@/features/auth/services/active-user-profile.service", () => ({
  findActiveUserProfile: jest.fn(),
}));

import { GET } from "../route";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createUserScopedClient } from "@/lib/supabase/user-scoped";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";

describe("/api/auth/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createUserScopedClient as jest.Mock).mockReturnValue(null);
    (createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("No cookie session"),
        }),
      },
    });
  });

  it("retorna el perfil activo del usuario autenticado usando token bearer", async () => {
    (createAdminClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "admin@test.com",
            },
          },
          error: null,
        }),
      },
    });
    (findActiveUserProfile as jest.Mock).mockResolvedValue({
      organization_id: 3,
      rol: "admin",
    });

    const request = new Request("http://localhost/api/auth/profile", {
      headers: {
        authorization: "Bearer token-123",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(findActiveUserProfile).toHaveBeenCalled();
    expect(payload).toEqual({
      profile: {
        organizacionId: 3,
        rol: "admin",
      },
    });
  });

  it("resuelve el perfil con el token del usuario si el service_role local no sirve", async () => {
    (createAdminClient as jest.Mock).mockImplementation(() => {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY no es una clave de servicio de Supabase."
      );
    });
    (createUserScopedClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "admin@test.com",
            },
          },
          error: null,
        }),
      },
    });
    (findActiveUserProfile as jest.Mock).mockResolvedValue({
      organization_id: 3,
      rol: "admin",
    });

    const request = new Request("http://localhost/api/auth/profile", {
      headers: {
        authorization: "Bearer token-123",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(createUserScopedClient).toHaveBeenCalledWith("token-123");
    expect(payload).toEqual({
      profile: {
        organizacionId: 3,
        rol: "admin",
      },
    });
  });

  it("usa la sesión SSR de Supabase si el bearer local expiró", async () => {
    (createAdminClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("Invalid JWT"),
        }),
      },
    });
    (createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-cookie",
              email: "admin@test.com",
            },
          },
          error: null,
        }),
      },
    });
    (findActiveUserProfile as jest.Mock).mockResolvedValue({
      organization_id: 3,
      rol: "admin",
    });

    const response = await GET(
      new Request("http://localhost/api/auth/profile", {
        headers: { authorization: "Bearer expired-token" },
      })
    );

    expect(response.status).toBe(200);
    expect(findActiveUserProfile).toHaveBeenCalledWith(
      expect.anything(),
      { authUserId: "user-cookie", email: "admin@test.com" }
    );
  });

  it("rechaza solicitudes sin bearer token", async () => {
    const response = await GET(
      new Request("http://localhost/api/auth/profile")
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "No autorizado." });
  });
});
