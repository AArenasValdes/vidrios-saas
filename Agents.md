# AGENTS.md - Ventora

Lee antes de editar. Ultima consolidacion: 2026-05-09.

## Regla principal

**Antes de modificar codigo, leer `docs/agent-map/README.md`.**

Ahi esta el mapa tecnico completo del proyecto con rutas, features, tablas, componentes y guias por tipo de tarea. Usarlo reduce gasto de tokens y evita busquedas innecesarias.

## Producto

**Software comercial para empresas de vidrios y aluminio que captura, centraliza y ayuda a cerrar leads.**

- La cotizacion existe como herramienta de cierre, no como identidad del producto
- Frase clave: "Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."
- No reintroducir cotizador tecnico, ERP, logistica ni motor de compatibilidades

## Mapa tecnico

```text
docs/agent-map/
  README.md              <- Indice maestro (EMPEZAR AQUI)
  PROJECT_OVERVIEW.md    <- Stack, arquitectura, carpetas
  ROUTES_MAP.md          <- 17+ rutas con archivos y riesgos
  FEATURES_MAP.md        <- 14 features con archivos criticos
  DATA_MODEL_MAP.md      <- Tablas, relaciones, RLS, issues
  COMPONENTS_MAP.md      <- Componentes reutilizables
  AGENT_TASK_GUIDE.md    <- Guia practica por tipo de tarea
  TOKEN_SAVING_RULES.md  <- Reglas para ahorrar tokens
  CHANGELOG_AGENT_MAP.md <- Historial de cambios
```

## Comandos principales

| Comando | Proposito |
|---|---|
| `npm run dev` | Desarrollo puerto 3000 |
| `npm run build` | Build produccion |
| `npm run lint` | Linter ESLint |
| `npm test` | Tests Jest |

## Estado actual

Ultima actualizacion operativa: 2026-05-13

- **Fase actual**: estabilizacion, hardening y limpieza de rutas criticas de captacion y cierre
- **Estado del baseline**: `npm run lint`, `npm test` y `npm run build` estan pasando en el workspace principal
- **Rutas ya estabilizadas en esta pasada**:
  - `/api/solicitud/[empresa]`
  - `/presupuesto/[token]`
  - `/api/dashboard/summary`
  - `/api/cotizaciones/resumen`
  - `/api/clientes/resumen`
  - `/api/solicitudes`
  - `/api/solicitudes/resumen`
  - `/api/pwa/push-subscriptions`
- **Seguridad DB ya endurecida en esta pasada**:
  - `web_push_subscriptions` ahora tiene policies RLS para `authenticated`
- **Hardening adicional ya cerrado en esta pasada**:
  - helper comun de auth resuelve primero por `auth_user_id` y cae a correo solo por compatibilidad
  - `/api/pwa/push-subscriptions` ahora desactiva suscripciones por `organization_id + auth_user_id`
  - `proxy.ts` ahora protege tambien `/solicitudes` y `/configuracion/*`
- **QA autenticado ya cerrado en esta pasada**:
  - smoke real completado en `next start` con login valido sobre `/dashboard`, `/clientes`, `/cotizaciones`, `/solicitudes` y `/configuracion/empresa`
  - `dashboard` navega a `cotizaciones/nueva`
  - busquedas base de `clientes` y `cotizaciones` responden
  - `solicitudes` navega a `canales`
  - `app/layout.tsx` ya no monta `Analytics` ni `SpeedInsights` fuera de Vercel, eliminando errores de consola locales/self-hosted
- **Objetivo inmediato**: seguir cerrando deuda tecnica de Fase 2 sin abrir Fase 3+
- **Nueva pasada cerrada en cotizaciones**:
  - Paso 2 ahora soporta cotizacion asistida por linea comercial + medidas
  - nueva tabla activa `cotizacion_line_templates`
  - `/configuracion/empresa` ahora expone bloque compacto `Lineas y precios base`
  - override manual protegido con accion `Recalcular con plantilla`
  - calculadora integrada secundaria en edicion rapida

### Ya resuelto en esta pasada

- Se aislo `lint` y `jest` para que no escaneen worktrees auxiliares ni caches ajenas al repo principal
- Se endurecio la entrada publica de solicitudes:
  - validacion de slug de empresa
  - parseo seguro del body
  - mejor resolucion de IP
  - sanitizacion de `sourceUrl` aceptando solo `http/https`
- Se redujo la exposicion de errores internos en `/presupuesto/[token]`
- Se unifico la resolucion de usuario, rol y organizacion para APIs privadas criticas con helper comun
- Se corrigio el acceso global de solicitudes para admins allowlist, sin romper el filtro por `organization_id` para admins normales
- Se endurecio el endpoint legacy `/api/solicitudes`:
  - mejor resolucion de IP
  - rechazo de JSON invalido
  - limpieza menor del rate limiting en memoria
- Se cerro la deuda activa de RLS en `web_push_subscriptions` con policies por `organization_id + auth_user_id`
- Se cerro un endurecimiento adicional en auth y push:
  - resolucion de perfil activo priorizando `auth_user_id`
  - baja de push acotada al usuario autenticado duenio de la suscripcion
- Se cerro una brecha de auth en el perimetro web:
  - `proxy.ts` y su matcher ahora incluyen `/solicitudes` y `/configuracion/*`
  - smoke sin sesion confirma redirect a `/login?next=...` en esas rutas
