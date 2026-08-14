# AGENTS.md - Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: ingeniería + agentes del repositorio

Lee antes de editar. Ultima consolidacion: 2026-08-14.

## Regla principal

**Antes de modificar codigo, leer `docs/agent-map/README.md`.**

**Antes de proponer o modificar cualquier cambio de desktop comercial, leer tambien `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`.**

Ahi esta el mapa tecnico completo del proyecto con rutas, features, tablas, componentes y guias por tipo de tarea. Usarlo reduce gasto de tokens y evita busquedas innecesarias.

## Jerarquia documental

Si dos documentos se contradicen, manda este orden:

1. `AGENTS.md`
2. `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`
3. `docs/agent-map/README.md`
4. mapas tecnicos en `docs/agent-map/`
5. briefs de apoyo (`docs/ventora-master-brief.md`, `docs/COTIZACION_FLOW_CONTEXT.md`, `docs/salida-beta-checklist.md`, `README.md`)

## Producto

**Software comercial para maestros, talleres y empresas de vidrio, aluminio y PVC. Permite cotizar desde celular, tablet o computador, mantener la informacion sincronizada, administrar clientes y cotizaciones, enviar PDF por WhatsApp y, de forma opcional, configurar recetas para cubicacion, despiece y pauta de corte revisable.**

- Giro consolidado (jul 2026): `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`
- Capas: captacion → cierre comercial → catalogo de precios → constructor (si hace falta) → **pauta/receta opcional**
- La cotizacion es el nucleo comercial; la pagina publica de solicitudes es complementaria
- No reintroducir cotizador tecnico universal, ERP, logistica ni motor de compatibilidades
- Desktop: escritorio de cotizacion + catalogo privado + constructor + cubicacion revisable; **no** CRM generico
- Plantillas L5000/L20/L25 = **iniciales sugeridas** (no verificadas). Bases tipologicas = pendientes de taller
- PDF cliente sin tecnico; resumen de fabricacion y pauta de corte revisable en `/print/cotizaciones/[id]/fabricacion`
- Para marketing/growth: `AGENTS_MARKETING.md`
- Mensaje comercial vigente: "Cotiza desde el celular, envia un PDF profesional y deja de llegar a casa a hacer presupuestos."

## Mapa tecnico

```text
docs/
  README.md                   <- Indice documental general
  VENTORA_GIRO_PRODUCTO_2026-07.md  <- Rector de producto y limites vigentes
  agent-map/
    README.md                   <- Indice maestro (EMPEZAR AQUI)
    CUBICACION_PAUTA_HANDOFF.md <- Handoff cubicación/pauta (pegar a otra IA)
    PROJECT_OVERVIEW.md         <- Stack, arquitectura, carpetas
    ROUTES_MAP.md               <- Rutas con archivos y riesgos
    ROUTES_MANIFEST.json        <- Inventario generado desde app/
    FEATURES_MAP.md             <- Features con archivos criticos
    DATA_MODEL_MAP.md           <- Tablas, relaciones, RLS, issues
    COMPONENTS_MAP.md           <- Componentes reutilizables
    AGENT_TASK_GUIDE.md         <- Guia practica por tipo de tarea
    TOKEN_SAVING_RULES.md       <- Reglas para ahorrar tokens
    CHANGELOG_AGENT_MAP.md      <- Historial de cambios
  growth-os/                    <- Workflows operativos de marketing y growth
  archive/                      <- Historial no vigente
  manuales/MANUAL_LINEAS_CUBICACION_PAUTA.md <- Manual corto taller
```

## Comandos principales

| Comando | Proposito |
|---|---|
| `pnpm run dev` | Desarrollo puerto 3000 |
| `pnpm run build` | Build produccion |
| `pnpm run lint` | Linter ESLint |
| `pnpm test` | Tests Jest |

## Estado actual

Ultima actualizacion operativa: 2026-08-14

- **Pasarela de pago**: Mercado Pago Chile **operativa en produccion** para suscripciones recurrentes CLP. Runbook: `docs/billing/README.md`.
- **Paso actual**: **Fase 4 — Cubicación V1 vendible multi-tipología**. Ver `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`.
- **Modelo vigente**: `fabrication_recipes` + `fabrication_recipe_tests`; seleccion de receta validada; snapshot formal en `cotizacion_items.fabricacion_snapshot`; `fabricationRecipePack`, `fabricationRecipe` y `[cub:]` quedan como compatibilidad historica.
- **Plantillas**: L5000/L20/L25 = iniciales sugeridas (wizard Fabricación, no listado de líneas). Bases tipológicas = pendientes.
- **Cotizar**: filtra por tipología de pieza; pide herraje solo si hay varias activas.
- **Handoffs**: `CUBICACION_PAUTA_HANDOFF.md` + `CONSTRUCTOR_DESKTOP_HANDOFF.md`.
- **Cómo seguir**:
 1. Calibrar L5000/L20/L25 con fabricaciones reales (piloto);
 2. Fórmulas reales paño fijo / abatible / puerta antes de marketing de cobertura amplia;
 3. Constructor/PDF: rasterizar PDF real con Poppler si se toca croquis;
 4. no reabrir 2B, CRM/Kanban ni inventar tipologías en el catálogo.

