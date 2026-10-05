begin;
select plan(14);

select ok((select relrowsecurity from pg_class where oid = 'public.organizacion_ajustes_proveedor'::regclass), 'RLS ajustes activo');
select ok((select relrowsecurity from pg_class where oid = 'public.organizacion_precios_presentacion'::regclass), 'RLS overrides activo');
select ok(not has_table_privilege('anon', 'public.organizacion_ajustes_proveedor', 'select'), 'anon no lee ajustes');
select ok(not has_table_privilege('anon', 'public.organizacion_precios_presentacion', 'select'), 'anon no lee precios propios');
select ok(not has_table_privilege('authenticated', 'public.organizacion_ajustes_proveedor', 'insert'), 'authenticated no escribe ajustes directamente');
select ok(not has_table_privilege('authenticated', 'public.organizacion_precios_presentacion', 'insert'), 'authenticated no escribe overrides directamente');
select ok(not has_table_privilege('authenticated', 'public.organizacion_ajustes_proveedor', 'update'), 'authenticated no actualiza ajustes directamente');
select ok(not has_table_privilege('authenticated', 'public.organizacion_precios_presentacion', 'update'), 'authenticated no actualiza overrides directamente');
select ok(has_table_privilege('service_role', 'public.organizacion_ajustes_proveedor', 'insert'), 'servidor escribe ajustes');
select ok(has_table_privilege('service_role', 'public.organizacion_precios_presentacion', 'insert'), 'servidor escribe overrides');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organizacion_ajustes_proveedor' and cmd = 'SELECT' and roles @> array['authenticated']::name[] and qual like '%get_org_id%'), 'lectura ajuste filtra organización autenticada');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organizacion_precios_presentacion' and cmd = 'SELECT' and roles @> array['authenticated']::name[] and qual like '%get_org_id%'), 'lectura override filtra organización autenticada');
select ok(not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organizacion_ajustes_proveedor' and cmd <> 'SELECT'), 'ajustes sin escritura cliente');
select ok(not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organizacion_precios_presentacion' and cmd <> 'SELECT'), 'overrides sin escritura cliente');

select * from finish();
rollback;
