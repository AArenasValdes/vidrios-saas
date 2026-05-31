-- Ensure public_landing_testimonials follows the canonical tenant key type.
-- organizations.id is bigint in Ventora. This migration is intentionally
-- defensive because an earlier local migration used uuid for organization_id.

do $$
declare
  current_data_type text;
begin
  select data_type
    into current_data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'public_landing_testimonials'
    and column_name = 'organization_id';

  if current_data_type is null then
    return;
  end if;

  if current_data_type <> 'bigint' then
    if exists (
      select 1
      from public.public_landing_testimonials
      where organization_id is not null
        and organization_id::text !~ '^[0-9]+$'
    ) then
      raise exception
        'public_landing_testimonials.organization_id contains non-numeric values; cannot cast safely to bigint';
    end if;

    alter table public.public_landing_testimonials
      drop constraint if exists public_landing_testimonials_organization_id_fkey;

    alter table public.public_landing_testimonials
      alter column organization_id type bigint
      using organization_id::text::bigint;
  end if;

  alter table public.public_landing_testimonials
    drop constraint if exists public_landing_testimonials_organization_id_fkey;

  alter table public.public_landing_testimonials
    add constraint public_landing_testimonials_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete cascade;
end
$$;
