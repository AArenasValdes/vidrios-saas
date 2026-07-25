# Data Model Map - Ventora

Fuente de verdad: `supabase/docs/current_schema.sql`, `supabase/docs/database_map.md`, `supabase/docs/rls_policies.md`

---

## Tablas activas (core del producto)

### Tabla: organizations

- **Proposito**: Raiz del multi-tenant. Cada empresa cliente SaaS es una organizacion.
- **Campos importantes**: `id` (bigint PK), `nombre`, `correo`, `telefono`, `direccion`, `logo_url`, `plan`, `creado_en`, `actualizado_en`, `eliminado_en`
- **Relaciones**: 1:N con users, clients, projects, cotizaciones, cotizacion_items, cotizacion_line_templates, materials, historial_precios, organization_profile, solicitudes_contacto, labor_costs, web_push_subscriptions, cotizacion_code_counters, public_landing_gallery, public_landing_testimonials, pagos_suscripcion
- **Usada por**: Auth (resolver org), todas las features (filtro tenant)
- **Archivos donde aparece**: Todos los repositories, `src/features/auth/repositories/auth.repository.ts`
- **Riesgos**: No hacer hard delete de organizaciones con datos asociados. `clients`, `projects`, `cotizaciones` y otras tablas pueden bloquear por FK; el flujo correcto es soft delete con `eliminado_en`.

---

### Tabla: users

- **Proposito**: Empleados de la organizacion vinculados a auth.users
- **Campos importantes**: `id` (bigint PK), `correo` (UNIQUE), `organization_id` (FK), `rol` (admin/tecnico/viewer por convencion, sin CHECK), `auth_user_id` (FK auth.users), `eliminado_en`
- **Relaciones**: N:1 organizations, N:1 auth.users
- **Usada por**: Auth (perfil post-login), RLS (`get_org_id()`), solicitudes access control
- **Archivos donde aparece**: `src/features/auth/repositories/auth.repository.ts`, `src/features/solicitudes/services/solicitudes-contacto-access.ts`
- **Riesgos**: `rol` no tiene CHECK constraint. Si se agrega un rol nuevo, actualizar `UserRole` type en `src/features/auth/types/auth.ts`

---

### Tabla: clients

