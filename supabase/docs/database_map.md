# Database Map - Ventora

Fuente de verdad: `current_schema.sql`. Referencia complementaria: `database.types.ts`.
Fecha de generación: 2026-05-06.

---

## Resumen ejecutivo

La base de datos soporta un SaaS multi-tenant para captación y cierre de leads en empresas de vidrios y aluminio. El modelo se organiza alrededor de `organizations` como raíz de aislamiento. Cada tabla operativa filtra por `organization_id`. Existe una capa de catálogos técnicos (legado del cotizador) y una capa comercial activa (solicitudes, cotizaciones, clientes). El soft delete está estandarizado con `eliminado_en`. La seguridad se basa en RLS + `get_org_id()`.

**Total de tablas:** 18
**Total de vistas:** 1
**Total de funciones:** 4
**Esquema:** `public` exclusivamente

---

## Tablas

### 1. `organizations`

**Propósito:** Empresa cliente del SaaS. Raíz del multi-tenant.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `nombre` | text NOT NULL | |
| `correo` | text | |
| `telefono` | text | |
| `direccion` | text | |
| `logo_url` | text | |
| `plan` | text | Plan comercial |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**FK salientes:** Ninguna
**FK entrantes:** `users`, `clients`, `projects`, `cotizaciones`, `cotizacion_items`, `materials`, `historial_precios`, `organization_profile`, `solicitudes_contacto`, `labor_costs`, `web_push_subscriptions`, `cotizacion_code_counters`

---

### 2. `users`

**Propósito:** Empleados de una organización. Vínculo con `auth.users`.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `correo` | text NOT NULL | UNIQUE activo |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `rol` | text NOT NULL | `admin`, `tecnico`, `viewer` (por convención, sin CHECK) |
| `auth_user_id` | uuid | FK → auth.users |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**Unique:** `correo` (constraint `unique_correo_users`)
**FK salientes:**
- `organization_id` → `organizations.id`
- `auth_user_id` → `auth.users.id`

---

### 3. `clients`

**Propósito:** Clientes finales de la empresa. Contactos comerciales.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `nombre` | text NOT NULL | |
| `telefono` | text | |
| `direccion` | text | |
| `correo` | text | UNIQUE por org activa |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `estado_manual` | text | CHECK: `activo`, `seguimiento`, `prospecto`, `inactivo` |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**Unique:** `correo` (constraint `unique_correo_clients` — sin scope de org, **riesgo**)
**Unique parcial:** `(organization_id, correo)` WHERE `eliminado_en IS NULL` (índice `uniq_clients_email_org`)
**FK salientes:** `organization_id` → `organizations.id`

---

### 4. `projects`

**Propósito:** Obras o trabajos asociados a un cliente.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `titulo` | text NOT NULL | |
| `descripcion` | text | |
| `cliente_id` | bigint | FK → clients |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `estado` | text | Sin CHECK definido |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**FK salientes:**
- `cliente_id` → `clients.id`
- `organization_id` → `organizations.id`

---

### 5. `cotizaciones`

**Propósito:** Presupuestos comerciales para cierre. Herramienta principal de cierre.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `proyecto_id` | bigint | FK → projects |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `numero` | text | Código legible (ej: COT-060526-001) |
| `estado` | text NOT NULL | Sin CHECK definido |
| `estado_comercial` | text | Sin CHECK definido |
| `total` | numeric NOT NULL | |
| `subtotal_neto` | numeric | |
| `costo_total` | numeric | |
| `margen_pct` | numeric | |
| `utilidad_total` | numeric | |
| `descuento_pct` | numeric | |
| `flete` | numeric | |
| `iva` | numeric | |
| `notas` | text | |
| `valido_hasta` | date | |
| `approval_token` | text | UNIQUE parcial WHERE NOT NULL |
| `approval_token_expires_at` | timestamptz | |
| `cliente_vio_en` | timestamptz | |
| `cliente_respondio_en` | timestamptz | |
| `cliente_respuesta_canal` | text | |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**Unique parcial:** `(organization_id, numero)` (índice `uniq_quote_number`)
**Unique parcial:** `approval_token` WHERE NOT NULL
**FK salientes:**
- `proyecto_id` → `projects.id`
- `organization_id` → `organizations.id`

