-- P1: consolidacion idempotente de evidencia directa del taller.
-- Alcance deliberado: organizacion 39, recetas activas existentes.
-- No normaliza descuentos/codigos con fuentes externas ni toca otras organizaciones.

update public.fabrication_recipes as recipe
set
  source_type = 'workshop',
  source_reference = 'taller:p1-2026-09-14:serie-5000',
  source_name = 'Evidencia directa de taller P1 2026-09-14',
  source_revision = 'P1-2026-09-14'
where recipe.organization_id = 39
  and recipe.line_template_id = 312
  and recipe.eliminado_en is null
  and recipe.status = 'draft'
  and recipe.source_type = 'manual'
  and (select count(*) from jsonb_array_elements(recipe.definition->'perfiles') profile) = 7
  and (select count(*) from jsonb_array_elements(recipe.definition->'perfiles') profile
       where profile->>'codigoPerfil' in ('5001','5002','5003','5004','5005','5006','5007')) = 7
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '5005' and (profile->'reglaMedida'->>'ajusteMm')::int = -2)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '5004' and (profile->'reglaMedida'->>'ajusteMm')::int = -2)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '5006' and (profile->'reglaMedida'->>'ajusteMm')::int = -18)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '5007' and (profile->'reglaMedida'->>'ajusteMm')::int = -18)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '5001' and (profile->'reglaMedida'->>'ajusteMm')::int = 0)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '5002' and (profile->'reglaMedida'->>'ajusteMm')::int = 0)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '5003' and (profile->'reglaMedida'->>'ajusteMm')::int = -3);

update public.fabrication_recipes as recipe
set
  source_type = 'workshop',
  source_reference = 'taller:p1-2026-09-14:serie-20',
  source_name = 'Evidencia directa de taller P1 2026-09-14',
  source_revision = 'P1-2026-09-14'
where recipe.organization_id = 39
  and recipe.line_template_id = 313
  and recipe.eliminado_en is null
  and recipe.status = 'draft'
  and recipe.source_type = 'manual'
  and (select count(*) from jsonb_array_elements(recipe.definition->'perfiles') profile) = 7
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2005' and (profile->'reglaMedida'->>'ajusteMm')::int = -2)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2004' and (profile->'reglaMedida'->>'ajusteMm')::int = -2)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2010' and (profile->'reglaMedida'->>'ajusteMm')::int = -27)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2019' and (profile->'reglaMedida'->>'ajusteMm')::int = -27)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2001' and (profile->'reglaMedida'->>'ajusteMm')::int = -12)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2002' and (profile->'reglaMedida'->>'ajusteMm')::int = -12)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2009' and (profile->'reglaMedida'->>'ajusteMm')::int = 0);

update public.fabrication_recipes as recipe
set
  source_type = 'workshop',
  source_reference = 'taller:p1-2026-09-14:serie-25',
  source_name = 'Evidencia directa de taller P1 2026-09-14',
  source_revision = 'P1-2026-09-14'
where recipe.organization_id = 39
  and recipe.line_template_id = 314
  and recipe.eliminado_en is null
  and recipe.status = 'draft'
  and recipe.source_type = 'manual'
  and (select count(*) from jsonb_array_elements(recipe.definition->'perfiles') profile) = 7
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2505' and (profile->'reglaMedida'->>'ajusteMm')::int = 0)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2504' and (profile->'reglaMedida'->>'ajusteMm')::int = 0)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2510' and (profile->'reglaMedida'->>'ajusteMm')::int = -35)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2507' and (profile->'reglaMedida'->>'ajusteMm')::int = -35)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2501' and (profile->'reglaMedida'->>'ajusteMm')::int = -16)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2502' and (profile->'reglaMedida'->>'ajusteMm')::int = -16)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '2509' and (profile->'reglaMedida'->>'ajusteMm')::int = 0);

-- L42: nueva evidencia de taller corrige solo 4202. 4229 queda persistido, no validado.
update public.fabrication_recipes as recipe
set
  source_type = 'workshop',
  source_reference = 'taller:p1-2026-09-14:l42-marco-hoja',
  source_name = 'Maestro: marco W/H y hoja -17 mm',
  source_revision = 'P1-L42-MARCO-HOJA-17',
  definition = jsonb_set(
    jsonb_set(
      recipe.definition,
      '{perfiles}',
      (
        select jsonb_agg(
          case
            when profile->>'codigoPerfil' = '4202' then
              jsonb_set(
                jsonb_set(profile, '{reglaMedida,ajusteMm}', to_jsonb(-17), true),
                '{observaciones}',
                to_jsonb('Evidencia de taller P1: hoja 4202 = ancho/alto por hoja -17 mm. Pauta externa puede indicar -18 mm; se conserva medida de taller.'::text),
                true
              )
            when profile->>'codigoPerfil' = '4201' then
              jsonb_set(
                profile,
                '{observaciones}',
                to_jsonb('Evidencia de taller P1: marco 4201 igual a ancho y alto; ajuste 0 mm. Confirmación parcial.'::text),
                true
              )
            else profile
          end
          order by ordinality
        )
        from jsonb_array_elements(recipe.definition->'perfiles') with ordinality as entries(profile, ordinality)
      ),
      true
    ),
    '{notasValidacion}',
    coalesce(recipe.definition->'notasValidacion', '[]'::jsonb) || jsonb_build_array(
      'P1: taller confirma marco 4201 W/H y hoja 4202 -17 mm.',
      'P1: junquillo 4229, vidrio y accesorios siguen pendientes de confirmación de taller.'
    ),
    true
  )
