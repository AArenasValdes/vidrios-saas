jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/features/auth/services/active-user-profile.service", () => ({
  findActiveUserProfile: jest.fn(),
}));

import { POST } from "../route";
import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";

describe("/api/organization-assets/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sube una imagen con service role y devuelve su URL publica", async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const getPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/3/hero/test.jpg" },
    });

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
      storage: {
        from: jest.fn().mockReturnValue({
          upload,
          getPublicUrl,
        }),
      },
    });
    (findActiveUserProfile as jest.Mock).mockResolvedValue({
      organization_id: 3,
      rol: "admin",
    });

    const formData = new FormData();
    formData.append("kind", "hero");
    formData.append(
      "file",
      new File(["img"], "hero.jpg", { type: "image/jpeg" })
    );

    const request = new Request("http://localhost/api/organization-assets/upload", {
      method: "POST",
      headers: {
        authorization: "Bearer token-123",
      },
      body: formData,
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(upload).toHaveBeenCalled();
    expect(payload).toEqual({
      publicUrl: "https://cdn.example.com/3/hero/test.jpg",
    });
  });

  it("rechaza archivos que no son imagen", async () => {
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
      storage: {
        from: jest.fn(),
      },
    });
    (findActiveUserProfile as jest.Mock).mockResolvedValue({
      organization_id: 3,
      rol: "admin",
    });

    const formData = new FormData();
    formData.append("kind", "gallery");
    formData.append(
      "file",
      new File(["txt"], "nota.txt", { type: "text/plain" })
    );

    const response = await POST(
      new Request("http://localhost/api/organization-assets/upload", {
        method: "POST",
        headers: {
          authorization: "Bearer token-123",
        },
        body: formData,
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "La foto de trabajo debe ser una imagen.",
    });
  });
});
