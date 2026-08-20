-- Las asignaciones siguen existiendo sólo como override de piloto. Estos
-- índices cubren sus FKs y los eventos de activación sin escanear la tabla.
create index if not exists growth_onboarding_assignments_video_id_idx
  on public.growth_onboarding_assignments (video_id)
  where eliminado_en is null;

create index if not exists growth_onboarding_events_assignment_id_idx
  on public.growth_onboarding_events (assignment_id)
  where assignment_id is not null;

create index if not exists growth_onboarding_events_cotizacion_id_idx
  on public.growth_onboarding_events (cotizacion_id)
  where cotizacion_id is not null;

create index if not exists growth_onboarding_events_video_id_idx
  on public.growth_onboarding_events (video_id)
  where video_id is not null;

-- La policy FOR ALL también era una policy SELECT y duplicaba la de lectura.
drop policy if exists growth_onboarding_assignments_write_admin
  on public.growth_onboarding_assignments;

create policy growth_onboarding_assignments_insert_admin
  on public.growth_onboarding_assignments for insert to authenticated
  with check (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_assignments.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  ));

create policy growth_onboarding_assignments_update_admin
  on public.growth_onboarding_assignments for update to authenticated
  using (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_assignments.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  )) with check (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_assignments.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  ));

create policy growth_onboarding_assignments_delete_admin
  on public.growth_onboarding_assignments for delete to authenticated
  using (exists (
    select 1 from public.growth_workspace_members m
    where m.workspace_id = growth_onboarding_assignments.workspace_id
      and m.auth_user_id = (select auth.uid()) and m.activo = true and m.rol = 'admin'
  ));
