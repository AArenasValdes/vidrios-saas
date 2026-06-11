# Changelog Agent Map - Ventora

Historial de cambios en la documentacion del mapa tecnico.

---

## 2026-06-11 - UX silenciosa de PDF y metricas comerciales neutrales

### Resumen

Se alineo la UX de estados y metricas de cotizaciones al flujo real del maestro: descargar PDF, enviar manualmente por WhatsApp y seguir trabajando sin interrupciones. La descarga de PDF ahora registra actividad en silencio (`pdf_descargado_en`), muestra solo un toast y no abre modales ni pregunta si marcar como enviada. El dashboard dejo de usar "presupuestos pendientes" como alerta principal y paso a mostrar **Valor cotizado**, cotizaciones creadas, PDF generados y aprobadas registradas. Los estados visibles de cotizacion ahora son neutrales: **Creada**, **PDF generado**, **Enviada**, **Aprobada**, **Rechazada**, **Terminada** y **Sin cierre registrado** (reemplaza "Pendiente" como etiqueta dominante).

### Archivos nuevos o fuertemente modificados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260611120000_cotizaciones_pdf_descargado_en.sql` | Nueva columna `pdf_descargado_en` en `cotizaciones` |
| `src/features/cotizaciones/services/cotizacion-display-state.service.ts` | Fuente de verdad de estados visibles (`resolveCotizacionWorkflowState`, `resolveCotizacionClosureState`) |
| `app/api/cotizaciones/[id]/pdf-descargado/route.ts` | POST auth para registrar descarga silenciosa de PDF |
| `src/features/cotizaciones/repositories/cotizaciones-repository.ts` | `recordPdfDownload()`, filtro `pdfDownloadedOnly`, conteo en resumen global |
| `src/features/cotizaciones/services/cotizaciones.service.ts` | `markWorkflowPdfDownloaded()` |
| `src/features/cotizaciones/hooks/useCotizacionesStore.ts` | `recordPdfDownload()` en background |
| `app/print/cotizaciones/[id]/page.tsx` | Toast "PDF descargado" + registro silencioso al descargar/abrir PDF |
| `src/features/dashboard/types/dashboard-summary.ts` | KPIs: `quotedTotal`, `pdfGeneratedCount`, `approvedCount` |
| `src/features/dashboard/services/dashboard-summary-server.service.ts` | Resumen comercial por valor cotizado, no por pendientes |
| `app/(pwa-app)/dashboard/_hooks/use-dashboard-view-model.ts` | Tarjeta "Resumen comercial" + estados neutrales en cards |
| `app/(pwa-app)/dashboard/_components/mobile/dashboard-mobile.tsx` | Hero valor cotizado + grid 4 metricas |
| `app/(pwa-app)/dashboard/_components/desktop/dashboard-desktop.tsx` | Stats: valor cotizado, creadas, PDF, aprobadas |
| `app/(pwa-app)/cotizaciones/page.tsx` | KPIs/atajos sin "pendientes"; badges con display state |
| `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-mobile-view-model.ts` | Estados visibles neutrales en detalle |

### Reglas de producto

- **Descargar PDF**: registra `pdf_descargado_en`, toast maximo, sin modal, sin cambiar `estado` comercial.
- **WhatsApp / link publico**: siguen marcando `enviada` o respuesta publica como antes; no interrumpir al maestro post-PDF.
- **Dashboard**: no usar "pendientes" como alerta principal; KPI principal = valor monetario cotizado (`sum(total)`).
- **Estados UI**: si hay PDF descargado sin cierre -> **PDF generado**; sin cierre comercial -> **Sin cierre registrado**; no mostrar **Pendiente** como estado dominante.
- **Acciones manuales**: aprobar/rechazar/terminar siguen en detalle o menu secundario.

### Mapas actualizados

- `docs/agent-map/FEATURES_MAP.md` (Dashboard, Cotizaciones, PDF)
- `docs/agent-map/ROUTES_MAP.md` (`/dashboard`, `/cotizaciones`, `/print`, API)
- `docs/agent-map/DATA_MODEL_MAP.md` (`cotizaciones.pdf_descargado_en`)
- `supabase/docs/database_map.md`
- `AGENTS.md`

---

## 2026-06-09 - Centro de Operaciones founder en /admin

### Resumen

Se implemento Fase 1 de un backoffice interno separado del panel cliente. `/admin` ahora usa `AdminShell` propio y no reutiliza `AppShell`. Founder entra por allowlist (`VENTORA_FOUNDER_ADMIN_EMAILS`) y el login/proxy lo empuja por defecto a `/admin`. Se agregaron dashboard interno, tabla global de organizaciones SaaS y ficha por organizacion con trial, suscripcion y ledger `pagos_suscripcion`. `/admin/growth` se mantiene, pero ahora navega dentro del shell founder y sigue marcado como panel local basado en `localStorage`.

### Archivos nuevos o fuertemente modificados

| Archivo | Cambio |
|---|---|
| `app/admin/layout.tsx` | Nuevo layout founder con guard server-side y `AdminShell`. |
| `app/admin/page.tsx` | Nuevo dashboard interno con KPIs, trials urgentes, pagos recientes y altas recientes. |
| `app/admin/clientes/page.tsx` | Tabla global de organizaciones SaaS y acceso a ficha. |
| `app/admin/clientes/[organizationId]/page.tsx` | Ficha interna por organizacion con datos de empresa, estado y pagos. |
| `app/admin/admin.module.css` | Superficies, tablas y bloques visuales compartidos del centro de operaciones. |
| `src/features/admin/components/*` | Nuevo set de `AdminShell`, `AdminSidebar`, `AdminKpiCard`, `ClientStatusBadge`, `SourceBadge`. |
| `src/features/admin/repositories/admin-clients.repository.ts` | Query global founder sobre `organizations`, `organization_profile`, `users`, `pagos_suscripcion`. |
| `src/features/admin/services/admin-clients.service.ts` | Orquestacion de listado/ficha, usuario principal, ultimo pago y estado efectivo. |
| `src/features/admin/services/admin-summary.service.ts` | Calculo server-side de KPIs founder y actividad reciente. |
| `src/features/admin/services/admin-access.service.ts` | Allowlist founder nueva via `VENTORA_FOUNDER_ADMIN_EMAILS` con compat legacy. |
| `proxy.ts` | Redirect founder por defecto a `/admin`, guard de acceso a `/admin`, rebote desde `/dashboard`. |
| `app/admin/growth/page.tsx` | Simplificado para heredar guard/shell founder desde layout. |

---

## 2026-06-05 - Flujo de item libre con valor y separacion de modos de cotizacion

### Resumen

Se implemento la separacion clara de tres flujos en Paso 2: componente calculado, item libre con valor y cotizacion rapida por total. Se agrego la categoria "Proyecto libre y Mantencion" al catalogo de componentes. El formulario de item libre se internalizo dentro del wizard/sheet. El selector de modo inicial (`PasoDosModoCotizacion`) quedo con 2 tarjetas. El boton del footer mobile ahora es dinamico ("Agregar item" / "Agregar componente"). Se elimino el selector de modo de precio (margen/valor directo) para items libres en mobile.

### Archivos nuevos o fuertemente modificados

