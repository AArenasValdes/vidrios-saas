-- Serie 42 normal: una hoja requiere el par completo de junquillos.
-- Solo corrige la bandera estructural de la regla horizontal 4229.
-- No cambia códigos, descuentos, cantidades, procedencia ni estado de validación.
update public.fabrication_recipes as recipe
set
  definition = jsonb_set(
    recipe.definition,
    '{perfiles}',
    (
      select jsonb_agg(
        case
          when profile->>'codigoPerfil' = '4229'
            and profile->'reglaMedida'->>'base' = 'ancho_por_hoja'
          then jsonb_set(profile, '{requerido}', 'true'::jsonb, true)
          else profile
        end
        order by ordinality
      )
      from jsonb_array_elements(recipe.definition->'perfiles') with ordinality as entries(profile, ordinality)
    ),
    true
  ),
  updated_at = now()
where recipe.organization_id = 39
  and recipe.line_template_id = 317
  and recipe.eliminado_en is null
  and recipe.status = 'draft'
  and recipe.source_type = 'workshop'
  and recipe.source_reference = 'taller:p1-2026-09-14:l42-marco-hoja'
  and recipe.variant = 'normal'
  and exists (
    select 1
    from jsonb_array_elements(recipe.definition->'perfiles') profile
    where profile->>'codigoPerfil' = '4229'
      and profile->'reglaMedida'->>'base' = 'ancho_por_hoja'
      and coalesce((profile->>'requerido')::boolean, false) = false
  )
  and exists (
    select 1
    from jsonb_array_elements(recipe.definition->'perfiles') profile
    where profile->>'codigoPerfil' = '4229'
      and profile->'reglaMedida'->>'base' = 'alto_por_hoja'
      and coalesce((profile->>'requerido')::boolean, false) = true
  );
