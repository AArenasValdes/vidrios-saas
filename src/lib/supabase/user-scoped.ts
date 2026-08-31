import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createUserScopedClient(
  accessToken: string
): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const token = accessToken.trim();

  if (!url || !anonKey || !token) {
    return null;
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
