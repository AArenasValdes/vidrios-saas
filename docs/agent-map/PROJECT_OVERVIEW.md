# Project Overview - Ventora

## Descripcion general del producto

**Ventora** es un software comercial SaaS para empresas de vidrios, aluminio y PVC que **captura, centraliza y ayuda a cerrar leads**, y que ahora extiende su capa desktop para preparar mejor la cotizacion, configurar visualmente trabajos no estandar y emitir documentos profesionales. No es un ERP, no es un CRM enterprise y no es un cotizador tecnico universal. La cotizacion existe como herramienta de cierre comercial, no como identidad del producto.

**Frase clave:** "Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| Frontend | React 19.2.3, TypeScript 5 |
| Estilos | CSS Modules + Tailwind CSS 4 + shadcn/ui |
| Base de datos | Supabase (PostgreSQL 17) |
| Auth | Supabase Auth (email/password, PKCE) |
| PDF | jsPDF + html2canvas |
| QR | react-qr-code |
| Animaciones | framer-motion |
| Push | web-push (VAPID) |
| Email | Resend o SendGrid (configurable) |
| Iconos | lucide-react, react-icons |
| Testing | Jest 30 + React Testing Library |
| Deploy | Vercel |

## Variables criticas de produccion

- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`: rate limiting cross-instance en captacion publica
- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`: Web Push VAPID
- `SUPABASE_SERVICE_ROLE_KEY`: aprobacion publica, uploads admin y operaciones server-side
- `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`: correo transaccional si se activa envio por email

## Arquitectura general

```
pagina/componente -> hook -> service -> repository -> Supabase
```

- **Pagina/Componente**: UI, importa hooks
- **Hook**: Estado y orquestacion, importa services
- **Service**: Logica de negocio, importa repositories
- **Repository**: Acceso a datos Supabase, sin logica de negocio
- **Supabase**: Base de datos + auth + storage

### Capas de Supabase

| Cliente | Uso | Archivo |
|---|---|---|
| Browser | Componentes cliente | `src/lib/supabase/client.ts` |
| Server | Server components, API routes | `src/lib/supabase/server.ts` |
| Admin | Operaciones publicas/sin auth | `src/lib/supabase/admin.ts` |

## Convenciones principales

- **TypeScript estricto**: tipar todo, `any` solo si inevitable y comentado
- **Multi-tenant obligatorio**: toda query filtra `organization_id`
- **Soft delete**: borrar = `eliminado_en: timestamp`, queries activas filtran `.is("eliminado_en", null)`
- **CSS Modules**: estilos por componente con `.module.css`
- **Server Components por defecto**, Client Components solo con `"use client"`
- **ES en espanol**: nombres de variables, tipos, comentarios y UI en espanol
- **Path alias**: `@/` mapea a `./src/` y `./`

## Norte actual de producto

- Mobile sigue siendo prioritario para cotizar en terreno.
- Desktop evoluciona como escritorio de cotizacion y control comercial real.
- `projects` es la tabla tecnica; en producto se presenta como **Obras**.
- **Estado a 2026-07-21:**
  1. Fases 1, 2A, **2B** y 5 — cerradas / implementadas (2B en changelog 17-07);
  2. Fase 3 constructor V2/cuaderno desktop — usable y abierto solo a pulido controlado; handoff en `docs/agent-map/CONSTRUCTOR_DESKTOP_HANDOFF.md`;
  3. Pasada reciente de diseño desktop (Fase 5 + shell/listados/detalles/catálogo UX);
  4. **Fase actual:** Fase 4 — **recetas de fabricación** + pauta revisable + snapshot v2; panel en `/cotizaciones/nueva`; handoff `CUBICACION_PAUTA_HANDOFF.md`;
  5. CRM/Kanban — no abrir.
- Desktop no esta abriendo pipeline CRM, oportunidades, cobros ni multiusuario en esta etapa.

## Estructura de carpetas

