# RLS Policies - Ventora

Fuente de verdad: `current_schema.sql`.
Fecha de generación: 2026-05-06.

---

## Resumen

Todas las tablas tienen RLS habilitado. Existe un event trigger (`rls_auto_enable`) que activa RLS automáticamente al crear tablas nuevas en `public`. La función central de aislamiento es `get_org_id()`, que resuelve la organización del usuario autenticado a partir de `auth.email()` + `public.users.correo`. Algunas tablas usan patrones alternativos con subqueries directos.

**Total tablas con RLS habilitado:** 21
**Total tablas con policies definidas:** 15
**Total tablas con RLS habilitado pero SIN policies:** 6
**Función de aislamiento principal:** `get_org_id()`

---

## Función `get_org_id()`

```sql
-- SECURITY DEFINER, STABLE
select organization_id
from public.users
where correo = auth.email()
and eliminado_en is null
limit 1;
```

- Retorna `bigint` (el `organization_id` del usuario autenticado).
- Retorna `NULL` si no hay match (usuario no existe en `public.users` o está soft-deleted).
- Es `SECURITY DEFINER`: ejecuta con permisos de `postgres`, no del caller.
- Es `STABLE`: se cachea dentro de una misma transacción.

**Riesgo:** Si un usuario no existe en `public.users` o tiene `eliminado_en IS NOT NULL`, `get_org_id()` retorna NULL. Las policies que comparan `organization_id = get_org_id()` fallarán silenciosamente (0 filas), lo cual es seguro. Pero no hay mensaje de error explícito.

---

## Tablas con RLS y policies definidas

### 1. `clients`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `clients_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |
| `clients_insert` | INSERT | — | `organization_id = get_org_id()` | `get_org_id()` |
| `clients_update` | UPDATE | `organization_id = get_org_id()` | — | `get_org_id()` |

**DELETE:** Sin policy. Solo accesible via `service_role` o soft delete (`eliminado_en`).

---

### 2. `cotizaciones`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `cotizaciones_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |
| `cotizaciones_insert` | INSERT | — | `organization_id = get_org_id()` | `get_org_id()` |
| `cotizaciones_update` | UPDATE | `organization_id = get_org_id()` | — | `get_org_id()` |

**DELETE:** Sin policy.

---

### 3. `cotizacion_items`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `items_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |
| `items_insert` | INSERT | — | `organization_id = get_org_id()` | `get_org_id()` |
| `items_update` | UPDATE | `organization_id = get_org_id()` | — | `get_org_id()` |

**DELETE:** Sin policy.

---

### 4. `projects`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `projects_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |
| `projects_insert` | INSERT | — | `organization_id = get_org_id()` | `get_org_id()` |
| `projects_update` | UPDATE | `organization_id = get_org_id()` | — | `get_org_id()` |

**DELETE:** Sin policy.

---

### 5. `users`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `users_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |
| `users_insert` | INSERT | — | `organization_id = get_org_id()` | `get_org_id()` |
| `users_update` | UPDATE | `organization_id = get_org_id()` | — | `get_org_id()` |

**DELETE:** Sin policy.

**Riesgo:** Un usuario autenticado puede ver y editar todos los usuarios de su organización, incluyendo otros admins. No hay restriction por `rol` dentro de la org.

---

### 6. `materials`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `materials_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |
| `materials_insert` | INSERT | — | `organization_id = get_org_id()` | `get_org_id()` |
| `materials_update` | UPDATE | `organization_id = get_org_id()` | — | `get_org_id()` |

**DELETE:** Sin policy.

---

### 7. `historial_precios`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `historial_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |
| `historial_insert` | INSERT | — | `organization_id = get_org_id()` | `get_org_id()` |

**UPDATE/DELETE:** Sin policy.

---

### 8. `organizations`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `org_select` | SELECT | `id = get_org_id()` | — | `get_org_id()` |
| `org_update` | UPDATE | `id = get_org_id()` | — | `get_org_id()` |

**INSERT/DELETE:** Sin policy.

**Nota:** Un usuario solo ve y edita su propia organización.

---

### 9. `organization_profile`

| Policy | Operación | Condición USING | Condición WITH CHECK | Rol |
|---|---|---|---|---|
| `organization_profile_select_own` | SELECT | Subquery users | — | `authenticated` |
| `organization_profile_insert_own` | INSERT | — | Subquery users | `authenticated` |
| `organization_profile_update_own` | UPDATE | Subquery users | Subquery users | `authenticated` |

