# AGENTS.md - Vidrios SaaS

Lee antes de editar.

Ultima consolidacion repo: 2026-04-30.

Si trabajas fuera de repo: revisar `docs/contexto-rapido-web.md`.

---

## Que es proyecto ahora

No pensar como:
- formulario tecnico
- motor ingenieria ventanas
- ERP
- logistica

Pensar como:

**presupuestario comercial vertical para vidrios y aluminio, basado en sistemas sugeridos, autocompletado y edicion rapida en terreno.**

Resolver:
- clientes
- cotizaciones
- proyectos implicitos dentro de cotizacion
- sistemas sugeridos por tipo/proveedor
- autocompletar material, vidrio, margen, linea, descripcion
- editar solo necesario en movil
- margen sobre costo proveedor
- PDF con branding
- WhatsApp
- aprobacion publica

Usuario principal:
- maestro independiente
- taller pequeno
- instalador / vendedor tecnico

Modelo usuario MVP:
- 1 cuenta = dueno o responsable comercial
- rol operativo real hoy: `admin`
- `tecnico` / `viewer` = legado o futuro, no alcance activo
- pruebas funcionales: asumir `rol = 'admin'`
- login requiere `auth.users` + fila en `public.users` con `correo`, `organization_id`, `rol`
- desktop recomendado: `Chrome` o `Edge`
- iPhone correcto: `Safari` + agregar a inicio
- `Brave` no navegador base para push

Stack:
- Next.js 16.1.6 App Router
- React 19.2.3
- TypeScript
- Supabase
- CSS Modules
- Jest

---

## Cambio de enfoque

Antes:
- perfiles
- vidrio tecnico
- compatibilidades
- formulas
- catalogos tecnicos

Ahora:

**usuario no construye desde cero; sistema sugiere base y usuario corrige final.**

Problema real:
1. cotiza con proveedor
2. recibe costo/config casi lista
3. aplica margen
4. arma presupuesto en Excel/Word/WhatsApp
5. envia cliente

Conclusion:
- problema principal no es ingenieria
- problema principal es velocidad util
- MVP optimiza sugerencia + confirmacion
- precision perfecta vale menos que rapidez en terreno

---

## Objetivo software

**crear presupuestos comerciales desde sistemas preconfigurados, con calculo simple, PDF claro, branding y salida por WhatsApp.**

Posicionamiento correcto:
- software para crear y enviar cotizaciones de vidrios y aluminio
- presupuestario comercial con PDF, WhatsApp y aprobacion cliente
- CRM operativo liviano para talleres y maestros
- cotizador con sistemas sugeridos

Posicionamiento incorrecto:
- ERP obra
- sistema logistico completo
- planificacion produccion
- cotizador tecnico de perfiles/despiece

Hoy producto:
- ayuda seguimiento comercial
- da visibilidad basica cliente/obra
- no resuelve inventario, despacho, taller, produccion

Modelo calculo MVP:

```text
precio_final = costo_proveedor * (1 + margen_pct / 100)
```

No hacer en MVP:
- calculo perfiles
- calculo tecnico vidrio
- ingenieria ventanas
- integracion proveedor
- compatibilidades complejas

---

## Concepto clave: Sistemas

Cotizacion no nace de formulario vacio.

Nace de **sistema sugerido y editable**.

Ejemplos:
- ventana corredera aluminio basica
- ventana corredera aluminio premium
- puerta abatible aluminio
- shower door estandar
- cierre terraza piso-cielo

Sistema puede incluir:
- tipo componente
- proveedor
- linea
- nivel
- apertura
- vidrio compatible
- restricciones dimension
- configuracion base
- margen sugerido
- descripcion base

Lectura:
- `sistema` = base sugerida
- `componente` = item editable/calculable

---

## Flujo vigente

1. login
2. dashboard
3. clientes
4. nueva cotizacion guiada
5. elegir tipo
6. recibir sistema sugerido
7. ajustar minimo
8. crear uno o varios componentes
9. editar rapido lista
10. calcular subtotal/neto/IVA/total
11. guardar borrador o presupuesto
12. ver detalle
13. generar PDF
14. compartir WhatsApp
15. cliente revisa y responde por link publico
16. configurar perfil empresa

