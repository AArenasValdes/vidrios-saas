


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."activate_subscription_from_payment"("p_payment_id" bigint) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  payment_record public.pagos_suscripcion%rowtype;
  subscription_record_id bigint;
  subscription_provider text;
  subscription_external_reference text;
  projected_plan_type text;
begin
  select *
  into payment_record
  from public.pagos_suscripcion
  where id = p_payment_id
    and eliminado_en is null
  for update;

  if not found then
    raise exception 'Pago de suscripcion no encontrado.';
  end if;

  if payment_record.status <> 'aprobado' then
    raise exception 'El pago debe estar aprobado antes de activar la suscripcion.';
  end if;

  if payment_record.paid_at is null or payment_record.period_ends_at is null then
    raise exception 'El pago aprobado no tiene fechas suficientes para activar la suscripcion.';
  end if;

  subscription_provider := case
    when payment_record.payment_provider in ('manual_transfer', 'manual_other') then 'manual'
    else payment_record.payment_provider
  end;
  subscription_external_reference := 'payment:' || payment_record.id::text;
  projected_plan_type := case
    when payment_record.billing_period = 'monthly' then 'monthly'
    when payment_record.plan_code = 'founder_full' then 'founder'
    else 'yearly'
  end;

  insert into public.suscripciones_organizacion (
    organization_id,
    provider,
    plan_code,
    billing_period,
    country_code,
    currency_code,
    amount,
    status,
    provider_status,
    current_period_starts_at,
    current_period_ends_at,
    external_reference
  )
  values (
    payment_record.organization_id,
    subscription_provider,
    payment_record.plan_code,
    payment_record.billing_period,
    'CL',
    payment_record.currency_code,
    payment_record.amount,
    'active',
    payment_record.provider_status,
    coalesce(payment_record.period_starts_at, payment_record.paid_at),
    payment_record.period_ends_at,
    subscription_external_reference
  )
  on conflict (external_reference) where eliminado_en is null
  do update set
    status = 'active',
    provider_status = excluded.provider_status,
    current_period_starts_at = excluded.current_period_starts_at,
    current_period_ends_at = excluded.current_period_ends_at,
    amount = excluded.amount,
    currency_code = excluded.currency_code,
    actualizado_en = timezone('utc', now())
  returning id into subscription_record_id;

  update public.pagos_suscripcion
  set
    subscription_id = subscription_record_id,
    provider_payment_id = coalesce(provider_payment_id, provider_order_id),
    actualizado_en = timezone('utc', now())
  where id = payment_record.id;

  update public.organization_profile
  set
    subscription_status = 'active',
    plan_code = payment_record.plan_code,
    plan_type = projected_plan_type,
    billing_period = payment_record.billing_period,
    payment_method = payment_record.payment_provider,
    founder_price_locked = public.organization_profile.founder_price_locked,
    subscription_started_at = coalesce(
      payment_record.period_starts_at,
      payment_record.paid_at
    ),
    subscription_ends_at = payment_record.period_ends_at,
    last_payment_at = payment_record.paid_at,
    actualizado_en = timezone('utc', now())
  where organization_id = payment_record.organization_id;

  if not found then
    raise exception 'Perfil de organizacion no encontrado para activar la suscripcion.';
  end if;

  return subscription_record_id;
end;
$$;


ALTER FUNCTION "public"."activate_subscription_from_payment"("p_payment_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer DEFAULT 90) RETURNS TABLE("clientes_purgados" integer, "proyectos_purgados" integer, "cotizaciones_purgadas" integer, "items_purgados" integer, "breakdowns_purgados" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_org_id public.organizations.id%type;
  cutoff timestamptz;
begin
  current_org_id := public.get_org_id();

  if current_org_id is null then
    raise exception 'No se pudo resolver la organizacion activa del usuario autenticado.';
  end if;

  cutoff := timezone('utc', now()) - make_interval(days => greatest(retention_days, 0));

  with candidate_clients as (
    select client.id
    from public.clients as client
    where client.organization_id = current_org_id
      and client.eliminado_en is not null
      and client.eliminado_en <= cutoff
  ),
  candidate_projects as (
    select project.id
    from public.projects as project
    join candidate_clients as client on client.id = project.cliente_id
    where project.organization_id = current_org_id
      and project.eliminado_en is not null
      and project.eliminado_en <= cutoff
  ),
  candidate_quotes as (
    select quote.id
    from public.cotizaciones as quote
    join candidate_projects as project on project.id = quote.proyecto_id
    where quote.organization_id = current_org_id
      and quote.eliminado_en is not null
      and quote.eliminado_en <= cutoff
  ),
  candidate_items as (
    select item.id
    from public.cotizacion_items as item
    join candidate_quotes as quote on quote.id = item.cotizacion_id
    where item.organization_id = current_org_id
      and item.eliminado_en is not null
      and item.eliminado_en <= cutoff
  ),
  deleted_breakdowns as (
    delete from public.quote_item_breakdown as breakdown
    using candidate_items as item
    where breakdown.cotizacion_item_id = item.id
    returning breakdown.id
  ),
  deleted_items as (
    delete from public.cotizacion_items as item
    using candidate_items as candidate
    where item.id = candidate.id
    returning item.id
  ),
  deleted_quotes as (
    delete from public.cotizaciones as quote
    using candidate_quotes as candidate
    where quote.id = candidate.id
    returning quote.id
  ),
  deleted_projects as (
    delete from public.projects as project
    using candidate_projects as candidate
    where project.id = candidate.id
    returning project.id
  ),
  deleted_clients as (
    delete from public.clients as client
    using candidate_clients as candidate
    where client.id = candidate.id
    returning client.id
  )
  select
    coalesce((select count(*) from deleted_clients), 0)::int,
    coalesce((select count(*) from deleted_projects), 0)::int,
    coalesce((select count(*) from deleted_quotes), 0)::int,
    coalesce((select count(*) from deleted_items), 0)::int,
    coalesce((select count(*) from deleted_breakdowns), 0)::int
  into
    clientes_purgados,
    proyectos_purgados,
    cotizaciones_purgadas,
    items_purgados,
    breakdowns_purgados;

  return query
  select
    clientes_purgados,
    proyectos_purgados,
    cotizaciones_purgadas,
    items_purgados,
    breakdowns_purgados;
end;
$$;


ALTER FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer) IS 'Purge manual de clientes eliminados y sus datos relacionados. Solo actua sobre registros ya marcados con eliminado_en y mas antiguos que la retencion indicada.';



