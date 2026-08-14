-- Cierra hallazgos de identidad, privilegios de billing, exposicion de pagos
-- y replay durable de webhooks. La aplicacion cliente conserva solo columnas
-- comerciales; estado de suscripcion y ledger quedan reservados al servidor.

revoke insert, update on table public.organization_profile from authenticated;

grant insert (
  organization_id,
  empresa_nombre,
  empresa_logo_url,
  responsable_comercial,
  country_code,
  currency_code,
  locale,
  timezone,
  phone_country_code,
  tax_label,
  tax_rate_default,
  tax_id_label,
  empresa_direccion,
  empresa_telefono,
  empresa_email,
  brand_color,
  forma_pago,
  solicitud_publica_slug,
  solicitud_publica_descripcion_corta,
  solicitud_publica_valor,
  solicitud_publica_mensaje_confianza,
  solicitud_publica_privacidad,
  solicitud_publica_horario_desde,
  solicitud_publica_horario_hasta,
  solicitud_publica_dias_atencion,
  solicitud_publica_horario_por_dia,
  proveedor_preferido,
  modo_precio_preferido,
  margen_defecto,
  actualizado_en,
  public_name,
  public_subtitle,
  public_zone,
  public_business_type,
  instagram_url,
  facebook_url,
  tiktok_url,
  website_url,
  public_services,
  final_cta_title,
  final_cta_subtitle,
  final_cta_label,
  business_hours_note,
  secondary_color,
  hero_mode,
  hero_image_url,
  hero_title,
  hero_subtitle,
  show_gallery,
  show_schedule,
  show_rating,
  rating_label,
  jobs_count_label,
  form_title,
  form_subtitle,
  is_published
) on table public.organization_profile to authenticated;

grant update (
  empresa_nombre,
  empresa_logo_url,
  responsable_comercial,
  country_code,
  currency_code,
  locale,
  timezone,
  phone_country_code,
  tax_label,
  tax_rate_default,
  tax_id_label,
  empresa_direccion,
  empresa_telefono,
  empresa_email,
  brand_color,
  forma_pago,
  solicitud_publica_slug,
  solicitud_publica_descripcion_corta,
  solicitud_publica_valor,
  solicitud_publica_mensaje_confianza,
  solicitud_publica_privacidad,
  solicitud_publica_horario_desde,
  solicitud_publica_horario_hasta,
  solicitud_publica_dias_atencion,
  solicitud_publica_horario_por_dia,
  proveedor_preferido,
  modo_precio_preferido,
  margen_defecto,
  actualizado_en,
  public_name,
  public_subtitle,
  public_zone,
  public_business_type,
  instagram_url,
  facebook_url,
  tiktok_url,
  website_url,
  public_services,
  final_cta_title,
  final_cta_subtitle,
  final_cta_label,
  business_hours_note,
  secondary_color,
  hero_mode,
  hero_image_url,
  hero_title,
  hero_subtitle,
  show_gallery,
  show_schedule,
  show_rating,
  rating_label,
  jobs_count_label,
  form_title,
  form_subtitle,
  is_published
) on table public.organization_profile to authenticated;

-- El historial seguro se entrega por /api/subscriptions/pagos. La tabla cruda
-- contiene tokens, checkout_url y respuestas del proveedor y no se expone.
revoke select on table public.pagos_suscripcion from authenticated;

create table if not exists public.payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  request_id text not null,
  topic text not null,
  resource_id text not null,
  status text not null default 'processing',
  attempts integer not null default 1,
  claimed_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  last_error text,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  constraint payment_webhook_events_provider_check
    check (provider in ('mercadopago')),
  constraint payment_webhook_events_status_check
    check (status in ('processing', 'processed', 'failed')),
  constraint payment_webhook_events_request_id_length_check
    check (char_length(request_id) between 1 and 160),
  constraint payment_webhook_events_unique_request
    unique (provider, request_id)
);

alter table public.payment_webhook_events enable row level security;

revoke all on table public.payment_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.payment_webhook_events to service_role;
grant usage, select on sequence public.payment_webhook_events_id_seq to service_role;

create index if not exists payment_webhook_events_stale_idx
  on public.payment_webhook_events (provider, status, claimed_at);

create or replace function public.claim_mercadopago_webhook_event(
  p_request_id text,
  p_topic text,
  p_resource_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed boolean := false;
begin
  if p_request_id is null
     or char_length(p_request_id) not between 1 and 160
     or p_topic is null
     or char_length(p_topic) not between 1 and 120
     or p_resource_id is null
     or char_length(p_resource_id) not between 1 and 200 then
    raise exception 'Identidad de webhook invalida.' using errcode = '22023';
  end if;

  insert into public.payment_webhook_events (
    provider,
    request_id,
    topic,
    resource_id
  )
  values ('mercadopago', p_request_id, p_topic, p_resource_id)
  on conflict (provider, request_id) do update
    set
      topic = excluded.topic,
      resource_id = excluded.resource_id,
      status = 'processing',
      attempts = public.payment_webhook_events.attempts + 1,
      claimed_at = timezone('utc', now()),
      processed_at = null,
      last_error = null,
      actualizado_en = timezone('utc', now())
    where public.payment_webhook_events.status = 'failed'
       or (
         public.payment_webhook_events.status = 'processing'
         and public.payment_webhook_events.claimed_at
           < timezone('utc', now()) - interval '10 minutes'
       )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke execute on function public.claim_mercadopago_webhook_event(text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_mercadopago_webhook_event(text, text, text)
  to service_role;

-- Wrapper con locks: una identidad ya existente solo se puede completar si la
-- fila users ya esta vinculada al mismo auth_user_id. Nunca se reclama legacy
-- por coincidencia de correo.
create or replace function public.complete_verified_auth_account(
  p_auth_user_id uuid,
  p_email text,
  p_nombre text,
  p_empresa_nombre text,
  p_whatsapp text,
  p_ciudad_comuna text,
  p_consent boolean,
  p_country_code text
)
returns table (
  result_organization_id bigint,
  result_user_id bigint,
  result_trial_ends_at timestamptz,
  result_already_provisioned boolean,
  result_account_complete boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  existing_user_id bigint;
  existing_auth_user_id uuid;
begin
  if p_auth_user_id is null or normalized_email = '' then
    raise exception 'No pudimos validar tu sesion.' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('complete-google-oauth:auth:' || p_auth_user_id::text, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('complete-google-oauth:email:' || normalized_email, 0)
  );

  select app_user.id, app_user.auth_user_id
    into existing_user_id, existing_auth_user_id
  from public.users as app_user
  where lower(app_user.correo) = normalized_email
    and app_user.eliminado_en is null
  order by app_user.id
  limit 1
  for update;

  if existing_user_id is not null
     and existing_auth_user_id is distinct from p_auth_user_id then
    raise exception 'Este correo ya pertenece a una cuenta que requiere recuperacion administrada.'
      using errcode = '23505';
  end if;

  return query
  select *
  from public.complete_google_oauth_account(
    p_auth_user_id,
    normalized_email,
    p_nombre,
    p_empresa_nombre,
    p_whatsapp,
    p_ciudad_comuna,
    p_consent,
    p_country_code
  );
end;
$$;

revoke execute on function public.complete_verified_auth_account(
  uuid, text, text, text, text, text, boolean, text
) from public, anon, authenticated;
grant execute on function public.complete_verified_auth_account(
  uuid, text, text, text, text, text, boolean, text
) to service_role;

comment on function public.complete_verified_auth_account(
  uuid, text, text, text, text, text, boolean, text
) is 'Completa una cuenta verificada sin permitir vinculacion legacy por correo.';
