# Features Map - Ventora

Organizacion por funcionalidad, no por carpetas. Cada feature indica exactamente donde editar UI, logica y persistencia.

---

## Feature: Autenticacion

- **Que hace**: Login email/password con Supabase Auth, PKCE, sesion persistida, perfil de usuario con organizacion y rol
- **Rutas involucradas**: `/login`, `/auth` (callback)
- **Archivos principales**:
  - `app/(auth-public)/login/page.tsx`
  - `src/features/auth/hooks/useAuth.ts`
  - `src/features/auth/services/auth.service.ts`
  - `src/features/auth/services/auth-server.service.ts`
  - `src/features/auth/repositories/auth.repository.ts`
  - `src/features/auth/repositories/auth-server.repository.ts`
  - `src/features/auth/types/auth.ts`
  - `proxy.ts` (middleware auth)
- **Componentes principales**: LoginView (interno en pagina)
- **Hooks/servicios/actions**: `useAuth()`, `authService`, `authServerService`
- **Tablas Supabase**: `auth.users`, `public.users`
- **Flujo de datos**: Login form -> `useAuth.signIn()` -> `authService.signIn()` -> `authRepository.signIn()` -> Supabase Auth -> `authRepository.getProfile()` -> `public.users` (organization_id, rol)
- **Estados importantes**: `cargando`, authenticated, unauthenticated
- **Donde editar UI**: `app/(auth-public)/login/page.tsx`
- **Donde editar logica**: `src/features/auth/services/auth.service.ts`
- **Donde editar persistencia**: `src/features/auth/repositories/auth.repository.ts`
- **Consideraciones UX**: Proxy redirige autenticados a `/dashboard`, no autenticados a `/login?next=path`
- **Riesgos al modificar**: No romper flujo PKCE ni cache de perfil en localStorage/sessionStorage

---

## Feature: Dashboard

- **Que hace**: Resumen operativo con KPIs (total cotizaciones, pendientes, del mes, aprobadas hoy/mes) y cotizaciones recientes
- **Rutas involucradas**: `/dashboard`
- **Archivos principales**:
  - `app/(pwa-app)/dashboard/page.tsx`
  - `app/(pwa-app)/dashboard/_components/mobile/dashboard-mobile.tsx`
  - `app/(pwa-app)/dashboard/_components/desktop/dashboard-desktop.tsx`
  - `app/(pwa-app)/dashboard/_hooks/use-dashboard-summary.ts`
  - `app/(pwa-app)/dashboard/_hooks/use-dashboard-view-model.ts`
  - `app/(pwa-app)/dashboard/_hooks/use-dashboard-breakpoint.ts`
  - `src/features/dashboard/services/dashboard-summary-server.service.ts`
  - `src/features/dashboard/types/dashboard-summary.ts`
  - `app/api/dashboard/summary/route.ts`
- **Componentes principales**: `DashboardDesktop`, `DashboardMobile`
- **Hooks/servicios/actions**: `useDashboardViewModel`, `useDashboardSummary`, `useDashboardBreakpoint`
- **Tablas Supabase**: `cotizaciones`, `clients`, `projects`
- **Flujo de datos**: Page -> `useDashboardViewModel` -> `useDashboardSummary` -> API `/api/dashboard/summary` -> `dashboardSummaryServerService` -> repositories directos
- **Estados importantes**: isLoading, isReady, isEmpty
- **Donde editar UI**: `app/(pwa-app)/dashboard/_components/`
- **Donde editar logica**: `app/(pwa-app)/dashboard/_hooks/use-dashboard-view-model.ts`, `src/features/dashboard/services/dashboard-summary-server.service.ts`
- **Donde editar persistencia**: `app/api/dashboard/summary/route.ts` (usa repositories directamente)
- **Consideraciones UX**: Breakpoint 1024px desktop/mobile. KPIs formateados en CLP compacto.
- **Riesgos al modificar**: No romper orquestacion de hooks ni formateo de moneda

---

