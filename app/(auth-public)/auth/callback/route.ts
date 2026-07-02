import {
  createAuthServerService,
  resolveOAuthProvider,
} from "@/features/auth/services/auth-server.service";
import { createAuthServerRepository } from "@/features/auth/repositories/auth-server.repository";
import { sanitizeAuthNextPath } from "@/features/auth/services/auth-safe-redirect.service";
import type { AuthOAuthIntent } from "@/features/auth/types/auth";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
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

function getSupabaseAuthCookieName() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function chunkCookieValue(name: string, value: string, chunkSize = 3180) {
  const encodedValue = encodeURIComponent(value);

  if (encodedValue.length <= chunkSize) {
    return [{ name, value }];
  }

  const chunks: Array<{ name: string; value: string }> = [];
  let remaining = encodedValue;

  while (remaining.length > 0) {
    let encodedChunk = remaining.slice(0, chunkSize);
    const lastEscapePosition = encodedChunk.lastIndexOf("%");

    if (lastEscapePosition > chunkSize - 3) {
      encodedChunk = encodedChunk.slice(0, lastEscapePosition);
    }

    const decodedChunk = decodeURIComponent(encodedChunk);
    chunks.push({
      name: `${name}.${chunks.length}`,
      value: decodedChunk,
    });
    remaining = remaining.slice(encodedChunk.length);
  }

  return chunks;
}

function applySessionCookieFromOAuthResponse(
  response: NextResponse,
  request: NextRequest,
  session: Session
) {
  const cookieName = getSupabaseAuthCookieName();

  if (!cookieName) {
    return response;
  }

  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: false,
    maxAge: 400 * 24 * 60 * 60,
    ...getSupabaseCookieOptions(request.nextUrl.hostname),
  };
  const cookieValue = `base64-${toBase64Url(JSON.stringify(session))}`;
  const chunks = chunkCookieValue(cookieName, cookieValue);

  response.cookies.set(cookieName, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  for (let index = 0; index < 8; index += 1) {
    response.cookies.set(`${cookieName}.${index}`, "", {
      ...cookieOptions,
      maxAge: 0,
    });
  }

  chunks.forEach((chunk) => {
    response.cookies.set(chunk.name, chunk.value, cookieOptions);
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

    const response = applySessionCookies(
      NextResponse.redirect(redirectUrl),
      cookiesToSet
    );

    if (resolution.kind === "redirect") {
      return applySessionCookieFromOAuthResponse(
        response,
        request,
        resolution.session
      );
    }

    return response;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
