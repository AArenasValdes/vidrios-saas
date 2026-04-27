# AGENTS.md - Vidrios SaaS

Contexto de producto, arquitectura y reglas de trabajo para cualquier IA que toque este repo.
Lee este archivo antes de editar codigo.

Ultima consolidacion revisada contra el repo: 2026-04-27.

Si vas a usar ChatGPT web sin contexto del repo, revisa tambien `docs/contexto-rapido-web.md`.

---

## Que es este proyecto ahora

Este proyecto ya no debe pensarse como un formulario tecnico ni como un motor de calculo de ventanas.

El enfoque vigente es:

**un cotizador comercial basado en sistemas preconfigurados, con autocompletado inteligente y edicion rapida, pensado para cotizar en terreno sin obligar al usuario a construir cada componente desde cero.**

El software hoy apunta a ayudar a:

- registrar clientes
- crear cotizaciones
- crear o reutilizar proyectos de forma implicita dentro del flujo de cotizacion
- sugerir sistemas completos por tipo de componente y proveedor
- autocompletar material, vidrio, margen, linea y descripcion base
- editar solo lo necesario desde el movil
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
- para salida a produccion, el navegador recomendado para el maestro es `Chrome` o `Edge` en desktop
- en iPhone, la experiencia correcta es abrir desde `Safari` y agregar a pantalla de inicio como PWA
- `Brave` no debe considerarse navegador principal para alertas push, porque puede bloquear la suscripcion

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

El nuevo enfoque es otro:

**el usuario no construye el componente, el sistema le propone un sistema sugerido y el usuario solo confirma o ajusta.**

Problema real del usuario:

1. Cotiza con el proveedor.
2. Recibe una configuracion o costo ya bastante definido.
3. Aplica margen.
4. Arma el presupuesto en Excel, Word o WhatsApp.
5. Lo envia al cliente.

Conclusiones operativas:

- el problema principal no es ingenieria de ventanas
- el problema principal es proponer rapido una configuracion util
- el MVP debe optimizar el flujo de sugerencia y confirmacion, no obligar a construir desde cero
- la precision perfecta vale menos que la velocidad util en terreno

---

## Objetivo del software

El producto debe resolver esto:

**crear presupuestos comerciales a partir de sistemas preconfigurados, con calculo simple, PDF claro, branding de empresa y salida por WhatsApp.**

### Posicionamiento comercial recomendado

La categoria correcta hoy no es "ERP", ni "software logistico", ni "motor tecnico de ingenieria".

La forma mas precisa de posicionarlo es:

**un presupuestario comercial vertical para vidrios y aluminio, basado en sistemas sugeridos, con seguimiento liviano del cliente y del avance comercial de la obra.**

Formas correctas de describirlo:

- software para crear y enviar cotizaciones de vidrios y aluminio
- presupuestario comercial con PDF, WhatsApp y aprobacion del cliente
- CRM operativo liviano para talleres y maestros que necesitan cotizar rapido
- cotizador basado en sistemas preconfigurados con autocompletado inteligente

Formas incorrectas de describirlo:

- ERP de obra
- sistema logistico completo
- software de planificacion de produccion
- cotizador tecnico de perfiles y despiece
- formulario tecnico que obliga a construir cada componente desde cero

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

## Concepto clave del MVP: Sistemas

Las cotizaciones no se modelan como formularios vacios ni como productos genericos.

Se modelan como **sistemas sugeridos y editables**.

Un sistema representa una configuracion real de trabajo en terreno. Ejemplos:

- ventana corredera aluminio basica
- ventana corredera aluminio premium
- puerta abatible aluminio
- shower door estandar
- cierre de terraza piso-cielo

Cada sistema puede incluir:

- tipo de componente
- proveedor
- linea
- nivel
- tipo de apertura
- vidrio compatible
- restricciones de dimension
- configuracion base sugerida
- margen sugerido
- descripcion base

Cada componente sigue siendo la unidad de calculo y presupuesto, pero nace desde un sistema sugerido.

### Lectura operativa

- `sistema` = configuracion sugerida
- `componente` = item editable y calculable dentro de la cotizacion

El usuario no debe partir de cero. El sistema debe sugerir una base completa y dejar al usuario solo la correccion final.

---

## Flujo vigente del producto

Flujo que hoy ya existe en el repo:

1. Login
2. Dashboard
3. Clientes
4. Nueva cotizacion en flujo guiado
5. Elegir tipo de componente
6. Recibir sistema sugerido y autocompletado inteligente
7. Ajustar solo lo necesario
8. Crear uno o varios componentes en lote
9. Editar rapido en lista
10. Calcular subtotal, neto, IVA y total
11. Guardar borrador o presupuesto
12. Ver detalle
13. Generar PDF
14. Compartir por WhatsApp
15. Cliente revisa y responde desde link publico
16. Configurar perfil comercial de la empresa

