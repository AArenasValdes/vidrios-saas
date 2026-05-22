create table if not exists public.onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id bigint not null references public.organizations(id) on delete cascade,
  step_key text not null,
  estado text not null default 'pendiente',
  completed_at timestamptz null,
  completed_by_user_id bigint null references public.users(id) on delete set null,
  completion_source text null,
  metadata_json jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz null,
  constraint onboarding_checklists_step_key_check check (
    step_key in (
      'company_ready',
      'public_page_live',
      'channel_ready',
      'first_lead',
      'first_quote',
      'first_share'
    )
  ),
  constraint onboarding_checklists_estado_check check (
    estado in ('pendiente', 'en_progreso', 'completado', 'omitido')
  )
);

create unique index if not exists onboarding_checklists_org_step_active_idx
  on public.onboarding_checklists (organization_id, step_key)
  where eliminado_en is null;

create index if not exists onboarding_checklists_org_estado_idx
  on public.onboarding_checklists (organization_id, estado)
  where eliminado_en is null;

alter table public.onboarding_checklists enable row level security;

revoke all on public.onboarding_checklists from public;
revoke all on public.onboarding_checklists from anon;
revoke all on public.onboarding_checklists from authenticated;

grant select, insert, update on public.onboarding_checklists to authenticated;
grant select, insert, update, delete on public.onboarding_checklists to service_role;

create policy onboarding_checklists_select_own
  on public.onboarding_checklists
  for select
  to authenticated
  using (organization_id = public.get_org_id());

create policy onboarding_checklists_insert_own
  on public.onboarding_checklists
  for insert
  to authenticated
  with check (organization_id = public.get_org_id());

create policy onboarding_checklists_update_own
  on public.onboarding_checklists
  for update
  to authenticated
  using (organization_id = public.get_org_id())
  with check (organization_id = public.get_org_id());
