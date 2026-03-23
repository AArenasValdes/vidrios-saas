-- Vista administrativa para revisar clientes eliminados por soft delete
-- junto con sus proyectos y cotizaciones relacionadas tambien eliminadas.

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
  and client.organization_id in (
    select users.organization_id
    from public.users as users
    where lower(users.correo) = lower(auth.email())
      and users.eliminado_en is null
  );

comment on view public.admin_clientes_eliminados is
  'Vista administrativa de clientes eliminados por soft delete, con conteo de proyectos y cotizaciones relacionadas tambien eliminadas.';

comment on column public.admin_clientes_eliminados.cliente_eliminado_en is
  'Fecha en que la ficha del cliente fue marcada como eliminada en la operacion diaria.';

comment on column public.admin_clientes_eliminados.proyectos_eliminados is
  'Cantidad de proyectos asociados al cliente que tambien quedaron en soft delete.';

comment on column public.admin_clientes_eliminados.cotizaciones_eliminadas is
  'Cantidad de cotizaciones relacionadas al cliente que tambien quedaron en soft delete.';

grant select on public.admin_clientes_eliminados to authenticated;
