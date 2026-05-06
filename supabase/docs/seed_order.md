# Seed Order - Ventora

Fuente de verdad: `current_schema.sql`.
Fecha de generación: 2026-05-06.

---

## Resumen

El orden de carga de seed data debe respetar las dependencias de foreign keys. Las tablas raíz (sin FK salientes) van primero. Las tablas hoja (con FKs) van después de sus dependencias. Las tablas de catálogo global (sin `organization_id`) se cargan antes que las tablas operativas por organización.

---

## Orden recomendado

### Nivel 0 — Catálogos globales (sin FK, sin organization_id)

Estas tablas no dependen de nada. Se cargan primero.

| Orden | Tabla | PK | Depende de | Nota |
|---|---|---|---|---|
| 1 | `product_types` | bigint | — | Tipos de producto (ventana, puerta, etc.) |
| 2 | `material_types` | uuid | — | Categorías de material (vidrio, perfil, etc.) |
| 3 | `formula_variables` | bigint | — | Variables de fórmula técnicas |

### Nivel 1 — Organización raíz

| Orden | Tabla | PK | Depende de | Nota |
|---|---|---|---|---|
| 4 | `organizations` | bigint IDENTITY | — | Raíz multi-tenant. Se necesita antes que todo lo operativo. |

### Nivel 2 — Perfil + catálogos por organización

| Orden | Tabla | PK | Depende de | Nota |
|---|---|---|---|---|
| 5 | `organization_profile` | organization_id (FK) | organizations | 1:1 con organizations. ON DELETE CASCADE. |
| 6 | `system_lines` | bigint | organizations (inferida) | `organization_id` nullable. Las líneas globales van sin org_id. |
| 7 | `materials` | bigint IDENTITY | organizations, material_types | `material_type_id` es nullable. |

### Nivel 3 — Configuraciones técnicas (dependen de system_lines + product_types)

| Orden | Tabla | PK | Depende de | Nota |
|---|---|---|---|---|
| 8 | `system_configurations` | bigint | system_lines, product_types, organizations (inferida) | `organization_id` nullable. |
| 9 | `configuration_materials` | bigint | system_configurations, materials | Tabla pivote. |
| 10 | `line_glass_compatibility` | bigint | system_lines, materials | Tabla pivote de compatibilidad. |

### Nivel 4 — Usuarios y mano de obra

| Orden | Tabla | PK | Depende de | Nota |
|---|---|---|---|---|
| 11 | `auth.users` | uuid | — | Tabla del sistema auth de Supabase. Se crea antes que `public.users`. |
| 12 | `users` | bigint IDENTITY | organizations, auth.users | Vincula usuario auth con organización. |
| 13 | `labor_costs` | bigint | organizations | Costos de mano de obra. |

### Nivel 5 — Datos operativos comerciales

| Orden | Tabla | PK | Depende de | Nota |
|---|---|---|---|---|
| 14 | `clients` | bigint IDENTITY | organizations | Clientes finales. |
| 15 | `projects` | bigint IDENTITY | organizations, clients | Obras. Depende de clients. |
| 16 | `cotizaciones` | bigint IDENTITY | organizations, projects | Presupuestos. Depende de projects. |
| 17 | `cotizacion_items` | bigint IDENTITY | organizations, cotizaciones, product_types, system_lines, system_configurations | Items de cotización. Depende de cotizaciones + catálogos técnicos. |
| 18 | `quote_item_breakdown` | bigint IDENTITY | cotizacion_items, materials | Desglose de materiales. Depende de items + materials. |
| 19 | `historial_precios` | bigint IDENTITY | materials, organizations, users | Historial de cambios de precio. |

### Nivel 6 — Leads y notificaciones

| Orden | Tabla | PK | Depende de | Nota |
|---|---|---|---|---|
| 20 | `solicitudes_contacto` | uuid | organizations (nullable) | Leads. `organization_id` puede ser null (leads de landing global). |
| 21 | `web_push_subscriptions` | bigint IDENTITY | organizations (inferida), auth.users (inferida) | Suscripciones push. Sin FK formales. |
| 22 | `cotizacion_code_counters` | (organization_id, quote_date) | organizations (inferida) | Contadores. Se genera automáticamente via `reserve_next_cotizacion_code()`. |