Notas:
- proyecto se crea/reutiliza desde service cotizaciones
- no hay UI separada de proyectos
- paso 2 = asistente de configuracion, no formulario manual

---

## Estado actual real

Conclusion:

**base funcional importante ya existe. Prioridad = endurecer, validar, vender.**

### Implementado

- landing + login
- branding publico `Ventora`
- auth Supabase email/password
- shell operativa
- dashboard con KPIs simples
- CRUD clientes
- listado + detalle cotizaciones
- nueva cotizacion por pasos
- calculo por componente con costo proveedor + margen
- guardado borrador/presupuesto
- soft delete cotizaciones + items
- PDF imprimible con branding
- compartir WhatsApp
- pagina `/planes`
- aprobacion/rechazo publico por token
- link publico canonico `ventorap.cl` + `www.ventorap.cl`
- push para maestro al enviar/aprobar/rechazar, segun navegador
- landing con bloque instalacion/acceso para maestros
- estados comerciales automaticos clientes
- estados operativos cotizacion hasta proyecto terminado
- perfil comercial empresa
- logo a Supabase Storage
- forma de pago visible en PDF
- multi-tenant por `organization_id`

Paso 2 movil:
- viewport lista estable
- scroll interno controlado
- editor rapido movil
- copia parcial medidas/costo a componentes del mismo tipo
- limite 200 componentes por cotizacion
- copy mas simple
- codigos autogenerados visibles
- selector margen local con recalculo
- tarjetas mas compactas y legibles
- `con margen` convive con empresa en `valor directo`
- si cotizacion trabaja con margen, lista prioriza costo y deja venta secundaria
- overlay de ajuste por piezas para lotes
- si una pieza cambia, resto del lote puede seguir agrupado
- piezas separadas muestran `Ajustada` y referencia origen
- `Edicion completa` de pieza derivada mantiene regreso a overlay de familia
- `Datos del grupo` en mobile:
  - footer fijo/compacto
  - sin gran bloque vacio final
  - toggle `con margen` / `valor directo` estabilizado
- en `Valor directo`, bloque `Margen` se oculta
- `Color perfil` unificado como etiqueta
- aluminio:
  - `Titanio`
  - `Madera`
  - `Bronce` fuera de flujo activo
- PVC con paleta separada:
  - directos: `Blanco`, `Gris`, `Roble Dorado`, `Nogal`
  - `Mas opciones`: `Gris Antracita`, `Negro`, `Verde (Electrico)`, `Azul (Alta presion)`, `Naranja (Ventilacion)`
- tests services/utils/hooks
- build produccion pasa
- deploy productivo activo Vercel

### Incompleto o desalineado

- no UI separada proyectos
- landing necesita validacion comercial final
- OAuth tiene callback/UI placeholder, proveedores no habilitados
- PWA existe; offline real aun no validado en dispositivo
- guardado cotizaciones no transaccional
- Web Push depende de navegador/OS
- guia comercial instalacion/navegador aun debe pulirse
- no pagos ni billing
- observabilidad operativa incompleta
- no onboarding comercial completo
- quedan textos con encoding roto en algunas vistas/tests
- paso 2 sigue siendo punto mas sensible:
  - no agregar funciones por inercia
  - quitar friccion
  - validar con maestro real antes de consolidar
- flujo `con margen` vs `valor directo` mejoro, pero falta mas validacion real
- lotes ajustados mejoraron, pero falta probar:
  - 1 pieza distinta
  - varias piezas distintas
  - vuelta desde `Edicion completa`
- creacion masiva y edicion rapida aun se pueden simplificar
- paso 2 no debe volver a llenarse de texto

Lectura operativa:
- no discovery
- no falta inventar producto
- etapa = endurecimiento final para beta / produccion inicial controlada
- prioridad 24-48h = flujo real, Supabase real, errores reales, paso 2 movil real
- visual importa, pero menos que validacion/robustez/despliegue

Lectura repo:
- corazon = flujo comercial cotizaciones
- no reabrir cotizador tecnico por inercia
- valor actual = clientes + cotizaciones + PDF + branding + WhatsApp + respuesta publica
- siguiente salto = consolidar sistemas sugeridos, estabilizar, vender

