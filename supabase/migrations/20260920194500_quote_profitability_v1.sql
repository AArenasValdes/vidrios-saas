-- Costos y rentabilidad V1: taxonomía material, defaults org nullable, override manual total

alter table public.cotizaciones
  drop constraint if exists cotizaciones_cost_basis_status_check;

alter table public.cotizaciones
  add constraint cotizaciones_cost_basis_status_check
  check (
    cost_basis_status is null
    or cost_basis_status in (
      'sin_materiales',
      'materiales_parciales',
      'materiales_completos',
      'materiales_manual',
      'sin_costos',
      'estimado',
      'manual'
    )
  );

alter table public.cotizaciones
  add column if not exists costo_materiales_manual numeric(12,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_costo_materiales_manual_nonneg'
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_costo_materiales_manual_nonneg
      check (costo_materiales_manual is null or costo_materiales_manual >= 0);
  end if;
end $$;

alter table public.organization_profile
  add column if not exists margen_objetivo_defecto numeric(7,4),
  add column if not exists merma_materiales_defecto numeric(7,4),
  add column if not exists costo_mano_obra_defecto numeric(12,2),
  add column if not exists costo_traslado_defecto numeric(12,2),
  add column if not exists costo_otros_defecto numeric(12,2);

comment on column public.cotizaciones.costo_materiales_manual is
  'Override total del costo de materiales. Si no es null, reemplaza la suma comercial por pieza.';

comment on column public.organization_profile.margen_objetivo_defecto is
  'Margen real sobre venta sugerido al crear cotización. Null = app usa 30%.';

comment on column public.organization_profile.merma_materiales_defecto is
  'Merma comercial estimada default (%). Null = heredar 0% al crear cotización.';

comment on column public.organization_profile.costo_mano_obra_defecto is
  'Mano de obra default CLP. Null = no prellenar en cotización nueva.';

comment on column public.organization_profile.costo_traslado_defecto is
  'Traslado interno default CLP. Null = no prellenar en cotización nueva.';

comment on column public.organization_profile.costo_otros_defecto is
  'Otros costos default CLP. Null = no prellenar en cotización nueva.';