---

### 6. `cotizacion_items`

**Propósito:** Items/componentes dentro de una cotización.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `cotizacion_id` | bigint NOT NULL | FK → cotizaciones |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `nombre` | text | |
| `descripcion` | text | |
| `tipo_item` | text | |
| `tipo_componente` | text | `ventana`, `puerta`, `cierre` (por convención) |
| `codigo` | text | Código comercial (ej: V1, P1) |
| `cantidad` | integer NOT NULL | |
| `unidad` | text | |
| `ancho` | numeric | |
| `alto` | numeric | |
| `area_m2` | numeric | |
| `linea` | text | |
| `color` | text | |
| `vidrio` | text | |
| `precio_unitario` | numeric NOT NULL | |
| `subtotal` | numeric NOT NULL | |
| `costo_unitario` | numeric | |
| `costo_total` | numeric | |
| `margen_pct` | numeric | |
| `utilidad` | numeric | |
| `product_type_id` | bigint | FK → product_types |
| `system_line_id` | bigint | FK → system_lines |
| `configuration_id` | bigint | FK → system_configurations |
| `observaciones` | text | |
| `orden` | integer | Orden visual |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**FK salientes:**
- `cotizacion_id` → `cotizaciones.id` (doble FK: `fk_item_quote` + `quote_items_quote_id_fkey`)
- `organization_id` → `organizations.id`
- `product_type_id` → `product_types.id`
- `system_line_id` → `system_lines.id`
- `configuration_id` → `system_configurations.id`

---

### 7. `quote_item_breakdown`

**Propósito:** Desglose de materiales y costos por item de cotización.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `cotizacion_item_id` | bigint NOT NULL | FK → cotizacion_items |
| `material_id` | bigint NOT NULL | FK → materials |
| `organization_id` | bigint NOT NULL | Sin FK formal → organizations (**relación inferida**) |
| `descripcion` | text | |
| `unidad` | text | |
| `cantidad` | numeric | |
| `costo_unitario` | numeric | |
| `costo_total` | numeric | |
| `precio_unitario` | numeric | |
| `precio_total` | numeric | |
| `origen` | text | |
| `creado_en` | timestamptz | |

**PK:** `id`
**FK salientes:**
- `cotizacion_item_id` → `cotizacion_items.id` (doble FK: `fk_breakdown_item` + `quote_item_breakdown_cotizacion_item_id_fkey`)
- `material_id` → `materials.id` (doble FK: `fk_breakdown_material` + `quote_item_breakdown_material_id_fkey`)

**Nota:** `organization_id` existe pero no tiene FK formal hacia `organizations`. Relación inferida por naming.

---

### 8. `solicitudes_contacto`

**Propósito:** Leads entrantes desde landing o solicitud pública por empresa. Core del producto.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | uuid DEFAULT gen_random_uuid() | PK |
| `nombre` | text NOT NULL | |
| `empresa` | text NOT NULL | |
| `correo` | text | |
| `telefono` | text | |
| `contacto` | text | Canal libre de contacto |
| `ayuda` | text NOT NULL | CHECK: `demo`, `cotizacion`, `ventas` |
| `mensaje` | text | |
| `tipo_trabajo` | text | |
| `estado` | text NOT NULL | CHECK: `nueva`, `contactada`, `cerrada`, `descartada` |
| `origen` | text NOT NULL | Default: `landing` |
| `contexto` | text NOT NULL | CHECK: `landing`, `empresa-publica` |
| `organization_id` | bigint | FK → organizations (nullable para leads de landing global) |
| `utm_source` | text | |
| `utm_medium` | text | |
| `utm_campaign` | text | |
| `source_url` | text | |
| `contactada_at` | timestamptz | Timestamp comercial de primer contacto |
| `ip` | text | |
| `user_agent` | text | |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |

