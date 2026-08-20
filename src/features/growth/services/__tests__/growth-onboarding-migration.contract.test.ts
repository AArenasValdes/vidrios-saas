import fs from "node:fs";
import path from "node:path";

describe("growth onboarding measurement migration", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260820194620_growth_onboarding_measurement.sql"),
    "utf8"
  );

  it("mantiene biblioteca, asignación por organización y eventos separados", () => {
    expect(migration).toContain("growth_onboarding_videos");
    expect(migration).toContain("growth_onboarding_assignments");
    expect(migration).toContain("growth_onboarding_events");
    expect(migration).toContain("organization_id bigint not null");
  });

  it("captura el primer resultado desde PostgreSQL y no desde el navegador", () => {
    expect(migration).toContain("capture_growth_onboarding_quote_event");
    expect(migration).toContain("capture_growth_onboarding_pdf_event");
    expect(migration).toContain("primera_cotizacion_creada");
    expect(migration).toContain("primer_pdf_descargado");
    expect(migration).toContain("on conflict do nothing");
  });

  it("protege las tablas expuestas con RLS y admin de workspace", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("force row level security");
    expect(migration).toContain("growth_workspace_members");
    expect(migration).toContain("m.rol = 'admin'");
    expect(migration).toContain("revoke all on function public.capture_growth_onboarding_quote_event()");
  });
});
