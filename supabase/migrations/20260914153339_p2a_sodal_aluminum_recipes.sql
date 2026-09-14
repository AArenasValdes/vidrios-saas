-- P2A: recetas documentadas exclusivamente desde pautas primarias SODAL.
-- Alcance: organizacion 39 y siete lineas de aluminio. No toca precios, codigos
-- comerciales ni las recetas protegidas P1 (312, 313, 314, 315 y 317).
-- Las formulas lineales se conservan como pauta textual; no se convierten en
-- unidades de compra inventadas y no se crean pruebas de taller.

create or replace function pg_temp.p2a_profile(
  p_id text,
  p_code text,
  p_name text,
  p_function text,
  p_base text,
  p_adjustment integer,
  p_quantity integer,
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
    'largoComercialMm', 6000,
    'reglaMedida', jsonb_build_object('base', p_base, 'ajusteMm', p_adjustment),
    'reglaCantidad', jsonb_build_object('tipo', 'fija', 'cantidad', p_quantity),
    'requerido', true,
    'corte', p_cut,
    'observaciones', 'Pauta primaria SODAL; no es validacion de taller.'
  );
$$;

create or replace function pg_temp.p2a_glass(
  p_id text,
  p_name text,
  p_width_base text,
  p_width_adjustment integer,
  p_height_base text,
  p_height_adjustment integer,
  p_quantity integer
) returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p_id,
    'nombre', p_name,
    'reglaAncho', jsonb_build_object('base', p_width_base, 'ajusteMm', p_width_adjustment),
    'reglaAlto', jsonb_build_object('base', p_height_base, 'ajusteMm', p_height_adjustment),
    'reglaCantidad', jsonb_build_object('tipo', 'fija', 'cantidad', p_quantity),
    'requerido', false,
    'observaciones', 'La fuente publica la medida; la composicion/espesor del vidrio queda a especificacion del taller.'
  );
$$;

create or replace function pg_temp.p2a_accessory(
  p_id text,
  p_name text,
  p_quantity integer,
  p_unit text,
  p_formula text default null
) returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p_id,
    'codigo', '',
    'nombre', p_name,
    'reglaCantidad', jsonb_build_object('tipo', 'fija', 'cantidad', p_quantity),
    'requerido', false,
    'unidad', p_unit,
    'observaciones', case when p_formula is null
      then 'Accesorio y cantidad tomados de la pauta primaria SODAL.'
      else 'Consumo lineal documentado por SODAL; pendiente de conversion a unidad de compra.'
    end
  ) || case when p_formula is null then '{}'::jsonb else jsonb_build_object(
    'formulaCantidad', p_formula,
    'datosPendientes', jsonb_build_array('Representar el consumo lineal sin convertirlo en unidades ficticias')
  ) end;
$$;

create or replace function pg_temp.p2a_definition(
  p_code text,
  p_name text,
  p_typology text,
  p_leaves integer,
  p_variant text,
  p_profiles jsonb,
  p_glasses jsonb,
  p_accessories jsonb,
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
    'vidrios', p_glasses,
    'accesorios', p_accessories,
    'configuracionCorte', jsonb_build_object(
      'perdidaCorteMm', null,
      'despunteInicialMm', null,
      'sobranteMinimoAprovechableMm', null,
      'largoComercialDefaultMm', 6000
    ),
    'notasValidacion', p_notes
  );
$$;

create or replace function pg_temp.p2a_insert_recipe(
  p_line_template_id bigint,
  p_variant text,
  p_leaves integer,
  p_source_reference text,
  p_source_revision text,
  p_definition jsonb
) returns void
language plpgsql
as $function$
declare
  base_recipe public.fabrication_recipes%rowtype;
  parent_id uuid;
  new_version integer;
