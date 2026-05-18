import { createPublicLandingCacheRepository } from "../public-landing-cache.repository";

describe("publicLandingCacheRepository", () => {
  it("llama la ruta protegida con el bearer token actual", async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "token-123",
        },
      },
    });
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
    });

    const repository = createPublicLandingCacheRepository({
      clientFactory: {
        auth: {
          getSession,
        },
      } as never,
      fetchImpl: fetchImpl as never,
    });

    const result = await repository.revalidate();

    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("/api/public-landing/revalidate", {
      method: "POST",
      headers: {
        authorization: "Bearer token-123",
      },
    });
  });

  it("no intenta revalidar si la sesion ya no tiene access token", async () => {
    const fetchImpl = jest.fn();
    const repository = createPublicLandingCacheRepository({
      clientFactory: {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: null,
            },
          }),
        },
      } as never,
      fetchImpl: fetchImpl as never,
    });

    const result = await repository.revalidate();

    expect(result).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
