# Components Map - Ventora

Estado: vigente
Actualizado: 2026-09-04
Responsable: ingeniería

Los archivos descritos aquí deben seguir siendo reutilizables y coherentes con `FEATURES_MAP.md`; nuevos componentes compartidos requieren entrada y `pnpm docs:check`.

Estado: vigente
Actualizado: 2026-09-04
Responsable: ingeniería

---

## Layout

### Componente: AdminShell

- **Archivo**: `src/features/admin/components/admin-shell.tsx`
- **Proposito**: Shell interno founder para `/admin`. Header propio + sidebar + superficie de trabajo separada del panel cliente.
- **Usado en**: `app/admin/layout.tsx`
- **Props importantes**: `children: ReactNode`, `founderEmail: string | null`
- **Dependencias**: `AdminSidebar`
- **Cuando modificarlo**: Cambios de chrome interno founder, header, acciones globales o estructura del centro de operaciones
- **Riesgos**: No reutilizar logica ni estilos de `AppShell`. Cambios afectan todas las rutas `/admin`.

### Componente: AdminSidebar

- **Archivo**: `src/features/admin/components/admin-sidebar.tsx`
- **Proposito**: Navegacion interna founder para Resumen, Clientes, Pagos, Activacion, Tareas y Marketing.
- **Usado en**: `AdminShell`
- **Props importantes**: `mobileOpen: boolean`, `onNavigate?: () => void`
- **Dependencias**: `usePathname`, `admin-nav.config` (`ADMIN_PRIMARY_NAV`, `ADMIN_FOOTER_NAV`, `ADMIN_FOOTER_ACTIONS`), `navigateToLogoutRoute`
- **Cuando modificarlo**: Cambios de IA/nav interna de `/admin`
- **Riesgos**: "Cerrar sesion" es boton + hard nav a `/auth/logout` (nunca `Link` prefetchable). Links del footer usan `prefetch={false}`.

### Componente: AppShell

- **Archivo**: `src/components/layout/app-shell.tsx`
- **Proposito**: Shell operativa completa de la app. Sidebar desktop grafito + tabbar mobile + header, navegacion, notificaciones, alertas de cotizacion, perfil org.
- **Usado en**: `app/(pwa-app)/layout.tsx` (envuelve todas las rutas privadas)
- **Props importantes**: `children: ReactNode`
- **Dependencias**: `useAuth`, `useCotizacionAlerts`, `useOrganizationProfile`, `PushNotificationsPrompt`, framer-motion
- **Cuando modificarlo**: Cambios en navegacion, sidebar, tabbar, header, notificaciones en shell
- **Desktop comercial (2026-07-18)**: rutas de listado usan `rootCommercialList` + `pageContentDashboard` (~1664px). Rutas anchas adicionales: `/configuracion/empresa`, detalle cotización (`isCotizacionDetailRoute`), detalle cliente (`isClienteDetailRoute`). En esas rutas de detalle el topbar genérico se oculta.
- **Riesgos**: Componente central. Cambios afectan TODA la app operativa. No romper navegacion ni breakpoints. No oscurecer toda la app interna por branding de marketing.

### Componente: AppShell CSS

- **Archivo**: `src/components/layout/app-shell.module.css` (1330 lineas)
- **Proposito**: Estilos del shell: fonts, gradiente boot, safe-area insets, tabbar, sidebar, tarjetas, animaciones
- **Cuando modificarlo**: Cambios de layout, responsive, animaciones del shell
- **Riesgos**: Archivo muy grande. Cambios pueden afectar todas las vistas.

---

## Navegacion

### Componente: ClientStatusBadge

- **Archivo**: `src/features/admin/components/client-status-badge.tsx`
- **Proposito**: Badge compacto para estado efectivo de trial/suscripcion en tablas y fichas admin.
- **Usado en**: `/admin`, `/admin/clientes`, `/admin/clientes/[organizationId]`
- **Props importantes**: `status`, `label?`
- **Cuando modificarlo**: Cambios de copy/colores de estado en panel founder

