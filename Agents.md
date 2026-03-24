# AGENTS.md - Vidrios SaaS

Contexto de producto, arquitectura y reglas de trabajo para cualquier IA que toque este repo.
Lee este archivo antes de editar codigo.

Ultima consolidacion revisada contra el repo: 2026-03-23.

---

## Que es este proyecto ahora

Este proyecto ya no debe pensarse como un motor tecnico de calculo de ventanas.

El enfoque vigente es:

**un SaaS para crear presupuestos profesionales de vidrios y aluminio por componente, pensado para uso rapido en terreno y envio inmediato al cliente.**

El software hoy apunta a ayudar a:

- registrar clientes
- crear cotizaciones
- crear o reutilizar proyectos de forma implicita dentro del flujo de cotizacion
- agregar componentes del proyecto
- calcular margen sobre costo proveedor
- generar PDF profesional con branding de la empresa
- compartir presupuesto por WhatsApp

Usuario principal:

- maestro independiente
- pequeno taller
- instalador o vendedor tecnico que hoy cotiza con proveedor y arma el presupuesto manualmente

### Modelo de usuario vigente del MVP

Para esta etapa del producto, el sistema debe leerse asi:

- cada cuenta representa al dueno del negocio o responsable comercial que usa Ventora
- hoy existe un unico rol operativo real: `admin`
- roles como `tecnico` o `viewer` pueden existir en codigo legado o preparacion futura, pero no forman parte del alcance activo del MVP
- cualquier prueba funcional, validacion de salida o alta manual de usuarios debe asumir `rol = 'admin'`
- ademas de `auth.users`, el login depende de una fila en `public.users` con `correo`, `organization_id` y `rol`

**Stack actual:** Next.js 16.1.6 (App Router) + React 19.2.3 + TypeScript + Supabase + CSS Modules + Jest

---

## Cambio de enfoque del sistema

El proyecto partio con la idea de construir un cotizador tecnico completo:

- perfiles
- vidrio
- compatibilidades
- formulas
- catalogos tecnicos
- costos por material

Ese enfoque queda fuera del MVP comercial porque agrega demasiada complejidad para validar negocio.

Problema real del usuario:

1. Cotiza con el proveedor.
2. Recibe un costo por pieza, componente o solucion ya definida.
3. Aplica margen.
4. Arma el presupuesto en Excel, Word o WhatsApp.
5. Lo envia al cliente.

Conclusiones operativas:

- el problema principal no es ingenieria de ventanas
- el problema principal es capturar, presentar y enviar el presupuesto rapido
- el MVP debe optimizar ese flujo, no reemplazar al proveedor

---

## Objetivo del software

El producto debe resolver esto:

**crear presupuestos comerciales por componente, con calculo simple, PDF claro, branding de empresa y salida por WhatsApp.**

### Posicionamiento comercial recomendado

La categoria correcta hoy no es "ERP", ni "software logistico", ni "motor tecnico de ingenieria".

La forma mas precisa de posicionarlo es:

**un presupuestario comercial vertical para vidrios y aluminio, con seguimiento liviano del cliente y del avance comercial de la obra.**

Formas correctas de describirlo:

- software para crear y enviar cotizaciones de vidrios y aluminio
- presupuestario comercial con PDF, WhatsApp y aprobacion del cliente
- CRM operativo liviano para talleres y maestros que necesitan cotizar rapido

Formas incorrectas de describirlo:

- ERP de obra
- sistema logistico completo
- software de planificacion de produccion
- cotizador tecnico de perfiles y despiece

Importante:

- hoy el sistema ayuda al seguimiento comercial y al cierre del presupuesto
- tambien da visibilidad basica del estado del cliente y de la obra
- **no** es aun un sistema de logistica, despacho, inventario o produccion
- **no** debe venderse como si resolviera planificacion operativa completa del taller

Modelo de calculo MVP:

```text
precio_final = costo_proveedor * (1 + margen_pct / 100)
```

Ejemplo:

```text
costo_proveedor = 300000
margen_pct = 100
precio_final = 600000
```

El sistema no necesita para el MVP:

- calcular perfiles
- calcular vidrio de forma tecnica
- hacer ingenieria de ventanas
- integrarse con proveedores
- mantener compatibilidades complejas

Eso queda como fase 2 eventual si el producto valida mercado.

---

## Concepto clave del MVP: Componentes

Las cotizaciones no se modelan como productos genericos.

Se modelan como **componentes del proyecto**.

Ejemplos:

- `V1` -> ventana living
- `V2` -> ventana cocina
- `P1` -> puerta terraza
- `C1` -> cierre logia

