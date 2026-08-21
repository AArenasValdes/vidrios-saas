alter table public.cotizaciones
  drop constraint if exists cotizaciones_creation_surface_check;

alter table public.cotizaciones
  add constraint cotizaciones_creation_surface_check
  check (
    creation_surface is null
    or creation_surface in (
      'desktop_constructor',
      'desktop_guiada',
      'mobile_constructor',
      'mobile_guiada',
      'total_global'
    )
  );

comment on column public.cotizaciones.creation_surface is
  'Superficie final al crear: Guiada o Constructor, en móvil o escritorio. Nula para histórico no clasificable.';
