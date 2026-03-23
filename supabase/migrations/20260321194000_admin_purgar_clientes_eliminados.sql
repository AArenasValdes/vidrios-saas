-- Purge manual de clientes eliminados por soft delete y sus datos relacionados.
-- Elimina fisicamente solo registros ya marcados con eliminado_en y mas antiguos que
-- la retencion indicada.

drop function if exists public.admin_purgar_clientes_eliminados(integer);

create or replace function public.admin_purgar_clientes_eliminados(retention_days integer default 90)
returns table (
  clientes_purgados integer,
  proyectos_purgados integer,
  cotizaciones_purgadas integer,
  items_purgados integer,
  breakdowns_purgados integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_org_id public.organizations.id%type;
  cutoff timestamptz;
begin
  select users.organization_id
    into current_org_id
  from public.users as users
  where lower(users.correo) = lower(auth.email())
    and users.eliminado_en is null
  limit 1;

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

comment on function public.admin_purgar_clientes_eliminados(integer) is
  'Purge manual de clientes eliminados y sus datos relacionados. Solo actua sobre registros ya marcados con eliminado_en y mas antiguos que la retencion indicada.';

grant execute on function public.admin_purgar_clientes_eliminados(integer) to authenticated;
