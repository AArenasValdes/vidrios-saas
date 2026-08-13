-- Fase 2A: catálogo privado aditivo sobre cotizacion_line_templates

alter table public.cotizacion_line_templates
  add column if not exists categoria text not null default 'aluminio',
  add column if not exists unidad_cobro text not null default 'm2',
  add column if not exists costo_base numeric(12,2) not null default 0,
  add column if not exists merma_pct numeric(7,4) not null default 0,
  add column if not exists margen_objetivo_pct numeric(7,4),
  add column if not exists proveedor text,
  add column if not exists vigencia_desde date,
  add column if not exists vigencia_hasta date,
  add column if not exists catalog_metadata jsonb not null default '{}'::jsonb;

alter table public.cotizacion_line_templates
  drop constraint if exists cotizacion_line_templates_categoria_check;

alter table public.cotizacion_line_templates
  add constraint cotizacion_line_templates_categoria_check
  check (
    categoria in ('aluminio', 'pvc', 'vidrio', 'shower', 'accesorios', 'otros')
  );

alter table public.cotizacion_line_templates
  drop constraint if exists cotizacion_line_templates_unidad_cobro_check;

alter table public.cotizacion_line_templates
  add constraint cotizacion_line_templates_unidad_cobro_check
  check (
    unidad_cobro in ('m2', 'metro_lineal', 'unidad', 'valor_manual')
  );

alter table public.cotizacion_line_templates
  drop constraint if exists cotizacion_line_templates_catalog_costs_nonnegative;

alter table public.cotizacion_line_templates
  add constraint cotizacion_line_templates_catalog_costs_nonnegative
  check (
    costo_base >= 0
    and merma_pct >= 0
    and (margen_objetivo_pct is null or (margen_objetivo_pct >= 0 and margen_objetivo_pct < 100))
  );

update public.cotizacion_line_templates
set categoria = case
  when material = 'PVC' then 'pvc'
  else 'aluminio'
end
where categoria is null or categoria = 'aluminio';;
