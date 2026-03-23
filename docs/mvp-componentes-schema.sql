-- Migracion minima sugerida para el MVP de presupuestos por componentes.
-- No elimina tablas del enfoque anterior. Solo prepara cotizacion_items.

alter table public.cotizacion_items
  add column if not exists codigo text,
  add column if not exists tipo_componente text,
  add column if not exists orden integer;

create index if not exists cotizacion_items_cotizacion_id_orden_idx
  on public.cotizacion_items (cotizacion_id, orden);

comment on column public.cotizacion_items.codigo is
  'Codigo comercial del componente, por ejemplo V1 o P1.';

comment on column public.cotizacion_items.tipo_componente is
  'Tipo comercial del componente, por ejemplo ventana, puerta o cierre.';

comment on column public.cotizacion_items.orden is
  'Orden visual del componente dentro de la cotizacion.';
