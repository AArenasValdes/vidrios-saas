


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



CREATE OR REPLACE FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer DEFAULT 90) RETURNS TABLE("clientes_purgados" integer, "proyectos_purgados" integer, "cotizaciones_purgadas" integer, "items_purgados" integer, "breakdowns_purgados" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_org_id public.organizations.id%type;
  cutoff timestamptz;
begin
  select users.organization_id
    into current_org_id
  from public.users as users
  where lower(users.correo) = lower(auth.email())
    and users.eliminado_en is null
  limit 1;

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



CREATE OR REPLACE FUNCTION "public"."get_org_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select organization_id
  from public.users
  where correo = auth.email()
    and eliminado_en is null
  limit 1;
$$;


ALTER FUNCTION "public"."get_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date" DEFAULT ("timezone"('utc'::"text", "now"()))::"date") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    "cliente_respuesta_canal" "text"
);


ALTER TABLE "public"."cotizaciones" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint NOT NULL,
    "correo" "text" NOT NULL,
    "organization_id" bigint NOT NULL,
    "rol" "text" NOT NULL,
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" timestamp without time zone,
    "auth_user_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


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
  WHERE (("client"."eliminado_en" IS NOT NULL) AND ("client"."organization_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users" "users"
          WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));


ALTER VIEW "public"."admin_clientes_eliminados" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_clientes_eliminados" IS 'Vista administrativa de clientes eliminados por soft delete, con conteo de proyectos y cotizaciones relacionadas tambien eliminadas.';



COMMENT ON COLUMN "public"."admin_clientes_eliminados"."cliente_eliminado_en" IS 'Fecha en que la ficha del cliente fue marcada como eliminada en la operacion diaria.';



COMMENT ON COLUMN "public"."admin_clientes_eliminados"."proyectos_eliminados" IS 'Cantidad de proyectos asociados al cliente que tambien quedaron en soft delete.';



COMMENT ON COLUMN "public"."admin_clientes_eliminados"."cotizaciones_eliminadas" IS 'Cantidad de cotizaciones relacionadas al cliente que tambien quedaron en soft delete.';



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
    "orden" integer
);


ALTER TABLE "public"."cotizacion_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cotizacion_items"."codigo" IS 'Codigo comercial del componente, por ejemplo V1 o P1.';



COMMENT ON COLUMN "public"."cotizacion_items"."tipo_componente" IS 'Tipo comercial del componente, por ejemplo ventana, puerta o cierre.';



COMMENT ON COLUMN "public"."cotizacion_items"."orden" IS 'Orden visual del componente dentro de la cotizacion.';



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
  "solicitud_publica_descripcion_corta" "text",
  "solicitud_publica_valor" "text",
  "solicitud_publica_mensaje_confianza" "text",
  "solicitud_publica_privacidad" "text",
  "solicitud_publica_horario_desde" "text",
  "solicitud_publica_horario_hasta" "text",
  "solicitud_publica_dias_atencion" "text",
  "solicitud_publica_horario_por_dia" "jsonb",
  "public_name" "text",
  "public_subtitle" "text",
  "public_zone" "text",
  "public_business_type" "text",
  "secondary_color" "text",
  "hero_mode" "text" NOT NULL DEFAULT 'gradient' CHECK (hero_mode IN ('image', 'gradient')),
  "hero_image_url" "text",
  "hero_title" "text",
  "hero_subtitle" "text",
  "show_gallery" boolean NOT NULL DEFAULT true,
  "show_schedule" boolean NOT NULL DEFAULT true,
  "show_rating" boolean NOT NULL DEFAULT false,
  "rating_label" "text",
  "jobs_count_label" "text",
  "form_title" "text",
  "form_subtitle" "text",
  "is_published" boolean NOT NULL DEFAULT false
);


ALTER TABLE "public"."organization_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_profile" IS 'Perfil comercial de la organizacion para branding del PDF y datos de contacto.';



COMMENT ON COLUMN "public"."organization_profile"."brand_color" IS 'Color principal de marca en formato hex. Si no existe, el sistema usa #1a3a5c.';



COMMENT ON COLUMN "public"."organization_profile"."forma_pago" IS 'Texto libre de condiciones de pago para mostrar en el PDF.';



COMMENT ON COLUMN "public"."organization_profile"."proveedor_preferido" IS 'Proveedor principal de la organizacion para sugerencias rapidas al crear componentes.';



COMMENT ON COLUMN "public"."organization_profile"."modo_precio_preferido" IS 'Define si la empresa trabaja por defecto con margen de ganancia o con precio directo por componente.';



