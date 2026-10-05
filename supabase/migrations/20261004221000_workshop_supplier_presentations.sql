-- Presentaciones privadas del taller. No alteran el catálogo ni las listas oficiales.
-- Aplicar solo después de verificar la migración base Supplier Catalogs V1.
create table public.organizacion_presentaciones_taller (
  id uuid primary key default gen_random_uuid(),
  organization_id bigint not null references public.organizations(id),
  family_key text not null check (length(trim(family_key)) > 0),
  configuration_key text,
  insumo_oficial_id uuid references public.catalogo_insumos_tecnicos(id),
  codigo_tecnico text not null check (length(trim(codigo_tecnico)) > 0),
  codigo_receta text,
  nombre_perfil text not null check (length(trim(nombre_perfil)) > 0),
  sku_taller text not null check (length(trim(sku_taller)) > 0),
  descripcion text not null check (length(trim(descripcion)) > 0),
  modo_acabado text not null check (modo_acabado in ('especifico', 'independiente')),
  acabado_nombre text,
  unidad_compra text not null check (length(trim(unidad_compra)) > 0),
  largo_comercial_mm integer check (largo_comercial_mm is null or largo_comercial_mm > 0),
  precio_neto numeric(14,2) check (precio_neto is null or precio_neto > 0),
  moneda text check (moneda is null or moneda ~ '^[A-Z]{3}$'),
  preferida boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz,
  check ((modo_acabado = 'independiente' and acabado_nombre is null)
    or (modo_acabado = 'especifico' and nullif(trim(acabado_nombre), '') is not null)),
  check ((precio_neto is null and moneda is null) or (precio_neto is not null and moneda is not null))
);

create unique index organizacion_presentaciones_taller_sku_active_uq
  on public.organizacion_presentaciones_taller (organization_id, family_key, sku_taller)
  where eliminado_en is null;
create unique index organizacion_presentaciones_taller_preferida_uq
  on public.organizacion_presentaciones_taller
  (organization_id, family_key, coalesce(configuration_key, ''), upper(codigo_tecnico), coalesce(lower(acabado_nombre), ''))
  where preferida and eliminado_en is null;
create index organizacion_presentaciones_taller_family_idx
  on public.organizacion_presentaciones_taller (organization_id, family_key)
  where eliminado_en is null;
create index organizacion_presentaciones_taller_insumo_idx
  on public.organizacion_presentaciones_taller (insumo_oficial_id)
  where insumo_oficial_id is not null and eliminado_en is null;

alter table public.organizacion_presentaciones_taller enable row level security;
revoke all on public.organizacion_presentaciones_taller from public, anon, authenticated;
grant select on public.organizacion_presentaciones_taller to authenticated;
grant select, insert, update on public.organizacion_presentaciones_taller to service_role;
create policy organizacion_presentaciones_taller_select
  on public.organizacion_presentaciones_taller for select to authenticated
  using (organization_id = (select public.get_org_id()));
