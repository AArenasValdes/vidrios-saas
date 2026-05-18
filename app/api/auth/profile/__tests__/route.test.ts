jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/features/auth/services/active-user-profile.service", () => ({
  findActiveUserProfile: jest.fn(),
}));

import { GET } from "../route";
import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";

describe("/api/auth/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("rechaza solicitudes sin bearer token", async () => {
    const response = await GET(
      new Request("http://localhost/api/auth/profile")
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "No autorizado." });
  });
});
