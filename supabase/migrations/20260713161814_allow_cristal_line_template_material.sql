-- Permite productos de cristal dentro del catalogo privado existente.
-- La categoria canonica sigue siendo `vidrio`; `material='Cristal'`
-- mantiene compatibilidad con la columna legacy NOT NULL.

alter table public.cotizacion_line_templates
  drop constraint if exists cotizacion_line_templates_material_check;

alter table public.cotizacion_line_templates
  add constraint cotizacion_line_templates_material_check
  check (material in ('Aluminio', 'PVC', 'Cristal'));
