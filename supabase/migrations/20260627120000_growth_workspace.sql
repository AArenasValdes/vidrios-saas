-- Growth OS: workspace interno de prospección comercial Ventora (dominio separado de solicitudes_contacto)

create table if not exists public.growth_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  nombre text not null,
  configuracion_json jsonb not null default '{}'::jsonb,
  metricas_manuales_json jsonb not null default '{}'::jsonb,
  experimentos_json jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz null,
  constraint growth_workspaces_slug_key unique (slug)
);

create table if not exists public.growth_workspace_members (
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  auth_user_id uuid not null,
  rol text not null default 'admin',
  activo boolean not null default true,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, auth_user_id),
  constraint growth_workspace_members_rol_check check (rol in ('admin', 'member'))
);

create table if not exists public.growth_prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  legacy_source_id text null,
  empresa text not null,
  contacto_nombre text null,
  telefono text null,
  correo text null,
  instagram_url text null,
  sitio_web text null,
  ciudad text null,
  region text null,
  rubro text null,
  fuente text not null default 'manual',
  segmento text null,
  senal_dolor text null,
  resumen_personalizacion text null,
  puntaje_prioridad integer not null default 0,
  estado text not null default 'nuevo',
  ultimo_contacto_en timestamptz null,
  proxima_accion_en timestamptz null,
  proxima_accion_tipo text null,
  converted_organization_id bigint null references public.organizations (id) on delete set null,
  motivo_perdida text null,
  no_contactar boolean not null default false,
  data_status text not null default 'real',
  creado_por_auth_user_id uuid null,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz null,
  constraint growth_prospects_estado_check check (
    estado in (
      'nuevo',
      'investigado',
      'listo_para_contactar',
      'contactado',
      'respondio',
      'calificado',
      'demo_agendada',
      'piloto_activo',
      'activado',
      'pagado',
      'sin_respuesta',
      'no_calza',
      'no_contactar'
    )
  ),
  constraint growth_prospects_data_status_check check (
    data_status in ('real', 'manual', 'mock')
  )
);

create table if not exists public.growth_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  prospect_id uuid not null references public.growth_prospects (id) on delete restrict,
  tipo text not null,
  canal text null,
  contenido text null,
  metadata_json jsonb not null default '{}'::jsonb,
  creado_por_auth_user_id uuid null,
  creado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz null,
  constraint growth_activities_tipo_check check (
    tipo in (
      'nota',
      'mensaje_enviado',
      'respuesta',
      'followup',
      'demo',
      'trial',
      'activacion',
      'pago',
      'perdida',
      'cambio_estado'
    )
  )
);

create table if not exists public.growth_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  prospect_id uuid null references public.growth_prospects (id) on delete set null,
  titulo text not null,
  tipo text not null,
  prioridad text not null default 'media',
  vence_en timestamptz null,
  completada_en timestamptz null,
  metadata_json jsonb not null default '{}'::jsonb,
  creado_por_auth_user_id uuid null,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz null,
  constraint growth_tasks_tipo_check check (
    tipo in (
      'contactar',
      'followup',
      'demo',
      'activar_trial',
      'recuperar_pago',
      'revisar',
      'otro'
    )
  ),
  constraint growth_tasks_prioridad_check check (
    prioridad in ('alta', 'media', 'baja')
  )
);

-- Índices parciales para consultas operativas frecuentes
create index if not exists growth_prospects_workspace_estado_proxima_idx
  on public.growth_prospects (workspace_id, estado, proxima_accion_en)
  where eliminado_en is null;

create index if not exists growth_prospects_workspace_active_idx
  on public.growth_prospects (workspace_id)
  where eliminado_en is null;

create index if not exists growth_prospects_workspace_converted_org_idx
  on public.growth_prospects (workspace_id, converted_organization_id)
  where converted_organization_id is not null and eliminado_en is null;

create unique index if not exists growth_prospects_workspace_legacy_uidx
  on public.growth_prospects (workspace_id, legacy_source_id)
  where legacy_source_id is not null and eliminado_en is null;

