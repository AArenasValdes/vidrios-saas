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
- **Acciones principales**: Navegacion, CTA a registro
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
- **Funcionalidades visibles**: Formulario login, manejo de errores, redireccion post-login
- **Componentes principales**: `LoginView` (interno de la pagina)
- **Datos que consume**: `auth.users`, `public.users`
- **Tablas Supabase relacionadas**: `auth.users`, `public.users`
- **Acciones principales**: `signIn` via `authService`
- **Archivos a tocar para modificar**: `app/(auth-public)/login/page.tsx`, `src/features/auth/hooks/useAuth.ts`, `src/features/auth/services/auth.service.ts`, `src/features/auth/repositories/auth.repository.ts`
- **Riesgos**: No romper flujo PKCE. El proxy redirige usuarios autenticados a `/dashboard`. No cambiar manejo de `?next=` param.

---

## Ruta: /dashboard

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/dashboard/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Dashboard operativo con KPIs y cotizaciones recientes
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Saludo, KPIs (total, pendientes, mes, aprobadas hoy), cotizaciones recientes, CTA nueva cotizacion
- **Componentes principales**: `DashboardDesktop`, `DashboardMobile`, `PremiumPageReveal`
- **Hooks**: `useDashboardViewModel`, `useDashboardSummary`, `useDashboardBreakpoint`
- **Datos que consume**: Resumen de cotizaciones + alertas via `/api/dashboard/summary`
- **Tablas Supabase relacionadas**: `cotizaciones`, `clients`, `projects`
- **Acciones principales**: Navegacion a nueva cotizacion, ver cotizaciones
- **Archivos a tocar para modificar**: `app/(pwa-app)/dashboard/page.tsx`, `app/(pwa-app)/dashboard/_components/*`, `app/(pwa-app)/dashboard/_hooks/*`, `src/features/dashboard/services/dashboard-summary-server.service.ts`, `app/api/dashboard/summary/route.ts`
- **Riesgos**: Vista responsive con breakpoint 1024px. No romper logica de KPIs.

---

## Ruta: /admin/growth

- **Tipo**: Privada (autenticada + admin allowlist)
- **Archivo principal**: `app/admin/growth/page.tsx`
- **Layout usado**: `app/layout.tsx` (standalone, sin `AppShell`)
- **Proposito**: Panel operativo privado de growth para fundador/admin autorizado. Organiza trabajo diario, prospectos prioritarios, metas, MRR y proyecciones simples sin depender del shell principal.
- **Usuario objetivo**: Fundador o admin autorizado por correo
- **Funcionalidades visibles**: Header compacto con periodo/meta/MRR, bloque principal `Trabajo de hoy`, tabla editable de prospectos prioritarios, metricas compactas, embudo compacto, canales, datos manuales, experimentos secundarios y modal `Configurar crecimiento`
- **Componentes principales**: `GrowthPageClient`
- **Hooks**: `useGrowthDashboard`
- **Datos que consume**: Mock repository conectable (`growthDashboardRepository`) en esta primera implementacion
- **Tablas Supabase relacionadas**: Ninguna todavia. La conexion futura deberia leer `solicitudes_contacto`, `cotizaciones` y eventualmente un ledger manual definido aparte.
- **Acciones principales**: Agregar prospecto, editar estado/proximo paso/fecha, cambiar metas, actualizar datos manuales, registrar experimentos y filtrar trabajo operativo del dia
- **Archivos a tocar para modificar**: `app/admin/growth/*`, `src/features/growth/*`, `proxy.ts`
- **Riesgos**: No exponer esta ruta a usuarios normales. No mostrar mocks como si fueran datos reales. No usar esta ruta para tocar `/solicitud/[empresa]`, `/presupuesto/[token]`, PDF ni WhatsApp.

---

## Ruta: /cotizaciones

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/cotizaciones/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **CSS**: `app/(pwa-app)/cotizaciones/page.module.css`
- **Proposito**: Listado de cotizaciones con filtros, busqueda y acciones
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Filtros (estado, cliente, periodo, orden), busqueda, cards mobile, acciones (copiar link, PDF, WhatsApp, editar, eliminar)
- **Componentes principales**: `CotizacionMobileCard`, `CotizacionesMobileSummary`, `CotizacionesFilterFields`
- **Hooks**: `useCotizacionesStore`, `useCotizacionAlerts`
- **Datos que consume**: Resumen cotizaciones via `/api/cotizaciones/resumen`
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`
- **Acciones principales**: Listar, filtrar, copiar link, descargar PDF, enviar WhatsApp, editar, eliminar (soft delete)
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/page.tsx`, `app/(pwa-app)/cotizaciones/_components/*`, `src/features/cotizaciones/hooks/useCotizacionesStore.ts`, `app/api/cotizaciones/resumen/route.ts`
- **Riesgos**: Pagina grande (1055 lineas). No romper filtros ni acciones de WhatsApp/PDF.

