alter table if exists public.clients
  add column if not exists estado_manual text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_estado_manual_check'
  ) then
    alter table public.clients
      add constraint clients_estado_manual_check
      check (
        estado_manual is null
        or estado_manual in ('activo', 'seguimiento', 'prospecto', 'inactivo')
      );
  end if;
end $$;

create index if not exists clients_active_org_estado_manual_idx
  on public.clients (organization_id, estado_manual)
  where eliminado_en is null;
