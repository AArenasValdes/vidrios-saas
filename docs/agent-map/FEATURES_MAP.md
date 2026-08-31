# Features Map - Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: ingeniería

Organizacion por funcionalidad, no por carpetas. Cada feature indica exactamente donde editar UI, logica y persistencia.

Cobertura de rutas validada contra `docs/agent-map/ROUTES_MANIFEST.json`. Si una feature agrega una ruta, actualizar este mapa y ejecutar `pnpm docs:check`.

---

## Feature: Autenticacion

- **Que hace**: Login email/password y Google OAuth unico, PKCE, sesion persistida y alta SaaS inmediata antes de activacion. `/registro` separa visualmente el alta en dos pasos: identidad/acceso y datos de empresa. Solo el segundo confirma la creacion de cuenta, organizacion, perfil regional y trial; Google conserva una pantalla breve solo para completar los datos que OAuth no entrega.
- **Rutas involucradas**: `/login`, `/registro`, `/auth/callback`, `/auth/completar-cuenta`, `/auth/logout`, `/cuenta-vencida`
- **Archivos principales**:
  - `app/(auth-public)/login/page.tsx`
  - `app/(auth-public)/auth/callback/route.ts`
  - `app/(auth-public)/auth/completar-cuenta/page.tsx`
  - `app/api/auth/oauth/complete-registration/route.ts`
  - `app/(auth-public)/auth/logout/route.ts`
  - `src/features/auth/hooks/useAuth.ts`
  - `src/features/auth/services/auth.service.ts`
  - `src/features/auth/services/auth-login-error.service.ts`
  - `src/features/auth/services/auth-login-diagnostics.service.ts`
  - `src/features/auth/services/auth-server.service.ts`
  - `src/features/auth/services/auth-oauth-completion.service.ts`
  - `src/features/auth/repositories/auth.repository.ts`
  - `src/features/auth/repositories/auth-server.repository.ts`
  - `src/features/auth/types/auth.ts`
  - `proxy.ts` (middleware auth)
- **Componentes principales**: `LoginView`, `RegistroView`, `CompletarCuentaView`. `RegistroView` conserva los datos del paso 1 en memoria hasta completar el paso 2; no crea Auth ni registros parciales al avanzar.
- **Hooks/servicios/actions**: `useAuth()`, `authService`, `authServerService`
- **Tablas Supabase**: `auth.users`, `public.users`, `organizations`, `organization_profile`
- **Flujo de datos**: Login form -> `useAuth.signIn()` -> `authService.signIn()` -> `authRepository.signIn()` -> Supabase Auth -> `authRepository.getProfile()` -> `public.users` (organization_id, rol) -> diagnostico local + eventos `login_success` / `login_failure`
- **Flujo Google nuevo/incompleto**: Google -> callback -> `/auth/completar-cuenta?next=/activacion` -> API autenticada -> RPC transaccional -> `/activacion`
- **Estados importantes**: `cargando`, authenticated, unauthenticated
- **Donde editar UI**: `app/(auth-public)/login/page.tsx`
- **Donde editar logica**: `src/features/auth/services/auth.service.ts`
- **Donde editar persistencia**: `src/features/auth/repositories/auth.repository.ts`
- **Consideraciones UX**: Proxy redirige autenticados a `/dashboard`, no autenticados a `/login?next=path`. El logout del shell sale por `/auth/logout` para evitar carreras entre App Router y cookies SSR. Al volver desde background/foco, el hook revalida sesion sin vaciar la UI. El login espera la cookie antes de redirigir y guarda un buffer local de diagnosticos para distinguir credencial invalida real vs cookie/PWA/red/perfil.
- **Consideraciones UX**: Proxy redirige autenticados a `/dashboard`, no autenticados a `/login?next=path`. El logout del shell sale por `/auth/logout` para evitar carreras entre App Router y cookies SSR. Al volver desde background/foco, el hook revalida sesion sin vaciar la UI. El login espera la cookie antes de redirigir y guarda un buffer local de diagnosticos para distinguir credencial invalida real vs cookie/PWA/red/perfil. La pantalla de login tambien permite ver/ocultar contrasena y reiniciar el estado local de la app en ese dispositivo cuando navegador web si entra pero la PWA instalada no.
- **Consideraciones UX**: Proxy redirige autenticados a `/dashboard`, no autenticados a `/login?next=path`. El logout del shell sale por `/auth/logout` para evitar carreras entre App Router y cookies SSR. Al volver desde background/foco, el hook revalida sesion sin vaciar la UI. El login espera la cookie antes de redirigir y guarda un buffer local de diagnosticos para distinguir credencial invalida real vs cookie/PWA/red/perfil. La pantalla de login tambien permite ver/ocultar contrasena y reiniciar el estado local de la app en ese dispositivo cuando navegador web si entra pero la PWA instalada no. El prompt de instalacion PWA tiene fallback visual para Opera/Android con mockup simple del navegador y highlight orientativo del `menu O`.
- **Registro regional**: `/registro` ofrece Chile, Argentina, Colombia, Mexico, Peru y Uruguay con moneda, locale, prefijo, etiqueta tributaria y telefono por preset. Esto no implica cobro local: checkout directo permanece habilitado inicialmente solo para Chile.
- **Riesgos al modificar**: Google es el unico OAuth; Facebook legacy solo permanece como dato social fuera de auth. La RPC usa `service_role`, lock transaccional y upsert; no exponerla a `anon`/`authenticated`. El alta por correo debe crear Auth y llamar la misma RPC en servidor, con compensacion si falla; no pedir telefono nuevamente en login u onboarding.

---

## Feature: Trial, Suscripcion y Billing

- **Que hace**: Controla la prueba gratuita de 15 dias para altas nuevas, el contrato recurrente y su ledger. El catalogo V2 ofrece Ventora Cotización ($6.990/$59.990) y Ventora Comercial ($9.990/$89.990) en mensual/anual; la disponibilidad de Mercado Pago exige cuatro IDs server-side y la configuracion de Production ya esta cargada, con smoke final pendiente. Flow y Webpay Plus estan retirados del runtime y solo se conservan como evidencia historica. Una cuenta vencida conserva lectura y bloquea escrituras privadas.
- **Estado pasarela**: `MERCADOPAGO_BILLING_ENABLED=true` + variables `MERCADOPAGO_CL_*` completas en Vercel. Fuente operativa: `docs/billing/README.md`.
- **Preparacion LATAM Fase 6**: `mercadopago-market.config.ts` separa secretos, plan IDs, bandera y moneda por mercado. Solo Chile tiene precios comerciales definidos; PE/CO/AR/UY/MX permanecen sin precio y apagados. El checkout actual rechaza en servidor organizaciones fuera de Chile para no cobrar CLP por error.
- **Rutas involucradas**: `/dashboard`, `/cotizaciones`, `/cotizaciones/nueva`, `/clientes`, `/clientes/nuevo`, `/clientes/[id]/editar`, `/solicitudes`, `/solicitudes/canales`, `/configuracion/*`, `/cuenta-vencida`
- **Archivos principales**:
  - `src/features/subscriptions/types/subscription.ts`
  - `src/features/subscriptions/services/subscription-status.service.ts`
  - `src/features/subscriptions/services/subscription-route-access.service.ts`
  - `src/features/subscriptions/repositories/pago-suscripcion.repository.ts`
  - `src/features/subscriptions/repositories/organization-subscription.repository.ts`
  - `src/features/subscriptions/providers/mercadopago/*`
  - `src/features/subscriptions/services/mercadopago-checkout.service.ts`
  - `src/features/subscriptions/services/mercadopago-webhook.service.ts`
  - `src/features/billing/types/plans.ts`
  - `src/features/billing/types/payment-provider.ts`
  - `src/features/billing/hooks/useBillingCheckout.ts` (compatibilidad; delega a Mercado Pago)
  - `src/features/billing/providers/flow.provider.ts` (legacy no registrado en runtime)
  - `src/features/billing/providers/manual-transfer.provider.ts` (legacy no registrado en runtime)
  - `src/features/billing/providers/webpay-plus.provider.ts` (legacy no registrado en runtime)
  - `src/features/billing/services/billing-checkout.service.ts`
  - `src/features/billing/services/billing-subscription.service.ts`
  - `src/features/billing/services/payment-provider-registry.ts`
  - `src/features/organization-profile/repositories/organization-profile.repository.ts`
  - `src/features/organization-profile/services/organization-profile.service.ts`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `src/components/layout/app-shell.tsx`
  - `src/components/layout/app-shell.module.css`
  - `app/(subscription-gate)/cuenta-vencida/page.tsx`
  - `app/(subscription-gate)/cuenta-vencida/page-content.tsx`
  - `app/(subscription-gate)/cuenta-vencida/page.module.css`
  - `app/(subscription-gate)/layout.tsx`
  - `app/api/billing/checkout/route.ts`
  - `app/api/billing/flow/confirmar/route.ts` (retirado; 410)
  - `app/api/subscriptions/webpay/crear/route.ts` (retirado; 410)
  - `app/api/subscriptions/webpay/confirmar/route.ts` (retirado; 410)
  - `app/api/subscriptions/mercadopago/create/route.ts`
  - `app/api/subscriptions/mercadopago/webhook/route.ts`
  - `app/api/solicitudes/route.ts`
  - `app/api/organization-assets/upload/route.ts`
  - `app/api/public-landing/revalidate/route.ts`
  - `proxy.ts`
  - `supabase/migrations/20260525121500_trial_subscriptions_manual_activation.sql`
  - `supabase/migrations/20260530100000_pagos_suscripcion.sql`
  - `supabase/migrations/20260602062145_billing_flow_provider.sql`
  - `supabase/migrations/20260812230428_billing_phase_1_recurring_core.sql`
  - `supabase/migrations/20260812233117_billing_phase_2_mercadopago_chile.sql`
  - `supabase/migrations/20260831120000_preserve_founder_price_lock.sql`
