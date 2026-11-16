begin;
select plan(10);

select ok((select relrowsecurity from pg_class where oid = 'public.organization_fabrication_cut_settings'::regclass), 'RLS parámetros de corte activo');
select ok(exists (
  select 1 from pg_indexes where schemaname = 'public'
    and tablename = 'organization_fabrication_cut_settings'
    and indexname = 'organization_fabrication_cut_settings_pkey'
    and indexdef like '%(organization_id)%'
), 'una fila única por organización');
select ok(not has_table_privilege('anon', 'public.organization_fabrication_cut_settings', 'select'), 'anon no lee parámetros');
select ok(not exists (
  select 1
  from pg_class c,
       lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
  where c.oid = 'public.organization_fabrication_cut_settings'::regclass
    and acl.grantee = 0
    and acl.privilege_type = 'SELECT'
), 'PUBLIC no lee parámetros');
select ok(has_table_privilege('authenticated', 'public.organization_fabrication_cut_settings', 'select'), 'autenticado puede leer mediante RLS');
select ok(not has_table_privilege('authenticated', 'public.organization_fabrication_cut_settings', 'insert'), 'cliente no inserta directamente');
select ok(not has_table_privilege('authenticated', 'public.organization_fabrication_cut_settings', 'update'), 'cliente no actualiza directamente');
select ok(not has_table_privilege('authenticated', 'public.organization_fabrication_cut_settings', 'delete'), 'cliente no elimina directamente');
select ok(has_table_privilege('service_role', 'public.organization_fabrication_cut_settings', 'insert'), 'API servidor puede guardar parámetros');
select ok(exists (
  select 1 from pg_policies where schemaname = 'public'
    and tablename = 'organization_fabrication_cut_settings'
    and cmd = 'SELECT' and roles @> array['authenticated']::name[]
    and qual like '%get_org_id%'
) and not exists (
  select 1 from pg_policies where schemaname = 'public'
    and tablename = 'organization_fabrication_cut_settings' and cmd <> 'SELECT'
), 'lectura aislada por organización y escrituras solo API');

select * from finish();
rollback;
