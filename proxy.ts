import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseCookieOptions,
  isSharedVentoraWebHost,
  LEGACY_SUPABASE_COOKIE_DOMAIN,
  SUPABASE_COOKIE_MIGRATION_MARKER,
} from "@/lib/supabase/cookie-options";
import { isFounderAdminEmail } from "@/features/admin/services/admin-access.service";
import { isGrowthOnlyUser } from "@/features/growth/services/growth-access.service";

const protectedPrefixes = [
  "/dashboard",
  "/admin",
  "/activacion",
  "/clientes",
  "/cotizaciones",
  "/solicitudes",
  "/configuracion",
  "/cuenta-vencida",
];

const isProtectedPath = (pathname: string) => {
  return protectedPrefixes.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
};

const isSupabaseSessionCookieName = (name: string) => {
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(name)) {
    return false;
  }

  return (
    name.startsWith("sb-") ||
    name.startsWith("supabase-auth-token") ||
    name.includes("-auth-token")
  );
};

function copySupabaseResponseHeaders(
  source: NextResponse,
  target: NextResponse
) {
  source.headers.getSetCookie().forEach((cookie) => {
    target.headers.append("Set-Cookie", cookie);
  });

  ["cache-control", "expires", "pragma"].forEach((headerName) => {
    const value = source.headers.get(headerName);

    if (value) {
      target.headers.set(headerName, value);
    }
  });

  return target;
}

const getSupabaseSessionCookieNames = (request: NextRequest) => {
  return [
    ...new Set(
      request.cookies
        .getAll()
        .map(({ name }) => name)
        .filter(isSupabaseSessionCookieName)
    ),
  ];
};

const hasSupabaseSessionCookie = (request: NextRequest) => {
  return getSupabaseSessionCookieNames(request).length > 0;
};