Importante:

- el proyecto se crea o reutiliza desde el service de cotizaciones
- hoy no existe una UI separada de gestion de proyectos
- el paso 2 debe leerse como un asistente de configuracion, no como un formulario manual

---

## Estado actual real del repo

Conclusion corta:

**el MVP comercial ya no esta solo planeado; ya existe una base funcional importante en runtime.**

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
- link publico canonico en `ventorap.cl` y `www.ventorap.cl`
- notificaciones push para el maestro al enviar, aprobar o rechazar cotizaciones, sujeto a soporte del navegador
- landing publica con bloque de instalacion y acceso orientado a maestros, con copy simple y navegacion recomendada
- estados comerciales automaticos de clientes segun cotizaciones
- estados operativos de cotizacion hasta proyecto terminado
- perfil comercial de empresa
- subida de logo a Supabase Storage
- forma de pago visible en PDF
- base multi-tenant por `organization_id`
- paso 2 movil mucho mas afinado para trabajo en terreno:
  - viewport de lista estable
  - scroll interno controlado
  - editor rapido movil
  - copia parcial de medidas/costo a componentes del mismo tipo
  - limite de 200 componentes por cotizacion
  - copy mas simple para maestros
  - codigos autogenerados visibles al crear lotes
  - selector de margen local a la cotizacion con recalculo de componentes cargados
  - tarjetas moviles mas compactas, con menos texto y lectura priorizada
- modo `con margen` ya puede convivir con una empresa configurada en `valor directo` sin pisar la preferencia global
- en paso 2, cuando una cotizacion trabaja con margen, la lista muestra primero el costo del componente y deja la venta como dato secundario
- colores actualizados para aluminio:
  - `Titanio`
  - `Madera`
  - `Bronce` eliminado del flujo activo
- tests de services, utils y hooks
- build de produccion pasando
- despliegue productivo activo en Vercel para `ventorap.cl`

### Lo que hoy existe pero aun esta incompleto o desalineado

- no hay UI separada para proyectos
- la landing publica esta mucho mas alineada visualmente, pero aun requiere validacion comercial final de CTA, copy y conversion
- OAuth tiene callback y UI placeholder, pero los proveedores aun no estan habilitados
- la base PWA existe, pero el modo offline debe validarse en dispositivo real; no asumirlo solo por tener `sw.js`
- el guardado de cotizaciones sigue sin ser transaccional; si falla un insert intermedio puede dejar estado parcial
- el soporte de Web Push depende del navegador y del sistema operativo; Brave no se considera navegacion base de produccion para el maestro
- la guia comercial de instalacion y navegador debe seguir refinandose para que la gente no tecnica entienda rapido que usar
- pagos y billing no existen
- observabilidad de produccion y monitoreo operacional siguen incompletos; hoy hay base tecnica en `app/layout.tsx` con `@vercel/analytics` y `@vercel/speed-insights`, pero eso no reemplaza telemetria operativa, alertas ni seguimiento de errores
- no hay onboarding comercial completo para salir a mercado
- hay algunos textos con problemas de encoding heredados en ciertas vistas y tests
- el paso 2 sigue siendo el area mas sensible del producto en movil:
  - todavia requiere refinamiento de claridad, jerarquia y velocidad real de uso
  - el objetivo no es agregar mas funciones, sino quitar friccion
  - cada cambio debe validarse con un maestro real en movil antes de consolidarlo
- el flujo de precio en paso 2 ya mejora bastante, pero aun debe validarse con mas casos reales de margen vs valor directo
- la creacion masiva y la edicion rapida ya existen, pero todavia pueden simplificarse mas para usuarios no tecnicos
- el paso 2 no debe volver a llenarse de texto explicativo; la prioridad es mostrar solo lo minimo necesario

### Lectura operativa de este momento

Si tomas este repo hoy, asume esto:

- ya no estamos en etapa de discovery
- ya no falta inventar producto
- estamos en etapa de endurecimiento final para beta o produccion inicial controlada
- lo mas importante en las proximas 24 a 48 horas es validar flujo real, Supabase real, errores reales y el comportamiento del paso 2 en movil
- cualquier mejora visual debe ser secundaria frente a validacion, robustez y despliegue

### Como leer el repo desde ahora

- el corazon del producto ya es el flujo comercial de cotizaciones
- no hay que volver a expandir el cotizador tecnico por inercia
- el valor actual ya esta en clientes, cotizaciones, PDF, branding y WhatsApp
- el siguiente salto no es mas logica tecnica; es consolidar sistemas sugeridos, estabilizar, desplegar y vender

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
- flujo rapido de sistemas sugeridos en nueva cotizacion
- configuracion de empresa presente
- paso 2 con edicion rapida movil, copia de medidas/costo y recalculo comercial en runtime

