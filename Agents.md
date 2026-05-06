# AGENTS.md - Ventora

Lee antes de editar.

Ultima consolidacion repo: 2026-05-05.

Si trabajas fuera de repo: revisar `docs/contexto-rapido-web.md`.

---

## Que es el proyecto hoy

No pensar como:
- cotizador tecnico
- motor de ingenieria de ventanas
- ERP
- logistica
- sistema de produccion

Pensar como:

**software comercial para empresas de vidrios y aluminio que captura, centraliza y ayuda a cerrar leads.**

La cotizacion sigue siendo importante, pero ahora cumple un rol claro:

**cerrar oportunidades, no definir la identidad principal del producto.**

Frase clave del producto:

**"Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."**

Resolver:
- captacion de leads
- enlaces por canal
- tracking de origen
- QR para captacion
- solicitudes centralizadas
- notificaciones al vendedor
- seguimiento comercial
- pipeline comercial
- cotizacion cuando el lead ya avanzo
- PDF, WhatsApp y aprobacion como herramientas de cierre

---

## Contexto del pivot

Antes:
- maestro independiente
- Ventora como generador de PDF con memoria
- valor tipo "vitamina"
- precio bajo
- insuficiente para dolor real

Ahora:
- target principal = PYMES y empresas medianas de vidrios y aluminio
- usuario comprador = dueno, responsable comercial o vendedor
- dolor real = leads perdidos en WhatsApp, formularios y conversaciones dispersas
- problema central = no saber de donde vienen los leads ni en que estado estan

Conclusion:
- el valor no esta en formulas complejas
- el valor esta en capturar mejor y cerrar mas
- la cotizacion existe para completar el cierre comercial
- el sistema debe priorizar velocidad operativa y visibilidad del pipeline

---

## Objetivo del software

**capturar solicitudes comerciales, centralizarlas, hacer seguimiento y convertirlas en cotizaciones cerradas.**

Posicionamiento correcto:
- software para captar y cerrar leads de vidrios y aluminio
- CRM comercial liviano para empresas del rubro
- sistema de solicitudes con origen trazable
- pipeline comercial con cotizacion integrada
- herramienta para ordenar WhatsApp, QR, links y seguimientos

Posicionamiento incorrecto:
- cotizador tecnico de perfiles o despiece
- ERP de obra
- software logistico
- planificador de produccion
- motor complejo de compatibilidades

Modelo comercial actual:
- captar lead
- saber origen
- responder rapido
- mover estado comercial
- crear cotizacion solo cuando corresponde
- cerrar por WhatsApp, PDF o link publico

---

## Usuario y modelo operativo

Usuario principal hoy:
- dueño de pyme
- responsable comercial
- vendedor
- equipo pequeno o mediano que hoy pierde leads por desorden

Contexto operativo:
- 1 cuenta = empresa
- rol operativo real hoy = `admin`
- `tecnico` y `viewer` quedan como legado o futuro
- pruebas funcionales: asumir `rol = 'admin'`
- login requiere `auth.users` + fila en `public.users` con `correo`, `organization_id`, `rol`
- desktop recomendado: `Chrome` o `Edge`
- iPhone correcto: `Safari` + agregar a inicio
- `Brave` no es navegador base para push

Stack:
- Next.js 16.1.6 App Router
- React 19.2.3
- TypeScript
- Supabase
- CSS Modules
- Jest

---

## Norte de producto

Preguntas obligatorias antes de proponer o implementar algo:

1. Esto ayuda a capturar mas leads o a perder menos leads?
2. Esto ayuda a cerrar mas oportunidades reales?
3. Esto resuelve un dolor comercial del duenio o vendedor?

Si la respuesta es no:
- no empujar la idea por inercia
- explicar por que se desvia del pivot
- proponer una alternativa alineada

Regla fuerte:

**no reintroducir el cotizador tecnico como centro del producto.**

---

## Estado actual real

Conclusion:

