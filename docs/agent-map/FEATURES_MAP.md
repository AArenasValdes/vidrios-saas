# Features Map - Ventora

Organizacion por funcionalidad, no por carpetas. Cada feature indica exactamente donde editar UI, logica y persistencia.

---

## Feature: Autenticacion

- **Que hace**: Login email/password con Supabase Auth, PKCE, sesion persistida, perfil de usuario con organizacion y rol. Revalida sesion al volver a foco/rehidratar pestaña o PWA para evitar estado viejo.
- **Rutas involucradas**: `/login`, `/auth` (callback), `/auth/logout`, `/cuenta-vencida`
- **Archivos principales**:
  - `app/(auth-public)/login/page.tsx`
  - `app/(auth-public)/auth/logout/route.ts`
  - `src/features/auth/hooks/useAuth.ts`
  - `src/features/auth/services/auth.service.ts`
  - `src/features/auth/services/auth-login-error.service.ts`
  - `src/features/auth/services/auth-login-diagnostics.service.ts`
  - `src/features/auth/services/auth-server.service.ts`
  - `src/features/auth/repositories/auth.repository.ts`
  - `src/features/auth/repositories/auth-server.repository.ts`
  - `src/features/auth/types/auth.ts`
  - `proxy.ts` (middleware auth)
- **Componentes principales**: LoginView (interno en pagina)
- **Hooks/servicios/actions**: `useAuth()`, `authService`, `authServerService`
- **Tablas Supabase**: `auth.users`, `public.users`
- **Flujo de datos**: Login form -> `useAuth.signIn()` -> `authService.signIn()` -> `authRepository.signIn()` -> Supabase Auth -> `authRepository.getProfile()` -> `public.users` (organization_id, rol) -> diagnostico local + eventos `login_success` / `login_failure`
- **Estados importantes**: `cargando`, authenticated, unauthenticated
- **Donde editar UI**: `app/(auth-public)/login/page.tsx`
- **Donde editar logica**: `src/features/auth/services/auth.service.ts`
- **Donde editar persistencia**: `src/features/auth/repositories/auth.repository.ts`
- **Consideraciones UX**: Proxy redirige autenticados a `/dashboard`, no autenticados a `/login?next=path`. El logout del shell sale por `/auth/logout` para evitar carreras entre App Router y cookies SSR. Al volver desde background/foco, el hook revalida sesion sin vaciar la UI. El login espera la cookie antes de redirigir y guarda un buffer local de diagnosticos para distinguir credencial invalida real vs cookie/PWA/red/perfil.
- **Consideraciones UX**: Proxy redirige autenticados a `/dashboard`, no autenticados a `/login?next=path`. El logout del shell sale por `/auth/logout` para evitar carreras entre App Router y cookies SSR. Al volver desde background/foco, el hook revalida sesion sin vaciar la UI. El login espera la cookie antes de redirigir y guarda un buffer local de diagnosticos para distinguir credencial invalida real vs cookie/PWA/red/perfil. La pantalla de login tambien permite ver/ocultar contrasena y reiniciar el estado local de la app en ese dispositivo cuando navegador web si entra pero la PWA instalada no.
- **Consideraciones UX**: Proxy redirige autenticados a `/dashboard`, no autenticados a `/login?next=path`. El logout del shell sale por `/auth/logout` para evitar carreras entre App Router y cookies SSR. Al volver desde background/foco, el hook revalida sesion sin vaciar la UI. El login espera la cookie antes de redirigir y guarda un buffer local de diagnosticos para distinguir credencial invalida real vs cookie/PWA/red/perfil. La pantalla de login tambien permite ver/ocultar contrasena y reiniciar el estado local de la app en ese dispositivo cuando navegador web si entra pero la PWA instalada no. El prompt de instalacion PWA tiene fallback visual para Opera/Android con mockup simple del navegador y highlight orientativo del `menu O`.
- **Riesgos al modificar**: No romper flujo PKCE ni cache de perfil en localStorage/sessionStorage. No volver a disparar logout por navegacion SPA directa a `/login` desde rutas privadas.

---

## Feature: Trial y Suscripcion Manual