- **Componentes principales**: `AppShell`, pantalla `Cuenta vencida`
- **Hooks/servicios/actions**: `useOrganizationProfile()`, `resolveOrganizationSubscriptionState()`, `canAccessPrivatePathWithSubscription()`, `assertSubscriptionAllowsWrite()`
- **Tablas Supabase**: `organization_profile`, `organizations`, `suscripciones_organizacion`, `pagos_suscripcion`
- **Flujo de datos**:
  - Login y rutas privadas -> `useOrganizationProfile()` -> `organizationProfileService` -> repository -> `organization_profile`
  - Snapshot crudo -> `resolveOrganizationSubscriptionState()` -> estado efectivo (`trial_active`, `trial_expiring`, `trial_expired`, `active`, `past_due`, `cancelled`)
  - Shell privado -> banner / redirect a `/cuenta-vencida` / guard de acciones
  - APIs privadas de escritura -> guard server-side -> `403` si la cuenta esta vencida
  - Mercado Pago Chile: `/cuenta-vencida` -> `useMercadoPagoSubscriptionCheckout()` -> POST `/api/subscriptions/mercadopago/create` -> redirect a Mercado Pago -> webhook firmado -> `pagos_suscripcion` / `suscripciones_organizacion` reconciliados server-side.
  - Pasarelas legacy: Flow, Webpay Plus y el checkout provider-agnostic responden `410 Gone`; la unica pasarela activa es Mercado Pago Chile.
- Mercado Pago Chile: `/cuenta-vencida` -> POST create autenticado -> reserva recurrente unica -> plan/monto validados en API MP -> retorno informativo -> webhook HMAC -> GET de recurso real -> RPC idempotente -> suscripcion + ledger + proyeccion. `/cuenta/suscripcion` muestra periodo/cobro y permite cancelar renovacion solo con configuracion completa; un `past_due` conserva escritura durante una gracia configurable (3 dias por defecto) y un pago aprobado vuelve a `active`.
- **Estados importantes**: `trial_active`, `trial_expiring`, `trial_expired`, `active`, `past_due`, `cancelled`
- **Donde editar UI**: `src/components/layout/app-shell.tsx`, `app/(pwa-app)/cuenta-vencida/`
- **Donde editar logica**: `src/features/subscriptions/services/`, `src/features/billing/`
- **Donde editar persistencia**: `src/features/organization-profile/repositories/organization-profile.repository.ts`, `src/features/subscriptions/repositories/pago-suscripcion.repository.ts`, `supabase/migrations/20260525121500_trial_subscriptions_manual_activation.sql`, `supabase/migrations/20260530100000_pagos_suscripcion.sql`, `supabase/migrations/20260602062145_billing_flow_provider.sql`
- **Consideraciones UX**: El usuario puede entrar y leer. Con Mercado Pago configurado, `/cuenta-vencida` ofrece checkout de las cuatro variantes Chile. Sin configuracion completa muestra el estado operativo sin ofrecer una contratacion alternativa. Al volver atras y cambiar de plan se reutiliza el checkout del mismo plan o se libera la reserva pendiente. La URL de retorno solo informa que se esta confirmando; nunca activa. Una cuenta activa, incluso founder sin vencimiento, no puede crear otro checkout. Cancelar renovacion no revoca el periodo ya pagado.
- **Riesgos al modificar**: No romper rutas publicas ni lectura basica. Mercado Pago exige firma valida y consulta real antes de mutar; nunca confiar en body o query string. Monto/moneda/tenant solo servidor. No exponer secretos ni `provider_response`. Ver `docs/billing/README.md` y `docs/billing/BILLING_PHASE_2_MERCADOPAGO_CHILE.md`.

### Addendum cuentas internas gratis permanentes

- Organizaciones `3` (`admin@test.com`) y `4` (`sanmarcoaluminios@gmail.com`) son cuentas internas de Ventora/fundadores.
- Migracion: `supabase/migrations/20260602065826_founder_free_internal_accounts.sql`.
- Estado esperado: `subscription_status='active'`, `plan_type='founder'`, `plan_code='founder_full'`, `subscription_ends_at=NULL`, `founder_price_locked=true`.
- Estas cuentas no deben caer a modo lectura ni pedir pago.

---

## Feature: Dashboard

- **Que hace**: Tablero comercial real del producto actual (Fase 5). Empuja el flujo maestro **cotizar → PDF → WhatsApp**: valor cotizado, cola **Por enviar**, PDF/aprobadas, recientes. No es CRM ni seguimiento.
- **Rutas involucradas**: `/dashboard`
- **Brief de diseño / Fase 5**: `docs/design/FASE_5_DASHBOARD_BRIEF.md` + roadmap § Fase 5 (**estado: implementado**)
- **Archivos principales**:
  - `app/(pwa-app)/dashboard/page.tsx`
  - `app/(pwa-app)/dashboard/_components/mobile/dashboard-mobile.tsx`
  - `app/(pwa-app)/dashboard/_components/desktop/dashboard-desktop.tsx`
  - `app/(pwa-app)/dashboard/_components/desktop/dashboard-monthly-trend-chart.tsx`
  - `app/(pwa-app)/dashboard/_hooks/use-dashboard-summary.ts`
  - `app/(pwa-app)/dashboard/_hooks/use-dashboard-view-model.ts`
  - `app/(pwa-app)/dashboard/_hooks/use-dashboard-breakpoint.ts`
  - `src/features/dashboard/services/dashboard-summary-server.service.ts`
  - `src/features/dashboard/services/dashboard-pending-send.service.ts`
  - `src/features/dashboard/services/dashboard-monthly-totals.service.ts`
  - `src/features/dashboard/types/dashboard-summary.ts`
  - `app/api/dashboard/summary/route.ts`
