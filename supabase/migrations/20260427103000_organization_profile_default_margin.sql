alter table public.organization_profile
add column if not exists margen_defecto numeric default 100;

comment on column public.organization_profile.margen_defecto is
  'Margen de ganancia sugerido por defecto para nuevas cotizaciones y componentes.';
