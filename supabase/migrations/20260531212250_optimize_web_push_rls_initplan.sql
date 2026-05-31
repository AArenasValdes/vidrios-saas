-- Optimize Web Push RLS policies so auth helpers are evaluated once per query.
-- This keeps the same tenant/user isolation and resolves Supabase advisor 0003.

drop policy if exists web_push_subscriptions_select_own
  on public.web_push_subscriptions;
drop policy if exists web_push_subscriptions_insert_own
  on public.web_push_subscriptions;
drop policy if exists web_push_subscriptions_update_own
  on public.web_push_subscriptions;

create policy web_push_subscriptions_select_own
  on public.web_push_subscriptions
  for select
  to authenticated
  using (
    organization_id = (select public.get_org_id())
    and auth_user_id = (select auth.uid())
  );

create policy web_push_subscriptions_insert_own
  on public.web_push_subscriptions
  for insert
  to authenticated
  with check (
    organization_id = (select public.get_org_id())
    and auth_user_id = (select auth.uid())
  );

create policy web_push_subscriptions_update_own
  on public.web_push_subscriptions
  for update
  to authenticated
  using (
    organization_id = (select public.get_org_id())
    and auth_user_id = (select auth.uid())
  )
  with check (
    organization_id = (select public.get_org_id())
    and auth_user_id = (select auth.uid())
  );