Cada componente puede tener:

- codigo
- tipo
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

El componente es la unidad principal del presupuesto.

---

## Flujo vigente del producto

Flujo que hoy ya existe en el repo:

1. Login
2. Dashboard
3. Clientes
4. Nueva cotizacion en flujo guiado
5. Agregar componentes
6. Calcular subtotal, neto, IVA y total
7. Guardar borrador o presupuesto
8. Ver detalle
9. Generar PDF
10. Compartir por WhatsApp
11. Cliente revisa y responde desde link publico
12. Configurar perfil comercial de la empresa

Importante:

- el proyecto se crea o reutiliza desde el service de cotizaciones
- hoy no existe una UI separada de gestion de proyectos

---

## Arquitectura vigente: Monolito Modular en Capas

La separacion vigente para codigo nuevo sigue siendo esta:

```text
app/                -> Presentacion   (routing, pages, route handlers)
src/components/     -> UI             (componentes reutilizables)
src/hooks/          -> Aplicacion     (estado React, coordinacion)
src/services/       -> Negocio        (reglas, validaciones, calculos)
src/repositories/   -> Datos          (Supabase, queries)
src/lib/supabase/   -> Infra          (clientes server/client)
```

Flujo obligatorio:

```text
page / component -> hook -> service -> repository -> Supabase
```

Regla practica:

- si hoy existe una excepcion, tratalo como deuda tecnica
- no la copies como patron nuevo

---

