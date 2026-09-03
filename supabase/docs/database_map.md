# Database Map - Ventora

> Verificacion remota: 2026-08-13. Mientras `current_schema.sql` siga marcado como atrasado, la base remota verificada, las migraciones registradas y los addendums de este archivo prevalecen para cambios posteriores al ultimo dump.

Fuente de verdad: base remota verificada y migraciones registradas; `current_schema.sql` es baseline historico hasta regenerarlo. Referencia complementaria: `database.types.ts`.
Fecha de generación: 2026-05-30.

---

## Resumen ejecutivo

La base de datos soporta un SaaS multi-tenant para captación y cierre de leads en empresas de vidrios y aluminio. El modelo se organiza alrededor de `organizations` como raíz de aislamiento. Cada tabla operativa filtra por `organization_id`. Existe una capa de catálogos técnicos (legado del cotizador) y una capa comercial activa (solicitudes, cotizaciones, clientes). El soft delete está estandarizado con `eliminado_en`. La seguridad se basa en RLS + `get_org_id()`.

**Total de tablas:** 26 versionadas por migraciones recientes. Este mapa tiene secciones completas para el core y addendums para tablas agregadas después del último dump completo.
**Total de vistas:** 1
**Total de funciones documentadas en este mapa:** 5 core, mas funciones agregadas por migraciones posteriores al dump
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
**FK entrantes:** `users`, `clients`, `projects`, `cotizaciones`, `cotizacion_items`, `materials`, `historial_precios`, `organization_profile`, `solicitudes_contacto`, `labor_costs`, `web_push_subscriptions`, `cotizacion_code_counters`, `cotizacion_line_templates`, `onboarding_checklists`, `public_landing_testimonials`, `pagos_suscripcion`

---

### 2. `users`

> Extendido por `20260728083604_google_oauth_account_completion`: agrega `nombre`, `whatsapp`, `ciudad_comuna`, `data_sharing_accepted_at`, unique sobre `lower(btrim(correo))` y grants de columna que mantienen estos cuatro campos fuera del acceso cliente.

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
| `pricing_mode` | text NOT NULL DEFAULT 'por_item' | CHECK `por_item` / `total_global` |
| `creation_surface` | text nullable | Origen de creación desde 2026-08-21; histórico sin clasificar queda `NULL` |
| `total` | numeric NOT NULL | |
| `subtotal_neto` | numeric | |
| `costo_total` | numeric | |
| `margen_pct` | numeric | |
| `utilidad_total` | numeric | |
| `costo_materiales_total` | numeric(12,2) | Snapshot Quote Studio: costo neto de materiales |
| `costo_mano_obra_total` | numeric(12,2) | Snapshot Quote Studio: costo neto de mano de obra |
| `costo_traslado_total` | numeric(12,2) | Snapshot Quote Studio: costo neto de traslado |
| `costo_otros_total` | numeric(12,2) | Snapshot Quote Studio: otros costos netos |
| `merma_pct` | numeric(7,4) | Snapshot Quote Studio: porcentaje de merma |
| `merma_total` | numeric(12,2) | Snapshot Quote Studio: monto neto de merma |
| `margen_objetivo_pct` | numeric(7,4) | Snapshot Quote Studio: margen real objetivo, no markup |
| `precio_recomendado_neto` | numeric(12,2) | Snapshot Quote Studio: precio sugerido neto, sin IVA |
| `iva_pct` | numeric(7,4) | Snapshot Quote Studio: porcentaje de IVA como capa tributaria |
| `financial_snapshot_version` | integer | Version del algoritmo de snapshot financiero |
| `financial_snapshot_calculado_en` | timestamptz | Fecha de calculo del snapshot financiero |
| `cost_basis_status` | text | Estado de base de costo: `sin_costos`, `estimado` o `manual` |
| `descuento_pct` | numeric | |
| `flete` | numeric | |
| `iva` | numeric | |
| `regional_snapshot` | jsonb | Snapshot regional inmutable v1: pais, moneda, locale e impuesto comercial al crear la cotizacion |
| `notas` | text | |
| `valido_hasta` | date | |
| `approval_token` | text | UNIQUE parcial WHERE NOT NULL |
| `approval_token_expires_at` | timestamptz | |
| `cliente_vio_en` | timestamptz | |
| `cliente_respondio_en` | timestamptz | |
| `cliente_respuesta_canal` | text | |
| `pdf_descargado_en` | timestamptz | Marca silenciosa cuando el maestro descarga/abre PDF desde la app; no cambia `estado` |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**Unique parcial:** `(organization_id, numero)` (índice `uniq_quote_number`)
**Unique parcial:** `approval_token` WHERE NOT NULL
**FK salientes:**
- `proyecto_id` → `projects.id`
- `organization_id` → `organizations.id`

