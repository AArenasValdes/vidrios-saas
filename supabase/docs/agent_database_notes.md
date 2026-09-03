# Agent Database Notes - Ventora

Reglas y contexto para futuros agentes que trabajen sobre la base de datos.
Fuente de verdad, en orden: base remota verificada; migraciones registradas en remoto; fuentes recuperadas con `supabase migration fetch --linked`; y, solo como baseline historico, `current_schema.sql`. El dump y `database.types.ts` estan atrasados respecto de migraciones recientes; revisar migraciones y addendums en `database_map.md` y `rls_policies.md`.

## Endurecimiento aplicado y verificado (2026-08-20)

La migracion `20260814201536_security_hardening_payments_auth.sql` consta aplicada y verificada en el addendum remoto del 2026-08-20. Estos controles forman parte del contrato actual:

- privilegios por columna en `organization_profile`, sin escritura cliente sobre estado de billing;
- revocacion del `SELECT` cliente sobre el ledger crudo `pagos_suscripcion`;
- deduplicacion durable de webhooks en `payment_webhook_events`;
- RPC `complete_verified_auth_account(...)`, que impide reclamar usuarios por coincidencia de correo.

La aplicacion consume el contrato endurecido. Para una nueva base o una reconciliacion futura, verificar historial remoto, regenerar `database.types.ts` y ejecutar el smoke completo de registro, login y webhook antes de desplegar.

## Catálogo comercial de líneas (2026-09-03)

Migración `20260903110000_line_template_catalog_key`: agrega `catalog_key text null` a `cotizacion_line_templates` con unique parcial `(organization_id, catalog_key) WHERE catalog_key IS NOT NULL AND eliminado_en IS NULL`.

Propósito: seed idempotente del catálogo Ventora al crear o abrir una organización. `seedDefaultLineCatalog()` inserta **solo** las `catalog_key` canónicas ausentes (23 líneas en Fase 3: L5000/L20/L25/L32/L42 + aluminio/PVC comercial), con `precio_m2_sugerido=0`, `minimo_cobrable=0`, `redondeo_precio=1000` y `catalog_metadata.needsCommercialPrice=true`. No sobrescribe precios, nombres ni vidrio habitual de filas existentes; las líneas privadas (`catalog_key` null) no bloquean el alta de keys faltantes.

**Vidrio habitual (Fase 3):** preferencia opcional del taller en `vidrio_principal_recomendado` (nullable). Se usa como sugerencia al cotizar; el valor final queda en `cotizacion_items.vidrio`. No hay tabla ni matriz de precios por vidrio.

Ganchos de ejecución:
- Server-side con `service_role`: al provisionar org vía OAuth, correo o admin.
- Client-side con RLS: fallback en `useCotizacionLineTemplates` (una vez por sesión) para rellenar keys faltantes.

Reglas para agentes:
- No insertar más `catalog_key` sin aprobación explícita.
- No modificar precios/nombres/vidrio habitual de líneas existentes vía seed.
- Las líneas con `catalog_key` que se soft-deleten no se recrean (el unique parcial las excluye, pero `seedDefaultLineCatalog` no detecta keys eliminadas).

## Borradores técnicos estructurales (Fase 4, 2026-09-03)

Sin migración nueva: reutiliza `fabrication_recipes` con `status = 'draft'` y `definition` JSON (`FabricacionReceta`).

- `catalog_metadata.structuralArchetypeId` en líneas Ventora apunta al arquetipo (`corredera_2h`, `pvc_corredera_3h`, etc.).
- `seedStructuralDraftsForOrganization()` inserta solo para líneas con `catalog_key` Ventora **sin** receta existente en `fabrication_recipes.line_template_id`.
- `source_reference` queda como `ventora-arquetipo:{arquetipoId}` para trazabilidad.
- No sobrescribe recetas privadas ni versiones ya creadas por el taller.
- Códigos de perfil y descuentos de corte quedan vacíos/pendientes; solo L5000/L20/L25 heredan ajustes documentados de `bases-tipologicas-ventora.ts`.
- No activar `cuttingEnabled` ni validar recetas automáticamente: la cotización comercial no depende de esto.

**Referencias de perfiles (Fase 4A, 2026-09-03):** `catalog_metadata.workshopProfiles` guarda códigos, roles, proveedor y fuente documental de forma informativa. El seed `seedProfileReferencesForOrganization()` solo rellena líneas Ventora sin `workshopProfiles` vigente; no toca precios ni líneas privadas.

