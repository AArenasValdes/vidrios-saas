# Agent Database Notes - Ventora

Reglas y contexto para futuros agentes que trabajen sobre la base de datos.
Fuente de verdad: `current_schema.sql`.

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

- Nombres en **español** para dominio de negocio: `cotizaciones`, `clients`, `solicitudes_contacto`, `historial_precios`.
- Nombres en **inglés** para infraestructura y legado técnico: `web_push_subscriptions`, `line_glass_compatibility`, `quote_item_breakdown`, `configuration_materials`.
- Mezcla heredada: `clients` (inglés), `projects` (inglés), `users` (inglés) coexisten con `cotizaciones` (español), `solicitudes_contacto` (español).

### Columnas

- **Español** por defecto: `nombre`, `correo`, `telefono`, `direccion`, `creado_en`, `actualizado_en`, `eliminado_en`, `proyecto_id`, `cliente_id`.
- **Inglés** para tablas técnicas: `endpoint`, `p256dh`, `auth`, `subscription`, `is_active`, `created_at`, `updated_at`, `last_seen_at`, `glass_material_id`, `system_line_id`.
- Mezcla dentro de una misma tabla: `cotizacion_items` tiene `creado_en` (español) y `created_at` no, pero `quote_item_breakdown` usa `creado_en` (español).

### Constraint names

- **Mezcla español/inglés**: `quotes_pkey`, `quote_items_pkey` vs `cotizacion_code_counters_pkey`, `solicitudes_contacto_pkey`.
- FKs: algunas usan `organization_id` (`clients_organization_id_fkey`), otras usan `organizacion_id` (`historial_precios_organizacion_id_fkey`).

### Secuencias

- Nombres en inglés heredados: `quotes_id_seq` → `cotizaciones`, `quote_items_id_seq` → `cotizacion_items`.

### Regla práctica

- Para nuevas tablas/columnas: usar **español** para dominio de negocio, **inglés** solo si es infraestructura pura.
- No renombrar lo existente sin migración explícita.
- Mantener consistencia dentro de una misma tabla.

---

## Estándar multi-tenant

### `organization_id` es el campo de aislamiento

- **Toda tabla operativa** debe tener `organization_id` bigint.
- **Toda query** debe filtrar por `organization_id`.
- Las tablas sin `organization_id` son catálogos globales: `product_types`, `material_types`, `formula_variables`.
- Las tablas con `organization_id` nullable son catálogos mixtos (global + por org): `system_lines`, `system_configurations`. `NULL` = visible para todas las orgs.

### Reglas estrictas

1. **Nunca hacer una query que cruce organizaciones.** Siempre filtrar por `organization_id` del usuario autenticado.
2. **Nunca exponer datos de otra org** via API, hooks, services o repositories.
3. **Todo repository** debe recibir `organization_id` como parámetro o derivarlo del contexto de autenticación.
4. **Las páginas no importan repositories directo.** Flujo: `page → hook → service → repository → Supabase`.
5. **`service_role` salta RLS.** Solo usar para operaciones server-side que necesiten cruzar orgs (ej: funciones de administración interna).

### Casos especiales

- `solicitudes_contacto.organization_id` es **nullable**. Leads de landing global no tienen org asignada. Leads de solicitud pública por empresa sí tienen org.
- `system_lines.organization_id` y `system_configurations.organization_id` son **nullable**. `NULL` = catálogo global visible para todos.

---

## Reglas sobre migrations

1. **No modificar migraciones ya aplicadas.** Crear una nueva migración.
2. **No borrar tablas legacy por inercia.** Si una tabla técnica está dormida, dejarla. No reintroducir lógica nueva en ella.
3. **Toda nueva tabla en `public` debe tener RLS.** El event trigger `rls_auto_enable` lo hace automáticamente, pero verificar.
4. **Toda nueva tabla operativa debe tener `organization_id`.** Incluir FK hacia `organizations.id`.
5. **Toda nueva tabla operativa debe tener `eliminado_en`.** Soft delete, nunca hard delete desde la app.
6. **Incluir `creado_en` y `actualizado_en`** con defaults apropiados.
7. **Los nombres de FK deben usar `organization_id`**, no `organizacion_id`. Ver inconsistencia documentada.
8. **Verificar FKs duplicadas.** El schema actual tiene FKs dobles en varias tablas. No replicar este patrón en nuevas migraciones.

