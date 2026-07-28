import {
  authServerRepository,
  type AuthServerRepository,
} from "@/features/auth/repositories/auth-server.repository";
import {
  resolveOAuthIdentity,
  type OAuthIdentityResolution,
} from "@/features/auth/services/auth-oauth-completion.service";
import {
  buildOAuthAnalyticsEvent,
  resolveOAuthProvider,
} from "@/features/auth/services/auth-oauth-analytics.service";
import { sanitizeAuthNextPath } from "@/features/auth/services/auth-safe-redirect.service";
import type { AuthOAuthIntent, AuthOAuthProvider } from "@/features/auth/types/auth";
import type { OAuthAnalyticsEvent } from "@/features/auth/services/auth-oauth-analytics.service";
import type { Session } from "@supabase/supabase-js";

type AuthServerServiceDeps = {
  repository?: AuthServerRepository;
};

export type OAuthCallbackResolution =
  | {
      kind: "redirect";
      path: string;
      analytics: {
        event: OAuthAnalyticsEvent;
        provider: AuthOAuthProvider;
        intent: AuthOAuthIntent;
        syncedAuthUserId: boolean;
      };
      session: Session;
    }
  | {
      kind: "error_redirect";
      path: string;
      analytics?: {
        event: OAuthAnalyticsEvent;
        provider: AuthOAuthProvider;
        intent: AuthOAuthIntent;
      };
    };

export function createAuthServerService(
  deps: AuthServerServiceDeps = {}
) {
  const repository = deps.repository ?? authServerRepository;

  return {
    async handleOAuthCallback(input: {
      code: string;
      intent: AuthOAuthIntent;
      provider: AuthOAuthProvider;
      nextPath?: string | null;
    }): Promise<OAuthCallbackResolution> {
      const normalizedCode = input.code.trim();
      const safeNext = sanitizeAuthNextPath(input.nextPath);
      const intent = input.intent === "signup" ? "signup" : "login";
      const provider = input.provider;

      if (!normalizedCode) {
        return {
          kind: "error_redirect",
          path: "/login?error=oauth",
          analytics: {
            event: buildOAuthAnalyticsEvent(provider, "returned"),
            provider,
            intent,
          },
        };
      }

      const { user, session } = await repository.exchangeCodeForSession(normalizedCode);

      if (!user.email?.trim()) {
        return {
          kind: "error_redirect",
          path: "/login?error=oauth_no_email",
          analytics: {
            event: buildOAuthAnalyticsEvent(provider, "returned"),
            provider,
            intent,
          },
        };
      }

      const identity = await resolveOAuthIdentity({
        authUserId: user.id,
        email: user.email,
      });

      return mapIdentityToCallbackResolution({
        identity,
        intent,
        provider,
        safeNext,
        session,
      });
    },
  };
}

function mapIdentityToCallbackResolution(input: {
  identity: OAuthIdentityResolution;
  intent: AuthOAuthIntent;
  provider: AuthOAuthProvider;
  safeNext: string;
  session: Session;
}): OAuthCallbackResolution {
  if (input.identity.status === "identity_conflict") {
    return {
      kind: "error_redirect",
      path: "/login?error=identity_conflict",
      analytics: {
        event: buildOAuthAnalyticsEvent(input.provider, "returned"),
        provider: input.provider,
        intent: input.intent,
      },
    };
  }

  if (
    input.identity.status === "linked" &&
    input.identity.accountComplete
  ) {
    return {
      kind: "redirect",
      path: input.safeNext,
      analytics: {
        event: buildOAuthAnalyticsEvent(input.provider, "existing_login"),
        provider: input.provider,
        intent: input.intent,
        syncedAuthUserId: input.identity.syncedAuthUserId,
      },
      session: input.session,
    };
  }

  const signupParams = new URLSearchParams({
    next: "/activacion",
  });

  return {
    kind: "redirect",
    path: `/auth/completar-cuenta?${signupParams.toString()}`,
    analytics: {
      event: buildOAuthAnalyticsEvent(input.provider, "signup_started"),
      provider: input.provider,
      intent: input.intent,
      syncedAuthUserId: false,
    },
    session: input.session,
  };
}

export { resolveOAuthProvider };

export const authServerService = createAuthServerService();
