-- Backfill: organizaciones que ya cotizaron no deben ver /activacion.
-- Idempotente: no pisa registros ya completados u omitidos manualmente.

update public.onboarding_checklists oc
set
  estado = 'omitido',
  completion_source = 'legacy_backfill_existing_quotes',
  metadata_json = coalesce(oc.metadata_json, '{}'::jsonb)
    || '{"source":"migration","reason":"organization_already_has_quotes"}'::jsonb,
  actualizado_en = now()
where oc.step_key = 'activation_complete'
  and oc.eliminado_en is null
  and oc.estado not in ('completado', 'omitido')
  and oc.organization_id in (
    select distinct organization_id
    from public.cotizaciones
  );

insert into public.onboarding_checklists (
  organization_id,
  step_key,
  estado,
  completed_at,
  completion_source,
  metadata_json
)
select distinct
  c.organization_id,
  'activation_complete',
  'omitido',
  now(),
  'legacy_backfill_existing_quotes',
  '{"source":"migration","reason":"organization_already_has_quotes"}'::jsonb
from public.cotizaciones c
where not exists (
  select 1
  from public.onboarding_checklists oc
  where oc.organization_id = c.organization_id
    and oc.step_key = 'activation_complete'
    and oc.eliminado_en is null
);
