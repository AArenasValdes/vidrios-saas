# Plan: Fase 1 — Captación de Leads y Notificaciones

## Objetivo General

Reforzar el motor de captación de leads de Ventora para que una PYME o empresa mediana/grande pueda atraer, centralizar y responder solicitudes comerciales de manera eficiente, asegurando que el dueño del negocio vea valor en la plataforma como una herramienta de crecimiento, no solo de cotización.

La funcionalidad gatillante es: **"Con ventora capturo leads mientras estoy ocupado o dormido y los centralizo para que nadie se pierda."**

---

## Contexto del Estado Actual

El sistema ya cuenta con una base técnica robusta que debe ser potenciada, no reescrita:

- **Landing Pública por Empresa (`solicitud/[empresa]`):** Ya existe. Un cliente puede visitar un link único y dejar una solicitud. Las solicitudes se centralizan en tabla `solicitudes_contacto`.
- **Notificaciones Push (Web Push):** Sistema de notificaciones al vendedor ya implementado.
- **Solicitudes:** Tabla `solicitudes_contacto` con campos: `organization_id`, `nombre`, `telefono`, `tipo_trabajo`, `mensaje`, `origen`, `estado`, etc.
- **Estados Comerciales:** Sistema de cotizaciones con estados (`borrador`, `creada`, `enviada`, `aprobada`, `rechazada`).

---

## Funcionalidades Propuestas para la Fase 1

### 1. Generador de QR para Captación Offline (Alta Prioridad)

**Descripción:** Permitir que cada empresa genere un código QR desde su configuración, que al escanear lleva a su landing pública de solicitudes.

**Valor:**
- **Offline / Physical Lead Capture:** Colocar QR en tarjetas de presentación, volantes, camionetas y letreros.
- **Sobrecarga de trabajo reducida:** Si el maestro está en obra, el cliente potencial escanea, deja su solicitud y el sistema notifica.

**Implementación Técnica:**
- Utilizar librería `qrcode` para generar un SVG o PNG del URL de la empresa (`ventorap.cl/solicitud/[slug]`).
- Crear un endpoint API o una función utilitaria para generar el QR on-the-fly o una vez y guardar el SVG en Supabase Storage.
- Exponer un componente en la sección de configuración de perfil de la empresa (`/configuracion/empresa`) con opción de descargar el QR.

**Tareas (Tickets):**
1. Instalar dependencia `qrcode`.
2. Crear servicio `qr-generator.service.ts` que reciba un string y retorne un SVG/PNG.
3. Crear endpoint API `/api/generar-qr` o calcularlo en cliente con un componente `QRCodeComponent`.
4. UI en la página de empresa: botón "Generar QR", descarga del código.
5. Actualizar `organization_profile` o crear tabla `qrcodes` (opcional, escalable).

### 2. Notificación Multi-canal para Nuevos Leads (Alta Prioridad)

**Descripción:** Cuando llega una nueva solicitud pública, el sistema debe notificar por más de un canal para asegurar que el vendedor responda en menos de 5 minutos.

**Canales Actuales:**
- Web Push (ya implementado).

**Canales a Añadir:**
- **Email al admin/vendedor:** Notificación por correo electrónico.
- **WhatsApp Business API (Opcional/Futuro):** Enviar un mensaje al vendedor notificando el nuevo lead (texto simple, como un forward).

**Lógica de Notificación:**
- Trigger: Insert en `solicitudes_contacto` con `organization_id`.
- Acción: Enviar email al correo registrado del `organization_profile` y push a suscripciones activas.

**Tareas:**
1. Crear servicio de notificaciones de email (resend/sendgrid).
2. Integrar envío de email en `solicitudes-contacto.service.ts` en `createPublicRequest`.
3. Añadir plantilla de email HTML con los datos del lead (`nombre`, `trabajo`, `contacto`).
4. Configurar colas o envío asíncrono para no bloquear la respuesta HTTP.

### 3. Mejorar la Página de Solicitudes (Dashboard del Dueño)

**Descripción:** La página de solicitudes debe mostrar información más útil para la gestión comercial.

**Mejoras:**
- **Estadísticas rápidas:** Conteo de nuevas solicitudes, contactadas, cerradas.
- **Tiempo de respuesta del vendedor:** Timestamp de creación vs. tiempo de cambio a estado "contactada".
- **Origines de captación:** Gráfico o badge que indique si el lead vino de "Landing", "QR", "Instagram", etc.

**Implementación:**
- Modificar el service `solicitudes-contacto.service.ts` para exponer un método de agregación (count por estado).
- Adaptar la UI actual (`solicitudes/page.tsx`) para incluir un header con resumen estadístico.

### 4. Integración con Orígenes de Leads (UTMs/Orígenes)

**Descripción:** Permitir rastrear de dónde viene cada lead para saber qué canales funcionan.

**Implementación:**
- Añadir columnas `fuente` y `medio` a `solicitudes_contacto` (e.g., fuente: 'instagram', medio: 'bio_qr', 'facebook_ad').
- Leer parámetros de URL (`?utm_source=instagram`) al llegar a `solicitud/[empresa]`.
- Guardar estos parámetros en la base de datos al crear la solicitud.

---

## Duda de Integración Facebook/Instagram vs. Código QR

El objetivo es usar un Agente solo para Facebook/Instagram. Para simplificar y no gastar:

- **Opción Recomendada: QR (Gratis y Efectivo):**
  - Generar el link de la empresa y conectarlo a Instagram (link en bio) y Facebook.
  - El QR lleva directo al formulario de Ventora.
  - El Agente solo reenvía al link.

- **Opción Agente Directo (Costo, pero Más Automático):**
  - Usar ManyChat/Meta API. Cuando alguien escribe por DM, un bot responde, pide datos básicos y genera un link único de Ventora.
  - El usuario completa el formulario y llega como solicitud.

> **Decisión:** Proceder primero con la solución de Código QR (punto 1), ya que cumple el 80% del objetivo sin incurrir en costos de terceros. El Agente se puede evaluar en una fase posterior o externamente.

---

## Alcance de la Fase 1

| # | Feature | Prioridad | Estimación Depende de |
|---|---|---|---|
| 1 | Generador de QR para captación offline | Alta | Librería `qrcode`, endpoint API |
| 2 | Notificación multi-canal (Email) | Alta | Proveedor de email (Resend/etc) |
| 3 | Mejorar UI de solicitudes con stats | Media | Cambios en UI existente |
| 4 | Seguimiento de orígenes (UTMs) | Media | Migración DB para nueva columna |

---

## Notas Técnicas de Arquitectura
- **Estructura de datos:** Tabla `solicitudes_contacto` ya tiene los campos base (`tipo_trabajo`, `origen`, `mensaje`). Se pueden añadir columnas para `utm_source`, `utm_medium`, etc.
- **Capas:** Siguiendo la arquitectura vigente:
  - `page.tsx` o componente → `hook` (e.g., new `useQRGenerator`) → `service` (e.g., `qr-generator.service.ts`) → `repository` (si se quiere guardar img URL en DB).
- **Multi-tenant:** Todo query debe filtrar por `organization_id`.