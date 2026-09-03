-- Fase 1: catalog_key para identificar líneas precargadas del catálogo Ventora.
-- Permite seed idempotente sin duplicar filas.

alter table public.cotizacion_line_templates
  add column if not exists catalog_key text null;

-- Unique parcial: una sola fila activa por catalog_key+org
create unique index if not exists cotizacion_line_templates_catalog_key_org_unique
  on public.cotizacion_line_templates (organization_id, catalog_key)
  where catalog_key is not null and eliminado_en is null;