- **Proposito**: Clientes finales de la empresa. Se crean manualmente o auto-creados al hacer cotizacion.
- **Campos importantes**: `id` (bigint PK), `nombre` (NOT NULL), `telefono`, `direccion`, `correo`, `organization_id` (FK), `estado_manual` (CHECK: activo/seguimiento/prospecto/inactivo), `eliminado_en`
- **Relaciones**: N:1 organizations, 1:N projects, 1:N cotizaciones (via projects)
- **Usada por**: Clientes, Cotizaciones, Dashboard
- **Archivos donde aparece**: `src/features/clientes/repositories/clientes-repository.ts`, `src/features/cotizaciones/services/cotizaciones.service.ts`, `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
- **Riesgos**: la unicidad efectiva de `correo` debe mantenerse por `organization_id` + `eliminado_en IS NULL`. Si reaparece `unique_correo_clients` global, rompe el piloto multi-empresa.

---

### Tabla: projects

- **Proposito**: Obras/trabajos vinculados a un cliente
- **Nombre visible en producto**: **Obras**. La tabla tecnica sigue siendo `projects`.
- **Campos importantes**: `id` (bigint PK), `titulo` (NOT NULL), `descripcion`, `cliente_id` (FK), `organization_id` (FK), `estado`, `eliminado_en`
- **Relaciones**: N:1 organizations, N:1 clients, 1:N cotizaciones
- **Usada por**: Clientes (ficha), Cotizaciones (auto-creacion)
- **Archivos donde aparece**: `src/features/projects/repositories/projects.repository.ts`, `src/features/cotizaciones/services/cotizaciones.service.ts`, `src/features/clientes/services/clientes.service.ts`
- **Riesgos**: `estado` no tiene CHECK constraint

---

### Tabla: cotizaciones

- **Proposito**: Presupuestos comerciales. Herramienta de cierre, no cotizador tecnico.
- **Campos importantes**: `id` (bigint PK), `proyecto_id` (FK), `organization_id` (FK), `numero` (COT-DDMMYY-NNN, unique por org), `estado` (sin CHECK), `estado_comercial`, `pricing_mode` (CHECK `por_item|total_global`, default `por_item`), `total` (NOT NULL), `subtotal_neto`, `costo_total`, `margen_pct`, `utilidad_total`, snapshots financieros de Quote Studio (`costo_materiales_total`, `costo_mano_obra_total`, `costo_traslado_total`, `costo_otros_total`, `merma_pct`, `merma_total`, `margen_objetivo_pct`, `precio_recomendado_neto`, `iva_pct`, `financial_snapshot_version`, `financial_snapshot_calculado_en`, `cost_basis_status`), `descuento_pct`, `flete`, `iva`, `notas`, `valido_hasta`, `approval_token` (UNIQUE partial WHERE NOT NULL), `approval_token_expires_at`, `cliente_vio_en`, `cliente_respondio_en`, `cliente_respuesta_canal`, `pdf_descargado_en` (timestamptz, actividad silenciosa al descargar PDF), `eliminado_en`
- **Relaciones**: N:1 organizations, N:1 projects, 1:N cotizacion_items
- **Usada por**: Cotizaciones, Dashboard, Aprobacion publica, PDF, WhatsApp
- **Archivos donde aparece**: `src/features/cotizaciones/repositories/cotizaciones-repository.ts`, `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts`, `src/features/dashboard/services/dashboard-summary-server.service.ts`, `app/api/cotizaciones/resumen/route.ts`, `app/api/cotizaciones/[id]/pdf-descargado/route.ts`
- **Riesgos**: No romper generacion de `numero` (usa `reserve_next_cotizacion_code()`). No cambiar logica de `approval_token` sin actualizar aprobacion publica. `estado` no tiene CHECK. `pdf_descargado_en` no debe cambiar `estado` comercial automaticamente. En `pricing_mode='total_global'`, el `total` es total final cliente; `iva` solo desglosa IVA incluido cuando aplica y `costo_total`, `margen_pct`, `utilidad_total` deben quedar en cero/null por compatibilidad y no exponerse. Los snapshots financieros son netos y aditivos: no deben alterar PDF, WhatsApp, aprobacion publica ni la UI movil bajo 1024 px.

---

### Tabla: cotizacion_items

- **Proposito**: Items/componentes de una cotizacion. Soporta tres tipos: componente calculado (con medidas y precio), item libre con valor (redactable, sin datos tecnicos) y descriptivo (para `total_global` sin precio por item).
- **Campos importantes**: `id` (bigint PK), `cotizacion_id` (FK), `organization_id` (FK), `nombre`, `descripcion`, `tipo_item`, `tipo_componente`, `codigo` (V1, P1, L1), `cantidad` (NOT NULL), `unidad`, `ancho`, `alto`, `area_m2`, `linea`, `color`, `vidrio`, `precio_unitario` (NOT NULL), `subtotal` (NOT NULL), `costo_unitario`, `costo_total`, `margen_pct`, `utilidad`, `product_type_id` (FK legacy), `system_line_id` (FK legacy), `configuration_id` (FK legacy), `observaciones`, `orden`, `eliminado_en`
- **`tipo_item` valores**: `"componente"` (default, item calculado), `"item_libre_con_valor"` (item redactable con IVA), `"configurado"` y `"manual"` (legacy). El workflow solo usa los primeros dos; los valores legacy se mapean a `"componente"` en rehidratacion.
- **`item_libre_con_valor` reglas**:
  - `costo_unitario`, `costo_total`, `margen_pct`, `utilidad` = 0 (no tienen costo interno).
  - `precio_unitario` y `subtotal` conservan el valor comercial.
  - `ancho`, `alto`, `area_m2` = null (no tienen dimensiones fisicas).
  - `linea`, `color`, `vidrio` = "" (no tienen datos tecnicos).
  - Metadata en `observaciones` via `encodeCotizacionItemPresentationMeta`: incluye `ivaMode` (`total_incluye_iva` / `neto_mas_iva`), `displayMode: "item_libre"`, `netoCalculado`, `ivaCalculado`, `totalClienteVisible`.
- **Nota de roadmap**: `observaciones` ya concentra metadata comercial y visual derivada del workflow actual. No seguir cargando configuracion visual compleja ahi sin una estructura aditiva aprobada.
- **Relaciones**: N:1 cotizaciones, N:1 organizations, 1:N quote_item_breakdown, FKs legacy a product_types, system_lines, system_configurations
- **Usada por**: Cotizaciones, PDF, presupuesto publico
- **Archivos donde aparece**: `src/features/cotizaciones/repositories/cotizaciones-repository.ts`, `src/features/cotizaciones/services/cotizaciones.service.ts`, `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`
- **Riesgos**: FKs duplicados (INC-1). FKs legacy a tablas dormidas. No romper campo `orden` (orden visual). `linea` se usa como snapshot comercial de la linea elegida en cotizacion. En cotizaciones `total_global`, `precio_unitario` y `subtotal` se guardan en 0 por NOT NULL y no representan precio comercial por componente; nunca mostrar esos `$0` al cliente. `isFreeValueComponentType` depende del catalogo (`esItemLibre`); si se renombra un subtipo, actualizar el catalogo.

---

### Tabla: cotizacion_line_templates

- **Proposito**: Catálogo privado comercial por organización: líneas, costos, precios, mínimos y reglas de cobro para cotización asistida
- **Campos importantes**: `id` (bigint PK), `organization_id` (FK), `nombre`, `categoria` (CHECK: aluminio/pvc/vidrio/shower/accesorios/otros), `unidad_cobro` (CHECK: m2/metro_lineal/unidad/valor_manual), `material` (Aluminio/PVC/Cristal), `costo_base`, `precio_m2_sugerido`, `minimo_cobrable`, `redondeo_precio` (DEFAULT 1000), `merma_pct`, `margen_objetivo_pct`, `proveedor`, `vigencia_desde`, `vigencia_hasta`, `catalog_metadata` (jsonb; para `categoria='vidrio'` guarda `espesor` y `terminacion`), `vidrio_principal_recomendado`, `is_active`, `sort_order`, `creado_en`, `actualizado_en`, `eliminado_en`
- **Metadata Fase 4 vigente (`catalog_metadata`, sin tabla nueva)**:
  - **Pack de recetas (2026-07-24)**: `fabricationRecipePack` `{ v:1, recipes[], defaultRecipeId, lastUsedRecipeId }`; espejo `fabricationRecipe` (receta activa/default).
  - Por receta: `id`, `recipeVersion`, `aperturaTipo`, `herrajeTipo`, `herrajeLabel`, `isActive`, `usageCount`/`lastUsedAt`, `sourceKind`, componentes, barras, estados de receta.
  - Helpers: `getFabricationRecipePackFromMetadata()`, `mergeFabricationRecipePackIntoMetadata()`, `selectRecipeForQuote()`, `parseFabricationRecipe()`.
  - Legacy Camino 2 (migración): `cubicationSystem`, `cubicationStatus`, perfiles por rol, deductions, `cuttingEnabled`… — helpers `getLineTemplateCubicationConfig()` / `buildLineTemplateCuttingPreview()`.
  - Snapshot cotización: bridge `[cub:]` v2 en `cotizacion_items.observaciones` (incluye receta congelada).
- **No ampliar** tipologías de venta en el catálogo (bow, etc.): van al constructor. Plantillas comerciales L5000/L20/L25 viven en código (`fabrication-recipe-commercial-templates.ts`), no como filas de catálogo.
- **No confundir**: `catalog_metadata.lineSystem` (texto comercial opcional) ≠ `cubicationSystem` (partida de estimación V1).
- **Snapshot por pieza (sin tabla nueva)**: pauta congelada en `cotizacion_items.observaciones` via bridge `[cub:]` (JSON base64url). Helpers: `cotizacion-line-template-cubication-snapshot.ts`. No recalcular historicos desde `catalog_metadata` actual.
- **Handoff agentes**: `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md`.
- **Relaciones**: N:1 organizations
- **Usada por**: `/cotizaciones/nueva`, `/configuracion/empresa`, `/configuracion/empresa/lineas-precios`, `/configuracion/empresa/lineas-precios/importar`
- **Archivos donde aparece**: `src/features/cotizaciones/line-templates/`, `src/features/cotizaciones/new-quote/workflow-ui.ts`, `app/(pwa-app)/configuracion/empresa/page.tsx`
- **Riesgos**: No crear FK viva desde `cotizacion_items`; la cotizacion debe guardar snapshot textual en `cotizacion_items.linea` y metadata codificada en `observaciones` para que cotizaciones antiguas no cambien. Multi-tenant estricto y soft delete obligatorio. Migración remota aplicada 2026-07-09 (`extend_cotizacion_line_templates_catalog`) y migración aditiva 2026-07-13 expande `material` a `Cristal`.

---

### Tabla: cotizacion_item_visual_configs

- **Estado**: Activa (migracion `20260717120000_cotizacion_item_visual_configs`). Sync al guardar + hydrate prioritario en lecturas (`getWorkflowById`, presupuesto publico). Bridge `[gvc:...]` en `observaciones` como fallback.
- **Proposito**: Persistencia aditiva de configuracion visual guiada y SVG cache por item.
- **Campos**: `id`, `organization_id`, `cotizacion_item_id`, `schema_version`, `config_json`, `svg_markup`, `creado_en`, `actualizado_en`, `eliminado_en`
- **RLS**: select/insert/update por `organization_id = get_org_id()` para `authenticated`
- **Reglas**: unique parcial 1 config activa por `cotizacion_item_id`; soft delete; `config_json` fuente de verdad en lectura (prioriza sobre bridge).
- **Entrada UI (QA)**: desktop `/cotizaciones/nueva` -> Paso 2 -> modo explícito **Constructor** para cuaderno multipieza. El editor avanzado de una pieza también se abre desde Ventana/Puerta -> **Personalizado** -> Abrir constructor.
- **Archivos donde aparece**: `src/features/cotizaciones/visual-composer/`, `cotizaciones.service.ts`, `public-cotizacion-approval.service.ts`, `paso-dos-agregar-grupo-sheet.tsx`, `paso-dos-editor-desktop.tsx`, `cotizacion-item-presentation.ts`
- **Extensión Constructor V2**: `oscilobatiente` y `openingSide` son cambios aditivos dentro de `config_json`; no requieren tabla ni migración nueva. Persistencia formal sigue filtrada por `organization_id`; `[gvc:]` continúa solo como fallback compatible.
- **Handoff agentes**: `docs/agent-map/CONSTRUCTOR_DESKTOP_HANDOFF.md`.

---

## Tablas propuestas no implementadas (solo documental)

Estas tablas no estan aprobadas para implementacion inmediata. Sirven solo como referencia del roadmap Desktop Taller.

### Tablas no aprobadas en esta etapa

- `oportunidades`
- `cobros`

Quedan fuera del alcance activo. No documentarlas como tablas core ni planificar migraciones sin aprobacion explicita.

---

### Tabla: onboarding_checklists

- **Proposito**: Persistir el progreso compartido del onboarding comercial por organizacion.
- **Campos importantes**: `id` (uuid PK), `organization_id` (FK), `step_key` (CHECK: company_ready/public_page_live/channel_ready/first_lead/first_quote/first_share), `estado` (CHECK: pendiente/en_progreso/completado/omitido), `completed_at`, `completed_by_user_id` (FK users), `completion_source`, `metadata_json`, `creado_en`, `actualizado_en`, `eliminado_en`
- **Relaciones**: N:1 organizations, N:1 users
- **Usada por**: Onboarding comercial guiado en dashboard, configuracion, canales y cotizaciones privadas
- **Archivos donde aparece**: `src/features/onboarding/repositories/onboarding-checklist.repository.ts`, `src/features/onboarding/services/onboarding-checklist.service.ts`
- **Riesgos**: Los pasos `channel_ready` y `first_share` no deben derivarse por lectura pasiva. Mantener unique parcial por `organization_id + step_key` y soft delete activo.

---

### Tabla: solicitudes_contacto

- **Proposito**: Leads capturados. Tabla CORE de captacion.
- **Campos importantes**: `id` (uuid PK, gen_random_uuid), `nombre` (NOT NULL), `empresa` (NOT NULL), `correo`, `telefono`, `contacto`, `ayuda` (CHECK: demo/cotizacion/ventas), `mensaje`, `tipo_trabajo`, `estado` (CHECK: nueva/contactada/cerrada/descartada), `origen` (DEFAULT 'landing'), `contexto` (CHECK: landing/empresa-publica/registro-saas), `organization_id` (FK, nullable, ON DELETE CASCADE), `utm_source`, `utm_medium`, `utm_campaign`, `source_url`, `contactada_at`, `ip`, `user_agent`, `creado_en`, `actualizado_en`
- **Relaciones**: N:1 organizations (ON DELETE CASCADE)
- **Usada por**: Solicitudes, Captacion, Notificaciones (push al crear lead)
- **Archivos donde aparece**: `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`, `app/api/solicitud/[empresa]/route.ts`
- **Riesgos**: RLS permite INSERT publico (anon) con estado='nueva'. `organization_id` nullable solo para leads globales (`landing`, `registro-saas`). Leads de `empresa-publica` requieren organizacion. Rate limiting por IP en API route.

---

### Tabla: organization_profile

- **Proposito**: Perfil de empresa 1:1 con organizations. Branding, config landing, config solicitud publica.
- **Campos importantes**: `organization_id` (PK, FK ON DELETE CASCADE), `empresa_nombre`, `empresa_logo_url`, `responsable_comercial`, `empresa_direccion`, `empresa_telefono`, `empresa_email`, `brand_color` (DEFAULT '#1a3a5c'), `forma_pago`, `proveedor_preferido`, `modo_precio_preferido` (DEFAULT 'margen'), `margen_defecto` (DEFAULT 100), `solicitud_publica_slug` (UNIQUE partial), `solicitud_publica_descripcion_corta`, `solicitud_publica_valor`, `solicitud_publica_mensaje_confianza`, `solicitud_publica_privacidad`, `solicitud_publica_horario_desde`, `solicitud_publica_horario_hasta`, `solicitud_publica_dias_atencion`, `solicitud_publica_horario_por_dia` (jsonb), `public_name`, `public_subtitle`, `public_zone`, `public_business_type`, `secondary_color` (DEFAULT '#25d366'), `hero_mode` (CHECK: image/gradient), `hero_image_url`, `hero_title`, `hero_subtitle`, `show_gallery`, `show_schedule`, `show_rating`, `rating_label`, `jobs_count_label`, `form_title`, `form_subtitle`, `is_published`, `subscription_status`, `trial_started_at`, `trial_ends_at`, `subscription_started_at`, `subscription_ends_at`, `plan_type`, `billing_period`, `payment_method`, `last_payment_at`, `founder_price_locked`
- **Relaciones**: 1:1 organizations, 1:N public_landing_gallery (ON DELETE CASCADE)
- **Usada por**: Empresa config, Pagina venta, Solicitud publica, PDF (branding), Aprobacion publica, trial gratis y activacion manual
- **Archivos donde aparece**: `src/features/organization-profile/repositories/organization-profile.repository.ts`, `src/features/organization-profile/services/organization-profile.service.ts`, `src/features/subscriptions/services/subscription-status.service.ts`, `src/features/subscriptions/services/subscription-route-access.service.ts`, `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts`, `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`, `app/(landing-web)/solicitud/[empresa]/page.tsx`
- **Riesgos**: Slug UNIQUE parcial. Cambios afectan landing publica, PDF y aprobacion simultaneamente. 30+ campos en mapping complejo. El trial de 7 dias y el estado de suscripcion efectiva salen desde aqui; no duplicar reglas de negocio en UI o APIs.
- **Cuentas internas gratis permanentes**: organizaciones `3` y `4` deben quedar `active/founder/founder_full`, `subscription_ends_at = NULL`, `founder_price_locked = true` por `20260602065826_founder_free_internal_accounts.sql`.

---

### Tabla: public_landing_gallery

- **Proposito**: Galeria de imagenes para landing publica de empresa
- **Campos importantes**: `id` (bigint PK), `organization_id` (FK ON DELETE CASCADE), `landing_id` (FK organization_profile ON DELETE CASCADE), `image_url` (NOT NULL), `label`, `sort_order` (NOT NULL, DEFAULT 0), `is_visible` (NOT NULL, DEFAULT true)
- **Relaciones**: N:1 organizations, N:1 organization_profile
- **Usada por**: Landing gallery, Pagina venta
- **Archivos donde aparece**: `src/features/landing-gallery/repositories/landing-gallery.repository.ts`, `src/features/landing-gallery/repositories/landing-gallery-server.repository.ts`
- **Riesgos**: Max 8 items por org (limita en service). Imagenes en Storage bucket `organization-assets`.

---

### Tabla: web_push_subscriptions

- **Proposito**: Suscripciones push de navegadores de usuarios
- **Campos importantes**: `id` (bigint PK), `organization_id` (NOT NULL, sin FK), `auth_user_id` (uuid, sin FK), `endpoint` (UNIQUE), `p256dh`, `auth`, `subscription` (jsonb), `user_email`, `user_agent`, `is_active`, `created_at`, `updated_at`, `last_seen_at`
- **Relaciones**: Sin FKs (bug conocido INC-4)
- **Usada por**: Notificaciones push
- **Archivos donde aparece**: `src/features/notificaciones/repositories/web-push-subscriptions.repository.ts`, `app/api/pwa/push-subscriptions/route.ts`
- **Riesgos**: Sin FK a organizations/auth.users. RLS ya endurecido para `authenticated` por `organization_id + auth_user_id`, el API de suscripcion/baja ya se ata tambien al `auth_user_id`, pero el envio server-side sigue dependiendo de `service_role`.

---

### Tabla: cotizacion_code_counters

- **Proposito**: Contador atomico para generacion de codigos COT-DDMMYY-NNN
- **Campos importantes**: `organization_id` (PK parcial), `quote_date` (date, PK parcial), `last_number` (NOT NULL, DEFAULT 0)
- **Relaciones**: Sin FK a organizations (bug INC-5)
- **Usada por**: Cotizaciones (generacion de codigo)
- **Archivos donde aparece**: Funcion DB `reserve_next_cotizacion_code()`, `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
- **Riesgos**: SIN RLS POLICIES. Solo accesible via funcion SECURITY DEFINER.