- **Componentes principales**: `DashboardDesktop`, `DashboardMobile`, `DashboardMonthlyTrendChart`
- **Hooks/servicios/actions**: `useDashboardViewModel`, `useDashboardSummary`, `useDashboardBreakpoint`
- **Tablas Supabase**: `cotizaciones`, `clients`, `projects`, `solicitudes_contacto`
- **Flujo de datos**: Page -> `useDashboardViewModel` -> `useDashboardSummary` -> API `/api/dashboard/summary` -> `dashboardSummaryServerService` -> repositories directos
- **Estados importantes**: isLoading, isReady, isEmpty; KPIs `quotedTotal`, `pdfGeneratedCount`, `approvedCount`, `totalCount`, `monthCount`, `approvedTodayCount`. Fase 5 V1 agrega cola **Por enviar** (Creada/PDF generado sin cierre de envío/aprobación) sin métrica hero de seguimiento.
- **Donde editar UI**: `app/(pwa-app)/dashboard/_components/` (desktop ya montado; solo pulido fino, no reabrir CRM)
- **Donde editar logica**: `app/(pwa-app)/dashboard/_hooks/use-dashboard-view-model.ts`, `src/features/dashboard/services/dashboard-summary-server.service.ts`
- **Donde editar persistencia**: `app/api/dashboard/summary/route.ts` (usa repositories directamente)
- **Consideraciones UX**: Breakpoint dashboard desktop **1024px** (mobile sin cambios). KPI hero = **Valor cotizado este mes** + tendencia 6 meses real. Cola accionable = **Por enviar** (PDF/WhatsApp). Alertas de respuesta publica solo si existen. Estados neutrales via `cotizacion-display-state.service.ts`. Sidebar desktop grafito + logo Ventora. No CRM ni cobros.
- **Riesgos al modificar**: No romper orquestacion de hooks ni formateo de moneda. No reintroducir "presupuestos pendientes" ni seguimiento como alerta dominante. No agregar KPIs mock. No romper contrato mobile del summary.

---

## Feature: Onboarding de activacion (`/activacion`)

- **Que hace**: Wizard mobile-first **separado del dashboard** para admins sin cotizaciones. Primer logro = crear cotizacion + ver PDF. Opcional: datos de empresa. Persiste cierre en `activation_complete`.
- **Rutas involucradas**: `/activacion`, `/dashboard` (gate redirect), `/print/cotizaciones/[id]`, `/configuracion/empresa` (opcional post-wizard)
- **Documentacion completa**: `docs/agent-map/ACTIVATION_ONBOARDING.md`
- **Archivos principales**:
  - `app/(pwa-app)/activacion/page.tsx`
  - `app/(pwa-app)/activacion/page.module.css`
  - `src/features/onboarding/services/onboarding-activation-flow.service.ts`
  - `src/features/onboarding/hooks/useActivationGate.ts`
  - `app/api/onboarding/activation/status/route.ts`
  - `src/features/onboarding/components/onboarding-video-guide.tsx`
  - `app/api/onboarding/videos/route.ts`
  - `supabase/migrations/20260619120000_onboarding_activation_complete.sql`
  - `src/components/layout/app-shell.tsx` (shell minimal)
  - `proxy.ts`
- **Modos de cotizacion**:
  - Demo fijo (por_item, ventana ejemplo)
  - Real rapida por total (`total_global`, sin items ficticios)
  - Real con componentes (`por_item`, PDF igual al productivo)
- **Hooks/servicios**: `useActivationGate`, `buildActivation*Draft`, `finalizeActivationDraftForSave`, `buildActivationQuoteSummary`
- **Tablas Supabase**: `onboarding_checklists`, `cotizaciones`, `cotizacion_items`, `organization_profile`, `growth_onboarding_videos`, `growth_onboarding_assignments`, `growth_onboarding_events`
- **Fase B (2026-08-20)**: el video no es un requisito de entrada ni reemplaza el wizard. El founder publica una vez un predeterminado `listo` con URL HTTPS para móvil y otro para escritorio; `/activacion` entrega el correspondiente automáticamente a cada cuenta nueva. Las asignaciones son sólo fallback de piloto. La primera cotización y el primer PDF quedan registrados por triggers; no agregar llamadas cliente para esos hitos.
- **Consideraciones UX**: Sin bottom nav en `/activacion`. `?replay=1` para QA. PDF vuelve a guia con `?from=activacion`. Resumen explica neto vs IVA.
- **Riesgos**: No abrir wizard completo de `/cotizaciones/nueva` aqui. No reintroducir card en dashboard. Total global debe permitir guardado sin items.

---

## Feature: Onboarding Comercial Guiado (checklist)

- **Que hace**: Checklist admin-only con persistencia por organizacion. Pasos derivados (`first_quote`, empresa minima, `first_share`). **La entrada principal de primera cotizacion es `/activacion`**. No se montan tours ni overlays dentro de las rutas privadas; el dashboard conserva solo una tarjeta de respaldo para cuentas antiguas sin activacion inicial.
- **Rutas involucradas**: `/configuracion/empresa?inicio=1`, `/cotizaciones`, `/cotizaciones/[id]`, `/print/cotizaciones/[id]`
- **Archivos principales**:
  - `src/features/onboarding/types/onboarding-checklist.ts`
  - `src/features/onboarding/repositories/onboarding-checklist.repository.ts`
  - `src/features/onboarding/services/onboarding-checklist.service.ts`
  - `src/features/onboarding/hooks/useOnboardingChecklist.ts`
  - `src/features/onboarding/components/onboarding-guide.tsx` (legacy)
  - `supabase/migrations/20260522113000_onboarding_checklists.sql`
- **Hooks/servicios/actions**: `useOnboardingChecklist`, `onboardingChecklistService`
- **Tablas Supabase**: `onboarding_checklists`, `organization_profile`, `cotizaciones`
- **Consideraciones UX**: Primera cotizacion guiada -> `/activacion`. Una cuenta que completa u omite esa activacion no vuelve a ver la tarjeta de respaldo en dashboard.
- **Riesgos**: No duplicar UX de activacion en dashboard. `first_share` requiere accion real de compartir.

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

## Feature: Centro de Operaciones Founder

- **Que hace**: Crea un backoffice interno separado del panel cliente. Da shell propio para founder, resumen global de clientes SaaS, tabla de organizaciones y ficha por organizacion con trial/suscripcion/pagos.
- **Rutas involucradas**: `/admin`, `/admin/clientes`, `/admin/clientes/[organizationId]`
- **Archivos principales**:
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `app/admin/clientes/page.tsx`
  - `app/admin/clientes/[organizationId]/page.tsx`
  - `app/admin/admin.module.css`
  - `src/features/admin/components/admin-shell.tsx`
  - `src/features/admin/components/admin-sidebar.tsx`
  - `src/features/admin/config/admin-nav.config.ts`
  - `src/features/admin/components/admin-kpi-card.tsx`
  - `src/features/admin/components/client-status-badge.tsx`
  - `src/features/admin/components/source-badge.tsx`
  - `src/features/auth/services/logout-navigation.service.ts`
  - `src/features/admin/services/admin-access.service.ts`
  - `src/features/admin/services/admin-dashboard.service.ts`
  - `src/features/admin/services/admin-dashboard-metrics.logic.ts`
  - `src/features/admin/components/admin-dashboard-workspace.tsx`
  - `src/features/admin/services/admin-clients.service.ts`
  - `src/features/admin/repositories/admin-clients.repository.ts`
  - `src/features/admin/types/admin-client.ts`
  - `src/features/admin/types/admin-summary.ts`
  - `proxy.ts`
- **Componentes principales**: `AdminShell`, `AdminSidebar`, `AdminKpiCard`, `ClientStatusBadge`, `SourceBadge`
- **Hooks/servicios/actions**: acceso founder via `resolveVentoraAdminRouteContext`, resumen de dueño via `getAdminDashboard()`, listado/ficha via `adminClientsService`
- **Tablas Supabase**: `organizations`, `organization_profile`, `users`, `pagos_suscripcion`
- **Flujo de datos**:
  - Login founder -> `proxy.ts` redirige por defecto a `/admin`
  - `app/admin/layout.tsx` -> guard server-side founder allowlist -> `AdminShell`
  - Page server -> service -> repository -> `createAdminClient()` -> Supabase
  - Estado de trial/suscripcion se recalcula con `resolveOrganizationSubscriptionState()`
