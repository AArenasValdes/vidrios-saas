# Routes Map - Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: ingeniería

Inventario exhaustivo validado contra `docs/agent-map/ROUTES_MANIFEST.json`. Las secciones detalladas siguen abajo; el bloque de inventario cubre también APIs y superficies internas.

### Ownership por área

| Área | Owner operativo | Riesgo/QA base |
|---|---|---|
| Pública/captación | Agente de Atracción | Smoke real de formulario, slug, UTM y WhatsApp |
| Pública/cierre | Agente de Conversión | Smoke real de token, aprobación, PDF y WhatsApp |
| Cotizaciones privadas | Agente de Conversión + Entrega | QA móvil 390/430, desktop, guardado y PDF |
| Configuración/onboarding | Agente de Entrega y Éxito | Trial, organización, branding y primera cotización |
| Admin/Growth | Operativa y Escalamiento | Sesión founder, tenant y acciones internas |
| Billing/subscriptions | Billing + Operativa | Webhook firmado, ledger, plan y acceso |
| APIs | Owner de la ruta consumidora | Contrato, auth, RLS y errores seguros |

## Ruta: / (Landing)

- **Tipo**: Publica
- **Archivo principal**: `app/(landing-web)/page.tsx`
- **Layout usado**: `app/layout.tsx` (root layout, sin shell)
- **CSS**: `app/(landing-web)/landing.module.css`
- **Proposito**: Landing comercial del producto. Presenta cotizacion multidispositivo, PDF por WhatsApp, fabricacion configurable opcional, planes Chile, pagina publica complementaria, FAQ y contacto.
- **Usuario objetivo**: Visitante no autenticado, potencial cliente SaaS
- **Funcionalidades visibles**: Navbar, hero con evidencia real, flujo de cotizacion, dispositivos, cubicacion/despiece/pauta de corte, planes, FAQ, contacto y footer
- **Componentes principales**: `LandingHeroServer`, `LandingNavClient`, `ContrastSection`, `ProblemFlowSection`, `QuoteFlowSection`, `DevicesSection`, `PautaSection`, `PublicLinkSection`, `LandingContactSection`
- **Datos que consume**: Estatico (no consulta Supabase)
- **Tablas Supabase relacionadas**: Ninguna
- **Acciones principales**: Navegacion, CTA a `/registro` (15 días) y `/login`
- **Archivos a tocar para modificar**: `app/(landing-web)/page.tsx` (metadata), `landing-hero-server.tsx`, `landing-page-client.tsx`, `landing-shared.ts`, `landing.module.css`, `src/components/landing/*`
- **Riesgos**: Es la cara publica del producto. CTA principal va directo a `/registro`; `/login` es para cuentas existentes. No prometer pagos Latam: el alta regional soporta seis paises, pero el cobro directo esta disponible inicialmente en Chile. No inventar capturas de fabricacion.

---

## Ruta: /planes

- **Tipo**: Publica (redirect)
- **Archivo principal**: `app/(landing-web)/planes/page.tsx`
- **Layout usado**: `app/layout.tsx` (root layout)
- **Proposito**: Redirect permanente a la landing unica, anclada en `#precios`. El CTA de prueba ya no pasa por una pagina extra.
- **Usuario objetivo**: Visitante que llega por un link antiguo a `/planes`
- **Funcionalidades visibles**: Ninguna; redirige a crear cuenta
- **Componentes principales**: Ninguno
- **Datos que consume**: Ninguno
- **Tablas Supabase relacionadas**: Ninguna
- **Acciones principales**: `permanentRedirect("/#precios")`
- **Archivos a tocar para modificar**: `app/(landing-web)/planes/page.tsx`
- **Riesgos**: No reintroducir una pagina intermedia entre la landing, el CTA de prueba y `/registro`. Los precios viven en `/#precios`.

---

## Ruta: /solicitud/[empresa]

- **Tipo**: Publica, dinamica
- **Archivo principal**: `app/(landing-web)/solicitud/[empresa]/page.tsx`
- **Layout usado**: `app/layout.tsx` (root layout)
- **Proposito**: Formulario publico de solicitud por empresa. Es el punto de captacion de leads. Muestra datos de empresa, horario, galeria y formulario.
- **Usuario objetivo**: Lead/cliente final de la empresa de vidrios
- **Funcionalidades visibles**: Perfil empresa, horario atencion, paso a paso (Elige/Envia/Te contactan), formulario de solicitud
- **Componentes principales**: Componente formulario interno, galeria, horario
- **Datos que consume**: `organization_profile` (por slug), `public_landing_gallery`
- **Tablas Supabase relacionadas**: `organization_profile`, `public_landing_gallery`, `solicitudes_contacto` (escritura via API)
- **Acciones principales**: POST solicitud via `/api/solicitud/[empresa]`
- **Archivos a tocar para modificar**: `app/(landing-web)/solicitud/[empresa]/page.tsx`, `src/features/solicitudes/services/solicitudes-contacto.service.ts`, `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`, `app/api/solicitud/[empresa]/route.ts`
- **Riesgos**: RUTA CRITICA de captacion. Rate limiting por IP (5 req/15 min). No romper formulario ni validaciones. No cambiar slug sin actualizar organization_profile.

---

## Ruta: /login

- **Tipo**: Publica (con redireccion si autenticado)
- **Archivo principal**: `app/(auth-public)/login/page.tsx`
- **Layout usado**: `app/layout.tsx` (root layout)
- **Proposito**: Autenticacion email/password y Google como unico proveedor OAuth
- **Usuario objetivo**: Usuario no autenticado
- **Funcionalidades visibles**: Google, formulario email/password, manejo de errores, ver/ocultar contrasena, reinicio local de app en dispositivo, redireccion post-login
- **Componentes principales**: `LoginView` (interno de la pagina)
- **Datos que consume**: `auth.users`, `public.users`
- **Tablas Supabase relacionadas**: `auth.users`, `public.users`
- **Acciones principales**: `signIn` y `signInWithGoogle` via `authService`
- **Archivos a tocar para modificar**: `app/(auth-public)/login/page.tsx`, `src/features/auth/hooks/useAuth.ts`, `src/features/auth/services/auth.service.ts`, `src/features/auth/repositories/auth.repository.ts`
- **Riesgos**: No romper flujo PKCE. Facebook no es provider OAuth valido. No pedir telefono en login. No cambiar manejo de `?next=` ni colapsar errores distintos bajo "correo o contrasena incorrecta".

---

## Ruta: /registro

- **Tipo**: Publica
- **Archivo principal**: `app/(auth-public)/registro/page.tsx`
- **Componente principal**: `app/(auth-public)/registro/registro-view.tsx`
- **API usada**: `app/api/auth/register/route.ts`
- **Proposito**: Crear cuenta SaaS y trial de 15 dias con Google o correo/contrasena. El flujo visual conserva dos pasos: identidad/acceso y datos de empresa.
- **Usuario objetivo**: Prospecto SaaS que quiere iniciar la prueba sin tarjeta
- **Datos que consume/escribe**: Crea o vincula Auth, `users`, `organizations` y `organization_profile`; persiste pais, configuracion regional y trial mediante la misma RPC server-side.
- **Tablas Supabase relacionadas**: `auth.users`, `public.users`, `organizations`, `organization_profile`
- **Acciones principales**: Google inicia OAuth y completa datos faltantes; correo/contrasena avanza al paso de empresa y crea la cuenta solo al confirmar el segundo paso.
- **Archivos a tocar para modificar**: `app/(auth-public)/registro/page.tsx`, `app/(auth-public)/registro/registro-view.tsx`, `app/api/auth/signup/route.ts`, `src/features/auth/services/auth-oauth-completion.service.ts`
- **Riesgos**: Google es el unico OAuth visible. No crear usuarios durante QA. No separar la logica de alta de la RPC transaccional ni reiniciar trials existentes.