COMMENT ON COLUMN "public"."organization_profile"."margen_defecto" IS 'Margen de ganancia sugerido por defecto para nuevas cotizaciones y componentes.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_slug" IS 'Identificador publico de la ruta /solicitud/[slug] para captar prospectos por organizacion.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_descripcion_corta" IS 'Descripcion comercial breve visible en la landing publica /solicitud/[empresa].';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_valor" IS 'Mensaje breve que explica que obtiene el prospecto al dejar su solicitud.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_mensaje_confianza" IS 'Mensaje breve de confianza para reforzar que la solicitud queda registrada y sera respondida.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_privacidad" IS 'Mensaje breve de privacidad para la solicitud publica de la organizacion.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_horario_desde" IS 'Hora de inicio de atencion comercial mostrada en la landing publica.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_horario_hasta" IS 'Hora de termino de atencion comercial mostrada en la landing publica.';



COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_dias_atencion" IS 'Dias de atencion comercial de la landing publica, guardados como CSV de 0 a 6.';

COMMENT ON COLUMN "public"."organization_profile"."solicitud_publica_horario_por_dia" IS 'Horario visible por dia de la semana para la landing publica. Cada item guarda day, enabled, from y to.';

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



COMMENT ON COLUMN "public"."solicitudes_contacto"."contactada_at" IS 'Fecha en que el equipo marco el lead como contactado.';



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


CREATE TABLE IF NOT EXISTS "public"."public_landing_gallery" (
  "id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
  "organization_id" bigint NOT NULL,
  "landing_id" bigint,
  "image_url" "text" NOT NULL,
  "label" "text",
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_visible" boolean NOT NULL DEFAULT true,
  "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."public_landing_gallery" OWNER TO "postgres";


COMMENT ON TABLE "public"."public_landing_gallery" IS 'Fotos de galeria para la landing publica de cada organizacion.';


COMMENT ON COLUMN "public"."public_landing_gallery"."image_url" IS 'URL publica de la imagen almacenada en Supabase Storage.';


COMMENT ON COLUMN "public"."public_landing_gallery"."label" IS 'Etiqueta visible de la foto (ej: Ventana, Shower, Terraza).';


COMMENT ON COLUMN "public"."public_landing_gallery"."sort_order" IS 'Orden visual de la foto dentro de la galeria. Menor = primero.';


COMMENT ON COLUMN "public"."public_landing_gallery"."is_visible" IS 'Si false, la foto no se muestra en la landing publica pero se conserva en la base.';


ALTER TABLE ONLY "public"."public_landing_gallery" ADD CONSTRAINT "public_landing_gallery_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."public_landing_gallery" ADD CONSTRAINT "public_landing_gallery_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."public_landing_gallery" ADD CONSTRAINT "public_landing_gallery_landing_id_fkey" FOREIGN KEY ("landing_id") REFERENCES "public"."organization_profile"("organization_id") ON DELETE CASCADE;


CREATE INDEX "public_landing_gallery_org_sort_idx" ON "public"."public_landing_gallery" USING "btree" ("organization_id", "sort_order");


ALTER TABLE "public"."public_landing_gallery" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "landing_gallery_select_own" ON "public"."public_landing_gallery" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id" FROM "public"."users" "users" WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));


CREATE POLICY "landing_gallery_insert_own" ON "public"."public_landing_gallery" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id" FROM "public"."users" "users" WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));


CREATE POLICY "landing_gallery_update_own" ON "public"."public_landing_gallery" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id" FROM "public"."users" "users" WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL))))) WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id" FROM "public"."users" "users" WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));


CREATE POLICY "landing_gallery_delete_own" ON "public"."public_landing_gallery" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id" FROM "public"."users" "users" WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));


GRANT ALL ON TABLE "public"."public_landing_gallery" TO "anon";
GRANT ALL ON TABLE "public"."public_landing_gallery" TO "authenticated";
GRANT ALL ON TABLE "public"."public_landing_gallery" TO "service_role";


GRANT ALL ON SEQUENCE "public"."public_landing_gallery_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."public_landing_gallery_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."public_landing_gallery_id_seq" TO "service_role";



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



ALTER TABLE ONLY "public"."formula_variables"
    ADD CONSTRAINT "formula_variables_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."formula_variables"
    ADD CONSTRAINT "formula_variables_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."organization_profile"
    ADD CONSTRAINT "organization_profile_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_types"
    ADD CONSTRAINT "product_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_item_breakdown"
    ADD CONSTRAINT "quote_item_breakdown_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitudes_contacto"
    ADD CONSTRAINT "solicitudes_contacto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_lines"
    ADD CONSTRAINT "system_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "unique_correo_clients" UNIQUE ("correo");



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



CREATE INDEX "cotizacion_items_active_org_quote_order_idx" ON "public"."cotizacion_items" USING "btree" ("organization_id", "cotizacion_id", "orden", "creado_en") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizacion_items_cotizacion_id_orden_idx" ON "public"."cotizacion_items" USING "btree" ("cotizacion_id", "orden");



