alter table public.solicitudes_contacto
  drop constraint if exists solicitudes_contacto_contexto_check;

alter table public.solicitudes_contacto
  add constraint solicitudes_contacto_contexto_check
  check (contexto in ('landing', 'empresa-publica', 'registro-saas'));

drop policy if exists solicitudes_contacto_insert_public on public.solicitudes_contacto;

create policy solicitudes_contacto_insert_public
  on public.solicitudes_contacto
  for insert
  to anon, authenticated
  with check (
    estado = 'nueva'
    and (
      (contexto in ('landing', 'registro-saas') and organization_id is null)
      or (contexto = 'empresa-publica' and organization_id is not null)
    )
  );

comment on column public.solicitudes_contacto.contexto is
  'Origen funcional del lead: landing, registro-saas o empresa-publica.';
