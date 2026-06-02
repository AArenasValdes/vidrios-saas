-- Permanent free internal Ventora accounts.
-- These organizations belong to Ventora founders and must never be blocked by
-- trial expiration or payment status.

insert into public.organization_profile (
  organization_id,
  subscription_status,
  trial_started_at,
  trial_ends_at,
  subscription_started_at,
  subscription_ends_at,
  plan_type,
  plan_code,
  billing_period,
  payment_method,
  last_payment_at,
  founder_price_locked
)
select
  internal_accounts.organization_id,
  'active',
  timezone('utc', now()),
  timezone('utc', now()) + interval '100 years',
  timezone('utc', now()),
  null,
  'founder',
  'founder_full',
  'yearly',
  'manual_other',
  null,
  true
from (
  values
    (3::bigint, 'admin@test.com'::text),
    (4::bigint, 'sanmarcoaluminios@gmail.com'::text)
) as internal_accounts(organization_id, correo)
where exists (
  select 1
  from public.organizations as org
  where org.id = internal_accounts.organization_id
    and org.eliminado_en is null
)
and exists (
  select 1
  from public.users as app_user
  where app_user.organization_id = internal_accounts.organization_id
    and app_user.correo = internal_accounts.correo
    and app_user.eliminado_en is null
)
on conflict (organization_id) do update
set
  subscription_status = excluded.subscription_status,
  trial_ends_at = greatest(
    public.organization_profile.trial_ends_at,
    excluded.trial_ends_at
  ),
  subscription_started_at = coalesce(
    public.organization_profile.subscription_started_at,
    excluded.subscription_started_at
  ),
  subscription_ends_at = null,
  plan_type = excluded.plan_type,
  plan_code = excluded.plan_code,
  billing_period = excluded.billing_period,
  payment_method = excluded.payment_method,
  founder_price_locked = true,
  actualizado_en = timezone('utc', now());

comment on column public.organization_profile.founder_price_locked is
  'Si true, la organizacion mantiene precio founder sin reajuste. Org 3 y 4 son cuentas internas gratis permanentes de Ventora.';