---

## Ruta: /cotizaciones/nueva

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/cotizaciones/nueva/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Formulario guiado de nueva cotizacion. Workflow con pasos, items por componente, calculo de totales.
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Formulario multi-paso (cliente/obra, items, totales), selector de componentes, costo proveedor + margen, pricing mode, guardado borrador/presupuesto
- **Componentes principales**: Internos de la pagina (1198 lineas)
- **Hooks**: `useCotizacionesStore`, `useOrganizationProfile`
- **Datos que consume**: Perfil org (margen/proveedor defaults), catalogo componentes, sugerencias
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`, `organization_profile`
- **Acciones principales**: Crear borrador, guardar presupuesto, auto-crear cliente/proyecto
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/nueva/page.tsx`, `src/features/cotizaciones/new-quote/workflow-ui.ts`, `src/features/cotizaciones/new-quote/solicitud-prefill.ts`, `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`, `src/features/cotizaciones/services/cotizaciones.service.ts`, `src/features/cotizaciones/services/component-catalog.service.ts`, `src/features/cotizaciones/services/component-suggestions.service.ts`
- **Riesgos**: Pagina muy grande (1198 lineas). Workflow state persistido en sessionStorage. No romper calculos de pricing ni auto-creacion de cliente/proyecto.

---

## Ruta: /cotizaciones/[id]

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/cotizaciones/[id]/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Detalle de cotizacion con items, totales y acciones
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Header con estado, items, totales, acciones (PDF, WhatsApp, editar, eliminar)
- **Componentes principales**: `CotizacionDetalleMobileView`, `CotizacionDetalleMobileViewModel`
- **Hooks**: `useCotizacionesStore`
- **Datos que consume**: Cotizacion por ID con items
- **Tablas Supabase relacionadas**: `cotizaciones`, `cotizacion_items`, `clients`, `projects`
- **Acciones principales**: Ver detalle, generar PDF, compartir WhatsApp, editar, eliminar
- **Archivos a tocar para modificar**: `app/(pwa-app)/cotizaciones/[id]/page.tsx`, `app/(pwa-app)/cotizaciones/[id]/_components/*`, `src/features/cotizaciones/hooks/useCotizacionesStore.ts`
- **Riesgos**: No romper generacion de PDF ni link de WhatsApp.

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
- **Riesgos**: No romper logica de estado (activo/seguimiento/prospecto/inactivo).

---

## Ruta: /clientes/nuevo

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/clientes/nuevo/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Formulario de nuevo cliente
- **Usuario objetivo**: Admin/vendedor autenticado
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/nuevo/page.tsx`, `src/features/clientes/`

---

## Ruta: /clientes/[id]

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/clientes/[id]/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Ficha de cliente con proyectos y cotizaciones asociadas
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Header, estado badge, telefono, direccion, tabs proyectos/cotizaciones, menu contextual
- **Componentes principales**: `ClienteDetalleMobileView`, `ClienteDetalleMobileViewModel`
- **Hooks**: `useClientes`
- **Datos que consume**: Cliente detalle con proyectos y cotizaciones
- **Tablas Supabase relacionadas**: `clients`, `projects`, `cotizaciones`
- **Acciones principales**: Ver ficha, editar, ver proyectos/cotizaciones
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/[id]/page.tsx`, `app/(pwa-app)/clientes/[id]/_components/*`, `src/features/clientes/services/clientes.service.ts`
- **Riesgos**: No romper tabs ni navegacion a cotizaciones/proyectos.

---

## Ruta: /clientes/[id]/editar