## Feature: Cotizaciones

- **Que hace**: CRUD completo de cotizaciones: listado con filtros, nueva cotizacion guiada, detalle, PDF, WhatsApp, estados
- **Rutas involucradas**: `/cotizaciones`, `/cotizaciones/nueva`, `/cotizaciones/[id]`
- **Archivos principales**:
  - `app/(pwa-app)/cotizaciones/page.tsx` (listado, 1055 lineas)
  - `app/(pwa-app)/cotizaciones/nueva/page.tsx` (nueva, 1198 lineas)
  - `app/(pwa-app)/cotizaciones/[id]/page.tsx` (detalle)
  - `app/(pwa-app)/cotizaciones/_components/cotizacion-mobile-card.tsx`
  - `app/(pwa-app)/cotizaciones/_components/cotizaciones-mobile-summary.tsx`
  - `app/(pwa-app)/cotizaciones/_components/cotizaciones-filter-fields.tsx`
  - `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-mobile-view.tsx`
  - `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-mobile-view-model.ts`
  - `src/features/cotizaciones/hooks/useCotizacionesStore.ts` (746 lineas)
  - `src/features/cotizaciones/hooks/useCotizacionAlerts.ts`
  - `src/features/cotizaciones/services/cotizaciones.service.ts` (710 lineas)
  - `src/features/cotizaciones/services/cotizaciones-workflow.service.ts` (318 lineas)
  - `src/features/cotizaciones/services/cotizaciones-summary.service.ts`
  - `src/features/cotizaciones/services/cotizacion-alerts.service.ts`
  - `src/features/cotizaciones/services/component-catalog.service.ts`
  - `src/features/cotizaciones/services/component-suggestions.service.ts`
  - `src/features/cotizaciones/services/glass-recommendations.service.ts`
  - `src/features/cotizaciones/repositories/cotizaciones-repository.ts` (1486 lineas)
  - `src/features/cotizaciones/types/cotizacion.ts`
  - `src/features/cotizaciones/types/cotizacion-item.ts`
  - `src/features/cotizaciones/types/cotizacion-workflow.ts`
  - `src/features/cotizaciones/types/pricing-mode.ts`
  - `src/features/cotizaciones/new-quote/workflow-ui.ts` (883 lineas)
  - `src/features/cotizaciones/new-quote/solicitud-prefill.ts`
  - `src/utils/cotizacion-pdf.ts` (703 lineas)
  - `src/utils/cotizacion-approval.ts`
  - `src/utils/cotizacion-item-presentation.ts`
  - `src/utils/whatsapp.ts`
  - `src/utils/window-drawings.ts` (1074 lineas)
  - `src/constants/impuestos.ts` (IVA 19%)
  - `src/constants/component-colors.ts`
  - `app/api/cotizaciones/resumen/route.ts`
- **Componentes principales**: `CotizacionMobileCard`, `CotizacionesMobileSummary`, `CotizacionesFilterFields`, `CotizacionDetalleMobileView`, `QuoteComponentSketch`
- **Hooks/servicios/actions**: `useCotizacionesStore`, `useCotizacionAlerts`, `cotizacionesAppService`, `cotizacionesWorkflowService`, `cotizacionesRepository`
- **Tablas Supabase**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`, `cotizacion_code_counters`
- **Flujo de datos**:
  - Listado: Page -> `useCotizacionesStore` -> API `/api/cotizaciones/resumen` -> server service -> repositories
  - Nueva: Page -> workflow state (sessionStorage) -> `useCotizacionesStore` -> `cotizacionesAppService` -> repository
  - Detalle: Page -> `useCotizacionesStore.getById()` -> repository
- **Estados importantes**: `borrador`, `creada`, `enviada`, `aprobada`, `rechazada`, `terminada`
- **Donde editar UI**: `app/(pwa-app)/cotizaciones/` (paginas y _components)
- **Donde editar logica**: `src/features/cotizaciones/services/`, `src/features/cotizaciones/hooks/`
- **Donde editar persistencia**: `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
- **Consideraciones UX**: Paginas muy grandes (1000+ lineas). Workflow state persistido en sessionStorage. Calculo: `precioFinalUnitario = costoProveedorUnitario * (1 + margenPct / 100)`.
- **Riesgos al modificar**: No romper calculos de pricing, auto-creacion de cliente/proyecto, ni generacion de codigo COT-DDMMYY-NNN. No romper PDF ni WhatsApp.