CREATE INDEX "cotizaciones_active_org_actualizado_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "actualizado_en" DESC) WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizaciones_active_org_creado_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "creado_en" DESC) WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizaciones_active_org_estado_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "estado") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "cotizaciones_active_org_proyecto_idx" ON "public"."cotizaciones" USING "btree" ("organization_id", "proyecto_id") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "cotizaciones_approval_token_key" ON "public"."cotizaciones" USING "btree" ("approval_token") WHERE ("approval_token" IS NOT NULL);



CREATE INDEX "idx_breakdown_item" ON "public"."quote_item_breakdown" USING "btree" ("cotizacion_item_id");



CREATE INDEX "idx_clients_org" ON "public"."clients" USING "btree" ("organization_id");



CREATE INDEX "idx_config_materials_config" ON "public"."configuration_materials" USING "btree" ("configuration_id");



CREATE INDEX "idx_historial_precios_material_fecha" ON "public"."historial_precios" USING "btree" ("material_id", "fecha" DESC);



CREATE INDEX "idx_historial_precios_org_material_fecha" ON "public"."historial_precios" USING "btree" ("organization_id", "material_id", "fecha" DESC);



CREATE INDEX "idx_items_org_deleted" ON "public"."cotizacion_items" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "idx_items_quote" ON "public"."cotizacion_items" USING "btree" ("cotizacion_id");



CREATE INDEX "idx_line_glass_line" ON "public"."line_glass_compatibility" USING "btree" ("system_line_id");



CREATE INDEX "idx_projects_org" ON "public"."projects" USING "btree" ("organization_id");



CREATE INDEX "idx_projects_org_deleted" ON "public"."projects" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "idx_quotes_org" ON "public"."cotizaciones" USING "btree" ("organization_id");



CREATE INDEX "idx_quotes_org_deleted" ON "public"."cotizaciones" USING "btree" ("organization_id") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "organization_profile_solicitud_publica_slug_uidx" ON "public"."organization_profile" USING "btree" ("lower"("solicitud_publica_slug")) WHERE (("solicitud_publica_slug" IS NOT NULL) AND ("solicitud_publica_slug" <> ''::"text"));



CREATE INDEX "projects_active_org_cliente_idx" ON "public"."projects" USING "btree" ("organization_id", "cliente_id") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "projects_active_org_titulo_idx" ON "public"."projects" USING "btree" ("organization_id", "titulo") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "solicitudes_contacto_creado_en_idx" ON "public"."solicitudes_contacto" USING "btree" ("creado_en" DESC);



CREATE INDEX "solicitudes_contacto_organization_id_contactada_at_idx" ON "public"."solicitudes_contacto" USING "btree" ("organization_id", "contactada_at" DESC);



CREATE INDEX "solicitudes_contacto_organization_id_creado_en_idx" ON "public"."solicitudes_contacto" USING "btree" ("organization_id", "creado_en" DESC);



CREATE INDEX "solicitudes_contacto_utm_source_idx" ON "public"."solicitudes_contacto" USING "btree" ("utm_source");



CREATE UNIQUE INDEX "uniq_clients_email_org" ON "public"."clients" USING "btree" ("organization_id", "correo") WHERE ("eliminado_en" IS NULL);



CREATE UNIQUE INDEX "uniq_config_material" ON "public"."configuration_materials" USING "btree" ("configuration_id", "material_id");



CREATE UNIQUE INDEX "uniq_line_glass" ON "public"."line_glass_compatibility" USING "btree" ("system_line_id", "glass_material_id");



CREATE UNIQUE INDEX "uniq_quote_number" ON "public"."cotizaciones" USING "btree" ("organization_id", "numero");



CREATE INDEX "users_active_correo_idx" ON "public"."users" USING "btree" ("correo") WHERE ("eliminado_en" IS NULL);



CREATE INDEX "web_push_subscriptions_auth_user_idx" ON "public"."web_push_subscriptions" USING "btree" ("auth_user_id", "is_active");



CREATE INDEX "web_push_subscriptions_org_active_idx" ON "public"."web_push_subscriptions" USING "btree" ("organization_id", "is_active");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."configuration_materials"
    ADD CONSTRAINT "configuration_materials_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "public"."system_configurations"("id");



ALTER TABLE ONLY "public"."configuration_materials"
    ADD CONSTRAINT "configuration_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."cotizacion_items"
    ADD CONSTRAINT "cotizacion_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "cotizaciones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



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



ALTER TABLE ONLY "public"."organization_profile"
    ADD CONSTRAINT "organization_profile_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



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


