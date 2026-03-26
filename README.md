# Ventora / Vidrios SaaS

Este documento resume el contexto real del proyecto para compartirlo con otras IAs, colaboradores o nuevos desarrolladores.

Importante:

- Este `README.md` es un resumen operativo.
- La fuente interna mas completa del contexto del repo sigue siendo [`AGENTS.md`](/C:/Users/aless/vidrios-saas/AGENTS.md).
- Si otra IA va a tocar codigo, idealmente debe leer ambos.

## Resumen corto

Este proyecto es un SaaS vertical para **crear y enviar cotizaciones profesionales de vidrios y aluminio**.

No esta enfocado en ingenieria tecnica de ventanas ni en despiece complejo. El foco actual del MVP es resolver el flujo comercial real del usuario:

1. recibir costo del proveedor
2. aplicar margen
3. armar presupuesto por componente
4. generar PDF con branding
5. enviarlo rapido por WhatsApp
6. permitir revision/aprobacion del cliente

## Que problema resuelve

El usuario objetivo hoy no necesita un motor tecnico complejo. Lo que realmente necesita es cotizar rapido y bien presentado.

Flujo actual del usuario:

1. cotiza con su proveedor
2. recibe un costo por pieza, componente o solucion
3. aplica un margen
4. arma el presupuesto
5. lo envia al cliente

Este producto existe para acelerar y profesionalizar ese flujo.

## Usuario principal

Pensado principalmente para:

- maestro independiente
- pequeno taller
- instalador
- vendedor tecnico que hoy cotiza manualmente en Excel, Word o WhatsApp

## Que es y que no es

### Si es

- un presupuestario comercial vertical para vidrios y aluminio
- una herramienta para crear cotizaciones con PDF y WhatsApp
- un CRM operativo liviano para seguimiento comercial de clientes y obras

### No es

- un ERP
- un sistema logistico completo
- un software de planificacion de produccion
- un cotizador tecnico de perfiles, compatibilidades o despiece

## Modelo MVP actual

La logica comercial central del MVP es simple:

```text
precio_final = costo_proveedor * (1 + margen_pct / 100)
```

Ejemplo:

```text
costo_proveedor = 300000
margen_pct = 100
precio_final = 600000
```

## Concepto principal: componentes

Las cotizaciones no se modelan como productos genericos. Se modelan como **componentes del proyecto**.

Ejemplos:

- `V1` -> ventana living
- `V2` -> ventana cocina
- `P1` -> puerta terraza
- `C1` -> cierre logia

Cada componente puede incluir:

- codigo
- tipo de componente
- material
- vidrio
- ancho
- alto
- descripcion
- costo proveedor unitario
- costo proveedor total
- margen
- precio final unitario
- precio final total

## Funciones que el sistema ya tiene

Base funcional actual del repo:

- landing publica
- login con Supabase email/password
- dashboard con KPIs basicos
- CRUD de clientes
- listado y detalle de cotizaciones
- flujo guiado para nueva cotizacion
- componentes por cotizacion
- calculo de subtotal, neto, IVA y total
- guardado de borrador y presupuesto
- soft delete de cotizaciones e items
- PDF imprimible con branding
- compartir por WhatsApp
- pagina publica de revision/aprobacion por token
- perfil comercial de empresa
- subida de logo a Supabase Storage
- forma de pago visible en PDF
- base multi-tenant por `organization_id`
- PWA base y offline page
- tests en services, hooks y utils

## Flujo principal del producto

1. Login
2. Dashboard
3. Clientes
4. Nueva cotizacion
5. Agregar componentes
6. Calcular montos
7. Guardar
8. Ver detalle
9. Generar PDF
10. Compartir por WhatsApp
11. Cliente revisa desde link publico
12. Cliente aprueba o rechaza
13. Empresa configura branding y perfil comercial

## Estado actual del proyecto

Este repo ya no esta en fase de discovery. Ya existe una base funcional real.

La etapa actual es de:

- endurecimiento para beta o preproduccion
- validacion de flujo real punta a punta
- validacion de Supabase real
- mejora de robustez, manejo de errores y salida comercial

Prioridad actual:

- estabilizar flujo de cotizacion
- validar PDF, WhatsApp y aprobacion publica
- verificar entorno real de Supabase
- corregir edge cases
- preparar despliegue inicial

No es prioridad inmediata:

- billing
- analytics
- nuevas integraciones no esenciales
- reabrir el cotizador tecnico

## Riesgos o gaps actuales

Los puntos mas sensibles hoy son:

- las escrituras de cotizaciones aun no son transaccionales
- falta observabilidad minima de produccion
- falta smoke test manual real de punta a punta
- la PWA existe, pero el offline real aun debe validarse en dispositivo
- la landing necesita validacion comercial final de copy y CTA
- hay algunos textos heredados con problemas de encoding

