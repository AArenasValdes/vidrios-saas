-- Harden Webpay subscription payments for production.
-- Payments are created/updated only by trusted server routes using service_role.
-- Authenticated clients may only read their own organization's payment history.

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

comment on table public.pagos_suscripcion is
  'Pagos de suscripcion procesados por Webpay Plus (Transbank). Los inserts y updates se realizan solo desde rutas server con service_role; clientes autenticados solo consultan su historial por RLS.';
