-- V1 catálogos comerciales de proveedores: datos globales, escritura solo de servidor.
-- Las listas y fuentes técnicas se versionan en registros distintos.

create table if not exists public.catalogo_proveedores (
  proveedor_key text primary key,
  nombre text not null,
  fabricante text not null,
  creado_en timestamptz not null default now()
);

create table if not exists public.catalogo_fuentes_tecnicas (
  id uuid primary key default gen_random_uuid(),
  proveedor_key text not null references public.catalogo_proveedores(proveedor_key),
  emisor text not null,
  revision text not null,
  referencia_fuente text not null,
  importado_en timestamptz not null default now(),
  unique (proveedor_key, revision),
  unique (id, proveedor_key)
);

create table if not exists public.catalogo_insumos_tecnicos (
  id uuid primary key default gen_random_uuid(),
  fuente_tecnica_id uuid not null references public.catalogo_fuentes_tecnicas(id),
  clave_tecnica text not null,
  codigo_fuente text not null,
  nombre text not null,
  material text not null,
  seccion_mm jsonb,
  evidencia jsonb not null,
  creado_en timestamptz not null default now(),
  unique (fuente_tecnica_id, clave_tecnica),
  unique (id, fuente_tecnica_id)
);

create table if not exists public.catalogo_insumo_familias (
  insumo_tecnico_id uuid not null references public.catalogo_insumos_tecnicos(id) on delete cascade,
  family_key text not null,
  primary key (insumo_tecnico_id, family_key)
);

create table if not exists public.catalogo_presentaciones_proveedor (
  id uuid primary key default gen_random_uuid(),
  proveedor_key text not null,
  fuente_tecnica_id uuid not null,
  insumo_tecnico_id uuid,
  sku_proveedor text not null,
  descripcion text not null,
  modo_acabado text not null check (modo_acabado in ('especifico', 'independiente')),
  acabado_codigo text,
  acabado_nombre text,
  unidad_compra text not null,
  largo_comercial_mm integer check (largo_comercial_mm is null or largo_comercial_mm > 0),
  estado_asociacion text not null check (estado_asociacion in ('confirmada', 'pendiente', 'rechazada')),
  evidencia_asociacion jsonb,
  creado_en timestamptz not null default now(),
  unique (fuente_tecnica_id, proveedor_key, sku_proveedor),
  unique (id, proveedor_key),
  foreign key (fuente_tecnica_id, proveedor_key)
    references public.catalogo_fuentes_tecnicas(id, proveedor_key),
  foreign key (insumo_tecnico_id, fuente_tecnica_id)
    references public.catalogo_insumos_tecnicos(id, fuente_tecnica_id),
  check (
    (modo_acabado = 'especifico' and acabado_codigo is not null and acabado_nombre is not null)
    or (modo_acabado = 'independiente' and acabado_codigo is null and acabado_nombre is null)
  ),
  check (estado_asociacion <> 'confirmada' or (insumo_tecnico_id is not null and evidencia_asociacion is not null))
);

create table if not exists public.catalogo_listas_precios (
  id uuid primary key default gen_random_uuid(),
  proveedor_key text not null references public.catalogo_proveedores(proveedor_key),
  nombre text not null,
  revision text not null,
  publicado_en date,
  vigente_desde date,
  vigente_hasta date,
  referencia_fuente text not null,
  moneda text,
  base_precio text not null check (base_precio in ('presentacion_comercial', 'metro_lineal', 'desconocida')),
  creado_en timestamptz not null default now(),
  unique (proveedor_key, revision),
  unique (id, proveedor_key),
  check (vigente_hasta is null or vigente_desde is null or vigente_hasta >= vigente_desde)
);

