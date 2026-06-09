import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { isFounderAdminEmail } from "@/features/admin/services/admin-access.service";
import { isGrowthOnlyUser } from "@/features/growth/services/growth-access.service";

const protectedPrefixes = [
  "/dashboard",
  "/admin",
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

const hasSupabaseSessionCookie = (request: NextRequest) => {
  return request.cookies.getAll().some(({ name }) => {
    return (
      name.startsWith("sb-") ||
      name.startsWith("supabase-auth-token") ||
      name.includes("-auth-token")
    );
  });
};

const canonicalPrefixes = [...protectedPrefixes, "/auth/callback"];
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
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/registro";
  const hasSessionCookie = hasSupabaseSessionCookie(request);

  if (!hasSessionCookie) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const growthOnly = isGrowthOnlyUser(user?.email);
  const founderAdmin = isFounderAdminEmail(user?.email);

  if (user && pathname.startsWith("/admin")) {
    if (!founderAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (
    user &&
    growthOnly &&
    pathname !== "/admin/growth" &&
    !pathname.startsWith("/admin/growth/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/growth";
    return NextResponse.redirect(url);
  }

  if (user && founderAdmin && pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if (user && (isLogin || isRegister)) {
    const url = request.nextUrl.clone();
    if (founderAdmin) {
      url.pathname = "/admin";
    } else {
      url.pathname = growthOnly ? "/admin/growth" : "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/login",
    "/registro",
    "/auth/callback",
    "/dashboard/:path*",
    "/admin/:path*",
    "/clientes/:path*",
    "/cotizaciones/:path*",
    "/solicitudes/:path*",
    "/configuracion/:path*",
    "/cuenta-vencida",
  ],
};
