-- Los trials ya creados conservan su fecha original. Solo cambia el alta nueva.
alter table public.organization_profile
  alter column trial_ends_at set default (timezone('utc', now()) + interval '15 days');

create or replace function public.ensure_organization_profile_trial_defaults()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.organization_profile (
    organization_id,
    subscription_status,
    trial_started_at,
    trial_ends_at,
    plan_type,
    plan_code,
    billing_period,
    payment_method,
    founder_price_locked
  )
  values (
    new.id,
    'trial_active',
    timezone('utc', now()),
    timezone('utc', now()) + interval '15 days',
    'trial',
    'trial',
    'none',
    'none',
    false
  )
  on conflict (organization_id) do update
    set
      subscription_status = coalesce(public.organization_profile.subscription_status, excluded.subscription_status),
      trial_started_at = coalesce(public.organization_profile.trial_started_at, excluded.trial_started_at),
      trial_ends_at = coalesce(public.organization_profile.trial_ends_at, excluded.trial_ends_at),
      plan_type = coalesce(public.organization_profile.plan_type, excluded.plan_type),
      plan_code = coalesce(public.organization_profile.plan_code, excluded.plan_code),
      billing_period = coalesce(public.organization_profile.billing_period, excluded.billing_period),
      payment_method = coalesce(public.organization_profile.payment_method, excluded.payment_method),
      founder_price_locked = coalesce(public.organization_profile.founder_price_locked, excluded.founder_price_locked);

  return new;
end;
$$;

revoke all on function public.ensure_organization_profile_trial_defaults() from public;
revoke all on function public.ensure_organization_profile_trial_defaults() from anon, authenticated;
grant execute on function public.ensure_organization_profile_trial_defaults() to service_role;

comment on column public.organization_profile.trial_ends_at is
  'Fecha de termino de prueba gratuita de 15 dias para altas nuevas.';
