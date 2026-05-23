import {
  authRepository,
  type AuthRepository,
} from "@/features/auth/repositories/auth.repository";
import { GET_ORG_ID_PERMISSION_ERROR_MESSAGE } from "@/features/auth/services/auth-login-error.service";
import type {
  AuthProfileLookupOptions,
  AuthSignInInput,
  AuthSessionChangePayload,
  AuthenticatedUser,
} from "@/features/auth/types/auth";

type AuthServiceDeps = {
  repository?: AuthRepository;
  bootstrapRetryCount?: number;
  bootstrapRetryDelayMs?: number;
};

const DEFAULT_BOOTSTRAP_RETRY_COUNT = 5;
const DEFAULT_BOOTSTRAP_RETRY_DELAY_MS = 300;
const AUTH_PROFILE_BOOTSTRAP_LOOKUP_OPTIONS: AuthProfileLookupOptions = {
  preferServerLookup: false,
  retryServerOnUnauthorized: true,
};
const DEFAULT_AUTH_BOOTSTRAP_LOOKUP_OPTIONS: AuthProfileLookupOptions = {
  preferServerLookup: true,
  retryServerOnUnauthorized: true,
};

function wait(delayMs: number) {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  return [candidate.code, candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isGetOrgIdPermissionError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    haystack.includes("get_org_id") &&
    (haystack.includes("permission denied") || haystack.includes("42501"))
  );
}

function buildProfileLookupOptions(options?: AuthProfileLookupOptions) {
  if (
    !options?.accessToken &&
    options?.preferServerLookup !== true &&
    options?.retryServerOnUnauthorized !== true
  ) {
    return undefined;
  }

  return {
    accessToken: options.accessToken,
    preferServerLookup: options.preferServerLookup,
    retryServerOnUnauthorized: options.retryServerOnUnauthorized,
  } satisfies AuthProfileLookupOptions;
}

export function createAuthService(deps: AuthServiceDeps = {}) {
  const repository = deps.repository ?? authRepository;
  const bootstrapRetryCount =
    deps.bootstrapRetryCount ?? DEFAULT_BOOTSTRAP_RETRY_COUNT;
  const bootstrapRetryDelayMs =
    deps.bootstrapRetryDelayMs ?? DEFAULT_BOOTSTRAP_RETRY_DELAY_MS;

  async function resolveAuthenticatedState(
    user: NonNullable<AuthenticatedUser["user"]>,
    options?: AuthProfileLookupOptions & {
      throwOnMissingOrganization?: boolean;
    }
  ): Promise<AuthenticatedUser> {
    const profileIdentity = {
      authUserId: user.id,
      email: user.email,
    };
    let lastState: AuthenticatedUser = {
      user,
      organizacionId: null,
      rol: null,
    };

    for (let attempt = 0; attempt <= bootstrapRetryCount; attempt += 1) {
      let perfil;

      try {
        const profileLookupOptions = buildProfileLookupOptions(options);
        perfil = profileLookupOptions
          ? await repository.getUserProfile(profileIdentity, profileLookupOptions)
          : await repository.getUserProfile(profileIdentity);
      } catch (error) {
        if (isGetOrgIdPermissionError(error)) {
          throw new Error(GET_ORG_ID_PERMISSION_ERROR_MESSAGE);
        }

        throw error;
      }

      lastState = {
        user,
        organizacionId: perfil?.organizacionId ?? null,
        rol: perfil?.rol ?? null,
      };

      const needsRetry =
        attempt < bootstrapRetryCount && !lastState.organizacionId;

      if (!needsRetry) {
        break;
      }

      await wait(bootstrapRetryDelayMs);
    }

    if (lastState.organizacionId) {
      return lastState;
    }

    if (options?.accessToken) {
      try {
        const fallbackProfile = await repository.getUserProfile(profileIdentity, {
          ...AUTH_PROFILE_BOOTSTRAP_LOOKUP_OPTIONS,
          accessToken: options.accessToken,
        });

        if (fallbackProfile?.organizacionId) {
          return {
            user,
            organizacionId: fallbackProfile.organizacionId,
            rol: fallbackProfile.rol,
          };
        }
      } catch (error) {
        if (isGetOrgIdPermissionError(error)) {
          throw new Error(GET_ORG_ID_PERMISSION_ERROR_MESSAGE);
        }

        throw error;
      }
    }

    await repository.signOut({
      scope: "local",
    });

    if (options?.throwOnMissingOrganization) {
      throw new Error(
        "Tu usuario existe, pero no esta vinculado a una empresa en Ventora."
      );
    }

    return {
      user: null,
      organizacionId: null,
      rol: null,
    };
  }

  return {
    async getCurrentAuthState(
      options: AuthProfileLookupOptions = {}
    ): Promise<AuthenticatedUser> {
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

      return resolveAuthenticatedState(user, {
        ...DEFAULT_AUTH_BOOTSTRAP_LOOKUP_OPTIONS,
        ...options,
      });
    },

    async signIn(credentials: AuthSignInInput) {
      const email = credentials.email.trim().toLowerCase();

      if (!email) {
        throw new Error("El correo es obligatorio");
      }

      if (!credentials.password.trim()) {
        throw new Error("La contrasena es obligatoria");
      }

      try {
        await repository.signOut({
          scope: "local",
        });
      } catch {
        // Si no habia sesion previa o el cliente tiene estado viejo, igual seguimos con el login nuevo.
      }

      const authenticatedUser = await repository.signInWithPassword({
        email,
        password: credentials.password,
      });

      if (!authenticatedUser.user.email) {
        await repository.signOut({
          scope: "local",
        });
        throw new Error("El usuario autenticado no tiene correo");
      }

      return resolveAuthenticatedState(authenticatedUser.user, {
        accessToken: authenticatedUser.accessToken,
        preferServerLookup: true,
        retryServerOnUnauthorized: true,
        throwOnMissingOrganization: true,
      });
    },

    async signOut() {
      await repository.signOut({
        scope: "local",
      });
    },

    subscribeToAuthChanges(listener: (payload: AuthSessionChangePayload) => void) {
      return repository.subscribeToAuthStateChange(listener);
    },
  };
}

export const authService = createAuthService();
export { GET_ORG_ID_PERMISSION_ERROR_MESSAGE };