### Componente: SourceBadge

- **Archivo**: `src/features/admin/components/source-badge.tsx`
- **Proposito**: Badge de fuente (`Sistema`, `Manual`, `Local`) para distinguir datos SaaS reales vs seguimiento local/manual.
- **Usado en**: `AdminSidebar`, `/admin`, `/admin/clientes/[organizationId]`
- **Props importantes**: `source`, `label?`
- **Cuando modificarlo**: Cambios de taxonomia visual de fuente

### Componente: AdminKpiCard

- **Archivo**: `src/features/admin/components/admin-kpi-card.tsx`
- **Proposito**: Tarjeta KPI del dashboard founder para activos, trials, MRR/ARR y pagos pendientes.
- **Usado en**: `/admin`
- **Props importantes**: `eyebrow`, `value`, `hint`, `href?`, `linkLabel?`
- **Cuando modificarlo**: Cambios en resumen ejecutivo del centro de operaciones

### Componente: AdminMarketingOnboardingControl

- **Archivo**: `src/features/admin/components/admin-marketing-onboarding-control.tsx`
- **Proposito**: Configuración founder de dos videos base, uno para celular y otro para computador. No asigna empresas; muestra el embudo desde la visualización hasta primera cotización/PDF.
- **Usado en**: `/admin/marketing/onboarding`
- **Riesgos**: Mantener un único predeterminado listo por dispositivo y no volver a mezclar esta configuración con captación en `/admin/marketing`.

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

### Componente: ContrastSection / DevicesSection / PautaSection

- **Archivos**: `src/components/landing/contrast-section.tsx`, `devices-section.tsx`, `pauta-section.tsx`
- **Proposito**: Posicionamiento comercial + fabricacion configurable, continuidad entre dispositivos y cubicacion/despiece/pauta de corte opcional
- **Usado en**: Landing principal (`LandingBelowFold`)
- **Cuando modificarlo**: Copy de posicionamiento, dispositivos o evidencia real de fabricacion. `PautaSection` usa capturas reales anonimizadas del catalogo privado, el resumen interno desktop y su vista mobile; en mobile reduce copy, oculta el catalogo denso y prioriza el resumen mobile + CTA. No usar mockups ni estados inventados.

### Componente: ProblemFlowSection

- **Archivo**: `src/components/landing/problem-flow-section.tsx`
- **Proposito**: Relato del problema al cotizar a mano (WhatsApp → anotas → tarde → se pierde)
- **Usado en**: Landing principal
- **Cuando modificarlo**: Cambios en copy de problema de la landing

### Componente: QuoteFlowSection / PublicLinkSection / LandingContactSection

- **Archivos**: `src/components/landing/quote-flow-section.tsx`, `public-link-section.tsx`, `landing-contact-section.tsx`
- **Proposito**: Flujo de 4 pasos, link público y formulario de consulta (lead a `/solicitudes`, sin redirect a WhatsApp)
- **Usado en**: Landing principal
- **Cuando modificarlo**: Capturas del flujo, CTA a `/registro`, o validación Latam del formulario

### Componente: FooterSection

- **Archivo**: `src/components/footer-section.tsx`
- **Proposito**: Footer reutilizable con links de acceso, legales e info de contacto
- **Usado en**: Superficies que lo importan; la landing comercial usa el footer interno de `landing-page-client.tsx`
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
- **Riesgos**: Depende de `src/utils/window-drawings.ts`. Ventanas usan primitives SVG compartidas (`drawOuterAluminumFrame`, `drawInnerTrack`, `drawSlidingSash`, `drawFixedPanel`, etc.) para mantener un catalogo tecnico unificado. No mezclar cambios visuales con pricing, workflow, PDF comercial, Supabase ni WhatsApp.

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

