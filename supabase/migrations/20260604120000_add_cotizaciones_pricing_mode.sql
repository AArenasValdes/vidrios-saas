alter table public.cotizaciones
  add column if not exists pricing_mode text not null default 'por_item';

alter table public.cotizaciones
  drop constraint if exists cotizaciones_pricing_mode_check;

alter table public.cotizaciones
  add constraint cotizaciones_pricing_mode_check
  check (pricing_mode in ('por_item', 'total_global'));

comment on column public.cotizaciones.pricing_mode is
  'Modo de pricing comercial: por_item calcula desde componentes; total_global define costo/margen/total a nivel cotizacion.';
