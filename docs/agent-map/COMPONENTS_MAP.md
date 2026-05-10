# Components Map - Ventora

---

## Layout

### Componente: AppShell

- **Archivo**: `src/components/layout/app-shell.tsx` (990 lineas)
- **Proposito**: Shell operativa completa de la app. Sidebar desktop + tabbar mobile + header, navegacion, notificaciones, alertas de cotizacion, perfil org.
- **Usado en**: `app/(pwa-app)/layout.tsx` (envuelve todas las rutas privadas)
- **Props importantes**: `children: ReactNode`
- **Dependencias**: `useAuth`, `useCotizacionAlerts`, `useOrganizationProfile`, `PushNotificationsPrompt`, framer-motion
- **Cuando modificarlo**: Cambios en navegacion, sidebar, tabbar, header, notificaciones en shell
- **Riesgos**: Componente central. Cambios afectan TODA la app operativa. No romper navegacion ni breakpoints.

### Componente: AppShell CSS

- **Archivo**: `src/components/layout/app-shell.module.css` (1330 lineas)
- **Proposito**: Estilos del shell: fonts, gradiente boot, safe-area insets, tabbar, sidebar, tarjetas, animaciones
- **Cuando modificarlo**: Cambios de layout, responsive, animaciones del shell
- **Riesgos**: Archivo muy grande. Cambios pueden afectar todas las vistas.

---

## Navegacion

### Componente: MobilePageHeader

- **Archivo**: `app/(pwa-app)/_components/mobile-page-header.tsx`
- **Proposito**: Header de pagina mobile dentro del shell
- **Usado en**: Paginas internas de la app operativa
- **Cuando modificarlo**: Cambios en header mobile

---

## Animaciones

### Componente: PremiumPageReveal

- **Archivo**: `src/components/motion/premium-page-reveal.tsx` (101 lineas)
- **Proposito**: Animacion de revelado de pagina con framer-motion. Respeta `useReducedMotion`.
- **Usado en**: Dashboard, Cotizaciones, paginas internas
- **Props importantes**: `children: ReactNode`, `className?: string`
- **Tambien exporta**: `PremiumPageSection`
- **Cuando modificarlo**: Cambios en animaciones de entrada de pagina
- **Riesgos**: Respeta prefers-reduced-motion. No romper accesibilidad.

---

## Primitivos UI (shadcn/ui)

### Componente: Button

- **Archivo**: `src/components/ui/button.tsx`
- **Proposito**: Boton con variantes CVA (default, outline, secondary, ghost, destructive, link) sobre Base UI
- **Usado en**: Toda la app
- **Props importantes**: Variantes via `cva`, soporte focus/active/disabled/aria-invalid
- **Cuando modificarlo**: Cambios globales de boton
- **Riesgos**: Cambio afecta todos los botones de la app

### Componente: Avatar

- **Archivo**: `src/components/ui/avatar.tsx`
- **Proposito**: Avatar basado en Radix UI con imagen y fallback
- **Usado en**: Shell, testimonios
- **Cuando modificarlo**: Cambios en avatares

### Componente: TestimonialCard

- **Archivo**: `src/components/ui/testimonial-card.tsx`
- **Proposito**: Tarjeta de testimonio con avatar, nombre y handle
- **Usado en**: `TestimonialsSection`
- **Props importantes**: `author`, `text`, `href?`, `className?`, `dark?`

---

## Landing

### Componente: ProblemSection

- **Archivo**: `src/components/landing/problem-section.tsx`
- **Proposito**: Seccion "El problema" de la landing con 3 tarjetas
- **Usado en**: Landing principal
- **Cuando modificarlo**: Cambios en copy de problema de la landing

### Componente: ProblemCard

- **Archivo**: `src/components/landing/problem-card.tsx`
- **Proposito**: Tarjeta visual de problema con paneles decorativos animados (Excel, Chat, Money)
- **Usado en**: `ProblemSection`
- **Props importantes**: `title`, `description`, `variant: "excel" | "chat" | "money"`, `fullWidth?`

### Componente: FooterSection

