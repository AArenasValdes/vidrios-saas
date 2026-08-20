-- Fase B Marketing: biblioteca de videos, asignación por empresa y activación medible.
-- La información de clientes no se duplica: sólo se guarda organization_id y señales operativas.

create table if not exists public.growth_onboarding_videos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  slug text not null,
  titulo text not null,
  resumen text null,
  paso text not null default 'bienvenida',
  dispositivo text not null,
  duracion_segundos integer null,
  video_url text null,
  estado text not null default 'borrador',
  orden integer not null default 0,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz null,
  constraint growth_onboarding_videos_slug_check
    check (slug ~ '^[a-z0-9][a-z0-9_-]{2,79}$'),
  constraint growth_onboarding_videos_paso_check
    check (paso in ('bienvenida', 'primera_cotizacion', 'pdf_whatsapp', 'lineas_precios', 'solicitudes_clientes', 'items_constructor', 'pauta_interna')),
  constraint growth_onboarding_videos_dispositivo_check
    check (dispositivo in ('movil', 'escritorio', 'ambos')),
  constraint growth_onboarding_videos_duracion_check
    check (duracion_segundos is null or duracion_segundos between 15 and 900),
  constraint growth_onboarding_videos_estado_check
    check (estado in ('borrador', 'listo', 'archivado')),
  constraint growth_onboarding_videos_url_check
    check (video_url is null or video_url ~ '^https://')
);

create unique index if not exists growth_onboarding_videos_workspace_slug_uidx
  on public.growth_onboarding_videos (workspace_id, slug)
  where eliminado_en is null;

create index if not exists growth_onboarding_videos_workspace_estado_orden_idx
  on public.growth_onboarding_videos (workspace_id, estado, orden)
  where eliminado_en is null;

create table if not exists public.growth_onboarding_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  organization_id bigint not null references public.organizations (id) on delete restrict,
  video_id uuid not null references public.growth_onboarding_videos (id) on delete restrict,
  estado text not null default 'pendiente',
  asignado_por_auth_user_id uuid null,
  asignado_en timestamptz not null default timezone('utc', now()),
  visto_en timestamptz null,
  completado_en timestamptz null,
  notas text null,
  actualizado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz null,
  constraint growth_onboarding_assignments_estado_check
    check (estado in ('pendiente', 'visto', 'completado', 'pausado')),
  constraint growth_onboarding_assignments_completion_check
    check (completado_en is null or visto_en is not null)
);

create unique index if not exists growth_onboarding_assignments_workspace_org_video_uidx
  on public.growth_onboarding_assignments (workspace_id, organization_id, video_id)
  where eliminado_en is null;

create index if not exists growth_onboarding_assignments_org_estado_idx
  on public.growth_onboarding_assignments (organization_id, estado, asignado_en desc)
  where eliminado_en is null;

create index if not exists growth_onboarding_assignments_workspace_org_idx
  on public.growth_onboarding_assignments (workspace_id, organization_id)
  where eliminado_en is null;

create table if not exists public.growth_onboarding_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  organization_id bigint not null references public.organizations (id) on delete restrict,
  assignment_id uuid null references public.growth_onboarding_assignments (id) on delete set null,
  video_id uuid null references public.growth_onboarding_videos (id) on delete set null,
  cotizacion_id bigint null references public.cotizaciones (id) on delete set null,
  tipo text not null,
  fuente text not null default 'sistema',
  metadata_json jsonb not null default '{}'::jsonb,
  ocurrido_en timestamptz not null default timezone('utc', now()),
  constraint growth_onboarding_events_tipo_check
    check (tipo in ('video_abierto', 'video_completado', 'primera_cotizacion_creada', 'primer_pdf_descargado')),
  constraint growth_onboarding_events_fuente_check
    check (fuente in ('sistema', 'cliente', 'admin'))
);

create unique index if not exists growth_onboarding_events_first_value_uidx
  on public.growth_onboarding_events (organization_id, tipo)
  where tipo in ('primera_cotizacion_creada', 'primer_pdf_descargado');

create index if not exists growth_onboarding_events_workspace_org_ocurrido_idx
  on public.growth_onboarding_events (workspace_id, organization_id, ocurrido_en desc);

drop trigger if exists growth_onboarding_videos_touch_updated_at on public.growth_onboarding_videos;
create trigger growth_onboarding_videos_touch_updated_at
  before update on public.growth_onboarding_videos
  for each row execute function public.touch_growth_updated_at();

drop trigger if exists growth_onboarding_assignments_touch_updated_at on public.growth_onboarding_assignments;
create trigger growth_onboarding_assignments_touch_updated_at
  before update on public.growth_onboarding_assignments
  for each row execute function public.touch_growth_updated_at();

