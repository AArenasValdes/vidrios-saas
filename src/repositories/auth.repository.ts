import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { AuthProfile, AuthSignInInput } from "@/types/auth";
import type { User } from "@supabase/supabase-js";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

type AuthRepositoryDeps = {
  browserClientFactory?: () => BrowserSupabaseClient;
};

type PerfilRow = {
  organization_id: string | number | null;
  rol: string | null;
};

const AUTH_PROFILE_STORAGE_PREFIX = "vidrios-saas:auth-profile:";

function getAuthProfileStorageKey(email: string) {
  return `${AUTH_PROFILE_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readAuthProfileFromStorage(email: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getAuthProfileStorageKey(email));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthProfile;
  } catch {
    return null;
  }
}

function persistAuthProfile(email: string, profile: AuthProfile) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getAuthProfileStorageKey(email),
      JSON.stringify(profile)
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
/*Permisos*/
export interface AuthRepository {
  getAuthenticatedUser(): Promise<User | null>;
  getUserProfile(email: string): Promise<AuthProfile | null>;
  signInWithPassword(credentials: AuthSignInInput): Promise<void>;
  signOut(): Promise<void>;
  subscribeToAuthStateChange(listener: () => void): () => void;
}

export function createAuthRepository(
  deps: AuthRepositoryDeps = {}
): AuthRepository {
  const browserClientFactory = deps.browserClientFactory ?? createBrowserClient;

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

    async getUserProfile(email) {
      const cachedProfile = readAuthProfileFromStorage(email);

      if (cachedProfile) {
        return cachedProfile;
      }

      const supabase = browserClientFactory();
      try {
        const { data, error } = await supabase
          .from("users")
          .select("organization_id, rol")
          .ilike("correo", email.trim().toLowerCase())
          .is("eliminado_en", null)
          .maybeSingle();

        if (error) {
          if (isConnectivityError(error)) {
            return null;
          }

          throw error;
        }

        const perfil = data as PerfilRow | null;

        if (!perfil) {
          return null;
        }

        const profile = {
          organizacionId: perfil.organization_id,
          rol: perfil.rol,
        };

        persistAuthProfile(email, profile);

        return profile;
      } catch (error) {
        if (isConnectivityError(error)) {
          return null;
        }

        throw error;
      }
    },

    async signInWithPassword(credentials) {
      const supabase = browserClientFactory();
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw error;
      }
    },

    async signOut() {
      const supabase = browserClientFactory();
      clearAuthRepositoryStorage();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },

    subscribeToAuthStateChange(listener) {
      const supabase = browserClientFactory();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        listener();
      });

      return () => subscription.unsubscribe();
    },
  };
}

export const authRepository = createAuthRepository();
