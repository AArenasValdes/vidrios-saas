-- Fase 1: nucleo recurrente neutral.
-- Mercado Pago se integra en fases posteriores. Este cambio preserva Flow,
-- Webpay Plus y activaciones manuales existentes.

create table if not exists public.suscripciones_organizacion (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  provider text not null,
  provider_subscription_id text,
  provider_plan_id text,
  plan_code text not null,
  billing_period text not null,
  country_code character(2) not null default 'CL',
  currency_code character(3) not null default 'CLP',
  amount numeric(14, 2) not null,
  status text not null default 'pending',
  provider_status text,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  next_payment_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  external_reference text not null,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  eliminado_en timestamptz
);
alter table public.suscripciones_organizacion
  drop constraint if exists suscripciones_organizacion_provider_check,
  drop constraint if exists suscripciones_organizacion_plan_code_check,
  drop constraint if exists suscripciones_organizacion_billing_period_check,
  drop constraint if exists suscripciones_organizacion_country_code_check,
  drop constraint if exists suscripciones_organizacion_currency_code_check,
  drop constraint if exists suscripciones_organizacion_amount_check,
  drop constraint if exists suscripciones_organizacion_status_check;
alter table public.suscripciones_organizacion
  add constraint suscripciones_organizacion_provider_check
    check (provider in ('mercadopago', 'webpay_plus', 'flow', 'manual')),
  add constraint suscripciones_organizacion_plan_code_check
    check (plan_code in ('founder_full', 'quote_only')),
  add constraint suscripciones_organizacion_billing_period_check
    check (billing_period in ('monthly', 'yearly')),
  add constraint suscripciones_organizacion_country_code_check
    check (country_code = upper(country_code) and char_length(country_code) = 2),
  add constraint suscripciones_organizacion_currency_code_check
    check (currency_code = upper(currency_code) and char_length(currency_code) = 3),
  add constraint suscripciones_organizacion_amount_check
    check (amount > 0),
  add constraint suscripciones_organizacion_status_check
    check (status in ('pending', 'active', 'paused', 'past_due', 'cancelled'));
create unique index if not exists suscripciones_organizacion_external_reference_uidx
  on public.suscripciones_organizacion (external_reference)
  where eliminado_en is null;
create unique index if not exists suscripciones_organizacion_provider_id_uidx
  on public.suscripciones_organizacion (provider, provider_subscription_id)
  where provider_subscription_id is not null and eliminado_en is null;
create index if not exists suscripciones_organizacion_org_updated_idx
  on public.suscripciones_organizacion (organization_id, actualizado_en desc)
  where eliminado_en is null;
alter table public.suscripciones_organizacion enable row level security;
alter table public.suscripciones_organizacion force row level security;
drop policy if exists suscripciones_organizacion_select_own
  on public.suscripciones_organizacion;
create policy suscripciones_organizacion_select_own
  on public.suscripciones_organizacion
  for select
  to authenticated
  using (organization_id = (select public.get_org_id()) and eliminado_en is null);
revoke all on table public.suscripciones_organizacion from anon, authenticated;
grant select on table public.suscripciones_organizacion to authenticated;
grant all on table public.suscripciones_organizacion to service_role;
grant usage, select on sequence public.suscripciones_organizacion_id_seq to service_role;
alter table public.pagos_suscripcion
  add column if not exists amount numeric(14, 2),
  add column if not exists currency_code character(3),
  add column if not exists subscription_id bigint,
  add column if not exists provider_payment_id text;
update public.pagos_suscripcion
set
  amount = coalesce(amount, amount_clp::numeric),
  currency_code = coalesce(currency_code, upper(currency)::character(3))
where amount is null or currency_code is null;
alter table public.pagos_suscripcion
  alter column amount set not null,
  alter column currency_code set not null;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pagos_suscripcion_subscription_id_fkey'
      and conrelid = 'public.pagos_suscripcion'::regclass
  ) then
    alter table public.pagos_suscripcion
      add constraint pagos_suscripcion_subscription_id_fkey
      foreign key (subscription_id)
      references public.suscripciones_organizacion(id)
      on delete set null;
  end if;
end
$$;
alter table public.pagos_suscripcion
  drop constraint if exists pagos_suscripcion_payment_provider_check;
alter table public.pagos_suscripcion
  add constraint pagos_suscripcion_payment_provider_check
    check (
      payment_provider in (
        'mercadopago',
        'manual_transfer',
        'manual_other',
        'flow',
        'webpay_plus'
      )
    );
create index if not exists pagos_suscripcion_subscription_idx
  on public.pagos_suscripcion (subscription_id)
  where subscription_id is not null and eliminado_en is null;
