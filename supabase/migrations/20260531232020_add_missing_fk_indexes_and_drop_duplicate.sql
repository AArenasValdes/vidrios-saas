-- Add covering indexes for foreign keys reported by Supabase Performance Advisor.
-- Keep indexes simple btree and idempotent. Tables are currently small, so regular
-- CREATE INDEX is acceptable and keeps the migration transactional.

create index if not exists configuration_materials_material_id_idx
  on public.configuration_materials using btree (material_id);

create index if not exists cotizacion_items_configuration_id_idx
  on public.cotizacion_items using btree (configuration_id);

create index if not exists cotizacion_items_system_line_id_idx
  on public.cotizacion_items using btree (system_line_id);

create index if not exists cotizacion_items_product_type_id_idx
  on public.cotizacion_items using btree (product_type_id);

create index if not exists cotizaciones_proyecto_id_idx
  on public.cotizaciones using btree (proyecto_id);

create index if not exists historial_precios_cambiado_por_idx
  on public.historial_precios using btree (cambiado_por);

create index if not exists labor_costs_organization_id_idx
  on public.labor_costs using btree (organization_id);

create index if not exists line_glass_compatibility_glass_material_id_idx
  on public.line_glass_compatibility using btree (glass_material_id);

create index if not exists materials_material_type_id_idx
  on public.materials using btree (material_type_id);

create index if not exists materials_organization_id_idx
  on public.materials using btree (organization_id);

create index if not exists onboarding_checklists_completed_by_user_id_idx
  on public.onboarding_checklists using btree (completed_by_user_id);

create index if not exists projects_cliente_id_idx
  on public.projects using btree (cliente_id);

create index if not exists public_landing_gallery_landing_id_idx
  on public.public_landing_gallery using btree (landing_id);

create index if not exists quote_item_breakdown_material_id_idx
  on public.quote_item_breakdown using btree (material_id);

create index if not exists system_configurations_system_line_id_idx
  on public.system_configurations using btree (system_line_id);

create index if not exists system_configurations_product_type_id_idx
  on public.system_configurations using btree (product_type_id);

create index if not exists users_organization_id_idx
  on public.users using btree (organization_id);

-- Duplicate exact index. Keep `solicitudes_contacto_org_created_idx`.
drop index if exists public.solicitudes_contacto_organization_id_creado_en_idx;