- **Estados importantes**: `active`, `trial_active`, `trial_expiring`, `trial_expired`, `past_due`, `cancelled`
- **Donde editar UI**: `app/admin/*`, `src/features/admin/components/*`
- **Donde editar logica**: `src/features/admin/services/*`
- **Donde editar persistencia**: `src/features/admin/repositories/admin-clients.repository.ts`
- **Consideraciones UX**: No reutiliza `AppShell`. `/admin` abre con caja del mes calendario de Chile (solo pagos aprobados), separa primeras compras de renovaciones y muestra uso real del producto excluyendo pruebas. No presentar ese monto como MRR, meta ni ventana móvil. La lista `growth_prospects` es prospección saliente, no leads captados.
- **Riesgos al modificar**: No permitir acceso a admins normales de una organizacion. No mezclar esta capa con CRUD de clientes finales `/clientes`. Mantener `service_role` solo en servidor. No volver a poner `<Link href="/auth/logout">` en el sidebar founder (invalida cookies por prefetch/soft-nav).

---

## Feature: Founder Growth Panel

- **Que hace**: Panel privado del fundador con tabs operativas: trabajo de hoy, prospectos, clientes/pagos y marketing/tareas. Persiste en Supabase (`growth_*`) con import idempotente desde `localStorage` v3 y separa `Real`, `Manual` y `Mock`. El control editorial vive en `/admin/marketing`; comienza con dos videos base de onboarding, creación de una pieza desde guiones base y uso real del cotizador; prospección y páginas públicas quedan como datos secundarios. La adopción excluye cuentas `is_test_account`, incluida rápida por ítems desde su instrumentación. Su bloque de prospectos se etiqueta como prospección saliente: no confundirlo con leads captados ni usarlo para atribuir anuncios. El onboarding automático vive en `/admin/marketing/onboarding`, sin mezclar contenido, activación y datos personales de clientes.
- **Rutas involucradas**: `/admin/growth`, `/api/admin/growth/*`
- **Archivos principales**:
  - `app/admin/growth/page.tsx`
  - `app/admin/growth/page-client.tsx`
  - `app/admin/growth/page.module.css`
  - `app/api/admin/growth/**`
  - `src/features/growth/hooks/useGrowthDashboard.ts`
  - `src/features/growth/client/growth-api.client.ts`
  - `src/features/growth/client/growth-content-api.client.ts`
  - `src/features/growth/hooks/use-growth-content.ts`
  - `src/features/growth/services/growth-content.service.ts`
  - `src/features/growth/repositories/growth-content.repository.ts`
  - `src/features/growth/types/growth-content.ts`
  - `src/features/admin/components/admin-marketing-content-control.tsx`
  - `src/features/growth/services/growth-*.service.ts`
  - `src/features/growth/repositories/growth-*.repository.ts`
  - `src/features/growth/types/growth-dashboard.ts`
  - `src/features/growth/types/growth-supabase.ts`
  - `supabase/migrations/20260627120000_growth_workspace.sql`
  - `proxy.ts`
- **Componentes principales**: `GrowthPageClient`
- **Hooks/servicios/actions**: `useGrowthDashboard`, `growthApiClient`, `resolveGrowthRouteContext`, repositories Supabase
- **Tablas Supabase**: `growth_workspaces`, `growth_workspace_members`, `growth_prospects`, `growth_activities`, `growth_tasks`, `growth_content_items`
- **Flujo de datos**: guard founder -> hook -> fetch API -> service -> repository Supabase (RLS por membership)
- **Estados importantes**: tabs `trabajo`, `prospectos`, `clientes`, `marketing`; cola editorial `borrador -> revisión -> aprobado -> programado -> publicado -> pausado -> ganador -> archivado`. El servidor bloquea `programado`/`publicado` sin claim aprobado y UTM `source`, `medium`, `campaign`, `content`.
- **Donde editar UI**: `app/admin/growth/`
- **Donde editar logica**: `src/features/growth/services/`
- **Donde editar persistencia**: `src/features/growth/repositories/` + migraciones SQL
- **Consideraciones UX**: Vive dentro de `AdminShell`. CTA principal: `Agregar prospecto`. Import desde navegador con backup JSON.
- **Riesgos al modificar**: No mezclar con `solicitudes_contacto`. No usar `organization_id` como dueno de prospectos pre-conversion. KPI cross-tenant solo en `growth-kpi.service.ts` post-guard.

---

## Feature: Cotizaciones

- **Que hace**: CRUD completo de cotizaciones: listado con filtros, nueva cotizacion guiada, detalle, PDF, WhatsApp y estados. Desktop comercial y Quote Studio Fase 1 ya estan cerrados para demo; solo tocar UX con bug o pedido concreto, sin romper mobile.
- **Rutas involucradas**: `/cotizaciones`, `/cotizaciones/nueva`, `/cotizaciones/[id]`
- **Archivos principales**:
  - `app/(pwa-app)/cotizaciones/page.tsx` (listado desktop/mobile)
  - `app/(pwa-app)/cotizaciones/nueva/page.tsx` (nueva / Quote Studio)
  - `app/(pwa-app)/cotizaciones/[id]/page.tsx` (detalle; switch desktop ≥1024 / mobile)
  - `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-desktop-view.tsx`
  - `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-desktop.module.css`
  - `app/(pwa-app)/configuracion/empresa/page.tsx` (bloque compacto `Lineas y precios base`)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-uno-datos-cliente.tsx` (desktop integra buscador, datos del trabajo y selector compacto de metodo de presupuesto)
  - `app/(pwa-app)/cotizaciones/nueva/_components/resumen-desktop-lateral.tsx` (desktop: resumen sticky con accion unica de continuar al presupuesto)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-modo-cotizacion.tsx` (fallback/selector inicial de Paso 2; mobile lo sigue usando)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-item-libre-form.tsx` (formulario standalone de item libre con preview)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-agregar-grupo-sheet.tsx` (desktop embebido: editor comercial de pieza en 4 pasos Tipo/Sistema/Medidas/Precio; modo total usa cuaderno comercial)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-configuracion-movil.tsx` (configuracion mobile; oculta Material/Color perfil para `Espejo` y `Cubierta de mesa`)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-vidrio-movil.tsx` (seccion **Espejos** con espesores recomendados 3?6 mm)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-formulario-bloque-configuracion.tsx` (material condicional desktop)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-formulario-bloque-vidrio.tsx` (bloque vidrio/espejos desktop)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-formulario-bloque-ajustes.tsx` (color avanzado solo con perfileria)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/quote-studio-financial-panel.tsx` (Fase 1 desktop-only >=1024; panel financiero derivado de datos actuales)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-lista-movil.tsx` (oculta chips material/color en espejo/cubierta)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-footer-movil.tsx` (footer dinamico: "Agregar item" / "Agregar componente")
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-movil-shell.tsx` (orquestador mobile, stages dinamicos)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-movil.state.ts` (validacion de estado para items libres)
  - `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-precio-movil.tsx` (selector de precio con `hideMargenOption`)
  - `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo.ts` (hook desktop con `ivaMode`, salto de pasos para items libres)
  - `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo-movil.ts` (hook mobile, idem)
  - `src/features/cotizaciones/hooks/useCotizacionesStore.ts` (746 lineas)
  - `src/features/cotizaciones/hooks/useCotizacionAlerts.ts`
  - `src/features/cotizaciones/services/cotizaciones.service.ts` (710 lineas, rehidratacion de `item_libre_con_valor` desde DB)
  - `src/features/cotizaciones/services/cotizaciones-workflow.service.ts` (~550 lineas, `calculateFreeValueItem`, `calculateCotizacionWorkflowTotals` con soporte IVA, `cloneCotizacionAsDraft`)
  - `src/features/cotizaciones/services/cotizaciones-summary.service.ts`
  - `src/features/cotizaciones/services/cotizacion-alerts.service.ts`
  - `src/features/cotizaciones/services/cotizacion-display-state.service.ts`
  - `src/features/cotizaciones/services/cotizacion-line-pricing.service.ts`
  - `src/features/cotizaciones/services/quote-studio-financial.service.ts` (calculo Fase 1: margen real, markup equivalente, precio recomendado neto y snapshot seguro sin base de costo)
  - `src/features/cotizaciones/services/component-catalog.service.ts` (catalogo con categoria `"Proyecto libre y Mantencion"`, flag `esItemLibre`, helper `isFreeValueComponentType()`)
  - `src/features/cotizaciones/services/component-suggestions.service.ts`
  - `src/features/cotizaciones/services/glass-recommendations.service.ts`
  - `src/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates.ts`
  - `src/features/cotizaciones/line-templates/services/cotizacion-line-templates.service.ts`
  - `src/features/cotizaciones/line-templates/repositories/cotizacion-line-templates.repository.ts`
  - `src/features/cotizaciones/line-templates/types/cotizacion-line-template.ts`
  - `src/features/cotizaciones/repositories/cotizaciones-repository.ts` (1486 lineas)
  - `src/features/cotizaciones/types/cotizacion.ts`
  - `src/features/cotizaciones/types/cotizacion-item.ts` (tipo `item_libre_con_valor`)
  - `src/features/cotizaciones/types/cotizacion-workflow.ts` (`tipoItem` field)
  - `src/features/cotizaciones/types/quote-pricing-mode.ts`
  - `src/features/cotizaciones/types/pricing-mode.ts`
  - `src/features/cotizaciones/new-quote/workflow-ui.ts` (`shouldRequireProfileMaterialForComponent`, `MIRROR_GLASS_THICKNESS_OPTIONS`, grupo `Espejos` en `GLASS_OPTIONS`, `buildFreeValueItemFromForm`, `buildQuickEditDraft`, `isWorkflowItemComplete`, `applyQuickEditDraftStatesToItems`)
  - `src/features/cotizaciones/new-quote/__tests__/profile-material-regression.test.ts` (regresion catalogo completo: solo Espejo/Cubierta omiten perfil)
  - `src/features/cotizaciones/new-quote/solicitud-prefill.ts`
  - `src/utils/cotizacion-pdf.ts` (703 lineas)
  - `src/utils/cotizacion-approval.ts`
  - `src/utils/cotizacion-item-presentation.ts` (metadata IVA, displayMode, netoCalculado)
  - `src/utils/whatsapp.ts` (mensaje usa total global, independiente de tipo de item)
  - `src/utils/window-drawings.ts` (1074 lineas)
  - `src/constants/impuestos.ts` (IVA 19%)
  - `src/constants/component-colors.ts`
  - `app/api/cotizaciones/resumen/route.ts`
  - `app/api/cotizaciones/[id]/pdf-descargado/route.ts`