create index if not exists growth_tasks_workspace_pending_idx
  on public.growth_tasks (workspace_id, vence_en)
  where eliminado_en is null and completada_en is null;

create index if not exists growth_activities_prospect_idx
  on public.growth_activities (prospect_id, creado_en desc)
  where eliminado_en is null;

create index if not exists growth_workspace_members_auth_user_idx
  on public.growth_workspace_members (auth_user_id)
  where activo = true;

-- Triggers actualizado_en
create or replace function public.touch_growth_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists growth_workspaces_touch_updated_at on public.growth_workspaces;
create trigger growth_workspaces_touch_updated_at
  before update on public.growth_workspaces
  for each row execute function public.touch_growth_updated_at();

drop trigger if exists growth_prospects_touch_updated_at on public.growth_prospects;
create trigger growth_prospects_touch_updated_at
  before update on public.growth_prospects
  for each row execute function public.touch_growth_updated_at();

drop trigger if exists growth_tasks_touch_updated_at on public.growth_tasks;
create trigger growth_tasks_touch_updated_at
  before update on public.growth_tasks
  for each row execute function public.touch_growth_updated_at();

drop trigger if exists growth_workspace_members_touch_updated_at on public.growth_workspace_members;
create trigger growth_workspace_members_touch_updated_at
  before update on public.growth_workspace_members
  for each row execute function public.touch_growth_updated_at();

-- RLS
alter table public.growth_workspaces enable row level security;
alter table public.growth_workspaces force row level security;
alter table public.growth_workspace_members enable row level security;
alter table public.growth_workspace_members force row level security;
alter table public.growth_prospects enable row level security;
alter table public.growth_prospects force row level security;
alter table public.growth_activities enable row level security;
alter table public.growth_activities force row level security;
alter table public.growth_tasks enable row level security;
alter table public.growth_tasks force row level security;

-- growth_workspaces
create policy growth_workspaces_select_member
  on public.growth_workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_workspaces.id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

create policy growth_workspaces_update_admin
  on public.growth_workspaces
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_workspaces.id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
        and m.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_workspaces.id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
        and m.rol = 'admin'
    )
  );

-- growth_workspace_members: ver solo la propia fila (evita recursión RLS)
create policy growth_workspace_members_select_own
  on public.growth_workspace_members
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

-- growth_prospects
create policy growth_prospects_select_member
  on public.growth_prospects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_prospects.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

create policy growth_prospects_insert_member
  on public.growth_prospects
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_prospects.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

create policy growth_prospects_update_member
  on public.growth_prospects
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_prospects.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  )
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_prospects.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

-- growth_activities
create policy growth_activities_select_member
  on public.growth_activities
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_activities.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

create policy growth_activities_insert_member
  on public.growth_activities
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_activities.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

create policy growth_activities_update_member
  on public.growth_activities
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_activities.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  )
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_activities.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

-- growth_tasks
create policy growth_tasks_select_member
  on public.growth_tasks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_tasks.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

create policy growth_tasks_insert_member
  on public.growth_tasks
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_tasks.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

create policy growth_tasks_update_member
  on public.growth_tasks
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_tasks.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  )
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_tasks.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
    )
  );

grant select, insert, update on public.growth_workspaces to authenticated;
grant select, insert, update on public.growth_workspace_members to authenticated;
grant select, insert, update on public.growth_prospects to authenticated;
grant select, insert, update on public.growth_activities to authenticated;
grant select, insert, update on public.growth_tasks to authenticated;

-- Seed workspace fundador
insert into public.growth_workspaces (slug, nombre)
values ('ventora-founder', 'Growth Ventora')
on conflict (slug) do nothing;

insert into public.growth_workspace_members (workspace_id, auth_user_id, rol)
select gw.id, u.auth_user_id, 'admin'
from public.growth_workspaces gw
cross join public.users u
where gw.slug = 'ventora-founder'
  and lower(trim(u.correo)) = 'alessandroreal2.0@gmail.com'
  and u.rol = 'admin'
  and u.auth_user_id is not null
  and u.eliminado_en is null
on conflict (workspace_id, auth_user_id) do nothing;