- **Que hace**: Controla la prueba gratuita de 7 dias por organizacion y la activacion manual por transferencia. Permite login aun vencido, pero deja la cuenta en modo lectura y bloquea escrituras privadas con CTA de WhatsApp hacia activacion mensual o anual.
- **Rutas involucradas**: `/dashboard`, `/cotizaciones`, `/cotizaciones/nueva`, `/clientes`, `/clientes/nuevo`, `/clientes/[id]/editar`, `/solicitudes`, `/solicitudes/canales`, `/configuracion/*`, `/cuenta-vencida`
- **Archivos principales**:
  - `src/features/subscriptions/types/subscription.ts`
  - `src/features/subscriptions/services/subscription-status.service.ts`
  - `src/features/subscriptions/services/subscription-route-access.service.ts`
  - `src/features/organization-profile/repositories/organization-profile.repository.ts`
  - `src/features/organization-profile/services/organization-profile.service.ts`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `src/components/layout/app-shell.tsx`
  - `src/components/layout/app-shell.module.css`
  - `app/(pwa-app)/cuenta-vencida/page.tsx`
  - `app/(pwa-app)/cuenta-vencida/page.module.css`
  - `app/api/solicitudes/route.ts`
  - `app/api/organization-assets/upload/route.ts`
  - `app/api/public-landing/revalidate/route.ts`
  - `proxy.ts`
  - `supabase/migrations/20260525121500_trial_subscriptions_manual_activation.sql`
- **Componentes principales**: `AppShell`, pantalla `Cuenta vencida`
- **Hooks/servicios/actions**: `useOrganizationProfile()`, `resolveOrganizationSubscriptionState()`, `canAccessPrivatePathWithSubscription()`, `assertSubscriptionAllowsWrite()`
- **Tablas Supabase**: `organization_profile`, `organizations`
- **Flujo de datos**:
  - Login y rutas privadas -> `useOrganizationProfile()` -> `organizationProfileService` -> repository -> `organization_profile`
  - Snapshot crudo -> `resolveOrganizationSubscriptionState()` -> estado efectivo (`trial_active`, `trial_expiring`, `trial_expired`, `active`, `past_due`, `cancelled`)
  - Shell privado -> banner / redirect a `/cuenta-vencida` / guard de acciones
  - APIs privadas de escritura -> guard server-side -> `403` si la cuenta esta vencida
- **Estados importantes**: `trial_active`, `trial_expiring`, `trial_expired`, `active`, `past_due`, `cancelled`
- **Donde editar UI**: `src/components/layout/app-shell.tsx`, `app/(pwa-app)/cuenta-vencida/`
- **Donde editar logica**: `src/features/subscriptions/services/`
- **Donde editar persistencia**: `src/features/organization-profile/repositories/organization-profile.repository.ts`, `supabase/migrations/20260525121500_trial_subscriptions_manual_activation.sql`
- **Consideraciones UX**: El usuario puede entrar y leer. Si faltan 2 dias o menos aparece banner de trial. Si vence, Ventora debe seguir mostrando datos basicos pero bloquear crear/editar/eliminar y llevar a CTA por WhatsApp con planes manuales `$10.000 mensual` y `$80.000 anual`.
- **Riesgos al modificar**: No romper `/solicitud/[empresa]` ni `/presupuesto/[token]`. No mezclar pago automatico todavia. No bloquear lectura basica. No inferir permisos de escritura sin pasar por el helper de suscripcion.

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

## Feature: Onboarding Comercial Guiado

- **Que hace**: Checklist admin-only de activacion comercial con persistencia compartida por organizacion. Orquesta el primer circuito de valor: empresa lista, pagina publicada, canal compartido, primera solicitud, primera cotizacion y primer PDF/link compartido.
- **Rutas involucradas**: `/dashboard`, `/configuracion/empresa`, `/configuracion/pagina-venta`, `/solicitudes/canales`, `/cotizaciones`, `/cotizaciones/nueva`, `/cotizaciones/[id]`
- **Archivos principales**:
  - `src/features/onboarding/types/onboarding-checklist.ts`
  - `src/features/onboarding/repositories/onboarding-checklist.repository.ts`
  - `src/features/onboarding/services/onboarding-checklist.service.ts`
  - `src/features/onboarding/hooks/useOnboardingChecklist.ts`
  - `src/features/onboarding/components/onboarding-guide.tsx`
  - `src/features/onboarding/components/onboarding-mobile-guide.tsx`
  - `src/features/onboarding/components/onboarding-inline-hint.tsx`
  - `src/features/onboarding/components/onboarding-step-card.tsx`
  - `src/features/onboarding/components/onboarding-progress.tsx`
  - `src/features/onboarding/components/onboarding-guide.module.css`
  - `supabase/migrations/20260522113000_onboarding_checklists.sql`