begin
  if p_line_template_id not in (318, 321, 322, 327, 328, 329, 330) then
    raise exception 'P2A intento salir del alcance de lineas: %', p_line_template_id;
  end if;

  if exists (
    select 1
    from public.fabrication_recipes recipe
    where recipe.organization_id = 39
      and recipe.line_template_id = p_line_template_id
      and recipe.eliminado_en is null
      and recipe.source_type = 'manufacturer'
      and recipe.source_reference = p_source_reference
  ) then
    return;
  end if;

  select * into base_recipe
  from public.fabrication_recipes recipe
  where recipe.organization_id = 39
    and recipe.line_template_id = p_line_template_id
    and recipe.eliminado_en is null
    and recipe.status <> 'archived'
    and recipe.source_type <> 'manufacturer'
  order by recipe.version desc
  limit 1;

  if not found then
    select * into base_recipe
    from public.fabrication_recipes recipe
    where recipe.organization_id = 39
      and recipe.line_template_id = p_line_template_id
      and recipe.eliminado_en is null
      and recipe.source_type = 'manufacturer'
      and recipe.source_reference like 'sodal:%'
    order by recipe.version desc
    limit 1;
  end if;

  if not found then
    raise notice 'P2A no crea receta porque no existe semilla Ventora para line_template_id %', p_line_template_id;
    return;
  end if;

  parent_id := coalesce(base_recipe.parent_recipe_id, base_recipe.id);
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
    39, p_line_template_id, 'organization', 'SODAL', base_recipe.line_name,
    (p_definition->'identidad'->>'tipologia'), p_leaves, p_variant,
    new_version, 'draft', jsonb_set(p_definition, '{version}', to_jsonb(new_version), true),
    'manufacturer', p_source_reference, 'SODAL', p_source_revision,
    parent_id, null, null
  );

  update public.fabrication_recipes recipe
  set status = 'archived', eliminado_en = now()
  where recipe.id = base_recipe.id
    and recipe.source_type <> 'manufacturer'
    and recipe.eliminado_en is null;
end;
$function$;

-- Serie 4800: normal y reforzada, independientes.
select pg_temp.p2a_insert_recipe(318, 'Normal', 2, 'sodal:catalogo-general-2018:p29:serie-4800:normal', 'Catalogo General SODAL, edicion 2018, p. 29', pg_temp.p2a_definition(
  'SODAL-4800-2H-NORMAL-V1', 'Serie 4800 - Normal', 'corredera', 2, 'Normal',
  jsonb_build_array(
    pg_temp.p2a_profile('4800-normal-4801', '4801', 'Riel inferior', 'Riel inferior', 'ancho_total', -16, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-normal-4802', '4802', 'Riel superior', 'Riel superior', 'ancho_total', -16, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-normal-4803', '4803', 'Jamba', 'Jamba', 'alto_total', 0, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-normal-4804', '4804', 'Zocalo de hoja', 'Zocalo de hoja', 'ancho_por_hoja', -15, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-normal-4805', '4805', 'Cabezal de hoja', 'Cabezal de hoja', 'ancho_por_hoja', -15, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-normal-4806', '4806', 'Traslapo', 'Traslapo de hoja', 'alto_total', -32, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-normal-4808', '4808', 'Pierna con aleta', 'Pierna de hoja', 'alto_total', -32, 2, 'No publicado en la tabla de pauta')
  ),
  jsonb_build_array(pg_temp.p2a_glass('4800-normal-glass', 'Vidrio de hoja', 'ancho_por_hoja', -42, 'alto_total', -93, 2)),
  jsonb_build_array(
    pg_temp.p2a_accessory('4800-normal-rodamiento', 'Rodamiento 4800', 4, 'Pz'),
    pg_temp.p2a_accessory('4800-normal-soporte', 'Soporte rodamiento 4800', 4, 'Pz'),
    pg_temp.p2a_accessory('4800-normal-guia', 'Guia superior 4800', 4, 'Pz'),
    pg_temp.p2a_accessory('4800-normal-caracol', 'Caracol central', 1, 'Pz'),
    pg_temp.p2a_accessory('4800-normal-felpa', 'Felpa 5 x 5', 1, 'Mt', '4X + 6Y'),
    pg_temp.p2a_accessory('4800-normal-burlete', 'Burlete', 1, 'Mt', '2X + 4Y'),
    pg_temp.p2a_accessory('4800-normal-tornillo', 'Tornillo RL Binding 8 x 3/4', 16, 'Pz')
  ),
  jsonb_build_array('Pauta primaria SODAL: dos hojas correderas.', 'La fuente separa perfiles normal y reforzada; no se reutiliza Serie 5000.', 'Corte angular y prueba fisica de taller pendientes.')
));

