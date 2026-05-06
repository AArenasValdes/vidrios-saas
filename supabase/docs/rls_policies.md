# RLS Policies - Ventora

Fuente de verdad: `current_schema.sql`.
Fecha de generación: 2026-05-06.

---

## Resumen

Todas las tablas de `public` tienen RLS habilitado. El event trigger `rls_auto_enable` fuerza ese comportamiento para tablas nuevas. La función principal de aislamiento es `get_org_id()`, que resuelve la organización activa del usuario autenticado desde `public.users`.

**Total tablas con RLS habilitado:** 21  
**Total tablas con policies definidas:** 16  
**Total tablas con RLS habilitado pero sin policies:** 5  
**Función de aislamiento principal:** `get_org_id()`

---

## Función `get_org_id()`

```sql
select organization_id
from public.users
where correo = auth.email()
  and eliminado_en is null
limit 1;
```

- Retorna `bigint`.
- Si no encuentra usuario válido en `public.users`, retorna `NULL`.
- Es `SECURITY DEFINER` y `STABLE`.

Riesgo residual:
- Si el usuario existe pero su org quedó soft-deleted, la función igual retornará `organization_id`.

---

## Tablas con policies definidas

### 1. `clients`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `clients_select` | SELECT | `organization_id = get_org_id()` | — |
| `clients_insert` | INSERT | — | `organization_id = get_org_id()` |
| `clients_update` | UPDATE | `organization_id = get_org_id()` | — |

### 2. `cotizaciones`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `cotizaciones_select` | SELECT | `organization_id = get_org_id()` | — |
| `cotizaciones_insert` | INSERT | — | `organization_id = get_org_id()` |
| `cotizaciones_update` | UPDATE | `organization_id = get_org_id()` | — |

### 3. `cotizacion_items`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `items_select` | SELECT | `organization_id = get_org_id()` | — |
| `items_insert` | INSERT | — | `organization_id = get_org_id()` |
| `items_update` | UPDATE | `organization_id = get_org_id()` | — |

### 4. `projects`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `projects_select` | SELECT | `organization_id = get_org_id()` | — |
| `projects_insert` | INSERT | — | `organization_id = get_org_id()` |
| `projects_update` | UPDATE | `organization_id = get_org_id()` | — |

### 5. `users`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `users_select` | SELECT | `organization_id = get_org_id()` | — |
| `users_insert` | INSERT | — | `organization_id = get_org_id()` |
| `users_update` | UPDATE | `organization_id = get_org_id()` | — |

Riesgo:
- No hay diferenciación por `rol`. Un usuario autenticado de la org puede ver y editar otros usuarios de su misma org.

### 6. `materials`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `materials_select` | SELECT | `organization_id = get_org_id()` | — |
| `materials_insert` | INSERT | — | `organization_id = get_org_id()` |
| `materials_update` | UPDATE | `organization_id = get_org_id()` | — |

### 7. `historial_precios`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `historial_select` | SELECT | `organization_id = get_org_id()` | — |
| `historial_insert` | INSERT | — | `organization_id = get_org_id()` |

### 8. `organizations`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `org_select` | SELECT | `id = get_org_id()` | — |
| `org_update` | UPDATE | `id = get_org_id()` | — |

### 9. `organization_profile`

Usa subquery directa a `public.users` en vez de `get_org_id()`.

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `organization_profile_select_own` | SELECT | subquery users | — | `authenticated` |
| `organization_profile_insert_own` | INSERT | — | subquery users | `authenticated` |
| `organization_profile_update_own` | UPDATE | subquery users | subquery users | `authenticated` |

### 10. `labor_costs`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `labor_costs_select` | SELECT | `organization_id = get_org_id()` | — |

### 11. `configuration_materials`

Usa subquery cruzada hacia `system_configurations`.

### 12. `system_configurations`

| Policy | Operación | USING |
|---|---|---|
| `system_configurations_select` | SELECT | `organization_id IS NULL OR organization_id = get_org_id()` |

### 13. `system_lines`

| Policy | Operación | USING |
|---|---|---|
| `system_lines_select` | SELECT | `organization_id IS NULL OR organization_id = get_org_id()` |

### 14. `line_glass_compatibility`

Usa subquery cruzada hacia `system_lines`.

### 15. `product_types`

| Policy | Operación | USING |
|---|---|---|
| `product_types_select` | SELECT | `true` |

### 16. `solicitudes_contacto`

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `solicitudes_contacto_insert_public` | INSERT | — | `estado = 'nueva'` y contexto válido | `anon`, `authenticated` |
| `solicitudes_contacto_select_own` | SELECT | `organization_id = get_org_id()` | — | `authenticated` |
| `solicitudes_contacto_update_own` | UPDATE | `organization_id = get_org_id()` | `organization_id = get_org_id()` | `authenticated` |

Lectura operativa:
- Ya no bloquea captación.
- `anon` puede insertar leads públicos.
- `authenticated` puede ver y actualizar leads de su org.

---

## Tablas con RLS habilitado pero sin policies

Estas tablas siguen inaccesibles desde cliente salvo `service_role`.

| Tabla | Riesgo principal |
|---|---|
| `cotizacion_code_counters` | Correcto por diseño; solo lo usa función `SECURITY DEFINER` |
| `formula_variables` | No accesible desde cliente |
| `material_types` | No accesible desde cliente |
| `quote_item_breakdown` | No accesible desde cliente |
| `web_push_subscriptions` | Bloquea registro/lectura de suscripciones push |

---

## Resumen de mecanismos de aislamiento

| Mecanismo | Tablas |
|---|---|
| `get_org_id()` directo | `clients`, `cotizaciones`, `cotizacion_items`, `projects`, `users`, `materials`, `historial_precios`, `organizations`, `labor_costs`, `solicitudes_contacto` |
| `get_org_id()` + nullable | `system_configurations`, `system_lines` |
| Subquery directa a `users` | `organization_profile` |
| Subquery cruzada | `configuration_materials`, `line_glass_compatibility` |
| Público total | `product_types` |
| Sin policies | `cotizacion_code_counters`, `formula_variables`, `material_types`, `quote_item_breakdown`, `web_push_subscriptions` |

---

## Riesgos de seguridad vigentes

### Críticos

1. **`web_push_subscriptions` sin policies:** El cliente no puede registrar ni consultar suscripciones push.
2. **`quote_item_breakdown` sin policies:** Breakdown no visible desde app si se necesita en UI.

### Altos

3. **`material_types` sin policies:** Si la UI depende de catálogo de tipos, falla.
4. **`formula_variables` sin policies:** Si alguna UI requiere lectura directa, falla.
5. **Sin diferenciación por rol en tablas operativas:** `admin`, `tecnico` y `viewer` comparten mismo nivel de acceso por org.

### Moderados

6. **`organization_profile` usa subquery en vez de `get_org_id()`:** patrón inconsistente.
7. **Grants `ALL` a `anon`:** RLS protege, pero el grant sigue siendo amplio.
8. **`solicitudes_contacto` requiere smoke test real post-fix:** Falta validar `anon -> insert`, `authenticated -> select/update` con usuarios reales.

### Bajos

9. **Sin policies DELETE en tablas con soft delete:** Intencional, pero debe seguir documentado.
10. **Catálogos técnicos con solo SELECT:** correcto si la administración queda interna o por `service_role`.
