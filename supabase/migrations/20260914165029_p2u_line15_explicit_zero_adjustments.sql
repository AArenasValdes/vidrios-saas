-- P2U: ALAR usa X para 1501/1502. Persistir 0 mm evita mostrarlo como descuento desconocido.
-- Alcance estrecho: solo la receta P2U supplier de Línea 15; no toca códigos ni otras recetas.
update public.fabrication_recipes as recipe
set definition = jsonb_set(
  jsonb_set(
    recipe.definition,
    '{perfiles}',
    (
      select jsonb_agg(
        case
          when profile->>'codigoPerfil' in ('1501', '1502') then
            jsonb_set(profile, '{reglaMedida,ajusteMm}', '0'::jsonb, true)
          else profile
        end
        order by ordinal
      )
      from jsonb_array_elements(recipe.definition->'perfiles') with ordinality as entries(profile, ordinal)
    ),
    true
  ),
  '{notasValidacion}',
  (recipe.definition->'notasValidacion') || to_jsonb('1501 y 1502 usan X: 0 mm de ajuste explícito.'::text),
  true
)
where recipe.organization_id = 39
  and recipe.line_template_id = (
    select line.id
    from public.cotizacion_line_templates line
    where line.organization_id = 39
      and line.catalog_key = 'ventora:serie-15-corredera-2h'
      and line.eliminado_en is null
    order by line.id
    limit 1
  )
  and recipe.source_type = 'supplier'
  and recipe.source_reference = 'alar:catalogo-2011:p109:pauta-corte:serie-15'
  and recipe.status = 'draft'
  and recipe.eliminado_en is null
  and coalesce(recipe.definition->'perfiles', '[]'::jsonb) @> '[{"codigoPerfil":"1501"},{"codigoPerfil":"1502"}]'::jsonb
  and not coalesce(recipe.definition->'notasValidacion', '[]'::jsonb) @> '["1501 y 1502 usan X: 0 mm de ajuste explícito."]'::jsonb;