**ya existe una base funcional valida para captacion y cierre. La prioridad es endurecer, validar y vender.**

### Implementado hoy

- landing publica
- login con Supabase email/password
- shell operativa
- dashboard interno
- CRUD clientes
- listado y detalle de cotizaciones
- nueva cotizacion guiada
- PDF imprimible con branding
- compartir por WhatsApp
- aprobacion/rechazo publico por token
- perfil comercial de empresa
- multi-tenant por `organization_id`

Captacion y solicitudes:
- flujo publico `/solicitud/[empresa]`
- tracking `utm_source`, `utm_medium`, `utm_campaign`, `source_url`
- guardado automatico de UTM desde landing y links
- generador de links por canal
- canales listos para Instagram, Facebook, WhatsApp, QR y link directo
- componente `LeadChannels`
- generacion de QR en cliente
- descarga QR a PNG
- dashboard de solicitudes con badge de origen
- boton `Contactar por WhatsApp`
- tiempo relativo de llegada
- push al vendedor cuando entra lead nuevo
- email async desacoplado para leads nuevos

Operativo/comercial ya existente:
- dashboard con KPIs simples
- cotizacion como herramienta de cierre
- calculo simple por componente con costo proveedor + margen
- guardado borrador/presupuesto
- forma de pago visible en PDF
- link publico canonico `ventorap.cl` + `www.ventorap.cl`
- deploy productivo activo Vercel

### Incompleto o desalineado

- pipeline comercial tipo kanban aun no consolidado
- faltan metricas de conversion y tiempo de respuesta
- landing necesita validacion comercial final
- PWA existe, offline real aun no validado
- observabilidad operativa incompleta
- Web Push depende de navegador/OS
- email depende de configurar `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`
- quedan textos con encoding roto en algunas vistas/tests
- guardados sensibles aun deben endurecerse
- hay copy y documentacion vieja que puede seguir empujando la narrativa de cotizador

Lectura operativa:
- no estamos en discovery
- no hay que inventar producto paralelo
- etapa = salida comercial controlada con foco en leads y cierre
- prioridad corta = validar flujo real de captacion, notificacion, seguimiento y cierre

---

## Fases y foco actual

### Fase 1 - Ya implementada

- captacion publica por solicitud
- tracking UTM y origen
- links por canal
- QR descargable
- push + email al llegar lead
- dashboard de solicitudes mejorado
- multi-tenant base
- cotizacion, PDF, WhatsApp y aprobacion como capa de cierre

### Fase 2 - Siguiente foco real

- pipeline comercial con kanban
- estados de solicitud:
  - `nueva`
  - `contactada`
  - `cotizacion_creada`
  - `cerrada_ganada`
  - `perdida`
- metricas:
  - leads por origen
  - tasa de conversion
  - tiempo de respuesta

### Fase 3 en adelante - No centrar ahora

Dejar explicitamente como futuro:
- multi-sucursal
- asignacion a vendedores
- round-robin
- analytics por vendedor
- webhooks
- integraciones Zapier/Make
- WhatsApp Business API
- automatizaciones profundas
- CRM mas complejo

Regla:
- no gastar foco aqui salvo instruccion explicita
- si aparece una idea de Fase 3+, registrarla como futuro y volver al foco actual

---

## Flujo principal vigente

1. empresa configura o publica su enlace de solicitud
2. lead entra por QR, link o landing
3. el sistema guarda origen y UTM
4. Ventora centraliza la solicitud
5. vendedor recibe push y/o email
6. equipo responde por WhatsApp
7. lead avanza en seguimiento comercial
8. cuando corresponde, se crea cotizacion
9. se genera PDF o se comparte link publico
10. cliente aprueba, rechaza o sigue conversacion

Lectura correcta:
- solicitud primero
- seguimiento despues
- cotizacion como etapa de cierre

---

## Estado funcional por modulo

### Publico
- landing
- `/planes`
- login
- offline page
- base PWA
- `/solicitud/[empresa]`
- `/presupuesto/[token]`

