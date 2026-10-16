-- One default purchasing provider per organization and canonical family.
begin;

create table public.organization_supplier_family_preferences (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  family_key text not null check (length(btrim(family_key)) between 1 and 180),
  provider_key text not null check (length(btrim(provider_key)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, family_key)
);

alter table public.organization_supplier_family_preferences enable row level security;

revoke all on public.organization_supplier_family_preferences from public, anon, authenticated;
grant select on public.organization_supplier_family_preferences to authenticated;
grant all on public.organization_supplier_family_preferences to service_role;

create policy organization_supplier_family_preferences_select_own
  on public.organization_supplier_family_preferences for select to authenticated
  using (organization_id = (select public.get_org_id()));

-- Writes are intentionally API-only. The route authenticates the user,
-- checks admin/technician permission, and derives organization_id from session.
-- No INSERT/UPDATE/DELETE policy or table grant is exposed to authenticated.

commit;
