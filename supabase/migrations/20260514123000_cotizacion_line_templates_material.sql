alter table public.cotizacion_line_templates
  add column if not exists material text;

update public.cotizacion_line_templates
set material = coalesce(material, 'Aluminio')
where material is null;

alter table public.cotizacion_line_templates
  alter column material set default 'Aluminio';

alter table public.cotizacion_line_templates
  alter column material set not null;

alter table public.cotizacion_line_templates
  drop constraint if exists cotizacion_line_templates_material_check;

alter table public.cotizacion_line_templates
  add constraint cotizacion_line_templates_material_check
  check (material in ('Aluminio', 'PVC'));