ALTER TABLE "public"."cotizacion_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cotizaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cotizaciones_insert" ON "public"."cotizaciones" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizaciones_select" ON "public"."cotizaciones" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "cotizaciones_update" ON "public"."cotizaciones" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."formula_variables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historial_insert" ON "public"."historial_precios" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."historial_precios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historial_select" ON "public"."historial_precios" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "items_insert" ON "public"."cotizacion_items" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "items_select" ON "public"."cotizacion_items" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "items_update" ON "public"."cotizacion_items" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."labor_costs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "labor_costs_select" ON "public"."labor_costs" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."line_glass_compatibility" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "line_glass_compatibility_select" ON "public"."line_glass_compatibility" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."system_lines" "sl"
  WHERE (("sl"."id" = "line_glass_compatibility"."system_line_id") AND (("sl"."organization_id" IS NULL) OR ("sl"."organization_id" = "public"."get_org_id"()))))));



ALTER TABLE "public"."material_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "materials_insert" ON "public"."materials" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "materials_select" ON "public"."materials" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "materials_update" ON "public"."materials" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "org_select" ON "public"."organizations" FOR SELECT USING (("id" = "public"."get_org_id"()));



CREATE POLICY "org_update" ON "public"."organizations" FOR UPDATE USING (("id" = "public"."get_org_id"()));



ALTER TABLE "public"."organization_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_profile_insert_own" ON "public"."organization_profile" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users" "users"
  WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));



CREATE POLICY "organization_profile_select_own" ON "public"."organization_profile" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users" "users"
  WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));



CREATE POLICY "organization_profile_update_own" ON "public"."organization_profile" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users" "users"
  WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL))))) WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users" "users"
  WHERE (("lower"("users"."correo") = "lower"("auth"."email"())) AND ("users"."eliminado_en" IS NULL)))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_types_select" ON "public"."product_types" FOR SELECT USING (true);



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_insert" ON "public"."projects" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "projects_update" ON "public"."projects" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."quote_item_breakdown" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solicitudes_contacto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "solicitudes_contacto_insert_public" ON "public"."solicitudes_contacto" FOR INSERT TO "anon", "authenticated" WITH CHECK ((("estado" = 'nueva'::"text") AND ((("contexto" = 'landing'::"text") AND ("organization_id" IS NULL)) OR (("contexto" = 'empresa-publica'::"text") AND ("organization_id" IS NOT NULL)))));



CREATE POLICY "solicitudes_contacto_select_own" ON "public"."solicitudes_contacto" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "solicitudes_contacto_update_own" ON "public"."solicitudes_contacto" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_org_id"())) WITH CHECK (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."system_configurations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_configurations_select" ON "public"."system_configurations" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" = "public"."get_org_id"())));



ALTER TABLE "public"."system_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_lines_select" ON "public"."system_lines" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" = "public"."get_org_id"())));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert" ON "public"."users" FOR INSERT WITH CHECK (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "users_select" ON "public"."users" FOR SELECT USING (("organization_id" = "public"."get_org_id"()));



CREATE POLICY "users_update" ON "public"."users" FOR UPDATE USING (("organization_id" = "public"."get_org_id"()));



ALTER TABLE "public"."web_push_subscriptions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_purgar_clientes_eliminados"("retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_next_cotizacion_code"("p_organization_id" bigint, "p_quote_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."cotizaciones" TO "anon";
GRANT ALL ON TABLE "public"."cotizaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizaciones" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."admin_clientes_eliminados" TO "anon";
GRANT ALL ON TABLE "public"."admin_clientes_eliminados" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_clientes_eliminados" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."configuration_materials" TO "anon";
GRANT ALL ON TABLE "public"."configuration_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration_materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."configuration_materials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."configuration_materials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."configuration_materials_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cotizacion_code_counters" TO "anon";
GRANT ALL ON TABLE "public"."cotizacion_code_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizacion_code_counters" TO "service_role";



GRANT ALL ON TABLE "public"."cotizacion_items" TO "anon";
GRANT ALL ON TABLE "public"."cotizacion_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizacion_items" TO "service_role";



GRANT ALL ON TABLE "public"."formula_variables" TO "anon";
GRANT ALL ON TABLE "public"."formula_variables" TO "authenticated";
GRANT ALL ON TABLE "public"."formula_variables" TO "service_role";



GRANT ALL ON SEQUENCE "public"."formula_variables_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."formula_variables_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."formula_variables_id_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."material_types" TO "anon";
GRANT ALL ON TABLE "public"."material_types" TO "authenticated";
GRANT ALL ON TABLE "public"."material_types" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."organization_profile" TO "anon";
GRANT ALL ON TABLE "public"."organization_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_profile" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_types" TO "anon";
GRANT ALL ON TABLE "public"."product_types" TO "authenticated";
GRANT ALL ON TABLE "public"."product_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_types_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";



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



