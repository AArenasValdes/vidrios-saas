import {
  authRepository,
  type AuthRepository,
} from "@/repositories/auth.repository";
import type { AuthSignInInput, AuthenticatedUser } from "@/types/auth";

type AuthServiceDeps = {
  repository?: AuthRepository;
  bootstrapRetryCount?: number;
  bootstrapRetryDelayMs?: number;
};

const DEFAULT_BOOTSTRAP_RETRY_COUNT = 5;
const DEFAULT_BOOTSTRAP_RETRY_DELAY_MS = 300;

function wait(delayMs: number) {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export function createAuthService(deps: AuthServiceDeps = {}) {
  const repository = deps.repository ?? authRepository;
  const bootstrapRetryCount =
    deps.bootstrapRetryCount ?? DEFAULT_BOOTSTRAP_RETRY_COUNT;
  const bootstrapRetryDelayMs =
    deps.bootstrapRetryDelayMs ?? DEFAULT_BOOTSTRAP_RETRY_DELAY_MS;

  return {
    async getCurrentAuthState(): Promise<AuthenticatedUser> {
      const user = await repository.getAuthenticatedUser();

      if (!user) {
        return {
          user: null,
          organizacionId: null,
          rol: null,
        };
      }

      if (!user.email) {
        throw new Error("El usuario autenticado no tiene correo");
      }

      let lastState: AuthenticatedUser = {
        user,
        organizacionId: null,
        rol: null,
      };

      for (let attempt = 0; attempt <= bootstrapRetryCount; attempt += 1) {
        const perfil = await repository.getUserProfile(user.email);

        lastState = {
          user,
          organizacionId: perfil?.organizacionId ?? null,
          rol: perfil?.rol ?? null,
        };

        const needsRetry =
          attempt < bootstrapRetryCount && !lastState.organizacionId;

        if (!needsRetry) {
          return lastState;
        }

        await wait(bootstrapRetryDelayMs);
      }

      return lastState;
    },

    async signIn(credentials: AuthSignInInput) {
      const email = credentials.email.trim().toLowerCase();

      if (!email) {
        throw new Error("El correo es obligatorio");
      }

      if (!credentials.password.trim()) {
        throw new Error("La contrasena es obligatoria");
      }

      await repository.signInWithPassword({
        email,
        password: credentials.password,
      });
    },

    async signOut() {
      await repository.signOut();
    },

    subscribeToAuthChanges(listener: () => void) {
      return repository.subscribeToAuthStateChange(listener);
    },
  };
}

export const authService = createAuthService();