## Estructura real del repo

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
|   |-- ia-handoff.md
|   |-- mvp-componentes-plan.md
|   |-- mvp-componentes-schema.sql
|   `-- organization-profile-schema.sql
|-- public/
|   |-- icons/
|   `-- sw.js
|-- src/
|   |-- components/
|   |   |-- layout/
|   |   `-- pwa/
|   |-- constants/
|   |-- hooks/
|   |-- lib/
|   |   |-- supabase/
|   |   `-- supabaseClient.ts
|   |-- repositories/
|   |-- services/
|   |   `-- __tests__/
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

Notas rapidas:

- `README.md` sigue sin ser fuente de verdad
- `proxy.ts` es parte del proyecto actual; no asumas `middleware.ts`
- existe base PWA con `manifest.ts`, `public/sw.js` y registro del service worker
- el cache offline debe mantenerse conservador; no asumas soporte offline robusto para la app autenticada

---

## Estado actual real del repo

Conclusion corta:

**el MVP comercial ya no esta solo "planeado"; ya existe una base funcional importante en runtime.**

### Lo que ya esta implementado

- landing publica y login
- branding publico bajo nombre `Ventora`
- navbar fijo y navegacion publica mas coherente
- auth real con Supabase por email/password
- shell operativa para la app interna
- dashboard con KPIs simples de cotizaciones
- CRUD de clientes
- listado de cotizaciones
- detalle de cotizacion
- flujo guiado de nueva cotizacion por pasos
- calculo por componente con costo proveedor + margen
- guardado de borrador y presupuesto
- soft delete en cotizaciones e items
- PDF imprimible con branding
- compartir por WhatsApp
- pagina publica de planes
- aprobacion o rechazo publico de presupuesto por token
- estados comerciales automaticos de clientes segun cotizaciones
- estados operativos de cotizacion hasta proyecto terminado
- perfil comercial de empresa
- subida de logo a Supabase Storage
- forma de pago visible en PDF
- base multi-tenant por `organization_id`
- tests de services, utils y hooks
- build de produccion pasando

### Lo que hoy existe pero aun esta incompleto o desalineado

- no hay UI separada para proyectos
- la landing publica esta mucho mas alineada visualmente, pero aun requiere validacion comercial final de CTA, copy y conversion
- OAuth tiene callback y UI placeholder, pero los proveedores aun no estan habilitados
- la base PWA existe, pero el modo offline debe validarse en dispositivo real; no asumirlo solo por tener `sw.js`
- el guardado de cotizaciones sigue sin ser transaccional; si falla un insert intermedio puede dejar estado parcial
- pagos y billing no existen
- analiticas de producto no existen
- no hay monitoreo operativo ni observabilidad de produccion
- no hay onboarding comercial completo para salir a mercado
- hay algunos textos con problemas de encoding heredados en ciertas vistas y tests

### Lectura operativa de este momento

Si tomas este repo hoy, asume esto:

- ya no estamos en etapa de discovery
- ya no falta "inventar producto"
- estamos en etapa de endurecimiento final para beta o produccion inicial controlada
- lo mas importante en las proximas 24 a 48 horas es validar flujo real, Supabase real y errores reales
- cualquier mejora visual debe ser secundaria frente a validacion, robustez y despliegue

### Como leer el repo desde ahora

- el corazon del producto ya es el flujo comercial de cotizaciones
- no hay que volver a expandir el cotizador tecnico por inercia
- el valor actual ya esta en clientes, cotizaciones, PDF, branding y WhatsApp
- el siguiente salto no es "mas motor tecnico"; es estabilizar, desplegar y vender

---

## Estado funcional por modulo

### Publico

- landing comercial presente
- pagina `/planes` presente
- login presente
- offline page presente
- PWA base presente
- flujo publico `/presupuesto/[token]` presente

### Operativo

- dashboard presente
- clientes presente
- cotizaciones presente
- configuracion de empresa presente

### Comercial

- branding de PDF presente
- forma de pago como texto comercial presente
- WhatsApp presente
- aprobacion publica de presupuesto presente
- seguimiento comercial liviano presente

### Operacion liviana

- estado automatico de clientes segun actividad comercial
- proyecto creado o reutilizado implicitamente desde la cotizacion
- cierre operativo simple via estado de cotizacion/proyecto terminado

### Aun no presente

- OAuth habilitado con proveedores reales
- checkout
- suscripciones
- analytics de producto
- observabilidad de produccion
- CRM comercial profundo
- gestion explicita de proyectos
- logistica, despacho o planificacion de taller

---

## Reglas que siempre debes seguir

**1. Respetar el flujo de capas**

```text
pagina/componente -> hook -> service -> repository -> Supabase
```

Una pagina nunca importa un repository directamente.
Un hook no consulta Supabase directo.
Un repository nunca contiene logica de negocio.

**2. TypeScript estricto**

Todos los datos deben vivir tipados en `src/types/`.
No usar `any` salvo caso inevitable y comentado.

**3. Multi-tenant obligatorio**

Toda query de datos debe filtrar por `organization_id`.
Ningun dato sale sin ese filtro.

**4. Soft delete, nunca hard delete**

Eliminar registros = escribir `eliminado_en: timestamp`.
Las queries activas deben filtrar `.is("eliminado_en", null)`.

**5. Calculos financieros solo en services**

Subtotal, descuento, IVA, utilidad y total se calculan en `src/services/`.

**6. El MVP usa calculo simple por componente**

La logica principal del MVP trabaja con:

- `costoProveedorUnitario`
- `costoProveedorTotal`
- `margenPct`
- `precioUnitario`
- `precioTotal`

**7. No reintroducir el cotizador tecnico**

No agregar nuevas capas de materiales, perfiles, compatibilidades o formulas salvo instruccion explicita.

**8. Infraestructura encapsulada**

`src/lib/supabase/client.ts` y `src/lib/supabase/server.ts` son wrappers tecnicos.
Su uso debe quedar encapsulado preferentemente en repositories o servicios de auth.

**9. PDF y WhatsApp son core del MVP**

Todo cambio en cotizaciones debe cuidar:

- PDF claro
- monto correcto
- marca de empresa correcta
- salida por WhatsApp util

**10. No abrir pagos ni analiticas antes de estabilizar el core**

Antes de meter billing, PostHog o integraciones similares, primero cerrar bien:

- flujo de cotizacion
- branding
- salida comercial
- despliegue
- errores de produccion

---

## Diseno

### Landing y Login

fondo: `#0A0A0A`
superficie: `#161616`
acento: `#C8A96E`
texto: `#F0ECE4`
borde: `#242424`

### App operativa

Direccion visual:

- profesional
- confiable
- clara
- corporativa
- sobria

Paleta oficial:

fondo: `#F3F5F9`
tarjetas: `#FFFFFF`
superficie suave: `#F7F9FC`
superficie fuerte: `#EEF3F8`
texto principal: `#243B6B`
texto secundario: `#667085`
bordes: `#D9E0EA`
acento principal: `#4F7DD4`
acento fuerte: `#335EA9`
exito: `#2FA36B`
advertencia: `#D89B3C`
error: `#D95C5C`
neutral: `#98A2B3`

### Tipografia

Syne -> titulos
Lato -> cuerpo
JetBrains Mono -> codigos y montos

### Principios UI

- botones de minimo 48px de alto
- labels siempre visibles
- espaciado amplio
- alto contraste
- nunca depender solo del color

---

## Dominio del negocio ahora