### Comercial

- branding de PDF presente
- forma de pago como texto comercial presente
- WhatsApp presente
- aprobacion publica de presupuesto presente
- seguimiento comercial liviano presente
- cotizacion basada en sistemas sugeridos y editables

### Operacion liviana

- estado automatico de clientes segun actividad comercial
- proyecto creado o reutilizado implicitamente desde la cotizacion
- cierre operativo simple via estado de cotizacion/proyecto terminado

### Aun no presente

- OAuth habilitado con proveedores reales
- checkout
- suscripciones
- analitica de producto propia
- observabilidad de produccion completa
- CRM comercial profundo
- gestion explicita de proyectos
- logistica, despacho o planificacion de taller
- catalogo completo de sistemas versionados por proveedor, familia y nivel

---

## Arquitectura vigente

La separacion vigente para codigo nuevo sigue siendo esta:

```text
app/                                 -> Presentacion   (routing, pages, route handlers)
src/components/                      -> UI compartida  (componentes reutilizables)
src/features/<feature>/hooks/        -> Aplicacion     (estado React, coordinacion)
src/features/<feature>/services/     -> Negocio        (reglas, validaciones, calculos)
src/features/<feature>/repositories/ -> Datos          (Supabase, queries)
src/features/<feature>/types/        -> Tipos de dominio del feature
src/lib/supabase/                    -> Infra          (clientes server/client)
src/utils/                           -> helpers puros compartidos
src/constants/                       -> constantes compartidas
```

Flujo obligatorio:

```text
page / component -> hook -> service -> repository -> Supabase
```

Regla practica:

- si hoy existe una excepcion, tratalo como deuda tecnica
- no la copies como patron nuevo
- `src/hooks`, `src/services`, `src/repositories` y `src/types` quedan como capa de compatibilidad o shared legacy mientras termina la migracion
- codigo nuevo de dominio debe vivir primero dentro de `src/features/<feature>/...`

### Mapa real de features activas

- `src/features/auth`
- `src/features/clientes`
- `src/features/cotizaciones`
- `src/features/notificaciones`
- `src/features/organization-profile`
- `src/features/solicitudes`

### Subdominios ya activos dentro de cotizaciones

- `new-quote`
- `public-approval`
- `pdf-cache`
- workflow de sugerencias y calculo comercial

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

Notas rapidas:

- `README.md` sigue sin ser fuente de verdad
- `proxy.ts` es parte del proyecto actual; no asumas `middleware.ts`
- existe base PWA con `manifest.ts`, `public/sw.js` y registro del service worker
- el cache offline debe mantenerse conservador; no asumas soporte offline robusto para la app autenticada
- `app/layout.tsx` ya inyecta `@vercel/analytics/next` y `@vercel/speed-insights/next`, pero eso solo cubre una capa minima de observabilidad

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

Todos los datos deben vivir tipados en `src/features/<feature>/types/` o en `src/types/` solo si son realmente compartidos entre multiples features.
No usar `any` salvo caso inevitable y comentado.

**3. Multi-tenant obligatorio**

Toda query de datos debe filtrar por `organization_id`.
Ningun dato sale sin ese filtro.

**4. Soft delete, nunca hard delete**

Eliminar registros = escribir `eliminado_en: timestamp`.
Las queries activas deben filtrar `.is("eliminado_en", null)`.

**5. Calculos financieros solo en services**

Subtotal, descuento, IVA, utilidad y total se calculan en `src/features/<feature>/services/` o en `src/services/` solo si el calculo es realmente transversal.

**6. El MVP usa calculo simple por componente**

La logica principal del MVP trabaja con:

- `costoProveedorUnitario`
- `costoProveedorTotal`
- `margenPct`
- `precioUnitario`
- `precioTotal`

**7. No reintroducir el cotizador tecnico**

No volver al modelo de formulario tecnico ni agregar nuevas capas de materiales, perfiles, compatibilidades o formulas salvo instruccion explicita. El flujo debe seguir basado en sistemas sugeridos y editables.

**8. Infraestructura encapsulada**

`src/lib/supabase/client.ts` y `src/lib/supabase/server.ts` son wrappers tecnicos.
Su uso debe quedar encapsulado preferentemente en repositories o servicios de auth.

**9. PDF y WhatsApp son core del MVP**

Todo cambio en cotizaciones debe cuidar:

- PDF claro
- monto correcto
- marca de empresa correcta
- salida por WhatsApp util

**10. No abrir pagos ni analitica de producto antes de estabilizar el core**

Antes de meter billing, instrumentos adicionales de analitica o integraciones similares, primero cerrar bien:

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

