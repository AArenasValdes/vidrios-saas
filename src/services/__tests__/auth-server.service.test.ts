import { createAuthServerService } from "../auth-server.service";
import type { AuthServerRepository } from "@/repositories/auth-server.repository";

function createRepositoryMock(): jest.Mocked<AuthServerRepository> {
  return {
    exchangeCodeForSession: jest.fn(),
  };
}

describe("authServerService", () => {
  it("debe normalizar el codigo antes de intercambiar la sesion", async () => {
    const repository = createRepositoryMock();
    repository.exchangeCodeForSession.mockResolvedValue();

    const service = createAuthServerService({ repository });

    await service.exchangeCodeForSession("  oauth-code  ");

    expect(repository.exchangeCodeForSession).toHaveBeenCalledWith(
      "oauth-code"
    );
  });

  it("debe lanzar error si el codigo viene vacio", async () => {
    const repository = createRepositoryMock();
    const service = createAuthServerService({ repository });

    await expect(service.exchangeCodeForSession("   ")).rejects.toThrow(
      "El codigo de autenticacion es obligatorio"
    );
  });

  it("debe propagar errores del repository", async () => {
    const repository = createRepositoryMock();
    repository.exchangeCodeForSession.mockRejectedValue(
      new Error("oauth fallo")
    );

    const service = createAuthServerService({ repository });

    await expect(service.exchangeCodeForSession("codigo")).rejects.toThrow(
      "oauth fallo"
    );
  });
});
