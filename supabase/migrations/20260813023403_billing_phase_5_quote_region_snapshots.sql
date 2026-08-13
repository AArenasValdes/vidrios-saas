alter table public.cotizaciones
  add column if not exists regional_snapshot jsonb;

alter table public.cotizaciones
  add constraint cotizaciones_regional_snapshot_object_check
  check (regional_snapshot is null or jsonb_typeof(regional_snapshot) = 'object');

comment on column public.cotizaciones.regional_snapshot is
  'Snapshot regional inmutable de la cotizacion: pais, moneda, locale, zona horaria e impuesto comercial.';
