begin;
select plan(9);

select ok((select relrowsecurity from pg_class where oid = 'public.organizacion_presentaciones_taller'::regclass), 'RLS presentaciones privadas activo');
select ok(not has_table_privilege('anon', 'public.organizacion_presentaciones_taller', 'select'), 'anon no lee datos del taller');
select ok(not has_table_privilege('authenticated', 'public.organizacion_presentaciones_taller', 'insert'), 'cliente no inserta directamente');
select ok(not has_table_privilege('authenticated', 'public.organizacion_presentaciones_taller', 'update'), 'cliente no modifica directamente');
select ok(has_table_privilege('authenticated', 'public.organizacion_presentaciones_taller', 'select'), 'cliente autenticado puede leer su empresa');
select ok(has_table_privilege('service_role', 'public.organizacion_presentaciones_taller', 'insert'), 'servidor inserta datos privados');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organizacion_presentaciones_taller' and cmd = 'SELECT' and roles @> array['authenticated']::name[] and qual like '%get_org_id%'), 'RLS filtra organization_id');
select ok(not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organizacion_presentaciones_taller' and cmd <> 'SELECT'), 'no hay políticas de escritura cliente');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'organizacion_presentaciones_taller' and indexname = 'organizacion_presentaciones_taller_preferida_uq' and indexdef like '%UNIQUE%'), 'una elección privada por perfil y acabado');

select * from finish();
rollback;