---

## Ruta: /auth/completar-cuenta

- **Tipo**: Privada transitoria (sesion OAuth valida, antes de activacion)
- **Archivo principal**: `app/(auth-public)/auth/completar-cuenta/page.tsx`
- **API usada**: `POST /api/auth/oauth/complete-registration`
- **Proposito**: Completar una sola vez el perfil SaaS iniciado con Google antes de `/activacion`.
- **Campos obligatorios**: Nombre personal, taller, WhatsApp chileno, ciudad/comuna y consentimiento de cuenta/contacto directo.
- **Persistencia**: RPC `complete_verified_auth_account` valida el vinculo por `auth_user_id` y delega la escritura atomica de `users`, `organizations` y `organization_profile`; el trigger de `organizations` crea el trial una sola vez y la RPC no reinicia estados existentes.
- **Navegacion**: `next` usa allowlist interna; rechaza URLs externas y rutas auth no autorizadas. Una cuenta completa omite el formulario.
- **Riesgos**: RPC exclusiva de `service_role`. No usar metadata Google para autorizacion ni volver a pedir telefono en onboarding.

---

## Ruta: /auth/definir-contrasena

- **Tipo**: Privada transitoria (sesion de invitacion verificada)
- **Archivo principal**: `app/(auth-public)/auth/definir-contrasena/page.tsx`
- **Componente principal**: `app/(auth-public)/auth/definir-contrasena/define-password-view.tsx`
- **Proposito**: Obligar a una cuenta provisionada por admin a definir su propia contraseña despues de abrir el enlace de activacion de un solo uso.
- **Datos que consume/escribe**: Sesion Supabase verificada; actualiza solo la contraseña del usuario autenticado mediante `auth.updateUser`.
- **Navegacion**: Invitacion → `/auth/callback` → esta ruta → `/activacion`.
- **Ownership**: Auth + Operativa.
- **QA**: Enlace valido, enlace vencido/usado, contraseñas distintas, longitud 8..72 y redireccion final.
- **Riesgos**: Nunca aceptar una identidad por correo solamente, nunca mostrar o enviar contraseñas y no permitir `next` externo.

---

## Ruta: /activacion

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/activacion/page.tsx`
- **CSS**: `app/(pwa-app)/activacion/page.module.css`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell` (variante **minimal**: sin bottom nav)
- **Proposito**: Wizard de **primera activacion** separado del dashboard. Guia al admin sin cotizaciones hasta crear su primera cotizacion, ver PDF y opcionalmente cargar datos de empresa.
- **Usuario objetivo**: Admin nuevo (`quoteCount === 0`, step `activation_complete` pendiente)
- **Funcionalidades visibles**: Bienvenida, guía opcional asignada según móvil/escritorio, elegir demo vs real, rápida por total vs con componentes, resumen con desglose neto/IVA, Ver PDF, datos empresa (opcionales), entrar a Ventora
- **Componentes principales**: Wizard inline en `page.tsx` + `OnboardingVideoGuide` opcional
- **Hooks/servicios**: `useActivationGate`, `useCotizacionesStore`, `useOrganizationProfile`, `onboarding-activation-flow.service.ts`
- **API**: `GET/POST /api/onboarding/activation/status`, `GET/POST /api/onboarding/videos`
- **Tablas Supabase**: `onboarding_checklists` (`activation_complete`), `cotizaciones`, `cotizacion_items`, `organization_profile`, `growth_onboarding_*`
- **Query QA**: `?replay=1` o `?activacion_preview=1` (no persiste complete/skip; bypass gate)
- **Navegacion PDF**: `?from=activacion` -> boton **Volver a la guia**
- **Archivos a tocar**: `app/(pwa-app)/activacion/*`, `src/features/onboarding/services/onboarding-activation-flow.service.ts`, `src/features/onboarding/hooks/useActivationGate.ts`, `app/api/onboarding/activation/status/route.ts`, `app/print/cotizaciones/[id]/page.tsx` (solo back nav)
- **Documentacion detallada**: `docs/agent-map/ACTIVATION_ONBOARDING.md`
- **Riesgos**: No mezclar con wizard de `/cotizaciones/nueva`. Usar `finalizeActivationDraftForSave()` antes de guardar. Total global no debe inventar componentes ficticios. No reintroducir card de onboarding dentro del dashboard.

---

## Ruta: /dashboard

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/dashboard/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Dashboard comercial desktop Fase 5: valor cotizado + cola **Por enviar** (cotizar → PDF → WhatsApp). No es CRM ni pipeline de seguimiento.
- **Usuario objetivo**: Admin/vendedor autenticado (maestro de taller)
- **Funcionalidades visibles (hoy / V1)**: Saludo, valor cotizado, PDF/aprobadas/creadas, recientes, CTA nueva cotizacion. Fase 5 V1 prioriza cola **Por enviar**; seguimiento no es bloque hero. Alertas de respuesta publica solo si existen. Admin sin cotizaciones → `/activacion`. Brief: `docs/design/FASE_5_DASHBOARD_BRIEF.md`.
- **Componentes principales**: `DashboardDesktop`, `DashboardMobile`, `PremiumPageReveal`
- **Hooks**: `useDashboardViewModel`, `useDashboardSummary`, `useDashboardBreakpoint`
- **Datos que consume**: Resumen de cotizaciones + alertas via `/api/dashboard/summary`; embudo solicitudes/obras solo con datos reales existentes.
- **Tablas Supabase relacionadas**: `cotizaciones`, `clients`, `projects`, `solicitudes_contacto`
- **Acciones principales**: Nueva cotizacion, abrir cotizaciones por enviar (PDF/WhatsApp), ver listado
- **Archivos a tocar para modificar**: `app/(pwa-app)/dashboard/page.tsx`, `app/(pwa-app)/dashboard/_components/*`, `app/(pwa-app)/dashboard/_hooks/*`, `src/features/dashboard/services/dashboard-summary-server.service.ts`, `app/api/dashboard/summary/route.ts`
- **Riesgos**: Breakpoint 1024px. No romper KPIs ni contrato mobile del summary. No reintroducir "pendientes"/seguimiento como alerta dominante ni card de onboarding (activacion en `/activacion`). No KPI inventados ni cobros/oportunidades. Cuenta vencida: lectura posible; escritura/config con banner o redirect.

---

## Ruta: /admin