---

## Archivos obligatorios antes de tocar la base de datos

Un agente NO debe modificar queries, services, hooks, types, functions, migrations, seeds o RLS sin haber leído primero:

1. **`supabase/docs/current_schema.sql`** — Baseline histórico con tablas, columnas, tipos, constraints, FKs, índices, RLS policies, funciones y grants. Antes de usarlo como verdad actual, contrastarlo con migraciones registradas y la base remota.
2. **`supabase/docs/database_map.md`** — Mapa completo de tablas, relaciones, flujo de negocio y riesgos.
3. **`supabase/docs/rls_policies.md`** — Detalle de todas las policies RLS, mecanismos de aislamiento y riesgos de seguridad.
4. **`supabase/docs/seed_order.md`** — Orden de carga de seed data y dependencias.
5. **`AGENTS.md`** — Reglas generales del proyecto, convenciones y prioridades de producto.

Si se detecta una diferencia entre el codigo y `current_schema.sql`, verificar primero la base remota y las migraciones registradas. No modificar ni reparar el historial solo para hacer coincidir un dump antiguo.

---

## Convenciones de naming

### Tablas

- Nombres en **español** para dominio de negocio: `cotizaciones`, `solicitudes_contacto`, `historial_precios`.
- Nombres en **inglés** para infraestructura y legado técnico: `web_push_subscriptions`, `line_glass_compatibility`, `quote_item_breakdown`, `configuration_materials`.
- Mezcla heredada: `clients`, `projects` y `users` coexisten con `cotizaciones` y `solicitudes_contacto`.

### Columnas

- **Español** por defecto: `nombre`, `correo`, `telefono`, `direccion`, `creado_en`, `actualizado_en`, `eliminado_en`, `proyecto_id`, `cliente_id`.
- **Inglés** para tablas técnicas: `endpoint`, `p256dh`, `auth`, `subscription`, `is_active`, `created_at`, `updated_at`, `last_seen_at`, `glass_material_id`, `system_line_id`.

### Constraint names

- Mezcla heredada: `quotes_pkey`, `quote_items_pkey` vs `cotizacion_code_counters_pkey`, `solicitudes_contacto_pkey`.
- Algunas FKs usan `organization_id`, otras `organizacion_id`.

### Secuencias

- Nombres en inglés heredados: `quotes_id_seq` → `cotizaciones`, `quote_items_id_seq` → `cotizacion_items`.

### Regla práctica

- Para nuevas tablas/columnas: usar **español** para dominio de negocio e **inglés** solo si es infraestructura pura.
- No renombrar lo existente sin migración explícita.
- Mantener consistencia dentro de una misma tabla.

---

## Estándar multi-tenant

### `organization_id` es el campo de aislamiento

- **Toda tabla operativa** debe tener `organization_id` bigint.
- **Toda query** debe filtrar por `organization_id`.
- Las tablas sin `organization_id` son catálogos globales: `product_types`, `material_types`, `formula_variables`.
- Las tablas con `organization_id` nullable son catálogos mixtos: `system_lines`, `system_configurations`.

### Reglas estrictas

1. **Nunca hacer una query que cruce organizaciones.** Siempre filtrar por `organization_id` del usuario autenticado.
2. **Nunca exponer datos de otra org** vía API, hooks, services o repositories.
3. **Todo repository** debe recibir `organization_id` como parámetro o derivarlo del contexto de autenticación.
4. **Las páginas no importan repositories directo.** Flujo: `page → hook → service → repository → Supabase`.
5. **`service_role` salta RLS.** Solo usar para operaciones server-side que necesiten cruzar orgs.

### Casos especiales

- `solicitudes_contacto.organization_id` es **nullable**. Leads de landing global no tienen org asignada. Leads de solicitud pública por empresa sí tienen org.
- `system_lines.organization_id` y `system_configurations.organization_id` son **nullable**. `NULL` = catálogo global visible para todos.

---

## Reglas sobre migrations

