-- Fase A Marketing Command Center: cola editorial interna del workspace fundador.
-- No expone piezas, guiones ni UTMs a usuarios finales.

create table if not exists public.growth_content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces (id) on delete restrict,
  content_id text not null,
  titulo text not null,
  pilar text not null,
  formato text not null,
  canal text not null,
  objetivo text not null default 'generar_demos',
  hook text null,
  cta text not null default 'Escríbeme DEMO',
  guion text null,
  caption text null,
  campaign_key text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  estado text not null default 'borrador',
  claim_review_status text not null default 'pendiente',
  claim_review_notes text null,
  programado_para timestamptz null,
  publicado_en timestamptz null,
  metadata_json jsonb not null default '{}'::jsonb,
  creado_por_auth_user_id uuid null,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz null,
  constraint growth_content_items_content_id_check check (
    content_id ~ '^[a-z0-9][a-z0-9_-]{2,79}$'
  ),
  constraint growth_content_items_pilar_check check (
    pilar in ('dolor_transformacion', 'demo_producto', 'onboarding', 'objecion', 'oferta')
  ),
  constraint growth_content_items_formato_check check (
    formato in ('reel', 'carrusel', 'story', 'demo_largo', 'onboarding')
  ),
  constraint growth_content_items_canal_check check (
    canal in ('instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'interno')
  ),
  constraint growth_content_items_objetivo_check check (
    objetivo in ('generar_demos', 'activar_prueba', 'primera_cotizacion', 'primer_pdf', 'configurar_lineas', 'aclarar_objecion')
  ),
  constraint growth_content_items_estado_check check (
    estado in ('borrador', 'revision', 'aprobado', 'programado', 'publicado', 'pausado', 'ganador', 'archivado')
  ),
  constraint growth_content_items_claim_review_status_check check (
    claim_review_status in ('pendiente', 'aprobado', 'bloqueado')
  ),
  constraint growth_content_items_programado_para_check check (
    programado_para is null or programado_para >= creado_en
  )
);

create unique index if not exists growth_content_items_workspace_content_uidx
  on public.growth_content_items (workspace_id, content_id)
  where eliminado_en is null;

create index if not exists growth_content_items_workspace_estado_programado_idx
  on public.growth_content_items (workspace_id, estado, programado_para desc)
  where eliminado_en is null;

create index if not exists growth_content_items_workspace_campaign_idx
  on public.growth_content_items (workspace_id, campaign_key, actualizado_en desc)
  where eliminado_en is null and campaign_key is not null;

drop trigger if exists growth_content_items_touch_updated_at on public.growth_content_items;
create trigger growth_content_items_touch_updated_at
  before update on public.growth_content_items
  for each row execute function public.touch_growth_updated_at();

alter table public.growth_content_items enable row level security;
alter table public.growth_content_items force row level security;

create policy growth_content_items_select_admin
  on public.growth_content_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_content_items.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
        and m.rol = 'admin'
    )
  );

create policy growth_content_items_insert_admin
  on public.growth_content_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_content_items.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
        and m.rol = 'admin'
    )
  );

create policy growth_content_items_update_admin
  on public.growth_content_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_content_items.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
        and m.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.growth_workspace_members m
      where m.workspace_id = growth_content_items.workspace_id
        and m.auth_user_id = (select auth.uid())
        and m.activo = true
        and m.rol = 'admin'
    )
  );

grant select, insert, update on public.growth_content_items to authenticated;
grant all on public.growth_content_items to service_role;