### Componente: PasoDosModoCotizacion

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-modo-cotizacion.tsx`
- **Proposito**: Fallback/pantalla inicial de Paso 2 con 2 tarjetas: "Cotizar por items" y "Cuadernillo digital" (modo rapido `total_global`). En desktop nuevo, la modalidad se elige en Paso 1; este componente sigue activo como fallback y para mobile.
- **Usado en**: `PasoDosSeccion` (fallback desktop), `PasoDosWizardMovil` (mobile)

### Componente: PasoDosCuadernoMovil

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/paso-dos-cuaderno-movil.tsx`
- **Proposito**: Superficie mobile **Constructor de piezas** para `por_item`. Lista piezas compactas, agrega presets, muestra estado `Lista/Falta precio/Faltan datos`, aplica linea global y abre edicion rapida o composicion full-screen.
- **Usado en**: `PasoDosWizardMovil` cuando `mobileCuadernoActive` esta activo. Comparte `draft.items`, callbacks de `page.tsx`, `sessionStorage` y renderer `guided-visual-renderer.service.ts`.
- **Dependencias**: `CuadernoQuickEditSheet`, `CuadernoComposicionMovil`, `cuaderno-piece-status.ts`, `LineTemplatePicker`, `quote-constructor-workspace.service.ts`.
- **Riesgos**: No crear persistencia paralela ni guardar antes de la cotizacion. La línea global aplica solo perfiles y debe actualizar todas las piezas en una sola transacción de `draft.items`; los cristales se eligen por pieza. El nombre visible es **Constructor**; `mobile-cuaderno` es nombre interno heredado. No agregar panel financiero desktop ni duplicar revision/PDF/WhatsApp.

### Componente: CuadernoQuickEditSheet

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/cuaderno-quick-edit-sheet.tsx`
- **Proposito**: Bottom sheet de edicion mobile de una pieza. Reordena el flujo como datos base -> material/color -> linea/precio -> vidrio -> forma/apertura. Permite elegir Aluminio/PVC, color visible compacto, linea de perfil o Cristal, duplicar/eliminar y guardar cambios.
- **Usado en**: `PasoDosCuadernoMovil`.
- **Dependencias**: `mapItemToForm`, `LineTemplatePicker`, `COLOR_OPTIONS`, `ALUMINUM_COLOR_OPTIONS`, `PVC_COLOR_OPTIONS`, `encodeCotizacionItemPresentationMeta`.
- **Riesgos**: Es transaccional: línea, vidrio, material, color y precio se mantienen locales hasta **Guardar cambios**; cerrar no puede persistir cambios parciales. Cambios confirmados de material/color deben previsualizarse con `colorHex` en miniatura y no conservar una línea incompatible. Las líneas se filtran por material preferido pero deben permitir Cristal cuando el usuario lo elige.

### Componente: CuadernoComposicionMovil

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/cuaderno-composicion-movil.tsx`
- **Proposito**: Editor full-screen mobile de composicion visual. Permite partir lado/alto, seleccionar modulo, cambiar tipo, editar medidas, palillos/formas y aplicar la `GuidedVisualConfig` resultante.
- **Usado en**: `PasoDosCuadernoMovil` y `CuadernoQuickEditSheet` via accion de forma/apertura.
- **Dependencias**: `useGuidedVisualHistory`, `guided-visual-config.ts`, `guided-visual-renderer.service.ts`, presets de `quote-constructor-workspace.service.ts`.
- **Riesgos**: `Reflejar` solo debe estar activo para modulos con apertura lateral (`abatible`, `oscilobatiente`, `puerta`, `shower_frontal`); en fijos/correderas simetricas debe verse deshabilitado para evitar una accion muda. El preview es referencial, no CAD ni cubicacion automatica.

### Componente: LineTemplatePicker

- **Archivo**: `src/features/cotizaciones/line-templates/components/line-template-picker.tsx`
- **Proposito**: Selector modal de lineas comerciales. En mobile se usa para linea de pieza y linea global; soporta `mode="profile"`, material preferido, busqueda, filtros Aluminio/PVC/Cristal y seleccion visual compacta.
- **Usado en**: `CuadernoQuickEditSheet`, `CuadernoConstructorMovil` y superficies de cotizacion que requieren elegir linea.
- **Riesgos**: No ocultar Cristal permanentemente cuando el material preferido sea Aluminio/PVC; el usuario debe poder cambiar filtro. Mantener el modal liviano para mobile y sin pasos redundantes.