1. **No modificar migraciones ya aplicadas.** Crear una nueva migración.
2. **No borrar tablas legacy por inercia.** Si una tabla técnica está dormida, dejarla.
3. **Toda nueva tabla en `public` debe tener RLS.**
4. **Toda nueva tabla operativa debe tener `organization_id`.**
5. **Toda nueva tabla operativa debe tener `eliminado_en`.** Soft delete.
6. **Incluir `creado_en` y `actualizado_en`** con defaults apropiados.
7. **Los nombres de FK deben usar `organization_id`**, no `organizacion_id`.
8. **Verificar FKs duplicadas.** El schema actual ya tiene varias.

---

## Reglas sobre RLS

1. **RLS siempre habilitado.** Toda tabla en `public` debe tener `ENABLE ROW LEVEL SECURITY`.
2. **Toda tabla operativa necesita policies.** RLS sin policies = tabla inaccesible desde cliente.
3. **Usar `get_org_id()` como mecanismo principal.**
4. **Excepción justificada:** si una policy usa lógica distinta, documentar por qué.
5. **Tablas de catálogo global** deben tener policy SELECT con `true` o con `organization_id IS NULL OR organization_id = get_org_id()`.
6. **No dar grants `ALL` a `anon`** sin considerar impacto.
7. **Verificar que `solicitudes_contacto` mantenga policy INSERT para `anon`.** El formulario público lo necesita.

### Tablas sin policies que requieren atención

Ver detalle en `rls_policies.md`. Las más urgentes:

- `web_push_subscriptions` — bloquea notificaciones push.
- `quote_item_breakdown` — bloquea visualización de breakdowns.
- `material_types` — bloquea listado de tipos de material.
- `formula_variables` — bloquea lectura de variables de fórmula.

---

## Reglas sobre `organization_id`

1. **Tipo:** `bigint NOT NULL` en tablas operativas. `bigint` nullable en catálogos mixtos.
2. **FK:** Siempre hacia `organizations.id`.
3. **Naming:** Siempre `organization_id`, nunca `organizacion_id`.
4. **RLS:** Toda policy de aislamiento usa `organization_id = get_org_id()`.
5. **Índices:** Toda tabla con `organization_id` debe tener índice btree; preferir índices compuestos para queries activas.

---

## Inconsistencias conocidas

| ID | Inconsistencia | Severidad | Acción recomendada |
|---|---|---|---|
| INC-1 | FK duplicadas en `cotizacion_items`, `configuration_materials`, `quote_item_breakdown` | Alta | Limpiar FKs duplicadas en migración futura |
| INC-2 | `historial_precios_organizacion_id_fkey` usa `organizacion_id` en vez de `organization_id` | Media | Renombrar constraint en migración futura |
| INC-3 | `unique_correo_clients` sin scope de org | Alta | Reemplazar por unique parcial `(organization_id, correo)` WHERE `eliminado_en IS NULL` |
| INC-4 | `web_push_subscriptions` sin FK para `organization_id` y `auth_user_id` | Media | Agregar FKs en migración futura |
| INC-5 | `cotizacion_code_counters` sin FK para `organization_id` | Baja | Agregar FK en migración futura |
| INC-6 | `system_lines` y `system_configurations` sin FK para `organization_id` | Baja | Agregar FK nullable en migración futura |
| INC-7 | Nombres de secuencias en inglés vs tablas en español | Baja | No cambiar, documentar |
| INC-8 | `solicitudes_contacto` ya tiene policies base, pero falta validación fina de endurecimiento y smoke test real de captación | Media | Verificar flujo público + dashboard con usuarios reales |
| INC-9 | `web_push_subscriptions` sin policies RLS | Alta | Agregar policies |
| INC-10 | `quote_item_breakdown` sin policies RLS | Alta | Agregar policies |
| INC-11 | `material_types` y `formula_variables` sin policies RLS | Media | Agregar policy SELECT |
| INC-12 | `organization_profile` usa subquery en vez de `get_org_id()` | Baja | Considerar unificar patrón |
| INC-13 | Sin CHECK en `estado` de `cotizaciones`, `estado_comercial`, `estado` de `projects`, `rol` de `users` | Media | Agregar CHECK constraints |
| INC-14 | Grants `ALL` a `anon` en todas las tablas | Media | Restringir grants donde `anon` no necesita escribir |

---

## Funciones database existentes

| Función | Uso | No hacer |
|---|---|---|
| `get_org_id()` | Resolver org del usuario autenticado | No volver a consultar `public.users` para obtener `organization_id` |
| `reserve_next_cotizacion_code(org_id, date)` | Generar código de cotización atómico | No generar códigos manualmente en la app |
| `admin_purgar_clientes_eliminados(retention_days)` | Purga de soft deletes antiguos | No hacer hard delete directo desde la app |
| `rls_auto_enable()` | Event trigger automático | No activar RLS manualmente si el trigger funciona |