```
vidrios-saas/
├── app/                          # Rutas Next.js App Router
│   ├── (landing-web)/            # Landing + paginas publicas (sin auth)
│   │   ├── page.tsx              # Landing principal
│   │   ├── planes/               # Pagina de planes
│   │   ├── solicitud/[empresa]/  # Formulario publico de solicitud
│   │   ├── privacy/              # Politica de privacidad
│   │   └── terms/                # Terminos de uso
│   ├── (auth-public)/            # Autenticacion (sin shell)
│   │   ├── login/                # Login
│   │   └── auth/                 # Callback OAuth
│   ├── (pwa-app)/                # App operativa (con shell + auth)
│   │   ├── layout.tsx            # Layout con AppShell
│   │   ├── dashboard/            # Dashboard con KPIs
│   │   ├── cotizaciones/         # Listado, nueva, detalle
│   │   ├── clientes/             # Listado, nuevo, detalle
│   │   ├── solicitudes/          # Listado, canales
│   │   └── configuracion/        # Empresa, pagina-venta
│   ├── presupuesto/[token]/      # Presupuesto publico (aprobacion/rechazo)
│   ├── print/cotizaciones/[id]/  # Vista de impresion PDF
│   └── api/                      # API routes
│       ├── solicitud/[empresa]/  # POST solicitud publica
│       ├── solicitudes/resumen/  # GET resumen solicitudes
│       ├── cotizaciones/resumen/ # GET resumen cotizaciones
│       ├── clientes/resumen/     # GET resumen clientes
│       ├── dashboard/summary/    # GET dashboard summary
│       └── pwa/push-subscriptions/ # POST/DELETE push
├── src/
│   ├── features/                 # FUENTE REAL de logica por feature
│   │   ├── auth/                 # Autenticacion
│   │   ├── clientes/             # CRUD clientes
│   │   ├── cotizaciones/         # Cotizaciones + workflow + PDF + aprobacion
│   │   │   ├── public-approval/  # Aprobacion/rechazo publico
│   │   │   ├── new-quote/        # UI state nueva cotizacion
│   │   │   └── pdf-cache/        # Cache PDF en Storage
│   │   ├── dashboard/            # KPIs + resumen server
│   │   ├── landing-gallery/      # Galeria de imagenes landing
│   │   ├── notificaciones/       # Web Push + Email
│   │   ├── organization-profile/ # Perfil empresa + config landing
│   │   ├── projects/             # Proyectos/obras
│   │   └── solicitudes/          # Leads + canales + UTM
│   │       └── components/       # Componente LeadChannels
│   ├── components/               # Componentes compartidos
│   │   ├── ui/                   # Primitivos UI (Button, Avatar, TestimonialCard)
│   │   ├── layout/               # AppShell (shell operativa)
│   │   ├── landing/              # Secciones landing
│   │   ├── pwa/                  # PWA + push + sketch SVG
│   │   ├── motion/               # Animaciones framer-motion
│   │   └── *.tsx                 # Footer, Testimonials
│   ├── hooks/                    # RE-EXPORTS legacy (no fuente real)
│   ├── services/                 # RE-EXPORTS legacy (no fuente real)
│   ├── repositories/             # RE-EXPORTS legacy (no fuente real)
│   ├── types/                    # RE-EXPORTS legacy + common.ts + contact-request.ts
│   ├── constants/                # IVA, marca, colores, materiales (vacio)
│   ├── utils/                    # Helpers puros (moneda, WhatsApp, PDF, push, etc.)
│   └── lib/                      # Supabase clients + cn()
├── supabase/
│   ├── migrations/               # 23 migraciones
│   └── docs/                     # Schema, map, RLS, seeds, tipos generados
├── docs/                         # Documentacion del proyecto
│   └── agent-map/                # Este mapa tecnico
├── proxy.ts                      # Middleware auth (proxy de Next.js)
├── app/manifest.ts               # PWA manifest
└── public/                       # Assets estaticos + SW
```

## Modulos funcionales principales

| Modulo | Feature folder | Rutas principales | Tablas core |
|---|---|---|---|
| Auth | `src/features/auth/` | `/login` | `auth.users`, `public.users` |
| Dashboard | `src/features/dashboard/` | `/dashboard` | `cotizaciones`, `clients` |
| Cotizaciones | `src/features/cotizaciones/` | `/cotizaciones`, `/cotizaciones/nueva`, `/cotizaciones/[id]` | `cotizaciones`, `cotizacion_items` |
| Aprobacion publica | `src/features/cotizaciones/public-approval/` | `/presupuesto/[token]` | `cotizaciones`, `organization_profile` |
| Clientes | `src/features/clientes/` | `/clientes`, `/clientes/[id]` | `clients` |
| Solicitudes | `src/features/solicitudes/` | `/solicitudes`, `/solicitudes/canales`, `/solicitud/[empresa]` | `solicitudes_contacto` |
| Perfil empresa | `src/features/organization-profile/` | `/configuracion/empresa`, `/configuracion/pagina-venta` | `organization_profile` |
| Landing gallery | `src/features/landing-gallery/` | `/configuracion/pagina-venta` | `public_landing_gallery` |
| Notificaciones | `src/features/notificaciones/` | Interna (API routes) | `web_push_subscriptions` |
| Proyectos | `src/features/projects/` | Sin ruta directa | `projects` |

## Separacion frontend / backend / Supabase

- **Frontend puro**: `app/` (paginas), `src/components/`, `src/utils/`, `src/constants/`
- **Logica de negocio**: `src/features/<feature>/services/`, `src/features/<feature>/hooks/`
- **Acceso datos**: `src/features/<feature>/repositories/`
- **Tipos dominio**: `src/features/<feature>/types/`
- **Infra Supabase**: `src/lib/supabase/` (clients), `supabase/migrations/` (schema), `supabase/docs/` (documentacion DB)
- **API routes**: `app/api/` (endpoints REST para resumenes y operaciones publicas)
- **Server actions**: `app/presupuesto/[token]/actions.ts` (aprobacion/rechazo)

## Archivos legacy que NO son fuente real

Los siguientes directorios contienen **solo re-exports** de `src/features/`. No editar directamente:

- `src/hooks/` -> re-exports de `src/features/*/hooks/`
- `src/services/` -> re-exports de `src/features/*/services/`
- `src/repositories/` -> re-exports de `src/features/*/repositories/`
- `src/types/` -> re-exports de `src/features/*/types/` (excepciones: `common.ts`, `contact-request.ts`)

## Tablas legacy/dormidas (NO tocar sin instruccion explicita)

- `materials`, `material_types`, `product_types`
- `system_lines`, `system_configurations`, `configuration_materials`
- `line_glass_compatibility`, `formula_variables`
- `labor_costs`, `historial_precios`, `quote_item_breakdown`

Estas tablas pertenecen al antiguo enfoque de cotizador tecnico y estan dormidas.