### Captacion
- `src/features/solicitudes`
- links por canal
- QR
- tracking UTM
- formulario publico por empresa
- dashboard de solicitudes

### Comercial
- solicitudes
- contacto por WhatsApp
- notificaciones push
- email async para leads
- cotizaciones
- PDF
- aprobacion publica

### Configuracion empresa
- perfil comercial
- slug publico de solicitud
- branding basico

### Aun no presente o no consolidado
- pipeline kanban completo
- metricas comerciales completas
- multi-sucursal
- reparto automatico de leads
- analytics por vendedor
- integraciones externas profundas
- billing
- checkout
- observabilidad completa

---

## Arquitectura vigente

```text
app/                                 -> Presentacion
src/components/                      -> UI compartida
src/features/<feature>/hooks/        -> Aplicacion
src/features/<feature>/services/     -> Negocio
src/features/<feature>/repositories/ -> Datos
src/features/<feature>/types/        -> Tipos dominio
src/lib/supabase/                    -> Infra
src/utils/                           -> Helpers puros
src/constants/                       -> Constantes
```

Flujo obligatorio:

```text
page / component -> hook -> service -> repository -> Supabase
```

Reglas:
- excepciones actuales = deuda, no patron
- no copiar `src/hooks`, `src/services`, `src/repositories`, `src/types` legacy como diseno nuevo
- dominio nuevo va en `src/features/<feature>/...`

Features activas:
- `src/features/auth`
- `src/features/clientes`
- `src/features/cotizaciones`
- `src/features/notificaciones`
- `src/features/organization-profile`
- `src/features/solicitudes`

Lectura actual:
- `solicitudes` y captacion ya son parte central del producto
- `cotizaciones` sigue siendo core, pero como capa de cierre

---

## Estructura repo

```text
vidrios-saas/
|-- app/
|   |-- (landing-web)/
|   |-- (auth-public)/
|   |-- (pwa-app)/
|   |-- print/
|   |-- globals.css
|   |-- layout.tsx
|   `-- manifest.ts
|-- docs/
|   |-- contexto-rapido-web.md
|   |-- ia-handoff.md
|   |-- mvp-componentes-plan.md
|   |-- mvp-componentes-schema.sql
|   |-- organization-profile-schema.sql
|   `-- salida-beta-checklist.md
|-- public/
|   |-- icons/
|   `-- sw.js
|-- src/
|   |-- components/
|   |-- constants/
|   |-- features/
|   |-- hooks/
|   |-- lib/
|   |-- repositories/
|   |-- services/
|   |-- types/
|   `-- utils/
|-- supabase/
|   `-- migrations/
|-- Agents.md
|-- proxy.ts
|-- jest.config.js
|-- jest.setup.ts
`-- package.json
```

Notas:
- `README.md` es resumen operativo, no fuente final
- `Agents.md` y `docs/contexto-rapido-web.md` mandan mas que `README.md`
- usar `proxy.ts`, no asumir `middleware.ts`
- PWA base existe; no asumir offline robusto sin prueba real
- `app/layout.tsx` ya inyecta `@vercel/analytics` + `@vercel/speed-insights`, pero eso no reemplaza monitoreo real

---

## Global Rules

- todas las salidas en espanol
- nunca responder en ingles
- plugin que reescribe prompts debe preservar espanol
- si input llega en ingles, puedes traducir internamente; salida final siempre espanol

---

## Reglas siempre

1. Respetar capas

```text
pagina/componente -> hook -> service -> repository -> Supabase
```

- pagina no importa repository directo
- hook no consulta Supabase directo
- repository no lleva negocio

2. TypeScript estricto
- tipar todo
- `any` solo si inevitable y comentado

3. Multi-tenant obligatorio
- toda query filtra `organization_id`

4. Soft delete, no hard delete
- borrar = `eliminado_en: timestamp`
- queries activas filtran `.is("eliminado_en", null)`