---

### Tabla: pagos_suscripcion

- **Proposito**: Registro de pagos de suscripción procesados por Webpay Plus (Transbank). Cada fila representa un intento de pago.
- **Campos importantes**: `id` (bigint PK), `organization_id` (FK ON DELETE CASCADE), `plan_code` (founder_full, quote_only), `billing_period` (yearly), `amount_clp` (NOT NULL), `currency` (CLP), `payment_provider` (webpay_plus), `provider_token`, `provider_status`, `provider_response` (jsonb), `buy_order` (idempotency key), `status` (pendiente/aprobado/fallido/reembolsado), `paid_at`, `period_starts_at`, `period_ends_at`, `creado_en`, `actualizado_en`, `eliminado_en`
- **Relaciones**: N:1 organizations (ON DELETE CASCADE)
- **Usada por**: Suscripciones (Webpay flow), cuenta vencida
- **Archivos donde aparece**: `src/features/subscriptions/hooks/useWebpayPago.ts`, `supabase/migrations/20260530100000_pagos_suscripcion.sql`
- **Riesgos**: Unique `buy_order` WHERE eliminado_en IS NULL protege idempotencia. RLS permite solo SELECT por `organization_id` para `authenticated`; inserts/updates quedan en rutas server con `service_role`. No exponer `provider_response` completo en logs de servidor.

