# Routes Map - Ventora

## Ruta: / (Landing)

- **Tipo**: Publica
- **Archivo principal**: `app/(landing-web)/page.tsx`
- **Layout usado**: `app/layout.tsx` (root layout, sin shell)
- **CSS**: `app/(landing-web)/landing.module.css`
- **Proposito**: Landing comercial del producto. Secciones: hero, problema, funciones, como funciona, planes, FAQ, contacto, WhatsApp CTA.
- **Usuario objetivo**: Visitante no autenticado, potencial cliente SaaS
- **Funcionalidades visibles**: Navbar, hero con mockup, ProblemSection, FAQ,_planes, contacto, footer
- **Componentes principales**: `ProblemSection`, `ProblemCard`, `TestimonialsSection`, `FooterSection`, `PremiumPageReveal`
- **Datos que consume**: Estatico (no consulta Supabase)
- **Tablas Supabase relacionadas**: Ninguna
- **Acciones principales**: Navegacion, CTA a demo/login
- **Archivos a tocar para modificar**: `app/(landing-web)/page.tsx`, `app/(landing-web)/landing.module.css`, `src/components/landing/*`, `src/components/footer-section.tsx`, `src/components/testimonials-with-marquee.tsx`
- **Riesgos**: Es la cara publica del producto. Cambios de copy afectan conversion. No romper links de navegacion.

---

## Ruta: /planes

- **Tipo**: Publica
- **Archivo principal**: `app/(landing-web)/planes/page.tsx`
- **Layout usado**: `app/layout.tsx` (root layout)
- **CSS**: `app/(landing-web)/planes/page.module.css`
- **Proposito**: Pagina de planes/precios del SaaS
- **Usuario objetivo**: Visitante evaluando planes
- **Funcionalidades visibles**: Cards de planes, CTA
- **Componentes principales**: Internos de la pagina
- **Datos que consume**: Estatico
- **Tablas Supabase relacionadas**: Ninguna
- **Acciones principales**: Navegacion, CTA a solicitar cuenta
- **Archivos a tocar para modificar**: `app/(landing-web)/planes/page.tsx`, `app/(landing-web)/planes/page.module.css`
- **Riesgos**: Copy comercial sensible. No cambiar precios sin instruccion.

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
- **Proposito**: Autenticacion email/password
- **Usuario objetivo**: Usuario no autenticado
- **Funcionalidades visibles**: Formulario login, manejo de errores, ver/ocultar contrasena, reinicio local de app en dispositivo, redireccion post-login
- **Componentes principales**: `LoginView` (interno de la pagina)
- **Datos que consume**: `auth.users`, `public.users`
- **Tablas Supabase relacionadas**: `auth.users`, `public.users`
- **Acciones principales**: `signIn` via `authService`
- **Archivos a tocar para modificar**: `app/(auth-public)/login/page.tsx`, `src/features/auth/hooks/useAuth.ts`, `src/features/auth/services/auth.service.ts`, `src/features/auth/repositories/auth.repository.ts`
- **Riesgos**: No romper flujo PKCE. El proxy redirige usuarios autenticados a `/dashboard`. No cambiar manejo de `?next=` param. No volver a colapsar errores distintos bajo "correo o contrasena incorrecta"; el login ahora clasifica timeout, cookie no lista, perfil faltante, red y permisos.

---

## Ruta: /registro

- **Tipo**: Publica
- **Archivo principal**: `app/(auth-public)/registro/page.tsx`
- **Componente principal**: `app/(auth-public)/registro/registro-view.tsx`
- **API usada**: `app/api/auth/register/route.ts`
- **Proposito**: Solicitar cuenta de prueba asistida. Captura nombre, empresa, WhatsApp, ciudad/comuna y mensaje opcional.
- **Usuario objetivo**: Prospecto SaaS que necesita onboarding asistido
- **Datos que consume/escribe**: Inserta lead en `solicitudes_contacto` con `contexto = registro-saas`, `organization_id = null`
- **Tablas Supabase relacionadas**: `solicitudes_contacto`
- **Acciones principales**: Enviar solicitud y mostrar confirmacion. No crea usuario Supabase Auth, organizacion, perfil ni trial.
- **Archivos a tocar para modificar**: `app/(auth-public)/registro/registro-view.tsx`, `app/api/auth/register/route.ts`, `src/features/solicitudes/services/solicitudes-contacto.service.ts`, `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`
- **Riesgos**: Mantener cerrado el autoservicio. No reintroducir creacion directa de Auth/organizacion desde esta ruta. Si se cambia `contexto`, revisar constraint/RLS de `solicitudes_contacto`.

---