**PK:** `id`
**FK salientes:** `organization_id` → `organizations.id` ON DELETE CASCADE
**Índices notables:**
- `(organization_id, creado_en DESC)` para inbox por empresa
- `(organization_id, contactada_at DESC)` para seguimiento comercial

---

### 9. `organization_profile`

**Propósito:** Perfil comercial de la organización para branding PDF y captación.

| Columna | Tipo | Notable |
|---|---|---|
| `organization_id` | bigint NOT NULL | PK + FK → organizations |
| `empresa_nombre` | text | |
| `empresa_logo_url` | text | |
| `empresa_direccion` | text | |
| `empresa_telefono` | text | |
| `empresa_email` | text | |
| `brand_color` | text NOT NULL | Default: `#1a3a5c` |
| `forma_pago` | text | |
| `proveedor_preferido` | text | |
| `modo_precio_preferido` | text NOT NULL | Default: `margen` |
| `margen_defecto` | numeric | Default: 100 |
| `solicitud_publica_slug` | text | UNIQUE parcial lower() WHERE no vacío |
| `solicitud_publica_descripcion_corta` | text | Copy principal de mini-landing |
| `solicitud_publica_valor` | text | |
| `solicitud_publica_mensaje_confianza` | text | Refuerzo comercial / confianza |
| `solicitud_publica_privacidad` | text | |
| `solicitud_publica_horario_desde` | text | Inicio horario comercial |
| `solicitud_publica_horario_hasta` | text | Fin horario comercial |
| `solicitud_publica_dias_atencion` | text | CSV de días 0-6 para ON/OFF |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |

**PK:** `organization_id` (1:1 con organizations)
**FK salientes:** `organization_id` → `organizations.id` ON DELETE CASCADE
**Unique parcial:** `lower(solicitud_publica_slug)` WHERE no vacío ni null

---

### 10. `materials`

**Propósito:** Materiales e insumos con costo y precio. Catálogo por organización.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `nombre` | text NOT NULL | |
| `costo` | numeric NOT NULL | |
| `inventario` | integer NOT NULL | |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `unidad` | text | |
| `categoria` | text | |
| `precio_venta` | numeric | |
| `material_type_id` | uuid | FK → material_types |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**FK salientes:**
- `organization_id` → `organizations.id`
- `material_type_id` → `material_types.id`

---

### 11. `material_types`

**Propósito:** Categorías de materiales (ej: vidrio, perfil, accesorio). Catálogo global.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | uuid DEFAULT gen_random_uuid() | PK |
| `nombre` | text NOT NULL | UNIQUE |
| `creado_en` | timestamptz | |

**PK:** `id`
**Unique:** `nombre`
**FK salientes:** Ninguna
**Nota:** Sin `organization_id`. Catálogo global compartido.

---

### 12. `historial_precios`

**Propósito:** Registro de cambios de precio de materiales.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `material_id` | bigint | FK → materials |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `precio` | numeric NOT NULL | |
| `precio_anterior` | numeric | |
| `fecha` | timestamptz | |
| `cambiado_por` | bigint | FK → users |

**PK:** `id`
**FK salientes:**
- `material_id` → `materials.id`
- `organization_id` → `organizations.id` (FK nombrada `historial_precios_organizacion_id_fkey` — **inconsistencia de naming**)
- `cambiado_por` → `users.id`

---

### 13. `product_types`

**Propósito:** Tipos de producto (ej: ventana, puerta). Catálogo global.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint | PK |
| `nombre` | text NOT NULL | |
| `descripcion` | text | |
| `creado_en` | timestamptz | |

**PK:** `id`
**FK salientes:** Ninguna
**Nota:** Sin `organization_id`. Catálogo global. RLS con SELECT true (público).

---

### 14. `system_lines`

**Propósito:** Líneas de perfiles (ej: rotura de puente térmico, económica). Catálogo mixto: global + por org.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint | PK |
| `nombre` | text NOT NULL | |
| `organization_id` | bigint | Nullable = catálogo global |
| `material_base` | text | |
| `tipo_apertura` | text | |
| `espesor_max_vidrio_mm` | numeric | |
| `descripcion` | text | |
| `creado_en` | timestamptz | |

