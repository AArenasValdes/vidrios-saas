import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { buildOAuthCallbackUrl } from "@/features/auth/services/auth-safe-redirect.service";
import type {
  AuthProfile,
  AuthProfileLookupOptions,
  AuthSessionChangePayload,
  AuthSignInInput,
  AuthSignInResult,
  AuthSignInWithOAuthInput,
  AuthSignOutOptions,
} from "@/features/auth/types/auth";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

type AuthRepositoryDeps = {
  browserClientFactory?: () => BrowserSupabaseClient;
};

type PerfilRow = {
  organization_id: string | number | null;
  rol: string | null;
};

type AuthProfileIdentity = {
  authUserId?: string | null;
  email?: string | null;
};

const AUTH_PROFILE_STORAGE_PREFIX = "vidrios-saas:auth-profile:";
const AUTH_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedAuthProfile = AuthProfile & {
  _cachedAt: number;
};

type ServerAuthProfileResponse = {
  profile:
    | {
        organizacionId: string | number | null;
        rol: string | null;
      }
    | null;
};

type ServerProfileFetchStatus =
  | "ok"
  | "not_found"
  | "unauthorized"
  | "unavailable";

type ServerProfileFetchResult = {
  profile: AuthProfile | null;
  status: ServerProfileFetchStatus;
};

function buildAuthProfileCacheKey(identity: AuthProfileIdentity) {
  if (identity.authUserId?.trim()) {
    return `auth-user:${identity.authUserId.trim()}`;
  }

  const normalizedEmail = identity.email?.trim().toLowerCase() ?? "";

  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  return null;
}

function getAuthProfileStorageKey(cacheKey: string) {
  return `${AUTH_PROFILE_STORAGE_PREFIX}${cacheKey}`;
}

function readAuthProfileFromStorage(cacheKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getAuthProfileStorageKey(cacheKey));

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedAuthProfile;

    if (Date.now() - (cached._cachedAt ?? 0) > AUTH_PROFILE_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(getAuthProfileStorageKey(cacheKey));
      return null;
    }

    const { _cachedAt, ...profile } = cached;
    void _cachedAt;
    return profile as AuthProfile;
  } catch {
    return null;
  }
}

function persistAuthProfile(cacheKey: string, profile: AuthProfile) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cached: CachedAuthProfile = {
      ...profile,
      _cachedAt: Date.now(),
    };

    window.sessionStorage.setItem(
      getAuthProfileStorageKey(cacheKey),
      JSON.stringify(cached)
    );
  } catch {
    return;
  }
}

function clearAuthRepositoryStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);

      if (key?.startsWith(AUTH_PROFILE_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    return;
  }
}

function isConnectivityError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    message?: string;
    name?: string;
    status?: number;
  };
  const haystack = [candidate.name, candidate.message, String(candidate.status ?? "")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("failed to fetch") ||
    haystack.includes("fetch") ||
    haystack.includes("network") ||
    haystack.includes("internet_disconnected")
  );
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
    status?: number;
    name?: string;
  };

  return [
    candidate.code,
    candidate.message,
    candidate.details,
    candidate.hint,
    candidate.name,
    String(candidate.status ?? ""),
  ]
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

