alter table if exists public.organization_profile
  add column if not exists solicitud_publica_horario_por_dia jsonb;

comment on column public.organization_profile.solicitud_publica_horario_por_dia is
  'Horario visible por dia de la semana para la landing publica. Cada item guarda day, enabled, from y to.';

with normalized as (
  select
    organization_id,
    regexp_split_to_array(
      coalesce(
        nullif(
          regexp_replace(coalesce(solicitud_publica_dias_atencion, ''), '\s', '', 'g'),
          ''
        ),
        '1,2,3,4,5,6'
      ),
      ','
    ) as dias,
    coalesce(nullif(solicitud_publica_horario_desde, ''), '09:00') as desde,
    coalesce(nullif(solicitud_publica_horario_hasta, ''), '19:00') as hasta
  from public.organization_profile
)
update public.organization_profile as profile
set solicitud_publica_horario_por_dia = jsonb_build_array(
  jsonb_build_object('day', '1', 'enabled', normalized.dias @> array['1'], 'from', normalized.desde, 'to', normalized.hasta),
  jsonb_build_object('day', '2', 'enabled', normalized.dias @> array['2'], 'from', normalized.desde, 'to', normalized.hasta),
  jsonb_build_object('day', '3', 'enabled', normalized.dias @> array['3'], 'from', normalized.desde, 'to', normalized.hasta),
  jsonb_build_object('day', '4', 'enabled', normalized.dias @> array['4'], 'from', normalized.desde, 'to', normalized.hasta),
  jsonb_build_object('day', '5', 'enabled', normalized.dias @> array['5'], 'from', normalized.desde, 'to', normalized.hasta),
  jsonb_build_object('day', '6', 'enabled', normalized.dias @> array['6'], 'from', normalized.desde, 'to', normalized.hasta),
  jsonb_build_object('day', '0', 'enabled', normalized.dias @> array['0'], 'from', normalized.desde, 'to', normalized.hasta)
)
from normalized
where normalized.organization_id = profile.organization_id
  and profile.solicitud_publica_horario_por_dia is null;
