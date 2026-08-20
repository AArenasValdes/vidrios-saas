-- El FK cotizaciones_solicitud_id_fkey usa (solicitud_id, organization_id).
-- Sustituye el índice simple de la primera pasada por su cobertura exacta.
drop index if exists public.cotizaciones_solicitud_id_full_idx;

create index if not exists cotizaciones_solicitud_organization_id_idx
  on public.cotizaciones (solicitud_id, organization_id);
