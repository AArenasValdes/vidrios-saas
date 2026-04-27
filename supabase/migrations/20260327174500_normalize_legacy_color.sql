-- Normaliza el color legado a "Madera" en componentes y metadata visual.
-- Mantiene compatibilidad con PDF, preview publico y edicion rapida.

update public.cotizacion_items
set observaciones = regexp_replace(
  observaciones,
  '\[c:#b87333\]',
  '[c:#8b5e3c]',
  'gi'
)
where observaciones is not null
  and observaciones ~ '\[c:#b87333\]';

update public.cotizacion_items
set color = '#8b5e3c'
where color is not null
  and lower(color) = '#b87333';