---

## Feature: PDF de Cotizacion

- **Que hace**: Genera PDF A4/legal a partir de HTML con html2canvas + jsPDF. Headers, paginacion, bloques protegidos, branding empresa.
- **Rutas involucradas**: Interna (usada desde detalle cotizacion y print)
- **Archivos principales**:
  - `src/utils/cotizacion-pdf.ts` (703 lineas)
  - `src/features/cotizaciones/pdf-cache/services/cotizacion-pdf-cache.service.ts`
  - `src/features/cotizaciones/pdf-cache/repositories/cotizacion-pdf-cache.repository.ts`
  - `app/print/cotizaciones/[id]/`
- **Componentes principales**: N/A (utilidad)
- **Hooks/servicios/actions**: `exportCotizacionPdf()`, `cotizacionPdfCacheService`
- **Tablas Supabase**: Storage bucket `organization-assets` (path: `{orgId}/cotizaciones/{cotizacionId}/{version}.pdf`)
- **Flujo de datos**: HTML del componente -> html2canvas -> jsPDF -> blob -> cache Storage o download
- **Estados importantes**: isPreparingPdf
- **Donde editar UI**: `src/utils/cotizacion-pdf.ts` (layout del PDF)
- **Donde editar logica**: `src/utils/cotizacion-pdf.ts`
- **Donde editar persistencia**: `src/features/cotizaciones/pdf-cache/`
- **Consideraciones UX**: PDF multi-pagina con headers corrientes. Puede fallar en mobile por memoria.
- **Riesgos al modificar**: No romper paginacion ni bloques protegidos. Cambios afectan impresion fisica.

---

## Feature: WhatsApp / Share Link

- **Que hace**: Construye URL de WhatsApp con mensaje pre-llenado incluyendo datos de cotizacion, link publico y totales
- **Rutas involucradas**: Interna (usada desde listado y detalle cotizacion)
- **Archivos principales**:
  - `src/utils/whatsapp.ts`
  - `src/utils/share-capabilities.ts`
  - `src/utils/chile-mobile-phone.ts`
- **Hooks/servicios/actions**: `buildCotizacionWhatsappUrl()`, `normalizeWhatsappPhone()`
- **Tablas Supabase**: Ninguna
- **Flujo de datos**: Cotizacion record -> `buildCotizacionWhatsappMessage()` -> `buildCotizacionWhatsappUrl()` -> `wa.me` link
- **Donde editar UI**: N/A
- **Donde editar logica**: `src/utils/whatsapp.ts`
- **Donde editar persistencia**: N/A
- **Riesgos al modificar**: No romper formato de telefono chileno (+569XXXXXXXX)

---

## Feature: Aprobacion/Rechazo Publica

- **Que hace**: Cliente final aprueba o rechaza cotizacion via link publico con token. Registra timestamp, canal, envia push al vendedor.
- **Rutas involucradas**: `/presupuesto/[token]`
- **Archivos principales**:
  - `app/presupuesto/[token]/page.tsx`
  - `app/presupuesto/[token]/actions.ts`
  - `app/presupuesto/[token]/public-quote-mobile.tsx`
  - `app/presupuesto/[token]/public-quote-preview.tsx`
  - `src/features/cotizaciones/public-approval/services/public-cotizacion-approval.service.ts` (289 lineas)
  - `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts` (422 lineas)