5. Calculos financieros en services

6. MVP de cotizacion usa:
- `costoProveedorUnitario`
- `costoProveedorTotal`
- `margenPct`
- `precioUnitario`
- `precioTotal`

7. No reintroducir cotizador tecnico

8. Infra encapsulada
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- uso preferente desde repositories o auth services

9. Solicitudes + tracking + notificaciones = core actual

10. Cotizacion + PDF + WhatsApp = core de cierre

11. No abrir Fase 3+ antes de consolidar Fase 2

---

## Diseno

### Landing/Login
- fondo `#0A0A0A`
- superficie `#161616`
- acento `#C8A96E`
- texto `#F0ECE4`
- borde `#242424`

### App operativa

Direccion:
- profesional
- confiable
- clara
- corporativa
- sobria

Paleta:
- fondo `#F3F5F9`
- tarjetas `#FFFFFF`
- superficie suave `#F7F9FC`
- superficie fuerte `#EEF3F8`
- texto principal `#243B6B`
- texto secundario `#667085`
- bordes `#D9E0EA`
- acento principal `#4F7DD4`
- acento fuerte `#335EA9`
- exito `#2FA36B`
- advertencia `#D89B3C`
- error `#D95C5C`
- neutral `#98A2B3`

Tipografia:
- Syne titulos
- Lato cuerpo
- JetBrains Mono codigos/montos

Principios UI:
- botones min 48px alto
- labels visibles
- espaciado amplio
- alto contraste
- nunca depender solo color
- mobile-first para solicitudes, seguimiento y acciones rapidas

---

## Dominio

| Concepto | Descripcion |
|---|---|
| `organization` | Empresa cliente SaaS |
| `user` | Empleado organizacion |
| `lead` / `solicitud` | Oportunidad comercial capturada |
| `source` | Origen del lead |
| `utm` | Metadata de captacion |
| `client` | Cliente final ya trabajado comercialmente |
| `project` | Obra o trabajo asociado |
| `cotizacion` | Presupuesto comercial para cierre |
| `componente` | Item cotizado |
| `organization_profile` | Branding PDF y presentacion |

Ejemplos de origen:
- Instagram bio
- Facebook perfil
- WhatsApp mensaje
- QR en camioneta
- QR en tarjeta
- link directo

---

## Base de datos: estrategia

## Database Context

La fuente de verdad del modelo de datos está en:

- supabase/docs/current_schema.sql
- supabase/docs/database_map.md
- supabase/docs/rls_policies.md
- supabase/docs/seed_order.md
- supabase/docs/agent_database_notes.md

Antes de modificar queries, services, hooks, types, Supabase functions, migrations, seeds o RLS, leer esos archivos.

Reglas:
- No asumir tablas ni columnas.
- No inventar relaciones.
- Usar `organization_id` como estándar multi-tenant.
- Revisar RLS antes de tocar datos sensibles.
- Si se detecta diferencia entre el código y `current_schema.sql`, reportarla antes de modificar.
- No modificar migraciones antiguas ya aplicadas; crear una nueva migración.
No borrar legacy aun.

Usar y consolidar:
- capa de `solicitudes`
- tracking `utm_source`, `utm_medium`, `utm_campaign`, `source_url`
- `cotizaciones`
- `cotizacion_items`
- `projects`
- `organization_profile`

Regla:
- no borrar tablas legacy tecnicas por inercia
- no volver a meter logica nueva del producto en flujo tecnico dormido
- la base comercial manda sobre la tecnica

Campos criticos hoy:
- `organization_id`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `source_url`
- `approval_token`
- `approval_token_expires_at`
- `cliente_vio_en`
- `cliente_respondio_en`
- `cliente_respuesta_canal`

Infra que no puedes asumir lista:
- bucket `organization-assets`
- RLS por `organization_id`
- `SUPABASE_SERVICE_ROLE_KEY`
- variables email
- migraciones aplicadas en entorno real

---