| Concepto | Descripcion |
|---|---|
| `organization` | Empresa cliente del SaaS |
| `user` | Empleado de la organizacion |
| `client` | Cliente final de la organizacion |
| `project` | Obra o trabajo asociado a un cliente |
| `cotizacion` | Presupuesto comercial |
| `componente` | Item principal cotizado |
| `costo_proveedor` | Costo entregado por proveedor |
| `margen` | Porcentaje aplicado por el maestro |
| `precio_final` | Valor final vendido al cliente |
| `organization_profile` | Identidad comercial para branding del PDF |

Ejemplos de componente:

- ventana living
- ventana cocina
- puerta corredera
- shower door
- cierre de terraza

---

## Base de datos: estrategia vigente

No conviene borrar tablas legacy todavia.

Estrategia:

- reutilizar `cotizaciones`
- reutilizar `cotizacion_items` como tabla de componentes
- mantener `projects`
- agregar o usar `codigo`, `tipo_componente` y `orden`
- mantener `organization_profile` para branding
- dejar `quote_item_breakdown` y tablas tecnicas dormidas

### Tablas legacy a dejar dormidas

- `product_types`
- `system_lines`
- `system_configurations`
- `configuration_materials`
- `line_glass_compatibility`
- `materials`
- `labor_costs`
- `quote_item_breakdown`

Regla:

- no borrarlas aun
- no depender de ellas para el flujo principal
- no seguir metiendo logica nueva ahi

---

## Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notas:

- para branding con logo debe existir el bucket `organization-assets`
- para perfil comercial debe existir la tabla `organization_profile`
- para aprobacion publica de presupuestos se requiere `SUPABASE_SERVICE_ROLE_KEY`
- revisar `supabase/migrations/20260317154500_organization_profile.sql`
- revisar `supabase/migrations/20260318093000_cotizacion_items_component_fields.sql`
- revisar `supabase/migrations/20260319183000_cotizaciones_approval_public_link.sql`

---

## Testing

Objetivo del proyecto: Jest + React Testing Library.

Cobertura actual visible en el repo:

- auth service
- auth server service
- clientes service
- cotizaciones workflow service
- cotizaciones app service
- public approval service
- organization profile service
- hooks de auth, clientes, cotizaciones y organization profile
- registro del service worker
- PDF helpers
- WhatsApp helpers
- presentacion de items y paginacion PDF

Regla de trabajo:

- cada cambio en `src/services/` o `src/utils/` debe venir con test nuevo o actualizado
- nunca llamar a Supabase real en tests
- nombrar tests en espanol

Minimo esperado por funcion publica:

- 1 caso feliz
- 1 caso de error o validacion
- 1 caso borde

---

## Riesgos criticos actuales

Si el objetivo es produccion o beta cerrada, trata estos puntos como prioridad real:

1. Las escrituras de cotizaciones no son transaccionales.
2. No hay observabilidad minima de produccion.
3. Falta smoke test manual real de punta a punta.
4. Falta validar Supabase real con migraciones, bucket y `SUPABASE_SERVICE_ROLE_KEY`.
5. La PWA sigue siendo shell publica con validacion pendiente en dispositivo real.
6. La landing y los CTA publicos deben validarse ya con criterio de salida, no solo con criterio visual.

---

## Prioridades actuales recomendadas

Orden sugerido a partir del estado real del repo en este cierre preproduccion:

1. Validar entorno real:
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
   - RLS y multi-tenant con usuario real
2. Estabilizar el flujo principal de salida a produccion:
   - smoke tests reales
   - validacion en movil
   - manejo de errores
   - revisar estados vacios y edge cases
   - validar PWA y offline real en dispositivo
   - revisar consistencia de escritura en create/update de cotizaciones
3. Revisar experiencia comercial final:
   - detalle de cotizacion
   - PDF
   - mensaje de WhatsApp
   - flujo publico `/presupuesto/[token]`
   - claridad de forma de pago
   - CTA y copy final de landing, login y `/planes`
   - limpieza de encoding roto visible al usuario
4. Definir despliegue inicial:
   - hosting
   - variables de entorno
   - dominio
   - politicas de acceso
5. Despues de eso:
   - metodo de pago
   - analiticas tipo PostHog
   - onboarding comercial

---

## Resumen ejecutivo para futuras IAs

Si entras a este repo hoy, asume esto:

- el MVP comercial ya tiene base funcional real
- la prioridad ya no es inventar mas producto, sino cerrar salida a mercado
- no metas pagos ni analiticas antes de estabilizar despliegue y experiencia principal
- no reabras el cotizador tecnico salvo instruccion explicita
- si tocas cotizaciones, debes cuidar servicio, PDF, WhatsApp y aprobacion publica juntos
- no posiciones este producto como ERP o logistica; hoy es presupuestario comercial vertical con seguimiento liviano