- **Tipo**: Privada (autenticada), dinamica
- **Archivo principal**: `app/(pwa-app)/clientes/[id]/editar/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Formulario de edicion de cliente
- **Usuario objetivo**: Admin/vendedor autenticado
- **Archivos a tocar para modificar**: `app/(pwa-app)/clientes/[id]/editar/page.tsx`

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
- **Riesgos**: No romper badge de origen ni prefill a cotizacion.

---

## Ruta: /solicitudes/canales

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/solicitudes/canales/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Generador de canales de captacion. Compartir pagina de solicitud, generar QR, copiar links por canal.
- **Usuario objetivo**: Admin/vendedor autenticado
- **Funcionalidades visibles**: Cards de canal (directo, Instagram, Facebook, WhatsApp), QR, copiar link, descargar QR PNG
- **Componentes principales**: `LeadChannels`
- **Hooks**: `useLeadChannels`, `useOrganizationProfile`
- **Datos que consume**: Perfil org (slug publico)
- **Tablas Supabase relacionadas**: `organization_profile`
- **Acciones principales**: Copiar link, descargar QR, ver URLs por canal
- **Archivos a tocar para modificar**: `app/(pwa-app)/solicitudes/canales/page.tsx`, `src/features/solicitudes/components/lead-channels.tsx`, `src/features/solicitudes/components/lead-channels.module.css`, `src/features/solicitudes/hooks/useLeadChannels.ts`
- **Riesgos**: No romper generacion de QR ni URLs con UTM.

---

## Ruta: /configuracion/empresa

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/configuracion/empresa/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Configuracion del perfil de empresa: datos basicos, telefono, email, direccion, brand color, logo, push, slug publico, QR
- **Usuario objetivo**: Admin autenticado
- **Funcionalidades visibles**: Formulario datos empresa, color picker con presets, upload logo, push notifications, slug publico, preview QR
- **Componentes principales**: Internos de la pagina
- **Hooks**: `useOrganizationProfile`
- **Datos que consume**: Perfil org
- **Tablas Supabase relacionadas**: `organization_profile`, Storage bucket `organization-assets`
- **Acciones principales**: Actualizar perfil, subir logo
- **Archivos a tocar para modificar**: `app/(pwa-app)/configuracion/empresa/page.tsx`, `src/features/organization-profile/hooks/useOrganizationProfile.ts`, `src/features/organization-profile/services/organization-profile.service.ts`, `src/features/organization-profile/repositories/organization-profile.repository.ts`
- **Riesgos**: No cambiar slug sin actualizar indice unico. No romper upload de logo (requiere bucket `organization-assets`).

---

## Ruta: /configuracion/pagina-venta

- **Tipo**: Privada (autenticada)
- **Archivo principal**: `app/(pwa-app)/configuracion/pagina-venta/page.tsx`
- **Layout usado**: `app/(pwa-app)/layout.tsx` -> `AppShell`
- **Proposito**: Configuracion de la pagina publica de venta/lead: hero, galeria, horario, colores, toggle formulario, preview
- **Usuario objetivo**: Admin autenticado
- **Funcionalidades visibles**: Hero title/subtitle, galeria imagenes (max 8), horario por dia, colores, toggle publicacion, preview
- **Componentes principales**: Internos de la pagina
- **Hooks**: `useOrganizationProfile`, `useLandingGallery`
- **Datos que consume**: Perfil org + galeria
- **Tablas Supabase relacionadas**: `organization_profile`, `public_landing_gallery`, Storage bucket `organization-assets`
- **Acciones principales**: Actualizar landing config, subir/reordenar/eliminar galeria, toggle publicacion
- **Archivos a tocar para modificar**: `app/(pwa-app)/configuracion/pagina-venta/page.tsx`, `src/features/organization-profile/hooks/useOrganizationProfile.ts`, `src/features/landing-gallery/hooks/useLandingGallery.ts`, `src/features/landing-gallery/services/landing-gallery.service.ts`, `src/features/landing-gallery/repositories/landing-gallery.repository.ts`
- **Riesgos**: No romper max 8 items de galeria. No cambiar logica de publicacion sin afectar landing publica.

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

## API Routes

| Ruta | Metodo | Proposito | Archivo |
|---|---|---|---|
| `/api/solicitud/[empresa]` | POST | Crear solicitud publica (rate limited) | `app/api/solicitud/[empresa]/route.ts` |
| `/api/solicitudes/resumen` | GET | Resumen solicitudes por org (auth) | `app/api/solicitudes/resumen/route.ts` |
| `/api/cotizaciones/resumen` | GET | Resumen cotizaciones por org (auth) | `app/api/cotizaciones/resumen/route.ts` |
| `/api/clientes/resumen` | GET | Resumen clientes por org (auth) | `app/api/clientes/resumen/route.ts` |
| `/api/dashboard/summary` | GET | Dashboard KPIs por org (auth) | `app/api/dashboard/summary/route.ts` |
| `/api/pwa/push-subscriptions` | POST/DELETE | Registrar/eliminar suscripcion push | `app/api/pwa/push-subscriptions/route.ts` |

---

## Rutas de impresion

| Ruta | Proposito | Archivo |
|---|---|---|
| `/print/cotizaciones/[id]` | Vista de impresion PDF de cotizacion | `app/print/cotizaciones/[id]/` |
