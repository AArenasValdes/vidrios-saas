create index if not exists clients_active_org_nombre_idx
  on public.clients (organization_id, nombre)
  where eliminado_en is null;

create index if not exists clients_active_org_id_idx
  on public.clients (organization_id, id)
  where eliminado_en is null;

create index if not exists projects_active_org_titulo_idx
  on public.projects (organization_id, titulo)
  where eliminado_en is null;

create index if not exists projects_active_org_cliente_idx
  on public.projects (organization_id, cliente_id)
  where eliminado_en is null;

create index if not exists cotizaciones_active_org_creado_idx
  on public.cotizaciones (organization_id, creado_en desc)
  where eliminado_en is null;

create index if not exists cotizaciones_active_org_actualizado_idx
  on public.cotizaciones (organization_id, actualizado_en desc)
  where eliminado_en is null;

create index if not exists cotizaciones_active_org_estado_idx
  on public.cotizaciones (organization_id, estado)
  where eliminado_en is null;

create index if not exists cotizaciones_active_org_proyecto_idx
  on public.cotizaciones (organization_id, proyecto_id)
  where eliminado_en is null;

create index if not exists cotizacion_items_active_org_quote_order_idx
  on public.cotizacion_items (organization_id, cotizacion_id, orden, creado_en)
  where eliminado_en is null;

create index if not exists users_active_correo_idx
  on public.users (correo)
  where eliminado_en is null;