## Variables entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
```

Notas:
- logo requiere bucket `organization-assets`
- perfil comercial requiere tabla `organization_profile`
- aprobacion publica requiere `SUPABASE_SERVICE_ROLE_KEY`
- email de leads requiere variables de proveedor configuradas

---

## Testing

Objetivo:
- Jest
- React Testing Library

Cobertura visible:
- auth service
- clientes service
- cotizaciones workflow/app/public approval
- organization profile service
- solicitudes service y canales
- hooks auth/clientes/cotizaciones/organization profile/solicitudes
- registro service worker
- PDF helpers
- WhatsApp helpers

Reglas:
- cambio en `src/services/` o `src/utils/` = test nuevo o actualizado
- nunca Supabase real en tests
- tests en espanol

Minimo por funcion publica:
- caso feliz
- error/validacion
- caso borde

---

## Riesgos criticos actuales

1. falta validar flujo real de captacion punta a punta
2. notificaciones push/email pueden fallar por configuracion externa
3. observabilidad produccion insuficiente
4. falta smoke test manual real con solicitudes + cotizacion + cierre
5. PWA valida solo como base tecnica; falta dispositivo real
6. landing y CTA aun deben validarse con criterio comercial
7. pipeline comercial aun no consolidado
8. copy vieja puede seguir empujando el producto como cotizador
9. encoding roto puede reaparecer en vistas o tests
10. push + solicitud + WhatsApp + PDF deben verificarse juntos

---

## Falta verificar antes beta comercial

### Infra real
- migraciones aplicadas
- bucket `organization-assets`
- RLS por `organization_id`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`
- `public.users` con `correo`, `organization_id`, `rol`
- usuarios reales `admin`

### Flujo de captacion
- link publico por empresa
- UTM guardadas
- QR funcionando
- badge de origen visible
- push al llegar lead
- email async al llegar lead
- boton `Contactar por WhatsApp`

### Flujo de cierre
- cliente real
- cotizacion punta a punta
- guardado borrador y presupuesto
- PDF
- WhatsApp
- aprobacion/rechazo por token

### PWA y acceso
- iPhone Safari + instalar
- Chrome / Edge desktop
- offline real
- comportamiento SW real

### Comercial
- landing
- CTA
- copy no tecnico
- planes
- promesa comercial alineada a leads y cierre

### Tecnico
- consistencia escrituras
- manejo errores intermedios
- logs/trazas minimas
- performance vistas clave
- cobertura borde

---

## Prioridades recomendadas

1. Validar entorno real
   - `organization_profile`
   - `approval_token`
   - bucket `organization-assets`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - variables email
   - RLS / multi-tenant con usuario real

2. Endurecer captacion
   - validar UTM reales
   - validar links por canal
   - validar QR descargable
   - validar push y email
   - validar dashboard de solicitudes
   - validar contacto por WhatsApp

3. Consolidar pipeline comercial
   - estados claros
   - vista operativa
   - criterio de avance
   - metricas de conversion basicas
   - tiempo de respuesta

4. Estabilizar cierre
   - cotizacion
   - PDF
   - WhatsApp
   - aprobacion publica
   - manejo de errores

5. Revisar experiencia comercial final
   - landing
   - login
   - `/planes`
   - copy de captacion
   - promesa comercial
   - limpiar encoding roto visible

6. Dejar Fase 3+ explicitamente fuera
   - multi-sucursal
   - automatizacion compleja
   - integraciones profundas
   - analytics por vendedor

---

## Resumen ejecutivo para futuras IAs

Si entras hoy:
- el producto ya no debe describirse como cotizador
- la promesa principal es capturar y centralizar leads
- la cotizacion sigue viva, pero como herramienta de cierre
- prioridad no es inventar mas producto
- prioridad = validar captacion, seguimiento y cierre
- Fase 2 importa; Fase 3+ se posterga
- no meter ERP, logistica ni motor tecnico
- cualquier tarea debe evaluarse por su impacto en leads y conversion

