-- Billing Fase 4: configuracion regional por organizacion.
-- Chile sigue como valor de compatibilidad para organizaciones existentes.

alter table public.organization_profile
  add column if not exists country_code text,
  add column if not exists currency_code text,
  add column if not exists locale text,
  add column if not exists timezone text,
  add column if not exists phone_country_code text,
  add column if not exists tax_label text,
  add column if not exists tax_rate_default numeric(5, 2),
  add column if not exists tax_id_label text;

update public.organization_profile
set
  country_code = coalesce(nullif(btrim(country_code), ''), 'CL'),
  currency_code = coalesce(nullif(btrim(currency_code), ''), 'CLP'),
  locale = coalesce(nullif(btrim(locale), ''), 'es-CL'),
  timezone = coalesce(nullif(btrim(timezone), ''), 'America/Santiago'),
  phone_country_code = coalesce(nullif(btrim(phone_country_code), ''), '+56'),
  tax_label = coalesce(nullif(btrim(tax_label), ''), 'IVA'),
  tax_rate_default = coalesce(tax_rate_default, 19),
  tax_id_label = coalesce(nullif(btrim(tax_id_label), ''), 'RUT');

alter table public.organization_profile
  alter column country_code set default 'CL',
  alter column country_code set not null,
  alter column currency_code set default 'CLP',
  alter column currency_code set not null,
  alter column locale set default 'es-CL',
  alter column locale set not null,
  alter column timezone set default 'America/Santiago',
  alter column timezone set not null,
  alter column phone_country_code set default '+56',
  alter column phone_country_code set not null,
  alter column tax_label set default 'IVA',
  alter column tax_label set not null,
  alter column tax_rate_default set default 19,
  alter column tax_rate_default set not null,
  alter column tax_id_label set default 'RUT',
  alter column tax_id_label set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_profile_country_code_check'
      and conrelid = 'public.organization_profile'::regclass
  ) then
    alter table public.organization_profile
      add constraint organization_profile_country_code_check
      check (country_code in ('CL', 'AR', 'CO', 'MX', 'PE', 'UY'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_profile_currency_code_check'
      and conrelid = 'public.organization_profile'::regclass
  ) then
    alter table public.organization_profile
      add constraint organization_profile_currency_code_check
      check (currency_code ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_profile_locale_check'
      and conrelid = 'public.organization_profile'::regclass
  ) then
    alter table public.organization_profile
      add constraint organization_profile_locale_check
      check (locale ~ '^[a-z]{2}-[A-Z]{2}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_profile_phone_country_code_check'
      and conrelid = 'public.organization_profile'::regclass
  ) then
    alter table public.organization_profile
      add constraint organization_profile_phone_country_code_check
      check (phone_country_code ~ '^\+[1-9][0-9]{0,3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_profile_tax_rate_default_check'
      and conrelid = 'public.organization_profile'::regclass
  ) then
    alter table public.organization_profile
      add constraint organization_profile_tax_rate_default_check
      check (tax_rate_default >= 0 and tax_rate_default <= 100);
  end if;
end
$$;

alter table public.users
  drop constraint if exists users_whatsapp_chile_mobile_check;

alter table public.users
  add constraint users_whatsapp_e164_check
  check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{7,14}$');

drop function if exists public.complete_google_oauth_account(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
);

create function public.complete_google_oauth_account(
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
  v_email text;
  v_nombre text;
  v_empresa_nombre text;
  v_ciudad_comuna text;
  v_whatsapp text;
  v_country_code text;
  v_currency_code text;
  v_locale text;
  v_timezone text;
  v_phone_country_code text;
  v_tax_label text;
  v_tax_rate_default numeric(5, 2);
  v_tax_id_label text;
  v_user_id bigint;
  v_organization_id bigint;
  v_existing_auth_user_id uuid;
  v_had_organization boolean := false;
  v_trial_ends_at timestamptz;
begin
  v_email := lower(btrim(coalesce(p_email, '')));
  v_nombre := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_empresa_nombre := regexp_replace(btrim(coalesce(p_empresa_nombre, '')), '\s+', ' ', 'g');
  v_ciudad_comuna := regexp_replace(btrim(coalesce(p_ciudad_comuna, '')), '\s+', ' ', 'g');
  v_whatsapp := btrim(coalesce(p_whatsapp, ''));
  v_country_code := upper(btrim(coalesce(p_country_code, '')));

  case v_country_code
    when 'CL' then
      v_currency_code := 'CLP'; v_locale := 'es-CL'; v_timezone := 'America/Santiago';
      v_phone_country_code := '+56'; v_tax_label := 'IVA'; v_tax_rate_default := 19; v_tax_id_label := 'RUT';
    when 'AR' then
      v_currency_code := 'ARS'; v_locale := 'es-AR'; v_timezone := 'America/Argentina/Buenos_Aires';
      v_phone_country_code := '+54'; v_tax_label := 'IVA'; v_tax_rate_default := 21; v_tax_id_label := 'CUIT';
    when 'CO' then
      v_currency_code := 'COP'; v_locale := 'es-CO'; v_timezone := 'America/Bogota';
      v_phone_country_code := '+57'; v_tax_label := 'IVA'; v_tax_rate_default := 19; v_tax_id_label := 'NIT';
    when 'MX' then
      v_currency_code := 'MXN'; v_locale := 'es-MX'; v_timezone := 'America/Mexico_City';
      v_phone_country_code := '+52'; v_tax_label := 'IVA'; v_tax_rate_default := 16; v_tax_id_label := 'RFC';
    when 'PE' then
      v_currency_code := 'PEN'; v_locale := 'es-PE'; v_timezone := 'America/Lima';
      v_phone_country_code := '+51'; v_tax_label := 'IGV'; v_tax_rate_default := 18; v_tax_id_label := 'RUC';
    when 'UY' then
      v_currency_code := 'UYU'; v_locale := 'es-UY'; v_timezone := 'America/Montevideo';
      v_phone_country_code := '+598'; v_tax_label := 'IVA'; v_tax_rate_default := 22; v_tax_id_label := 'RUT';
    else
      raise exception 'Selecciona un pais disponible.' using errcode = '22023';
  end case;

  if v_whatsapp !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Ingresa un WhatsApp valido con codigo de pais.' using errcode = '22023';
  end if;

  if p_auth_user_id is null or v_email = '' then
    raise exception 'No pudimos validar tu sesion.' using errcode = '28000';
  end if;

  if length(v_email) > 320 then
    raise exception 'El correo supera el largo permitido.' using errcode = '22023';
  end if;

  if length(v_nombre) < 2 or length(v_nombre) > 120 then
    raise exception 'Ingresa tu nombre.' using errcode = '22023';
  end if;

  if length(v_empresa_nombre) < 2 or length(v_empresa_nombre) > 160 then
    raise exception 'Ingresa el nombre del taller.' using errcode = '22023';
  end if;

  if length(v_ciudad_comuna) < 2 or length(v_ciudad_comuna) > 120 then
    raise exception 'Ingresa tu ciudad o comuna.' using errcode = '22023';
  end if;

  if p_consent is distinct from true then
    raise exception 'Debes aceptar la creacion de la cuenta y el contacto directo.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('complete-google-oauth:auth:' || p_auth_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('complete-google-oauth:email:' || v_email, 0));

  select app_user.id, app_user.organization_id, app_user.auth_user_id
  into v_user_id, v_organization_id, v_existing_auth_user_id
  from public.users as app_user
  where app_user.auth_user_id = p_auth_user_id and app_user.eliminado_en is null
  limit 1 for update;

  if v_user_id is null then
    select app_user.id, app_user.organization_id, app_user.auth_user_id
    into v_user_id, v_organization_id, v_existing_auth_user_id
    from public.users as app_user
    where lower(app_user.correo) = v_email and app_user.eliminado_en is null
    order by app_user.id limit 1 for update;
  end if;

  if v_existing_auth_user_id is not null and v_existing_auth_user_id <> p_auth_user_id then
    raise exception 'Este correo ya esta vinculado a otra cuenta de acceso.' using errcode = '23505';
  end if;

  v_had_organization := v_organization_id is not null;

  if v_organization_id is null then
    insert into public.organizations (nombre, correo, telefono)
    values (v_empresa_nombre, v_email, v_whatsapp)
    returning id into v_organization_id;
  end if;

  if v_user_id is null then
    insert into public.users (correo, organization_id, rol, auth_user_id, nombre, whatsapp, ciudad_comuna, data_sharing_accepted_at)
    values (v_email, v_organization_id, 'admin', p_auth_user_id, v_nombre, v_whatsapp, v_ciudad_comuna, now())
    returning id into v_user_id;
  else
    update public.users set
      correo = v_email, organization_id = v_organization_id, auth_user_id = p_auth_user_id,
      nombre = v_nombre, whatsapp = v_whatsapp, ciudad_comuna = v_ciudad_comuna,
      data_sharing_accepted_at = coalesce(data_sharing_accepted_at, now()),
      actualizado_en = timezone('utc', now())
    where id = v_user_id;
  end if;

  update public.organizations set
    nombre = v_empresa_nombre,
    correo = case when nullif(btrim(correo), '') is null then v_email else correo end,
    telefono = case when nullif(btrim(telefono), '') is null then v_whatsapp else telefono end,
    actualizado_en = timezone('utc', now())
  where id = v_organization_id;

  insert into public.organization_profile (
    organization_id, empresa_nombre, responsable_comercial, empresa_telefono, empresa_email,
    public_name, public_zone, country_code, currency_code, locale, timezone,
    phone_country_code, tax_label, tax_rate_default, tax_id_label
  ) values (
    v_organization_id, v_empresa_nombre, v_nombre, v_whatsapp, v_email,
    v_empresa_nombre, v_ciudad_comuna, v_country_code, v_currency_code, v_locale, v_timezone,
    v_phone_country_code, v_tax_label, v_tax_rate_default, v_tax_id_label
  ) on conflict (organization_id) do update set
    empresa_nombre = excluded.empresa_nombre,
    responsable_comercial = case when nullif(btrim(public.organization_profile.responsable_comercial), '') is null then excluded.responsable_comercial else public.organization_profile.responsable_comercial end,
    empresa_telefono = case when nullif(btrim(public.organization_profile.empresa_telefono), '') is null then excluded.empresa_telefono else public.organization_profile.empresa_telefono end,
    empresa_email = case when nullif(btrim(public.organization_profile.empresa_email), '') is null then excluded.empresa_email else public.organization_profile.empresa_email end,
    public_name = case when nullif(btrim(public.organization_profile.public_name), '') is null then excluded.public_name else public.organization_profile.public_name end,
    public_zone = case when nullif(btrim(public.organization_profile.public_zone), '') is null then excluded.public_zone else public.organization_profile.public_zone end,
    country_code = excluded.country_code,
    currency_code = excluded.currency_code,
    locale = excluded.locale,
    timezone = excluded.timezone,
    phone_country_code = excluded.phone_country_code,
    tax_label = excluded.tax_label,
    tax_rate_default = excluded.tax_rate_default,
    tax_id_label = excluded.tax_id_label,
    actualizado_en = timezone('utc', now());

  select profile.trial_ends_at into v_trial_ends_at
  from public.organization_profile as profile
  where profile.organization_id = v_organization_id;

  return query select v_organization_id, v_user_id, v_trial_ends_at, v_had_organization, true;
end;
$$;

revoke execute on function public.complete_google_oauth_account(uuid, text, text, text, text, text, boolean, text)
  from public, anon, authenticated;

grant execute on function public.complete_google_oauth_account(uuid, text, text, text, text, text, boolean, text)
  to service_role;

comment on function public.complete_google_oauth_account(uuid, text, text, text, text, text, boolean, text) is
  'Completa de forma atomica e idempotente el alta SaaS iniciada con Google OAuth y guarda la region elegida.';