---

### Addendum pagos_suscripcion - Flow billing

- `pagos_suscripcion` ahora funciona como ledger provider-agnostic: `flow`, `manual_transfer`, `webpay_plus`.
- Flow es el provider principal temporal para `/api/billing/*`; Webpay Plus queda como compatibilidad/futuro.
- Campos agregados por `20260602062145_billing_flow_provider.sql`: `provider_order_id` (Flow `flowOrder`) y `checkout_url`.
- `status` ahora contempla `pendiente`, `aprobado`, `fallido`, `cancelado`, `reembolsado`.
- Idempotencia: `buy_order` interno y unique parcial `(payment_provider, provider_order_id)` para orden externa.
- RLS/grants se mantienen: clientes autenticados solo leen pagos de su `organization_id`; writes solo server con `service_role`.
- No exponer `provider_response` en respuestas cliente.

---

### Tabla: public_landing_testimonials

- **Proposito**: Valoraciones publicas de clientes desde la mini landing, moderadas por la empresa.
- **Campos importantes**: `id` (uuid PK), `organization_id` (bigint FK ON DELETE CASCADE), `nombre_corto`, `comentario`, `estrellas` (1-5), `estado` (pendiente/aprobada/oculta), `creado_en`, `actualizado_en`, `aprobado_en`, `ocultado_en`
- **Relaciones**: N:1 organizations
- **Usada por**: Landing publica `/solicitud/[empresa]`, formulario de valoraciones y configuracion pagina venta
- **Archivos donde aparece**: `src/features/public-landing-testimonials/`, `app/api/solicitud/[empresa]/valoraciones/route.ts`, `supabase/migrations/20260515121000_public_landing_personalization_and_testimonials.sql`
- **Riesgos**: `organization_id` debe ser bigint. La migracion `20260531050353_harden_public_landing_testimonials_org_id.sql` corrige/endurece el tipo si existe drift.

