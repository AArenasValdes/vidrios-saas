-- Private purchase-price preferences. Global supplier catalogs and existing snapshots stay unchanged.
create table public.organizacion_ajustes_proveedor (
  organization_id bigint not null references public.organizations(id),
  proveedor_key text not null references public.catalogo_proveedores(proveedor_key),
  ajuste_porcentaje numeric(7,3) not null default 0
    check (ajuste_porcentaje > -100 and ajuste_porcentaje <= 1000),
  activo boolean not null default true,
  actualizado_en timestamptz not null default now(),
  primary key (organization_id, proveedor_key)
);

create table public.organizacion_precios_presentacion (
  organization_id bigint not null references public.organizations(id),
  presentacion_id uuid not null references public.catalogo_presentaciones_proveedor(id),
  precio_neto numeric(14,2) not null check (precio_neto > 0),
  moneda text not null check (moneda ~ '^[A-Z]{3}$'),
  procedencia jsonb,
  actualizado_en timestamptz not null default now(),
  primary key (organization_id, presentacion_id),
  check (procedencia is null or jsonb_typeof(procedencia) = 'object')
);

create index organizacion_precios_presentacion_presentacion_idx
  on public.organizacion_precios_presentacion (presentacion_id);

alter table public.cotizacion_costos_tecnicos
  drop constraint if exists cotizacion_costos_tecnicos_estado_check;
alter table public.cotizacion_costos_tecnicos
  add constraint cotizacion_costos_tecnicos_estado_check
  check (estado in ('sin_datos', 'parcial', 'completo'));

alter table public.organizacion_ajustes_proveedor enable row level security;
alter table public.organizacion_precios_presentacion enable row level security;

revoke all on public.organizacion_ajustes_proveedor,
  public.organizacion_precios_presentacion from public, anon, authenticated;

-- The app writes through its authenticated, admin-only server endpoint.
-- Authenticated reads remain tenant-scoped as a defense in depth.
grant select on public.organizacion_ajustes_proveedor,
  public.organizacion_precios_presentacion to authenticated;
grant select, insert, update, delete on public.organizacion_ajustes_proveedor,
  public.organizacion_precios_presentacion to service_role;

create policy organizacion_ajustes_proveedor_select
  on public.organizacion_ajustes_proveedor for select to authenticated
  using (organization_id = (select public.get_org_id()));
create policy organizacion_precios_presentacion_select
  on public.organizacion_precios_presentacion for select to authenticated
  using (organization_id = (select public.get_org_id()));
