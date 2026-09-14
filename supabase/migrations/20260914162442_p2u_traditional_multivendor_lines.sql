-- P2U: núcleo de líneas tradicionales / multiproveedor.
-- Alcance: organización 39, AM-35 existente y cuatro líneas nuevas.
-- No toca P1/P2A, PVC, precios ni recetas validadas por taller.
-- Las fuentes son documentación primaria Arquetipo / ALAR / Alumet.

create or replace function pg_temp.p2u_ref(
  p_code text,
  p_name text,
  p_role text,
  p_provider text,
  p_source text
) returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'code', p_code,
    'name', p_name,
    'role', p_role,
    'description', p_name,
    'provider', p_provider,
    'source', p_source,
    'codeStatus', 'catalog_reference'
  );
$$;

create or replace function pg_temp.p2u_profile(
  p_id text,
  p_code text,
  p_name text,
  p_function text,
  p_base text,
  p_adjustment integer,
  p_quantity integer,
  p_required boolean,
  p_cut text
) returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p_id,
    'codigoPerfil', p_code,
    'nombrePerfil', p_name,
    'funcion', p_function,
    'reglaMedida', jsonb_build_object('base', p_base) ||
      case when p_adjustment is null then '{}'::jsonb
        else jsonb_build_object('ajusteMm', p_adjustment) end,
    'reglaCantidad', jsonb_build_object('tipo', 'fija', 'cantidad', p_quantity),
    'requerido', p_required,
    'observaciones', 'Identidad documentada; no equivale a validación física de taller.'
  ) || case when p_cut is null then '{}'::jsonb
    else jsonb_build_object('corte', p_cut) end;
$$;

create or replace function pg_temp.p2u_definition(
  p_code text,
  p_name text,
  p_typology text,
  p_leaves integer,
  p_variant text,
  p_profiles jsonb,
  p_pending jsonb,
  p_notes jsonb
) returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'version', 1,
    'estado', 'ejemplo_no_validado',
    'identidad', jsonb_build_object(
      'recetaId', p_code,
      'codigo', p_code,
      'nombre', p_name,
      'tipologia', p_typology,
      'hojas', p_leaves,
      'modulos', 1,
      'apertura', p_typology,
      'herraje', null,
      'variante', p_variant
    ),
    'perfiles', p_profiles,
    'vidrios', '[]'::jsonb,
    'accesorios', '[]'::jsonb,
    'configuracionCorte', jsonb_build_object(
      'perdidaCorteMm', null,
      'despunteInicialMm', null,
      'sobranteMinimoAprovechableMm', null,
      'largoComercialDefaultMm', null
    ),
    'datosPendientes', p_pending,
    'notasValidacion', p_notes
  );
$$;

create or replace function pg_temp.p2u_upsert_line(
  p_catalog_key text,
  p_name text,
  p_configuration text,
  p_line_system text,
  p_identity_source text,
  p_cutting_source text,
  p_profiles jsonb
) returns bigint
language plpgsql
as $function$
declare
  line_id bigint;