- **Componentes principales**: `CotizacionMobileCard`, `CotizacionesMobileSummary`, `CotizacionesFilterFields`, `CotizacionDetalleDesktopView`, `CotizacionDetalleMobileView`, `PasoDosModoCotizacion`, `PasoDosItemLibreForm`, `PasoDosWizardFooterMovil`, `PasoDosWizardPrecioMovil`
- **Hooks/servicios/actions**: `useCotizacionesStore`, `useCotizacionAlerts`, `cotizacionesAppService`, `cotizacionesWorkflowService`, `cotizacionesRepository`, `resolveCotizacionWorkflowState`, `resolveCotizacionClosureState`, `isFreeValueComponentType`
- **Tablas Supabase**: `cotizaciones`, `cotizacion_items`, `cotizacion_line_templates`, `clients`, `projects`, `cotizacion_code_counters`
- **Flujo de datos**:
  - Listado: Page -> `useCotizacionesStore` -> API `/api/cotizaciones/resumen` -> server service -> repositories
- Nueva: Page -> workflow state (sessionStorage) -> `useCotizacionesStore` -> `cotizacionesAppService` -> repository
- Snapshot regional: al crear, `cotizacionesAppService` consulta `organization_profile` y persiste `cotizaciones.regional_snapshot`; al editar lo preserva. PDF, vista/enlace publico y WhatsApp usan ese snapshot; historicas sin valor quedan en fallback Chile.
  - Snapshot financiero Fase 1: `cotizacionesAppService.saveWorkflow()` -> `buildQuoteStudioFinancialSummary()` -> campos existentes `cotizaciones.costo_total`, `cotizaciones.margen_pct`, `cotizaciones.utilidad_total`
  - Item libre: wizard/sheet -> categoria "Proyecto libre y Mantencion" -> subtipo -> formulario simplificado (nombre, descripcion, valor, IVA) -> `buildFreeValueItemFromForm` -> `calculateFreeValueItem` -> `item_libre_con_valor`
  - Detalle: Page -> `useCotizacionesStore.getById()` -> repository
  - PDF descargado: `/print/cotizaciones/[id]` -> `recordPdfDownload()` -> API `/api/cotizaciones/[id]/pdf-descargado` -> `markWorkflowPdfDownloaded()` -> `cotizaciones.pdf_descargado_en`
- **Estados importantes**: DB `borrador`, `creada`, `enviada`, `aprobada`, `rechazada`, `terminada`; UI visible via `cotizacion-display-state.service.ts`: **Creada**, **PDF generado**, **Enviada**, **Aprobada**, **Rechazada**, **Terminada**, **Sin cierre registrado**
- **Donde editar UI**: `app/(pwa-app)/cotizaciones/` (paginas y _components)
- **Donde editar logica**: `src/features/cotizaciones/services/`, `src/features/cotizaciones/hooks/`
- **Prioridad de roadmap**:
  - Milestone 0: estabilizar cotizacion desktop actual — cerrado.
  - Fase 1 Quote Studio desktop — **cerrada con QA** (2026-07-09 + pulidos 18-07); no reabrir alcance sin bug/demo.
  - Fase 3 V2 (activo, QA UX + smoke PDF + hydrate formal OK 2026-07-18): constructor visual guiado en wizard desktop Paso 2 tras **Personalizado** (Ventana: sistema; Puerta/otros: config o esquema), en tipo **Trabajo personalizado**, y al editar pieza (tab Configuración). Lecturas priorizan `cotizacion_item_visual_configs`. Extensión formas V1: marco `rect|arch_top|rounded` + vidrio `rect|rounded` por módulo (solo visual; sin precio ni pauta curva). QA: `CHANGELOG_AGENT_MAP.md`.