where recipe.organization_id = 39
  and recipe.line_template_id = 317
  and recipe.eliminado_en is null
  and recipe.status = 'draft'
  and recipe.source_type = 'manual'
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '4201' and (profile->'reglaMedida'->>'ajusteMm')::int = 0)
  and exists (select 1 from jsonb_array_elements(recipe.definition->'perfiles') profile where profile->>'codigoPerfil' = '4202' and (profile->'reglaMedida'->>'ajusteMm')::int = -18);

do $migration$
declare
  old_recipe public.fabrication_recipes%rowtype;
  new_definition jsonb;
begin
  -- AL-32 estaba validada sin procedencia de taller. Se conserva como historico
  -- y se crea una nueva version revisable con solo marco/hoja confirmados.
  if not exists (
    select 1
    from public.fabrication_recipes recipe
    where recipe.organization_id = 39
      and recipe.line_template_id = 315
      and recipe.eliminado_en is null
      and recipe.source_type = 'workshop'
      and recipe.source_reference = 'taller:p1-2026-09-14:l32-marco-hoja'
  ) then
    select *
      into old_recipe
    from public.fabrication_recipes recipe
    where recipe.organization_id = 39
      and recipe.line_template_id = 315
      and recipe.eliminado_en is null
      and recipe.status = 'validated'
      and recipe.source_type = 'manual'
      and recipe.source_reference = 'ventora-proyectante:catalogo-2026-09-13'
    order by recipe.version desc
    limit 1;

    if found then
      select jsonb_set(
        jsonb_set(
          jsonb_set(
            old_recipe.definition,
            '{version}',
            to_jsonb(old_recipe.version + 1),
            true
          ),
          '{estado}',
          to_jsonb('requiere_revision'::text),
          true
        ),
        '{perfiles}',
        (
          select jsonb_agg(
            case
              when profile->>'codigoPerfil' in ('3201', '3202') then
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      profile,
                      '{reglaMedida,ajusteMm}',
                      to_jsonb(case when profile->>'codigoPerfil' = '3201' then 0 else -21 end),
                      true
                    ),
                    '{reglaCantidad}',
                    '{"tipo":"fija","cantidad":2,"multiplicador":1}'::jsonb,
                    true
                  ),
                  '{observaciones}',
                  to_jsonb(
                    case
                      when profile->>'codigoPerfil' = '3201' then 'Evidencia de taller P1: marco 3201 igual a ancho y alto; ajuste 0 mm. Confirmado por taller.'
                      else 'Evidencia de taller P1: hoja 3202 = ancho/alto por hoja -21 mm. Confirmado por taller.'
                    end
                  ),
                  true
                )
              else profile
            end
            order by ordinality
          )
          from jsonb_array_elements(old_recipe.definition->'perfiles') with ordinality as entries(profile, ordinality)
        ),
        true
      ) || jsonb_build_object(
        'notasValidacion',
        coalesce(old_recipe.definition->'notasValidacion', '[]'::jsonb) || jsonb_build_array(
          'P1: taller confirma 3201 marco W/H y 3202 hoja W/H -21 mm.',
          'P1: 3208, 3205, 3204, vidrio y accesorios no tienen confirmación completa de taller.'
        )
      )
      into new_definition;

      insert into public.fabrication_recipes (
        organization_id, line_template_id, scope, provider_name, line_name,
        typology, leaves_count, variant, version, status, definition,
        source_type, source_reference, source_name, source_revision,
        parent_recipe_id, validated_at, validated_by
      ) values (
        old_recipe.organization_id, old_recipe.line_template_id, old_recipe.scope,
        old_recipe.provider_name, old_recipe.line_name, old_recipe.typology,
        old_recipe.leaves_count, old_recipe.variant, old_recipe.version + 1,
        'review_required', new_definition, 'workshop',
        'taller:p1-2026-09-14:l32-marco-hoja',
        'Maestro: marco W/H y hoja -21 mm', 'P1-L32-MARCO-HOJA-21',
        old_recipe.id, null, null
      );

      update public.fabrication_recipes
      set status = 'archived', eliminado_en = now()
      where id = old_recipe.id;
    end if;
  end if;
end
$migration$;
