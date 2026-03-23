-- Migracion para perfil de empresa + branding en PDF.
-- Este script detecta automaticamente el tipo de public.organizations.id.
-- Debe ejecutarse con permisos de admin en Supabase SQL Editor o via CLI.

do $$
declare
  organization_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into organization_id_type
  from pg_attribute as attribute
  join pg_class as class on class.oid = attribute.attrelid
  join pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relname = 'organizations'
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if organization_id_type is null then
    raise exception 'No se encontro public.organizations.id. Ajusta la migracion antes de ejecutarla.';
  end if;

  execute format(
    'create table if not exists public.organization_profile (
      organization_id %s primary key references public.organizations (id) on delete cascade,
      empresa_nombre text,
      empresa_logo_url text,
      empresa_direccion text,
      empresa_telefono text,
      empresa_email text,
      brand_color text not null default ''#1a3a5c'',
      forma_pago text,
      creado_en timestamptz not null default timezone(''utc'', now()),
      actualizado_en timestamptz not null default timezone(''utc'', now())
    )',
    organization_id_type
  );
end $$;

comment on table public.organization_profile is
  'Perfil comercial de la organizacion para branding del PDF y datos de contacto.';

comment on column public.organization_profile.brand_color is
  'Color principal de marca en formato hex. Si no existe, el sistema usa #1a3a5c.';

comment on column public.organization_profile.forma_pago is
  'Texto libre de condiciones de pago para mostrar en el PDF.';

alter table public.organization_profile enable row level security;

grant select, insert, update on public.organization_profile to authenticated;

drop policy if exists "organization_profile_select_own" on public.organization_profile;
create policy "organization_profile_select_own"
  on public.organization_profile
  for select
  to authenticated
  using (
    organization_id in (
      select users.organization_id
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
    )
  );

drop policy if exists "organization_profile_insert_own" on public.organization_profile;
create policy "organization_profile_insert_own"
  on public.organization_profile
  for insert
  to authenticated
  with check (
    organization_id in (
      select users.organization_id
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
    )
  );

drop policy if exists "organization_profile_update_own" on public.organization_profile;
create policy "organization_profile_update_own"
  on public.organization_profile
  for update
  to authenticated
  using (
    organization_id in (
      select users.organization_id
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
    )
  )
  with check (
    organization_id in (
      select users.organization_id
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
    )
  );

insert into storage.buckets (id, name, public)
select 'organization-assets', 'organization-assets', true
where not exists (
  select 1 from storage.buckets where id = 'organization-assets'
);

drop policy if exists "organization_assets_public_read" on storage.objects;
create policy "organization_assets_public_read"
  on storage.objects
  for select
  using (bucket_id = 'organization-assets');

drop policy if exists "organization_assets_insert_own" on storage.objects;
create policy "organization_assets_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = (
      select users.organization_id::text
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
      limit 1
    )
  );

drop policy if exists "organization_assets_update_own" on storage.objects;
create policy "organization_assets_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = (
      select users.organization_id::text
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
      limit 1
    )
  )
  with check (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = (
      select users.organization_id::text
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
      limit 1
    )
  );

drop policy if exists "organization_assets_delete_own" on storage.objects;
create policy "organization_assets_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = (
      select users.organization_id::text
      from public.users as users
      where lower(users.correo) = lower(auth.email())
        and users.eliminado_en is null
      limit 1
    )
  );