## Ruta: /activacion

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/activacion/page.tsx`
- **CSS**: `app/(pwa-app)/activacion/page.module.css`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell` (variante **minimal**: sin bottom nav)
- **Proposito**: Wizard de **primera activacion** separado del dashboard. Guia al admin sin cotizaciones hasta crear su primera cotizacion, ver PDF y opcionalmente cargar datos de empresa.
- **Usuario objetivo**: Admin nuevo (`quoteCount === 0`, step `activation_complete` pendiente)
- **Funcionalidades visibles**: Bienvenida, elegir demo vs real, rapida por total vs con componentes, resumen con desglose neto/IVA, Ver PDF, datos empresa (opcionales), entrar a Ventora
- **Componentes principales**: Wizard inline en `page.tsx` (sin componentes externos aun)
- **Hooks/servicios**: `useActivationGate`, `useCotizacionesStore`, `useOrganizationProfile`, `onboarding-activation-flow.service.ts`
- **API**: `GET/POST /api/onboarding/activation/status`
- **Tablas Supabase**: `onboarding_checklists` (`activation_complete`), `cotizaciones`, `cotizacion_items`, `organization_profile`
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
- **Proposito**: Dashboard comercial desktop del Milestone 1, con KPIs reales basados en cotizaciones, solicitudes y obras activas; no es un CRM ni un pipeline de oportunidades.
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Saludo, resumen comercial (valor cotizado, creadas, PDF generados, aprobadas), alertas secundarias solo si hay respuesta publica real, cotizaciones recientes con estados neutrales, CTA nueva cotizacion. Admin sin cotizaciones es redirigido a `/activacion` (no hay card de onboarding embebida).
- **Componentes principales**: `DashboardDesktop`, `DashboardMobile`, `PremiumPageReveal`
- **Hooks**: `useDashboardViewModel`, `useDashboardSummary`, `useDashboardBreakpoint`
- **Datos que consume**: Resumen de cotizaciones + alertas via `/api/dashboard/summary`; el roadmap permite sumar embudo de solicitudes y obras activas solo desde datos reales existentes.
- **Tablas Supabase relacionadas**: `cotizaciones`, `clients`, `projects`, `solicitudes_contacto`
- **Acciones principales**: Navegacion a nueva cotizacion, ver cotizaciones
- **Archivos a tocar para modificar**: `app/(pwa-app)/dashboard/page.tsx`, `app/(pwa-app)/dashboard/_components/*`, `app/(pwa-app)/dashboard/_hooks/*`, `src/features/dashboard/services/dashboard-summary-server.service.ts`, `app/api/dashboard/summary/route.ts`
- **Riesgos**: Vista responsive con breakpoint 1024px. No romper logica de KPIs. No reintroducir "pendientes" como alerta principal ni card de onboarding en dashboard (activacion vive en `/activacion`). No documentar cobros, oportunidades ni KPI inventados. Si la suscripcion/trial esta vencida, puede seguir mostrandose en modo lectura pero el shell debe levantar banner o redirect cuando el usuario intente escribir o ir a configuracion.

---

## Ruta: /admin

- **Tipo**: Privada (autenticada + founder allowlist)
- **Archivo principal**: `app/admin/page.tsx`
- **Layout usado**: `app/admin/layout.tsx` -> `AdminShell`
- **Proposito**: Dashboard interno de Ventora para operar clientes SaaS, trials, cobros y foco comercial founder sin entrar al panel cliente.
- **Usuario objetivo**: Founder/admin interno allowlist por correo
- **Funcionalidades visibles**: Hero interno, KPIs globales (activos, trial, vencen esta semana, MRR/ARR estimado, pagos pendientes), tablas de trials urgentes, pagos recientes y altas recientes
- **Componentes principales**: `AdminShell`, `AdminSidebar`, `AdminKpiCard`, `ClientStatusBadge`, `SourceBadge`
- **Hooks**: Ninguno en Fase 1
- **Datos que consume**: Resumen server-side via `adminSummaryService`
- **Tablas Supabase relacionadas**: `organizations`, `organization_profile`, `users`, `pagos_suscripcion`
- **Acciones principales**: Navegar a clientes SaaS, abrir prospectos `/admin/growth`, revisar urgencias
- **Archivos a tocar para modificar**: `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/admin.module.css`, `src/features/admin/components/*`, `src/features/admin/services/admin-summary.service.ts`, `src/features/admin/repositories/admin-clients.repository.ts`, `proxy.ts`
- **Riesgos**: No reutilizar `AppShell`. No abrir esta ruta a admins normales de una organizacion. No exponer `service_role` ni datos multi-tenant al cliente.

---

## Ruta: /admin/clientes

