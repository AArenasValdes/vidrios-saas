-- Per-organization quote-catalog visibility. A row means the provider is hidden.
-- Provider catalog data, prices, and line templates remain untouched.
begin;

create table public.organization_quote_provider_visibility (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  provider_key text not null check (provider_key ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  created_at timestamptz not null default now(),
  primary key (organization_id, provider_key)
);

alter table public.organization_quote_provider_visibility enable row level security;

revoke all on public.organization_quote_provider_visibility from public, anon, authenticated;
grant select, insert, delete on public.organization_quote_provider_visibility to authenticated;

create policy organization_quote_provider_visibility_select
  on public.organization_quote_provider_visibility for select to authenticated
  using (organization_id = (select public.get_org_id()));

create policy organization_quote_provider_visibility_insert
  on public.organization_quote_provider_visibility for insert to authenticated
  with check (organization_id = (select public.get_org_id()));

create policy organization_quote_provider_visibility_delete
  on public.organization_quote_provider_visibility for delete to authenticated
  using (organization_id = (select public.get_org_id()));

commit;
