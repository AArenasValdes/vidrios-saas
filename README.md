# Ventora / Vidrios SaaS

Este documento resume el contexto operativo actual del proyecto.

Importante:

- Este `README.md` es un resumen.
- La fuente interna mas completa del repo sigue siendo [`AGENTS.md`](/C:/Users/aless/vidrios-saas/Agents.md).
- Si otra IA va a tocar codigo, deberia leer ambos.

## Resumen corto

Ventora es un SaaS vertical para **captar, centralizar y ayudar a cerrar trabajos comerciales** de empresas de vidrios, aluminio y PVC.

La cotizacion sigue siendo importante, pero ya no define por si sola la identidad principal del producto. Hoy es una herramienta de cierre y el desktop evoluciona como escritorio de cotizacion/taller.

Frase clave:

**"Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."**

## Que problema resuelve

El dolor principal ya no es "hacer calculos tecnicos".

El dolor principal es:

- leads perdidos en WhatsApp
- solicitudes sin seguimiento
- cero claridad de origen
- poca velocidad de respuesta
- baja conversion comercial por desorden

Flujo correcto del producto:

1. captar el lead
2. saber de donde vino
3. avisar al vendedor
4. ordenar el seguimiento
5. crear cotizacion cuando corresponde
6. cerrar con PDF, WhatsApp o link publico

## Usuario principal

Pensado principalmente para:

- dueno de pyme
- responsable comercial
- vendedor
- empresa de vidrios y aluminio que recibe solicitudes por varios canales

## Que es y que no es

### Si es

- un sistema de captacion de leads para vidrios y aluminio
- una herramienta comercial para ordenar solicitudes, obras y cotizaciones
- una herramienta de cierre con cotizacion, PDF y WhatsApp
- un escritorio desktop para preparar mejor la cotizacion y controlar precio/margen

### No es

- un ERP
- un CRM enterprise
- un sistema logistico
- un software de produccion
- un cotizador tecnico de perfiles, compatibilidades o despiece

## Que ya esta implementado

Base funcional actual del repo:

- landing publica
- login con Supabase email/password
- solicitudes publicas por empresa
- tracking `utm_source`, `utm_medium`, `utm_campaign`, `source_url`
- generador de links por canal
- QR descargable
- dashboard de solicitudes con badge de origen
- boton de contacto por WhatsApp
- push para lead nuevo
- email async para lead nuevo
- clientes
- cotizaciones
- PDF imprimible con branding
- aprobacion publica por token
- perfil comercial de empresa
- base multi-tenant por `organization_id`
- PWA base y offline page
- tests en services, hooks y utils

## Flujo principal del producto

1. Empresa publica link o QR.
2. Lead entra desde un canal trazable.
3. Ventora guarda origen y centraliza la solicitud.
4. La empresa recibe aviso y responde.
5. El trabajo avanza en seguimiento.
6. Se crea cotizacion cuando corresponde.
7. Se cierra con PDF, WhatsApp o link publico.

## Estado actual del proyecto

Este repo ya no esta en fase de discovery.

La etapa actual es de:

- estabilizacion de cotizacion desktop
- dashboard comercial con datos reales
- preparacion del Quote Studio desktop
- endurecimiento de captacion y seguimiento
- validacion real de UTM, QR, push y email
- validacion de cotizacion, PDF y aprobacion publica como cierre
- mejora de robustez y salida comercial

No es prioridad inmediata:

- multi-sucursal
- round-robin
- analytics por vendedor
- integraciones profundas
- reabrir el cotizador tecnico
- oportunidades y cobros como modulo nuevo

## Riesgos o gaps actuales

Los puntos mas sensibles hoy son:

- desktop comercial aun no consolidado
- falta observabilidad minima de produccion
- falta smoke test manual real de punta a punta
- push y email aun requieren validacion real en entorno final
- la landing necesita validacion comercial final de copy y CTA
- la PWA existe, pero el offline real aun debe validarse en dispositivo
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
app/                                 -> presentacion
src/components/                      -> UI reutilizable
src/features/<feature>/hooks/        -> coordinacion y estado
src/features/<feature>/services/     -> reglas de negocio
src/features/<feature>/repositories/ -> acceso a datos
src/lib/supabase/                    -> infraestructura
```

Reglas importantes:

- una pagina no debe importar repositories directo
- un hook no debe consultar Supabase directo
- un repository no debe tener logica de negocio
- toda query debe respetar `organization_id`

## Features principales

- `src/features/solicitudes`
- `src/features/notificaciones`
- `src/features/clientes`
- `src/features/cotizaciones`
- `src/features/organization-profile`
- `src/features/auth`

## Reglas de negocio y datos que no se deben romper

### Multi-tenant obligatorio

Toda query de negocio debe filtrar por `organization_id`.

### Soft delete obligatorio

No hacer hard delete. Se debe usar `eliminado_en`.

### Tracking de origen es core

Si se toca captacion, hay que cuidar:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `source_url`
- consistencia por empresa

### Cotizacion sigue viva, pero como cierre

Modelo vigente:

```text
precio_final = costo_proveedor * (1 + margen_pct / 100)
```

No reintroducir logica tecnica compleja de perfiles o formulas salvo instruccion explicita.

### Solicitudes + notificaciones + WhatsApp son core actual

Si se toca solicitudes, hay que cuidar:

- origen correcto
- notificacion correcta
- contacto rapido
- contexto comercial util

### PDF y aprobacion publica son core de cierre

Si se toca cotizaciones, hay que cuidar:

- montos correctos
- branding correcto
- PDF claro
- mensaje de WhatsApp util
- flujo publico de aprobacion

## Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
```

Tambien se espera:

- bucket `organization-assets`
- tabla `organization_profile`
- soporte para approval token publico

## Testing

Stack de testing:

- Jest
- React Testing Library

Reglas:

- si se toca `src/services/` o `src/utils/`, agregar o actualizar tests
- no llamar a Supabase real en tests
- tests en espanol

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

1. El producto principal es captacion + seguimiento + cierre.
2. El valor actual esta en solicitudes, origen, notificaciones, cotizaciones, PDF y WhatsApp.
3. No hay que expandir el cotizador tecnico salvo instruccion explicita.
4. Antes de proponer features futuras, revisar robustez, errores reales y validacion comercial.
5. Si tocas solicitudes, revisa el impacto en origen, notificaciones y dashboard.
6. Si tocas cotizaciones, revisa el impacto en PDF, WhatsApp y flujo publico.
7. No describas este sistema como ERP, logistica o software de produccion.

## En una frase

Ventora hoy es **software comercial para empresas de vidrios y aluminio que captura leads, los ordena y los ayuda a cerrar**.