function wait(delayMs: number) {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function resolveAccessToken(
  supabase: BrowserSupabaseClient,
  accessToken?: string | null
) {
  if (accessToken?.trim()) {
    return accessToken.trim();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export interface AuthRepository {
  getAuthenticatedUser(): Promise<User | null>;
  getUserProfile(
    identity: AuthProfileIdentity,
    options?: AuthProfileLookupOptions
  ): Promise<AuthProfile | null>;
  signInWithPassword(credentials: AuthSignInInput): Promise<AuthSignInResult>;
  signInWithOAuth(input: AuthSignInWithOAuthInput): Promise<void>;
  signOut(options?: AuthSignOutOptions): Promise<void>;
  subscribeToAuthStateChange(
    listener: (payload: AuthSessionChangePayload) => void
  ): () => void;
}

export function createAuthRepository(
  deps: AuthRepositoryDeps = {}
): AuthRepository {
  const browserClientFactory = deps.browserClientFactory ?? createBrowserClient;

  async function getUserProfileFromServer(
    supabase: BrowserSupabaseClient,
    cacheKey: string,
    options: {
      accessToken?: string | null;
      retryOnUnauthorized?: boolean;
    } = {}
  ): Promise<ServerProfileFetchResult> {
    try {
      const accessToken = await resolveAccessToken(supabase, options.accessToken);

      if (!accessToken) {
        return {
          profile: null,
          status: "unavailable",
        };
      }

      const fetchProfile = async () => {
        const response = await fetch("/api/auth/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.status === 401) {
          return {
            profile: null,
            status: "unauthorized" as const,
          };
        }

        if (!response.ok) {
          return {
            profile: null,
            status: "unavailable" as const,
          };
        }

        const payload = (await response.json()) as ServerAuthProfileResponse;
        const profile = payload.profile;

        if (!profile?.organizacionId) {
          return {
            profile: null,
            status: "not_found" as const,
          };
        }

        persistAuthProfile(cacheKey, profile);

        return {
          profile,
          status: "ok" as const,
        };
      };

      let result = await fetchProfile();

      if (result.status === "unauthorized" && options.retryOnUnauthorized) {
        await wait(150);
        result = await fetchProfile();
      }

      return result;
    } catch (error) {
      if (isConnectivityError(error)) {
        return {
          profile: null,
          status: "unavailable",
        };
      }

      return {
        profile: null,
        status: "unavailable",
      };
    }
  }

  return {
    async getAuthenticatedUser() {
      const supabase = browserClientFactory();
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          return session.user;
        }

        const { data, error } = await supabase.auth.getUser();

        if (error) {
          if (isConnectivityError(error)) {
            return null;
          }

          throw error;
        }

        return data.user;
      } catch (error) {
        if (isConnectivityError(error)) {
          return null;
        }

        throw error;
      }
    },

    async getUserProfile(identity, options = {}) {
      const cacheKey = buildAuthProfileCacheKey(identity);
      const normalizedAuthUserId = identity.authUserId?.trim() ?? "";
      const normalizedEmail = identity.email?.trim().toLowerCase() ?? "";

      if (!cacheKey) {
        return null;
      }

      const cachedProfile = readAuthProfileFromStorage(cacheKey);

      if (cachedProfile) {
        return cachedProfile;
      }

      const supabase = browserClientFactory();
      const shouldPreferServerLookup =
        options.preferServerLookup === true || Boolean(options.accessToken);
      const serverProfileResult = await getUserProfileFromServer(supabase, cacheKey, {
        accessToken: options.accessToken,
        retryOnUnauthorized: options.retryServerOnUnauthorized,
      });

      if (serverProfileResult.profile) {
        return serverProfileResult.profile;
      }

      if (shouldPreferServerLookup) {
        return null;
      }

      try {
        let data: PerfilRow | null = null;
        let error: unknown = null;

        if (normalizedAuthUserId) {
          const authUserLookup = await supabase
            .from("users")
            .select("organization_id, rol")
            .eq("auth_user_id", normalizedAuthUserId)
            .is("eliminado_en", null)
            .maybeSingle();

          data = (authUserLookup.data as PerfilRow | null) ?? null;
          error = authUserLookup.error;
        }

        if (!data && !error && normalizedEmail) {
          const emailLookup = await supabase
            .from("users")
            .select("organization_id, rol")
            .ilike("correo", normalizedEmail)
            .is("eliminado_en", null)
            .maybeSingle();

          data = (emailLookup.data as PerfilRow | null) ?? null;
          error = emailLookup.error;
        }

        if (error) {
          if (isConnectivityError(error)) {
            return null;
          }

          throw error;
        }

        const perfil = data as PerfilRow | null;

        if (!perfil) {
          const fallbackResult = await getUserProfileFromServer(supabase, cacheKey);
          return fallbackResult.profile;
        }

        const profile = {
          organizacionId: perfil.organization_id,
          rol: perfil.rol,
        };

        persistAuthProfile(cacheKey, profile);

        return profile;
      } catch (error) {
        if (isGetOrgIdPermissionError(error)) {
          return null;
        }

        if (isConnectivityError(error)) {
          return null;
        }

        throw error;
      }
    },

    async signInWithOAuth(input) {
      const supabase = browserClientFactory();
      const origin =
        input.origin?.trim() ||
        (typeof window !== "undefined" ? window.location.origin : "");

      if (!origin) {
        throw new Error("No pudimos iniciar el acceso social.");
      }

      const oauthOptions =
        input.provider === "google"
          ? {
              queryParams: {
                prompt: "select_account",
              },
            }
          : {
              scopes: "email public_profile",
            };

      const { error } = await supabase.auth.signInWithOAuth({
        provider: input.provider,
        options: {
          redirectTo: buildOAuthCallbackUrl({
            origin,
            intent: input.intent,
            provider: input.provider,
            nextPath: input.nextPath,
          }),
          ...oauthOptions,
        },
      });

      if (error) {
        throw error;
      }
    },

    async signInWithPassword(credentials) {
      const supabase = browserClientFactory();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("No pudimos abrir la sesion.");
      }

      if (!data.session?.access_token) {
        throw new Error("No pudimos confirmar la sesion nueva.");
      }

      return {
        user: data.user,
        session: data.session,
        accessToken: data.session.access_token,
      };
    },

    async signOut(options) {
      const supabase = browserClientFactory();
      clearAuthRepositoryStorage();
      const { error } = await supabase.auth.signOut({
        scope: options?.scope ?? "global",
      });

      if (error) {
        throw error;
      }
    },

    subscribeToAuthStateChange(listener) {
      const supabase = browserClientFactory();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((
        event: AuthChangeEvent,
        session: Session | null
      ) => {
        listener({
          event,
          session,
        });
      });

      return () => subscription.unsubscribe();
    },
  };
}

export const authRepository = createAuthRepository();