---

## Soft delete — regla obligatoria

- **Borrar = `eliminado_en: timestamp`**. Nunca `DELETE FROM`.
- **Queries activas filtran `.is("eliminado_en", null)`**.
- **Hard delete solo vía `admin_purgar_clientes_eliminados`** con retención de 90 días por defecto.
- **Los índices parciales** usan `WHERE eliminado_en IS NULL`.

---

## Antes de proponer cambios

1. ¿Esto ayuda a capturar más leads o a perder menos leads?
2. ¿Esto ayuda a cerrar más oportunidades reales?
3. ¿Esto respeta el aislamiento multi-tenant?
4. ¿Se leyeron los 5 archivos obligatorios?
5. ¿Se verificó que no se reintroduce lógica de cotizador técnico como centro del producto?

Si la respuesta a 1-4 no es sí: detenerse y reportar.

---

## Addendum 2026-05-31 - auditoría pre-producción

- `web_push_subscriptions` ya tiene policies por `organization_id + auth_user_id`; el riesgo vigente es la falta de FK formal a `organizations` y `auth.users`.
- `quote_item_breakdown` ya tiene policies por `organization_id`; verificar que toda query siga filtrando tenant.
- `cotizacion_code_counters` tiene acceso por org para `authenticated`, pero debe usarse preferentemente vía `reserve_next_cotizacion_code()`.
- `material_types` y `formula_variables` quedan cerradas para cliente con policies deny-all; exponer solo si la UI vuelve a necesitarlas.
- `public_landing_testimonials.organization_id` debe ser `bigint`; se agregó `20260531050353_harden_public_landing_testimonials_org_id.sql` para endurecerlo.
- Antes de producción falta correr `supabase db advisors --linked`, `supabase db lint --linked` y regenerar `current_schema.sql`/`database.types.ts` con `SUPABASE_DB_PASSWORD` configurado.

---

## Addendum 2026-05-31 - MCP Supabase conectado

- MCP Supabase autenticado contra proyecto `yrtrwgkaopfumpidjthk`.
- Advisors remotos ejecutados: security y performance.
- Se confirmo en remoto: 26 tablas `public`, todas con RLS habilitado.
- Se aplico `20260531212114_harden_subscription_security_advisors`: `pagos_suscripcion` queda solo lectura para `authenticated`; inserts/updates/deletes quedan server-side con `service_role`.
- Se aplico `20260531212250_optimize_web_push_rls_initplan`: policies de `web_push_subscriptions` optimizadas para no recalcular `auth.uid()` por fila.
- Migraciones remotas registradas actualmente: `20260317154500`, `20260427103000`, `20260517053830`, `20260517054151`, `20260518040656`, `20260531212114`, `20260531212250`.
- Hay drift historico: la base remota contiene tablas recientes que no aparecen como migraciones remotas antiguas; conservar esta nota hasta normalizar historial con Supabase CLI.
- `database.types.ts` local sigue marcado como atrasado porque MCP genero tipos pero CLI local aun no puede escribirlos sin `SUPABASE_DB_PASSWORD`; regenerar cuando se normalice acceso CLI.

---

## Addendum 2026-07-28 - completar cuenta Google

- MCP Supabase autenticado y verificado contra `yrtrwgkaopfumpidjthk`.
- Migracion remota registrada: `20260728083604_google_oauth_account_completion`.
- No usar `db push` para esta pasada: existe drift historico entre archivos locales y el historial remoto. La migracion fue aplicada de forma individual con `apply_migration`.
- `complete_google_oauth_account(...)` es la unica operacion autorizada para completar atomicamente el alta Google. Solo se llama desde servidor con `service_role`.
- La idempotencia depende de cuatro barreras: unique exact existente, unique normalizado nuevo, unique parcial de `auth_user_id` y advisory locks por identidad/correo.
- Los campos `users.nombre`, `users.whatsapp`, `users.ciudad_comuna` y `users.data_sharing_accepted_at` son privados. No agregarlos a grants de columna para `authenticated` ni consultarlos desde browser.
- El consentimiento se fecha con `now()` dentro de Postgres. Nunca aceptar un timestamp entregado por cliente.
- No insertar trials manualmente desde la RPC. El trigger de `organizations` crea o conserva `organization_profile` y sus defaults de trial dentro de la misma transaccion.
- Security Advisor no reporta la RPC nueva. Permanecen avisos previos sobre `touch_growth_updated_at`, `get_org_id()`, `reserve_next_cotizacion_code()` y leaked password protection.

