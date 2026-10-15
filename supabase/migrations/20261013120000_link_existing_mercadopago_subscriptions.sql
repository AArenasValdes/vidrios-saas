-- Vincula una suscripcion recurrente externa a un periodo manual ya pagado.
-- No activa ni extiende acceso: conserva el periodo y deja que el cobro
-- confirmado por Mercado Pago sea quien renueve la cuenta.
create or replace function public.link_active_manual_subscription_to_mercadopago(
  p_subscription_id bigint,
  p_provider_subscription_id text,
  p_provider_plan_id text,
  p_provider_status text,
  p_next_payment_at timestamptz default null
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  subscription_record public.suscripciones_organizacion%rowtype;
begin
  if nullif(trim(p_provider_subscription_id), '') is null
     or nullif(trim(p_provider_plan_id), '') is null
     or p_provider_status <> 'authorized' then
    raise exception 'La suscripcion Mercado Pago no esta autorizada o no tiene identidad valida.';
  end if;

  select *
  into subscription_record
  from public.suscripciones_organizacion
  where id = p_subscription_id
    and provider = 'manual'
    and status = 'active'
    and provider_subscription_id is null
    and eliminado_en is null
  for update;

  if not found then
    raise exception 'No se encontro un periodo manual activo disponible para vincular.';
  end if;

  update public.suscripciones_organizacion
  set
    provider = 'mercadopago',
    provider_subscription_id = trim(p_provider_subscription_id),
    provider_plan_id = trim(p_provider_plan_id),
    provider_status = p_provider_status,
    next_payment_at = p_next_payment_at,
    actualizado_en = timezone('utc', now())
  where id = subscription_record.id;

  update public.organization_profile
  set
    payment_method = 'mercadopago',
    actualizado_en = timezone('utc', now())
  where organization_id = subscription_record.organization_id;

  if not found then
    raise exception 'Perfil de organizacion no encontrado para vincular la suscripcion.';
  end if;

  return subscription_record.id;
end;
$$;

revoke all on function public.link_active_manual_subscription_to_mercadopago(
  bigint, text, text, text, timestamptz
) from public;
revoke all on function public.link_active_manual_subscription_to_mercadopago(
  bigint, text, text, text, timestamptz
) from anon, authenticated;
grant execute on function public.link_active_manual_subscription_to_mercadopago(
  bigint, text, text, text, timestamptz
) to service_role;
