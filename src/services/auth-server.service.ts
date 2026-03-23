import {
  authServerRepository,
  type AuthServerRepository,
} from "@/repositories/auth-server.repository";

type AuthServerServiceDeps = {
  repository?: AuthServerRepository;
};

export function createAuthServerService(
  deps: AuthServerServiceDeps = {}
) {
  const repository = deps.repository ?? authServerRepository;

  return {
    async exchangeCodeForSession(code: string) {
      const normalizedCode = code.trim();

      if (!normalizedCode) {
        throw new Error("El codigo de autenticacion es obligatorio");
      }

      await repository.exchangeCodeForSession(normalizedCode);
    },
  };
}

export const authServerService = createAuthServerService();