## Stack

- Next.js 16.1.6 App Router
- React 19.2.3
- TypeScript
- Supabase
- CSS Modules
- Jest + React Testing Library

## Arquitectura

Arquitectura vigente: monolito modular en capas.

Flujo obligatorio:

```text
page / component -> hook -> service -> repository -> Supabase
```

Capas reales:

```text
app/                -> presentacion
src/components/     -> UI reutilizable
src/hooks/          -> coordinacion y estado de aplicacion
src/services/       -> reglas de negocio y calculos
src/repositories/   -> acceso a datos
src/lib/supabase/   -> wrappers tecnicos de infraestructura
```

Reglas importantes:

- una pagina no debe importar repositories directo
- un hook no debe consultar Supabase directo
- un repository no debe tener logica de negocio
- los calculos financieros van en `src/services/`

## Estructura resumida del repo

```text
app/
  (landing-web)/
  (auth-public)/
  (pwa-app)/
  print/
src/
  components/
  hooks/
  services/
  repositories/
  lib/supabase/
  utils/
supabase/
  migrations/
docs/
AGENTS.md
README.md
```

Notas:

- `proxy.ts` es parte del proyecto actual
- existe base PWA con `manifest.ts` y `public/sw.js`
- `README.md` no reemplaza la lectura de `AGENTS.md`

## Reglas de negocio y datos que no se deben romper

### Multi-tenant obligatorio

Toda query de negocio debe filtrar por `organization_id`.

### Soft delete obligatorio

No hacer hard delete. Se debe usar `eliminado_en`.

### Calculo simple del MVP

No reintroducir logica tecnica compleja de perfiles, compatibilidades o formulas salvo instruccion explicita.

### PDF y WhatsApp son core

Si se toca cotizaciones, hay que cuidar:

- montos correctos
- branding correcto
- PDF claro
- mensaje de WhatsApp util
- flujo publico de aprobacion

### Rol operativo vigente

Para el MVP, el rol operativo real es `admin`.

Ademas del usuario en `auth.users`, el login depende de una fila en `public.users` con:

- `correo`
- `organization_id`
- `rol`

## Modelo de dominio

Conceptos principales:

- `organization`: empresa cliente del SaaS
- `user`: usuario interno de la organizacion
- `client`: cliente final de la organizacion
- `project`: obra o trabajo asociado
- `cotizacion`: presupuesto comercial
- `componente`: item principal cotizado
- `organization_profile`: identidad comercial usada para branding

## Base de datos y estrategia actual

Se reutiliza principalmente:

- `cotizaciones`
- `cotizacion_items`
- `projects`
- `organization_profile`

Hay tablas legacy tecnicas que deben quedar dormidas por ahora:

- `product_types`
- `system_lines`
- `system_configurations`
- `configuration_materials`
- `line_glass_compatibility`
- `materials`
- `labor_costs`
- `quote_item_breakdown`

Regla: no borrarlas todavia, pero tampoco seguir metiendo logica nueva ahi.

## Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Tambien se espera:

- bucket `organization-assets`
- tabla `organization_profile`
- soporte para approval token publico

Migraciones clave mencionadas en el proyecto:

- `supabase/migrations/20260317154500_organization_profile.sql`
- `supabase/migrations/20260318093000_cotizacion_items_component_fields.sql`
- `supabase/migrations/20260319183000_cotizaciones_approval_public_link.sql`

## Testing

Stack de testing:

- Jest
- React Testing Library

Cobertura visible en el repo:

- services de auth
- services de clientes
- services de cotizaciones
- aprobacion publica
- organization profile
- hooks relevantes
- helpers PDF
- helpers WhatsApp
- service worker

Reglas:

- si se toca `src/services/` o `src/utils/`, agregar o actualizar tests
- no llamar a Supabase real en tests
- tests en espanol
- minimo esperado: caso feliz, caso de error/validacion y caso borde

## Como correr el proyecto

```bash
npm install
npm run dev
```

Scripts utiles:

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Guia rapida para otras IAs

Si otra IA va a ayudar en este repo, deberia asumir esto desde el principio:

1. El producto principal es el flujo comercial de cotizaciones.
2. El valor actual esta en clientes, cotizaciones, PDF, branding, WhatsApp y aprobacion publica.
3. No hay que expandir el cotizador tecnico salvo instruccion explicita.
4. Antes de proponer features nuevas, revisar robustez, errores reales, Supabase real y despliegue.
5. Si tocas cotizaciones, revisa el impacto en services, PDF, WhatsApp y flujo publico.
6. No describas este sistema como ERP ni como logistica.

## En una frase

Ventora hoy es **un presupuestario comercial vertical para vidrios y aluminio**, orientado a crear, presentar y enviar cotizaciones profesionales rapido, con seguimiento liviano del cliente y de la obra.
