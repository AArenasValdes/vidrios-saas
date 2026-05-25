begin;

alter table if exists public.clients
  drop constraint if exists unique_correo_clients;

drop index if exists public.unique_correo_clients;
drop index if exists public.uniq_clients_email_org;

create unique index if not exists uniq_clients_email_org
  on public.clients using btree (organization_id, correo)
  where eliminado_en is null
    and correo is not null;

commit;
