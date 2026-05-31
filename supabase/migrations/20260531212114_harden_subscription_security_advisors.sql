-- Harden subscription-related database surface before production.
-- Webpay payment rows must be written only by trusted server routes using service_role.
-- The trial-default trigger function is internal and must not be callable as a public RPC.

drop policy if exists pagos_suscripcion_insert_own
  on public.pagos_suscripcion;

revoke all on table public.pagos_suscripcion from anon;
revoke insert, update, delete on table public.pagos_suscripcion from authenticated;
grant select on table public.pagos_suscripcion to authenticated;

do $$
begin
  if to_regclass('public.pagos_suscripcion_id_seq') is not null then
    revoke all on sequence public.pagos_suscripcion_id_seq from anon, authenticated;
  end if;
end
$$;

revoke execute on function public.ensure_organization_profile_trial_defaults() from public, anon, authenticated;
grant execute on function public.ensure_organization_profile_trial_defaults() to service_role;

comment on table public.pagos_suscripcion is
  'Pagos de suscripcion procesados por Webpay Plus (Transbank). Inserts y updates solo desde rutas server con service_role; clientes autenticados solo leen su historial por RLS.';
