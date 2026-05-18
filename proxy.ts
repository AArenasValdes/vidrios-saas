import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/clientes",
  "/cotizaciones",
  "/solicitudes",
  "/configuracion",
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

const getCanonicalHost = (hostname: string) => {
  return hostname === "ventorap.cl" ? "www.ventorap.cl" : null;
};

export async function proxy(request: NextRequest) {
  const canonicalHost = getCanonicalHost(request.nextUrl.hostname);

  if (canonicalHost) {
    const url = request.nextUrl.clone();
    url.hostname = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = request.nextUrl;
  const isProtected = isProtectedPath(pathname);
  const isLogin = pathname === "/login";
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

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/login",
    "/api/auth/profile",
    "/dashboard/:path*",
    "/clientes/:path*",
    "/cotizaciones/:path*",
    "/solicitudes/:path*",
    "/configuracion/:path*",
  ],
};