- **Archivo**: `src/components/footer-section.tsx` (169 lineas)
- **Proposito**: Footer de la landing con links de acceso, links legales, info de contacto
- **Usado en**: Landing principal
- **Props importantes**: `navLinks: FooterNavLink[]`

### Componente: TestimonialsSection

- **Archivo**: `src/components/testimonials-with-marquee.tsx` (79 lineas)
- **Proposito**: Seccion de testimonios con efecto marquee
- **Usado en**: Landing principal
- **Props importantes**: `title`, `description`, `testimonials`, `className?`, `dark?`, `compact?`

---

## PWA

### Componente: RegisterServiceWorker

- **Archivo**: `src/components/pwa/register-service-worker.tsx` (67 lineas)
- **Proposito**: Registro/desregistro del Service Worker, limpieza de caches
- **Usado en**: `app/layout.tsx` (root layout)
- **Cuando modificarlo**: Cambios en SW registration o cache strategy

### Componente: InstallAppPrompt

- **Archivo**: `src/components/pwa/install-app-prompt.tsx` (159 lineas)
- **Proposito**: Prompt de instalacion PWA. Detecta `BeforeInstallPromptEvent`, modo standalone, clave dismiss en localStorage.
- **Usado en**: `app/layout.tsx` (root layout)
- **Cuando modificarlo**: Cambios en prompt de instalacion

### Componente: PushNotificationsPrompt

- **Archivo**: `src/components/pwa/push-notifications-prompt.tsx` (258 lineas)
- **Proposito**: Prompt de suscripcion push. Detecta plataforma (android/ios/desktop).
- **Usado en**: `AppShell`
- **Cuando modificarlo**: Cambios en flujo de suscripcion push

### Componente: QuoteComponentSketch

- **Archivo**: `src/components/pwa/quote-component-sketch.tsx` (312 lineas)
- **Proposito**: SVG sketch visual de componente de cotizacion (ventana/puerta) con medidas y color
- **Usado en**: Detalle de cotizacion, nueva cotizacion
- **Props importantes**: `tipo`, `ancho`, `alto`, `colorHex`, `maxW?`, `maxH?`, `label?`, `showMeasurements?`
- **Cuando modificarlo**: Cambios en dibujos SVG de componentes
- **Riesgos**: Depende de `src/utils/window-drawings.ts` (1074 lineas). No romper generacion SVG.

---

## Cotizacion (subcomponentes de pagina)

### Componente: CotizacionMobileCard

- **Archivo**: `app/(pwa-app)/cotizaciones/_components/cotizacion-mobile-card.tsx`
- **Proposito**: Card mobile de cotizacion en listado
- **Usado en**: Pagina listado cotizaciones
- **Props importantes**: `row: CotizacionesMobileRow`, `index: number`

### Componente: CotizacionesMobileSummary

- **Archivo**: `app/(pwa-app)/cotizaciones/_components/cotizaciones-mobile-summary.tsx`
- **Proposito**: Grid de chips resumen mobile (todos/aprobadas/pendientes/rechazadas)
- **Usado en**: Pagina listado cotizaciones
- **Props importantes**: `items`, `onSelect`

### Componente: CotizacionesFilterFields

- **Archivo**: `app/(pwa-app)/cotizaciones/_components/cotizaciones-filter-fields.tsx`
- **Proposito**: Campos de filtro para cotizaciones (estado, cliente, periodo, orden)
- **Usado en**: Pagina listado cotizaciones

### Componente: CotizacionDetalleMobileView

- **Archivo**: `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-mobile-view.tsx`
- **Proposito**: Vista mobile de detalle de cotizacion
- **Usado en**: Pagina detalle cotizacion
- **Props importantes**: `model`, `isHydratingItems`, `isPreparingPdf`, `isSaving`, `whatsappDisabled`, `updatedLabel`, `editHref`, `editComponentsHref`, `onDelete`

---

## Solicitudes (subcomponentes de pagina)

### Componente: SolicitudCard

- **Archivo**: `app/(pwa-app)/solicitudes/_components/solicitud-card.tsx`
- **Proposito**: Card de solicitud con iconos de origen, menu contextual, estado, tiempo relativo
- **Usado en**: Pagina listado solicitudes
- **Props importantes**: `SolicitudCardViewModel`

