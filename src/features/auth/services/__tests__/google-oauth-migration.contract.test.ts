import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260728083604_google_oauth_account_completion.sql"
);

describe("google oauth account completion migration", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  it("serializa altas concurrentes y reutiliza las claves unicas existentes", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("hashtextextended('complete-google-oauth:auth:'");
    expect(sql).toContain("hashtextextended('complete-google-oauth:email:'");
    expect(sql).toContain("users_correo_normalized_unique");
    expect(sql).toContain("on conflict (organization_id) do update");
    expect(sql).toContain("where app_user.auth_user_id = p_auth_user_id");
    expect(sql).toContain("where lower(app_user.correo) = v_email");
  });

  it("mantiene la RPC fuera del alcance de anon y authenticated", () => {
    expect(sql).toContain("security invoker");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });

  it("mantiene los datos privados fuera de las consultas autenticadas normales", () => {
    expect(sql).toContain(
      "revoke all privileges on table public.users"
    );
    expect(sql).toContain("on public.users to authenticated");
    expect(sql).not.toMatch(
      /grant select \([^;]*(nombre|whatsapp|ciudad_comuna|data_sharing_accepted_at)[^;]*\) on public\.users to authenticated/
    );
  });

  it("genera consentimiento y trial dentro del servidor", () => {
    expect(sql).toContain("data_sharing_accepted_at = coalesce(data_sharing_accepted_at, now())");
    expect(sql).toContain("select profile.trial_ends_at");
  });
});
