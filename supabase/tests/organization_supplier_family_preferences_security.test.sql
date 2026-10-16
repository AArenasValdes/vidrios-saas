begin;
select plan(10);

select ok((select relrowsecurity from pg_class where oid = 'public.organization_supplier_family_preferences'::regclass), 'RLS de proveedores habituales activo');
select ok(exists (
  select 1 from pg_indexes where schemaname = 'public'
    and tablename = 'organization_supplier_family_preferences'
    and indexname = 'organization_supplier_family_preferences_pkey'
    and indexdef like '%(organization_id, family_key)%'
), 'unicidad por organización y familia');
select ok(not has_table_privilege('anon', 'public.organization_supplier_family_preferences', 'select'), 'anon no lee preferencias');
select ok(not has_table_privilege('public', 'public.organization_supplier_family_preferences', 'select'), 'public no lee preferencias');
select ok(has_table_privilege('authenticated', 'public.organization_supplier_family_preferences', 'select'), 'usuario autenticado puede leer mediante RLS');
select ok(not has_table_privilege('authenticated', 'public.organization_supplier_family_preferences', 'insert'), 'cliente no inserta directamente');
select ok(not has_table_privilege('authenticated', 'public.organization_supplier_family_preferences', 'update'), 'cliente no actualiza directamente');
select ok(not has_table_privilege('authenticated', 'public.organization_supplier_family_preferences', 'delete'), 'cliente no elimina directamente');
select ok(has_table_privilege('service_role', 'public.organization_supplier_family_preferences', 'insert'), 'API de servidor puede escribir');
select ok(exists (
  select 1 from pg_policies where schemaname = 'public'
    and tablename = 'organization_supplier_family_preferences'
    and cmd = 'SELECT' and roles @> array['authenticated']::name[]
    and qual like '%get_org_id%'
) and not exists (
  select 1 from pg_policies where schemaname = 'public'
    and tablename = 'organization_supplier_family_preferences' and cmd <> 'SELECT'
), 'lectura aislada por organización y escrituras sin policy cliente');

select * from finish();
rollback;