| Archivo | Cambio |
|---|---|
| `component-catalog.service.ts` | Nueva categoria `"Proyecto libre y Mantencion"` con 8 items. Flag `esItemLibre` en `ComponentCatalogItem`. Helper `isFreeValueComponentType()`. Helper `getComponentDescripcion()`. |
| `paso-dos-modo-cotizacion.tsx` | Pantalla inicial con 2 tarjetas: "Cotizar por items" y "Presupuesto por total". Iconos por tarjeta. Ambos abren el wizard. |
| `paso-dos-item-libre-form.tsx` | Formulario standalone redisenado: copia mejorada, preview PDF, boton dinamico con precio, selector IVA compacto `[Incluido] [Agregar IVA]`. |
| `paso-dos-agregar-grupo-sheet.tsx` | Paso 4 reemplazado por formulario de item libre (nombre, descripcion, valor, IVA) cuando `isFreeValueComponentType`. Props `onPrecioChange`, `onIvaModeChange`. |
| `paso-dos-wizard-configuracion-movil.tsx` | Early return para items libres: formulario simplificado sin `PasoDosWizardPrecioMovil`, solo input de precio. Labels estandarizados. |
| `paso-dos-wizard-footer-movil.tsx` | Props `isFreeValueItem` y `precioFormateado`. Boton dinamico: "Agregar item" / "Agregar item por $X". |
| `paso-dos-wizard-precio-movil.tsx` | Prop `hideMargenOption` para ocultar opcion "Con margen". |
| `paso-dos-wizard-movil.state.ts` | `isFreeValueComponentType` integrado en validacion `canSubmitGroup`. `activePricingMode` forzado a `"precio_directo"` para items libres. Labels adaptados. |
| `paso-dos-wizard-movil-shell.tsx` | Stages visuales dinamicos (`VISUAL_STAGES_FREE_VALUE`). Subtitulos adaptados para items libres. `isFreeValueItem` + `precioFormateado` pasados al footer. Categoria "Proyecto libre y Mantencion" en tabs. Ambos modos (`por_item` y `total_global`) abren el mismo wizard. |
| `paso-dos-seccion.tsx` | Modo `total_global` tambien abre `onOpenCreator()`. Condicion `showModeChoice` simplificada. |
| `paso-dos-panel-header.tsx` | Boton "Agregar trabajo" en modo `total_global`. |
| `use-paso-dos-agregar-grupo.ts` | `PasoDosGrupoDraft` incluye `ivaMode`. `isFreeValueComponentType` integrado en `selectSubtipo` (salta a paso 4), `goBack`/`goNext` (omiten paso 3), `canContinueFromConfig` (valida nombre + precio). |
| `use-paso-dos-agregar-grupo-movil.ts` | `isFreeValueComponentType` integrado en `selectSubtipo` (salta a stage 3), `goBack` (stage 3 → stage 1). `updateIvaMode` exportado. |
| `page.tsx` | `confirmAddGroup` maneja items libres via `buildFreeValueItemFromForm`. Wiring de `onIvaModeChange`, `onPrecioChange`. |
| `cotizacion-item-presentation.ts` | Metadata incluye `ivaMode`, `displayMode`, `netoCalculado`, `ivaCalculado`, `totalClienteVisible`. |
| `cotizaciones-workflow.service.ts` | `calculateFreeValueItem` con soporte de `total_incluye_iva` / `neto_mas_iva`. `calculateCotizacionWorkflowTotals` extrae neto de items `total_incluye_iva` antes de aplicar IVA global (sin doble IVA). |
| `page.module.css` | Grid 2 columnas para modo choice. Iconos de tarjeta. IVA compacto. Preview card de item libre. Free value card mobile. |

### Reglas de IVA

- **`total_incluye_iva`**: El valor ingresado es el total visible al cliente. El sistema extrae el neto (`valor / 1.19`) y calcula el IVA (`valor - neto`). En el total global, este neto se suma al subtotal y se aplica IVA una sola vez.
- **`neto_mas_iva`**: El valor ingresado es el neto. El sistema agrega IVA (`valor * 0.19`). El total visible para el cliente es `valor + IVA`.
- **Sin doble IVA**: `calculateCotizacionWorkflowTotals` detecta `tipoItem === "item_libre_con_valor"` + `displayMode === "item_libre"` + `ivaMode === "total_incluye_iva"` y usa `meta.netoCalculado` en vez de `precioTotal`.

### Reglas de persistencia

- `cotizacion_items.tipo_item = "item_libre_con_valor"` se guarda y rehidrata correctamente.
- `costo_unitario`, `costo_total`, `margen_pct`, `utilidad` = 0 para items libres.
- Metadata en `observaciones` via `encodeCotizacionItemPresentationMeta`.
- Clone/duplicar preserva `tipoItem` via spread.
- Soft delete funciona normalmente.

---

## 2026-06-04 - Modo total global en cotizaciones

### Resumen

Se documento el nuevo modo `total_global` para `/cotizaciones/nueva`: los componentes quedan como detalle comercial y el total cliente se calcula desde costo de fabricacion + margen global o total manual. Se agrego `cotizaciones.pricing_mode` con default `por_item`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/FEATURES_MAP.md` | Cotizaciones ahora distingue `por_item` y `total_global` |
| `docs/agent-map/ROUTES_MAP.md` | `/cotizaciones/nueva` documenta selector de modo y riesgos publicos/PDF |
| `docs/agent-map/DATA_MODEL_MAP.md` | `cotizaciones.pricing_mode` y regla interna de costo/margen |
| `supabase/docs/database_map.md` | Columna `pricing_mode` en `cotizaciones` |

---

## 2026-05-31 - Estrategia hibrida de pagos y handoff IA actualizado

### Resumen

Se alineo la documentacion con la estrategia comercial/tecnica vigente de suscripciones: trial de 7 dias, planes anuales como foco principal con Webpay Plus, mensual manual por WhatsApp como opcion secundaria y sin recurrencia automatica en esta etapa. Tambien se actualizo el handoff IA para compartir contexto actual a otra instancia de ChatGPT sin releer todo el repo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/FEATURES_MAP.md` | Feature de suscripciones cambia de manual a hibrida y documenta guard contra doble pago |
| `docs/agent-map/ROUTES_MAP.md` | `/cuenta-vencida` refleja Webpay anual, mensual secundario y UI actual |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nota comercial de activacion hibrida en `organization_profile` |
| `docs/ia-handoff.md` | Handoff actualizado con estado real de producto, Supabase, pagos y siguiente paso |
| `docs/contexto-rapido-web.md` | Resumen corto actualizado para otra IA o nuevo contexto |

---

## 2026-05-31 - Auditoria Supabase pre-produccion

### Resumen

