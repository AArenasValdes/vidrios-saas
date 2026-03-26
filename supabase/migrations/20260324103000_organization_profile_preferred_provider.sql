alter table public.organization_profile
  add column if not exists proveedor_preferido text;

comment on column public.organization_profile.proveedor_preferido is
  'Proveedor principal de la organizacion para sugerencias rapidas al crear componentes.';