- **Componentes principales**: `PublicQuoteMobile`, `PublicQuotePreview`
- **Hooks/servicios/actions**: `acceptPublicQuoteAction`, `rejectPublicQuoteAction` (server actions), `publicCotizacionApprovalService`
- **Tablas Supabase**: `cotizaciones` (approval_token, cliente_vio_en, cliente_respondio_en, cliente_respuesta_canal), `clients`, `projects`, `organization_profile`
- **Flujo de datos**: Token en URL -> server action -> `publicCotizacionApprovalService.processApproval()` -> repository -> update cotizacion + push notification
- **Estados importantes**: Token valido/expirado, pendiente/aprobada/rechazada
- **Donde editar UI**: `app/presupuesto/[token]/` (page y componentes)
- **Donde editar logica**: `src/features/cotizaciones/public-approval/services/public-cotizacion-approval.service.ts`
- **Donde editar persistencia**: `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts`
- **Consideraciones UX**: Vista responsive. Botones aprobar/rechazar. Post-decision muestra confirmacion.
- **Riesgos al modificar**: RUTA CRITICA. No romper validacion de token ni timestamps de respuesta. Push notification debe ejecutarse tras decision.

---

## Feature: Clientes

- **Que hace**: CRUD de clientes con estados (activo/seguimiento/prospecto/inactivo), ficha con proyectos y cotizaciones asociadas
- **Rutas involucradas**: `/clientes`, `/clientes/nuevo`, `/clientes/[id]`, `/clientes/[id]/editar`
- **Archivos principales**:
  - `app/(pwa-app)/clientes/page.tsx` (696 lineas)
  - `app/(pwa-app)/clientes/nuevo/page.tsx`
  - `app/(pwa-app)/clientes/[id]/page.tsx`
  - `app/(pwa-app)/clientes/[id]/editar/page.tsx`
  - `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-mobile-view.tsx`
  - `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-mobile-view-model.ts`
  - `src/features/clientes/hooks/useClientes.ts`
  - `src/features/clientes/services/clientes.service.ts`
  - `src/features/clientes/services/clientes-summary.service.ts`
  - `src/features/clientes/repositories/clientes-repository.ts`
  - `src/features/clientes/types/cliente.ts`
  - `app/api/clientes/resumen/route.ts`
- **Componentes principales**: `ClienteDetalleMobileView`
- **Hooks/servicios/actions**: `useClientes`, `clientesService`
- **Tablas Supabase**: `clients`
- **Flujo de datos**: Page -> `useClientes` -> API `/api/clientes/resumen` -> server -> `clientesRepository`
- **Estados importantes**: activo, seguimiento, prospecto, inactivo (calculado o manual via `estado_manual`)
- **Donde editar UI**: `app/(pwa-app)/clientes/`
- **Donde editar logica**: `src/features/clientes/services/clientes.service.ts`
- **Donde editar persistencia**: `src/features/clientes/repositories/clientes-repository.ts`
- **Consideraciones UX**: Estado calculado segun actividad reciente cruzando cotizaciones y proyectos
- **Riesgos al modificar**: No romper soft delete ni calculo de estado. `unique_correo_clients` es global (no por org) - bug conocido.

---

## Feature: Solicitudes / Leads

- **Que hace**: Captura de leads via formulario publico, tracking UTM, gestion de estados, badge de origen, contacto WhatsApp, prefill a cotizacion
- **Rutas involucradas**: `/solicitudes`, `/solicitudes/canales`, `/solicitud/[empresa]` (publica)
- **Archivos principales**:
  - `app/(pwa-app)/solicitudes/page.tsx` (644 lineas)
  - `app/(pwa-app)/solicitudes/canales/page.tsx`
  - `app/(pwa-app)/solicitudes/_components/solicitud-card.tsx`
  - `app/(landing-web)/solicitud/[empresa]/page.tsx` (441 lineas, server component)
  - `src/features/solicitudes/hooks/useSolicitudesContacto.ts` (229 lineas)
  - `src/features/solicitudes/hooks/useLeadChannels.ts`
  - `src/features/solicitudes/services/solicitudes-contacto.service.ts` (258 lineas)
  - `src/features/solicitudes/services/solicitudes-summary.service.ts`
  - `src/features/solicitudes/services/solicitudes-contacto-access.ts`
  - `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts` (726 lineas)
  - `src/features/solicitudes/types/solicitud-contacto.ts`
  - `src/features/solicitudes/components/lead-channels.tsx` (609 lineas)
  - `src/features/solicitudes/components/lead-channels.module.css`
  - `app/api/solicitud/[empresa]/route.ts` (rate limited)
  - `app/api/solicitudes/resumen/route.ts`
