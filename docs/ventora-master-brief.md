# Ventora - Documento Maestro para IAs, BI y Marketing

Actualizado: 2026-07-24

Este archivo es la referencia corta y ejecutiva para cualquier IA, consultor, analista, marketer o colaborador que necesite entender rapidamente que es Ventora, en que fase va, que funcionalidades tiene hoy y cual es el norte real del producto.

**Giro julio 2026 (leer también):** `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`  
**Roadmap desktop:** `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`

---

## 1. Que es Ventora

**Ventora** es un software comercial SaaS para empresas de vidrios, aluminio y PVC que:

- capta leads desde una pagina publica propia
- centraliza esos leads para que no se pierdan
- ayuda a responder rapido por WhatsApp
- convierte el avance comercial en cliente + cotizacion + cierre
- en desktop: catálogo de precios propio, constructor visual cuando hace falta, y **pauta de fabricación revisable** (opcional) con recetas del taller

No es:

- un ERP
- un sistema logístico
- un software de producción / CAD / optimizador de cortes
- un cotizador técnico universal de perfilería

La cotización es **herramienta de cierre comercial**. La cubicación es **ayuda interna revisable**, no promesa de máquina.

### Frases clave

**Captación:** "Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."

**Cierre:** "Cotiza desde el celular, envía un PDF profesional y deja de llegar a casa a hacer presupuestos."

### Capas (no mezclar en marketing)

1. Captación → 2. Cierre comercial → 3. Catálogo precios → 4. Constructor → 5. Receta/pauta opcional  
Plantillas L5000/L20/L25 = **iniciales sugeridas** (no verificadas hasta piloto).

---

## 2. Para quien esta hecho

### Usuario principal

Dueño, maestro, vendedor o administrador de una empresa pequeña o mediana de:

- vidriería
- aluminio
- PVC
- shower door
- termopanel
- cierres de terraza
- soluciones a medida similares

### Contexto real de uso

- trabaja en terreno
- muchas veces responde desde el celular
- vende por WhatsApp
- comparte PDFs
- no quiere sistemas complejos
- pierde consultas cuando está ocupado
- necesita una forma simple de registrar solicitudes, convertirlas en obras/cotizaciones y cerrar trabajos

### Cliente final del usuario

Persona que llega desde:

- WhatsApp
- Facebook
- Instagram
- TikTok
- QR
- un enlace directo compartido por el maestro

---

## 3. Problema que resuelve

El problema no es solo "hacer cotizaciones".

El problema real es:

- llegan consultas por muchos canales
- se responden desordenadas o tarde
- algunas se pierden por completo
- no hay centralización
- el seguimiento comercial es débil
- el cierre depende de conversaciones sueltas por WhatsApp

Ventora resuelve eso en un flujo simple:

1. el cliente deja una solicitud
2. la empresa la recibe y la centraliza
3. la contacta por WhatsApp
4. si avanza, crea una cotización
5. comparte PDF o link público
6. registra si la cotizacion quedo enviada, aprobada, rechazada o terminada

---

## 4. En que fase va el proyecto

### Fase actual

**Fase 2: estabilizacion de cotizacion desktop, dashboard comercial real y consolidacion de captacion + cierre**

Esto significa que hoy el foco fuerte esta en:

- rutas publicas criticas
- seguimiento comercial movil
- cotizacion operativa real
- estabilizacion de cotizacion desktop
- dashboard comercial con datos reales
- Quote Studio desktop como siguiente paso
- PDF y WhatsApp
- aprobacion publica
- rendimiento, robustez y consistencia

### Qué no debe abrirse todavía

No abrir Fase 3+ todavía. Eso incluye:

- ERP
- logística
- producción
- stock
- motor técnico de materiales
- reglas avanzadas de perfilería
- automatizaciones complejas
- CRM profundo tipo pipeline enterprise
- oportunidades y cobros como modulo activo

---

## 5. Qué es lo realmente fuerte de Ventora

La parte más fuerte del proyecto hoy no es solo “cotizar”.

Lo más fuerte es esta combinación:

