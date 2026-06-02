-- Extend subscription payment ledger for provider-agnostic billing.
-- The table remains client-read-only by RLS/grants; server routes write with service_role.

alter table public.pagos_suscripcion
  add column if not exists provider_order_id text,
  add column if not exists checkout_url text;

alter table public.pagos_suscripcion
  drop constraint if exists pagos_suscripcion_billing_period_check,
  drop constraint if exists pagos_suscripcion_payment_provider_check,
  drop constraint if exists pagos_suscripcion_status_check;

alter table public.pagos_suscripcion
  add constraint pagos_suscripcion_billing_period_check
    check (billing_period in ('yearly', 'monthly')),
  add constraint pagos_suscripcion_payment_provider_check
    check (payment_provider in ('flow', 'manual_transfer', 'webpay_plus')),
  add constraint pagos_suscripcion_status_check
    check (status in ('pendiente', 'aprobado', 'fallido', 'cancelado', 'reembolsado'));

create unique index if not exists pagos_suscripcion_provider_order_idx
  on public.pagos_suscripcion using btree (payment_provider, provider_order_id)
  where provider_order_id is not null and eliminado_en is null;

alter table public.organization_profile
  drop constraint if exists organization_profile_payment_method_check;

alter table public.organization_profile
  add constraint organization_profile_payment_method_check
    check (payment_method in ('manual_transfer', 'manual_other', 'none', 'flow', 'webpay_plus'));

comment on table public.pagos_suscripcion is
  'Pagos de suscripcion procesados por billing provider-agnostic. Inserts y updates solo desde rutas server con service_role; clientes autenticados solo leen su historial por RLS.';

comment on column public.pagos_suscripcion.provider_order_id is
  'Identificador de orden externo del provider. En Flow corresponde a flowOrder.';

comment on column public.pagos_suscripcion.checkout_url is
  'URL de checkout generada por el provider. No contiene secretos; se conserva para soporte operativo.';