---

## Estado funcional por modulo

### Publico
- landing
- `/planes`
- login
- offline page
- base PWA
- `/presupuesto/[token]`

### Operativo
- dashboard
- clientes
- cotizaciones
- nueva cotizacion con sistemas sugeridos
- configuracion empresa
- paso 2 con edicion rapida, ajuste por piezas, copia parcial, recalculo runtime

### Comercial
- branding PDF
- forma de pago comercial
- WhatsApp
- aprobacion publica
- seguimiento comercial liviano
- cotizacion con sistemas sugeridos editables

### Operacion liviana
- estado cliente segun actividad comercial
- proyecto implícito desde cotizacion
- cierre operativo simple por estado

### Aun no presente
- OAuth real
- checkout
- suscripciones
- analitica propia producto
- observabilidad completa produccion
- CRM profundo
- gestion explicita proyectos
- logistica / despacho / planificacion taller
- catalogo versionado completo por proveedor/familia/nivel

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
- no copiar `src/hooks`, `src/services`, `src/repositories`, `src/types` legacy como diseño nuevo
- dominio nuevo va en `src/features/<feature>/...`

Features activas:
- `src/features/auth`
- `src/features/clientes`
- `src/features/cotizaciones`
- `src/features/notificaciones`
- `src/features/organization-profile`
- `src/features/solicitudes`

