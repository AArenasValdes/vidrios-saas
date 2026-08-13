-- Fase 2: Mercado Pago Chile.
-- El checkout se habilita por configuracion de servidor; el retorno nunca activa.
-- Solo los webhooks verificados y reconciliados contra Mercado Pago mutan estado.

alter table public.pagos_suscripcion
  drop constraint if exists pagos_suscripcion_billing_period_check,
  drop constraint if exists pagos_suscripcion_status_check;

alter table public.pagos_suscripcion
  add constraint pagos_suscripcion_billing_period_check
    check (billing_period in ('monthly', 'yearly')),
  add constraint pagos_suscripcion_status_check
    check (status in ('pendiente', 'aprobado', 'fallido', 'cancelado', 'reembolsado'));

create unique index if not exists suscripciones_organizacion_mp_open_org_uidx
  on public.suscripciones_organizacion (organization_id)
  where provider = 'mercadopago'
    and status in ('pending', 'active', 'paused', 'past_due')
    and eliminado_en is null;

create or replace function public.reconcile_mercadopago_subscription(
  p_subscription_id bigint,
  p_provider_subscription_id text,
  p_provider_plan_id text,
  p_provider_status text,
  p_status text,
  p_period_starts_at timestamptz default null,
  p_period_ends_at timestamptz default null,
  p_next_payment_at timestamptz default null,
  p_cancelled_at timestamptz default null
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  subscription_record public.suscripciones_organizacion%rowtype;
  projected_plan_type text;
begin
  if p_status not in ('pending', 'active', 'paused', 'past_due', 'cancelled') then
    raise exception 'Estado recurrente no valido.';
  end if;

  select *
  into subscription_record
  from public.suscripciones_organizacion
  where id = p_subscription_id
    and provider = 'mercadopago'
    and eliminado_en is null
  for update;

  if not found then
    raise exception 'Suscripcion Mercado Pago no encontrada.';
  end if;

  if subscription_record.provider_subscription_id is not null
     and subscription_record.provider_subscription_id <> p_provider_subscription_id then
    raise exception 'La identidad de la suscripcion no coincide.';
  end if;

  if subscription_record.provider_plan_id is not null
     and subscription_record.provider_plan_id <> p_provider_plan_id then
    raise exception 'El plan del proveedor no coincide.';
  end if;

  update public.suscripciones_organizacion
  set
    provider_subscription_id = p_provider_subscription_id,
    provider_plan_id = p_provider_plan_id,
    provider_status = p_provider_status,
    status = p_status,
    current_period_starts_at = coalesce(
      p_period_starts_at,
      current_period_starts_at
    ),
    current_period_ends_at = coalesce(
      p_period_ends_at,
      current_period_ends_at
    ),
    next_payment_at = p_next_payment_at,
    cancelled_at = case
      when p_status = 'cancelled' then coalesce(p_cancelled_at, timezone('utc', now()))
      else cancelled_at
    end,
    actualizado_en = timezone('utc', now())
  where id = p_subscription_id
  returning * into subscription_record;

  projected_plan_type := case
    when subscription_record.billing_period = 'monthly' then 'monthly'
    when subscription_record.plan_code = 'founder_full' then 'founder'
    else 'yearly'
  end;

  if p_status = 'active' then
    update public.organization_profile
    set
      subscription_status = 'active',
      plan_code = subscription_record.plan_code,
      plan_type = projected_plan_type,
      billing_period = subscription_record.billing_period,
      payment_method = 'mercadopago',
      founder_price_locked = subscription_record.plan_code = 'founder_full',
      subscription_started_at = coalesce(
        subscription_record.current_period_starts_at,
        subscription_started_at,
        timezone('utc', now())
      ),
      subscription_ends_at = subscription_record.current_period_ends_at,
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id;
  elsif p_status in ('paused', 'past_due') then
    update public.organization_profile
    set
      subscription_status = 'past_due',
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id
      and payment_method = 'mercadopago';
  elsif p_status = 'cancelled' then
    update public.organization_profile
    set
      subscription_status = case
        when subscription_record.current_period_ends_at is not null
          and subscription_record.current_period_ends_at > timezone('utc', now())
          then 'active'
        else 'cancelled'
      end,
      subscription_ends_at = subscription_record.current_period_ends_at,
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id
      and payment_method = 'mercadopago';
  end if;

  return subscription_record.id;
end;
$$;

revoke all on function public.reconcile_mercadopago_subscription(
  bigint, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz
) from public;
revoke all on function public.reconcile_mercadopago_subscription(
  bigint, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz
) from anon, authenticated;
grant execute on function public.reconcile_mercadopago_subscription(
  bigint, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz
) to service_role;

create or replace function public.reconcile_mercadopago_payment(
  p_subscription_id bigint,
  p_provider_payment_id text,
  p_provider_order_id text,
  p_provider_status text,
  p_status text,
  p_amount numeric,
  p_currency_code text,
  p_paid_at timestamptz default null,
  p_period_starts_at timestamptz default null,
  p_period_ends_at timestamptz default null,
  p_provider_response jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  subscription_record public.suscripciones_organizacion%rowtype;
  payment_record_id bigint;
begin
  if p_status not in ('pendiente', 'aprobado', 'fallido', 'cancelado', 'reembolsado') then
    raise exception 'Estado de pago no valido.';
  end if;

  select *
  into subscription_record
  from public.suscripciones_organizacion
  where id = p_subscription_id
    and provider = 'mercadopago'
    and eliminado_en is null
  for update;

  if not found then
    raise exception 'Suscripcion Mercado Pago no encontrada.';
  end if;

  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'Identificador de pago requerido.';
  end if;

  if p_amount <> subscription_record.amount
     or upper(p_currency_code) <> subscription_record.currency_code then
    raise exception 'Monto o moneda no coinciden con la suscripcion.';
  end if;

  insert into public.pagos_suscripcion (
    organization_id,
    plan_code,
    billing_period,
    amount_clp,
    amount,
    currency,
    currency_code,
    subscription_id,
    provider_payment_id,
    payment_provider,
    provider_order_id,
    provider_status,
    provider_response,
    buy_order,
    status,
    paid_at,
    period_starts_at,
    period_ends_at
  )
  values (
    subscription_record.organization_id,
    subscription_record.plan_code,
    subscription_record.billing_period,
    p_amount::integer,
    p_amount,
    upper(p_currency_code),
    upper(p_currency_code),
    subscription_record.id,
    p_provider_payment_id,
    'mercadopago',
    p_provider_order_id,
    p_provider_status,
    p_provider_response,
    'mp:' || p_provider_payment_id,
    p_status,
    p_paid_at,
    p_period_starts_at,
    p_period_ends_at
  )
  on conflict (payment_provider, provider_payment_id)
    where provider_payment_id is not null and eliminado_en is null
  do update set
    provider_order_id = excluded.provider_order_id,
    provider_status = excluded.provider_status,
    provider_response = excluded.provider_response,
    status = excluded.status,
    paid_at = coalesce(excluded.paid_at, public.pagos_suscripcion.paid_at),
    period_starts_at = coalesce(
      excluded.period_starts_at,
      public.pagos_suscripcion.period_starts_at
    ),
    period_ends_at = coalesce(
      excluded.period_ends_at,
      public.pagos_suscripcion.period_ends_at
    ),
    actualizado_en = timezone('utc', now())
  returning id into payment_record_id;

  if p_status = 'aprobado' and p_paid_at is not null then
    update public.organization_profile
    set
      last_payment_at = greatest(
        coalesce(last_payment_at, p_paid_at),
        p_paid_at
      ),
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id;
  end if;

  return payment_record_id;
end;
$$;

revoke all on function public.reconcile_mercadopago_payment(
  bigint, text, text, text, text, numeric, text, timestamptz, timestamptz, timestamptz, jsonb
) from public;
revoke all on function public.reconcile_mercadopago_payment(
  bigint, text, text, text, text, numeric, text, timestamptz, timestamptz, timestamptz, jsonb
) from anon, authenticated;
grant execute on function public.reconcile_mercadopago_payment(
  bigint, text, text, text, text, numeric, text, timestamptz, timestamptz, timestamptz, jsonb
) to service_role;

comment on function public.reconcile_mercadopago_subscription(
  bigint, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz
) is 'Proyecta una suscripcion consultada a Mercado Pago. Solo service_role.';

comment on function public.reconcile_mercadopago_payment(
  bigint, text, text, text, text, numeric, text, timestamptz, timestamptz, timestamptz, jsonb
) is 'Upsert idempotente del ledger Mercado Pago. Solo service_role.';
