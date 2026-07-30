import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260729230407_fabrication_recipes_persistence.sql"
);

describe("fabrication recipes migration", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("crea tablas nuevas sin tocar tablas tecnicas legacy", () => {
    expect(sql).toContain("create table if not exists public.fabrication_recipes");
    expect(sql).toContain("create table if not exists public.fabrication_recipe_tests");
    expect(sql).not.toMatch(/alter table public\.(materials|system_lines|formula_variables|quote_item_breakdown)\b/i);
  });

  it("modela scope Ventora y privado por organizacion", () => {
    expect(sql).toContain("scope in ('ventora', 'organization')");
    expect(sql).toContain("(scope = 'ventora' and organization_id is null)");
    expect(sql).toContain("(scope = 'organization' and organization_id is not null)");
    expect(sql).toContain("references public.organizations (id)");
    expect(sql).toContain("references public.cotizacion_line_templates (id)");
  });

  it("activa RLS y permite lectura autenticada de recetas Ventora", () => {
    expect(sql).toContain("alter table public.fabrication_recipes enable row level security");
    expect(sql).toContain("for select");
    expect(sql).toContain("to authenticated");
    expect(sql).toContain("scope = 'ventora'");
    expect(sql).toContain("organization_id = (select public.get_org_id())");
  });

  it("restringe insert y update a recetas privadas de la organizacion", () => {
    expect(sql).toContain("for insert");
    expect(sql).toContain("for update");
    expect(sql).toContain("scope = 'organization'");
    expect(sql).toContain("with check");
    expect(sql).toContain("organization_id = (select public.get_org_id())");
  });

  it("bloquea modificacion directa de recetas validadas y soporta soft delete", () => {
    expect(sql).toContain("prevent_validated_fabrication_recipe_update");
    expect(sql).toContain("old.status = 'validated'");
    expect(sql).toContain("new.status = 'archived'");
    expect(sql).toContain("eliminado_en is null");
  });

  it("vincula casos de prueba a recetas y sincroniza organization_id", () => {
    expect(sql).toContain("recipe_id uuid not null references public.fabrication_recipes");
    expect(sql).toContain("sync_fabrication_recipe_test_organization");
    expect(sql).toContain("new.organization_id = recipe_org_id");
    expect(sql).toContain("new.organization_id = null");
  });
});