**Patrón alternativo:** No usa `get_org_id()`. Usa subquery directo:
```sql
organization_id IN (
  SELECT users.organization_id
  FROM public.users
  WHERE lower(users.correo) = lower(auth.email())
  AND users.eliminado_en IS NULL
)
```

**Restricción:** Solo accesible para rol `authenticated` (no `anon`).

**Riesgo:** Patrón inconsistente con el resto de tablas. Si se modifica la lógica de resolución de org, estas policies no se benefician del cambio centralizado en `get_org_id()`.

---

### 10. `labor_costs`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `labor_costs_select` | SELECT | `organization_id = get_org_id()` | — | `get_org_id()` |

**INSERT/UPDATE/DELETE:** Sin policy.

**Riesgo:** Solo lectura. No se pueden crear ni editar costos de mano de obra via cliente. **Requiere revisión** — probablemente falta policy de INSERT y UPDATE.

---

### 11. `configuration_materials`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `configuration_materials_select` | SELECT | Subquery system_configurations | — | Subquery cruzado |

**Patrón alternativo:**
```sql
EXISTS (
  SELECT 1 FROM public.system_configurations sc
  WHERE sc.id = configuration_materials.configuration_id
  AND (sc.organization_id IS NULL OR sc.organization_id = get_org_id())
)
```

**Nota:** Los materiales de configuraciones globales (`organization_id IS NULL`) son visibles para todas las orgs.

**INSERT/UPDATE/DELETE:** Sin policy.

---

### 12. `system_configurations`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `system_configurations_select` | SELECT | `organization_id IS NULL OR organization_id = get_org_id()` | — | `get_org_id()` + nullable |

**INSERT/UPDATE/DELETE:** Sin policy.

**Nota:** Configuraciones globales (sin org) son visibles para todos.

---

### 13. `system_lines`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `system_lines_select` | SELECT | `organization_id IS NULL OR organization_id = get_org_id()` | — | `get_org_id()` + nullable |

**INSERT/UPDATE/DELETE:** Sin policy.

**Nota:** Líneas globales son visibles para todos.

---

### 14. `line_glass_compatibility`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `line_glass_compatibility_select` | SELECT | Subquery system_lines | — | Subquery cruzado |

**Patrón alternativo:**
```sql
EXISTS (
  SELECT 1 FROM public.system_lines sl
  WHERE sl.id = line_glass_compatibility.system_line_id
  AND (sl.organization_id IS NULL OR sl.organization_id = get_org_id())
)
```

**INSERT/UPDATE/DELETE:** Sin policy.

---

### 15. `product_types`

| Policy | Operación | Condición USING | Condición WITH CHECK | Mecanismo |
|---|---|---|---|---|
| `product_types_select` | SELECT | `true` | — | Público total |

**INSERT/UPDATE/DELETE:** Sin policy.

**Nota:** Catálogo global, lectura pública para todos los roles.

---

## Tablas con RLS habilitado pero SIN policies

Estas tablas tienen RLS activado pero **ninguna policy definida**. En Supabase, esto significa que **ningún rol excepto `service_role` puede acceder** (ni `anon`, ni `authenticated`). Son efectivamente inaccesibles desde el cliente.

| Tabla | RLS | Policies | Riesgo |
|---|---|---|---|
| `cotizacion_code_counters` | HABILITADO | 0 | Inaccesible desde cliente. Solo `reserve_next_cotizacion_code()` (SECURITY DEFINER) la modifica. Correcto por diseño. |
| `formula_variables` | HABILITADO | 0 | **Inaccesible desde cliente.** Requiere revisión: si se necesita leer variables de fórmula desde la app, falta policy SELECT. |
| `material_types` | HABILITADO | 0 | **Inaccesible desde cliente.** Requiere revisión: si se necesita listar tipos de material en la UI, falta policy SELECT. |
| `quote_item_breakdown` | HABILITADO | 0 | **Inaccesible desde cliente.** Requiere revisión: si se necesita ver breakdowns desde la app, falta policy SELECT. |
| `solicitudes_contacto` | HABILITADO | 0 | **CRÍTICO.** Sin policies, los vendedores no pueden ver leads desde el cliente. La inserción de leads desde formulario público tampoco funciona sin policy INSERT para `anon`. |
| `web_push_subscriptions` | HABILITADO | 0 | **Inaccesible desde cliente.** Requiere revisión: la app no puede registrar ni consultar suscripciones push sin policies. |