Se reviso el estado versionado de Supabase contra migraciones y documentacion. Se detecto drift en `current_schema.sql` y `database.types.ts`, se documentaron tablas recientes faltantes y se agrego una migracion defensiva para asegurar que `public_landing_testimonials.organization_id` use `bigint`, consistente con `organizations.id`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260515121000_public_landing_personalization_and_testimonials.sql` | Corrige `organization_id` a `bigint` para reproducibilidad |
| `supabase/migrations/20260531050353_harden_public_landing_testimonials_org_id.sql` | Endurece/corrige el tipo y FK de `public_landing_testimonials.organization_id` |
| `supabase/docs/*` | Addendums de drift, RLS y tablas recientes |
| `docs/agent-map/DATA_MODEL_MAP.md` | Documenta `public_landing_testimonials` |
| `docs/agent-map/FEATURES_MAP.md` | Actualiza Pagina Venta y Mini Landing con valoraciones |

---

## 2026-05-31 - Hardening productivo Webpay suscripciones

### Resumen

Se endurecio el flujo Webpay Plus de suscripciones para produccion: retorno GET/POST, manejo de abortos/timeouts, validacion de credenciales, HTTPS, `buy_order` compatible con Transbank, validacion de monto/orden antes de activar y RLS mas restrictivo para `pagos_suscripcion`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/api/subscriptions/webpay/crear/route.ts` | Validacion tipada de plan/periodo y errores genericos al cliente |
| `app/api/subscriptions/webpay/confirmar/route.ts` | Retorno GET/POST, abortos/timeouts y redirects seguros |
| `src/features/subscriptions/services/webpay-suscripcion.service.ts` | Hardening de Webpay, idempotencia y activacion segura |
| `src/features/subscriptions/repositories/pago-suscripcion.repository.ts` | Busqueda por `buy_order` y filtros de soft delete |
| `supabase/migrations/20260531044351_harden_webpay_subscription_payments.sql` | Revoca inserts cliente y deja pagos solo server-side |
| `docs/agent-map/DATA_MODEL_MAP.md` | Riesgo RLS de pagos actualizado |
| `docs/agent-map/FEATURES_MAP.md` | Rutas Webpay y env vars actualizadas |

---

## 2026-05-30 - Webpay Plus integration and pagos_suscripcion table

### Resumen

Se integro Webpay Plus (Transbank) como metodo de pago automatico para suscripciones anuales. Se creo la tabla `pagos_suscripcion` para tracking de transacciones, el hook `useWebpayPago` para el flujo cliente, y se actualizo la pagina `/cuenta-vencida` para mostrar botones de pago Webpay junto a los planes existentes.

### Archivos creados

| Archivo | Proposito |
|---|---|
| `src/features/subscriptions/hooks/useWebpayPago.ts` | Hook cliente para iniciar pago Webpay |
| `supabase/migrations/20260530100000_pagos_suscripcion.sql` | Migracion de tabla `pagos_suscripcion` con RLS |

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(pwa-app)/cuenta-vencida/page.tsx` | Ahora usa `page-content.tsx` con botones de Webpay |
| `app/(pwa-app)/cuenta-vencida/page-content.tsx` | Componente con 3 planes (2 Webpay + 1 WhatsApp) |
| `supabase/docs/database_map.md` | Nueva tabla documentada |
| `supabase/docs/rls_policies.md` | Nuevas policies de `pagos_suscripcion` |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nueva tabla activa documentada |
| `docs/agent-map/FEATURES_MAP.md` | Feature de suscripcion actualizada con Webpay |

---

## 2026-05-27 - Esquema comercial de hojas en cotizaciones

### Resumen

Se agrego descriptor comercial de hojas para `Ventana + Corredera` en Paso 2 / Agregar de `/cotizaciones/nueva`. El esquema modifica nombre visible y metadata de presentacion del item, pero no cambia calculo de precio por linea, m2, minimo, redondeo ni override manual.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/new-quote/workflow-ui.ts` | Helpers de esquema y nombre comercial |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/` | Chips mobile-first para esquema de hojas |
| `src/utils/cotizacion-item-presentation.ts` | Metadata comercial extendida en `observaciones` |
| `docs/agent-map/FEATURES_MAP.md` | Consideracion UX actualizada |

---

## 2026-05-25 - Estabilizacion piloto: rate limit externo, push resiliente y baseline limpio

### Resumen

Se cerro la pasada de estabilizacion previa al piloto. La captacion publica queda preparada para Upstash Redis con fallback local explicito si faltan variables de entorno, el envio de push por organizacion deja de abortar el lote completo ante una sola suscripcion defectuosa, y las API routes criticas ahora registran errores reales en servidor sin exponer detalle al cliente.

Tambien se agregaron dos migraciones chicas de base de datos: una elimina la unicidad global de `clients.correo` para dejarla scoped por `organization_id`, y otra habilita RLS minima para `cotizacion_code_counters` en `authenticated`. El baseline del workspace quedo con `npm run lint`, `npm test` y `npm run build` pasando.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/solicitudes/services/solicitudes-public-http.service.ts` | Nuevo adaptador Upstash Redis + fallback local explicito |
| `src/features/notificaciones/services/web-push-notifications.service.ts` | Envio paralelo resiliente con `sent/failed/deactivated/skipped` |
| `app/api/solicitud/[empresa]/route.ts` | Rate limit async + logging estructurado |
| `app/api/solicitud/[empresa]/valoraciones/route.ts` | Rate limit async + logging estructurado |
| `app/api/solicitudes/route.ts` | Rate limit async + logging en GET/PATCH/POST |
| `app/api/dashboard/summary/route.ts` | Telemetria de errores en auth/data |
| `app/api/cotizaciones/resumen/route.ts` | Telemetria de errores en auth/data |
| `app/api/clientes/resumen/route.ts` | Telemetria de errores en auth/data |
| `app/api/solicitudes/resumen/route.ts` | Telemetria de errores en auth/data |
| `supabase/migrations/20260525153000_clients_email_unique_by_organization.sql` | Quita unicidad global de correo en clientes |
| `supabase/migrations/20260525154000_cotizacion_code_counters_authenticated_rls.sql` | Policies RLS minimas para `cotizacion_code_counters` |
| `supabase/docs/current_schema.sql` | Snapshot documental corregido para `get_org_id()` y unicidad de `clients.correo` |
| `supabase/docs/rls_policies.md` | `get_org_id()` documentado por `auth.uid()` |

---

## 2026-05-25 - Trial gratis de 7 dias y activacion manual

### Resumen

Se agrego el control simple de prueba gratuita y suscripcion manual por organizacion. Cada nueva organizacion ahora arranca con 7 dias de trial en `organization_profile`, el estado efectivo se calcula desde un helper central de suscripciones, y las rutas privadas pasan a operar en modo lectura cuando la cuenta vence. El usuario puede seguir iniciando sesion, pero crear/editar/eliminar en cotizaciones, clientes, solicitudes internas y configuracion queda bloqueado y se redirige a `/cuenta-vencida`, donde Ventora muestra CTA de WhatsApp con activacion manual mensual o anual.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260525121500_trial_subscriptions_manual_activation.sql` | Nuevas columnas de trial/suscripcion en `organization_profile` + trigger de defaults al crear organizacion |
| `src/features/subscriptions/` | Nueva feature de estado efectivo, guards de rutas y CTA de activacion |
| `src/features/organization-profile/` | El perfil ahora expone snapshot calculado de suscripcion |
| `src/components/layout/app-shell.tsx` | Banners de trial, redirect a cuenta vencida y links privados guardados |
| `app/(pwa-app)/cuenta-vencida/` | Nueva pantalla de activacion manual |
| `app/api/solicitudes/route.ts` | Bloquea escrituras privadas cuando la cuenta esta vencida |
| `app/api/organization-assets/upload/route.ts` | Bloquea uploads privados cuando la cuenta esta vencida |
| `app/api/public-landing/revalidate/route.ts` | Bloquea revalidacion privada cuando la cuenta esta vencida |
| `proxy.ts` | Protege tambien `/cuenta-vencida` |
| `docs/agent-map/DATA_MODEL_MAP.md` | Se documentan campos de trial y activacion manual |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature `Trial y Suscripcion Manual` |
| `docs/agent-map/ROUTES_MAP.md` | Nueva ruta `/cuenta-vencida` y riesgos de bloqueo en rutas privadas |

---

## 2026-05-22 - Diagnostico fino de login movil y PWA

### Resumen

Se endurecio el login email/password para aislar mejor los fallos que antes podian verse todos como "correo o contrasena incorrecta". Ahora el cliente distingue errores de credencial real, timeout, cookie de sesion no lista, perfil sin empresa, permiso roto de `get_org_id()` y problemas de red/PWA. Tambien se agrega una bitacora local en `localStorage` con intentos, exitos y fallos de login para soporte/debug, junto con eventos `login_success` y `login_failure` enviados a la capa GTM/GA4 ya existente.

Ademas, el prompt de instalacion PWA ahora tiene fallback manual para Android cuando navegadores como Opera no disparan `beforeinstallprompt`. Si el navegador no muestra el CTA nativo, Ventora enseña pasos cortos para instalar desde el `menu O` o desde `Agregar a pantalla principal`, evitando que el usuario quede sin pista de instalacion solo por usar Opera. Ese fallback ahora viene con una guia visual tipo mockup del navegador y un highlight orientativo sobre la zona del menu para usuarios poco familiarizados con tecnologia. La pantalla `/login` suma tambien dos ayudas de soporte directo: ver/ocultar contrasena y un boton `Reiniciar esta app` que limpia service workers, caches y storage local del sitio en ese dispositivo antes de recargar.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(auth-public)/login/login-view.tsx` | Clasifica errores, espera cookie, registra diagnosticos locales y envia eventos de login |
| `src/features/auth/services/auth-login-error.service.ts` | Nueva clasificacion central de errores de login |
| `src/features/auth/services/auth-login-diagnostics.service.ts` | Nuevo ring buffer local de diagnosticos de login |
| `src/features/auth/services/auth-device-recovery.service.ts` | Reset local de PWA/storage/auth para el dispositivo actual |
| `src/features/auth/services/auth.service.ts` | Reusa el mensaje comun de permiso roto de `get_org_id()` |
| `src/features/auth/types/auth.ts` | Nuevos tipos para errores y diagnosticos de login |
| `app/(auth-public)/login/page.tsx` | Lee `app_reset=1` para confirmar que se reinicio el dispositivo |
| `app/(auth-public)/login/login-view.tsx` | Toggle de contrasena + CTA `Reiniciar esta app` |
| `src/components/pwa/install-app-prompt.tsx` | Fallback manual de instalacion para Opera/Android |
| `docs/agent-map/FEATURES_MAP.md` | Se documenta el diagnostico fino de auth |
| `docs/agent-map/ROUTES_MAP.md` | Se documentan los riesgos y diagnosticos de `/login` |

---

## 2026-05-22 - Onboarding comercial guiado dentro de rutas privadas

### Resumen

Se agrego el MVP de onboarding comercial guiado para administradores dentro de Ventora. El nuevo checklist persiste por organizacion en `onboarding_checklists`, deriva pasos reales desde `organization_profile`, `solicitudes_contacto` y `cotizaciones`, y solo marca los pasos manuales (`channel_ready`, `first_share`) cuando el usuario ejecuta acciones reales de copiar, compartir, descargar QR, abrir PDF o abrir WhatsApp. El onboarding aparece en `dashboard`, configuracion, canales y cotizaciones privadas, sin tocar `/solicitud/[empresa]` ni `/presupuesto/[token]`.

### Ajuste posterior del mismo dia

Se retiro `react-joyride` y se reemplazo por una guia propia mobile-first. En movil ahora usa una tarjeta compacta tipo bottom sheet con CTA corto, progreso y acciones `Cerrar` / `Despues`, sin flechas ni overlay invasivo. En desktop usa una version inline liviana. Ademas se coordina con el banner PWA para no mostrar ambos a la vez, se agrego soporte en `/solicitudes`, y el onboarding sigue apareciendo solo mientras `first_quote` siga incompleto o cuando se fuerce `?onboarding_preview=1`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260522113000_onboarding_checklists.sql` | Nueva tabla y policies RLS para onboarding comercial |
| `src/features/onboarding/` | Nueva feature completa `types -> repository -> service -> hook -> components` |
| `app/(pwa-app)/dashboard/_components/*` | Checklist principal en dashboard desktop/mobile |
| `app/(pwa-app)/configuracion/empresa/page.tsx` | Banner compacto y marca manual al copiar link |
| `app/(pwa-app)/configuracion/pagina-venta/page.tsx` | Banner compacto y marca manual al copiar link |
| `app/(pwa-app)/solicitudes/canales/page.tsx` | Banner compacto + cableado al checklist |
| `src/features/solicitudes/components/lead-channels.tsx` | Marca `channel_ready` en copy/share/QR/WhatsApp |
| `app/(pwa-app)/cotizaciones/page.tsx` | Banner compacto + marca `first_share` desde listado |
| `app/(pwa-app)/cotizaciones/[id]/page.tsx` | Recordatorio contextual + marcas por PDF/link/WhatsApp |
| `app/(pwa-app)/cotizaciones/nueva/page.tsx` | Banner compacto del onboarding |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature documentada |
| `docs/agent-map/ROUTES_MAP.md` | Rutas privadas actualizadas con onboarding |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nueva tabla documentada |

---

## 2026-05-21 - Logout sin loop visual en AppShell

### Resumen

Se corrigio el loop de cierre de sesion desde rutas privadas endureciendo la salida del panel. `AppShell` ahora dispara un `window.location.replace("/auth/logout")` para salir del App Router y evitar la carrera con `proxy.ts`, mientras `/auth/logout` expira cookies Supabase SSR y recien despues redirige a `/login`. Con esto el navegador ya no rebota de vuelta a `/dashboard` cuando el estado local se cerro pero las cookies compartidas todavia no terminaban de sincronizarse.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/components/layout/app-shell.tsx` | La salida usa navegacion dura hacia `/auth/logout` y evita el rebote del App Router |
| `app/(auth-public)/auth/logout/route.ts` | Nueva ruta interna que expira cookies de sesion y redirige a `/login` |
| `src/components/layout/__tests__/app-shell.test.tsx` | Cobertura para logout pendiente que igual debe salir por la ruta server-side |
| `app/(auth-public)/auth/logout/__tests__/route.test.ts` | Cobertura para expiracion de cookies y redirect final al login |
| `src/components/pwa/__tests__/service-worker-navigation.test.ts` | Regresion para asegurar que el service worker no trate rutas privadas como app shell navegable |
| `playwright.config.ts` | Config base de Playwright para smoke E2E movil |
| `tests/e2e/auth-logout.mobile.spec.ts` | E2E real movil para logout, bloqueo de ruta privada y refresh post-logout |
| `src/features/auth/hooks/useAuth.ts` | Revalida sesion al volver a foco/pageshow/visible para evitar estado viejo al reingresar |
| `src/hooks/__tests__/useAuth.test.tsx` | Cobertura para rehidratacion de sesion al volver a foco |
| `package.json` | Scripts `test:e2e:auth-mobile` y `test:e2e:list` |
| `docs/agent-map/ROUTES_MAP.md` | Se documenta la nueva ruta interna `/auth/logout` |
| `docs/agent-map/FEATURES_MAP.md` | Se actualiza la feature de autenticacion con el logout server-side |

---

## 2026-05-21 - Panel privado de growth para fundador

### Resumen

Se agrego la nueva ruta privada `/admin/growth` como panel operativo de growth para fundador/admin autorizado. Esta primera version funciona como pagina standalone fuera de `AppShell`, persiste estado local en `localStorage`, pone `Trabajo de hoy` y `Prospectos prioritarios` como foco principal, y deja `Datos manuales` + `Experimentos` como capas secundarias. Ademas, la ruta sigue aislada para usuarios normales y `proxy.ts` ahora soporta tambien el modo `growth-only` por correo para cuentas que deban quedar atrapadas solo en `/admin/growth`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/admin/growth/` | Nueva ruta privada standalone del panel de growth |
| `src/features/growth/` | Nuevo modulo mockeado con cadena `hook -> service -> repository` |
| `proxy.ts` | Protege `/admin/:path*` |
| `docs/agent-map/ROUTES_MAP.md` | Nueva ruta documentada |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature documentada |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Se actualiza esta entrada con el rediseno operativo y el modo `growth-only` |

---

## 2026-05-21 - Google Analytics, Google Ads y GTM base

### Resumen

Se agrego una capa base de medicion con Google Tag Manager como contenedor global para GA4 + Google Ads usando variables de entorno publicas. La app ahora carga GTM una sola vez en `app/layout.tsx`, expone `dataLayer` para navegacion App Router y dispara eventos comerciales en los puntos mas sensibles del flujo: clics a WhatsApp desde landing, inicio e intento de envio de formularios publicos, envio exitoso de solicitud publica, clics de demo en `/planes`, envio de cotizacion por WhatsApp, vista/descarga de PDF publico, valoraciones publicas y decision publica de cotizacion. En este proyecto ademas se dejaron configurados como fallback local el contenedor `GTM-N4X44QW6` y el `Measurement ID` `G-Y0LCR4NRDN`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/layout.tsx` | Carga condicional del contenedor GTM, `noscript` y provider de pageviews |
| `src/features/analytics/` | Nueva feature de analitica (`service`, `component`, `types`) |
| `app/(landing-web)/page.tsx` | Eventos de CTA y WhatsApp en landing |
| `app/(landing-web)/planes/page.tsx` | Eventos de clic de demo |
| `app/(landing-web)/solicitud/[empresa]/page.tsx` | CTA publica de WhatsApp con tracking |
| `app/(landing-web)/solicitud/[empresa]/solicitud-empresa-form.tsx` | Evento de lead enviado |
| `app/(landing-web)/solicitud/[empresa]/solicitud-empresa-testimonial-form.tsx` | Eventos de valoracion publica |
| `app/(pwa-app)/cotizaciones/page.tsx` | Evento de envio de cotizacion por WhatsApp |
| `app/presupuesto/[token]/public-quote-mobile.tsx` | Evento de decision/aprobacion publica |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature documentada |

---

## 2026-05-18 - Configuracion empresa con nombre publico unificado

### Resumen

En `/configuracion/empresa` se simplifico la UX de identidad comercial: el campo visible `Nombre que veran tus clientes` se retiro por redundante y `publicName` ahora queda sincronizado con `empresaNombre` desde esta pantalla. Tambien se reemplazo el lenguaje de `landing` por `pagina publica` o `pagina publica de venta`, y el slug del enlace se autocompleta desde el nombre de la empresa mientras no haya una personalizacion manual.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(pwa-app)/configuracion/empresa/page.tsx` | Sincroniza `publicName` con `empresaNombre`, autocompleta slug y ajusta copy visible de `landing` a `pagina publica` |

## 2026-05-18 - Paso 1 flexible y linea comercial rapida en cotizaciones moviles

### Resumen

Se elimino la friccion falsa de `Obra o trabajo` en el paso 1 de `/cotizaciones/nueva`: la UI ya no la trata como obligatoria y explica que, si queda vacia, se completa sola al avanzar o guardar. Ademas, el selector movil de lineas comerciales ahora incluye un modo rapido dentro del mismo bottom sheet para crear una linea, heredar el material actual, guardarla en `cotizacion_line_templates`, aplicarla al draft activo y seguir cotizando sin salir del flujo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-uno-datos-cliente.tsx` | `obra` deja de bloquear el avance visual y muestra ayuda de autocompletado |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-configuracion-movil.tsx` | Nuevo modo rapido de alta de linea comercial dentro del selector movil |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-movil-shell.tsx` | El wizard movil ahora recibe acciones para crear y aplicar lineas rapidas |
| `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo-movil.ts` | Soporte para aplicar al draft una linea recien creada sin depender del lookup por id |
| `app/(pwa-app)/cotizaciones/nueva/page.tsx` | Orquesta `createLineTemplate` para el flujo movil rapido |
| `app/(pwa-app)/cotizaciones/nueva/page.module.css` | Estilos mobile-first para el formulario rapido en bottom sheet |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/__tests__/` | Cobertura para crear y aplicar linea rapida en movil |
| `app/(pwa-app)/cotizaciones/nueva/_hooks/__tests__/use-paso-dos-agregar-grupo-movil.test.tsx` | Cobertura para aplicar una plantilla creada al draft movil |

## 2026-05-18 - Cierre de carrera de sesion al cambiar de cuenta

### Resumen

Se corrigio la carrera de sesion que aparecia al salir e ingresar rapido con otra cuenta en la misma pestana. El logout ahora espera el cierre real de Supabase en scope local antes de redirigir, el login usa el token fresco devuelto por `signInWithPassword` para resolver `/api/auth/profile`, y los eventos de auth ya propagan `SIGNED_IN`, `SIGNED_OUT` y `TOKEN_REFRESHED` con su sesion asociada para rehidratar sin depender de un token viejo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/auth/types/auth.ts` | Nuevos contratos para token fresco, eventos de auth y `signOut` con scope |
| `src/features/auth/repositories/auth.repository.ts` | Login devuelve sesion fresca, lookup server-side prioriza bearer nuevo y logout usa scope local |
| `src/features/auth/services/auth.service.ts` | Bootstrap/auth coordina server lookup preferente para login nuevo y cierre local de sesion |
| `src/features/auth/hooks/useAuth.ts` | Hook espera el signOut real, restaura estado si falla y reacciona a eventos de sesion |
| `src/components/layout/app-shell.tsx` | La redireccion a `/login` ocurre solo despues del cierre real de sesion |
| `src/hooks/__tests__/useAuth.test.tsx` | Cobertura para promesa de logout pendiente mientras el cierre real sigue en curso |
| `src/services/__tests__/auth.service.test.ts` | Cobertura para token fresco en login y logout local |
| `src/features/auth/repositories/__tests__/auth.repository.test.ts` | Cobertura para retry server-side con `401`, sesion fresca y `signOut` local |

## 2026-05-18 - Script seguro para cuentas piloto

### Resumen

Se agrego un script operativo para crear y auditar usuarios piloto sin dejar cuentas rotas entre `auth.users` y `public.users`. Esto evita repetir el bug de login infinito causado por usuarios creados solo en Auth.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `scripts/pilot-users.mjs` | Alta y auditoria de usuarios piloto con `organization_id`, `rol` y `auth_user_id` |
| `package.json` | Scripts `pilot:user:audit` y `pilot:user:create` |

## 2026-05-18 - Hardening de login para sesiones sin empresa

### Resumen

Se cerro un loop critico de autenticacion: si existe sesion en `auth.users` pero no hay perfil valido en `public.users` con `organization_id`, la app ya no queda en "Cargando tu espacio de trabajo". Ahora se cierra esa sesion invalida y el login muestra un error entendible para usuarios creados solo en Auth.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/auth/services/auth.service.ts` | Sesiones sin empresa se invalidan en bootstrap y en login |
| `app/(auth-public)/login/login-view.tsx` | Mensaje mas claro para usuarios no vinculados a empresa |
| `src/services/__tests__/auth.service.test.ts` | Cobertura para usuario sin empresa |

## 2026-05-17 - Vidrio recomendado por linea comercial

### Resumen

Se agrego soporte para sugerir un vidrio habitual por linea comercial sin bloquear otros vidrios ni abrir reglas tecnicas duras. La linea ahora puede guardar `vidrio_principal_recomendado` y, al cotizar, ese vidrio aparece primero como recomendado mientras el usuario mantiene libertad total para cambiarlo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260517164000_cotizacion_line_templates_recommended_glass.sql` | Nueva columna opcional `vidrio_principal_recomendado` en `cotizacion_line_templates` |
| `src/features/cotizaciones/line-templates/` | Tipos, servicio y repository alineados con vidrio recomendado por linea |
| `src/features/cotizaciones/new-quote/workflow-ui.ts` | Aplicar linea ahora puede precargar vidrio sugerido |
| `app/(pwa-app)/cotizaciones/nueva/` | Selector de vidrio prioriza el recomendado de la linea antes de las sugerencias generales |
| `src/features/cotizaciones/line-templates/components/lineas-precios-page-client.tsx` | Configuracion de linea ahora permite elegir vidrio usado normalmente |

## 2026-05-17 - Hardening multi-tenant en Supabase y PDFs privados

### Resumen

Se cerro una pasada de seguridad multi-tenant sobre Supabase. `get_org_id()` y objetos dependientes ahora resuelven organizacion por `auth_user_id/auth.uid()` en vez de correo, `quote_item_breakdown` ya tiene policies RLS reales para cliente autenticado, se restringieron grants/ejecucion innecesarios en funciones y tablas sensibles, y los PDFs cacheados de cotizaciones salieron del bucket publico `organization-assets` hacia el bucket privado `quote-pdfs` con acceso por URL firmada.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260517123000_multi_tenant_hardening_auth_uid_and_private_pdfs.sql` | Migracion de hardening multi-tenant, funciones, grants, policies y bucket privado de PDFs |
| `src/features/cotizaciones/pdf-cache/repositories/cotizacion-pdf-cache.repository.ts` | Cache PDF ahora usa bucket privado `quote-pdfs` y URLs firmadas |
| `src/features/cotizaciones/pdf-cache/services/cotizacion-pdf-cache.service.ts` | Servicio PDF alineado con acceso firmado asincrono |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-16 - Estabilizacion de rutas criticas para piloto

### Resumen

Se cerro una pasada de hardening sobre captacion publica, aprobacion publica y cotizaciones activas. La landing publica ahora respeta `is_published` como restriccion real, se elimino el write-on-read del slug publico, la aprobacion publica tolera revalidacion fuera del runtime completo de Next, y se blindaron crashes reales del Paso 2 movil/comercial en `/cotizaciones/nueva`. Tambien se alinearon contratos de resumen paginado y tests de rutas criticas.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(landing-web)/solicitud/[empresa]/page.tsx` | Ruta publica ahora corta si la pagina no esta publicada |
| `app/presupuesto/[token]/actions.ts` | Revalidacion publica tolerante a mocks/runtime parcial |
| `app/(pwa-app)/cotizaciones/nueva/` | Guards para templates, referencias y arrays opcionales en flujo movil/comercial |
| `app/(pwa-app)/cotizaciones/[id]/page.tsx` | Estados de error mas explicitos para detalle, PDF y WhatsApp |
| `app/print/cotizaciones/[id]/page.tsx` | Menor fragilidad del visor al retener ultimo registro renderizable sin leer refs en render |
| `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts` | Se elimino sincronizacion implicita de slug durante lectura publica |
| `src/features/solicitudes/services/solicitudes-contacto.service.ts` | Solo expone configuracion publica cuando `is_published` es verdadero |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-16 - Documento maestro para IAs, BI y marketing

### Resumen

Se agrego un documento maestro de contexto de negocio y producto para compartir con otras IAs, orientar inteligencia de negocios y alinear marketing. Resume posicionamiento, fase actual, fortalezas reales, funcionalidades activas, restricciones de producto, oportunidades de BI y mensajes comerciales.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/ventora-master-brief.md` | Nuevo resumen maestro de producto, negocio, fase y funcionalidades |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-13 - Cotizacion asistida por linea y precios rapidos

### Resumen

Se actualizo el mapa tecnico para reflejar la nueva V1 de cotizacion asistida: lineas comerciales por empresa con precio por m², minimo cobrable, redondeo y uso directo en Paso 2 de `/cotizaciones/nueva`, mas calculo automatico por medidas y guardado rapido desde la cotizacion.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `Agents.md` | Estado operativo actualizado con la nueva pasada de cotizaciones |
| `docs/agent-map/FEATURES_MAP.md` | Feature Cotizaciones ahora incluye `cotizacion_line_templates`, pricing automatico por medidas y bloque compacto en Configuracion Empresa |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nueva tabla `cotizacion_line_templates` y nota de snapshot comercial en `cotizacion_items.linea` |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-10 - Video explicativo en Remotion

### Resumen

Se agrego un modulo nuevo de marketing video con Remotion para generar el video explicativo de Ventora en formato 16:9 y 9:16, usando assets estaticos en `public/video-assets/` y componentes reutilizables en `src/features/video/`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/FEATURES_MAP.md` | Se agrego la feature `Marketing Video / Remotion` |
| `docs/agent-map/COMPONENTS_MAP.md` | Se documentaron `VentoraExplainer`, `SceneWrapper`, `PhoneMockup`, `FloatingMessage`, `StepCard`, `CTAButton`, `GlassGridBackground` y `VentoraLogo` |
| `package.json` | Scripts `video:preview`, `video:render` y `video:render:vertical` |
| `src/features/video/` | Nuevo modulo Remotion del video explicativo |
| `public/video-assets/` | Capturas y logo del video |

## 2026-05-09 - Hardening de auth comun y push activo

### Resumen

Se actualizo el mapa tecnico para reflejar una pasada adicional de hardening sobre superficies activas: el helper comun de rutas privadas ahora resuelve primero el perfil por `auth_user_id` y usa correo solo como compatibilidad, `push-subscriptions` ya restringe la baja al usuario autenticado duenio de la suscripcion, y `proxy.ts` ahora cubre tambien `solicitudes` y `configuracion`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `Agents.md` | Estado operativo actualizado, nuevos tests y warning de tablas sin RLS corregido |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nota de `web_push_subscriptions` actualizada con alcance `auth_user_id` en el API |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-08 - Hardening RLS de web push

### Resumen

Se actualizo la documentacion del mapa tecnico para reflejar que `web_push_subscriptions` ya no esta en el grupo de tablas sin policies RLS. El acceso autenticado queda acotado por `organization_id` y `auth_user_id`, mientras el envio de notificaciones sigue usando `service_role` del lado servidor.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/DATA_MODEL_MAP.md` | `web_push_subscriptions` ya no figura sin policies |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-08 - Creacion inicial

### Resumen

Creacion completa del mapa tecnico del proyecto en `docs/agent-map/`. Documentacion generada por inspeccion exhaustiva del codigo fuente, migraciones Supabase y documentacion existente.

### Archivos creados

| Archivo | Contenido |
|---|---|
| `docs/agent-map/README.md` | Indice maestro, regla principal, orden de lectura |
| `docs/agent-map/PROJECT_OVERVIEW.md` | Stack, arquitectura, convenciones, estructura carpetas |
| `docs/agent-map/ROUTES_MAP.md` | 17 rutas mapeadas con archivos, propositos y riesgos |
| `docs/agent-map/FEATURES_MAP.md` | 14 features documentadas con archivos criticos |
| `docs/agent-map/DATA_MODEL_MAP.md` | 12 tablas activas + 11 legacy, funciones DB, RLS, indexes, issues |
| `docs/agent-map/COMPONENTS_MAP.md` | 20+ componentes documentados por categoria |
| `docs/agent-map/AGENT_TASK_GUIDE.md` | Guia practica por tipo de tarea, checklists, comandos |
| `docs/agent-map/TOKEN_SAVING_RULES.md` | 10 reglas para ahorrar tokens |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Este archivo |

### Modulos detectados y documentados

- Auth (login, session, perfil)
- Dashboard (KPIs, cotizaciones recientes)
- Cotizaciones (CRUD, workflow, pricing, catalogo, sugerencias)
- PDF de Cotizacion (html2canvas + jsPDF, cache Storage)
- WhatsApp / Share Link
- Aprobacion/Rechazo Publica (token, server actions, push)
- Clientes (CRUD, estados, ficha)
- Solicitudes / Leads (captura, UTM, estados, badge origen)
- Links por Canal (UTM tagged URLs)
- QR (generacion, descarga PNG)
- Empresa / Configuracion (perfil, branding, logo, slug)
- Pagina Publica / Mini Landing (hero, galeria, horario)
- Marca / Logo / Color (branding en PDF y landing)
- Notificaciones (Web Push + Email)
- Multi-tenant / organization_id
- Proyectos (CRUD sin ruta directa)

### Rutas mapeadas

| Ruta | Tipo |
|---|---|
| `/` | Publica - Landing |
| `/planes` | Publica - Planes |
| `/solicitud/[empresa]` | Publica dinamica - Captacion leads |
| `/login` | Publica - Autenticacion |
| `/presupuesto/[token]` | Publica dinamica - Aprobacion/rechazo |
| `/dashboard` | Privada - KPIs |
| `/cotizaciones` | Privada - Listado |
| `/cotizaciones/nueva` | Privada - Nueva cotizacion |
| `/cotizaciones/[id]` | Privada dinamica - Detalle |
| `/clientes` | Privada - Listado |
| `/clientes/nuevo` | Privada - Nuevo |
| `/clientes/[id]` | Privada dinamica - Detalle |
| `/clientes/[id]/editar` | Privada dinamica - Editar |
| `/solicitudes` | Privada - Listado leads |
| `/solicitudes/canales` | Privada - Canales QR |
| `/configuracion/empresa` | Privada - Perfil empresa |
| `/configuracion/pagina-venta` | Privada - Landing config |
| 6 API routes | Interna |

### Zonas poco claras o pendientes de verificar

| Zona | Estado | Nota |
|---|---|---|
| `app/(auth-public)/auth/` | No inspeccionado en detalle | Callback OAuth, probablemente simple |
| `app/(landing-web)/privacy/` | Solo listado | Contenido legal estatico |
| `app/(landing-web)/terms/` | Solo listado | Contenido legal estatico |
| `app/(landing-web)/offline/` | No inspeccionado | Pagina offline PWA |
| `app/print/cotizaciones/[id]/` | No inspeccionado en detalle | Vista de impresion |
| `app/(pwa-app)/clientes/nuevo/page.tsx` | No inspeccionado en detalle | Formulario nuevo cliente |
| `public/sw.js` | No inspeccionado | Service Worker |
| `supabase/docs/database.types.ts` | No leido completo | Tipos generados (1352 lineas) |
| `src/features/cotizaciones/services/glass-recommendations.service.ts` | Listado pero no analizado en profundidad | Recomendaciones de vidrio |
| Flujo completo de email | Depende de env vars | No verificable sin configuracion |
| Flujo completo de push | Depende de navegador/OS | No verificable sin dispositivo real |
| Landing gallery upload | Depende de bucket Storage | No verificable sin bucket configurado |
| Cotizaciones `[id]/editar` | No existe como ruta separada | Edicion se hace desde nueva con prefill? |
| Encoding roto | Mencionado en AGENTS.md | Puede reaparecer en vistas o tests |

### Recomendaciones para mantener actualizado

1. **Al agregar una ruta**: Actualizar `ROUTES_MAP.md` con formato establecido + `FEATURES_MAP.md` si es feature nueva
2. **Al mover un archivo**: Buscar en todos los mapas donde aparezca y actualizar paths
3. **Al cambiar una tabla**: Actualizar `DATA_MODEL_MAP.md` + verificar RLS
4. **Al crear componente reutilizable**: Agregar a `COMPONENTS_MAP.md`
5. **Al cambiar logica de feature**: Actualizar `FEATURES_MAP.md` si cambian archivos principales
6. **Mensualmente**: Revisar que los mapas coincidan con el codigo real (auditoria rapida)

### 2026-05-18 - Auth de produccion y mensaje de login

- Se confirmo con reproduccion real sobre `https://ventorap.cl/login` y `https://www.ventorap.cl/login` que `admin@test.com / 1234` autentica y abre `/dashboard` en produccion.
- Se confirmo que el fallo previo no era la contrasena sino una brecha temporal de permisos DB sobre `public.get_org_id()`.
- Se endurecio el mensaje de login para no mostrar `Correo o contrasena incorrectos` cuando el problema real sea `permission denied for function get_org_id`.
- Se corrigio un bug de autofill/Face ID en `/login`: el submit ahora toma los valores reales del formulario y no solo el estado React, evitando rechazos falsos cuando iOS/Android rellenan email/password sin disparar `onChange`.
- Se agrego fallback interno `/api/auth/profile` para bootstrap de auth:
  - si la lectura cliente de `public.users` falla o sale vacia durante login/autofill
  - el cliente consulta una ruta server-side con token bearer
  - la ruta valida el usuario por `auth.getUser(token)` con `service_role`
  - y resuelve `organization_id` + `rol` desde `public.users` sin depender del RLS cliente en ese momento
- Esto reduce falsos errores en iPhone/PWA/Face ID cuando el token se persiste bien pero la lectura inicial del perfil se comporta inestable.
- Archivos tocados:
  - `src/features/auth/services/auth.service.ts`
  - `app/(auth-public)/login/login-view.tsx`
  - `src/services/__tests__/auth.service.test.ts`

### 2026-05-18 - Estabilizacion final de hosts, PWA y provision de cuentas piloto

- Se elimino la dependencia de doble bootstrap al iniciar sesion:
  - `authService.signIn()` ahora devuelve el estado autenticado ya resuelto
  - `useAuth.signIn()` deja de relanzar una segunda rehidratacion completa
- Se endurecio `logout` para no quedar pegado en `Cerrando sesion...`:
  - la UI limpia estado y storage primero
  - la invalidacion real de Supabase se dispara en background
- El bootstrap del perfil autenticado ahora prioriza `/api/auth/profile` server-side antes de consultar `public.users` directo desde cliente.
- Se fijo la politica real de hosts:
  - web valida en `ventorap.cl` y `www.ventorap.cl`
  - PWA e install prompt solo se activan en host canonico `www.ventorap.cl`
  - las rutas privadas y `auth/callback` siguen canonicalizandose a `www`
  - `/api/auth/profile` deja de canonicalizarse por `proxy.ts` para no perder el bearer token en redirects cross-host
- Se agrego configuracion de cookies compartidas de Supabase para `ventorap.cl` y `www.ventorap.cl`:
  - dominio `.ventorap.cl`
  - `sameSite=lax`
  - `secure=true`
  - esto permite que el login iniciado en un host sobreviva al paso controlado al host canonico sin partir la sesion
- Se endurecio el script oficial `scripts/pilot-users.mjs`:
  - nuevos comandos `repair` y `reset-password`
  - `audit` ahora detecta tambien filas activas en `public.users` sin `auth.users`
  - `create` y `repair` verifican login real contra Supabase Auth
  - `create` y `repair` verifican resolucion real de perfil via `/api/auth/profile`
  - el verificador ya soporta redirects `ventorap.cl -> www.ventorap.cl` preservando el bearer en el segundo request
- Se agrego cobertura para:
  - host canonico PWA
  - cookies compartidas de Supabase
  - proxy con rutas privadas canonicalizadas y login permitido en apex
- Verificacion real cerrada en esta pasada:
  - `admin@test.com / 1234` validado via `repair` contra `https://www.ventorap.cl`
  - `admin@test.com / 1234` validado via `repair` contra `https://ventorap.cl` con fallback correcto a `www`
  - `vidriorivera@empresa.cl / clave123` validado via `repair` contra `https://www.ventorap.cl`
- Archivos tocados:
  - `proxy.ts`
  - `src/features/auth/hooks/useAuth.ts`
  - `src/features/auth/services/auth.service.ts`
  - `src/features/auth/repositories/auth.repository.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/cookie-options.ts`
  - `src/components/pwa/register-service-worker.tsx`
  - `src/components/pwa/install-app-prompt.tsx`
  - `scripts/pilot-users.mjs`
  - `package.json`

### 2026-05-18 - Optimizacion de entrada para pilotos

- Se optimizo la percepcion de carga en entrada/login y primer acceso al workspace:
  - `useAuth` ahora difiere la revalidacion de red cuando ya existe una sesion util persistida en `sessionStorage`
  - el primer paint puede entrar con estado util y refrescar en background
- `useOrganizationProfile` ahora tambien difiere la revalidacion cuando ya existe perfil cacheado o persistido
  - reduce trabajo de red justo despues del login
  - mantiene refresco en segundo plano sin romper datos visibles
- `/login` ahora precalienta `/dashboard` en tiempo ocioso con `router.prefetch("/dashboard")`
  - acelera el salto despues de `signIn`
- No se cambiaron flujos, roles, RLS, PDF, WhatsApp ni rutas publicas.
- Archivos tocados:
  - `src/features/auth/hooks/useAuth.ts`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `app/(auth-public)/login/login-view.tsx`

### 2026-05-18 - Hardening de uploads en Pagina de venta y limpieza de service worker

- Se reprodujo en Supabase el error real de `new row violates row-level security policy` y se confirmo que:
  - `organization_profile` y `public_landing_gallery` estaban operativos
  - el rechazo venia de `storage.objects` al subir assets a `organization-assets`
- Se saco la subida de assets del cliente para configuracion comercial:
  - logo
  - portada hero
  - galeria de trabajos
- Nuevo flujo:
  - cliente autenticado pide upload a `/api/organization-assets/upload`
  - el servidor valida bearer, resuelve `organization_id` activo y sube con `service_role`
  - la URL publica vuelve al cliente sin depender de RLS de Storage en browser
- Beneficios:
  - desaparece el error RLS en `Pagina de venta` y `Empresa`
  - el flujo queda mas estable para pilotos nuevos y usuarios con `auth_user_id` reciente
  - el aislamiento multi-tenant se conserva server-side por organizacion autenticada
- Se desactivo `navigationPreload` en `sw.js` para eliminar el warning:
  - `The service worker navigation preload request was cancelled before preloadResponse settled`
- Archivos tocados:
  - `app/api/organization-assets/upload/route.ts`
  - `src/features/organization-assets/repositories/organization-assets-upload.repository.ts`
  - `src/features/organization-profile/repositories/organization-profile.repository.ts`
  - `src/features/landing-gallery/repositories/landing-gallery.repository.ts`
  - `public/sw.js`
  - `src/components/pwa/register-service-worker.tsx`
  - `supabase/migrations/20260518153000_fix_organization_assets_storage_policies.sql`

### 2026-05-18 - Invalidacion inmediata de cache en landing publica

- Se detecto que la landing publica podia mostrar datos viejos aunque `organization_profile` ya estuviera actualizado en base.
- Causa real:
  - la ruta publica `/solicitud/[empresa]` lee configuracion, galeria y valoraciones desde `unstable_cache`
  - el guardado en `Empresa`, `Pagina de venta`, galeria y valoraciones no invalidaba ese cache
  - resultado: la base quedaba correcta, pero la landing podia seguir mostrando nombre, slug o contenido anterior por hasta 5 minutos
- Se agrego invalidacion server-side segura mediante `/api/public-landing/revalidate`:
  - valida bearer del usuario autenticado
  - resuelve su `organization_id`
  - obtiene el `solicitud_publica_slug` vigente
  - ejecuta `revalidateTag` y `revalidatePath` para refrescar la landing al instante
- Se conecto esta invalidacion a:
  - `useOrganizationProfile.saveProfile`
  - `useLandingGallery` en crear/editar/eliminar/reordenar
  - `usePublicLandingTestimonials.updateStatus`
- Se agregaron tags explicitos al cache publico de:
  - configuracion de solicitud publica
  - galeria publica
  - valoraciones publicas
- Archivos tocados:
  - `src/features/solicitudes/services/solicitudes-public-cache.server.ts`
  - `src/features/solicitudes/services/solicitudes-public-cache-revalidation.server.ts`
  - `app/api/public-landing/revalidate/route.ts`
  - `src/features/solicitudes/repositories/public-landing-cache.repository.ts`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `src/features/landing-gallery/hooks/useLandingGallery.ts`
  - `src/features/public-landing-testimonials/hooks/usePublicLandingTestimonials.ts`

### 2026-05-31 - Supabase MCP conectado y hardening pre-produccion

- Se conecto MCP Supabase al proyecto `yrtrwgkaopfumpidjthk`.
- Se ejecutaron advisors remotos de seguridad y performance.
- Se confirmo RLS habilitado en las 26 tablas `public`.
- Se cerro escritura cliente sobre `pagos_suscripcion`: usuarios autenticados solo leen historial propio por RLS; Webpay escribe desde server con `service_role`.
- Se revoco acceso publico/authenticated al trigger function interno `ensure_organization_profile_trial_defaults()`.
- Se optimizaron policies RLS de `web_push_subscriptions` con `(select auth.uid())` y `(select get_org_id())`.
- Migraciones remotas nuevas:
  - `20260531212114_harden_subscription_security_advisors`
  - `20260531212250_optimize_web_push_rls_initplan`
- Pendientes pre-produccion: leaked password protection en Auth, drift historico de migraciones remotas y performance advisor de FKs/indices.

### 2026-05-31 - Indices FK Supabase

- Se resolvieron los avisos `unindexed_foreign_keys` del Performance Advisor.
- Se agrego migracion `20260531232020_add_missing_fk_indexes_and_drop_duplicate`.
- Se elimino el indice duplicado exacto de `solicitudes_contacto` conservando `solicitudes_contacto_org_created_idx`.
- Se deja `unused_index` como observacion de bajo riesgo hasta tener trafico real.

### 2026-06-02 - Billing Flow temporal

- Se agrego capa `src/features/billing/` con `PaymentProvider`, catalogo tipado de planes y providers `flow`, `manual_transfer`, `webpay_plus`.
- Flow queda provider principal temporal para `/api/billing/checkout` y `/api/billing/flow/confirmar`.
- `pagos_suscripcion` se extendio como ledger provider-agnostic con `provider_order_id`, `checkout_url`, `flow/manual_transfer/webpay_plus` y estado `cancelado`.
- `/cuenta-vencida` usa `useBillingCheckout()` y mantiene mensual por WhatsApp.
- Webpay Plus directo queda como endpoints legacy/compatibilidad en `/api/subscriptions/webpay/*`.

### 2026-06-02 - Cuentas internas gratis permanentes

- Se agrego migracion `20260602065826_founder_free_internal_accounts`.
- Organizaciones `3` y `4` quedan como `active/founder/founder_full` sin fecha de vencimiento.
- Se documenta que hard delete de organizations con datos asociados no es el flujo correcto; usar soft delete por `eliminado_en`.