---

## Addendum 2026-05-31 - indices FK produccion

- Se aplico migracion remota/local `20260531232020_add_missing_fk_indexes_and_drop_duplicate`.
- Todas las FKs tienen covering index confirmado por SQL.
- Avisos `unused_index` quedan documentados como no accionables hasta tener uso real.
- `auth_leaked_password_protection` queda aceptado como limitacion de Supabase Free; re-evaluar al pasar a Pro.

---

## Addendum 2026-07-29 - Supabase remoto y Fabricacion Fase 2

- MCP Supabase fue agregado y autenticado para el proyecto `yrtrwgkaopfumpidjthk`.
- En esta sesion las herramientas MCP no quedaron inyectadas al listado de tools, por lo que la auditoria remota se ejecuto con Supabase CLI `--linked`.
- Proyecto remoto reportado por `supabase projects list`: `ACTIVE_HEALTHY`, region `us-west-2`, Postgres `17.6.1.063`.
- Nota historica: al 2026-07-29 la migracion local `20260729230407_fabrication_recipes_persistence.sql` no estaba aplicada en remoto. Fue aplicada y verificada el 2026-07-30; ver addendum de cierre abajo.
- No usar `db push` a ciegas por el drift historico ya documentado. Para futuras migraciones, preferir aplicacion controlada de la migracion especifica y luego verificar tablas, RLS, policies, triggers e indices.
- Nuevas tablas de Fase 2 esperadas:
  - `fabrication_recipes`: recetas versionadas, `organization_id bigint nullable`, `line_template_id bigint nullable`, `scope`, `status`, `definition jsonb`, soft delete.
  - `fabrication_recipe_tests`: casos de prueba por receta, input/salida esperada/salida real, `passed`, soft delete.
- Estado legacy remoto actualizado:
  - `quote_item_breakdown` ya tiene policies RLS por `organization_id`.
  - `formula_variables` tiene deny-all para `anon`/`authenticated`.
  - `materials` tiene policies por `organization_id`, pero con rol `public` y UPDATE sin `WITH CHECK`.
  - `system_lines` tiene SELECT por `organization_id IS NULL OR organization_id = get_org_id()`, con rol `public`.
- Advisors remotos activos:
  - Security: `touch_growth_updated_at` sin `search_path`; `get_org_id()` y `reserve_next_cotizacion_code(...)` son `SECURITY DEFINER` ejecutables por `authenticated`; leaked password protection desactivado.
  - Performance: faltan covering indexes en FKs `growth_activities.workspace_id`, `growth_prospects.converted_organization_id`, `growth_tasks.prospect_id`.
- Antes de afirmar que la base esta lista para produccion tecnica, resolver o aceptar explicitamente esos advisors y volver a correr `supabase db advisors --linked --type security` y `--type performance`.

---

## Addendum 2026-07-29 - Fabricacion Fase 3 snapshot por item

- Migracion local nueva: `20260729234019_cotizacion_items_fabricacion_snapshot.sql`.
- Agrega `cotizacion_items.fabricacion_snapshot jsonb` con CHECK de objeto e indice parcial `(organization_id, cotizacion_id)` para filas activas con snapshot.
- La columna hereda las policies RLS de `cotizacion_items`; no se agregaron grants ni policies nuevas.
- El flujo nuevo guarda snapshots tecnicos formales en JSONB y deja `[cub:]` solo como lectura legacy.
- Nota historica: al 2026-07-29 esta migracion no estaba aplicada/verificada en remoto. Fue aplicada y verificada el 2026-07-30; ver addendum de cierre abajo.

---

## Addendum 2026-07-30 - Cierre remoto Fabricacion Fase 3

