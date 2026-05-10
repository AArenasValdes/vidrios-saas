# Changelog Agent Map - Ventora

Historial de cambios en la documentacion del mapa tecnico.

---

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
