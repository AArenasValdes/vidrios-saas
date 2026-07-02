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
  const intent = resolveIntent(searchParams.get("intent"));
  const provider = resolveOAuthProvider(searchParams.get("provider"));
  const nextPath = sanitizeAuthNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  try {
    const cookiesToSet: CookieToSet[] = [];
    const service = createAuthServerService({
      repository: createOAuthCallbackRepository(request, cookiesToSet),
    });
    const resolution = await service.handleOAuthCallback({
      code,
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

    return applySessionCookies(NextResponse.redirect(redirectUrl), cookiesToSet);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
