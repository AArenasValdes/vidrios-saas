-- Fase B corregida: el onboarding normal se configura una vez y se entrega
-- automáticamente por dispositivo. Las asignaciones existentes quedan sólo
-- como override excepcional de compatibilidad, no como operación cotidiana.

alter table public.growth_onboarding_videos
  add column if not exists es_predeterminado boolean not null default false;

alter table public.growth_onboarding_videos
  add constraint growth_onboarding_videos_default_device_check
  check (not es_predeterminado or dispositivo in ('movil', 'escritorio'));

create unique index if not exists growth_onboarding_videos_workspace_default_device_uidx
  on public.growth_onboarding_videos (workspace_id, dispositivo)
  where es_predeterminado = true and eliminado_en is null;

create index if not exists growth_onboarding_videos_default_delivery_idx
  on public.growth_onboarding_videos (workspace_id, dispositivo, orden, creado_en)
  where es_predeterminado = true
    and estado = 'listo'
    and eliminado_en is null;

-- Una visualización sirve para medir activación; múltiples clics del mismo
-- negocio en el mismo video no deben inflar el embudo.
delete from public.growth_onboarding_events event_row
using (
  select id,
    row_number() over (
      partition by organization_id, video_id, tipo
      order by ocurrido_en asc, id asc
    ) as position
  from public.growth_onboarding_events
  where tipo = 'video_abierto' and video_id is not null
) duplicated
where event_row.id = duplicated.id and duplicated.position > 1;

create unique index if not exists growth_onboarding_events_video_opened_once_uidx
  on public.growth_onboarding_events (organization_id, video_id, tipo)
  where tipo = 'video_abierto' and video_id is not null;