---

## Tablas legacy/dormidas (NO tocar sin instruccion explicita)

### Tabla: materials

- **Proposito**: Catalogo de materiales del antiguo cotizador tecnico. DORMIDA.
- **Campos importantes**: `id`, `nombre`, `organization_id`, `material_type_id`, `costo`, `inventario`, `unidad`, `categoria`, `precio_venta`
- **Riesgos**: No reactivar. Pertenece al enfoque de cotizador tecnico descartado.

### Tabla: material_types

- **Proposito**: Tipos globales de materiales. DORMIDA.
- **Riesgos**: Sin `organization_id`. Catalogo global. Sin RLS policies.

### Tabla: product_types

- **Proposito**: Tipos de producto globales. DORMIDA.
- **Riesgos**: Sin `organization_id`. SELECT publico via RLS.

### Tabla: system_lines

- **Proposito**: Lineas de sistema (perfiles). DORMIDA.
- **Riesgos**: `organization_id` nullable (mixto). Sin RLS efectiva.

### Tabla: system_configurations

- **Proposito**: Configuraciones de sistema. DORMIDA.
- **Riesgos**: FKs a product_types y system_lines (dormidos).

### Tabla: configuration_materials

- **Proposito**: Pivot configuracion-material. DORMIDA.
- **Riesgos**: FKs duplicados (INC-1).