select pg_temp.p2a_insert_recipe(318, 'Reforzada', 2, 'sodal:catalogo-general-2018:p29:serie-4800:reforzada', 'Catalogo General SODAL, edicion 2018, p. 29', pg_temp.p2a_definition(
  'SODAL-4800-2H-REFORZADA-V1', 'Serie 4800 - Reforzada', 'corredera', 2, 'Reforzada',
  jsonb_build_array(
    pg_temp.p2a_profile('4800-ref-4801', '4801', 'Riel inferior', 'Riel inferior', 'ancho_total', -16, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-ref-4802', '4802', 'Riel superior', 'Riel superior', 'ancho_total', -16, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-ref-4803', '4803', 'Jamba', 'Jamba', 'alto_total', 0, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-ref-4804', '4804', 'Zocalo de hoja', 'Zocalo de hoja', 'ancho_por_hoja', -15, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-ref-4805', '4805', 'Cabezal de hoja', 'Cabezal de hoja', 'ancho_por_hoja', -15, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-ref-4810', '4810', 'Traslapo reforzado', 'Traslapo de hoja', 'alto_total', -32, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4800-ref-4811', '4811', 'Pierna reforzada', 'Pierna de hoja', 'alto_total', -32, 2, 'No publicado en la tabla de pauta')
  ),
  jsonb_build_array(pg_temp.p2a_glass('4800-ref-glass', 'Vidrio de hoja', 'ancho_por_hoja', -42, 'alto_total', -93, 2)),
  jsonb_build_array(
    pg_temp.p2a_accessory('4800-ref-rodamiento', 'Rodamiento 4800', 4, 'Pz'),
    pg_temp.p2a_accessory('4800-ref-soporte', 'Soporte rodamiento 4800', 4, 'Pz'),
    pg_temp.p2a_accessory('4800-ref-guia', 'Guia superior 4800', 4, 'Pz'),
    pg_temp.p2a_accessory('4800-ref-caracol', 'Caracol central', 1, 'Pz'),
    pg_temp.p2a_accessory('4800-ref-felpa', 'Felpa 5 x 5', 1, 'Mt', '4X + 6Y'),
    pg_temp.p2a_accessory('4800-ref-burlete', 'Burlete', 1, 'Mt', '2X + 4Y'),
    pg_temp.p2a_accessory('4800-ref-tornillo', 'Tornillo RL Binding 8 x 3/4', 16, 'Pz')
  ),
  jsonb_build_array('Pauta primaria SODAL: dos hojas correderas reforzadas.', 'La fuente separa perfiles 4810/4811 de 4806/4808.', 'Corte angular y prueba fisica de taller pendientes.')
));

-- S-33 normal y RPT no comparten perfiles ni receta.
select pg_temp.p2a_insert_recipe(321, 'Normal', 2, 'sodal:catalogo-general-2018:p41:s33:2h:normal', 'Catalogo General SODAL, edicion 2018, p. 41', pg_temp.p2a_definition(
  'SODAL-S33-2H-NORMAL-V1', 'S-33 - Normal', 'corredera', 2, 'Normal',
  jsonb_build_array(
    pg_temp.p2a_profile('s33-normal-3324-x', '3324', 'Riel cámara', 'Marco horizontal', 'ancho_total', 0, 2, '45/45'),
    pg_temp.p2a_profile('s33-normal-3324-y', '3324', 'Riel cámara', 'Marco vertical', 'alto_total', 0, 2, '45/45'),
    pg_temp.p2a_profile('s33-normal-3308-x', '3308', 'Hoja TP', 'Cabezal/zocalo de hoja', 'ancho_por_hoja', -4, 4, '45/45'),
    pg_temp.p2a_profile('s33-normal-3308-y', '3308', 'Hoja TP', 'Pierna de hoja', 'alto_total', -72, 4, '45/45'),
    pg_temp.p2a_profile('s33-normal-3303', '3303', 'Traslapo', 'Traslapo de hoja', 'alto_total', -72, 2, '90/90')
  ),
  jsonb_build_array(pg_temp.p2a_glass('s33-normal-glass', 'Vidrio de hoja', 'ancho_por_hoja', -117, 'alto_total', -186, 2)),
  jsonb_build_array(
    pg_temp.p2a_accessory('s33-normal-escuadra', 'Escuadra bloqueo Anudal', 8, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-escuadra-5081', 'Escuadra Anudal 5081', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-cierre', 'Cierre o cremona', 2, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-carro', 'Carro Mendavia doble aguja', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-guia-ext', 'Guia exterior S-33', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-guia-int', 'Guia interior S-33', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-tope', 'Tope amortiguador S-33', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-sello', 'Sello central', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-normal-felpa', 'Felpa 7 x 6', 1, 'Mt', '4X + 6Y'),
    pg_temp.p2a_accessory('s33-normal-burlete', 'Burlete DVP', 1, 'Mt', '2X + 4Y')
  ),
  jsonb_build_array('Pauta primaria SODAL: Catalogo General 2018, p. 41, dos hojas.', 'Se sustituyen referencias estructurales incompletas por la pauta publicada.', 'Formulas lineales y prueba fisica de taller pendientes.')
));

