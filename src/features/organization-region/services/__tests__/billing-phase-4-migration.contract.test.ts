import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260813015101_billing_phase_4_organization_region.sql"
);

describe("billing phase 4 migration", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  it("persiste la region editable de cada organizacion", () => {
    expect(sql).toContain("add column if not exists country_code");
    expect(sql).toContain("currency_code");
    expect(sql).toContain("tax_rate_default");
    expect(sql).toContain("organization_profile_country_code_check");
  });

  it("mantiene el alta OAuth atomica y la limita al service role", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("p_country_code text");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });
});