### Tabla: line_glass_compatibility

- **Proposito**: Compatibilidad linea-vidrio. DORMIDA.
- **Riesgos**: Sin RLS directa (via subquery).

### Tabla: formula_variables

- **Proposito**: Variables de formula. DORMIDA.
- **Riesgos**: Sin `organization_id`. Sin RLS policies.

### Tabla: labor_costs

- **Proposito**: Costos de mano de obra. DORMIDA.
- **Riesgos**: Tiene `organization_id` pero no se usa activamente.

### Tabla: historial_precios

- **Proposito**: Historial de precios de materiales. DORMIDA.
- **Riesgos**: FK con tilde en nombre (INC-2).

### Tabla: quote_item_breakdown

- **Proposito**: Breakdown de costos por item. DORMIDA.
- **Riesgos**: FKs duplicados (INC-1). SIN RLS POLICIES (bug INC-10).

---

## Vista: admin_clientes_eliminados

- **Proposito**: Muestra clientes soft-deleted con conteos de proyectos/cotizaciones eliminados
- **Security invoker**: true
- **Usada por**: Funcion `admin_purgar_clientes_eliminados()`

---

## Funciones DB

| Funcion | Tipo | Proposito |
|---|---|---|
| `get_org_id()` | SQL STABLE SECURITY DEFINER | Resuelve organization_id desde auth.uid() via public.users.auth_user_id |
| `reserve_next_cotizacion_code(org_id, date)` | PLPGSQL SECURITY DEFINER | Generacion atomica de codigo COT-DDMMYY-NNN |
| `admin_purgar_clientes_eliminados(retention_days)` | PLPGSQL SECURITY DEFINER | Purga hard de registros soft-deleted > retention |
| `rls_auto_enable()` | EVENT TRIGGER | Auto-habilita RLS en nuevas tablas publicas |