- **Constructor-cuaderno desktop (2026-07-19/20)**: Paso 2 ofrece modo explicito **Constructor** con siete presets, varias piezas sobre el mismo `draft.items`, medidas/cantidad inline, estados concretos, inspector 390px, paleta `COLOR_OPTIONS`, menu de acciones, progreso y ordenamiento. Usa un unico scroll vertical; tarjetas responden 1/2/3 columnas segun viewport. Schema V2 suma `oscilobatiente` y `openingSide` de forma aditiva. Persistencia formal sin cambios. Handoff: `docs/agent-map/CONSTRUCTOR_DESKTOP_HANDOFF.md`.
- **Constructor móvil Paso 2 (2026-07-27)**: Selector móvil = **2 opciones** (`por_item` / cuadernillo `total_global`). Dentro de **por ítems**, toggle liviano **Guiada | Constructor** sobre la misma cotización. Guiada = wizard; Constructor = `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/` (nombre interno heredado). El toggle solo aparece en el subpaso **Tipo** y en la lista de piezas; se oculta en **Cantidad** y **Datos**. **Cambiar modalidad** vuelve al selector de 2 cards. La línea global es compacta, aplica solo perfiles y actualiza las piezas por lote; cristal queda en el selector por pieza. La edición rápida es transaccional hasta **Guardar cambios**, permite material Aluminio/PVC, color visible, líneas de Aluminio/PVC/Cristal y preview confirmado con `colorHex`. El editor de composición full-screen usa `GuidedVisualConfig`; `Reflejar` solo se habilita para módulos con apertura lateral. Desktop `>=1024` intacto. Handoff operativo: `docs/agent-map/MOBILE_COTIZACION_FLOW_HANDOFF.md`.
- **Métrica de adopción (2026-08-21)**: `cotizaciones.creation_surface` guarda la superficie final de cotizaciones nuevas: `mobile_guiada`, `mobile_constructor`, `desktop_guiada`, `desktop_constructor` o `total_global`. `/admin/marketing` compara Guiada vs Constructor y separa Constructor móvil/PC; el histórico `NULL` queda fuera de la comparación y cualquier organización `is_test_account=true` queda excluida.
- **Activo**: catalogo privado (`cotizacion_line_templates`) con import Excel/CSV/PDF tecnico. **Fase 2A/2B cerradas**. UI ficha: `lineas-precios-page-client.tsx` + wizard `line-template-form-wizard.tsx`. Constructor visual **V2**.
- **Fase actual**: **Fase 4 — V1 vendible multi-tipología** (2026-07-24). Pack `fabricationRecipePack` + espejo `fabricationRecipe`; plantillas L5000/L20/L25 sugeridas; bases tipológicas pendientes; filtro tipología en cotizar; print fabricación interno. Giro: `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`. Handoff: `CUBICACION_PAUTA_HANDOFF.md`.
- **Archivos críticos cubicación**: `types/fabrication-recipe.ts`, `types/fabrication-recipe-commercial-templates.ts`, `types/fabrication-quote-summary.ts`, `services/fabrication-recipe.service.ts`, `components/fabrication-recipe-editor.tsx`, snapshot `cotizacion-line-template-cubication-snapshot.ts`, panel `pauta-cubicacion-panel.tsx`, print `app/print/cotizaciones/[id]/fabricacion/`.
- **Camino 2 histórico**: 3 partidas genéricas; solo migración. Tipologías complejas = constructor.
- **Alcance**: cubicacion sin precios; pauta referencial; no optimizador/nesting/CAD/inventario/fabricacion automatica; no marketing de cobertura amplia hasta piloto.
- **Donde editar persistencia**: `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
- **Consideraciones UX**: Paginas muy grandes (1000+ lineas). Workflow state persistido en sessionStorage. En desktop, Paso 1 integra el metodo de presupuesto y Paso 2 ofrece **Presupuesto** + **Constructor** sobre los mismos items; el Constructor no crea otra persistencia. Paso 2 soporta dos modos de pricing: `por_item` (cada item lleva su precio, incluyendo productos de cristal por m2 desde `cotizacion_line_templates`) y `total_global` (items descriptivos, total final en Paso 3). Mobile mantiene su wizard existente. Fase 1 Quote Studio es desktop-only: bajo 1024 px no agregar panel financiero ni campos visibles de costo, margen, traslado, merma o precio recomendado; tampoco cambiar orden de pasos, resumen, CTA, PDF, WhatsApp, copy, espaciados, cards, sticky panels ni navegacion mobile. Validar 390 px y 430 px como regresion bloqueante: cualquier diferencia visual mobile intencional queda fuera de alcance. Los snapshots financieros de Fase 1 se guardan en campos existentes a nivel cotizacion; no exponerlos en UI mobile. Item libre (`tipoItem = "item_libre_con_valor"`) no requiere linea, vidrio, color, sistema, configuracion, medidas ni croquis. El quick edit (edicion rapida) ignora items libres. Si la cuenta esta vencida, el listado sigue visible pero crear/editar/eliminar deben quedar bloqueados. **No interrumpir al maestro post-PDF**: descarga registra actividad en silencio; marcar aprobada/rechazada/terminada queda en detalle o menu secundario. **Componentes solo vidrio** (`Espejo`, `Cubierta de mesa`) y productos de catalogo `categoria='vidrio'`: no pedir Aluminio/PVC ni color de perfil; en Espejo mostrar seccion **Espejos** con recomendados 3-6 mm; el resto del catalogo (ventanas, puertas, etc.) sigue pidiendo material y color como antes.
- **Riesgos al modificar**: No romper calculos de pricing (IVA una sola vez), auto-creacion de cliente/proyecto, ni generacion de codigo COT-DDMMYY-NNN. No romper PDF ni WhatsApp. No reintroducir "Pendiente" como estado dominante si hay PDF descargado. `cotizacion_items.linea` guarda snapshot comercial; para Cristales tambien se codifica categoria/espesor/terminacion en `observaciones`. En `total_global`, no mostrar precios $0 por item ni costo/margen/utilidad en PDF, vista publica, documento publico ni detalle interno. `isFreeValueComponentType` depende del catalogo; si se renombra un item, actualizar el flag `esItemLibre`. No saltarse `assertSubscriptionAllowsWrite()` en acciones privadas. Si se agrega otro componente solo vidrio, actualizar `shouldRequireProfileMaterialForComponent()` y la regresion `profile-material-regression.test.ts`; no ocultar material en ventanas/puertas por error.
- **Contrato publico de metadata (2026-08-12)**: `/presupuesto/[token]` pasa `cotizacion_items.observaciones` por `sanitizeCotizacionItemPresentationForPublic()`. Solo conserva etiquetas comerciales/visuales; costos, margen, IDs de plantilla/receta, selectores tecnicos y snapshots quedan bloqueados por defecto.

---

## Feature: Fabricacion tecnica esencial

- **Que hace**: Dominio puro y autocontenido para recetas de fabricacion y motor deterministico de cubicacion/pauta. Calcula perfiles, funciones, medidas, cantidades, vidrio, accesorios, advertencias y trazabilidad desde `receta + dimensiones + cantidad + variante/configuracion`. No cotiza precios.
- **Fase 4 (2026-08-04)**: Catálogo privado vuelve a ser la única entrada principal para líneas, precios y recetas. Biblioteca técnica y Mis recetas quedan como vistas internas sin sidebar; las tarjetas muestran estado de fabricación y enlazan a la receta de su línea. Reutiliza `cotizacion_line_templates` + `fabrication_recipes`, muestra sugeridas/reconocidas sin inventar reglas, y deriva siempre a la receta versionada de la línea. El editor conserva controles estructurados sin JSON/fórmulas libres; el laboratorio muestra despiece, comparación esperado/calculado y una pauta FFD referencial de barras. Una receta validada queda bloqueada y solo cambia mediante nueva versión.
- **Fase 3 (2026-07-29)**: integra recetas validadas al guardado de `/cotizaciones/nueva` sin redisenar UI final. El flujo resuelve receta compatible por `line_template_id`, tipologia, hojas, modulos, herraje/variante cuando existan; si hay una receta `validated` unica calcula con `calcularCubicacionYPauta()` y guarda `cotizacion_items.fabricacion_snapshot`. Si no hay receta unica validada, la cotizacion comercial sigue funcionando sin bloquear.
- **Resumen interno**: `/print/cotizaciones/[id]/fabricacion` lee primero `fabricacionSnapshot` formal; si no existe usa fallback legacy `[cub:]`. Desktop usa ancho de sistema, bloques colapsables por pieza (Cubicación / Despiece / Pauta) y reutiliza `DespieceReviewSurface` con el `itemId` persistente. Print/PDF expanden todas las piezas.
- **Compatibilidad Fase 3**: `fabricationRecipePack`, espejo `fabricationRecipe` y snapshot `[cub:]` siguen como lectura/compatibilidad, pero el flujo nuevo no escribe snapshots tecnicos en `[cub:]`.
- **Archivos Fase 3**:
  - `src/features/fabricacion/types/fabricacion-snapshot.ts`
  - `src/features/fabricacion/schemas/fabricacion-snapshot-schemas.ts`
  - `src/features/fabricacion/services/fabricacion-receta-resolver.service.ts`
  - `src/features/fabricacion/services/fabricacion-cotizacion-snapshot.service.ts`
  - `src/features/fabricacion/__tests__/fabricacion-receta-integracion-cotizacion.test.ts`
  - `supabase/migrations/20260729234019_cotizacion_items_fabricacion_snapshot.sql`
  - `supabase/migrations/20260730001306_harden_fabrication_recipe_grants.sql`
  - `src/features/cotizaciones/services/cotizaciones.service.ts`
  - `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
  - `src/features/cotizaciones/line-templates/types/fabrication-quote-summary.ts`