**Addendum 2026-07-08 - Quote Studio financial snapshots (aplicado local y remoto):** la migracion `20260708033856_add_quote_studio_financial_snapshot.sql` fue aplicada y verificada en Postgres local y en el proyecto remoto Supabase `yrtrwgkaopfumpidjthk` el 2026-07-08. Agrega 12 columnas aditivas sobre `cotizaciones`, sin crear tablas nuevas. Los campos de costo, utilidad, margen real y precio recomendado se interpretan como valores netos; `iva`/`iva_pct` quedan como capa tributaria separada. Constraints: `cotizaciones_financial_costs_nonnegative`, `cotizaciones_cost_basis_status_check`. Backfill historico seguro: deriva `iva_pct` y `cost_basis_status` sin inventar desglose de costos ni setear `financial_snapshot_version` en cotizaciones historicas. RLS y grants existentes de `cotizaciones` siguen aplicando por `organization_id = get_org_id()` sin policies nuevas.

**Addendum 2026-08-13 - Billing Fase 5 snapshot regional:** la migracion remota `20260813023403_billing_phase_5_quote_region_snapshots.sql` agrega `regional_snapshot jsonb` y el CHECK `cotizaciones_regional_snapshot_object_check`. No crea tablas, policies ni grants. El servicio captura el perfil regional al crear la cotizacion; sus ediciones conservan el valor existente. PDF, enlace publico y WhatsApp consumen ese snapshot. Las cotizaciones antiguas sin dato mantienen CLP e IVA 19% como compatibilidad, sin leer el perfil regional actual.

**Addendum 2026-08-21 - Métrica de superficie de cotización:** la migración `20260821163629_quote_creation_surface_metrics.sql` agrega `creation_surface` nullable; la complementaria `20260821173824_quote_surface_constructor_metrics.sql` lo normaliza a `desktop_constructor`, `desktop_guiada`, `mobile_constructor`, `mobile_guiada` y `total_global`. Ambas preservan el índice parcial para análisis de cotizaciones activas. No tocan filas históricas: `NULL` significa “sin clasificación confiable”. El panel `/admin/marketing` excluye organizaciones con `is_test_account=true`.

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
| `fabricacion_snapshot` | jsonb | Snapshot tecnico formal Fase 3; lectura preferente para resumen interno |
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

**Notas Fase 3 fabricacion:**
- Migracion aplicada/verificada en remoto el 2026-07-30: `20260729234019_cotizacion_items_fabricacion_snapshot.sql`.
- `fabricacion_snapshot` guarda resultado inmutable de `calcularCubicacionYPauta()` cuando hay receta validada compatible.
- `[cub:]` dentro de `observaciones` queda como fallback legacy de lectura; el flujo nuevo no debe escribir nuevos snapshots con ese bridge.

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

**Propósito:** Leads entrantes desde landing, solicitud de cuenta SaaS o solicitud pública por empresa. Core del producto.

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
| `contexto` | text NOT NULL | CHECK: `landing`, `empresa-publica`, `registro-saas` |
| `organization_id` | bigint | FK → organizations (nullable para leads globales y registro SaaS) |
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

