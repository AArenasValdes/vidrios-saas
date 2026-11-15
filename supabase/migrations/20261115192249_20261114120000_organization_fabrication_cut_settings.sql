-- Confirmed, organization-scoped aluminum cutting defaults. Writes are API-only.
begin;

create table public.organization_fabrication_cut_settings (
  organization_id bigint primary key references public.organizations(id) on delete cascade,
  kerf_mm integer not null check (kerf_mm between 0 and 20),
  initial_trim_mm integer not null check (initial_trim_mm between 0 and 1000),
  procedure text not null check (procedure = 'por_pieza'),
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_fabrication_cut_settings enable row level security;
revoke all on public.organization_fabrication_cut_settings from public, anon, authenticated;
grant select on public.organization_fabrication_cut_settings to authenticated;
grant all on public.organization_fabrication_cut_settings to service_role;

create policy organization_fabrication_cut_settings_select_own
  on public.organization_fabrication_cut_settings for select to authenticated
  using (organization_id = (select public.get_org_id()));

-- Authenticated writes are intentionally absent. The API checks role and derives
-- both organization_id and actor IDs from the active authenticated session.

commit;
