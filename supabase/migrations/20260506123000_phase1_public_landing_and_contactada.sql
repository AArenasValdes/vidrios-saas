do $$
begin
  alter table public.organization_profile
    add column if not exists solicitud_publica_descripcion_corta text,
    add column if not exists solicitud_publica_mensaje_confianza text,
    add column if not exists solicitud_publica_horario_desde text,
    add column if not exists solicitud_publica_horario_hasta text,
    add column if not exists solicitud_publica_dias_atencion text;

  alter table public.solicitudes_contacto
    add column if not exists contactada_at timestamptz;
end $$;

create index if not exists solicitudes_contacto_organization_id_contactada_at_idx
  on public.solicitudes_contacto (organization_id, contactada_at desc);

comment on column public.organization_profile.solicitud_publica_descripcion_corta is
  'Descripcion corta principal de la mini-landing publica de solicitud.';

comment on column public.organization_profile.solicitud_publica_mensaje_confianza is
  'Mensaje breve de confianza para reforzar respuesta, seriedad o seguimiento comercial.';

comment on column public.organization_profile.solicitud_publica_horario_desde is
  'Hora de inicio de atencion comercial para mostrar estado ON/OFF en la landing publica. Formato HH:MM.';

comment on column public.organization_profile.solicitud_publica_horario_hasta is
  'Hora de cierre de atencion comercial para mostrar estado ON/OFF en la landing publica. Formato HH:MM.';

comment on column public.organization_profile.solicitud_publica_dias_atencion is
  'Dias de atencion comercial en formato CSV usando 0=domingo a 6=sabado. Ej: 1,2,3,4,5,6.';

comment on column public.solicitudes_contacto.contactada_at is
  'Momento en que la solicitud fue marcada como contactada por el equipo comercial.';