**PK:** `id`
**FK salientes:** Ninguna formal
**Nota:** `organization_id` nullable indica catálogo global (null) o propio de org. **No hay FK hacia organizations.** Relación inferida.

---

### 15. `system_configurations`

**Propósito:** Configuraciones técnicas de línea + producto. Catálogo mixto.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint | PK |
| `organization_id` | bigint | Nullable = catálogo global |
| `product_type_id` | bigint | FK → product_types |
| `system_line_id` | bigint | FK → system_lines |
| `nombre` | text | |
| `descripcion` | text | |
| `hojas` | integer | |
| `activo` | boolean | Default: true |
| `creado_en` | timestamptz | |

**PK:** `id`
**FK salientes:**
- `product_type_id` → `product_types.id` (doble FK)
- `system_line_id` → `system_lines.id` (doble FK)

**Nota:** `organization_id` nullable sin FK formal. Relación inferida.

---

### 16. `configuration_materials`

**Propósito:** Materiales que componen una configuración técnica. Tabla pivote.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint | PK |
| `configuration_id` | bigint NOT NULL | FK → system_configurations |
| `material_id` | bigint NOT NULL | FK → materials |
| `rol_material` | text | |
| `formula` | text | |
| `merma_pct` | numeric | Default: 0 |
| `requerido` | boolean | Default: true |
| `orden` | integer | Default: 0 |
| `creado_en` | timestamptz | |

**PK:** `id`
**Unique:** `(configuration_id, material_id)` (índice `uniq_config_material`)
**FK salientes:**
- `configuration_id` → `system_configurations.id` (doble FK)
- `material_id` → `materials.id` (doble FK)

**Nota:** Sin `organization_id`. El aislamiento se logra indirectamente via RLS que cruza `system_configurations`.

---

### 17. `line_glass_compatibility`

**Propósito:** Compatibilidad entre líneas de perfil y vidrios.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint | PK |
| `system_line_id` | bigint NOT NULL | FK → system_lines |
| `glass_material_id` | bigint NOT NULL | FK → materials |
| `permitido` | boolean | Default: true |
| `recomendado` | boolean | Default: false |
| `creado_en` | timestamptz | |

**PK:** `id`
**Unique:** `(system_line_id, glass_material_id)` (índice `uniq_line_glass`)
**FK salientes:**
- `system_line_id` → `system_lines.id`
- `glass_material_id` → `materials.id`

**Nota:** Sin `organization_id`. Aislamiento indirecto via RLS que cruza `system_lines`.

---

### 18. `formula_variables`

**Propósito:** Variables disponibles para fórmulas de configuración. Catálogo global.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint | PK |
| `nombre` | text NOT NULL | UNIQUE |
| `descripcion` | text | |
| `ejemplo` | text | |
| `creado_en` | timestamptz | |

**PK:** `id`
**Unique:** `nombre`
**FK salientes:** Ninguna
**Nota:** Sin `organization_id`. Catálogo global técnico.

---

### 19. `labor_costs`

**Propósito:** Costos de mano de obra por organización.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint | PK |
| `organization_id` | bigint NOT NULL | FK → organizations |
| `nombre` | text | |
| `tipo` | text | |
| `monto` | numeric | |
| `unidad` | text | Default: `unit` |
| `activo` | boolean | Default: true |
| `creado_en` | timestamptz | |

**PK:** `id`
**FK salientes:** `organization_id` → `organizations.id`

---

### 20. `cotizacion_code_counters`

**Propósito:** Contador diario por org para códigos de cotización legibles (COT-DDMMYY-NNN).

| Columna | Tipo | Notable |
|---|---|---|
| `organization_id` | bigint NOT NULL | PK parcial |
| `quote_date` | date NOT NULL | PK parcial |
| `last_number` | integer NOT NULL | Default: 0 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**PK:** `(organization_id, quote_date)`
**FK salientes:** `organization_id` — **sin FK formal** hacia organizations. Relación inferida.

---

### 21. `web_push_subscriptions`