---

## Grafo de dependencias (solo FK confirmadas)

```
auth.users
  └── users ──┐
              └── historial_precios

organizations
  ├── organization_profile
  ├── users
  ├── clients
  │     └── projects
  │           └── cotizaciones
  │                 └── cotizacion_items
  │                       ├── product_types
  │                       ├── system_lines
  │                       │     ├── system_configurations
  │                       │     │     ├── product_types
  │                       │     │     ├── system_lines
  │                       │     │     └── configuration_materials
  │                       │     │           ├── system_configurations
  │                       │     │           └── materials
  │                       │     │                 └── material_types
  │                       │     └── line_glass_compatibility
  │                       │           ├── system_lines
  │                       │           └── materials
  │                       └── system_configurations
  ├── cotizaciones
  ├── cotizacion_items
  ├── materials ── material_types
  ├── historial_precios ── materials, users
  ├── labor_costs
  ├── projects
  └── solicitudes_contacto

product_types (independiente)
material_types (independiente)
formula_variables (independiente)
```

---

## Riesgos del orden incorrecto

1. **Insertar `users` antes que `organizations`:** FK `users_organization_id_fkey` falla. No se puede vincular un usuario a una org que no existe.

2. **Insertar `projects` antes que `clients`:** FK `projects_client_id_fkey` falla si se especifica `cliente_id` con un client que no existe. `cliente_id` es nullable, así que se puede posponer la asignación.

3. **Insertar `cotizacion_items` antes que `cotizaciones`:** FK `fk_item_quote` falla. El item necesita una cotización existente.

4. **Insertar `configuration_materials` antes que `system_configurations` o `materials`:** FKs dobles fallan. Ambos lados del pivote deben existir.

5. **Insertar `line_glass_compatibility` antes que `system_lines` o `materials`:** FKs hacia ambas tablas fallan.

6. **Insertar `historial_precios` antes que `materials`, `organizations` o `users`:** Las tres FKs fallan. `cambiado_por` puede ser NULL pero `material_id` y `organization_id` requieren registros existentes si se especifican.

7. **Insertar `auth.users` después de `public.users`:** La FK `fk_users_auth` → `auth.users.id` falla. `auth.users` debe existir primero.

8. **Insertar `organization_profile` antes que `organizations`:** FK `organization_profile_organization_id_fkey` falla. El perfil requiere la org.

9. **Insertar `solicitudes_contacto` antes que `organizations` (con organization_id):** FK `solicitudes_contacto_organization_id_fkey` falla si se especifica org. Para leads de landing global, `organization_id` puede ser NULL y no hay problema.

10. **Insertar `cotizacion_code_counters` antes que `organizations`:** No hay FK formal, pero si se referencia un `organization_id` inexistente, la lógica de `reserve_next_cotizacion_code()` puede generar códigos para orgs fantasma.

---

## Notas adicionales

- `cotizacion_code_counters` se genera automáticamente via la función `reserve_next_cotizacion_code()`. No se necesita seed manual a menos que se quieran pregenerar códigos.

- `web_push_subscriptions` no tiene FK formales, pero los valores de `organization_id` y `auth_user_id` deben existir en la práctica para que las suscripciones sean útiles.

- Las tablas de catálogo técnico (`system_lines`, `system_configurations`, `configuration_materials`, `line_glass_compatibility`, `product_types`, `material_types`, `formula_variables`) son legado del cotizador técnico. Su seed puede ser opcional si no se usa la capa técnica.

- Para datos de prueba, el flujo mínimo es:
  1. `organizations`
  2. `auth.users`
  3. `users`
  4. `organization_profile`
  5. `clients`
  6. `projects`
  7. `cotizaciones`
  8. `cotizacion_items`
  9. `solicitudes_contacto`
