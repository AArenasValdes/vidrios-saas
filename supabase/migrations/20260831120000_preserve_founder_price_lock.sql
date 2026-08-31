-- Pricing V2: el catalogo nuevo no reescribe la proteccion historica.
-- Una activacion solo conserva el valor existente de founder_price_locked.

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
  select * into payment_record
  from public.pagos_suscripcion
  where id = p_payment_id and eliminado_en is null
  for update;

  if not found then raise exception 'Pago de suscripcion no encontrado.'; end if;
  if payment_record.status <> 'aprobado' then raise exception 'El pago debe estar aprobado antes de activar la suscripcion.'; end if;
  if payment_record.paid_at is null or payment_record.period_ends_at is null then raise exception 'El pago aprobado no tiene fechas suficientes para activar la suscripcion.'; end if;

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
    organization_id, provider, plan_code, billing_period, country_code,
    currency_code, amount, status, provider_status, current_period_starts_at,
    current_period_ends_at, external_reference
  ) values (
    payment_record.organization_id, subscription_provider, payment_record.plan_code,
    payment_record.billing_period, 'CL', payment_record.currency_code,
    payment_record.amount, 'active', payment_record.provider_status,
    coalesce(payment_record.period_starts_at, payment_record.paid_at),
    payment_record.period_ends_at, subscription_external_reference
  )
  on conflict (external_reference) where eliminado_en is null
  do update set
    status = 'active', provider_status = excluded.provider_status,
    current_period_starts_at = excluded.current_period_starts_at,
    current_period_ends_at = excluded.current_period_ends_at,
    amount = excluded.amount, currency_code = excluded.currency_code,
    actualizado_en = timezone('utc', now())
  returning id into subscription_record_id;

  update public.pagos_suscripcion
  set subscription_id = subscription_record_id,
      provider_payment_id = coalesce(provider_payment_id, provider_order_id),
      actualizado_en = timezone('utc', now())
  where id = payment_record.id;

  update public.organization_profile
  set subscription_status = 'active', plan_code = payment_record.plan_code,
      plan_type = projected_plan_type, billing_period = payment_record.billing_period,
      payment_method = payment_record.payment_provider,
      founder_price_locked = public.organization_profile.founder_price_locked,
      subscription_started_at = coalesce(payment_record.period_starts_at, payment_record.paid_at),
      subscription_ends_at = payment_record.period_ends_at,
      last_payment_at = payment_record.paid_at,
      actualizado_en = timezone('utc', now())
  where organization_id = payment_record.organization_id;

  if not found then raise exception 'Perfil de organizacion no encontrado para activar la suscripcion.'; end if;
  return subscription_record_id;
end;
$$;

revoke all on function public.activate_subscription_from_payment(bigint) from public;
revoke all on function public.activate_subscription_from_payment(bigint) from anon, authenticated;
grant execute on function public.activate_subscription_from_payment(bigint) to service_role;

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
  if p_status not in ('pending', 'active', 'paused', 'past_due', 'cancelled') then raise exception 'Estado recurrente no valido.'; end if;

  select * into subscription_record
  from public.suscripciones_organizacion
  where id = p_subscription_id and provider = 'mercadopago' and eliminado_en is null
  for update;
  if not found then raise exception 'Suscripcion Mercado Pago no encontrada.'; end if;
  if subscription_record.provider_subscription_id is not null and subscription_record.provider_subscription_id <> p_provider_subscription_id then raise exception 'La identidad de la suscripcion no coincide.'; end if;
  if subscription_record.provider_plan_id is not null and subscription_record.provider_plan_id <> p_provider_plan_id then raise exception 'El plan del proveedor no coincide.'; end if;

  update public.suscripciones_organizacion
  set provider_subscription_id = p_provider_subscription_id,
      provider_plan_id = p_provider_plan_id, provider_status = p_provider_status,
      status = p_status,
      current_period_starts_at = coalesce(p_period_starts_at, current_period_starts_at),
      current_period_ends_at = coalesce(p_period_ends_at, current_period_ends_at),
      next_payment_at = p_next_payment_at,
      cancelled_at = case when p_status = 'cancelled' then coalesce(p_cancelled_at, timezone('utc', now())) else cancelled_at end,
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
    set subscription_status = 'active', plan_code = subscription_record.plan_code,
        plan_type = projected_plan_type, billing_period = subscription_record.billing_period,
        payment_method = 'mercadopago',
        founder_price_locked = public.organization_profile.founder_price_locked,
        subscription_started_at = coalesce(subscription_record.current_period_starts_at, subscription_started_at, timezone('utc', now())),
        subscription_ends_at = subscription_record.current_period_ends_at,
        actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id;
  elsif p_status in ('paused', 'past_due') then
    update public.organization_profile set subscription_status = 'past_due', actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id and payment_method = 'mercadopago';
  elsif p_status = 'cancelled' then
    update public.organization_profile
    set subscription_status = case when subscription_record.current_period_ends_at is not null and subscription_record.current_period_ends_at > timezone('utc', now()) then 'active' else 'cancelled' end,
        subscription_ends_at = subscription_record.current_period_ends_at,
        actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id and payment_method = 'mercadopago';
  end if;
  return subscription_record.id;
end;
$$;

revoke all on function public.reconcile_mercadopago_subscription(bigint, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.reconcile_mercadopago_subscription(bigint, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.reconcile_mercadopago_subscription(bigint, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