**Propósito:** Perfil comercial de la organización para branding PDF, captación y landing configurable.

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
| `public_name` | text | Nombre comercial landing (fallback: empresa_nombre) |
| `public_subtitle` | text | Rubro/especialidad |
| `public_zone` | text | Zona/cobertura |
| `public_business_type` | text | Tipo de negocio |
| `secondary_color` | text | Color secundario hex (default: #25d366) |
| `hero_mode` | text NOT NULL | CHECK: `image`, `gradient`. Default: `gradient` |
| `hero_image_url` | text | URL imagen hero |
| `hero_title` | text | Título hero (fallback: default) |
| `hero_subtitle` | text | Subtítulo hero |
| `show_gallery` | boolean NOT NULL | Default: true |
| `show_schedule` | boolean NOT NULL | Default: true |
| `show_rating` | boolean NOT NULL | Default: false |
| `rating_label` | text | Texto de rating (ej: 4.9/5) |
| `jobs_count_label` | text | Texto trabajos (ej: +200) |
| `form_title` | text | Título formulario landing |
| `form_subtitle` | text | Subtítulo formulario landing |
| `is_published` | boolean NOT NULL | Default: false |
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

### 19. `pagos_suscripcion`

**Propósito:** Registro de pagos de suscripción procesados por Webpay Plus (Transbank). Cada fila representa un intento de pago.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `organization_id` | bigint NOT NULL | FK → organizations ON DELETE CASCADE |
| `plan_code` | text NOT NULL | `founder_full`, `quote_only` |
| `billing_period` | text NOT NULL | `yearly` |
| `amount_clp` | numeric NOT NULL | Monto en CLP |
| `currency` | text NOT NULL | Default: `CLP` |
| `payment_provider` | text NOT NULL | Default: `webpay_plus` |
| `provider_token` | text | Token de Transbank |
| `provider_status` | text | Estado devuelto por Transbank |
| `provider_response` | jsonb | Respuesta completa de Transbank |
| `buy_order` | text | Orden de compra (idempotency key) |
| `status` | text NOT NULL | `pendiente`, `aprobado`, `fallido`, `reembolsado` |
| `paid_at` | timestamptz | |
| `period_starts_at` | timestamptz | Inicio del período facturado |
| `period_ends_at` | timestamptz | Fin del período facturado |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `eliminado_en` | timestamptz | Soft delete |

**PK:** `id`
**FK salientes:** `organization_id` → `organizations.id` ON DELETE CASCADE
**Índices notables:** Unique `buy_order` WHERE eliminado_en IS NULL (idempotency), Unique parcial `provider_token` WHERE NOT NULL AND eliminado_en IS NULL
**Acceso:** historicamente `authenticated` podia leer pagos de su organizacion por RLS. El hardening local 2026-08-14 revoca tambien ese grant porque la fila contiene tokens, URL de checkout y payload crudo; lectura y escritura quedan en rutas server con `service_role` y respuestas con allowlist.

**Addendum 2026-06-02 - Flow billing:** `pagos_suscripcion` queda como ledger provider-agnostic. `payment_provider` acepta `flow`, `manual_transfer`, `webpay_plus`; `status` acepta tambien `cancelado`; `billing_period` acepta `yearly` y `monthly`. Se agregan `provider_order_id` (Flow `flowOrder`) y `checkout_url`, mas unique parcial `(payment_provider, provider_order_id)` para idempotencia externa. `provider_response` sigue siendo backend-only y no debe exponerse a cliente.

**Addendum de seguridad local 2026-08-14 (verificacion remota pendiente):** la nueva infraestructura `payment_webhook_events` mantiene idempotencia durable de Mercado Pago con `unique (provider, request_id)`, estados `processing|processed|failed`, RLS deny-by-default y privilegios exclusivos de `service_role`.

**Addendum 2026-06-02 - cuentas internas gratis:** `20260602065826_founder_free_internal_accounts.sql` fija las organizaciones internas `3` y `4` como `active/founder/founder_full`, sin `subscription_ends_at`, con `founder_price_locked=true`. No deben quedar bloqueadas por trial ni pagos.

---

### 20. `labor_costs`

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

### 21. `cotizacion_code_counters`

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

### 22. `web_push_subscriptions`

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

### 23. `public_landing_gallery`

**Propósito:** Fotos de galería para la landing pública de cada organización. Relación 1:N con `organization_profile`.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `organization_id` | bigint NOT NULL | FK → organizations ON DELETE CASCADE |
| `landing_id` | bigint | FK → organization_profile ON DELETE CASCADE |
| `image_url` | text NOT NULL | URL pública de la imagen |
| `label` | text | Etiqueta visible (ej: Ventana, Shower) |
| `sort_order` | integer NOT NULL | Default: 0 |
| `is_visible` | boolean NOT NULL | Default: true |
| `creado_en` | timestamptz | |

**PK:** `id`
**FK salientes:**
- `organization_id` → `organizations.id` ON DELETE CASCADE
- `landing_id` → `organization_profile.organization_id` ON DELETE CASCADE
**Índice:** `(organization_id, sort_order)`

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
organizations (1) ──── (N) public_landing_gallery [ON DELETE CASCADE]
organizations (1) ──── (N) pagos_suscripcion [ON DELETE CASCADE]
organization_profile (1) ──── (N) public_landing_gallery [ON DELETE CASCADE]

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
4. organizations activa plan de suscripción → pagos_suscripcion registra pagos Webpay
5. Lead entra → solicitudes_contacto (con UTM y contexto)
6. Vendedor responde → cambia estado de solicitud
7. Se crea client (si no existe)
8. Se crea project para el cliente
9. Se crea cotizacion para el project
10. Se agregan cotizacion_items (con breakdown técnico)
11. Se genera PDF / se comparte por WhatsApp / link público
12. Cliente aprueba/rechaza via approval_token
13. cotizacion_code_counters genera códigos legibles
14. web_push_subscriptions notifica al vendedor
15. admin_purgar_clientes_eliminados limpia soft deletes antiguos
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
---

## Addendum 2026-05-22 - `onboarding_checklists`

**PropÃ³sito:** Persistir el progreso compartido del onboarding comercial por organizaciÃ³n.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | uuid DEFAULT gen_random_uuid() | PK |
| `organization_id` | bigint NOT NULL | FK â†’ organizations |
| `step_key` | text NOT NULL | CHECK: `company_ready`, `public_page_live`, `channel_ready`, `first_lead`, `first_quote`, `first_share` |
| `estado` | text NOT NULL | CHECK: `pendiente`, `en_progreso`, `completado`, `omitido` |
| `completed_at` | timestamptz | |
| `completed_by_user_id` | bigint | FK â†’ users |
| `completion_source` | text | |
| `metadata_json` | jsonb NOT NULL | DEFAULT `{}` |
| `creado_en` | timestamptz NOT NULL | DEFAULT `now()` |
| `actualizado_en` | timestamptz NOT NULL | DEFAULT `now()` |
| `eliminado_en` | timestamptz | Soft delete |

**Unique parcial:** `(organization_id, step_key)` WHERE `eliminado_en IS NULL`

**Uso en producto:** Dashboard, configuraciÃ³n, canales y cotizaciones privadas consumen este estado vÃ­a `src/features/onboarding/`.

---

## Addendum 2026-05-31 - tablas recientes pendientes de dump completo

### `cotizacion_line_templates`

**Propósito:** Precios rápidos por línea comercial para cotizaciones asistidas.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | bigint IDENTITY | PK |
| `organization_id` | bigint NOT NULL | Tenant key |
| `nombre` | text NOT NULL | Nombre de línea |
| `precio_m2_sugerido` | numeric(12,2) | Default 0 |
| `minimo_cobrable` | numeric(12,2) | Default 0 |
| `redondeo_precio` | numeric(12,2) | Default 1000 |
| `material` | text NOT NULL | CHECK: `Aluminio`, `PVC`, `Cristal` |
| `categoria` | text NOT NULL | CHECK: `aluminio`, `pvc`, `vidrio`, `shower`, `accesorios`, `otros` |
| `unidad_cobro` | text NOT NULL | CHECK: `m2`, `metro_lineal`, `unidad`, `valor_manual` |
| `costo_base` | numeric(12,2) | Default 0 |
| `merma_pct` | numeric(7,4) | Default 0 |
| `margen_objetivo_pct` | numeric(7,4) | Nullable |
| `proveedor` | text | Nullable |
| `vigencia_desde` | date | Nullable |
| `vigencia_hasta` | date | Nullable |
| `catalog_metadata` | jsonb | Default `{}`. Para `categoria='vidrio'` guarda `espesor` y `terminacion` |
| `vidrio_principal_recomendado` | text | Sugerencia visual/comercial |
| `catalog_key` | text | Nullable. Identifica líneas precargadas del catálogo Ventora (ej. `ventora:l5000`). Usado para seed idempotente. |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0 |
| `eliminado_en` | timestamptz | Soft delete |

**Índices:** `(organization_id, sort_order, nombre)` WHERE `eliminado_en IS NULL`; `(organization_id, catalog_key)` UNIQUE parcial WHERE `catalog_key IS NOT NULL AND eliminado_en IS NULL`.
**RLS:** SELECT/INSERT/UPDATE por `organization_id = get_org_id()`.
**Nota:** No tiene FK formal a `organizations`; relación inferida por tenant key.
**Migración remota:** `extend_cotizacion_line_templates_catalog` aplicada 2026-07-09 (Fase 2A). Migración aditiva 2026-07-13 expande `material` a `Cristal`. Migración `20260903110000_line_template_catalog_key` agrega `catalog_key` con unique parcial para seed idempotente del catálogo inicial Ventora (L5000/L20/L25/L32/L42).

### `public_landing_testimonials`

**Propósito:** Valoraciones públicas enviadas desde la landing y moderadas desde configuración.

| Columna | Tipo | Notable |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `organization_id` | bigint NOT NULL | FK → organizations ON DELETE CASCADE |
| `nombre_corto` | text | Nombre visible |
| `comentario` | text NOT NULL | Testimonio |
| `estrellas` | integer NOT NULL | CHECK 1..5 |
| `estado` | text NOT NULL | `pendiente`, `aprobada`, `oculta` |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |
| `aprobado_en` | timestamptz | |
| `ocultado_en` | timestamptz | |

**Índices:** `(organization_id, estado, creado_en DESC)`.
**RLS:** SELECT/INSERT/UPDATE/DELETE por `organization_id = get_org_id()`.
**Corrección:** La migración local original usaba `organization_id uuid`; debe ser `bigint` para coincidir con `organizations.id`. La migración `20260531050353_harden_public_landing_testimonials_org_id.sql` lo endurece.

### Drift generado

- `current_schema.sql` está atrasado y debe regenerarse con CLI cuando exista `SUPABASE_DB_PASSWORD`.
- `database.types.ts` está atrasado y debe regenerarse con `supabase gen types`.

---

## Addendum 2026-05-31 - estado remoto verificado por MCP

- Proyecto remoto: `yrtrwgkaopfumpidjthk`.
- Tablas `public`: 26, todas con RLS habilitado.
- `public_landing_testimonials.organization_id` ya esta en `bigint` con FK a `organizations(id)`.
- Buckets Storage: `organization-assets` publico y `quote-pdfs` privado.
- Edge Functions: ninguna desplegada.
- `pagos_suscripcion`: 16 filas; estados observados `aprobado=2`, `pendiente=3`, `fallido=11`.
- `pagos_suscripcion` ahora solo expone `SELECT` a `authenticated`; escritura queda reservada para rutas server con `service_role`.
- Performance Advisor aun reporta FKs sin indice y un indice duplicado en `solicitudes_contacto`; revisar despues de estabilizar pagos/produccion.

---

## Addendum 2026-07-28 - Google OAuth y alta SaaS

- Migracion aplicada en remoto: `20260728083604_google_oauth_account_completion`.
- `public.users` incorpora perfil privado de alta SaaS: `nombre`, `whatsapp`, `ciudad_comuna` y `data_sharing_accepted_at`.
- `users_correo_normalized_unique` evita cuentas duplicadas por mayusculas o espacios en correo.
- `complete_google_oauth_account(...)` usa `SECURITY INVOKER`, `search_path=''`, locks transaccionales de 64 bits por `auth_user_id` y correo, y upsert de `organization_profile`.
- La RPC solo tiene EXECUTE para `service_role`; `anon` y `authenticated` no pueden invocarla.
- Los grants de `users` exponen a `authenticated` solo columnas operativas. Las cuatro columnas privadas no tienen SELECT cliente.
- El trigger `ensure_organization_profile_trial_defaults` sigue siendo la unica fuente de creacion del trial. La RPC no reinicia planes ni fechas existentes.
- Datos comerciales de contacto, responsable y zona se precargan solo cuando estan vacios. El nombre del taller se sincroniza con el valor confirmado.

### Addendum 2026-08-13 - Registro directo por correo

- La misma RPC `complete_google_oauth_account(...)` tambien provisiona altas iniciadas con correo/contrasena: el Route Handler crea primero el usuario Auth confirmado y luego invoca la RPC solo con `service_role`.
- El provisionamiento sigue siendo atomico dentro de Postgres para `users`, `organizations` y `organization_profile`; si falla, el handler elimina el usuario Auth recien creado como compensacion.
- `ciudad_comuna` es opcional. Un valor vacio se normaliza a `NULL` en `users.ciudad_comuna` y `organization_profile.public_zone`; un valor informado debe tener entre 2 y 120 caracteres.
- Verificacion remota posterior: 23 usuarios, 0 correos normalizados duplicados, 0 `auth_user_id` duplicados, 0 organizaciones activas sin perfil y 0 perfiles con fechas de trial nulas.

---

## Addendum 2026-05-31 - FK indexes verificados

- Se aplico en remoto `20260531232020_add_missing_fk_indexes_and_drop_duplicate`.
- Se agregaron covering indexes para todas las FKs que reportaba Performance Advisor.
- Consulta directa a `pg_constraint`/`pg_index` devuelve 0 foreign keys sin indice covering.
- Se elimino el indice duplicado exacto `solicitudes_contacto_organization_id_creado_en_idx`; se conserva `solicitudes_contacto_org_created_idx`.
- Performance Advisor queda solo con avisos `unused_index`; no se eliminan por ahora porque varios indices son nuevos o de rutas con poco trafico.

---

## Addendum 2026-07-30 - Fabricacion Fase 2/3/4 aplicada en remoto

- Migraciones remotas aplicadas y registradas: `20260729230407_fabrication_recipes_persistence`, `20260729234019_cotizacion_items_fabricacion_snapshot`, `20260730001306_harden_fabrication_recipe_grants` y `20260730003756_fabrication_recipe_validation_metadata`.
- `fabrication_recipes` guarda recetas versionadas y ahora incluye `validated_by uuid` para trazabilidad de la version validada.
- `fabrication_recipe_tests` guarda casos de prueba por receta e incluye `is_required boolean not null default true` para distinguir pruebas obligatorias y opcionales.
- Triggers Fase 4 exigen `validated_at` al validar y vinculan `validated_by` con `auth.uid()` en validaciones/pruebas aprobadas desde sesiones authenticated.
- RLS verificada: lectura authenticated de recetas Ventora (`scope='ventora'`) y recetas privadas de la organizacion; insert/update solo recetas privadas por `organization_id = get_org_id()`.
- Grants verificados despues del hardening: `anon` sin privilegios sobre las tablas nuevas; `authenticated` y `service_role` solo con `SELECT/INSERT/UPDATE`.
- Smoke remoto con dos empresas QA confirmo aislamiento, lectura Ventora, bloqueo de update cruzado, guardado real de `cotizacion_items.fabricacion_snapshot`, ausencia de snapshot sin receta o con multiples recetas y snapshot historico estable tras archivar/versionar receta.
- Compatibilidad: `cotizacion_line_templates.catalog_metadata.fabricationRecipePack`, espejo `fabricationRecipe` y snapshots `[cub:]` siguen como formatos legacy de lectura/compatibilidad. No migrar ni escribir esos formatos desde la Fase 2.
- No tocar ni reactivar `materials`, `system_lines`, `formula_variables` ni `quote_item_breakdown` para esta funcionalidad.

---

## Addendum 2026-07-29 - Auditoria remota Supabase

- MCP Supabase agregado y autenticado para `yrtrwgkaopfumpidjthk`; en esta sesion las herramientas MCP no quedaron inyectadas, por lo que la verificacion se hizo con Supabase CLI remoto.
- `supabase projects list` reporta proyecto `ACTIVE_HEALTHY`, region `us-west-2`, Postgres `17.6.1.063`.
- Advisors security remoto (`supabase db advisors --linked --type security --level warn`) devuelve 4 warnings:
  - `touch_growth_updated_at` sin `search_path` fijo.
  - `get_org_id()` como `SECURITY DEFINER` ejecutable por `authenticated`.
  - `reserve_next_cotizacion_code(...)` como `SECURITY DEFINER` ejecutable por `authenticated`.
  - Leaked password protection desactivado en Supabase Auth.
- Advisors performance remoto devuelve 3 FKs sin covering index: `growth_activities.workspace_id`, `growth_prospects.converted_organization_id`, `growth_tasks.prospect_id`.
- Advisors performance tambien reporta varios `unused_index` informativos; no eliminarlos sin revisar trafico real y planes de consulta.
- Estado RLS remoto confirmado: `cotizacion_line_templates`, `formula_variables`, `materials`, `quote_item_breakdown` y `system_lines` tienen RLS habilitado.
- Policies remotas confirmadas:
  - `quote_item_breakdown` ya tiene SELECT/INSERT/UPDATE por `organization_id = get_org_id()`.
  - `formula_variables` tiene policy deny-all para `anon`/`authenticated`.
  - `materials` tiene SELECT/INSERT/UPDATE por `organization_id = get_org_id()`, pero las policies aparecen para rol `public` y UPDATE no tiene `WITH CHECK`.
  - `system_lines` tiene SELECT para `organization_id IS NULL OR organization_id = get_org_id()` con rol `public`.
- Recomendacion: antes de aplicar Fase 2 en remoto, crear una migracion de hardening chica para `materials`/`system_lines` si se decide reducir rol `public` a `authenticated` y agregar `WITH CHECK` en UPDATE de `materials`.

---

## Addendum 2026-08-13 - Historial reconciliado para billing

- El historial remoto contenia seis versiones sin archivo local. Se recuperaron con `supabase migration fetch --linked`: `20260517053830`, `20260517054151`, `20260518040656`, `20260708173558`, `20260709195129` y `20260717071404`.
- Corresponden a cambios ya documentados en este mapa (hardening multi-tenant, policies, catalogo, Quote Studio y configuracion visual), pero con timestamps remotos distintos de sus copias locales historicas. No implica que esas capacidades falten en produccion.
- La base de datos remota confirma que existen las piezas recurrentes de Mercado Pago: tabla `suscripciones_organizacion`, indice unico de suscripcion abierta, RPCs de conciliacion y ledger de pagos.
- Fase 2 de Mercado Pago `20260812233117` y el default de trial 15 dias `20260813002850` fueron aplicados y registrados en remoto. El cambio no actualiza trials existentes.
- La deuda restante son versiones locales antiguas sin marca remota. Es un bloqueo de automatizacion para `db push`, no una autorizacion para ejecutar o marcar esas migraciones en bloque.

---

## Addendum 2026-08-13 - Billing Fase 4 regionalizacion

- `organization_profile` remoto incorpora ocho campos regionales: `country_code`, `currency_code`, `locale`, `timezone`, `phone_country_code`, `tax_label`, `tax_rate_default` y `tax_id_label`.
- La migracion `20260813015101_billing_phase_4_organization_region` deja Chile como default/backfill de compatibilidad y restringe los paises iniciales a `AR`, `CL`, `CO`, `MX`, `PE`, `UY`.
- No se agregaron tablas, policies RLS ni grants cliente nuevos. La configuracion pertenece a la fila de perfil ya aislada por `organization_id`.
- El dump remoto `current_schema.sql` fue regenerado el mismo dia. El diff migraciones-vs-remoto continua bloqueado porque la cadena local no tiene su migracion base de `organizations`; mantener ese trabajo separado de cambios de producto.

---

## Addendum 2026-08-13 - Billing Fase 5 snapshots regionales de cotizacion

- `cotizaciones.regional_snapshot` guarda un objeto JSON v1 con pais, moneda, locale, zona horaria y etiqueta/tasa tributaria comercial.
- La migracion `20260813023403_billing_phase_5_quote_region_snapshots.sql` fue aplicada y registrada en remoto; el dump `current_schema.sql` ya la incluye.
- No se hace backfill: un registro sin snapshot se trata explicitamente como cotizacion Chile historica, para no reinterpretar documentos ni mensajes con el perfil actual de la empresa.

---

## Addendum 2026-08-20 - Onboarding medible Fase B

- `growth_onboarding_videos` es la biblioteca global founder: paso comercial, dispositivo, duracion, URL HTTPS y estado editorial. `es_predeterminado` permite un video activo para celular y otro para computador para todas las cuentas nuevas. No guarda contenido ficticio.
- `growth_onboarding_assignments` relaciona una guia lista con una `organization_id` sólo como override excepcional de piloto. La app de cada empresa sólo lee sus propias asignaciones.
- `growth_onboarding_events` almacena apertura de video y los hitos de primera cotizacion/PDF. La apertura es única por organización/video; los dos hitos comerciales se capturan con triggers de `cotizaciones`, por lo que no dependen del navegador.
- Las tres tablas tienen RLS y `FORCE ROW LEVEL SECURITY`; los triggers operan con funciones `SECURITY DEFINER` de ACL exclusiva para `postgres` y `service_role`.
