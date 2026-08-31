import { createClient } from "@supabase/supabase-js";
import { assertValidSupabaseServiceRoleKey } from "@/lib/supabase/service-role-key";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient usa SUPABASE_SERVICE_ROLE_KEY y solo puede ejecutarse en servidor"
    );
  }

  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para usar rutas públicas con Supabase admin."
    );
  }

  assertValidSupabaseServiceRoleKey(serviceRoleKey);

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