CREATE OR REPLACE FUNCTION "public"."complete_google_oauth_account"("p_auth_user_id" "uuid", "p_email" "text", "p_nombre" "text", "p_empresa_nombre" "text", "p_whatsapp" "text", "p_ciudad_comuna" "text", "p_consent" boolean, "p_country_code" "text") RETURNS TABLE("result_organization_id" bigint, "result_user_id" bigint, "result_trial_ends_at" timestamp with time zone, "result_already_provisioned" boolean, "result_account_complete" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
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
  v_nombre := regexp_replace(btrim(coalesce(p_nombre, '')), '\\s+', ' ', 'g');
  v_empresa_nombre := regexp_replace(btrim(coalesce(p_empresa_nombre, '')), '\\s+', ' ', 'g');
  v_ciudad_comuna := regexp_replace(btrim(coalesce(p_ciudad_comuna, '')), '\\s+', ' ', 'g');
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

  if v_whatsapp !~ '^\\+[1-9][0-9]{7,14}$' then
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
  if v_ciudad_comuna <> '' and (length(v_ciudad_comuna) < 2 or length(v_ciudad_comuna) > 120) then
    raise exception 'La ciudad o comuna debe tener entre 2 y 120 caracteres.' using errcode = '22023';
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
    values (v_email, v_organization_id, 'admin', p_auth_user_id, v_nombre, v_whatsapp, nullif(v_ciudad_comuna, ''), now())
    returning id into v_user_id;
  else
    update public.users set
      correo = v_email, organization_id = v_organization_id, auth_user_id = p_auth_user_id,
      nombre = v_nombre, whatsapp = v_whatsapp, ciudad_comuna = nullif(v_ciudad_comuna, ''),
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
    v_empresa_nombre, nullif(v_ciudad_comuna, ''), v_country_code, v_currency_code, v_locale, v_timezone,
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
$_$;


ALTER FUNCTION "public"."complete_google_oauth_account"("p_auth_user_id" "uuid", "p_email" "text", "p_nombre" "text", "p_empresa_nombre" "text", "p_whatsapp" "text", "p_ciudad_comuna" "text", "p_consent" boolean, "p_country_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_google_oauth_account"("p_auth_user_id" "uuid", "p_email" "text", "p_nombre" "text", "p_empresa_nombre" "text", "p_whatsapp" "text", "p_ciudad_comuna" "text", "p_consent" boolean, "p_country_code" "text") IS 'Completa de forma atomica e idempotente el alta SaaS iniciada con Google OAuth o correo y guarda la region elegida.';



CREATE OR REPLACE FUNCTION "public"."enforce_fabrication_recipe_test_validator"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.passed
     and auth.uid() is not null
     and new.validated_by is distinct from auth.uid() then
    raise exception 'El usuario que aprueba la prueba debe coincidir con la sesion autenticada.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_fabrication_recipe_test_validator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_organization_profile_trial_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  insert into public.organization_profile (
    organization_id,
    subscription_status,
    trial_started_at,
    trial_ends_at,
    plan_type,
    plan_code,
    billing_period,
    payment_method,
    founder_price_locked
  )
  values (
    new.id,
    'trial_active',
    timezone('utc', now()),
    timezone('utc', now()) + interval '15 days',
    'trial',
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
      plan_code = coalesce(public.organization_profile.plan_code, excluded.plan_code),
      billing_period = coalesce(public.organization_profile.billing_period, excluded.billing_period),
      payment_method = coalesce(public.organization_profile.payment_method, excluded.payment_method),
      founder_price_locked = coalesce(public.organization_profile.founder_price_locked, excluded.founder_price_locked);

  return new;
end;
$$;


ALTER FUNCTION "public"."ensure_organization_profile_trial_defaults"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select organization_id
  from public.users
  where auth_user_id = auth.uid()
    and eliminado_en is null
  limit 1;
$$;


ALTER FUNCTION "public"."get_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_validated_fabrication_recipe_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if old.status = 'validated'
     and old.eliminado_en is null
     and not (new.status = 'archived' or new.eliminado_en is not null) then
    raise exception 'Una receta validada no se modifica directamente; crea una nueva version.';
  end if;

  if new.status = 'validated'
     and old.status <> 'validated' then
    if new.validated_at is null then
      raise exception 'Una receta validada debe registrar fecha de validacion.';
    end if;

    if auth.uid() is not null
       and new.validated_by is distinct from auth.uid() then
      raise exception 'El usuario validador debe coincidir con la sesion autenticada.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_validated_fabrication_recipe_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_mercadopago_payment"("p_subscription_id" bigint, "p_provider_payment_id" "text", "p_provider_order_id" "text", "p_provider_status" "text", "p_status" "text", "p_amount" numeric, "p_currency_code" "text", "p_paid_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_period_starts_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_period_ends_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_provider_response" "jsonb" DEFAULT NULL::"jsonb") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  subscription_record public.suscripciones_organizacion%rowtype;
  payment_record_id bigint;
begin
  if p_status not in ('pendiente', 'aprobado', 'fallido', 'cancelado', 'reembolsado') then
    raise exception 'Estado de pago no valido.';
  end if;

  select *
  into subscription_record
  from public.suscripciones_organizacion
  where id = p_subscription_id
    and provider = 'mercadopago'
    and eliminado_en is null
  for update;

  if not found then
    raise exception 'Suscripcion Mercado Pago no encontrada.';
  end if;

  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'Identificador de pago requerido.';
  end if;

  if p_amount <> subscription_record.amount
     or upper(p_currency_code) <> subscription_record.currency_code then
    raise exception 'Monto o moneda no coinciden con la suscripcion.';
  end if;

  insert into public.pagos_suscripcion (
    organization_id,
    plan_code,
    billing_period,
    amount_clp,
    amount,
    currency,
    currency_code,
    subscription_id,
    provider_payment_id,
    payment_provider,
    provider_order_id,
    provider_status,
    provider_response,
    buy_order,
    status,
    paid_at,
    period_starts_at,
    period_ends_at
  )
  values (
    subscription_record.organization_id,
    subscription_record.plan_code,
    subscription_record.billing_period,
    p_amount::integer,
    p_amount,
    upper(p_currency_code),
    upper(p_currency_code),
    subscription_record.id,
    p_provider_payment_id,
    'mercadopago',
    p_provider_order_id,
    p_provider_status,
    p_provider_response,
    'mp:' || p_provider_payment_id,
    p_status,
    p_paid_at,
    p_period_starts_at,
    p_period_ends_at
  )
  on conflict (payment_provider, provider_payment_id)
    where provider_payment_id is not null and eliminado_en is null
  do update set
    provider_order_id = excluded.provider_order_id,
    provider_status = excluded.provider_status,
    provider_response = excluded.provider_response,
    status = excluded.status,
    paid_at = coalesce(excluded.paid_at, public.pagos_suscripcion.paid_at),
    period_starts_at = coalesce(
      excluded.period_starts_at,
      public.pagos_suscripcion.period_starts_at
    ),
    period_ends_at = coalesce(
      excluded.period_ends_at,
      public.pagos_suscripcion.period_ends_at
    ),
    actualizado_en = timezone('utc', now())
  returning id into payment_record_id;

  if p_status = 'aprobado' and p_paid_at is not null then
    update public.organization_profile
    set
      last_payment_at = greatest(
        coalesce(last_payment_at, p_paid_at),
        p_paid_at
      ),
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id;
  end if;

  return payment_record_id;
end;
$$;


ALTER FUNCTION "public"."reconcile_mercadopago_payment"("p_subscription_id" bigint, "p_provider_payment_id" "text", "p_provider_order_id" "text", "p_provider_status" "text", "p_status" "text", "p_amount" numeric, "p_currency_code" "text", "p_paid_at" timestamp with time zone, "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_provider_response" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_mercadopago_payment"("p_subscription_id" bigint, "p_provider_payment_id" "text", "p_provider_order_id" "text", "p_provider_status" "text", "p_status" "text", "p_amount" numeric, "p_currency_code" "text", "p_paid_at" timestamp with time zone, "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_provider_response" "jsonb") IS 'Upsert idempotente del ledger Mercado Pago. Solo service_role.';



CREATE OR REPLACE FUNCTION "public"."reconcile_mercadopago_subscription"("p_subscription_id" bigint, "p_provider_subscription_id" "text", "p_provider_plan_id" "text", "p_provider_status" "text", "p_status" "text", "p_period_starts_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_period_ends_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_next_payment_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cancelled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  subscription_record public.suscripciones_organizacion%rowtype;
  projected_plan_type text;
begin
  if p_status not in ('pending', 'active', 'paused', 'past_due', 'cancelled') then
    raise exception 'Estado recurrente no valido.';
  end if;

  select *
  into subscription_record
  from public.suscripciones_organizacion
  where id = p_subscription_id
    and provider = 'mercadopago'
    and eliminado_en is null
  for update;

  if not found then
    raise exception 'Suscripcion Mercado Pago no encontrada.';
  end if;

  if subscription_record.provider_subscription_id is not null
     and subscription_record.provider_subscription_id <> p_provider_subscription_id then
    raise exception 'La identidad de la suscripcion no coincide.';
  end if;

  if subscription_record.provider_plan_id is not null
     and subscription_record.provider_plan_id <> p_provider_plan_id then
    raise exception 'El plan del proveedor no coincide.';
  end if;

  update public.suscripciones_organizacion
  set
    provider_subscription_id = p_provider_subscription_id,
    provider_plan_id = p_provider_plan_id,
    provider_status = p_provider_status,
    status = p_status,
    current_period_starts_at = coalesce(
      p_period_starts_at,
      current_period_starts_at
    ),
    current_period_ends_at = coalesce(
      p_period_ends_at,
      current_period_ends_at
    ),
    next_payment_at = p_next_payment_at,
    cancelled_at = case
      when p_status = 'cancelled' then coalesce(p_cancelled_at, timezone('utc', now()))
      else cancelled_at
    end,
    actualizado_en = timezone('utc', now())
  where id = p_subscription_id
  returning * into subscription_record;

  projected_plan_type := case
    when subscription_record.billing_period = 'monthly' then 'monthly'
    when subscription_record.plan_code = 'founder_full' then 'founder'
    else 'yearly'
  end;

  if p_status = 'active' then
    update public.organization_profile
    set
      subscription_status = 'active',
      plan_code = subscription_record.plan_code,
      plan_type = projected_plan_type,
      billing_period = subscription_record.billing_period,
      payment_method = 'mercadopago',
      founder_price_locked = public.organization_profile.founder_price_locked,
      subscription_started_at = coalesce(
        subscription_record.current_period_starts_at,
        subscription_started_at,
        timezone('utc', now())
      ),
      subscription_ends_at = subscription_record.current_period_ends_at,
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id;
  elsif p_status in ('paused', 'past_due') then
    update public.organization_profile
    set
      subscription_status = 'past_due',
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id
      and payment_method = 'mercadopago';
  elsif p_status = 'cancelled' then
    update public.organization_profile
    set
      subscription_status = case
        when subscription_record.current_period_ends_at is not null
          and subscription_record.current_period_ends_at > timezone('utc', now())
          then 'active'
        else 'cancelled'
      end,
      subscription_ends_at = subscription_record.current_period_ends_at,
      actualizado_en = timezone('utc', now())
    where organization_id = subscription_record.organization_id
      and payment_method = 'mercadopago';
  end if;

  return subscription_record.id;
end;
$$;


ALTER FUNCTION "public"."reconcile_mercadopago_subscription"("p_subscription_id" bigint, "p_provider_subscription_id" "text", "p_provider_plan_id" "text", "p_provider_status" "text", "p_status" "text", "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_next_payment_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_mercadopago_subscription"("p_subscription_id" bigint, "p_provider_subscription_id" "text", "p_provider_plan_id" "text", "p_provider_status" "text", "p_status" "text", "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_next_payment_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone) IS 'Proyecta una suscripcion consultada a Mercado Pago. Solo service_role.';



CREATE OR REPLACE FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date" DEFAULT ("timezone"('utc'::"text", "now"()))::"date") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  requester_org_id bigint;
  next_number integer;
begin
  requester_org_id := public.get_org_id();

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


ALTER FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") IS 'Reserva de forma atomica el siguiente codigo de cotizacion para una organizacion y fecha, usando formato COT-DDMMYY-001.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_fabrication_recipe_test_organization"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  recipe_scope text;
  recipe_org_id bigint;
begin
  select scope, organization_id
    into recipe_scope, recipe_org_id
  from public.fabrication_recipes
  where id = new.recipe_id
    and eliminado_en is null;

  if recipe_scope is null then
    raise exception 'La receta de fabricacion no existe o esta eliminada.';
  end if;

  if recipe_scope = 'ventora' then
    new.organization_id = null;
  else
    new.organization_id = recipe_org_id;
  end if;

  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_fabrication_recipe_test_organization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_pagos_suscripcion_neutral_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.amount := coalesce(new.amount, new.amount_clp::numeric);
  new.currency_code := coalesce(
    new.currency_code,
    upper(new.currency)::character(3)
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_pagos_suscripcion_neutral_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_fabrication_recipes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_fabrication_recipes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_growth_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.actualizado_en = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_growth_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "telefono" "text",
    "direccion" "text",
    "organization_id" bigint NOT NULL,
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "correo" "text",
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone,
    "estado_manual" "text",
    CONSTRAINT "clients_estado_manual_check" CHECK ((("estado_manual" IS NULL) OR ("estado_manual" = ANY (ARRAY['activo'::"text", 'seguimiento'::"text", 'prospecto'::"text", 'inactivo'::"text"]))))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cotizaciones" (
    "id" bigint NOT NULL,
    "proyecto_id" bigint,
    "total" numeric NOT NULL,
    "estado" "text" NOT NULL,
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "organization_id" bigint NOT NULL,
    "numero" "text",
    "descuento_pct" numeric,
    "flete" numeric,
    "iva" numeric,
    "notas" "text",
    "valido_hasta" "date",
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone,
    "subtotal_neto" numeric,
    "costo_total" numeric,
    "margen_pct" numeric,
    "utilidad_total" numeric,
    "estado_comercial" "text",
    "approval_token" "text",
    "approval_token_expires_at" timestamp with time zone,
    "cliente_vio_en" timestamp with time zone,
    "cliente_respondio_en" timestamp with time zone,
    "cliente_respuesta_canal" "text",
    "pricing_mode" "text" DEFAULT 'por_item'::"text" NOT NULL,
    "pdf_descargado_en" timestamp with time zone,
    "costo_materiales_total" numeric(12,2),
    "costo_mano_obra_total" numeric(12,2),
    "costo_traslado_total" numeric(12,2),
    "costo_otros_total" numeric(12,2),
    "merma_pct" numeric(7,4),
    "merma_total" numeric(12,2),
    "margen_objetivo_pct" numeric(7,4),
    "precio_recomendado_neto" numeric(12,2),
    "iva_pct" numeric(7,4),
    "financial_snapshot_version" integer,
    "financial_snapshot_calculado_en" timestamp with time zone,
    "cost_basis_status" "text",
    "regional_snapshot" "jsonb",
    CONSTRAINT "cotizaciones_cost_basis_status_check" CHECK ((("cost_basis_status" IS NULL) OR ("cost_basis_status" = ANY (ARRAY['sin_costos'::"text", 'estimado'::"text", 'manual'::"text"])))),
    CONSTRAINT "cotizaciones_financial_costs_nonnegative" CHECK (((("costo_materiales_total" IS NULL) OR ("costo_materiales_total" >= (0)::numeric)) AND (("costo_mano_obra_total" IS NULL) OR ("costo_mano_obra_total" >= (0)::numeric)) AND (("costo_traslado_total" IS NULL) OR ("costo_traslado_total" >= (0)::numeric)) AND (("costo_otros_total" IS NULL) OR ("costo_otros_total" >= (0)::numeric)) AND (("merma_pct" IS NULL) OR ("merma_pct" >= (0)::numeric)) AND (("merma_total" IS NULL) OR ("merma_total" >= (0)::numeric)) AND (("margen_objetivo_pct" IS NULL) OR (("margen_objetivo_pct" >= (0)::numeric) AND ("margen_objetivo_pct" < (100)::numeric))) AND (("precio_recomendado_neto" IS NULL) OR ("precio_recomendado_neto" >= (0)::numeric)) AND (("iva_pct" IS NULL) OR ("iva_pct" >= (0)::numeric)) AND (("financial_snapshot_version" IS NULL) OR ("financial_snapshot_version" > 0)))),
    CONSTRAINT "cotizaciones_pricing_mode_check" CHECK (("pricing_mode" = ANY (ARRAY['por_item'::"text", 'total_global'::"text"]))),
    CONSTRAINT "cotizaciones_regional_snapshot_object_check" CHECK ((("regional_snapshot" IS NULL) OR ("jsonb_typeof"("regional_snapshot") = 'object'::"text")))
);


ALTER TABLE "public"."cotizaciones" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cotizaciones"."pricing_mode" IS 'Modo de pricing comercial: por_item calcula desde componentes; total_global define costo/margen/total a nivel cotizacion.';



COMMENT ON COLUMN "public"."cotizaciones"."pdf_descargado_en" IS 'Marca silenciosa cuando el maestro descarga el PDF desde la app. No cambia el estado comercial.';



COMMENT ON COLUMN "public"."cotizaciones"."costo_materiales_total" IS 'Snapshot Quote Studio: costo neto de materiales usado para calcular margen.';



COMMENT ON COLUMN "public"."cotizaciones"."costo_mano_obra_total" IS 'Snapshot Quote Studio: costo neto de mano de obra.';



COMMENT ON COLUMN "public"."cotizaciones"."costo_traslado_total" IS 'Snapshot Quote Studio: costo neto de traslado separado del cobro al cliente.';



COMMENT ON COLUMN "public"."cotizaciones"."costo_otros_total" IS 'Snapshot Quote Studio: otros costos netos del taller.';



COMMENT ON COLUMN "public"."cotizaciones"."merma_pct" IS 'Snapshot Quote Studio: porcentaje de merma usado sobre costos base.';



COMMENT ON COLUMN "public"."cotizaciones"."merma_total" IS 'Snapshot Quote Studio: monto neto de merma.';



COMMENT ON COLUMN "public"."cotizaciones"."margen_objetivo_pct" IS 'Snapshot Quote Studio: margen real objetivo, no markup.';



COMMENT ON COLUMN "public"."cotizaciones"."precio_recomendado_neto" IS 'Snapshot Quote Studio: precio sugerido neto, sin IVA.';



COMMENT ON COLUMN "public"."cotizaciones"."iva_pct" IS 'Snapshot Quote Studio: porcentaje de IVA aplicado como capa tributaria.';



COMMENT ON COLUMN "public"."cotizaciones"."financial_snapshot_version" IS 'Version del algoritmo de snapshot financiero usado por Quote Studio.';



COMMENT ON COLUMN "public"."cotizaciones"."financial_snapshot_calculado_en" IS 'Fecha en que se calculo el snapshot financiero.';



COMMENT ON COLUMN "public"."cotizaciones"."cost_basis_status" IS 'Estado de base de costo del snapshot: sin_costos, estimado o manual.';



COMMENT ON COLUMN "public"."cotizaciones"."regional_snapshot" IS 'Snapshot regional inmutable de la cotizacion: pais, moneda, locale, zona horaria e impuesto comercial.';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" bigint NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "cliente_id" bigint,
    "organization_id" bigint NOT NULL,
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "estado" "text",
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_clientes_eliminados" WITH ("security_invoker"='true') AS
 WITH "deleted_projects" AS (
         SELECT "project"."cliente_id",
            "project"."organization_id",
            ("count"(*))::integer AS "proyectos_eliminados",
            "string_agg"(("project"."id")::"text", ', '::"text" ORDER BY "project"."eliminado_en" DESC, ("project"."id")::"text") AS "proyectos_ids"
           FROM "public"."projects" "project"
          WHERE ("project"."eliminado_en" IS NOT NULL)
          GROUP BY "project"."cliente_id", "project"."organization_id"
        ), "deleted_quotes" AS (
         SELECT "project"."cliente_id",
            "quote"."organization_id",
            ("count"(*))::integer AS "cotizaciones_eliminadas",
            "string_agg"(COALESCE("quote"."numero", ('COT-'::"text" || ("quote"."id")::"text")), ', '::"text" ORDER BY "quote"."eliminado_en" DESC, ("quote"."id")::"text") AS "cotizaciones_codigos"
           FROM ("public"."cotizaciones" "quote"
             JOIN "public"."projects" "project" ON ((("project"."id" = "quote"."proyecto_id") AND ("project"."organization_id" = "quote"."organization_id"))))
          WHERE (("quote"."eliminado_en" IS NOT NULL) AND ("project"."cliente_id" IS NOT NULL))
          GROUP BY "project"."cliente_id", "quote"."organization_id"
        )
 SELECT "client"."id" AS "cliente_id",
    "client"."organization_id",
    "client"."nombre" AS "cliente_nombre",
    "client"."telefono" AS "cliente_telefono",
    "client"."direccion" AS "cliente_direccion",
    "client"."correo" AS "cliente_correo",
    "client"."creado_en" AS "cliente_creado_en",
    "client"."actualizado_en" AS "cliente_actualizado_en",
    "client"."eliminado_en" AS "cliente_eliminado_en",
    COALESCE("deleted_projects"."proyectos_eliminados", 0) AS "proyectos_eliminados",
    COALESCE("deleted_quotes"."cotizaciones_eliminadas", 0) AS "cotizaciones_eliminadas",
    "deleted_projects"."proyectos_ids",
    "deleted_quotes"."cotizaciones_codigos"
   FROM (("public"."clients" "client"
     LEFT JOIN "deleted_projects" ON ((("deleted_projects"."cliente_id" = "client"."id") AND ("deleted_projects"."organization_id" = "client"."organization_id"))))
     LEFT JOIN "deleted_quotes" ON ((("deleted_quotes"."cliente_id" = "client"."id") AND ("deleted_quotes"."organization_id" = "client"."organization_id"))))
  WHERE (("client"."eliminado_en" IS NOT NULL) AND ("client"."organization_id" = "public"."get_org_id"()));


ALTER VIEW "public"."admin_clientes_eliminados" OWNER TO "postgres";


ALTER TABLE "public"."clients" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."clients_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."configuration_materials" (
    "id" bigint NOT NULL,
    "configuration_id" bigint NOT NULL,
    "material_id" bigint NOT NULL,
    "rol_material" "text",
    "formula" "text",
    "merma_pct" numeric DEFAULT 0,
    "requerido" boolean DEFAULT true,
    "orden" integer DEFAULT 0,
    "creado_en" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."configuration_materials" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."configuration_materials_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."configuration_materials_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."configuration_materials_id_seq" OWNED BY "public"."configuration_materials"."id";



CREATE TABLE IF NOT EXISTS "public"."cotizacion_code_counters" (
    "organization_id" bigint NOT NULL,
    "quote_date" "date" NOT NULL,
    "last_number" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."cotizacion_code_counters" OWNER TO "postgres";


COMMENT ON TABLE "public"."cotizacion_code_counters" IS 'Contador diario por organizacion para generar codigos comerciales de cotizacion legibles.';



COMMENT ON COLUMN "public"."cotizacion_code_counters"."quote_date" IS 'Fecha base del correlativo diario del codigo de cotizacion.';



COMMENT ON COLUMN "public"."cotizacion_code_counters"."last_number" IS 'Ultimo correlativo emitido para la organizacion en esa fecha.';



CREATE TABLE IF NOT EXISTS "public"."cotizacion_item_visual_configs" (
    "id" bigint NOT NULL,
    "organization_id" bigint NOT NULL,
    "cotizacion_item_id" bigint NOT NULL,
    "schema_version" integer DEFAULT 1 NOT NULL,
    "config_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "svg_markup" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado_en" timestamp with time zone,
    CONSTRAINT "cotizacion_item_visual_configs_schema_version_positive" CHECK (("schema_version" > 0))
);


ALTER TABLE "public"."cotizacion_item_visual_configs" OWNER TO "postgres";


ALTER TABLE "public"."cotizacion_item_visual_configs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cotizacion_item_visual_configs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cotizacion_items" (
    "id" bigint NOT NULL,
    "cotizacion_id" bigint NOT NULL,
    "cantidad" integer NOT NULL,
    "precio_unitario" numeric NOT NULL,
    "subtotal" numeric NOT NULL,
    "organization_id" bigint NOT NULL,
    "ancho" numeric,
    "alto" numeric,
    "area_m2" numeric,
    "linea" "text",
    "color" "text",
    "vidrio" "text",
    "nombre" "text",
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone,
    "descripcion" "text",
    "unidad" "text",
    "observaciones" "text",
    "tipo_item" "text",
    "creado_en" timestamp without time zone DEFAULT "now"(),
    "product_type_id" bigint,
    "system_line_id" bigint,
    "configuration_id" bigint,
    "costo_unitario" numeric,
    "costo_total" numeric,
    "margen_pct" numeric,
    "utilidad" numeric,
    "codigo" "text",
    "tipo_componente" "text",
    "orden" integer,
    "fabricacion_snapshot" "jsonb",
    CONSTRAINT "cotizacion_items_fabricacion_snapshot_object_chk" CHECK ((("fabricacion_snapshot" IS NULL) OR ("jsonb_typeof"("fabricacion_snapshot") = 'object'::"text")))
);


ALTER TABLE "public"."cotizacion_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cotizacion_items"."codigo" IS 'Codigo comercial del componente, por ejemplo V1 o P1.';



COMMENT ON COLUMN "public"."cotizacion_items"."tipo_componente" IS 'Tipo comercial del componente, por ejemplo ventana, puerta o cierre.';



COMMENT ON COLUMN "public"."cotizacion_items"."orden" IS 'Orden visual del componente dentro de la cotizacion.';



COMMENT ON COLUMN "public"."cotizacion_items"."fabricacion_snapshot" IS 'Snapshot JSONB inmutable de cubicacion/pauta calculado con recetas de fabricacion validadas. No usar para precios comerciales.';



CREATE TABLE IF NOT EXISTS "public"."cotizacion_line_templates" (
    "id" bigint NOT NULL,
    "organization_id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "precio_m2_sugerido" numeric(12,2) DEFAULT 0 NOT NULL,
    "minimo_cobrable" numeric(12,2) DEFAULT 0 NOT NULL,
    "redondeo_precio" numeric(12,2) DEFAULT 1000 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado_en" timestamp with time zone,
    "material" "text" DEFAULT 'Aluminio'::"text" NOT NULL,
    "vidrio_principal_recomendado" "text",
    "categoria" "text" DEFAULT 'aluminio'::"text" NOT NULL,
    "unidad_cobro" "text" DEFAULT 'm2'::"text" NOT NULL,
    "costo_base" numeric(12,2) DEFAULT 0 NOT NULL,
    "merma_pct" numeric(7,4) DEFAULT 0 NOT NULL,
    "margen_objetivo_pct" numeric(7,4),
    "proveedor" "text",
    "vigencia_desde" "date",
    "vigencia_hasta" "date",
    "catalog_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "cotizacion_line_templates_catalog_costs_nonnegative" CHECK ((("costo_base" >= (0)::numeric) AND ("merma_pct" >= (0)::numeric) AND (("margen_objetivo_pct" IS NULL) OR (("margen_objetivo_pct" >= (0)::numeric) AND ("margen_objetivo_pct" < (100)::numeric))))),
    CONSTRAINT "cotizacion_line_templates_categoria_check" CHECK (("categoria" = ANY (ARRAY['aluminio'::"text", 'pvc'::"text", 'vidrio'::"text", 'shower'::"text", 'accesorios'::"text", 'otros'::"text"]))),
    CONSTRAINT "cotizacion_line_templates_material_check" CHECK (("material" = ANY (ARRAY['Aluminio'::"text", 'PVC'::"text", 'Cristal'::"text"]))),
    CONSTRAINT "cotizacion_line_templates_unidad_cobro_check" CHECK (("unidad_cobro" = ANY (ARRAY['m2'::"text", 'metro_lineal'::"text", 'unidad'::"text", 'valor_manual'::"text"])))
);


ALTER TABLE "public"."cotizacion_line_templates" OWNER TO "postgres";


ALTER TABLE "public"."cotizacion_line_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cotizacion_line_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fabrication_recipe_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "organization_id" bigint,
    "name" "text" NOT NULL,
    "input" "jsonb" NOT NULL,
    "expected_output" "jsonb" NOT NULL,
    "actual_output" "jsonb",
    "passed" boolean DEFAULT false NOT NULL,
    "validated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado_en" timestamp with time zone,
    "is_required" boolean DEFAULT true NOT NULL,
    CONSTRAINT "fabrication_recipe_tests_actual_output_object_check" CHECK ((("actual_output" IS NULL) OR ("jsonb_typeof"("actual_output") = 'object'::"text"))),
    CONSTRAINT "fabrication_recipe_tests_expected_output_object_check" CHECK (("jsonb_typeof"("expected_output") = 'object'::"text")),
    CONSTRAINT "fabrication_recipe_tests_input_object_check" CHECK (("jsonb_typeof"("input") = 'object'::"text"))
);


ALTER TABLE "public"."fabrication_recipe_tests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."fabrication_recipe_tests"."is_required" IS 'Indica si el caso debe pasar para permitir validar la receta.';



CREATE TABLE IF NOT EXISTS "public"."fabrication_recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" bigint,
    "line_template_id" bigint,
    "scope" "text" NOT NULL,
    "provider_name" "text" DEFAULT ''::"text" NOT NULL,
    "line_name" "text" DEFAULT ''::"text" NOT NULL,
    "typology" "text" NOT NULL,
    "leaves_count" integer,
    "variant" "text",
    "version" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "definition" "jsonb" NOT NULL,
    "source_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "source_reference" "text",
    "parent_recipe_id" "uuid",
    "validated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado_en" timestamp with time zone,
    "validated_by" "uuid",
    CONSTRAINT "fabrication_recipes_definition_object_check" CHECK (("jsonb_typeof"("definition") = 'object'::"text")),
    CONSTRAINT "fabrication_recipes_leaves_count_positive_check" CHECK ((("leaves_count" IS NULL) OR ("leaves_count" > 0))),
    CONSTRAINT "fabrication_recipes_scope_check" CHECK (("scope" = ANY (ARRAY['ventora'::"text", 'organization'::"text"]))),
    CONSTRAINT "fabrication_recipes_scope_organization_check" CHECK (((("scope" = 'ventora'::"text") AND ("organization_id" IS NULL)) OR (("scope" = 'organization'::"text") AND ("organization_id" IS NOT NULL)))),
    CONSTRAINT "fabrication_recipes_source_type_check" CHECK (("source_type" = ANY (ARRAY['manual'::"text", 'copied'::"text", 'imported_ai'::"text", 'legacy'::"text"]))),
    CONSTRAINT "fabrication_recipes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'testing'::"text", 'validated'::"text", 'review_required'::"text", 'archived'::"text"]))),
    CONSTRAINT "fabrication_recipes_version_positive_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."fabrication_recipes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."fabrication_recipes"."validated_by" IS 'Usuario autenticado que valido esta version de receta.';



CREATE TABLE IF NOT EXISTS "public"."formula_variables" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "ejemplo" "text",
    "creado_en" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."formula_variables" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."formula_variables_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."formula_variables_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."formula_variables_id_seq" OWNED BY "public"."formula_variables"."id";



CREATE TABLE IF NOT EXISTS "public"."growth_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "prospect_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "canal" "text",
    "contenido" "text",
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "creado_por_auth_user_id" "uuid",
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "eliminado_en" timestamp with time zone,
    CONSTRAINT "growth_activities_tipo_check" CHECK (("tipo" = ANY (ARRAY['nota'::"text", 'mensaje_enviado'::"text", 'respuesta'::"text", 'followup'::"text", 'demo'::"text", 'trial'::"text", 'activacion'::"text", 'pago'::"text", 'perdida'::"text", 'cambio_estado'::"text"])))
);

ALTER TABLE ONLY "public"."growth_activities" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."growth_prospects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "legacy_source_id" "text",
    "empresa" "text" NOT NULL,
    "contacto_nombre" "text",
    "telefono" "text",
    "correo" "text",
    "instagram_url" "text",
    "sitio_web" "text",
    "ciudad" "text",
    "region" "text",
    "rubro" "text",
    "fuente" "text" DEFAULT 'manual'::"text" NOT NULL,
    "segmento" "text",
    "senal_dolor" "text",
    "resumen_personalizacion" "text",
    "puntaje_prioridad" integer DEFAULT 0 NOT NULL,
    "estado" "text" DEFAULT 'nuevo'::"text" NOT NULL,
    "ultimo_contacto_en" timestamp with time zone,
    "proxima_accion_en" timestamp with time zone,
    "proxima_accion_tipo" "text",
    "converted_organization_id" bigint,
    "motivo_perdida" "text",
    "no_contactar" boolean DEFAULT false NOT NULL,
    "data_status" "text" DEFAULT 'real'::"text" NOT NULL,
    "creado_por_auth_user_id" "uuid",
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "eliminado_en" timestamp with time zone,
    CONSTRAINT "growth_prospects_data_status_check" CHECK (("data_status" = ANY (ARRAY['real'::"text", 'manual'::"text", 'mock'::"text"]))),
    CONSTRAINT "growth_prospects_estado_check" CHECK (("estado" = ANY (ARRAY['nuevo'::"text", 'investigado'::"text", 'listo_para_contactar'::"text", 'contactado'::"text", 'respondio'::"text", 'calificado'::"text", 'demo_agendada'::"text", 'piloto_activo'::"text", 'activado'::"text", 'pagado'::"text", 'sin_respuesta'::"text", 'no_calza'::"text", 'no_contactar'::"text"])))
);

ALTER TABLE ONLY "public"."growth_prospects" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_prospects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."growth_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "prospect_id" "uuid",
    "titulo" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "prioridad" "text" DEFAULT 'media'::"text" NOT NULL,
    "vence_en" timestamp with time zone,
    "completada_en" timestamp with time zone,
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "creado_por_auth_user_id" "uuid",
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "eliminado_en" timestamp with time zone,
    CONSTRAINT "growth_tasks_prioridad_check" CHECK (("prioridad" = ANY (ARRAY['alta'::"text", 'media'::"text", 'baja'::"text"]))),
    CONSTRAINT "growth_tasks_tipo_check" CHECK (("tipo" = ANY (ARRAY['contactar'::"text", 'followup'::"text", 'demo'::"text", 'activar_trial'::"text", 'recuperar_pago'::"text", 'revisar'::"text", 'otro'::"text"])))
);

ALTER TABLE ONLY "public"."growth_tasks" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."growth_workspace_members" (
    "workspace_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "rol" "text" DEFAULT 'admin'::"text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "growth_workspace_members_rol_check" CHECK (("rol" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);

ALTER TABLE ONLY "public"."growth_workspace_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."growth_workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "configuracion_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metricas_manuales_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "experimentos_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "eliminado_en" timestamp with time zone
);

ALTER TABLE ONLY "public"."growth_workspaces" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_workspaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historial_precios" (
    "id" bigint NOT NULL,
    "material_id" bigint,
    "precio" numeric NOT NULL,
    "fecha" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "precio_anterior" numeric,
    "cambiado_por" bigint,
    "organization_id" bigint NOT NULL
);


ALTER TABLE "public"."historial_precios" OWNER TO "postgres";


ALTER TABLE "public"."historial_precios" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."historial_precios_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."labor_costs" (
    "id" bigint NOT NULL,
    "organization_id" bigint NOT NULL,
    "nombre" "text",
    "tipo" "text",
    "monto" numeric,
    "unidad" "text" DEFAULT 'unit'::"text",
    "activo" boolean DEFAULT true,
    "creado_en" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."labor_costs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."labor_costs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."labor_costs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."labor_costs_id_seq" OWNED BY "public"."labor_costs"."id";



CREATE TABLE IF NOT EXISTS "public"."line_glass_compatibility" (
    "id" bigint NOT NULL,
    "system_line_id" bigint NOT NULL,
    "permitido" boolean DEFAULT true,
    "recomendado" boolean DEFAULT false,
    "creado_en" timestamp without time zone DEFAULT "now"(),
    "glass_material_id" bigint NOT NULL
);


ALTER TABLE "public"."line_glass_compatibility" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."line_glass_compatibility_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."line_glass_compatibility_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."line_glass_compatibility_id_seq" OWNED BY "public"."line_glass_compatibility"."id";



CREATE TABLE IF NOT EXISTS "public"."material_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."material_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "costo" numeric NOT NULL,
    "inventario" integer NOT NULL,
    "organization_id" bigint NOT NULL,
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "unidad" "text",
    "categoria" "text",
    "precio_venta" numeric,
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone,
    "material_type_id" "uuid"
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


ALTER TABLE "public"."materials" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."materials_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."onboarding_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" bigint NOT NULL,
    "step_key" "text" NOT NULL,
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "completed_by_user_id" bigint,
    "completion_source" "text",
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado_en" timestamp with time zone,
    CONSTRAINT "onboarding_checklists_estado_check" CHECK (("estado" = ANY (ARRAY['pendiente'::"text", 'en_progreso'::"text", 'completado'::"text", 'omitido'::"text"]))),
    CONSTRAINT "onboarding_checklists_step_key_check" CHECK (("step_key" = ANY (ARRAY['company_ready'::"text", 'public_page_live'::"text", 'channel_ready'::"text", 'first_lead'::"text", 'first_quote'::"text", 'first_share'::"text", 'activation_complete'::"text"])))
);


ALTER TABLE "public"."onboarding_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_profile" (
    "organization_id" bigint NOT NULL,
    "empresa_nombre" "text",
    "empresa_logo_url" "text",
    "empresa_direccion" "text",
    "empresa_telefono" "text",
    "empresa_email" "text",
    "brand_color" "text" DEFAULT '#1a3a5c'::"text" NOT NULL,
    "forma_pago" "text",
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "proveedor_preferido" "text",
    "modo_precio_preferido" "text" DEFAULT 'margen'::"text" NOT NULL,
    "margen_defecto" numeric DEFAULT 100,
    "solicitud_publica_slug" "text",
    "solicitud_publica_valor" "text",
    "solicitud_publica_privacidad" "text",
    "solicitud_publica_descripcion_corta" "text",
    "solicitud_publica_mensaje_confianza" "text",
    "solicitud_publica_horario_desde" "text",
    "solicitud_publica_horario_hasta" "text",
    "solicitud_publica_dias_atencion" "text",
    "public_name" "text",
    "public_subtitle" "text",
    "public_zone" "text",
    "public_business_type" "text",
    "secondary_color" "text",
    "hero_mode" "text" DEFAULT 'gradient'::"text" NOT NULL,
    "hero_image_url" "text",
    "hero_title" "text",
    "hero_subtitle" "text",
    "show_gallery" boolean DEFAULT true NOT NULL,
    "show_schedule" boolean DEFAULT true NOT NULL,
    "show_rating" boolean DEFAULT false NOT NULL,
    "rating_label" "text",
    "jobs_count_label" "text",
    "form_title" "text",
    "form_subtitle" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "solicitud_publica_horario_por_dia" "jsonb",
    "instagram_url" "text",
    "facebook_url" "text",
    "tiktok_url" "text",
    "website_url" "text",
    "public_services" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "final_cta_title" "text",
    "final_cta_subtitle" "text",
    "final_cta_label" "text",
    "business_hours_note" "text",
    "subscription_status" "text" DEFAULT 'trial_active'::"text" NOT NULL,
    "trial_started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "trial_ends_at" timestamp with time zone DEFAULT ("timezone"('utc'::"text", "now"()) + '15 days'::interval) NOT NULL,
    "subscription_started_at" timestamp with time zone,
    "subscription_ends_at" timestamp with time zone,
    "plan_type" "text" DEFAULT 'trial'::"text" NOT NULL,
    "billing_period" "text" DEFAULT 'none'::"text" NOT NULL,
    "payment_method" "text" DEFAULT 'none'::"text" NOT NULL,
    "last_payment_at" timestamp with time zone,
    "founder_price_locked" boolean DEFAULT false NOT NULL,
    "plan_code" "text" DEFAULT 'trial'::"text" NOT NULL,
    "is_test_account" boolean DEFAULT false NOT NULL,
    "responsable_comercial" "text",
    "country_code" "text" DEFAULT 'CL'::"text" NOT NULL,
    "currency_code" "text" DEFAULT 'CLP'::"text" NOT NULL,
    "locale" "text" DEFAULT 'es-CL'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'America/Santiago'::"text" NOT NULL,
    "phone_country_code" "text" DEFAULT '+56'::"text" NOT NULL,
    "tax_label" "text" DEFAULT 'IVA'::"text" NOT NULL,
    "tax_rate_default" numeric(5,2) DEFAULT 19 NOT NULL,
    "tax_id_label" "text" DEFAULT 'RUT'::"text" NOT NULL,
    CONSTRAINT "organization_profile_billing_period_check" CHECK (("billing_period" = ANY (ARRAY['monthly'::"text", 'yearly'::"text", 'none'::"text"]))),
    CONSTRAINT "organization_profile_country_code_check" CHECK (("country_code" = ANY (ARRAY['CL'::"text", 'AR'::"text", 'CO'::"text", 'MX'::"text", 'PE'::"text", 'UY'::"text"]))),
    CONSTRAINT "organization_profile_currency_code_check" CHECK (("currency_code" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "organization_profile_hero_mode_check" CHECK (("hero_mode" = ANY (ARRAY['image'::"text", 'gradient'::"text"]))),
    CONSTRAINT "organization_profile_locale_check" CHECK (("locale" ~ '^[a-z]{2}-[A-Z]{2}$'::"text")),
    CONSTRAINT "organization_profile_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['mercadopago'::"text", 'manual_transfer'::"text", 'manual_other'::"text", 'none'::"text", 'flow'::"text", 'webpay_plus'::"text"]))),
    CONSTRAINT "organization_profile_phone_country_code_check" CHECK (("phone_country_code" ~ '^\+[1-9][0-9]{0,3}$'::"text")),
    CONSTRAINT "organization_profile_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['trial'::"text", 'founder_full'::"text", 'quote_only'::"text"]))),
    CONSTRAINT "organization_profile_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['trial'::"text", 'monthly'::"text", 'yearly'::"text", 'founder'::"text"]))),
    CONSTRAINT "organization_profile_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['trial_active'::"text", 'trial_expiring'::"text", 'trial_expired'::"text", 'active'::"text", 'past_due'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "organization_profile_tax_rate_default_check" CHECK ((("tax_rate_default" >= (0)::numeric) AND ("tax_rate_default" <= (100)::numeric)))
);


ALTER TABLE "public"."organization_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_profile" IS 'Perfil comercial de la organizacion para branding del PDF y datos de contacto.';



COMMENT ON COLUMN "public"."organization_profile"."brand_color" IS 'Color principal de marca en formato hex. Si no existe, el sistema usa #1a3a5c.';



COMMENT ON COLUMN "public"."organization_profile"."forma_pago" IS 'Texto libre de condiciones de pago para mostrar en el PDF.';



COMMENT ON COLUMN "public"."organization_profile"."proveedor_preferido" IS 'Proveedor principal de la organizacion para sugerencias rapidas al crear componentes.';



COMMENT ON COLUMN "public"."organization_profile"."modo_precio_preferido" IS 'Define si la empresa trabaja por defecto con margen de ganancia o con precio directo por componente.';



COMMENT ON COLUMN "public"."organization_profile"."margen_defecto" IS 'Margen de ganancia sugerido por defecto para nuevas cotizaciones y componentes.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_slug" IS 'Identificador publico de la ruta /solicitud/[slug] para captar prospectos por organizacion.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_valor" IS 'Mensaje breve que explica que obtiene el prospecto al dejar su solicitud.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_privacidad" IS 'Mensaje breve de privacidad para la solicitud publica de la organizacion.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_descripcion_corta" IS 'Descripcion corta principal de la mini-landing publica de solicitud.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_mensaje_confianza" IS 'Mensaje breve de confianza para reforzar respuesta, seriedad o seguimiento comercial.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_horario_desde" IS 'Hora de inicio de atencion comercial para mostrar estado ON/OFF en la landing publica. Formato HH:MM.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_horario_hasta" IS 'Hora de cierre de atencion comercial para mostrar estado ON/OFF en la landing publica. Formato HH:MM.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_dias_atencion" IS 'Dias de atencion comercial en formato CSV usando 0=domingo a 6=sabado. Ej: 1,2,3,4,5,6.';



COMMENT ON COLUMN "public"."organization_profile"."public_name" IS 'Nombre comercial visible en la landing publica. Si es NULL, se usa empresa_nombre.';



COMMENT ON COLUMN "public"."organization_profile"."public_subtitle" IS 'Rubro o especialidad visible en la landing (ej: Vidrios y aluminio).';



COMMENT ON COLUMN "public"."organization_profile"."public_zone" IS 'Zona o cobertura geografica visible en la landing.';



COMMENT ON COLUMN "public"."organization_profile"."public_business_type" IS 'Tipo de negocio: vidrios, aluminio, ambos, etc.';



COMMENT ON COLUMN "public"."organization_profile"."secondary_color" IS 'Color secundario en formato hex para la landing. Si es NULL, se usa verde WhatsApp (#25d366).';



COMMENT ON COLUMN "public"."organization_profile"."hero_mode" IS 'Modo del hero: image o gradient. Default: gradient.';



COMMENT ON COLUMN "public"."organization_profile"."hero_image_url" IS 'URL de la imagen hero de la landing. Si hero_mode=image y esto es NULL, se muestra degradado.';



COMMENT ON COLUMN "public"."organization_profile"."hero_title" IS 'Titulo principal del hero. Si es NULL, se usa un default.';



COMMENT ON COLUMN "public"."organization_profile"."hero_subtitle" IS 'Subtitulo del hero de la landing.';



COMMENT ON COLUMN "public"."organization_profile"."show_gallery" IS 'Si true, se muestra la galeria de fotos en la landing.';



COMMENT ON COLUMN "public"."organization_profile"."show_schedule" IS 'Si true, se muestra el horario en la landing.';



COMMENT ON COLUMN "public"."organization_profile"."show_rating" IS 'Si true, se muestra el rating en la landing.';



COMMENT ON COLUMN "public"."organization_profile"."rating_label" IS 'Texto de rating visible (ej: 4.9/5 en Google).';



COMMENT ON COLUMN "public"."organization_profile"."jobs_count_label" IS 'Texto de cantidad de trabajos (ej: +200 trabajos realizados).';



COMMENT ON COLUMN "public"."organization_profile"."form_title" IS 'Titulo del formulario de solicitud en la landing.';



COMMENT ON COLUMN "public"."organization_profile"."form_subtitle" IS 'Subtitulo del formulario de solicitud.';



COMMENT ON COLUMN "public"."organization_profile"."is_published" IS 'Si true, la landing esta publicada y visible con configuracion custom. Si false, se muestra version basica.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_horario_por_dia" IS 'Horario visible por dia de la semana para la landing publica. Cada item guarda day, enabled, from y to.';



COMMENT ON COLUMN "public"."organization_profile"."subscription_status" IS 'Estado de suscripcion efectivo persistido para trial y activacion manual.';



COMMENT ON COLUMN "public"."organization_profile"."trial_started_at" IS 'Fecha de inicio de prueba gratuita de la organizacion.';



COMMENT ON COLUMN "public"."organization_profile"."trial_ends_at" IS 'Fecha de termino de prueba gratuita de 15 dias para altas nuevas.';



COMMENT ON COLUMN "public"."organization_profile"."subscription_started_at" IS 'Fecha de inicio manual del plan activo.';



COMMENT ON COLUMN "public"."organization_profile"."subscription_ends_at" IS 'Fecha de termino manual del plan activo. Puede ser NULL para founder activo.';



COMMENT ON COLUMN "public"."organization_profile"."plan_type" IS 'Plan comercial activo o trial de la organizacion.';



COMMENT ON COLUMN "public"."organization_profile"."billing_period" IS 'Periodicidad de cobro manual de la cuenta.';



COMMENT ON COLUMN "public"."organization_profile"."payment_method" IS 'Metodo de pago manual informado para la cuenta.';



COMMENT ON COLUMN "public"."organization_profile"."last_payment_at" IS 'Ultimo pago manual registrado para la cuenta.';



COMMENT ON COLUMN "public"."organization_profile"."founder_price_locked" IS 'Si true, la organizacion mantiene precio founder sin reajuste. Org 3 y 4 son cuentas internas gratis permanentes de Ventora.';



COMMENT ON COLUMN "public"."organization_profile"."plan_code" IS 'Plan comercial: trial, founder_full o quote_only. Reemplaza progresivamente a plan_type.';



COMMENT ON COLUMN "public"."organization_profile"."is_test_account" IS 'Si true, la organizacion es una cuenta de prueba interna y debe excluirse de metricas comerciales reales.';



COMMENT ON COLUMN "public"."organization_profile"."responsable_comercial" IS 'Nombre del responsable comercial que aparece en PDF como Cotiza.';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "telefono" "text",
    "direccion" "text",
    "logo_url" "text",
    "plan" "text",
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone,
    "correo" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


ALTER TABLE "public"."organizations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."organizations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pagos_suscripcion" (
    "id" bigint NOT NULL,
    "organization_id" bigint NOT NULL,
    "plan_code" "text" NOT NULL,
    "billing_period" "text" NOT NULL,
    "amount_clp" integer NOT NULL,
    "currency" "text" DEFAULT 'CLP'::"text" NOT NULL,
    "payment_provider" "text" NOT NULL,
    "provider_token" "text",
    "provider_status" "text",
    "provider_response" "jsonb",
    "buy_order" "text" NOT NULL,
    "status" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "period_starts_at" timestamp with time zone,
    "period_ends_at" timestamp with time zone,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado_en" timestamp with time zone,
    "provider_order_id" "text",
    "checkout_url" "text",
    "amount" numeric(14,2) NOT NULL,
    "currency_code" character(3) NOT NULL,
    "subscription_id" bigint,
    "provider_payment_id" "text",
    CONSTRAINT "pagos_suscripcion_amount_clp_check" CHECK (("amount_clp" > 0)),
    CONSTRAINT "pagos_suscripcion_billing_period_check" CHECK (("billing_period" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "pagos_suscripcion_payment_provider_check" CHECK (("payment_provider" = ANY (ARRAY['mercadopago'::"text", 'manual_transfer'::"text", 'manual_other'::"text", 'flow'::"text", 'webpay_plus'::"text"]))),
    CONSTRAINT "pagos_suscripcion_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['founder_full'::"text", 'quote_only'::"text"]))),
    CONSTRAINT "pagos_suscripcion_status_check" CHECK (("status" = ANY (ARRAY['pendiente'::"text", 'aprobado'::"text", 'fallido'::"text", 'cancelado'::"text", 'reembolsado'::"text"])))
);


ALTER TABLE "public"."pagos_suscripcion" OWNER TO "postgres";


COMMENT ON TABLE "public"."pagos_suscripcion" IS 'Pagos de suscripcion procesados por billing provider-agnostic. Inserts y updates solo desde rutas server con service_role; clientes autenticados solo leen su historial por RLS.';



COMMENT ON COLUMN "public"."pagos_suscripcion"."provider_token" IS 'Token de transaccion devuelto por Transbank. Se completa despues de crear la transaccion.';



COMMENT ON COLUMN "public"."pagos_suscripcion"."provider_response" IS 'Respuesta completa de Transbank (confirmacion).';



COMMENT ON COLUMN "public"."pagos_suscripcion"."buy_order" IS 'Orden de compra unica. Sirve como clave de idempotencia.';



COMMENT ON COLUMN "public"."pagos_suscripcion"."provider_order_id" IS 'Identificador de orden externo del provider. En Flow corresponde a flowOrder.';



COMMENT ON COLUMN "public"."pagos_suscripcion"."checkout_url" IS 'URL de checkout generada por el provider. No contiene secretos; se conserva para soporte operativo.';



COMMENT ON COLUMN "public"."pagos_suscripcion"."amount" IS 'Monto neutral del pago. amount_clp se conserva como compatibilidad legacy.';



COMMENT ON COLUMN "public"."pagos_suscripcion"."subscription_id" IS 'Suscripcion recurrente asociada. NULL conserva pagos legacy y activaciones manuales previas.';



ALTER TABLE "public"."pagos_suscripcion" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."pagos_suscripcion_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_types" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "creado_en" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."product_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_types_id_seq" OWNED BY "public"."product_types"."id";



ALTER TABLE "public"."projects" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."public_landing_gallery" (
    "id" bigint NOT NULL,
    "organization_id" bigint NOT NULL,
    "landing_id" bigint,
    "image_url" "text" NOT NULL,
    "label" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "work_title" "text",
    "work_type" "text",
    "work_zone" "text",
    "work_badge" "text"
);


ALTER TABLE "public"."public_landing_gallery" OWNER TO "postgres";


COMMENT ON TABLE "public"."public_landing_gallery" IS 'Fotos de galeria para la landing publica de cada organizacion.';



COMMENT ON COLUMN "public"."public_landing_gallery"."image_url" IS 'URL publica de la imagen almacenada en Supabase Storage.';



COMMENT ON COLUMN "public"."public_landing_gallery"."label" IS 'Etiqueta visible de la foto (ej: Ventana, Shower, Terraza).';



COMMENT ON COLUMN "public"."public_landing_gallery"."sort_order" IS 'Orden visual de la foto dentro de la galeria. Menor = primero.';



COMMENT ON COLUMN "public"."public_landing_gallery"."is_visible" IS 'Si false, la foto no se muestra en la landing publica pero se conserva en la base.';



ALTER TABLE "public"."public_landing_gallery" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."public_landing_gallery_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."public_landing_testimonials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" bigint NOT NULL,
    "nombre_corto" "text",
    "comentario" "text" NOT NULL,
    "estrellas" integer NOT NULL,
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "aprobado_en" timestamp with time zone,
    "ocultado_en" timestamp with time zone,
    CONSTRAINT "public_landing_testimonials_estado_chk" CHECK (("estado" = ANY (ARRAY['pendiente'::"text", 'aprobada'::"text", 'oculta'::"text"]))),
    CONSTRAINT "public_landing_testimonials_estrellas_chk" CHECK ((("estrellas" >= 1) AND ("estrellas" <= 5)))
);


ALTER TABLE "public"."public_landing_testimonials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_item_breakdown" (
    "id" bigint NOT NULL,
    "cotizacion_item_id" bigint NOT NULL,
    "material_id" bigint NOT NULL,
    "descripcion" "text",
    "unidad" "text",
    "cantidad" numeric,
    "costo_unitario" numeric,
    "costo_total" numeric,
    "precio_unitario" numeric,
    "precio_total" numeric,
    "origen" "text",
    "creado_en" timestamp without time zone DEFAULT "now"(),
    "organization_id" bigint NOT NULL
);


ALTER TABLE "public"."quote_item_breakdown" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quote_item_breakdown_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quote_item_breakdown_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quote_item_breakdown_id_seq" OWNED BY "public"."quote_item_breakdown"."id";



ALTER TABLE "public"."cotizacion_items" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."quote_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."cotizaciones" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."quotes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."solicitudes_contacto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "empresa" "text" NOT NULL,
    "correo" "text",
    "telefono" "text",
    "ayuda" "text" NOT NULL,
    "estado" "text" DEFAULT 'nueva'::"text" NOT NULL,
    "origen" "text" DEFAULT 'landing'::"text" NOT NULL,
    "ip" "text",
    "user_agent" "text",
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "organization_id" bigint,
    "contacto" "text",
    "tipo_trabajo" "text",
    "contexto" "text" DEFAULT 'landing'::"text" NOT NULL,
    "mensaje" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "source_url" "text",
    "contactada_at" timestamp with time zone,
    CONSTRAINT "solicitudes_contacto_ayuda_check" CHECK (("ayuda" = ANY (ARRAY['demo'::"text", 'cotizacion'::"text", 'ventas'::"text"]))),
    CONSTRAINT "solicitudes_contacto_contexto_check" CHECK (("contexto" = ANY (ARRAY['landing'::"text", 'empresa-publica'::"text"]))),
    CONSTRAINT "solicitudes_contacto_estado_check" CHECK (("estado" = ANY (ARRAY['nueva'::"text", 'contactada'::"text", 'cerrada'::"text", 'descartada'::"text"])))
);


ALTER TABLE "public"."solicitudes_contacto" OWNER TO "postgres";


COMMENT ON TABLE "public"."solicitudes_contacto" IS 'Leads entrantes desde la landing comercial de Ventora.';



COMMENT ON COLUMN "public"."solicitudes_contacto"."ayuda" IS 'Motivo principal del contacto: demo, cotizacion o ventas.';



COMMENT ON COLUMN "public"."solicitudes_contacto"."organization_id" IS 'Organizacion dueña del lead cuando proviene de una solicitud publica de empresa.';



COMMENT ON COLUMN "public"."solicitudes_contacto"."contacto" IS 'Canal libre de contacto entregado por el prospecto (telefono, WhatsApp o correo).';



COMMENT ON COLUMN "public"."solicitudes_contacto"."tipo_trabajo" IS 'Trabajo que necesita el prospecto cuando llega desde /solicitud/[empresa].';



COMMENT ON COLUMN "public"."solicitudes_contacto"."contexto" IS 'Origen funcional del lead: landing o empresa-publica.';



COMMENT ON COLUMN "public"."solicitudes_contacto"."contactada_at" IS 'Momento en que la solicitud fue marcada como contactada por el equipo comercial.';



CREATE TABLE IF NOT EXISTS "public"."suscripciones_organizacion" (
    "id" bigint NOT NULL,
    "organization_id" bigint NOT NULL,
    "provider" "text" NOT NULL,
    "provider_subscription_id" "text",
    "provider_plan_id" "text",
    "plan_code" "text" NOT NULL,
    "billing_period" "text" NOT NULL,
    "country_code" character(2) DEFAULT 'CL'::"bpchar" NOT NULL,
    "currency_code" character(3) DEFAULT 'CLP'::"bpchar" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_status" "text",
    "current_period_starts_at" timestamp with time zone,
    "current_period_ends_at" timestamp with time zone,
    "next_payment_at" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "cancelled_at" timestamp with time zone,
    "external_reference" "text" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "eliminado_en" timestamp with time zone,
    CONSTRAINT "suscripciones_organizacion_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "suscripciones_organizacion_billing_period_check" CHECK (("billing_period" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "suscripciones_organizacion_country_code_check" CHECK (((("country_code")::"text" = "upper"(("country_code")::"text")) AND ("char_length"("country_code") = 2))),
    CONSTRAINT "suscripciones_organizacion_currency_code_check" CHECK (((("currency_code")::"text" = "upper"(("currency_code")::"text")) AND ("char_length"("currency_code") = 3))),
    CONSTRAINT "suscripciones_organizacion_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['founder_full'::"text", 'quote_only'::"text"]))),
    CONSTRAINT "suscripciones_organizacion_provider_check" CHECK (("provider" = ANY (ARRAY['mercadopago'::"text", 'webpay_plus'::"text", 'flow'::"text", 'manual'::"text"]))),
    CONSTRAINT "suscripciones_organizacion_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'paused'::"text", 'past_due'::"text", 'cancelled'::"text"])))
);

ALTER TABLE ONLY "public"."suscripciones_organizacion" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."suscripciones_organizacion" OWNER TO "postgres";


COMMENT ON TABLE "public"."suscripciones_organizacion" IS 'Suscripcion recurrente neutral por organizacion. Solo el servidor escribe; cada tenant puede leer la propia.';



COMMENT ON COLUMN "public"."suscripciones_organizacion"."external_reference" IS 'Referencia estable e idempotente generada por Ventora, sin datos personales.';



ALTER TABLE "public"."suscripciones_organizacion" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."suscripciones_organizacion_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."system_configurations" (
    "id" bigint NOT NULL,
    "organization_id" bigint,
    "product_type_id" bigint,
    "system_line_id" bigint,
    "nombre" "text",
    "descripcion" "text",
    "hojas" integer,
    "activo" boolean DEFAULT true,
    "creado_en" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_configurations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."system_configurations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."system_configurations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."system_configurations_id_seq" OWNED BY "public"."system_configurations"."id";



CREATE TABLE IF NOT EXISTS "public"."system_lines" (
    "id" bigint NOT NULL,
    "organization_id" bigint,
    "nombre" "text" NOT NULL,
    "material_base" "text",
    "tipo_apertura" "text",
    "espesor_max_vidrio_mm" numeric,
    "descripcion" "text",
    "creado_en" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_lines" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."system_lines_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."system_lines_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."system_lines_id_seq" OWNED BY "public"."system_lines"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint NOT NULL,
    "correo" "text" NOT NULL,
    "organization_id" bigint NOT NULL,
    "rol" "text" NOT NULL,
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone,
    "auth_user_id" "uuid",
    "created_by_admin" boolean DEFAULT false NOT NULL,
    "must_change_password" boolean DEFAULT false NOT NULL,
    "account_setup_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "account_delivered_at" timestamp with time zone,
    "password_changed_at" timestamp with time zone,
    "nombre" "text",
    "whatsapp" "text",
    "ciudad_comuna" "text",
    "data_sharing_accepted_at" timestamp with time zone,
    CONSTRAINT "users_account_setup_status_check" CHECK (("account_setup_status" = ANY (ARRAY['configuring'::"text", 'delivered'::"text", 'active'::"text"]))),
    CONSTRAINT "users_ciudad_comuna_length_check" CHECK ((("ciudad_comuna" IS NULL) OR (("char_length"("ciudad_comuna") >= 2) AND ("char_length"("ciudad_comuna") <= 120)))),
    CONSTRAINT "users_nombre_length_check" CHECK ((("nombre" IS NULL) OR (("char_length"("nombre") >= 2) AND ("char_length"("nombre") <= 120)))),
    CONSTRAINT "users_whatsapp_e164_check" CHECK ((("whatsapp" IS NULL) OR ("whatsapp" ~ '^\+[1-9][0-9]{7,14}$'::"text")))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."created_by_admin" IS 'True when the account was provisioned by the founder admin panel.';



COMMENT ON COLUMN "public"."users"."must_change_password" IS 'When true, the user must set a new password before using the app.';



COMMENT ON COLUMN "public"."users"."account_setup_status" IS 'Founder setup lifecycle: configuring, delivered, active.';



COMMENT ON COLUMN "public"."users"."account_delivered_at" IS 'Timestamp when the founder marked the account as delivered to the client.';



COMMENT ON COLUMN "public"."users"."password_changed_at" IS 'Timestamp when the user last set their password in-app.';



COMMENT ON COLUMN "public"."users"."nombre" IS 'Nombre personal privado del usuario SaaS.';



COMMENT ON COLUMN "public"."users"."whatsapp" IS 'WhatsApp privado del usuario SaaS normalizado como +569XXXXXXXX.';



COMMENT ON COLUMN "public"."users"."ciudad_comuna" IS 'Ciudad o comuna privada informada por el usuario SaaS.';



COMMENT ON COLUMN "public"."users"."data_sharing_accepted_at" IS 'Consentimiento para crear la cuenta y recibir contacto directo de soporte o comercial. No incluye campanas masivas.';



ALTER TABLE "public"."users" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."web_push_subscriptions" (
    "id" bigint NOT NULL,
    "organization_id" bigint NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "subscription" "jsonb" NOT NULL,
    "user_email" "text",
    "user_agent" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."web_push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."web_push_subscriptions" IS 'Subscriptions Web Push para dispositivos Android PWA de las organizaciones.';



ALTER TABLE "public"."web_push_subscriptions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."web_push_subscriptions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."configuration_materials" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."configuration_materials_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."formula_variables" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."formula_variables_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."labor_costs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."labor_costs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."line_glass_compatibility" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."line_glass_compatibility_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quote_item_breakdown" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_item_breakdown_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."system_configurations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."system_configurations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."system_lines" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."system_lines_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuration_materials"
    ADD CONSTRAINT "configuration_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cotizacion_code_counters"
    ADD CONSTRAINT "cotizacion_code_counters_pkey" PRIMARY KEY ("organization_id", "quote_date");



ALTER TABLE ONLY "public"."cotizacion_item_visual_configs"
    ADD CONSTRAINT "cotizacion_item_visual_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cotizacion_line_templates"
    ADD CONSTRAINT "cotizacion_line_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabrication_recipe_tests"
    ADD CONSTRAINT "fabrication_recipe_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabrication_recipes"
    ADD CONSTRAINT "fabrication_recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."formula_variables"
    ADD CONSTRAINT "formula_variables_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."formula_variables"
    ADD CONSTRAINT "formula_variables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_activities"
    ADD CONSTRAINT "growth_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_prospects"
    ADD CONSTRAINT "growth_prospects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_tasks"
    ADD CONSTRAINT "growth_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_workspace_members"
    ADD CONSTRAINT "growth_workspace_members_pkey" PRIMARY KEY ("workspace_id", "auth_user_id");



ALTER TABLE ONLY "public"."growth_workspaces"
    ADD CONSTRAINT "growth_workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_workspaces"
    ADD CONSTRAINT "growth_workspaces_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."historial_precios"
    ADD CONSTRAINT "historial_precios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labor_costs"
    ADD CONSTRAINT "labor_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_glass_compatibility"
    ADD CONSTRAINT "line_glass_compatibility_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_types"
    ADD CONSTRAINT "material_types_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."material_types"
    ADD CONSTRAINT "material_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_checklists"
    ADD CONSTRAINT "onboarding_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_profile"
    ADD CONSTRAINT "organization_profile_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos_suscripcion"
    ADD CONSTRAINT "pagos_suscripcion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_types"
    ADD CONSTRAINT "product_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_landing_gallery"
    ADD CONSTRAINT "public_landing_gallery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_landing_testimonials"
    ADD CONSTRAINT "public_landing_testimonials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_item_breakdown"
    ADD CONSTRAINT "quote_item_breakdown_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitudes_contacto"
    ADD CONSTRAINT "solicitudes_contacto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suscripciones_organizacion"
    ADD CONSTRAINT "suscripciones_organizacion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_lines"
    ADD CONSTRAINT "system_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "unique_correo_users" UNIQUE ("correo");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "clients_active_org_estado_manual_idx" ON "public"."clients" USING "btree" ("organization_id", "estado_manual") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "clients_active_org_id_idx" ON "public"."clients" USING "btree" ("organization_id", "id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "clients_active_org_nombre_idx" ON "public"."clients" USING "btree" ("organization_id", "nombre") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "configuration_materials_material_id_idx" ON "public"."configuration_materials" USING "btree" ("material_id");



CREATE UNIQUE INDEX "cotizacion_item_visual_configs_active_item_uidx" ON "public"."cotizacion_item_visual_configs" USING "btree" ("cotizacion_item_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizacion_item_visual_configs_org_idx" ON "public"."cotizacion_item_visual_configs" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizacion_items_active_org_quote_order_idx" ON "public"."cotizacion_items" USING "btree" ("organization_id", "cotizacion_id", "orden", "creado_en") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizacion_items_configuration_id_idx" ON "public"."cotizacion_items" USING "btree" ("configuration_id");



CREATE INDEX "cotizacion_items_cotizacion_id_orden_idx" ON "public"."cotizacion_items" USING "btree" ("cotizacion_id", "orden");



CREATE INDEX "cotizacion_items_fabricacion_snapshot_active_idx" ON "public"."cotizacion_items" USING "btree" ("organization_id", "cotizacion_id") WHERE (("fabricacion_snapshot" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE INDEX "cotizacion_items_product_type_id_idx" ON "public"."cotizacion_items" USING "btree" ("product_type_id");



CREATE INDEX "cotizacion_items_system_line_id_idx" ON "public"."cotizacion_items" USING "btree" ("system_line_id");



CREATE INDEX "cotizacion_line_templates_org_sort_idx" ON "public"."cotizacion_line_templates" USING "btree" ("organization_id", "sort_order", "nombre") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizaciones_active_org_actualizado_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "actualizado_en" DESC) WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizaciones_active_org_creado_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "creado_en" DESC) WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizaciones_active_org_estado_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "estado") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizaciones_active_org_proyecto_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "proyecto_id") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "cotizaciones_approval_token_key" ON "public"."cotizaciones" USING "btree" ("approval_token") WHERE ("approval_token" IS NOT NULL);



CREATE INDEX "cotizaciones_org_deleted_estado_updated_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "eliminado_en", "estado", "actualizado_en" DESC);



CREATE INDEX "cotizaciones_org_deleted_updated_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "eliminado_en", "actualizado_en" DESC);



CREATE INDEX "cotizaciones_proyecto_id_idx" ON "public"."cotizaciones" USING "btree" ("proyecto_id");



CREATE INDEX "fabrication_recipe_tests_org_idx" ON "public"."fabrication_recipe_tests" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "fabrication_recipe_tests_passed_idx" ON "public"."fabrication_recipe_tests" USING "btree" ("recipe_id", "passed") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "fabrication_recipe_tests_recipe_idx" ON "public"."fabrication_recipe_tests" USING "btree" ("recipe_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "fabrication_recipes_line_template_idx" ON "public"."fabrication_recipes" USING "btree" ("line_template_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "fabrication_recipes_org_idx" ON "public"."fabrication_recipes" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "fabrication_recipes_parent_idx" ON "public"."fabrication_recipes" USING "btree" ("parent_recipe_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "fabrication_recipes_scope_idx" ON "public"."fabrication_recipes" USING "btree" ("scope") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "fabrication_recipes_status_idx" ON "public"."fabrication_recipes" USING "btree" ("status") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "growth_activities_prospect_idx" ON "public"."growth_activities" USING "btree" ("prospect_id", "creado_en" DESC) WHERE ("eliminado_en" IS NULL);



CREATE INDEX "growth_prospects_workspace_active_idx" ON "public"."growth_prospects" USING "btree" ("workspace_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "growth_prospects_workspace_converted_org_idx" ON "public"."growth_prospects" USING "btree" ("workspace_id", "converted_organization_id") WHERE (("converted_organization_id" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE INDEX "growth_prospects_workspace_estado_proxima_idx" ON "public"."growth_prospects" USING "btree" ("workspace_id", "estado", "proxima_accion_en") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "growth_prospects_workspace_legacy_uidx" ON "public"."growth_prospects" USING "btree" ("workspace_id", "legacy_source_id") WHERE (("legacy_source_id" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE INDEX "growth_tasks_workspace_pending_idx" ON "public"."growth_tasks" USING "btree" ("workspace_id", "vence_en") WHERE (("eliminado_en" IS NULL) AND ("completada_en" IS NULL));



CREATE INDEX "growth_workspace_members_auth_user_idx" ON "public"."growth_workspace_members" USING "btree" ("auth_user_id") WHERE ("activo" = true);



CREATE INDEX "historial_precios_cambiado_por_idx" ON "public"."historial_precios" USING "btree" ("cambiado_por");



CREATE INDEX "idx_breakdown_item" ON "public"."quote_item_breakdown" USING "btree" ("cotizacion_item_id");



CREATE INDEX "idx_clients_org" ON "public"."clients" USING "btree" ("organization_id");



CREATE INDEX "idx_config_materials_config" ON "public"."configuration_materials" USING "btree" ("configuration_id");



CREATE INDEX "idx_historial_precios_material_fecha" ON "public"."historial_precios" USING "btree" ("material_id", "fecha" DESC);



CREATE INDEX "idx_historial_precios_org_material_fecha" ON "public"."historial_precios" USING "btree" ("organization_id", "material_id", "fecha" DESC);



CREATE INDEX "idx_items_org_deleted" ON "public"."cotizacion_items" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "idx_items_quote" ON "public"."cotizacion_items" USING "btree" ("cotizacion_id");



CREATE INDEX "idx_line_glass_line" ON "public"."line_glass_compatibility" USING "btree" ("system_line_id");



CREATE INDEX "idx_pagos_suscripcion_org" ON "public"."pagos_suscripcion" USING "btree" ("organization_id");



CREATE INDEX "idx_pagos_suscripcion_provider_token" ON "public"."pagos_suscripcion" USING "btree" ("provider_token");



CREATE INDEX "idx_projects_org" ON "public"."projects" USING "btree" ("organization_id");



CREATE INDEX "idx_projects_org_deleted" ON "public"."projects" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "idx_quotes_org" ON "public"."cotizaciones" USING "btree" ("organization_id");



CREATE INDEX "idx_quotes_org_deleted" ON "public"."cotizaciones" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "labor_costs_organization_id_idx" ON "public"."labor_costs" USING "btree" ("organization_id");



CREATE INDEX "line_glass_compatibility_glass_material_id_idx" ON "public"."line_glass_compatibility" USING "btree" ("glass_material_id");



CREATE INDEX "materials_material_type_id_idx" ON "public"."materials" USING "btree" ("material_type_id");



CREATE INDEX "materials_organization_id_idx" ON "public"."materials" USING "btree" ("organization_id");



CREATE INDEX "onboarding_checklists_completed_by_user_id_idx" ON "public"."onboarding_checklists" USING "btree" ("completed_by_user_id");



CREATE INDEX "onboarding_checklists_org_estado_idx" ON "public"."onboarding_checklists" USING "btree" ("organization_id", "estado") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "onboarding_checklists_org_step_active_idx" ON "public"."onboarding_checklists" USING "btree" ("organization_id", "step_key") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "organization_profile_is_test_account_idx" ON "public"."organization_profile" USING "btree" ("is_test_account") WHERE ("is_test_account" = true);



CREATE UNIQUE INDEX "organization_profile_solicitud_publica_slug_uidx" ON "public"."organization_profile" USING "btree" ("lower"("solicitud_publica_slug")) WHERE (("solicitud_publica_slug" IS NOT NULL) AND ("solicitud_publica_slug" <> ''::"text"));



CREATE UNIQUE INDEX "pagos_suscripcion_buy_order_idx" ON "public"."pagos_suscripcion" USING "btree" ("buy_order") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "pagos_suscripcion_org_created_idx" ON "public"."pagos_suscripcion" USING "btree" ("organization_id", "creado_en" DESC) WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "pagos_suscripcion_provider_order_idx" ON "public"."pagos_suscripcion" USING "btree" ("payment_provider", "provider_order_id") WHERE (("provider_order_id" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE UNIQUE INDEX "pagos_suscripcion_provider_payment_uidx" ON "public"."pagos_suscripcion" USING "btree" ("payment_provider", "provider_payment_id") WHERE (("provider_payment_id" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE UNIQUE INDEX "pagos_suscripcion_provider_token_idx" ON "public"."pagos_suscripcion" USING "btree" ("provider_token") WHERE (("provider_token" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE INDEX "pagos_suscripcion_subscription_idx" ON "public"."pagos_suscripcion" USING "btree" ("subscription_id") WHERE (("subscription_id" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE INDEX "projects_active_org_cliente_idx" ON "public"."projects" USING "btree" ("organization_id", "cliente_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "projects_active_org_titulo_idx" ON "public"."projects" USING "btree" ("organization_id", "titulo") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "projects_cliente_id_idx" ON "public"."projects" USING "btree" ("cliente_id");



CREATE INDEX "public_landing_gallery_landing_id_idx" ON "public"."public_landing_gallery" USING "btree" ("landing_id");



CREATE INDEX "public_landing_gallery_org_sort_idx" ON "public"."public_landing_gallery" USING "btree" ("organization_id", "sort_order");



CREATE INDEX "public_landing_testimonials_org_estado_creado_idx" ON "public"."public_landing_testimonials" USING "btree" ("organization_id", "estado", "creado_en" DESC);



CREATE INDEX "quote_item_breakdown_material_id_idx" ON "public"."quote_item_breakdown" USING "btree" ("material_id");



CREATE INDEX "solicitudes_contacto_creado_en_idx" ON "public"."solicitudes_contacto" USING "btree" ("creado_en" DESC);



CREATE INDEX "solicitudes_contacto_org_created_idx" ON "public"."solicitudes_contacto" USING "btree" ("organization_id", "creado_en" DESC);



CREATE INDEX "solicitudes_contacto_org_estado_created_idx" ON "public"."solicitudes_contacto" USING "btree" ("organization_id", "estado", "creado_en" DESC);



CREATE INDEX "solicitudes_contacto_organization_id_contactada_at_idx" ON "public"."solicitudes_contacto" USING "btree" ("organization_id", "contactada_at" DESC);



CREATE INDEX "solicitudes_contacto_utm_source_idx" ON "public"."solicitudes_contacto" USING "btree" ("utm_source");



CREATE UNIQUE INDEX "suscripciones_organizacion_external_reference_uidx" ON "public"."suscripciones_organizacion" USING "btree" ("external_reference") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "suscripciones_organizacion_mp_open_org_uidx" ON "public"."suscripciones_organizacion" USING "btree" ("organization_id") WHERE (("provider" = 'mercadopago'::"text") AND ("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'paused'::"text", 'past_due'::"text"])) AND ("eliminado_en" IS NULL));



CREATE INDEX "suscripciones_organizacion_org_updated_idx" ON "public"."suscripciones_organizacion" USING "btree" ("organization_id", "actualizado_en" DESC) WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "suscripciones_organizacion_provider_id_uidx" ON "public"."suscripciones_organizacion" USING "btree" ("provider", "provider_subscription_id") WHERE (("provider_subscription_id" IS NOT NULL) AND ("eliminado_en" IS NULL));



CREATE INDEX "system_configurations_product_type_id_idx" ON "public"."system_configurations" USING "btree" ("product_type_id");



CREATE INDEX "system_configurations_system_line_id_idx" ON "public"."system_configurations" USING "btree" ("system_line_id");



CREATE UNIQUE INDEX "uniq_clients_email_org" ON "public"."clients" USING "btree" ("organization_id", "correo") WHERE (("eliminado_en" IS NULL) AND ("correo" IS NOT NULL));



CREATE UNIQUE INDEX "uniq_config_material" ON "public"."configuration_materials" USING "btree" ("configuration_id", "material_id");



CREATE UNIQUE INDEX "uniq_line_glass" ON "public"."line_glass_compatibility" USING "btree" ("system_line_id", "glass_material_id");



CREATE UNIQUE INDEX "uniq_quote_number" ON "public"."cotizaciones" USING "btree" ("organization_id", "numero");



CREATE INDEX "users_active_correo_idx" ON "public"."users" USING "btree" ("correo") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "users_auth_user_id_org_active_idx" ON "public"."users" USING "btree" ("auth_user_id", "organization_id") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "users_auth_user_id_unique" ON "public"."users" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "users_correo_normalized_unique" ON "public"."users" USING "btree" ("lower"("btrim"("correo")));



CREATE INDEX "users_organization_id_idx" ON "public"."users" USING "btree" ("organization_id");



CREATE INDEX "web_push_subscriptions_auth_user_idx" ON "public"."web_push_subscriptions" USING "btree" ("auth_user_id", "is_active");



CREATE INDEX "web_push_subscriptions_org_active_idx" ON "public"."web_push_subscriptions" USING "btree" ("organization_id", "is_active");



CREATE OR REPLACE TRIGGER "ensure_organization_profile_trial_defaults" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_organization_profile_trial_defaults"();



CREATE OR REPLACE TRIGGER "fabrication_recipe_tests_enforce_validator" BEFORE INSERT OR UPDATE ON "public"."fabrication_recipe_tests" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_fabrication_recipe_test_validator"();



CREATE OR REPLACE TRIGGER "fabrication_recipe_tests_sync_organization" BEFORE INSERT OR UPDATE ON "public"."fabrication_recipe_tests" FOR EACH ROW EXECUTE FUNCTION "public"."sync_fabrication_recipe_test_organization"();



CREATE OR REPLACE TRIGGER "fabrication_recipes_prevent_validated_update" BEFORE UPDATE ON "public"."fabrication_recipes" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_validated_fabrication_recipe_update"();



CREATE OR REPLACE TRIGGER "fabrication_recipes_touch_updated_at" BEFORE UPDATE ON "public"."fabrication_recipes" FOR EACH ROW EXECUTE FUNCTION "public"."touch_fabrication_recipes_updated_at"();



CREATE OR REPLACE TRIGGER "growth_prospects_touch_updated_at" BEFORE UPDATE ON "public"."growth_prospects" FOR EACH ROW EXECUTE FUNCTION "public"."touch_growth_updated_at"();



CREATE OR REPLACE TRIGGER "growth_tasks_touch_updated_at" BEFORE UPDATE ON "public"."growth_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."touch_growth_updated_at"();



CREATE OR REPLACE TRIGGER "growth_workspace_members_touch_updated_at" BEFORE UPDATE ON "public"."growth_workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."touch_growth_updated_at"();



CREATE OR REPLACE TRIGGER "growth_workspaces_touch_updated_at" BEFORE UPDATE ON "public"."growth_workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."touch_growth_updated_at"();



CREATE OR REPLACE TRIGGER "sync_pagos_suscripcion_neutral_fields" BEFORE INSERT OR UPDATE OF "amount_clp", "amount", "currency", "currency_code" ON "public"."pagos_suscripcion" FOR EACH ROW EXECUTE FUNCTION "public"."sync_pagos_suscripcion_neutral_fields"();



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."configuration_materials"
    ADD CONSTRAINT "configuration_materials_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "public"."system_configurations"("id");



ALTER TABLE ONLY "public"."configuration_materials"
    ADD CONSTRAINT "configuration_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."cotizacion_item_visual_configs"
    ADD CONSTRAINT "cotizacion_item_visual_configs_cotizacion_item_id_fkey" FOREIGN KEY ("cotizacion_item_id") REFERENCES "public"."cotizacion_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cotizacion_item_visual_configs"
    ADD CONSTRAINT "cotizacion_item_visual_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "cotizacion_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "cotizaciones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."fabrication_recipe_tests"
    ADD CONSTRAINT "fabrication_recipe_tests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabrication_recipe_tests"
    ADD CONSTRAINT "fabrication_recipe_tests_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."fabrication_recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabrication_recipe_tests"
    ADD CONSTRAINT "fabrication_recipe_tests_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fabrication_recipes"
    ADD CONSTRAINT "fabrication_recipes_line_template_id_fkey" FOREIGN KEY ("line_template_id") REFERENCES "public"."cotizacion_line_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fabrication_recipes"
    ADD CONSTRAINT "fabrication_recipes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabrication_recipes"
    ADD CONSTRAINT "fabrication_recipes_parent_recipe_id_fkey" FOREIGN KEY ("parent_recipe_id") REFERENCES "public"."fabrication_recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fabrication_recipes"
    ADD CONSTRAINT "fabrication_recipes_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_item_breakdown"
    ADD CONSTRAINT "fk_breakdown_item" FOREIGN KEY ("cotizacion_item_id") REFERENCES "public"."cotizacion_items"("id");



ALTER TABLE ONLY "public"."quote_item_breakdown"
    ADD CONSTRAINT "fk_breakdown_material" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "fk_configuration_line" FOREIGN KEY ("system_line_id") REFERENCES "public"."system_lines"("id");



ALTER TABLE ONLY "public"."configuration_materials"
    ADD CONSTRAINT "fk_configuration_material_config" FOREIGN KEY ("configuration_id") REFERENCES "public"."system_configurations"("id");



ALTER TABLE ONLY "public"."configuration_materials"
    ADD CONSTRAINT "fk_configuration_material_material" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."line_glass_compatibility"
    ADD CONSTRAINT "fk_glass_material" FOREIGN KEY ("glass_material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "fk_item_configuration" FOREIGN KEY ("configuration_id") REFERENCES "public"."system_configurations"("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "fk_item_line" FOREIGN KEY ("system_line_id") REFERENCES "public"."system_lines"("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "fk_item_product_type" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "fk_item_quote" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id");



ALTER TABLE ONLY "public"."labor_costs"
    ADD CONSTRAINT "fk_labor_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "fk_material_type" FOREIGN KEY ("material_type_id") REFERENCES "public"."material_types"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_users_auth" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."growth_activities"
    ADD CONSTRAINT "growth_activities_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "public"."growth_prospects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."growth_activities"
    ADD CONSTRAINT "growth_activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."growth_workspaces"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."growth_prospects"
    ADD CONSTRAINT "growth_prospects_converted_organization_id_fkey" FOREIGN KEY ("converted_organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."growth_prospects"
    ADD CONSTRAINT "growth_prospects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."growth_workspaces"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."growth_tasks"
    ADD CONSTRAINT "growth_tasks_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "public"."growth_prospects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."growth_tasks"
    ADD CONSTRAINT "growth_tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."growth_workspaces"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."growth_workspace_members"
    ADD CONSTRAINT "growth_workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."growth_workspaces"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."historial_precios"
    ADD CONSTRAINT "historial_precios_cambiado_por_fkey" FOREIGN KEY ("cambiado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."historial_precios"
    ADD CONSTRAINT "historial_precios_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."historial_precios"
    ADD CONSTRAINT "historial_precios_organizacion_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."line_glass_compatibility"
    ADD CONSTRAINT "line_glass_compatibility_system_line_id_fkey" FOREIGN KEY ("system_line_id") REFERENCES "public"."system_lines"("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."onboarding_checklists"
    ADD CONSTRAINT "onboarding_checklists_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."onboarding_checklists"
    ADD CONSTRAINT "onboarding_checklists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_profile"
    ADD CONSTRAINT "organization_profile_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagos_suscripcion"
    ADD CONSTRAINT "pagos_suscripcion_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagos_suscripcion"
    ADD CONSTRAINT "pagos_suscripcion_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."suscripciones_organizacion"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."public_landing_gallery"
    ADD CONSTRAINT "public_landing_gallery_landing_id_fkey" FOREIGN KEY ("landing_id") REFERENCES "public"."organization_profile"("organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_landing_gallery"
    ADD CONSTRAINT "public_landing_gallery_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_landing_testimonials"
    ADD CONSTRAINT "public_landing_testimonials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_item_breakdown"
    ADD CONSTRAINT "quote_item_breakdown_cotizacion_item_id_fkey" FOREIGN KEY ("cotizacion_item_id") REFERENCES "public"."cotizacion_items"("id");



ALTER TABLE ONLY "public"."quote_item_breakdown"
    ADD CONSTRAINT "quote_item_breakdown_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id");



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "quotes_project_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."solicitudes_contacto"
    ADD CONSTRAINT "solicitudes_contacto_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suscripciones_organizacion"
    ADD CONSTRAINT "suscripciones_organizacion_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "system_configurations_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id");



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "system_configurations_system_line_id_fkey" FOREIGN KEY ("system_line_id") REFERENCES "public"."system_lines"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_insert" ON "public"."clients" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."configuration_materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "configuration_materials_select" ON "public"."configuration_materials" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."system_configurations" "sc"
  WHERE (("sc"."id" = "configuration_materials"."configuration_id") AND (("sc"."organization_id" IS NULL) OR ("sc"."organization_id" = "public"."get_org_id"()))))));



ALTER TABLE "public"."cotizacion_code_counters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cotizacion_code_counters_insert_own" ON "public"."cotizacion_code_counters" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizacion_code_counters_select_own" ON "public"."cotizacion_code_counters" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizacion_code_counters_update_own" ON "public"."cotizacion_code_counters" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."cotizacion_item_visual_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cotizacion_item_visual_configs_insert_own_org" ON "public"."cotizacion_item_visual_configs" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizacion_item_visual_configs_select_own_org" ON "public"."cotizacion_item_visual_configs" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizacion_item_visual_configs_update_own_org" ON "public"."cotizacion_item_visual_configs" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."cotizacion_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cotizacion_line_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cotizacion_line_templates_insert_own_org" ON "public"."cotizacion_line_templates" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizacion_line_templates_select_own_org" ON "public"."cotizacion_line_templates" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizacion_line_templates_update_own_org" ON "public"."cotizacion_line_templates" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."cotizaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cotizaciones_insert" ON "public"."cotizaciones" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizaciones_select" ON "public"."cotizaciones" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizaciones_update" ON "public"."cotizaciones" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."fabrication_recipe_tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fabrication_recipe_tests_insert_own_org_recipe" ON "public"."fabrication_recipe_tests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."fabrication_recipes" "recipe"
  WHERE (("recipe"."id" = "fabrication_recipe_tests"."recipe_id") AND ("recipe"."eliminado_en" IS NULL) AND ("recipe"."scope" = 'organization'::"text") AND ("recipe"."organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id"))))));



CREATE POLICY "fabrication_recipe_tests_select_visible" ON "public"."fabrication_recipe_tests" FOR SELECT TO "authenticated" USING ((("eliminado_en" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."fabrication_recipes" "recipe"
  WHERE (("recipe"."id" = "fabrication_recipe_tests"."recipe_id") AND ("recipe"."eliminado_en" IS NULL) AND (("recipe"."scope" = 'ventora'::"text") OR ("recipe"."organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id"))))))));



CREATE POLICY "fabrication_recipe_tests_update_own_org_recipe" ON "public"."fabrication_recipe_tests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."fabrication_recipes" "recipe"
  WHERE (("recipe"."id" = "fabrication_recipe_tests"."recipe_id") AND ("recipe"."eliminado_en" IS NULL) AND ("recipe"."scope" = 'organization'::"text") AND ("recipe"."organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."fabrication_recipes" "recipe"
  WHERE (("recipe"."id" = "fabrication_recipe_tests"."recipe_id") AND ("recipe"."eliminado_en" IS NULL) AND ("recipe"."scope" = 'organization'::"text") AND ("recipe"."organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id"))))));



ALTER TABLE "public"."fabrication_recipes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fabrication_recipes_insert_own_org" ON "public"."fabrication_recipes" FOR INSERT TO "authenticated" WITH CHECK ((("scope" = 'organization'::"text") AND ("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id"))));



CREATE POLICY "fabrication_recipes_select_visible" ON "public"."fabrication_recipes" FOR SELECT TO "authenticated" USING ((("eliminado_en" IS NULL) AND (("scope" = 'ventora'::"text") OR ("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")))));



CREATE POLICY "fabrication_recipes_update_own_org" ON "public"."fabrication_recipes" FOR UPDATE TO "authenticated" USING ((("scope" = 'organization'::"text") AND ("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")))) WITH CHECK ((("scope" = 'organization'::"text") AND ("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id"))));



ALTER TABLE "public"."formula_variables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formula_variables_no_client_access" ON "public"."formula_variables" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."growth_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "growth_activities_insert_member" ON "public"."growth_activities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_activities"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



CREATE POLICY "growth_activities_select_member" ON "public"."growth_activities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_activities"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



CREATE POLICY "growth_activities_update_member" ON "public"."growth_activities" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_activities"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_activities"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



ALTER TABLE "public"."growth_prospects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "growth_prospects_insert_member" ON "public"."growth_prospects" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_prospects"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



CREATE POLICY "growth_prospects_select_member" ON "public"."growth_prospects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_prospects"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



CREATE POLICY "growth_prospects_update_member" ON "public"."growth_prospects" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_prospects"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_prospects"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



ALTER TABLE "public"."growth_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "growth_tasks_insert_member" ON "public"."growth_tasks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_tasks"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



CREATE POLICY "growth_tasks_select_member" ON "public"."growth_tasks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_tasks"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



CREATE POLICY "growth_tasks_update_member" ON "public"."growth_tasks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_tasks"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_tasks"."workspace_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



ALTER TABLE "public"."growth_workspace_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "growth_workspace_members_select_own" ON "public"."growth_workspace_members" FOR SELECT TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."growth_workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "growth_workspaces_select_member" ON "public"."growth_workspaces" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_workspaces"."id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true)))));



CREATE POLICY "growth_workspaces_update_admin" ON "public"."growth_workspaces" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_workspaces"."id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true) AND ("m"."rol" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."growth_workspace_members" "m"
  WHERE (("m"."workspace_id" = "growth_workspaces"."id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."activo" = true) AND ("m"."rol" = 'admin'::"text")))));



CREATE POLICY "historial_insert" ON "public"."historial_precios" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."historial_precios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historial_select" ON "public"."historial_precios" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "items_insert" ON "public"."cotizacion_items" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "items_select" ON "public"."cotizacion_items" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "items_update" ON "public"."cotizacion_items" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."labor_costs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "labor_costs_select" ON "public"."labor_costs" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "landing_gallery_delete_own" ON "public"."public_landing_gallery" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "landing_gallery_insert_own" ON "public"."public_landing_gallery" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "landing_gallery_select_own" ON "public"."public_landing_gallery" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "landing_gallery_update_own" ON "public"."public_landing_gallery" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."line_glass_compatibility" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "line_glass_compatibility_select" ON "public"."line_glass_compatibility" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."system_lines" "sl"
  WHERE (("sl"."id" = "line_glass_compatibility"."system_line_id") AND (("sl"."organization_id" IS NULL) OR ("sl"."organization_id" = "public"."get_org_id"()))))));



ALTER TABLE "public"."material_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_types_no_client_access" ON "public"."material_types" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "materials_insert" ON "public"."materials" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "materials_select" ON "public"."materials" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "materials_update" ON "public"."materials" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."onboarding_checklists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "onboarding_checklists_insert_own" ON "public"."onboarding_checklists" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "onboarding_checklists_select_own" ON "public"."onboarding_checklists" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "onboarding_checklists_update_own" ON "public"."onboarding_checklists" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "org_select" ON "public"."organizations" FOR SELECT USING (("id" = "public"."get_org_id"()));



CREATE POLICY "org_update" ON "public"."organizations" FOR UPDATE USING (("id" = "public"."get_org_id"()));



ALTER TABLE "public"."organization_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_profile_insert_own" ON "public"."organization_profile" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "organization_profile_select_own" ON "public"."organization_profile" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "organization_profile_update_own" ON "public"."organization_profile" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos_suscripcion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pagos_suscripcion_select_own" ON "public"."pagos_suscripcion" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."product_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_types_select" ON "public"."product_types" FOR SELECT USING (true);



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_insert" ON "public"."projects" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "projects_update" ON "public"."projects" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."public_landing_gallery" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public_landing_testimonials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_landing_testimonials_delete_authenticated" ON "public"."public_landing_testimonials" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "public_landing_testimonials_insert_authenticated" ON "public"."public_landing_testimonials" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "public_landing_testimonials_select_authenticated" ON "public"."public_landing_testimonials" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "public_landing_testimonials_update_authenticated" ON "public"."public_landing_testimonials" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."quote_item_breakdown" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quote_item_breakdown_insert" ON "public"."quote_item_breakdown" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "quote_item_breakdown_select" ON "public"."quote_item_breakdown" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "quote_item_breakdown_update" ON "public"."quote_item_breakdown" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."solicitudes_contacto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "solicitudes_contacto_insert_public" ON "public"."solicitudes_contacto" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("estado" = 'nueva'::"text") AND ((("contexto" = 'landing'::"text") AND ("organization_id" IS NULL)) OR (("contexto" = 'empresa-publica'::"text") AND ("organization_id" IS NOT NULL)))));