### Ya resuelto en pasada 2026-08-14 (Billing Mercado Pago Chile)

- Pasarela recurrente Mercado Pago Chile operativa en produccion (`MERCADOPAGO_BILLING_ENABLED=true` + variables `MERCADOPAGO_CL_*`)
- Checkout en `/cuenta-vencida` para Founder mensual/anual y Solo Cotizacion anual; WhatsApp solo como fallback si falta configuracion
- Webhook firmado en `/api/subscriptions/mercadopago/webhook`; activacion de cuenta solo por webhook, no por retorno del navegador
- Cambio de plan durante checkout pendiente: reutiliza mismo plan o libera reserva anterior al elegir otro
- Documentacion operativa centralizada en `docs/billing/README.md`

### Ya resuelto en pasada 2026-07-24 (Cubicación V1 vendible)

- Pack multi-variante + migración legacy + espejo `fabricationRecipe`
- Biblioteca comercial (3 sugeridas + 5 bases pendientes)
- Wizard origen plantilla/base/propia + UX identidad arriba
- Filtro tipología / selector herraje en pauta de cotización
- Resumen fabricación print interno separado del PDF cliente
- Tests de pack, bump versión, plantillas y selección
- Docs: roadmap, giro producto, handoff, mapas, manual

### Ya resuelto en pasada 2026-06-11 (Espejo y Cubierta de mesa sin perfileria)

- `Espejo` y `Cubierta de mesa` ya no piden Aluminio/PVC ni color de perfil en Paso 2 (movil y desktop)
- Fuente de verdad: `shouldRequireProfileMaterialForComponent()` en `workflow-ui.ts`
- Espejo muestra seccion **Espejos** con recomendados `3mm`, `4mm`, `5mm`, `6mm` (`MIRROR_GLASS_THICKNESS_OPTIONS`)
- PDF omite filas **Material** y **Color** solo para esos dos tipos via `buildCotizacionItemPrintSpecs()`
- Regresion: `profile-material-regression.test.ts` + `item-print-specs.test.ts`
- Ventanas, puertas y demas componentes con perfileria siguen igual

### Ya resuelto en pasada 2026-06-11 (UX estados y metricas cotizaciones)

- Se agrego `cotizaciones.pdf_descargado_en` para registrar descarga de PDF en silencio sin cambiar estado comercial
- Nuevo endpoint `POST /api/cotizaciones/[id]/pdf-descargado` y `recordPdfDownload()` en store/repository
- Visor `/print/cotizaciones/[id]` muestra toast "PDF descargado" y no interrumpe al maestro post-descarga
- Dashboard reorientado a **Valor cotizado** + metricas: creadas, PDF generados, aprobadas registradas (sin alerta dominante de pendientes)
- Nuevo `cotizacion-display-state.service.ts` con estados visibles neutrales (**PDF generado**, **Sin cierre registrado**, etc.)
- Listado y detalle de cotizaciones dejaron de mostrar "Pendiente" como estado dominante

### Ya resuelto en esta pasada

- Se implemento y migro el alta Google unica con `/auth/completar-cuenta`:
  - migracion remota `20260728083604_google_oauth_account_completion`
  - perfil privado en `users` con WhatsApp chileno y consentimiento server-side
  - RPC atomica/idempotente solo `service_role`
  - correo normalizado unico y locks por identidad/correo
  - grants de columna para no exponer nombre, WhatsApp, ciudad ni consentimiento al cliente autenticado
  - panel founder separado de `clients` comerciales
- Se pulio el Paso 2 mobile de `/cotizaciones/nueva` para `por_item`:
  - selector inicial **Cotizar por items** / **Cuadernillo digital**
  - toggle **Guiada | Constructor** solo en Tipo/lista, no en Cantidad/Datos
  - Constructor mobile propio en `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/`
  - lista compacta de piezas, linea global compacta, edicion rapida, material Aluminio/PVC, lineas Aluminio/PVC/Cristal y preview con color
  - editor de composicion full-screen con `Reflejar` contextual solo para aperturas laterales
  - sin cambios en PDF, WhatsApp, pricing, tablas ni persistencia
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
- Correr smoke visual de Espejo/Cubierta de mesa en cotizacion y PDF si se toca `shouldRequireProfileMaterialForComponent` o `item-print-specs.ts`
- Mantener foco en Fase 4 V1 vendible: calibrar plantillas sugeridas; no vender bases tipológicas como listas; no abrir Kanban/CRM/inventario/compras/fabricación automática/optimizador
- Antes de tocar cubicación/pauta con otra IA: pegar `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md` (+ opcional `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`)