- **Tipo**: Privada (autenticada + founder allowlist)
- **Archivo principal**: `app/admin/clientes/page.tsx`
- **Layout usado**: `app/admin/layout.tsx` -> `AdminShell`
- **Proposito**: Tabla global de organizaciones SaaS con plan, estado, trial, suscripcion y ultimo pago.
- **Usuario objetivo**: Founder/admin interno allowlist por correo
- **Funcionalidades visibles**: Tabla con empresa, correo principal, telefono, plan, estado de suscripcion, `trial_ends_at`, `subscription_ends_at`, ultimo pago y acceso a ficha
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
- **Funcionalidades visibles**: Datos `organizations` + `organization_profile`, usuario principal, estado efectivo de trial/suscripcion, historial `pagos_suscripcion`, links rapidos a pagina publica y WhatsApp, placeholders visuales para extender trial / activar pago / cambiar plan
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
- **Proposito**: Formulario guiado de nueva cotizacion. Es la prioridad actual de estabilizacion y luego la base del Quote Studio desktop.
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Formulario multi-paso (Cliente, Presupuesto, Revisar y guardar), Joyride contextual de onboarding, selector compacto de metodo de presupuesto en Paso 1 desktop, estacion desktop de Paso 2 en dos columnas con pieza local "En edicion" y subpasos Tipo/Sistema/Medidas/Precio, modo `por_item` con costo proveedor + margen/precio por linea, modo `total_global` con cuaderno comercial y total final cliente + selector IVA incluido/sin IVA, guardado borrador/presupuesto. En **Espejo** y **Cubierta de mesa** no se pide Aluminio/PVC ni color de perfil; en **Espejo** se muestran espesores recomendados 3–6 mm. Mobile mantiene el wizard actual.
- **Componentes principales**: Internos de la pagina (1198 lineas)
- **Nota onboarding 2026-06-19**: La entrada inicial debe priorizar `Cotizacion rapida` (`total_global`) y mostrar exito/resumen de PDF antes de pedir datos de empresa. No volver a montar Joyride contextual en esta ruta.
- **Hooks**: `useCotizacionesStore`, `useOrganizationProfile`
- **Datos que consume**: Perfil org (margen/proveedor defaults), catalogo componentes, sugerencias
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`, `organization_profile`
- **Acciones principales**: Crear borrador, guardar presupuesto, auto-crear cliente/proyecto (`projects`, visible como Obras)
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/nueva/page.tsx`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-uno-datos-cliente.tsx`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-seccion.tsx`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-agregar-grupo-sheet.tsx`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-panel-componentes.tsx`, `src/features/cotizaciones/new-quote/workflow-ui.ts` (`shouldRequireProfileMaterialForComponent`, `MIRROR_GLASS_THICKNESS_OPTIONS`), `src/features/cotizaciones/new-quote/solicitud-prefill.ts`, `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`, `src/features/cotizaciones/services/cotizaciones.service.ts`, `src/features/cotizaciones/services/component-catalog.service.ts`, `src/features/cotizaciones/services/component-suggestions.service.ts`, `src/features/cotizaciones/services/glass-recommendations.service.ts`, `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-vidrio-movil.tsx`
- **Riesgos**: Pagina muy grande (1198 lineas). Workflow state persistido en sessionStorage. No romper calculos de pricing por componente, Joyride contextual ni auto-creacion de cliente/proyecto. En modo `total_global`, no exponer costo, margen ni utilidad y no mostrar `$0` por item en PDF/vista publica/documento publico. No introducir aun constructor visual, nuevas rutas de obras ni tablas nuevas sin aprobacion. Esta ruta debe quedar bloqueada para cuentas con trial vencido o suscripcion no activa.
- **Riesgo onboarding 2026-06-19**: No reintroducir empresa/pagina/canales antes de crear una cotizacion ni redirigir automaticamente al PDF al guardar.

---