---

## Reglas sobre RLS

1. **RLS siempre habilitado.** Toda tabla en `public` debe tener `ENABLE ROW LEVEL SECURITY`.
2. **Toda tabla operativa necesita policies.** RLS sin policies = tabla inaccesible desde el cliente.
3. **Usar `get_org_id()` como mecanismo principal.** No inventar subqueries alternativos. La función centraliza la lógica de resolución de org.
4. **Excepción justificada:** Si la policy necesita lógica diferente (ej: `organization_profile` con restricción a `authenticated`), documentar por qué se desvía del patrón.
5. **Tablas de catálogo global** deben tener policy SELECT con `true` o con `organization_id IS NULL OR organization_id = get_org_id()`.
6. **No dar grants `ALL` a `anon`** sin considerar el impacto. Evaluar si `anon` realmente necesita escribir.
7. **Verificar que `solicitudes_contacto` tenga policies para `anon` INSERT.** El formulario público lo necesita.

### Tablas sin policies que requieren atención

Ver detalle en `rls_policies.md`. Las más urgentes:

- `solicitudes_contacto` — bloquea el flujo principal de captación de leads.
- `web_push_subscriptions` — bloquea notificaciones push.
- `quote_item_breakdown` — bloquea visualización de breakdowns.
- `material_types` — bloquea listado de tipos de material.
- `formula_variables` — bloquea lectura de variables de fórmula.

---

## Reglas sobre `organization_id`

1. **Tipo:** `bigint NOT NULL` en tablas operativas. `bigint` nullable en catálogos mixtos.
2. **FK:** Siempre hacia `organizations.id`. No repetir el error de `web_push_subscriptions`, `cotizacion_code_counters`, `system_lines` y `system_configurations` que no tienen FK formal.
3. **Naming:** Siempre `organization_id`, nunca `organizacion_id`. La FK `historial_precios_organizacion_id_fkey` es un bug de naming documentado.
4. **RLS:** Toda policy de aislamiento usa `organization_id = get_org_id()` como base.
5. **Índices:** Toda tabla con `organization_id` debe tener índice btree sobre esa columna. Preferir índices compuestos `(organization_id, ...)` con partial WHERE `eliminado_en IS NULL` para queries activas.

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
| INC-8 | `solicitudes_contacto` sin policies RLS | Crítica | Agregar policies urgente |
| INC-9 | `web_push_subscriptions` sin policies RLS | Alta | Agregar policies |
| INC-10 | `quote_item_breakdown` sin policies RLS | Alta | Agregar policies |
| INC-11 | `material_types` y `formula_variables` sin policies RLS | Media | Agregar policy SELECT |
| INC-12 | `organization_profile` usa subquery en vez de `get_org_id()` | Baja | Considerar unificar patrón |
| INC-13 | Sin CHECK en `estado` de `cotizaciones`, `estado_comercial`, `estado` de `projects`, `rol` de `users` | Media | Agregar CHECK constraints |
| INC-14 | Grants `ALL` a `anon` en todas las tablas | Media | Restringir grants donde `anon` no necesita escribir |

---

## Funciones database existentes

No duplicar lógica que ya existe:

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
- **Hard delete solo via `admin_purgar_clientes_eliminados`** con retención de 90 días por defecto.
- **Los índices parciales** usan `WHERE eliminado_en IS NULL` para optimizar queries activas.

---

## Antes de proponer cambios

1. ¿Esto ayuda a capturar más leads o a perder menos leads?
2. ¿Esto ayuda a cerrar más oportunidades reales?
3. ¿Esto respeta el aislamiento multi-tenant?
4. ¿Se leyeron los 5 archivos obligatorios?
5. ¿Se verificó que no se reintroduce lógica de cotizador técnico como centro del producto?

Si la respuesta a 1-4 no es sí: detenerse y reportar.