- **Tipo**: Privada (autenticada + founder allowlist)
- **Archivo principal**: `app/admin/page.tsx`
- **Layout usado**: `app/admin/layout.tsx` -> `AdminShell`
- **Proposito**: Dashboard interno de Ventora para operar clientes SaaS, trials, cobros y foco comercial founder sin entrar al panel cliente.
- **Usuario objetivo**: Founder/admin interno allowlist por correo
- **Funcionalidades visibles**: Caja cobrada del mes calendario Chile (solo pagos aprobados), desglose primeras compras/renovaciones, cartera actual, activación de trials, uso mensual de cotizaciones/PDF y prospección saliente etiquetada.
- **Componentes principales**: `AdminShell`, `AdminSidebar`, `AdminDashboardWorkspace`, `ClientStatusBadge`, `SourceBadge`
- **Hooks**: Recarga client-side del resumen server-side
- **Datos que consume**: `getAdminDashboard()`; ledger `pagos_suscripcion`, perfiles/estados efectivos, cotizaciones y lista `growth_prospects`
- **Tablas Supabase relacionadas**: `organizations`, `organization_profile`, `users`, `pagos_suscripcion`, `cotizaciones`, `growth_prospects`
- **Acciones principales**: Navegar a clientes SaaS, revisar cobros, abrir prospectos y resolver urgencias
- **Archivos a tocar para modificar**: `app/admin/page.tsx`, `app/api/admin/dashboard/route.ts`, `src/features/admin/components/admin-dashboard-*`, `src/features/admin/services/admin-dashboard-*`, `src/features/admin/repositories/admin-clients.repository.ts`
- **Definición crítica**: Caja = pagos `aprobado` no-test dentro de mes calendario Santiago; una primera transacción por organización es venta nueva, las siguientes son renovaciones. No etiquetar caja como MRR/ARR/meta. `growth_prospects` es una lista de outreach, no un embudo de leads recientes.
- **Riesgos**: No reutilizar `AppShell`. No abrir esta ruta a admins normales de una organizacion. No exponer `service_role` ni datos multi-tenant al cliente. `AdminSidebar` debe cerrar sesion con hard nav (`navigateToLogoutRoute` -> `/auth/logout`), nunca con `<Link href="/auth/logout">` (prefetch/soft-nav borra cookies y parece logout en cada accion).

---

## Ruta: /admin/clientes

- **Tipo**: Privada (autenticada + founder allowlist)
- **Archivo principal**: `app/admin/clientes/page.tsx`
- **Layout usado**: `app/admin/layout.tsx` -> `AdminShell`
- **Proposito**: Tabla global de organizaciones SaaS con plan, estado, trial, suscripcion y ultimo pago.
- **Usuario objetivo**: Founder/admin interno allowlist por correo
- **Funcionalidades visibles**: Taller, nombre personal, correo, WhatsApp, ciudad, plan, trial/suscripcion, primera cotizacion y acceso a ficha
- **Componentes principales**: `ClientStatusBadge`, `SourceBadge`
- **Hooks**: Ninguno en Fase 1
- **Datos que consume**: Listado server-side via `adminClientsService`
- **Tablas Supabase relacionadas**: `organizations`, `organization_profile`, `users`, `pagos_suscripcion`
- **Acciones principales**: Ver ficha por organizacion
- **Archivos a tocar para modificar**: `app/admin/clientes/page.tsx`, `app/admin/admin.module.css`, `src/features/admin/services/admin-clients.service.ts`, `src/features/admin/repositories/admin-clients.repository.ts`
- **Riesgos**: No mezclar esta vista global con CRUD de clientes finales (`/clientes`). Mantener acciones sensibles server-side.

---

## Ruta: /admin/clientes/[organizationId]

- **Tipo**: Privada (autenticada + founder allowlist), dinamica
- **Archivo principal**: `app/admin/clientes/[organizationId]/page.tsx`
- **Layout usado**: `app/admin/layout.tsx` -> `AdminShell`
- **Proposito**: Ficha interna de una organizacion SaaS con datos de empresa, usuario principal, estado de trial/suscripcion y ledger de pagos.
- **Usuario objetivo**: Founder/admin interno allowlist por correo
- **Funcionalidades visibles**: Organizacion, contacto privado principal, trial/suscripcion, primera cotizacion, pagos y links a pagina publica/WhatsApp
- **Componentes principales**: `ClientStatusBadge`, `SourceBadge`
- **Hooks**: Ninguno en Fase 1
- **Datos que consume**: Detalle server-side via `adminClientsService`
- **Tablas Supabase relacionadas**: `organizations`, `organization_profile`, `users`, `pagos_suscripcion`
- **Acciones principales**: Revisar ficha, abrir pagina publica, abrir WhatsApp, auditar pagos
- **Archivos a tocar para modificar**: `app/admin/clientes/[organizationId]/page.tsx`, `app/admin/admin.module.css`, `src/features/admin/services/admin-clients.service.ts`, `src/features/admin/repositories/admin-clients.repository.ts`
- **Riesgos**: No convertir placeholders en acciones cliente-side. Si se agregan acciones reales, deben confirmar cobro/trial desde servidor.

---

## Ruta: /admin/growth

- **Tipo**: Privada (autenticada + founder allowlist)
- **Archivo principal**: `app/admin/growth/page.tsx`
- **Layout usado**: `app/admin/layout.tsx` -> `AdminShell`
- **Proposito**: Panel operativo privado de growth para fundador/admin autorizado. Organiza trabajo diario, prospectos prioritarios, metas, MRR y proyecciones simples sin depender del shell principal.
- **Usuario objetivo**: Fundador o admin autorizado por correo
- **Funcionalidades visibles**: Header compacto con periodo/meta/MRR, bloque principal `Trabajo de hoy`, tabla editable de prospectos prioritarios, metricas compactas, embudo compacto, canales, datos manuales, experimentos secundarios y modal `Configurar crecimiento`
- **Componentes principales**: `GrowthPageClient`
- **Hooks**: `useGrowthDashboard`
- **Datos que consume**: Supabase via `/api/admin/growth/*` — tablas `growth_workspaces`, `growth_prospects`, `growth_tasks`, `growth_activities`, `growth_workspace_members`
- **Tablas Supabase relacionadas**: `growth_*` (dominio interno Ventora, separado de `solicitudes_contacto`). KPIs hibridos leen `organizations`, `organization_profile`, `cotizaciones`, `pagos_suscripcion` cuando hay `converted_organization_id`
- **Acciones principales**: Agregar prospecto, editar estado/proximo paso/fecha, cambiar metas, actualizar datos manuales, importar workspace local v3, registrar contacto y filtrar trabajo operativo del dia
- **APIs**: `/api/admin/growth/workspace`, `/prospects`, `/tasks`, `/activities`, `/work-today`, `/import-local-workspace`
- **Archivos a tocar para modificar**: `app/admin/growth/*`, `src/features/growth/*`, `app/api/admin/growth/*`, `supabase/migrations/*growth*`
- **Riesgos**: No exponer esta ruta a usuarios normales. No mezclar prospectos growth con `solicitudes_contacto`. RLS por membership (`auth.uid()`), no por correo

---

## Ruta: /cotizaciones

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/cotizaciones/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **CSS**: `app/(pwa-app)/cotizaciones/page.module.css`
- **Proposito**: Listado de cotizaciones con filtros, busqueda y acciones
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Filtros (estado, cliente, periodo, orden), busqueda, chips mobile (valor, aprobadas, PDF generados, rechazadas), KPIs (valor cotizado, creadas, PDF generados, aprobadas, terminadas), cards mobile con estados neutrales, acciones (copiar link, PDF, WhatsApp, editar, eliminar)
- **Componentes principales**: `CotizacionMobileCard`, `CotizacionesMobileSummary`, `CotizacionesFilterFields`
- **Hooks**: `useCotizacionesStore`, `useCotizacionAlerts`
- **Datos que consume**: Resumen cotizaciones via `/api/cotizaciones/resumen`
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`
- **Acciones principales**: Listar, filtrar, copiar link, descargar PDF, enviar WhatsApp, editar, eliminar (soft delete)
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/page.tsx`, `app/(pwa-app)/cotizaciones/_components/*`, `src/features/cotizaciones/hooks/useCotizacionesStore.ts`, `src/features/cotizaciones/services/cotizacion-display-state.service.ts`, `app/api/cotizaciones/resumen/route.ts`
- **Riesgos**: Pagina grande (1055 lineas). No romper filtros ni acciones de WhatsApp/PDF. No usar "Pendiente" como badge dominante; usar display state service. Con cuenta vencida el listado puede seguir leyendose, pero acciones de crear/editar/eliminar deben quedar bloqueadas o redirigidas a `/cuenta-vencida`.

