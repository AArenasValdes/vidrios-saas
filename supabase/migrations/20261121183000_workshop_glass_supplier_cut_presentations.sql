-- Propuesta aditiva para habilitar presentaciones privadas de compra de vidrio al corte (supplier_cut / M2)
-- y soportar accesorios en organizacion_presentaciones_taller sin alterar filas históricas de perfiles.
-- NO APLICAR automáticamente; revisar primero contra RLS y datos existentes.

alter table public.organizacion_presentaciones_taller
  add column if not exists tipo_insumo text not null default 'perfil',
  add column if not exists provider_key text,
  add column if not exists glass_product_id text,
  add column if not exists glass_line_template_id bigint references public.cotizacion_line_templates(id) on delete set null,
  add column if not exists forma_compra_vidrio text,
  add column if not exists categoria_vidrio text,
  add column if not exists espesor_mm numeric(6,2),
  add column if not exists minimo_cobrable_m2 numeric(8,4),
  add column if not exists vigente_desde date,
  add column if not exists vigente_hasta date;

alter table public.organizacion_presentaciones_taller
  drop constraint if exists org_pres_taller_tipo_insumo_chk;
alter table public.organizacion_presentaciones_taller
  add constraint org_pres_taller_tipo_insumo_chk
  check (tipo_insumo in ('perfil', 'accesorio', 'vidrio'));

alter table public.organizacion_presentaciones_taller
  drop constraint if exists org_pres_taller_forma_vidrio_chk;
alter table public.organizacion_presentaciones_taller
  add constraint org_pres_taller_forma_vidrio_chk
  check (forma_compra_vidrio is null or forma_compra_vidrio in ('supplier_cut', 'full_sheet'));

alter table public.organizacion_presentaciones_taller
  drop constraint if exists org_pres_taller_categoria_vidrio_chk;
alter table public.organizacion_presentaciones_taller
  add constraint org_pres_taller_categoria_vidrio_chk
  check (categoria_vidrio is null or categoria_vidrio in ('monolitico', 'laminado', 'dvh', 'templado', 'espejo', 'pendiente'));

alter table public.organizacion_presentaciones_taller
  drop constraint if exists org_pres_taller_espesor_vidrio_chk;
alter table public.organizacion_presentaciones_taller
  add constraint org_pres_taller_espesor_vidrio_chk
  check (espesor_mm is null or espesor_mm > 0);

alter table public.organizacion_presentaciones_taller
  drop constraint if exists org_pres_taller_minimo_vidrio_chk;
alter table public.organizacion_presentaciones_taller
  add constraint org_pres_taller_minimo_vidrio_chk
  check (minimo_cobrable_m2 is null or minimo_cobrable_m2 > 0);

alter table public.organizacion_presentaciones_taller
  drop constraint if exists org_pres_taller_vigencia_chk;
alter table public.organizacion_presentaciones_taller
  add constraint org_pres_taller_vigencia_chk
  check (vigente_desde is null or vigente_hasta is null or vigente_hasta >= vigente_desde);

alter table public.organizacion_presentaciones_taller
  drop constraint if exists org_pres_taller_vidrio_fields_chk;
alter table public.organizacion_presentaciones_taller
  add constraint org_pres_taller_vidrio_fields_chk
  check (
    tipo_insumo <> 'vidrio'
    or (
      forma_compra_vidrio in ('supplier_cut', 'full_sheet')
      and categoria_vidrio is not null
      and categoria_vidrio <> 'pendiente'
      and espesor_mm is not null
      and (
        (forma_compra_vidrio = 'supplier_cut' and unidad_compra = 'M2')
        or (forma_compra_vidrio = 'full_sheet' and unidad_compra = 'PLANCHA')
      )
    )
  );

create unique index if not exists organizacion_presentaciones_taller_glass_active_uq
  on public.organizacion_presentaciones_taller (
    organization_id,
    coalesce(nullif(trim(glass_product_id), ''), upper(trim(codigo_tecnico))),
    coalesce(lower(trim(provider_key)), ''),
    categoria_vidrio,
    espesor_mm,
    forma_compra_vidrio
  )
  where eliminado_en is null
    and tipo_insumo = 'vidrio';

create index if not exists organizacion_presentaciones_taller_tipo_org_idx
  on public.organizacion_presentaciones_taller (organization_id, tipo_insumo)
  where eliminado_en is null;
