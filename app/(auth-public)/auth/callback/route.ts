import {
  createAuthServerService,
  resolveOAuthProvider,
} from "@/features/auth/services/auth-server.service";
import { createAuthServerRepository } from "@/features/auth/repositories/auth-server.repository";
import { sanitizeAuthNextPath } from "@/features/auth/services/auth-safe-redirect.service";
import type { AuthOAuthIntent } from "@/features/auth/types/auth";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptionsWithName;
};

function resolveIntent(value: string | null): AuthOAuthIntent {
  return value === "signup" ? "signup" : "login";
}

function createOAuthCallbackRepository(
  request: NextRequest,
  cookiesToSet: CookieToSet[]
) {
  return createAuthServerRepository({
    serverClientFactory: async () =>
      createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: getSupabaseCookieOptions(request.nextUrl.hostname),
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(nextCookiesToSet) {
              nextCookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set(name, value);
                cookiesToSet.push({ name, value, options });
              });
            },
          },
        }
      ),
  });
}

function applySessionCookies(response: NextResponse, cookiesToSet: CookieToSet[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const intent = resolveIntent(searchParams.get("intent"));
  const provider = resolveOAuthProvider(searchParams.get("provider"));
  const nextPath = sanitizeAuthNextPath(searchParams.get("next"));

  if (!provider) {
    return NextResponse.redirect(`${origin}/login?error=oauth_provider`);
  }

  // #region agent log
  fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e60979",
    },
    body: JSON.stringify({
      sessionId: "e60979",
      hypothesisId: "C",
      location: "auth/callback/route.ts:GET",
      message: "Auth callback received",
      data: {
        hasCode: Boolean(code?.trim()),
        hasTokenHash: Boolean(tokenHash?.trim()),
        otpType: otpType ?? null,
        intent,
        provider,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  try {
    const cookiesToSet: CookieToSet[] = [];
    const service = createAuthServerService({
      repository: createOAuthCallbackRepository(request, cookiesToSet),
    });
    const resolution = await service.handleOAuthCallback({
      code,
      tokenHash,
      otpType,
      intent,
      provider,
      nextPath,
    });

    const redirectUrl = new URL(resolution.path, origin);

    if (resolution.kind === "redirect" && resolution.analytics) {
      redirectUrl.searchParams.set("oauth_event", resolution.analytics.event);
      redirectUrl.searchParams.set("oauth_provider", resolution.analytics.provider);
    }

    if (resolution.kind === "error_redirect") {
      const event =
        resolution.analytics?.event ??
        `${provider}_oauth_returned`;
      redirectUrl.searchParams.set("oauth_event", event);
      redirectUrl.searchParams.set("oauth_provider", provider);
    }

    return applySessionCookies(
      NextResponse.redirect(redirectUrl),
      cookiesToSet
    );
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "e60979",
      },
      body: JSON.stringify({
        sessionId: "e60979",
        hypothesisId: "C",
        location: "auth/callback/route.ts:GET:catch",
        message: "Auth callback failed before provision",
        data: {
          hasCode: Boolean(code?.trim()),
          hasTokenHash: Boolean(tokenHash?.trim()),
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage:
            error instanceof Error ? error.message.slice(0, 180) : "unknown",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
