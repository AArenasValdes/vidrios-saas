-- Snapshot tecnico estructurado de fabricacion por item de cotizacion.
-- Fuente nueva para Fase 3. Los snapshots legacy [cub:] siguen solo como lectura.

alter table public.cotizacion_items
  add column if not exists fabricacion_snapshot jsonb;

alter table public.cotizacion_items
  drop constraint if exists cotizacion_items_fabricacion_snapshot_object_chk;

alter table public.cotizacion_items
  add constraint cotizacion_items_fabricacion_snapshot_object_chk
  check (
    fabricacion_snapshot is null
    or jsonb_typeof(fabricacion_snapshot) = 'object'
  );

create index if not exists cotizacion_items_fabricacion_snapshot_active_idx
  on public.cotizacion_items (organization_id, cotizacion_id)
  where fabricacion_snapshot is not null and eliminado_en is null;

comment on column public.cotizacion_items.fabricacion_snapshot is
  'Snapshot JSONB inmutable de cubicacion/pauta calculado con recetas de fabricacion validadas. No usar para precios comerciales.';
