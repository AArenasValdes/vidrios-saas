alter table public.cotizaciones
  add column if not exists costo_materiales_total numeric(12,2),
  add column if not exists costo_mano_obra_total numeric(12,2),
  add column if not exists costo_traslado_total numeric(12,2),
  add column if not exists costo_otros_total numeric(12,2),
  add column if not exists merma_pct numeric(7,4),
  add column if not exists merma_total numeric(12,2),
  add column if not exists margen_objetivo_pct numeric(7,4),
  add column if not exists precio_recomendado_neto numeric(12,2),
  add column if not exists iva_pct numeric(7,4),
  add column if not exists financial_snapshot_version integer,
  add column if not exists financial_snapshot_calculado_en timestamptz,
  add column if not exists cost_basis_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_financial_costs_nonnegative'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_financial_costs_nonnegative
      check (
        (costo_materiales_total is null or costo_materiales_total >= 0) and
        (costo_mano_obra_total is null or costo_mano_obra_total >= 0) and
        (costo_traslado_total is null or costo_traslado_total >= 0) and
        (costo_otros_total is null or costo_otros_total >= 0) and
        (merma_pct is null or merma_pct >= 0) and
        (merma_total is null or merma_total >= 0) and
        (margen_objetivo_pct is null or (margen_objetivo_pct >= 0 and margen_objetivo_pct < 100)) and
        (precio_recomendado_neto is null or precio_recomendado_neto >= 0) and
        (iva_pct is null or iva_pct >= 0) and
        (financial_snapshot_version is null or financial_snapshot_version > 0)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_cost_basis_status_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_cost_basis_status_check
      check (
        cost_basis_status is null or
        cost_basis_status in ('sin_costos', 'estimado', 'manual')
      );
  end if;
end
$$;

update public.cotizaciones
set
  iva_pct = case
    when subtotal_neto is not null and subtotal_neto > 0 and iva is not null
      then round((iva / subtotal_neto) * 100, 4)
    else null
  end,
  cost_basis_status = case
    when costo_total is not null and costo_total > 0 then 'estimado'
    else 'sin_costos'
  end
where financial_snapshot_version is null;

comment on column public.cotizaciones.costo_materiales_total is
  'Snapshot Quote Studio: costo neto de materiales usado para calcular margen.';
comment on column public.cotizaciones.costo_mano_obra_total is
  'Snapshot Quote Studio: costo neto de mano de obra.';
comment on column public.cotizaciones.costo_traslado_total is
  'Snapshot Quote Studio: costo neto de traslado separado del cobro al cliente.';
comment on column public.cotizaciones.costo_otros_total is
  'Snapshot Quote Studio: otros costos netos del taller.';
comment on column public.cotizaciones.merma_pct is
  'Snapshot Quote Studio: porcentaje de merma usado sobre costos base.';
comment on column public.cotizaciones.merma_total is
  'Snapshot Quote Studio: monto neto de merma.';
comment on column public.cotizaciones.margen_objetivo_pct is
  'Snapshot Quote Studio: margen real objetivo, no markup.';
comment on column public.cotizaciones.precio_recomendado_neto is
  'Snapshot Quote Studio: precio sugerido neto, sin IVA.';
comment on column public.cotizaciones.iva_pct is
  'Snapshot Quote Studio: porcentaje de IVA aplicado como capa tributaria.';
comment on column public.cotizaciones.financial_snapshot_version is
  'Version del algoritmo de snapshot financiero usado por Quote Studio.';
comment on column public.cotizaciones.financial_snapshot_calculado_en is
  'Fecha en que se calculo el snapshot financiero.';
comment on column public.cotizaciones.cost_basis_status is
  'Estado de base de costo del snapshot: sin_costos, estimado o manual.';
