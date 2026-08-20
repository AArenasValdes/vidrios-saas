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

describe("growth onboarding automatic defaults migration", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260820205800_growth_onboarding_automatic_defaults.sql"),
    "utf8"
  );

  it("define una sola guía automática lista por dispositivo", () => {
    expect(migration).toContain("es_predeterminado boolean not null default false");
    expect(migration).toContain("dispositivo in ('movil', 'escritorio')");
    expect(migration).toContain("growth_onboarding_videos_workspace_default_device_uidx");
  });

  it("mantiene el embudo limpio aunque el usuario abra el video más de una vez", () => {
    expect(migration).toContain("growth_onboarding_events_video_opened_once_uidx");
    expect(migration).toContain("tipo = 'video_abierto'");
  });
});

describe("growth onboarding scale hardening migration", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260820210606_growth_onboarding_scale_hardening.sql"),
    "utf8"
  );

  it("cubre FKs del override de pilotos y elimina SELECT duplicado en RLS", () => {
    expect(migration).toContain("growth_onboarding_assignments_video_id_idx");
    expect(migration).toContain("growth_onboarding_events_assignment_id_idx");
    expect(migration).toContain("growth_onboarding_events_cotizacion_id_idx");
    expect(migration).toContain("growth_onboarding_events_video_id_idx");
    expect(migration).toContain("drop policy if exists growth_onboarding_assignments_write_admin");
  });
});