### Componente: PasoDosAgregarGrupoSheet

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-agregar-grupo-sheet.tsx`
- **Proposito**: Nucleo actual del Quote Studio desktop. En desktop embebido renderiza el editor comercial de pieza activa en 4 pasos (`Tipo`, `Sistema`, `Medidas y detalles`, `Precio`) y mantiene el cuaderno comercial para modo `total_global`. En overlay/legacy conserva el flujo anterior. En subpaso **Sistema**, tras elegir **Personalizado**, expone **Abrir constructor** → `GuidedVisualComposer`.
- **Usado en**: `PasoDosSeccion` (desktop) y orquestacion de `page.tsx`.

### Componente: LineasPreciosPageClient

- **Archivo**: `src/features/cotizaciones/line-templates/components/lineas-precios-page-client.tsx`
- **Proposito**: CRUD del catalogo privado y estado visual de recetas persistidas. Abre el administrador tecnico por linea; no escribe nuevas recetas en metadata legacy.
- **Usado en**: `/configuracion/empresa/lineas-precios`
- **Dependencias**: wizard, `LineTemplateCardActions`, `useCotizacionLineTemplates`, `useFabricationRecipes`.
- **Riesgos**: No formulas/JSON. No mezclar pauta con precios/margen. No migraciones legacy sin aprobacion.

### Componente: LineTemplateCardActions

- **Archivo**: `src/features/cotizaciones/line-templates/components/line-template-card-actions.tsx`
- **Proposito**: Menu accesible de tres puntos y confirmacion interna para administrar fabricacion, duplicar o hacer soft delete de una linea. Expone progreso y bloquea dobles acciones.
- **Usado en**: `LineasPreciosPageClient` desktop.
- **Riesgos**: Eliminar debe seguir siendo soft delete multi-tenant y solo informar exito despues de confirmar una fila actualizada en Supabase.

### Componente: LineTemplateFormWizard / FabricationRecipeEditor

- **Archivos**: `line-template-form-wizard.tsx`, `fabrication-recipe-editor.tsx`
- **Proposito**: Wizard comercial de linea. La configuracion `fabricationRecipePack` anterior se muestra deshabilitada como compatibilidad y deriva al administrador versionado.
- **Cuando modificarlos**: Solo compatibilidad/lectura legacy. La escritura tecnica nueva vive en `src/features/fabricacion/components/`.

### Componentes: FabricacionLineWorkspace / RecipeGuidedEditor / RecipeTestLab

- **Archivos**: `src/features/fabricacion/components/fabricacion-line-workspace.tsx`, `recipe-guided-editor.tsx`, `recipe-glass-name-picker.tsx`, `recipe-test-lab.tsx`
- **Proposito**: Administrar versiones por linea, editar identidad/perfiles/vidrios/accesorios con primitivas controladas y comparar esperado vs calculado con el motor deterministico. `RecipeGlassNamePicker` expone catálogo Ventora + vidrio propio. `recipe-guided-editor` (2026-09-04): hero limpio, una alerta antes de piezas, tira comercial auto-aplicada a todas las piezas.
- **Usado en**: `/configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion`
- **Dependencias**: `useFabricationRecipes`, `evaluarRecetaListaParaProbar`, schemas Zod, `calcularCubicacionYPauta()`.
- **Riesgos**: No agregar textarea JSON, expresiones libres, `eval`, SQL, IA ni edicion directa de una version validada. Vidrio base no debe bloquear **Probar** si perfiles obligatorios están listos.

### Componente interno: PautaCubicacionPanel

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/pauta-cubicacion-panel.tsx`
- **Proposito**: Panel **Cubicacion y pauta**. Prioriza recetas persistidas `validated`, autoselecciona una compatible o muestra selector si hay varias, calcula snapshot formal y conserva adapter/fallback legacy.
- **Usado en**: `PasoDosEditorDesktop`, despiece, sheets.
- **Dependencias**: `useFabricationRecipes`, `resolverRecetasCompatibles`, `construirSnapshotFabricacion`, adapters y snapshot helpers legacy.
- **Riesgos**: No re-pedir tipología. No precios en pauta. Barras = referencial.