---

## Tablas que DEBERÍAN tener RLS y no lo tienen

Todas las tablas del schema `public` tienen RLS habilitado. No hay tablas sin RLS.

El event trigger `rls_auto_enable` asegura que tablas nuevas también lo tengan.

---

## Resumen de mecanismos de aislamiento

| Mecanismo | Tablas | Patrón |
|---|---|---|
| `get_org_id()` directo | clients, cotizaciones, cotizacion_items, projects, users, materials, historial_precios, organizations, labor_costs, system_configurations, system_lines | `organization_id = get_org_id()` |
| `get_org_id()` + nullable | system_configurations, system_lines | `organization_id IS NULL OR organization_id = get_org_id()` |
| Subquery directo a users | organization_profile | `organization_id IN (SELECT ... WHERE correo = auth.email())` |
| Subquery cruzado | configuration_materials, line_glass_compatibility | `EXISTS (SELECT ... WHERE org_id = get_org_id())` |
| Público total | product_types | `true` |
| Sin policies | cotizacion_code_counters, formula_variables, material_types, quote_item_breakdown, solicitudes_contacto, web_push_subscriptions | Ningún acceso desde cliente |

---

## Riesgos de seguridad

### Críticos

1. **`solicitudes_contacto` sin policies:** Es la tabla central de captación de leads. Sin policy INSERT para `anon`, el formulario público `/solicitud/[empresa]` no puede crear leads. Sin policy SELECT para `authenticated`, los vendedores no pueden ver leads en el dashboard. **Esto bloquea el flujo principal del producto.**

2. **`web_push_subscriptions` sin policies:** La app no puede registrar ni listar suscripciones push. Las notificaciones push no funcionan desde el cliente.

3. **`quote_item_breakdown` sin policies:** Los breakdowns de items no son visibles desde la app. Si la UI necesita mostrar desglose de materiales y costos, está roto.

4. **`material_types` sin policies:** Los tipos de material no son accesibles. Si la UI muestra categorías de materiales, no funciona.

5. **`formula_variables` sin policies:** Las variables de fórmula no son accesibles. Si el cotizador guiado necesita mostrar fórmulas disponibles, no funciona.

### Moderados

6. **Patrón inconsistente en `organization_profile`:** Usa subquery directo en vez de `get_org_id()`. Si se cambia la lógica de resolución de org (ej: soporte para múltiples orgs por usuario), estas policies no se actualizan automáticamente.

7. **Sin restriction por rol:** Ninguna policy distingue entre `admin`, `tecnico` y `viewer`. Cualquier usuario autenticado dentro de una org puede ver, crear y editar todos los registros de la org. No hay protección contra un `viewer` modificando cotizaciones.

8. **Grants `ALL` a `anon` en todas las tablas:** Aunque RLS sin policies bloquea el acceso, el grant `ALL` es excesivo. Si se agrega una policy permisiva por error, `anon` tendría acceso completo.

9. **`get_org_id()` no valida `eliminado_en` en cascada:** Si un usuario está activo pero su organización tiene `eliminado_en IS NOT NULL`, `get_org_id()` retorna el org_id igual. La org "eliminada" seguiría siendo accesible.

10. **`admin_purgar_clientes_eliminados` grant a `anon`:** La función de purga está disponible para el rol `anon`. Aunque internamente valida el usuario autenticado, el grant es innecesariamente amplio.

### Baja prioridad

11. **Sin policies DELETE en tablas con soft delete:** Las tablas operativas usan soft delete (`eliminado_en`), pero no tienen policy DELETE. Esto es intencional (hard delete solo via `service_role` o la función de purga), pero debería documentarse explícitamente.

12. **Sin policies INSERT/UPDATE en tablas de catálogo técnico:** `system_lines`, `system_configurations`, `configuration_materials`, `line_glass_compatibility`, `product_types` solo tienen SELECT. La creación/edición de catálogos técnicos solo es posible via `service_role`. Correcto si la administración de catálogos es interna.