## Notas de QA

- Para QA automatizado confiable, preferir `pnpm run build` + `pnpm run start`.
- El `pnpm run dev` actual en `:3000` puede quedar con HMR degradado (`webpack-hmr` handshake invalido) y falsear pruebas de login/client hydration.

## Convenciones criticas

- **Flujo obligatorio**: `page -> hook -> service -> repository -> Supabase`
- **TypeScript estricto**: tipar todo, `any` solo si inevitable
- **Multi-tenant**: toda query filtra `organization_id` - NUNCA eliminar este filtro
- **Soft delete**: `eliminado_en: timestamp`, queries activas filtran `.is("eliminado_en", null)`
- **Calcular en services**: `precioFinalUnitario = costoProveedorUnitario * (1 + margenPct / 100)`
- **Codigo nuevo en `src/features/<feature>/`**: NO en `src/hooks/`, `src/services/`, `src/repositories/`, `src/types/` (son re-exports legacy)
- **Salidas en espanol**: nunca responder en ingles
- **Usar `proxy.ts`**: no asumir `middleware.ts`
- **Antes de tocar cotizacion, dashboard, visual o catalogo**: leer roadmap + mapa tecnico correspondiente

## Identidad visual

- **Fuente de verdad de branding**: `docs/marketing/brand-guidelines.md`
- **Regla general de marca**: Ventora debe verse como una marca comercial premium, sobria, moderna y orientada a captar, ordenar y cerrar trabajos; no como ERP, software industrial pesado ni cotizador tecnico.
- **Paleta de marca para piezas externas**: usar negro premium `#050505`, negro azulado `#0B0F17`, grafito `#111827`, azul electrico `#1E88FF`, plata `#E6E8EB`, acero `#8A96A6` y blanco `#FFFFFF` solo de apoyo.
- **Canales donde SI aplica esta direccion visual**: landing publica, marketing, redes, videos, portadas, banners, piezas comerciales, branding y logos.
- **Canales donde NO se debe forzar**: app interna autenticada. No redisenar ni oscurecer los colores internos del sistema solo para alinearlos con branding, salvo pedido explicito y QA dedicado.
- **Login**: puede mantener estetica oscura premium alineada a marca si no perjudica rendimiento, legibilidad ni conversion.
- **CTA principal de marca**: azul electrico `#1E88FF`. WhatsApp puede usar verde solo en acciones directas de WhatsApp, no como color principal de marca.
- **Imagenes**: priorizar vidrio, aluminio, fachadas, arquitectura moderna, planos y trabajos terminados; evitar tecnologia generica, robots, IA, servidores o fondos abstractos sin relacion con el rubro.
- **Marca principal**: isotipo `V + cubo` junto al wordmark `VENTORA`. El cubo solo no es la marca principal; se reserva como recurso secundario. No usar el cubo dentro de la `O`.
- **Aplicaciones del logo**: logo horizontal principal `V + cubo + VENTORA`, isotipo `V + cubo` para avatar/redes, icono compacto con `V` dominante para app/PWA. Preferir SVG y versiones nitidas segun contexto.
- **Restriccion explicita**: no convertir la landing en una web de constructora, no caer en un SaaS blanco/azul generico y no sacrificar claridad mobile-first por efectos visuales.

## Advertencias

- **No romper rutas publicas**: `/solicitud/[empresa]` (captacion) y `/presupuesto/[token]` (cierre) son criticas
- **No romper PDF ni WhatsApp**: son herramientas de cierre activas
- **No tocar tablas legacy**: `materials`, `product_types`, `system_lines`, etc. estan dormidas
- **No abrir Fase 3+**: pipeline Kanban y metricas decorativas no son prioridad; lo demas se posterga
- **No crear `oportunidades` ni `cobros`**: roadmap congelado para una fase futura
- **No crear roles, responsables, equipos ni permisos**
- **No agregar tablas tecnicas nuevas, formulas libres, optimizacion, nesting ni fabricacion automatica para cubicacion sin aprobacion explicita**
- **4 tablas sin RLS policies**: quote_item_breakdown, material_types, formula_variables, cotizacion_code_counters
- **Email push depende de env vars**: `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`
- **Bucket Storage**: `organization-assets` requerido para logos y PDFs
- **Service role key**: `SUPABASE_SERVICE_ROLE_KEY` requerida para aprobacion publica y operaciones admin

## DB: fuente de verdad

- `supabase/docs/current_schema.sql` - schema
- `supabase/docs/database_map.md` - mapa de tablas
- `supabase/docs/rls_policies.md` - politicas RLS
- `supabase/docs/agent_database_notes.md` - reglas para agentes