create table if not exists public.catalogo_precios_presentacion (
  id uuid primary key default gen_random_uuid(),
  lista_precio_id uuid not null,
  presentacion_id uuid not null,
  proveedor_key text not null,
  precio_neto numeric(14,2) not null check (precio_neto > 0),
  moneda text,
  evidencia_precio jsonb not null,
  creado_en timestamptz not null default now(),
  unique (lista_precio_id, presentacion_id),
  foreign key (lista_precio_id, proveedor_key)
    references public.catalogo_listas_precios(id, proveedor_key),
  foreign key (presentacion_id, proveedor_key)
    references public.catalogo_presentaciones_proveedor(id, proveedor_key)
);

-- Congelado una sola vez para cotizaciones elegibles de QA. No modifica precios ni costos comerciales.
create table if not exists public.cotizacion_costos_tecnicos (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id bigint not null unique references public.cotizaciones(id),
  organization_id bigint not null references public.organizations(id),
  estado text not null check (estado in ('parcial', 'completo')),
  snapshot jsonb not null,
  calculado_en timestamptz not null default now(),
  check (jsonb_typeof(snapshot) = 'object')
);

create index if not exists catalogo_insumos_tecnicos_fuente_idx
  on public.catalogo_insumos_tecnicos (fuente_tecnica_id);
create index if not exists catalogo_insumo_familias_family_idx
  on public.catalogo_insumo_familias (family_key);
create index if not exists catalogo_presentaciones_insumo_idx
  on public.catalogo_presentaciones_proveedor (insumo_tecnico_id)
  where estado_asociacion = 'confirmada';
create index if not exists catalogo_presentaciones_fuente_idx
  on public.catalogo_presentaciones_proveedor (fuente_tecnica_id);
create index if not exists catalogo_presentaciones_proveedor_idx
  on public.catalogo_presentaciones_proveedor (proveedor_key);
create index if not exists catalogo_presentaciones_insumo_fuente_idx
  on public.catalogo_presentaciones_proveedor (insumo_tecnico_id, fuente_tecnica_id);
create index if not exists catalogo_listas_precios_proveedor_fecha_idx
  on public.catalogo_listas_precios (proveedor_key, publicado_en desc);
create index if not exists catalogo_precios_lista_idx
  on public.catalogo_precios_presentacion (lista_precio_id);
create index if not exists catalogo_precios_presentacion_idx
  on public.catalogo_precios_presentacion (presentacion_id);
create index if not exists catalogo_precios_lista_proveedor_idx
  on public.catalogo_precios_presentacion (lista_precio_id, proveedor_key);
create index if not exists catalogo_precios_presentacion_proveedor_idx
  on public.catalogo_precios_presentacion (presentacion_id, proveedor_key);
create index if not exists cotizacion_costos_tecnicos_org_idx
  on public.cotizacion_costos_tecnicos (organization_id, calculado_en desc);

alter table public.catalogo_proveedores enable row level security;
alter table public.catalogo_fuentes_tecnicas enable row level security;
alter table public.catalogo_insumos_tecnicos enable row level security;
alter table public.catalogo_insumo_familias enable row level security;
alter table public.catalogo_presentaciones_proveedor enable row level security;
alter table public.catalogo_listas_precios enable row level security;
alter table public.catalogo_precios_presentacion enable row level security;
alter table public.cotizacion_costos_tecnicos enable row level security;

revoke all on table public.catalogo_proveedores,
  public.catalogo_fuentes_tecnicas,
  public.catalogo_insumos_tecnicos,
  public.catalogo_insumo_familias,
  public.catalogo_presentaciones_proveedor,
  public.catalogo_listas_precios,
  public.catalogo_precios_presentacion,
  public.cotizacion_costos_tecnicos
from public, anon, authenticated;

grant select, insert, update, delete on table public.catalogo_proveedores,
  public.catalogo_fuentes_tecnicas,
  public.catalogo_insumos_tecnicos,
  public.catalogo_insumo_familias,
  public.catalogo_presentaciones_proveedor,
  public.catalogo_listas_precios,
  public.catalogo_precios_presentacion,
  public.cotizacion_costos_tecnicos
to service_role;
