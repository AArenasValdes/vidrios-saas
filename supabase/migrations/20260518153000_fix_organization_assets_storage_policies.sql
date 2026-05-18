begin;

drop policy if exists organization_assets_insert_own on storage.objects;
drop policy if exists organization_assets_update_own on storage.objects;
drop policy if exists organization_assets_delete_own on storage.objects;

create policy organization_assets_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

create policy organization_assets_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  )
  with check (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

create policy organization_assets_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'organization-assets'
    and split_part(name, '/', 1) = public.get_org_id()::text
  );

commit;