function expireLegacySharedSessionCookies(
  response: NextResponse,
  request: NextRequest,
  cookieNames = getSupabaseSessionCookieNames(request)
) {
  cookieNames.forEach((name) => {
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Domain=${LEGACY_SUPABASE_COOKIE_DOMAIN}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`
    );
  });
}

function expireAllSessionCookies(
  response: NextResponse,
  request: NextRequest,
  cookieNames = getSupabaseSessionCookieNames(request)
) {
  cookieNames.forEach((name) => {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      expires: new Date(0),
      maxAge: 0,
    });
  });

  expireLegacySharedSessionCookies(response, request, cookieNames);
}

function buildLegacyCookieMigrationResponse(request: NextRequest) {
  const response = NextResponse.redirect(request.nextUrl.clone(), 307);

  response.cookies.set({
    name: SUPABASE_COOKIE_MIGRATION_MARKER,
    value: "1",
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  expireLegacySharedSessionCookies(response, request);
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

function getAuthErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: "", message: "", status: null as number | null };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };

  return {
    code: typeof candidate.code === "string" ? candidate.code.toLowerCase() : "",
    message:
      typeof candidate.message === "string" ? candidate.message.toLowerCase() : "",
    status: typeof candidate.status === "number" ? candidate.status : null,
  };
}

function isIrrecoverableSessionError(error: unknown) {
  const { code, message, status } = getAuthErrorDetails(error);

  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "over_request_rate_limit" ||
    message.includes("invalid refresh token") ||
    (status === 401 && message.includes("refresh token"))
  );
}

function buildInvalidSessionResponse(
  request: NextRequest,
  options: { isProtected: boolean; isAdminApi: boolean }
) {
  const sessionCookieNames = getSupabaseSessionCookieNames(request);

  sessionCookieNames.forEach((name) => {
    request.cookies.delete(name);
  });

  let response: NextResponse;

  if (options.isAdminApi) {
    response = NextResponse.json({ error: "Sesion vencida." }, { status: 401 });
  } else if (options.isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    url.searchParams.set("session", "expired");
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next({ request });
  }

  expireAllSessionCookies(response, request, sessionCookieNames);
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

const canonicalPrefixes = [
  ...protectedPrefixes,
  // El verifier PKCE se guarda en una cookie host-only. Canonicalizar las
  // entradas OAuth antes de iniciar el flujo evita crearlo en ventorap.cl y
  // consumirlo después en www.ventorap.cl.
  "/login",
  "/registro",
  "/auth/callback",
  "/auth/completar-cuenta",
];
const canonicalExactPaths = new Set<string>(["/dashboard"]);

const shouldUseCanonicalHost = (pathname: string) => {
  if (canonicalExactPaths.has(pathname)) {
    return true;
  }

  return canonicalPrefixes.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
};

const getCanonicalHost = (hostname: string, pathname: string) => {
  if (hostname !== "ventorap.cl") {
    return null;
  }

  return shouldUseCanonicalHost(pathname) ? "www.ventorap.cl" : null;
};

export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/" &&
    request.nextUrl.searchParams.has("code")
  ) {
    const url = request.nextUrl.clone();
    if (url.hostname === "ventorap.cl") {
      url.hostname = "www.ventorap.cl";
    }
    url.pathname = "/auth/callback";
    url.searchParams.set("intent", "login");
    url.searchParams.set("provider", "google");
    url.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(url);
  }

  const canonicalHost = getCanonicalHost(
    request.nextUrl.hostname,
    request.nextUrl.pathname
  );

  if (canonicalHost) {
    const url = request.nextUrl.clone();
    url.hostname = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = request.nextUrl;
  const isProtected = isProtectedPath(pathname);
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/registro";
  const isCompleteAccount = pathname === "/auth/completar-cuenta";
  const hasSessionCookie = hasSupabaseSessionCookie(request);

  if (
    hasSessionCookie &&
    isSharedVentoraWebHost(request.nextUrl.hostname) &&
    !request.cookies.has(SUPABASE_COOKIE_MIGRATION_MARKER) &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return buildLegacyCookieMigrationResponse(request);
  }

  if (!hasSessionCookie) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (isAdminApi) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(request.nextUrl.hostname),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let authResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;

  try {
    authResult = await supabase.auth.getClaims();
  } catch (error) {
    if (isIrrecoverableSessionError(error)) {
      return buildInvalidSessionResponse(request, { isProtected, isAdminApi });
    }

    throw error;
  }

  if (authResult.error && isIrrecoverableSessionError(authResult.error)) {
    return buildInvalidSessionResponse(request, { isProtected, isAdminApi });
  }

  const claims = authResult.data?.claims;
  const user =
    claims && typeof claims.sub === "string"
      ? {
          id: claims.sub,
          email: typeof claims.email === "string" ? claims.email : null,
        }
      : null;

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return copySupabaseResponseHeaders(
      supabaseResponse,
      NextResponse.redirect(url)
    );
  }

  const growthOnly = isGrowthOnlyUser(user?.email);
  const founderAdmin = isFounderAdminEmail(user?.email);

  if (isAdminApi) {
    if (!user) {
      return copySupabaseResponseHeaders(
        supabaseResponse,
        NextResponse.json({ error: "No autorizado." }, { status: 401 })
      );
    }

    if (!founderAdmin) {
      return NextResponse.json(
        { error: "No tienes acceso a esta seccion." },
        { status: 403 }
      );
    }

    return supabaseResponse;
  }

  if (user && pathname.startsWith("/admin")) {
    if (!founderAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return copySupabaseResponseHeaders(
        supabaseResponse,
        NextResponse.redirect(url)
      );
    }
  }

  if (
    user &&
    growthOnly &&
    pathname !== "/admin/prospectos" &&
    !pathname.startsWith("/admin/prospectos/") &&
    pathname !== "/admin/growth" &&
    !pathname.startsWith("/admin/growth/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/prospectos";
    return copySupabaseResponseHeaders(
      supabaseResponse,
      NextResponse.redirect(url)
    );
  }

  if (user && founderAdmin && pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return copySupabaseResponseHeaders(
      supabaseResponse,
      NextResponse.redirect(url)
    );
  }

  if (user && (isLogin || isRegister) && !isCompleteAccount) {
    const url = request.nextUrl.clone();
    if (founderAdmin) {
      url.pathname = "/admin";
    } else {
      url.pathname = growthOnly ? "/admin/growth" : "/dashboard";
    }
    return copySupabaseResponseHeaders(
      supabaseResponse,
      NextResponse.redirect(url)
    );
  }

  supabaseResponse.headers.set("x-pathname", pathname);

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/login",
    "/",
    "/registro",
    "/auth/callback",
    "/auth/completar-cuenta",
    "/dashboard/:path*",
    "/admin/:path*",
    "/clientes/:path*",
    "/cotizaciones/:path*",
    "/solicitudes/:path*",
    "/configuracion/:path*",
    "/cuenta-vencida/:path*",
    "/api/admin/:path*",
  ],
};