## Ruta: /cotizaciones/[id]

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/cotizaciones/[id]/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Detalle de cotizacion con items, totales y acciones
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Header con estado visible neutro (Creada/PDF generado/Enviada/etc.), cierre comercial manual en seccion secundaria, items, totales, recordatorio contextual para compartir la primera cotizacion, acciones (PDF, WhatsApp, editar, eliminar)
- **Componentes principales**: `CotizacionDetalleMobileView`, `CotizacionDetalleMobileViewModel`
- **Hooks**: `useCotizacionesStore`
- **Datos que consume**: Cotizacion por ID con items
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`
- **Acciones principales**: Ver detalle, generar PDF, compartir WhatsApp, editar, eliminar
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/[id]/page.tsx`, `app/(pwa-app)/cotizaciones/[id]/_components/*`, `src/features/cotizaciones/hooks/useCotizacionesStore.ts`, `src/features/cotizaciones/services/cotizacion-display-state.service.ts`
- **Riesgos**: No romper generacion de PDF, link de WhatsApp ni la marca de `first_share`.

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
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Ficha de cliente con Obras (`projects`) y cotizaciones asociadas
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Header, estado badge, telefono, direccion, tabs Obras/cotizaciones, menu contextual
- **Componentes principales**: `ClienteDetalleMobileView`, `ClienteDetalleMobileViewModel`
- **Hooks**: `useClientes`
- **Datos que consume**: Cliente detalle con proyectos y cotizaciones
- **Tablas Supabase relacionadas**: `clients`, `projects`, `cotizaciones`
- **Acciones principales**: Ver ficha, editar, ver proyectos/cotizaciones
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/[id]/page.tsx`, `app/(pwa-app)/clientes/[id]/_components/*`, `src/features/clientes/services/clientes.service.ts`
- **Riesgos**: No romper tabs ni navegacion a cotizaciones/obras.

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
- **Archivo principal**: `app/(pwa-app)/cuenta-vencida/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell` (modo minimo)
- **CSS**: `app/(pwa-app)/cuenta-vencida/page.module.css`
- **Proposito**: Pantalla de activacion/renovacion cuando el trial o la suscripcion de la organizacion vencio. Debe empujar planes anuales con Webpay Plus y dejar el mensual manual como opcion secundaria.
- **Usuario objetivo**: Admin/vendedor autenticado con cuenta en modo lectura
- **Funcionalidades visibles**: Flecha volver, hero de activacion, plan recomendado `Founder Full Anual`, opcion `Solo Cotizacion Anual`, opcion `Mensual` por WhatsApp, bloque consultivo `Plan Empresa Acompañado`, accion discreta `Seguir en modo lectura`
- **Componentes principales**: Internos de la pagina
- **Datos que consume**: `organization_profile` con snapshot calculado de suscripcion
- **Tablas Supabase relacionadas**: `organization_profile`
- **Acciones principales**: Iniciar Webpay anual, abrir WhatsApp para plan mensual manual, volver a lectura basica
- **Archivos a tocar para modificar**: `app/(pwa-app)/cuenta-vencida/page.tsx`, `app/(pwa-app)/cuenta-vencida/page.module.css`, `src/features/subscriptions/services/*`, `src/components/layout/app-shell.tsx`
- **Riesgos**: No convertirla en logout forzado. Debe convivir con lectura basica del panel y no tocar rutas publicas `/solicitud/[empresa]` ni `/presupuesto/[token]`. Si la cuenta ya esta activa con vencimiento futuro, la UI debe deshabilitar Webpay y mostrar mensaje controlado para evitar doble pago accidental.

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
- **Riesgos**: No cambiar slug sin actualizar indice unico. No romper upload de logo (requiere bucket `organization-assets`) ni la marca manual de `channel_ready` al copiar link.

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
- **Riesgos**: RUTA CRITICA de cierre. No romper aprobacion/rechazo. Token tiene expiracion. Push notification al vendedor tras decision. No cambiar logica de `approval_token`.

---

## Ruta: /privacy

- **Tipo**: Publica
- **Archivo principal**: `app/(landing-web)/privacy/page.tsx`
- **Proposito**: Politica de privacidad
- **Archivos a tocar**: `app/(landing-web)/privacy/page.tsx`

---

## Ruta: /terms

- **Tipo**: Publica
- **Archivo principal**: `app/(landing-web)/terms/page.tsx`
- **Proposito**: Terminos de uso
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
- **Usuario objetivo**: Usuario autenticado saliendo del panel
- **Acciones principales**: Expirar cookies Supabase activas y redirigir al login sin pasar por una navegacion SPA protegida
- **Archivos a tocar para modificar**: `app/(auth-public)/auth/logout/route.ts`, `src/components/layout/app-shell.tsx`
- **Riesgos**: No dejar cookies de sesion vivas en dominios compartidos (`.ventorap.cl`). No redirigir de vuelta a rutas privadas durante el logout.

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
| `/api/billing/checkout` | POST | Crear checkout provider-agnostic; v1 usa Flow | `app/api/billing/checkout/route.ts` |
| `/api/billing/flow/confirmar` | GET/POST | Retorno/webhook Flow, verifica estado y activa suscripcion | `app/api/billing/flow/confirmar/route.ts` |
| `/api/subscriptions/webpay/crear` | POST | Checkout Webpay legacy/compatibilidad | `app/api/subscriptions/webpay/crear/route.ts` |
| `/api/subscriptions/webpay/confirmar` | GET/POST | Retorno Webpay legacy/compatibilidad | `app/api/subscriptions/webpay/confirmar/route.ts` |

---

## Rutas de impresion

| Ruta | Proposito | Archivo |
|---|---|---|
| `/print/cotizaciones/[id]` | Visor/descarga PDF. Registra `pdf_descargado_en` en silencio + toast. Caracteristicas via `buildCotizacionItemPrintSpecs()` (sin Material/Color en Espejo/Cubierta de mesa). | `app/print/cotizaciones/[id]/page.tsx`, `app/print/cotizaciones/[id]/_utils/item-print-specs.ts` |