### Componente: GuidedVisualComposer

- **Archivo**: `src/features/cotizaciones/visual-composer/components/guided-visual-composer.tsx`
- **Proposito**: Overlay desktop del constructor visual guiado V2 (croquis protagonista, partir módulos, tipos, palillos, undo/redo). UX orientada a maestros.
- **Usado en**: `PasoDosAgregarGrupoSheet` (agregar pieza), `PasoDosEditorDesktop` (editar pieza, tab Configuración).
- **Renderer compartido**: `guided-visual-renderer.service.ts`; la variante PDF usa canvas `470 x 260`, mayor ocupación visual y banda de cotas separada con halo para coincidir en print/documento público.
- **Handoff**: `docs/agent-map/CONSTRUCTOR_DESKTOP_HANDOFF.md`.
- **Riesgos**: Solo desktop ≥1024; no montar en mobile. Persistencia: sync al guardar + hydrate formal en lecturas + bridge `[gvc:]` fallback. El dibujo es referencial, no CAD. Si se toca PDF, validar el renderer compartido y no crear una segunda geometria.

### Componente: QuoteConstructorWorkspace

- **Archivo**: `src/features/cotizaciones/visual-composer/components/quote-constructor-workspace.tsx`
- **Proposito**: Modo desktop `Cotización rápida` de Paso 2. Dentro del shell Quote Studio presenta presets visuales de ventana/puerta, línea base opcional para nuevas piezas y acción explícita para aplicarla a las ya creadas, cuaderno responsive, medidas/cantidad editables, estados concretos, inspector y footer de progreso. Oculta sus acciones de revisión duplicadas al estar embebido; el header del Studio es la fuente de esas acciones.
- **Usado en**: `PasoDosSeccion`, como modo explícito solo bajo `min-width: 1024px`; el panel financiero/resumen hace scroll natural, queda bajo el cuaderno hasta 1439 px y al costado desde 1440 px. El inspector baja bajo el tablero entre 1024 y 1279 px.
- **Dependencias**: `quote-constructor-preset-selector.tsx`, `quote-constructor-workspace.service.ts`, `GuidedVisualComposer`, `guided-visual-renderer.service.ts`, callbacks controlados de `page.tsx` y el mismo `draft.items` persistido en `sessionStorage`.
- **Estado QA**: La composicion rapida dentro de Quote Studio fue revisada en 1024/1280/1440; conserva un scroll vertical y no agrega overflow horizontal. TypeScript y el test de integracion del workspace pasan. Los tests puros de service/renderer siguen bloqueados por la infraestructura Jest `clearMocksOnScope`; `pnpm build` sigue bloqueado por el selector CSS impuro existente en `app/print/cotizaciones/[id]/fabricacion/page.module.css`.
- **Brecha conocida**: la validacion local de ancho/alto/cantidad invalidos debe bloquear progreso sin escribir el draft; ver prioridad 1 del handoff.
- **Riesgos**: Solo desktop >=1024 y un unico scroll vertical principal; no trasladar su layout a mobile. No persiste en Supabase antes de guardar la cotizacion. No aplicar limite de seis piezas: ese limite pertenece solo a modulos dentro de una composicion. Items no compatibles siguen en la vista comercial tradicional.

### Componente: QuoteConstructorPresetSelector

