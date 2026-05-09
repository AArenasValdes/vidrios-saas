# Agent Task Guide - Ventora

Guia practica para futuros agentes. Antes de explorar el proyecto, revisar la seccion correspondiente.

---

## Si la tarea es sobre cotizaciones, revisar primero:

1. `docs/agent-map/FEATURES_MAP.md` - Seccion "Cotizaciones"
2. `src/features/cotizaciones/hooks/useCotizacionesStore.ts`
3. `src/features/cotizaciones/services/cotizaciones.service.ts`
4. `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
5. `src/features/cotizaciones/types/cotizacion.ts`
6. `src/features/cotizaciones/types/cotizacion-workflow.ts`
7. `app/(pwa-app)/cotizaciones/page.tsx` (listado)
8. `app/(pwa-app)/cotizaciones/nueva/page.tsx` (nueva)
9. `app/(pwa-app)/cotizaciones/[id]/page.tsx` (detalle)

### Para nueva cotizacion especificamente:
1. `src/features/cotizaciones/new-quote/workflow-ui.ts`
2. `src/features/cotizaciones/new-quote/solicitud-prefill.ts`
3. `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`
4. `src/features/cotizaciones/services/component-catalog.service.ts`
5. `src/features/cotizaciones/services/component-suggestions.service.ts`

### Para PDF especificamente:
1. `src/utils/cotizacion-pdf.ts`
2. `src/features/cotizaciones/pdf-cache/services/cotizacion-pdf-cache.service.ts`
3. `app/print/cotizaciones/[id]/`

---

## Si la tarea es sobre solicitudes/leads, revisar primero:

1. `docs/agent-map/FEATURES_MAP.md` - Seccion "Solicitudes / Leads"
2. `src/features/solicitudes/services/solicitudes-contacto.service.ts`
3. `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`
4. `src/features/solicitudes/hooks/useSolicitudesContacto.ts`
5. `src/features/solicitudes/types/solicitud-contacto.ts`
6. `app/(pwa-app)/solicitudes/page.tsx`
7. `app/(landing-web)/solicitud/[empresa]/page.tsx`
8. `app/api/solicitud/[empresa]/route.ts`

### Para canales/QR especificamente:
1. `src/features/solicitudes/hooks/useLeadChannels.ts`
2. `src/features/solicitudes/components/lead-channels.tsx`
3. `app/(pwa-app)/solicitudes/canales/page.tsx`

---

## Si la tarea es sobre pagina publica / mini landing, revisar primero:

1. `docs/agent-map/FEATURES_MAP.md` - Seccion "Pagina Publica / Mini Landing"
2. `app/(landing-web)/solicitud/[empresa]/page.tsx`
3. `src/features/organization-profile/services/organization-profile.service.ts`
4. `src/features/landing-gallery/repositories/landing-gallery-server.repository.ts`
5. `src/features/solicitudes/services/solicitudes-contacto.service.ts` (getEmpresaPublicaConfig)
6. `src/features/organization-profile/types/organization-profile.ts`

---

## Si la tarea es sobre empresa/configuracion, revisar primero:

1. `docs/agent-map/FEATURES_MAP.md` - Seccion "Empresa / Configuracion"
2. `src/features/organization-profile/hooks/useOrganizationProfile.ts`
3. `src/features/organization-profile/services/organization-profile.service.ts`
4. `src/features/organization-profile/repositories/organization-profile.repository.ts`
5. `app/(pwa-app)/configuracion/empresa/page.tsx`
6. `app/(pwa-app)/configuracion/pagina-venta/page.tsx`

### Para galeria landing:
1. `src/features/landing-gallery/hooks/useLandingGallery.ts`
2. `src/features/landing-gallery/services/landing-gallery.service.ts`
3. `src/features/landing-gallery/repositories/landing-gallery.repository.ts`

---

## Si la tarea es sobre aprobacion/rechazo de cotizaciones, revisar primero:

1. `docs/agent-map/FEATURES_MAP.md` - Seccion "Aprobacion/Rechazo Publica"
2. `app/presupuesto/[token]/page.tsx`
3. `app/presupuesto/[token]/actions.ts`
4. `src/features/cotizaciones/public-approval/services/public-cotizacion-approval.service.ts`
5. `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts`
6. `src/utils/cotizacion-approval.ts`

---

## Si la tarea es sobre clientes, revisar primero:

1. `docs/agent-map/FEATURES_MAP.md` - Seccion "Clientes"
2. `src/features/clientes/hooks/useClientes.ts`
3. `src/features/clientes/services/clientes.service.ts`
4. `src/features/clientes/repositories/clientes-repository.ts`
5. `app/(pwa-app)/clientes/page.tsx`

---

## Si la tarea es sobre notificaciones/push, revisar primero:

1. `src/features/notificaciones/services/web-push-notifications.service.ts`
2. `src/features/notificaciones/services/email-notifications.service.ts`
3. `src/features/notificaciones/repositories/web-push-subscriptions.repository.ts`
4. `src/utils/web-push.ts`
5. `src/utils/pwa-service-worker.ts`
6. `app/api/pwa/push-subscriptions/route.ts`
7. `src/components/pwa/push-notifications-prompt.tsx`

---

## Si la tarea es sobre diseno mobile, revisar primero:

1. `src/components/layout/app-shell.module.css` (tabbar mobile)
2. `app/(pwa-app)/_components/mobile-page-header.tsx`
3. `src/components/motion/premium-page-reveal.tsx`
4. `app/(pwa-app)/dashboard/_components/mobile/dashboard-mobile.tsx`
5. `app/globals.css`
6. CSS Modules de cada pagina (page.module.css)

---

## Si la tarea es sobre Supabase, revisar primero:

1. `docs/agent-map/DATA_MODEL_MAP.md`
2. `supabase/docs/current_schema.sql` (fuente de verdad del schema)
3. `supabase/docs/database_map.md`
4. `supabase/docs/rls_policies.md`
5. `supabase/docs/agent_database_notes.md`
6. `supabase/docs/database.types.ts` (tipos generados)
7. `src/lib/supabase/client.ts` (browser)
8. `src/lib/supabase/server.ts` (server)
9. `src/lib/supabase/admin.ts` (admin, service role)

---

## Si la tarea es sobre auth/login, revisar primero:

1. `src/features/auth/hooks/useAuth.ts`
2. `src/features/auth/services/auth.service.ts`
3. `src/features/auth/repositories/auth.repository.ts`
4. `src/features/auth/types/auth.ts`
5. `app/(auth-public)/login/page.tsx`
6. `proxy.ts` (middleware auth)

---

## Checklist antes de modificar codigo

- [ ] Leer la seccion correspondiente en `docs/agent-map/FEATURES_MAP.md`
- [ ] Leer la seccion correspondiente en `docs/agent-map/ROUTES_MAP.md` si es una ruta
- [ ] Verificar que no exista ya un componente reutilizable en `docs/agent-map/COMPONENTS_MAP.md`
- [ ] Verificar tabla(s) en `docs/agent-map/DATA_MODEL_MAP.md` si toca persistencia
- [ ] Confirmar que `organization_id` esta filtrado en toda query nueva/modificada
- [ ] No tocar tablas legacy sin instruccion explicita
- [ ] No reintroducir cotizador tecnico como centro del producto
- [ ] Verificar RLS si se agrega query nueva

## Checklist despues de modificar codigo

- [ ] Ejecutar `npm run lint`
- [ ] Ejecutar `npm run build`
- [ ] Ejecutar `npm test`
- [ ] Si se agrego/modifico una ruta: actualizar `ROUTES_MAP.md`
- [ ] Si se agrego/modifico un componente reutilizable: actualizar `COMPONENTS_MAP.md`
- [ ] Si se agrego/modifico una tabla o query: actualizar `DATA_MODEL_MAP.md`
- [ ] Si se agrego/modifico una feature: actualizar `FEATURES_MAP.md`
- [ ] Registrar cambio en `CHANGELOG_AGENT_MAP.md`

## Comandos utiles

| Comando | Proposito |
|---|---|
| `npm run dev` | Servidor desarrollo (puerto 3000) |
| `npm run dev:lan` | Servidor desarrollo en LAN (0.0.0.0:3000) |
| `npm run build` | Build de produccion |
| `npm run lint` | Linter ESLint |
| `npm test` | Ejecutar tests Jest |
| `npm run test:watch` | Tests en modo watch |
| `npx supabase start` | Iniciar Supabase local |
| `npx supabase db reset` | Reset DB local con migraciones |

## Archivos fuente de verdad

| Archivo | Es fuente de verdad para |
|---|---|
| `supabase/docs/current_schema.sql` | Schema de base de datos |
| `supabase/docs/database_map.md` | Mapa de tablas y relaciones |
| `supabase/docs/rls_policies.md` | Politicas RLS |
| `supabase/docs/database.types.ts` | Tipos TypeScript generados de Supabase |
| `src/features/<feature>/types/` | Tipos de dominio de cada feature |
| `AGENTS.md` | Reglas del proyecto |
| `docs/agent-map/` | Mapa tecnico del proyecto |

## Como evitar busquedas innecesarias

1. **No buscar en `src/hooks/`, `src/services/`, `src/repositories/`, `src/types/`** - Son re-exports legacy. Ir directo a `src/features/<feature>/`.
2. **No explorar carpetas enteras** - Usar el mapa para ir al archivo correcto.
3. **No leer archivos completos** si solo necesitas una funcion - Usar grep con patron especifico.
4. **No buscar en `node_modules/`** - Las dependencias estan en `package.json`.
5. **No buscar en `.next/`** - Es build cache.
6. **No buscar en tablas legacy** - Las tablas activas estan en `DATA_MODEL_MAP.md`.
7. **No leer CSS completo** si solo cambias un estilo - Buscar por clase especifica.
