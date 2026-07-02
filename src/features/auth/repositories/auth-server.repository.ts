import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Session, User } from "@supabase/supabase-js";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type AuthServerRepositoryDeps = {
  serverClientFactory?: () => Promise<ServerSupabaseClient>;
};

export interface AuthServerRepository {
  exchangeCodeForSession(code: string): Promise<{
    user: User;
    session: Session;
  }>;
}

export function createAuthServerRepository(
  deps: AuthServerRepositoryDeps = {}
): AuthServerRepository {
  const serverClientFactory = deps.serverClientFactory ?? createServerClient;

  return {
    async exchangeCodeForSession(code) {
      const supabase = await serverClientFactory();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("No pudimos crear la sesion de Google.");
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

      return {
        user,
        session: data.session,
      };
    },
  };
}

export const authServerRepository = createAuthServerRepository();