**Propósito:** Suscripciones Web Push para notificaciones PWA.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `organization_id` | bigint NOT NULL | **Sin FK formal** → organizations. Relación inferida. |
| `auth_user_id` | uuid NOT NULL | **Sin FK formal** → auth.users. Relación inferida. |
| `endpoint` | text NOT NULL | UNIQUE |
| `p256dh` | text NOT NULL | |
| `auth` | text NOT NULL | |
| `subscription` | jsonb NOT NULL | |
| `user_email` | text | |
| `user_agent` | text | |
| `is_active` | boolean NOT NULL | Default: true |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `last_seen_at` | timestamptz | |

**PK:** `id`
**Unique:** `endpoint`

---

## Vista

### `admin_clientes_eliminados`

**Propósito:** Vista administrativa de clientes eliminados con conteo de proyectos y cotizaciones relacionadas.

**Seguridad:** `security_invoker = true` (hereda RLS de las tablas base).

**Columnas:** `cliente_id`, `organization_id`, `cliente_nombre`, `cliente_telefono`, `cliente_direccion`, `cliente_correo`, `cliente_creado_en`, `cliente_actualizado_en`, `cliente_eliminado_en`, `proyectos_eliminados`, `cotizaciones_eliminadas`, `proyectos_ids`, `cotizaciones_codigos`

---

## Funciones

| Función | Tipo | Retorna | Propósito |
|---|---|---|---|
| `get_org_id()` | SQL STABLE SECURITY DEFINER | bigint | Resuelve `organization_id` del usuario autenticado via `auth.email()` |
| `reserve_next_cotizacion_code(org_id, date)` | PLPGSQL SECURITY DEFINER | text | Genera código COT-DDMMYY-NNN atómico por org y fecha |
| `admin_purgar_clientes_eliminados(retention_days)` | PLPGSQL SECURITY DEFINER | record | Purga hard delete de clientes soft-deleted mayores a retención |
| `rls_auto_enable()` | EVENT TRIGGER | event_trigger | Activa RLS automáticamente al crear tablas en `public` |

---

## Relaciones principales (confirmadas por FK)

```
organizations (1) ──── (N) users
organizations (1) ──── (N) clients
organizations (1) ──── (1) organization_profile [ON DELETE CASCADE]
organizations (1) ──── (N) projects
organizations (1) ──── (N) cotizaciones
organizations (1) ──── (N) cotizacion_items
organizations (1) ──── (N) materials
organizations (1) ──── (N) historial_precios
organizations (1) ──── (N) labor_costs
organizations (1) ──── (N) solicitudes_contacto [ON DELETE CASCADE]

clients (1) ──── (N) projects
projects (1) ──── (N) cotizaciones
cotizaciones (1) ──── (N) cotizacion_items
cotizacion_items (1) ──── (N) quote_item_breakdown
materials (1) ──── (N) quote_item_breakdown
materials (1) ──── (N) configuration_materials
materials (1) ──── (N) historial_precios
material_types (1) ──── (N) materials
product_types (1) ──── (N) system_configurations
product_types (1) ──── (N) cotizacion_items
system_lines (1) ──── (N) system_configurations
system_lines (1) ──── (N) line_glass_compatibility
system_lines (1) ──── (N) cotizacion_items
system_configurations (1) ──── (N) configuration_materials
system_configurations (1) ──── (N) cotizacion_items
users (1) ──── (N) historial_precios
auth.users (1) ──── (N) users
```

---

## Relaciones inferidas (sin FK formal)

| Tabla | Columna | Tabla referenciada | Nota |
|---|---|---|---|
| `web_push_subscriptions` | `organization_id` | `organizations` | Sin FK |
| `web_push_subscriptions` | `auth_user_id` | `auth.users` | Sin FK |
| `cotizacion_code_counters` | `organization_id` | `organizations` | Sin FK |
| `system_lines` | `organization_id` | `organizations` | Nullable, sin FK |
| `system_configurations` | `organization_id` | `organizations` | Nullable, sin FK |
| `quote_item_breakdown` | `organization_id` | `organizations` | Sin FK |

