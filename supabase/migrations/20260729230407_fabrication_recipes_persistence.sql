-- Fase 2 fabricacion tecnica: persistencia versionada de recetas y casos de prueba.
-- Aditivo, multi-tenant y sin tocar tablas tecnicas legacy.

create table if not exists public.fabrication_recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id bigint null references public.organizations (id) on delete cascade,
  line_template_id bigint null references public.cotizacion_line_templates (id) on delete set null,
  scope text not null,
  provider_name text not null default '',
  line_name text not null default '',
  typology text not null,
  leaves_count integer null,
  variant text null,
  version integer not null default 1,
  status text not null default 'draft',
  definition jsonb not null,
  source_type text not null default 'manual',
  source_reference text null,
  parent_recipe_id uuid null references public.fabrication_recipes (id) on delete set null,
  validated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  eliminado_en timestamptz null,
  constraint fabrication_recipes_scope_check
    check (scope in ('ventora', 'organization')),
  constraint fabrication_recipes_status_check
    check (status in ('draft', 'testing', 'validated', 'review_required', 'archived')),
  constraint fabrication_recipes_source_type_check
    check (source_type in ('manual', 'copied', 'imported_ai', 'legacy')),
  constraint fabrication_recipes_version_positive_check
    check (version > 0),
  constraint fabrication_recipes_leaves_count_positive_check
    check (leaves_count is null or leaves_count > 0),
  constraint fabrication_recipes_scope_organization_check
    check (
      (scope = 'ventora' and organization_id is null)
      or (scope = 'organization' and organization_id is not null)
    ),
  constraint fabrication_recipes_definition_object_check
    check (jsonb_typeof(definition) = 'object')
);

create index if not exists fabrication_recipes_org_idx
  on public.fabrication_recipes (organization_id)
  where eliminado_en is null;

create index if not exists fabrication_recipes_line_template_idx
  on public.fabrication_recipes (line_template_id)
  where eliminado_en is null;

create index if not exists fabrication_recipes_status_idx
  on public.fabrication_recipes (status)
  where eliminado_en is null;

create index if not exists fabrication_recipes_parent_idx
  on public.fabrication_recipes (parent_recipe_id)
  where eliminado_en is null;

create index if not exists fabrication_recipes_scope_idx
  on public.fabrication_recipes (scope)
  where eliminado_en is null;

create table if not exists public.fabrication_recipe_tests (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.fabrication_recipes (id) on delete cascade,
  organization_id bigint null references public.organizations (id) on delete cascade,
  name text not null,
  input jsonb not null,
  expected_output jsonb not null,
  actual_output jsonb null,
  passed boolean not null default false,
  validated_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  eliminado_en timestamptz null,
  constraint fabrication_recipe_tests_input_object_check
    check (jsonb_typeof(input) = 'object'),
  constraint fabrication_recipe_tests_expected_output_object_check
    check (jsonb_typeof(expected_output) = 'object'),
  constraint fabrication_recipe_tests_actual_output_object_check
    check (actual_output is null or jsonb_typeof(actual_output) = 'object')
);

create index if not exists fabrication_recipe_tests_recipe_idx
  on public.fabrication_recipe_tests (recipe_id)
  where eliminado_en is null;

create index if not exists fabrication_recipe_tests_org_idx
  on public.fabrication_recipe_tests (organization_id)
  where eliminado_en is null;

create index if not exists fabrication_recipe_tests_passed_idx
  on public.fabrication_recipe_tests (recipe_id, passed)
  where eliminado_en is null;

create or replace function public.touch_fabrication_recipes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_validated_fabrication_recipe_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'validated'
     and old.eliminado_en is null
     and not (new.status = 'archived' or new.eliminado_en is not null) then
    raise exception 'Una receta validada no se modifica directamente; crea una nueva version.';
  end if;

  return new;
end;
$$;

drop trigger if exists fabrication_recipes_prevent_validated_update
  on public.fabrication_recipes;
create trigger fabrication_recipes_prevent_validated_update
  before update on public.fabrication_recipes
  for each row
  execute function public.prevent_validated_fabrication_recipe_update();

