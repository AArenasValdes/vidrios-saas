alter table public.users
  add column if not exists nombre text,
  add column if not exists whatsapp text,
  add column if not exists ciudad_comuna text,
  add column if not exists data_sharing_accepted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_whatsapp_chile_mobile_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_whatsapp_chile_mobile_check
      check (
        whatsapp is null
        or whatsapp ~ '^\+569[0-9]{8}$'
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_nombre_length_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_nombre_length_check
      check (
        nombre is null
        or char_length(nombre) between 2 and 120
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_ciudad_comuna_length_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_ciudad_comuna_length_check
      check (
        ciudad_comuna is null
        or char_length(ciudad_comuna) between 2 and 120
      ) not valid;
  end if;
end
$$;

alter table public.users
  validate constraint users_whatsapp_chile_mobile_check;

alter table public.users
  validate constraint users_nombre_length_check;

alter table public.users
  validate constraint users_ciudad_comuna_length_check;

create unique index if not exists users_correo_normalized_unique
  on public.users (lower(btrim(correo)));

comment on column public.users.nombre is
  'Nombre personal privado del usuario SaaS.';

comment on column public.users.whatsapp is
  'WhatsApp privado del usuario SaaS normalizado como +569XXXXXXXX.';

comment on column public.users.ciudad_comuna is
  'Ciudad o comuna privada informada por el usuario SaaS.';

comment on column public.users.data_sharing_accepted_at is
  'Consentimiento para crear la cuenta y recibir contacto directo de soporte o comercial. No incluye campanas masivas.';

create or replace function public.complete_google_oauth_account(
  p_auth_user_id uuid,
  p_email text,
  p_nombre text,
  p_empresa_nombre text,
  p_whatsapp text,
  p_ciudad_comuna text,
  p_consent boolean
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
  v_phone_digits text;
  v_whatsapp text;
  v_user_id bigint;
  v_organization_id bigint;
  v_existing_auth_user_id uuid;
  v_had_organization boolean := false;
  v_trial_ends_at timestamptz;
begin
  v_email := lower(btrim(coalesce(p_email, '')));
  v_nombre := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_empresa_nombre := regexp_replace(
    btrim(coalesce(p_empresa_nombre, '')),
    '\s+',
    ' ',
    'g'
  );
  v_ciudad_comuna := regexp_replace(
    btrim(coalesce(p_ciudad_comuna, '')),
    '\s+',
    ' ',
    'g'
  );
  v_phone_digits := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');

  if v_phone_digits ~ '^569[0-9]{8}$' then
    v_whatsapp := '+' || v_phone_digits;
  elsif v_phone_digits ~ '^09[0-9]{8}$' then
    v_whatsapp := '+569' || substring(v_phone_digits from 3 for 8);
  elsif v_phone_digits ~ '^9[0-9]{8}$' then
    v_whatsapp := '+56' || v_phone_digits;
  elsif v_phone_digits ~ '^[0-9]{8}$' then
    v_whatsapp := '+569' || v_phone_digits;
  else
    raise exception 'Ingresa un WhatsApp chileno valido.'
      using errcode = '22023';
  end if;

  if p_auth_user_id is null or v_email = '' then
    raise exception 'No pudimos validar tu sesion.'
      using errcode = '28000';
  end if;

  if length(v_email) > 320 then
    raise exception 'El correo supera el largo permitido.'
      using errcode = '22023';
  end if;

  if length(v_nombre) < 2 or length(v_nombre) > 120 then
    raise exception 'Ingresa tu nombre.'
      using errcode = '22023';
  end if;

  if length(v_empresa_nombre) < 2 or length(v_empresa_nombre) > 160 then
    raise exception 'Ingresa el nombre del taller.'
      using errcode = '22023';
  end if;

  if length(v_ciudad_comuna) < 2 or length(v_ciudad_comuna) > 120 then
    raise exception 'Ingresa tu ciudad o comuna.'
      using errcode = '22023';
  end if;

  if p_consent is distinct from true then
    raise exception 'Debes aceptar la creacion de la cuenta y el contacto directo.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('complete-google-oauth:auth:' || p_auth_user_id::text, 0)
  );

  perform pg_advisory_xact_lock(
    hashtextextended('complete-google-oauth:email:' || v_email, 0)
  );

  select
    app_user.id,
    app_user.organization_id,
    app_user.auth_user_id
  into
    v_user_id,
    v_organization_id,
    v_existing_auth_user_id
  from public.users as app_user
  where app_user.auth_user_id = p_auth_user_id
    and app_user.eliminado_en is null
  limit 1
  for update;

  if v_user_id is null then
    select
      app_user.id,
      app_user.organization_id,
      app_user.auth_user_id
    into
      v_user_id,
      v_organization_id,
      v_existing_auth_user_id
    from public.users as app_user
    where lower(app_user.correo) = v_email
      and app_user.eliminado_en is null
    order by app_user.id
    limit 1
    for update;
  end if;

  if v_existing_auth_user_id is not null
    and v_existing_auth_user_id <> p_auth_user_id then
    raise exception 'Este correo ya esta vinculado a otra cuenta de acceso.'
      using errcode = '23505';
  end if;

  v_had_organization := v_organization_id is not null;

  if v_organization_id is null then
    insert into public.organizations (
      nombre,
      correo,
      telefono
    )
    values (
      v_empresa_nombre,
      v_email,
      v_whatsapp
    )
    returning id into v_organization_id;
  end if;

  if v_user_id is null then
    insert into public.users (
      correo,
      organization_id,
      rol,
      auth_user_id,
      nombre,
      whatsapp,
      ciudad_comuna,
      data_sharing_accepted_at
    )
    values (
      v_email,
      v_organization_id,
      'admin',
      p_auth_user_id,
      v_nombre,
      v_whatsapp,
      v_ciudad_comuna,
      now()
    )
    returning id into v_user_id;
  else
    update public.users
    set
      correo = v_email,
      organization_id = v_organization_id,
      auth_user_id = p_auth_user_id,
      nombre = v_nombre,
      whatsapp = v_whatsapp,
      ciudad_comuna = v_ciudad_comuna,
      data_sharing_accepted_at = coalesce(data_sharing_accepted_at, now()),
      actualizado_en = timezone('utc', now())
    where id = v_user_id;
  end if;

  update public.organizations
  set
    nombre = v_empresa_nombre,
    correo = case
      when nullif(btrim(correo), '') is null then v_email
      else correo
    end,
    telefono = case
      when nullif(btrim(telefono), '') is null then v_whatsapp
      else telefono
    end,
    actualizado_en = timezone('utc', now())
  where id = v_organization_id;

  insert into public.organization_profile (
    organization_id,
    empresa_nombre,
    responsable_comercial,
    empresa_telefono,
    empresa_email,
    public_name,
    public_zone
  )
  values (
    v_organization_id,
    v_empresa_nombre,
    v_nombre,
    v_whatsapp,
    v_email,
    v_empresa_nombre,
    v_ciudad_comuna
  )
  on conflict (organization_id) do update
  set
    empresa_nombre = excluded.empresa_nombre,
    responsable_comercial = case
      when nullif(btrim(public.organization_profile.responsable_comercial), '') is null
        then excluded.responsable_comercial
      else public.organization_profile.responsable_comercial
    end,
    empresa_telefono = case
      when nullif(btrim(public.organization_profile.empresa_telefono), '') is null
        then excluded.empresa_telefono
      else public.organization_profile.empresa_telefono
    end,
    empresa_email = case
      when nullif(btrim(public.organization_profile.empresa_email), '') is null
        then excluded.empresa_email
      else public.organization_profile.empresa_email
    end,
    public_name = case
      when nullif(btrim(public.organization_profile.public_name), '') is null
        then excluded.public_name
      else public.organization_profile.public_name
    end,
    public_zone = case
      when nullif(btrim(public.organization_profile.public_zone), '') is null
        then excluded.public_zone
      else public.organization_profile.public_zone
    end,
    actualizado_en = timezone('utc', now());

  select profile.trial_ends_at
  into v_trial_ends_at
  from public.organization_profile as profile
  where profile.organization_id = v_organization_id;

  return query
  select
    v_organization_id,
    v_user_id,
    v_trial_ends_at,
    v_had_organization,
    true;
end;
$$;

revoke execute on function public.complete_google_oauth_account(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
) from public, anon, authenticated;

grant execute on function public.complete_google_oauth_account(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
) to service_role;

revoke all privileges on table public.users
  from public, anon, authenticated;

grant select (
  id,
  correo,
  organization_id,
  rol,
  creado_en,
  actualizado_en,
  eliminado_en,
  auth_user_id,
  created_by_admin,
  must_change_password,
  account_setup_status,
  account_delivered_at,
  password_changed_at
) on public.users to authenticated;

grant all privileges on table public.users to service_role;

comment on function public.complete_google_oauth_account(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
) is
  'Completa de forma atomica e idempotente el alta SaaS iniciada con Google OAuth.';