- Migraciones aplicadas y registradas en Supabase remoto `yrtrwgkaopfumpidjthk`: `20260729230407_fabrication_recipes_persistence`, `20260729234019_cotizacion_items_fabricacion_snapshot` y `20260730001306_harden_fabrication_recipe_grants`.
- Se aplicaron con `npx supabase db query --linked --file ...` y se registraron con `npx supabase migration repair --linked --status applied ...` por drift historico; no se uso `db push`.
- `fabrication_recipes` y `fabrication_recipe_tests` tienen RLS habilitado y policies para `authenticated`; `anon` no tiene privilegios sobre esas tablas despues del hardening.
- Grants finales verificados: `authenticated` y `service_role` tienen solo `INSERT,SELECT,UPDATE` en las tablas nuevas; no tienen `DELETE/TRUNCATE`.
- Smoke remoto con dos empresas QA temporales verifico:
  - una organizacion lee su receta privada y no lee ni edita la privada de otra;
  - ambas organizaciones leen una receta Ventora;
  - una cotizacion sin receta queda sin `fabricacion_snapshot`;
  - una cotizacion con una receta validada compatible guarda `fabricacion_snapshot`;
  - una cotizacion con multiples recetas validadas compatibles queda sin snapshot automatico;
  - una receta `validated` no se edita directamente;
  - el snapshot historico no cambia al archivar/versionar la receta.
- Datos QA creados durante el smoke quedaron limpiados con soft delete: cotizaciones/items, recetas, lineas, clients/projects/users/organizations; los usuarios Auth QA se eliminaron.
- `supabase db advisors --linked --type performance` no reporta issues.
- `supabase db advisors --linked --type security` conserva solo avisos previos: `touch_growth_updated_at` sin `search_path`, `get_org_id()` y `reserve_next_cotizacion_code(...)` como SECURITY DEFINER ejecutables por authenticated, y leaked password protection desactivado.

---

## Addendum 2026-07-30 - Fabricacion Fase 4

- Aplicada y registrada en remoto `20260730003756_fabrication_recipe_validation_metadata`.
- Agrega `fabrication_recipes.validated_by` y `fabrication_recipe_tests.is_required` sin modificar datos ni policies existentes.
- Verificacion remota: ambas tablas mantienen RLS habilitado y tres policies; columnas y triggers `fabrication_recipes_prevent_validated_update` / `fabrication_recipe_tests_enforce_validator` existen.
- Las operaciones authenticated no pueden atribuir una validacion o prueba aprobada a otro usuario: `validated_by` debe coincidir con `auth.uid()`.
- El aislamiento con dos empresas, lectura de recetas Ventora y estabilidad del snapshot historico ya fueron comprobados en el smoke Fase 3; esta migracion no cambia esas policies.

---

## Addendum 2026-08-13 - Billing y deuda de historial confirmada

- La deuda no representa una segunda base de datos: seis cambios remotos tienen fuentes locales equivalentes con otro timestamp, resultado de lineas historicas distintas. Las parejas son hardening multi-tenant, follow-up policies, vidrio recomendado, snapshot financiero, catalogo de lineas y configuracion visual de items.
- `supabase migration fetch --linked` recupero las seis fuentes remotas para que el repositorio pueda auditarlas. No se marco como aplicada ninguna migracion local antigua de manera masiva.
- Se aplicaron y registraron de forma controlada `20260812233117_billing_phase_2_mercadopago_chile` y `20260813002850_trial_fifteen_day_default` despues de confirmar que sus objetos no existian en remoto.
- Verificacion remota: `organization_profile.trial_ends_at` y su trigger usan 15 dias para altas nuevas; el trigger conserva `plan_code='trial'`. `suscripciones_organizacion` tiene RLS y solo policy SELECT por tenant para `authenticated`; `anon` no puede leerla y las RPC Mercado Pago son solo `service_role`.
- No usar `supabase db push` ni `migration repair` global mientras persistan versiones locales antiguas sin marca remota. Para una migracion nueva: aplicar el archivo especifico, verificar objetos/RLS/grants y registrar solo esa version.
- `current_schema.sql` fue regenerado desde remoto el 2026-08-13 tras iniciar Docker Desktop. Incluye Fases 1-5 de billing y representa el baseline remoto actual.
- `supabase db diff --from linked --to migrations` sigue bloqueado por deuda historica: el primer archivo local (`20260317154500_organization_profile.sql`) espera `public.organizations` pero no existe una migracion base local que la cree para la shadow database. No usar `db push` ni reparar versiones antiguas en bloque; resolver esa cadena en una tarea dedicada.
- `supabase gen types --linked --schema public` funciona y confirma que los tipos remotos ya incluyen `country_code`, `tax_rate_default` y la nueva firma de `complete_google_oauth_account`.

