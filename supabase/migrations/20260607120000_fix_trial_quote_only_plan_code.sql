-- Corrige organizaciones en trial que quedaron con plan_code quote_only por alta manual.
-- Durante el trial el acceso debe ser Founder Full (plan_code = trial).

update public.organization_profile
set
  plan_code = 'trial',
  plan_type = 'trial',
  billing_period = 'none',
  payment_method = 'none',
  actualizado_en = timezone('utc', now())
where
  plan_code = 'quote_only'
  and subscription_status in ('trial_active', 'trial_expiring', 'trial_expired')
  and (
    subscription_ends_at is null
    or subscription_ends_at <= timezone('utc', now())
  );
