import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260912201216_auto_enable_public_request_page.sql",
);
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

describe("migracion de pagina publica al crear cuenta", () => {
  it("crea slug, publica la pagina y conserva configuraciones existentes", () => {
    expect(sql).toContain("solicitud_publica_slug, is_published");
    expect(sql).toContain("v_public_slug := translate");
    expect(sql).toContain("is_published = case when nullif");
    expect(sql).toContain("public-request-slug:");
  });

  it("repara perfiles historicos sin slug", () => {
    expect(sql).toContain("repara cuentas creadas antes de esta migración");
    expect(sql).toContain("where nullif(btrim(solicitud_publica_slug), '') is null");
    expect(sql).toContain("is_published = true");
  });
});
