# Agent Task Guide - Ventora

Guia practica para futuros agentes. Antes de explorar el proyecto, revisar la seccion correspondiente.

## Prelectura obligatoria

Antes de tocar desktop comercial, cotizaciones, dashboard, visual o catalogos, leer:

1. `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`
2. `docs/agent-map/README.md`
3. el bloque especifico de este `AGENT_TASK_GUIDE.md`

---

## Si la tarea es sobre dashboard comercial desktop, revisar primero:

1. `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md` - Fase 5
2. `docs/design/FASE_5_DASHBOARD_BRIEF.md` - decisiones + brief de diseño
3. `docs/agent-map/FEATURES_MAP.md` - Seccion "Dashboard"
4. `docs/agent-map/ROUTES_MAP.md` - Ruta `/dashboard`
5. `src/features/dashboard/services/dashboard-summary-server.service.ts`
6. `app/api/dashboard/summary/route.ts`
7. `app/(pwa-app)/dashboard/_components/desktop/dashboard-desktop.tsx`
8. `app/(pwa-app)/dashboard/_hooks/use-dashboard-view-model.ts`

Reglas:

- usar solo datos reales existentes;
- no inventar KPIs;
- KPI hero = valor cotizado; cola principal = **Por enviar** (no seguimiento como foco);
- no abrir CRM, oportunidades ni cobros;
- no romper contrato actual consumido por mobile;
- no implementar rediseño UI hasta aprobar dirección visual del brief.

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
1. `src/features/cotizaciones/new-quote/workflow-ui.ts` (incluye `shouldRequireProfileMaterialForComponent`, `MIRROR_GLASS_THICKNESS_OPTIONS`, `GLASS_OPTIONS`)
2. `src/features/cotizaciones/new-quote/solicitud-prefill.ts`
3. `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`
4. `src/features/cotizaciones/services/component-catalog.service.ts`
5. `src/features/cotizaciones/services/component-suggestions.service.ts`
6. `src/features/cotizaciones/services/glass-recommendations.service.ts`
7. `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo.ts`
8. `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-configuracion-movil.tsx`
9. `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-vidrio-movil.tsx`

#### Regla rapida: componentes solo vidrio
- Hoy solo aplican: **`Espejo`**, **`Cubierta de mesa`**.
- Usar siempre `shouldRequireProfileMaterialForComponent(tipo)` antes de mostrar/exigir Material, Color perfil o filas PDF de material/color.
- Si agregas otro tipo solo vidrio, actualizar el set en `workflow-ui.ts` y correr `profile-material-regression.test.ts`.

### Si la tarea es sobre Quote Studio desktop especificamente:
1. `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md` - Milestone 0 y 2
2. `app/(pwa-app)/cotizaciones/nueva/page.tsx`
3. `app/(pwa-app)/cotizaciones/nueva/_components/resumen-desktop-lateral.tsx`
4. `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-agregar-grupo-sheet.tsx`
5. `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-panel-componentes.tsx`
6. `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo.ts`
7. `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`
8. `src/features/cotizaciones/services/cotizacion-line-pricing.service.ts`

Reglas:

- primero estabilizar desktop actual; despues pulir Quote Studio;
- Fase 1 Quote Studio es desktop-only desde `min-width: 1024px`;
- bajo 1024 px mobile no se toca salvo regresion bloqueante reproducible;
- en 390 px y 430 px no agregar panel financiero, campos de costo/margen/traslado/merma/precio recomendado, tabs desktop, acordeones nuevos, sticky panels ni cambios de resumen/CTA/PDF/WhatsApp;
- mantener el flujo mobile actual como fallback integro: mismo orden de pasos, controles, jerarquia visual, copy, espaciados y navegacion;
- los snapshots financieros pueden existir como datos internos/aditivos, pero no se exponen en UI mobile durante Fase 1;
- no crear segunda persistencia, entidades duplicadas ni rutas paralelas para desktop;
- no romper PDF, WhatsApp, aprobacion publica ni contratos actuales;
- normalizacion `861px -> 1024px` solo dentro de trabajo controlado de estabilizacion.

---

## Si la tarea es sobre constructor visual guiado, revisar primero:

1. `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md` - Milestone 3
2. `docs/COTIZACION_FLOW_CONTEXT.md`
3. `docs/agent-map/CHANGELOG_AGENT_MAP.md` - entrada QA "Constructor visual: UX maestro + entrada Personalizado"
4. `src/features/cotizaciones/visual-composer/` (tipos, renderer, `GuidedVisualComposer`)
5. `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-agregar-grupo-sheet.tsx` (entrada principal al agregar)
6. `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-editor-desktop.tsx` (al editar pieza)
7. `src/utils/cotizacion-item-presentation.ts` (puente `[gvc:...]`)
8. `src/utils/window-drawings.ts` (croquis legacy; no reemplazar a ciegas)
9. `docs/agent-map/DATA_MODEL_MAP.md` - `cotizacion_item_visual_configs`

Reglas:

- no construir CAD libre;
- entrada solo desktop ≥1024; no exponer en mobile;
- el constructor se ofrece tras elegir **Personalizado** (sistema Ventana, o config/esquema en Puerta/otros), no como CTA suelto en medio del paso Sistema;
- no tocar PDF ni renderer publico sin revisar compatibilidad;
- tabla visual + sync al guardar + hydrate formal en lecturas (`getWorkflowById` / presupuesto publico); bridge `[gvc:]` como fallback;
- no agregar cubicacion automatica en esta fase.

### Como probar (QA local)

1. Desktop ≥1024; preferir `npm run build` + `npm run start` (o `pnpm`).
2. `/cotizaciones/nueva` → Paso 2 → Agregar componente → **Ventana** → sistema **Personalizado** → **Abrir constructor**.
3. Alternativa: **Puerta** → config **Personalizado** → constructor; o Ventana Corredera → esquema **Personalizado**.
4. Aplicar → medidas → precio → **Finalizar pieza** (sin error `base64url`).

### Para PDF especificamente:
1. `src/utils/cotizacion-pdf.ts`
2. `src/features/cotizaciones/pdf-cache/services/cotizacion-pdf-cache.service.ts`
3. `app/print/cotizaciones/[id]/page.tsx`
4. `app/print/cotizaciones/[id]/_utils/item-print-specs.ts`

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

## Si la tarea es sobre billing/pagos/suscripcion, revisar primero:

1. `docs/agent-map/FEATURES_MAP.md` - Seccion "Trial, Suscripcion y Billing"
2. `src/features/billing/types/plans.ts`
3. `src/features/billing/types/payment-provider.ts`
4. `src/features/billing/providers/flow.provider.ts`
5. `src/features/billing/services/billing-checkout.service.ts`
6. `src/features/billing/services/billing-subscription.service.ts`
7. `src/features/subscriptions/repositories/pago-suscripcion.repository.ts`
8. `app/api/billing/checkout/route.ts`
9. `app/api/billing/flow/confirmar/route.ts`
10. `supabase/migrations/20260602062145_billing_flow_provider.sql`

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
- [ ] No crear migraciones sin aprobacion explicita
- [ ] No tocar PDF, WhatsApp ni rutas publicas sin aprobacion
- [ ] No agregar logica de cubicacion sin piloto aprobado
- [ ] No abrir oportunidades, cobros, roles o equipos por fuera del roadmap

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