-- Los dos hitos de valor se capturan en Postgres para no depender de una llamada del navegador.
create or replace function public.capture_growth_onboarding_quote_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  founder_workspace_id uuid;
begin
  if new.eliminado_en is not null or new.estado = 'borrador' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.estado <> 'borrador' then
    return new;
  end if;

  select id into founder_workspace_id
  from public.growth_workspaces
  where slug = 'ventora-founder'
    and eliminado_en is null
  limit 1;

  if founder_workspace_id is not null then
    insert into public.growth_onboarding_events (
      workspace_id, organization_id, cotizacion_id, tipo, fuente, ocurrido_en
    ) values (
      founder_workspace_id, new.organization_id, new.id,
      'primera_cotizacion_creada', 'sistema', coalesce(new.creado_en, timezone('utc', now()))
    ) on conflict do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.capture_growth_onboarding_pdf_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  founder_workspace_id uuid;
begin
  if new.pdf_descargado_en is null or old.pdf_descargado_en is not null then
    return new;
  end if;

  select id into founder_workspace_id
  from public.growth_workspaces
  where slug = 'ventora-founder'
    and eliminado_en is null
  limit 1;

  if founder_workspace_id is not null then
    insert into public.growth_onboarding_events (
      workspace_id, organization_id, cotizacion_id, tipo, fuente, ocurrido_en
    ) values (
      founder_workspace_id, new.organization_id, new.id,
      'primer_pdf_descargado', 'sistema', new.pdf_descargado_en
    ) on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.capture_growth_onboarding_quote_event() from public, anon, authenticated;
revoke all on function public.capture_growth_onboarding_pdf_event() from public, anon, authenticated;

drop trigger if exists cotizaciones_capture_growth_onboarding_quote_event on public.cotizaciones;
create trigger cotizaciones_capture_growth_onboarding_quote_event
  after insert or update of estado on public.cotizaciones
  for each row execute function public.capture_growth_onboarding_quote_event();

drop trigger if exists cotizaciones_capture_growth_onboarding_pdf_event on public.cotizaciones;
create trigger cotizaciones_capture_growth_onboarding_pdf_event
  after update of pdf_descargado_en on public.cotizaciones
  for each row execute function public.capture_growth_onboarding_pdf_event();

-- Línea base: los eventos nuevos quedan en tiempo real; las cuentas existentes conservan su primer hito histórico.
insert into public.growth_onboarding_events (
  workspace_id, organization_id, cotizacion_id, tipo, fuente, ocurrido_en
)
select distinct on (c.organization_id)
  gw.id, c.organization_id, c.id, 'primera_cotizacion_creada', 'sistema', c.creado_en
from public.cotizaciones c
cross join public.growth_workspaces gw
where gw.slug = 'ventora-founder'
  and gw.eliminado_en is null
  and c.eliminado_en is null
  and c.estado <> 'borrador'
order by c.organization_id, c.creado_en asc, c.id asc
on conflict do nothing;

insert into public.growth_onboarding_events (
  workspace_id, organization_id, cotizacion_id, tipo, fuente, ocurrido_en
)
select distinct on (c.organization_id)
  gw.id, c.organization_id, c.id, 'primer_pdf_descargado', 'sistema', c.pdf_descargado_en
from public.cotizaciones c
cross join public.growth_workspaces gw
where gw.slug = 'ventora-founder'
  and gw.eliminado_en is null
  and c.eliminado_en is null
  and c.pdf_descargado_en is not null
order by c.organization_id, c.pdf_descargado_en asc, c.id asc
on conflict do nothing;

alter table public.growth_onboarding_videos enable row level security;
alter table public.growth_onboarding_videos force row level security;
alter table public.growth_onboarding_assignments enable row level security;
alter table public.growth_onboarding_assignments force row level security;
alter table public.growth_onboarding_events enable row level security;
alter table public.growth_onboarding_events force row level security;

create policy growth_onboarding_videos_select_admin
  on public.growth_onboarding_videos for select to authenticated
  using (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_videos.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  ));

create policy growth_onboarding_videos_insert_admin
  on public.growth_onboarding_videos for insert to authenticated
  with check (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_videos.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  ));

create policy growth_onboarding_videos_update_admin
  on public.growth_onboarding_videos for update to authenticated
  using (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_videos.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  )) with check (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_videos.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  ));

create policy growth_onboarding_assignments_select_admin_or_org
  on public.growth_onboarding_assignments for select to authenticated
  using (
    organization_id = (select public.get_org_id())
    or exists (
      select 1 from public.growth_workspace_members m
      where m.workspace_id = growth_onboarding_assignments.workspace_id
        and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
    )
  );

create policy growth_onboarding_assignments_write_admin
  on public.growth_onboarding_assignments for all to authenticated
  using (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_assignments.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  )) with check (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_assignments.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  ));

create policy growth_onboarding_events_select_admin_or_org
  on public.growth_onboarding_events for select to authenticated
  using (
    organization_id = (select public.get_org_id())
    or exists (
      select 1 from public.growth_workspace_members m
      where m.workspace_id = growth_onboarding_events.workspace_id
        and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
    )
  );

grant select, insert, update on public.growth_onboarding_videos to authenticated;
grant select, insert, update, delete on public.growth_onboarding_assignments to authenticated;
grant select on public.growth_onboarding_events to authenticated;
grant all on public.growth_onboarding_videos, public.growth_onboarding_assignments, public.growth_onboarding_events to service_role;
