alter table public.organization_profile
add column if not exists modo_precio_preferido text not null default 'margen';

comment on column public.organization_profile.modo_precio_preferido is
  'Define si la empresa trabaja por defecto con margen de ganancia o con precio directo por componente.';
