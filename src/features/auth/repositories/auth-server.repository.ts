import { createClient as createServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type AuthServerRepositoryDeps = {
  serverClientFactory?: () => Promise<ServerSupabaseClient>;
};

export interface AuthServerRepository {
  exchangeCodeForSession(code: string): Promise<User>;
}

export function createAuthServerRepository(
  deps: AuthServerRepositoryDeps = {}
): AuthServerRepository {
  const serverClientFactory = deps.serverClientFactory ?? createServerClient;

  return {
    async exchangeCodeForSession(code) {
      const supabase = await serverClientFactory();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("No pudimos validar la sesion de Google.");
      }

      if (!user.email) {
        throw new Error("Tu cuenta de Google no tiene correo disponible.");
      }

      return user;
    },
  };
}

export const authServerRepository = createAuthServerRepository();
