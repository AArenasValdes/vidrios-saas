alter table public.organization_profile
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text,
  add column if not exists website_url text,
  add column if not exists public_services text[] not null default '{}'::text[],
  add column if not exists final_cta_title text,
  add column if not exists final_cta_subtitle text,
  add column if not exists final_cta_label text,
  add column if not exists business_hours_note text;

alter table public.public_landing_gallery
  add column if not exists work_title text,
  add column if not exists work_type text,
  add column if not exists work_zone text,
  add column if not exists work_badge text;

create table if not exists public.public_landing_testimonials (
  id uuid primary key default gen_random_uuid(),
  organization_id bigint not null references public.organizations(id) on delete cascade,
  nombre_corto text,
  comentario text not null,
  estrellas integer not null,
  estado text not null default 'pendiente',
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  aprobado_en timestamptz,
  ocultado_en timestamptz,
  constraint public_landing_testimonials_estrellas_chk check (estrellas between 1 and 5),
  constraint public_landing_testimonials_estado_chk check (estado in ('pendiente', 'aprobada', 'oculta'))
);

create index if not exists public_landing_testimonials_org_estado_creado_idx
  on public.public_landing_testimonials (organization_id, estado, creado_en desc);

alter table public.public_landing_testimonials enable row level security;

drop policy if exists public_landing_testimonials_select_authenticated on public.public_landing_testimonials;
create policy public_landing_testimonials_select_authenticated
  on public.public_landing_testimonials
  for select
  to authenticated
  using (organization_id = public.get_org_id());

drop policy if exists public_landing_testimonials_insert_authenticated on public.public_landing_testimonials;
create policy public_landing_testimonials_insert_authenticated
  on public.public_landing_testimonials
  for insert
  to authenticated
  with check (organization_id = public.get_org_id());

drop policy if exists public_landing_testimonials_update_authenticated on public.public_landing_testimonials;
create policy public_landing_testimonials_update_authenticated
  on public.public_landing_testimonials
  for update
  to authenticated
  using (organization_id = public.get_org_id())
  with check (organization_id = public.get_org_id());

drop policy if exists public_landing_testimonials_delete_authenticated on public.public_landing_testimonials;
create policy public_landing_testimonials_delete_authenticated
  on public.public_landing_testimonials
  for delete
  to authenticated
  using (organization_id = public.get_org_id());