---

## RLS - Resumen de aislamiento

| Mecanismo | Tablas |
|---|---|
| `get_org_id()` directo | clients, cotizaciones, cotizacion_items, cotizacion_line_templates, onboarding_checklists, projects, users, materials, historial_precios, organizations, labor_costs, solicitudes_contacto, pagos_suscripcion |
| `get_org_id()` + nullable | system_configurations, system_lines |
| Subquery a users | organization_profile, public_landing_gallery |
| Cross-table subquery | configuration_materials, line_glass_compatibility |
| SELECT publico | product_types |
| **Sin policies** | formula_variables, material_types, quote_item_breakdown |

### solicitudes_contacto - RLS especial

- `anon`/`authenticated` pueden INSERT con `estado='nueva'` y `contexto` valido
- `authenticated` pueden SELECT/UPDATE leads de su propia org

### organization_profile - trial y activacion hibrida

- Cada organizacion nueva debe arrancar con fila de `organization_profile` y trial de 7 dias
- La migracion `20260525121500_trial_subscriptions_manual_activation.sql` agrega columnas y trigger de defaults
- El estado efectivo debe salir de `src/features/subscriptions/services/subscription-status.service.ts`, no de comparaciones sueltas en componentes
- Comercialmente hoy se usa modelo hibrido:
  - anuales automatizados por Webpay Plus
  - mensual manual por WhatsApp
  - sin Oneclick, PatPass ni recurrencia automatica en esta etapa