- **Componentes principales**: `OnboardingGuide`, `OnboardingMobileGuide`, `OnboardingInlineHint`, `OnboardingStepCard`, `OnboardingProgress`
- **Hooks/servicios/actions**: `useOnboardingChecklist`, `onboardingChecklistService`, `createOnboardingChecklistRepository`
- **Tablas Supabase**: `onboarding_checklists`, `organization_profile`, `solicitudes_contacto`, `cotizaciones`, `users`
- **Flujo de datos**:
  - Ruta privada -> `useOnboardingChecklist()` -> `onboardingChecklistService.getChecklistByOrganizationId()` -> repository -> Supabase
  - Pasos derivados: `organization_profile` + `solicitudes_contacto` + `cotizaciones`
  - Pasos manuales: interacciones reales en copy/share/QR/PDF/WhatsApp -> `markChannelReady()` / `markFirstShare()`
- **Estados importantes**: `pendiente`, `en_progreso`, `completado`, `omitido`
- **Donde editar UI**: `src/features/onboarding/components/`, rutas privadas que montan Joyride
- **Donde editar logica**: `src/features/onboarding/services/onboarding-checklist.service.ts`
- **Donde editar persistencia**: `src/features/onboarding/repositories/onboarding-checklist.repository.ts`, `supabase/migrations/20260522113000_onboarding_checklists.sql`
- **Consideraciones UX**: Solo visible para `rol === "admin"` y solo mientras `first_quote` siga incompleto. En movil usa una guia propia tipo bottom sheet y se pausa si aparece el banner PWA de instalacion. No aparece en `/solicitud/[empresa]` ni en `/presupuesto/[token]`. Se muestra una vez por paso/ruta usando `localStorage` para no interrumpir en cada carga.
- **Riesgos al modificar**: No marcar pasos por UI decorativa ni por visitas pasivas. `channel_ready` y `first_share` deben salir de acciones reales. No romper el flujo de PDF, WhatsApp ni el aislamiento por `organization_id`.

---

## Feature: Analytics / Google Tag / GTM

- **Que hace**: Carga Google Tag Manager de forma global, empuja eventos a `dataLayer` para GA4/Ads y mide pageviews SPA mas eventos comerciales base en captacion, WhatsApp, PDF y cierre.
- **Rutas involucradas**: Global (`app/layout.tsx`), `/`, `/planes`, `/solicitud/[empresa]`, `/presupuesto/[token]`, `/cotizaciones`
- **Archivos principales**:
  - `app/layout.tsx`
  - `src/features/analytics/components/google-tag-provider.tsx`
  - `src/features/analytics/services/google-tag.service.ts`
  - `src/features/analytics/types/google-tag.ts`
  - `app/(landing-web)/page.tsx`
  - `app/(landing-web)/planes/page.tsx`
  - `app/(landing-web)/solicitud/[empresa]/page.tsx`
  - `app/(landing-web)/solicitud/[empresa]/solicitud-empresa-form.tsx`
  - `app/(landing-web)/solicitud/[empresa]/solicitud-empresa-testimonial-form.tsx`
  - `app/(pwa-app)/cotizaciones/page.tsx`
  - `app/presupuesto/[token]/public-quote-mobile.tsx`
- **Componentes principales**: `GoogleTagProvider`, `TrackedExternalLink`
- **Hooks/servicios/actions**: `googleTagService`
- **Tablas Supabase**: Ninguna
- **Flujo de datos**:
  - Root layout -> snippet GTM + `noscript` -> `GoogleTagProvider` -> `googleTagService.trackPageView()`
  - CTA de landing y WhatsApp -> `googleTagService.trackEvent()` / `trackWhatsappClick()`
  - Inicio de formularios publicos y demo -> `googleTagService.trackFormStart()`
  - Intento de envio de formularios publicos -> `googleTagService.trackFormSubmitIntent()`
  - Solicitud publica exitosa -> `googleTagService.trackLeadSubmitted()`
  - Valoracion publica enviada -> `googleTagService.trackTestimonialSubmitted()`
  - Envio de cotizacion por WhatsApp -> `googleTagService.trackWhatsappClick()`
  - Vista/descarga de PDF publico -> `googleTagService.trackPdfAction()`
  - Decision publica de cotizacion -> `googleTagService.trackQuoteDecision()`
