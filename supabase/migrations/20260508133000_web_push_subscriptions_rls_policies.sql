do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_push_subscriptions'
      and policyname = 'web_push_subscriptions_select_own'
  ) then
    create policy web_push_subscriptions_select_own
      on public.web_push_subscriptions
      for select
      to authenticated
      using (
        organization_id = public.get_org_id()
        and auth_user_id = auth.uid()
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_push_subscriptions'
      and policyname = 'web_push_subscriptions_insert_own'
  ) then
    create policy web_push_subscriptions_insert_own
      on public.web_push_subscriptions
      for insert
      to authenticated
      with check (
        organization_id = public.get_org_id()
        and auth_user_id = auth.uid()
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_push_subscriptions'
      and policyname = 'web_push_subscriptions_update_own'
  ) then
    create policy web_push_subscriptions_update_own
      on public.web_push_subscriptions
      for update
      to authenticated
      using (
        organization_id = public.get_org_id()
        and auth_user_id = auth.uid()
      )
      with check (
        organization_id = public.get_org_id()
        and auth_user_id = auth.uid()
      );
  end if;
end
$$;