CREATE POLICY "solicitudes_contacto_select_own" ON "public"."solicitudes_contacto" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "solicitudes_contacto_update_own" ON "public"."solicitudes_contacto" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."suscripciones_organizacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suscripciones_organizacion_select_own" ON "public"."suscripciones_organizacion" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")) AND ("eliminado_en" IS NULL)));



ALTER TABLE "public"."system_configurations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_configurations_select" ON "public"."system_configurations" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" = "public"."get_org_id"())));



ALTER TABLE "public"."system_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_lines_select" ON "public"."system_lines" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" = "public"."get_org_id"())));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert" ON "public"."users" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "users_select" ON "public"."users" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "users_update" ON "public"."users" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."web_push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "web_push_subscriptions_insert_own" ON "public"."web_push_subscriptions" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")) AND ("auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "web_push_subscriptions_select_own" ON "public"."web_push_subscriptions" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")) AND ("auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "web_push_subscriptions_update_own" ON "public"."web_push_subscriptions" FOR UPDATE TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")) AND ("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("organization_id" = ( SELECT "public"."get_org_id"() AS "get_org_id")) AND ("auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."activate_subscription_from_payment"("p_payment_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activate_subscription_from_payment"("p_payment_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_google_oauth_account"("p_auth_user_id" "uuid", "p_email" "text", "p_nombre" "text", "p_empresa_nombre" "text", "p_whatsapp" "text", "p_ciudad_comuna" "text", "p_consent" boolean, "p_country_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_google_oauth_account"("p_auth_user_id" "uuid", "p_email" "text", "p_nombre" "text", "p_empresa_nombre" "text", "p_whatsapp" "text", "p_ciudad_comuna" "text", "p_consent" boolean, "p_country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_fabrication_recipe_test_validator"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_fabrication_recipe_test_validator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_fabrication_recipe_test_validator"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_organization_profile_trial_defaults"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_organization_profile_trial_defaults"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_org_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_validated_fabrication_recipe_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_validated_fabrication_recipe_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_validated_fabrication_recipe_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_mercadopago_payment"("p_subscription_id" bigint, "p_provider_payment_id" "text", "p_provider_order_id" "text", "p_provider_status" "text", "p_status" "text", "p_amount" numeric, "p_currency_code" "text", "p_paid_at" timestamp with time zone, "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_provider_response" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_mercadopago_payment"("p_subscription_id" bigint, "p_provider_payment_id" "text", "p_provider_order_id" "text", "p_provider_status" "text", "p_status" "text", "p_amount" numeric, "p_currency_code" "text", "p_paid_at" timestamp with time zone, "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_provider_response" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_mercadopago_subscription"("p_subscription_id" bigint, "p_provider_subscription_id" "text", "p_provider_plan_id" "text", "p_provider_status" "text", "p_status" "text", "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_next_payment_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_mercadopago_subscription"("p_subscription_id" bigint, "p_provider_subscription_id" "text", "p_provider_plan_id" "text", "p_provider_status" "text", "p_status" "text", "p_period_starts_at" timestamp with time zone, "p_period_ends_at" timestamp with time zone, "p_next_payment_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."sync_fabrication_recipe_test_organization"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_fabrication_recipe_test_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_fabrication_recipe_test_organization"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_pagos_suscripcion_neutral_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_pagos_suscripcion_neutral_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_fabrication_recipes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_fabrication_recipes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_fabrication_recipes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_growth_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_growth_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_growth_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."cotizaciones" TO "anon";
GRANT ALL ON TABLE "public"."cotizaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizaciones" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."admin_clientes_eliminados" TO "service_role";
GRANT SELECT ON TABLE "public"."admin_clientes_eliminados" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."configuration_materials" TO "anon";
GRANT ALL ON TABLE "public"."configuration_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration_materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."configuration_materials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."configuration_materials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."configuration_materials_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cotizacion_code_counters" TO "service_role";



GRANT ALL ON TABLE "public"."cotizacion_item_visual_configs" TO "anon";
GRANT ALL ON TABLE "public"."cotizacion_item_visual_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizacion_item_visual_configs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cotizacion_item_visual_configs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cotizacion_item_visual_configs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cotizacion_item_visual_configs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cotizacion_items" TO "anon";
GRANT ALL ON TABLE "public"."cotizacion_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizacion_items" TO "service_role";



GRANT ALL ON TABLE "public"."cotizacion_line_templates" TO "anon";
GRANT ALL ON TABLE "public"."cotizacion_line_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizacion_line_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cotizacion_line_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cotizacion_line_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cotizacion_line_templates_id_seq" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."fabrication_recipe_tests" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."fabrication_recipe_tests" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."fabrication_recipes" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."fabrication_recipes" TO "service_role";



GRANT ALL ON TABLE "public"."formula_variables" TO "service_role";



GRANT ALL ON SEQUENCE "public"."formula_variables_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."growth_activities" TO "anon";
GRANT ALL ON TABLE "public"."growth_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_activities" TO "service_role";



GRANT ALL ON TABLE "public"."growth_prospects" TO "anon";
GRANT ALL ON TABLE "public"."growth_prospects" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_prospects" TO "service_role";



GRANT ALL ON TABLE "public"."growth_tasks" TO "anon";
GRANT ALL ON TABLE "public"."growth_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."growth_workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."growth_workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."growth_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."growth_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_workspaces" TO "service_role";



GRANT ALL ON TABLE "public"."historial_precios" TO "anon";
GRANT ALL ON TABLE "public"."historial_precios" TO "authenticated";
GRANT ALL ON TABLE "public"."historial_precios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."historial_precios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."historial_precios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."historial_precios_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."labor_costs" TO "anon";
GRANT ALL ON TABLE "public"."labor_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."labor_costs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."labor_costs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."labor_costs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."labor_costs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."line_glass_compatibility" TO "anon";
GRANT ALL ON TABLE "public"."line_glass_compatibility" TO "authenticated";
GRANT ALL ON TABLE "public"."line_glass_compatibility" TO "service_role";



GRANT ALL ON SEQUENCE "public"."line_glass_compatibility_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."line_glass_compatibility_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."line_glass_compatibility_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."material_types" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_checklists" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."onboarding_checklists" TO "authenticated";



GRANT ALL ON TABLE "public"."organization_profile" TO "anon";
GRANT ALL ON TABLE "public"."organization_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_profile" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pagos_suscripcion" TO "service_role";
GRANT SELECT ON TABLE "public"."pagos_suscripcion" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."pagos_suscripcion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_types" TO "anon";
GRANT ALL ON TABLE "public"."product_types" TO "authenticated";
GRANT ALL ON TABLE "public"."product_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_types_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."public_landing_gallery" TO "anon";
GRANT ALL ON TABLE "public"."public_landing_gallery" TO "authenticated";
GRANT ALL ON TABLE "public"."public_landing_gallery" TO "service_role";



GRANT ALL ON SEQUENCE "public"."public_landing_gallery_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."public_landing_gallery_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."public_landing_gallery_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."public_landing_testimonials" TO "anon";
GRANT ALL ON TABLE "public"."public_landing_testimonials" TO "authenticated";
GRANT ALL ON TABLE "public"."public_landing_testimonials" TO "service_role";



GRANT ALL ON TABLE "public"."quote_item_breakdown" TO "anon";
GRANT ALL ON TABLE "public"."quote_item_breakdown" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_item_breakdown" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_item_breakdown_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_item_breakdown_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_item_breakdown_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."solicitudes_contacto" TO "anon";
GRANT ALL ON TABLE "public"."solicitudes_contacto" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitudes_contacto" TO "service_role";



GRANT ALL ON TABLE "public"."suscripciones_organizacion" TO "service_role";
GRANT SELECT ON TABLE "public"."suscripciones_organizacion" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."suscripciones_organizacion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."suscripciones_organizacion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suscripciones_organizacion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."system_configurations" TO "anon";
GRANT ALL ON TABLE "public"."system_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."system_configurations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_configurations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_configurations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_configurations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."system_lines" TO "anon";
GRANT ALL ON TABLE "public"."system_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."system_lines" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_lines_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_lines_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_lines_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("correo") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("organization_id") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("rol") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("creado_en") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("actualizado_en") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("eliminado_en") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("auth_user_id") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("created_by_admin") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("must_change_password") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("account_setup_status") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("account_delivered_at") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("password_changed_at") ON TABLE "public"."users" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."web_push_subscriptions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."web_push_subscriptions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."web_push_subscriptions_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
