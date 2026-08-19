alter table public.cotizaciones
  add column if not exists solicitud_id uuid;

create index if not exists cotizaciones_solicitud_id_idx
  on public.cotizaciones (solicitud_id)
  where solicitud_id is not null;

create unique index if not exists solicitudes_contacto_id_organization_uidx
  on public.solicitudes_contacto (id, organization_id);

alter table public.cotizaciones
  drop constraint if exists cotizaciones_solicitud_id_fkey;

alter table public.cotizaciones
  add constraint cotizaciones_solicitud_id_fkey
  foreign key (solicitud_id, organization_id)
  references public.solicitudes_contacto(id, organization_id)
  on delete restrict;

comment on column public.cotizaciones.solicitud_id is
  'Solicitud publica que origino la cotizacion, para atribucion comercial y trazabilidad. El enlace compuesto tambien protege la organizacion dueña.';