- **Rutas involucradas**: `/configuracion/empresa/lineas-precios` concentra la entrada técnica/comercial; `/biblioteca-lineas` y `/mis-recetas` son vistas internas; `/configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion` administra recetas, asistente de texto y pruebas; `/api/fabricacion/asistente-texto` genera propuestas JSON autenticadas; `/cotizaciones/nueva` selecciona receta formal solo en el panel tecnico desktop. No cambia PDF comercial, WhatsApp ni rutas publicas.
- **Archivos principales**:
  - `src/features/fabricacion/types/fabricacion-domain.ts`
  - `src/features/fabricacion/types/fabricacion-persistence.ts`
  - `src/features/fabricacion/schemas/fabricacion-schemas.ts`
  - `src/features/fabricacion/services/fabricacion-calculo.service.ts`
  - `src/features/fabricacion/services/fabricacion-asistente.service.ts`
  - `src/features/fabricacion/services/fabricacion-pauta-barras.service.ts`
  - `src/features/fabricacion/services/fabricacion-validacion.service.ts`
  - `src/features/fabricacion/services/fabrication-recipes.service.ts`
  - `src/features/fabricacion/services/fabricacion-receta-editor.service.ts`
  - `src/features/fabricacion/services/fabricacion-contexto-pieza.service.ts`
  - `src/features/fabricacion/hooks/use-fabrication-recipes.ts`
  - `src/features/fabricacion/components/fabricacion-line-workspace.tsx`
  - `src/features/fabricacion/components/fabricacion-library.tsx`
  - `src/features/fabricacion/components/recipe-guided-editor.tsx`
  - `src/features/fabricacion/components/recipe-test-lab.tsx`
  - `src/features/fabricacion/components/recipe-text-assistant.tsx`
  - `src/features/fabricacion/repositories/fabrication-recipes.repository.ts`
  - `src/features/fabricacion/repositories/fabrication-recipe-tests.repository.ts`
  - `src/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture.ts`
  - `src/features/fabricacion/fixtures/bases-tipologicas-ventora.ts`
  - `src/features/fabricacion/__tests__/fabricacion-calculo.service.test.ts`
  - `src/features/fabricacion/__tests__/fabrication-recipes.service.test.ts`
  - `src/features/fabricacion/__tests__/fabrication-recipes-rls-migration.contract.test.ts`
  - `src/features/fabricacion/index.ts`
- **Tablas Supabase**: `fabrication_recipes`, `fabrication_recipe_tests` (migracion base `20260729230407`, grants `20260730001306` y metadatos de validacion `20260730003756`, todas aplicadas/verificadas en remoto). No toca tablas legacy.
- **Flujo de datos**: editor opcional -> `/api/fabricacion/asistente-texto` -> JSON Schema estricto -> borrador con `datosPendientes`; guardado -> `calcularCubicacionYPauta()` -> resultado puro -> `construirPautaBarrasFabricacion()` FFD referencial -> snapshot congelado. Cotizar nunca llama IA.
- **Persistencia Fase 2**: repositorios sin UI para recetas y casos de prueba. Servicio crea, duplica, versiona, archiva, ejecuta tests con `calcularCubicacionYPauta()` y solo pasa a `validated` cuando todos los casos activos pasan.
- **RLS Fase 2**: recetas Ventora son lectura authenticated para todas las organizaciones; recetas privadas y tests quedan acotados por `organization_id = get_org_id()`. `organization_id` y `line_template_id` usan `bigint` para respetar el schema real.
- **Verificacion remota Fase 3**: smoke con dos empresas QA confirmo aislamiento privado, lectura Ventora, bloqueo de update cruzado, snapshot guardado con receta unica, ausencia de snapshot sin receta o con multiples recetas y estabilidad del snapshot historico tras archivar/versionar receta.
- **Persistencia tecnica Fase 4**: `fabrication_recipes.validated_by` registra quien valido la version; `fabrication_recipe_tests.is_required` separa casos obligatorios y opcionales. Triggers remotos exigen que la identidad aprobadora coincida con `auth.uid()` cuando la operacion proviene de una sesion autenticada.
- **Reutiliza actual**: la separacion de receta vs linea comercial, estados de validacion, componentes reales por funcion, snapshot historico `[cub:]` como contrato de salida futuro, y `fabricationRecipePack` como compatibilidad de metadata existente.
- **Compatibilidad preservada**: `fabricationRecipePack`, `fabricationRecipe`, `buildRecipeCuttingPreview()`, `buildLineTemplateCuttingPreview()`, partidas legacy `pano_fijo`, `corredera_2_hojas`, `puerta_abatible_1_hoja` y snapshot `[cub:]` siguen vivos en `src/features/cotizaciones/line-templates/`.
- **Debe reemplazar de forma aditiva**: el administrador Fase 4 es la unica superficie nueva de escritura tecnica. El wizard comercial deja `fabricationRecipePack`/`fabricationRecipe` en solo lectura de compatibilidad; `[cub:]` sigue como fallback historico. El motor nuevo no depende de React, Supabase, SQL, eval, strings libres ejecutables ni codigo de usuario.
- **Investigación documental (2026-08-01)**: `C:\Users\aless\OneDrive\Escritorio\deep-research-report.md` define catálogo reconocido y orden de integración: aluminio lanzamiento Serie 20/25/32/42/4800/5000/Puerta 3200; expansión Sodal 3800, Indalum S24/S33/X27/X43/X69/Plexa; PVC posterior DVP Aspen/Advance, Winhouse Sliding y Deceuninck SL/DL322. No usar ese reporte para crear fórmulas, descuentos ni cortes.
- **Fixture V1**: `RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO` es solo ejemplo deterministico; no representa una linea real validada por taller.
- **Biblioteca priorizada**: ALAR L20/L25/L5000 se copian como borradores sugeridos bloqueados hasta completar codigos, datos de barra y pruebas. SODAL Serie 20/4800/S-33/42/3200 solo aparece como linea reconocida; no tiene `definition` ejecutable porque faltan formulas verificables.
- **Asistente de texto**: usa `DEEPSEEK_API_KEY`, `DEEPSEEK_FABRICATION_MODEL` opcional (default `deepseek-v4-flash`) y JSON Output. La respuesta se valida con Zod dentro de Ventora. Descarta codigo/cantidad/ajuste/largo si el modelo no los marca como explicitamente presentes; la propuesta nunca valida ni ejecuta formulas libres.
- **Inicio asistido de receta (2026-08-08)**: cuando una linea aun no tiene receta, desktop ofrece `Usar base de Ventora` (recomendado), `Crear con IA` o `Empezar desde cero`. Las bases universales cubren corredera, abatible, proyectante, pano fijo, puerta abatible y shower; dependen de hojas/modulos y solo precargan funciones, componentes habituales y dimensiones base controladas. Codigos, ajustes/descuentos, cantidades a confirmar, largos comerciales y politica de corte permanecen bloqueados como `datosPendientes`.
- **Conocimiento del taller**: el inicio muestra hasta tres recetas privadas `validated` de la misma tipologia y hojas para duplicarlas con `source_type='copied'`; la copia queda como borrador de la linea destino y nunca hereda la validacion.
- **Riesgos al modificar**: La IA solo puede asistir creacion/edicion; nunca llamar IA al cotizar ni guardar su texto como formula ejecutable. No agregar carga PDF, optimizador industrial, nesting, CNC, inventario, ERP ni reactivar `materials`, `system_lines`, `formula_variables` o `quote_item_breakdown`. FFD sigue siendo distribucion referencial. No presentar una receta en prueba como lista para fabricar; la seleccion en cotizacion solo admite versiones `validated`.

---

## Feature: PDF de Cotizacion

