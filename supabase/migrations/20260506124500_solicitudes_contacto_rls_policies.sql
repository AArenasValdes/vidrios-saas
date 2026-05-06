do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'solicitudes_contacto'
      and policyname = 'solicitudes_contacto_insert_public'
  ) then
    create policy solicitudes_contacto_insert_public
      on public.solicitudes_contacto
      for insert
      to anon, authenticated
      with check (
        estado = 'nueva'
        and (
          (contexto = 'landing' and organization_id is null)
          or (contexto = 'empresa-publica' and organization_id is not null)
        )
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
      and tablename = 'solicitudes_contacto'
      and policyname = 'solicitudes_contacto_select_own'
  ) then
    create policy solicitudes_contacto_select_own
      on public.solicitudes_contacto
      for select
      to authenticated
      using (organization_id = public.get_org_id());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'solicitudes_contacto'
      and policyname = 'solicitudes_contacto_update_own'
  ) then
    create policy solicitudes_contacto_update_own
      on public.solicitudes_contacto
      for update
      to authenticated
      using (organization_id = public.get_org_id())
      with check (organization_id = public.get_org_id());
  end if;
end
$$;
