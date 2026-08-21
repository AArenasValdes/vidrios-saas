alter table public.cotizaciones
  add column if not exists creation_surface text;

alter table public.cotizaciones
  drop constraint if exists cotizaciones_creation_surface_check;

alter table public.cotizaciones
  add constraint cotizaciones_creation_surface_check
  check (
    creation_surface is null
    or creation_surface in (
      'desktop_rapida',
      'desktop_guiada',
      'mobile_por_items',
      'total_global'
    )
  );

create index if not exists cotizaciones_creation_surface_active_idx
  on public.cotizaciones (creation_surface, creado_en desc)
  where eliminado_en is null and creation_surface is not null;

comment on column public.cotizaciones.creation_surface is
  'Superficie usada al crear una cotizacion. Nula para historico no clasificable.';