---

## Addendum 2026-08-13 - Billing Fase 4 regionalizacion

- Migracion aplicada y registrada en remoto: `20260813015101_billing_phase_4_organization_region`.
- `organization_profile` ahora es la fuente de configuracion regional: pais, moneda, locale, zona horaria, codigo telefonico y defaults tributarios comerciales. Los perfiles existentes se backfillearon a Chile sin tocar cotizaciones.
- `complete_google_oauth_account` mantiene `SECURITY INVOKER`, locks y EXECUTE solo para `service_role`; su nueva firma recibe `p_country_code text` y resuelve el preset en Postgres.
- `users.whatsapp` valida E.164 generico. Sus columnas privadas y sus grants no se ampliaron.
- El primer intento de aplicacion fue rechazado por una constraint regex antes de confirmar la transaccion. Se revirtio su fila de historial y el segundo intento se verifico con columnas y firma de RPC remotas.
- No usar la configuracion regional actual para reinterpretar PDFs o cotizaciones historicas: Fase 5 ya congela un snapshot por cotizacion al crearla.

## Addendum 2026-08-13 - Registro inmediato por correo

- Migracion aplicada y registrada en remoto: `20260813033746_password_account_signup_and_optional_city`.
- No crear una RPC paralela para correo/contrasena: `/api/auth/signup` crea el usuario Auth con `service_role`, llama a `complete_google_oauth_account(...)` y revierte ese Auth user si el provisionamiento falla.
- `ciudad_comuna` puede ser vacia en la RPC y se persiste como `NULL`; mantiene el limite de 2 a 120 caracteres cuando el usuario si la informa.
- Verificacion remota: la funcion sigue `SECURITY INVOKER`; `service_role` conserva EXECUTE y `anon` no lo tiene.

---

## Addendum 2026-08-13 - Billing Fase 5 snapshot regional de cotizacion

- Migracion aplicada y registrada en remoto: `20260813023403_billing_phase_5_quote_region_snapshots.sql`.
- `cotizaciones.regional_snapshot` es JSONB opcional con CHECK de objeto. No requiere tabla, RLS, policy ni grant nuevos porque hereda los controles de `cotizaciones` por `organization_id`.
- `cotizacionesAppService.saveWorkflow()` crea el snapshot con el perfil regional vigente solo para una cotizacion nueva; al editar, conserva el snapshot ya guardado.
- Las salidas PDF, publica y WhatsApp leen el snapshot. Si falta por ser historica, resuelven el fallback Chile (`CLP`, `es-CL`, `IVA 19%`) sin consultar el perfil actual.

---

## Addendum 2026-08-13 - Verificación de compatibilidad regional y cálculo comercial

- Consulta remota posterior al backfill: 31 perfiles de organización existentes están en Chile (`CL`, `CLP`, `es-CL`, `IVA`, `19%`) y no hay organizaciones activas sin `organization_profile`.
- La aplicación usa el snapshot regional al calcular totales de cotizaciones nuevas. Chile mantiene IVA 19% y redondeo comercial a $1.000; los otros presets usan su tasa propia y no heredan ese redondeo.
- No se aplicó una migración adicional: el esquema de Fases 4 y 5 ya contenía los campos necesarios. La deuda histórica de versiones sigue impidiendo `supabase db push` global.

---

## Addendum 2026-08-20 - Reconciliación de historial y hardening crítico

