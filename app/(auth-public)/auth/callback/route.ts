import {
  authServerService,
  resolveOAuthProvider,
} from "@/features/auth/services/auth-server.service";
import { sanitizeAuthNextPath } from "@/features/auth/services/auth-safe-redirect.service";
import type { AuthOAuthIntent } from "@/features/auth/types/auth";
import { NextResponse } from "next/server";

function resolveIntent(value: string | null): AuthOAuthIntent {
  return value === "signup" ? "signup" : "login";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intent = resolveIntent(searchParams.get("intent"));
  const provider = resolveOAuthProvider(searchParams.get("provider"));
  const nextPath = sanitizeAuthNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  try {
    const resolution = await authServerService.handleOAuthCallback({
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

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
