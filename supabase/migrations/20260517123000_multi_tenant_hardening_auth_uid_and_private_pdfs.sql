-- Hardening multi-tenant:
-- 1. Migrar aislamiento a auth.uid()/auth_user_id
-- 2. Cerrar grants innecesarios y funciones SECURITY DEFINER expuestas
-- 3. Separar PDFs de cotizaciones a bucket privado

begin;

update public.users as users
set auth_user_id = auth_users.id
from auth.users as auth_users
where users.auth_user_id is null
  and lower(users.correo) = lower(auth_users.email);

create unique index if not exists users_auth_user_id_unique
  on public.users (auth_user_id)
  where auth_user_id is not null;

create index if not exists users_auth_user_id_org_active_idx
  on public.users (auth_user_id, organization_id)
  where eliminado_en is null;

create or replace function public.get_org_id()
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $$
  select organization_id
  from public.users
  where auth_user_id = auth.uid()
    and eliminado_en is null
  limit 1;
$$;

create or replace function public.reserve_next_cotizacion_code(
  p_organization_id bigint,
  p_quote_date date default (timezone('utc', now()))::date
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  requester_org_id bigint;
  next_number integer;
begin
  requester_org_id := public.get_org_id();

  if requester_org_id is null then
    raise exception 'Usuario autenticado sin organizacion valida para generar codigos.';
  end if;

  if requester_org_id <> p_organization_id then
    raise exception 'No autorizado para generar codigos para otra organizacion.';
  end if;

  insert into public.cotizacion_code_counters as counter (
    organization_id,
    quote_date,
    last_number
  )
  values (
    p_organization_id,
    p_quote_date,
    1
  )
  on conflict (organization_id, quote_date)
  do update
    set last_number = counter.last_number + 1,
        updated_at = timezone('utc', now())
  returning counter.last_number
  into next_number;

  return format(
    'COT-%s-%s',
    to_char(p_quote_date, 'DDMMYY'),
    lpad(next_number::text, 3, '0')
  );
end;
$$;

create or replace function public.admin_purgar_clientes_eliminados(retention_days integer default 90)
returns table(
  clientes_purgados integer,
  proyectos_purgados integer,
  cotizaciones_purgadas integer,
  items_purgados integer,
  breakdowns_purgados integer
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  current_org_id public.organizations.id%type;
  cutoff timestamptz;
begin
  current_org_id := public.get_org_id();

  if current_org_id is null then
    raise exception 'No se pudo resolver la organizacion activa del usuario autenticado.';
  end if;

  cutoff := timezone('utc', now()) - make_interval(days => greatest(retention_days, 0));

  with candidate_clients as (
    select client.id
    from public.clients as client
    where client.organization_id = current_org_id
      and client.eliminado_en is not null
      and client.eliminado_en <= cutoff
  ),
  candidate_projects as (
    select project.id
    from public.projects as project
    join candidate_clients as client on client.id = project.cliente_id
    where project.organization_id = current_org_id
      and project.eliminado_en is not null
      and project.eliminado_en <= cutoff
  ),
  candidate_quotes as (
    select quote.id
    from public.cotizaciones as quote
    join candidate_projects as project on project.id = quote.proyecto_id
    where quote.organization_id = current_org_id
      and quote.eliminado_en is not null
      and quote.eliminado_en <= cutoff
  ),
  candidate_items as (
    select item.id
    from public.cotizacion_items as item
    join candidate_quotes as quote on quote.id = item.cotizacion_id
    where item.organization_id = current_org_id
      and item.eliminado_en is not null
      and item.eliminado_en <= cutoff
  ),
  deleted_breakdowns as (
    delete from public.quote_item_breakdown as breakdown
    using candidate_items as item
    where breakdown.cotizacion_item_id = item.id
    returning breakdown.id
  ),
  deleted_items as (
    delete from public.cotizacion_items as item
    using candidate_items as candidate
    where item.id = candidate.id
    returning item.id
  ),
  deleted_quotes as (
    delete from public.cotizaciones as quote
    using candidate_quotes as candidate
    where quote.id = candidate.id
    returning quote.id
  ),
  deleted_projects as (
    delete from public.projects as project
    using candidate_projects as candidate
    where project.id = candidate.id
    returning project.id
  ),
  deleted_clients as (
    delete from public.clients as client
    using candidate_clients as candidate
    where client.id = candidate.id
    returning client.id
  )
  select
    coalesce((select count(*) from deleted_clients), 0)::int,
    coalesce((select count(*) from deleted_projects), 0)::int,
    coalesce((select count(*) from deleted_quotes), 0)::int,
    coalesce((select count(*) from deleted_items), 0)::int,
    coalesce((select count(*) from deleted_breakdowns), 0)::int
  into
    clientes_purgados,
    proyectos_purgados,
    cotizaciones_purgadas,
    items_purgados,
    breakdowns_purgados;

  return query
  select
    clientes_purgados,
    proyectos_purgados,
    cotizaciones_purgadas,
    items_purgados,
    breakdowns_purgados;
end;
$$;

drop view if exists public.admin_clientes_eliminados;

create view public.admin_clientes_eliminados as
with deleted_projects as (
  select
    project.cliente_id,
    project.organization_id,
    count(*)::int as proyectos_eliminados,
    string_agg(project.id::text, ', ' order by project.eliminado_en desc, project.id::text) as proyectos_ids
  from public.projects as project
  where project.eliminado_en is not null
  group by project.cliente_id, project.organization_id
),
deleted_quotes as (
  select
    project.cliente_id,
    quote.organization_id,
    count(*)::int as cotizaciones_eliminadas,
    string_agg(
      coalesce(quote.numero, 'COT-' || quote.id::text),
      ', '
      order by quote.eliminado_en desc, quote.id::text
    ) as cotizaciones_codigos
  from public.cotizaciones as quote
  join public.projects as project
    on project.id = quote.proyecto_id
   and project.organization_id = quote.organization_id
  where quote.eliminado_en is not null
    and project.cliente_id is not null
  group by project.cliente_id, quote.organization_id
)
select
  client.id as cliente_id,
  client.organization_id,
  client.nombre as cliente_nombre,
  client.telefono as cliente_telefono,
  client.direccion as cliente_direccion,
  client.correo as cliente_correo,
  client.creado_en as cliente_creado_en,
  client.actualizado_en as cliente_actualizado_en,
  client.eliminado_en as cliente_eliminado_en,
  coalesce(deleted_projects.proyectos_eliminados, 0) as proyectos_eliminados,
  coalesce(deleted_quotes.cotizaciones_eliminadas, 0) as cotizaciones_eliminadas,
  deleted_projects.proyectos_ids,
  deleted_quotes.cotizaciones_codigos
from public.clients as client
left join deleted_projects
  on deleted_projects.cliente_id = client.id
 and deleted_projects.organization_id = client.organization_id
left join deleted_quotes
  on deleted_quotes.cliente_id = client.id
 and deleted_quotes.organization_id = client.organization_id
where client.eliminado_en is not null
  and client.organization_id = public.get_org_id();

alter view if exists public.admin_clientes_eliminados
set (security_invoker = true);

revoke all on public.admin_clientes_eliminados from public, anon, authenticated;
grant select on public.admin_clientes_eliminados to authenticated;
grant select on public.admin_clientes_eliminados to service_role;

drop policy if exists organization_profile_select_own on public.organization_profile;
drop policy if exists organization_profile_insert_own on public.organization_profile;
drop policy if exists organization_profile_update_own on public.organization_profile;

create policy organization_profile_select_own
  on public.organization_profile
  for select
  to authenticated
  using (organization_id = public.get_org_id());

create policy organization_profile_insert_own
  on public.organization_profile
  for insert
  to authenticated
  with check (organization_id = public.get_org_id());

create policy organization_profile_update_own
  on public.organization_profile
  for update
  to authenticated
  using (organization_id = public.get_org_id())
  with check (organization_id = public.get_org_id());

drop policy if exists landing_gallery_select_own on public.public_landing_gallery;
drop policy if exists landing_gallery_insert_own on public.public_landing_gallery;
drop policy if exists landing_gallery_update_own on public.public_landing_gallery;
drop policy if exists landing_gallery_delete_own on public.public_landing_gallery;

create policy landing_gallery_select_own
  on public.public_landing_gallery
  for select
  to authenticated
  using (organization_id = public.get_org_id());

create policy landing_gallery_insert_own
  on public.public_landing_gallery
  for insert
  to authenticated
  with check (organization_id = public.get_org_id());

create policy landing_gallery_update_own
  on public.public_landing_gallery
  for update
  to authenticated
  using (organization_id = public.get_org_id())
  with check (organization_id = public.get_org_id());

create policy landing_gallery_delete_own
  on public.public_landing_gallery
  for delete
  to authenticated
  using (organization_id = public.get_org_id());

drop policy if exists organization_assets_insert_own on storage.objects;
drop policy if exists organization_assets_update_own on storage.objects;
drop policy if exists organization_assets_delete_own on storage.objects;

create policy organization_assets_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

create policy organization_assets_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  )
  with check (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

create policy organization_assets_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

insert into storage.buckets (id, name, public)
select 'quote-pdfs', 'quote-pdfs', false
where not exists (
  select 1 from storage.buckets where id = 'quote-pdfs'
);

drop policy if exists quote_pdfs_select_own on storage.objects;
drop policy if exists quote_pdfs_insert_own on storage.objects;
drop policy if exists quote_pdfs_update_own on storage.objects;
drop policy if exists quote_pdfs_delete_own on storage.objects;

create policy quote_pdfs_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'quote-pdfs'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

create policy quote_pdfs_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'quote-pdfs'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

create policy quote_pdfs_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'quote-pdfs'
    and split_part(name, '/', 1) = public.get_org_id()::text
  )
  with check (
    bucket_id = 'quote-pdfs'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

create policy quote_pdfs_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'quote-pdfs'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

drop policy if exists quote_item_breakdown_select on public.quote_item_breakdown;
drop policy if exists quote_item_breakdown_insert on public.quote_item_breakdown;
drop policy if exists quote_item_breakdown_update on public.quote_item_breakdown;

create policy quote_item_breakdown_select
  on public.quote_item_breakdown
  for select
  to authenticated
  using (organization_id = public.get_org_id());

create policy quote_item_breakdown_insert
  on public.quote_item_breakdown
  for insert
  to authenticated
  with check (organization_id = public.get_org_id());

create policy quote_item_breakdown_update
  on public.quote_item_breakdown
  for update
  to authenticated
  using (organization_id = public.get_org_id())
  with check (organization_id = public.get_org_id());

revoke all on public.cotizacion_code_counters from anon, authenticated;
grant all on public.cotizacion_code_counters to service_role;

revoke all on public.formula_variables from anon, authenticated;
grant all on public.formula_variables to service_role;
revoke all on sequence public.formula_variables_id_seq from anon, authenticated;
grant all on sequence public.formula_variables_id_seq to service_role;

revoke all on public.material_types from anon, authenticated;
grant all on public.material_types to service_role;

revoke execute on function public.admin_purgar_clientes_eliminados(integer) from public, anon, authenticated;
grant execute on function public.admin_purgar_clientes_eliminados(integer) to service_role;

revoke execute on function public.reserve_next_cotizacion_code(bigint, date) from public, anon;
grant execute on function public.reserve_next_cotizacion_code(bigint, date) to authenticated;
grant execute on function public.reserve_next_cotizacion_code(bigint, date) to service_role;

commit;