- Se verificó el proyecto remoto `yrtrwgkaopfumpidjthk`: 37 tablas `public` con RLS habilitado, sin huérfanos multi-tenant en las cadenas comerciales revisadas, sin locks en espera ni índices inválidos. No se detectaron errores PostgreSQL ni HTTP 5xx en las últimas 24 horas de logs revisados.
- Se reconcilió el ledger de migraciones local/remoto: 80 versiones históricas quedaron 1:1. La colisión local `20260619120000` se resolvió renombrando la migración de `responsable_comercial` a `20260619120001`; la variación remota `20260813201525` se normalizó contra el archivo local equivalente `20260813201500`. Desde este punto `supabase db push --linked` vuelve a ser el flujo válido para migraciones incrementales, precedido por `--dry-run`.
- Se aplicaron y verificaron `20260820193644_database_critical_hardening` y `20260820193904_fix_quote_request_foreign_key_index`: `users` y `cotizaciones` ahora limitan sus policies de lectura/escritura a `authenticated` y usan `WITH CHECK` de `organization_id = get_org_id()` al escribir; `touch_growth_updated_at()` fija `search_path = pg_catalog, public`; el FK compuesto de solicitudes en cotizaciones tiene índice `(solicitud_id, organization_id)`.
- El bucket público `organization-assets` sigue público porque alimenta landing, pero ahora acepta sólo `image/jpeg`, `image/png` e `image/webp`, con máximo de 20 MB. La API normaliza las subidas a JPEG/PNG antes de almacenarlas.
- El advisor de seguridad ya no reporta `touch_growth_updated_at`. Permanecen tres avisos conocidos: `payment_webhook_events` tiene RLS sin policy porque es server-only, y `get_org_id()` / `reserve_next_cotizacion_code(...)` son `SECURITY DEFINER` intencionales con validación de tenant. `auth_leaked_password_protection` continúa desactivado y requiere activación explícita desde Supabase Auth.
- Los avisos de rendimiento restantes son FKs secundarias sin índice y métricas de índices sin uso; no eliminar índices ni ampliar esta auditoría mientras el foco sea el plan de marketing.

---

## Addendum 2026-08-20 - Fase B onboarding medible

- Migración aplicada y registrada en remoto: `20260820194620_growth_onboarding_measurement`.
- Crea `growth_onboarding_videos`, `growth_onboarding_assignments` y `growth_onboarding_events`. Las tres tablas tienen RLS y `FORCE RLS`; el acceso founder se resuelve por `growth_workspace_members` con rol `admin` y una empresa sólo puede leer sus propias asignaciones/eventos.
- Los triggers de `cotizaciones` registran de forma idempotente `primera_cotizacion_creada` y `primer_pdf_descargado`. Se hizo baseline histórico: 19 organizaciones con primera cotización y 13 con primer PDF al momento de aplicar.
- Las funciones trigger usan `SECURITY DEFINER` con `search_path` fijo, pero `anon` y `authenticated` no tienen EXECUTE; sólo `postgres` y `service_role` figuran en ACL. No llamar estas funciones como RPC.
- Un video `listo` exige URL HTTPS; no se cargaron enlaces inventados ni se alteró el flujo de cotización/PDF existente.
- Corrección escalable: `20260820205800_growth_onboarding_automatic_defaults` agrega `es_predeterminado`; existe un único default listo por `workspace_id + dispositivo` (`movil` o `escritorio`). No crear asignaciones por empresa para el onboarding normal.
- `20260820210606_growth_onboarding_scale_hardening` agrega índices de FKs de pilotos/eventos y descompone la policy `FOR ALL` heredada para no duplicar el SELECT de RLS.

---

## Addendum 2026-08-21 - Métricas de adopción del cotizador

- Migración aplicada y verificada en remoto: `20260821163629_quote_creation_surface_metrics`.
- `cotizaciones.creation_surface` es nullable y distingue `desktop_constructor`, `desktop_guiada`, `mobile_constructor`, `mobile_guiada` y `total_global` al crear nuevas cotizaciones. No se hace backfill: las cotizaciones anteriores quedan sin clasificación confiable.
- No cambia RLS, grants ni ownership. El índice parcial `cotizaciones_creation_surface_active_idx` sirve al panel founder para leer adopción sin incluir soft deletes.
- El panel `/admin/marketing` filtra primero por `organization_profile.is_test_account=false`; no excluir cuentas por correo ni nombre.

---

## Addendum 2026-08-31 - Pricing V2 y preservación de contratos

- El operador confirmó la aplicación de `20260831120000_preserve_founder_price_lock.sql` en Supabase remoto.
- La migración no crea tablas ni columnas: ajusta el lifecycle para conservar el valor existente de `organization_profile.founder_price_locked` y no asignarlo automáticamente a nuevas altas Comerciales.
- Pricing V2 mantiene cuatro variantes comerciales en el catálogo server-side de la aplicación. Supabase persiste el producto lógico (`quote_only` o `founder_full`), la periodicidad y el monto contractual real en `suscripciones_organizacion`; no se reescriben suscripciones ni pagos históricos.
- La verificación remota específica de la función modificada debe hacerse con Supabase MCP/CLI antes de abrir una nueva migración dependiente de ella. No ejecutar `db push` global por el drift histórico documentado.