begin
  if p_catalog_key not in (
    'ventora:serie-15-corredera-2h',
    'ventora:serie-4000-corredera-2h',
    'ventora:serie-45-puerta',
    'ventora:serie-12-shower-corredera'
  ) then
    raise exception 'P2U intento salir del alcance de líneas: %', p_catalog_key;
  end if;

  insert into public.cotizacion_line_templates (
    organization_id, nombre, categoria, unidad_cobro, material, catalog_key,
    precio_m2_sugerido, minimo_cobrable, redondeo_precio, catalog_metadata,
    is_active, sort_order
  )
  select
    39, p_name, 'aluminio', 'm2', 'Aluminio', p_catalog_key,
    0, 0, 1000,
    jsonb_build_object(
      'needsCommercialPrice', true,
      'cubicationStatus', 'pending',
      'lineFamilyType', 'traditional',
      'lineSourceModel', 'multiprovider',
      'lineConfiguration', p_configuration,
      'lineSystem', p_line_system,
      'structuralArchetypeId', case p_catalog_key
        when 'ventora:serie-15-corredera-2h' then 'corredera_2h'
        when 'ventora:serie-4000-corredera-2h' then 'corredera_2h'
        when 'ventora:serie-45-puerta' then 'puerta_abatible'
        when 'ventora:serie-12-shower-corredera' then 'shower'
        else null
      end,
      'identitySource', p_identity_source,
      'cuttingGuideSource', p_cutting_source,
      'workshopProfiles', jsonb_build_object('seedVersion', 5, 'profiles', p_profiles)
    ),
    true,
    coalesce((select max(sort_order) + 1 from public.cotizacion_line_templates where organization_id = 39), 0)
  where not exists (
    select 1 from public.cotizacion_line_templates existing
    where existing.organization_id = 39
      and existing.catalog_key = p_catalog_key
      and existing.eliminado_en is null
  )
  returning id into line_id;

  if line_id is null then
    select id into line_id
    from public.cotizacion_line_templates existing
    where existing.organization_id = 39
      and existing.catalog_key = p_catalog_key
      and existing.eliminado_en is null
    order by id
    limit 1;
  end if;

  return line_id;
end;
$function$;

create or replace function pg_temp.p2u_insert_recipe(
  p_line_template_id bigint,
  p_variant text,
  p_leaves integer,
  p_source_type text,
  p_source_name text,
  p_source_reference text,
  p_source_revision text,
  p_definition jsonb
) returns void
language plpgsql
as $function$
declare
  base_recipe public.fabrication_recipes%rowtype;
  line_name text;
  parent_id uuid;
  new_version integer;
begin
  if p_line_template_id is null then
    raise exception 'P2U no encontró line_template_id';
  end if;

  if exists (
    select 1 from public.fabrication_recipes recipe
    where recipe.organization_id = 39
      and recipe.line_template_id = p_line_template_id
      and recipe.eliminado_en is null
      and recipe.source_type = p_source_type
      and recipe.source_reference = p_source_reference
  ) then
    return;
  end if;

  select nombre into line_name
  from public.cotizacion_line_templates
  where organization_id = 39
    and id = p_line_template_id
    and eliminado_en is null;

  select * into base_recipe
  from public.fabrication_recipes recipe
  where recipe.organization_id = 39
    and recipe.line_template_id = p_line_template_id
    and recipe.eliminado_en is null
  order by recipe.version desc, recipe.created_at desc
  limit 1;

  parent_id := case when found then coalesce(base_recipe.parent_recipe_id, base_recipe.id) else null end;

  select coalesce(max(recipe.version), 0) + 1 into new_version
  from public.fabrication_recipes recipe
  where recipe.organization_id = 39
    and recipe.line_template_id = p_line_template_id;

  insert into public.fabrication_recipes (
    organization_id, line_template_id, scope, provider_name, line_name,
    typology, leaves_count, variant, version, status, definition,
    source_type, source_reference, source_name, source_revision,
    parent_recipe_id, validated_at, validated_by
  ) values (
    39, p_line_template_id, 'organization', p_source_name, coalesce(line_name, ''),
    p_definition->'identidad'->>'tipologia', p_leaves, p_variant,
    new_version, 'draft', jsonb_set(p_definition, '{version}', to_jsonb(new_version), true),
    p_source_type, p_source_reference, p_source_name, p_source_revision,
    parent_id, null, null
  );
end;
$function$;