- **Estados importantes**: `disabled` (sin IDs configurados), `ready`
- **Donde editar UI**: `app/layout.tsx`
- **Donde editar logica**: `src/features/analytics/services/google-tag.service.ts`
- **Donde editar persistencia**: N/A
- **Consideraciones UX**: El proyecto trae fallback local para GTM (`GTM-N4X44QW6`) y GA4 (`G-Y0LCR4NRDN`), pero los valores preferidos siguen siendo `NEXT_PUBLIC_GTM_CONTAINER_ID` y `NEXT_PUBLIC_GA_MEASUREMENT_ID`. La medicion de Ads usa conversion labels opcionales por evento.
- **Riesgos al modificar**: No duplicar GTM con GA4 directo si el mismo `Measurement ID` ya vive dentro del contenedor. No meter tags ad hoc dentro de rutas criticas. Mantener un solo punto global de carga y centralizar eventos en `googleTagService`.

---

## Feature: Founder Growth Panel

- **Que hace**: Panel privado de growth para el fundador con foco en trabajo diario de prospeccion, follow-up, demos, pilotos, pagos y metas. En esta primera version usa estado local persistido en `localStorage` y separa de forma explicita `Real`, `Manual` y `Mock`.
- **Rutas involucradas**: `/admin/growth`
- **Archivos principales**:
  - `app/admin/growth/page.tsx`
  - `app/admin/growth/page-client.tsx`
  - `app/admin/growth/page.module.css`
  - `src/features/growth/hooks/useGrowthDashboard.ts`
  - `src/features/growth/services/growth-dashboard.service.ts`
  - `src/features/growth/services/growth-access.service.ts`
  - `src/features/growth/repositories/growth-dashboard.repository.ts`
  - `src/features/growth/types/growth-dashboard.ts`
  - `proxy.ts`
- **Componentes principales**: `GrowthPageClient`
- **Hooks/servicios/actions**: `useGrowthDashboard`, `growthDashboardService`, `growthDashboardRepository`, `canAccessGrowthPanel`
- **Tablas Supabase**: Ninguna en esta V1 local
- **Flujo de datos**: Page server -> access guard (`resolveAuthenticatedRouteContext` + `canAccessGrowthPanel`) -> client page -> hook -> service -> repository `localStorage`
- **Estados importantes**: tabs `resumen`, `manuales`, `experimentos`; focus filters `todos`, `followups`, `contactar`, `demos`, `pilotos`
- **Donde editar UI**: `app/admin/growth/`
- **Donde editar logica**: `src/features/growth/services/growth-dashboard.service.ts`
- **Donde editar persistencia**: `src/features/growth/repositories/growth-dashboard.repository.ts`
- **Consideraciones UX**: Ruta standalone fuera de `AppShell`. El CTA principal es `Agregar prospecto`. `Trabajo de hoy` manda la pantalla y la tabla de prospectos debe quedar visible y editable sin scroll excesivo.
- **Riesgos al modificar**: No volver esto un BI decorativo. No mostrar datos mock como reales. No abrir CRM enterprise ni tocar rutas publicas criticas. Mantener acceso restringido a admin allowlist y soportar modo `growth-only` por correo.

---

## Feature: Cotizaciones

