begin;

drop policy if exists cotizacion_code_counters_no_client_access on public.cotizacion_code_counters;
drop policy if exists cotizacion_code_counters_select_own on public.cotizacion_code_counters;
drop policy if exists cotizacion_code_counters_insert_own on public.cotizacion_code_counters;
drop policy if exists cotizacion_code_counters_update_own on public.cotizacion_code_counters;

create policy cotizacion_code_counters_select_own
  on public.cotizacion_code_counters
  for select
  to authenticated
  using (organization_id = public.get_org_id());

create policy cotizacion_code_counters_insert_own
  on public.cotizacion_code_counters
  for insert
  to authenticated
  with check (organization_id = public.get_org_id());

create policy cotizacion_code_counters_update_own
  on public.cotizacion_code_counters
  for update
  to authenticated
  using (organization_id = public.get_org_id())
  with check (organization_id = public.get_org_id());

commit;
