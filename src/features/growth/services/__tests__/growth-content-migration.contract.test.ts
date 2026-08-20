import fs from "node:fs";
import path from "node:path";

describe("growth_content_items migration", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260820185724_growth_content_items.sql"),
    "utf8"
  );

  it("mantiene la cola editorial interna con RLS por membresía admin", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("force row level security");
    expect(migration).toContain("growth_workspace_members");
    expect(migration).toContain("m.rol = 'admin'");
  });

  it("mantiene los estados y la revisión de claims acotados", () => {
    expect(migration).toContain("'programado'");
    expect(migration).toContain("'publicado'");
    expect(migration).toContain("claim_review_status");
    expect(migration).toContain("utm_content");
  });
});
