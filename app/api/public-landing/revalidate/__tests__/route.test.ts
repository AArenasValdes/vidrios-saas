jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/features/auth/services/active-user-profile.service", () => ({
  findActiveUserProfile: jest.fn(),
}));

jest.mock(
  "@/features/solicitudes/services/solicitudes-public-cache-revalidation.server",
  () => ({
    revalidatePublicLandingCaches: jest.fn(),
  })
);

import { POST } from "../route";
import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";
import { revalidatePublicLandingCaches } from "@/features/solicitudes/services/solicitudes-public-cache-revalidation.server";

describe("/api/public-landing/revalidate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("revalida la landing publica de la organizacion autenticada", async () => {
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
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                solicitud_publica_slug: "vidriosrivera",
              },
              error: null,
            }),
          }),
        }),
      }),
    });
    (findActiveUserProfile as jest.Mock).mockResolvedValue({
      organization_id: 5,
      rol: "admin",
    });

    const response = await POST(
      new Request("http://localhost/api/public-landing/revalidate", {
        method: "POST",
        headers: {
          authorization: "Bearer token-123",
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(revalidatePublicLandingCaches).toHaveBeenCalledWith("vidriosrivera");
    expect(payload).toEqual({
      ok: true,
      slug: "vidriosrivera",
    });
  });

  it("rechaza la revalidacion sin sesion", async () => {
    const response = await POST(
      new Request("http://localhost/api/public-landing/revalidate", {
        method: "POST",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: "No autorizado.",
    });
  });
});