### 1. Captación pública por empresa

Cada empresa puede tener su propia mini landing pública con:

- branding
- hero
- trabajos recientes
- servicios
- redes
- formulario de solicitud
- enlace público compartible

Ruta clave:

- `/solicitud/[empresa]`

### 2. Centralización comercial operativa

Todas las solicitudes quedan registradas en un solo lugar con:

- estado
- origen
- UTM
- source_url
- contexto
- contacto rápido

Ruta clave:

- `/solicitudes`

### 3. Cierre simple y realista para este rubro

El vendedor puede:

- crear cotización
- guardarla
- reabrirla
- generar PDF
- mandarla por WhatsApp
- compartir link público si quiere
- marcar seguimiento comercial

Rutas clave:

- `/cotizaciones`
- `/cotizaciones/nueva`
- `/cotizaciones/[id]`
- `/print/cotizaciones/[id]`
- `/presupuesto/[token]`

### 4. Mobile-first real

El producto ya está pensado para uso móvil en campo, no solo desktop:

- solicitudes
- detalle de cotización
- cambio de estado
- configuración operativa
- canales y QR
- nueva cotización

### 5. Lenguaje comercial, no técnico

La dirección correcta del producto ya está consolidada:

- leads primero
- seguimiento después
- cotización como herramienta comercial
- no reabrir el cotizador técnico legado

---

## 6. Funcionalidades actuales del producto

## 6.1 Captación

- mini landing pública por empresa
- formulario público de solicitud
- link público por empresa
- QR descargable
- enlaces por canal con UTM
- tracking de origen
- captura de nombre, WhatsApp, tipo de trabajo y mensaje
- soporte de redes sociales de la empresa
- galería pública de trabajos
- testimonios públicos con moderación

## 6.2 Centralización y seguimiento

- listado de solicitudes/leads
- filtros por estado
- búsqueda
- origen del lead
- cambio de estado
- acceso rápido a WhatsApp
- preparación para convertir solicitud en cotización

## 6.3 Clientes

- listado de clientes
- estados
- ficha de cliente
- relación con proyectos y cotizaciones

## 6.4 Cotizaciones

- listado con filtros y resumen
- workflow de nueva cotización
- detalle de cotización
- PDF imprimible
- compartir por WhatsApp
- link público con token
- aprobación/rechazo pública
- seguimiento manual del estado comercial

## 6.5 Cotización asistida por línea

Ya existe V1 de líneas comerciales por empresa:

- precio por m²
- mínimo cobrable
- redondeo
- cálculo automático por ancho, alto y cantidad
- override manual protegido
- guardar como precio rápido
- reutilización de líneas

## 6.6 Configuración de empresa

- datos de empresa
- marca y logo
- color principal y secundario
- slug público
- forma de pago
- líneas y precios base
- notificaciones push por dispositivo

## 6.7 Página pública / página de venta

Ya existe configuración específica para:

- hero
- servicios
- galería
- redes
- visibilidad de valoraciones
- formulario
- horarios
- publicación/borrador

Y ahora la identidad base se consolida desde `Empresa`.

---

## 7. Estado funcional actual

### Lo que ya está bien encaminado

- captación pública por empresa
- tracking UTM
- links por canal
- QR
- dashboard operativo
- clientes
- solicitudes
- cotizaciones
- PDF
- WhatsApp
- aprobación pública
- branding por empresa
- rendimiento base mejorado en rutas críticas
- mobile-first bastante consolidado

### Lo que sigue siendo delicado

- QA visual fina en flujos profundos
- observabilidad comercial más clara
- definición de métricas de conversión
- endurecimiento continuo de seguridad multi-tenant
- validación de escala con crecimiento real

---

## 8. Arquitectura técnica resumida

### Stack

- Next.js App Router
- React + TypeScript
- CSS Modules
- Supabase
- Auth con Supabase
- jsPDF + html2canvas
- Vercel
- Jest

### Regla de arquitectura

```text
page -> hook -> service -> repository -> Supabase
```

### Reglas importantes