- Se modularizaron helpers chicos de solicitudes publicas para:
  - parseo seguro de JSON objeto
  - resolucion consistente de IP
  - rate limiting con limpieza de memoria en ventana deslizante
- Se cerro el smoke autenticado de rutas privadas criticas en navegador usando una instancia controlada de `next start`
- Se elimino ruido de consola en entornos fuera de Vercel:
  - `Analytics` y `SpeedInsights` ya no se inyectan cuando `process.env.VERCEL !== "1"`
- Se agrego cobertura de tests para:
  - sanitizacion de `sourceUrl`
  - flujo de aprobacion publica
  - registro de push desacoplado de validacion real de membresia durante test
  - acceso global y acceso por organizacion en solicitudes
  - rechazo de body invalido en `/api/solicitudes`
  - rechazo de JSON invalido en `/api/pwa/push-subscriptions`
  - auth helper comun y fallback por correo
  - rate limiting y slug invalido en `/api/solicitud/[empresa]`
  - redirects codificados en acciones de `/presupuesto/[token]`
  - contratos base de `/api/dashboard/summary`, `/api/clientes/resumen` y `/api/cotizaciones/resumen`
  - metadata comercial de items de cotizacion
  - pricing por linea con minimo y redondeo
  - override manual en edicion rapida

### Ya resuelto en la pasada 2026-05-13

- Se creo `cotizacion_line_templates` con RLS por `organization_id` y soft delete
- Se agrego calculo automatico por linea en Paso 2 de `/cotizaciones/nueva`:
  - area
  - precio por m²
  - minimo cobrable
  - redondeo
  - precio final editable
- Se agregaron acciones:
  - `Guardar como precio rapido`
  - `Duplicar`
  - `Recalcular con plantilla`
- Se corrigio persistencia de snapshot comercial:
  - `cotizacion_items.linea` ya sale de la linea/referencia elegida y no del codigo del item
- Se expone metadata de linea en detalle movil y print sin redisenar PDF

### Falta por hacer

- Auditar seguridad multi-tenant en queries nuevas o tocadas y confirmar `organization_id` en cada cadena critica
- Revisar tablas advertidas sin RLS policies antes de ampliar superficies publicas:
  - `quote_item_breakdown`
  - `material_types`
  - `formula_variables`
  - `cotizacion_code_counters`
- Correr smoke y QA manual con navegador sobre:
  - captacion publica `/solicitud/[empresa]`
  - cierre publico `/presupuesto/[token]`
  - acciones clave de WhatsApp y PDF en cotizaciones
- Validar de forma visual y funcional las vistas privadas que no se cubrieron completas en el smoke autenticado:
  - `/cotizaciones/[id]`
  - flujos profundos de `/cotizaciones/nueva`
  - acciones de edicion/eliminacion en `/clientes`
- Actualizar `docs/agent-map/` si cambian rutas, features, tablas o componentes en la siguiente pasada
- Mantener foco en Fase 2: captacion, centralizacion y cierre comercial; no abrir pipeline Kanban ni modulos posteriores

## Notas de QA

- Para QA automatizado confiable, preferir `npm run build` + `npm run start`.
- El `npm run dev` actual en `:3000` puede quedar con HMR degradado (`webpack-hmr` handshake invalido) y falsear pruebas de login/client hydration.

## Convenciones criticas

- **Flujo obligatorio**: `page -> hook -> service -> repository -> Supabase`
- **TypeScript estricto**: tipar todo, `any` solo si inevitable
- **Multi-tenant**: toda query filtra `organization_id` - NUNCA eliminar este filtro
- **Soft delete**: `eliminado_en: timestamp`, queries activas filtran `.is("eliminado_en", null)`
- **Calcular en services**: `precioFinalUnitario = costoProveedorUnitario * (1 + margenPct / 100)`
- **Codigo nuevo en `src/features/<feature>/`**: NO en `src/hooks/`, `src/services/`, `src/repositories/`, `src/types/` (son re-exports legacy)
- **Salidas en espanol**: nunca responder en ingles
- **Usar `proxy.ts`**: no asumir `middleware.ts`

## Advertencias

- **No romper rutas publicas**: `/solicitud/[empresa]` (captacion) y `/presupuesto/[token]` (cierre) son criticas
- **No romper PDF ni WhatsApp**: son herramientas de cierre activas
- **No tocar tablas legacy**: `materials`, `product_types`, `system_lines`, etc. estan dormidas
- **No abrir Fase 3+**: pipeline Kanban y metricas son Fase 2; lo demas se posterga
- **4 tablas sin RLS policies**: quote_item_breakdown, material_types, formula_variables, cotizacion_code_counters
- **Email push depende de env vars**: `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`
- **Bucket Storage**: `organization-assets` requerido para logos y PDFs
- **Service role key**: `SUPABASE_SERVICE_ROLE_KEY` requerida para aprobacion publica y operaciones admin

## DB: fuente de verdad

- `supabase/docs/current_schema.sql` - schema
- `supabase/docs/database_map.md` - mapa de tablas
- `supabase/docs/rls_policies.md` - politicas RLS
- `supabase/docs/agent_database_notes.md` - reglas para agentes
