jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/features/auth/services/active-user-profile.service", () => ({
  findActiveUserProfile: jest.fn(),
}));

jest.mock(
  "@/features/organization-assets/services/organization-asset-image-normalizer.service",
  () => ({
    normalizeOrganizationAssetImage: jest.fn(),
    OrganizationAssetImageProcessingError: class OrganizationAssetImageProcessingError extends Error {
      constructor(message = "No pudimos procesar esta imagen.") {
        super(message);
        this.name = "OrganizationAssetImageProcessingError";
      }
    },
  })
);

import { POST } from "../route";
import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";
import {
  normalizeOrganizationAssetImage,
  OrganizationAssetImageProcessingError,
} from "@/features/organization-assets/services/organization-asset-image-normalizer.service";

describe("/api/organization-assets/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (normalizeOrganizationAssetImage as jest.Mock).mockReset();
  });

  it("sube una imagen con service role y devuelve su URL publica", async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const getPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/3/hero/test.jpg" },
    });
    (normalizeOrganizationAssetImage as jest.Mock).mockResolvedValue({
      body: Buffer.from("jpeg-data"),
      contentType: "image/jpeg",
      extension: "jpg",
      normalized: true,
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
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/\/hero-.*\.jpg$/),
      Buffer.from("jpeg-data"),
      expect.objectContaining({
        upsert: true,
        contentType: "image/jpeg",
      })
    );
    expect(payload).toEqual({
      publicUrl: "https://cdn.example.com/3/hero/test.jpg",
    });
  });

  it("rechaza archivos que no son imagen", async () => {
    (normalizeOrganizationAssetImage as jest.Mock).mockReset();
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

  it("rechaza imagenes demasiado pesadas antes de optimizarlas", async () => {
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

    const file = new File(
      [new Uint8Array(21 * 1024 * 1024)],
      "gigante.jpg",
      { type: "image/jpeg" }
    );

    const formData = new FormData();
    formData.append("kind", "gallery");
    formData.append("file", file);

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
      error: "La foto de trabajo no puede pesar mas de 20 MB antes de optimizarse.",
    });
  });

  it("devuelve error preciso si no se puede procesar la imagen", async () => {
    (normalizeOrganizationAssetImage as jest.Mock).mockRejectedValue(
      new OrganizationAssetImageProcessingError(
        "No pudimos procesar esta foto. Prueba con otra imagen o vuelve a exportarla desde tu celular."
      )
    );
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
      new File(["bad"], "foto-rara.heic", { type: "image/heic" })
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
      error:
        "No pudimos procesar esta foto. Prueba con otra imagen o vuelve a exportarla desde tu celular.",
    });
  });
});
