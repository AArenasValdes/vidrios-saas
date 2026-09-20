import { createClient as createServerClient } from "@/lib/supabase/server";
import type { EmailOtpType, Session, User } from "@supabase/supabase-js";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type AuthServerRepositoryDeps = {
  serverClientFactory?: () => Promise<ServerSupabaseClient>;
};

export interface AuthServerRepository {
  exchangeCodeForSession(code: string): Promise<{
    user: User;
    session: Session;
  }>;
  verifyTokenHash(
    tokenHash: string,
    type: EmailOtpType
  ): Promise<{
    user: User;
    session: Session;
  }>;
}

export function createAuthServerRepository(
  deps: AuthServerRepositoryDeps = {}
): AuthServerRepository {
  const serverClientFactory = deps.serverClientFactory ?? createServerClient;

  async function resolveVerifiedSession(
    supabase: ServerSupabaseClient,
    session: Session | null,
    missingSessionMessage: string
  ) {
    if (!session) {
      throw new Error(missingSessionMessage);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw userError ?? new Error("No pudimos validar la sesion.");
    }

    if (!user.email) {
      throw new Error("La cuenta verificada no tiene correo disponible.");
    }

    return {
      user,
      session,
    };
  }

  return {
    async exchangeCodeForSession(code) {
      const supabase = await serverClientFactory();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }

      return resolveVerifiedSession(
        supabase,
        data.session,
        "No pudimos crear la sesion de Google."
      );
    },
    async verifyTokenHash(tokenHash, type) {
      const supabase = await serverClientFactory();
      const { data, error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

      if (error) {
        throw error;
      }

      return resolveVerifiedSession(
        supabase,
        data.session,
        "No pudimos confirmar el enlace de activacion."
      );
    },
  };
}

export const authServerRepository = createAuthServerRepository();
