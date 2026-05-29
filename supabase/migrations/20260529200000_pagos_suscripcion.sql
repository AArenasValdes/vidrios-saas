-- Step 3: pagos_suscripcion table for Webpay Plus transactions
create table if not exists public.pagos_suscripcion (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  plan_code text not null,
  billing_period text not null,
  amount_clp integer not null,
  currency text not null default 'CLP',
  payment_provider text not null,
  provider_token text,
  provider_status text,
  provider_response jsonb,
  buy_order text not null,
  status text not null default 'pendiente',
  paid_at timestamptz,
  period_starts_at timestamptz,
  period_ends_at timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz null,

  constraint pagos_suscripcion_status_check check (
    status in ('pendiente', 'aprobado', 'fallido', 'reembolsado')
  ),
  constraint pagos_suscripcion_plan_code_check check (
    plan_code in ('founder_full', 'quote_only')
  ),
  constraint pagos_suscripcion_billing_period_check check (
    billing_period in ('yearly')
  ),
  constraint pagos_suscripcion_amount_clp_check check (amount_clp > 0)
);

create unique index if not exists pagos_suscripcion_provider_token_idx
  on public.pagos_suscripcion (provider_token)
  where provider_token is not null and eliminado_en is null;

create unique index if not exists pagos_suscripcion_buy_order_idx
  on public.pagos_suscripcion (buy_order)
  where eliminado_en is null;

create index if not exists pagos_suscripcion_org_created_idx
  on public.pagos_suscripcion (organization_id, creado_en desc)
  where eliminado_en is null;

alter table public.pagos_suscripcion enable row level security;

revoke all on public.pagos_suscripcion from public;
revoke all on public.pagos_suscripcion from anon;
revoke all on public.pagos_suscripcion from authenticated;

grant select on public.pagos_suscripcion to authenticated;
grant all on public.pagos_suscripcion to service_role;

create policy pagos_suscripcion_select_own
  on public.pagos_suscripcion
  for select
  to authenticated
  using (organization_id = public.get_org_id());

comment on table public.pagos_suscripcion is
  'Transacciones de pago via Webpay Plus de Transbank. CRUD server-side via service_role.';

comment on column public.pagos_suscripcion.provider_token is
  'Token de transaccion devuelto por Transbank. Se completa despues de crear la transaccion.';

comment on column public.pagos_suscripcion.provider_response is
  'Respuesta completa de Transbank (confirmacion).';
