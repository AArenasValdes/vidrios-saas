-- Follow-up de hardening:
-- - evitar listing publico innecesario en organization-assets
-- - cerrar EXECUTE publico en funciones internas
-- - explicitar tablas sin acceso cliente con policies deny-all

begin;

drop policy if exists organization_assets_public_read on storage.objects;

revoke execute on function public.get_org_id() from public, anon;
grant execute on function public.get_org_id() to authenticated;
grant execute on function public.get_org_id() to service_role;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;

drop policy if exists cotizacion_code_counters_no_client_access on public.cotizacion_code_counters;
create policy cotizacion_code_counters_no_client_access
  on public.cotizacion_code_counters
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists formula_variables_no_client_access on public.formula_variables;
create policy formula_variables_no_client_access
  on public.formula_variables
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists material_types_no_client_access on public.material_types;
create policy material_types_no_client_access
  on public.material_types
  for all
  to anon, authenticated
  using (false)
  with check (false);

commit;
