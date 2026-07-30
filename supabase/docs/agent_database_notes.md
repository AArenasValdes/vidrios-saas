# Agent Database Notes - Ventora

Reglas y contexto para futuros agentes que trabajen sobre la base de datos.
Fuente de verdad: `current_schema.sql` cuando este regenerado. Nota 2026-07-28: `current_schema.sql` y `database.types.ts` estan atrasados respecto de migraciones recientes; revisar migraciones y addendums en `database_map.md` y `rls_policies.md`.

---

## Archivos obligatorios antes de tocar la base de datos

Un agente NO debe modificar queries, services, hooks, types, functions, migrations, seeds o RLS sin haber leído primero:

1. **`supabase/docs/current_schema.sql`** — Fuente de verdad del modelo de datos actual. Contiene tablas, columnas, tipos, constraints, FKs, índices, RLS policies, funciones y grants.
2. **`supabase/docs/database_map.md`** — Mapa completo de tablas, relaciones, flujo de negocio y riesgos.
3. **`supabase/docs/rls_policies.md`** — Detalle de todas las policies RLS, mecanismos de aislamiento y riesgos de seguridad.
4. **`supabase/docs/seed_order.md`** — Orden de carga de seed data y dependencias.
5. **`AGENTS.md`** — Reglas generales del proyecto, convenciones y prioridades de producto.

Si se detecta una diferencia entre el código y `current_schema.sql`, reportarla antes de modificar.

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