create unique index if not exists pagos_suscripcion_provider_payment_uidx
  on public.pagos_suscripcion (payment_provider, provider_payment_id)
  where provider_payment_id is not null and eliminado_en is null;
alter table public.organization_profile
  drop constraint if exists organization_profile_payment_method_check;
alter table public.organization_profile
  add constraint organization_profile_payment_method_check
    check (
      payment_method in (
        'mercadopago',
        'manual_transfer',
        'manual_other',
        'none',
        'flow',
        'webpay_plus'
      )
    );
create or replace function public.activate_subscription_from_payment(
  p_payment_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  payment_record public.pagos_suscripcion%rowtype;
  subscription_record_id bigint;
  subscription_provider text;
  subscription_external_reference text;
  projected_plan_type text;
begin
  select *
  into payment_record
  from public.pagos_suscripcion
  where id = p_payment_id
    and eliminado_en is null
  for update;

  if not found then
    raise exception 'Pago de suscripcion no encontrado.';
  end if;

  if payment_record.status <> 'aprobado' then
    raise exception 'El pago debe estar aprobado antes de activar la suscripcion.';
  end if;

  if payment_record.paid_at is null or payment_record.period_ends_at is null then
    raise exception 'El pago aprobado no tiene fechas suficientes para activar la suscripcion.';
  end if;

  subscription_provider := case
    when payment_record.payment_provider in ('manual_transfer', 'manual_other') then 'manual'
    else payment_record.payment_provider
  end;
  subscription_external_reference := 'payment:' || payment_record.id::text;
  projected_plan_type := case
    when payment_record.billing_period = 'monthly' then 'monthly'
    when payment_record.plan_code = 'founder_full' then 'founder'
    else 'yearly'
  end;

  insert into public.suscripciones_organizacion (
    organization_id,
    provider,
    plan_code,
    billing_period,
    country_code,
    currency_code,
    amount,
    status,
    provider_status,
    current_period_starts_at,
    current_period_ends_at,
    external_reference
  )
  values (
    payment_record.organization_id,
    subscription_provider,
    payment_record.plan_code,
    payment_record.billing_period,
    'CL',
    payment_record.currency_code,
    payment_record.amount,
    'active',
    payment_record.provider_status,
    coalesce(payment_record.period_starts_at, payment_record.paid_at),
    payment_record.period_ends_at,
    subscription_external_reference
  )
  on conflict (external_reference) where eliminado_en is null
  do update set
    status = 'active',
    provider_status = excluded.provider_status,
    current_period_starts_at = excluded.current_period_starts_at,
    current_period_ends_at = excluded.current_period_ends_at,
    amount = excluded.amount,
    currency_code = excluded.currency_code,
    actualizado_en = timezone('utc', now())
  returning id into subscription_record_id;

  update public.pagos_suscripcion
  set
    subscription_id = subscription_record_id,
    provider_payment_id = coalesce(provider_payment_id, provider_order_id),
    actualizado_en = timezone('utc', now())
  where id = payment_record.id;

  update public.organization_profile
  set
    subscription_status = 'active',
    plan_code = payment_record.plan_code,
    plan_type = projected_plan_type,
    billing_period = payment_record.billing_period,
    payment_method = payment_record.payment_provider,
    founder_price_locked = payment_record.plan_code = 'founder_full',
    subscription_started_at = coalesce(
      payment_record.period_starts_at,
      payment_record.paid_at
    ),
    subscription_ends_at = payment_record.period_ends_at,
    last_payment_at = payment_record.paid_at,
    actualizado_en = timezone('utc', now())
  where organization_id = payment_record.organization_id;

  if not found then
    raise exception 'Perfil de organizacion no encontrado para activar la suscripcion.';
  end if;

  return subscription_record_id;
end;
$$;
revoke all on function public.activate_subscription_from_payment(bigint) from public;
revoke all on function public.activate_subscription_from_payment(bigint) from anon, authenticated;
grant execute on function public.activate_subscription_from_payment(bigint) to service_role;
comment on table public.suscripciones_organizacion is
  'Suscripcion recurrente neutral por organizacion. Solo el servidor escribe; cada tenant puede leer la propia.';
comment on column public.suscripciones_organizacion.external_reference is
  'Referencia estable e idempotente generada por Ventora, sin datos personales.';
comment on column public.pagos_suscripcion.subscription_id is
  'Suscripcion recurrente asociada. NULL conserva pagos legacy y activaciones manuales previas.';
comment on column public.pagos_suscripcion.amount is
  'Monto neutral del pago. amount_clp se conserva como compatibilidad legacy.';
