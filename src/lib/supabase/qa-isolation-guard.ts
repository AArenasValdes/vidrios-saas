const PRODUCTION_SUPABASE_PROJECT_REFS = new Set(["yrtrwgkaopfumpidjthk"]);

/**
 * Safety guard ensuring automated QA persistence tests never write against
 * production Supabase or an unisolated remote project.
 */
export function assertIsolatedQaSupabaseEnv(env: Record<string, string | undefined> = process.env): {
  supabaseUrl: string;
  isLocalSupabase: boolean;
} {
  const rawUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!rawUrl) {
    throw new Error("QA isolation blocked: NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`QA isolation blocked: invalid NEXT_PUBLIC_SUPABASE_URL (${rawUrl}).`);
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalHost = host === "127.0.0.1" || host === "localhost" || host === "::1";
  const projectRef = host.endsWith(".supabase.co") ? host.split(".")[0] : "";

  if (PRODUCTION_SUPABASE_PROJECT_REFS.has(projectRef)) {
    throw new Error(
      `QA isolation blocked: NEXT_PUBLIC_SUPABASE_URL points to production Supabase project (${projectRef}).`
    );
  }

  if (!isLocalHost && env.VENTORA_QA_ISOLATED_SUPABASE !== "1") {
    throw new Error(
      `QA isolation blocked: remote Supabase host (${host}) requires explicit VENTORA_QA_ISOLATED_SUPABASE=1.`
    );
  }

  return {
    supabaseUrl: rawUrl,
    isLocalSupabase: isLocalHost,
  };
}
