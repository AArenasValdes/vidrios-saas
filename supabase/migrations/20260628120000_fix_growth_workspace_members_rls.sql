-- Fix: infinite recursion in growth_workspace_members RLS policies.
-- Las policies admin referenciaban growth_workspace_members dentro de su propio USING.

drop policy if exists growth_workspace_members_select_admin on public.growth_workspace_members;
drop policy if exists growth_workspace_members_insert_admin on public.growth_workspace_members;
drop policy if exists growth_workspace_members_update_admin on public.growth_workspace_members;

create policy growth_workspace_members_select_own
  on public.growth_workspace_members
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

-- INSERT/UPDATE de membership solo vía service role (bootstrap founder).
-- Los demás tablas growth_* validan membership con subquery a esta tabla;
-- al leer solo la fila propia no hay recursión.
