import { NextRequest, NextResponse } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

function isSupabaseSessionCookie(name: string) {
  return (
    name.startsWith("sb-") ||
    name.startsWith("supabase-auth-token") ||
    name.includes("-auth-token")
  );
}

export async function GET(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";

  const response = NextResponse.redirect(loginUrl);
  const cookieOptions = getSupabaseCookieOptions(request.nextUrl.hostname);

  request.cookies.getAll().forEach(({ name }) => {
    if (!isSupabaseSessionCookie(name)) {
      return;
    }

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

  response.headers.set("Cache-Control", "no-store");

  return response;
}