drop trigger if exists fabrication_recipes_touch_updated_at
  on public.fabrication_recipes;
create trigger fabrication_recipes_touch_updated_at
  before update on public.fabrication_recipes
  for each row
  execute function public.touch_fabrication_recipes_updated_at();

create or replace function public.sync_fabrication_recipe_test_organization()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  recipe_scope text;
  recipe_org_id bigint;
begin
  select scope, organization_id
    into recipe_scope, recipe_org_id
  from public.fabrication_recipes
  where id = new.recipe_id
    and eliminado_en is null;

  if recipe_scope is null then
    raise exception 'La receta de fabricacion no existe o esta eliminada.';
  end if;

  if recipe_scope = 'ventora' then
    new.organization_id = null;
  else
    new.organization_id = recipe_org_id;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fabrication_recipe_tests_sync_organization
  on public.fabrication_recipe_tests;
create trigger fabrication_recipe_tests_sync_organization
  before insert or update on public.fabrication_recipe_tests
  for each row
  execute function public.sync_fabrication_recipe_test_organization();

alter table public.fabrication_recipes enable row level security;
alter table public.fabrication_recipe_tests enable row level security;

drop policy if exists "fabrication_recipes_select_visible"
  on public.fabrication_recipes;
create policy "fabrication_recipes_select_visible"
  on public.fabrication_recipes
  for select
  to authenticated
  using (
    eliminado_en is null
    and (
      scope = 'ventora'
      or organization_id = (select public.get_org_id())
    )
  );

drop policy if exists "fabrication_recipes_insert_own_org"
  on public.fabrication_recipes;
create policy "fabrication_recipes_insert_own_org"
  on public.fabrication_recipes
  for insert
  to authenticated
  with check (
    scope = 'organization'
    and organization_id = (select public.get_org_id())
  );

drop policy if exists "fabrication_recipes_update_own_org"
  on public.fabrication_recipes;
create policy "fabrication_recipes_update_own_org"
  on public.fabrication_recipes
  for update
  to authenticated
  using (
    scope = 'organization'
    and organization_id = (select public.get_org_id())
  )
  with check (
    scope = 'organization'
    and organization_id = (select public.get_org_id())
  );

drop policy if exists "fabrication_recipe_tests_select_visible"
  on public.fabrication_recipe_tests;
create policy "fabrication_recipe_tests_select_visible"
  on public.fabrication_recipe_tests
  for select
  to authenticated
  using (
    eliminado_en is null
    and exists (
      select 1
      from public.fabrication_recipes recipe
      where recipe.id = recipe_id
        and recipe.eliminado_en is null
        and (
          recipe.scope = 'ventora'
          or recipe.organization_id = (select public.get_org_id())
        )
    )
  );

drop policy if exists "fabrication_recipe_tests_insert_own_org_recipe"
  on public.fabrication_recipe_tests;
create policy "fabrication_recipe_tests_insert_own_org_recipe"
  on public.fabrication_recipe_tests
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.fabrication_recipes recipe
      where recipe.id = recipe_id
        and recipe.eliminado_en is null
        and recipe.scope = 'organization'
        and recipe.organization_id = (select public.get_org_id())
    )
  );

drop policy if exists "fabrication_recipe_tests_update_own_org_recipe"
  on public.fabrication_recipe_tests;
create policy "fabrication_recipe_tests_update_own_org_recipe"
  on public.fabrication_recipe_tests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.fabrication_recipes recipe
      where recipe.id = recipe_id
        and recipe.eliminado_en is null
        and recipe.scope = 'organization'
        and recipe.organization_id = (select public.get_org_id())
    )
  )
  with check (
    exists (
      select 1
      from public.fabrication_recipes recipe
      where recipe.id = recipe_id
        and recipe.eliminado_en is null
        and recipe.scope = 'organization'
        and recipe.organization_id = (select public.get_org_id())
    )
  );

grant select, insert, update on public.fabrication_recipes to authenticated;
grant select, insert, update on public.fabrication_recipe_tests to authenticated;