---

## Ruta: /cotizaciones/nueva

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/cotizaciones/nueva/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Formulario guiado de nueva cotizacion y escritorio desktop para construir cotizaciones completas.
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Formulario multi-paso (Cliente, Componentes, Resumen), selector `por_item` / `total_global`, guardado de borrador y presupuesto. En desktop `>=1024px`, Paso 2 ofrece **Cotización rápida** (cuaderno) y **Cotización guiada** sobre el mismo `draft.items`. Rápida incluye siete presets — Fijo, Corredera, Abatible, Oscilobatiente, Proyectante, Puerta y Paño libre —, línea base opcional para nuevas piezas y aplicación explícita a piezas existentes, tablero cuadriculado, tarjetas seleccionables, medidas/cantidad/nombre editables, duplicado, eliminación, reordenamiento, progreso e inspector de línea, vidrio, material, color, apertura y precio. Entre 1024 y 1279 px el inspector baja bajo el tablero; el panel financiero usa scroll natural. La paleta reutiliza `COLOR_OPTIONS`. El editor avanzado de una pieza sigue disponible mediante **Personalizado -> Abrir constructor**. Los productos de cristal guardados (`categoria='vidrio'`) pueden agregarse sin perfilería. En **Espejo** y **Cubierta de mesa** no se pide material ni color de perfil. En mobile, Paso 2 tiene selector inicial **Cotizar por items** / **Cuadernillo digital**; en `por_item` se puede trabajar como **Guiada** o **Constructor**. El Constructor mobile monta `mobile-cuaderno/`, lista piezas compactas, aplica línea global, edita material/color/línea/vidrio/precio y abre composición full-screen sobre el mismo `draft.items`.
- **Fase 4 tecnica (2026-07-30)**: el panel **Cubicacion y pauta** consulta primero `fabrication_recipes` validadas. Con una compatible la selecciona automaticamente; con varias exige elegir receta/variante/herraje; sin receta no bloquea la cotizacion. Guarda contexto tecnico explicito y `fabricacion_snapshot` inmutable. `[cub:]` queda como fallback legacy.
- **Componentes principales**: `PasoDosSeccion`, `QuoteConstructorWorkspace`, `GuidedVisualComposer`, `PasoDosWizardMovil`, `PasoDosCuadernoMovil`, `CuadernoQuickEditSheet`, `CuadernoComposicionMovil` e internos de la página.
- **Nota onboarding 2026-06-19**: La entrada inicial debe priorizar `Cotizacion rapida` (`total_global`) y mostrar exito/resumen de PDF antes de pedir datos de empresa. No volver a montar Joyride contextual en esta ruta.
- **Hooks**: `useCotizacionesStore`, `useOrganizationProfile`
- **Datos que consume**: Perfil org (margen/proveedor defaults), catalogo componentes, sugerencias
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`, `organization_profile`
- **Acciones principales**: Crear borrador, guardar presupuesto, auto-crear cliente/proyecto (`projects`, visible como Obras)
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/nueva/page.tsx`, `app/(pwa-app)/cotizaciones/nueva/page.module.css`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-seccion.tsx`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-agregar-grupo-sheet.tsx`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-editor-desktop.tsx`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/*`, `src/features/cotizaciones/line-templates/components/line-template-picker.tsx`, `src/features/cotizaciones/visual-composer/`, `src/utils/cotizacion-item-presentation.ts`. Handoff desktop obligatorio: `docs/agent-map/CONSTRUCTOR_DESKTOP_HANDOFF.md`.
- **Riesgos**: El workflow vive en `draft.items` y se restaura desde `sessionStorage`; no crear un segundo estado persistente para el cuaderno/constructor. No romper pricing por componente ni auto-creación de cliente/proyecto. En `total_global`, no exponer costo, margen o utilidad ni mostrar `$0` por item en salidas comerciales. No abrir CAD libre ni modificar PDF/WhatsApp/documento público sin revisar el renderer compartido. En mobile, el Constructor es solo una superficie de captura/edición sobre los mismos items: no duplicar guardado, no agregar panel financiero desktop, no mostrar el toggle Guiada|Constructor fuera de Tipo/lista, y no habilitar acciones mudas como `Reflejar` en piezas sin apertura lateral. La validación local de texto inválido en ancho/alto/cantidad todavía debe bloquear revisión sin corromper el último valor válido. Esta ruta debe quedar bloqueada para cuentas con trial vencido o suscripción no activa.
- **Riesgo onboarding 2026-06-19**: No reintroducir empresa/pagina/canales antes de crear una cotizacion ni redirigir automaticamente al PDF al guardar.

---