Subdominios cotizaciones:
- `new-quote`
- `public-approval`
- `pdf-cache`
- workflow sugerencias + calculo comercial

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
|   `-- organization-profile-schema.sql
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
- `README.md` no fuente de verdad
- usar `proxy.ts`, no asumir `middleware.ts`
- PWA base existe: `manifest.ts`, `public/sw.js`, registro SW
- offline cache conservador; no asumir offline robusto en app autenticada
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

6. MVP usa:
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

9. PDF + WhatsApp = core MVP

10. No abrir pagos/analitica antes de estabilizar core

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

---

## Dominio

| Concepto | Descripcion |
|---|---|
| `organization` | Empresa cliente SaaS |
| `user` | Empleado organizacion |
| `client` | Cliente final |
| `project` | Obra/trabajo |
| `cotizacion` | Presupuesto comercial |
| `componente` | Item cotizado |
| `costo_proveedor` | Costo proveedor |
| `margen` | % maestro |
| `precio_final` | Valor vendido |
| `organization_profile` | Branding PDF |

Ejemplos componente:
- ventana living
- ventana cocina
- puerta corredera
- shower door
- cierre terraza

---

## Base de datos: estrategia

No borrar legacy aun.

Usar:
- `cotizaciones`
- `cotizacion_items` como componentes
- `projects`
- `codigo`, `tipo_componente`, `orden`
- `organization_profile`

Dormidas:
- `product_types`
- `system_lines`
- `system_configurations`
- `configuration_materials`
- `line_glass_compatibility`
- `materials`
- `labor_costs`
- `quote_item_breakdown`

Regla:
- no borrarlas
- no depender de ellas en flujo principal
- no meter logica nueva ahi

Campos criticos:
- `codigo`
- `tipo_componente`
- `orden`
- `approval_token`
- `approval_token_expires_at`
- `cliente_vio_en`
- `cliente_respondio_en`
- `cliente_respuesta_canal`

Infra que no puedes asumir lista:
- bucket `organization-assets`
- RLS por `organization_id`
- `SUPABASE_SERVICE_ROLE_KEY`
- migraciones aplicadas en entorno real

---

## Variables entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Revisar:
- `supabase/migrations/20260317154500_organization_profile.sql`
- `supabase/migrations/20260318093000_cotizacion_items_component_fields.sql`
- `supabase/migrations/20260319183000_cotizaciones_approval_public_link.sql`
- `supabase/migrations/20260327174500_normalize_legacy_color.sql`

Notas:
- logo requiere bucket `organization-assets`
- perfil comercial requiere tabla `organization_profile`
- aprobacion publica requiere `SUPABASE_SERVICE_ROLE_KEY`

---

## Testing

Objetivo:
- Jest
- React Testing Library

Cobertura visible:
- auth service
- auth server service
- clientes service
- cotizaciones workflow/app/public approval
- organization profile service
- hooks auth/clientes/cotizaciones/organization profile
- registro service worker
- PDF helpers
- WhatsApp helpers
- presentacion items y paginacion PDF

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

1. escrituras cotizaciones no transaccionales
2. observabilidad produccion insuficiente
3. falta smoke test manual punta a punta real
4. falta validar Supabase real, migraciones, bucket, `SUPABASE_SERVICE_ROLE_KEY`
5. PWA valida solo como base tecnica; falta dispositivo real
6. landing + CTA publicos aun deben validarse con criterio salida
7. paso 2 movil sigue siendo principal riesgo UX/operativo
8. lotes ajustados en paso 2 aun necesitan prueba real con distintos escenarios
9. encoding roto puede reaparecer en vistas clave o tests
10. push + aprobacion publica + PDF deben verificarse juntos

---

## Falta verificar antes beta

### Infra real
- migraciones aplicadas
- bucket `organization-assets`
- RLS por `organization_id`
- `SUPABASE_SERVICE_ROLE_KEY`
- `public.users` con `correo`, `organization_id`, `rol`
- usuarios reales `admin`

### Flujo comercial
- cotizacion punta a punta
- paso 2 movil real
- `con margen` y `valor directo`
- ajuste por piezas dentro de lotes
- guardado borrador y presupuesto
- PDF
- WhatsApp
- aprobacion/rechazo por token
- push en navegadores soportados

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
- forma de pago en PDF/detalle
- onboarding comercial basico

### Tecnico
- consistencia escrituras
- manejo errores intermedios
- logs/trazas minimas
- performance paso 2
- cobertura borde

---

## Prioridades recomendadas

1. Validar entorno real
   - `codigo`
   - `tipo_componente`
   - `orden`
   - `organization_profile`
   - `approval_token`
   - `approval_token_expires_at`
   - `cliente_vio_en`
   - `cliente_respondio_en`
   - `cliente_respuesta_canal`
   - bucket `organization-assets`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - RLS / multi-tenant con usuario real

2. Endurecer paso 2 movil
   - menos confusion labels
   - tarjetas minimas y claras
   - validar replicacion parcial por tipo
   - validar `con margen` vs `valor directo`
   - validar ajuste por piezas:
     - una pieza distinta
     - varias piezas distintas
     - regreso desde `Edicion completa`
   - confirmar lectura costo/venta/total
   - pulir lotes, espacios, nombres
   - confirmar paletas separadas PVC / aluminio en mobile, lista, PDF
   - probar con maestros reales antes de congelar

3. Consolidar motor sugerencias / sistemas
   - reglas base proveedor
   - reglas por tipo componente
   - sugerencias por dimension
   - defaults editables
   - fallback claro

4. Estabilizar salida
   - smoke tests reales
   - validacion movil
   - manejo errores
   - estados vacios / edge cases
   - PWA / offline real
   - consistencia create/update cotizaciones
   - push en Chrome y Edge, no solo Brave

5. Revisar experiencia comercial final
   - detalle cotizacion
   - PDF
   - mensaje WhatsApp
   - `/presupuesto/[token]`
   - forma de pago
   - CTA / copy landing, login, `/planes`
   - limpiar encoding roto visible
   - mejorar guia instalacion/acceso

6. Definir despliegue inicial
   - hosting
   - env vars
   - dominio
   - politicas acceso

7. Despues
   - pago
   - analitica producto
   - onboarding comercial

---

## Resumen ejecutivo para futuras IAs

Si entras hoy:
- MVP comercial ya tiene base real
- prioridad no es inventar mas producto
- prioridad = cerrar salida mercado
- flujo principal debe sentirse asistente de configuracion, no formulario
- no meter pagos ni analitica antes de estabilizar
- no reabrir cotizador tecnico salvo instruccion explicita
- si tocas cotizaciones, cuida sugerencias, servicio, PDF, WhatsApp, aprobacion publica juntos
- no vender como ERP o logistica
- piensa primero en usuario no tecnico y navegadores compatibles reales
- cuello de botella UX principal sigue siendo paso 2 movil