---

## Indexes principales

| Tabla | Index | Tipo |
|---|---|---|
| clients | `(organization_id, id)` WHERE eliminado_en IS NULL | Partial btree |
| clients | `(organization_id, estado_manual)` WHERE eliminado_en IS NULL | Partial btree |
| clients | `(organization_id, correo)` WHERE eliminado_en IS NULL | Unique partial |
| cotizaciones | `(organization_id, actualizado_en DESC)` WHERE eliminado_en IS NULL | Partial btree |
| cotizaciones | `(organization_id, creado_en DESC)` WHERE eliminado_en IS NULL | Partial btree |
| cotizaciones | `(organization_id, estado)` WHERE eliminado_en IS NULL | Partial btree |
| cotizaciones | `(organization_id, numero)` | Unique |
| cotizaciones | `approval_token` WHERE NOT NULL | Unique partial |
| cotizacion_items | `(organization_id, cotizacion_id, orden, creado_en)` WHERE eliminado_en IS NULL | Partial btree |
| solicitudes_contacto | `(organization_id, creado_en DESC)` | btree |
| solicitudes_contacto | `(utm_source)` | btree |
| organization_profile | `lower(solicitud_publica_slug)` WHERE non-empty | Unique partial |
| public_landing_gallery | `(organization_id, sort_order)` | btree |
| web_push_subscriptions | `(organization_id, is_active)` | btree |

---

## Tablas growth (operaciones comerciales internas Ventora)

Dominio separado de `solicitudes_contacto` y multi-tenant SaaS. Acceso via RLS + `growth_workspace_members.auth_user_id = auth.uid()`.

| Tabla | Proposito |
|---|---|
| `growth_workspaces` | Workspace interno (`ventora-founder`); settings/metricas/experimentos en JSON |
| `growth_workspace_members` | Membership por `auth_user_id`; seed fundador condicional |
| `growth_prospects` | Prospectos comerciales Ventora; opcional `converted_organization_id` |
| `growth_activities` | Historial auditable por prospecto |
| `growth_tasks` | Trabajo diario (follow-ups, trials, pagos) |

Migracion: `supabase/migrations/20260627120000_growth_workspace.sql`

---

## Issues conocidos de DB (no arreglar sin instruccion)

| ID | Issue | Severidad |
|---|---|---|
| INC-1 | FKs duplicados en cotizacion_items, configuration_materials, quote_item_breakdown | Alta |
| INC-2 | `historial_precios_organizacion_id_fkey` usa tilde en nombre | Media |
| INC-3 | Reaparicion de `unique_correo_clients` global en `clients.correo` | Alta |
| INC-4 | web_push_subscriptions sin FKs a organizations/auth.users | Media |
| INC-5 | cotizacion_code_counters sin FK a organizations | Baja |
| INC-10 | quote_item_breakdown sin RLS policies | Alta |
| INC-13 | Sin CHECK en cotizaciones.estado, projects.estado, users.rol | Media |
| INC-14 | Grants ALL a anon en todas las tablas | Media |