### Campos que hoy son criticos y deben seguirse verificando

- `codigo`
- `tipo_componente`
- `orden`
- `approval_token`
- `approval_token_expires_at`
- `cliente_vio_en`
- `cliente_respondio_en`
- `cliente_respuesta_canal`

### Infraestructura de datos y storage que no se puede asumir lista

- bucket `organization-assets`
- RLS para `organization_id`
- `SUPABASE_SERVICE_ROLE_KEY`
- migraciones aplicadas en el entorno real

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
- revisar `supabase/migrations/20260327174500_normalize_legacy_color.sql`

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
7. El paso 2 movil sigue siendo el punto con mayor riesgo de friccion comercial y operativa.
8. Los textos con encoding roto todavia pueden confundir al usuario si reaparecen en vistas clave o tests que documentan comportamiento.
9. Push notifications, aprobacion publica y PDF deben seguir verificandose juntos, porque dependen de distintos caminos de escritura y lectura.

---

## Que falta verificar antes de cerrar la beta

### Infraestructura real

- migraciones efectivamente aplicadas
- bucket `organization-assets`
- RLS con `organization_id`
- `SUPABASE_SERVICE_ROLE_KEY` en el entorno correcto
- `public.users` con `correo`, `organization_id` y `rol`
- usuarios reales operando como `admin`

### Flujo comercial principal

- creacion de cotizacion de punta a punta
- edicion del paso 2 en movil real
- calculo `con margen` y `valor directo`
- guardado de borrador y presupuesto
- PDF imprimible
- WhatsApp
- aprobacion y rechazo publico por token
- notificaciones push en navegadores soportados

### PWA y acceso

- instalacion como app en iPhone desde Safari
- acceso desde Chrome y Edge en desktop
- validacion de offline real en dispositivo
- comportamiento del service worker sin asumir cobertura completa

### Comercial y salida

- landing
- CTA
- copy para gente no tecnica
- claridad de planes
- forma de pago en PDF y en detalle
- onboarding comercial basico

### Tecnico y operacional

- consistencia de escrituras
- manejo de errores intermedios
- logs y trazas minimas
- performance del paso 2
- cobertura de tests en casos de borde

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
2. Endurecer el paso 2 movil:
   - reducir confusion de labels
   - mantener tarjetas con informacion minima y clara
   - validar replicacion parcial por tipo
   - validar `con margen` vs `valor directo` en casos reales
   - confirmar que costo, venta y total se lean sin ambiguedad
   - pulir flujo de lotes, espacios y nombres visibles
   - seguir testando con maestros reales antes de congelar cambios
3. Consolidar el motor de sugerencias y sistemas:
   - reglas base por proveedor
   - reglas por tipo de componente
   - sugerencias por dimension
   - defaults editables sin romper el flujo rapido
   - fallback claro cuando el sistema no conozca una combinacion
4. Estabilizar el flujo principal de salida a produccion:
   - smoke tests reales
   - validacion en movil
   - manejo de errores
   - revisar estados vacios y edge cases
   - validar PWA y offline real en dispositivo
   - revisar consistencia de escritura en create/update de cotizaciones
   - verificar push en Chrome y Edge, no solo en Brave
5. Revisar experiencia comercial final:
   - detalle de cotizacion
   - PDF
   - mensaje de WhatsApp
   - flujo publico `/presupuesto/[token]`
   - claridad de forma de pago
   - CTA y copy final de landing, login y `/planes`
   - limpieza de encoding roto visible al usuario
   - mejorar la guia de instalacion y acceso para usuarios no tecnicos
6. Definir despliegue inicial:
   - hosting
   - variables de entorno
   - dominio
   - politicas de acceso
7. Despues de eso:
   - metodo de pago
   - analitica de producto
   - onboarding comercial

---

## Resumen ejecutivo para futuras IAs

Si entras a este repo hoy, asume esto:

- el MVP comercial ya tiene base funcional real
- la prioridad ya no es inventar mas producto, sino cerrar salida a mercado
- el flujo principal debe comportarse como un asistente de configuracion, no como un formulario
- no metas pagos ni analitica de producto antes de estabilizar despliegue y experiencia principal
- no reabras el cotizador tecnico salvo instruccion explicita
- si tocas cotizaciones, debes cuidar servicio, sugerencias, PDF, WhatsApp y aprobacion publica juntos
- no posiciones este producto como ERP o logistica; hoy es un presupuestario comercial vertical basado en sistemas sugeridos
- si modificas la landing o las alertas, piensa primero en usuarios no tecnicos y en navegadores realmente compatibles
- el paso 2 movil hoy es el cuello de botella principal de UX; si lo tocas, piensa primero en claridad, velocidad y lectura en terreno
