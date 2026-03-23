import { createClient as createServerClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type AuthServerRepositoryDeps = {
  serverClientFactory?: () => Promise<ServerSupabaseClient>;
};

export interface AuthServerRepository {
  exchangeCodeForSession(code: string): Promise<void>;
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
    },
  };
}

export const authServerRepository = createAuthServerRepository();