- **Que hace**: CRUD completo de cotizaciones: listado con filtros, nueva cotizacion guiada, detalle, PDF, WhatsApp, estados
- **Rutas involucradas**: `/cotizaciones`, `/cotizaciones/nueva`, `/cotizaciones/[id]`
- **Archivos principales**:
  - `app/(pwa-app)/cotizaciones/page.tsx` (listado, 1055 lineas)
  - `app/(pwa-app)/cotizaciones/nueva/page.tsx` (nueva, 1198+ lineas)
  - `app/(pwa-app)/cotizaciones/[id]/page.tsx` (detalle)
  - `app/(pwa-app)/configuracion/empresa/page.tsx` (bloque compacto `Lineas y precios base`)
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
  - `src/features/cotizaciones/services/cotizacion-line-pricing.service.ts`
  - `src/features/cotizaciones/services/component-catalog.service.ts`
  - `src/features/cotizaciones/services/component-suggestions.service.ts`
  - `src/features/cotizaciones/services/glass-recommendations.service.ts`
  - `src/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates.ts`
  - `src/features/cotizaciones/line-templates/services/cotizacion-line-templates.service.ts`
  - `src/features/cotizaciones/line-templates/repositories/cotizacion-line-templates.repository.ts`
  - `src/features/cotizaciones/line-templates/types/cotizacion-line-template.ts`
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
- **Tablas Supabase**: `cotizaciones`, `cotizacion_items`, `cotizacion_line_templates`, `clients`, `projects`, `cotizacion_code_counters`
- **Flujo de datos**:
  - Listado: Page -> `useCotizacionesStore` -> API `/api/cotizaciones/resumen` -> server service -> repositories
  - Nueva: Page -> workflow state (sessionStorage) -> `useCotizacionesStore` -> `cotizacionesAppService` -> repository
  - Detalle: Page -> `useCotizacionesStore.getById()` -> repository
- **Estados importantes**: `borrador`, `creada`, `enviada`, `aprobada`, `rechazada`, `terminada`
- **Donde editar UI**: `app/(pwa-app)/cotizaciones/` (paginas y _components)
- **Donde editar logica**: `src/features/cotizaciones/services/`, `src/features/cotizaciones/hooks/`
- **Donde editar persistencia**: `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
- **Consideraciones UX**: Paginas muy grandes (1000+ lineas). Workflow state persistido en sessionStorage. Paso 2 ahora mezcla cotizacion rapida por linea + medidas, override manual protegido, calculadora secundaria y esquema comercial de hojas para Ventana + Corredera sin afectar precio. Si la cuenta esta vencida, el listado sigue visible pero crear/editar/eliminar deben quedar bloqueados.
- **Riesgos al modificar**: No romper calculos de pricing, auto-creacion de cliente/proyecto, ni generacion de codigo COT-DDMMYY-NNN. No romper PDF ni WhatsApp. `cotizacion_items.linea` ahora guarda snapshot comercial de la linea elegida. No saltarse `assertSubscriptionAllowsWrite()` en acciones privadas.

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
- **Consideraciones UX**: Estado calculado segun actividad reciente cruzando cotizaciones y proyectos. Con trial vencido la vista sigue en lectura, pero alta/edicion/delete quedan bloqueados.
- **Riesgos al modificar**: No romper soft delete ni calculo de estado. `unique_correo_clients` es global (no por org) - bug conocido. No abrir escrituras sin pasar por el guard de suscripcion en `useClientes`.

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
- **Riesgos al modificar**: RUTA CRITICA de captacion. No romper rate limiting, validaciones de telefono chileno, ni UTM tracking. Push notification al crear lead. La captura publica `/solicitud/[empresa]` no depende del trial; solo la gestion privada y los cambios de estado internos deben bloquearse cuando la cuenta vence.

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

---

## Feature: Marketing Video / Remotion

- **Que hace**: Video explicativo comercial de Ventora para landing, WhatsApp, redes y presentaciones
- **Rutas involucradas**: Sin ruta directa. Se renderiza desde `remotion/`
- **Archivos principales**:
  - `remotion/index.tsx`
  - `remotion/Root.tsx`
  - `src/features/video/VentoraExplainer.tsx`
  - `src/features/video/components.tsx`
  - `src/features/video/video-assets.ts`
  - `public/video-assets/`
- **Componentes principales**: `VentoraExplainer`, `SceneWrapper`, `PhoneMockup`, `FloatingMessage`, `StepCard`, `CTAButton`, `GlassGridBackground`, `VentoraLogo`
- **Hooks/servicios/actions**: N/A
- **Tablas Supabase**: Ninguna
- **Flujo de datos**: escenas de Remotion -> assets en `public/video-assets` -> render MP4/vertical
- **Consideraciones UX**: Mantener mobile-first, texto legible y sin palabras tipo leads/CRM/pipeline/funnel
- **Riesgos al modificar**: No romper paths de assets ni compatibilidad con Remotion render/preview