- **Componentes principales**: `SolicitudCard`, `LeadChannels`
- **Hooks/servicios/actions**: `useSolicitudesContacto`, `useLeadChannels`, `solicitudesContactoService`
- **Tablas Supabase**: `solicitudes_contacto`, `organization_profile` (para config publica)
- **Flujo de datos**:
  - Captura: Formulario publico -> POST `/api/solicitud/[empresa]` -> `solicitudesContactoService.crearSolicitudEmpresa()` -> repository + push notification
  - Gestion: Page -> `useSolicitudesContacto` -> API `/api/solicitudes/resumen` -> repository
  - Canales: Page -> `useLeadChannels` (genera URLs con UTM) + `LeadChannels` (QR + copy)
- **Estados importantes**: nueva, contactada, cerrada, descartada
- **Donde editar UI**: `app/(pwa-app)/solicitudes/`, `app/(landing-web)/solicitud/[empresa]/`
- **Donde editar logica**: `src/features/solicitudes/services/solicitudes-contacto.service.ts`
- **Donde editar persistencia**: `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`
- **Consideraciones UX**: Formulario publico con paso a paso. Rate limiting por IP. Badge de origen. Tiempo relativo. Prefill a cotizacion.
- **Riesgos al modificar**: RUTA CRITICA de captacion. No romper rate limiting, validaciones de telefono chileno, ni UTM tracking. Push notification al crear lead.

---

## Feature: Links por Canal

- **Que hace**: Genera URLs UTM-tagged por canal (directo, Instagram, Facebook, WhatsApp) para la pagina de solicitud publica
- **Rutas involucradas**: `/solicitudes/canales`
- **Archivos principales**:
  - `src/features/solicitudes/hooks/useLeadChannels.ts`
  - `src/features/solicitudes/components/lead-channels.tsx` (609 lineas)
  - `src/features/solicitudes/components/lead-channels.module.css` (436 lineas)
  - `app/(pwa-app)/solicitudes/canales/page.tsx`
- **Componentes principales**: `LeadChannels`
- **Hooks/servicios/actions**: `useLeadChannels`
- **Tablas Supabase**: Ninguna (lee slug de org desde perfil)
- **Flujo de datos**: Org slug + canal -> URL con UTM params -> QR + copy link
- **Donde editar UI**: `src/features/solicitudes/components/lead-channels.tsx`
- **Donde editar logica**: `src/features/solicitudes/hooks/useLeadChannels.ts`
- **Donde editar persistencia**: N/A
- **Riesgos al modificar**: No romper formato de URLs ni params UTM

---

## Feature: QR

- **Que hace**: Genera codigo QR para la URL de solicitud publica, descargable como PNG
- **Rutas involucradas**: `/solicitudes/canales`, `/configuracion/empresa`
- **Archivos principales**:
  - `src/features/solicitudes/components/lead-channels.tsx` (contiene QR)
  - Usa libreria `react-qr-code`
- **Donde editar UI**: `src/features/solicitudes/components/lead-channels.tsx`
- **Riesgos al modificar**: QR usa URL completa con UTM. No romper descarga PNG.

---

## Feature: Empresa / Configuracion

