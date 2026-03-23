create table if not exists public.cotizacion_code_counters (
  organization_id bigint not null,
  quote_date date not null,
  last_number integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, quote_date)
);

comment on table public.cotizacion_code_counters is
  'Contador diario por organizacion para generar codigos comerciales de cotizacion legibles.';

comment on column public.cotizacion_code_counters.quote_date is
  'Fecha base del correlativo diario del codigo de cotizacion.';

comment on column public.cotizacion_code_counters.last_number is
  'Ultimo correlativo emitido para la organizacion en esa fecha.';

alter table public.cotizacion_code_counters enable row level security;

create or replace function public.reserve_next_cotizacion_code(
  p_organization_id bigint,
  p_quote_date date default timezone('utc', now())::date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_org_id bigint;
  next_number integer;
begin
  select u.organization_id::bigint
  into requester_org_id
  from public.users as u
  where lower(u.correo) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and u.eliminado_en is null
  limit 1;

  if requester_org_id is null then
    raise exception 'Usuario autenticado sin organizacion valida para generar codigos.';
  end if;

  if requester_org_id <> p_organization_id then
    raise exception 'No autorizado para generar codigos para otra organizacion.';
  end if;

  insert into public.cotizacion_code_counters as counter (
    organization_id,
    quote_date,
    last_number
  )
  values (
    p_organization_id,
    p_quote_date,
    1
  )
  on conflict (organization_id, quote_date)
  do update
    set last_number = counter.last_number + 1,
        updated_at = timezone('utc', now())
  returning counter.last_number
  into next_number;

  return format(
    'COT-%s-%s',
    to_char(p_quote_date, 'DDMMYY'),
    lpad(next_number::text, 3, '0')
  );
end;
$$;

revoke all on function public.reserve_next_cotizacion_code(bigint, date) from public;
grant execute on function public.reserve_next_cotizacion_code(bigint, date) to authenticated;

comment on function public.reserve_next_cotizacion_code(bigint, date) is
  'Reserva de forma atomica el siguiente codigo de cotizacion para una organizacion y fecha, usando formato COT-DDMMYY-001.';