- multi-tenant obligatorio por `organization_id`
- soft delete
- lógica de negocio en services
- repositories sin lógica comercial
- mobile-first
- `proxy.ts` como perímetro web

---

## 9. Tablas y entidades clave

### Core comercial

- `organization_profile`
- `solicitudes_contacto`
- `clients`
- `projects`
- `cotizaciones`
- `cotizacion_items`
- `cotizacion_line_templates`
- `public_landing_gallery`
- `web_push_subscriptions`

### Qué representa cada una

- `organization_profile`: identidad de empresa + branding + configuración pública
- `solicitudes_contacto`: leads capturados
- `clients`: clientes reales o prospectos convertidos
- `projects`: obras/trabajos
- `cotizaciones`: presupuestos comerciales
- `cotizacion_items`: componentes e ítems cotizados
- `cotizacion_line_templates`: precios rápidos por línea
- `public_landing_gallery`: trabajos recientes
- `web_push_subscriptions`: alertas por dispositivo

---

## 10. Rutas más importantes del negocio

### Rutas públicas críticas

- `/solicitud/[empresa]`
- `/presupuesto/[token]`

### Rutas privadas críticas

- `/dashboard`
- `/solicitudes`
- `/solicitudes/canales`
- `/cotizaciones`
- `/cotizaciones/nueva`
- `/cotizaciones/[id]`
- `/configuracion/empresa`
- `/configuracion/pagina-venta`

---

## 11. Qué hace única a la propuesta

Ventora no gana por ser “el cotizador más técnico”.

Gana por ser:

- simple
- comercial
- usable desde celular
- usable desde desktop para preparar mejor la cotizacion
- útil para gente que vive en WhatsApp
- específico para vidrios y aluminio
- orientado a no perder solicitudes, obras ni cotizaciones

La combinación valiosa es:

**captación + centralización + respuesta rápida + cotización + cierre**

No solo “hacer un PDF”.

---

## 12. Qué debe entender una IA antes de proponer cosas

### Nunca asumir que esto es

- software de fábrica
- sistema de producción
- software de inventario
- cotizador técnico de perfiles
- CRM enterprise complejo

### Sí debe asumir que esto es

- software comercial operativo
- centrado en captación y cierre
- orientado a maestros y dueños
- muy dependiente de móvil, WhatsApp y PDF

### Reglas de producto

- leads primero, cotización después
- no reintroducir módulos técnicos dormidos
- no tocar rutas públicas críticas sin mucho cuidado
- no romper PDF ni WhatsApp
- mantener configuración simple
- evitar pantallas pesadas o demasiado administrativas

---

## 13. Qué se puede explotar para inteligencia de negocios

Ventora ya tiene una base muy útil para BI porque registra eventos comerciales reales.

### Datos ya disponibles o casi disponibles

- cantidad de solicitudes
- origen del lead
- UTM source / medium / campaign
- source_url
- contexto del lead
- estado del lead
- fecha de captura
- clientes creados
- cotizaciones creadas
- cotizaciones enviadas
- cotizaciones aprobadas
- cotizaciones rechazadas
- cotizaciones terminadas
- valor económico cotizado
- tiempo entre lead y cotización
- tiempo entre cotización y respuesta

### Métricas de negocio recomendadas

- leads por canal
- tasa de contacto
- tasa de cotización
- tasa de aprobación
- tasa de cierre final
- tiempo promedio a primera respuesta
- tiempo promedio a cotización
- ticket promedio cotizado
- ticket promedio aprobado
- servicios más solicitados
- comunas o zonas más frecuentes

### Preguntas de BI que Ventora debería poder responder

- ¿De qué canal llegan más solicitudes?
- ¿Qué campañas generan mejores cotizaciones?
- ¿Qué porcentaje de leads termina en cotización?
- ¿Qué porcentaje de cotizaciones se aprueba?
- ¿Qué tipo de trabajo cierra mejor?
- ¿Qué zonas generan más demanda?
- ¿Qué empresa o usuario responde más rápido?

---

