-- Create pagos_suscripcion table for Webpay transaction tracking
create table if not exists public.pagos_suscripcion (
  id bigint generated always as identity not null,
  organization_id bigint not null,
  plan_code text not null,
  billing_period text not null,
  amount_clp integer not null,
  currency text not null default 'CLP'::text,
  payment_provider text not null default 'webpay_plus'::text,
  provider_token text null,
  provider_status text null,
  provider_response jsonb null,
  buy_order text not null,
  status text not null default 'pendiente'::text,
  paid_at timestamp with time zone null,
  period_starts_at timestamp with time zone null,
  period_ends_at timestamp with time zone null,
  creado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now(),
  eliminado_en timestamp with time zone null,
  constraint pagos_suscripcion_pkey primary key (id),
  constraint pagos_suscripcion_organization_id_fkey
    foreign key (organization_id) references public.organizations(id) on delete cascade,
  constraint pagos_suscripcion_amount_clp_check check (amount_clp > 0),
  constraint pagos_suscripcion_billing_period_check check (billing_period = 'yearly'::text),
  constraint pagos_suscripcion_plan_code_check check (
    plan_code = any (array['founder_full'::text, 'quote_only'::text])
  ),
  constraint pagos_suscripcion_status_check check (
    status = any (array['pendiente'::text, 'aprobado'::text, 'fallido'::text, 'reembolsado'::text])
  )
);

comment on table public.pagos_suscripcion is
  'Pagos de suscripcion procesados por Webpay Plus (Transbank).';

comment on column public.pagos_suscripcion.buy_order is
  'Orden de compra unica. Sirve como clave de idempotencia.';

-- Unique index on buy_order (idempotency key)
create unique index if not exists pagos_suscripcion_buy_order_idx
  on public.pagos_suscripcion using btree (buy_order)
  where eliminado_en is null;

-- Unique partial index on provider_token
create unique index if not exists pagos_suscripcion_provider_token_idx
  on public.pagos_suscripcion using btree (provider_token)
  where provider_token is not null and eliminado_en is null;

-- Composite index for org queries sorted by creation
create index if not exists pagos_suscripcion_org_created_idx
  on public.pagos_suscripcion using btree (organization_id, creado_en desc)
  where eliminado_en is null;

-- Basic index on provider_token (for confirm callback)
create index if not exists idx_pagos_suscripcion_provider_token
  on public.pagos_suscripcion using btree (provider_token);

-- Basic index on organization_id
create index if not exists idx_pagos_suscripcion_org
  on public.pagos_suscripcion using btree (organization_id);

-- Enable RLS
alter table public.pagos_suscripcion enable row level security;

-- RLS: authenticated users can view their org's payments
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pagos_suscripcion'
      and policyname = 'pagos_suscripcion_select_own'
  ) then
    create policy pagos_suscripcion_select_own
      on public.pagos_suscripcion
      for select
      to authenticated
      using (organization_id = public.get_org_id());
  end if;
end
$$;

-- RLS: authenticated users can insert payments for their org
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pagos_suscripcion'
      and policyname = 'pagos_suscripcion_insert_own'
  ) then
    create policy pagos_suscripcion_insert_own
      on public.pagos_suscripcion
      for insert
      to authenticated
      with check (organization_id = public.get_org_id());
  end if;
end
$$;