-- Actualiza solo metadata de AM-35 existente; conserva ID, precio y datos privados.
update public.cotizacion_line_templates line
set catalog_metadata = coalesce(line.catalog_metadata, '{}'::jsonb) || jsonb_build_object(
  'lineFamilyType', 'traditional',
  'lineSourceModel', 'multiprovider',
  'identitySource', 'Arquetipo · Catálogo Línea 35',
  'workshopProfiles', jsonb_build_object(
    'seedVersion', 5,
    'profiles', jsonb_build_array(
      pg_temp.p2u_ref('3502', 'Marco', 'Marco', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf'),
      pg_temp.p2u_ref('3501', 'Bastidor', 'Hoja', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf'),
      pg_temp.p2u_ref('3508', 'Bastidor liviano', 'Hoja', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf'),
      pg_temp.p2u_ref('3503', 'Junquillo 45°', 'Otro', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf'),
      pg_temp.p2u_ref('3504', 'Junquillo recto', 'Otro', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf'),
      pg_temp.p2u_ref('3506', 'Tapa lisa', 'Otro', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf'),
      pg_temp.p2u_ref('3507', 'Tapa portafelpa', 'Otro', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf'),
      pg_temp.p2u_ref('3509', 'Traslapo', 'Hoja', 'Arquetipo', 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf')
    )
  )
)
where line.organization_id = 39
  and line.catalog_key = 'ventora:l35'
  and line.eliminado_en is null;

do $block$
declare
  line15_id bigint;
  line4000_id bigint;
  line45_id bigint;
  line12_id bigint;
  am35_id bigint;
  arquetipo_url text := 'https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf';
  alar_url text := 'https://www.alumet.cl/wp-content/uploads/2020/05/alar_catalogo_2011.pdf';
begin
  line15_id := pg_temp.p2u_upsert_line(
    'ventora:serie-15-corredera-2h', 'Línea 15 — Corredera 2 hojas', 'Corredera 2 hojas', 'Línea 15',
    'Arquetipo · Catálogo Línea 15', 'ALAR · Pautas de Corte, p. 109',
    jsonb_build_array(
      pg_temp.p2u_ref('1501', 'Riel superior', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1502', 'Riel inferior', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1503', 'Jamba', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1504', 'Cabezal', 'Hoja', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1505', 'Zócalo', 'Hoja', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1506', 'Pierna reforzada', 'Hoja', 'ALAR', alar_url),
      pg_temp.p2u_ref('1507', 'Pierna', 'Hoja', 'ALAR', alar_url),
      pg_temp.p2u_ref('1508', 'Traslapo reforzado', 'Hoja', 'ALAR', alar_url)
    )
  );

  line4000_id := pg_temp.p2u_upsert_line(
    'ventora:serie-4000-corredera-2h', 'Línea 4000 — Corredera 2 hojas', 'Corredera 2 hojas', 'Línea 4000',
    'Arquetipo · Catálogo Línea 4000', null,
    jsonb_build_array(
      pg_temp.p2u_ref('4001', 'Riel superior', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4002', 'Riel inferior', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4003', 'Jamba', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4004', 'Cabezal', 'Hoja', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4005', 'Zócalo', 'Hoja', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4007', 'Traslapo', 'Hoja', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4008', 'Pierna con aleta', 'Hoja', 'Arquetipo', arquetipo_url)
    )
  );

  line45_id := pg_temp.p2u_upsert_line(
    'ventora:serie-45-puerta', 'Línea 45 — Puerta', 'Puerta abatible 1 hoja', 'Línea 45',
    'Arquetipo · Catálogo Línea 45', null,
    jsonb_build_array(
      pg_temp.p2u_ref('4502', 'Marco', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4504', 'Junquillo', 'Otro', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('4511', 'Marco redondeado', 'Marco', 'Arquetipo', arquetipo_url)
    )
  );

  line12_id := pg_temp.p2u_upsert_line(
    'ventora:serie-12-shower-corredera', 'Línea 12 — Shower Door', 'Shower Door · Corredera 2 hojas', 'Línea 12',
    'Arquetipo · Catálogo Línea 12', null,
    jsonb_build_array(
      pg_temp.p2u_ref('1201', 'Riel inferior', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1202', 'Jamba', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1203', 'Riel superior', 'Marco', 'Arquetipo', arquetipo_url),
      pg_temp.p2u_ref('1204', 'Bastidor hoja', 'Hoja', 'Arquetipo', arquetipo_url)
    )
  );

  select id into am35_id
  from public.cotizacion_line_templates
  where organization_id = 39 and catalog_key = 'ventora:l35' and eliminado_en is null
  order by id limit 1;

  perform pg_temp.p2u_insert_recipe(
    line15_id, 'Pauta ALAR · composición por resolver', 2, 'supplier', 'ALAR',
    'alar:catalogo-2011:p109:pauta-corte:serie-15', 'Catálogo ALAR distribuido por Alumet, edición 2011, p. 109',
    pg_temp.p2u_definition(
      'ALAR-SERIE-15-2H-V1', 'Línea 15 — Pauta ALAR · composición por resolver', 'corredera', 2,
      'Pauta ALAR · composición por resolver',
      jsonb_build_array(
        pg_temp.p2u_profile('line15-1501', '1501', 'Riel superior', 'Riel superior', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('line15-1502', '1502', 'Riel inferior', 'Riel inferior', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('line15-1503', '1503', 'Jamba', 'Jamba', 'alto_total', -7, 2, true, null),
        pg_temp.p2u_profile('line15-1504', '1504', 'Cabezal', 'Cabezal', 'ancho_por_hoja', -3, 4, true, null),
        pg_temp.p2u_profile('line15-1505', '1505', 'Zócalo', 'Zócalo', 'ancho_por_hoja', -3, 2, true, null),
        pg_temp.p2u_profile('line15-1506', '1506', 'Pierna reforzada', 'Pierna reforzada', 'alto_total', -26, 2, false, null),
        pg_temp.p2u_profile('line15-1507', '1507', 'Pierna', 'Pierna', 'alto_total', -26, 2, false, null),
        pg_temp.p2u_profile('line15-1508', '1508', 'Traslapo reforzado', 'Traslapo reforzado', 'alto_total', -26, 2, false, null)
      ),
      jsonb_build_array('Resolver si 1506, 1507 y 1508 son alternativas o componentes simultáneos.'),
      jsonb_build_array(
        'Pauta primaria ALAR: Catálogo distribuido por Alumet, edición 2011, p. 109.',
        'Identidad de perfiles contrastada con catálogo Arquetipo de Línea 15.',
        'Ejemplo documental 1200 × 1000: 1501=1200, 1502=1200, 1503=993, 1504=597, 1505=597 y perfiles 1506/1507/1508=974.',
        'No se agrega vidrio, accesorio ni largo comercial porque la pauta citada no los resuelve.'
      )
    )
  );

  perform pg_temp.p2u_insert_recipe(
    line4000_id, 'Normal · Corredera 2 hojas', 2, 'manufacturer', 'Arquetipo',
    'arquetipo:catalogo-linea-estandar:p13-14:linea-4000', 'Catálogo Perfiles de Aluminio Arquetipo, páginas 14-15',
    pg_temp.p2u_definition(
      'ARQUETIPO-SERIE-4000-2H-V1', 'Línea 4000 — Normal · Corredera 2 hojas', 'corredera', 2,
      'Normal · Corredera 2 hojas',
      jsonb_build_array(
        pg_temp.p2u_profile('line4000-4001', '4001', 'Riel superior', 'Riel superior', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('line4000-4002', '4002', 'Riel inferior', 'Riel inferior', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('line4000-4003', '4003', 'Jamba', 'Jamba', 'alto_total', null, 2, true, null),
        pg_temp.p2u_profile('line4000-4004', '4004', 'Cabezal', 'Cabezal', 'ancho_por_hoja', null, 2, true, null),
        pg_temp.p2u_profile('line4000-4005', '4005', 'Zócalo', 'Zócalo', 'ancho_por_hoja', null, 2, true, null),
        pg_temp.p2u_profile('line4000-4007', '4007', 'Traslapo', 'Traslapo', 'alto_total', null, 2, true, null),
        pg_temp.p2u_profile('line4000-4008', '4008', 'Pierna con aleta', 'Pierna con aleta', 'alto_total', null, 2, true, null)
      ),
      jsonb_build_array('Faltan ajustes y una pauta numérica oficial de corte para esta configuración.'),
      jsonb_build_array(
        'Identidad primaria Arquetipo: Catálogo Perfiles de Aluminio, Línea 4000, ventana corredera.',
        'ALAR/Alumet confirman la familia Serie/Columbia 4000 y sus perfiles equivalentes; no se usa esa coincidencia para inventar descuentos.',
        'Pauta documentada · faltan medidas de corte.'
      )
    )
  );

  perform pg_temp.p2u_insert_recipe(
    am35_id, 'AM-35 · Abatible', 1, 'manufacturer', 'Arquetipo',
    'arquetipo:catalogo-linea-estandar:p17-18:linea-35', 'Catálogo Perfiles de Aluminio Arquetipo, páginas 18-19',
    pg_temp.p2u_definition(
      'ARQUETIPO-AM35-ABATIBLE-V1', 'AM-35 — Abatible', 'puerta_abatible', 1, 'AM-35 · Abatible',
      jsonb_build_array(
        pg_temp.p2u_profile('am35-abatible-3502', '3502', 'Marco', 'Marco', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('am35-abatible-3501', '3501', 'Bastidor', 'Bastidor', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('am35-abatible-3508', '3508', 'Bastidor liviano', 'Bastidor alternativo', 'ancho_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-abatible-3503', '3503', 'Junquillo 45°', 'Junquillo alternativo', 'ancho_total', null, 1, false, '45°'),
        pg_temp.p2u_profile('am35-abatible-3504', '3504', 'Junquillo recto', 'Junquillo alternativo', 'ancho_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-abatible-3506', '3506', 'Tapa lisa', 'Tapa alternativa', 'alto_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-abatible-3507', '3507', 'Tapa portafelpa', 'Tapa alternativa', 'alto_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-abatible-3509', '3509', 'Traslapo', 'Traslapo', 'alto_total', null, 1, true, null)
      ),
      jsonb_build_array('Faltan composición, ajustes y pauta de corte específica para la variante.'),
      jsonb_build_array(
        'AM-35 reutiliza la línea comercial existente; no se crea un segundo catálogo.',
        'Arquetipo documenta Línea 35 para puerta abatir y vaivén; Alumet documenta bastidor normal y liviano.',
        'Los perfiles alternativos no se convierten en una composición simultánea y no se reutilizan fórmulas de Serie 3200 o 4600.'
      )
    )
  );

  perform pg_temp.p2u_insert_recipe(
    am35_id, 'AM-35 · Vaivén', 1, 'manufacturer', 'Arquetipo',
    'arquetipo:catalogo-linea-estandar:p17-18:linea-35:vaiven', 'Catálogo Perfiles de Aluminio Arquetipo, páginas 18-19',
    pg_temp.p2u_definition(
      'ARQUETIPO-AM35-VAIVEN-V1', 'AM-35 — Vaivén', 'puerta_vaiven', 1, 'AM-35 · Vaivén',
      jsonb_build_array(
        pg_temp.p2u_profile('am35-vaiven-3502', '3502', 'Marco', 'Marco', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('am35-vaiven-3501', '3501', 'Bastidor', 'Bastidor', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('am35-vaiven-3508', '3508', 'Bastidor liviano', 'Bastidor alternativo', 'ancho_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-vaiven-3503', '3503', 'Junquillo 45°', 'Junquillo alternativo', 'ancho_total', null, 1, false, '45°'),
        pg_temp.p2u_profile('am35-vaiven-3504', '3504', 'Junquillo recto', 'Junquillo alternativo', 'ancho_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-vaiven-3506', '3506', 'Tapa lisa', 'Tapa alternativa', 'alto_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-vaiven-3507', '3507', 'Tapa portafelpa', 'Tapa alternativa', 'alto_total', null, 1, false, null),
        pg_temp.p2u_profile('am35-vaiven-3509', '3509', 'Traslapo', 'Traslapo', 'alto_total', null, 1, true, null)
      ),
      jsonb_build_array('Faltan composición, ajustes y pauta de corte específica para la variante.'),
      jsonb_build_array(
        'AM-35 reutiliza la línea comercial existente; no se crea un segundo catálogo.',
        'La variante vaivén se mantiene separada de abatible aunque comparta identidad de familia.',
        'La receta no es validación física ni reutiliza fórmulas de Serie 3200 o 4600.'
      )
    )
  );

  perform pg_temp.p2u_insert_recipe(
    line45_id, 'Puerta · composición pendiente', 1, 'manufacturer', 'Arquetipo',
    'arquetipo:catalogo-linea-estandar:p19-20:linea-45', 'Catálogo Perfiles de Aluminio Arquetipo, páginas 20-21',
    pg_temp.p2u_definition(
      'ARQUETIPO-SERIE-45-PUERTA-V1', 'Línea 45 — Puerta · composición pendiente', 'puerta_abatible', 1,
      'Puerta · composición pendiente',
      jsonb_build_array(
        pg_temp.p2u_profile('line45-4502', '4502', 'Marco', 'Marco', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('line45-4504', '4504', 'Junquillo', 'Junquillo', 'ancho_total', null, 1, true, null),
        pg_temp.p2u_profile('line45-4511', '4511', 'Marco redondeado', 'Marco alternativo', 'ancho_total', null, 1, false, null)
      ),
      jsonb_build_array('Faltan bastidor/hoja, composición de la puerta, variante y pauta de corte.'),
      jsonb_build_array(
        'Arquetipo documenta Línea 45 como puerta y muestra 4502, 4504 y 4511.',
        'ALAR/Alumet documentan más perfiles de Serie 45, pero no se mezclan automáticamente con la ficha Arquetipo.',
        'No se construye una hoja solo con 4502 y 4504 ni se importan perfiles de otra serie.'
      )
    )
  );

  perform pg_temp.p2u_insert_recipe(
    line12_id, 'Tina · 2 hojas correderas', 2, 'manufacturer', 'Arquetipo',
    'arquetipo:catalogo-linea-estandar:p20-21:linea-12-shower', 'Catálogo Perfiles de Aluminio Arquetipo, páginas 21-22',
    pg_temp.p2u_definition(
      'ARQUETIPO-SHOWER-12-2H-V1', 'Línea 12 — Shower Door · Tina · 2 hojas correderas', 'shower', 2,
      'Tina · 2 hojas correderas',
      jsonb_build_array(
        pg_temp.p2u_profile('line12-1201', '1201', 'Riel inferior', 'Riel inferior de marco', 'ancho_total', null, 1, true, '90°'),
        pg_temp.p2u_profile('line12-1202', '1202', 'Jamba', 'Jamba de marco', 'alto_total', null, 2, true, '90°'),
        pg_temp.p2u_profile('line12-1203', '1203', 'Riel superior', 'Riel superior de marco', 'ancho_total', null, 1, true, '90°'),
        pg_temp.p2u_profile('line12-1204', '1204', 'Bastidor hoja', 'Bastidor de hoja', 'ancho_por_hoja', null, 4, true, '45°')
      ),
      jsonb_build_array('Faltan ajustes numéricos, composición de receptáculo y pauta completa de corte.'),
      jsonb_build_array(
        'Arquetipo documenta Shower Door Línea 12: corredera colgante para tina o receptáculo.',
        'La fuente documenta marco con cortes a 90° y hojas con cortes a 45°; se conserva solo como metadata de corte.',
        'Quincallería documentada: caja/rodamiento Shower S-12, guías interior/exterior, tirador y unión L-12; sus consumos quedan pendientes.',
        'No se inventan descuentos ni se presenta como receta calculable.'
      )
    )
  );
end;
$block$;

drop function if exists pg_temp.p2u_insert_recipe(bigint, text, integer, text, text, text, text, jsonb);
drop function if exists pg_temp.p2u_upsert_line(text, text, text, text, text, text, jsonb);
drop function if exists pg_temp.p2u_definition(text, text, text, integer, text, jsonb, jsonb, jsonb);
drop function if exists pg_temp.p2u_profile(text, text, text, text, text, integer, integer, boolean, text);
drop function if exists pg_temp.p2u_ref(text, text, text, text, text);
