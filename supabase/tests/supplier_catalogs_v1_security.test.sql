begin;
select plan(26);

select ok((select relrowsecurity from pg_class where oid = 'public.catalogo_proveedores'::regclass), 'RLS activo en catálogo de proveedores');
select ok(not has_table_privilege('anon', 'public.catalogo_proveedores', 'select'), 'anon no lee proveedores');
select ok(not has_table_privilege('authenticated', 'public.catalogo_proveedores', 'select'), 'authenticated no lee proveedores directamente');

select ok((select relrowsecurity from pg_class where oid = 'public.catalogo_fuentes_tecnicas'::regclass), 'RLS activo en fuentes técnicas');
select ok(not has_table_privilege('anon', 'public.catalogo_fuentes_tecnicas', 'select'), 'anon no lee fuentes técnicas');
select ok(not has_table_privilege('authenticated', 'public.catalogo_fuentes_tecnicas', 'select'), 'authenticated no lee fuentes técnicas directamente');

select ok((select relrowsecurity from pg_class where oid = 'public.catalogo_insumos_tecnicos'::regclass), 'RLS activo en insumos técnicos');
select ok(not has_table_privilege('anon', 'public.catalogo_insumos_tecnicos', 'select'), 'anon no lee insumos técnicos');
select ok(not has_table_privilege('authenticated', 'public.catalogo_insumos_tecnicos', 'select'), 'authenticated no lee insumos técnicos directamente');

select ok((select relrowsecurity from pg_class where oid = 'public.catalogo_insumo_familias'::regclass), 'RLS activo en relaciones insumo-familia');
select ok(not has_table_privilege('anon', 'public.catalogo_insumo_familias', 'select'), 'anon no lee relaciones insumo-familia');
select ok(not has_table_privilege('authenticated', 'public.catalogo_insumo_familias', 'select'), 'authenticated no lee relaciones insumo-familia directamente');

select ok((select relrowsecurity from pg_class where oid = 'public.catalogo_presentaciones_proveedor'::regclass), 'RLS activo en presentaciones proveedor');
select ok(not has_table_privilege('anon', 'public.catalogo_presentaciones_proveedor', 'select'), 'anon no lee presentaciones');
select ok(not has_table_privilege('authenticated', 'public.catalogo_presentaciones_proveedor', 'select'), 'authenticated no lee presentaciones directamente');

select ok((select relrowsecurity from pg_class where oid = 'public.catalogo_listas_precios'::regclass), 'RLS activo en listas de precios');
select ok(not has_table_privilege('anon', 'public.catalogo_listas_precios', 'select'), 'anon no lee listas');
select ok(not has_table_privilege('authenticated', 'public.catalogo_listas_precios', 'select'), 'authenticated no lee listas directamente');

select ok((select relrowsecurity from pg_class where oid = 'public.catalogo_precios_presentacion'::regclass), 'RLS activo en precios por presentación');
select ok(not has_table_privilege('anon', 'public.catalogo_precios_presentacion', 'select'), 'anon no lee precios');
select ok(not has_table_privilege('authenticated', 'public.catalogo_precios_presentacion', 'select'), 'authenticated no lee precios directamente');

select ok((select relrowsecurity from pg_class where oid = 'public.cotizacion_costos_tecnicos'::regclass), 'RLS activo en snapshots de costo');
select ok(not has_table_privilege('anon', 'public.cotizacion_costos_tecnicos', 'select'), 'anon no lee costo técnico');
select ok(not has_table_privilege('authenticated', 'public.cotizacion_costos_tecnicos', 'select'), 'authenticated no lee snapshots directamente');

select ok(has_table_privilege('service_role', 'public.catalogo_precios_presentacion', 'select'), 'service_role puede leer el catálogo desde rutas server');
select ok(has_table_privilege('service_role', 'public.cotizacion_costos_tecnicos', 'insert'), 'service_role puede guardar snapshots QA');

select * from finish();
rollback;