---

## Flujo de negocio principal

```
1. organizations existe
2. users se vincula a organization + auth.users
3. organization_profile se crea para branding y captación
4. Lead entra → solicitudes_contacto (con UTM y contexto)
5. Vendedor responde → cambia estado de solicitud
6. Se crea client (si no existe)
7. Se crea project para el cliente
8. Se crea cotizacion para el project
9. Se agregan cotizacion_items (con breakdown técnico)
10. Se genera PDF / se comparte por WhatsApp / link público
11. Cliente aprueba/rechaza via approval_token
12. cotizacion_code_counters genera códigos legibles
13. web_push_subscriptions notifica al vendedor
14. admin_purgar_clientes_eliminados limpia soft deletes antiguos
```

---

## Riesgos e inconsistencias

### Críticos

1. **FK duplicadas:** `cotizacion_items` tiene 2 FKs hacia `cotizaciones` (`fk_item_quote` + `quote_items_quote_id_fkey`), `cotizacion_items` → `system_lines` y `system_configurations` duplicadas, `configuration_materials` doble FK hacia `system_configurations` y `materials`, `quote_item_breakdown` doble FK hacia `cotizacion_items` y `materials`. **Requiere revisión** — las FK duplicadas pueden causar errores en ON DELETE CASCADE y complican mantenimiento.

2. **`historial_precios_organizacion_id_fkey`:** La FK usa `organizacion_id` (con tilde) en el nombre de la constraint, mientras el estándar del proyecto es `organization_id` sin tilde. Inconsistencia de naming confirmada.

3. **`unique_correo_clients` sin scope:** La constraint UNIQUE sobre `correo` en `clients` no incluye `organization_id`, lo que impide que dos organizaciones tengan un cliente con el mismo correo. Contrasta con el índice parcial `uniq_clients_email_org` que sí scopea por org. **Requiere revisión**.

4. **FKs faltantes en `web_push_subscriptions`:** Ni `organization_id` ni `auth_user_id` tienen FK formal. Si se elimina una organización o un usuario auth, los registros quedan huérfanos.

5. **FK faltante en `cotizacion_code_counters`:** `organization_id` no tiene FK hacia `organizations`. Si se elimina una org, el contador queda huérfano.

6. **FKs faltantes en `system_lines` y `system_configurations`:** `organization_id` es nullable pero sin FK. Riesgo de integridad referencial.

### Moderados

7. **Sin CHECK en `estado` de `cotizaciones`:** A diferencia de `solicitudes_contacto` y `clients`, la tabla `cotizaciones` no tiene CHECK en `estado` ni `estado_comercial`. Valores libremente textuales.

8. **Sin CHECK en `estado` de `projects`:** Mismo caso. `estado` es text sin restricción.

9. **Sin CHECK en `rol` de `users`:** Los valores `admin`, `tecnico`, `viewer` son por convención de la app, no enforceados en BD.

10. **`rls_auto_enable` no cubre schemas fuera de `public`:** Solo activa RLS en tablas creadas en `public`. Si se crea un schema alternativo, no se protege automáticamente.

11. **Grants amplios:** `anon` tiene `ALL` en todas las tablas. La seguridad real depende enteramente de RLS. Si una tabla tiene RLS habilitado pero sin policies, `anon` no puede leer (Supabase default), pero el grant `ALL` es generoso.

12. **`configuration_materials` sin `organization_id`:** El aislamiento se hace via subquery a `system_configurations` en la RLS. Si la configuración es global (`organization_id IS NULL`), los materiales quedan visibles para todas las orgs.

### Baja prioridad

13. **Secuencias con nombres inconsistentes:** `quotes_id_seq` para `cotizaciones`, `quote_items_id_seq` para `cotizacion_items`, `quote_item_breakdown_id_seq`. Los nombres de secuencias usan inglés mientras las tablas usan español.

14. **Constraint names en inglés vs español:** Mezcla de `clients_pkey` / `quotes_pkey` / `projects_pkey` con `cotizacion_code_counters_pkey` / `solicitudes_contacto_pkey`.