- **Que hace**: Genera PDF A4/legal a partir de HTML con html2canvas + jsPDF. Headers, paginacion, bloques protegidos, branding empresa. Al descargar/abrir el PDF desde el visor interno, registra `pdf_descargado_en` en silencio y muestra toast "PDF descargado" sin modal ni cambio de estado comercial. Las caracteristicas de cada item se arman con `buildCotizacionItemPrintSpecs()`; **Espejo** y **Cubierta de mesa** omiten Material y Color en la grilla sin romper el layout.
- **Croquis Constructor 2026-07-20**: renderer compartido usa canvas PDF `470 x 260`, contenedor hasta 248px, ocupacion 0.88, banda de cotas y halo claro. Ventana/puerta crecen cerca de 30% sin cambiar medidas. Aplica a visor, export y documentos publicos; detalle y evidencia en `CONSTRUCTOR_DESKTOP_HANDOFF.md`.
- **Rutas involucradas**: `/print/cotizaciones/[id]`, detalle cotizacion
- **Archivos principales**:
  - `src/utils/cotizacion-pdf.ts` (703 lineas)
  - `src/features/cotizaciones/pdf-cache/services/cotizacion-pdf-cache.service.ts`
  - `src/features/cotizaciones/pdf-cache/repositories/cotizacion-pdf-cache.repository.ts`
  - `app/print/cotizaciones/[id]/page.tsx`
  - `app/print/cotizaciones/[id]/_utils/item-print-specs.ts` (`buildCotizacionItemPrintSpecs`)
  - `app/api/cotizaciones/[id]/pdf-descargado/route.ts`
- **Componentes principales**: N/A (utilidad)
- **Hooks/servicios/actions**: `exportCotizacionPdf()`, `downloadPdfBlob()`, `recordPdfDownload()`, `markWorkflowPdfDownloaded()`, `cotizacionPdfCacheService`
- **Tablas Supabase**: `cotizaciones.pdf_descargado_en`; Storage bucket privado `quote-pdfs`
- **Flujo de datos**: HTML del componente -> html2canvas -> jsPDF -> blob -> download/open -> POST `/api/cotizaciones/[id]/pdf-descargado` -> `pdf_descargado_en`
- **Estados importantes**: isPreparingPdf, isExporting
- **Donde editar UI**: `src/utils/cotizacion-pdf.ts` (layout del PDF), `app/print/cotizaciones/[id]/page.tsx` (visor y acciones)
- **Donde editar logica**: `src/utils/cotizacion-pdf.ts`, `src/features/cotizaciones/services/cotizaciones.service.ts`
- **Donde editar persistencia**: `src/features/cotizaciones/repositories/cotizaciones-repository.ts` (`recordPdfDownload`)
- **Consideraciones UX**: PDF multi-pagina con headers corrientes. Puede fallar en mobile por memoria. iPhone abre/comparte PDF via fallback nativo; igual registra descarga. **No** preguntar si marcar como enviada despues de descargar.
- **Riesgos al modificar**: No romper paginacion ni bloques protegidos. No acoplar descarga PDF a `markWorkflowAsSent`. Cambios afectan impresion fisica.

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
  - `app/(pwa-app)/clientes/page.tsx`
  - `app/(pwa-app)/clientes/nuevo/page.tsx`
  - `app/(pwa-app)/clientes/[id]/page.tsx` (switch desktop ≥1024 / mobile)
  - `app/(pwa-app)/clientes/[id]/editar/page.tsx`
  - `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-desktop-view.tsx`
  - `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-desktop.module.css`
  - `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-mobile-view.tsx`
  - `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-mobile-view-model.ts`
  - `src/features/clientes/hooks/useClientes.ts`
  - `src/features/clientes/services/clientes.service.ts`
  - `src/features/clientes/services/clientes-summary.service.ts`
  - `src/features/clientes/repositories/clientes-repository.ts`
  - `src/features/clientes/types/cliente.ts`
  - `app/api/clientes/resumen/route.ts`
- **Componentes principales**: `ClienteDetalleDesktopView`, `ClienteDetalleMobileView` (mismo view-model)
- **Hooks/servicios/actions**: `useClientes`, `clientesService`
- **Tablas Supabase**: `clients`
- **Flujo de datos**: Page -> `useClientes` -> API `/api/clientes/resumen` -> server -> `clientesRepository`
- **Estados importantes**: activo, seguimiento, prospecto, inactivo (calculado o manual via `estado_manual`)
- **Donde editar UI**: `app/(pwa-app)/clientes/` (listado desktop en `page.module.css`; detalle desktop en `_components/cliente-detalle-desktop*`)
- **Donde editar logica**: `src/features/clientes/services/clientes.service.ts`
- **Donde editar persistencia**: `src/features/clientes/repositories/clientes-repository.ts`
- **Consideraciones UX**: Listado y ficha desktop ≥1024 usan ancho comercial del shell (`rootCommercialList` / `pageContentDashboard`); no reutilizar columna 420px del mobile en desktop. Estado calculado segun actividad reciente. Con trial vencido la vista sigue en lectura, pero alta/edicion/delete quedan bloqueados.
- **Riesgos al modificar**: No romper soft delete ni calculo de estado. `unique_correo_clients` es global (no por org) - bug conocido. No abrir escrituras sin pasar por el guard de suscripcion en `useClientes`. No alterar mobile al pulir desktop.

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
  - `src/features/solicitudes/components/lead-channels.tsx`
  - `src/features/solicitudes/components/lead-channels.module.css`
  - `app/(pwa-app)/solicitudes/canales/page.tsx`
  - `app/(pwa-app)/solicitudes/canales/page.module.css`
- **Componentes principales**: `LeadChannels`
- **Hooks/servicios/actions**: `useLeadChannels`
- **Tablas Supabase**: Ninguna (lee slug de org desde perfil)
- **Flujo de datos**: Org slug + canal -> URL con UTM params -> QR + copy link
- **Donde editar UI**: `src/features/solicitudes/components/lead-channels.tsx` + `canales/page.tsx` (header desktop alineado a shell)
- **Donde editar logica**: `src/features/solicitudes/hooks/useLeadChannels.ts`
- **Donde editar persistencia**: N/A
- **Consideraciones UX**: Layout compacto (pagina publica + canales + QR sticky). Sin bloque duplicado de acciones rapidas. CTA "Editar pagina" apunta a `/configuracion/pagina-venta`.
- **Riesgos al modificar**: No romper formato de URLs ni params UTM; conservar targets de onboarding (`canales-hero`, `canales-public-card`, `canales-share-actions`)

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
  - `src/features/public-landing-testimonials/`
- **Componentes principales**: Internos de paginas
- **Hooks/servicios/actions**: `useOrganizationProfile`, `useLandingGallery`, `usePublicLandingTestimonials`, `organizationProfileService`
- **Tablas Supabase**: `organization_profile`, `public_landing_gallery`, `public_landing_testimonials`, Storage bucket `organization-assets`
- **Flujo de datos**:
  - Empresa: Page -> `useOrganizationProfile` -> `organizationProfileService` -> repository
  - Pagina venta: Page -> `useOrganizationProfile` + `useLandingGallery` + `usePublicLandingTestimonials` -> services -> repositories
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
  - `src/features/public-landing-testimonials/repositories/public-landing-testimonial-server.repository.ts`
  - `src/features/solicitudes/services/solicitudes-contacto.service.ts` (getEmpresaPublicaConfig)
- **Componentes principales**: Formulario solicitud, galeria, horario (internos de la pagina)
- **Tablas Supabase**: `organization_profile`, `public_landing_gallery`, `public_landing_testimonials`
- **Flujo de datos**: Slug en URL -> server component lee perfil + galeria + valoraciones aprobadas -> renderiza landing personalizada
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
- **Nombre visible en producto**: **Obras**
- **Archivos principales**:
  - `src/features/projects/repositories/projects.repository.ts`
  - `src/features/projects/types/project.ts`
- **Hooks/servicios/actions**: Usado indirectamente por `clientesService` y `cotizacionesAppService`
- **Tablas Supabase**: `projects`
- **Donde editar persistencia**: `src/features/projects/repositories/projects.repository.ts`
- **Riesgos al modificar**: No romper FK con clients ni cotizaciones. No abrir ruta nueva `/obras` hasta que el roadmap la pida explicitamente.

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
- **Consideraciones UX**: Mantener mobile-first, texto legible y sin palabras tipo leads/CRM/pipeline/funnel en la UI cliente. En desktop comercial, usar lenguaje de cotizacion, obras, configuracion visual y cierre.
- **Riesgos al modificar**: No romper paths de assets ni compatibilidad con Remotion render/preview