---

## Solicitudes (componente de feature)

### Componente: LeadChannels

- **Archivo**: `src/features/solicitudes/components/lead-channels.tsx` (609 lineas)
- **CSS**: `src/features/solicitudes/components/lead-channels.module.css` (436 lineas)
- **Proposito**: Cards de canal de captacion (directo, Instagram, Facebook, WhatsApp) con QR, copiar link, descargar PNG
- **Usado en**: `/solicitudes/canales`
- **Dependencias**: `react-qr-code`, `useLeadChannels`
- **Cuando modificarlo**: Cambios en canales de captacion, QR, URLs con UTM
- **Riesgos**: No romper generacion de QR ni URLs con UTM

---

## Clientes (subcomponentes de pagina)

### Componente: ClienteDetalleMobileView

- **Archivo**: `app/(pwa-app)/clientes/[id]/_components/cliente-detalle-mobile-view.tsx`
- **Proposito**: Vista mobile de ficha de cliente con tabs proyectos/cotizaciones
- **Usado en**: Pagina detalle cliente
- **Props importantes**: `model: ClienteDetalleMobileViewModel`

---

## Dashboard (subcomponentes de pagina)

### Componente: DashboardDesktop

- **Archivo**: `app/(pwa-app)/dashboard/_components/desktop/dashboard-desktop.tsx`
- **Proposito**: Vista desktop del dashboard con layout horizontal, KPIs, cards
- **Usado en**: Pagina dashboard
- **Props importantes**: greetingName, subtitle, KPIs, quoteCards, isLoading, isEmpty

### Componente: DashboardMobile

- **Archivo**: `app/(pwa-app)/dashboard/_components/mobile/dashboard-mobile.tsx`
- **Proposito**: Vista mobile del dashboard con saludo, KPIs, cards, CTAs
- **Usado en**: Pagina dashboard
- **Props importantes**: greetingName, KPIs, quoteCards, isLoading, isEmpty

---

## Aprobacion publica (subcomponentes de pagina)

### Componente: PublicQuoteMobile

- **Archivo**: `app/presupuesto/[token]/public-quote-mobile.tsx`
- **Proposito**: Vista mobile de cotizacion publica para aprobacion/rechazo
- **Usado en**: Pagina presupuesto publico

### Componente: PublicQuotePreview

- **Archivo**: `app/presupuesto/[token]/public-quote-preview.tsx`
- **Proposito**: Vista preview de cotizacion publica
- **Usado en**: Pagina presupuesto publico

---

## Marketing Video / Remotion

### Componente: VentoraExplainer

- **Archivo**: `src/features/video/VentoraExplainer.tsx`
- **Proposito**: Composicion principal del video explicativo Ventora con escenas por guion
- **Usado en**: Remotion compositions `VentoraExplainer` y `VentoraExplainerVertical`
- **Props importantes**: `layout?: "landscape" | "portrait"`

### Componente: SceneWrapper

- **Archivo**: `src/features/video/components.tsx`
- **Proposito**: Fondo, grilla de vidrio/aluminio y envoltura base para cada escena

### Componente: PhoneMockup

- **Archivo**: `src/features/video/components.tsx`
- **Proposito**: Marco visual para capturas reales de la app dentro del video

### Componente: FloatingMessage

- **Archivo**: `src/features/video/components.tsx`
- **Proposito**: Burbujas flotantes para representar mensajes y desorden comercial

### Componente: StepCard

- **Archivo**: `src/features/video/components.tsx`
- **Proposito**: Bloques numerados para explicar el flujo comercial

### Componente: CTAButton

- **Archivo**: `src/features/video/components.tsx`
- **Proposito**: Botones visuales de cierre y llamada a la accion

### Componente: GlassGridBackground

- **Archivo**: `src/features/video/components.tsx`
- **Proposito**: Fondo claro con reticula y luz sutil inspirada en vidrio/aluminio

### Componente: VentoraLogo

- **Archivo**: `src/features/video/components.tsx`
- **Proposito**: Logo reutilizable basado en el asset `public/video-assets/logo-ventora.svg`