- **Archivo**: `src/features/cotizaciones/visual-composer/components/quote-constructor-preset-selector.tsx`
- **Proposito**: Selector visual de tipologias para `Cotizacion rapida`. Mantiene visibles Fijo, Corredera, Abatible, Proyectante, Puerta y Composicion; Puerta abre acceso rapido a abatible/corredera y `Mas tipologias` agrupa Oscilobatiente, Guillotina, Celosia, Puerta corredera, Shower frontal y Shower corredera.
- **Renderer**: Reutiliza `guided-visual-renderer.service.ts`; no contiene SVG paralelos. Tarjeta completa clickeable, estado seleccionado, microanimacion hover y `prefers-reduced-motion`.
- **Riesgos**: Es presentacion desktop. Agregar una tipologia exige extender el tipo, el preset y el renderer compartido sin crear otra ruta de guardado ni asociarla automaticamente a una receta de fabricacion.

### Componente: PasoDosPanelComponentes

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-panel-componentes.tsx`
- **Proposito**: Panel vivo del presupuesto y segunda columna del Quote Studio desktop. En desktop muestra sticky panel con items completos, draft local "En edicion", totales y bloqueo de "Continuar a revisar" si existe pieza pendiente o valor cero.
- **Usado en**: `PasoDosSeccion`.
- **Props importantes**: `onSelectMode: (mode: QuotePricingMode) => void`

### Componente: QuoteStudioFinancialPanel

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/quote-studio-financial-panel.tsx`
- **Proposito**: Panel financiero compacto de Fase 1 dentro del panel sticky desktop de Paso 2. Muestra costo total, precio sugerido neto, precio final cliente, margen real, breakdown de costos y markup equivalente.
- **Usado en**: `PasoDosPanelComponentes`, solo cuando `isDesktopQuoteStudio` es verdadero (`min-width: 1024px`).
- **Riesgos**: No renderizar bajo 1024 px. No exponer en mobile 390/430 ni cambiar resumen mobile.

### Componente: PasoDosItemLibreForm

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-item-libre-form.tsx`
- **Proposito**: Formulario standalone de item libre con valor. Es parte del Quote Studio desktop y del wizard mobile; muestra nombre, descripcion, valor CLP, selector IVA compacto `[Incluido] [Agregar IVA]`, boton dinamico con precio y preview PDF.
- **Usado en**: `PasoDosSeccion` (desktop), `PasoDosWizardMovil` (mobile). Tambien accesible desde el panel header via "+ Agregar item libre".
- **Props importantes**: `isOpen`, `editingItemId`, `form: FreeValueItemFormState`, `fieldErrors`, `isSaving`, `onChange`, `onSubmit`, `onCancel`

### Componente: PasoDosWizardFooterMovil

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-footer-movil.tsx`
- **Proposito**: Footer del wizard mobile con navegacion y boton de confirmacion. Texto dinamico: "Agregar item por $X" para items libres, "Agregar componente" para el resto.
- **Usado en**: `PasoDosWizardMovil`
- **Props importantes**: `canSubmitGroup`, `isFreeValueItem?`, `precioFormateado?`, `onBack`, `onConfirm`, `onNext`, `visualStage`, `wizardStep`

### Componente: PasoDosWizardPrecioMovil

- **Archivo**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-precio-movil.tsx`
- **Proposito**: Bloque de precio en el wizard mobile. Soporta `hideMargenOption` para ocultar el modo "Con margen" y mostrar solo "Valor directo" (usado para items libres).
- **Usado en**: `PasoDosWizardConfiguracionMovil` (config step del wizard mobile)
- **Props importantes**: `activePricingMode`, `formattedPriceValue`, `marginValue`, `hideMargenOption?`, `onPrecioChange`, `onPricingModeChange`, `priceLabel`, `priceHelp`

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

- **Archivo**: `src/features/solicitudes/components/lead-channels.tsx`
- **CSS**: `src/features/solicitudes/components/lead-channels.module.css`
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

### Componente: OnboardingVideoGuide

- **Archivo**: `src/features/onboarding/components/onboarding-video-guide.tsx`
- **Proposito**: Muestra en la bienvenida de `/activacion` una sola guia asignada, coincidente con el dispositivo; registra su apertura sin bloquear el flujo comercial.
- **Usado en**: `app/(pwa-app)/activacion/page.tsx`
- **Contrato**: si no existe una asignacion lista, no renderiza contenido ni cambia la activacion existente.

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
