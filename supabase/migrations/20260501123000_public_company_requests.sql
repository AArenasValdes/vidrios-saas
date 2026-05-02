do $$
declare
  organization_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into organization_id_type
  from pg_attribute as attribute
  join pg_class as class on class.oid = attribute.attrelid
  join pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relname = 'organizations'
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if organization_id_type is null then
    raise exception 'No se encontro public.organizations.id. Ajusta la migracion antes de ejecutarla.';
  end if;

  execute format(
    'alter table public.organization_profile
      add column if not exists solicitud_publica_slug text,
      add column if not exists solicitud_publica_valor text,
      add column if not exists solicitud_publica_privacidad text'
  );

  execute format(
    'alter table public.solicitudes_contacto
      add column if not exists organization_id %s references public.organizations (id) on delete cascade,
      add column if not exists contacto text,
      add column if not exists tipo_trabajo text,
      add column if not exists contexto text not null default ''landing''',
    organization_id_type
  );
end $$;

alter table public.solicitudes_contacto
  alter column correo drop not null,
  alter column telefono drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'solicitudes_contacto_contexto_check'
  ) then
    alter table public.solicitudes_contacto
      add constraint solicitudes_contacto_contexto_check
      check (contexto in ('landing', 'empresa-publica'));
  end if;
end $$;

create unique index if not exists organization_profile_solicitud_publica_slug_uidx
  on public.organization_profile (lower(solicitud_publica_slug))
  where solicitud_publica_slug is not null and solicitud_publica_slug <> '';

create index if not exists solicitudes_contacto_organization_id_creado_en_idx
  on public.solicitudes_contacto (organization_id, creado_en desc);

comment on column public.organization_profile.solicitud_publica_slug is
  'Identificador publico de la ruta /solicitud/[slug] para captar prospectos por organizacion.';

comment on column public.organization_profile.solicitud_publica_valor is
  'Mensaje breve que explica que obtiene el prospecto al dejar su solicitud.';

comment on column public.organization_profile.solicitud_publica_privacidad is
  'Mensaje breve de privacidad para la solicitud publica de la organizacion.';

comment on column public.solicitudes_contacto.organization_id is
  'Organizacion dueña del lead cuando proviene de una solicitud publica de empresa.';

comment on column public.solicitudes_contacto.contacto is
  'Canal libre de contacto entregado por el prospecto (telefono, WhatsApp o correo).';

comment on column public.solicitudes_contacto.tipo_trabajo is
  'Trabajo que necesita el prospecto cuando llega desde /solicitud/[empresa].';

comment on column public.solicitudes_contacto.contexto is
  'Origen funcional del lead: landing o empresa-publica.';