## Ruta: /cotizaciones/[id]

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/cotizaciones/[id]/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell` (desktop: topbar oculto + ancho comercial)
- **Proposito**: Detalle de cotizacion con items, totales y acciones
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Header con estado visible neutro (Creada/PDF generado/Enviada/etc.), cierre comercial manual en seccion secundaria, items, totales, recordatorio contextual para compartir la primera cotizacion, acciones (PDF, WhatsApp, editar, eliminar)
- **Componentes principales**: `CotizacionDetalleDesktopView` (≥1024), `CotizacionDetalleMobileView` (<1024), view-model compartido
- **Hooks**: `useCotizacionesStore`
- **Datos que consume**: Cotizacion por ID con items
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`
- **Acciones principales**: Ver detalle, generar PDF, compartir WhatsApp, editar, eliminar
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/[id]/page.tsx`, `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-desktop-view.tsx`, `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-desktop.module.css`, `app/(pwa-app)/cotizaciones/[id]/_components/*`, `src/features/cotizaciones/hooks/useCotizacionesStore.ts`, `src/features/cotizaciones/services/cotizacion-display-state.service.ts`
- **Riesgos**: No romper generacion de PDF, link de WhatsApp ni la marca de `first_share`. No reutilizar shell móvil estrecho en desktop.

---

## Ruta: /clientes

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/clientes/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **CSS**: `app/(pwa-app)/clientes/page.module.css`
- **Proposito**: Listado de clientes con filtros de estado, busqueda y CRUD
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Filtros (Activo/Seguimiento/Prospecto/Inactivo), busqueda, paginacion, acciones CRUD
- **Componentes principales**: Internos de la pagina
- **Hooks**: `useClientes`
- **Datos que consume**: Resumen clientes via `/api/clientes/resumen`
- **Tablas Supabase relacionadas**: `clients`
- **Acciones principales**: Listar, filtrar, crear, editar, eliminar (soft delete)
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/page.tsx`, `src/features/clientes/hooks/useClientes.ts`, `src/features/clientes/services/clientes.service.ts`, `src/features/clientes/repositories/clientes-repository.ts`, `app/api/clientes/resumen/route.ts`
- **Riesgos**: No romper logica de estado (activo/seguimiento/prospecto/inactivo). La lectura sigue disponible si la cuenta vence, pero crear/editar/eliminar deben bloquearse.

---

## Ruta: /clientes/nuevo

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/clientes/nuevo/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Formulario de nuevo cliente
- **Usuario objetivo**: Admin/vendedor autenticado
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/nuevo/page.tsx`, `src/features/clientes/`
- **Riesgos**: Debe redirigir a `/cuenta-vencida` si la organizacion no tiene trial o suscripcion activa para escritura.

---

## Ruta: /clientes/[id]

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/clientes/[id]/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell` (desktop: topbar oculto + ancho comercial)
- **Proposito**: Ficha de cliente con Obras (`projects`) y cotizaciones asociadas
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Header, estado badge, telefono, direccion, metricas, tabs Proyectos/Cotizaciones, editar/llamar
- **Componentes principales**: `ClienteDetalleDesktopView` (≥1024), `ClienteDetalleMobileView` (<1024), `buildClienteDetalleMobileViewModel` compartido
- **Hooks**: `useClientes`
- **Datos que consume**: Cliente detalle con proyectos y cotizaciones
- **Tablas Supabase relacionadas**: `clients`, `projects`, `cotizaciones`
- **Acciones principales**: Ver ficha, editar, ver proyectos/cotizaciones
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/[id]/page.tsx`, `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-desktop-view.tsx`, `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-desktop.module.css`, `app/(pwa-app)/clientes/[id]/_components/*`, `src/features/clientes/services/clientes.service.ts`
- **Riesgos**: No romper tabs ni navegacion a cotizaciones/obras. No forzar `max-width: 420px` del CSS mobile en desktop.

---

## Ruta: /clientes/[id]/editar

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/clientes/[id]/editar/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Formulario de edicion de cliente
- **Usuario objetivo**: Admin/vendedor autenticado
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/[id]/editar/page.tsx`
- **Riesgos**: Debe quedar bloqueada en trial vencido o suscripcion expirada.

---

## Ruta: /solicitudes

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/solicitudes/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **CSS**: `app/(pwa-app)/solicitudes/page.module.css`
- **Proposito**: Listado de solicitudes/leads con estados, badge de origen, tiempo relativo, contacto WhatsApp, prefill a cotizacion
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Filtros (Nueva/Contactada/Cerrada/Descartada), badge de origen (landing/empresa-publica), tiempo relativo, boton WhatsApp, prefill cotizacion
- **Componentes principales**: `SolicitudCard`
- **Hooks**: `useSolicitudesContacto`
- **Datos que consume**: Resumen solicitudes via `/api/solicitudes/resumen`
- **Tablas Supabase relacionadas**: `solicitudes_contacto`
- **Acciones principales**: Listar, filtrar, contactar WhatsApp, crear cotizacion desde solicitud, actualizar estado
- **Archivos a tocar para modificar**: `app/(pwa-app)/solicitudes/page.tsx`, `app/(pwa-app)/solicitudes/_components/solicitud-card.tsx`, `src/features/solicitudes/hooks/useSolicitudesContacto.ts`, `src/features/solicitudes/services/solicitudes-contacto.service.ts`, `app/api/solicitudes/resumen/route.ts`
- **Riesgos**: No romper badge de origen ni prefill a cotizacion. La captura publica no se bloquea, pero los cambios de estado internos si deben bloquearse cuando la cuenta vence.

---

## Ruta: /solicitudes/canales

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/solicitudes/canales/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Generador de canales de captacion. Compartir pagina de solicitud, generar QR, copiar links por canal.
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Cards de canal (directo, Instagram, Facebook, WhatsApp), Joyride contextual, QR, copiar link, descargar QR PNG
- **Componentes principales**: `LeadChannels`
- **Hooks**: `useLeadChannels`, `useOrganizationProfile`
- **Datos que consume**: Perfil org (slug publico)
- **Tablas Supabase relacionadas**: `organization_profile`
- **Acciones principales**: Copiar link, descargar QR, ver URLs por canal
- **Archivos a tocar para modificar**: `app/(pwa-app)/solicitudes/canales/page.tsx`, `src/features/solicitudes/components/lead-channels.tsx`, `src/features/solicitudes/components/lead-channels.module.css`, `src/features/solicitudes/hooks/useLeadChannels.ts`
- **Riesgos**: No romper generacion de QR, URLs con UTM ni la marca de `channel_ready`. Esta pantalla debe redirigir a `/cuenta-vencida` cuando la cuenta ya no puede operar.

---

## Ruta: /cuenta-vencida

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(subscription-gate)/cuenta-vencida/page.tsx`
- **Layout usado**: `app/(subscription-gate)/layout.tsx` (sin `AppShell`; tipografías PWA únicamente)
- **CSS**: `app/(subscription-gate)/cuenta-vencida/page.module.css`
- **Proposito**: Pantalla de activacion/renovacion. Mercado Pago Chile ofrece las cuatro variantes del catalogo en checkout cuando la configuracion server-side esta completa; si no esta lista, muestra el estado operativo sin ofrecer un canal de contratacion alternativo.
- **Usuario objetivo**: Admin/vendedor autenticado con cuenta en modo lectura
- **Funcionalidades visibles**: Selector accesible mensual/anual (anual por defecto), cards Ventora Cotización y Ventora Comercial, checkout Mercado Pago, configuración asistida separada desde $250.000 y accion discreta `Seguir en modo lectura`.
- **Componentes principales**: Internos de la pagina
- **Datos que consume**: `organization_profile` con snapshot calculado de suscripcion
- **Tablas Supabase relacionadas**: `organization_profile`, `suscripciones_organizacion`, `pagos_suscripcion`
- **Acciones principales**: Iniciar suscripcion Mercado Pago, mostrar error operativo si la configuracion no esta lista, volver a lectura basica
- **Archivos a tocar para modificar**: `app/(subscription-gate)/cuenta-vencida/page.tsx`, `app/(subscription-gate)/cuenta-vencida/page.module.css`, `app/(subscription-gate)/layout.tsx`, `src/features/subscriptions/services/*`, `src/components/layout/app-shell.tsx`
- **Riesgos**: No convertirla en logout forzado. El retorno `/cuenta-vencida/mercadopago/retorno` es informativo y no debe escribir. La UI deshabilita checkout para cualquier cuenta pagada activa, incluso founder sin vencimiento.

---

## Ruta: /configuracion/empresa

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/configuracion/empresa/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Configuracion del perfil de empresa: datos basicos, telefono, email, direccion, brand color, logo, push, slug publico, QR
- **Usuario objetivo**: Admin autenticado
- **Funcionalidades visibles**: Formulario datos empresa, Joyride contextual, color picker con presets, upload logo, push notifications, slug publico, preview QR
- **Componentes principales**: Internos de la pagina
- **Hooks**: `useOrganizationProfile`
- **Datos que consume**: Perfil org
- **Tablas Supabase relacionadas**: `organization_profile`, Storage bucket `organization-assets`
- **Acciones principales**: Actualizar perfil, subir logo
- **Archivos a tocar para modificar**: `app/(pwa-app)/configuracion/empresa/page.tsx`, `src/features/organization-profile/hooks/useOrganizationProfile.ts`, `src/features/organization-profile/services/organization-profile.service.ts`, `src/features/organization-profile/repositories/organization-profile.repository.ts`
- **Riesgos**: No cambiar slug sin actualizar indice unico. No romper upload de logo (requiere bucket `organization-assets`) ni la marca manual de `channel_ready` al copiar link. El bloque **Catálogo privado** enlaza a `/configuracion/empresa/lineas-precios` e importación XLSX/CSV.

---

## Ruta: /configuracion/empresa/lineas-precios

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/configuracion/empresa/lineas-precios/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Entrada única para CRUD del catálogo privado: precios, estado para cotizar y acceso contextual a la receta de fabricación de cada línea.
- **Usuario objetivo**: Admin autenticado
- **Componentes principales**: `LineasPreciosPageClient`, `LineTemplateFormWizard`
- **Hooks**: `useCotizacionLineTemplates`, `useFabricationRecipes`
- **Tablas Supabase relacionadas**: `cotizacion_line_templates`, `fabrication_recipes`
- **Acciones principales**: Crear/editar/duplicar/pausar líneas; filtrar por estado técnico; distinguir Sin configurar / Borrador / Lista para probar / Validada; abrir la receta vinculada.
- **UX (2026-07-30)**: linea comercial y receta quedan separadas. El wizard no escribe nuevas recetas en `catalog_metadata`; muestra la configuracion antigua como solo lectura y deriva al modulo versionado.
- **Archivos a tocar**: `lineas-precios-page-client.tsx`, `line-template-form-wizard.tsx`, `fabrication-recipe-editor.tsx`, `fabrication-recipe*.ts`, resto de `line-templates/**`
- **Riesgos**: Migración catalog extendida requerida. No precios en pauta, no optimizador/nesting/CAD/inventario. No llamar “verificadas” a L5000/L20/L25. No mostrar formulas/JSON al usuario.

---

## Ruta: /biblioteca-lineas y /mis-recetas

- **Tipo**: Privadas (autenticadas)
- **Archivos principales**: `app/(pwa-app)/biblioteca-lineas/page.tsx`, `app/(pwa-app)/mis-recetas/page.tsx`, `src/features/fabricacion/components/fabricacion-library.tsx`
- **Propósito**: Vistas internas abiertas desde Catálogo privado o desde una línea. No aparecen en el sidebar ni reemplazan al catálogo comercial como entrada principal.
- **Datos**: Lee `cotizacion_line_templates`, `fabrication_recipes` y `BIBLIOTECA_RECETAS_PRIORIZADAS`. Las líneas reconocidas sin reglas solo exponen sus datos pendientes; no crean recetas.
- **Riesgos**: No mezclar precios con receta, ni presentar sugeridas/reconocidas como validadas. La navegación hacia una receta concreta conserva la ruta por `lineTemplateId`.

---

## Ruta: /configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion/page.tsx`
- **Proposito**: Administrar recetas versionadas de una linea, duplicar bases Ventora, editar componentes con reglas controladas, ejecutar casos reales y validar versiones. Incluye el flujo visual Identidad -> Componentes -> Prueba -> Validación y la pauta FFD referencial de barras.
- **Componentes principales**: `FabricacionLineWorkspace`, `RecipeGuidedEditor`, `RecipeTestLab`
- **Hooks**: `useFabricationRecipes`, `useCotizacionLineTemplates`
- **Tablas Supabase relacionadas**: `fabrication_recipes`, `fabrication_recipe_tests`, `cotizacion_line_templates`
- **Acciones principales**: Crear, editar borrador, duplicar, versionar, archivar, guardar casos obligatorios/opcionales, ejecutar motor deterministico y validar.
- **Riesgos**: No exponer JSON, formulas libres ni codigo ejecutable. Una version `validated` es solo lectura. No confundir receta Ventora con receta validada por el taller.

---

## Ruta: /configuracion/empresa/lineas-precios/importar

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/configuracion/empresa/lineas-precios/importar/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Importación revisable de catálogo desde CSV/XLSX (archivo → mapeo → preview → confirmar)
- **Usuario objetivo**: Admin autenticado
- **Componentes principales**: `LineasPreciosImportClient`, `line-template-import.service.ts`
- **Hooks**: `useCotizacionLineTemplates.importTemplates`
- **Tablas Supabase relacionadas**: `cotizacion_line_templates`
- **Riesgos**: No persiste en silencio; duplicados requieren decisión explícita (ignorar/actualizar/crear).

---

## Ruta: /configuracion/pagina-venta

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/configuracion/pagina-venta/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Configuracion de la pagina publica de venta/lead: hero, galeria, horario, colores, toggle formulario, preview
- **Usuario objetivo**: Admin autenticado
- **Funcionalidades visibles**: Hero title/subtitle, Joyride contextual, galeria imagenes (max 8), horario por dia, colores, toggle publicacion, preview
- **Componentes principales**: Internos de la pagina
- **Hooks**: `useOrganizationProfile`, `useLandingGallery`
- **Datos que consume**: Perfil org + galeria
- **Tablas Supabase relacionadas**: `organization_profile`, `public_landing_gallery`, Storage bucket `organization-assets`
- **Acciones principales**: Actualizar landing config, subir/reordenar/eliminar galeria, toggle publicacion
- **Archivos a tocar para modificar**: `app/(pwa-app)/configuracion/pagina-venta/page.tsx`, `src/features/organization-profile/hooks/useOrganizationProfile.ts`, `src/features/landing-gallery/hooks/useLandingGallery.ts`, `src/features/landing-gallery/services/landing-gallery.service.ts`, `src/features/landing-gallery/repositories/landing-gallery.repository.ts`
- **Riesgos**: No romper max 8 items de galeria. No cambiar logica de publicacion sin afectar landing publica ni la derivacion de `public_page_live`.

---

## Ruta: /presupuesto/[token]

- **Tipo**: Publica, dinamica
- **Archivo principal**: `app/presupuesto/[token]/page.tsx`
- **Acciones servidor**: `app/presupuesto/[token]/actions.ts`
- **Layout usado**: `app/layout.tsx` (root layout, sin shell)
- **Proposito**: Presupuesto publico de cotizacion. Cliente final ve detalle, items, totales, branding empresa, y puede aprobar/rechazar.
- **Usuario objetivo**: Cliente final de la empresa (no autenticado)
- **Funcionalidades visibles**: Detalle cotizacion, items, totales, branding empresa, botones aprobar/rechazar
- **Componentes principales**: `PublicQuoteMobile`, `PublicQuotePreview`
- **Datos que consume**: Cotizacion por approval_token + perfil org
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`, `organization_profile`
- **Acciones principales**: `acceptPublicQuoteAction`, `rejectPublicQuoteAction` (server actions)
- **Archivos a tocar para modificar**: `app/presupuesto/[token]/page.tsx`, `app/presupuesto/[token]/actions.ts`, `src/features/cotizaciones/public-approval/services/public-cotizacion-approval.service.ts`, `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts`
- **Riesgos**: RUTA CRITICA de cierre. No romper aprobacion/rechazo. Token tiene expiracion. Push notification al vendedor tras decision. No cambiar logica de `approval_token`. La respuesta publica debe sanear `cotizacion_items.observaciones` con allowlist comercial/visual: nunca exponer costos, margen, IDs de plantilla/receta, selector tecnico ni snapshots de fabricacion.

---

## Ruta: /privacy

- **Tipo**: Publica
- **Archivo principal**: `app/(landing-web)/privacy/page.tsx`
- **Proposito**: Politica de privacidad
- **Metadata**: titulo, descripcion y canonical absoluto en la misma pagina
- **Archivos a tocar**: `app/(landing-web)/privacy/page.tsx`

---

## Ruta: /terms

- **Tipo**: Publica
- **Archivo principal**: `app/(landing-web)/terms/page.tsx`
- **Proposito**: Terminos de uso
- **Metadata**: titulo, descripcion y canonical absoluto en la misma pagina
- **Archivos a tocar**: `app/(landing-web)/terms/page.tsx`

---

## Ruta: /auth (callback)

- **Tipo**: Interna
- **Archivo principal**: `app/(auth-public)/auth/`
- **Proposito**: Callback OAuth PKCE
- **Riesgos**: No romper intercambio de codigo.

---

## Ruta: /auth/logout

- **Tipo**: Interna
- **Archivo principal**: `app/(auth-public)/auth/logout/route.ts`
- **Proposito**: Cierre server-side de sesion para limpiar cookies SSR y redirigir de forma segura a `/login`
- **Usuario objetivo**: Usuario autenticado saliendo del panel cliente o del panel founder `/admin`
- **Acciones principales**: Expirar cookies Supabase activas y redirigir al login sin pasar por una navegacion SPA protegida
- **Archivos a tocar para modificar**: `app/(auth-public)/auth/logout/route.ts`, `src/components/layout/app-shell.tsx`, `src/features/admin/components/admin-sidebar.tsx`, `src/features/auth/services/logout-navigation.service.ts`
- **Riesgos**: No dejar cookies de sesion vivas en dominios compartidos (`.ventorap.cl`). No redirigir de vuelta a rutas privadas durante el logout. No exponer `/auth/logout` como `Link` prefetchable en `AdminSidebar` ni `AppShell`; ambos deben salir por `navigateToLogoutRoute()` (hard nav).

---

## API Routes

| Ruta | Metodo | Proposito | Archivo |
|---|---|---|---|
| `/api/solicitud/[empresa]` | POST | Crear solicitud publica (rate limited) | `app/api/solicitud/[empresa]/route.ts` |
| `/api/solicitudes/resumen` | GET | Resumen solicitudes por org (auth) | `app/api/solicitudes/resumen/route.ts` |
| `/api/cotizaciones/resumen` | GET | Resumen cotizaciones por org (auth) | `app/api/cotizaciones/resumen/route.ts` |
| `/api/cotizaciones/[id]/pdf-descargado` | POST | Registra descarga silenciosa de PDF (auth) | `app/api/cotizaciones/[id]/pdf-descargado/route.ts` |
| `/api/clientes/resumen` | GET | Resumen clientes por org (auth) | `app/api/clientes/resumen/route.ts` |
| `/api/dashboard/summary` | GET | Dashboard KPIs por org (auth) | `app/api/dashboard/summary/route.ts` |
| `/api/pwa/push-subscriptions` | POST/DELETE | Registrar/eliminar suscripcion push | `app/api/pwa/push-subscriptions/route.ts` |
| `/api/billing/checkout` | POST | Retirado; responde 410 y remite al checkout canónico de Mercado Pago | `app/api/billing/checkout/route.ts` |
| `/api/billing/flow/confirmar` | GET/POST | Retirado; Flow no es una pasarela activa | `app/api/billing/flow/confirmar/route.ts` |
| `/api/subscriptions/webpay/crear` | POST | Retirado; responde 410 y remite a Mercado Pago | `app/api/subscriptions/webpay/crear/route.ts` |
| `/api/subscriptions/webpay/confirmar` | GET/POST | Retirado; Webpay no es una pasarela activa | `app/api/subscriptions/webpay/confirmar/route.ts` |
| `/api/subscriptions/mercadopago/create` | POST | Reserva y crea suscripcion MP Chile autenticada | `app/api/subscriptions/mercadopago/create/route.ts` |
| `/api/subscriptions/mercadopago/webhook` | POST | Valida firma, consulta recurso MP y reconcilia idempotente | `app/api/subscriptions/mercadopago/webhook/route.ts` |

---

## Rutas de impresion

| Ruta | Proposito | Archivo |
|---|---|---|
| `/print/cotizaciones/[id]/fabricacion` | Resumen interno de fabricación / pauta (sin precios). Separado del PDF cliente. Enlace desde detalle de cotización. Desktop: bloques colapsables Cubicación/Despiece/Pauta y modal de despiece existente. | `app/print/cotizaciones/[id]/fabricacion/page.tsx`, `fabricacion-resumen-view.tsx`, `src/features/cotizaciones/line-templates/types/fabrication-quote-summary.ts` |
| `/print/cotizaciones/[id]` | Visor/descarga PDF. Registra `pdf_descargado_en` en silencio + toast. Usa el renderer compartido: croquis protagonista (`maxH: 260`, marco hasta 248 px), perfiles, cotas y aperturas. Preview/export HTML revisados; falta rasterizar un PDF descargado real. Características vía `buildCotizacionItemPrintSpecs()` (sin Material/Color en Espejo/Cubierta de mesa). | `app/print/cotizaciones/[id]/page.tsx`, `app/print/cotizaciones/[id]/_utils/item-print-specs.ts`, `src/features/cotizaciones/visual-composer/` |
## Inventario exhaustivo de rutas

Generado desde app/ y verificado por pnpm docs:check. El detalle funcional de cada superficie está en las secciones específicas de este archivo.

| Ruta | Tipo | Área | Archivo fuente |
|---|---|---|---|
| `/` | page | public | `app/(landing-web)/page.tsx` |
| `/.well-known/assetlinks.json` | api | private | `app/.well-known/assetlinks.json/route.ts` |
| `/activacion` | page | private | `app/(pwa-app)/activacion/page.tsx` |
| `/admin` | page | admin | `app/admin/page.tsx` |
| `/admin/activacion` | page | admin | `app/admin/activacion/page.tsx` |
| `/admin/clientes` | page | admin | `app/admin/clientes/page.tsx` |
| `/admin/clientes/[organizationId]` | page | admin | `app/admin/clientes/[organizationId]/page.tsx` |
| `/admin/growth` | page | admin | `app/admin/growth/page.tsx` |
| `/admin/marketing` | page | admin | `app/admin/marketing/page.tsx` |
| `/admin/marketing/onboarding` | page | admin | `app/admin/marketing/onboarding/page.tsx` |
| `/admin/pagos-y-planes` | page | admin | `app/admin/pagos-y-planes/page.tsx` |
| `/admin/prospectos` | page | admin | `app/admin/prospectos/page.tsx` |
| `/admin/tareas` | page | admin | `app/admin/tareas/page.tsx` |
| `/api/admin/activacion` | api | api | `app/api/admin/activacion/route.ts` |
| `/api/admin/clientes` | api | api | `app/api/admin/clientes/route.ts` |
| `/api/admin/clientes/activate-payment` | api | api | `app/api/admin/clientes/activate-payment/route.ts` |
| `/api/admin/clientes/deactivate-trial` | api | api | `app/api/admin/clientes/deactivate-trial/route.ts` |
| `/api/admin/clientes/extend-trial` | api | api | `app/api/admin/clientes/extend-trial/route.ts` |
| `/api/admin/clientes/provision` | api | api | `app/api/admin/clientes/provision/route.ts` |
| `/api/admin/clientes/set-test-account` | api | api | `app/api/admin/clientes/set-test-account/route.ts` |
| `/api/admin/dashboard` | api | api | `app/api/admin/dashboard/route.ts` |
| `/api/admin/growth/activities` | api | api | `app/api/admin/growth/activities/route.ts` |
| `/api/admin/growth/import-excel` | api | api | `app/api/admin/growth/import-excel/route.ts` |
| `/api/admin/growth/import-local-workspace` | api | api | `app/api/admin/growth/import-local-workspace/route.ts` |
| `/api/admin/growth/prospects` | api | api | `app/api/admin/growth/prospects/route.ts` |
| `/api/admin/growth/prospects/[id]` | api | api | `app/api/admin/growth/prospects/[id]/route.ts` |
| `/api/admin/growth/prospects/[id]/contact` | api | api | `app/api/admin/growth/prospects/[id]/contact/route.ts` |
| `/api/admin/growth/tasks` | api | api | `app/api/admin/growth/tasks/route.ts` |
| `/api/admin/growth/work-today` | api | api | `app/api/admin/growth/work-today/route.ts` |
| `/api/admin/growth/workspace` | api | api | `app/api/admin/growth/workspace/route.ts` |
| `/api/admin/marketing` | api | api | `app/api/admin/marketing/route.ts` |
| `/api/admin/marketing/content` | api | api | `app/api/admin/marketing/content/route.ts` |
| `/api/admin/marketing/onboarding` | api | api | `app/api/admin/marketing/onboarding/route.ts` |
| `/api/admin/pagos` | api | api | `app/api/admin/pagos/route.ts` |
| `/api/admin/pagos/confirm` | api | api | `app/api/admin/pagos/confirm/route.ts` |
| `/api/admin/pagos/reject` | api | api | `app/api/admin/pagos/reject/route.ts` |
| `/api/admin/tareas` | api | api | `app/api/admin/tareas/route.ts` |
| `/api/app-version` | api | api | `app/api/app-version/route.ts` |
| `/api/auth/oauth/complete-registration` | api | api | `app/api/auth/oauth/complete-registration/route.ts` |
| `/api/auth/profile` | api | api | `app/api/auth/profile/route.ts` |
| `/api/auth/register` | api | api | `app/api/auth/register/route.ts` |
| `/api/auth/signup` | api | api | `app/api/auth/signup/route.ts` |
| `/api/billing/checkout` | api | api | `app/api/billing/checkout/route.ts` |
| `/api/billing/flow/confirmar` | api | api | `app/api/billing/flow/confirmar/route.ts` |
| `/api/clientes/resumen` | api | api | `app/api/clientes/resumen/route.ts` |
| `/api/cotizaciones/[id]/pdf-descargado` | api | api | `app/api/cotizaciones/[id]/pdf-descargado/route.ts` |
| `/api/cotizaciones/resumen` | api | api | `app/api/cotizaciones/resumen/route.ts` |
| `/api/dashboard/summary` | api | api | `app/api/dashboard/summary/route.ts` |
| `/api/fabricacion/asistente-texto` | api | api | `app/api/fabricacion/asistente-texto/route.ts` |
| `/api/onboarding/activation/status` | api | api | `app/api/onboarding/activation/status/route.ts` |
| `/api/onboarding/videos` | api | api | `app/api/onboarding/videos/route.ts` |
| `/api/organization-assets/upload` | api | api | `app/api/organization-assets/upload/route.ts` |
| `/api/public-landing/revalidate` | api | api | `app/api/public-landing/revalidate/route.ts` |
| `/api/pwa/push-subscriptions` | api | api | `app/api/pwa/push-subscriptions/route.ts` |
| `/api/solicitud/[empresa]` | api | api | `app/api/solicitud/[empresa]/route.ts` |
| `/api/solicitud/[empresa]/valoraciones` | api | api | `app/api/solicitud/[empresa]/valoraciones/route.ts` |
| `/api/solicitudes` | api | api | `app/api/solicitudes/route.ts` |
| `/api/solicitudes/resumen` | api | api | `app/api/solicitudes/resumen/route.ts` |
| `/api/subscriptions/mercadopago/cancel` | api | api | `app/api/subscriptions/mercadopago/cancel/route.ts` |
| `/api/subscriptions/mercadopago/create` | api | api | `app/api/subscriptions/mercadopago/create/route.ts` |
| `/api/subscriptions/mercadopago/webhook` | api | api | `app/api/subscriptions/mercadopago/webhook/route.ts` |
| `/api/subscriptions/pagos` | api | api | `app/api/subscriptions/pagos/route.ts` |
| `/api/subscriptions/summary` | api | api | `app/api/subscriptions/summary/route.ts` |
| `/api/subscriptions/webpay/confirmar` | api | api | `app/api/subscriptions/webpay/confirmar/route.ts` |
| `/api/subscriptions/webpay/crear` | api | api | `app/api/subscriptions/webpay/crear/route.ts` |
| `/auth/callback` | api | auth | `app/(auth-public)/auth/callback/route.ts` |
| `/auth/completar-cuenta` | page | auth | `app/(auth-public)/auth/completar-cuenta/page.tsx` |
| `/auth/definir-contrasena` | page | auth | `app/(auth-public)/auth/definir-contrasena/page.tsx` |
| `/auth/logout` | api | auth | `app/(auth-public)/auth/logout/route.ts` |
| `/biblioteca-lineas` | page | private | `app/(pwa-app)/biblioteca-lineas/page.tsx` |
| `/clientes` | page | private | `app/(pwa-app)/clientes/page.tsx` |
| `/clientes/[id]` | page | private | `app/(pwa-app)/clientes/[id]/page.tsx` |
| `/clientes/[id]/editar` | page | private | `app/(pwa-app)/clientes/[id]/editar/page.tsx` |
| `/clientes/nuevo` | page | private | `app/(pwa-app)/clientes/nuevo/page.tsx` |
| `/configuracion/empresa` | page | private | `app/(pwa-app)/configuracion/empresa/page.tsx` |
| `/configuracion/empresa/lineas-precios` | page | private | `app/(pwa-app)/configuracion/empresa/lineas-precios/page.tsx` |
| `/configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion` | page | private | `app/(pwa-app)/configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion/page.tsx` |
| `/configuracion/empresa/lineas-precios/importar` | page | private | `app/(pwa-app)/configuracion/empresa/lineas-precios/importar/page.tsx` |
| `/configuracion/pagina-venta` | page | private | `app/(pwa-app)/configuracion/pagina-venta/page.tsx` |
| `/cotizaciones` | page | private | `app/(pwa-app)/cotizaciones/page.tsx` |
| `/cotizaciones/[id]` | page | private | `app/(pwa-app)/cotizaciones/[id]/page.tsx` |
| `/cotizaciones/nueva` | page | private | `app/(pwa-app)/cotizaciones/nueva/page.tsx` |
| `/cuenta-vencida` | page | private | `app/(subscription-gate)/cuenta-vencida/page.tsx` |
| `/cuenta-vencida/mercadopago/retorno` | page | private | `app/(subscription-gate)/cuenta-vencida/mercadopago/retorno/page.tsx` |
| `/cuenta/suscripcion` | page | private | `app/(pwa-app)/cuenta/suscripcion/page.tsx` |
| `/dashboard` | page | private | `app/(pwa-app)/dashboard/page.tsx` |
| `/login` | page | auth | `app/(auth-public)/login/page.tsx` |
| `/mis-recetas` | page | private | `app/(pwa-app)/mis-recetas/page.tsx` |
| `/offline` | page | private | `app/(landing-web)/offline/page.tsx` |
| `/planes` | page | public | `app/(landing-web)/planes/page.tsx` |
| `/presupuesto/[token]` | page | public | `app/presupuesto/[token]/page.tsx` |
| `/presupuesto/[token]/documento` | page | public | `app/presupuesto/[token]/documento/page.tsx` |
| `/print/cotizaciones/[id]` | page | print | `app/print/cotizaciones/[id]/page.tsx` |
| `/print/cotizaciones/[id]/fabricacion` | page | print | `app/print/cotizaciones/[id]/fabricacion/page.tsx` |
| `/privacy` | page | private | `app/(landing-web)/privacy/page.tsx` |
| `/registro` | page | auth | `app/(auth-public)/registro/page.tsx` |
| `/solicitud/[empresa]` | page | public | `app/(landing-web)/solicitud/[empresa]/page.tsx` |
| `/solicitudes` | page | public | `app/(pwa-app)/solicitudes/page.tsx` |
| `/solicitudes/canales` | page | public | `app/(pwa-app)/solicitudes/canales/page.tsx` |
| `/terms` | page | private | `app/(landing-web)/terms/page.tsx` |
