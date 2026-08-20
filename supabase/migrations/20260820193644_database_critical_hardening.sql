-- Auditoría 2026-08-20: endurecimiento de bajo riesgo sobre superficies ya activas.
-- No modifica datos comerciales ni el modelo multi-tenant.

-- Evita que el comportamiento de la función dependa de un search_path mutable.
create or replace function public.touch_growth_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.actualizado_en = timezone('utc', now());
  return new;
end;
$$;

-- La tabla legacy de perfiles de usuario sólo se consulta/escribe desde una sesión autenticada
-- dentro de su organización. El WITH CHECK impide reasignar filas a otro tenant al actualizar.
alter policy users_insert on public.users to authenticated;
alter policy users_insert on public.users
  with check (organization_id = (select public.get_org_id()));

alter policy users_select on public.users to authenticated;
alter policy users_select on public.users
  using (organization_id = (select public.get_org_id()));

alter policy users_update on public.users to authenticated;
alter policy users_update on public.users
  using (organization_id = (select public.get_org_id()))
  with check (organization_id = (select public.get_org_id()));

-- Mismo refuerzo para la tabla comercial central. Las rutas públicas usan el servidor,
-- por lo que no necesitan acceso directo anon a estas policies.
alter policy cotizaciones_insert on public.cotizaciones to authenticated;
alter policy cotizaciones_insert on public.cotizaciones
  with check (organization_id = (select public.get_org_id()));

alter policy cotizaciones_select on public.cotizaciones to authenticated;
alter policy cotizaciones_select on public.cotizaciones
  using (organization_id = (select public.get_org_id()));

alter policy cotizaciones_update on public.cotizaciones to authenticated;
alter policy cotizaciones_update on public.cotizaciones
  using (organization_id = (select public.get_org_id()))
  with check (organization_id = (select public.get_org_id()));

-- Índice completo para el FK de solicitudes. El parcial existente sigue atendiendo su caso de uso.
create index if not exists cotizaciones_solicitud_id_full_idx
  on public.cotizaciones (solicitud_id);

-- Los assets públicos se entregan en landing; se conserva su acceso público, pero se limita
-- el bucket a las imágenes normalizadas que acepta la API y a 20 MB por objeto.
update storage.buckets
set
  file_size_limit = 20971520,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'organization-assets';
