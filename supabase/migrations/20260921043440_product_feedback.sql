create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id bigint not null,
  auth_user_id uuid not null,
  category text not null,
  description text,
  page_path text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_feedback_organization_id_fkey
    foreign key (organization_id) references public.organizations(id) on delete cascade,
  constraint product_feedback_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users(id) on delete cascade,
  constraint product_feedback_category_check
    check (category in (
      'cotizaciones',
      'catalogo_precios',
      'clientes_solicitudes',
      'fabricacion',
      'pagina_venta',
      'aplicacion_movil',
      'otro'
    )),
  constraint product_feedback_description_check
    check (description is null or (char_length(description) <= 1000 and char_length(btrim(description)) > 0)),
  constraint product_feedback_page_path_check
    check (page_path is null or (char_length(page_path) <= 180 and left(page_path, 1) = '/' and left(page_path, 2) <> '//')),
  constraint product_feedback_status_check
    check (status in ('new', 'triage', 'planned', 'in_progress', 'done', 'not_planned'))
);

create index if not exists product_feedback_created_at_idx
  on public.product_feedback (created_at desc);

create index if not exists product_feedback_category_created_at_idx
  on public.product_feedback (category, created_at desc);

create index if not exists product_feedback_organization_created_at_idx
  on public.product_feedback (organization_id, created_at desc);

create index if not exists product_feedback_auth_user_id_idx
  on public.product_feedback (auth_user_id);

alter table public.product_feedback enable row level security;

revoke all on table public.product_feedback from anon, authenticated;
grant insert on table public.product_feedback to authenticated;
grant select, insert, update, delete on table public.product_feedback to service_role;

create policy product_feedback_insert_own_organization
  on public.product_feedback
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and auth_user_id = (select auth.uid())
    and organization_id = (select public.get_org_id())
  );
