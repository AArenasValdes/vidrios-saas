/* Para servidores  componentes y funciones del lado del servidor */

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieOptions = getSupabaseCookieOptions(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  );

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            console.error("[supabase-server] Error al setear cookies de sesion:", error);
          }
        },
      },
    }
  );
}
