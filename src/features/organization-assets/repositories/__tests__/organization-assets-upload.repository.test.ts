import { createOrganizationAssetsUploadRepository } from "../organization-assets-upload.repository";

describe("organization-assets-upload.repository", () => {
  it("sube el archivo contra la API interna con bearer token", async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "token-123",
        },
      },
    });
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        publicUrl: "https://cdn.example.com/3/hero/test.jpg",
      }),
    });

    const repository = createOrganizationAssetsUploadRepository({
      clientFactory: {
        auth: { getSession },
      } as never,
      fetchImpl: fetchImpl as typeof fetch,
    });

    const file = new File(["img"], "hero.jpg", { type: "image/jpeg" });
    const url = await repository.uploadAsset("hero", file);

    expect(url).toBe("https://cdn.example.com/3/hero/test.jpg");
    expect(getSession).toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/organization-assets/upload",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer token-123",
        },
      })
    );
  });

  it("lanza un error claro si no hay sesion activa", async () => {
    const repository = createOrganizationAssetsUploadRepository({
      clientFactory: {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: null,
            },
          }),
        },
      } as never,
      fetchImpl: jest.fn() as typeof fetch,
    });

    await expect(
      repository.uploadAsset(
        "gallery",
        new File(["img"], "foto.jpg", { type: "image/jpeg" })
      )
    ).rejects.toThrow(
      "Tu sesion vencio. Vuelve a iniciar sesion para subir archivos."
    );
  });
});