## 14. Qué se puede explotar para marketing

### Promesa principal

**Cotiza desde el celular, envía un PDF profesional y deja de llegar a casa a hacer presupuestos.**

### Transformación central

De llegar a casa a hacer presupuestos en el computador, a cotizar desde el celular en terreno y enviar un PDF profesional en minutos.

### Problemas de marketing reales que Ventora puede atacar

- “Cotizo tarde cuando llego a casa.”
- “Dependo de Excel, Word, notas o precios enviados por WhatsApp.”
- “Pierdo tiempo preparando presupuestos.”
- “Tengo clientes y cotizaciones desordenados.”
- “Quiero verme más profesional frente a mis clientes.”

### Mensajes fuertes

- Cotiza desde cualquier lugar.
- Envía presupuestos claros y profesionales.
- Mantiene clientes y cotizaciones ordenados.
- Convierte precios, medidas o cálculos ya realizados en una cotización lista para enviar.
- Responde más rápido con un PDF profesional.

### Posicionamiento correcto

Ventora no debe venderse como:

- “cotizador técnico barato”
- “sistema de cubicación”
- “software que calcula perfiles, cortes, herrajes o desperdicio”
- promesa de “ganarás más clientes” o “cerrarás más ventas”

Debe venderse como:

- **cotizador móvil y capa comercial para maestros e instaladores**

---

## 15. Qué no debe romperse nunca

### Rutas críticas

- `/solicitud/[empresa]`
- `/presupuesto/[token]`

### Herramientas críticas de cierre

- PDF
- WhatsApp
- branding de empresa
- cambio de estado comercial

### Restricciones de arquitectura

- no quitar `organization_id`
- no romper soft delete
- no mezclar lógica de negocio en repositories
- no romper `proxy.ts`

---

## 16. Estado estratégico resumido

### Fase actual exacta

**Fase 2.**

Ya no estamos en definición conceptual.
Ya no estamos en “MVP solo para probar idea”.

Estamos en:

- consolidar el producto comercial
- estabilizar cotizacion desktop
- dejar dashboard comercial con datos reales
- preparar Quote Studio desktop vendible
- preparar salida piloto seria

### Qué sigue después de esta fase

No agregar módulos gigantes todavía.

Lo siguiente correcto es:

- validacion de constructor visual guiado
- medicion comercial real
- mejora de conversion
- catalogo privado piloto
- marketing con mensaje claro

---

## 17. Resumen ejecutivo para pegar a otra IA

Si necesitas una versión ultra corta, usa esto:

> Ventora es un cotizador móvil y una capa comercial para maestros e instaladores de vidrios, aluminio, ventanas, PVC, shower y cierres. Su objetivo de marketing no es competir como cotizador técnico barato ni prometer cubicación, perfiles, cortes, herrajes o desperdicio. El mensaje central es: "Cotiza desde el celular, envía un PDF profesional y deja de llegar a casa a hacer presupuestos." La fase actual es Fase 2: estabilización, hardening, rendimiento, simplificación de configuración y preparación para piloto. Las rutas más críticas son `/solicitud/[empresa]` y `/presupuesto/[token]`. Toda propuesta debe fortalecer cotización móvil, PDF profesional, orden de clientes/cotizaciones, respuesta rápida o seguimiento.

---

## 18. Archivos recomendados para entender el proyecto si vas a trabajar en él

- `AGENTS.md`
- `docs/agent-map/README.md`
- `docs/agent-map/PROJECT_OVERVIEW.md`
- `docs/agent-map/ROUTES_MAP.md`
- `docs/agent-map/FEATURES_MAP.md`
- `docs/agent-map/DATA_MODEL_MAP.md`
- `docs/salida-beta-checklist.md`

---

## 19. Conclusión

Ventora es fuerte cuando ayuda a una empresa de vidrios y aluminio a:

- no perder consultas
- responder rápido
- cotizar sin fricción
- compartir fácilmente
- hacer seguimiento comercial
- cerrar más trabajos

Ese es el corazón del producto.

Todo lo demás debe servir a eso.
