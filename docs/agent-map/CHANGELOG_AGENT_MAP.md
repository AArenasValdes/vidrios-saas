# Changelog Agent Map - Ventora

Historial de cambios en la documentacion del mapa tecnico.

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

## 2026-05-21 - Google Analytics y Google Ads base

### Resumen

Se agrego una capa base de medicion con Google tag para GA4 + Google Ads usando variables de entorno publicas. La app ahora puede cargar la etiqueta global una sola vez en `app/layout.tsx`, medir pageviews en navegacion App Router y disparar eventos comerciales en los puntos mas sensibles del flujo: clics a WhatsApp desde landing, inicio e intento de envio de formularios publicos, envio exitoso de solicitud publica, clics de demo en `/planes`, envio de cotizacion por WhatsApp, vista/descarga de PDF publico, valoraciones publicas y decision publica de cotizacion. En este proyecto ademas se dejo configurado el `Measurement ID` `G-Y0LCR4NRDN` como fallback local para no depender del placeholder durante desarrollo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/layout.tsx` | Carga condicional del Google tag y provider de pageviews |
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
