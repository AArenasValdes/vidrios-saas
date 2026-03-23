alter table public.cotizaciones
  add column if not exists approval_token text,
  add column if not exists approval_token_expires_at timestamptz,
  add column if not exists cliente_vio_en timestamptz,
  add column if not exists cliente_respondio_en timestamptz,
  add column if not exists cliente_respuesta_canal text;

create unique index if not exists cotizaciones_approval_token_key
  on public.cotizaciones (approval_token)
  where approval_token is not null;
