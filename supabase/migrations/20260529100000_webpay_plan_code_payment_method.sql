-- Step 1: add plan_code column (conservative migration)
alter table public.organization_profile
  add column if not exists plan_code text;

update public.organization_profile
  set plan_code = case
    when subscription_status like '%trial%' or plan_type = 'trial' then 'trial'
    when billing_period = 'yearly' or plan_type = 'founder' then 'founder_full'
    else 'trial'
  end
  where plan_code is null;

alter table public.organization_profile
  alter column plan_code set not null,
  alter column plan_code set default 'trial';

alter table public.organization_profile
  drop constraint if exists organization_profile_plan_code_check;

alter table public.organization_profile
  add constraint organization_profile_plan_code_check
    check (plan_code in ('trial', 'founder_full', 'quote_only'));

comment on column public.organization_profile.plan_code is
  'Plan comercial: trial, founder_full o quote_only. Reemplaza progresivamente a plan_type.';

-- Extend payment_method CHECK to include webpay_plus
alter table public.organization_profile
  drop constraint if exists organization_profile_payment_method_check;

alter table public.organization_profile
  add constraint organization_profile_payment_method_check
    check (payment_method in ('manual_transfer', 'manual_other', 'none', 'webpay_plus'));

-- Update trigger to set plan_code = 'trial' for new orgs
create or replace function public.ensure_organization_profile_trial_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
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
    timezone('utc', now()) + interval '7 days',
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
