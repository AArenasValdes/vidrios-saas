alter table public.organization_profile
  add column if not exists subscription_status text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists plan_type text,
  add column if not exists billing_period text,
  add column if not exists payment_method text,
  add column if not exists last_payment_at timestamptz,
  add column if not exists founder_price_locked boolean not null default false;

update public.organization_profile
set
  subscription_status = coalesce(subscription_status, 'trial_active'),
  trial_started_at = coalesce(trial_started_at, timezone('utc', now())),
  trial_ends_at = coalesce(trial_ends_at, timezone('utc', now()) + interval '7 days'),
  plan_type = coalesce(plan_type, 'trial'),
  billing_period = coalesce(billing_period, 'none'),
  payment_method = coalesce(payment_method, 'none')
where
  subscription_status is null
  or trial_started_at is null
  or trial_ends_at is null
  or plan_type is null
  or billing_period is null
  or payment_method is null;

alter table public.organization_profile
  alter column subscription_status set default 'trial_active',
  alter column subscription_status set not null,
  alter column trial_started_at set default timezone('utc', now()),
  alter column trial_started_at set not null,
  alter column trial_ends_at set default (timezone('utc', now()) + interval '7 days'),
  alter column trial_ends_at set not null,
  alter column plan_type set default 'trial',
  alter column plan_type set not null,
  alter column billing_period set default 'none',
  alter column billing_period set not null,
  alter column payment_method set default 'none',
  alter column payment_method set not null;

alter table public.organization_profile
  drop constraint if exists organization_profile_subscription_status_check,
  drop constraint if exists organization_profile_plan_type_check,
  drop constraint if exists organization_profile_billing_period_check,
  drop constraint if exists organization_profile_payment_method_check;

alter table public.organization_profile
  add constraint organization_profile_subscription_status_check
    check (
      subscription_status in (
        'trial_active',
        'trial_expiring',
        'trial_expired',
        'active',
        'past_due',
        'cancelled'
      )
    ),
  add constraint organization_profile_plan_type_check
    check (plan_type in ('trial', 'monthly', 'yearly', 'founder')),
  add constraint organization_profile_billing_period_check
    check (billing_period in ('monthly', 'yearly', 'none')),
  add constraint organization_profile_payment_method_check
    check (payment_method in ('manual_transfer', 'manual_other', 'none'));

insert into public.organization_profile (
  organization_id,
  subscription_status,
  trial_started_at,
  trial_ends_at,
  plan_type,
  billing_period,
  payment_method,
  founder_price_locked
)
select
  organizations.id,
  'trial_active',
  timezone('utc', now()),
  timezone('utc', now()) + interval '7 days',
  'trial',
  'none',
  'none',
  false
from public.organizations as organizations
where not exists (
  select 1
  from public.organization_profile as profile
  where profile.organization_id = organizations.id
);

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
      billing_period = coalesce(public.organization_profile.billing_period, excluded.billing_period),
      payment_method = coalesce(public.organization_profile.payment_method, excluded.payment_method),
      founder_price_locked = coalesce(public.organization_profile.founder_price_locked, excluded.founder_price_locked);

  return new;
end;
$$;

drop trigger if exists ensure_organization_profile_trial_defaults on public.organizations;

create trigger ensure_organization_profile_trial_defaults
after insert on public.organizations
for each row
execute function public.ensure_organization_profile_trial_defaults();

comment on column public.organization_profile.subscription_status is
  'Estado de suscripcion efectivo persistido para trial y activacion manual.';

comment on column public.organization_profile.trial_started_at is
  'Fecha de inicio de prueba gratuita de la organizacion.';

comment on column public.organization_profile.trial_ends_at is
  'Fecha de termino de prueba gratuita de la organizacion.';

comment on column public.organization_profile.subscription_started_at is
  'Fecha de inicio manual del plan activo.';

comment on column public.organization_profile.subscription_ends_at is
  'Fecha de termino manual del plan activo. Puede ser NULL para founder activo.';

comment on column public.organization_profile.plan_type is
  'Plan comercial activo o trial de la organizacion.';

comment on column public.organization_profile.billing_period is
  'Periodicidad de cobro manual de la cuenta.';

comment on column public.organization_profile.payment_method is
  'Metodo de pago manual informado para la cuenta.';

comment on column public.organization_profile.last_payment_at is
  'Ultimo pago manual registrado para la cuenta.';

comment on column public.organization_profile.founder_price_locked is
  'Si true, la organizacion mantiene precio founder sin reajuste.';