select pg_temp.p2a_insert_recipe(322, 'RPT', 2, 'sodal:s33-rpt:pauta-2h', 'Catalogo SODAL RPT, ficha S-33 RPT, pauta para dos hojas', pg_temp.p2a_definition(
  'SODAL-S33-2H-RPT-V1', 'S-33 RPT - Dos hojas', 'corredera', 2, 'RPT',
  jsonb_build_array(
    pg_temp.p2a_profile('s33-rpt-3324r-x', '3324R', 'Riel cámara RPT', 'Marco horizontal', 'ancho_total', 0, 2, '45/45'),
    pg_temp.p2a_profile('s33-rpt-3324r-y', '3324R', 'Riel cámara RPT', 'Marco vertical', 'alto_total', 0, 2, '45/45'),
    pg_temp.p2a_profile('s33-rpt-3308r-x', '3308R', 'Hoja TP RPT', 'Cabezal/zocalo de hoja RPT', 'ancho_por_hoja', 4, 4, '45/45'),
    pg_temp.p2a_profile('s33-rpt-3308r-y', '3308R', 'Hoja TP RPT', 'Pierna de hoja RPT', 'alto_total', -64, 4, '45/45'),
    pg_temp.p2a_profile('s33-rpt-3303', '3303', 'Traslapo', 'Traslapo de hoja', 'alto_total', -64, 2, '90/90')
  ),
  jsonb_build_array(pg_temp.p2a_glass('s33-rpt-glass', 'Termopanel', 'ancho_por_hoja', -108, 'alto_total', -176, 2)),
  jsonb_build_array(
    pg_temp.p2a_accessory('s33-rpt-escuadra-3308r', 'Escuadra bloqueo Anudal 3308R', 8, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-escuadra-s33', 'Escuadra bloqueo Anudal S-33', 8, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-cremona', 'Cremona de 2 puntos', 2, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-manilla', 'Manilla Alualpha 608', 2, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-carro', 'Carro Mendavia doble aguja S-33', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-guia-ext', 'Guia exterior S-33', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-guia-int', 'Guia interior S-33', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-tope', 'Tope amortiguador S-33', 4, 'Pz'),
    pg_temp.p2a_accessory('s33-rpt-felpa', 'Felpa RPT', 1, 'Mt', '6X + 8Y'),
    pg_temp.p2a_accessory('s33-rpt-burlete', 'Burlete TP S-33', 1, 'Mt', '2X + 4Y')
  ),
  jsonb_build_array('Pauta primaria SODAL RPT: S-33 RPT, dos hojas.', '3324R/3308R y termopanel se mantienen separados de S-33 normal.', 'Formulas lineales y prueba fisica de taller pendientes.')
));

-- S-83 4H y 8H son recetas independientes.
select pg_temp.p2a_insert_recipe(327, '4 hojas', 4, 'sodal:catalogo-general-2018:p45:s83:4h', 'Catalogo General SODAL, edicion 2018, p. 45', pg_temp.p2a_definition(
  'SODAL-S83-4H-V1', 'MultiSlide S-83 - 4 hojas', 'corredera', 4, '4 hojas',
  jsonb_build_array(
    pg_temp.p2a_profile('s83-4h-s831', 'S831', 'Riel inferior 4L', 'Riel inferior', 'ancho_total', -26, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('s83-4h-s832', 'S832', 'Riel superior', 'Riel superior', 'ancho_total', -26, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('s83-4h-s833', 'S833', 'Jamba 4L', 'Jamba', 'alto_total', 0, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('s83-4h-s834', 'S834', 'Zocalo', 'Zocalo de hoja', 'ancho_por_hoja', -11, 4, 'No publicado en la tabla de pauta')
  ),
  jsonb_build_array(pg_temp.p2a_glass('s83-4h-glass', 'Vidrio de hoja S-83', 'ancho_por_hoja', -11, 'alto_total', -86, 4)),
  jsonb_build_array(
    pg_temp.p2a_accessory('s83-4h-carro', 'Carro doble S83', 8, 'Pz'),
    pg_temp.p2a_accessory('s83-4h-tapa', 'Tapa zocalo', 8, 'Pz'),
    pg_temp.p2a_accessory('s83-4h-tirador', 'Tirador S83', 2, 'Pz'),
    pg_temp.p2a_accessory('s83-4h-felpa-1', 'Felpa 5 x 5', 1, 'Mt', '2X'),
    pg_temp.p2a_accessory('s83-4h-felpa-2', 'Felpa 7 x 6', 1, 'Mt', '8X'),
    pg_temp.p2a_accessory('s83-4h-burlete-1', 'Burlete globo', 2, 'Tr'),
    pg_temp.p2a_accessory('s83-4h-burlete-2', 'Burlete traslapo', 6, 'Tr')
  ),
  jsonb_build_array('Pauta primaria SODAL: Catalogo General 2018, p. 45, cuatro hojas.', 'No se deriva 4H como multiplicacion de otra receta.', 'Composicion del vidrio, formulas lineales y prueba fisica pendientes.')
));

select pg_temp.p2a_insert_recipe(328, '8 hojas', 8, 'sodal:catalogo-general-2018:p45:s83:8h', 'Catalogo General SODAL, edicion 2018, p. 45', pg_temp.p2a_definition(
  'SODAL-S83-8H-V1', 'MultiSlide S-83 - 8 hojas', 'corredera', 8, '8 hojas',
  jsonb_build_array(
    pg_temp.p2a_profile('s83-8h-s831', 'S831', 'Riel inferior 4L', 'Riel inferior', 'ancho_total', -26, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('s83-8h-s832', 'S832', 'Riel superior', 'Riel superior', 'ancho_total', -26, 1, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('s83-8h-s833', 'S833', 'Jamba 4L', 'Jamba', 'alto_total', 0, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('s83-8h-s834', 'S834', 'Zocalo', 'Zocalo de hoja', 'ancho_por_hoja', -7, 8, 'No publicado en la tabla de pauta')
  ),
  jsonb_build_array(pg_temp.p2a_glass('s83-8h-glass', 'Vidrio de hoja S-83', 'ancho_por_hoja', -8, 'alto_total', -86, 8)),
  jsonb_build_array(
    pg_temp.p2a_accessory('s83-8h-carro', 'Carro doble S83', 16, 'Pz'),
    pg_temp.p2a_accessory('s83-8h-tapa', 'Tapa zocalo', 16, 'Pz'),
    pg_temp.p2a_accessory('s83-8h-tirador', 'Tirador S83', 4, 'Pz'),
    pg_temp.p2a_accessory('s83-8h-felpa-1', 'Felpa 5 x 5', 1, 'Mt', '2X'),
    pg_temp.p2a_accessory('s83-8h-felpa-2', 'Felpa 7 x 6', 1, 'Mt', '8X'),
    pg_temp.p2a_accessory('s83-8h-burlete-1', 'Burlete globo', 3, 'Tr'),
    pg_temp.p2a_accessory('s83-8h-burlete-2', 'Burlete traslapo', 12, 'Tr')
  ),
  jsonb_build_array('Pauta primaria SODAL: Catalogo General 2018, p. 45, ocho hojas.', 'La pauta cambia divisor, descuento de vidrio y accesorios respecto de 4H.', 'Composicion del vidrio, formulas lineales y prueba fisica pendientes.')
));

-- Serie 3200: variantes tecnicas documentadas, sin inferir L/ST/TP.
select pg_temp.p2a_insert_recipe(329, 'Bastidor 3221', 1, 'sodal:catalogo-general-2018:p21:serie-3200:bastidor-3221', 'Catalogo General SODAL, edicion 2018, p. 21', pg_temp.p2a_definition(
  'SODAL-3200-1H-BASTIDOR-3221-V1', 'Serie 3200 - Bastidor 3221', 'puerta_abatible', 1, 'Bastidor 3221',
  jsonb_build_array(
    pg_temp.p2a_profile('3200-3221-3222-x', '3222', 'Marco', 'Marco superior', 'ancho_total', 0, 1, '45/45'),
    pg_temp.p2a_profile('3200-3221-3222-y1', '3222', 'Marco', 'Marco lateral izquierdo', 'alto_total', 0, 1, '45/90'),
    pg_temp.p2a_profile('3200-3221-3222-y2', '3222', 'Marco', 'Marco lateral derecho', 'alto_total', 0, 1, '90/45'),
    pg_temp.p2a_profile('3200-3221-bastidor-x', '3221', 'Bastidor', 'Bastidor horizontal', 'ancho_total', -42, 2, '45/45'),
    pg_temp.p2a_profile('3200-3221-bastidor-y', '3221', 'Bastidor', 'Bastidor vertical', 'alto_total', -29, 2, '45/45')
  ),
  jsonb_build_array(pg_temp.p2a_glass('3200-3221-glass', 'Vidrio para bastidor 3221', 'ancho_total', -141, 'alto_total', -128, 1)),
  jsonb_build_array(
    pg_temp.p2a_accessory('3200-3221-bisagra', 'Bisagra 3200 Udinese', 1, 'Jg'),
    pg_temp.p2a_accessory('3200-3221-escuadra-marco', 'Escuadra marco DC 3800', 2, 'Pz'),
    pg_temp.p2a_accessory('3200-3221-escuadra-bastidor', 'Escuadra bastidor 3200', 4, 'Pz'),
    pg_temp.p2a_accessory('3200-3221-felpa', 'Felpa 5 x 5 marco', 1, 'Mt', 'X + 2Y'),
    pg_temp.p2a_accessory('3200-3221-burlete', 'Burlete 305 o 329', 1, 'Mt', '2X + 2Y'),
    pg_temp.p2a_accessory('3200-3221-cerradura', 'Cerradura ISEO E.25 o E.35', 1, 'Pz')
  ),
  jsonb_build_array('Pauta primaria SODAL: Catalogo General 2018, p. 21.', 'La fuente comercial actual publica L/ST/TP, pero no mapea inequívocamente esas etiquetas a 3221/3225 en la ficha consultada.', 'La lamina muestra 3227 donde la tabla de pauta dice 3225; se conserva como advertencia.', 'Prueba fisica de taller pendiente.')
));

select pg_temp.p2a_insert_recipe(329, 'Bastidor 3225', 1, 'sodal:catalogo-general-2018:p21:serie-3200:bastidor-3225', 'Catalogo General SODAL, edicion 2018, p. 21', pg_temp.p2a_definition(
  'SODAL-3200-1H-BASTIDOR-3225-V1', 'Serie 3200 - Bastidor 3225', 'puerta_abatible', 1, 'Bastidor 3225',
  jsonb_build_array(
    pg_temp.p2a_profile('3200-3225-3222-x', '3222', 'Marco', 'Marco superior', 'ancho_total', 0, 1, '45/45'),
    pg_temp.p2a_profile('3200-3225-3222-y1', '3222', 'Marco', 'Marco lateral izquierdo', 'alto_total', 0, 1, '45/90'),
    pg_temp.p2a_profile('3200-3225-3222-y2', '3222', 'Marco', 'Marco lateral derecho', 'alto_total', 0, 1, '90/45'),
    pg_temp.p2a_profile('3200-3225-bastidor-x', '3225', 'Bastidor', 'Bastidor horizontal', 'ancho_total', -42, 2, '45/45'),
    pg_temp.p2a_profile('3200-3225-bastidor-y', '3225', 'Bastidor', 'Bastidor vertical', 'alto_total', -29, 2, '45/45')
  ),
  jsonb_build_array(pg_temp.p2a_glass('3200-3225-glass', 'Vidrio para bastidor 3225', 'ancho_total', -190, 'alto_total', -177, 1)),
  jsonb_build_array(
    pg_temp.p2a_accessory('3200-3225-bisagra', 'Bisagra 3200 Udinese', 1, 'Jg'),
    pg_temp.p2a_accessory('3200-3225-escuadra-marco', 'Escuadra marco DC 3800', 2, 'Pz'),
    pg_temp.p2a_accessory('3200-3225-escuadra-bastidor', 'Escuadra bastidor 3200', 4, 'Pz'),
    pg_temp.p2a_accessory('3200-3225-felpa', 'Felpa 5 x 5 marco', 1, 'Mt', 'X + 2Y'),
    pg_temp.p2a_accessory('3200-3225-burlete', 'Burlete 305 o 329', 1, 'Mt', '2X + 2Y'),
    pg_temp.p2a_accessory('3200-3225-cerradura', 'Cerradura ISEO E.25 o E.35', 1, 'Pz')
  ),
  jsonb_build_array('Pauta primaria SODAL: Catalogo General 2018, p. 21.', 'No se mezclan perfiles ni descuentos de bastidor 3221 y 3225.', 'La lamina muestra 3227 donde la tabla de pauta dice 3225; se conserva como advertencia.', 'Prueba fisica de taller y mapeo L/ST/TP pendientes.')
));

-- Serie 4600: quicio mecanico e hidraulico separados.
select pg_temp.p2a_insert_recipe(330, 'Quicio mecanico Scanavini', 1, 'sodal:catalogo-general-2018:p23:serie-4600:quicio-mecanico', 'Catalogo General SODAL, edicion 2018, p. 23', pg_temp.p2a_definition(
  'SODAL-4600-VAIVEN-MECANICO-V1', 'Serie 4600 - Quicio mecanico Scanavini', 'puerta_vaiven', 1, 'Quicio mecanico Scanavini',
  jsonb_build_array(
    pg_temp.p2a_profile('4600-mec-4601', '4601', 'Perfil de puerta', 'Perfil de puerta', 'ancho_total', -21, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4600-mec-4603', '4603', 'Zocalo quicio Scanavini', 'Zocalo quicio', 'ancho_total', -118, 2, 'No publicado en la tabla de pauta')
  ),
  jsonb_build_array(pg_temp.p2a_glass('4600-mec-glass', 'Vidrio puerta vaiven mecanica', 'ancho_total', -102, 'alto_total', -195, 1)),
  jsonb_build_array(pg_temp.p2a_accessory('4600-mec-quicio', 'Quicio mecanico Scanavini', 1, 'Pz')),
  jsonb_build_array('Pauta primaria SODAL: Catalogo General 2018, p. 23.', 'Tipologia canonica puerta_vaiven; no es corredera.', 'Variante mecanica separada de hidraulica.', 'Prueba fisica de taller pendiente.')
));

select pg_temp.p2a_insert_recipe(330, 'Quicio hidraulico MAB', 1, 'sodal:catalogo-general-2018:p23:serie-4600:quicio-hidraulico', 'Catalogo General SODAL, edicion 2018, p. 23', pg_temp.p2a_definition(
  'SODAL-4600-VAIVEN-HIDRAULICO-V1', 'Serie 4600 - Quicio hidraulico MAB', 'puerta_vaiven', 1, 'Quicio hidraulico MAB',
  jsonb_build_array(
    pg_temp.p2a_profile('4600-hid-4604', '4604', 'Pierna', 'Pierna de puerta', 'ancho_total', -18, 2, 'No publicado en la tabla de pauta'),
    pg_temp.p2a_profile('4600-hid-4602', '4602', 'Zocalo quicio MAB', 'Zocalo quicio', 'ancho_total', -118, 2, 'No publicado en la tabla de pauta')
  ),
  jsonb_build_array(pg_temp.p2a_glass('4600-hid-glass', 'Vidrio puerta vaiven hidraulica', 'ancho_total', -102, 'alto_total', -192, 1)),
  jsonb_build_array(pg_temp.p2a_accessory('4600-hid-quicio', 'Quicio hidraulico MAB', 1, 'Pz')),
  jsonb_build_array('Pauta primaria SODAL: Catalogo General 2018, p. 23.', 'Tipologia canonica puerta_vaiven; no es corredera.', 'Variante hidraulica separada de mecanica.', 'Prueba fisica de taller pendiente.')
));

drop function if exists pg_temp.p2a_insert_recipe(bigint, text, integer, text, text, jsonb);
drop function if exists pg_temp.p2a_definition(text, text, text, integer, text, jsonb, jsonb, jsonb, jsonb);
drop function if exists pg_temp.p2a_accessory(text, text, integer, text, text);
drop function if exists pg_temp.p2a_glass(text, text, text, integer, text, integer, integer);
drop function if exists pg_temp.p2a_profile(text, text, text, text, text, integer, integer, text);
