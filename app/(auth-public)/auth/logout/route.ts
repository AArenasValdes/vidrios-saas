import { NextRequest, NextResponse } from "next/server";

import {
  getSupabaseCookieOptions,
  LEGACY_SUPABASE_COOKIE_DOMAIN,
} from "@/lib/supabase/cookie-options";

function isSupabaseSessionCookie(name: string) {
  return (
    /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(name) &&
    (name.startsWith("sb-") ||
      name.startsWith("supabase-auth-token") ||
      name.includes("-auth-token"))
  );
}

export async function GET(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";

  const response = NextResponse.redirect(loginUrl);
  const cookieOptions = getSupabaseCookieOptions(request.nextUrl.hostname);

  const sessionCookieNames = [
    ...new Set(
      request.cookies
        .getAll()
        .map(({ name }) => name)
        .filter(isSupabaseSessionCookie)
    ),
  ];

  sessionCookieNames.forEach((name) => {
    response.cookies.set({
      name,
      value: "",
      path: cookieOptions?.path ?? "/",
      domain: cookieOptions?.domain,
      sameSite: cookieOptions?.sameSite ?? "lax",
      secure: cookieOptions?.secure ?? request.nextUrl.protocol === "https:",
      expires: new Date(0),
      maxAge: 0,
    });
  });

  if (request.nextUrl.hostname === "www.ventorap.cl") {
    sessionCookieNames.forEach((name) => {
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=/; Max-Age=0; Domain=${LEGACY_SUPABASE_COOKIE_DOMAIN}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`
      );
    });
  }

  response.headers.set("Cache-Control", "no-store");

  return response;
}
