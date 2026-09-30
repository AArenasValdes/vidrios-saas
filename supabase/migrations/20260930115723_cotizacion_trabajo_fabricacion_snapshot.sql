alter table public.cotizaciones
  add column if not exists fabricacion_trabajo_snapshot jsonb;

alter table public.cotizaciones
  drop constraint if exists cotizaciones_fabricacion_trabajo_snapshot_object_chk;

alter table public.cotizaciones
  add constraint cotizaciones_fabricacion_trabajo_snapshot_object_chk
  check (
    fabricacion_trabajo_snapshot is null
    or jsonb_typeof(fabricacion_trabajo_snapshot) = 'object'
  );

comment on column public.cotizaciones.fabricacion_trabajo_snapshot is
  'Snapshot inmutable de la pauta sugerida conjunta de la cotización. Conserva cortes y atribución por ítem; no recalcula históricos ni contiene precios/SKUs.';
