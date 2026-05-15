create index if not exists cotizaciones_org_deleted_updated_idx
  on public.cotizaciones (organization_id, eliminado_en, actualizado_en desc);

create index if not exists cotizaciones_org_deleted_estado_updated_idx
  on public.cotizaciones (organization_id, eliminado_en, estado, actualizado_en desc);

create index if not exists solicitudes_contacto_org_created_idx
  on public.solicitudes_contacto (organization_id, creado_en desc);

create index if not exists solicitudes_contacto_org_estado_created_idx
  on public.solicitudes_contacto (organization_id, estado, creado_en desc);