- **Que hace**: Configura perfil de empresa (datos, branding, logo, slug publico, push) y pagina de venta (hero, galeria, horario, colores)
- **Rutas involucradas**: `/configuracion/empresa`, `/configuracion/pagina-venta`
- **Archivos principales**:
  - `app/(pwa-app)/configuracion/empresa/page.tsx` (745 lineas)
  - `app/(pwa-app)/configuracion/pagina-venta/page.tsx` (1082 lineas)
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts` (312 lineas)
  - `src/features/organization-profile/services/organization-profile.service.ts` (531 lineas)
  - `src/features/organization-profile/repositories/organization-profile.repository.ts` (347 lineas)
  - `src/features/organization-profile/types/organization-profile.ts`
  - `src/features/landing-gallery/hooks/useLandingGallery.ts`
  - `src/features/landing-gallery/services/landing-gallery.service.ts`
  - `src/features/landing-gallery/repositories/landing-gallery.repository.ts`
  - `src/features/landing-gallery/repositories/landing-gallery-server.repository.ts`
  - `src/features/landing-gallery/types/landing-gallery.ts`
- **Componentes principales**: Internos de paginas
- **Hooks/servicios/actions**: `useOrganizationProfile`, `useLandingGallery`, `organizationProfileService`
- **Tablas Supabase**: `organization_profile`, `public_landing_gallery`, Storage bucket `organization-assets`
- **Flujo de datos**:
  - Empresa: Page -> `useOrganizationProfile` -> `organizationProfileService` -> repository
  - Pagina venta: Page -> `useOrganizationProfile` + `useLandingGallery` -> services -> repositories
- **Estados importantes**: isLoading, error, isUploading (galeria)
- **Donde editar UI**: `app/(pwa-app)/configuracion/`
- **Donde editar logica**: `src/features/organization-profile/services/`, `src/features/landing-gallery/services/`
- **Donde editar persistencia**: `src/features/organization-profile/repositories/`, `src/features/landing-gallery/repositories/`
- **Consideraciones UX**: Galeria max 8 items. Horario por dia. Slug unico. Color presets.
- **Riesgos al modificar**: No cambiar slug sin actualizar indice unico. Upload logo requiere bucket `organization-assets`. `is_published` controla visibilidad landing.

---

## Feature: Pagina Publica / Mini Landing

- **Que hace**: Landing personalizada por empresa con hero, galeria, horario y formulario de solicitud. Es la cara publica de captacion de leads.
- **Rutas involucradas**: `/solicitud/[empresa]`
- **Archivos principales**:
  - `app/(landing-web)/solicitud/[empresa]/page.tsx` (441 lineas, server component)
  - `src/features/organization-profile/services/organization-profile.service.ts` (resolveOrganizationProfile)
  - `src/features/landing-gallery/repositories/landing-gallery-server.repository.ts`
  - `src/features/solicitudes/services/solicitudes-contacto.service.ts` (getEmpresaPublicaConfig)
- **Componentes principales**: Formulario solicitud, galeria, horario (internos de la pagina)
- **Tablas Supabase**: `organization_profile`, `public_landing_gallery`
- **Flujo de datos**: Slug en URL -> server component lee perfil + galeria -> renderiza landing personalizada
- **Donde editar UI**: `app/(landing-web)/solicitud/[empresa]/page.tsx`
- **Donde editar logica**: `src/features/solicitudes/services/solicitudes-contacto.service.ts` (getEmpresaPublicaConfig)
- **Donde editar persistencia**: `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`
- **Riesgos al modificar**: RUTA CRITICA. Es la puerta de entrada de leads. No romper si `is_published = false` no debe mostrarse.

---

## Feature: Marca / Logo / Color

- **Que hace**: Configuracion de branding que aparece en PDF y landing publica
- **Rutas involucradas**: `/configuracion/empresa`
- **Archivos principales**:
  - `src/features/organization-profile/services/organization-profile.service.ts`
  - `src/features/organization-profile/repositories/organization-profile.repository.ts`
  - `src/utils/cotizacion-pdf.ts` (usa brand_color y logo)
- **Tablas Supabase**: `organization_profile` (brand_color, empresa_logo_url), Storage bucket `organization-assets`
- **Donde editar UI**: `app/(pwa-app)/configuracion/empresa/page.tsx`
- **Donde editar logica**: `src/features/organization-profile/services/`
- **Riesgos al modificar**: Cambios en brand_color afectan PDF y landing simultaneamente

---

## Feature: Notificaciones

- **Que hace**: Web Push al vendedor cuando llega lead o cliente aprueba/rechaza cotizacion. Email async desacoplado para leads nuevos.
- **Rutas involucradas**: Interna (API routes)
- **Archivos principales**:
  - `src/features/notificaciones/services/web-push-notifications.service.ts` (269 lineas)
  - `src/features/notificaciones/services/email-notifications.service.ts` (106 lineas)
  - `src/features/notificaciones/repositories/web-push-subscriptions.repository.ts` (167 lineas)
  - `src/features/notificaciones/types/web-push.ts`
  - `src/utils/web-push.ts`
  - `src/utils/pwa-service-worker.ts`
  - `app/api/pwa/push-subscriptions/route.ts`
  - `public/sw.js`
- **Componentes principales**: `PushNotificationsPrompt`, `RegisterServiceWorker`
- **Hooks/servicios/actions**: `webPushNotificationsService`, `emailService` (Resend/SendGrid/Console)
- **Tablas Supabase**: `web_push_subscriptions`
- **Flujo de datos**:
  - Push: Evento -> `webPushNotificationsService.send*Push()` -> obtiene subscriptions activas -> `web-push` library -> navegador
  - Email: Nuevo lead -> `emailService.sendLeadNotification()` -> Resend/SendGrid API
  - Suscripcion: Browser -> `subscribeToWebPush()` -> POST `/api/pwa/push-subscriptions` -> repository
- **Donde editar UI**: `src/components/pwa/push-notifications-prompt.tsx`
- **Donde editar logica**: `src/features/notificaciones/services/`
- **Donde editar persistencia**: `src/features/notificaciones/repositories/web-push-subscriptions.repository.ts`
- **Consideraciones UX**: Push depende de navegador/OS. iPhone requiere Safari + agregar a inicio. Brave no soportado.
- **Riesgos al modificar**: VAPID keys en env. Email depende de `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`. web_push_subscriptions NO tiene RLS policies (bug conocido).

---

## Feature: Multi-tenant / organization_id

- **Que hace**: Aisla datos por organizacion. Toda query filtra `organization_id`. Funcion DB `get_org_id()` resuelve org desde auth email.
- **Rutas involucradas**: Transversal (todas las rutas privadas)
- **Archivos principales**:
  - `src/lib/supabase/client.ts` (browser client)
  - `src/lib/supabase/server.ts` (server client)
  - `src/lib/supabase/admin.ts` (admin client, service role)
  - `proxy.ts` (auth middleware)
  - `src/features/auth/repositories/auth.repository.ts` (getProfile con organization_id)
  - Todas las queries en repositories filtran `organization_id`
- **Tablas Supabase**: Todas las tablas activas tienen `organization_id`
- **Riesgos al modificar**: CRITICO. No eliminar filtro `organization_id` de ninguna query. RLS depende de `get_org_id()`. 5 tablas sin RLS policies (web_push_subscriptions, quote_item_breakdown, etc.).

---

## Feature: Proyectos

- **Que hace**: CRUD de proyectos/obras vinculados a clientes. Sin ruta directa (se accede desde ficha de cliente).
- **Rutas involucradas**: Sin ruta directa
- **Archivos principales**:
  - `src/features/projects/repositories/projects.repository.ts`
  - `src/features/projects/types/project.ts`
- **Hooks/servicios/actions**: Usado indirectamente por `clientesService` y `cotizacionesAppService`
- **Tablas Supabase**: `projects`
- **Donde editar persistencia**: `src/features/projects/repositories/projects.repository.ts`
- **Riesgos al modificar**: No romper FK con clients ni cotizaciones
