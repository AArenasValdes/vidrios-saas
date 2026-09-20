import {
  authServerRepository,
  type AuthServerRepository,
} from "@/features/auth/repositories/auth-server.repository";
import {
  provisionOrganizationFromOAuthUser,
  resolveOAuthIdentity,
  type OAuthIdentityResolution,
} from "@/features/auth/services/auth-oauth-completion.service";
import { readPendingEmailSignup } from "@/features/auth/services/auth-pending-email-signup.service";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  buildOAuthAnalyticsEvent,
  resolveOAuthProvider,
} from "@/features/auth/services/auth-oauth-analytics.service";
import { sanitizeAuthNextPath } from "@/features/auth/services/auth-safe-redirect.service";
import type { AuthCallbackProvider, AuthOAuthIntent } from "@/features/auth/types/auth";
import type { OAuthAnalyticsEvent } from "@/features/auth/services/auth-oauth-analytics.service";
import type { Session } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/features/auth/services/auth-welcome-email.service";
import { seedDefaultLineCatalogServer } from "@/features/cotizaciones/line-templates/services/seed-line-catalog-server";

type AuthServerServiceDeps = {
  repository?: AuthServerRepository;
};

export type OAuthCallbackResolution =
  | {
      kind: "redirect";
      path: string;
      analytics: {
        event: OAuthAnalyticsEvent;
        provider: AuthCallbackProvider;
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
        provider: AuthCallbackProvider;
        intent: AuthOAuthIntent;
      };
    };

export function createAuthServerService(
  deps: AuthServerServiceDeps = {}
) {
  const repository = deps.repository ?? authServerRepository;

  return {
    async handleOAuthCallback(input: {
      code?: string | null;
      tokenHash?: string | null;
      otpType?: string | null;
      intent: AuthOAuthIntent;
      provider: AuthCallbackProvider;
      nextPath?: string | null;
    }): Promise<OAuthCallbackResolution> {
      const normalizedCode = input.code?.trim() ?? "";
      const normalizedTokenHash = input.tokenHash?.trim() ?? "";
      const safeNext = sanitizeAuthNextPath(input.nextPath);
      const intent = input.intent === "signup" ? "signup" : "login";
      const provider = input.provider;

      if (!normalizedCode && !normalizedTokenHash) {
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

      const { user, session } = normalizedTokenHash
        ? await repository.verifyTokenHash(
            normalizedTokenHash,
            resolveEmailOtpType(input.otpType, intent)
          )
        : await repository.exchangeCodeForSession(normalizedCode);

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

      let identity = await resolveOAuthIdentity(
        {
          authUserId: user.id,
          email: user.email,
        },
        {
          accessToken: session.access_token,
        }
      );

      if (
        provider === "email" &&
        identity.status === "needs_signup"
      ) {
        const pending = readPendingEmailSignup(user.user_metadata);

        if (pending) {
          const provisioned = await provisionOrganizationFromOAuthUser({
            authUserId: user.id,
            email: user.email,
            ...pending,
          });

          identity = {
            status: "linked",
            organizationId: provisioned.organizationId,
            userId: provisioned.userId,
            syncedAuthUserId: false,
            accountComplete: provisioned.accountComplete,
          };

          if (!provisioned.alreadyProvisioned) {
            await seedDefaultLineCatalogServer(provisioned.organizationId).catch(() => undefined);

            await sendWelcomeEmail({
              to: user.email,
              nombre: pending.nombre,
              empresaNombre: provisioned.empresaNombre,
              trialEndsAt: provisioned.trialEndsAt,
            });
          }
        }
      }

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
  provider: AuthCallbackProvider;
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

const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const satisfies readonly EmailOtpType[];

function resolveEmailOtpType(
  value: string | null | undefined,
  intent: AuthOAuthIntent
): EmailOtpType {
  const normalized = value?.trim().toLowerCase() ?? "";
  if ((EMAIL_OTP_TYPES as readonly string[]).includes(normalized)) {
    return normalized as EmailOtpType;
  }

  return intent === "signup" ? "signup" : "email";
}

export { resolveOAuthProvider };

export const authServerService = createAuthServerService();
